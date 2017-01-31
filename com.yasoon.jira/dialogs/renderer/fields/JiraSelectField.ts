/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
class JiraSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }, style: string = 'min-width: 350px; width: 80%;') {

        super(id, field, options, options.multiple, style );

        //Default value or None?
        if (options.multiple) {
            let placeholder: string = (field.hasDefaultValue && !jira.isEditMode) ? yasoon.i18n('dialog.selectDefault') : yasoon.i18n('dialog.selectNone');
            this.options.placeholder = placeholder;
        }
        this.options.data = (field.allowedValues) ? field.allowedValues.map(this.convertToSelect2) : [];

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