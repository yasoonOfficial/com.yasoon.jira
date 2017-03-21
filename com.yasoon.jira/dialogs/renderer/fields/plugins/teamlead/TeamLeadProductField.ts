declare var jira;
import { JiraMetaField } from '../../../JiraModels';
import JiraSelectField from '../../JiraSelectField';

export default class TeamLeadProductField extends JiraSelectField {
    constructor(id: string, field: JiraMetaField, options: any = { multiple: false }) {
        field.allowedValues = field.allowedValues.sort((a, b) => { return (a.value.toLowerCase() > b.value.toLowerCase()) ? 1 : -1 });
        super(id, field, options);


    }
}