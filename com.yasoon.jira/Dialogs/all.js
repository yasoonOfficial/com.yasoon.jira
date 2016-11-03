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
        return this.getter.getValue(this.id, this.fieldMeta, onlyChangedData, this.getDomValue(), this.initalValue);
    };
    Field.prototype.setInitialValue = function (value) {
        this.initalValue = value;
    };
    Field.prototype.setValue = function (value) {
        if (!setter)
            throw new Error("Please either redefine method setValue or add a @setter Annotation for " + this.id);
        return this.setter.setValue(this.id, value);
    };
    Field.prototype.triggerValueChange = function () {
        console.log('Value changed: ' + this.id + ' -  New Value: ' + this.getValue(false));
        FieldController.raiseEvent(EventType.FieldChange, this.id, this.getValue(false));
    };
    Field.prototype.renderField = function (container) {
        var newContainer;
        var fieldGroup = container.find('#' + this.id + '-field-group');
        //First render the field-group container for this field if it does not exist yet
        if (fieldGroup.length === 0) {
            fieldGroup = $("<div id=\"#" + this.id + "-field-group\" data-field-id=\"" + this.id + "\"></div>").appendTo(container);
        }
        //Render label, mandatory and hidden logic
        var html = "<div class=\"field-group " + ((this.fieldMeta.required) ? 'required' : '') + " " + ((this.fieldMeta.isHidden) ? 'hidden' : '') + "\" >\n\t\t\t\t\t\t<label for=\"" + this.id + "\">" + this.fieldMeta.name + " \n\t\t\t\t\t\t\t<span class=\"aui-icon icon-required\">Required</span>\n\t\t\t\t\t\t</label>\n\t\t\t\t\t\t<div class=\"field-container\">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class=\"description\">" + ((this.fieldMeta.description) ? this.fieldMeta.description : '') + "</div>\n\t\t\t\t\t</div>";
        newContainer = $(fieldGroup).html(html).find('.field-container');
        //Only inject inner container for easier usage
        this.render(newContainer);
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
                if (buffer) {
                    enrichFieldMeta(field);
                    var handler = new buffer.field(key, field, buffer.params);
                    metaFields[key] = handler;
                }
            }
        }
    }
    FieldController.loadMeta = loadMeta;
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
    ;
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
    ;
    Select2Field.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    Select2Field.prototype.render = function (container) {
        container.append($("<select class=\"select input-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" style=\"" + this.styleCss + "\" " + ((this.multiple) ? 'multiple' : '') + "></select>"));
        $('#' + this.id)["select2"](this.options);
    };
    ;
    Select2Field.formatIcon = function (element) {
        if (!element.id)
            return element.text; // optgroup
        console.log(element);
        if (element.icon)
            return $('<span><img style="margin-right:3px; width: 16px;" src="' + element.icon + '"  onerror="jiraHandleImageFallback(this)"/>' + element.text + '</span>');
        else if (element.iconClass) {
            return $('<span><i style="margin-right:4px;" class="' + element.iconClass + '"></i><span>' + element.text + '</span></span>');
        }
        else {
            return element.text;
        }
    };
    return Select2Field;
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
                    promise
                        .spread(function (result, searchTerm) {
                        //This handler is registered multiple times on the same promise.
                        //Check if we are responsible to make sure we call the correct success function
                        if (searchTerm == queryTerm) {
                            console.log('Result for  ' + searchTerm, result);
                            success(result);
                        }
                    })
                        .catch(function (error) {
                        console.log(error);
                        //yasoon.util.log();
                        success([]);
                    });
                },
                processResults: function (data, page) {
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
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var MultiSelectField = (function (_super) {
    __extends(MultiSelectField, _super);
    function MultiSelectField(id, field, options) {
        if (options === void 0) { options = {}; }
        var data = [];
        field.allowedValues.forEach(function (value) {
            data.push({ id: value.id, text: value.name });
        });
        options.data = data;
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
        if (!this.fieldMeta.required) {
            //If it isn't required we should allow a None option
            container.append($("<div class=\"radio awesome\">\n                                    <input type=\"radio\" id=\"" + this.id + "_none\" value=\"\">\n                                    <label for=\"" + this.id + "_none\">" + yasoon.i18n('dialog.selectNone') + "</label>\n                                </div>"));
        }
        this.fieldMeta.allowedValues.forEach(function (option) {
            container.append($("<div class=\"radio awesome\">\n                                    <input type=\"radio\" id=\"" + this.id + "_" + option.id + " value=\"" + option.id + "\">\n                                    <label for=\"" + this.id + "_" + option.id + "\">" + option.value + "</label>\n                                </div>"));
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
    function SingleSelectField(id, field, options) {
        if (options === void 0) { options = {}; }
        var data = [];
        field.allowedValues.forEach(function (value) {
            data.push({ id: value.id, text: value.name });
        });
        options.data = data;
        options.templateResult = Select2Field.formatIcon;
        options.templateSelection = Select2Field.formatIcon;
        _super.call(this, id, field, options);
    }
    ;
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
