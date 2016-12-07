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
            let select2Values = value.map((v) => { return selectField.convertToSelect2.call(selectField, v); });

            //Now there are two cases:
            //All values already exist in data --> we can just select the data
            //Some data do not yet exist --> rerender and select data
            let nonExistingElements: Select2Element[] = [];
            let selectedValues = [];
            select2Values.forEach(v => {
                if (!this.findInOptions(selectField.options.data, v.id)) {
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

            //Convert value into correct value
            return selectField.convertId(value)
                .then((obj) => {
                    if (!obj)
                        return;

                    // Convert value into normalized select2 format
                    let select2Value = selectField.convertToSelect2(obj);

                    //Now there are two cases:
                    //All values already exist in data --> we can just select the data
                    //Some data do not yet exist --> rerender and select data
                    if (!this.findInOptions(selectField.options.data, select2Value.id)) {
                        selectField.options.data.push(select2Value);
                        selectField.setData(selectField.options.data, true);
                    }

                    $('#' + field.id).val(select2Value.id).trigger('change');
                });
        }
    }

    findInOptions(inputData: Select2Element[], id: string): boolean {
        let result = inputData.filter((data) => {
            if (data.children) {
                return (data.children.filter((child) => { return child.id === id; }).length > 0);
            } else {
                return data.id === id;
            }
        });

        return result.length > 0;
    }
}