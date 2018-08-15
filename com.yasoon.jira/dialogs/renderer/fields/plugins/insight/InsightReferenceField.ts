/// <reference path="../../JiraSelectField.ts" />
/// <reference path="InsightBaseField.ts" />

class InsightReferenceField extends InsightBaseField implements IFieldEventHandler {
    fieldConfig: string;
    objectSchemaId: string;
    parentFieldId: string;
    parentCustomFieldName: string;

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options);
        this.updateFieldMeta(field);
    }

    updateFieldMeta(newMeta: JiraMetaField) {
        super.updateFieldMeta(newMeta);
        console.log('New Insight Meta', newMeta);
        if (newMeta.data) {
            let oldParentId = this.parentFieldId;

            this.fieldConfig = newMeta.data['fieldconfig'];
            this.objectSchemaId = newMeta.data['objectschemaId'];
            this.parentFieldId = newMeta.data['parentCustomfield'];
            this.parentCustomFieldName = 'customfield_' + this.parentFieldId;

            if (oldParentId != this.parentFieldId) {
                console.log('Register Event', this.parentFieldId);
                FieldController.registerEvent(EventType.FieldChange, this, this.parentCustomFieldName);
            }
        }
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        console.log('handle Event Insight', newValue, source, this);
        super.handleEvent(type, newValue, source);

        if (type === EventType.FieldChange && source === this.parentCustomFieldName) {
            this.clear();
        }

        return null;
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
        console.log('Get data', searchTerm, this.fieldConfig);

        let parentField: InsightObjectField = <InsightObjectField>FieldController.getField(this.parentCustomFieldName);
        if (this.fieldConfig && parentField) {
            let parentValue = parentField.getValue(false) || [];
            let parentKeys = '';
            parentValue.forEach(value => {
                parentKeys = ((parentKeys) ? ',' : '') + value.key;
            });

            let url = `/rest/insight/1.0/customfield/reference/${this.fieldConfig}/objects`;
            let params: InsightReferenceQueryParams = {
                currentProject: parseInt(this.currentProject.id),
                currentReporter: this.currentUser.key,
                query: searchTerm,
                parentKeys: parentKeys
            }

            console.log('Query Data', params);
            //let url = `/rest/insight/1.0/customfield/${this.fieldConfig}/referencedobjects?query=${searchTerm}&parentKeys=${parentKeys}&objectSchemaId=${this.objectSchemaId}&currentProject=${this.currentProject.id}&currentIssueId=${this.currentIssueId}&currentReporter=${this.currentUser.key}`;
            let result = await jiraAjax(url, yasoon.ajaxMethod.Post, JSON.stringify(params));
            let resultObj: InsightQueryResult = JSON.parse(result);
            console.log('Result', resultObj);
            return resultObj.objects.map(this.convertToSelect2);
        }
    }

    getEmptyData(): Promise<Select2Element[]> {
        return this.getData('');
    }
}