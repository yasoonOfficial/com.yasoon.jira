/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
@getter(GetterType.Object, "id")
@setter(SetterType.Option)
class SingleSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        let data = [];
        field.allowedValues.forEach(function (value) {
            data.push({ id: value.id, text: value.name });
        });
        options.data = data;
        options.templateResult = Select2Field.formatIcon;
        options.templateSelection = Select2Field.formatIcon;
        super(id, field, options);
    };
}