/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/common.d.ts" />
class GetOption implements FieldGetter {
    keyName: string;

    constructor(keyName: string) {
        this.keyName = keyName;
    }

    getValue(field: Field, onlyChangedData: boolean) {
        let selectField = <Select2Field>field;
        let newValue = selectField.getDomValue();

        if (selectField.multiple) {
            let convertedValues = [];
            newValue.forEach((id) => {
                let obj = {};
                obj[this.keyName] = id;
                convertedValues.push(obj);
            });

            //Multi Select
            if (onlyChangedData) {
                //Both empty
                if (!field.initialValue && convertedValues.length === 0)
                    return;

                //If length the same and all values match, we do not need to send anything            
                if (field.initialValue && field.initialValue.length === convertedValues.length) {
                    let isSame: boolean = field.initialValue.every((c) => {
                        return findWithAttr(convertedValues, this.keyName, c[this.keyName]) > -1;
                    });

                    if (isSame)
                        return;
                }
                return convertedValues;
            } else {
                //In creation case: Only send if not null	
                return (convertedValues.length > 0) ? convertedValues : undefined;
            }
        } else {
            //Single Select
            let result = {};
            if (onlyChangedData) {
                //In edit case: Only send if changed	
                if (!isEqual(field.initialValue, newValue)) {
                    result[this.keyName] = newValue || "-1";
                    return result;
                }
            } else {
                //In creation case: Only send if not null	
                if (newValue) {
                    result[this.keyName] = newValue;
                    return result;
                }
            }
        }
    }
}