/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

class SetCheckedValues implements FieldSetter {
    setValue(field: Field, value: any) {
        if (value) {
            let elem = $('#' + field.id);
            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    elem.find('[value=' + item.id + ']').prop('checked', true).trigger('change');
                });
            } else {
                elem.find('[value=' + value.id + ']').prop('checked', true).trigger('change');
            }
        }
    }
}