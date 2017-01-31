/// <reference path="../../../Field.ts" />
/// <reference path="../../Select2AjaxField.ts" />
/// <reference path="../../../../../definitions/common.d.ts" />
/// <reference path="../../../../../definitions/bluebird.d.ts" />
/// <reference path="../../../getter/GetTextValue.ts" />
/// <reference path="../../../setter/SetOptionValue.ts" />

@getter(GetterType.Text)
@setter(SetterType.Option)
class TempoTeamField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: Select2Options = {}) {
        super(id, field, options);
        this.getData()
            .then((elements: Select2Element[]) => {
                this.setData(elements);
            });
    }

    convertToSelect2(obj: any): Select2Element {
        return {
            id: obj.id,
            text: obj.name,
            data: obj
        };
    }

    getData() {
        return jiraGet('/rest/tempo-teams/1/team')
            .then((teamString:string) => {
                let teamData = JSON.parse(teamString);
                let result: Select2Element[] = [];

                if (teamData && teamData.length > 0) {
                    result = teamData.map(this.convertToSelect2);
                }
                return result;
            })
            .catch(this.handleError);
    }

}