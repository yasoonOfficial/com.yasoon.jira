declare var jira;
import { Field, IFieldEventHandler, UiActionEventData } from './Field';
import { EventType } from './Enumerations';
import { FieldController } from './FieldController';
import { EmailController } from './EmailController';
import { ProjectField } from './fields/ProjectField';
import { UserSelectField } from './fields/UserSelectField';
import { IssueTypeField } from './fields/IssueTypeField';

export class TemplateController implements IFieldEventHandler {
    static settingGroupHierarchy = 'groups';
    static settingInitialSelection = 'initialSelection';
    static settingDefaultTemplates = 'defaultTemplates';

    private ownUser: JiraUser;
    private groupHierachy: YasoonGroupHierarchy[] = [];
    private dependentFields: { [id: string]: string[] } = {};
    private emailController: EmailController;
    private loadTemplateSelectionPromise: Promise<string>;
    private dialogSelectedTemplate: YasoonDefaultTemplate;
    initialSelection: YasoonInitialSelection;
    defaultTemplates: YasoonDefaultTemplate[] = [];
    type: JiraDialogType;
    emailContent: string = '';
    senderUser: JiraUser;
    allTemplates: { [id: string]: YasoonDefaultTemplate[] } = {};
    senderTemplates: YasoonDefaultTemplate[] = [];

    constructor(ownUser: JiraUser, emailController?: EmailController, type?: JiraDialogType) {
        this.ownUser = ownUser;
        this.emailController = emailController;
        this.type = type;

        //Load Data
        let groupsString: string = '';
        let initialDataString: string = '';
        let defaultTemplatesString: string = '';

        let oauthService = yasoon.app.getOAuthService(jira.settings.currentService);
        let instanceDataString: string = '';
        let initialSelection: YasoonInitialSelection[] = [];
        if (oauthService && oauthService.appParams && oauthService.appParams['jiraDataId']) {
            instanceDataString = yasoon.setting.getAppParameter(oauthService.appParams['jiraDataId']);
        }
        if (instanceDataString) {
            var data = JSON.parse(instanceDataString);

            this.groupHierachy = data[TemplateController.settingGroupHierarchy] || [];
            initialSelection = data[TemplateController.settingInitialSelection] || [];
            this.defaultTemplates = data[TemplateController.settingDefaultTemplates] || [];
        } else {
            //Load non-instance settings
            groupsString = yasoon.setting.getAppParameter(TemplateController.settingGroupHierarchy);
            if (!groupsString)
                groupsString = '[]';

            initialDataString = yasoon.setting.getAppParameter(TemplateController.settingInitialSelection);
            if (!initialDataString)
                initialDataString = '[]';

            defaultTemplatesString = yasoon.setting.getAppParameter(TemplateController.settingDefaultTemplates);
            if (!defaultTemplatesString)
                defaultTemplatesString = '[]';

            this.groupHierachy = JSON.parse(groupsString);
            initialSelection = JSON.parse(initialDataString);
            this.defaultTemplates = JSON.parse(defaultTemplatesString);
        }


        //Filter for current Data 
        //Only keep groups that are assigned to current user
        this.groupHierachy = this.groupHierachy.filter((group) => {
            return this.ownUser.groups.items.filter((userGroup) => {
                return userGroup.name === group.name;
            }).length > 0;
        });

        //Only keep initial Selections necessary for current user
        //--> Sort by Group Hierarchy and pick the highest
        if (initialSelection.length > 0) {
            initialSelection = initialSelection.filter((selection) => {
                return this.ownUser.groups.items.filter((userGroup) => {
                    return userGroup.name === selection.group;
                }).length > 0;
            });

            this.initialSelection = initialSelection.sort((a, b) => {
                let groupA = this.getGroup(a.group);
                let groupB = this.getGroup(b.group);

                let posA = (groupA) ? groupA.position : 10000;
                let posB = (groupB) ? groupB.position : 10000;
                return posA - posB;
            })[0];
        }

        //Only keep defaultTemplates for groups of current user
        this.defaultTemplates = this.defaultTemplates.filter((defaultTemplate) => {
            return defaultTemplate.group === '-1' || this.getGroup(defaultTemplate.group) != null;
        });

        //Sort Asc by priority
        this.defaultTemplates = this.defaultTemplates.sort((a, b) => { return a.priority - b.priority; });

        FieldController.registerEvent(EventType.AfterRender, this);


        //Load Email templates for sender             
        let templateString = yasoon.setting.getAppParameter(EmailController.settingCreateTemplates);
        if (templateString) {
            this.allTemplates = JSON.parse(templateString) || {};
            if (this.emailController.getSenderEmail())
                this.senderTemplates = this.allTemplates[this.emailController.getSenderEmail()] || [];
        }

    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange) {
            let dependentFieldIds = this.dependentFields[source] || [];
            dependentFieldIds.forEach(dependentFieldId => {
                let dependentField = FieldController.getField(dependentFieldId);
                let currentValue = dependentField.getValue(false);
                if (!currentValue && !dependentField.initialValue)
                    return;

                if (!currentValue || !dependentField.initialValue || JSON.stringify(currentValue) == JSON.stringify(dependentField.initialValue)) {
                    FieldController.setValue(dependentField.id, newValue, true);
                }
            });
        } else if (type === EventType.AfterRender) {
            this.cleanupEvents();
        }

