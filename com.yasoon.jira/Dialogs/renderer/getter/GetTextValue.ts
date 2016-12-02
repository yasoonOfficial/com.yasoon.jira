/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />

class GetTextValue implements FieldGetter {

    getValue(id: string, field: JiraMetaField, onlyChangedData: boolean, newValue?: any, initialValue?: any) {
        if (onlyChangedData)
            //In edit case: Only send if changed	
            return (isEqual(initialValue, newValue)) ? undefined : newValue;
        else
            //In creation case: Only send if not null	
            return (newValue) ? newValue : undefined;
    }
}