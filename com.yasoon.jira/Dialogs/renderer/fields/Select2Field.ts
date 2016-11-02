/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />

abstract class Select2Field extends Field {
	options: any;
	styleCss: string;
	multiple: boolean;

	constructor(id: string, field: JiraMetaField, options: any, multiple: boolean = false, style: string = "min-width: 350px; width: 80%;") {
		super(id, field);
		this.options = $.extend({ minimumInputLength: 0, allowClear: true }, options);
		this.styleCss = style;
		this.multiple = multiple;
	};

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
	};

	hookEventHandler(): void {
		$('#' + this.id).change(this.triggerValueChange);
	};

	render(container: JQuery) {
		container.append($(`<select class="select input-field" id="${this.id}" name="${this.id}" style="${this.styleCss}" ${(this.multiple) ? 'multiple' : ''}></select>`));

		$('#' + this.id)["select2"](this.options);
	};

	static formatIcon(element): string | JQuery {
		if (!element.id) return element.text; // optgroup

		if (element.icon)
			return $('<span><img style="margin-right:3px; width: 16px;" src="' + element.icon + '"  onerror="jiraHandleImageFallback(this)"/>' + element.text + '</span>');
		else if (element.iconClass) {
			return $('<span><i style="margin-right:3px; float:left;" class="' + element.iconClass + '"></i><span>' + element.text + '</span></span>');
		} else {
			return element.text;
		}
	}
}


