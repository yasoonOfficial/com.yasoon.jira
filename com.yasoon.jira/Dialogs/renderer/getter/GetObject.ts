/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/common.d.ts" />

class GetObject implements FieldGetter {
    keyName: string;

    constructor(keyName: string) {
        this.keyName = keyName;
    }

    getValue(field: Field, onlyChangedData: boolean) {
        let newValue = field.getDomValue();
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