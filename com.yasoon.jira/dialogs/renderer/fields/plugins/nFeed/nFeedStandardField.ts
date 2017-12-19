/// <reference path="../../Select2AjaxField.ts" />

@getter(GetterType.Array)
@setter(SetterType.Option)
class NFeedField extends Select2AjaxField {

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options, options.multiple);
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        return jiraAjax('/rest/nfeed/2.0/nFeed/field/autocomplete/query', yasoon.ajaxMethod.Post, JSON.stringify({ query: searchTerm, field: { name: this.id, mode: 'EDIT' } }))
            .then((resultString) => {
                let result = JSON.parse(resultString);
                return result.values;
            });
    }
    convertToSelect2(obj: NFeedValue): Select2Element {
        return obj;
    }
}

interface NFeedValue {
    id: string;
    text: string;
    selected: boolean;
}

interface NFeedQueryReturn {
    values: NFeedValue[];
}