import { FieldController } from '../FieldController';
import { Field } from '../Field';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType, EventType } from '../Enumerations';

@getter(GetterType.Text)
@setter(SetterType.Text)
export class SingleTextField extends Field {

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


