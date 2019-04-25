/// <reference path="../../definitions/bluebird.d.ts" />
/// <reference path="../../definitions/common.d.ts" />

interface ServiceDeskSaveResult {
    issueCreated: boolean;
    issueId?: string;
    issueKey?: string;
}

class ServiceDeskController implements IFieldEventHandler {

    private serviceDeskVersion: string;
    private currentProject: JiraProject;
    private requestTypes: { [id: string]: JiraRequestType[] } = {};
    private serviceDeskKeys: { [id: string]: JiraServiceDeskKey } = {};
    private _isServiceDeskActive: boolean = false;
    private currentRequestTypeMeta: JiraRequestTypeFieldMeta = { requestTypeFields: [] };

    constructor() {
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.requestTypeFieldId);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.UiAction, this);
    }

    isServiceDeskActive(): boolean {
        return this._isServiceDeskActive;
    }

    async handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.UiAction) {
            let eventData: UiActionEventData = newValue;
            if (eventData.name === IssueTypeField.uiActionServiceDesk) {
                this._isServiceDeskActive = eventData.value;
            }
        } else if (type === EventType.FieldChange) {
            if (source == FieldController.requestTypeFieldId) {
                if (await this.isVersionAtLeast('3.3.0')) {
                    this.currentRequestTypeMeta = await this.getRequestTypeMeta(newValue);

                    //We need to put the fields back into original state, without the modifications from the previous request type
                    FieldController.resetFields();

                    //Now process the request type field meta (add possible required flags)
                    this.updateFieldMeta();
                }
            } else if (source === FieldController.projectFieldId) {
                this.currentProject = newValue;
            }
        }

        return null;
    }

    private updateFieldMeta() {
        this.currentRequestTypeMeta.requestTypeFields.forEach(field => {
            let uiField = FieldController.getField(field.fieldId);
            if (uiField)
                uiField.setRequired(field.required);
        });
    }

    async doBeforeSave(data: any): Promise<ServiceDeskSaveResult> {
        if (await this.isVersionAtLeast('3.3.0')) {
            let projectId = data.fields[FieldController.projectFieldId].id;
            let requestTypeField = <RequestTypeField>FieldController.getField(FieldController.requestTypeFieldId);
            let onBehalfOfField = <UserSelectField>FieldController.getField(FieldController.onBehalfOfFieldId);

            let postData: any = {
                serviceDeskId: (await this.getServiceDeskKey(projectId)).id,
                requestTypeId: requestTypeField.getDomValue(),
                requestFieldValues: {}
            };

            let meta = this.currentRequestTypeMeta;
            if (meta.canRaiseOnBehalfOf) {
                let user = onBehalfOfField.getObjectValue();
                postData.raiseOnBehalfOf = (user.name.indexOf('<new>') === 0) ? user.emailAddress : user.name;
            }

            meta.requestTypeFields.forEach(field => {
                if (!field.required)
                    return;

                postData.requestFieldValues[field.fieldId] = data.fields[field.fieldId];
            });

            let response = await jiraAjax('/rest/servicedeskapi/request', yasoon.ajaxMethod.Post, JSON.stringify(postData), null, true);
            let responseData = JSON.parse(response);

            return {
                issueCreated: true,
                issueId: responseData.issueId,
                issueKey: responseData.issueKey
            };
        } else {
            let onBehalfOfField = <UserSelectField>FieldController.getField(FieldController.onBehalfOfFieldId);
            let user = onBehalfOfField.getValue();
            data.fields[FieldController.reporterFieldId] = user;
        }

        return { issueCreated: false };
    }

    async doAfterSave(issue: JiraIssue): Promise<any> {
        if (!(await this.isVersionAtLeast('3.3.0'))) {
            try {
                let requestTypeOption: { id: string } = FieldController.getField(FieldController.requestTypeFieldId).getValue(false);
                let requestTypeId = parseInt(requestTypeOption.id);

                return jiraAjax('/rest/servicedesk/1/servicedesk/request/' + issue.id + '/request-types', yasoon.ajaxMethod.Post, JSON.stringify({ rtId: requestTypeId }));
            } catch (e) {
                return Promise.reject(new Error('Could not create ServiceDesk Data'));
            }
        }
    }

    async getServiceDeskVersion(): Promise<string> {
        if (this.serviceDeskVersion)
            return this.serviceDeskVersion;

        try {
            let data = await jiraGet('/rest/servicedeskapi/info');
            this.serviceDeskVersion = JSON.parse(data).version;
        }
        catch (e) {
            this.serviceDeskVersion = '3.0.0';
        }

        return this.serviceDeskVersion;
    }

    async isVersionAtLeast(as: string): Promise<boolean> {
        if (jira && (jira.systemInfo as JiraSystemInfo).deploymentType === 'Cloud')
            return true;

        let version = await this.getServiceDeskVersion();
        let baseVersion = version.split('-')[0];
        let baseNumbers = baseVersion.split('.').map(n => parseInt(n));
        let asNumbers = as.split('.').map(n => parseInt(n));
        let result = true;

        for (let i = 0; i < baseNumbers.length; i++) {
            if (asNumbers[i] > baseNumbers[i])
                result = false;
            else if (asNumbers[i] < baseNumbers[i])
                break; //we have at least one number which is lower expected => quit now
        }

        return result;
    }

    async getRequestTypes(serviceDeskKey: JiraServiceDeskKey): Promise<JiraRequestType[]> {
        if (this.requestTypes[serviceDeskKey.key]) {
            return this.requestTypes[serviceDeskKey.key];
        }

        //New API is available starting Service Desk 3.3.0 (Server) and 1000.268.0 (Cloud). We only check for server as Cloud is always fresh
        if (await this.isVersionAtLeast('3.3.0')) {
            let data = await jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey.key + '/groups');
            let groups: JiraRequestTypeGroup[] = JSON.parse(data);
            let promises: Promise<any>[] = [];
            groups.forEach((group) => {
                promises.push(jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey.key + '/groups/' + group.id + '/request-types'));
            });

            //Load in parallel
            let types = <[JiraRequestType[]]>await Promise.all(promises).map((typeString: string) => { return JSON.parse(typeString); });
            let allTypes = [];
            types.forEach((typesInner) => {
                typesInner.forEach((type) => {
                    //Do not add twice
                    if (allTypes.filter(function (t) { return t.id === type.id; }).length === 0) {
                        allTypes.push(type);
                    }
                });
            });

            this.requestTypes[serviceDeskKey.key] = allTypes;
            return allTypes;
        }
        else {
            let data = await jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey.key + '/request-types');
            let allTypes = <JiraRequestType[]>JSON.parse(data);
            this.requestTypes[serviceDeskKey.key] = allTypes;
            return allTypes;
        }
    }

    async getRequestTypeMeta(requestType: JiraRequestType): Promise<JiraRequestTypeFieldMeta> {
        if (await this.isVersionAtLeast('3.3.0')) {
            try {
                let data = await jiraGet(`/rest/servicedeskapi/servicedesk/${requestType.portalId}/requesttype/${requestType.id}/field`);
                return <JiraRequestTypeFieldMeta>JSON.parse(data);
            } catch (e) {
                console.log(e);
                yasoon.util.log(e.toString(), yasoon.util.severity.warning);
                return { requestTypeFields: [] };
            }
        }
    }

    async getServiceDeskKey(projectId: string, projectKey?: string): Promise<JiraServiceDeskKey> {
        //Return buffer
        if (this.serviceDeskKeys[projectId]) {
            return Promise.resolve(this.serviceDeskKeys[projectId]);
        }

        try {
            let data = await jiraGet('/rest/servicedesk/1/servicedesk-data');
            let serviceData: JiraServiceDeskData[] = JSON.parse(data);
            if (serviceData.length > 0) {
                let serviceDeskKey = serviceData.filter(function (s) { return s.projectId == projectId; })[0];
                this.serviceDeskKeys[projectId] = { id: serviceDeskKey.id, key: serviceDeskKey.key };
            } else {
                this.serviceDeskKeys[projectId] = { id: projectId, key: projectKey.toLowerCase() };
            }
        } catch (e) {
            console.log(e);
            yasoon.util.log(e.toString(), yasoon.util.severity.warning);
            this.serviceDeskKeys[projectId] = { id: projectId, key: projectKey.toLowerCase() };
        }

        return this.serviceDeskKeys[projectId];
    }

    async getCurrentServiceDeskKey(): Promise<JiraServiceDeskKey> {
        if (this.currentProject.projectTypeKey === 'service_desk')
            return this.getServiceDeskKey(this.currentProject.id);

        return Promise.resolve(null);
    }
}