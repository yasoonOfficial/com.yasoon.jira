/// <reference path="../Field.ts" />

class SetCheckedValues implements FieldSetter {
    setValue(field: Field, value: any):Promise<any> {
        if (value) {
            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    field.ownContainer.find('[value=' + item.id + ']').prop('checked', true).trigger('change');
                });
            } else {
                field.ownContainer.find('[value=' + value.id + ']').prop('checked', true).trigger('change');
            }
        }
        return Promise.resolve(value);
    }
}