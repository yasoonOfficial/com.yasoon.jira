/// <reference path="../../definitions/bluebird.d.ts" />

class EmailController implements IEmailController {
    static settingCreateTemplates = 'createTemplates';

    fieldMapping = {
        subject: 'summary',
        body: 'description',
        sender: 'reporter',
        sentAt: ''
    }

    mail: any;
    settings: any;
    ownUser: JiraUser;
    attachments: any;
    attachmentHandles: any;
    mailAsMarkup: string;
    selectedTextAsMarkup: string;
    senderUser: JiraUser;
    senderTemplates: JiraProjectTemplate[];

    private renderMarkupPromise: Promise<string>;
    private loadSenderPromise: Promise<any>;

    constructor(mail: any, selectedText: string, settings: any, ownUser: JiraUser) {

        this.mail = mail;
        this.attachments = mail.attachments;
        this.settings = settings;
        this.selectedTextAsMarkup = selectedText;
        this.ownUser = ownUser;

        let fieldMappingString = yasoon.setting.getAppParameter('fieldMapping');
        if (fieldMappingString) {
            this.fieldMapping = JSON.parse(fieldMappingString);
        }

        //Start Render Markup
        this.renderMarkupPromise = yasoon.outlook.mail.renderBody(mail, 'jiraMarkup')
            .then((markup: string) => {
                this.mailAsMarkup = markup;
                return markup;
            })
            .catch(() => {
                this.mailAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
            });

        //Get Reporter User
        this.loadSenderPromise = jiraGet('/rest/api/2/user/search?username=' + mail.senderEmail)
            .then((data: string): JiraUser => {
                let users = JSON.parse(data);
                if (users.length > 0) {
                    this.senderUser = users[0];
                    return this.senderUser;
                }
            });


        //Get Sender templates            
        let templateString = yasoon.setting.getAppParameter(EmailController.settingCreateTemplates);
        if (templateString) {
            this.senderTemplates = JSON.parse(templateString);
        }

        //Load Attachment Handles
        this.getAttachmentFileHandles();
    }

    getAttachmentFileHandles() {
        //If created by email, check for templates and attachments
        if (this.mail && !this.attachmentHandles) {
            this.attachmentHandles = [];
            //Add current mail to clipboard
            let handle = this.mail.getFileHandle();
            if (this.settings.addEmailOnNewAddIssue) {
                handle.selected = true;
            }
            this.attachmentHandles.push(handle);

            if (this.mail.attachments && this.mail.attachments.length > 0) {
                this.mail.attachments.forEach((attachment) => {
                    let handle = attachment.getFileHandle();
                    //Skip too small images	
                    if (this.settings.addAttachmentsOnNewAddIssue) {
                        handle.selected = true;
                    }
                    this.attachmentHandles.push(handle);
                });
            }
        }

        return this.attachmentHandles || [];
    }

    insertEmailValues() {
        this.setSubject();
        this.setBody();
        this.setSender();
    }

    setSubject() {
        if (this.fieldMapping.subject) {
            FieldController.getField(this.fieldMapping.subject).setValue(this.mail.subject);
        }
    }

    setBody() {
        if (this.fieldMapping.body) {
            let field = FieldController.getField(this.fieldMapping.body);
            if (field) {
                this.renderMarkupPromise.then((markup) => {
                    field.setValue(markup);

                    if (jira.settings.addMailHeaderAutomatically === 'top') {
                        markup = renderMailHeaderText(this.mail, true) + '\n' + markup;
                    }
                    else if (jira.settings.addMailHeaderAutomatically === 'bottom') {
                        markup = markup + '\n' + renderMailHeaderText(this.mail, true);
                    }

                    return this.handleAttachments(markup, this.mail).then(function (newMarkup) {
                        this.mailAsMarkup = newMarkup;
                        field.setValue(newMarkup);
                    });
                });
            }
        }
    }

