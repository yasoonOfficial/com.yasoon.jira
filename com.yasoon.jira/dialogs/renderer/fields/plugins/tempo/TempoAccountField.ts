/// <reference path="../../../Field.ts" />
/// <reference path="../../Select2AjaxField.ts" />
/// <reference path="../../../../../definitions/jquery.d.ts" />
/// <reference path="../../../../../definitions/common.d.ts" />
/// <reference path="../../../../../definitions/bluebird.d.ts" />
/// <reference path="../../../getter/GetTextValue.ts" />
/// <reference path="../../../setter/SetOptionValue.ts" />

@getter(GetterType.Text)
@setter(SetterType.Option)
class TempoAccountField extends Select2Field {

    constructor(id: string, field: JiraMetaField, options: Select2Options = {}) {
        super(id, field, options);
        this.getData()
            .then((elements: Select2Element[]) => {
                this.setData(elements);
            });
    }

    getDomValue(): number {
        let result = $('#' + this.id).val();
        if (result)
            return parseInt(result);

        return null;
    }

    convertToSelect2(obj: any): Select2Element {
        return {
            id: obj.id,
            text: obj.name,
            data: obj
        };
    }

    getData() {
        return Promise.all([
            jiraGet('/rest/tempo-accounts/1/account'),
            jiraGet('/rest/tempo-accounts/1/account/project/' + jira.selectedProject.id)
        ])
            .spread((accountDataString: string, projectAccountsString: string) => {
                let accountData = JSON.parse(accountDataString);
                let projectAccounts = JSON.parse(projectAccountsString);

                let result: Select2Element[] = [];

                if (projectAccounts && projectAccounts.length > 0) {
                    let childs: Select2Element[] = projectAccounts.map(this.convertToSelect2);
                    result.push({
                        id: 'projectAccounts',
                        text: yasoon.i18n('dialog.projectAccounts'),
                        children: childs
                    });
                }

                if (accountData && accountData.length > 0) {
                    accountData = accountData.filter((acc) => { return acc.global; });

                    if (accountData.length > 0) {

                        let accChilds: Select2Element[] = accountData.map(this.convertToSelect2);
                        result.push({
                            id: 'globalAccounts',
                            text: yasoon.i18n('dialog.globalAccounts'),
                            children: accChilds
                        });
                    }
                }
                return result;
            });
    }

}