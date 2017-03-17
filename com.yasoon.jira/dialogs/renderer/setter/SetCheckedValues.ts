import { Field, FieldSetter } from '../Field';

export class SetCheckedValues implements FieldSetter {
    setValue(field: Field, value: any): Promise<any> {
        if (value) {
            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    let id = (item && item.id) ? item.id : item;
                    field.ownContainer.find('[value=' + id + ']').prop('checked', true).trigger('change');
                });
            } else {
                let id = (value && value.id) ? value.id : value;
                field.ownContainer.find('[value=' + id + ']').prop('checked', true).trigger('change');
            }
        }
        return Promise.resolve(value);
    }
}