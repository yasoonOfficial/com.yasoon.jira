/// <reference path="../../JiraSelectField.ts" />

interface teamleadContact {
    id: string;
    contact_company?: string;
    contact_email?: string;
    contact_login?: string;
    contact_name?: string;
    contact_position?: string;
    name?: string;
}

class TeamLeadContactField extends JiraSelectField implements IFieldEventHandler {
    private apiKey: string;
    private ownUserKey: string;

    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }) {
        super(id, field, options);
        this.apiKey = jira.settings.teamlead.apiKey;
        this.ownUserKey = jira.ownUser.key || jira.ownUser.name; //Depending on version >.<

        //Start sync - don't know what it does but it sounds usefull :D
        jiraGet('/plugins/servlet/crm/api?apiKey=' + this.apiKey + '&userName=' + this.ownUserKey + '&command=sync');

        //Check if we have a dependency to a company field
        if (jira.settings.teamlead.mapping[this.id]) {
            FieldController.registerEvent(EventType.FieldChange, this, jira.settings.teamlead.mapping[this.id]);
        }
    }

    handleEvent(type: EventType, newValue: { id: string }, source?: string): Promise<any> {
        if (type === EventType.FieldChange) {
            let field = <TeamLeadCompanyField>FieldController.getField(source);
            let companyName = (newValue) ? field.getCompanyName(newValue.id) : '';

            return this.getContacts(companyName)
                .then((contacts: JiraValue[]) => {
                    this.setData(contacts.map(this.convertToSelect2));
                });
        }

        return Promise.resolve();
    }

    getContacts(companyName: string): Promise<any> {
        let prom: Promise<any>;
        if (companyName) {
            return jiraGet('/plugins/servlet/crm/api?command=searchEntities&crm_param_1=Company&crm_param_1_value=' + companyName + '&tableName=CONTACTS&userName=' + this.ownUserKey + '&apiKey=' + this.apiKey)
                .then((contactsString: string) => {
                    let returnValue = JSON.parse(contactsString);
                    let contacts:teamleadContact[] = returnValue.records || [];
                    let result: JiraValue[] = [];
                    contacts.forEach(contact => {
                        let jiraContact = this.fieldMeta.allowedValues.filter((element) => element.value == contact.name)[0];
                        if (jiraContact) {
                            result.push(jiraContact);
                        }
                    });

                    return result;
                });
        } else {
           return Promise.resolve(this.fieldMeta.allowedValues);
        }
    }
}