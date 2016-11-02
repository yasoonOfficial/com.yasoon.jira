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
        return this.getter.getValue(this.id, this.fieldMeta, onlyChangedData, this.getDomValue(), this.initalValue);
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
        console.log('Value changed: ' + this.id + ' -  New Value: ' + this.getValue(false));
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
        newContainer = $(fieldGroup).html(html).find("#" + this.id + "-field-group").find('.field-container');
        //Only inject inner container for easier usage
        this.render(newContainer);
        this.hookEventHandler();
    };
    ;
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
            case GetterType.ObjectArray:
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
