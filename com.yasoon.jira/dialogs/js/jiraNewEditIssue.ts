/// <reference path="../../definitions/yasoon.d.ts" />
declare var jira;
import { Field, IFieldEventHandler, UiActionEventData, LifecycleData } from 'renderer/Field';
import { EventType } from 'renderer/Enumerations';
import { FieldController } from 'renderer/FieldController';
import { ServiceDeskController, ServiceDeskSaveResult } from 'renderer/ServiceDeskController';
import { RecentItemController } from 'renderer/RecentItemController';
import { EmailController, JiraFileHandle } from 'renderer/EmailController';
import { TemplateController } from 'renderer/TemplateController';
import { ProjectFieldOptions } from 'renderer/fields/ProjectField';
import ProjectField from 'renderer/fields/ProjectField';
import IssueTypeField from 'renderer/fields/IssueTypeField';
import IssueField from 'renderer/fields/IssueField';
import AttachmentField from 'renderer/fields/AttachmentField';
import UserSelectField from 'renderer/fields/UserSelectField';
import { AjaxService, jiraSyncError } from 'AjaxService';
import { Utilities } from 'Util';
import { JiraProject, JiraIssue, JiraDialogType, JiraUser, JiraUserConfigMeta, JiraProjectMeta, JiraSystemInfo, JiraIssueType, JiraMetaField, YasoonDialogCloseParams, YasoonFieldMappingConfig, JiraAppSettings, NewEditDialogInitParams } from '../renderer/JiraModels';

export class NewEditDialog implements IFieldEventHandler {
    //For application
    recentItems: RecentItemController = null;
    emailController: EmailController = null;
    templateController: TemplateController = null;
    serviceDeskController: ServiceDeskController = null;
    selectedProject: JiraProject = null;
    selectedIssueType: JiraIssueType = null;
    issueCreatedKey: string = null;
    defaultWidth: string = '80%';

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

    init = (initParams: NewEditDialogInitParams) => {
        window['jira'] = this;
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
        window['resizeWindowNew']();

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
                AjaxService.get('/rest/api/2/issue/' + this.editIssueId + '?expand=editmeta,renderedFields')
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
                    let issueField = <IssueField>FieldController.loadField(IssueField.defaultMeta, IssueField, { excludeSubtasks: true, multiple: false });
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
            Promise.all([
                this.getMetaData(),
                this.getUserPreferences()
            ])
                .spread((meta: { [id: string]: JiraMetaField }, userMeta: JiraUserConfigMeta) => {
                    //Merge "custom" attributes from usermeta.
                    //DefaultValue and data are parsed from editHtml
                    for (let fieldId in meta) {
                        var currentUserMeta = userMeta.fields.filter(f => f.id === fieldId)[0];
                        if (currentUserMeta) {
                            meta[fieldId].data = currentUserMeta.data;
                            meta[fieldId].defaultValue = currentUserMeta.defaultValue;
                        }
                    }
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
                    AjaxService.ajax(url, method, JSON.stringify(result))
                ];
            })
            .spread((sdData: ServiceDeskSaveResult, data: string) => {
                if (this.isEditMode) {
                    this.issueCreatedKey = this.currentIssue.key;
                    return AjaxService.get('/rest/api/2/issue/' + this.currentIssue.id);
                } else if (sdData.issueCreated) {
                    this.issueCreatedKey = sdData.issueKey;
                    return AjaxService.get('/rest/api/2/issue/' + sdData.issueId);
                } else {
                    let issue = JSON.parse(data);//A non-populated issue
                    this.issueCreatedKey = issue.key;
                    return AjaxService.get('/rest/api/2/issue/' + issue.id);
                }
            })
            .then((data: string) => {
                let issue: JiraIssue = JSON.parse(data);
                issue.fields['project'] = this.selectedProject;
                lifecycleData.newData = issue;

                //Save Template if created by Email
                if (this.templateController) {
                    this.templateController.saveSenderTemplate(lifecycleData.data, issue.fields['project']);
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

        return AjaxService.get('/secure/QuickCreateIssue!default.jspa?decorator=none&pid=' + projectId + '&issuetype=' + issueTypeId)
            .then((data: string) => {
                if (!this.cacheUserMeta[projectId]) {
                    this.cacheUserMeta[projectId] = {};
                }
                this.cacheUserMeta[projectId][issueTypeId] = Utilities.parseUserMeta(data);
                return this.cacheUserMeta[projectId][issueTypeId];
            })
            .catch((e) => {
                console.log('An error occured while getting userPreferences for Create', e, e.stack);
                yasoon.util.log('An error occured while getting userPreferences for Create. ' + e.message, yasoon.util.severity.warning, getStackTrace(e));
            });
    }

    getUserPreferencesEdit(editIssueId: string): Promise<JiraUserConfigMeta> {
        return AjaxService.get('/secure/QuickEditIssue!default.jspa?issueId=' + editIssueId + '&decorator=none')
            .then((data: string) => {
                return Utilities.parseUserMeta(data);
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
    }

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

        return AjaxService.get('/rest/api/2/issue/createmeta?projectIds=' + projectId + '&expand=projects.issuetypes.fields')
            .then((data: string) => {
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

    async loadFields() {
        //https://jira.atlassian.com/browse/JSD-4353
        //https://jira.atlassian.com/browse/JSD-4723
        //"com.atlassian.servicedesk:sd-customer-organizations":"renderer/fields/OrganizationField"

        let fieldMapping = <YasoonFieldMappingConfig>await SystemJS.import('dialogs/config/JiraFieldMapping.json!json');
        await this.registerConfig(fieldMapping);
        fieldMapping = <YasoonFieldMappingConfig>await SystemJS.import('dialogs/config/InsightFieldMapping.json!json');
        await this.registerConfig(fieldMapping);
        fieldMapping = <YasoonFieldMappingConfig>await SystemJS.import('dialogs/config/IntensoFieldMapping.json!json');
        await this.registerConfig(fieldMapping);
        fieldMapping = <YasoonFieldMappingConfig>await SystemJS.import('dialogs/config/TeamleadFieldMapping.json!json');
        await this.registerConfig(fieldMapping);
        fieldMapping = <YasoonFieldMappingConfig>await SystemJS.import('dialogs/config/WatcherFieldMapping.json!json');
        await this.registerConfig(fieldMapping);

        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:project', ProjectField, { cache: jira.cacheProjects, allowClear: true });
    }

    async registerConfig(config: YasoonFieldMappingConfig) {
        for (let key in config) {
            let value = config[key];
            if (typeof value === 'string') {
                let classType = await SystemJS.import(value);
                console.log('Loader', classType);
                FieldController.register(key, classType['default']);
            } else {
                let classType = await SystemJS.import(value.module);
                console.log('Loader', classType);
                FieldController.register(key, classType['default'], value.options);
            }
        }
    }
}