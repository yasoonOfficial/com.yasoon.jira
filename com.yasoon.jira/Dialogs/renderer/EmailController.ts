/// <reference path="../../definitions/bluebird.d.ts" />

class EmailController implements IEmailController {
    public fieldMapping = {
        subject: 'summary',
        body: 'description',
        sender: 'reporter',
        sentAt: ''
    }

    public mail: any;
    public settings: any;
    public ownUser: JiraUser;
    public attachmentHandles: any;
    public mailAsMarkup: string;
    public selectedTextAsMarkup: string;
    public senderUser: JiraUser;

    private renderMarkupPromise: Promise<string>;
    private loadSenderPromise: Promise<any>;

    constructor(mail: any, selectedText: string, settings: any, ownUser: JiraUser) {

        this.mail = mail;
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

        //Load Attachment Handles
        //this.getAttachmentFileHandles();
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
                this.mail.attachments.forEach(function (attachment) {
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
                });
            }
        }
    }

    setSender() {
        if (this.fieldMapping.sender) {
            let field = FieldController.getField(this.fieldMapping.sender);
            if (field) {
                this.loadSenderPromise.then((senderUser: JiraUser) => {
                    if (senderUser) {
                        if (field.getType() == 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker' || 'reporter') {
                            field.setValue(senderUser);
                        } else {
                            field.setValue(senderUser.emailAddress);
                        }

                    } else {
                        if (field.getType() == 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker' || 'reporter') {
                            field.setValue(this.ownUser);
                        } else {
                            field.setValue(this.mail.senderEmail);
                        }
                    }
                });

            }
        }
    }

}

