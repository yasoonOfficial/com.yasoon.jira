/// <reference path="../../definitions/bluebird.d.ts" />
/// <reference path="../../definitions/jira.d.ts" />
/// <reference path="../../definitions/common.d.ts" />
/// <reference path="../../definitions/yasoon.d.ts" />
/// <reference path="../../definitions/allFields.d.ts" />
/// <reference path="./../renderer/FieldController.ts" />
/// <reference path="./../renderer/EmailController.ts" />
/// <reference path="./../renderer/TemplateController.ts" />
/// <reference path="./../renderer/RecentItemController.ts" />
/// <reference path="./../renderer/ServiceDeskController.ts" />

var jira: any = null; //Legacy

interface newEditDialogInitParams {
    mail: yasoonModel.Email;
    settings: JiraAppSettings;
    text: string;
    projects: JiraProject[];
    issue: JiraIssue;
    type: JiraDialogType;
    ownUser: JiraUser;
    editIssueId: string;
    userMeta: JiraUserConfigMeta[];
    createMetas: JiraProjectMeta[];
    systemInfo: JiraSystemInfo;
}

class NewEditDialog implements IFieldEventHandler {
    //For application
    icons: JiraIconController = new JiraIconController();
    recentItems: RecentItemController = null;
    emailController: EmailController = null;
    templateController: TemplateController = null;
    serviceDeskController: ServiceDeskController = null;
    selectedProject: JiraProject = null;
    selectedIssueType: JiraIssueType = null;
    issueCreatedKey: string = null;

    //From Init
    isEditMode: boolean = false;
    systemInfo: JiraSystemInfo = null;
    editIssueId: string = null;
    settings: JiraAppSettings = null;
    ownUser: JiraUser = null;
    mail: yasoonModel.Email = null;
    cacheUserMeta: JiraUserConfigMeta[] = [];
    cacheCreateMetas: JiraProjectMeta[] = [];
    cacheProjects: JiraProject[] = [];
    type: JiraDialogType = '';

    //Current Issue for editIssueId
    currentIssue: JiraIssue = null;

    //Order of Fields in the form if in fixed mode. Fields not part of the array will be rendered afterwards
    fieldOrder: string[] = [
        'summary',
        'priority',
        'duedate',
        'components',
        'versions',
        'fixVersions',
        'assignee',
        'reporter',
        'environment',
        'description',
        'attachment',
        'labels',
        'timetracking'
    ];

    init = (initParams: newEditDialogInitParams) => {
        jira = this;
        //Parameter taken over from Main JIRA
        this.settings = initParams.settings;
        this.ownUser = initParams.ownUser;
        this.isEditMode = !!initParams.editIssueId;
        this.editIssueId = initParams.editIssueId;
        this.mail = initParams.mail;
        this.cacheUserMeta = initParams.userMeta || [];
        this.cacheCreateMetas = initParams.createMetas || [];
        this.cacheProjects = initParams.projects || [];
        this.systemInfo = initParams.systemInfo || { versionNumbers: [6, 4, 0] };
        this.type = initParams.type || '';

        //Register Close Handler
        yasoon.dialog.onClose(this.cleanup);

        // Resize Window if nessecary (sized are optimized for default Window - user may have changed that)
        resizeWindowNew();

        //It's the edit case
        //Add Class to change title & labels
        if (this.isEditMode) {
            $('#create-issue-dialog').addClass('edit-mode');
        }

        setTimeout(() => { this.initDelayed(); }, 1);
    }

