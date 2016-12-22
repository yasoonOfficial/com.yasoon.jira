/// <reference path="../../definitions/jquery.d.ts" />
declare var jira;

namespace FieldController {
    export const projectFieldId = 'project';
    export const issueTypeFieldId = 'issuetype';
    export const issueFieldId = 'parent';
    export const requestTypeFieldId = 'requesttype';
    export const reporterFieldId = 'reporter';
    export const onBehalfOfFieldId = 'onBehalfOf';
    export const attachmentFieldId = 'attachment';
    export const descriptionFieldId = 'description';

    // Add-to-Issue
    export const commentFieldId = 'comment';

    let fieldTypes: any = {};
    let metaFields: { [id: string]: Field } = {};
    let currentMeta: { [id: string]: JiraMetaField } = {};
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
        //Currently all visible
        field.isHidden = false;
        return hasChanged;
    }
    export function getMeta(): { [id: string]: JiraMetaField } {
        return currentMeta;
    }

    export function loadMeta(fields: { [id: string]: JiraMetaField }): void {
        currentMeta = fields;
        for (let key in fields) {
            let field: JiraMetaField = fields[key];
            field.key = key; //Is not always set by Jira :/
            let type = getFieldType(field);
            if (type) {
                let buffer = fieldTypes[type];
                if (buffer) {
                    loadField(field, buffer.field, buffer.params);
                }
            }
        }
    }

    export function loadField(fieldMeta: JiraMetaField, type: any, params?: any): Field {
        enrichFieldMeta(fieldMeta);
        let field = getField(fieldMeta.key);

        if (field) {
            field.updateFieldMeta(fieldMeta);
            return field;
        } else {
            let handler: Field = new type(fieldMeta.key, fieldMeta, params);
            metaFields[fieldMeta.key] = handler;
            return handler;
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
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t getValue for field ' + id, yasoon.util.severity.error);
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
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t setValue for field ' + id, yasoon.util.severity.error, getStackTrace(e));
            }
        }
    }

    export function setFormData(issue: any): void {
        for (let key in metaFields) {
            if (key == FieldController.projectFieldId || key == FieldController.issueTypeFieldId)
                continue;

            setValue(key, issue.fields[key], true);
        }
    }

    export function raiseEvent(eventType: EventType, newValue?: any, id?: string): Promise<any> {
        //Check for Event Type
        let returnPromises: Promise<any>[] = [];
        switch (eventType) {
            case EventType.FieldChange:
                //get Field handler
                if (fieldEventHandler[eventType] && fieldEventHandler[eventType][id]) {
                    fieldEventHandler[eventType][id].forEach(field => {
                            setTimeout((eventType, newValue, id) => {
                                try {
                                field.handleEvent(eventType, newValue, id);
                                } catch(e) {
                                    yasoon.util.log('Error: ' + e.message + ' in raiseEvent. EventType FieldChange|| newValue ' + newValue + ' || Id: ' + id, yasoon.util.severity.error, getStackTrace(e));
                                }
                            }, 1, eventType, newValue, id);
                    });
                }
                break;
            default:
                if (lifecycleHandler[eventType]) {
                    lifecycleHandler[eventType].forEach(field => {
                        try {
                            let result: Promise<any> = field.handleEvent(eventType, newValue);
                            if (result) {
                                returnPromises.push(result);
                            }
                        } catch (e) {
                             yasoon.util.log('Error: ' + e.message + ' in raiseEvent. EventType ' + eventType + ' || newValue ' + newValue, yasoon.util.severity.error, getStackTrace(e));
                        }
                    });
                }
                break;
        }

        if (returnPromises.length > 0) {
            return Promise.all(returnPromises);
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

function sortByText(a, b) {
    return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1);
}