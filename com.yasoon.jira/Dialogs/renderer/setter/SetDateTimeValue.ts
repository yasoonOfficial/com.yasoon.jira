/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetDateTimeValue implements FieldSetter {
    setValue(field: Field, value: any) {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + field.id)["datetimepicker"]('setOptions', { value: momentDate.format('L') + ' ' + momentDate.format('LT') }).trigger('change');
        }
    }
}