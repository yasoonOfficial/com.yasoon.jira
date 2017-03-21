declare var jira;
import { JiraMetaField } from '../../../JiraModels';
import JiraSelectField from '../../JiraSelectField';
import { AjaxService } from '../../../../AjaxService';


export default class TeamLeadCompanyField extends JiraSelectField {
    private apiKey: string;
    private ownUserKey: string;

    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }) {

        //Filter empty element & sort
        field.allowedValues = field.allowedValues.filter((e) => e.value !== 'Not defined').sort((a, b) => { return (a.value.toLowerCase() > b.value.toLowerCase()) ? 1 : -1; });

        super(id, field, options);

        this.apiKey = jira.settings.teamlead.apiKey;
        this.ownUserKey = jira.ownUser.key || jira.ownUser.name; //Depending on version >.<
        //Start sync - don't know what it does but it sounds usefull :D
        AjaxService.get('/plugins/servlet/crm/api?apiKey=' + this.apiKey + '&userName=' + this.ownUserKey + '&command=sync');


    }

    getCompanyName(id: string): string {
        let company = this.fieldMeta.allowedValues.filter((value) => value.id === id)[0];
        return (company) ? company.value : '';
    }
}