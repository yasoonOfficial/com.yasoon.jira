/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />

@getter(GetterType.Object, "name")
@setter(SetterType.Option)
class UserSelectField extends Select2AjaxField {

    private avatarPath: string;
    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options);
        this.avatarPath = yasoon.io.getLinkPath('Images/useravatar.png');
    }

    hookEventHandler(): void {
        super.hookEventHandler();
        $('#' + this.id + 'field-group').find('.assign-to-me-trigger').click((e) => {
            if (jira.ownUser) {
                this.setValue(jira.ownUser.name);
            }
            e.preventDefault();
        });
    }

    render(container: JQuery): void {
        super.render(container);

        container.append(`<span style="display:block; padding: 5px 0px;">
				        <a href="#${this.id}" class="assign-to-me-trigger" title="${yasoon.i18n('dialog.assignMyselfTitle')}">${yasoon.i18n('dialog.assignMyself')}</a>`);
    }

    private getReturnStructure(users?: any[]) {
        let result = [];
        // 1. Build common suggestion
        let suggestions = [];
        if (this.id === 'assignee') {
            suggestions.push({
                'id': '-1',
                'selected': true,
                'icon': this.avatarPath,
                'text': 'Automatic'
            });
        }

        suggestions.push({
            'id': jira.ownUser.name,
            'iconClass': 'fa fa-user',
            'text': jira.ownUser.displayName
        });

        result.push({
            id: 'Suggested',
            text: yasoon.i18n('dialog.suggested'),
            children: suggestions
        });

        if (users) {
            result.push({
                id: 'Search',
                text: yasoon.i18n('dialog.userSearchResult'),
                children: users
            });
        }

        return result;
    }

    getData(searchTerm: string): Promise<any> {
        let url = '/rest/api/2/user/picker?query=' + searchTerm + '&maxResults=50';
        if (this.id === 'assignee') {
            //Only get assignable users
            url = '/rest/api/2/user/assignable/search?project=' + jira.selectedProject.key + '&username=' + searchTerm + '&maxResults=50';
        }

        return jiraGet(url)
            .then((data: string) => {
                let users = JSON.parse(data);
                //1. Build User Result Array
                let result = [];
                //Yay, change of return structure....
                let userArray = [];
                if (users && users.users && users.users.length > 0) {
                    userArray = users.users;
                } else if (users && users.length > 0) {
                    userArray = users;
                }

                userArray.forEach(function (user) {
                    let u: any = { id: user.name, text: user.displayName };
                    if (user.name === jira.ownUser.name)
                        u.iconClass = 'fa fa-user';
                    if (user.name === jira.senderUser.name)
                        u.iconClass = 'fa fa-envelope';

                    result.push(u);
                });

                return this.getReturnStructure(result);
            });
    }

    getEmptyData(): Promise<any> {
        return Promise.resolve(this.getReturnStructure());
    }
}