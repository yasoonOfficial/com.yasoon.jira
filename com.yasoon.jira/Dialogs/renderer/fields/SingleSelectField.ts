/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
@getter(GetterType.Object, "id")
@setter(SetterType.Option)
class SingleSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: any = {}, style: string = "min-width: 350px; width: 80%;") {
        //Default value or None?
        let placeholder = (field.hasDefaultValue) ? yasoon.i18n('dialog.selectDefault') : yasoon.i18n('dialog.selectNone');

        options.data = Select2Field.convertToSelect2Array(field.allowedValues);
        options.placeholder = placeholder;

        super(id, field, options, false, style);
    }
}