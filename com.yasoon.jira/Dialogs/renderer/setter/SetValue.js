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
