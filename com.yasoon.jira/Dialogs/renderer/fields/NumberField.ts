/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

@getter(GetterType.Text)
@setter(SetterType.Text)
class NumberField extends Field {

	getDomValue(): number {
		return parseFloat($('#' + this.id).val());
	}

	hookEventHandler(): void {
		$('#' + this.id).change(this.triggerValueChange);
	};

	render(container: JQuery) {
		container.append($(`<input class="text long-field" id="${this.id}" name="${this.id}" type="number" />`));
	};
}


