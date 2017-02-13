/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
/// <reference path="../ServiceDeskController.ts" />

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
class RequestTypeField extends Select2Field implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.requestTypeFieldId, get name() { return yasoon.i18n('dialog.requestType'); }, required: true, schema: { system: 'requesttype', type: '' } };

    private currentProject: JiraProject;
    private currentRequestTypeMeta: JiraRequestTypeFieldMeta;
    private serviceDeskController: ServiceDeskController;
    isServiceDeskActive: boolean;

    constructor(id: string, field: JiraMetaField) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderRequestType');
        options.allowClear = false;

        super(id, field, options);

        this.serviceDeskController = jira.serviceDeskController;
        this.isServiceDeskActive = false;
        this.currentRequestTypeMeta = { requestTypeFields: [] };

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.requestTypeFieldId);
        FieldController.registerEvent(EventType.AfterSave, this);
        FieldController.registerEvent(EventType.UiAction, this);
    }

    triggerValueChange() {
        let requestType: JiraRequestType = this.getObjectValue();
        FieldController.raiseEvent(EventType.FieldChange, requestType, this.id);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange) {
            if (source === FieldController.projectFieldId && (<JiraProject>newValue).projectTypeKey === 'service_desk') {
                this.setProject(newValue);
            } else if (source == FieldController.requestTypeFieldId) {
                this.serviceDeskController.getRequestTypeMeta(newValue)
                    .then(meta => {
                        this.currentRequestTypeMeta = meta;
                    });
            }
        } else if (type === EventType.UiAction) {
            let eventData: UiActionEventData = newValue;
            if (eventData.name === IssueTypeField.uiActionServiceDesk) {
                this.isServiceDeskActive = eventData.value;
            }
        } else if (type === EventType.AfterSave) {
            //Service Request? Assignment Type have an own call
            if (this.isServiceDeskActive) {
                try {
                    let requestTypeOption: { id: string } = this.getValue(false);
                    let requestTypeId = parseInt(requestTypeOption.id);
                    let lifecycleData: LifecycleData = newValue;

                    return jiraAjax('/rest/servicedesk/1/servicedesk/request/' + lifecycleData.newData.id + '/request-types', yasoon.ajaxMethod.Post, JSON.stringify({ rtId: requestTypeId }));
                } catch (e) {
                    return Promise.reject(new Error('Could not create ServiceDesk Data'));
                }
            }
        }

        return null;
    }

    convertToSelect2(requestType: JiraRequestType): Select2Element {
        return {
            id: requestType.id.toString(),
            text: requestType.name,
            icon: jira.icons.mapIconUrl(jira.settings.baseUrl + '/servicedesk/customershim/secure/viewavatar?avatarType=SD_REQTYPE&avatarId=' + requestType.icon),
            data: requestType
        };
    }

    getReturnStructure(requestTypes: JiraRequestType[]): Select2Element[] {
        //First we need to gather all groups
        let result: Select2Element[] = [];

        requestTypes.forEach((rt) => {
            if (!rt.groups)
                return;

            rt.groups.forEach((group) => {
                //First check if group does already exist in result structure
                let parent = result.filter((elem) => { return elem.id == group.id.toString(); })[0];
                if (!parent) {
                    parent = {
                        id: group.id.toString(),
                        text: group.name,
                        children: []
                    };
                    result.push(parent);
                }

                //Now add requestType to this group
                parent.children.push(this.convertToSelect2(rt));
            });
        });

        result.sort(sortByText);
        return result;
    }

    setProject(project: JiraProject) {
        this.currentProject = project;
        this.serviceDeskController.getServiceDeskKey(this.currentProject.id, this.currentProject.key)
            .then((serviceDeskKey) => {
                return this.serviceDeskController.getRequestTypes(serviceDeskKey);
            })
            .then((requestTypes) => {
                this.setData(this.getReturnStructure(requestTypes));
            });
    }


}