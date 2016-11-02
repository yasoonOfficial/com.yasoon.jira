/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

@getter(GetterType.ObjectArray, "id")
@setter(SetterType.Option)
class VersionMultiSelectField extends Select2Field {

    constructor(id: string, field: JiraMetaField, releasedFirst: boolean) {
        let data = [];
        let options = {
            data: []
        };

        let releasedVersions = field.allowedValues.map((option) => {
            if (option.released && !option.archived) {
                let text = option.name || option.value;
                return { id: option.id, text: text };
            }
        });

        let unreleasedVersions = field.allowedValues.map((option) => {
            if (!option.released && !option.archived) {
                let text = option.name || option.value;
                return { id: option.id, text: text };
            }
        });

        let releasedOptGroup = {
            text: yasoon.i18n('dialog.releasedVersions'),
            children: releasedVersions
        };

        let unreleasedOptGroup = {
            text: yasoon.i18n('dialog.unreleasedVersions'),
            children: releasedVersions
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