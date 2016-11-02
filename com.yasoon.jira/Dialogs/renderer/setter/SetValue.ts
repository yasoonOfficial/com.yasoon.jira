/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetValue implements FieldSetter {
    setValue(id: string, value: any) {
        if (value)
            $('#' + id).val(value).trigger('change');
    }
}