/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

abstract class Select2Field extends Field {
	options: Select2Options;
	styleCss: string;
	multiple: boolean;

	constructor(id: string, field: JiraMetaField, options: Select2Options, multiple: boolean = false, style: string = "min-width: 350px; width: 80%;") {
		super(id, field);
		this.options = $.extend({ data: [], minimumInputLength: 0, allowClear: true, placeholder: '', templateResult: Select2Field.formatIcon, templateSelection: Select2Field.formatIcon }, options);
		this.styleCss = style;
		this.multiple = multiple;
	}

	getDomValue(): any {
		if (this.multiple) {
			return $('#' + this.id).val() || [];
		} else {
			return $('#' + this.id).val();
		}
	}

	getObjectValue(): any {
		let elements: Select2Element[] = $('#' + this.id)['select2']('data');
		if (this.multiple) {
			return elements.map(p => { return p.data; });
		} else {
			return elements[0].data;
		}
	}

	setData(newValues: Select2Element[]): void {
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
			if (this.initialValue) {
				this.setValue(this.initialValue);
			}
		}
	}

	hookEventHandler(): void {
		$('#' + this.id).on('change', e => this.triggerValueChange());
	}

	render(container: JQuery) {
		container.append($(`<select class="select input-field" id="${this.id}" name="${this.id}" style="${this.styleCss}" ${(this.multiple) ? 'multiple' : ''}>
								<option></option>
							</select>
							<img src="Dialogs/ajax-loader.gif" class="hidden" id="${this.id}-spinner" />`));

		$('#' + this.id)["select2"](this.options);
	}

	abstract convertToSelect2(obj: any): Select2Element;

	convertId(id: any): Promise<any> {
		//Best Guess: Return data object with same "ID" property
		if (typeof id === 'string' && this.options.data) {
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

	showSpinner() {
		$('#' + this.id + '-spinner').removeClass('hidden');
	}

	hideSpinner() {
		$('#' + this.id + '-spinner').addClass('hidden');
	}

	static formatIcon(element: Select2Element): string | JQuery {
		if (!element.id) return element.text; // optgroup

		if (element.icon)
			return $('<span><img style="margin-right:3px; width: 16px;" src="' + element.icon + '"  onerror="jiraHandleImageFallback(this)"/>' + element.text + '</span>');
		else if (element.iconClass) {
			return $('<span><i style="margin-right:4px;" class="' + element.iconClass + '"></i><span>' + element.text + '</span></span>');
		} else {
			return element.text;
		}
	}
}


