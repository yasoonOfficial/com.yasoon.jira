/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
class IssueTypeField extends Select2Field implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.issueTypeFieldId, get name() { return yasoon.i18n('dialog.issueType'); }, required: true, schema: { system: 'issue', type: '' } };
    static uiActionServiceDesk = 'ServiceDeskActivated';

    private currentProject: JiraProject;
    private initialId: string;
    private emailController: EmailController;
    private serviceDeskController: ServiceDeskController;
    private recentItems: RecentItemController;

    constructor(id: string, field: JiraMetaField) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderIssueType');
        options.allowClear = false;

        super(id, field, options);
        this.emailController = jira.emailController;
        this.serviceDeskController = jira.serviceDeskController;
        this.recentItems = jira.recentItems;

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.requestTypeFieldId);
        FieldController.registerEvent(EventType.AfterRender, this);
        FieldController.registerEvent(EventType.UiAction, this);
    }

    init() {
        //Handled in handleEvent when project changes
    }

    hookEventHandler() {
        super.hookEventHandler();

        $('#switchServiceMode').click((e) => {
            //Just raise Event so this can be raised from outside as well.
            //Ui Changes will be done in HandleEvent()
            let eventData: UiActionEventData = {
                name: IssueTypeField.uiActionServiceDesk,
                value: !$('#switchServiceMode').hasClass('active')
            };

            FieldController.raiseEvent(EventType.UiAction, eventData);

            e.preventDefault();
        });
    }

    render(container: JQuery): void {
        super.render(container);

        if (!jira.isEditMode) {
            container.append(`<br /><a id="switchServiceMode" class="hidden" style="cursor:pointer;" title="">
                            <span class="showPortal"><i class="fa fa-plus"></i><span data-bind="localizedText: 'dialog.SDAssignment'">Service Desk assignment</span> </span>
                            <span class="hidePortal"><i class="fa fa-minus"></i><span data-bind="localizedText: 'dialog.SDAssignment'">Service Desk assignment</span> </span>
                        </a>`);
        }
    }

    convertToSelect2(issueType: JiraIssueType): Select2Element {
        return {
            id: issueType.id,
            text: issueType.name,
            icon: jira.icons.mapIconUrl(issueType.iconUrl),
            data: issueType
        };
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type == EventType.FieldChange) {
            if (source === FieldController.projectFieldId && newValue) {
                let project: JiraProject = newValue;
                if (this.currentProject && this.currentProject.id == project.id)
                    return;

                //If project was changed, we always have to throw change event.
                this.lastValue = null;

                let promise: Promise<JiraProject>;
                if (!project.issueTypes) {
                    this.showSpinner();
                    promise = jiraGet('/rest/api/2/project/' + project.key + '?expand=issueTypes')
                        .then((data: string) => {
                            this.hideSpinner();
                            let proj: JiraProject = JSON.parse(data);
                            return proj;
                        });
                } else {
                    promise = Promise.resolve(project);
                }

                promise.then((proj) => {
                    this.currentProject = proj;
                    let currentIssueType: JiraIssueType = this.getObjectValue();
                    let result: Select2Element[] = proj.issueTypes.map(this.convertToSelect2);

                    this.setData(result);

                    //Check Service Desk
                    if (proj.projectTypeKey === "service_desk") {
                        $(this.ownContainer).find('#switchServiceMode').removeClass('hidden');
                    } else {
                        $(this.ownContainer).find('#switchServiceMode').addClass('hidden');
                    }

                    let issueType: JiraIssueType = null;

                    if (this.recentItems.recentSelection) {
                        let lastIssueType = this.recentItems.recentSelection[proj.id] || null;
                        if (lastIssueType) {
                            issueType = proj.issueTypes.filter((it) => { return it.id === lastIssueType; })[0];
                        }
                    }

                    if (!issueType) {
                        if (this.initialValue && typeof this.initialValue === 'string') {
                            //Check if this issue type is still available for this project
                            issueType = proj.issueTypes.filter((it) => { return it.id === this.initialValue; })[0];
                        } else if (currentIssueType) {
                            issueType = proj.issueTypes.filter((it) => { return it.id === currentIssueType.id; })[0];
                        }
                    }

                    if (issueType) {
                        return this.setValue(issueType);
                    } else {
                        return this.setValue(result[0].data);
                    }
                })
                    .then(() => {
                        this.triggerValueChange();
                    })
                    .catch((e) => { this.handleError(e); });

            } else if (source === FieldController.requestTypeFieldId) {
                let requestType: JiraRequestType = newValue;
                let issueType: Select2Element = this.options.data.filter((sel) => { return sel.id === requestType.issueType.toString(); })[0];
                this.setValue(issueType.data);
            }
        } else if (type === EventType.UiAction) {
            let eventData: UiActionEventData = newValue;
            if (eventData.name === IssueTypeField.uiActionServiceDesk) {
                this.toggleServiceDesk(eventData.value);
            }
        } else if (type === EventType.AfterRender) {
            this.toggleServiceDesk($('#switchServiceMode').hasClass('active'));
        }

        return null;
    }

    toggleServiceDesk(active: boolean) {
        if (active) {
            //Render Fields
            if (!FieldController.getField(FieldController.requestTypeFieldId)) {
                //First time we need the requesttype field --> render
                let requestTypeField = <RequestTypeField>FieldController.loadField(RequestTypeField.defaultMeta, RequestTypeField);
                requestTypeField.setProject(this.currentProject);
                FieldController.render(FieldController.requestTypeFieldId, $('#ServiceAreaRequestField'));
            }

            if (!FieldController.getField(FieldController.onBehalfOfFieldId)) {
                //Create On-Behalf of field
                this.serviceDeskController.isVersionAtLeast('3.3.0')
                    .then(isNewServiceDesk => {
                        let behalfOfField = <UserSelectField>FieldController.loadField(UserSelectField.reporterDefaultMeta, UserSelectField, { allowNew: isNewServiceDesk });
                        FieldController.render(FieldController.onBehalfOfFieldId, $('#ServiceAreaReporterField'));

                        if (this.emailController && this.emailController.getSenderUser()) {
                            behalfOfField.senderUser = this.emailController.getSenderUser();
                            behalfOfField.setValue(behalfOfField.senderUser);
                        }
                        else if (this.emailController && isNewServiceDesk) {
                            behalfOfField.senderUser = {
                                displayName: this.emailController.getSenderEmail() + ' (new)',
                                emailAddress: this.emailController.getSenderEmail(),
                                name: '<new>'
                            };

                            behalfOfField.setValue(behalfOfField.senderUser);
                        }
                        else {
                            let reporterField = FieldController.getField(FieldController.reporterFieldId);
                            behalfOfField.setValue(reporterField.getValue());
                        }
                    });
            }

            //Enable Service mode
            $('#' + this.id).prop("disabled", true);
            $('#switchServiceMode').addClass('active');
            $('#ServiceArea').removeClass('hidden');
            $('#' + FieldController.reporterFieldId + '-field-group').addClass('hidden');
        } else {
            //Disable Service mode
            $('#' + this.id).prop("disabled", false);
            $('#switchServiceMode').removeClass('active');
            $('#ServiceArea').addClass('hidden');
            $('#' + FieldController.reporterFieldId + '-field-group').removeClass('hidden');
        }
    }

    handleError(e: Error) {
        super.handleError(e);
        if (e instanceof jiraSyncError) {
            $('#MainAlert').removeClass('hidden').find('.error-text').text(yasoon.i18n('dialog.errorInitConnection'));
        } else {
            $('#MainAlert').removeClass('hidden').find('.error-text').text(yasoon.i18n('dialog.errorInitUnknown'));
        }
    }
}