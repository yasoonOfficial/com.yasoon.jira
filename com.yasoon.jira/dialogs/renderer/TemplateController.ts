/// <reference path="../../definitions/moment.d.ts" />

class TemplateController implements IFieldEventHandler {
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
            senderTemplates = this.emailController.senderTemplates;
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

    private async getFixedValue(value: string, field: Field): Promise<any> {
        let result = null;
        let regex: RegExp = null;
        //Check if regex is provided
        if (value.indexOf("@") > 0) {
            //Parse stuff
            let r = /^<([^@]*)@(.*)>$/g;
            let rE = r.exec(value);

            value = '<' + rE[1] + '>';
            regex = new RegExp(rE[2]);
        }

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
        } else if (value.indexOf('<BODY') === 0 && this.emailController) {
            if (field instanceof MultiLineTextField) {
                (<MultiLineTextField>field).showSpinner();
            }

            result = await this.emailController.getCurrentMailContent(value !== '<BODY_PLAIN>');
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

        if (regex) {
            let parsedResult = regex.exec(result);
            if (parsedResult.length === 0) {
                result = null;
            } else if (parsedResult.length === 1)
                result = parsedResult[0];
            else if (parsedResult.length === 2)
                result = parsedResult[1]
            else {
                //Todo
            }
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