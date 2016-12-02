/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetCheckedValues.ts" />

@getter(GetterType.Object, "id")
@setter(SetterType.CheckedValues)
class RadioField extends Field {

    getDomValue(): any {
        return $(this.ownContainer).find('input:checked').first().val();
    };

    hookEventHandler(): void {
        $(`#${this.id}-field-group`).find('input').change(e => this.triggerValueChange());
    };

    render(container: JQuery) {
        if (!this.fieldMeta.required) {
            //If it isn't required we should allow a None option
            container.append($(`<div class="radio awesome">
                                    <input type="radio" id="${this.id}_none" name="${this.id}" value="" checked>
                                    <label for="${this.id}_none">${yasoon.i18n('dialog.selectNone')}</label>
                                </div>`));
        }

        this.fieldMeta.allowedValues.forEach((option) => {
            container.append($(`<div class="radio awesome">
                                    <input type="radio" id="${this.id}_${option.id}" name="${this.id}" value="${option.id}">
                                    <label for="${this.id}_${option.id}">${option.value}</label>
                                </div>`));
        });
    };
}