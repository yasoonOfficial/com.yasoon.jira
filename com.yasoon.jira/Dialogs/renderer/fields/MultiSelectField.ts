/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

@getter(GetterType.ObjectArray, "id")
@setter(SetterType.Option)
class MultiSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: any) {
        let data = [];
        field.allowedValues.forEach(function (value) {
            data.push({ id: value.id, text: value.name });
        });
        options.data = data;
        super(id, field, options, true);
    };
}