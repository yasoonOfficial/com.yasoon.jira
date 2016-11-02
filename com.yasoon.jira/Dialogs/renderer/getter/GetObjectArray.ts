/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
declare var jira: any;
declare var isEqual: any;

class GetObjectArray implements FieldGetter {
    keyName: string;

    constructor(keyName: string) {
        this.keyName = keyName;
    }

    getValue(id: string, field: JiraMetaField, onlyChangedData: boolean, newValue?: any, initialValue?: any) {
        //In edit case: Only send changes
        if (onlyChangedData) {
            //Both empty
            if (!initialValue && newValue.length === 0)
                return;

            //If length the same and all values match, we do not need to send anything            
            if (initialValue && initialValue.length === newValue.length) {
                let isSame = initialValue.every(function (c) {
                    return findWithAttr(newValue, this.keyName, c[this.keyName]) > -1;
                });

                if (isSame)
                    return;
            }
            return newValue;
        } else {
            //In creation case: Only send if not null	
            return (newValue.length > 0) ? newValue : undefined;
        }
    }
}