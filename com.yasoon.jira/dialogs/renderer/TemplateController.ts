/// <reference path="../../definitions/moment.d.ts" />

class TemplateController implements IFieldEventHandler {
    static settingGroupHierarchy = 'groups';
    static settingInitialSelection = 'initialSelection';
    static settingDefaultTemplates = 'defaultTemplates';


    private ownUser: JiraUser;
    private groupHierachy: YasoonGroupHierarchy[] = [];
    private dependentFields: { [id: string]: string } = {};
    private emailController: EmailController;
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
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange) {
            let dependentFieldId = this.dependentFields[source];
            let dependentField = FieldController.getField(dependentFieldId);
            let currentValue = dependentField.getValue(false);
            if (!currentValue || !dependentField.initialValue || JSON.stringify(currentValue) == JSON.stringify(dependentField.initialValue)) {
                FieldController.setValue(dependentFieldId, newValue, true);
            }
        }

        return null;
    }

    setInitialValues() {
        if (this.initialSelection) {
            if (this.initialSelection.projectId) {
                FieldController.setValue(FieldController.projectFieldId, this.initialSelection.projectId, true);
            }

            if (this.initialSelection.issueTypeId != '-1') {
                FieldController.setValue(FieldController.issueTypeFieldId, this.initialSelection.issueTypeId, true);
            }
        }
    }

    setFieldValues(projectId: string, issueTypeId: string) {
        let promise = Promise.resolve([]);
        //Make sure emailData are loaded
        if (this.emailController) {
            promise = Promise.all([this.emailController.getCurrentMailContent(true), this.emailController.loadSenderPromise ]);
        }

        promise.spread((content:string) => {
            this.emailContent = content;
            if (this.defaultTemplates) {
                //Default Templates are already filtered by current user groups and are sorted by priority --> defined on server
                //Here we blindly pick the first template that matches our criteria
                let result = this.getTemplate(projectId, issueTypeId);

                if (result && result.fields) {
                    result.fields.forEach((field) => {
                        //Check for variables
                        let value = null;
                        let renderedField = FieldController.getField(field.fieldId);
                        if (typeof field.fieldValue === 'string' && field.fieldValue.indexOf('<') === 0) {
                            //Fixed variables
                            value = this.getFixedValue(field.fieldValue, renderedField.constructor['name']);
                        } else if (typeof field.fieldValue === 'string' && field.fieldValue.indexOf('|') === 0) {
                            value = this.getDynamicValue(field.fieldId, field.fieldValue);
                        } else {
                            value = field.fieldValue
                        }

                        if (value) {
                            FieldController.setValue(field.fieldId, value, true);
                        }
                    });
                }
            }
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
            if(fieldType === 'UserSelectField') {
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

    private getTemplate(projectId: string, issueTypeId: string): YasoonDefaultTemplate {
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