/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/common.d.ts" />

class GetTextValue implements FieldGetter {

    getValue(field: Field, onlyChangedData: boolean) {
        let newValue = field.getDomValue();

        if (onlyChangedData)
            //In edit case: Only send if changed	
            return (isEqual(field.initialValue, newValue)) ? undefined : newValue;
        else
            //In creation case: Only send if not null	
            return (newValue) ? newValue : undefined;
    }
}