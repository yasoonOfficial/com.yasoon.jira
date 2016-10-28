/// <reference path="../Renderer.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
declare var jira: any;
declare var isEqual: any;

class GetTextValue implements FieldGetter {
    getValue(id: string, field: JiraMetaField, onlyChangedData: boolean) {
        let val = $('#' + id).val();

        if (onlyChangedData)
            //In edit case: Only send if changed	
            return (isEqual(field, val)) ? undefined : val;
        else
            //In creation case: Only send if not null	
            return (val) ? val : undefined;
    }
}