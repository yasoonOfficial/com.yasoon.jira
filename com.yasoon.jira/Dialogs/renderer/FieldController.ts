/// <reference path="../../definitions/jquery.d.ts" />
declare var jira;
declare var yasoon;

namespace FieldController {
    export const projectFieldId = 'project';
    let fieldTypes: any = {};
    let metaFields: { [id: string]: Field } = {};
    //Event --> Fields[]
    let lifecycleHandler: { [id: number]: IFieldEventHandler[] } = {};
    // Event --> FieldId --> Fields[]
    let fieldEventHandler: { [id: number]: { [id: string]: IFieldEventHandler[] } } = {};

    export function register(key: string, newField: typeof Field, params?: any): void {
        fieldTypes[key] = { field: newField, params: params };
    }

    export function getFieldType(field: JiraMetaField): string {
        return field.schema.custom || field.schema.system;
    }

    export function getField(id: string): Field {
        return metaFields[id];
    }

    export function enrichFieldMeta(field: JiraMetaField): boolean {
        let hasChanged = false;
        //Look up in config and set mandatory flag

        //Look up in config and set Hidden field
        if (field.isHidden) {
            field.isHidden = false;
            hasChanged = true;
        }

        return hasChanged;
    }

    export function loadMeta(fields: { [id: string]: JiraMetaField }): void {
        for (let key in fields) {
            let field: JiraMetaField = fields[key];
            let type = getFieldType(field);
            if (type) {
                let buffer = fieldTypes[type];
                if (buffer) {
                    loadField(field, buffer.field, buffer.params);
                }
            }
        }
    }

    export function loadField(fieldMeta: JiraMetaField, type: any, params?: any): void {
        enrichFieldMeta(fieldMeta);
        let field = getField(fieldMeta.key);

        if (field) {
            field.updateFieldMeta(fieldMeta);
        } else {
            let handler: Field = new type(fieldMeta.key, fieldMeta, params);
            metaFields[fieldMeta.key] = handler;
        }
    }

    export function render(id: string, container: JQuery): void {
        let field = getField(id);
        if (field) {
            field.renderField(container);
        }
    }

    export function getValue(id: string, changedDataOnly: boolean): any {
        let renderer = getField(id);
        if (renderer) {
            try {
                return renderer.getValue(changedDataOnly);
            } catch (e) {
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t getValue for field ' + id, yasoon.util.severity.warning);
            }
        }
    }

    export function getFormData(changedDataOnly: boolean): any {
        let result = { fields: {} };
        //Find Meta for current Issue Type
        for (let key in metaFields) {
            var newValue = getValue(key, changedDataOnly);
            if (newValue !== undefined)
                result.fields[key] = newValue;
        }
        return result;
    }

    export function setValue(id: string, value: any, isInitialValue?: boolean): void {
        let field = getField(id);
        if (field) {
            try {
                field.setValue(value);
                if (isInitialValue)
                    field.setInitialValue(value);
            } catch (e) {
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t setValue for field ' + id, yasoon.util.severity.warning);
            }
        }
    }

    export function setFormData(issue: any): void {
        for (let key in metaFields) {
            setValue(key, issue.fields[key], true);
        }
    }

    export function raiseEvent(eventType: EventType, newValue: any, id?: string): void {
        //Check for Event Type
        console.log('Event raised', eventType, id, newValue);

        switch (eventType) {
            case EventType.FieldChange:
                //get Field handler
                if (fieldEventHandler[eventType] && fieldEventHandler[eventType][id]) {
                    fieldEventHandler[eventType][id].forEach(field => {
                        try {
                            field.handleEvent(eventType, newValue, id);
                        } catch (e) {

                        }
                    });
                }
                break;
            default:
                if (lifecycleHandler[eventType]) {
                    lifecycleHandler[eventType].forEach(field => {
                        try {
                            field.handleEvent(eventType, newValue);
                        } catch (e) {

                        }
                    });
                }
                break;
        }
    }

    export function registerEvent(eventType: EventType, handler: IFieldEventHandler, id?: string): void {
        switch (eventType) {
            case EventType.FieldChange:
                if (!fieldEventHandler[eventType]) {
                    fieldEventHandler[eventType] = {};
                }

                if (!fieldEventHandler[eventType][id]) {
                    fieldEventHandler[eventType][id] = [];
                }
                fieldEventHandler[eventType][id].push(handler);
                break;

            default:
                if (!lifecycleHandler[eventType]) {
                    lifecycleHandler[eventType] = [];
                }
                lifecycleHandler[eventType].push(handler);
                break;
        }
    }
}

//Util Stuff --> New File
function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}

function insertAtCursor(myField, myValue) {
    var startPos = myField.selectionStart;
    var endPos = myField.selectionEnd;
    if (startPos > 0)
        myValue = '\n' + myValue;

    myField.value = myField.value.substring(0, startPos) +
        myValue +
        myField.value.substring(endPos, myField.value.length);
}

var timeoutSearchUser = null;
function searchJiraUser(mode, query, callback) {
    //First try to get an issue key ... if it doesn't exist, get project
    var selectedIssueKey = null;
    var selectedProjectKey = null;

    if (jira.getSelectedIssueOption) {
        selectedIssueKey = jira.getSelectedIssueOption().data('key');
    }

    if (!selectedIssueKey) {
        selectedProjectKey = $('#project').data('key') || ((jira.selectedProject) ? jira.selectedProject.key : null);
    }
    if (selectedIssueKey || selectedProjectKey) {
        var queryKey = (selectedIssueKey) ? 'issueKey=' + selectedIssueKey : 'projectKey=' + selectedProjectKey;
        /*
        jiraGet('/rest/api/2/user/viewissue/search?' + queryKey + '&maxResults=10&username=' + query)
            .then(function (users) {
                var data = [];
                users = JSON.parse(users);
                users.forEach(function (user) {
                    data.push({ id: user.name, name: user.displayName, type: 'user' });
                });
                callback(data);
            });*/
    } else {
        //Show alert
        $('.mentions-input-box + .mentions-help-text').slideDown();
        if (timeoutSearchUser) {
            clearTimeout(timeoutSearchUser);
        }
        timeoutSearchUser = setTimeout(function () { $('.mentions-input-box + .mentions-help-text').slideUp(); }, 2000);
        callback([]);
    }
}