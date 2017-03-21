import { FieldController } from '../FieldController';
import { IFieldEventHandler } from '../Field';
import { Select2AjaxField } from './Select2AjaxField';
import { Select2Element } from './Select2Field';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType, EventType } from '../Enumerations';
import { JiraMetaField, JiraLabel } from '../JiraModels';
import { AjaxService } from '../../AjaxService';

@getter(GetterType.Array)
@setter(SetterType.Tag)
export default class LabelSelectField extends Select2AjaxField {

    private lastSearchTerm: string;
    private emptyData: Promise<Select2Element[]>;
    constructor(id: string, field: JiraMetaField, options: any = {}) {
        options.tags = true;
        super(id, field, options, true);
    }

    getDomValue(): string {
        return $('#' + this.id).val() || [];
    }

    convertToSelect2(label: JiraLabel | string): Select2Element {
        let jiraLabel: JiraLabel;
        if (typeof label === 'string')
            jiraLabel = { label: label };
        else
            jiraLabel = label;

        return {
            id: jiraLabel.label,
            text: jiraLabel.label,
            // data: label //data attribute is not taken over for tags
        };
    }
    getObjectValue(): any {
        //Overwritten as the data attribute is not taken over for tags
        let elements: Select2Element[] = $('#' + this.id)['select2']('data');
        if (this.multiple) {
            return elements.map(p => { return p.id; });
        } else {
            return elements[0].id;
        }
    }

    getData(searchTerm: string) {
        //Damit JIRA!! ... in old JIRA releases the autocomplete URL is wrong :/
        let url = '/rest/api/1.0/labels/suggest?maxResults=50&query=';
        if (this.id !== 'labels') {
            url = '/rest/api/1.0/labels/suggest?maxResults=50&customFieldId=' + this.fieldMeta.schema.customId + '&query=';
        }

        this.lastSearchTerm = searchTerm;
        return AjaxService.get(url + searchTerm)
            .then((data) => {
                let labels = JSON.parse(data);
                console.log('SearchTerm ' + searchTerm, labels);
                let labelArray: Select2Element[] = [];

                if (labels.token === this.lastSearchTerm && labels.suggestions) {
                    labels.suggestions.forEach((label) => {
                        labelArray.push(this.convertToSelect2(label));
                    });
                }
                return labelArray;
            });
    }

    getEmptyData() {
        if (!this.emptyData)
            this.emptyData = this.getData('');

        return this.emptyData;
    }
}