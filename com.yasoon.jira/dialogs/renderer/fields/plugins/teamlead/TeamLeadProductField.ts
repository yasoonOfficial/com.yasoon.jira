/// <reference path="../../JiraSelectField.ts" />
class TeamLeadProductField extends JiraSelectField {
    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }) {
        field.allowedValues = field.allowedValues.sort((a,b) => { return (a.value.toLowerCase() > b.value.toLowerCase()) ? 1 : -1 });
        super(id, field, options);

       
    }
}