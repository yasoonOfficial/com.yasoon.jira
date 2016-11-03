/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
@getter(GetterType.ObjectArray, "id")
@setter(SetterType.Option)
class VersionMultiSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, releasedFirst: boolean) {
        let data = [];
        let options = {
            data: []
        };

        let releasedVersions = field.allowedValues
            .filter(option => { return option.released && !option.archived })
            .map(option => {
                let text = option.name || option.value;
                return { id: option.id, text: text };
            });

        let unreleasedVersions = field.allowedValues
            .filter(option => { return !option.released && !option.archived })
            .map(option => {
                let text = option.name || option.value;
                return { id: option.id, text: text };
            });

        let releasedOptGroup = {
            text: yasoon.i18n('dialog.releasedVersions'),
            children: releasedVersions
        };

        let unreleasedOptGroup = {
            text: yasoon.i18n('dialog.unreleasedVersions'),
            children: unreleasedVersions
        };

        if (releasedFirst) {
            options.data.push(releasedOptGroup);
            options.data.push(unreleasedOptGroup);
        } else {
            options.data.push(unreleasedOptGroup);
            options.data.push(releasedOptGroup);
        }

        super(id, field, options, true);
    };
}