/// <reference path="../../JiraSelectField.ts" />
class TeamLeadCompanyField extends JiraSelectField {
    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }) {
        super(id, field, options);
    }
}