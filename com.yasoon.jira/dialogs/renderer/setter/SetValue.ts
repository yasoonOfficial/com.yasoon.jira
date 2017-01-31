/// <reference path="../Field.ts" />

class SetValue implements FieldSetter {
    setValue(field: Field, value: any): Promise<any> {
        $('#' + field.id).val(value).trigger('change');
        return Promise.resolve(value);
    }
}