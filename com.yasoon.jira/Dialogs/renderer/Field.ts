/// <reference path="../../definitions/jquery.d.ts" />
/// <reference path="../../definitions/jira.d.ts" />
/// <reference path="../../definitions/customSelect2.d.ts" />
/// <reference path="setter/SetValue.ts" />
/// <reference path="getter/GetTextValue.ts" />

abstract class Field implements FieldGet, FieldSet {
	public id: string;
	protected fieldMeta: JiraMetaField;
	protected initialValue: any;
	protected params: any;
	protected lastValue: any;
	ownContainer: JQuery;

	getter: FieldGetter;
	setter: FieldSetter;

	constructor(id: string, fieldMeta: JiraMetaField, params?: any) {
		this.id = id;
		this.fieldMeta = fieldMeta;
		this.params = params;
	}

	getValue(onlyChangedData: boolean = false): any {
		if (!getter)
			throw new Error("Please either redefine method getValue or add a @getter Annotation for " + this.id);

		return this.getter.getValue(this.id, this.fieldMeta, onlyChangedData, this.getDomValue(), this.initialValue);
	}

	setInitialValue(value: any): void {
		this.initialValue = value;
	}

	setValue(value: any): void {
		if (!setter)
			throw new Error("Please either redefine method setValue or add a @setter Annotation for " + this.id);

		return this.setter.setValue(this, value);
	}

	getType(): string {
		return this.fieldMeta.schema.system || this.fieldMeta.schema.custom;
	}

	triggerValueChange(): void {
		let currentValue = this.getValue(false);
		if (this.lastValue != currentValue) {
			FieldController.raiseEvent(EventType.FieldChange, currentValue, this.id);
			this.lastValue = currentValue;
		}
	}

	updateFieldMeta(newMeta: JiraMetaField) {
		this.fieldMeta = newMeta;
	}

	abstract getDomValue(): any

	abstract hookEventHandler(): void

	abstract render(container: JQuery)

	renderField(container: JQuery): void {
		let fieldGroup: JQuery = container.find('#' + this.id + '-field-group');

		//First render the field-group container for this field if it does not exist yet
		if (fieldGroup.length === 0) {
			fieldGroup = $(`<div id="${this.id}-field-group" data-field-id="${this.id}"></div>`).appendTo(container);
		}

		//Render label, mandatory and hidden logic
		let html = `<div class="field-group ${(this.fieldMeta.required) ? 'required' : ''} ${(this.fieldMeta.isHidden) ? 'hidden' : ''}" >
						<label for="${this.id}">${this.fieldMeta.name} 
							<span class="aui-icon icon-required">Required</span>
						</label>
						<div class="field-container">
						</div>
						<div class="description">${(this.fieldMeta.description) ? this.fieldMeta.description : ''}</div>
					</div>`;

		this.ownContainer = $(fieldGroup).html(html).find('.field-container');
		//Only inject inner container for easier usage
		let result = this.render(this.ownContainer);

		//If it returns a promise, waitbefore adding event handler
		if (result && result.then) {
			result.then(() => {
				this.hookEventHandler();
			});
		} else {
			this.hookEventHandler();
		}
	}

	isRendered(): boolean {
		return (this.ownContainer != null);
	}
}

enum GetterType {
	Text, Object, ObjectArray, Array
}

enum SetterType {
	Text, CheckedValues, Date, DateTime, Option, Tag
}

enum EventType {
	FieldChange, AfterRender, AfterSave, BeforeSave, SenderLoaded, UiAction
}

//@getter Annotation
function getter(getterType: GetterType, params?: any) {
	return function (target) {
		let proto: Field = target.prototype;
		switch (getterType) {
			case GetterType.Text:
				proto.getter = new GetTextValue();
				break;

			case GetterType.Object:
				proto.getter = new GetObject(params);
				break;

			case GetterType.ObjectArray:
				proto.getter = new GetObjectArray(params);
				break;

			case GetterType.Array:
				proto.getter = new GetArray();
				break;
		}
	}
}

//@setter Annotation
function setter(setterType: SetterType) {
	return function (target) {
		let proto: Field = target.prototype;
		switch (setterType) {
			case SetterType.Text:
				proto.setter = new SetValue();
				break;

			case SetterType.CheckedValues:
				proto.setter = new SetCheckedValues();
				break;

			case SetterType.Date:
				proto.setter = new SetDateValue();
				break;

			case SetterType.DateTime:
				proto.setter = new SetDateTimeValue();
				break;

			case SetterType.Option:
				proto.setter = new SetOptionValue();
				break;
			case SetterType.Tag:
				proto.setter = new SetTagValue();
				break;
		}
	}
}

interface IFieldEventHandler {
	handleEvent(type: EventType, newValue: any, source?: string): Promise<any>;
}

interface IEmailController {
	getAttachmentFileHandles(): any[];
	insertEmailValues(): void;
}

interface LifecycleData {
	data: any,
	newData: any,
	cancel?: boolean,
}

interface UiActionEventData {
	name: string,
	value: any
}

interface FieldGet {
	getValue(onlyChangedData: boolean): any;
}

interface FieldGetter {
	getValue(id: string, field: JiraMetaField, onlyChangedData: boolean, newValue?: any, initialValue?: any): any;
}

interface FieldSet {
	setValue(value: any): void;
}

interface FieldSetter {
	setValue(field: Field, value: any): void;
}