/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.ObjectArray, "id")
@setter(SetterType.Option)
class MultiSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options, true);
        this.options.data = field.allowedValues.map(this.convertToSelect2);
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