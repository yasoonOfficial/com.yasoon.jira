/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />

@getter(GetterType.Text)
@setter(SetterType.Text)
class NumberField extends Field {

	getDomValue(): number {
		var domValue = $('#' + this.id).val();
		if (domValue !== '') {
			return parseFloat(domValue);
		} else {
			return null;
		}
	}

	hookEventHandler(): void {
		$('#' + this.id).change(e => this.triggerValueChange());
	};

	render(container: JQuery) {
		container.append($(`<input class="text long-field" id="${this.id}" name="${this.id}" type="number" />`));
	};
}


