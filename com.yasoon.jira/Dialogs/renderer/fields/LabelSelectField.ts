/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />

@getter(GetterType.Array)
@setter(SetterType.Tag)
class LabelSelectField extends Select2AjaxField {

    private lastSearchTerm: string;

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        options.tags = true;
        super(id, field, options, true);
    }

    getData(searchTerm: string) {
        //Damit JIRA!! ... in old JIRA releases the autocomplete URL is wrong :/
        let url = '/rest/api/1.0/labels/suggest?maxResults=50&query=';
        if (this.id !== 'labels') {
            url = '/rest/api/1.0/labels/suggest?maxResults=50&customFieldId=' + this.fieldMeta.schema.customId + '&query=';
        }

        this.lastSearchTerm = searchTerm;
        return jiraGet(url + searchTerm)
            .then((data: string) => {
                let labels = JSON.parse(data);
                let labelArray = [];

                if (labels.token === this.lastSearchTerm && labels.suggestions) {
                    labels.suggestions.forEach((label) => {
                        labelArray.push({ text: label.label, id: label.label });
                    });
                }
                return labelArray;
            });
    }

    getEmptyData() {
        return this.getData('');
    }
}