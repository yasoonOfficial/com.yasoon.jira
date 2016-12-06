/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetCheckedValues.ts" />

@getter(GetterType.ObjectArray, "id")
@setter(SetterType.CheckedValues)
class CheckboxField extends Field {

    getDomValue(): any {
        let checkedValues = [];
        $(this.ownContainer).find('input').each(function () {
            if ($(this).is(':checked')) {
                checkedValues.push({ id: $(this).val() });
            }
        });

        return checkedValues;
    }

    hookEventHandler(): void {
        $(`#${this.id}-field-group`).find('input').change(e => this.triggerValueChange());
    };

    render(container: JQuery) {
        let innerContainer = $('<div class="awesome-wrapper"></div>').appendTo(container);
        this.fieldMeta.allowedValues.forEach(option => {
            innerContainer.append($(`<div class="checkbox awesome">
                                    <input type="checkbox" id="${this.id}_${option.id}" value="${option.id}">
                                    <label for="${this.id}_${option.id}">${option.value}</label>
                                </div>`));
        });
    };
}