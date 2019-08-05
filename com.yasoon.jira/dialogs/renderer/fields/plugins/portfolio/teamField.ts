/// <reference path="../../Select2AjaxField.ts" />

interface PortfolioTeamOption {
    id: number;
    title: string;
    shareable: boolean;
    resources: { id: number; personId: number; }[];
}

interface PortfolioTeamSearchResult {
    moreResultsAvailable: boolean;
    teams: PortfolioTeamOption[];
    persons: any[];
}

@setter(SetterType.Option)
class TeamField extends Select2AjaxField {
    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options, false);
    }

    async getEmptyData(): Promise<Select2Element[]> {
        //Don't Buffer!
        return this.getData('');
    }

    getValue(onlyChangedData: boolean = false) {
        let value = this.getDomValue();
        console.log('Team Value', value);
        if (onlyChangedData) {

        } else {
            return value;
        }
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        return jiraAjax('/rest/teams/1.0/teams/find', yasoon.ajaxMethod.Post, JSON.stringify({
            query: searchTerm,
            excludedIds: [],
            maxResults: 100
        }))
            .then((resultString) => {
                let result: PortfolioTeamSearchResult = JSON.parse(resultString);

                console.log('Result', this.id, result);
                let select2Result = result.teams.map(this.convertToSelect2);
                return select2Result;
            });
    }

    convertToSelect2(obj: PortfolioTeamOption): Select2Element {
        return {
            id: obj.id.toString(),
            text: obj.title,
            data: obj
        };
    }
}