/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />
/// <reference path="../../../definitions/common.d.ts" />

@getter(GetterType.Array)
@setter(SetterType.Tag)
class LabelSelectField extends Select2AjaxField {

    private lastSearchTerm: string;
    private emptyData: Promise<Select2Element[]>;
    constructor(id: string, field: JiraMetaField, options: any = {}) {
        options.tags = true;
        super(id, field, options, true);
    }

    getDomValue(): string {
        return $('#' + this.id).val() || [];
    }

    convertToSelect2(label: JiraLabel): Select2Element {
        return {
            id: label.label,
            text: label.label,
            data: label
        };
    }

    getData(searchTerm: string) {
        //Damit JIRA!! ... in old JIRA releases the autocomplete URL is wrong :/
        let url = '/rest/api/1.0/labels/suggest?maxResults=50&query=';
        if (this.id !== 'labels') {
            url = '/rest/api/1.0/labels/suggest?maxResults=50&customFieldId=' + this.fieldMeta.schema.customId + '&query=';
        }

        this.lastSearchTerm = searchTerm;
        return jiraGet(url + searchTerm)
            .then((data) => {
                let labels = JSON.parse(data);
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