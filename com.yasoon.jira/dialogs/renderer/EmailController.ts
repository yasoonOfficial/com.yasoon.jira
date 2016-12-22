/// <reference path="../../definitions/bluebird.d.ts" />
/// <reference path="../../definitions/yasoon.d.ts" />

interface JiraFileHandle extends yasoonModel.EmailAttachmentFileHandle {
    selected: boolean;
    hash: string;
    blacklisted: boolean;
    fileName: string;
    extension: string;
    fileIcon: string;
    fileNameNoExtension: string;
    attachment: yasoonModel.OutlookAttachment;
}

class EmailController implements IEmailController, IFieldEventHandler {
    static settingCreateTemplates = 'createTemplates';

    fieldMapping = {
        subject: 'summary',
        body: 'description',
        sender: 'reporter',
        sentAt: ''
    }

    mail: yasoonModel.Email;
    settings: any;
    ownUser: JiraUser;
    attachments: yasoonModel.OutlookAttachment[];
    attachmentHandles: JiraFileHandle[];

    bodyAsMarkup: string;
    bodyPlain: string;

    selectionAsMarkup: string;
    selectionPlain: string;

    senderUser: JiraUser;
    senderTemplates: JiraProjectTemplate[];

    mailConversationData: YasoonConversationData;

    //Initial action
    type: JiraDialogType;

    private renderBodyMarkupPromise: Promise<string>;
    private renderSelectionMarkupPromise: Promise<string>;
    private loadSenderPromise: Promise<any>;

    constructor(mail: yasoonModel.Email, type: JiraDialogType, settings: any, ownUser: JiraUser) {

        this.mail = mail;
        this.attachments = mail.attachments;
        this.settings = settings;
        this.ownUser = ownUser;
        this.type = type;

        let fieldMappingString = yasoon.setting.getAppParameter('fieldMapping');
        if (fieldMappingString) {
            this.fieldMapping = JSON.parse(fieldMappingString);
        }

        //Start Render Markup
        this.renderBodyMarkupPromise = yasoon.outlook.mail.renderBody(mail, 'jiraMarkup')
            .then((markup: string) => {
                this.bodyAsMarkup = markup;
                return markup;
            })
            .catch(() => {
                this.bodyAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
            });

        this.bodyPlain = jira.mail.getBody(0).replace(/\r/g, '').replace(/\n\n/g, '\n');

        if (this.type === 'selectedText') {
            this.selectionPlain = this.mail.getSelection(0).replace(/\r/g, '').replace(/\n\n/g, '\n');

            this.renderSelectionMarkupPromise = yasoon.outlook.mail.renderSelection(mail, 'jiraMarkup')
                .then((markup) => {
                    this.selectionAsMarkup = markup;
                    return markup;
                })
                .catch(() => {
                    this.selectionAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
                    return this.selectionAsMarkup;
                });
        }

        //Get Reporter User
        this.loadSenderPromise = jiraGet('/rest/api/2/user/search?username=' + mail.senderEmail)
            .then((data: string): JiraUser => {
                let users = JSON.parse(data);
                if (users.length > 0) {
                    this.senderUser = users[0];
                    FieldController.raiseEvent(EventType.SenderLoaded, this.senderUser);
                    return this.senderUser;
                }
            });


        //Get Sender templates            
        let templateString = yasoon.setting.getAppParameter(EmailController.settingCreateTemplates);
        if (templateString) {
            this.senderTemplates = JSON.parse(templateString);
        } else {
            this.senderTemplates = [];
        }

        //Load Attachment Handles
        this.getAttachmentFileHandles();
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.AfterSave && this.mail) {
            let eventData: LifecycleData = newValue;
            try {
                //Set Conversation Data
                let conversationData = this.getConversationData();
                let issue: JiraIssue = eventData.newData;

                conversationData.issues[issue.id] = { id: issue.id, key: issue.key, summary: issue.fields['summary'], projectId: issue.fields['project'].id };
                yasoon.outlook.mail.setConversationData(this.mail, JSON.stringify(conversationData)); //jira.mail.setConversationData(JSON.stringify(conversation));

                //Set new message class to switch icon
                if (!this.mail.isSignedOrEncrypted || jira.settings.overwriteEncrypted)
                    this.mail.setMessageClass('IPM.Note.Jira');
            } catch (e) {
                //Not so important
                yasoon.util.log('Failed to set Conversation data', yasoon.util.severity.info, getStackTrace(e));
            }

            //Save Template if created by Email
            this.saveSenderTemplate(eventData.newData);

        }

