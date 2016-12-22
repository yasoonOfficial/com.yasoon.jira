class RecentItemController implements IFieldEventHandler {
    static recentIssuesSetting: string = 'recentIssues';
    static recentProjectsSetting: string = 'recentProjects';
    static recentUserSetting: string = 'recentUsers';

    numberRecentIssues: number = 15;
    numberRecentUsers: number = 10;
    numberRecentProjects: number = 5;

    ownUser: JiraUser;

    recentProjects: JiraProject[] = [];
    recentIssues: JiraIssue[] = [];
    recentUsers: JiraUser[] = [];

    constructor(ownUser: JiraUser) {
        FieldController.registerEvent(EventType.AfterSave, this);

        //Load Recent Projects from DB
        let projectsString = yasoon.setting.getAppParameter(RecentItemController.recentProjectsSetting);
        if (projectsString) {
            this.recentProjects = JSON.parse(projectsString);
        }

        //Load Recent Issues from DB
        let issuesString = yasoon.setting.getAppParameter(RecentItemController.recentIssuesSetting);
        if (issuesString) {
            this.recentIssues = JSON.parse(issuesString);
        }

        //Load Recent Users from DB
        let usersString = yasoon.setting.getAppParameter(RecentItemController.recentUserSetting);
        if (usersString) {
            this.recentUsers = JSON.parse(usersString);
        }

        this.ownUser = ownUser;
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.AfterSave) {
            let issue: JiraIssue = JSON.parse(JSON.stringify(newValue.newData));
            //Add Issue to RecentIssues
            this.addRecentIssue(issue);

            //Add Project to RecentProjects
            if (issue.fields && issue.fields['project']) {
                this.addRecentProject(issue.fields['project']);
            }
        }

        return null;
    }

    addRecentProject(project: JiraProject) {
        setTimeout(() => {
            project = this.minifyProject(project);

            //First remove old one
            //Second make sure list is not too long.
            //Third Add newProject at first position
            this.recentProjects = this.recentProjects.filter((i) => { return i.id !== project.id; });
            if (this.recentProjects.length >= this.numberRecentProjects) {
                this.recentProjects = this.recentProjects.slice(1);
            }
            this.recentProjects.unshift(project);

            yasoon.setting.setAppParameter(RecentItemController.recentProjectsSetting, JSON.stringify(this.recentProjects));
        });
    }

    addRecentIssue(issue: JiraIssue): void {
        setTimeout(() => {
            issue = this.minifyIssue(issue);
            //First remove old one
            //Second make sure list is not too long.
            //Third Add NewIssue at first position
            this.recentIssues = this.recentIssues.filter((i) => { return i.id !== issue.id; });
            if (this.recentIssues.length >= this.numberRecentIssues) {
                this.recentIssues = this.recentIssues.slice(1);
            }
            this.recentIssues.unshift(issue);

            yasoon.setting.setAppParameter(RecentItemController.recentIssuesSetting, JSON.stringify(this.recentIssues));
        });

    }

    addRecentUser(user: JiraUser): void {
        if(!user)
            return;
            
        if (user.name === this.ownUser.name)
            return;

        setTimeout(() => {
            user = this.minifyUser(user);

            //First remove old one
            //Second make sure list is not too long.
            //Third Add newUser at first position
            this.recentUsers = this.recentUsers.filter((i) => { return i.name !== user.name; });
            if (this.recentUsers.length >= this.numberRecentUsers) {
                this.recentUsers = this.recentUsers.slice(1);
            }
            this.recentUsers.unshift(user);

            yasoon.setting.setAppParameter(RecentItemController.recentUserSetting, JSON.stringify(this.recentUsers));
        });
    }

    minifyIssue(issue: JiraIssue): JiraIssue {
        //Only takeover summary and project
        let newIssue: JiraIssue = {
            id: issue.id,
            key: issue.key,
            fields: {}
        };

        if (issue.fields && issue.fields['summary']) {
            newIssue.fields['summary'] = issue.fields['summary'];
        }

        if (issue.fields && issue.fields['project']) {
            let project: JiraProject = issue.fields['project'];

            let newProject: JiraProject = {
                id: project.id,
                key: project.key,
                name: project.name,
                projectTypeKey: project.projectTypeKey,
            };

            newIssue.fields['project'] = newProject;
        }

        return newIssue;

    }

    minifyProject(project: JiraProject): JiraProject {
        let newProject: JiraProject = {
            id: project.id,
            key: project.key,
            name: project.name,
            projectTypeKey: project.projectTypeKey
        };

        return newProject;
    }

    minifyUser(user: JiraUser): JiraUser {
        let newUser: JiraUser = {
            key: user.key,
            name: user.name,
            displayName: user.displayName,
            emailAddress: user.emailAddress,
            locale: user.locale
        }

        return newUser;
    }

}