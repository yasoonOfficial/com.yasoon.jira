/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@setter(SetterType.Option)
class EpicLinkSelectField extends Select2AjaxField implements IFieldEventHandler {

    private currentIssueType: JiraIssueType;

    constructor(id: string, field: JiraMetaField) {
        super(id, field);
        FieldController.registerEvent(EventType.AfterSave, this);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.issueTypeFieldId);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.AfterSave) {
            let newEpicLink = this.getDomValue()
            let eventData: LifecycleData = newValue;
            if (jira.isEditMode) {
                //We cannot change epic Links via standard API, so trigger the call here

                let oldEpicLink = this.initialValue;

                if (newEpicLink != oldEpicLink) {
                    if (newEpicLink) {
                        //Create or update
                        if (jiraIsVersionHigher(jira.systemInfo, '7.1')) {
                            return this.updateEpic7(newEpicLink, eventData.newData.key);
                        } else {
                            return this.updateEpic6(newEpicLink, eventData.newData.key);
                        }
                    } else {
                        //Delete
                        if (jiraIsVersionHigher(jira.systemInfo, '7.1')) {
                            return this.deleteEpic7(eventData.newData.key);
                        } else {
                            return this.deleteEpic6(eventData.newData.key);
                        }
                    }
                }
                //AfterSave is only needed for JIRA 7 on creation as the setData does not work anymore.
            } else if (!jira.isEditMode && jiraIsVersionHigher(jira.systemInfo, '7.1')) {
                if (newEpicLink) {
                    this.updateEpic7(newEpicLink, eventData.newData.key);
                }
            }
        } else if(type === EventType.FieldChange && source === FieldController.issueTypeFieldId) {
            this.currentIssueType = newValue;
        }
        return null;
    }

    getValue(changedDataOnly: boolean): string {
        //Only for creation as Epic links cannot be changed via REST APi --> Status code 500
        //Ticket: https://jira.atlassian.com/browse/GHS-10333
        //There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
        let value: string = this.getDomValue();
        if (!jiraIsVersionHigher(jira.systemInfo, '7') && !changedDataOnly && value) {
            return 'key:' + value;
        }
    }

    setValue(value: string): Promise<any> {
        //Format in JIRA < 7.0 "key: epicId" , JIRA 7+: just epic Id
        if (!jiraIsVersionHigher(jira.systemInfo, '7')) {
            value = value.replace('key:', '');
        }

        return this.setter.setValue(this, value);
    }

    convertToSelect2(epic: JiraEpic): Select2Element {
        return {
            id: epic.key,
            text: epic.name + ' ( ' + epic.key + ' )',
            data: epic
        };
    }

    convertId(id: string): Promise<any> {
        return this.getData(id)
            .then(function (result) {
                if (result[0].children) {
                    return result[0].children[0].data;
                } else {
                    return result[0].data;
                }
            });
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        //Result of Service
        // JIRA 6.x: {"epicNames":[{"key":"SSP-24","name":"Epic 1"},{"key":"SSP-25","name":"Epic 2"}],"total":2}
        // JIRA 7+:  {"epicLists":[{"listDescriptor":"All epics","epicNames":[{"key":"SSP-24","name":"Epic 1","isDone":false},{"key":"SSP-25","name":"Epic 2","isDone":false},{"key":"SSP-28","name":"Epic New","isDone":false}]}],"total":3}
        let url = '/rest/greenhopper/1.0/epics?maxResults=10&projectKey=' + jira.selectedProject.key + '&searchQuery=' + searchTerm;

        return jiraGet(url)
            .then((data: string) => {
                let epics: any = JSON.parse(data);
                let results: Select2Element[] = [];

                if (epics && epics.total > 0) {
                    if (epics.epicLists) {
                        let epic7: Jira7Epics = epics;
                        epic7.epicLists.forEach((epicList) => {
                            let children = epicList.epicNames.map(this.convertToSelect2);
                            results.push({
                                id: epicList.listDescriptor,
                                text: epicList.listDescriptor,
                                children: children
                            });
                        });
                    }
                    else {
                        let epic6: Jira6Epics = epics;
                        results = epic6.epicNames.map(this.convertToSelect2);
                    }
                }
                return results;
            });
    }

    render(container: JQuery):void {
        if(this.currentIssueType && this.currentIssueType.subtask){
            container.append('<span class="field-error field-inline ">' + yasoon.i18n('dialog.errorNoEpicForSubtasks') + '</span>');
        } else {
            super.render(container);
        }
    }

    //Update Epic JIRA 6.x and 7.0
    private updateEpic6 = function (newEpicLink, issueKey) {
        return jiraAjax('/rest/greenhopper/1.0/epics/' + newEpicLink + '/add', yasoon.ajaxMethod.Put, '{ "issueKeys":["' + issueKey + '"] }');
    }
    //Update Epic JIRA > 7.1
    private updateEpic7 = function (newEpicLink, issueKey) {
        return jiraAjax('/rest/agile/1.0/epic/' + newEpicLink + '/issue', yasoon.ajaxMethod.Post, '{ "issues":["' + issueKey + '"] }');
    }

    //Delete Epic JIRA 6.x and 7.0
    private deleteEpic6 = function (issueKey) {
        return jiraAjax('/rest/greenhopper/1.0/epics/remove', yasoon.ajaxMethod.Put, '{ "issueKeys":["' + issueKey + '"] }');
    }

    //Delete Epic JIRA > 7.1
    private deleteEpic7 = function (issueKey) {
        return jiraAjax('/rest/agile/1.0/epic/none/issue', yasoon.ajaxMethod.Post, '{ "issues":["' + issueKey + '"] }');
    }
}