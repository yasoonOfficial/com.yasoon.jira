/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
class IssueField extends Select2AjaxField implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.issueFieldId, get name() { return yasoon.i18n('dialog.issue'); }, required: true, schema: { system: 'issue', type: '' } };

    private currentProject: JiraProject;
    private excludeSubtasks: boolean;
    private recentItems: RecentItemController;
    private getProjectIssues: Promise<Select2Element[]>;

    constructor(id: string, field: JiraMetaField, excludeSubtasks: boolean) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectIssue');

        super(id, field, options);

        this.excludeSubtasks = excludeSubtasks;
        this.recentItems = jira.recentItems;

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (source === FieldController.projectFieldId) {
            this.setProject(<JiraProject>newValue);
        }
        return null;

    }

    convertId(issueIdOrKey: string): Promise<any> {
        if (issueIdOrKey) {
            return jiraGet('/rest/api/2/issue/' + issueIdOrKey + '?fields=summary,project')
                .then((data) => {
                    let issue: JiraIssue = JSON.parse(data);
                });
        }
        return Promise.resolve();
    }

    private getReturnStructure(issues?: Select2Element[], queryTerm?: string) {
        let result: Select2Element[] = [];
        // 1. Build recent suggestion
        if (this.recentItems && this.recentItems.recentIssues && !queryTerm) {
            let currentIssues = this.recentItems.recentIssues.map(this.convertToSelect2);
            result.push({
                id: 'Suggested',
                text: yasoon.i18n('dialog.recentIssues'),
                children: currentIssues,
            });
        }
        //2. Search Results
        if (issues) {
            if (queryTerm) {
                result.push({
                    id: 'Search',
                    text: yasoon.i18n('dialog.titleSearchResults', { term: queryTerm }),
                    children: issues
                });
            } else {
                result.push({
                    id: 'Search',
                    text: yasoon.i18n('dialog.projectIssues'),
                    children: issues
                });
            }
        }

        return result;
    }

    queryData(searchTerm: string): Promise<Select2Element[]> {
        //Concat JQL
        let jql = '';

        if (searchTerm) {
            jql += 'key = "' + searchTerm + '" OR ( Summary ~ "' + searchTerm + '"';
        }

        if (this.currentProject) {
            jql += ((jql) ? ' AND' : '') + ' project = "' + this.currentProject.key + '"';
        }

        if (jira.settings.hideResolvedIssues) {
            jql += ((jql) ? ' AND' : '') + ' status != "resolved" AND status != "closed" AND status != "done"';
        }

        if (this.excludeSubtasks) {
            jql += ((jql) ? ' AND' : '') + ' type NOT IN subtaskIssueTypes()';
        }

        //Closing brackets for first Summary
        if (searchTerm) {
            jql += ' )';
        }

        console.log('JQL' + jql);

        return jiraGet('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&maxResults=20&fields=summary,project&validateQuery=false')
            .then((data: string) => {
                let jqlResult: JiraJqlResult = JSON.parse(data);
                let result: Select2Element[] = [];
                console.log(jqlResult);
                //Transform Data
                result = jqlResult.issues.map(this.convertToSelect2);
                return result;
            });
    }

    triggerValueChange() {
        let issue: JiraIssue = this.getObjectValue();
        if ((!this.lastValue && issue) || (this.lastValue && !issue) || (this.lastValue && issue && this.lastValue.id !== issue.id)) {
            FieldController.raiseEvent(EventType.FieldChange, issue, this.id);
            this.lastValue = issue;
        }
    }

    convertToSelect2(issue: JiraIssue): Select2Element {
        return {
            id: issue.id,
            text: issue.fields['summary'] + ' (' + issue.key + ')',
            data: issue
        };
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        return this.queryData(searchTerm)
            .then((result: Select2Element[]) => {
                return this.getReturnStructure(result, searchTerm);
            });
    }

    getEmptyData(): Promise<any> {
        if (this.currentProject) {
            return this.getProjectIssues;
        } else {
            return Promise.resolve(this.getReturnStructure());
        }
    }

    setProject(project: JiraProject): void {
        this.currentProject = project;
        if (this.currentProject) {
            this.getProjectIssues = this.queryData('')
                .then((issues) => {
                    return this.getReturnStructure(issues);
                });
        }
    }
}