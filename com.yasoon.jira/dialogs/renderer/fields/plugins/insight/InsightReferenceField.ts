import { InsightBaseField, InsightObject } from './InsightBaseField';
import { InsightObjectField } from './InsightObjectField';
import { JiraMetaField } from '../../../JiraModels';
import { Select2Element } from '../../Select2Field';
import { FieldController } from '../../../FieldController';
import { AjaxService } from '../../../../AjaxService';

export class InsightReferenceField extends InsightBaseField {
    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options);
    }

    convertId(id: string): Promise<any> {
        let regex = /.*\((.*)\)$/g;
        let realId = regex.exec(id)[1];
        if (realId) {
            return AjaxService.get('/rest/insight/1.0/object/' + realId)
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

        let fieldConfig, objectSchemaId, parentFieldId = '';
        let field: InsightObjectField;
        if (this.fieldMeta.data) {
            fieldConfig = this.fieldMeta.data['fieldconfig'];
            objectSchemaId = this.fieldMeta.data['objectschemaId'];
            parentFieldId = this.fieldMeta.data['parentCustomfield'];
            field = <InsightObjectField>FieldController.getField('customfield_' + parentFieldId);
        }
        //let objectSchemaId = (this.fieldMeta.data) ? 
        if (fieldConfig && field) {
            let parentValue = field.getValue(false) || [];
            let parentKeys = '';
            parentValue.forEach(value => {
                parentKeys = ((parentKeys) ? ',' : '') + value.key;
            });
            let url = `/rest/insight/1.0/customfield/${fieldConfig}/referencedobjects?query=${searchTerm}&parentKeys=${parentKeys}&objectSchemaId=${objectSchemaId}&currentProject=${this.currentProject.id}&currentIssueId=${this.currentIssueId}&currentReporter=${this.currentUser.key}`;
            console.log(url);
            return AjaxService.get(url)
                .then((result) => {
                    var resultObj: InsightObject[] = JSON.parse(result);
                    return resultObj.map(this.convertToSelect2);
                });
        }
    }
}