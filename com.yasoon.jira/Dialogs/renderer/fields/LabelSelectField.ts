/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />

@getter(GetterType.Array)
@setter(SetterType.Tag)
class LabelSelectField extends Select2AjaxField {

    constructor(id: string, field: JiraMetaField, options: any) {
        super(id, field, options);
    }

    getData(searchTerm: string) {
        //Damit JIRA!! ... in old JIRA releases the autocomplete URL is wrong :/
        var url = '/rest/api/1.0/labels/suggest?maxResults=50&query=';
        if (this.id !== 'labels') {
            url = '/rest/api/1.0/labels/suggest?maxResults=50&customFieldId=' + this.fieldMeta.schema.customId + '&query=';
        }

        return jiraGet(url + searchTerm)
            .then(function (data: string) {
                let labels = JSON.parse(data);
                let labelArray = [];
                if (labels.suggestions) {
                    $.each(labels.suggestions, function (i, label) {
                        labelArray.push({ text: label.label, id: label.label });
                    });
                }
                return labelArray;
            });
    }
}