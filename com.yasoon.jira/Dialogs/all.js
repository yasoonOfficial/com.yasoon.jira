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
var EmailController = (function () {
    function EmailController(mail, settings) {
        this.fieldMapping = {
            subject: 'summary',
            body: 'description',
            sender: 'reporter',
            sentAt: ''
        };
        this.mail = mail;
        this.settings = settings;
        var fieldMappingString = yasoon.setting.getAppParameter('fieldMapping');
        if (fieldMappingString) {
            this.fieldMapping = JSON.parse(fieldMappingString);
        }
    }
    EmailController.prototype.getAttachmentFileHandles = function () {
        //If created by email, check for templates and attachments
        if (this.mail && !this.attachmentHandles) {
            this.attachmentHandles = [];
            //Add current mail to clipboard
            var handle = this.mail.getFileHandle();
            if (this.settings.addEmailOnNewAddIssue) {
                handle.selected = true;
            }
            this.attachmentHandles.push(handle);
            if (this.mail.attachments && this.mail.attachments.length > 0) {
                this.mail.attachments.forEach(function (attachment) {
                    var handle = attachment.getFileHandle();
                    //Skip too small images	
                    if (this.settings.addAttachmentsOnNewAddIssue) {
                        handle.selected = true;
                    }
                    this.attachmentHandles.push(handle);
                });
            }
        }
        return this.attachmentHandles || [];
    };
    return EmailController;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetValue = (function () {
    function SetValue() {
    }
    SetValue.prototype.setValue = function (id, value) {
        if (value)
            $('#' + id).val(value).trigger('change');
    };
    return SetValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var GetTextValue = (function () {
    function GetTextValue() {
    }
    GetTextValue.prototype.getValue = function (id, field, onlyChangedData, newValue, initialValue) {
        if (onlyChangedData)
            //In edit case: Only send if changed	
            return (isEqual(initialValue, newValue)) ? undefined : newValue;
        else
            //In creation case: Only send if not null	
            return (newValue) ? newValue : undefined;
    };
    return GetTextValue;
}());
/// <reference path="../../definitions/jquery.d.ts" />
/// <reference path="setter/SetValue.ts" />
/// <reference path="getter/GetTextValue.ts" />
var Field = (function () {
    function Field(id, fieldMeta, params) {
        this.id = id;
        this.fieldMeta = fieldMeta;
        this.params = params;
    }
    Field.prototype.getValue = function (onlyChangedData) {
        if (onlyChangedData === void 0) { onlyChangedData = false; }
        if (!getter)
            throw new Error("Please either redefine method getValue or add a @getter Annotation for " + this.id);
        return this.getter.getValue(this.id, this.fieldMeta, onlyChangedData, this.getDomValue(), this.initialValue);
    };
    Field.prototype.setInitialValue = function (value) {
        this.initialValue = value;
    };
    Field.prototype.setValue = function (value) {
        if (!setter)
            throw new Error("Please either redefine method setValue or add a @setter Annotation for " + this.id);
        return this.setter.setValue(this.id, value);
    };
    Field.prototype.triggerValueChange = function () {
        FieldController.raiseEvent(EventType.FieldChange, this.getValue(false), this.id);
    };
    Field.prototype.updateFieldMeta = function (newMeta) {
        this.fieldMeta = newMeta;
    };
    Field.prototype.renderField = function (container) {
        var fieldGroup = container.find('#' + this.id + '-field-group');
        //First render the field-group container for this field if it does not exist yet
        if (fieldGroup.length === 0) {
            fieldGroup = $("<div id=\"#" + this.id + "-field-group\" data-field-id=\"" + this.id + "\"></div>").appendTo(container);
        }
        //Render label, mandatory and hidden logic
        var html = "<div class=\"field-group " + ((this.fieldMeta.required) ? 'required' : '') + " " + ((this.fieldMeta.isHidden) ? 'hidden' : '') + "\" >\n\t\t\t\t\t\t<label for=\"" + this.id + "\">" + this.fieldMeta.name + " \n\t\t\t\t\t\t\t<span class=\"aui-icon icon-required\">Required</span>\n\t\t\t\t\t\t</label>\n\t\t\t\t\t\t<div class=\"field-container\">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class=\"description\">" + ((this.fieldMeta.description) ? this.fieldMeta.description : '') + "</div>\n\t\t\t\t\t</div>";
        this.ownContainer = $(fieldGroup).html(html).find('.field-container');
        //Only inject inner container for easier usage
        this.render(this.ownContainer);
        this.hookEventHandler();
    };
    return Field;
}());
var GetterType;
(function (GetterType) {
    GetterType[GetterType["Text"] = 0] = "Text";
    GetterType[GetterType["Object"] = 1] = "Object";
    GetterType[GetterType["ObjectArray"] = 2] = "ObjectArray";
    GetterType[GetterType["Array"] = 3] = "Array";
})(GetterType || (GetterType = {}));
var SetterType;
(function (SetterType) {
    SetterType[SetterType["Text"] = 0] = "Text";
    SetterType[SetterType["CheckedValues"] = 1] = "CheckedValues";
    SetterType[SetterType["Date"] = 2] = "Date";
    SetterType[SetterType["DateTime"] = 3] = "DateTime";
    SetterType[SetterType["Option"] = 4] = "Option";
    SetterType[SetterType["Tag"] = 5] = "Tag";
})(SetterType || (SetterType = {}));
var EventType;
(function (EventType) {
    EventType[EventType["FieldChange"] = 0] = "FieldChange";
    EventType[EventType["AfterRender"] = 1] = "AfterRender";
    EventType[EventType["AfterSave"] = 2] = "AfterSave";
    EventType[EventType["BeforeSave"] = 3] = "BeforeSave";
})(EventType || (EventType = {}));
//@getter Annotation
function getter(getterType, params) {
    return function (target) {
        var proto = target.prototype;
        switch (getterType) {
            case GetterType.Text:
                proto.getter = new GetTextValue();
                break;
            case GetterType.Object:
                proto.getter = new GetObject(params);
                break;
            case GetterType.ObjectArray:
                proto.getter = new GetObjectArray(params);
                break;
            case GetterType.Array:
                proto.getter = new GetArray();
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
            case SetterType.CheckedValues:
                proto.setter = new SetCheckedValues();
                break;
            case SetterType.Date:
                proto.setter = new SetDateValue();
                break;
            case SetterType.DateTime:
                proto.setter = new SetDateTimeValue();
                break;
            case SetterType.Option:
                proto.setter = new SetOptionValue();
                break;
            case SetterType.Tag:
                proto.setter = new SetTagValue();
                break;
        }
    };
}
/// <reference path="../../definitions/jquery.d.ts" />
var FieldController;
(function (FieldController) {
    FieldController.projectFieldId = 'project';
    FieldController.issueTypeFieldId = 'issueType';
    FieldController.issueFieldId = 'issue';
    var fieldTypes = {};
    var metaFields = {};
    //Event --> Fields[]
    var lifecycleHandler = {};
    // Event --> FieldId --> Fields[]
    var fieldEventHandler = {};
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
                if (buffer) {
                    loadField(field, buffer.field, buffer.params);
                }
            }
        }
    }
    FieldController.loadMeta = loadMeta;
    function loadField(fieldMeta, type, params) {
        enrichFieldMeta(fieldMeta);
        var field = getField(fieldMeta.key);
        if (field) {
            field.updateFieldMeta(fieldMeta);
        }
        else {
            var handler = new type(fieldMeta.key, fieldMeta, params);
            metaFields[fieldMeta.key] = handler;
        }
    }
    FieldController.loadField = loadField;
    function render(id, container) {
        var field = getField(id);
        if (field) {
            field.renderField(container);
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
    function raiseEvent(eventType, newValue, id) {
        //Check for Event Type
        console.log('Event raised', eventType, id, newValue);
        switch (eventType) {
            case EventType.FieldChange:
                //get Field handler
                if (fieldEventHandler[eventType] && fieldEventHandler[eventType][id]) {
                    fieldEventHandler[eventType][id].forEach(function (field) {
                        try {
                            setTimeout(function (eventType, newValue, id) {
                                field.handleEvent(eventType, newValue, id);
                            }, 1, eventType, newValue, id);
                        }
                        catch (e) {
                        }
                    });
                }
                break;
            default:
                if (lifecycleHandler[eventType]) {
                    lifecycleHandler[eventType].forEach(function (field) {
                        try {
                            field.handleEvent(eventType, newValue);
                        }
                        catch (e) {
                        }
                    });
                }
                break;
        }
    }
    FieldController.raiseEvent = raiseEvent;
    function registerEvent(eventType, handler, id) {
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
    FieldController.registerEvent = registerEvent;
})(FieldController || (FieldController = {}));
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
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
var AttachmentField = (function (_super) {
    __extends(AttachmentField, _super);
    function AttachmentField() {
        _super.apply(this, arguments);
    }
    AttachmentField.prototype.getDomValue = function () {
        return '';
    };
    AttachmentField.prototype.getValue = function () {
        //Nessecary as attachments will upload differently
        return undefined;
    };
    AttachmentField.prototype.setValue = function () {
        //Attachments work differently
    };
    AttachmentField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    AttachmentField.prototype.render = function (container) {
        container.append($("<input class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" type=\"text\" />"));
    };
    ;
    return AttachmentField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var Select2Field = (function (_super) {
    __extends(Select2Field, _super);
    function Select2Field(id, field, options, multiple, style) {
        if (multiple === void 0) { multiple = false; }
        if (style === void 0) { style = "min-width: 350px; width: 80%;"; }
        _super.call(this, id, field);
        this.options = $.extend({ minimumInputLength: 0, allowClear: true, placeholder: '', templateResult: Select2Field.formatIcon, templateSelection: Select2Field.formatIcon }, options);
        this.styleCss = style;
        this.multiple = multiple;
    }
    Select2Field.prototype.getDomValue = function () {
        if (this.multiple) {
            var values = $('#' + this.id).val() || [];
            var selectedValues_1 = [];
            values.forEach(function (id) {
                selectedValues_1.push({ id: id });
            });
            return selectedValues_1;
        }
        else {
            return $('#' + this.id).val();
        }
    };
    Select2Field.prototype.getObjectValue = function () {
        var elements = $('#' + this.id)['select2']('data');
        if (this.multiple) {
            return elements.map(function (p) { return p.data; });
        }
        else {
            return elements[0].data;
        }
    };
    Select2Field.prototype.setData = function (newValues) {
        this.options.data = newValues;
        $('#' + this.id)["select2"]("destroy");
        $('#' + this.id).remove();
        this.render(this.ownContainer);
        this.hookEventHandler();
    };
    Select2Field.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).on('change', function (e) { return _this.triggerValueChange(); });
    };
    Select2Field.prototype.render = function (container) {
        container.append($("<select class=\"select input-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" style=\"" + this.styleCss + "\" " + ((this.multiple) ? 'multiple' : '') + ">\n\t\t\t\t\t\t\t\t<option></option>\n\t\t\t\t\t\t\t</select>\n\t\t\t\t\t\t\t<img src=\"Dialogs/ajax-loader.gif\" class=\"hidden\" id=\"" + this.id + "-spinner\" />"));
        $('#' + this.id)["select2"](this.options);
    };
    Select2Field.prototype.showSpinner = function () {
        $('#' + this.id + '-spinner').removeClass('hidden');
    };
    Select2Field.prototype.hideSpinner = function () {
        $('#' + this.id + '-spinner').addClass('hidden');
    };
    Select2Field.formatIcon = function (element) {
        if (!element.id)
            return element.text; // optgroup
        if (element.icon)
            return $('<span><img style="margin-right:3px; width: 16px;" src="' + element.icon + '"  onerror="jiraHandleImageFallback(this)"/>' + element.text + '</span>');
        else if (element.iconClass) {
            return $('<span><i style="margin-right:4px;" class="' + element.iconClass + '"></i><span>' + element.text + '</span></span>');
        }
        else {
            return element.text;
        }
    };
    Select2Field.convertToSelect2Array = function (jiraValues) {
        var data = [];
        jiraValues.forEach(function (value) {
            var text = value.name || value.value;
            var newObj = { id: value.id, text: text };
            if (value.iconUrl) {
                newObj.icon = jira.icons.mapIconUrl(value.iconUrl);
            }
            data.push(newObj);
        });
        return data;
    };
    return Select2Field;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var GetObject = (function () {
    function GetObject(keyName) {
        this.keyName = keyName;
    }
    GetObject.prototype.getValue = function (id, field, onlyChangedData, newValue, initialValue) {
        var result = {};
        if (onlyChangedData) {
            //In edit case: Only send if changed	
            if (!isEqual(initialValue, newValue)) {
                result[this.keyName] = newValue || "-1";
                return result;
            }
        }
        else {
            //In creation case: Only send if not null	
            if (newValue) {
                result[this.keyName] = newValue;
                return result;
            }
        }
    };
    return GetObject;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetOptionValue = (function () {
    function SetOptionValue() {
    }
    SetOptionValue.prototype.setValue = function (id, value) {
        if (value && Array.isArray(value)) {
            //Multiselect            
            var selectedValues_2 = [];
            value.forEach(function (v) {
                var text = v.name || v.value;
                $('#' + id).append("<option value=\"" + v.id + ">" + text + "</option>");
                selectedValues_2.push(v.id);
            });
            $('#' + id).val(selectedValues_2).trigger('change');
        }
        else if (value) {
            //Single Select
            var text = value.name || value.value;
            $('#' + id).append("<option value=\"" + value.id + ">" + text + "</option>");
            $('#' + id).val(value.id).trigger('change');
        }
    };
    return SetOptionValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var CascadedSelectField = (function (_super) {
    __extends(CascadedSelectField, _super);
    function CascadedSelectField(id, field) {
        _super.call(this, id, field, {});
        this.parentField = new SingleSelectField(id + '_parent', field, {}, "min-width: 150px; width: 45%;");
        var childFieldMeta = JSON.parse(JSON.stringify(field));
        childFieldMeta.allowedValues = [];
        this.childField = new SingleSelectField(id + '_child', childFieldMeta, {}, "min-width: 150px; width: 45%; ");
    }
    CascadedSelectField.prototype.getValue = function (onlyChangedData) {
        if (onlyChangedData === void 0) { onlyChangedData = false; }
        var selectedParentId = this.parentField.getDomValue() || null;
        var selectedChildId = this.childField.getDomValue() || null;
        var resultObj = null;
        if (onlyChangedData) {
            //In edit case: Only send if changed	
            var oldParentValue = (this.initialValue) ? this.initialValue.id : null;
            var oldChildValue = (this.initialValue && this.initialValue.child) ? this.initialValue.child.id : null;
            if (!isEqual(oldParentValue, selectedParentId) ||
                !isEqual(oldChildValue, selectedChildId)) {
                if (selectedParentId) {
                    var childObj = (selectedChildId) ? { id: selectedChildId } : null;
                    return {
                        id: selectedParentId,
                        child: childObj
                    };
                }
                else {
                    return null;
                }
            }
        }
        else {
            //In creation case: Only send if not null
            if (selectedParentId) {
                resultObj = { id: selectedParentId };
                if (selectedChildId) {
                    resultObj.child = { id: selectedChildId };
                }
                return resultObj;
            }
        }
    };
    CascadedSelectField.prototype.setValue = function (value) {
        this.parentField.setValue(value.id);
        if (value.child) {
            this.childField.setValue(value.child.id);
        }
    };
    CascadedSelectField.prototype.hookEventHandler = function () {
        var _this = this;
        _super.prototype.hookEventHandler.call(this);
        $('#' + this.parentField.id).change(function (e) {
            var parentValue = _this.parentField.getDomValue();
            var currentSelection = _this.fieldMeta.allowedValues.filter(function (v) { return v.id == parentValue; })[0];
            var allowedValues = (currentSelection) ? currentSelection.children : [];
            _this.childField.setData(Select2Field.convertToSelect2Array(allowedValues));
        });
    };
    CascadedSelectField.prototype.render = function (container) {
        this.parentField.render(container);
        container.append('<span style="margin-left: 10px;">&nbsp</span>');
        this.childField.render(container);
    };
    return CascadedSelectField;
}(Select2Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var GetObjectArray = (function () {
    function GetObjectArray(keyName) {
        this.keyName = keyName;
    }
    GetObjectArray.prototype.getValue = function (id, field, onlyChangedData, newValue, initialValue) {
        //In edit case: Only send changes
        if (onlyChangedData) {
            //Both empty
            if (!initialValue && newValue.length === 0)
                return;
            //If length the same and all values match, we do not need to send anything            
            if (initialValue && initialValue.length === newValue.length) {
                var isSame = initialValue.every(function (c) {
                    return findWithAttr(newValue, this.keyName, c[this.keyName]) > -1;
                });
                if (isSame)
                    return;
            }
            return newValue;
        }
        else {
            //In creation case: Only send if not null	
            return (newValue.length > 0) ? newValue : undefined;
        }
    };
    return GetObjectArray;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetCheckedValues = (function () {
    function SetCheckedValues() {
    }
    SetCheckedValues.prototype.setValue = function (id, value) {
        if (value) {
            var elem_1 = $('#' + id);
            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    elem_1.find('[value=' + item.id + ']').prop('checked', true).trigger('change');
                });
            }
            else {
                elem_1.find('[value=' + value.id + ']').prop('checked', true).trigger('change');
            }
        }
    };
    return SetCheckedValues;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetCheckedValues.ts" />
var CheckboxField = (function (_super) {
    __extends(CheckboxField, _super);
    function CheckboxField() {
        _super.apply(this, arguments);
    }
    CheckboxField.prototype.getDomValue = function () {
        var checkedValues = [];
        $('#' + this.id).find('input').each(function () {
            if ($(this).is(':checked')) {
                checkedValues.push({ id: $(this).val() });
            }
        });
        return checkedValues;
    };
    CheckboxField.prototype.hookEventHandler = function () {
        var _this = this;
        $("#" + this.id + "-field-group").find('input').change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    CheckboxField.prototype.render = function (container) {
        var _this = this;
        this.fieldMeta.allowedValues.forEach(function (option) {
            container.append($("<div class=\"checkbox awesome\">\n                                    <input type=\"checkbox\" id=\"" + _this.id + "_" + option.id + "\" value=\"" + option.id + "\">\n                                    <label for=\"" + _this.id + "_" + option.id + "\">" + option.value + "</label>\n                                </div>"));
        });
    };
    ;
    CheckboxField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.ObjectArray, "id"),
        setter(SetterType.CheckedValues)
    ], CheckboxField);
    return CheckboxField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetDateValue = (function () {
    function SetDateValue() {
    }
    SetDateValue.prototype.setValue = function (id, value) {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + id)["datetimepicker"]('setOptions', { value: momentDate.format('L') }).trigger('change');
        }
    };
    return SetDateValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetDateValue.ts" />
var DateField = (function (_super) {
    __extends(DateField, _super);
    function DateField() {
        _super.apply(this, arguments);
    }
    DateField.prototype.getDomValue = function () {
        var date = $('#' + this.id)["datetimepicker"]("getValue");
        if (date) {
            date = moment(date).format('YYYY-MM-DD');
        }
        return date;
    };
    DateField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    DateField.prototype.render = function (container) {
        var _this = this;
        container.append($("<input style=\"height: 28px;\" class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" placeholder=\"" + yasoon.i18n('dialog.datePickerFormatTitle') + "\" value=\"\" type=\"text\" >\n\t\t\t\t\t\t\t<a href=\"#\" id=\"" + this.id + "-trigger\" title=\"" + yasoon.i18n('dialog.titleSelectDate') + "\"><span class=\"aui-icon icon-date\">" + yasoon.i18n('dialog.titleSelectDate') + "</span></a>"));
        $('#' + this.id)["datetimepicker"]({
            timepicker: false,
            format: yasoon.i18n('dialog.datePickerDateFormat'),
            scrollInput: false,
            allowBlank: true
        });
        var country = yasoon.setting.getProjectSetting('locale').split('-')[0];
        $["datetimepicker"].setLocale(country);
        $('#' + this.id + '-trigger').off().click(function (e) {
            $('#' + _this.id)["datetimepicker"]("show");
        });
    };
    ;
    DateField = __decorate([
        getter(GetterType.Text),
        setter(SetterType.Date)
    ], DateField);
    return DateField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetDateTimeValue = (function () {
    function SetDateTimeValue() {
    }
    SetDateTimeValue.prototype.setValue = function (id, value) {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + id)["datetimepicker"]('setOptions', { value: momentDate.format('L') + ' ' + momentDate.format('LT') }).trigger('change');
        }
    };
    return SetDateTimeValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetDateTimeValue.ts" />
var DateTimeField = (function (_super) {
    __extends(DateTimeField, _super);
    function DateTimeField() {
        _super.apply(this, arguments);
    }
    DateTimeField.prototype.getDomValue = function () {
        var date = $('#' + this.id)["datetimepicker"]("getValue");
        if (date) {
            date = moment(date).format('YYYY-MM-DD[T]HH:mm:ss.[000]ZZ');
        }
        return date;
    };
    DateTimeField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    DateTimeField.prototype.render = function (container) {
        var _this = this;
        container.append($("<input style=\"height: 28px;\" class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" placeholder=\"" + yasoon.i18n('dialog.dateTimePickerFormatTitle') + "\" value=\"\" type=\"text\" >\n\t\t\t\t\t\t\t<a href=\"#\" id=\"" + this.id + "-trigger\" title=\"" + yasoon.i18n('dialog.titleSelectDate') + "\"><span class=\"aui-icon icon-date\">" + yasoon.i18n('dialog.titleSelectDate') + "</span></a>"));
        var country = yasoon.setting.getProjectSetting('locale').split('-')[0];
        $('#' + this.id)["datetimepicker"]({
            allowTimes: [
                //'00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30',
                '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
            ],
            format: yasoon.i18n('dialog.dateTimePickerFormat'),
            scrollInput: false,
            allowBlank: true
        });
        $["datetimepicker"].setLocale(country);
        $('#' + this.id + '-trigger').off().click(function (e) {
            $('#' + _this.id)["datetimepicker"]("show");
        });
    };
    ;
    DateTimeField = __decorate([
        getter(GetterType.Text),
        setter(SetterType.DateTime)
    ], DateTimeField);
    return DateTimeField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
var Select2AjaxField = (function (_super) {
    __extends(Select2AjaxField, _super);
    function Select2AjaxField(id, field, options, multiple, style) {
        var _this = this;
        if (options === void 0) { options = {}; }
        if (multiple === void 0) { multiple = false; }
        if (style === void 0) { style = "min-width: 350px; width: 80%;"; }
        if (!options.ajax) {
            options.ajax = {
                url: '',
                transport: function (params, success, failure) {
                    var queryTerm = '';
                    if (params && params.data && params.data.q) {
                        queryTerm = params.data.q;
                    }
                    var promise;
                    if (queryTerm) {
                        promise = _this.getDataDebounced(queryTerm);
                    }
                    else {
                        promise = _this.getEmptyDataInternal();
                    }
                    _this.showSpinner();
                    promise
                        .spread(function (result, searchTerm) {
                        //This handler is registered multiple times on the same promise.
                        //Check if we are responsible to make sure we call the correct success function
                        if (searchTerm == queryTerm) {
                            console.log('Result for  ' + searchTerm, result);
                            _this.hideSpinner();
                            success(result);
                        }
                    })
                        .catch(function (error) {
                        console.log(error);
                        window["lastError"] = error;
                        _this.hideSpinner();
                        //yasoon.util.log();
                        success();
                    });
                },
                processResults: function (data, page) {
                    if (!data)
                        data = [];
                    return {
                        results: data
                    };
                }
            };
        }
        _super.call(this, id, field, options, multiple, style);
        this.debouncedFunction = debounce(function (searchTerm) {
            _this.getData(searchTerm)
                .then(function (result) {
                _this.currentResolve([result, searchTerm]);
            })
                .catch(function (e) {
                _this.currentReject(e);
            });
        }, 500, false);
    }
    Select2AjaxField.prototype.getDataDebounced = function (searchTerm) {
        var _this = this;
        //Complicated...
        //We don'T want to spam Promises that never fullfill...
        //So we only create Promises if the previous one is already fullfilled.
        //But we need to save all Promise Data and call them debounced...
        if (!this.currentPromise || this.currentPromise.isFulfilled()) {
            console.log('New Promise for: ' + searchTerm, this.currentPromise);
            this.currentPromise = new Promise(function (resolve, reject) {
                _this.currentReject = reject;
                _this.currentResolve = resolve;
                _this.debouncedFunction.call(_this, searchTerm);
            });
            return this.currentPromise;
        }
        console.log('Existing Promise --> Debounce: - ' + searchTerm);
        this.debouncedFunction.call(this, searchTerm);
        return this.currentPromise;
    };
    Select2AjaxField.prototype.getEmptyDataInternal = function () {
        return this.getEmptyData()
            .then(function (result) {
            return [result, '']; //Keep signature for spread
        });
    };
    Select2AjaxField.prototype.getEmptyData = function () {
        var _this = this;
        if (this.emptySearchResult)
            return Promise.resolve(this.emptySearchResult);
        return this.getData("")
            .then(function (result) {
            _this.emptySearchResult = result;
            return result;
        });
    };
    return Select2AjaxField;
}(Select2Field));
function jiraCreateHash(input) {
    var hash = 0, i, chr, len;
    if (input.length === 0)
        return hash;
    for (i = 0, len = input.length; i < len; i++) {
        chr = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate)
                func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow)
            func.apply(context, args);
    };
}
function handleAttachments(originalMarkup, mail) {
    //Check each attachment if it needs to be embedded
    var attachments = mail.attachments;
    var embeddedItems = [];
    var markup = originalMarkup;
    attachments.forEach(function (attachment) {
        if (markup.indexOf('!' + attachment.contentId + '!') > -1) {
            //Mark attachments selected				
            var handle = jira.selectedAttachments.filter(function (a) { return a.contentId === attachment.contentId; })[0];
            if (handle) {
                embeddedItems.push(handle);
            }
            else {
                var regEx = new RegExp('!' + attachment.contentId + '!', 'g');
                markup = markup.replace(regEx, '');
            }
        }
    });
    if (embeddedItems.length === 0)
        return Promise.resolve(originalMarkup);
    //Ensure they are persisted (performance)
    var persist = new Promise(function (resolve, reject) {
        mail.persistAttachments(embeddedItems, resolve, reject);
    });
    return persist.then(function () {
        return embeddedItems;
    })
        .map(function (handle) {
        return yasoon.io.getFileHash(handle).then(function (hash) {
            handle.hash = hash;
            return hash;
        });
    })
        .then(function (hashes) {
        return yasoon.valueStore.queryAttachmentHashes(hashes);
    })
        .then(function (result) {
        embeddedItems.forEach(function (handle) {
            //Skip files whose hashes that were blocked	
            var regEx = new RegExp('!' + handle.contentId + '!', 'g');
            if (result.foundHashes.indexOf(handle.hash) >= 0) {
                markup = markup.replace(regEx, '');
                handle.blacklisted = true;
                return;
            }
            //Replace the reference in the markup	
            handle.selected = true;
            markup = markup.replace(regEx, '!' + handle.getFileName() + '!');
            handle.setInUse();
        });
        jira.UIFormHandler.getRenderer('attachment').refresh('attachment');
        return markup;
    })
        .catch(function (e) {
        yasoon.util.log('Error during handling of attachments', yasoon.util.severity.warning, getStackTrace(e));
    });
}
function getUniqueKey() {
    //Use current time to get something short unique
    var currentTime = Math.round(new Date().getTime() / 1000);
    var buf = new ArrayBuffer(4);
    var view = new DataView(buf);
    view.setUint32(0, currentTime, false);
    var binary = '';
    var bytes = new Uint8Array(buf);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary).replace(/=/g, '').replace(/\//g, '').replace(/\+/g, '');
}
function renderMailHeaderText(mail, useMarkup) {
    var result = '';
    if (useMarkup) {
        result = yasoon.i18n('mail.mailHeaderMarkup', {
            senderName: mail.senderName,
            senderEmail: mail.senderEmail,
            date: moment(mail.receivedAt).format('LLL'),
            recipients: ((mail.recipients.length > 0) ? '[mailto:' + mail.recipients.join('],[mailto:') : 'No One'),
            subject: mail.subject
        });
    }
    else {
        result = yasoon.i18n('mail.mailHeaderPlain', {
            senderName: mail.senderName,
            senderEmail: mail.senderEmail,
            date: moment(mail.receivedAt).format('LLL'),
            recipients: mail.recipients.join(','),
            subject: mail.subject
        });
    }
    return result;
}
function jiraLog(text, obj, stacktrace) {
    if (yasoon.logLevel == 0) {
        var stack = '';
        var json = '';
        if (stacktrace !== undefined && stacktrace) {
            try {
                var a = doesNotExit + forceException;
            }
            catch (e) {
                stack = '\n' + printStackTrace(e).split('\n')
                    .slice(1)
                    .join('\n');
            }
        }
        if (obj) {
            json = '\n' + JSON.stringify(obj);
        }
        console.log(text, obj);
        yasoon.util.log(text + ' ' + json + ' ' + stack);
    }
}
function jiraHandleImageFallback(img) {
    var enteredContext = 0;
    if (yasoon.app.getCurrentAppNamespace() != 'com.yasoon.jira') {
        enteredContext = yasoon.app.enterContext('com.yasoon.jira');
    }
    img.src = yasoon.io.getLinkPath('Images\\unknown.png');
    if (enteredContext !== 0) {
        yasoon.app.leaveContext(enteredContext);
    }
}
function JiraIconController() {
    var self = this;
    //Contains object { url: '' , fileName: '' }
    var iconBuffer = [];
    var saveIcon = function (url) {
        //generate unique FileName
        var fileName = 'Images\\' + jiraCreateHash(url);
        console.log('Download Icon - URL: ' + url + ' : FileName: ' + fileName);
        if (url.indexOf('secure') > -1) {
            //Authed
            yasoon.io.downloadAuthed(url, fileName, jira.settings.currentService, false, function (handle) {
                //Success Handler --> update IconBuffer to local URL
                var result = iconBuffer.filter(function (elem) { return elem.url == url; });
                if (result.length === 1) {
                    result[0].fileName = 'Images\\' + handle.getFileName();
                    saveSettings();
                }
            });
        }
        else {
            //Download File
            yasoon.io.download(url, fileName, false, function (handle) {
                //Success Handler --> update IconBuffer to local URL
                var result = iconBuffer.filter(function (elem) { return elem.url == url; });
                if (result.length === 1) {
                    result[0].fileName = 'Images\\' + handle.getFileName();
                    saveSettings();
                }
            });
        }
        //Temporary save URL in Buffer
        iconBuffer.push({ url: url, fileName: url });
        return url;
    };
    var saveSettings = function () {
        yasoon.setting.setAppParameter('icons', JSON.stringify(iconBuffer));
    };
    this.mapIconUrl = function (url) {
        //Avoid mapping local URLs
        if (url.indexOf('http') !== 0) {
            return url;
        }
        try {
            var result = iconBuffer.filter(function (elem) { return elem.url == url; });
            if (result.length > 1) {
                //Should never happen --> remove both elements from buffer
                iconBuffer = iconBuffer.filter(function (elem) { return elem.url != url; });
                result = [];
            }
            //Only map if mappping to local URL exist
            if (result.length === 1 && result[0].fileName.indexOf('http') !== 0) {
                return yasoon.io.getLinkPath(result[0].fileName);
            }
            else if (result.length === 0) {
                return saveIcon(url);
            }
        }
        catch (e) {
        }
        return url;
    };
    this.addIcon = function (url) {
        var result = iconBuffer.filter(function (elem) { return elem.url == url; });
        if (result.length === 0) {
            saveIcon(url);
        }
    };
    this.getFullBuffer = function () {
        return iconBuffer;
    };
    //Init - load data
    var settingString = yasoon.setting.getAppParameter('icons');
    if (settingString) {
        iconBuffer = JSON.parse(settingString);
        //Check consistency of buffer
        iconBuffer = iconBuffer.filter(function (entry) {
            if (entry.fileName.indexOf('http') === 0) {
                //http links should be in index only temporary --> download newly this time
                return false;
            }
            //Remove link if file does not exist
            return yasoon.io.exists(entry.fileName);
        });
    }
}
function jiraGet(relativeUrl) {
    return new Promise(function (resolve, reject) {
        yasoon.oauth({
            url: jira.settings.baseUrl + relativeUrl,
            oauthServiceName: jira.settings.currentService,
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-ExperimentalApi': 'true' },
            type: yasoon.ajaxMethod.Get,
            error: function jiraGetError(data, statusCode, result, errorText, cbkParam) {
                //Detect if oAuth token has become invalid
                if (statusCode == 401 && result == 'oauth_problem=token_rejected') {
                    yasoon.app.invalidateOAuthToken(jira.settings.currentService);
                    jira.settings.currentService = '';
                    jira.settings.save();
                }
                reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText, data, result));
            },
            success: function jiraGetSuccess(data) {
                resolve(data);
            }
        });
    });
}
function jiraGetWithHeaders(relativeUrl) {
    return new Promise(function (resolve, reject) {
        yasoon.oauth({
            url: jira.settings.baseUrl + relativeUrl,
            oauthServiceName: jira.settings.currentService,
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-ExperimentalApi': 'true' },
            type: yasoon.ajaxMethod.Get,
            error: function jiraGetError(data, statusCode, result, errorText, cbkParam) {
                reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText, data, result));
            },
            success: function jiraGetSuccess(data, something, headers) {
                resolve([data, headers]);
            }
        });
    });
}
function jiraAjax(relativeUrl, method, data, formData) {
    return new Promise(function (resolve, reject) {
        var request = {
            url: jira.settings.baseUrl + relativeUrl,
            oauthServiceName: jira.settings.currentService,
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck', 'X-ExperimentalApi': 'true' },
            data: data,
            formData: formData,
            type: method,
            error: function jiraAjaxError(data, statusCode, result, errorText, cbkParam) {
                reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText, data, result));
            },
            success: function jiraAjaxSuccess(data) {
                resolve(data);
            }
        };
        yasoon.oauth(request);
    });
}
function jiraCheckProxyError(input) {
    if (input.indexOf('<!') === 0 || input.indexOf('<html') === 0) {
        throw new jiraProxyError();
    }
}
function jiraSyncError(message, statusCode, errorText, data, result) {
    var self = this;
    this.message = message;
    this.name = "SyncError";
    this.statusCode = statusCode;
    this.errorText = errorText;
    this.data = data;
    this.result = result;
    this.getUserFriendlyError = function () {
        try {
            var result = '';
            var error = JSON.parse(self.result);
            if (error.errorMessages && error.errorMessages.length > 0) {
                error.errorMessages.forEach(function (msg) {
                    result += msg + '\n';
                });
            }
            else if (error.errors) {
                Object.keys(error.errors).forEach(function (key) {
                    result += error.errors[key] + '\n';
                });
            }
            else {
                result = yasoon.i18n('general.unexpectedJiraError');
            }
            return result;
        }
        catch (e) {
            return yasoon.i18n('general.unexpectedJiraError');
        }
    };
}
jiraSyncError.prototype = Object.create(Error.prototype);
function jiraProxyError() {
    var self = this;
}
jiraProxyError.prototype = Object.create(Error.prototype);
function jiraIsCloud(url) {
    return jiraEndsWith(url, 'jira.com') || jiraEndsWith(url, 'atlassian.net');
}
function jiraEndsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
function getProjectIcon(project) {
    if (!project.projectTypeKey)
        return '';
    if (project.projectTypeKey === 'business')
        return 'Images/project_business.svg';
    if (project.projectTypeKey === 'service_desk')
        return 'Images/project_service.svg';
    if (project.projectTypeKey === 'software')
        return 'Images/project_software.svg';
}
function jiraIsVersionHigher(systemInfo, versionString) {
    var versions = versionString.split('.');
    var result = versions.some(function (version, index) {
        var jiraVersion = systemInfo.versionNumbers[index];
        version = parseInt(version);
        //We can'T control JIRA version numbers, but if our version has more numbers, we should assume a lower version.
        // E.g. JIRA 7.0 < 7.0.3 (even if we hope, JIRA will send a 7.0.0)
        if (jiraVersion === undefined)
            return false;
        //JIRA version higher
        if (jiraVersion > version)
            return true;
        //JIRA version equals but last element of our version string
        //E.g. JIRA 7.0.2 > 7
        if (index === (versions.length - 1) && jiraVersion === version)
            return true;
    });
    return result;
}
function jiraMinimizeIssue(issue) {
    var copy = JSON.parse(JSON.stringify(issue));
    jiraCompressObject(copy);
    return copy;
}
function jiraCompressObject(obj) {
    var keys = Object.keys(obj);
    var unnecessaryKeys = [
        "expand",
        "self",
        "32x32",
        "24x24",
        "16x16",
        "votes",
        "comment",
        "worklog",
        "attachment",
        "watchers",
        "workratio",
        "statusCategory",
        "votes",
        "timeZone",
        "atlassian:timezone-offset"
    ];
    for (var i in keys) {
        var key = keys[i];
        var value = obj[key];
        if (unnecessaryKeys.indexOf(key) > -1) {
            delete obj[key];
        }
        else if (typeof value === 'object' && value !== null) {
            jiraCompressObject(value);
        }
        else if (!value) {
            delete obj[key];
        }
    }
}
function jiraIsTask(item) {
    if (item.__entity_type && item.__entity_type.indexOf('yasoonBase.Model.Entities.Task') > -1)
        return true;
    return false;
}
//@ sourceURL=http://Jira/common.js 
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
var EpicLinkSelectField = (function (_super) {
    __extends(EpicLinkSelectField, _super);
    function EpicLinkSelectField(id, field) {
        _super.call(this, id, field);
        this.setter = new SetOptionValue();
    }
    EpicLinkSelectField.prototype.getValue = function (changedDataOnly) {
        //Only for creation as Epic links cannot be changed via REST APi --> Status code 500
        //Ticket: https://jira.atlassian.com/browse/GHS-10333
        //There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
        if (!jiraIsVersionHigher(jira.systemInfo, '7') && !changedDataOnly && $('#' + this.id).val()) {
            return 'key:' + $('#' + this.id).val();
        }
    };
    EpicLinkSelectField.prototype.setValue = function (value) {
        //Format in JIRA < 7.0 "key: epicId" , JIRA 7+: just epic Id
        if (!jiraIsVersionHigher(jira.systemInfo, '7')) {
            value = value.replace('key:', '');
        }
        this.setter.setValue(this.id, value);
    };
    EpicLinkSelectField.prototype.getData = function (searchTerm) {
        //Result of Service
        // JIRA 6.x: {"epicNames":[{"key":"SSP-24","name":"Epic 1"},{"key":"SSP-25","name":"Epic 2"}],"total":2}
        // JIRA 7+:  {"epicLists":[{"listDescriptor":"All epics","epicNames":[{"key":"SSP-24","name":"Epic 1","isDone":false},{"key":"SSP-25","name":"Epic 2","isDone":false},{"key":"SSP-28","name":"Epic New","isDone":false}]}],"total":3}
        var url = '/rest/greenhopper/1.0/epics?maxResults=10&projectKey=' + jira.selectedProject.key + '&searchQuery=' + searchTerm;
        return jiraGet(url)
            .then(function (data) {
            var epics = JSON.parse(data);
            var results = [];
            if (epics && epics.total > 0) {
                if (epics.epicLists) {
                    var epic7 = epics;
                    epic7.epicLists.forEach(function (epicList) {
                        var optGroup = {
                            id: epicList.listDescriptor,
                            text: epicList.listDescriptor,
                            children: []
                        };
                        epicList.epicNames.forEach(function (epic) {
                            optGroup.children.push({
                                id: epic.key,
                                text: epic.name + ' ( ' + epic.key + ' )'
                            });
                        });
                        results.push(optGroup);
                    });
                }
                else {
                    var epic6 = epics;
                    epic6.epicNames.forEach(function (epic) {
                        results.push({
                            id: epic.key,
                            text: epic.name + ' ( ' + epic.key + ' )'
                        });
                    });
                }
            }
            return results;
        });
    };
    return EpicLinkSelectField;
}(Select2AjaxField));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var GetArray = (function () {
    function GetArray() {
    }
    GetArray.prototype.getValue = function (id, field, onlyChangedData, newValue, initialValue) {
        //In edit case: Only send changes
        if (onlyChangedData) {
            //Both empty
            if (!initialValue && newValue.length === 0)
                return;
            //If length the same and all values match, we do not need to send anything            
            if (initialValue && initialValue.length === newValue.length) {
                var isSame = initialValue.every(function (c) {
                    return newValue.indexOf(c) > -1;
                });
                if (isSame)
                    return;
            }
            return newValue;
        }
        else {
            //In creation case: Only send if not null	
            return (newValue.length > 0) ? newValue : undefined;
        }
    };
    return GetArray;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetTagValue = (function () {
    function SetTagValue() {
    }
    SetTagValue.prototype.setValue = function (id, value) {
        if (value) {
            value.forEach(function (label) {
                //Add Option tags so initial selection will work
                $('#' + id).append("<option val=\"" + label + "\">" + label + "</option>");
            });
            $('#' + id).val(value).trigger('change');
            $('#' + id).data('value', value);
        }
    };
    return SetTagValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />
var GroupSelectField = (function (_super) {
    __extends(GroupSelectField, _super);
    function GroupSelectField() {
        _super.apply(this, arguments);
    }
    GroupSelectField.prototype.getData = function (searchTerm) {
        var url = '/rest/api/2/groups/picker?maxResults=50&query=' + searchTerm;
        return jiraGet(url)
            .then(function (data) {
            var groupsResult = JSON.parse(data);
            console.log(groupsResult);
            var groupsArray = [];
            groupsResult.groups.forEach(function (group) {
                groupsArray.push({
                    id: group.name,
                    text: group.name
                });
            });
            return groupsArray;
        });
    };
    GroupSelectField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Object, "name"),
        setter(SetterType.Option)
    ], GroupSelectField);
    return GroupSelectField;
}(Select2AjaxField));
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
var IssueField = (function (_super) {
    __extends(IssueField, _super);
    function IssueField(id, field, excludeSubtasks) {
        var options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectIssue');
        _super.call(this, id, field, options);
        this.excludeSubtasks = excludeSubtasks;
        this.projectIssues = {};
        //Load Recent Issues from DB
        var issuesString = yasoon.setting.getAppParameter('recentIssues');
        if (issuesString) {
            this.recentIssues = JSON.parse(issuesString);
        }
    }
    IssueField.prototype.hookEventHandler = function () {
        _super.prototype.hookEventHandler.call(this);
        $('#' + this.id).on('select2:select', function (evt, data) {
            //We trigger this event manually in setValue.
            //This leads to different eventData :/
            /*var issue = null;
            if (data) {
                issue = {
                    project: data.fields.project,
                    id: data.id
                };
            } else if (jira.mode === 'jiraAddCommentDialog' && evt.params && evt.params.data) {
                issue = evt.params.data;
            } else {
                $('.buttons').removeClass('servicedesk');
                $('.buttons').removeClass('no-requesttype');
                return;
            }


            var currentProject = jira.projects.filter(function (p) { return p.id === issue.project.id; })[0];
            if (!currentProject || currentProject.projectTypeKey !== 'service_desk') {
                $('.buttons').removeClass('servicedesk');
                $('.buttons').removeClass('no-requesttype');
                return;
            }

            //We have a service Project... Check if it is a service request
            jiraGet('/rest/servicedeskapi/request/' + issue.id)
                .then(function (data) {
                    $('.buttons').addClass('servicedesk');
                    $('.buttons').removeClass('no-requesttype');
                })
                .catch(function (e) {
                    $('.buttons').addClass('no-requesttype');
                    $('.buttons').removeClass('servicedesk');
                });*/
        });
    };
    IssueField.prototype.getReturnStructure = function (issues, queryTerm) {
        var result = [];
        // 1. Build recent suggestion
        if (this.recentIssues) {
            result.push({
                id: 'Suggested',
                text: yasoon.i18n('dialog.recentIssues'),
                children: this.recentIssues
            });
        }
        //2. Search Results
        if (issues) {
            if (queryTerm) {
                result.push({
                    id: 'Search',
                    text: yasoon.i18n('dialog.titleSearchResults', { term: queryTerm }),
                    children: issues
                });
            }
            else {
                result.push({
                    id: 'Search',
                    text: yasoon.i18n('dialog.projectIssues'),
                    children: issues
                });
            }
        }
        return result;
    };
    IssueField.prototype.queryData = function (searchTerm) {
        //Concat JQL
        var jql = '';
        if (searchTerm) {
            jql += 'Summary ~ "' + searchTerm + '"';
        }
        if (jira.selectedProjectKey) {
            jql += ((jql) ? ' AND' : '') + ' project = "' + jira.selectedProjectKey + '"';
        }
        if (jira.settings.hideResolvedIssues) {
            jql += ((jql) ? ' AND' : '') + ' status != "resolved" AND status != "closed" AND status != "done"';
        }
        if (this.excludeSubtasks) {
            jql += ((jql) ? ' AND' : '') + ' type NOT IN subtaskIssueTypes()';
        }
        jql = '( ' + jql + ' )';
        if (searchTerm) {
            jql += 'OR key = "' + searchTerm + '"';
        }
        console.log('JQL' + jql);
        return jiraGet('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&maxResults=20&fields=summary,project&validateQuery=false')
            .then(function (data) {
            var jqlResult = JSON.parse(data);
            var result = [];
            console.log(jqlResult);
            //Transform Data
            jqlResult.issues.forEach(function (issue) {
                result.push({
                    id: issue.id,
                    text: issue.fields['summary'] + ' (' + issue.key + ')',
                    data: issue
                });
            });
            return result;
        });
    };
    IssueField.prototype.getData = function (searchTerm) {
        var _this = this;
        return this.queryData(searchTerm)
            .then(function (result) {
            return _this.getReturnStructure(result);
        });
    };
    IssueField.prototype.getEmptyData = function () {
        var _this = this;
        if (jira.selectedProjectKey) {
            if (this.projectIssues[jira.selectedProjectKey]) {
                return Promise.resolve(this.getReturnStructure(this.projectIssues[jira.selectedProjectKey]));
            }
            else {
                return this.queryData('')
                    .then(function (data) {
                    _this.projectIssues[jira.selectedProjectKey] = _this.getReturnStructure(data);
                    return _this.projectIssues[jira.selectedProjectKey];
                });
            }
        }
        else {
            return Promise.resolve(this.getReturnStructure());
        }
    };
    IssueField.defaultMeta = { key: FieldController.issueFieldId, name: 'Issue', required: true, schema: { system: 'issue', type: '' } };
    IssueField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Object, "name"),
        setter(SetterType.Option)
    ], IssueField);
    return IssueField;
}(Select2AjaxField));
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
var IssueTypeField = (function (_super) {
    __extends(IssueTypeField, _super);
    function IssueTypeField(id, field) {
        var options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderIssueType');
        options.allowClear = false;
        _super.call(this, id, field, options);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
    }
    IssueTypeField.prototype.triggerValueChange = function () {
        var issueType = this.getObjectValue();
        FieldController.raiseEvent(EventType.FieldChange, issueType, this.id);
    };
    IssueTypeField.prototype.handleEvent = function (type, newValue, source) {
        if (source === FieldController.projectFieldId) {
            var project = newValue;
            var result = project.issueTypes.map(function (it) {
                return {
                    id: it.id,
                    text: it.name,
                    icon: jira.icons.mapIconUrl(it.iconUrl),
                    data: it
                };
            });
            this.setData(result);
            this.setValue(result[0].data);
        }
    };
    IssueTypeField.defaultMeta = { key: FieldController.issueTypeFieldId, name: 'Issue Type', required: true, schema: { system: 'issue', type: '' } };
    IssueTypeField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Object, "id"),
        setter(SetterType.Option)
    ], IssueTypeField);
    return IssueTypeField;
}(Select2Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />
var LabelSelectField = (function (_super) {
    __extends(LabelSelectField, _super);
    function LabelSelectField(id, field, options) {
        if (options === void 0) { options = {}; }
        options.tags = true;
        _super.call(this, id, field, options, true);
    }
    LabelSelectField.prototype.getData = function (searchTerm) {
        var _this = this;
        //Damit JIRA!! ... in old JIRA releases the autocomplete URL is wrong :/
        var url = '/rest/api/1.0/labels/suggest?maxResults=50&query=';
        if (this.id !== 'labels') {
            url = '/rest/api/1.0/labels/suggest?maxResults=50&customFieldId=' + this.fieldMeta.schema.customId + '&query=';
        }
        this.lastSearchTerm = searchTerm;
        return jiraGet(url + searchTerm)
            .then(function (data) {
            var labels = JSON.parse(data);
            var labelArray = [];
            if (labels.token === _this.lastSearchTerm && labels.suggestions) {
                labels.suggestions.forEach(function (label) {
                    labelArray.push({ text: label.label, id: label.label });
                });
            }
            return labelArray;
        });
    };
    LabelSelectField.prototype.getEmptyData = function () {
        return this.getData('');
    };
    LabelSelectField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Array),
        setter(SetterType.Tag)
    ], LabelSelectField);
    return LabelSelectField;
}(Select2AjaxField));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
var MultiLineTextField = (function (_super) {
    __extends(MultiLineTextField, _super);
    function MultiLineTextField(id, field, config) {
        if (config === void 0) { config = { isMainField: false, hasMentions: false }; }
        _super.call(this, id, field);
        this.isMainField = config.isMainField;
        this.hasMentions = config.hasMentions;
        this.height = (this.isMainField) ? '200px' : '100px';
    }
    MultiLineTextField.prototype.addMainFieldHtml = function (container) {
        if (jira.mail) {
            var html = " <div style=\"margin-top:5px; position:relative;\">\n                            <span id=\"DescriptionOptionToolbar\" style=\"padding: 3px;\">\n                                <span title=\"" + yasoon.i18n('dialog.titleToggleJiraMarkup') + "\">\n                                    <input id=\"DescriptionUseJiraMarkup\" class=\"toggle-checkbox\" type=\"checkbox\" checked=\"checked\"/>\n                                    " + yasoon.i18n('dialog.toggleJiraMarkup') + "\n                                </span>\n                                <a style=\"cursor:pointer;\" class=\"hidden\" id=\"DescriptionUndoAction\">\n                                    <i class=\"fa fa-undo\"></i>\n                                    " + yasoon.i18n('dialog.undo') + "\n                                </a>\n                            </span>\n                            <span class=\"dropup pull-right\">\n                                <a style=\"cursor:pointer;\" data-toggle=\"dropdown\" class=\"dropdown-toggle\" title=\"" + yasoon.i18n('dialog.titleReplaceWith') + "\" >\n                                    " + yasoon.i18n('dialog.replaceWith') + "\n                                    <span class=\"caret\"></span>\n                                </a>\n                                <ul class=\"dropdown-menu\">\n                                    <li>\n                                        <span style=\"display: block;padding: 4px 10px;\">\n                                            " + yasoon.i18n('dialog.toggleJiraMarkup') + "\n                                            <input class=\"toggleJiraMarkup toggle-checkbox\" type=\"checkbox\" checked=\"checked\" />\n                                        </span>\n                                    </li>\n                                    <li role=\"separator\" class=\"divider\"></li>\n                                    " + ((jira.selectedText) ? '<li id="DescriptionSelectedText"><a href="#">' + yasoon.i18n('dialog.addSelectedText') + '</a></li>' : '') + "\n                                    " + ((jira.mail) ? '<li id="DescriptionFullMail"><a href="#">' + yasoon.i18n('dialog.addConversation') + '</a></li>' : '') + "\n                \t            </ul>\n                            </span>\n                            <span class=\"dropup pull-right\" style=\"margin-right: 20px;\">\n                                <a style=\"cursor:pointer;\" data-toggle=\"dropdown\" class=\"dropdown-toggle\" title=\"" + yasoon.i18n('dialog.titleReplaceWith') + "\" >\n                                    " + yasoon.i18n('dialog.add') + "\n                                    <span class=\"caret\"></span>\n                                </a>\n                                <ul class=\"dropdown-menu\">\n                                    <li>\n                                        <span style=\"display: block;padding: 4px 10px;\">\n                                            " + yasoon.i18n('dialog.toggleJiraMarkup') + "\n                                            <input class=\"toggleJiraMarkup toggle-checkbox\" type=\"checkbox\" checked=\"checked\" />\n                                        </span>\n                                    </li>\n                                    <li role=\"separator\" class=\"divider\"></li>\n                                    " + ((jira.mail) ? '<li id="DescriptionMailInformation"><a href="#">' + yasoon.i18n('dialog.addMailInformation') + '</a></li>' : '') + "\n                                </ul>\n                            </span>\n                        </div>";
            container.append(html);
        }
    };
    MultiLineTextField.prototype.getDomValue = function () {
        var val = '';
        if (this.isMainField && this.mentionText) {
            //Parse @mentions
            val = this.mentionText.replace(/@.*?\]\(user:([^\)]+)\)/g, '[~$1]');
        }
        else {
            val = $('#' + this.id).val();
        }
        return val;
    };
    ;
    MultiLineTextField.prototype.hookEventHandler = function () {
        var _this = this;
        //Standard Change handler
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
        //Private vars for event Handler
        var defaultSelectedText = ((jira.selectedText) ? jira.mail.getSelection(0) : '');
        var useMarkup = true;
        var backup = '';
        var lastAction = ((jira.selectedText) ? 'selectedText' : (jira.mail) ? 'wholeMail' : '');
        var container = $('#' + this.id + 'field-container');
        if (this.isMainField) {
            //Static toggle JIRA markup in drop down menus
            container.find('.toggleJiraMarkup').on('click', function (e) {
                useMarkup = e.target['checked'];
                //Make sure all other toggles (even in other fields) have the same state
                $('.toggleJiraMarkup').prop('checked', useMarkup);
                e.stopPropagation();
            });
            //Temporary toggle markup button below text field until user changes some content
            container.find('#DescriptionUseJiraMarkup').on("change", function (e) {
                useMarkup = e.target['checked'];
                var newContent;
                //Make sure all other toggles (even in other fields) have the same state
                $('.toggleJiraMarkup').prop('checked', useMarkup);
                if (lastAction == 'selectedText') {
                    if (useMarkup)
                        newContent = jira.selectedText;
                    else
                        newContent = defaultSelectedText;
                }
                else if (lastAction == 'wholeMail') {
                    if (useMarkup) {
                        newContent = jira.mailAsMarkup;
                    }
                    else {
                        newContent = jira.mail.getBody(0);
                    }
                }
                _this.setValue(newContent);
                e.preventDefault();
            });
            $('#' + this.id).on("keyup paste", function (e) {
                container.find('#DescriptionOptionToolbar').addClass('hidden');
            });
            container.find('#DescriptionUndoAction').on('click', function (e) {
                _this.setValue(backup);
                container.find('#DescriptionOptionToolbar').addClass('hidden');
            });
            container.find('#DescriptionSelectedText').on('click', function (e) {
                backup = $('#' + _this.id).val();
                lastAction = 'selectedText';
                container.find('#DescriptionOptionToolbar').removeClass('hidden');
                container.find('#DescriptionUseJiraMarkup').prop('checked', useMarkup);
                container.find('#DescriptionUndoAction').removeClass('hidden');
                if (useMarkup)
                    $('#' + _this.id).val(jira.selectedText);
                else
                    $('#' + _this.id).val(defaultSelectedText);
            });
            container.find('#DescriptionFullMail').on('click', function (e) {
                backup = $('#' + _this.id).val();
                lastAction = 'wholeMail';
                container.find('#DescriptionOptionToolbar').removeClass('hidden');
                container.find('#DescriptionUseJiraMarkup').prop('checked', useMarkup);
                container.find('#DescriptionUndoAction').removeClass('hidden');
                if (useMarkup) {
                    $('#' + _this.id).val(jira.mailAsMarkup);
                }
                else {
                    $('#' + _this.id).val(jira.mail.getBody(0));
                }
            });
            container.find('#DescriptionMailInformation').on('click', function (e) {
                var field = $('#' + _this.id);
                backup = field.val();
                insertAtCursor(field[0], renderMailHeaderText(jira.mail, useMarkup));
            });
        }
        if (this.hasMentions) {
        }
    };
    ;
    MultiLineTextField.prototype.render = function (container) {
        container.append("<textarea class=\"form-control\" id=\"" + this.id + "\" name=\"" + this.id + "\" style=\"height:" + this.height + ";overflow: initial;\"></textarea>\n            <div class=\"mentions-help-text bg-warning\"><span>" + yasoon.i18n('dialog.mentionsAlert') + "</span></div>");
        if (this.isMainField) {
            this.addMainFieldHtml(container);
        }
    };
    ;
    MultiLineTextField = __decorate([
        getter(GetterType.Text),
        setter(SetterType.Text)
    ], MultiLineTextField);
    return MultiLineTextField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var MultiSelectField = (function (_super) {
    __extends(MultiSelectField, _super);
    function MultiSelectField(id, field, options) {
        if (options === void 0) { options = {}; }
        options.data = Select2Field.convertToSelect2Array(field.allowedValues);
        _super.call(this, id, field, options, true);
    }
    ;
    MultiSelectField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.ObjectArray, "id"),
        setter(SetterType.Option)
    ], MultiSelectField);
    return MultiSelectField;
}(Select2Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
var NumberField = (function (_super) {
    __extends(NumberField, _super);
    function NumberField() {
        _super.apply(this, arguments);
    }
    NumberField.prototype.getDomValue = function () {
        return parseFloat($('#' + this.id).val());
    };
    NumberField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    NumberField.prototype.render = function (container) {
        container.append($("<input class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" type=\"number\" />"));
    };
    ;
    NumberField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Text),
        setter(SetterType.Text)
    ], NumberField);
    return NumberField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
var ProjectField = (function (_super) {
    __extends(ProjectField, _super);
    function ProjectField(id, field, cache) {
        var _this = this;
        var options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectProject');
        options.allowClear = false;
        _super.call(this, id, field, options);
        //Load Recent Projects from DB
        var projectsString = yasoon.setting.getAppParameter('recentProjects');
        if (projectsString) {
            this.recentProjects = JSON.parse(projectsString);
        }
        //Load Sender Email Templates if nessecary
        if (jira.mail) {
            var templateString = yasoon.setting.getAppParameter('createTemplates');
            if (templateString) {
                this.senderTemplates = JSON.parse(templateString);
            }
        }
        if (cache) {
            this.projectCache = cache;
        }
        //Start Getting Data
        this.showSpinner();
        this.getData()
            .then(function (data) {
            _this.setData(data);
            $('#' + _this.id).next().find('.select2-selection').first().focus();
            _this.hideSpinner();
        });
    }
    ProjectField.prototype.triggerValueChange = function () {
        var project = this.getObjectValue();
        FieldController.raiseEvent(EventType.FieldChange, project, this.id);
    };
    //Convert project data into displayable data
    ProjectField.prototype.mapProjectValues = function (projects) {
        var result = projects.map(function (p) {
            var element = {
                id: p.id,
                text: p.name,
                icon: getProjectIcon(p),
                data: p
            };
            return element;
        });
        return result;
    };
    ProjectField.prototype.getReturnStructure = function (projects, queryTerm) {
        var result = [];
        //1. User Templates
        if (this.senderTemplates) {
            //1.1 Filter
            var currentTemplates = this.senderTemplates.filter(function (templ) {
                if (templ.senderEmail === jira.mail.senderEmail) {
                    //Double Check if Project still exists
                    var templProj = projects.filter(function (p) { return p.id === templ.id; })[0];
                    if (templProj) {
                        templ.name = templProj.data.name;
                        templ.projectTypeKey = templProj.data.projectTypeKey;
                        return true;
                    }
                }
                return false;
            });
            //1.2 Map and Add
            if (currentTemplates && currentTemplates.length > 0) {
                var children = this.mapProjectValues(currentTemplates);
                result.push({
                    id: 'templates',
                    text: yasoon.i18n('dialog.templateFor', { name: jira.mail.senderName }),
                    children: children
                });
            }
        }
        //2. Recent Projects
        if (this.recentProjects) {
            //2.1 Filter
            var currentRecent = this.recentProjects.filter(function (recent) {
                return projects.filter(function (p) { return p.id === recent.id; }).length > 0;
            });
            //2.2 Map and Add
            var children = this.mapProjectValues(currentRecent);
            result.push({
                id: 'recent',
                text: yasoon.i18n('dialog.recentProjects'),
                children: children
            });
        }
        //3. All Projects
        var sortedProjects = projects.sort(function (a, b) { return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1); });
        result.push({
            id: 'all',
            text: yasoon.i18n('dialog.allProjects'),
            children: sortedProjects
        });
        return result;
    };
    ProjectField.prototype.queryData = function () {
        var _this = this;
        if (this.projectCache && this.projectCache.length > 0) {
            console.log('Return project cache', this.projectCache);
            return Promise.resolve(this.mapProjectValues(this.projectCache));
        }
        return jiraGet('/rest/api/2/project')
            .then(function (data) {
            var projects = JSON.parse(data);
            console.log('Return API projects', projects);
            return _this.mapProjectValues(projects);
        });
    };
    ProjectField.prototype.getData = function () {
        var _this = this;
        if (this.returnStructure) {
            return Promise.resolve(this.returnStructure);
        }
        return this.queryData()
            .then(function (projects) {
            _this.returnStructure = _this.getReturnStructure(projects);
            return _this.returnStructure;
        });
    };
    ProjectField.defaultMeta = { key: FieldController.projectFieldId, name: 'Project', required: true, schema: { system: 'project', type: '' } };
    ProjectField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Object, "id"),
        setter(SetterType.Option)
    ], ProjectField);
    return ProjectField;
}(Select2Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetCheckedValues.ts" />
var RadioField = (function (_super) {
    __extends(RadioField, _super);
    function RadioField() {
        _super.apply(this, arguments);
    }
    RadioField.prototype.getDomValue = function () {
        return $('#' + this.id).find('input:checked').first().val();
    };
    ;
    RadioField.prototype.hookEventHandler = function () {
        var _this = this;
        $("#" + this.id + "-field-group").find('input').change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    RadioField.prototype.render = function (container) {
        var _this = this;
        if (!this.fieldMeta.required) {
            //If it isn't required we should allow a None option
            container.append($("<div class=\"radio awesome\">\n                                    <input type=\"radio\" id=\"" + this.id + "_none\" name=\"" + this.id + "\" value=\"\" checked>\n                                    <label for=\"" + this.id + "_none\">" + yasoon.i18n('dialog.selectNone') + "</label>\n                                </div>"));
        }
        this.fieldMeta.allowedValues.forEach(function (option) {
            container.append($("<div class=\"radio awesome\">\n                                    <input type=\"radio\" id=\"" + _this.id + "_" + option.id + "\" name=\"" + _this.id + "\" value=\"" + option.id + "\">\n                                    <label for=\"" + _this.id + "_" + option.id + "\">" + option.value + "</label>\n                                </div>"));
        });
    };
    ;
    RadioField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Object, "id"),
        setter(SetterType.CheckedValues)
    ], RadioField);
    return RadioField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var SingleSelectField = (function (_super) {
    __extends(SingleSelectField, _super);
    function SingleSelectField(id, field, options, style) {
        if (options === void 0) { options = {}; }
        if (style === void 0) { style = "min-width: 350px; width: 80%;"; }
        //Default value or None?
        var placeholder = (field.hasDefaultValue) ? yasoon.i18n('dialog.selectDefault') : yasoon.i18n('dialog.selectNone');
        options.data = Select2Field.convertToSelect2Array(field.allowedValues);
        options.placeholder = placeholder;
        _super.call(this, id, field, options, false, style);
    }
    SingleSelectField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Object, "id"),
        setter(SetterType.Option)
    ], SingleSelectField);
    return SingleSelectField;
}(Select2Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
var SingleTextField = (function (_super) {
    __extends(SingleTextField, _super);
    function SingleTextField() {
        _super.apply(this, arguments);
    }
    SingleTextField.prototype.getDomValue = function () {
        return $('#' + this.id).val();
    };
    SingleTextField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    SingleTextField.prototype.render = function (container) {
        container.append($("<input class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" type=\"text\" />"));
    };
    ;
    SingleTextField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Text),
        setter(SetterType.Text)
    ], SingleTextField);
    return SingleTextField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
