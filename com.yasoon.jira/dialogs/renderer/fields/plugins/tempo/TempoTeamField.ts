/// <reference path="../../../Field.ts" />
/// <reference path="../../Select2AjaxField.ts" />
/// <reference path="../../../../../definitions/common.d.ts" />
/// <reference path="../../../../../definitions/bluebird.d.ts" />
/// <reference path="../../../getter/GetTextValue.ts" />
/// <reference path="../../../setter/SetOptionValue.ts" />

interface TempoTeam {
    id: number;
    name: string;
    summary?: string;
}

@getter(GetterType.Text)
@setter(SetterType.Option)
class TempoTeamField extends Select2Field {
    getTeamsPromise: Promise<any>;

    constructor(id: string, field: JiraMetaField, options: Select2Options = {}) {
        options.placeholder = yasoon.i18n('dialog.selectNone');
        options.allowClear = true
        super(id, field, options);
        this.init();
    }

    init() {
        this.getData()
            .then((elements: Select2Element[]) => {
                this.setData(elements);
            });
    }

    convertId(id: number): Promise<any> {
        return this.getTeamsPromise
            .then((teams: TempoTeam[]) => {
                return teams.filter(team => team.id == id)[0]
            });
    }

    convertToSelect2(obj: TempoTeam): Select2Element {
        return {
            id: obj.id.toString(),
            text: obj.name,
            data: obj
        };
    }

    getData() {
        this.getTeamsPromise = jiraGet('/rest/tempo-teams/1/team')
            .then((teamString: string) => {
                let teamData: TempoTeam[] = JSON.parse(teamString);
                return teamData;
            });

        return this.getTeamsPromise
            .then((teamData: TempoTeam[]) => {
                let result: Select2Element[] = [];

                if (teamData && teamData.length > 0) {
                    result = teamData.map(this.convertToSelect2);
                }
                return result;
            })
            .catch(this.handleError);
    }

}