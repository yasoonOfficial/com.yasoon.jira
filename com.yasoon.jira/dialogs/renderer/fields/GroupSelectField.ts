/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.Option, "name", null)
@setter(SetterType.Option)
class GroupSelectField extends Select2AjaxField {
    constructor(id: string, field: JiraMetaField, options: { multiple: boolean } = { multiple: false }) {
        super(id, field, {}, options.multiple);
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        let url = '/rest/api/2/groups/picker?maxResults=50&query=' + searchTerm;

        return jiraGet(url)
            .then((data: string) => {
                let groupsResult: JiraGroups = JSON.parse(data);
                let groupsArray: Select2Element[] = [];
                groupsResult.groups.forEach((group) => {
                    groupsArray.push(this.convertToSelect2(group));
                });

                return groupsArray;
            });
    }

    convertToSelect2(group: JiraGroup): Select2Element {
        return {
            id: group.name,
            text: group.name,
            data: group
        };
    }
}