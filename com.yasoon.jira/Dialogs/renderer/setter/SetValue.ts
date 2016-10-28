/// <reference path="../Renderer.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
declare var jira: any;

class SetValue implements FieldSetter {
    setValue(id: string, value: any) {
        if (value) {
            $('#' + id).val(value);
            $('#' + id).data('initial-value', value);
        }
    }
}