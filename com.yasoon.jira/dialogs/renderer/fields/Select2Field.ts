declare var jira;
import { Field } from '../Field';
import { EventType } from '../Enumerations';
import { FieldController } from '../FieldController';
import { JiraMetaField } from '../JiraModels';

export abstract class Select2Field extends Field {
	options: Select2Options;
	multiple: boolean;

	constructor(id: string, field: JiraMetaField, options: Select2Options, multiple: boolean = false) {
		super(id, field);
		this.options = $.extend({ data: [], minimumInputLength: 0, allowClear: true, templateResult: Select2Field.formatIcon, templateSelection: Select2Field.formatIcon, width: jira.defaultWidth }, options);
		this.multiple = multiple;

		//https://github.com/select2/select2/issues/3497
		//AllowClear needs placeholder
		if (this.options.allowClear && !this.options.placeholder) {
			this.options.placeholder = '';
		}
	}

	abstract init();

	getDomValue(): any {
		return $('#' + this.id).val();
	}

	getObjectValue(): any {
		let elements: Select2Element[] = $('#' + this.id)['select2']('data');
		if (elements.length > 0) {
			if (this.multiple) {
				return elements.map(p => { return p.data; });
			} else {
				return elements[0].data;
			}
		}
	}

	setData(newValues: Select2Element[], fromSetValue: boolean = false): void {
		this.options.data = newValues;
		if (this.isRendered()) {
			//Get selected Properties
			let isDisabled: boolean = $('#' + this.id).prop('disabled');

			$('#' + this.id)["select2"]("destroy");
			this.ownContainer.html('');
			this.render(this.ownContainer);

			//Set saved Properties
			$('#' + this.id).prop('disabled', isDisabled);

			this.hookEventHandler();

			//If intial value has been set, we need to set it again now.
			if (this.initialValue && !fromSetValue) {
				this.setValue(this.initialValue);
			}
		}
	}

	hookEventHandler(): void {
		$('#' + this.id).on('change', e => this.triggerValueChange());
	}

	render(container: JQuery) {
		container.append($(`<select class="select input-field" id="${this.id}" name="${this.id}" ${(this.multiple) ? 'multiple' : ''}>
							${ ((!this.multiple) ? '<option></option>' : '')}
							</select>
							<img src="images/ajax-loader.gif" class="hidden spinner-icon" id="${this.id}-spinner" />`));

		$('#' + this.id)["select2"](this.options);
	}

	abstract convertToSelect2(obj: any): Select2Element;


	triggerValueChange() {
		setTimeout(() => {
			let value = this.getObjectValue();
			if (!this.lastValue && !value)
				return;

			if ((this.lastValue && !value) || (!this.lastValue && value) || (JSON.stringify(this.lastValue) != JSON.stringify(value))) {
				FieldController.raiseEvent(EventType.FieldChange, value, this.id);
				this.lastValue = value;
			}
		}, 1);

	}

	convertId(id: any): Promise<any> {
		//Best Guess: Return data object with same "ID" property
		if (typeof id === 'string' && this.options.data.length > 0) {
			let result: Select2Element = null;
			this.options.data.forEach((data) => {
				if (data.children) {
					data.children.forEach((child) => {
						if (child.id === id)
							result = child;
					});
				} else if (data.id === id) {
					result = data;
				}
			});

			let returnValue = ((result) ? result.data : null);
			return Promise.resolve(returnValue);
		}

		return Promise.resolve(id);
	}

	clear() {
		$('#' + this.id).val('').trigger('change');
	}

	showSpinner() {
		$('#' + this.id + '-spinner').removeClass('hidden');
	}

	hideSpinner() {
		$('#' + this.id + '-spinner').addClass('hidden');
	}

	updateFieldMeta(newMeta: JiraMetaField) {
		super.updateFieldMeta(newMeta);
		this.init();
	}

	static formatIcon(element: Select2Element): string | JQuery {
		if (!element.id) return element.text; // optgroup

		if (element.icon)
			return $('<span><img class="select2-icon-size select2-icon-margin" src="' + element.icon + '"  onerror="jiraHandleImageFallback(this)"/>' + element.text + '</span>');
		else if (element.iconClass) {
			return $('<span><i class="select2-icon-margin ' + element.iconClass + '"></i><span>' + element.text + '</span></span>');
		} else {
			return element.text;
		}
	}
}


export interface Select2Options {
	allowClear?: boolean;
	placeholder?: string;
	templateResult?: Select2FormatMethod;
	templateSelection?: Select2FormatMethod;
	minimumInputLength?: number;
	ajax?: Select2Ajax;
	data?: Select2Element[];
	multiple?: boolean;
	width?: string;
}

export interface Select2Element {
	id: string;
	text: string;
	icon?: string;
	iconClass?: string;
	children?: Select2Element[];
	data?: any;
}

export interface Select2Ajax {
	url?: string;
	transport?: Select2AjaxMethod;
	processResults?: any;
}

export interface Select2AjaxMethod {
	(params: Select2CallbackParams, success: Select2Callback, failure: Select2Callback): void;
}

export interface Select2FormatMethod {
	(element: Select2Element): string | JQuery;
}

export interface Select2CallbackParams {
	data: { q: string };
}

export interface Select2Callback {
	(result?: { results: any[] }): void;
}

