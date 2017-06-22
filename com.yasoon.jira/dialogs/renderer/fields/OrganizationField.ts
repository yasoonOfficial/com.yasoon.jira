/// <reference path="../Field.ts" />
/// <reference path="../FieldController.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.Text)
@setter(SetterType.Option)
class OrganizationField extends Select2Field {
    getOrganizationsPromise: Promise<JiraOrganization[]>;
    serviceDeskController: ServiceDeskController;
    constructor(id: string, field: JiraMetaField, options: Select2Options = {}) {
        options.multiple = true;
        options.allowClear = true;
        super(id, field, options, true);
        this.serviceDeskController = jira.serviceDeskController;
        this.init();
    }

    init() {
        this.getData()
            .then((elements: Select2Element[]) => {
                this.setData(elements);
            });
    }

    getDomValue(): any {
        let values = $('#' + this.id).val() || [];
        return values.map(v => parseInt(v));
    }

    convertToSelect2(obj: JiraOrganization): Select2Element {
        return {
            id: obj.id,
            text: obj.name,
            data: obj
        };
    }

    convertId(id: any): Promise<any> {
        if (id['id']) {
            return Promise.resolve(id);
        } else {
            return this.getOrganizationsPromise
                .then((organizations: JiraOrganization[]) => {
                    return organizations.filter(org => org.id == id)[0];
                });
        }
    }

    async getData() {
        let serviceDeskKey = await this.serviceDeskController.getCurrentServiceDeskKey();
        this.getOrganizationsPromise = jiraGetAll('/rest/servicedeskapi/servicedesk/' + serviceDeskKey.id + '/organization')
            .then((organizations: JiraOrganizationResult) => {
                return organizations.values.sort((a, b) => { return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1 });
            });

        return this.getOrganizationsPromise
            .then((organizations: JiraOrganization[]) => {
                return organizations.map(this.convertToSelect2);
            });

    }

}