/// <reference path="../../definitions/jquery.d.ts" />
/// <reference path="../../definitions/bluebird.d.ts" />
/// <reference path="../../definitions/jira.d.ts" />
/// <reference path="../../definitions/common.d.ts" />
/// <reference path="../../definitions/yasoon.d.ts" />
/// <reference path="./../renderer/FieldController.ts" />
/// <reference path="./../renderer/EmailController.ts" />
/// <reference path="./../renderer/RecentItemController.ts" />
/// <reference path="./../renderer/Field.ts" />
/// <reference path="./../renderer/fields/AttachmentField.ts" />
/// <reference path="./../renderer/fields/MultiLineTextField.ts" />
/// <reference path="./../renderer/fields/IssueField.ts" />
/// <reference path="./../renderer/fields/ProjectField.ts" />

interface commentDialogInitParams {
    mail: yasoonModel.Email;
    settings: JiraAppSettings;
    text: string;
    projects: JiraProject[];
    issue: JiraIssue;
    type: JiraDialogType;
    ownUser: JiraUser;
}

var jira:any = null;

class AddToIssueDialog implements IFieldEventHandler {
    icons: JiraIconController = new JiraIconController();
    emailController: EmailController;
    recentItems: RecentItemController;

    settings: JiraAppSettings = null;
    mail: yasoonModel.Email = null;
    selectedText: string = '';
    cacheProjects: JiraProject[] = [];
    issue: JiraIssue = null;
    ownUser: JiraUser = null;
    type: JiraDialogType = '';

    currentProject: JiraProject = null;
    currentIssue: JiraIssue = null;

    init = ( initParams: commentDialogInitParams ) => {
        jira = this; //Legacy
        this.mail = initParams.mail;
        this.settings = initParams.settings;
        this.selectedText = initParams.text;
        this.cacheProjects = initParams.projects;
        this.issue = initParams.issue;
        this.type = initParams.type;
        this.ownUser = initParams.ownUser;

        //Register Close Handler
        yasoon.dialog.onClose(this.cleanup);

        resizeWindowComment();
        
        setTimeout(() => { this.initDelayed(); } , 1);
    }

    initDelayed(): void {
        //Popover for Service Desk Warning
        $('.servicedesk-popover')['popover']({
            content: yasoon.i18n('dialog.serviceDeskWarningBody'),
            title: yasoon.i18n('dialog.serviceDeskWarning'),
            placement: 'top',
            html: true,
            template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title" style="background-color:#fcf8e3;"></h3><div class="popover-content"></div></div>',
            trigger: 'click' //'click'
        });

         if (this.mail) {
            this.emailController = new EmailController(this.mail, this.type, this.settings, this.ownUser);
        }

        this.recentItems = new RecentItemController(this.ownUser);

        //Render Header fields
        let projectDefaultMeta = ProjectField.defaultMeta;
        projectDefaultMeta.required = false;
        FieldController.loadField(projectDefaultMeta, ProjectField, { cache: this.cacheProjects, allowClear: true });
        FieldController.render(FieldController.projectFieldId, $('#HeaderArea'));

        FieldController.loadField(IssueField.defaultMeta, IssueField);
        FieldController.render(FieldController.issueFieldId, $('#IssueArea'));

        //Render Content fields
        FieldController.loadField(MultiLineTextField.defaultCommentMeta, MultiLineTextField, { hasMentions: true });
        FieldController.render(FieldController.commentFieldId, $('#ContentArea'));

        let attachments = [];
        if (this.emailController) {
            attachments = this.emailController.getAttachmentFileHandles();
        }
        FieldController.loadField(AttachmentField.defaultMeta, AttachmentField, attachments);
        FieldController.render(FieldController.attachmentFieldId, $('#ContentArea'));


        //Hook up events
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.issueFieldId);


        if (this.emailController) {
            this.emailController.setBody(FieldController.commentFieldId);
        }

        // Resize Window to maximize Comment field
        resizeWindowComment();
        FieldController.raiseEvent(EventType.AfterRender, {});

