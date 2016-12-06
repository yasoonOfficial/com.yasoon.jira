/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

class SetCheckedValues implements FieldSetter {
    setValue(field: Field, value: any) {
        if (value) {
            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    field.ownContainer.find('[value=' + item.id + ']').prop('checked', true).trigger('change');
                });
            } else {
                field.ownContainer.find('[value=' + value.id + ']').prop('checked', true).trigger('change');
            }
        }
    }
}