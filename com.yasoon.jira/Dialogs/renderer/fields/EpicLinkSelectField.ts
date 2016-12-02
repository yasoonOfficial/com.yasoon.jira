/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />

@setter(SetterType.Option)
class EpicLinkSelectField extends Select2AjaxField {
    private emptySearch;

    constructor(id: string, field: JiraMetaField) {
        super(id, field);
        this.setter = new SetOptionValue();
    }

    getValue(changedDataOnly: boolean): string {
        //Only for creation as Epic links cannot be changed via REST APi --> Status code 500
        //Ticket: https://jira.atlassian.com/browse/GHS-10333
        //There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
        if (!jiraIsVersionHigher(jira.systemInfo, '7') && !changedDataOnly && $('#' + this.id).val()) {
            return 'key:' + $('#' + this.id).val();
        }
    }

    setValue(value: string) {
        //Format in JIRA < 7.0 "key: epicId" , JIRA 7+: just epic Id
        if (!jiraIsVersionHigher(jira.systemInfo, '7')) {
            value = value.replace('key:', '');
        }

        this.setter.setValue(this, value);
    }

    convertToSelect2(epic: JiraEpic): Select2Element {
        return {
            id: epic.key,
            text: epic.name + ' ( ' + epic.key + ' )',
            data: epic
        };
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
}