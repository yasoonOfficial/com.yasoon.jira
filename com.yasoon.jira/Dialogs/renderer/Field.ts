/// <reference path="../../definitions/jquery.d.ts" />
/// <reference path="setter/SetValue.ts" />
/// <reference path="getter/GetTextValue.ts" />

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
	setValue(id: string, value: any): void;
}

abstract class Field implements FieldGet, FieldSet {
	public id: string;
	protected fieldMeta: JiraMetaField;
	protected initialValue: any;
	protected params: any;
	protected ownContainer: JQuery;

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

		return this.setter.setValue(this.id, value);
	}

	triggerValueChange(): void {
		FieldController.raiseEvent(EventType.FieldChange, this.getValue(false), this.id);
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
			fieldGroup = $(`<div id="#${this.id}-field-group" data-field-id="${this.id}"></div>`).appendTo(container);
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
		this.render(this.ownContainer);

		this.hookEventHandler();
	}
}

enum GetterType {
	Text, Object, ObjectArray, Array
}

enum SetterType {
	Text, CheckedValues, Date, DateTime, Option, Tag
}

enum EventType {
	FieldChange, AfterRender, AfterSave, BeforeSave
}

interface IFieldEventHandler {
	handleEvent(type: EventType, newValue: any, source?: string): void;
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


interface JiraSchema {
	type: string,
	custom?: string,
	customId?: string,
	system?: string
}

interface JiraValue {
	id: string,
	name?: string,
	key?: string,
	value?: string,
	iconUrl?: string,
	released?: boolean,
	archived?: boolean,
	children?: Array<JiraValue>
}

interface JiraSentObj {
	id?: string,
	name?: string,
	child?: JiraSentObj
}

interface JiraTimetrackingValue {
	originalEstimate?: string,
	remainingEstimate?: string
}

interface JiraGroups {
	total: number,
	header: string,
	groups: JiraGroup[]
}

interface JiraGroup {
	html: string,
	labels: JiraGroupLabel[],
	name: string
}

interface JiraGroupLabel {
	text: string,
	title: string,
	type: string
}

interface Jira6Epics {
	epicNames: JiraEpic[],
	total: number
}

interface Jira7Epics {
	epicLists: JiraEpicList[],
	total: number
}

interface JiraEpicList {
	listDescriptor: string,
	epicNames: JiraEpic[],
}


interface JiraEpic {
	key: string,
	name: string,
	isDone?: boolean
}

interface JiraSprints {
	suggestions: JiraSprint[],
	allMatches: JiraSprint[]
}

interface JiraSprint {
	name: string,
	id: number,
	statusKey: string
}

interface JiraJqlResult {
	issues: JiraIssue[]
}

interface JiraIssue {
	id: string,
	key: string,
	fields: { [id: string]: any }
}

type JiraProjectType = 'business' | 'service_desk' | 'software';

interface JiraProject {
	id: string,
	name: string,
	key: string,
	projectTypeKey?: JiraProjectType,
	issueTypes?: JiraIssueType[],
}

interface JiraIssueType {
	avatarId: number,
	description: string,
	iconUrl: string,
	id: string,
	name: string,
	subtask: boolean
}

interface JiraProjectTemplate extends JiraProject {
	senderEmail: string
}

interface JiraMetaField {
	required: boolean,
	schema: JiraSchema,
	name: string,
	key: string,
	description?: string,
	hasDefaultValue?: boolean,
	operators?: Array<string>,
	autoCompleteUrl?: string,
	allowedValues?: Array<JiraValue>,
	isHidden?: boolean
}

interface Select2Options {
	allowClear?: boolean,
	placeholder?: string,
	templateResult?: Select2FormatMethod,
	templateSelection?: Select2FormatMethod,
	minimumInputLength?: number,
	ajax?: Select2Ajax,
	data?: Select2Element[]

}

interface Select2Element {
	id: string,
	text: string,
	icon?: string,
	iconClass?: string,
	children?: Select2Element[],
	data?: any
}

interface Select2Ajax {
	url?: string,
	transport?: Select2AjaxMethod,
	processResults?: any
}

interface Select2AjaxMethod {
	(params: Select2CallbackParams, success: Select2Callback, failure: Select2Callback): void
}

interface Select2FormatMethod {
	(element: Select2Element): string | JQuery
}

interface Select2CallbackParams {
	data: { q: string }
}

interface Select2Callback {
	(result?: { results: any[] }): void
}