    initDelayed() {
        try {
            //Init Fields - do this lately so yasoon.i18n is initialized
            this.loadFields();

            //Init Controller
            if (this.mail) {
                this.emailController = new EmailController(this.mail, this.type, this.settings, this.ownUser);
            }

            if (!this.isEditMode) {
                this.templateController = new TemplateController(this.ownUser, this.emailController);
            }

            this.recentItems = new RecentItemController(this.ownUser);
            this.serviceDeskController = new ServiceDeskController();

            //Render Header fields
            let projParams: ProjectFieldOptions = {
                cache: this.cacheProjects,
                allowClear: false,
                isMainProjectField: true,
                showTemplates: true
            };

            FieldController.loadField(ProjectField.defaultMeta, ProjectField, projParams);
            FieldController.render(FieldController.projectFieldId, $('#HeaderArea'));

            FieldController.loadField(IssueTypeField.defaultMeta, IssueTypeField);
            FieldController.render(FieldController.issueTypeFieldId, $('#IssueArea'));

            //Register Attachment Field with concrete attachments
            let attachments: JiraFileHandle[] = [];
            if (this.emailController) {
                attachments = this.emailController.getAttachmentFileHandles();
            }
            FieldController.register(FieldController.attachmentFieldId, AttachmentField, attachments);

            //Hook Events
            FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
            FieldController.registerEvent(EventType.FieldChange, this, FieldController.issueTypeFieldId);

            if (this.isEditMode) {
                $('#LoaderArea').removeClass('hidden');

                //Set Project and issueType read-only
                $('#' + FieldController.projectFieldId).prop('disabled', true);
                $('#' + FieldController.issueTypeFieldId).prop('disabled', true);
                jiraGet('/rest/api/2/issue/' + this.editIssueId + '?expand=editmeta,renderedFields')
                    .then((issueString) => {
                        this.currentIssue = JSON.parse(issueString);

                        //Set Project and issueType 
                        FieldController.setValue(FieldController.projectFieldId, this.currentIssue.fields['project'], true);
                        FieldController.setValue(FieldController.issueTypeFieldId, this.currentIssue.fields['issuetype'], true);
                    })
                    .catch((e) => {
                        $('#MainAlert').removeClass('hidden').find('.error-text').text(yasoon.i18n('dialog.errorInitConnection'));
                        console.log('Error during init of Edit View', e);
                        yasoon.util.log('Error during init of Edit View. ' + e.message, yasoon.util.severity.warning, getStackTrace(e));
                    });
            } else {
                this.templateController.setInitialValues();
            }

            //Submit Button - (Create & Edit)
            $('#create-issue-submit').click((e) => { this.submitForm(e); });

            $('#create-issue-cancel').click(() => {
                this.close({ action: 'cancel' });
            });
        } catch (e) {
            yasoon.util.log('An error occured during initialization ' + e.message, yasoon.util.severity.warning, getStackTrace(e));
        }
    }

    cleanup = () => {
        //Invalidate dialog events so the following won't throw any events => will lead to errors
        // due to pending dialog.close
        yasoon.dialog.clearEvents();
        FieldController.raiseEvent(EventType.Cleanup, null);
    }

    close(params: YasoonDialogCloseParams) {
        //Check if dialog should be closed or not
        if (params && params.action === 'success' && $('#qf-create-another').is(':checked')) {
            $('#JiraSpinner').addClass('hidden');
            $('#create-issue-submit').prop('disabled', false);
            $('.form-body').scrollTop(0);

            let field = FieldController.getField('summary');
            if (field) {
                field.setValue('');
            }
            field = FieldController.getField('description');
            if (field) {
                field.setValue('');
            }
            //Cleanup attachments
            FieldController.raiseEvent(EventType.AttachmentChanged, []);
        } else {
            if (this.mail) {
                params.mail = {
                    entryId: this.mail.entryId,
                    storeId: this.mail.storeId
                };
            }

            yasoon.dialog.close(params);
        }
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (source === FieldController.projectFieldId) {
            this.selectedProject = newValue;

            if (this.selectedProject) {
                $('#IssueArea').removeClass('hidden');

                //Check Service Desk
                $('#ServiceArea').addClass('hidden');  //IssueTypeField Button will toggle this
            }
        } else if (source === FieldController.issueTypeFieldId) {
            this.selectedIssueType = newValue;
            if (this.selectedIssueType.subtask) {
                if (!FieldController.getField(FieldController.issueFieldId)) {
                    //First time we need the issue field
                    let issueField = <IssueField>FieldController.loadField(IssueField.defaultMeta, IssueField);
                    issueField.setProject(this.selectedProject);
                    FieldController.render(FieldController.issueFieldId, $('#SubtaskArea'));
                }

                $('#SubtaskArea').removeClass('hidden');
            } else {
                $('#SubtaskArea').addClass('hidden');
            }

            //Get latest meta and start new Rendering
            $('#LoaderArea').removeClass('hidden');
            $('#ContentArea').css('visibility', 'hidden');
            this.getMetaData()
                .then((meta) => {
                    //Set this as current meta
                    FieldController.loadMeta(meta);
                    return this.renderIssue(meta);
                })
                .then(() => {
                    $('#LoaderArea').addClass('hidden');
                    $('#ContentArea').css('visibility', 'visible');
                })
                .then(() => {
                    //Set reporter
                    let reporterField = <UserSelectField>FieldController.getField(FieldController.reporterFieldId);
                    if (reporterField) {
                        reporterField.setValue(this.ownUser);
                    }

                    //Set all Values in edit case
                    if (this.isEditMode && this.currentIssue) {
                        FieldController.setFormData(this.currentIssue);
                    }

                    //Set Templates Values
                    if (this.templateController) {
                        this.templateController.applyTemplate(this.selectedProject.id, this.selectedIssueType.id);
                    }
                })
                .catch((e) => {
                    let type: number = yasoon.util.severity.warning;
                    if (e instanceof jiraSyncError) {
                        $('#MainAlert').removeClass('hidden').find('.error-text').text(yasoon.i18n('dialog.errorInitConnection'));
                    } else {
                        type = yasoon.util.severity.error;
                        $('#MainAlert').removeClass('hidden').find('.error-text').text(yasoon.i18n('dialog.errorInitUnknown'));
                    }

                    console.log('Error during rendering', e, e.stack);
                    yasoon.util.log('An error occured during rendering. ' + e.message, type, getStackTrace(e));
                });

        }
        return null;
    }

