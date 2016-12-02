/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetValue implements FieldSetter {
    setValue(field: Field, value: any) {
        if (value)
            $('#' + field.id).val(value).trigger('change');
    }
}