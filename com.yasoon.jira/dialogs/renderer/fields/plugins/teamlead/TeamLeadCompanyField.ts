/// <reference path="../../JiraSelectField.ts" />
class TeamLeadCompanyField extends JiraSelectField {
    private apiKey: string;
    private ownUserKey: string;

    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }) {
        super(id, field, options);

        this.apiKey = jira.settings.teamlead.apiKey;
        this.ownUserKey = jira.ownUser.key || jira.ownUser.name; //Depending on version >.<
        //Start sync - don't know what it does but it sounds usefull :D
		jiraGet('/plugins/servlet/crm/api?apiKey=' + this.apiKey + '&userName=' + this.ownUserKey + '&command=sync');
    }

    getCompanyName(id: string): string {
        let company = this.fieldMeta.allowedValues.filter((value) => value.id === id)[0];
        return (company) ? company.value : '';
    }
}