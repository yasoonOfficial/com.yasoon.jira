/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
declare var moment;

@getter(GetterType.Text)
@setter(SetterType.DateTime)
class DateTimeField extends Field {

	getDomValue(): string {
		let date = $('#' + this.id)["datetimepicker"]("getValue");
		if (date) {
			date = moment(date).format('YYYY-MM-DD[T]HH:mm:ss.[000]ZZ');
		}
		return date;
	}

	hookEventHandler(): void {
		$('#' + this.id).change(this.triggerValueChange);
	};

	render(container: JQuery) {
		container.append($(`<input style="height: 28px;" class="text long-field" id="${this.id}" name="${this.id}" placeholder="${yasoon.i18n('dialog.dateTimePickerFormatTitle')}" value="" type="text" >
							<a href="#" id="${this.id}-trigger" title="${yasoon.i18n('dialog.titleSelectDate')}"><span class="aui-icon icon-date">${yasoon.i18n('dialog.titleSelectDate')}</span></a>`));

		let country = yasoon.setting.getProjectSetting('locale').split('-')[0];
		$('#' + this.id)["datetimepicker"]({
			allowTimes: [
				//'00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30',
				'07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
				'12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
				//,'20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
			],
			format: yasoon.i18n('dialog.dateTimePickerFormat'),
			scrollInput: false,
			allowBlank: true
		});

		$["datetimepicker"].setLocale(country);

		$('#' + this.id + '-trigger').off().click(e => {
			$('#' + this.id)["datetimepicker"]("show");
		});
	};
}


