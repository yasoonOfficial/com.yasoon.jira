/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@setter(SetterType.Option)
class SprintSelectField extends Select2Field implements IFieldEventHandler {

    private currentIssueType: JiraIssueType;

    constructor(id: string, field: JiraMetaField) {
        super(id, field, {});

        FieldController.registerEvent(EventType.BeforeSave, this);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.issueTypeFieldId);
        this.getData()
            .then((data) => {
                this.setData(data);
            });
    }


    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.BeforeSave && jira.isEditMode) {
            let eventData: LifecycleData = newValue;

            let oldSprintId: string = '';
            if (this.initialValue)
                oldSprintId = this.parseSprintId(this.initialValue);

            var newSprintId = this.getValue(false);

            if (oldSprintId != newSprintId) {
                if (newSprintId) {
                    return jiraAjax('/rest/greenhopper/1.0/sprint/rank', yasoon.ajaxMethod.Put, '{"idOrKeys":["' + jira.currentIssue.key + '"],"sprintId":' + newSprintId + ',"addToBacklog":false}');
                } else {
                    return jiraAjax('/rest/greenhopper/1.0/sprint/rank', yasoon.ajaxMethod.Put, '{"idOrKeys":["' + jira.currentIssue.key + '"],"sprintId":"","addToBacklog":true}');
                }
            }
        } else if (type === EventType.FieldChange && source === FieldController.issueTypeFieldId) {
            this.currentIssueType = newValue;
        }

        return null;
    }


    getValue(changedDataOnly: boolean): any {
        //Only for creation as Epic links cannot be changed via REST APi --> Status code 500
        //Ticket: https://jira.atlassian.com/browse/GHS-10333
        //There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
        //We aren't sure with which version this change happened. 7.0.0 definitely requires a string, 7.1.6. requires an int :)
        if (!changedDataOnly) {
            let stringValue = this.getDomValue();
            if (stringValue) {
                if (jiraIsVersionHigher(jira.systemInfo, '7.1')) {

                    return parseInt(stringValue);
                } else {
                    return stringValue;
                }
            }
        }
    }

    setValue(value): Promise<any> {
        if (value && value.length > 0) {
            let sprintId = this.parseSprintId(value[0]);
            return this.setter.setValue(this, sprintId);
        }
        return Promise.resolve(value);
    }

    convertToSelect2(sprint: JiraSprint): Select2Element {
        return {
            id: sprint.id.toString(),
            text: sprint.name,
            data: sprint
        };
    }

    getData(): Promise<Select2Element[]> {
        return jiraGet('/rest/greenhopper/1.0/sprint/picker')
            .then((data: string) => {
                //{"suggestions":[{"name":"Sample Sprint 2","id":1,"stateKey":"ACTIVE"}],"allMatches":[]}
                let sprints: JiraSprints = JSON.parse(data);
                let result: Select2Element[] = [];

                if (sprints && sprints.suggestions.length > 0) {
                    let suggestions = sprints.suggestions.map(this.convertToSelect2);
                    result.push({
                        id: 'suggestions',
                        text: yasoon.i18n('dialog.sprintSuggestion'),
                        children: suggestions
                    });
                }
                if (sprints && sprints.allMatches && sprints.allMatches.length > 0) {
                    let matches = sprints.allMatches.map(this.convertToSelect2);
                    result.push({
                        id: 'allMatches',
                        text: yasoon.i18n('dialog.sprintAll'),
                        children: matches
                    });
                }
                return result;
            });
    }

    render(container: JQuery): void {
        if (this.currentIssueType && this.currentIssueType.subtask) {
            container.append('<span class="field-inline">' + yasoon.i18n('dialog.warningSprintInherited') + '</span>');
        } else {
            super.render(container);
        }
    }

    private parseSprintId(input) {
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