/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetTagValue implements FieldSetter {
    setValue(field: Field, value: any) {
        if (value) {
            value.forEach(function (label) {
                //Add Option tags so initial selection will work
                $('#' + field.id).append(`<option val="${label}">${label}</option>`);
            });

            $('#' + field.id).val(value).trigger('change');
            $('#' + field.id).data('value', value);
        }
    }
}