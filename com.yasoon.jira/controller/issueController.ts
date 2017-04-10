/// <reference path="../definitions/common.d.ts" />
/// <reference path="../definitions/moment.d.ts" />

class JiraIssueController {
	issues = [];
	lastStartAt = 0;

	refreshBuffer(query) {
		//Reset Buffer
		this.issues = [];
		var getIssueData = (jql, startAt) => {
			return jiraGet('/rest/api/2/search?jql=' + jql + '&fields=*all&startAt=' + startAt + '&expand=transitions,renderedFields')
				.then((issueData) => {
					//This is one of the first calls. We may have a proxy (like starbucks) returning an XML.
					jiraCheckProxyError(issueData);

					var result = JSON.parse(issueData);
					if (result.issues && result.issues.length > 0) {
						this.issues = this.issues.concat(result.issues);
					}
					if (result.total > (result.maxResults + result.startAt)) {
						return getIssueData(jql, (result.maxResults + result.startAt));
					}
				});
		};

		//Download issues since last sync
		var lastSync = moment(jira.settings.lastSync).format('YYYY/MM/DD HH:mm');
		var jql = '';

		if (!query)
			jql = encodeURIComponent('updated > "' + lastSync + '"');
		else
			jql = encodeURIComponent(query);

		return getIssueData(jql, 0)
			.catch((e) => {
				console.log('Error:', e);
				jiraLog('Refresh Buffer Error:', e);
			});
	}

	async getLastRelevant(numOfEntries: number, loadMore: boolean = false) {
		//Reset Buffer
		let jql = encodeURIComponent('order by updated desc');		
		let relevantIssues = [];
		let result = { total: 0, issues: [] };
		const PAGE_SIZE = 10;
		const MAX_ISSUES = 500;
		let startAt = loadMore ? (this.lastStartAt + numOfEntries) : 0;

		while (relevantIssues.length < numOfEntries) {
			let issueData = <string> await jiraGet('/rest/api/2/search?jql=' + jql + '&fields=id,project,issuetype,creator,reporter,assignee,watches,comment&startAt=' + startAt);
			result = JSON.parse(issueData);

			if (result.issues) {
				for (let i = 0; i < result.issues.length; i++) {
					if (relevantIssues.filter(v => v.id === result.issues[i].id).length > 0)
						continue;

					if (this.isRelevant(result.issues[i]) && (!loadMore || !this.isInFeed(result.issues[i].id))) {
						relevantIssues.push({
							id: result.issues[i].id,
							key: result.issues[i].key
						});
					}

					if (relevantIssues.length >= numOfEntries)
						break;		
				}
			}

			if (relevantIssues.length >= numOfEntries)
				break;

			startAt += PAGE_SIZE;
			if (startAt > result.total || startAt >= MAX_ISSUES)
				break;
		}

		if (startAt > result.total) {
			//Disable more
		}
		else {
			this.lastStartAt = startAt;
		}

		//Fill buffer for relevant issues
		if (relevantIssues.length === 0)
			return [];

		let query = 'id IN (' + relevantIssues.map(i => i.id).join(',') + ')';
		await this.refreshBuffer(query);
		return relevantIssues;
	}

	isInFeed(externalId: string) {
		return yasoon.model.feeds.data().filter(function(e) { return e.externalId === externalId }).length > 0;
	}

	isRelevant(issue) {
		if (issue.fields.issuetype && issue.fields.issuetype.iconUrl.indexOf('ico_epic.png') > -1) {
			return false; //Do not sync Epics
		}
		//Check if Issue is relevant

		//Check if I'm creator , reporter or assignee
		if (issue.fields.creator && issue.fields.creator.name === jira.data.ownUser.name && jira.settings.showFeedCreator) {
			jiraLog('creator equals');
			return true;
		}

		if (issue.fields.reporter && issue.fields.reporter.name === jira.data.ownUser.name && jira.settings.showFeedReporter) {
			jiraLog('reporter equals');
			return true;
		}

		if (issue.fields.assignee && issue.fields.assignee.name === jira.data.ownUser.name && jira.settings.showFeedAssignee) {
			jiraLog('assignee equals');
			return true;
		}

		//Am I watcher?
		if (issue.fields.watches && issue.fields.watches.isWatching && jira.settings.showFeedWatcher) {
			jiraLog('Found in Watchers');
			return true;
		}

		//Is it my own project? --> find project in buffer
		if (jira.data.projects && jira.settings.showFeedProjectLead) {
			var proj = jira.data.projects.filter(project => issue.fields.project.id === project.id)[0];
			if (proj && proj.lead && proj.lead.name === jira.data.ownUser.name) {
				jiraLog('Project Lead equals');
				return true;
			}
		}

		//Did I make a comment or have I been mentioned in a comment?
		if (issue.fields.comment && issue.fields.comment.comments) {
			let found = false;
			issue.fields.comment.comments.forEach((comment) => {
				if (comment.author && comment.author.name === jira.data.ownUser.name && jira.settings.showFeedComment) {
					found = true;
					return false;
				}
				if (comment.body && comment.body.indexOf('[~' + jira.data.ownUser.name + ']') > -1 && jira.settings.showFeedMentioned) {
					found = true;
					return false;
				}
			});

			if (found) {
				return true;
			}
		}

		return false;
	}

	get(id, bypassBuffer) {
		if (!bypassBuffer) {
			var result = this.issues.filter(issue => (issue.id === id || issue.key === id));
			if (result.length > 0) {
				return Promise.resolve(result[0]);
			}
		}
		return jiraGet('/rest/api/2/issue/' + id + '?expand=transitions,renderedFields') //,schema,editmeta,names
			.then((issueData) => {
				var issue = JSON.parse(issueData);

				if (!bypassBuffer)
					this.issues.push(issue);

				return issue;
			});
	};

	all() {
		return this.issues;
	}

	isResolved(issue) {
		if (issue.fields && issue.fields.resolution) {
			return true;
		}
		return false;
	}
}