/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />

@getter(GetterType.Object, "name")
@setter(SetterType.Option)
class GroupSelectField extends Select2AjaxField {

    getData(searchTerm: string): Promise<Select2Element[]> {
        let url = '/rest/api/2/groups/picker?maxResults=50&query=' + searchTerm;

        return jiraGet(url)
            .then((data: string) => {
                let groupsResult: JiraGroups = JSON.parse(data);
                console.log(groupsResult);
                let groupsArray: Select2Element[] = [];
                groupsResult.groups.forEach((group) => {
                    groupsArray.push({
                        id: group.name,
                        text: group.name
                    });
                });

                return groupsArray;
            });
    }
}