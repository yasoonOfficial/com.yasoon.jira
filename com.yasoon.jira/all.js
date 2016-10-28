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
var Renderer = (function () {
    function Renderer() {
    }
    Renderer.prototype.addBaseHtml = function (id, field, container) {
        var html = "<div class=\"field-group " + ((field.required) ? 'required' : '') + "\" id=\"" + id + "-field-group\">\n\t\t\t\t\t\t<label for=\"" + id + "\">" + field.name + " \n\t\t\t\t\t\t\t<span class=\"aui-icon icon-required\">Required</span>\n\t\t\t\t\t\t</label>\n\t\t\t\t\t</div>";
        $(container).append($(html));
        return $(container).find('#' + id + 'field-group');
    };
    Renderer.prototype.getValue = function (id, isEditMode, fields) { };
    ;
    Renderer.prototype.setValue = function (id, value) { };
    ;
    return Renderer;
}());
var GetterType;
(function (GetterType) {
    GetterType[GetterType["Text"] = 0] = "Text";
    GetterType[GetterType["CheckedArray"] = 1] = "CheckedArray";
})(GetterType || (GetterType = {}));
//@getter Annotation
function getter(getterType) {
    return function (target) {
        // do something with 'target' and 'value'...
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
    GetTextValue.prototype.getValue = function (id, isEditMode, fields) {
        var val = $('#' + id).val();
        if (isEditMode)
            //In edit case: Only send if changed	
            return (isEqual(fields[id], val)) ? undefined : val;
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
    SetValue.prototype.setValue = function (id, value) {
        if (value) {
            $('#' + id).val(value);
            $('#' + id).data('initial-value', value);
        }
    };
    return SetValue;
}());
/// <reference path="Renderer.ts" />
/// <reference path="mixins/GetTextValue.ts" />
/// <reference path="mixins/SetValue.ts" />
/// <reference path="../../definitions/jquery.d.ts" />
var MultiLineTextRenderer = (function (_super) {
    __extends(MultiLineTextRenderer, _super);
    function MultiLineTextRenderer() {
        _super.apply(this, arguments);
        //MentionsInput only allows to get the value async... which breaks our concept.
        //So we get the value of the comment box after each change and save it here so we can get it afterwards synchroniously.
        this.mentionTexts = {};
    }
    MultiLineTextRenderer.prototype.isDescription = function (id) {
        return (id === 'description' || id === 'comment');
    };
    MultiLineTextRenderer.prototype.getValue = function (id, isEditMode, fields) {
        var val = '';
        if (this.isDescription(id) && this.mentionTexts[id]) {
            //Parse @mentions
            val = this.mentionTexts[id].replace(/@.*?\]\(user:([^\)]+)\)/g, '[~$1]');
        }
        else {
            val = $('#' + id).val();
        }
        if (isEditMode)
            //In edit case: Only send if changed	
            return (isEqual(fields[id], val)) ? undefined : val;
        else
            //In creation case: Only send if not null	
            return (val) ? val : undefined;
    };
    MultiLineTextRenderer.prototype.render = function (id, field, container) {
        var contentContainer = _super.prototype.addBaseHtml.call(this, id, field, container);
        contentContainer.append($("<input class=\"text long-field\" id=\"" + id + "\" name=\"" + id + "\" value=\"\" type=\"text\" />"));
    };
    return MultiLineTextRenderer;
}(Renderer));
/// <reference path="Renderer.ts" />
/// <reference path="mixins/GetTextValue.ts" />
/// <reference path="mixins/SetValue.ts" />
/// <reference path="../../definitions/jquery.d.ts" />
var SingleTextRenderer = (function (_super) {
    __extends(SingleTextRenderer, _super);
    function SingleTextRenderer() {
        _super.apply(this, arguments);
    }
    SingleTextRenderer.prototype.render = function (id, field, container) {
        var contentContainer = _super.prototype.addBaseHtml.call(this, id, field, container);
        contentContainer.append($("<input class=\"text long-field\" id=\"" + id + "\" name=\"" + id + "\" value=\"\" type=\"text\" />"));
    };
    SingleTextRenderer = __decorate([
        /// <reference path="Renderer.ts" />
        getter(GetterType.Text)
    ], SingleTextRenderer);
    return SingleTextRenderer;
}(Renderer));
