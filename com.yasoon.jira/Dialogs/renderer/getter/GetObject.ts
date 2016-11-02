/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
declare var jira: any;
declare var isEqual: any;

class GetObject implements FieldGetter {
    keyName: string;

    constructor(keyName: string) {
        this.keyName = keyName;
    }

    getValue(id: string, field: JiraMetaField, onlyChangedData: boolean, newValue?: any, initialValue?: any) {
        let result = {};
        if (onlyChangedData) {
            //In edit case: Only send if changed	
            if (!isEqual(initialValue, newValue)) {
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