        return null;
    }
    getAttachmentFileHandles() {
        //If created by email, check for templates and attachments
        if (this.mail && !this.attachmentHandles) {
            this.attachmentHandles = [];
            //Add current mail to clipboard
            let handle = <JiraFileHandle>this.mail.getFileHandle();
            if (this.settings.addEmailOnNewAddIssue) {
                handle.selected = true;
            }
            this.attachmentHandles.push(handle);

            if (this.mail.attachments && this.mail.attachments.length > 0) {
                this.mail.attachments.forEach((attachment) => {
                    let handle = <JiraFileHandle>attachment.getFileHandle();
                    //Skip too small images	
                    handle.attachment = attachment;

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

    setBody(fieldId?: string) {
        if (!fieldId)
            fieldId = this.fieldMapping.body;

        if (fieldId) {
            let field = FieldController.getField(fieldId);
            if (field) {
                let markupPromise = Promise.resolve('');

                if (this.type === 'wholeMail') {
                    markupPromise = this.renderBodyMarkupPromise;
                } else if (this.type === 'selectedText') {
                    markupPromise = this.renderSelectionMarkupPromise;
                }

                markupPromise.then((markup) => {
                    field.setValue(markup);

                    if (jira.settings.addMailHeaderAutomatically === 'top') {
                        markup = renderMailHeaderText(this.mail, true) + '\n' + markup;
                    }
                    else if (jira.settings.addMailHeaderAutomatically === 'bottom') {
                        markup = markup + '\n' + renderMailHeaderText(this.mail, true);
                    }

                    return this.handleAttachments(markup, this.mail)
                        .then((newMarkup) => {
                            if (this.type === 'selectedText') {
                                this.selectionAsMarkup = newMarkup;
                            } else if (this.type === 'wholeMail') {
                                this.bodyAsMarkup = newMarkup;
                            }
                            field.setValue(newMarkup);
                        });
                });
            }
        }
    }

    getMailHeaderText(useMarkup: boolean): string {
        let result = '';
        if (useMarkup) {
            result = yasoon.i18n('mail.mailHeaderMarkup', {
                senderName: this.mail.senderName,
                senderEmail: this.mail.senderEmail,
                date: moment(this.mail.receivedAt).format('LLL'),
                recipients: ((this.mail.recipients.length > 0) ? '[mailto:' + this.mail.recipients.join('], [mailto:') + ']' : yasoon.i18n('dialog.noRecipient')),
                subject: this.mail.subject
            });
        } else {
            result = yasoon.i18n('mail.mailHeaderPlain', {
                senderName: this.mail.senderName,
                senderEmail: this.mail.senderEmail,
                date: moment(this.mail.receivedAt).format('LLL'),
                recipients: ((this.mail.recipients.length > 0) ? this.mail.recipients.join(',') : yasoon.i18n('dialog.noRecipient')),
                subject: this.mail.subject
            });
        }
       //Add Attachments if available 
        let attachments = '';
        this.attachmentHandles.forEach((handle) => {
            if(handle.attachment && !handle.attachment.isEmbeddedItem) {
                if(useMarkup) {
                    attachments = attachments + ((attachments) ? ', ' : ' ') + '[^' + handle.fileName + ']';
                } else {
                    attachments = attachments + ((attachments) ? ', ' : ' ')  + handle.fileName;
                }
            }
        });

        if(attachments) {
            let label = yasoon.i18n('mail.attachments');
            if(useMarkup) {
                label = '*' + label + '*';
            }
            result = result + label + ':' + attachments + '\n'; 
        }
        //Add Final seperator
        result = result + '----\n';

        return result;
    }

    handleAttachments(originalMarkup: string, mail: yasoonModel.Email): Promise<string> {

        //Check each attachment if it needs to be embedded
        let embeddedItems: JiraFileHandle[] = [];
        let markup = originalMarkup;

        this.attachmentHandles.forEach((attachment) => {
            if (markup.indexOf('!' + attachment.contentId + '!') > -1) {
                embeddedItems.push(attachment);
            }
        });

        if (embeddedItems.length === 0)
            return Promise.resolve(originalMarkup);

        //Ensure they are persisted (performance)
        return new Promise((resolve, reject) => {
            mail.persistAttachments(embeddedItems, resolve, reject);
        })
            .then(() => {
                return embeddedItems;
            })
            .map((handle: JiraFileHandle) => {
                return yasoon.io.getFileHash(handle)
                    .then((hash) => {
                        handle.hash = hash;
                        return hash;
                    });
            })
            .then((hashes) => {
                return yasoon.valueStore.queryAttachmentHashes(hashes)
                    .catch((e) => {
                        yasoon.util.log('Could not load Attachment Blacklist', yasoon.util.severity.warning, getStackTrace(e));
                        return { foundHashes: [] };
                    });
            })
            .then((result) => {
                embeddedItems.forEach((handle) => {
                    //Skip files whose hashes that were blocked	
                    let regEx = new RegExp('!' + handle.contentId + '!', 'g');
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

                FieldController.raiseEvent(EventType.AttachmentChanged, this.attachmentHandles);
                return markup;
            })
            .catch(function (e) {
                yasoon.util.log('Error during handling of attachments', yasoon.util.severity.warning, getStackTrace(e));
            });
    }

    setSender() {
        if (this.fieldMapping.sender) {
            let field = FieldController.getField(this.fieldMapping.sender);
            if (field) {
                this.loadSenderPromise.then((senderUser: JiraUser) => {
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

    getConversationData(): YasoonConversationData {
        if (!this.mailConversationData) {
            let convData: string = yasoon.outlook.mail.getConversationData(this.mail);
            if (convData) {
                this.mailConversationData = JSON.parse(convData);
            } else {
                this.mailConversationData = {
                    issues: {}
                };
            }
        }

        return this.mailConversationData;
    }

    saveSenderTemplate(values: JiraIssue) {
        if (this.mail) {
            let project: JiraProject = null;
            if (values.fields && values.fields['project']) {
                project = values.fields['project'];
            }
            //Don't think we will need this
            /* else {
                let projectField = <ProjectField>FieldController.getField(FieldController.projectFieldId);
                project = projectField.getObjectValue();
            } */

            if (!project) {
                console.error('Trying to save a senderTemplate without project');
                return;
            }

            let projectCopy: JiraProject = JSON.parse(JSON.stringify(project));
            delete projectCopy.issueTypes;

            let newValues = JSON.parse(JSON.stringify(values));

            let template: JiraProjectTemplate = {
                senderEmail: this.mail.senderEmail,
                senderName: this.mail.senderName,
                project: project,
                values: newValues
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
            this.senderTemplates.forEach((templ) => {
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

