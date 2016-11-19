/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />

class AttachmentField extends Field {

	getDomValue(): string {
		return '';
	}

	getValue() {
		//Nessecary as attachments will upload differently
		return undefined;
	}

	setValue() {
		//Attachments work differently
	}

	hookEventHandler(): void {
		$('#' + this.id).change(e => this.triggerValueChange());
	};

	render(container: JQuery) {
		container.append($(`<input class="text long-field" id="${this.id}" name="${this.id}" type="text" />`));
	};
}


