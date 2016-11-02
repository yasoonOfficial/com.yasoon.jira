/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Select2AjaxField = (function (_super) {
    __extends(Select2AjaxField, _super);
    function Select2AjaxField(id, field, options, multiple, style) {
        if (options === void 0) { options = {}; }
        if (multiple === void 0) { multiple = false; }
        if (style === void 0) { style = "min-width: 350px; width: 80%;"; }
        if (!options.ajax) {
            options.ajax = {
                url: '',
                transport: function (params, success, failure) {
                    var queryTerm = '';
                    if (params && params.data) {
                        queryTerm = params.data.q;
                    }
                    this.getData(queryTerm)
                        .then(function (result) {
                        success(result);
                    })
                        .catch(function (error) {
                        //yasoon.util.log();
                        success([]);
                    });
                }
            };
        }
        _super.call(this, id, field, options, multiple, style);
    }
    ;
    return Select2AjaxField;
}(Select2Field));
exports.Select2AjaxField = Select2AjaxField;
