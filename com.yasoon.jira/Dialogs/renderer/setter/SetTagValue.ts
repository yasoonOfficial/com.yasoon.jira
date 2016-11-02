/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetTagValue implements FieldSetter {
    setValue(id: string, value: any) {
        if (value) {
            value.forEach(function (label) {
                //Add Option tags so initial selection will work
                $('#' + id).append(`<option val="${label}">${label}</option>`);
            });

            $('#' + id).val(value).trigger('change');
            $('#' + id).data('value', value);
        }
    }
}