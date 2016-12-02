/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
class SetOptionValue implements FieldSetter {
    setValue(field: Field, value: any) {
        let selectField = <Select2Field>field;
        if (!field.isRendered()) {
            //Not rendered, nothing to do... will be called with field.initialValue again
            return;
        }

        if (value && Array.isArray(value)) {
            //Multiselect       
            // Convert value into normalized select2 format
            let selectValues = value.map(selectField.convertToSelect2);

            //Now there are two cases:
            //All values already exist in data --> we can just select the data
            //Some data do not yet exist --> rerender and select data
            let nonExistingElements: Select2Element[] = [];
            let selectedValues = [];
            selectValues.forEach(v => {
                if (selectField.options.data.filter((data) => { return data.id === v.id }).length === 0) {
                    nonExistingElements.push(v);
                }
                selectedValues.push(v.id);
            });

            if (nonExistingElements.length > 0) {
                let newValues = selectField.options.data.concat(nonExistingElements);
                selectField.setData(newValues);
            }
            $('#' + field.id).val(selectedValues).trigger('change');

        } else if (value) {
            //Single Select

            // Convert value into normalized select2 format
            let selectValue = selectField.convertToSelect2(value);

            //Now there are two cases:
            //All values already exist in data --> we can just select the data
            //Some data do not yet exist --> rerender and select data
            if (selectField.options.data.filter((data) => { return data.id === selectValue.id }).length === 0) {
                selectField.options.data.push(selectValue);
                selectField.setData(selectField.options.data);
            }

            $('#' + field.id).val(selectValue.id).trigger('change');
        }
    }
}