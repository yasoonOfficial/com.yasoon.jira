/// <reference path="../../JiraSelectField.ts" />
/// <reference path="InsightBaseField.ts" />

class InsightObjectField extends InsightBaseField {
    constructor(id: string, field: JiraMetaField, options: any = {}) {
        if (field.data['multiple']) {
            options.multiple = true;
        }

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

    async getData(searchTerm: string): Promise<Select2Element[]> {
        console.log('FieldMeta', this.fieldMeta);
        let fieldConfig = (this.fieldMeta.data) ? this.fieldMeta.data['fieldconfig'] : null;
        if (fieldConfig) {
            let url = `/rest/insight/1.0/customfield/default/${fieldConfig}/objects`;
            let params: InsightObjectQueryParams = {
                currentProject: parseInt(this.currentProject.id),
                currentReporter: this.currentUser.key,
                query: searchTerm
            };

            if (this.currentIssueId) {
                params.currentIssueId = parseInt(this.currentIssueId);
            }

            let result = await jiraAjax(url, yasoon.ajaxMethod.Post, JSON.stringify(params));
            let resultObj: InsightQueryResult = JSON.parse(result);
            return resultObj.objects.map(this.convertToSelect2);
        }
    }
}