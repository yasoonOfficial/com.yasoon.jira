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
