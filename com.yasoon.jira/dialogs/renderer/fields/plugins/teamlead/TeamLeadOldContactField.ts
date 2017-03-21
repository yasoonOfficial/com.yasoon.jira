declare var jira;
import { FieldController } from '../../../FieldController';
import { IFieldEventHandler } from '../../../Field';
import { EventType, GetterType } from '../../../Enumerations';
import { getter } from '../../../Annotations';
import { JiraValue, JiraMetaField } from '../../../JiraModels';
import { Select2Field, Select2Element } from '../../Select2Field';
import { TeamleadContact } from './TeamLeadContactField';
import TeamLeadCompanyField from './TeamLeadCompanyField';
import { AjaxService } from '../../../../AjaxService';


//In contrast to other TeamLead Fields, this one is just a string field requires contact ids in format: (id) for single fields or (id),(id), ... for multi
@getter(GetterType.Text)
export default class TeamLeadOldContactField extends Select2Field implements IFieldEventHandler {
    private apiKey: string;
    private ownUserKey: string;

    constructor(id: string, field: JiraMetaField, options = { multiple: false }) {
        super(id, field, null, options.multiple);

        this.options.placeholder = (field.hasDefaultValue && !jira.isEditMode) ? yasoon.i18n('dialog.selectDefault') : yasoon.i18n('dialog.selectNone');

        this.apiKey = jira.settings.teamlead.apiKey;
        this.ownUserKey = jira.ownUser.key || jira.ownUser.name; //Depending on version >.<

        //Start sync - don't know what it does but it sounds usefull :D
        AjaxService.get('/plugins/servlet/crm/api?apiKey=' + this.apiKey + '&userName=' + this.ownUserKey + '&command=sync');

        this.getContacts('')
            .then((contacts) => {
                this.setData(contacts.map(this.convertToSelect2));
            });

        //Check if we have a dependency to a company field
        if (jira.settings.teamlead.mapping[this.id]) {
            FieldController.registerEvent(EventType.FieldChange, this, jira.settings.teamlead.mapping[this.id]);
        }
    }

    init() {
        //Init is called automatically for each new meta --> not necessary for projects
    }

    handleEvent(type: EventType, newValue: { id: string }, source?: string): Promise<any> {
        if (type === EventType.FieldChange) {
            let field = <TeamLeadCompanyField>FieldController.getField(source);
            let companyName = (newValue) ? field.getCompanyName(newValue.id) : '';
            return this.getContacts(companyName)
                .then((contacts) => {
                    this.setData(contacts.map(this.convertToSelect2));
                });
        }

        return Promise.resolve();
    }

    getDomValue() {
        let result = '';
        if (this.multiple) {
            let ids: string[] = $('#' + this.id).val() || [];
            ids.forEach((id) => {
                result = result + '(' + id + '),';
            });
        } else {
            let id = $('#' + this.id).val();
            if (id) {
                result = '(' + id + ')';
            }
        }

        return result;
    }

    setValue(value: string): Promise<any> {
        let valueString = value.replace(/\(/g, '').replace(/\)/g, '');
        if (this.multiple) {
            let ids = valueString.split(',');
            $('#' + this.id).val(ids).trigger('change');
        } else {
            $('#' + this.id).val(valueString).trigger('change');
        }
        return Promise.resolve();
    }

    convertToSelect2(contact: TeamleadContact): Select2Element {
        return {
            id: contact.id,
            text: contact.name,
            data: contact
        };
    }

    getContacts(companyName: string): Promise<TeamleadContact[]> {
        let prom: Promise<TeamleadContact[]>;
        if (companyName) {
            prom = AjaxService.get('/plugins/servlet/crm/api?command=searchEntities&crm_param_1=Company&crm_param_1_value=' + companyName + '&tableName=CONTACTS&userName=' + this.ownUserKey + '&apiKey=' + this.apiKey)
                .then((contactsString: string) => {
                    let returnValue = JSON.parse(contactsString);
                    let contacts: TeamleadContact[] = returnValue.records || [];
                    return contacts;
                });
        } else {
            prom = AjaxService.get('/plugins/servlet/crm/api?apiKey=' + this.apiKey + '&userName=' + this.ownUserKey + '&command=getcontacts')
                .then((contactsString) => {
                    let returnValue = JSON.parse(contactsString);
                    let contacts: TeamleadContact[] = returnValue.contacts || [];
                    return contacts;
                });
        }

        return prom.then((contacts) => {
            return contacts.sort((a, b) => { return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1; });
        });
    }
}