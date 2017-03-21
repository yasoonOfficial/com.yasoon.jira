declare var jira;
import { FieldController } from '../FieldController';
import { IFieldEventHandler, UiActionEventData } from '../Field';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType, EventType } from '../Enumerations';
import { Select2AjaxField } from './Select2AjaxField';
import { RecentItemController } from '../RecentItemController';
import { EmailController } from '../EmailController';
import { Select2Element, Select2Options } from './Select2Field';
import { JiraIconController } from '../IconController';
import { JiraMetaField, JiraProject, JiraJqlResult, JiraIssue, JiraIssueType } from '../JiraModels';
import { AjaxService } from '../../AjaxService';

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
export default class IssueField extends Select2AjaxField implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.issueFieldId, get name() { return yasoon.i18n('dialog.issue'); }, required: true, schema: { system: 'issue', type: '' } };

    private currentProject: JiraProject;
    private excludeSubtasks: boolean;
    private recentItems: RecentItemController;
    private getProjectIssues: Promise<Select2Element[]>;
    private emailController: EmailController;

    constructor(id: string, field: JiraMetaField, params: any = { excludeSubtasks: false, multiple: false }) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectIssue');

        //We want an own SelectionRenderer if multiple issues can be selected... Else the whole title is displayed, which just sucks
        if (params.multiple) {
            options.templateSelection = IssueField.formatIssue;
        }
        super(id, field, options, params.multiple);

        this.excludeSubtasks = params.excludeSubtasks;
        this.recentItems = jira.recentItems;
        this.emailController = jira.emailController;
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (source === FieldController.projectFieldId) {
            this.setProject(<JiraProject>newValue);
            this.setDefaultIssue();
        }
        return null;

    }

    setDefaultIssue() {
        if (jira.issue) {
            this.setValue(jira.issue.id);
            return;
        }

        //If mail is provided && subject contains reference to issue, pre-select that
        if (this.emailController) {
            let convData = this.emailController.getConversationData();

            if (convData) {
                //Try to find issue key that is in selected project
                for (let id in convData.issues) {
                    if (convData.issues[id].projectId === this.currentProject.id) {
                        this.setValue(convData.issues[id].key);
                        return;
                    }
                }
            }
            let subject = this.emailController.mail.subject;
            if (subject) {
                //Try to extract issue key from subject
                var regEx = new RegExp(this.currentProject.key + '.[0-9]+', 'g');
                var match = regEx.exec(subject);

                if (match && match.length > 0) {
                    this.setValue(match[0]);
                    return;
                }
            }
        }
    }

    convertId(issueIdOrKey: string): Promise<any> {
        if (issueIdOrKey) {
            return AjaxService.get('/rest/api/2/issue/' + issueIdOrKey + '?fields=summary,project')
                .then((data) => {
                    return <JiraIssue>JSON.parse(data);
                });
        }
        return Promise.resolve();
    }

    private getReturnStructure(issues?: Select2Element[], queryTerm?: string) {
        let result: Select2Element[] = [];
        //There are search results
        if (issues) {
            //If it has been a real search, we do not want to show any recent items
            if (queryTerm) {
                result.push({
                    id: 'Search',
                    text: yasoon.i18n('dialog.titleSearchResults', { term: queryTerm }),
                    children: issues
                });
            } else {
                //In case the project has been selected, only show recent Items of the same project
                var projectIssues = this.recentItems.recentIssues.filter((issue) => {
                    return (issue.fields && issue.fields['project'] && issue.fields['project'].key == this.currentProject.key);
                });

                if (projectIssues.length > 0) {
                    result.push({
                        id: 'Suggested',
                        text: yasoon.i18n('dialog.recentIssues'),
                        children: projectIssues.map(this.convertToSelect2),
                    });
                }
                result.push({
                    id: 'Search',
                    text: yasoon.i18n('dialog.projectIssues'),
                    children: issues
                });
            }
        } else {
            // Only show recent suggestion
            if (this.recentItems && this.recentItems.recentIssues && !queryTerm) {
                let currentIssues = this.recentItems.recentIssues.map(this.convertToSelect2);
                result.push({
                    id: 'Suggested',
                    text: yasoon.i18n('dialog.recentIssues'),
                    children: currentIssues,
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

        return AjaxService.get('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&maxResults=20&fields=summary,project,issuetype&validateQuery=false')
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

    convertToSelect2(this: null, issue: JiraIssue): Select2Element {
        let text = issue.key;
        let icon = null;
        if (issue.fields && issue.fields['summary']) {
            text = issue.fields['summary'] + ' (' + issue.key + ')';
        }
        if (issue.fields && issue.fields['issuetype']) {
            var issuetype: JiraIssueType = issue.fields['issuetype'];
            icon = JiraIconController.mapIconUrl(issuetype.iconUrl);
        }

        return {
            id: issue.id,
            text: text,
            icon: icon,
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


    static formatIssue(element: Select2Element): string | JQuery {
        if (!element.id) return element.text; // optgroup

        if (element.icon) {
            return $('<span><img class="select2-icon-size select2-icon-margin" src="' + element.icon + '"  onerror="jiraHandleImageFallback(this)"/>' + element.data.key + '</span>');
        } else {
            return element.data.key;
        }

    }
}