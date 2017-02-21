/// <reference path="../../../Field.ts" />
/// <reference path="../../Select2AjaxField.ts" />
/// <reference path="../../../../../definitions/common.d.ts" />
/// <reference path="../../../../../definitions/bluebird.d.ts" />
/// <reference path="../../../getter/GetTextValue.ts" />
/// <reference path="../../../setter/SetOptionValue.ts" />

interface TempoAccount {
    id: number;
    key: string;
    name: string;
    global: boolean;
    contactAvatar?: string;
    status?: string;
    lead?: JiraUser;
    leadAvatar?: string;
}
@getter(GetterType.Text)
@setter(SetterType.Option)
class TempoAccountField extends Select2Field {
    getAccountPromise: Promise<any>;
    constructor(id: string, field: JiraMetaField, options: Select2Options = {}) {
        options.placeholder = yasoon.i18n('dialog.selectNone');
        options.allowClear = true;
        super(id, field, options);
        this.init();
    }

    init() {
        this.getData()
            .then((elements: Select2Element[]) => {
                this.setData(elements);
            });
    }

    convertToSelect2(obj: TempoAccount): Select2Element {
        return {
            id: obj.id.toString(),
            text: obj.name,
            data: obj
        };
    }

    convertId(id: number): Promise<any> {
        return this.getAccountPromise
            .spread((accountData: TempoAccount[], projectAccounts: TempoAccount[]) => {
                let result = accountData.filter(acc => acc.id == id);
                if (result.length === 0) {
                    result = projectAccounts.filter(acc => acc.id == id);
                }
                return result[0];
            });
    }

    getData() {
        this.getAccountPromise = Promise.all([
            jiraGet('/rest/tempo-accounts/1/account'),
            jiraGet('/rest/tempo-accounts/1/account/project/' + jira.selectedProject.id)
        ])
            .spread((accountDataString: string, projectAccountsString: string) => {
                let accountData: TempoAccount[] = JSON.parse(accountDataString);
                let projectAccounts: TempoAccount[] = JSON.parse(projectAccountsString);
                return [accountData, projectAccounts];
            });

        return this.getAccountPromise
            .spread((accountData: TempoAccount[], projectAccounts: TempoAccount[]) => {
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
            })
            .catch(this.handleError);
    }

}