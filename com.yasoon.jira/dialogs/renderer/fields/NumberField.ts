import { Field } from '../Field';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType } from '../Enumerations';

@getter(GetterType.Text)
@setter(SetterType.Text)
export class NumberField extends Field {

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


