/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />

@getter(GetterType.Object, "name")
@setter(SetterType.Option)
class IssueField extends Select2AjaxField {
    private recentIssues: Select2Element[];
    private excludeSubtasks: boolean;

    constructor(id: string, field: JiraMetaField, excludeSubtasks: boolean) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectIssue');

        super(id, field, options);

        this.excludeSubtasks = excludeSubtasks;

        //Load Recent Issues from DB
        let issuesString = yasoon.setting.getAppParameter('recentIssues');
        if (issuesString) {
            this.recentIssues = JSON.parse(issuesString);
        }

    }

    hookEventHandler() {
        super.hookEventHandler();
        $('#' + this.id).on('select2:select', (evt, data) => {
            //We trigger this event manually in setValue.
            //This leads to different eventData :/
			/*var issue = null;
			if (data) {
				issue = {
					project: data.fields.project,
					id: data.id
				};
			} else if (jira.mode === 'jiraAddCommentDialog' && evt.params && evt.params.data) {
				issue = evt.params.data;
			} else {
				$('.buttons').removeClass('servicedesk');
				$('.buttons').removeClass('no-requesttype');
				return;
			}


			var currentProject = jira.projects.filter(function (p) { return p.id === issue.project.id; })[0];
			if (!currentProject || currentProject.projectTypeKey !== 'service_desk') {
				$('.buttons').removeClass('servicedesk');
				$('.buttons').removeClass('no-requesttype');
				return;
			}

			//We have a service Project... Check if it is a service request
			jiraGet('/rest/servicedeskapi/request/' + issue.id)
				.then(function (data) {
					$('.buttons').addClass('servicedesk');
					$('.buttons').removeClass('no-requesttype');
				})
				.catch(function (e) {
					$('.buttons').addClass('no-requesttype');
					$('.buttons').removeClass('servicedesk');
				});*/
        });
    }

    private getReturnStructure(issues?: Select2Element[], queryTerm?: string) {
        let result: Select2Element[] = [];
        // 1. Build common suggestion
        result.push({
            id: 'Suggested',
            text: yasoon.i18n('dialog.recentIssues'),
            children: this.recentIssues,
        });

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

    getData(searchTerm: string): Promise<any> {
        //Concat JQL
        var jql = '';

        if (searchTerm) {
            jql += 'Summary ~ "' + searchTerm + '"';
        }

        if (jira.selectedProjectKey) {
            jql += ((jql) ? ' AND' : '') + ' project = "' + jira.selectedProjectKey + '"';
        }

        if (jira.settings.hideResolvedIssues) {
            jql += ((jql) ? ' AND' : '') + ' status != "resolved" AND status != "closed" AND status != "done"';
        }

        if (this.excludeSubtasks) {
            jql += ((jql) ? ' AND' : '') + ' type NOT IN subtaskIssueTypes()';
        }

        jql = '( ' + jql + ' )';

        if (searchTerm) {
            jql += 'OR key = "' + searchTerm + '"';
        }

        console.log('JQL' + jql);

        return jiraGet('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&maxResults=20&fields=summary,project&validateQuery=false')
            .then(function (data) {
                if (term === lastQuery) {
                    var jqlResult = JSON.parse(data);
                    var result = [];
                    //Transform Data
                    jqlResult.issues.forEach(function (issue) {
                        result.push({ id: issue.id, text: issue.fields.summary + ' (' + issue.key + ')', key: issue.key, summary: issue.fields.summary, project: issue.fields.project });
                    });

                    console.log('Result for ' + term, result);
                    callback(result);
                }
            })
            .catch(function () {
                if (term === lastQuery) {
                    $('#IssueSpinner').css('display', 'none');
                }
                yasoon.util.log('Couldn\'t find issues for Project' + jira.selectedProjectKey + ' || Term: ' + term, yasoon.util.severity.warning);
                callback([]);
            });
    }

    getEmptyData(): Promise<any> {
        return Promise.resolve(this.getReturnStructure());
    }
}