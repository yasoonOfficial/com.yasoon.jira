/// <reference path="../Field.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />

@getter(GetterType.Text)
@setter(SetterType.Text)
class SingleTextField extends Field {

	getDomValue(): string {
		return $('#' + this.id).val();
	}

	hookEventHandler(): void {
		$('#' + this.id).change(e => this.triggerValueChange());
	};

	render(container: JQuery) {
		container.append($(`<input class="text long-field" id="${this.id}" name="${this.id}" type="text" />`));
	};
}


