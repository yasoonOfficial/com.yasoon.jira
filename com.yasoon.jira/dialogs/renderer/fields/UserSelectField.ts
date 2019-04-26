/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.OptionWithCloudSwitch, ["name", "accountId"], [null, null])
@setter(SetterType.Option)
class UserSelectField extends Select2AjaxField implements IFieldEventHandler {
    static reporterDefaultMeta: JiraMetaField = { key: FieldController.onBehalfOfFieldId, get name() { return yasoon.i18n('dialog.behalfOf'); }, required: true, schema: { system: 'user', type: '' } };
    senderUser: JiraUser;
    ownUser: JiraUser;
    currentProject: JiraProject;
    recentItems: RecentItemController;
    allowNew: boolean;
    emailController: EmailController;
    private avatarPath: string;

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options, options.multiple);
        this.ownUser = jira.ownUser;
        this.allowNew = options.allowNew;
        this.avatarPath = yasoon.io.getLinkPath('Images/useravatar.png');

        this.recentItems = jira.recentItems;
        this.emailController = jira.emailController;

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);

        //Init project
        var projectField = <ProjectField>FieldController.getField(FieldController.projectFieldId);
        this.currentProject = projectField.getObjectValue();

        //Init sender user
        if (this.emailController) {
            this.emailController.loadSenderPromise
                .then((senderUser) => {
                    this.senderUser = senderUser;
                });
        }
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange && source === FieldController.projectFieldId) {
            this.currentProject = newValue;
        }

        return null;
    }

    hookEventHandler(): void {
        super.hookEventHandler();
        this.ownContainer.find('.assign-to-me-trigger').click((e) => {
            if (this.ownUser) {
                this.setValue(this.ownUser);
            }
            e.preventDefault();
        });

        this.ownContainer.find('.add-myself-trigger').click((e) => {
            e.preventDefault();

            if (this.ownUser) {
                let currentValues: JiraUser[] = this.getObjectValue() || [];
                if (currentValues.filter((user) => { return user.name === this.ownUser.name; }).length > 0) {
                    //Check if own user is already added
                    return;
                }

                currentValues.push(this.ownUser);
                this.setValue(currentValues);
            }
        });
    }

    //Overwrite:
    triggerValueChange() {
        let lastValue = this.lastValue;

        super.triggerValueChange();

        // Save recent user
        let value = this.getObjectValue();
        if (Array.isArray(value)) {
            let users: JiraUser[] = value;
            let lastUsers: JiraUser[] = lastValue;

            if (!lastUsers || users.length > lastUsers.length) {
                //Only necessary if user was added
                this.recentItems.addRecentUser(users[users.length - 1]);
            }
        } else {
            let user: JiraUser = value;
            this.recentItems.addRecentUser(user);
        }

    }

    render(container: JQuery): void {
        //If assignee, preselect 
        if (this.id === "assignee" && !this.options.data) {
            this.options.data = [{
                id: -1,
                'icon': this.avatarPath,
                'text': 'Automatic'
            }];
        }
        super.render(container);

        if (this.options.multiple) {
            container.append(`<span class="user-select-myself" style="display:block; padding: 5px 0px;">
				            <a href="#${this.id}" class="add-myself-trigger" title="${yasoon.i18n('dialog.addMyselfTitle')}">${yasoon.i18n('dialog.addMyself')}</a>
                        </span>`);
        } else {
            container.append(`<span class="user-select-myself" style="display:block; padding: 5px 0px;">
				            <a href="#${this.id}" class="assign-to-me-trigger" title="${yasoon.i18n('dialog.assignMyselfTitle')}">${yasoon.i18n('dialog.assignMyself')}</a>
                        </span>`);
        }

        if (this.id === "assignee") {
            $('#' + this.id).val('-1').trigger('change');
        }
    }

    convertToSelect2(user: JiraUser) {
        if (jiraIsCloud(jira.settings.baseUrl) && (!user.name || user.name.indexOf('<new>') === -1)) {
            user.name = user.accountId;
            user.key = user.accountId;
        }

        let result: Select2Element = {
            id: user.name || user.accountId,
            text: user.displayName,
            data: user
        };

        if (this.senderUser && user.name == this.senderUser.name) {
            result.iconClass = 'fa fa-envelope';
        }

        if (user.name == this.ownUser.name) {
            result.iconClass = 'fa fa-user';
        }

        return result;
    }

    private getReturnStructure(users?: any[]) {
        let result = [];
        if (users) {
            result.push({
                id: 'Search',
                text: yasoon.i18n('dialog.userSearchResult'),
                children: users
            });
        } else {
            //Build common suggestion
            let suggestions = [];
            if (this.id === 'assignee') {
                suggestions.push({
                    'id': '-1',
                    'icon': this.avatarPath,
                    'text': 'Automatic'
                });
            }

            suggestions.push(this.convertToSelect2(this.ownUser));

            if (this.senderUser) {
                suggestions.push(this.convertToSelect2(this.senderUser));
            }

            if (this.recentItems && this.recentItems.recentUsers) {
                let recentUsers = this.recentItems.recentUsers.map((item) => { return this.convertToSelect2(item); });
                //Only add recentUser if it is not senderUser;
                if (this.senderUser) {
                    recentUsers.forEach((user) => {
                        if (user.id != this.senderUser.name) {
                            suggestions.push(user);
                        }
                    });
                }
            }

            result.push({
                id: 'Suggested',
                text: yasoon.i18n('dialog.suggested'),
                children: suggestions
            });
        }
        return result;
    }

    convertId(user: any): Promise<any> {
        if (!user.displayName) {
            let name: string = (typeof user === 'string') ? user : (user.name || user.accountId);
            return this.getData(name)
                .then((result) => {
                    if (result[0].children[0])
                        return result[0].children[0].data;
                    else {
                        yasoon.util.log('Invalid Username: ' + user, yasoon.util.severity.warning);
                        return null;
                    }
                });
        }
        return Promise.resolve(user);
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        let url = '/rest/api/2/user/picker?query=' + searchTerm + '&maxResults=50';
        if (this.id === 'assignee' && this.currentProject) {
            if (jiraIsCloud(jira.settings.baseUrl)) {
                url = '/rest/api/2/user/assignable/search?project=' + this.currentProject.key + '&query=' + searchTerm + '&maxResults=50';
            } else {
                url = '/rest/api/2/user/assignable/search?project=' + this.currentProject.key + '&username=' + searchTerm + '&maxResults=50';
            }
        }

        return jiraGet(url)
            .then((data: string) => {
                let users = JSON.parse(data);
                //1. Build User Result Array
                let result: Select2Element[] = [];
                //Yay, Jira change of return structure....
                let userArray = [];
                if (users && users.users && users.users.length > 0) {
                    userArray = users.users;
                } else if (users && users.length > 0) {
                    userArray = users;
                }

                userArray.forEach((user) => {
                    result.push(this.convertToSelect2(user));
                });

                if (this.allowNew && searchTerm.indexOf('@') > 0) {
                    result.push(this.convertToSelect2({
                        name: '<new>_' + searchTerm,
                        displayName: searchTerm + ' (new)',
                        emailAddress: searchTerm
                    }));
                }

                return this.getReturnStructure(result);
            });
    }

    getEmptyData(): Promise<Select2Element[]> {
        return Promise.resolve(this.getReturnStructure());
    }
}