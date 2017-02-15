/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/common.d.ts" />

class CascadedSelectField extends Field implements IFieldEventHandler {
    private parentField: JiraSelectField;
    private childField: JiraSelectField;

    constructor(id: string, field: JiraMetaField) {
        super(id, field);

        this.parentField = new JiraSelectField(id + '_parent', field, {}, 'min-width: 150px; width: 45%;');
        FieldController.registerEvent(EventType.FieldChange, this, id + '_parent');
        let childFieldMeta: JiraMetaField = JSON.parse(JSON.stringify(field));
        childFieldMeta.allowedValues = [];

        this.childField = new JiraSelectField(id + '_child', childFieldMeta, {}, 'min-width: 150px; width: 45%;');
        FieldController.registerEvent(EventType.FieldChange, this, id + '_child');
    }

    getDomValue() {
        return this.getValue();
    }

    getValue(onlyChangedData: boolean = false): JiraSentObj {
        let selectedParentId: string = this.parentField.getDomValue() || null;
        let selectedChildId: string = this.childField.getDomValue() || null;
        let resultObj: JiraSentObj = null;

        if (onlyChangedData) {
            //In edit case: Only send if changed	
            let oldParentValue = (this.initialValue) ? this.initialValue.id : null;
            let oldChildValue = (this.initialValue && this.initialValue.child) ? this.initialValue.child.id : null;

            if (!isEqual(oldParentValue, selectedParentId) ||
                !isEqual(oldChildValue, selectedChildId)) {
                if (selectedParentId) {
                    let childObj = (selectedChildId) ? { id: selectedChildId } : null;
                    return {
                        id: selectedParentId,
                        child: childObj
                    };
                } else {
                    return null;
                }
            }
        } else {
            //In creation case: Only send if not null
            if (selectedParentId) {
                resultObj = { id: selectedParentId };
                if (selectedChildId) {
                    resultObj.child = { id: selectedChildId };
                }
                return resultObj;
            }
        }
    }

    setValue(value: any): Promise<any> {
        this.parentField.setValue(value.id);
        this.parentField.initialValue = value.id;
        if (value.child) {
            this.childField.setValue(value.child.id);
            this.childField.initialValue = value.child.id;
        }

        return Promise.resolve(value);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (source === this.id + '_parent') {
            //Adjust Child Collection
            let allowedValues = [];
            if (newValue) {
                let currentSelection = this.fieldMeta.allowedValues.filter(function (v) { return v.id == newValue.id; })[0];
                allowedValues = (currentSelection) ? currentSelection.children : [];
            }

            this.childField.setData(allowedValues.map(this.childField.convertToSelect2));
        }

        FieldController.raiseEvent(EventType.FieldChange, this.getValue(false), this.id);

        return null;
    }

    hookEventHandler(): void { }

    render(container: JQuery): void {
        let parentContainer = $(`<div id="{this.id}_parent-container" style="display:inline;"></div>`).appendTo(container);
        this.parentField.render(parentContainer);
        this.parentField.hookEventHandler();
        this.parentField.ownContainer = parentContainer;
        container.append('<span style="margin-left: 10px;">&nbsp</span>');

        let childContainer = $(`<div id="{this.id}_child-container" style="display:inline;"></div>`).appendTo(container);
        this.childField.render(childContainer);
        this.childField.hookEventHandler();
        this.childField.ownContainer = childContainer;
    }

    updateFieldMeta(newMeta: JiraMetaField) {
        super.updateFieldMeta(newMeta);
        this.parentField.updateFieldMeta(newMeta);

        let childFieldMeta: JiraMetaField = JSON.parse(JSON.stringify(newMeta));
        childFieldMeta.allowedValues = [];
        this.childField.updateFieldMeta(childFieldMeta);
    }
}