/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetDateTimeValue implements FieldSetter {
    setValue(id: string, value: any) {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + id)["datetimepicker"]('setOptions', { value: momentDate.format('L') + ' ' + momentDate.format('LT') }).trigger('change');
        }
    }
}