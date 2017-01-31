/// <reference path="../../JiraSelectField.ts" />
class TeamLeadContactField extends JiraSelectField {
    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }) {
        super(id, field, options);
    }
}