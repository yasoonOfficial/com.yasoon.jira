/// <reference path="../../JiraSelectField.ts" />
/// <reference path="InsightBaseField.ts" />

class InsightObjectField extends InsightBaseField {
    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options);
    }

    convertId(id: string): Promise<any> {
        let regex = /.*\((.*)\)$/g;
        let realId = regex.exec(id)[1];
        if (realId) {
            return jiraGet('/rest/insight/1.0/object/' + realId)
                .then((result) => {
                    var obj = <InsightObject>JSON.parse(result);
                    return obj;
                });
        } else {
            return Promise.resolve(id);
        }
    }

    convertToSelect2(object: InsightObject): Select2Element {
        return {
            id: object.objectKey,
            text: object.name,
            icon: object.avatar.url16,
            data: object
        };
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        let fieldConfig = (this.fieldMeta.data) ? this.fieldMeta.data['fieldconfig'] : null;
        if (fieldConfig) {
            let url = `/rest/insight/1.0/customfield/${fieldConfig}/objects?query=${searchTerm}&currentProject=${this.currentProject.id}&currentIssueId=${this.currentIssueId}&currentReporter=${this.currentUser.key}`;
            return jiraGet(url)
                .then((result) => {
                    var resultObj: InsightObject[] = JSON.parse(result);
                    return resultObj.map(this.convertToSelect2);
                });
        }
    }
}