    submitForm(e: JQueryEventObject) {
        e.preventDefault();
        //Reset data
        let lifecycleData: LifecycleData = null;
        let result: any = {};
        this.issueCreatedKey = null;

        //Prepare UI
        $('#MainAlert').addClass('hidden');
        $('#create-issue-submit').prop('disabled', true);
        $('#JiraSpinner').removeClass('hidden');

        //Check if Request type is needed and add it
        let isServiceDesk = this.serviceDeskController.isServiceDeskActive();

        return Promise.resolve()
            .then(() => {
                //1. Collect data:
                result = FieldController.getFormData(this.isEditMode);

                //2.1 Remove special data
                delete result.fields[FieldController.requestTypeFieldId];
                delete result.fields[FieldController.onBehalfOfFieldId];

                //2.2
                if (isServiceDesk) {
                    //This will be overwritten by ServiceDeskController - it's may added in afterSave
                    delete result.fields[FieldController.reporterFieldId];
                }

                //Inform Fields that save is going to start.
                lifecycleData = {
                    cancel: false,
                    data: result
                };

                //Wait till all beforeSave actions are done
                return FieldController.raiseEvent(EventType.BeforeSave, lifecycleData);
            })
            .then(() => {
                if (result.cancel) {
                    //Todo cancel this shit
                    //Not yet supported :-)
                }

                if (isServiceDesk && !this.isEditMode)
                    return this.serviceDeskController.doBeforeSave(result);
                else
                    return Promise.resolve<ServiceDeskSaveResult>({ issueCreated: false });
            })
            .then((sdData: ServiceDeskSaveResult) => {
                let doUpdate = this.isEditMode || sdData.issueCreated;
                let issueId = this.editIssueId ? this.editIssueId : sdData.issueId;

                //Switch for edit or create
                let url = (doUpdate) ? '/rest/api/2/issue/' + issueId : '/rest/api/2/issue';
                let method = (doUpdate) ? yasoon.ajaxMethod.Put : yasoon.ajaxMethod.Post;

                //Submit request	
                return [
                    sdData,
                    jiraAjax(url, method, JSON.stringify(result))
                ];
            })
            .spread((sdData: ServiceDeskSaveResult, data: string) => {
                if (this.isEditMode) {
                    this.issueCreatedKey = this.currentIssue.key;
                    return jiraGet('/rest/api/2/issue/' + this.currentIssue.id);
                } else if (sdData.issueCreated) {
                    this.issueCreatedKey = sdData.issueKey;
                    return jiraGet('/rest/api/2/issue/' + sdData.issueId);
                } else {
                    let issue = JSON.parse(data);//A non-populated issue
                    this.issueCreatedKey = issue.key;
                    return jiraGet('/rest/api/2/issue/' + issue.id);
                }
            })
            .then((data: string) => {
                let issue: JiraIssue = JSON.parse(data);
                issue.fields['project'] = this.selectedProject;
                lifecycleData.newData = issue;

                //Save Template if created by Email
                if (this.emailController) {
                    this.emailController.saveSenderTemplate(lifecycleData.data, issue.fields['project']);
                }

                //Check if SD needs to be called
                if (isServiceDesk && !this.isEditMode)
                    return this.serviceDeskController.doAfterSave(issue).return(lifecycleData);

                return lifecycleData;
            })
            .then(lifecycleData => {
                //Wait till all AfterSave actions are done
                return FieldController.raiseEvent(EventType.AfterSave, lifecycleData);
            })
            .then(() => {
                let closeParams: YasoonDialogCloseParams = {
                    action: 'success',
                    changeType: (this.isEditMode) ? 'updated' : 'created',
                    issueKey: this.issueCreatedKey
                };
                this.close(closeParams);
            })
            .catch((e) => {
                $('#JiraSpinner').addClass('hidden');

                let text = 'Unknown';
                if (e instanceof jiraSyncError) {
                    text = e.getUserFriendlyError();
                } else if (e.message) {
                    text = e.message;
                }

                yasoon.util.log('Couldn\'t submit New Issue Dialog: ' + text + ' \n Error: ' + JSON.stringify(e) + ' \n Issue: ' + JSON.stringify(result), yasoon.util.severity.warning, getStackTrace(e));
                console.log(text, e, e.stack);
                if (this.issueCreatedKey !== null) {
                    $('#MainAlert').removeClass('hidden').find('.error-text').html(yasoon.i18n('dialog.errorAfterSubmitIssue', { error: text }));
                } else {
                    $('#create-issue-submit').prop('disabled', false);
                    $('#MainAlert').removeClass('hidden').find('.error-text').html(yasoon.i18n('dialog.errorSubmitIssue', { error: text }));

                }
            });
    }

