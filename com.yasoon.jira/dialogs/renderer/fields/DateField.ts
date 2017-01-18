/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetDateValue.ts" />
/// <reference path="../../../definitions/moment.d.ts" />

@getter(GetterType.Text)
@setter(SetterType.Date)
class DateField extends Field {

	getDomValue(): string {
		let date = $('#' + this.id)["datetimepicker"]("getValue");
		if (date) {
			date = moment(date).format('YYYY-MM-DD');
		}
		return date;
	}

	hookEventHandler(): void {
		$('#' + this.id).change(e => this.triggerValueChange());
	}

	render(container: JQuery) {
		container.append($(`<input style="height: 28px;" class="text long-field" id="${this.id}" name="${this.id}" placeholder="${yasoon.i18n('dialog.datePickerFormatTitle')}" value="" type="text" >
							<a href="#" id="${this.id}-trigger" title="${yasoon.i18n('dialog.titleSelectDate')}"><span class="aui-icon icon-date">${yasoon.i18n('dialog.titleSelectDate')}</span></a>`));

		$('#' + this.id)["datetimepicker"]({
			timepicker: false,
			format: yasoon.i18n('dialog.datePickerDateFormat'),
			scrollInput: false,
			allowBlank: true
		});

		let country = yasoon.setting.getProjectSetting('locale').split('-')[0];
		$["datetimepicker"].setLocale(country);

		$('#' + this.id + '-trigger').off().click(e => {
			$('#' + this.id)["datetimepicker"]("show");
		});
	}

	cleanup() {
		$('#' + this.id)["datetimepicker"]('destroy');
	}
}