    handleAttachments(originalMarkup: string, mail: any): Promise<string> {
        return Promise.resolve(originalMarkup);
        /*
        //Check each attachment if it needs to be embedded
        var embeddedItems = [];
        var markup = originalMarkup;

        this.attachmentHandles.forEach((attachment) => {
            if (markup.indexOf('!' + attachment.contentId + '!') > -1) {
                //Mark attachments selected				
                var handle = jira.selectedAttachments.filter(function (a) { return a.contentId === attachment.contentId; })[0];
                if (handle) {
                    embeddedItems.push(handle);
                } else {
                    var regEx = new RegExp('!' + attachment.contentId + '!', 'g');
                    markup = markup.replace(regEx, '');
                }
            }
        });

        if (embeddedItems.length === 0)
            return Promise.resolve(originalMarkup);

        //Ensure they are persisted (performance)
        var persist = new Promise(function (resolve, reject) {
            mail.persistAttachments(embeddedItems, resolve, reject);
        });

        return persist.then(function () {
            return embeddedItems;
        })
            .map(function (handle) {
                return yasoon.io.getFileHash(handle).then(function (hash) {
                    handle.hash = hash;
                    return hash;
                });
            })
            .then(function (hashes) {
                return yasoon.valueStore.queryAttachmentHashes(hashes);
            })
            .then(function (result) {
                embeddedItems.forEach(function (handle) {
                    //Skip files whose hashes that were blocked	
                    var regEx = new RegExp('!' + handle.contentId + '!', 'g');
                    if (result.foundHashes.indexOf(handle.hash) >= 0) {
                        markup = markup.replace(regEx, '');
                        handle.blacklisted = true;
                        return;
                    }

                    //Replace the reference in the markup	
                    handle.selected = true;
                    markup = markup.replace(regEx, '!' + handle.getFileName() + '!');
                    handle.setInUse();
                });

                jira.UIFormHandler.getRenderer('attachment').refresh('attachment');
                return markup;
            })
            .catch(function (e) {
                yasoon.util.log('Error during handling of attachments', yasoon.util.severity.warning, getStackTrace(e));
            });
            */
    }

    setSender() {
        if (this.fieldMapping.sender) {
            let field = FieldController.getField(this.fieldMapping.sender);
            if (field) {
                this.loadSenderPromise.then((senderUser: JiraUser) => {
                    FieldController.raiseEvent(EventType.SenderLoaded, senderUser);
                    let valueUser: JiraUser;
                    let valueMail: string;
                    if (senderUser) {
                        valueUser = senderUser;
                        valueMail = senderUser.emailAddress;
                    } else {
                        valueUser = this.ownUser;
                        valueMail = this.mail.senderEmail;
                    }

                    if (field.getType() == 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker' || 'reporter') {
                        field.setValue(valueUser);
                    } else {
                        field.setValue(valueMail);
                    }

                    //If Service is active, set onBehalf user
                    let onBehalfOfField = FieldController.getField(FieldController.onBehalfOfFieldId);
                    if (onBehalfOfField) {
                        onBehalfOfField.setValue(valueUser);
                    }
                });

            }
        }
    }

    saveSenderTemplate(values) {
        if (this.mail) {
            let projectField = <ProjectField>FieldController.getField(FieldController.projectFieldId);
            let project: JiraProject = projectField.getObjectValue();

            let projectCopy: JiraProject = JSON.parse(JSON.stringify(project));
            delete projectCopy.issueTypes;

            let newValues = JSON.parse(JSON.stringify(values));

            let template: JiraProjectTemplate = {
                senderEmail: this.mail.senderEmail,
                senderName: this.mail.senderName,
                project: project,
                values: values
            }

            delete template.values.fields.summary;
            delete template.values.fields.description;
            delete template.values.fields.duedate;

            //Service Desk Data
            if (project.projectTypeKey === 'service_desk') {
                template.serviceDesk = {
                    enabled: false,
                    requestType: '100'
                };
            }

            //Add or replace template
            var templateFound = false;
            this.senderTemplates.map((templ) => {
                if (templ.senderEmail == template.senderEmail && templ.project.id == template.project.id) {
                    templateFound = true;
                    return template;
                }
                return templ;
            });

            if (!templateFound) {
                this.senderTemplates.push(template);
            }
            yasoon.setting.setAppParameter(EmailController.settingCreateTemplates, JSON.stringify(this.senderTemplates));

        }
    }

}

