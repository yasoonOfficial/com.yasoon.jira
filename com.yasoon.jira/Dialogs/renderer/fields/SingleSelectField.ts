/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

@getter(GetterType.Object, "id")
@setter(SetterType.Option)
class SingleSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: any) {
        let data = [];
        let opt = options || {};
        field.allowedValues.forEach(function (value) {
            data.push({ id: value.id, text: value.name });
        });
        opt.data = data;
        opt.templateResult = Select2Field.formatIcon;
        opt.templateSelection = Select2Field.formatIcon;
        super(id, field, opt);
    };
}