var SprintSelectField = (function (_super) {
    __extends(SprintSelectField, _super);
    function SprintSelectField(id, field) {
        _super.call(this, id, field);
        this.setter = new SetOptionValue();
    }
    SprintSelectField.prototype.getValue = function (changedDataOnly) {
        //Only for creation as Epic links cannot be changed via REST APi --> Status code 500
        //Ticket: https://jira.atlassian.com/browse/GHS-10333
        //There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
        //We aren't sure with which version this change happened. 7.0.0 definitely requires a string, 7.1.6. requires an int :)
        if (jiraIsVersionHigher(jira.systemInfo, '7.1')) {
            return parseInt($('#' + this.id).val());
        }
        else {
            return $('#' + this.id).val();
        }
    };
    SprintSelectField.prototype.setValue = function (value) {
        if (value && value.length > 0) {
            $('#' + this.id).val(SprintSelectField.parseSprintId(value[0])).trigger('change');
        }
    };
    SprintSelectField.prototype.getData = function (searchTerm) {
        return jiraGet('/rest/greenhopper/1.0/sprint/picker')
            .then(function (data) {
            //{"suggestions":[{"name":"Sample Sprint 2","id":1,"stateKey":"ACTIVE"}],"allMatches":[]}
            var sprints = JSON.parse(data);
            var result = [];
            if (sprints && sprints.suggestions.length > 0) {
                var suggestions_1 = [];
                sprints.suggestions.forEach(function (sprint) {
                    suggestions_1.push({
                        id: sprint.id.toString(),
                        text: sprint.name
                    });
                });
                result.push({
                    id: 'suggestions',
                    text: yasoon.i18n('dialog.sprintSuggestion'),
                    children: suggestions_1
                });
            }
            if (sprints && sprints.allMatches && sprints.allMatches.length > 0) {
                var matches_1 = [];
                sprints.allMatches.forEach(function (sprint) {
                    matches_1.push({
                        id: sprint.id.toString(),
                        text: sprint.name
                    });
                });
                result.push({
                    id: 'allMatches',
                    text: yasoon.i18n('dialog.sprintAll'),
                    children: matches_1
                });
            }
            return result;
        });
    };
    SprintSelectField.parseSprintId = function (input) {
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
    };
    return SprintSelectField;
}(Select2AjaxField));
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />
var TempoAccountField = (function (_super) {
    __extends(TempoAccountField, _super);
    function TempoAccountField(id, field, options) {
        if (options === void 0) { options = {}; }
        _super.call(this, id, field, options);
        this.getData();
    }
    TempoAccountField.prototype.getDomValue = function () {
        var result = $('#' + this.id).val();
        if (result)
            return parseInt(result);
        return null;
    };
    TempoAccountField.prototype.getData = function () {
        var _this = this;
        Promise.all([
            jiraGet('/rest/tempo-accounts/1/account'),
            jiraGet('/rest/tempo-accounts/1/account/project/' + jira.selectedProject.id)
        ])
            .spread(function (accountDataString, projectAccountsString) {
            var accountData = JSON.parse(accountDataString);
            var projectAccounts = JSON.parse(projectAccountsString);
            var result = [];
            if (projectAccounts && projectAccounts.length > 0) {
                var childs_1 = [];
                projectAccounts.forEach(function (projectAcc) {
                    childs_1.push({
                        'id': projectAcc.id,
                        'text': projectAcc.name
                    });
                });
                result.push({
                    id: 'projectAccounts',
                    text: yasoon.i18n('dialog.projectAccounts'),
                    children: childs_1
                });
            }
            if (accountData && accountData.length > 0) {
                accountData = accountData.filter(function (acc) { return acc.global; });
                if (accountData.length > 0) {
                    var accChilds_1 = [];
                    accountData.forEach(function (projectAcc) {
                        accChilds_1.push({
                            'id': projectAcc.id,
                            'text': projectAcc.name
                        });
                    });
                    result.push({
                        id: 'globalAccounts',
                        text: yasoon.i18n('dialog.globalAccounts'),
                        children: accChilds_1
                    });
                }
            }
            _this.setData(result);
            if (_this.initialValue) {
                _this.setValue(_this.initialValue);
            }
        });
    };
    TempoAccountField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Text),
        setter(SetterType.Option)
    ], TempoAccountField);
    return TempoAccountField;
}(Select2Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
var TimeTrackingField = (function (_super) {
    __extends(TimeTrackingField, _super);
    function TimeTrackingField(id, field) {
        _super.call(this, id, field);
        var origFieldMeta = JSON.parse(JSON.stringify(field));
        var remainingFieldMeta = JSON.parse(JSON.stringify(field));
        origFieldMeta.name = yasoon.i18n('dialog.timetrackingOriginal');
        origFieldMeta.description = yasoon.i18n('dialog.timetrackingDescrOriginal');
        remainingFieldMeta.name = yasoon.i18n('dialog.timetrackingRemaining');
        remainingFieldMeta.description = yasoon.i18n('dialog.timetrackingDescrRemain');
        this.origField = new SingleTextField(id + '_originalestimate', origFieldMeta);
        this.remainingField = new SingleTextField(id + '_remainingestimate', remainingFieldMeta);
    }
    TimeTrackingField.prototype.getValue = function (onlyChangedData) {
        if (onlyChangedData === void 0) { onlyChangedData = false; }
        var origVal = this.origField.getDomValue();
        var remainVal = this.remainingField.getDomValue();
        //JIRA timetracking legacy mode
        // --> it's not allowed to set orig and remainaing Estimate during creation
        // --> it's not allowed to change original estimate.
        var result = {};
        //Edit Case
        if (onlyChangedData) {
            if (origVal && this.initialValue.originalEstimate != origVal) {
                result.originalEstimate = origVal;
            }
            if (remainVal && this.initialValue.remainingEstimate != remainVal) {
                result.remainingEstimate = remainVal;
            }
        }
        else {
            if (origVal) {
                result.originalEstimate = origVal;
            }
            if (remainVal) {
                result.remainingEstimate = remainVal;
            }
        }
        //Only return an object if it's not empty;
        return (Object.keys(result).length > 0) ? result : undefined;
    };
    TimeTrackingField.prototype.setValue = function (value) {
        if (value) {
            this.origField.setValue(value.originalEstimate);
            this.remainingField.setValue(value.remainingEstimate);
        }
    };
    TimeTrackingField.prototype.getDomValue = function () {
        return "";
    };
    TimeTrackingField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    TimeTrackingField.prototype.renderField = function (container) {
        this.origField.renderField(container);
        this.remainingField.renderField(container);
    };
    TimeTrackingField.prototype.render = function (container) {
        //Not nessecary as we redefine renderField
    };
    ;
    return TimeTrackingField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />
var UserSelectField = (function (_super) {
    __extends(UserSelectField, _super);
    function UserSelectField(id, field, options) {
        if (options === void 0) { options = {}; }
        _super.call(this, id, field, options);
        this.avatarPath = yasoon.io.getLinkPath('Images/useravatar.png');
    }
    UserSelectField.prototype.hookEventHandler = function () {
        var _this = this;
        _super.prototype.hookEventHandler.call(this);
        $('#' + this.id + 'field-group').find('.assign-to-me-trigger').click(function (e) {
            if (jira.ownUser) {
                _this.setValue(jira.ownUser.name);
            }
            e.preventDefault();
        });
    };
    UserSelectField.prototype.render = function (container) {
        _super.prototype.render.call(this, container);
        container.append("<span style=\"display:block; padding: 5px 0px;\">\n\t\t\t\t        <a href=\"#" + this.id + "\" class=\"assign-to-me-trigger\" title=\"" + yasoon.i18n('dialog.assignMyselfTitle') + "\">" + yasoon.i18n('dialog.assignMyself') + "</a>");
    };
    UserSelectField.prototype.getReturnStructure = function (users) {
        var result = [];
        // 1. Build common suggestion
        var suggestions = [];
        if (this.id === 'assignee') {
            suggestions.push({
                'id': '-1',
                'selected': true,
                'icon': this.avatarPath,
                'text': 'Automatic'
            });
        }
        suggestions.push({
            'id': jira.ownUser.name,
            'iconClass': 'fa fa-user',
            'text': jira.ownUser.displayName
        });
        result.push({
            id: 'Suggested',
            text: yasoon.i18n('dialog.suggested'),
            children: suggestions
        });
        if (users) {
            result.push({
                id: 'Search',
                text: yasoon.i18n('dialog.userSearchResult'),
                children: users
            });
        }
        return result;
    };
    UserSelectField.prototype.getData = function (searchTerm) {
        var _this = this;
        var url = '/rest/api/2/user/picker?query=' + searchTerm + '&maxResults=50';
        if (this.id === 'assignee') {
            //Only get assignable users
            url = '/rest/api/2/user/assignable/search?project=' + jira.selectedProject.key + '&username=' + searchTerm + '&maxResults=50';
        }
        return jiraGet(url)
            .then(function (data) {
            var users = JSON.parse(data);
            //1. Build User Result Array
            var result = [];
            //Yay, change of return structure....
            var userArray = [];
            if (users && users.users && users.users.length > 0) {
                userArray = users.users;
            }
            else if (users && users.length > 0) {
                userArray = users;
            }
            userArray.forEach(function (user) {
                var u = { id: user.name, text: user.displayName };
                if (user.name === jira.ownUser.name)
                    u.iconClass = 'fa fa-user';
                if (user.name === jira.senderUser.name)
                    u.iconClass = 'fa fa-envelope';
                result.push(u);
            });
            return _this.getReturnStructure(result);
        });
    };
    UserSelectField.prototype.getEmptyData = function () {
        return Promise.resolve(this.getReturnStructure());
    };
    UserSelectField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.Object, "name"),
        setter(SetterType.Option)
    ], UserSelectField);
    return UserSelectField;
}(Select2AjaxField));
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var VersionMultiSelectField = (function (_super) {
    __extends(VersionMultiSelectField, _super);
    function VersionMultiSelectField(id, field, releasedFirst) {
        var data = [];
        var options = {
            data: []
        };
        var releasedVersions = field.allowedValues
            .filter(function (option) { return option.released && !option.archived; })
            .map(function (option) {
            var text = option.name || option.value;
            return { id: option.id, text: text };
        });
        var unreleasedVersions = field.allowedValues
            .filter(function (option) { return !option.released && !option.archived; })
            .map(function (option) {
            var text = option.name || option.value;
            return { id: option.id, text: text };
        });
        var releasedOptGroup = {
            text: yasoon.i18n('dialog.releasedVersions'),
            children: releasedVersions
        };
        var unreleasedOptGroup = {
            text: yasoon.i18n('dialog.unreleasedVersions'),
            children: unreleasedVersions
        };
        if (releasedFirst) {
            options.data.push(releasedOptGroup);
            options.data.push(unreleasedOptGroup);
        }
        else {
            options.data.push(unreleasedOptGroup);
            options.data.push(releasedOptGroup);
        }
        _super.call(this, id, field, options, true);
    }
    ;
    VersionMultiSelectField = __decorate([
        /// <reference path="../Field.ts" />
        getter(GetterType.ObjectArray, "id"),
        setter(SetterType.Option)
    ], VersionMultiSelectField);
    return VersionMultiSelectField;
}(Select2Field));
