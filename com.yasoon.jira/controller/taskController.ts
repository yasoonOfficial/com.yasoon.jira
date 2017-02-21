/// <reference path="../models/issueTask.ts" />

class JiraTaskController {

	requireFullSync = false;

	handleTask(issue, task?) {
		return Promise.resolve()
			.then(() => {
				if (task)
					return task;
				else
					return jiraGetTask(issue.key);
			})
			.then((dbTask) => {
				var taskIssue = new JiraIssueTask(issue);
				if (taskIssue.isSyncNeeded()) {
					return taskIssue.save();
				} else if (dbTask) {
					return jiraRemoveTask(dbTask);
				}
			});
	}

	syncLatestChanges() {
		if (!jira.settings.syncTask)
			return Promise.resolve();

		if (this.requireFullSync) {
			this.requireFullSync = false;
			return this.syncTasks();
		}

		return Promise.resolve().then(() => {
			return jira.issues.all();
		})
			.each((issue) => {
				return this.handleTask(issue)
					.catch((e) => {
						//Do not stop sync on error
					});
			});
	}

	syncTasks(forceSync?: boolean) {
		if (!jira.settings.syncTask) {
			return Promise.resolve();
		}

		var updatedIssues = [];
		var ownIssues = [];
		var ownUserKey = jira.data.ownUser.key || jira.data.ownUser.name; //Depending on version >.<

		var getIssueData = (jql, startAt) => {
			return jiraGet('/rest/api/2/search?jql=' + jql + '&startAt=' + startAt + '&expand=transitions,renderedFields')
				.then((issueData) => {
					//This is one of the first calls. We may have a proxy (like starbucks) returning an XML.
					jiraCheckProxyError(issueData);

					var result = JSON.parse(issueData);
					if (result.issues && result.issues.length > 0) {
						ownIssues = ownIssues.concat(result.issues);
					}
					if (result.total > (result.maxResults + result.startAt)) {
						return getIssueData(jql, (result.maxResults + result.startAt));
					}
				});
		};

		var jql = 'assignee="' + ownUserKey + '" AND status != "resolved" AND status != "closed" AND status != "done" ORDER BY created DESC';

		return getIssueData(jql, 0)
			.then((data) => {
				return ownIssues;
			})
			.each((issue) => {
				return new JiraIssueTask(issue).save(forceSync)
					.then(() => {
						updatedIssues.push(issue.key);
					})
					.catch((e) => {
						yasoon.util.log('Error while updating task' + e);
					});
			})
			.then(() => {
				//Check other way around and look for resolved or reassigned issues
				return jiraAllFolders()
					.each((folder) => {
						return jiraGetFolderTasks(folder.externalId)
							.each((task) => {
								//First check if it has already been updated
								if (updatedIssues.indexOf(task.externalId) > -1)
									return;

								//If we are here, we need to update the issue. it has either been assigned to someone else or it has been resolved
								return jira.issues.get(task.externalId)
									.then((issue) => {
										return jira.tasks.handleTask(issue, task);
									})
									.catch((e) => {
										yasoon.util.log('Error while removing task' + e);
									});
							});
					});

			});
	}
}
