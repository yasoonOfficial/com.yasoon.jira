/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

abstract class Select2Field extends Field {
	options: Select2Options;
	styleCss: string;
	multiple: boolean;

	constructor(id: string, field: JiraMetaField, options: Select2Options, multiple: boolean = false, style: string = "min-width: 350px; width: 80%;") {
		super(id, field);
		this.options = $.extend({ minimumInputLength: 0, allowClear: true, placeholder: '', templateResult: Select2Field.formatIcon, templateSelection: Select2Field.formatIcon }, options);
		this.styleCss = style;
		this.multiple = multiple;
	}

	getDomValue(): any {
		if (this.multiple) {
			let values = $('#' + this.id).val() || [];
			let selectedValues = [];
			values.forEach(function (id) {
				selectedValues.push({ id: id });
			});
			return selectedValues;
		} else {
			return $('#' + this.id).val();
		}
	}

	setData(newValues: Select2Element[]): void {
		this.options.data = newValues;

		$('#' + this.id)["select2"]("destroy");
		$('#' + this.id).remove();
		this.render(this.ownContainer);
	}

	hookEventHandler(): void {
		$('#' + this.id).change(e => this.triggerValueChange());
	}

	render(container: JQuery) {
		container.append($(`<select class="select input-field" id="${this.id}" name="${this.id}" style="${this.styleCss}" ${(this.multiple) ? 'multiple' : ''}>
								<option></option>
							</select>
							<img src="Dialogs/ajax-loader.gif" class="hidden" id="${this.id}-spinner" />`));

		$('#' + this.id)["select2"](this.options);
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

	static convertToSelect2Array(jiraValues: JiraValue[]): Select2Element[] {
		let data = [];

		jiraValues.forEach((value) => {
			let text = value.name || value.value;
			let newObj: Select2Element = { id: value.id, text: text };
			if (value.iconUrl) {
				newObj.icon = jira.icons.mapIconUrl(value.iconUrl)
			}
			data.push(newObj);
		});

		return data;
	}
}


