var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetValue = (function () {
    function SetValue() {
    }
    SetValue.prototype.setValue = function (id, value) {
        if (value)
            $('#' + id).val(value);
    };
    return SetValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var GetTextValue = (function () {
    function GetTextValue(getDomValue) {
        this.getDomValue = getDomValue;
    }
    GetTextValue.prototype.getValue = function (id, field, initialValue, onlyChangedData) {
        var val;
        if (this.getDomValue) {
            val = this.getDomValue(id);
        }
        else {
            val = $('#' + id).val();
        }
        if (onlyChangedData)
            //In edit case: Only send if changed	
            return (isEqual(initialValue, val)) ? undefined : val;
        else
            //In creation case: Only send if not null	
            return (val) ? val : undefined;
    };
    return GetTextValue;
}());
/// <reference path="../../definitions/jquery.d.ts" />
/// <reference path="setter/SetValue.ts" />
/// <reference path="getter/GetTextValue.ts" />
var Field = (function () {
    function Field(id, fieldMeta) {
        this.id = id;
        this.fieldMeta = fieldMeta;
    }
    Field.prototype.getValue = function (onlyChangedData) {
        if (onlyChangedData === void 0) { onlyChangedData = false; }
        if (!getter)
            throw new Error("Please either redefine method getValue or add a @getter Annotation for " + this.id);
        return this.getter.getValue(this.id, this.fieldMeta, this.initalValue, onlyChangedData);
    };
    ;
    Field.prototype.setInitialValue = function (value) {
        this.initalValue = value;
    };
    ;
    Field.prototype.setValue = function (value) {
        if (!setter)
            throw new Error("Please either redefine method setValue or add a @setter Annotation for " + this.id);
        return this.setter.setValue(this.id, value);
    };
    ;
    Field.prototype.triggerValueChange = function () {
        FieldController.raiseEvent(EventType.FieldChange, this.id, this.getValue(false));
    };
    ;
    Field.prototype.renderField = function (container) {
        var newContainer;
        var fieldGroup = container.find('#' + this.id + '-field-group');
        //First render the field-group container for this field if it does not exist yet
        if (fieldGroup.length === 0) {
            fieldGroup = $("<div id=\"#" + this.id + "-field-group\" data-field-id=\"" + this.id + "\"></div>").appendTo(container);
        }
        //Render label, mandatory and hidden logic
        var html = "<div class=\"field-group " + ((this.fieldMeta.required) ? 'required' : '') + " " + ((this.fieldMeta.isHidden) ? 'hidden' : '') + "\" >\n\t\t\t\t\t\t<label for=\"" + this.id + "\">" + this.fieldMeta.name + " \n\t\t\t\t\t\t\t<span class=\"aui-icon icon-required\">Required</span>\n\t\t\t\t\t\t</label>\n\t\t\t\t\t\t<div class=\"field-container\">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>";
        newContainer = $(html).appendTo(fieldGroup);
        //Only inject inner container for easier usage
        this.render(newContainer.find('.field-container'));
        this.hookEventHandler();
    };
    ;
    return Field;
}());
var GetterType;
(function (GetterType) {
    GetterType[GetterType["Text"] = 0] = "Text";
    GetterType[GetterType["CheckedArray"] = 1] = "CheckedArray";
})(GetterType || (GetterType = {}));
var SetterType;
(function (SetterType) {
    SetterType[SetterType["Text"] = 0] = "Text";
    SetterType[SetterType["CheckedArray"] = 1] = "CheckedArray";
})(SetterType || (SetterType = {}));
var EventType;
(function (EventType) {
    EventType[EventType["FieldChange"] = 0] = "FieldChange";
})(EventType || (EventType = {}));
//@getter Annotation
function getter(getterType, getDomValue) {
    return function (target) {
        var proto = target.prototype;
        switch (getterType) {
            case GetterType.Text:
                proto.getter = new GetTextValue(getDomValue);
                break;
        }
    };
}
//@setter Annotation
function setter(setterType) {
    return function (target) {
        var proto = target.prototype;
        switch (setterType) {
            case SetterType.Text:
                proto.setter = new SetValue();
                break;
        }
    };
}
/// <reference path="../Field.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SingleTextField = (function (_super) {
    __extends(SingleTextField, _super);
    function SingleTextField() {
        _super.apply(this, arguments);
    }
    SingleTextField.getDomValue = function (id) {
        return $('#' + id).val();
    };
    SingleTextField.prototype.hookEventHandler = function () {
        $('#' + this.id).change(this.triggerValueChange);
    };
    ;
    SingleTextField.prototype.render = function (container) {
        container.append($("<input class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" type=\"text\" />"));
    };
    ;
    SingleTextField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Text, SingleTextField.getDomValue),
        setter(SetterType.Text)
    ], SingleTextField);
    return SingleTextField;
}(Field));
/// <reference path="../../definitions/jquery.d.ts" />
var FieldController;
(function (FieldController) {
    var fieldTypes = {};
    var metaFields = {};
    function register(key, newField, params) {
        fieldTypes[key] = { field: newField, params: params };
    }
    FieldController.register = register;
    function getFieldType(field) {
        return field.schema.custom || field.schema.system;
    }
    FieldController.getFieldType = getFieldType;
    function getField(id) {
        return metaFields[id];
    }
    FieldController.getField = getField;
    function enrichFieldMeta(field) {
        var hasChanged = false;
        //Look up in config and set mandatory flag
        //Look up in config and set Hidden field
        if (field.isHidden) {
            field.isHidden = false;
            hasChanged = true;
        }
        return hasChanged;
    }
    FieldController.enrichFieldMeta = enrichFieldMeta;
    function loadMeta(fields) {
        for (var key in fields) {
            var field = fields[key];
            var type = getFieldType(field);
            if (type) {
                var buffer = fieldTypes[type];
                enrichFieldMeta(field);
                var handler = new buffer.field(key, field, buffer.params);
                metaFields[key] = handler;
            }
        }
    }
    FieldController.loadMeta = loadMeta;
    function render(id, container) {
        var renderer = getField(id);
        if (renderer) {
            renderer.renderField(container);
        }
    }
    FieldController.render = render;
    function getValue(id, changedDataOnly) {
        var renderer = getField(id);
        if (renderer) {
            try {
                return renderer.getValue(changedDataOnly);
            }
            catch (e) {
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t getValue for field ' + id, yasoon.util.severity.warning);
            }
        }
    }
    FieldController.getValue = getValue;
    function getFormData(changedDataOnly) {
        var result = { fields: {} };
        //Find Meta for current Issue Type
        for (var key in metaFields) {
            var newValue = getValue(key, changedDataOnly);
            if (newValue !== undefined)
                result.fields[key] = newValue;
        }
        return result;
    }
    FieldController.getFormData = getFormData;
    function setValue(id, value, isInitialValue) {
        var field = getField(id);
        if (field) {
            try {
                field.setValue(value);
                if (isInitialValue)
                    field.setInitialValue(value);
            }
            catch (e) {
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t setValue for field ' + id, yasoon.util.severity.warning);
            }
        }
    }
    FieldController.setValue = setValue;
    function setFormData(issue) {
        for (var key in metaFields) {
            setValue(key, issue.fields[key], true);
        }
    }
    FieldController.setFormData = setFormData;
    function raiseEvent(eventType, id, newValue) {
        //Check for Event Type
        switch (eventType) {
            case EventType.FieldChange:
                //Check if we have a dynamic config for this field.
                if (id === "1") {
                }
                break;
        }
    }
    FieldController.raiseEvent = raiseEvent;
})(FieldController || (FieldController = {}));
//Util Stuff --> New File
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
    }
    else {
        //Show alert
        $('.mentions-input-box + .mentions-help-text').slideDown();
        if (timeoutSearchUser) {
            clearTimeout(timeoutSearchUser);
        }
        timeoutSearchUser = setTimeout(function () { $('.mentions-input-box + .mentions-help-text').slideUp(); }, 2000);
        callback([]);
    }
}