    renderIssue(meta: { [id: string]: JiraMetaField }) {
        return this.renderIssueUser(meta)
            .catch((e) => {
                console.log('Error in new renderLogic - switch to old one', e, e.stack);
                return this.renderIssueFixed(meta);
            })
            .finally(() => {
                return FieldController.raiseEvent(EventType.AfterRender, {});
            });
    }

    renderIssueUser(meta: { [id: string]: JiraMetaField }): Promise<any> {
        return this.getUserPreferences()
            .then((renderData) => {
                //First clean up everything
                FieldController.cleanupHtml();
                $('#ContainerFields').empty();
                $('#tab-list').empty();

                //Render each field
                let renderedTabs: { [id: string]: boolean } = {};
                for (let fieldName in renderData.fields) {
                    let field = renderData.fields[fieldName];
                    if (field.id === FieldController.projectFieldId || field.id === FieldController.issueTypeFieldId)
                        continue;

                    //Check if userPrefences allow current field
                    if (renderData.userPreferences.useQuickForm && (renderData.userPreferences.fields.indexOf(field.id) === -1 && field.required === false)) {
                        continue;
                    }

                    //Render tab if nessecary
                    var containerId = '#ContainerFields';
                    if (renderData.sortedTabs.length > 1) {
                        if (!renderedTabs[field.tab.position]) {
                            $('#tab-list').append('<li role="presentation" class="' + ((field.tab.position === 0) ? 'active' : '') + '"><a href="#tab-content' + field.tab.position + '" role="tab" data-toggle="tab">' + field.tab.label + '</a></li>');
                            $('#ContainerFields').addClass('tab-content');
                            $('#ContainerFields').append('<div role="tabpanel" class="tab-pane" id="tab-content' + field.tab.position + '"></div>');
                            if (field.tab.position === 0) {
                                $('#tab-content' + field.tab.position).addClass('active');

                            }
                            renderedTabs[field.tab.position] = true;
                        }
                        containerId = '#tab-content' + field.tab.position;
                    }
                    if (meta[field.id]) {
                        FieldController.render(field.id, $(containerId));
                    }
                }

                //Tabs nessecary?
                if (Object.keys(renderedTabs).length > 1) {
                    $('#tab-list').removeClass('hidden');
                } else {
                    $('#tab-list').addClass('hidden');
                }
            });
    }

    renderIssueFixed(meta: { [id: string]: JiraMetaField }): void {
        $('#ContainerFields').empty();
        $('#tab-list').empty();
        $('#tab-list').addClass('hidden');

        let addedFields: string[] = [];

        //Render Standard Fields on a predefined order if they are in the current meta. (We do not get any order from JIRA, so we assume one for standard fields)
        for (let name in this.fieldOrder) {
            if (meta[name]) {
                FieldController.render(name, $('#ContainerFields'));
                addedFields.push(name);
            }
        }

        //Render remaining fields
        for (let name in Object.keys(meta)) {
            if (addedFields.indexOf(name) === -1) {
                FieldController.render(name, $('#ContainerFields'));
            }
        }
    }


    getUserPreferences(): Promise<JiraUserConfigMeta> {
        if (this.isEditMode) {
            return this.getUserPreferencesEdit(this.editIssueId);
        } else {
            return this.getUserPreferencesNew(this.selectedProject.id, this.selectedIssueType.id);
        }
    }

