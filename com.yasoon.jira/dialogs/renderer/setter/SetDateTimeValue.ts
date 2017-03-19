declare var moment;
import { Field, FieldSetter } from '../Field';

export class SetDateTimeValue implements FieldSetter {
    setValue(field: Field, value: any): Promise<any> {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + field.id)["datetimepicker"]('setOptions', { value: momentDate.format('L') + ' ' + momentDate.format('HH:mm') });
            $('#' + field.id).trigger('change');
        }
        return Promise.resolve(value);
    }
}