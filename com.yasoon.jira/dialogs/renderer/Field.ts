import { EventType } from './Enumerations';
import { FieldController } from './FieldController';
import { JiraMetaField } from './JiraModels';
import { Utilities } from '../Util';

export abstract class Field implements FieldGet, FieldSet {
	public id: string;
	private originalFieldMeta: JiraMetaField;
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
		this.originalFieldMeta = Utilities.jiraCloneObject(fieldMeta);
		this.params = params;
	}

	getValue(onlyChangedData: boolean = false): any {
		if (!this.getter)
			throw new Error("Please either redefine method getValue or add a @getter Annotation for " + this.id);

		return this.getter.getValue(this, onlyChangedData);
	}

	setInitialValue(value: any): void {
		this.initialValue = value;
	}

	setValue(value: any): Promise<any> {
		if (!this.setter)
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

	setRequired(required: boolean) {
		let el = $(`#${this.id}-field-group`).find('.field-group');
		this.fieldMeta.required = required;
		if (required) {
			el.addClass('required');
		} else {
			el.removeClass('required');
		}
	}

	setHidden(hidden: boolean) {
		let el = $(`#${this.id}-field-group`).find('.field-group');
		this.fieldMeta.isHidden = hidden;
		if (hidden) {
			el.addClass('hidden');
		} else {
			el.removeClass('hidden');
		}
	}

	setDefaultValue(): Promise<any> {
		if (this.fieldMeta.defaultValue) {
			return this.setValue(this.fieldMeta.defaultValue);
		}
		return Promise.resolve();
	}

	afterRender(): Promise<any> {
		this.hookEventHandler();
		if (this.fieldMeta.hasDefaultValue) {
			return this.setDefaultValue();
		}
		return Promise.resolve();
	}

	resetMeta() {
		this.fieldMeta = Utilities.jiraCloneObject(this.originalFieldMeta);
		this.setHidden(this.fieldMeta.isHidden);
		this.setRequired(this.fieldMeta.required);
	}

	abstract getDomValue(): any;

	abstract hookEventHandler(): void;

	abstract render(container: JQuery);

	renderField(container: JQuery): Promise<any> {
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
			return result.then(() => {
				this.afterRender();
			});
		} else {
			return this.afterRender();
		}
	}

	handleError(e: Error): void {
		console.log('Error during field rendering: ', e, e.message, e.stack);
		yasoon.util.log('Error during field rendering. ' + e.message + ' Field: ' + this.id + ' Meta: ' + JSON.stringify(this.fieldMeta), yasoon.util.severity.error, getStackTrace(e));
		if (this.isRendered()) {
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

export interface IFieldEventHandler {
	handleEvent(type: EventType, newValue: any, source?: string): Promise<any>;
}

export interface LifecycleData {
	data: any,
	newData?: any,
	cancel?: boolean,
}

export interface UiActionEventData {
	name: string,
	value: any
}

interface FieldGet {
	getValue(onlyChangedData: boolean): any;
}

export interface FieldGetter {
	getValue(field: Field, onlyChangedData: boolean): any;
}

interface FieldSet {
	setValue(value: any): Promise<any>;
}

export interface FieldSetter {
	setValue(field: Field, value: any): Promise<any>;
}