    getUserPreferencesNew(projectId: string, issueTypeId: string): Promise<JiraUserConfigMeta> {
        //Check Cache
        if (this.cacheUserMeta && this.cacheUserMeta[projectId] && this.cacheUserMeta[projectId][issueTypeId]) {
            return Promise.resolve(this.cacheUserMeta[projectId][issueTypeId]);
        }

        return jiraGet('/secure/QuickCreateIssue!default.jspa?decorator=none&pid=' + projectId + '&issuetype=' + issueTypeId)
            .then((data) => {
                if (!this.cacheUserMeta[projectId]) {
                    this.cacheUserMeta[projectId] = {};
                }
                this.cacheUserMeta[projectId][issueTypeId] = JSON.parse(data);
                return this.cacheUserMeta[projectId][issueTypeId];
            })
            .catch((e) => {
                console.log('An error occured while getting userPreferences for Create', e, e.stack);
                yasoon.util.log('An error occured while getting userPreferences for Create. ' + e.message, yasoon.util.severity.warning, getStackTrace(e));
            });
    }

    getUserPreferencesEdit(editIssueId: string): Promise<JiraUserConfigMeta> {
        return jiraGet('/secure/QuickEditIssue!default.jspa?issueId=' + editIssueId + '&decorator=none')
            .then((data) => {
                return JSON.parse(data);
            })
            .catch((e) => {
                console.log('An error occured while getting userPreferences for Edit', e, e.stack);
                yasoon.util.log('An error occured while getting userPreferences for Edit. ' + e.message, yasoon.util.severity.warning, getStackTrace(e));
            });
    }

    getMetaData(): Promise<{ [id: string]: JiraMetaField }> {
        if (this.isEditMode) {
            return Promise.resolve(this.getEditMetaData());
        } else {
            return this.getCreateMetaData(this.selectedProject.id, this.selectedIssueType.id);
        }
    };

    getEditMetaData(): { [id: string]: JiraMetaField } {
        if (this.currentIssue && this.currentIssue.editmeta) {
            return this.currentIssue.editmeta.fields;
        }
    }

    getCreateMetaData(projectId: string, issueTypeId: string): Promise<{ [id: string]: JiraMetaField }> {
        //Check in Cache
        //Do not check cache for Teamlead Instance to have latest data every time.
        if (this.cacheCreateMetas && this.cacheCreateMetas.length > 0 && !this.settings.teamlead) {
            let projectMeta = this.cacheCreateMetas.filter((m) => { return m.id === projectId; })[0];
            if (projectMeta) {
                let issueType = projectMeta.issuetypes.filter((it) => { return it.id === issueTypeId; })[0];
                if (issueType) {
                    return Promise.resolve(issueType.fields);
                }
            }
        }

        return jiraGet('/rest/api/2/issue/createmeta?projectIds=' + projectId + '&expand=projects.issuetypes.fields')
            .then((data) => {
                let meta = JSON.parse(data);
                //Find selected project (should be selected by API Call, but I'm not sure if it works due to missing test data )
                let projectMeta: JiraProjectMeta = meta.projects.filter((p) => { return p.id === projectId; })[0];
                if (projectMeta) {
                    this.cacheCreateMetas.push(projectMeta);
                    let issueType = projectMeta.issuetypes.filter((it) => { return it.id === issueTypeId; })[0];
                    if (issueType) {
                        return Promise.resolve(issueType.fields);
                    }
                }
            });
    }

