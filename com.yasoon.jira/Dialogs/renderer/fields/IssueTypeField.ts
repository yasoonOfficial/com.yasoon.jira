/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />

@getter(GetterType.Object, "id")
@setter(SetterType.Option)
class IssueTypeField extends Select2Field implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.issueTypeFieldId, get name() { return yasoon.i18n('dialog.issueType'); }, required: true, schema: { system: 'issue', type: '' } };
    static uiActionServiceDesk = 'ServiceDeskActivated';

    constructor(id: string, field: JiraMetaField) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderIssueType');
        options.allowClear = false;

        super(id, field, options);

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.requestTypeFieldId);
        FieldController.registerEvent(EventType.UiAction, this);
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

        container.append(`<br /><a id="switchServiceMode" class="hidden" style="cursor:pointer;" title="">
                            <span class="showPortal"><i class="fa fa-plus"></i><span data-bind="localizedText: 'dialog.SDAssignment'">Service Desk assignment</span> </span>
                            <span class="hidePortal"><i class="fa fa-minus"></i><span data-bind="localizedText: 'dialog.SDAssignment'">Service Desk assignment</span> </span>
                        </a>`);
    }

    triggerValueChange() {
        let issueType: JiraIssueType = this.getObjectValue();
        FieldController.raiseEvent(EventType.FieldChange, issueType, this.id);
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
                let promise: Promise<JiraProject>;
                if (!project.issueTypes) {
                    this.showSpinner();
                    promise = jiraGet('/rest/api/2/project/' + project.key)
                        .then((data: string) => {
                            this.hideSpinner();
                            let proj: JiraProject = JSON.parse(data);
                            return proj;
                        });
                } else {
                    promise = Promise.resolve(project);
                }

                promise.then((proj) => {
                    let result: Select2Element[] = proj.issueTypes.map(this.convertToSelect2);

                    this.setData(result);

                    //Check Service Desk
                    if (proj.projectTypeKey === "service_desk") {
                        $(this.ownContainer).find('#switchServiceMode').removeClass('hidden');
                    } else {
                        $(this.ownContainer).find('#switchServiceMode').addClass('hidden');
                    }
                });
            } else if (source === FieldController.requestTypeFieldId) {
                let requestType: JiraRequestType = newValue;
                let issueType: Select2Element = this.options.data.filter((sel) => { return sel.id === requestType.issueType.toString(); })[0];
                this.setValue(issueType.data);
            }
        } else if (type === EventType.UiAction) {
            let eventData: UiActionEventData = newValue;
            if (eventData.name === IssueTypeField.uiActionServiceDesk) {
                if (eventData.value) {
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
        }

        return null;
    }
}