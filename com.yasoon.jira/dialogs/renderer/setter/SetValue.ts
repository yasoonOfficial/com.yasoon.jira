import { Field, FieldSetter } from '../Field';

export class SetValue implements FieldSetter {
    setValue(field: Field, value: any): Promise<any> {
        $('#' + field.id).val(value).trigger('change');
        return Promise.resolve(value);
    }
}