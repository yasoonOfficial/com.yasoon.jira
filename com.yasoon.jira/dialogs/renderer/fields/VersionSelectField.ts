import { FieldController } from '../FieldController';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType, EventType } from '../Enumerations';
import { Select2Field, Select2Element } from './Select2Field';
import { JiraMetaField, JiraVersion, JiraValue } from '../JiraModels';
import { JiraIconController } from '../IconController';

@getter(GetterType.Option, "id", null)
@setter(SetterType.Option)
class VersionSelectField extends Select2Field {
    private releasedFirst: boolean;

    constructor(id: string, field: JiraMetaField, config: { releasedFirst: boolean, multiSelect: boolean }) {
        let options = {
            data: []
        };
        super(id, field, options, config.multiSelect);
        this.releasedFirst = config.releasedFirst;
        this.init();
    }

    init() {
        let allowedValues: JiraVersion[] = <JiraVersion[]>this.fieldMeta.allowedValues;

        let releasedVersions = allowedValues
            .filter(option => { return option.released && !option.archived })
            .map(this.convertToSelect2);

        let unreleasedVersions = allowedValues
            .filter(option => { return !option.released && !option.archived })
            .map(this.convertToSelect2);

        let releasedOptGroup: Select2Element = {
            id: 'releasedVersions',
            text: yasoon.i18n('dialog.releasedVersions'),
            children: releasedVersions
        };

        let unreleasedOptGroup: Select2Element = {
            id: 'unreleasedVersions',
            text: yasoon.i18n('dialog.unreleasedVersions'),
            children: unreleasedVersions
        };

        this.options.data = [];
        if (this.releasedFirst) {
            if (releasedOptGroup.children.length > 0)
                this.options.data.push(releasedOptGroup);
            if (unreleasedOptGroup.children.length > 0)
                this.options.data.push(unreleasedOptGroup);
        } else {
            if (unreleasedOptGroup.children.length > 0)
                this.options.data.push(unreleasedOptGroup);
            if (releasedOptGroup.children.length > 0)
                this.options.data.push(releasedOptGroup);
        }
    }

    convertToSelect2(version: JiraValue): Select2Element {
        let result: Select2Element = {
            id: version.id,
            text: version.name || version.value,
            data: version
        };

        if (version.iconUrl) {
            result.icon = JiraIconController.mapIconUrl(version.iconUrl);
        }

        return result;
    }
}