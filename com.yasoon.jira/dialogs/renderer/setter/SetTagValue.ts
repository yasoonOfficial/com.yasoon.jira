/// <reference path="../Field.ts" />

class SetTagValue implements FieldSetter {
    setValue(field: Field, value: any): Promise<any> {
        if (value) {
            let selectField = <Select2Field>field;
            let tags: string[];
            if (typeof value === 'string') {
                tags = [value];
            } else {
                tags = value;
            }

            tags.forEach(function (label) {
                //Add Option tags so initial selection will work
                if (selectField.options.data.filter(d => d.id === label).length === 0) {
                    selectField.options.data.push(selectField.convertToSelect2(label));
                    $('#' + field.id).append(`<option val="${label}">${label}</option>`);
                }
            });

            $('#' + field.id).val(tags).trigger('change');
        }
        return Promise.resolve(value);
    }
}