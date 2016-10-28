/// <reference path="../../definitions/jquery.d.ts" />
/// <reference path="setter/SetValue.ts" />
/// <reference path="getter/GetTextValue.ts" />
interface FieldGet {
	getValue(onlyChangedData: boolean): any;
}

interface FieldGetter {
	getValue(id: string, field: JiraMetaField, onlyChangedData: boolean): any;
}

interface FieldSet {
	setValue(value: any): void;
}

interface FieldSetter {
	setValue(id: string, value: any): void;
}

abstract class Field implements FieldGet, FieldSet {
	protected id: string;
	protected field: JiraMetaField;
	protected getter: FieldGetter;
	protected setter: FieldSetter;

	constructor(id: string, field: JiraMetaField) {
		this.id = id;
		this.field = field;
	}

	protected addBaseHtml(container: JQuery) {
		let html = `<div class="field-group ${(this.field.required) ? 'required' : ''}" id="${this.id}-field-group">
						<label for="${this.id}">${this.field.name} 
							<span class="aui-icon icon-required">Required</span>
						</label>
					</div>`;

		container.append($(html));

		//Return inner Container so caller can directly append it's own fields.
		return container.find('#' + this.id + '-field-group');
	}

	getValue(onlyChangedData: boolean) {
		return this.getter.getValue(this.id, this.field, onlyChangedData);
	};

	setValue(value: any) {

	};

	abstract render(container: any);
}

enum GetterType {
	Text, CheckedArray
}

enum SetterType {
	Text, CheckedArray
}

//@getter Annotation
function getter(getterType: GetterType) {
	return function (target) {
		switch (getterType) {
			case GetterType.Text:
				target.prototype.getter = GetTextValue;
		}
	}
}

//@setter Annotation
function setter(setterType: SetterType) {
	return function (target) {
		switch (setterType) {
			case SetterType.Text:
				target.prototype.getter = SetValue;
		}
	}
}

type JiraSchema = {
	type: string,
	custom?: string,
	system?: string
}

type JiraValue = {
	id: string,
	name?: string,
	key?: string,
	iconUrl?: string
}

type JiraMetaField = {
	required: boolean,
	schema: JiraSchema,
	name: string,
	key: string,
	hasDefaultValues: boolean,
	operators: Array<string>,
	autoCompleteUrl?: string,
	allowedValues?: Array<JiraValue>
}