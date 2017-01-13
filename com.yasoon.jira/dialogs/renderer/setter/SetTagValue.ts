/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetTagValue implements FieldSetter {
    setValue(field: Field, value: any) {
        if (value) {
            let tags: string[];
            if(typeof value === 'string') {
                tags = [value];
            } else {
                tags = value;
            }
            tags.forEach(function (label) {
                //Add Option tags so initial selection will work
                $('#' + field.id).append(`<option val="${label}">${label}</option>`);
            });

            $('#' + field.id).val(tags).trigger('change');
            $('#' + field.id).data('value', tags);
        }
    }
}