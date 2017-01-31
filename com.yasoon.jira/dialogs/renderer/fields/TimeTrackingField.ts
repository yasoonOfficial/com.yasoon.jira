/// <reference path="../Field.ts" />

class TimeTrackingField extends Field {
	private origField: SingleTextField;
	private remainingField: SingleTextField;

	constructor(id: string, field: JiraMetaField) {
		super(id, field);

		let origFieldMeta: JiraMetaField = JSON.parse(JSON.stringify(field));
		let remainingFieldMeta: JiraMetaField = JSON.parse(JSON.stringify(field));

		origFieldMeta.name = yasoon.i18n('dialog.timetrackingOriginal');
		origFieldMeta.description = yasoon.i18n('dialog.timetrackingDescrOriginal');

		remainingFieldMeta.name = yasoon.i18n('dialog.timetrackingRemaining');
		remainingFieldMeta.description = yasoon.i18n('dialog.timetrackingDescrRemain');

		this.origField = new SingleTextField(id + '_originalestimate', origFieldMeta);
		this.remainingField = new SingleTextField(id + '_remainingestimate', remainingFieldMeta);

	}

	getValue(onlyChangedData: boolean = false): JiraTimetrackingValue {
		let origVal: string = this.origField.getDomValue();
		let remainVal: string = this.remainingField.getDomValue();

		//JIRA timetracking legacy mode
		// --> it's not allowed to set orig and remainaing Estimate during creation
		// --> it's not allowed to change original estimate.
		let result: JiraTimetrackingValue = {};
		//Edit Case
		if (onlyChangedData) {
			if ((!this.initialValue && origVal) || (this.initialValue && this.initialValue.originalEstimate != origVal)) {
				result.originalEstimate = origVal;
			}
			if ((!this.initialValue && remainVal) || (this.initialValue && this.initialValue.remainingEstimate != remainVal)) {
				result.remainingEstimate = remainVal;
			}
		} else {
			if (origVal) {
				result.originalEstimate = origVal;
			}
			if (remainVal) {
				result.remainingEstimate = remainVal;
			}
		}

		//Only return an object if it's not empty;
		return (Object.keys(result).length > 0) ? result : undefined;
	}

	setValue(value: JiraTimetrackingValue): Promise<any> {
		if (value) {
			this.origField.setValue(value.originalEstimate);
			this.remainingField.setValue(value.remainingEstimate);
		}
		return Promise.resolve(value);
	}

	getDomValue() {
		return "";
	}

	hookEventHandler(): void {
		$('#' + this.id).change(e => this.triggerValueChange());
	};

	renderField(container: JQuery): void {
		this.origField.renderField(container);
		this.remainingField.renderField(container);
	}

	render(container: JQuery): void {
		//Not nessecary as we redefine renderField
	};
}


