"use strict";
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
/// <reference path="../../../definitions/bluebird.d.ts" />
var Select2AjaxField_1 = require('./Select2AjaxField');
var Promise = require('bluebird');
var LabelSelectField = (function (_super) {
    __extends(LabelSelectField, _super);
    function LabelSelectField(id, field, options) {
        _super.call(this, id, field, options);
    }
    LabelSelectField.prototype.getData = function (searchTerm) {
        return Promise.resolve();
    };
    LabelSelectField = __decorate([
        getter(GetterType.Array),
        setter(SetterType.Tag)
    ], LabelSelectField);
    return LabelSelectField;
}(Select2AjaxField_1.Select2AjaxField));
