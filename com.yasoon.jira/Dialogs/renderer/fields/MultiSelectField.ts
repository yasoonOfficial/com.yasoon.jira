/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.ObjectArray, "id")
@setter(SetterType.Option)
class MultiSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        options.data = Select2Field.convertToSelect2Array(field.allowedValues);
        super(id, field, options, true);
    };
}