/// <reference path="../../definitions/jquery.d.ts" />
declare var jira;
declare var yasoon;

var jiraFields = {};

namespace FieldController {
    let fieldTypes: any = {};
    let metaFields: { [id: string]: Field } = {};

    export function register(key: string, newField: typeof Field, params?: any): void {
        fieldTypes[key] = { field: newField, params: params };
    }

    export function getFieldType(field: JiraMetaField): string {
        return field.schema.custom || field.schema.system;
    }

    export function getField(id: string): Field {
        return metaFields[id];
    }

    export function loadMeta(fields: any): void {
        for (let key in fields) {
            let field = fields[key];
            let type = getFieldType(field);
            if (type) {
                let buffer = fieldTypes[type];
                let handler: Field = new buffer.field(key, field, buffer.params);
                metaFields[field.id] = handler;
            }
        }
    }

    export function render(id: string, container: JQuery): void {
        let renderer = getField(id);
        if (renderer) {
            renderer.render(container);
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

    export function setValue(id, value): void {
        let field = getField(id);
        if (field) {
            try {
                return field.setValue(value);
            } catch (e) {
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t setValue for field ' + id, yasoon.util.severity.warning);
            }
        }
    }

    export function setFormData(issue): void {
        for (let key in metaFields) {
            setValue(key, issue.fields[key]);
        }
    }
}
/*
function UIFormHandler() {
    function getFieldType(field) {
        return field.schema.custom || field.schema.system;
    }

    renderer = {};

    return {
        register: function (key, newRenderer) {
            renderer[key] = newRenderer;
        },
        getFieldType: function (field) {
            return getFieldType(field);
        },
        getRenderer: function (key) {
            return renderer[key];
        },
        render: function (id, field, container) {
            var type = getFieldType(field);
            if (type) {
                var responsibleRenderer = renderer[type];
                if (responsibleRenderer)
                    responsibleRenderer.render(id, field, container);
            }
        },

        getValue: function (id, field) {
            var type = getFieldType(field);
            if (type) {
                var responsibleRenderer = renderer[type];
                if (responsibleRenderer)
                    return responsibleRenderer.getValue(id);
            }
        },

        getFormData: function (result) {
            result = result || { fields: {} };
            var self = this;
            //Find Meta for current Issue Type
            if (jira.currentMeta) {
                $.each(jira.currentMeta.fields, function (key, field) {
                    var newValue = self.getValue(key, field);
                    if (newValue !== undefined)
                        result.fields[key] = newValue;
                });
            }
        },

        setValue: function (id, field, value) {
            var type = getFieldType(field);
            if (type) {
                var responsibleRenderer = renderer[type];
                if (responsibleRenderer)
                    return responsibleRenderer.setValue(id, value);
            }
        },

        setFormData: function (issue) {
            var self = this;
            if (jira.currentMeta) {
                $.each(jira.currentMeta.fields, function (key, field) {
                    try {
                        self.setValue(key, field, issue.fields[key]);
                    } catch (e) {
                        console.log('Error SetValue for Field: ', field, e.message);
                        yasoon.util.log('Error: ' + e.message + '. Couldn\'t setValue for field' + JSON.stringify(field), yasoon.util.severity.warning);
                    }
                });
            }
        },

        triggerEvent: function (eventType, data) {
            if (jira.currentMeta) {
                $.each(jira.currentMeta.fields, function (key, field) {
                    var type = getFieldType(field);
                    if (type) {
                        var responsibleRenderer = renderer[type];
                        if (responsibleRenderer && responsibleRenderer.hasOwnProperty('handleEvent')) {
                            responsibleRenderer.handleEvent(eventType, key, field, data);
                        }
                    }
                });
            }
        },
    };
}

var UIRenderer = new UIFormHandler(); */