/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
class RequestTypeField extends Select2Field implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.requestTypeFieldId, get name() { return yasoon.i18n('dialog.requestType'); }, required: true, schema: { system: 'requesttype', type: '' } };

    private currentProject: JiraProject;
    private serviceDeskKeys: { [id: string]: string };
    private requestTypes: { [id: string]: JiraRequestType[] };
    isServiceDeskActive: boolean;

    constructor(id: string, field: JiraMetaField) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderRequestType');
        options.allowClear = false;

        super(id, field, options);

        this.serviceDeskKeys = {};
        this.requestTypes = {};
        this.isServiceDeskActive = false;

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.AfterSave, this);
        FieldController.registerEvent(EventType.UiAction, this);
    }

    triggerValueChange() {
        let requestType: JiraRequestType = this.getObjectValue();
        FieldController.raiseEvent(EventType.FieldChange, requestType, this.id);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange) {
            if (source === FieldController.projectFieldId) {
                this.setProject(newValue);

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
                    let requestTypeOption:{id: string} = this.getValue(false);
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

        this.getServiceDeskKey()
            .then((serviceDeskKey: string) => {
                return this.getRequestTypes(serviceDeskKey);
            })
            .then((requestTypes) => {
                this.setData(this.getReturnStructure(requestTypes));
            });

    }



    getServiceDeskKey(): Promise<string> {
        let currentProject = this.currentProject;
        //Return buffer
        if (this.serviceDeskKeys[currentProject.id]) {
            return Promise.resolve(this.serviceDeskKeys[currentProject.id]);
        }

        return jiraGet('/rest/servicedesk/1/servicedesk-data')
            .then((data: string) => {
                let serviceData: JiraServiceDeskData[] = JSON.parse(data);
                if (serviceData.length > 0) {
                    let serviceDeskKey = serviceData.filter(function (s) { return s.projectId == currentProject.id; })[0].key;
                    this.serviceDeskKeys[currentProject.id] = serviceDeskKey;

                    return serviceDeskKey;
                }
            })
            .catch(function (e) {
                console.log(e);
                yasoon.util.log(e.toString(), yasoon.util.severity.warning);
                this.serviceDeskKeys[currentProject.id] = this.currentProject.key.toLowerCase();
                return this.currentProject.key.toLowerCase();
            });
    }

    getRequestTypes(serviceDeskKey: string): Promise<JiraRequestType[]> {
        if (this.requestTypes[serviceDeskKey]) {
            return Promise.resolve(this.requestTypes[serviceDeskKey]);
        }

        //New cloud versioning
        var is73OrCloud = false;
        if (jira.systemInfo.versionNumbers[0] >= 1000)
            is73OrCloud = true;
        else if ((jira.systemInfo.versionNumbers[0] === 7 && jira.systemInfo.versionNumbers[1] >= 3) || jira.systemInfo.versionNumbers[0] > 7)
            is73OrCloud = true;

        if (is73OrCloud) {
            return jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/groups')
                .then((data: string) => {
                    let groups: JiraRequestTypeGroup[] = JSON.parse(data);
                    let promises: Promise<any>[] = [];
                    groups.forEach((group) => {
                        promises.push(jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/groups/' + group.id + '/request-types'));
                    });
                    //Load in parallel
                    return Promise.all(promises);
                })
                .map((typeString: string) => { return JSON.parse(typeString); })
                .then((types: [JiraRequestType[]]) => {
                    var allTypes = [];
                    types.forEach(function (typesInner) {
                        typesInner.forEach(function (type) {
                            //Do not add twice
                            if (allTypes.filter(function (t) { return t.id === type.id; }).length === 0) {
                                allTypes.push(type);
                            }
                        });
                    });

                    this.requestTypes[serviceDeskKey] = allTypes;
                    return allTypes;
                });
        } else {
            return jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/request-types')
                .then((data: string) => {
                    let allTypes = <JiraRequestType[]>JSON.parse(data);
                    this.requestTypes[serviceDeskKey] = allTypes;

                    return allTypes;
                });
        }
    }
}