/// <reference path="../Renderer.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

@getter(GetterType.Text)
@setter(SetterType.Text)
class SingleTextField extends Field {
	params: any;

	constructor(id, field, params) {
		super(id, field);
		this.params = params;
	}

	render(container: JQuery) {
		let contentContainer = super.addBaseHtml(container);
		contentContainer.append($(`<input class="text long-field" id="${this.id}" name="${this.id}" value="" type="text" />`));
	}
}


