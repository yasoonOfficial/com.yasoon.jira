import { Field, FieldSetter } from '../Field';

export class SetDateValue implements FieldSetter {
    setValue(field: Field, value: any): Promise<any> {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + field.id)["datetimepicker"]('setOptions', { value: momentDate.format('L') });
            $('#' + field.id).trigger('change');
        }
        return Promise.resolve(value);
    }
}