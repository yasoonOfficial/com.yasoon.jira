/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetOptionValue implements FieldSetter {
    setValue(id: string, value: any) {
        if (value && Array.isArray(value)) {
            //Multiselect            
            let selectedValues = [];
            value.forEach(v => {
                let text = v.name || v.value;
                $('#' + id).append(`<option value="${v.id}>${text}</option>`);
                selectedValues.push(v.id);
            });
            $('#' + id).val(selectedValues).trigger('change');
        } else if (value) {
            //Single Select
            let text = value.name || value.value;
            $('#' + id).append(`<option value="${value.id}>${text}</option>`);
            $('#' + id).val(value.id).trigger('change');
        }
    }
}