/// <reference path="../../definitions/jquery.d.ts" />
/// <reference path="../../definitions/jira.d.ts" />
/// <reference path="../../definitions/customSelect2.d.ts" />
/// <reference path="getter/GetArray.ts" />
/// <reference path="getter/GetObject.ts" />
/// <reference path="getter/GetObjectArray.ts" />
/// <reference path="getter/GetOption.ts" />
/// <reference path="getter/GetTextValue.ts" />
/// <reference path="setter/SetCheckedValues.ts" />
/// <reference path="setter/SetDateTimeValue.ts" />
/// <reference path="setter/SetDateValue.ts" />
/// <reference path="setter/SetOptionValue.ts" />
/// <reference path="setter/SetTagValue.ts" />
/// <reference path="setter/SetValue.ts" />

abstract class Field implements FieldGet, FieldSet {
	public id: string;
	protected fieldMeta: JiraMetaField;
	initialValue: any;
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

		return this.getter.getValue(this, onlyChangedData);
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
		let currentValue = this.getValue(false) || null; //harmonize null / undefined
		if (JSON.stringify(this.lastValue) != JSON.stringify(currentValue)) {
			FieldController.raiseEvent(EventType.FieldChange, currentValue, this.id);
			this.lastValue = currentValue;
		}
	}

	updateFieldMeta(newMeta: JiraMetaField) {
		this.lastValue = undefined;
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
						${(this.fieldMeta.description) ? '<div class="description">' + this.fieldMeta.description + '</div>' : ''}
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
	
	handleError(e:Error):void {
		console.log('Error during field rendering: ', e, e.message, e.stack);
		yasoon.util.log('Error during field rendering. ' + e.message + ' Field: ' + this.id + ' Meta: ' + JSON.stringify(this.fieldMeta), yasoon.util.severity.error, getStackTrace(e));
		if(this.isRendered()) {
			this.ownContainer.html('<span class="field-error"><i class="fa fa-exclamation-triangle" title="' + yasoon.i18n('dialog.errorFieldRendering') + '"></i></span>');
		}
	}
	
	cleanup() {
		//Cleanup HTML
		//Default to do nothing... can be overwritten be concrete fields
	}

	isRendered(): boolean {
		return (this.ownContainer != null);
	}
}

enum GetterType {
	Text, Object, ObjectArray, Array, Option
}

enum SetterType {
	Text, CheckedValues, Date, DateTime, Option, Tag
}

enum EventType {
	FieldChange, AfterRender, AfterSave, BeforeSave, SenderLoaded, UiAction, Cleanup, AttachmentChanged
}

//@getter Annotation
function getter(getterType: GetterType, ...params: any[]) {
	return function (target) {
		let proto: Field = target.prototype;
		switch (getterType) {
			case GetterType.Text:
				proto.getter = new GetTextValue();
				break;

			case GetterType.Object:
				proto.getter = new GetObject(params[0]);
				break;

			case GetterType.ObjectArray:
				proto.getter = new GetObjectArray(params[0]);
				break;

			case GetterType.Array:
				proto.getter = new GetArray();
				break;

			case GetterType.Option:
				proto.getter = new GetOption(params[0], params[1]);
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
	newData?: any,
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
	getValue(field: Field, onlyChangedData: boolean): any;
}

interface FieldSet {
	setValue(value: any): void;
}

interface FieldSetter {
	setValue(field: Field, value: any): void;
}