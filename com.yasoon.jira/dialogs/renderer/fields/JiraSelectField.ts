import { FieldController } from '../FieldController';
import { IFieldEventHandler } from '../Field';
import { Select2Field, Select2Element } from './Select2Field';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType, EventType } from '../Enumerations';
import { JiraValue, JiraMetaField } from '../JiraModels';
import { JiraIconController } from '../IconController';

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
export default class JiraSelectField extends Select2Field {
    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }, style: string = 'min-width: 350px; width: 80%;') {

        super(id, field, options, options.multiple, style);
        this.init();
    }

    init() {
        //Default value or None?
        if (!this.options.multiple) {
            this.options.placeholder = yasoon.i18n('dialog.selectNone');
        }

        this.options.data = (this.fieldMeta.allowedValues) ? this.fieldMeta.allowedValues.map(this.convertToSelect2) : [];
    }

    convertToSelect2(this: null, obj: JiraValue): Select2Element {
        let result: Select2Element = {
            id: obj.id,
            text: obj.name || obj.value,
            data: obj
        };

        if (obj.iconUrl) {
            result.icon = JiraIconController.mapIconUrl(obj.iconUrl);
        }

        return result;
    }
}