/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />

@getter(GetterType.Object, "name")
@setter(SetterType.Option)
class IssueTypeField extends Select2Field implements IFieldEventHandler {

    constructor(id: string, field: JiraMetaField) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderIssueType');

        super(id, field, options);

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
    }

    hookEventHandler() {
        super.hookEventHandler();

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
        }
    }
}