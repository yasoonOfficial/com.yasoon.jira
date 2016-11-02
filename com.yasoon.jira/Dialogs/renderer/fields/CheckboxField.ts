/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

@getter(GetterType.ObjectArray, "id")
@setter(SetterType.CheckedValues)
class CheckboxField extends Field {

    getDomValue(): any {
        let checkedValues = [];
        $('#' + this.id).find('input').each(function () {
            if ($(this).is(':checked')) {
                checkedValues.push({ id: $(this).val() });
            }
        });

        return checkedValues;
    }

    hookEventHandler(): void {
        $(`#${this.id}-field-group`).find('input').change(this.triggerValueChange);
    };

    render(container: JQuery) {
        this.fieldMeta.allowedValues.forEach(function (option) {
            container.append($(`<div class="checkbox awesome">
                                    <input type="checkbox" id="${this.id}_${option.id}" value="${option.id}">
                                    <label for="${this.id}_${option.id}">${option.value}</label>
                                </div>`));
        });
    };
}