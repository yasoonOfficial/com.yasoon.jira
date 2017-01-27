/// <reference path="../../definitions/bluebird.d.ts" />
/// <reference path="../../definitions/yasoon.d.ts" />
/// <reference path="../../definitions/common.d.ts" />
/// <reference path="../../definitions/moment.d.ts" />

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

class EmailController implements IFieldEventHandler {
    static settingCreateTemplates = 'createTemplates';

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
    allTemplates: { [id: string]: YasoonDefaultTemplate[] } = {};
    senderTemplates: YasoonDefaultTemplate[] = [];

    mailConversationData: YasoonConversationData;

    //Initial action
    type: JiraDialogType;

    renderBodyMarkupPromise: Promise<string>;
    renderSelectionMarkupPromise: Promise<string>;
    loadSenderPromise: Promise<JiraUser>;

    constructor(mail: yasoonModel.Email, type: JiraDialogType, settings: JiraAppSettings, ownUser: JiraUser) {

        this.mail = mail;
        this.attachments = mail.attachments;
        this.settings = settings;
        this.ownUser = ownUser;
        this.type = type;

        //Start Render Markup
        this.renderBodyMarkupPromise = yasoon.outlook.mail.renderBody(mail, 'jiraMarkup')
            .then((markup: string) => {
                this.bodyAsMarkup = markup;
            })
            .catch(() => {
                this.bodyAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
            })
            .then(() => {
                return this.bodyAsMarkup;
            });

        this.bodyPlain = mail.getBody(0).replace(/\r/g, '').replace(/\n\n/g, '\n');

        if (this.type === 'selectedText') {
            this.selectionPlain = this.mail.getSelection(0).replace(/\r/g, '').replace(/\n\n/g, '\n');

            this.renderSelectionMarkupPromise = yasoon.outlook.mail.renderSelection(mail, 'jiraMarkup')
                .then((markup) => {
                    this.selectionAsMarkup = markup;
                })
                .catch(() => {
                    this.selectionAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
                })
                .then(() => {
                    return this.selectionAsMarkup;
                })
        }

        //Get Reporter User
        this.loadSenderPromise = jiraGet('/rest/api/2/user/search?username=' + mail.senderEmail)
            .then((data: string): JiraUser => {
                console.log(data);
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
            this.allTemplates = JSON.parse(templateString) || {};
            this.senderTemplates = this.allTemplates[this.mail.senderEmail] || [];
        }

        FieldController.registerEvent(EventType.AfterSave, this);
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
            let issue: JiraIssue = eventData.newData;
            this.saveSenderTemplate(eventData.data, issue.fields['project']);
        }

        return null;
    }

