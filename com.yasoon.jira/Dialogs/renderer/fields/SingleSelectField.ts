/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
@getter(GetterType.Object, "id")
@setter(SetterType.Option)
class SingleSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: any = {}, style: string = "min-width: 350px; width: 80%;") {

        super(id, field, options, false, style);

        //Default value or None?
        let placeholder: string = (field.hasDefaultValue) ? yasoon.i18n('dialog.selectDefault') : yasoon.i18n('dialog.selectNone');

        this.options.data = field.allowedValues.map(this.convertToSelect2);
        this.options.placeholder = placeholder;
    }

    convertToSelect2(obj: JiraValue): Select2Element {
        let result: Select2Element = {
            id: obj.id,
            text: obj.name || obj.value,
            data: obj
        };

        if (obj.iconUrl) {
            result.icon = jira.icons.mapIconUrl(obj.iconUrl);
        }

        return result;
    }

}