        return null;
    }


    applyTemplate(projectId: string, issueTypeId: string) {
        //We first check if we have a pending template
        if (this.dialogSelectedTemplate && this.dialogSelectedTemplate.projectId == projectId && this.dialogSelectedTemplate.issueTypeId == issueTypeId) {
            this.setFieldValues(this.dialogSelectedTemplate);
            this.dialogSelectedTemplate = null;
        } else {
            let template = this.getTemplate(projectId, issueTypeId);
            if (template)
                this.setFieldValues(template);
        }
    }

    setInitialValues(initialValues?: YasoonInitialSelection): Promise<any> {
        if (!initialValues) {
            initialValues = this.initialSelection;
        }
        let projPromise = Promise.resolve();
        let issueTypePromise = Promise.resolve();
        let renderRequired = false;
        if (initialValues) {
            //Only set values if it has changed
            let projectField = <ProjectField>FieldController.getField(FieldController.projectFieldId);
            if (initialValues.projectId && projectField.getDomValue() != initialValues.projectId) {
                projPromise = FieldController.setValue(FieldController.projectFieldId, initialValues.projectId, true);
                renderRequired = true;
            }

            let issueTypeField = <IssueTypeField>FieldController.getField(FieldController.issueTypeFieldId);
            if (initialValues.issueTypeId != '-1' && issueTypeField.getDomValue() != initialValues.issueTypeId) {
                issueTypePromise = FieldController.setValue(FieldController.issueTypeFieldId, initialValues.issueTypeId, true);
                renderRequired = true;
            }
        }

        return Promise.all([renderRequired, projPromise, issueTypePromise]);
    }

    setFieldValues(template: YasoonDefaultTemplate) {
        let promise = Promise.resolve(null);
        //Make sure emailData are loaded
        if (this.emailController) {
            promise = this.emailController.loadSenderPromise;
        }

        promise.then(() => {
            if (template && template.fields) {
                for (let fieldId in template.fields) {
                    if (template.fields.hasOwnProperty(fieldId)) {
                        let value = template.fields[fieldId];
                        let renderedField = FieldController.getField(fieldId);
                        if (renderedField) {
                            let prom: Promise<any>;
                            if (typeof value === 'string' && this.containsVariable(value)) {
                                //Fixed variables
                                prom = this.getFixedValue(value, renderedField);
                            } else if (typeof value === 'string' && value.indexOf('|') === 0) {
                                prom = Promise.resolve(this.getDynamicValue(fieldId, value));
                            } else {
                                prom = Promise.resolve(value);
                            }

                            prom.
                                then((value) => {
                                    if (renderedField instanceof MultiLineTextField) {
                                        (<MultiLineTextField>renderedField).hideSpinner();
                                    }
                                    FieldController.setValue(fieldId, value, true);
                                });
                        }
                    }
                }
            }
        })
            .catch(e => {
                console.log('setFieldValue Error', e, e.stack);
            });
    }

    getTemplate(projectId: string, issueTypeId: string): YasoonDefaultTemplate {
        let result: YasoonDefaultTemplate = null;
        if (this.defaultTemplates) {
            this.defaultTemplates.some((template) => {
                //Check if Project and issueType matches
                if ((template.projectId === '-1' || template.projectId === projectId) &&
                    (template.issueTypeId === '-1' || template.issueTypeId === issueTypeId)) {
                    result = template;
                    return true;
                }
                return false;
            });
        }
        return result;
    }

    showTemplateSelection() {
        let namedTemplates = this.defaultTemplates.filter((t) => t.templateName);
        let senderTemplates = [];
        if (this.emailController) {
            senderTemplates = this.senderTemplates;
        }

        if (!this.loadTemplateSelectionPromise) {
            this.loadTemplateSelectionPromise = Promise.resolve($.getScript(yasoon.io.getLinkPath('templates/selectTemplateDialog.js')))
                .then(() => {
                    return jira.templates.selectTemplateDialog({
                        senderMail: (this.emailController) ? this.emailController.getSenderEmail() : '',
                        senderTemplates: senderTemplates,
                        namedTemplates: namedTemplates
                    });
                });
        }

        this.loadTemplateSelectionPromise.then((tmpl) => {
            let dialog = Bootbox.showDialog('Select Template', tmpl, () => {
                $('.trigger-named-template').click((e) => {
                    let templateName = $(e.target).text();
                    this.dialogSelectedTemplate = namedTemplates.filter((t) => t.templateName === templateName)[0];

                    //First select Initial Values
                    this.setInitialValues({ projectId: this.dialogSelectedTemplate.projectId, issueTypeId: this.dialogSelectedTemplate.issueTypeId })
                        .spread((renderRequired: boolean) => {
                            if (!renderRequired) {
                                this.setFieldValues(this.dialogSelectedTemplate);
                                this.dialogSelectedTemplate = null;
                            }
                            dialog.modal('hide');
                        });

                });

                $('.trigger-sender-template').click((e) => {
                    let projectId = $(e.currentTarget).data('projectId');
                    this.dialogSelectedTemplate = senderTemplates.filter((t) => t.projectId == projectId)[0];

                    if (this.dialogSelectedTemplate) {
                        //First select Initial Values
                        this.setInitialValues({ projectId: this.dialogSelectedTemplate.projectId, issueTypeId: this.dialogSelectedTemplate.issueTypeId })
                            .spread((renderRequired: boolean) => {
                                if (!renderRequired) {
                                    this.setFieldValues(this.dialogSelectedTemplate);
                                    this.dialogSelectedTemplate = null;
                                }
                                dialog.modal('hide');
                            });
                    }
                });
            });
        });

    }

    containsVariable(value: string): boolean {
        return (value.indexOf && value.indexOf('<') === 0 && value.indexOf('>') > 0);
    }


    saveSenderTemplate(values: JiraIssue, project: JiraProject) {
        if (this.emailController && this.emailController.mail) {
            if (!project) {
                console.error('Trying to save a senderTemplate without project');
                return;
            }

            if (!this.emailController.getSenderEmail()) {
                console.log('No sender email address.'); //Can happen e.g. on drafts
                return;
            }

            let fields: any = {};
            try {
                //We want the templates to be the same as in the JIRA addon, so we cannot use the values.fields, as they use deep objects. e.g. reporter: { name: 'admin' }
                //We need just reporter: 'admin', so we get all values again from the rendered Fields
                for (let fieldId in values.fields) {
                    if (fieldId != 'summary' && fieldId != 'description' && fieldId != 'duedate' && fieldId != 'project' && fieldId != 'issuetype') {
                        try {
                            fields[fieldId] = FieldController.getField(fieldId).getDomValue();
                        } catch (e) {
                            console.log('Couldnt get field ' + fieldId, e, e.stack);
                        }
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
                    lastUpdated: new Date().toISOString()
                };

                console.log('SenderTemplate', template);
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
                let lastUpdated: string = new Date(2099, 0, 1).toISOString();
                for (let mail in this.allTemplates) {
                    let currentTemplates = this.allTemplates[mail] || [];
                    currentTemplates.forEach((t, index) => {
                        counter++;
                        if (lastUpdated > t.lastUpdated) {
                            templateIndex = index;
                            lastUpdated = t.lastUpdated;
                            senderMail = mail;
                        }
                    });
                }

                if (counter > EmailController.settingMaxTemplates) {
                    this.allTemplates[senderMail].splice(templateIndex, 1);
                    if (this.allTemplates[senderMail].length === 0) {
                        delete this.allTemplates[senderMail];
                    }
                }

                this.allTemplates[this.emailController.getSenderEmail().toLowerCase()] = this.senderTemplates;
                let data = JSON.stringify(this.allTemplates)
                yasoon.setting.setAppParameter(EmailController.settingCreateTemplates, data);
            } catch (e) {
                //Saving the template should never interrupt saving...
                yasoon.util.log('Error while saving sender template', yasoon.util.severity.warning, getStackTrace(e));
                console.log('Error while saving sender template', e, e.stack);
            }
        }
    }

    private getFixedValue(value: string, field: Field): Promise<any> {
        let result = null;
        if (value === '<TODAY>') {
            result = moment(new Date()).format('YYYY-MM-DD');
        } else if (value.indexOf('<TODAY>') === 0) {
            try {
                //Replace all non numeric chars
                let numOfDays = parseInt(value.replace(/\D/g, ''));
                let currentDate = new Date();
                currentDate.setDate(currentDate.getDate() + numOfDays);
                result = moment(currentDate).format('YYYY-MM-DD');
            } catch (e) {

            }
        } else if (value === '<USER>') {
            result = this.ownUser.name || this.ownUser.key;
        } else if (value === '<SUBJECT>' && this.emailController) {
            result = this.emailController.getSubject();
        } else if (value === '<BODY>' && this.emailController) {
            if (!this.emailContent) {
                if (field instanceof MultiLineTextField) {
                    (<MultiLineTextField>field).showSpinner();
                }
                return this.emailController.getCurrentMailContent(true);
            }
            result = this.emailContent;
        } else if (value === '<SENDER>' && this.emailController) {
            //Special Handling for User Picker
            if (field instanceof UserSelectField) {
                result = this.emailController.getSenderUser();
            } else {
                result = this.emailController.getSenderEmail();
            }
        } else if (value === '<SENTAT>' && this.emailController) {
            result = moment(this.emailController.getSentAt()).format('YYYY-MM-DD hh:mm:ss');
        }

        return Promise.resolve(result);
    }

    private getDynamicValue(fieldId: string, value: string) {
        let parentFieldId = value.replace(/\|/g, '').toLowerCase();
        let parentField = FieldController.getField(parentFieldId);
        if (parentField) {
            if (!this.dependentFields[parentField.id]) {
                this.dependentFields[parentField.id] = [];
            }

            this.dependentFields[parentField.id].push(fieldId);
            FieldController.registerEvent(EventType.FieldChange, this, parentField.id);

            return parentField.getValue(false);
        }
    }

    private getGroup(group: string) {
        if (group === '-1') {
            return {
                name: 'Default',
                position: 1000
            };
        } else {
            return this.groupHierachy.filter((userGroup) => {
                return userGroup.name === group;
            })[0];
        }
    }

    private cleanupEvents() {
        //FieldController Events will be unloaded automatically whenever a new meta is loaded
        //just reinitialize dependedFields
        this.dependentFields = {};
    }
}