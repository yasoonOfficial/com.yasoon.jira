/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

class CascadedSelectField extends Select2Field {
    private parentField: SingleSelectField;
    private childField: SingleSelectField;

    constructor(id: string, field: JiraMetaField) {
        super(id, field, {});

        this.parentField = new SingleSelectField(id + '_parent', field, {}, "min-width: 150px; width: 45%;");

        let childFieldMeta: JiraMetaField = JSON.parse(JSON.stringify(field));
        childFieldMeta.allowedValues = [];

        this.childField = new SingleSelectField(id + '_child', childFieldMeta, {}, "min-width: 150px; width: 45%; ");

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

    setValue(value: any): void {
        this.parentField.setValue(value.id);
        if (value.child) {
            this.childField.setValue(value.child.id);
        }
    }

    hookEventHandler(): void {
        super.hookEventHandler();
        $('#' + this.parentField.id).change((e) => {
            let parentValue = this.parentField.getDomValue();
            let currentSelection = this.fieldMeta.allowedValues.filter(function (v) { return v.id == parentValue; })[0];
            let allowedValues = (currentSelection) ? currentSelection.children : [];

            this.childField.setData(Select2Field.convertToSelect2Array(allowedValues));
        });
    }

    render(container: JQuery): void {
        this.parentField.render(container);
        container.append('<span style="margin-left: 10px;">&nbsp</span>');
        this.childField.render(container);
    }
}