    getAttachmentFileHandles(uniqueNames?: boolean): JiraFileHandle[] {
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
                    handle.attachment = attachment;

                    if (this.settings.addAttachmentsOnNewAddIssue) {
                        handle.selected = true;
                    }

                    //Provide unique names for attachments
                    if (uniqueNames) {
                        let uniqueKey = getUniqueKey();
                        let oldFileName = handle.getFileName();
                        let newFileName = oldFileName.substring(0, oldFileName.lastIndexOf('.'));
                        newFileName = newFileName + '_' + uniqueKey + oldFileName.substring(oldFileName.lastIndexOf('.'));
                        handle.setFileName(newFileName);
                    }

                    this.attachmentHandles.push(handle);
                });
            }
        }

        return this.attachmentHandles || [];
    }

    getSubject(): string {
        return this.mail.subject;
    }

    getBody(asMarkup: boolean): Promise<string> {
        if (asMarkup) {
            return this.renderBodyMarkupPromise;
        } else {
            return Promise.resolve(this.bodyPlain);
        }
    }

    getSelection(asMarkup: boolean): Promise<string> {
        if (asMarkup) {
            return this.renderSelectionMarkupPromise;
        } else {
            return Promise.resolve(this.selectionPlain);
        }
    }

    getSenderEmail(): string {
        return this.mail.senderEmail;
    }

    getSenderUser(): JiraUser {
        return this.senderUser;
    }

    getSentAt(): moment.Moment {
        return moment(this.mail.receivedAt);
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
            if (handle.attachment && !handle.attachment.isEmbeddedItem) {
                if (useMarkup) {
                    attachments = attachments + ((attachments) ? ', ' : ' ') + '[^' + handle.fileName + ']';
                } else {
                    attachments = attachments + ((attachments) ? ', ' : ' ') + handle.fileName;
                }
            }
        });

        if (attachments) {
            let label = yasoon.i18n('mail.attachments');
            if (useMarkup) {
                label = '*' + label + '*';
            }
            result = result + label + ':' + attachments + '\n';
        }
        //Add Final seperator
        result = result + '----\n';

        return result;
    }

    getCurrentMailContent(asMarkup: boolean): Promise<string> {
        let promise = Promise.resolve('');
        if (this.type === 'wholeMail')
            promise = this.getBody(asMarkup);
        else
            promise = this.getSelection(asMarkup);

        return promise
            .then((markup) => {
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
                        return newMarkup
                    });
            });
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

    saveSenderTemplate(values: JiraIssue, project: JiraProject) {
        if (this.mail) {
            if (!project) {
                console.error('Trying to save a senderTemplate without project');
                return;
            }

            //We want the templates to be the same as in the JIRA addon, so we cannot use the values.fields, as they use deep objects. e.g. reporter: { name: 'admin' }
            //We need just report: 'admin', so we get all values again from the rendered Fields
            let fields: any = {};
            for (let fieldId in values.fields) {
                if (fieldId != 'summary' && fieldId != 'description' && fieldId != 'duedate' && fieldId != 'project' && fieldId != 'issuetype') {
                    fields[fieldId] = FieldController.getField(fieldId).getDomValue();
                }
            }

            //Now we would not default email values anymore, so we have to merge the last template with the variables of the selected template
            let templateController: TemplateController = jira.templateController;
            let currentTemplate = templateController.getTemplate(project.id, values.fields['issuetype'].id);
            if (currentTemplate) {
                for (let fieldId in currentTemplate.fields) {
                    if (templateController.containsVariable(currentTemplate.fields[fieldId])) {
                        fields[fieldId] = currentTemplate.fields[fieldId];
                    }
                }
            }

            let template: YasoonDefaultTemplate = {
                group: '-1',
                projectId: project.id,
                issueTypeId: values.fields['issuetype'].id,
                templateName: yasoon.i18n('dialog.project') + ': ' + project.name,
                priority: 4,
                fields: fields,
                lastUpdated: new Date()
            };

            //Harmonize fields
            /*
            //Service Desk Data
            if (projectCopy.projectTypeKey === 'service_desk') {
                template.serviceDesk = {
                    enabled: false,
                    requestType: '100'
                };
            }
            */

            //Add or replace template
            let templateFound = -1;
            this.senderTemplates.forEach((templ, index) => {
                if (templ.projectId == template.projectId) {
                    templateFound = index;
                }
            });
            if (templateFound > -1) {
                this.senderTemplates.splice(templateFound, 1);
            }
            this.senderTemplates.push(template);

            //Due to the save structure, check if there are too many entries is not so easy.
            //Stucture is: { "senderMail": [ArrayOfTemplates]}
            let counter = 0;
            let senderMail = '';
            let templateIndex = 0;
            let lastUpdated: Date = new Date(2099, 0, 1);
            for (let mail in this.allTemplates) {
                let currentTemplates = this.allTemplates[mail];
                currentTemplates.forEach((t, index) => {
                    counter++;
                    if (lastUpdated > t.lastUpdated) {
                        lastUpdated = t.lastUpdated;
                        senderMail = mail;
                    }
                });
            }

            if (counter > 25) {
                this.allTemplates[senderMail].splice(templateIndex, 1);
                if (this.allTemplates[senderMail].length === 0) {
                    delete this.allTemplates[senderMail];
                }
            }

            this.allTemplates[this.getSenderEmail()] = this.senderTemplates;
            let data = JSON.stringify(this.allTemplates)
            yasoon.setting.setAppParameter(EmailController.settingCreateTemplates, data);
        }
    }

}