        //Submit Button - (Create & Edit)
        $('.submit-button').off().click((e) => { this.submitForm(e); });
        $('#add-issue-cancel').off().click(() => {
            yasoon.dialog.close({ action: 'cancel' });
        });
    }

    cleanup():void {
        //Invalidate dialog events so the following won't throw any events => will lead to errors
        // due to pending dialog.close
        yasoon.dialog.clearEvents();
        FieldController.raiseEvent(EventType.Cleanup, null);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (source === FieldController.projectFieldId) {
            this.currentProject = newValue;
        } else if (source === FieldController.issueFieldId) {
            this.currentIssue = newValue;
            if (newValue) {
                this.currentProject = newValue.fields.project;
            }

            $('.buttons').removeClass('servicedesk');
            $('.buttons').removeClass('no-requesttype');

            if (this.currentIssue && this.currentIssue.fields['project'] && this.currentIssue.fields['project'].projectTypeKey === 'service_desk') {

                //We have a service Project... Check if it is a service request
                jiraGet('/rest/servicedeskapi/request/' + this.currentIssue.id)
                    .then((data) => {
                        $('.buttons').addClass('servicedesk');
                        $('.buttons').removeClass('no-requesttype');
                    })
                    .catch((e) => {
                        $('.buttons').addClass('no-requesttype');
                        $('.buttons').removeClass('servicedesk');
                    });
            }
        }
        return null;
    }

    submitForm(e): void {
        if (!this.currentIssue) {
            yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSelectIssue'));
            return;
        }

        let comment = FieldController.getValue(FieldController.commentFieldId, false);
        console.log('Kommentar:', comment);

        let attachmentField = <AttachmentField>FieldController.getField(FieldController.attachmentFieldId); 
        let attachments = attachmentField.getSelectedAttachments();

        if (!comment && (!attachments || attachments.length === 0)) {
            yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorNoData'));
            return;
        }

        //Prepare UI
        $('#MainAlert').addClass('hidden');
        $('#add-issue-submit').prop('disabled', true);
        $('#JiraSpinner').removeClass('hidden');

        //Todo: Add Recent Issue
        //Add Recent Project
        Promise.resolve()
            .then(() => {
                // Pre Save Event
                let lifecycleData = {
                    data: {
                        comment: comment
                    }
                };
                return FieldController.raiseEvent(EventType.BeforeSave, lifecycleData);
            })
            .then(() => {
                //Saving... (and AfterSave Event)
                let promises: Promise<any>[] = [];

                let url:string = '';
                let body: JiraSubmitComment = null;
                let type: string = $(e.target).data('type'); //Type of submit button 
                if (type == 'submit') {
                    url = '/rest/api/2/issue/' + this.currentIssue.id + '/comment';
                    body = { body: comment };
                } else if (type == 'submitCustomer') {
                    url = '/rest/servicedeskapi/request/' + this.currentIssue.key + '/comment';
                    body = { body: comment, "public": true };
                } else if (type == 'submitInternal') {
                    url = '/rest/servicedeskapi/request/' + this.currentIssue.key + '/comment';
                    body = { body: comment, "public": false };
                }

                if (comment) {
                    //Upload comment
                    promises.push(
                        jiraAjax(url, yasoon.ajaxMethod.Post, JSON.stringify(body))
                            .catch(jiraSyncError, (e) => {
                                $('#MainAlert .errorText').text(yasoon.i18n('dialog.errorSubmitComment', { error: e.getUserFriendlyError() }));
                                $('#MainAlert').show();
                                yasoon.util.log('Error on sending a comment: ' + e.getUserFriendlyError(), yasoon.util.severity.info);
                                throw e;
                            })
                    );
                }

                let lifecycleData = {
                    newData: this.currentIssue
                };

                //Hmm... breaks a little the concept that attachments gets uploaded with AfterSave Event as we can do both together here in AddToIssue 
                let eventPromise = FieldController.raiseEvent(EventType.AfterSave, lifecycleData);
                if (eventPromise) {
                    promises.push(eventPromise);
                }
                
                return Promise.all(promises);
            })
            .then(() => {
                let closeParams: YasoonDialogCloseParams = {
                    action: 'success',
                    issueKey: this.currentIssue.key,
                    changeType: 'updated'
                };
                yasoon.dialog.close(closeParams);
            })
            .catch((e) => {
                console.log('Exception occured', e);
                if (e.name === 'SyncError') {
                    yasoon.util.log(e.message + ' || ' + e.statusCode + ' || ' + e.errorText + ' || ' + e.result + ' || ' + e.data, yasoon.util.severity.warning);
                }
            }).finally(() => {
                $('#add-issue-submit').prop('disabled', false);
                $('#JiraSpinner').addClass('hidden');
            });

        e.preventDefault();
    }
}


yasoon.dialog.load(new AddToIssueDialog());

function resizeWindowComment() {
    var bodyHeight = $('body').height();
    if (bodyHeight > 535) {
        $('body').css('overflow-y', 'hidden');
        $('.form-body').height(bodyHeight - 185);
        //185 => Difference between Body und form-body
        //270 => Space for project, issue and attachment field (in maximum)
        //155 => Min height of comment field

        //If the rest has 270 pixel, only increase the comment field
        if ((bodyHeight - 185 - 270 - 155) > 0)
            $('#comment').height((bodyHeight - 185 - 270));

    } else {
        $('body').css('overflow-y', 'scroll');
        $('.form-body').height(350);
        $('#comment').height(155);
    }
}

$(function() {
    $('body').css('overflow-y', 'hidden');
    $('form').on('submit', function(e) {
        e.preventDefault();
        return false;
    });
});

$(window).resize(resizeWindowComment);

//@ sourceURL=http://Jira/Dialog/jiraAddCommentDialog.js