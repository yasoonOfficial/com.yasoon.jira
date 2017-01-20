/// <reference path="../../definitions/moment.d.ts" />

class TemplateController implements IFieldEventHandler {
    static settingGroupHierarchy = 'groups';
    static settingInitialSelection = 'initialSelection';
    static settingDefaultTemplates = 'defaultTemplates';


    private ownUser: JiraUser;
    private groupHierachy: YasoonGroupHierarchy[] = [];
    private dependentFields: { [id: string]: string } = {};
    private emailController: EmailController;
    private loadTemplateSelectionPromise: Promise<string>;
    private dialogSelectedTemplate: YasoonDefaultTemplate;
    initialSelection: YasoonInitialSelection;
    defaultTemplates: YasoonDefaultTemplate[] = [];
    type: JiraDialogType;
    emailContent: string = '';
    senderUser: JiraUser;

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

            this.groupHierachy = data[TemplateController.settingGroupHierarchy];
            initialSelection = data[TemplateController.settingInitialSelection];
            this.defaultTemplates = data[TemplateController.settingDefaultTemplates];
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
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange) {
            let dependentFieldId = this.dependentFields[source];
            let dependentField = FieldController.getField(dependentFieldId);
            let currentValue = dependentField.getValue(false);
            if (!currentValue || !dependentField.initialValue || JSON.stringify(currentValue) == JSON.stringify(dependentField.initialValue)) {
                FieldController.setValue(dependentFieldId, newValue, true);
            }
        } else if (type === EventType.AfterRender && this.dialogSelectedTemplate) {
            //We cannot set the fieldValues directly as fields are not rendered yet.
            //So we save the template in showTemplateSelection and after render, we set the values.
            this.setFieldValues(this.dialogSelectedTemplate);
            this.dialogSelectedTemplate = null;
        }

        return null;
    }

    setInitialValues(initialValues?: YasoonInitialSelection): Promise<any> {
        if (!initialValues) {
            initialValues = this.initialSelection;
        }
        let projPromise = Promise.resolve();
        let issueTypePromise = Promise.resolve();
        if (initialValues) {
            if (initialValues.projectId) {
                projPromise = FieldController.setValue(FieldController.projectFieldId, initialValues.projectId, true);
            }

            if (initialValues.issueTypeId != '-1') {
                issueTypePromise = FieldController.setValue(FieldController.issueTypeFieldId, initialValues.issueTypeId, true);
            }
        }

        return Promise.all([projPromise, issueTypePromise]);
    }

    setFieldValues(template: YasoonDefaultTemplate) {
        let promise = Promise.resolve([]);
        //Make sure emailData are loaded
        if (this.emailController) {
            promise = Promise.all([this.emailController.getCurrentMailContent(true), this.emailController.loadSenderPromise]);
        }

        promise.spread((content: string) => {
            this.emailContent = content;
            if (this.defaultTemplates) {
                //Default Templates are already filtered by current user groups and are sorted by priority --> defined on server
                //Here we blindly pick the first template that matches our criteria
                if (template && template.fields) {
                    for (let fieldId in template.fields) {
                        if (template.fields.hasOwnProperty(fieldId)) {
                            let value = template.fields[fieldId];
                            let renderedField = FieldController.getField(fieldId);
                            if (renderedField) {
                                if (typeof value === 'string' && value.indexOf('<') === 0) {
                                    //Fixed variables
                                    value = this.getFixedValue(value, renderedField.constructor['name']);
                                } else if (typeof value === 'string' && value.indexOf('|') === 0) {
                                    value = this.getDynamicValue(fieldId, value);
                                } else {
                                    value = value
                                }

                                if (value) {
                                    FieldController.setValue(fieldId, value, true);
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    getTemplate(projectId: string, issueTypeId: string): YasoonDefaultTemplate {
        let result: YasoonDefaultTemplate = null;
        this.defaultTemplates.some((template) => {
            //Check if Project and issueType matches
            if ((template.projectId === '-1' || template.projectId === projectId) &&
                (template.issueTypeId === '-1' || template.issueTypeId === issueTypeId)) {
                result = template;
                return true;
            }
            return false;
        });
        return result;
    }

    showTemplateSelection() {
        let namedTemplates = this.defaultTemplates.filter((t) => t.templateName);
        let senderTemplates = [];
        if (this.emailController) {
            senderTemplates = this.emailController.senderTemplates;
        }

        if (!this.loadTemplateSelectionPromise) {
            this.loadTemplateSelectionPromise = Promise.resolve($.getScript(yasoon.io.getLinkPath('templates/selectTemplateDialog.js')))
                .then(() => {
                    return jira.templates.selectTemplateDialog({
                        senderMail: this.emailController.getSenderEmail(),
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
                        .then(() => {
                            dialog.modal('hide');
                        });

                });

                $('.trigger-sender-template').click((e) => {
                    let projectId = $(e.target).data('projectId');
                    this.dialogSelectedTemplate = senderTemplates.filter((t) => t.projectId == projectId)[0];

                    if (this.dialogSelectedTemplate) {
                        //First select Initial Values
                        this.setInitialValues({ projectId: this.dialogSelectedTemplate.projectId, issueTypeId: this.dialogSelectedTemplate.issueTypeId })
                            .then(() => {
                                dialog.modal('hide');
                            });
                    }

                });
            });
        });

    }

    private getFixedValue(value: string, fieldType: string): any {
        if (value === '<TODAY>') {
            return moment(new Date()).format('YYYY-MM-DD');
        } else if (value.indexOf('<TODAY>') === 0) {
            try {
                //Replace all non numeric chars
                let numOfDays = parseInt(value.replace(/\D/g, ''));
                let currentDate = new Date();
                currentDate.setDate(currentDate.getDate() + numOfDays);
                return moment(currentDate).format('YYYY-MM-DD');
            } catch (e) {

            }
        } else if (value === '<USER>') {
            return this.ownUser.name || this.ownUser.key;
        } else if (value === '<SUBJECT>') {
            return this.emailController.getSubject();
        } else if (value === '<BODY>') {
            return this.emailContent;
        } else if (value === '<SENDER>') {
            //Special Handling for User Picker
            if (fieldType === 'UserSelectField') {
                return this.emailController.getSenderUser();
            } else {
                return this.emailController.getSenderEmail();
            }
        } else if (value === '<SENTAT>') {
            return moment(this.emailController.getSentAt()).format('YYYY-MM-DD hh:mm:ss');
        }
    }

    private getDynamicValue(fieldId: string, value: string) {
        let parentFieldId = value.replace(/\|/g, '');
        let parentField = FieldController.getField(parentFieldId);
        if (parentField) {
            this.dependentFields[parentFieldId] = fieldId;
            FieldController.registerEvent(EventType.FieldChange, this, parentFieldId);

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
}