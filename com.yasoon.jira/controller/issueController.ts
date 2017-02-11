/// <reference path="../definitions/common.d.ts" />
/// <reference path="../definitions/moment.d.ts" />

class JiraIssueController {
	issues = [];

	refreshBuffer () {
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
		var jql = encodeURIComponent('updated > "' + lastSync + '"');
		return getIssueData(jql, 0)
			.catch((e) => {
				console.log('Error:', e);
				jiraLog('Refresh Buffer Error:', e);
			});
	};

	get (id, bypassBuffer) {
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

	all () {
		return this.issues;
	}

	isResolved(issue) {
		if (issue.fields && issue.fields.resolution) {
			return true;
		}
		return false;
	}
}