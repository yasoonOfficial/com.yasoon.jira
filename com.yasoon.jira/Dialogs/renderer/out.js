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
/// <reference path="../../definitions/jquery.d.ts" />
var Field = (function () {
    function Field(id, field) {
        this.id = id;
        this.field = field;
    }
    Field.prototype.addBaseHtml = function (container) {
        var html = "<div class=\"field-group " + ((this.field.required) ? 'required' : '') + "\" id=\"" + this.id + "-field-group\">\n\t\t\t\t\t\t<label for=\"" + this.id + "\">" + this.field.name + " \n\t\t\t\t\t\t\t<span class=\"aui-icon icon-required\">Required</span>\n\t\t\t\t\t\t</label>\n\t\t\t\t\t</div>";
        $(container).append($(html));
        //Return inner Container so caller can directly append it's own fields.
        return $(container).find('#' + this.id + '-field-group');
    };
    Field.prototype.getValue = function (isEditMode) { };
    ;
    Field.prototype.setValue = function (value) { };
    ;
    return Field;
}());
var GetterType;
(function (GetterType) {
    GetterType[GetterType["Text"] = 0] = "Text";
    GetterType[GetterType["CheckedArray"] = 1] = "CheckedArray";
})(GetterType || (GetterType = {}));
//@getter Annotation
function getter(getterType) {
    return function (target) {
        switch (getterType) {
            case GetterType.Text:
                target.prototype.getValue = GetTextValue.prototype.getValue;
        }
    };
}
/// <reference path="../Renderer.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var GetTextValue = (function () {
    function GetTextValue() {
    }
    GetTextValue.prototype.getValue = function (isEditMode) {
        var val = $('#' + this.id).val();
        if (isEditMode)
            //In edit case: Only send if changed	
            return (isEqual(this.field, val)) ? undefined : val;
        else
            //In creation case: Only send if not null	
            return (val) ? val : undefined;
    };
    return GetTextValue;
}());
/// <reference path="../Renderer.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetValue = (function () {
    function SetValue() {
    }
    SetValue.prototype.setValue = function (value) {
        if (value) {
            $('#' + this.id).val(value);
            $('#' + this.id).data('initial-value', value);
        }
    };
    return SetValue;
}());
/// <reference path="Renderer.ts" />
/// <reference path="decorator/GetTextValue.ts" />
/// <reference path="decorator/SetValue.ts" />
/// <reference path="../../definitions/jquery.d.ts" />
var SingleTextRenderer = (function (_super) {
    __extends(SingleTextRenderer, _super);
    function SingleTextRenderer(id, field, params) {
        _super.call(this, id, field);
        this.params = params;
    }
    SingleTextRenderer.prototype.render = function (container) {
        var contentContainer = _super.prototype.addBaseHtml.call(this, container);
        contentContainer.append($("<input class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" value=\"\" type=\"text\" />"));
    };
    SingleTextRenderer = __decorate([
        /// <reference path="Renderer.ts" />
        getter(GetterType.Text)
    ], SingleTextRenderer);
    return SingleTextRenderer;
}(Field));
/// <reference path="../../definitions/jquery.d.ts" />
var jiraFields = {};
var FieldController;
(function (FieldController) {
    var fieldTypes = {};
    var renderer = {};
    function register(key, newField, params) {
        fieldTypes[key] = { field: newField, params: params };
    }
    FieldController.register = register;
    function getFieldType(field) {
        return field.schema.custom || field.schema.system;
    }
    FieldController.getFieldType = getFieldType;
    function getRenderer(id) {
        var handler = renderer[id];
        return handler;
    }
    FieldController.getRenderer = getRenderer;
    function loadMeta(fields) {
        for (var key in fields) {
            var field = fields[key];
            var type = getFieldType(field);
            if (type) {
                var buffer = fieldTypes[type];
                var handler = new buffer.field(key, field, buffer.params);
                renderer[field.id] = handler;
            }
        }
    }
    FieldController.loadMeta = loadMeta;
    function render(id, container) {
        var renderer = getRenderer(id);
        if (renderer) {
            renderer.render(container);
        }
    }
    FieldController.render = render;
    function getValue(id, isEditMode) {
        var renderer = getRenderer(id);
        if (renderer) {
            return renderer.getValue(isEditMode);
        }
    }
    FieldController.getValue = getValue;
    function getFormData(currentMeta, isEditMode) {
        var result = { fields: {} };
        //Find Meta for current Issue Type
        if (currentMeta) {
            $.each(currentMeta.fields, function (key, field) {
                var newValue = getValue(key, isEditMode);
                if (newValue !== undefined)
                    result.fields[key] = newValue;
            });
        }
        return result;
    }
    FieldController.getFormData = getFormData;
})(FieldController || (FieldController = {}));
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
