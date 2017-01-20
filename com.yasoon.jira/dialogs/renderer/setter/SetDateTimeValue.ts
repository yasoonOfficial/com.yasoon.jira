/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/moment.d.ts" />

class SetDateTimeValue implements FieldSetter {
    setValue(field: Field, value: any): Promise<any> {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + field.id)["datetimepicker"]('setOptions', { value: momentDate.format('L') + ' ' + momentDate.format('HH:mm') });
            $('#' + field.id).trigger('change');
        }
        return Promise.resolve(value);
    }
}