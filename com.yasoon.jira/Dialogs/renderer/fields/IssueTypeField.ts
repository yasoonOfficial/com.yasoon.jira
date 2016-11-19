/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />

@getter(GetterType.Object, "id")
@setter(SetterType.Option)
class IssueTypeField extends Select2Field implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.issueTypeFieldId, name: 'Issue Type', required: true, schema: { system: 'issue', type: '' } };

    constructor(id: string, field: JiraMetaField) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderIssueType');
        options.allowClear = false;

        super(id, field, options);

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
    }

    triggerValueChange() {
        let issueType: JiraIssueType = this.getObjectValue();
        FieldController.raiseEvent(EventType.FieldChange, issueType, this.id);
    }

    public handleEvent(type: EventType, newValue: any, source?: string): void {
        if (source === FieldController.projectFieldId) {
            let project: JiraProject = newValue;
            let result: Select2Element[] = project.issueTypes.map((it) => {
                return {
                    id: it.id,
                    text: it.name,
                    icon: jira.icons.mapIconUrl(it.iconUrl),
                    data: it
                };
            });

            this.setData(result);
            this.setValue(result[0].data);
        }
    }
}