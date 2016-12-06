/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.Option, "name")
@setter(SetterType.Option)
class UserSelectField extends Select2AjaxField implements IFieldEventHandler {
    static reporterDefaultMeta: JiraMetaField = { key: FieldController.onBehalfOfFieldId, get name() { return yasoon.i18n('dialog.behalfOf'); }, required: true, schema: { system: 'user', type: '' } };
    senderUser: JiraUser;
    ownUser: JiraUser;
    currentProject: JiraProject;

    private avatarPath: string;

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options, options.multiple);
        this.ownUser = jira.ownUser;
        this.avatarPath = yasoon.io.getLinkPath('Images/useravatar.png');

        FieldController.registerEvent(EventType.SenderLoaded, this);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type == EventType.SenderLoaded) {
            if (newValue) {
                this.senderUser = newValue;
            }
        } else if (type === EventType.FieldChange && source === FieldController.projectFieldId) {
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
            //TODO
        });
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
            container.append(`<span style="display:block; padding: 5px 0px;">
				            <a href="#${this.id}" class="add-myself-trigger" title="${yasoon.i18n('dialog.addMyselfTitle')}">${yasoon.i18n('dialog.addMyself')}</a>
                        </span>`);
        } else {
            container.append(`<span style="display:block; padding: 5px 0px;">
				            <a href="#${this.id}" class="assign-to-me-trigger" title="${yasoon.i18n('dialog.assignMyselfTitle')}">${yasoon.i18n('dialog.assignMyself')}</a>
                        </span>`);
        }

        if (this.id === "assignee") {
            $('#' + this.id).val('-1').trigger('change');
        }
    }

    convertToSelect2(user: JiraUser) {
        let result: Select2Element = {
            'id': user.name,
            'text': user.displayName
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

            result.push({
                id: 'Suggested',
                text: yasoon.i18n('dialog.suggested'),
                children: suggestions
            });
        }



        return result;
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        let url = '/rest/api/2/user/picker?query=' + searchTerm + '&maxResults=50';
        if (this.id === 'assignee') {
            //Only get assignable users
            url = '/rest/api/2/user/assignable/search?project=' + this.currentProject.key + '&username=' + searchTerm + '&maxResults=50';
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

                return this.getReturnStructure(result);
            });
    }

    getEmptyData(): Promise<Select2Element[]> {
        return Promise.resolve(this.getReturnStructure());
    }
}