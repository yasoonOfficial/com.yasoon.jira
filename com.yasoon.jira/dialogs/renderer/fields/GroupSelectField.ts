declare var jira;
import { FieldController } from '../FieldController';
import { Field } from '../Field';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType, EventType } from '../Enumerations';
import { Select2AjaxField } from './Select2AjaxField';
import { Select2Element, Select2Options } from './Select2Field';
import { JiraMetaField, JiraGroup, JiraGroups } from '../JiraModels';
import { AjaxService } from '../../AjaxService';

@getter(GetterType.Option, "name", null)
@setter(SetterType.Option)
export class GroupSelectField extends Select2AjaxField {
    constructor(id: string, field: JiraMetaField, options: { multiple: boolean } = { multiple: false }) {
        let select2Options: Select2Options = {};
        if (!options.multiple) {
            select2Options.placeholder = (field.hasDefaultValue && !jira.isEditMode) ? yasoon.i18n('dialog.selectDefault') : yasoon.i18n('dialog.selectNone');
        }
        super(id, field, select2Options, options.multiple);
    }


    convertId(id: any): Promise<JiraGroup> {
        if (!id['name']) {
            id = { name: id };
        }
        return Promise.resolve(id);
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        let url = '/rest/api/2/groups/picker?maxResults=50&query=' + searchTerm;

        return AjaxService.get(url)
            .then((data: string) => {
                let groupsResult: JiraGroups = JSON.parse(data);
                let groupsArray: Select2Element[] = [];
                groupsResult.groups.forEach((group) => {
                    groupsArray.push(this.convertToSelect2(group));
                });

                return groupsArray;
            });
    }

    convertToSelect2(group: JiraGroup): Select2Element {
        return {
            id: group.name,
            text: group.name,
            data: group
        };
    }
}