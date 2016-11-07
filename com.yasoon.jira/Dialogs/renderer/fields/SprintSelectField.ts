/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />

class SprintSelectField extends Select2AjaxField {
    private emptySearch;

    constructor(id: string, field: JiraMetaField) {
        super(id, field);
        this.setter = new SetOptionValue();
    }

    getValue(changedDataOnly: boolean): any {
        //Only for creation as Epic links cannot be changed via REST APi --> Status code 500
        //Ticket: https://jira.atlassian.com/browse/GHS-10333
        //There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
        //We aren't sure with which version this change happened. 7.0.0 definitely requires a string, 7.1.6. requires an int :)
        if (jiraIsVersionHigher(jira.systemInfo, '7.1')) {
            return parseInt($('#' + this.id).val());
        } else {
            return $('#' + this.id).val();
        }
    }

    setValue(value) {
        if (value && value.length > 0) {
            $('#' + this.id).val(SprintSelectField.parseSprintId(value[0])).trigger('change');
        }
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        return jiraGet('/rest/greenhopper/1.0/sprint/picker')
            .then(function (data: string) {
                //{"suggestions":[{"name":"Sample Sprint 2","id":1,"stateKey":"ACTIVE"}],"allMatches":[]}
                let sprints: JiraSprints = JSON.parse(data);
                let result: Select2Element[] = [];

                if (sprints && sprints.suggestions.length > 0) {
                    let suggestions: Select2Element[] = [];
                    sprints.suggestions.forEach((sprint) => {
                        suggestions.push({
                            id: sprint.id.toString(),
                            text: sprint.name
                        });
                    });
                    result.push({
                        id: 'suggestions',
                        text: yasoon.i18n('dialog.sprintSuggestion'),
                        children: suggestions
                    });
                }
                if (sprints && sprints.allMatches && sprints.allMatches.length > 0) {
                    let matches: Select2Element[] = [];
                    sprints.allMatches.forEach((sprint) => {
                        matches.push({
                            id: sprint.id.toString(),
                            text: sprint.name
                        });
                    });
                    result.push({
                        id: 'allMatches',
                        text: yasoon.i18n('dialog.sprintAll'),
                        children: matches
                    });
                }
                return result;
            });
    }

    static parseSprintId(input) {
        //Wierd --> it's an array of strings with following structure:  "com.atlassian.greenhopper.service.sprint.Sprint@7292f4[rapidViewId=<null>,state=ACTIVE,name=Sample Sprint 2,startDate=2015-04-09T01:54:26.773+02:00,endDate=2015-04-23T02:14:26.773+02:00,completeDate=<null>,sequence=1,id=1]"
        //First get content of array (everything between [])
        //Then split at ,
        //Then find id
        var result = '';
        var matches = /\[(.+)\]/g.exec(input);
        if (matches.length > 0) {
            var splitResult = matches[1].split(',');
            var idObj = splitResult.filter(function (elem) { return elem.indexOf('id') === 0; });
            if (idObj.length > 0) {
                result = idObj[0].split('=')[1];
            }
        }
        return result;
    }
}