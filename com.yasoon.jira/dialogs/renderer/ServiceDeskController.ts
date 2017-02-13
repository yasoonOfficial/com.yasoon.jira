/// <reference path="../../definitions/bluebird.d.ts" />
/// <reference path="../../definitions/common.d.ts" />

class ServiceDeskController {

    private serviceDeskVersion: string;
    private requestTypes: { [id: string]: JiraRequestType[] } = {};
    private serviceDeskKeys: { [id: string]: JiraServiceDeskKey } = {};

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

    async getServiceDeskKey(projectId: string, projectKey: string): Promise<JiraServiceDeskKey> {
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
}