    loadFields() {
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:textfield', SingleTextField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:url', SingleTextField);
        FieldController.register('summary', SingleTextField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:textarea', MultiLineTextField);
        FieldController.register('description', MultiLineTextField, { hasMentions: true, isMainField: true });
        FieldController.register('environment', MultiLineTextField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes', CheckboxField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons', RadioField);
        FieldController.register('duedate', DateField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:datepicker', DateField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:datetime', DateTimeField);
        FieldController.register('labels', LabelSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:labels', LabelSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:float', NumberField);
        FieldController.register('priority', JiraSelectField);
        FieldController.register('security', JiraSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:select', JiraSelectField);
        FieldController.register('components', JiraSelectField, { multiple: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multiselect', JiraSelectField, { multiple: true });
        FieldController.register('fixVersions', VersionSelectField, { multiSelect: true, releasedFirst: false });
        FieldController.register('versions', VersionSelectField, { multiSelect: true, releasedFirst: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multiversion', VersionSelectField, { multiSelect: true, releasedFirst: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:version', VersionSelectField, { multiSelect: false, releasedFirst: true });
        FieldController.register('reporter', UserSelectField);
        FieldController.register('assignee', UserSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:userpicker', UserSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker', UserSelectField, { multiple: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect', CascadedSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:project', ProjectField, { cache: jira.cacheProjects, allowClear: true });
        FieldController.register('timetracking', TimeTrackingField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:grouppicker', GroupSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multigrouppicker', GroupSelectField, { multiple: true });

        //Software
        FieldController.register('com.pyxis.greenhopper.jira:gh-epic-link', EpicLinkSelectField);
        FieldController.register('com.pyxis.greenhopper.jira:gh-sprint', SprintSelectField);
        FieldController.register('com.pyxis.greenhopper.jira:gh-epic-label', SingleTextField);

        //Service Desk
        FieldController.register('com.atlassian.servicedesk:sd-request-participants', UserSelectField, { multiple: true });
        //https://jira.atlassian.com/browse/JSD-4353
        //https://jira.atlassian.com/browse/JSD-4723
        //FieldController.register('com.atlassian.servicedesk:sd-customer-organizations', OrganizationField);

        //Tempo
        FieldController.register('com.tempoplugin.tempo-accounts:accounts.customfield', TempoAccountField);
        FieldController.register('com.tempoplugin.tempo-teams:team.customfield', TempoTeamField);
        //In Cloud we also have this one?!: com.atlassian.plugins.atlassian-connect-plugin:io.tempo.jira__account

        //Teamlead
        if (this.settings.teamlead && this.settings.teamlead.apiKey) {
            FieldController.register('ru.teamlead.jira.plugins.teamlead-crm-plugin-for-jira:company-select-field', TeamLeadCompanyField);
            FieldController.register('ru.teamlead.jira.plugins.teamlead-crm-plugin-for-jira:companies-select-field', TeamLeadCompanyField, { multiple: true });
            FieldController.register('ru.teamlead.jira.plugins.teamlead-crm-plugin-for-jira:contact-select-field', TeamLeadContactField);
            FieldController.register('ru.teamlead.jira.plugins.teamlead-crm-plugin-for-jira:contact-field', TeamLeadOldContactField);
            FieldController.register('ru.teamlead.jira.plugins.teamlead-crm-plugin-for-jira:contacts-field', TeamLeadOldContactField, { multiple: true });
            FieldController.register('ru.teamlead.jira.plugins.teamlead-crm-plugin-for-jira:single-product-select-field', TeamLeadProductField);
            FieldController.register('ru.teamlead.jira.plugins.teamlead-crm-plugin-for-jira:multi-products-select-field', TeamLeadProductField, { multiple: true });
        }
        //Watcher Field
        FieldController.register('com.burningcode.jira.issue.customfields.impl.jira-watcher-field:watcherfieldtype', UserSelectField, { multiple: true });

        //Intenso Dynamic (currently without Dynamic - just render)
        FieldController.register('com.intenso.jira.plugin.dynamic-forms:dynamic-cascadingselect-customfield', CascadedSelectField);
        FieldController.register('com.intenso.jira.plugin.dynamic-forms:dynamic-check-box-customfield', CheckboxField);
        FieldController.register('com.intenso.jira.plugin.dynamic-forms:dynamic-multiselect-customfield', JiraSelectField, { multiple: true });
        FieldController.register('com.intenso.jira.plugin.dynamic-forms:dynamic-radiobutton-customfield', RadioField);
        FieldController.register('com.intenso.jira.plugin.dynamic-forms:dynamic-select-customfield', JiraSelectField);
        FieldController.register('com.intenso.jira.plugin.dynamic-forms:secured-select', JiraSelectField);

    };
}

yasoon.dialog.load(new NewEditDialog());

function resizeWindowNew() {
    var bodyHeight = $('body').height();
    if (bodyHeight > 460) {
        $('body').css('overflow-y', 'hidden');
        $(".form-body").height(bodyHeight - 162);
    } else {
        $('body').css('overflow-y', 'scroll');
        $(".form-body").height(290);
    }
}


$(function () {
    $('body').css('overflow-y', 'hidden');
    $('form').on('submit', function (e) {
        e.preventDefault();
        return false;
    });
});

$(window).resize(resizeWindowNew);

//@ sourceURL=http://Jira/Dialog/jiraNewEditIssue.js