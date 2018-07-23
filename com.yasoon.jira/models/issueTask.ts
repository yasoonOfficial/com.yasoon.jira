/// <reference path="../definitions/yasoon.d.ts" />

class JiraIssueTask {

	constructor(private issue: any) {
	}

	isSyncNeeded() {
		if (!jira.settings.syncTask)
			return false;
		if (!this.issue.fields.assignee || jira.data.ownUser.name != this.issue.fields.assignee.name)
			return false;
		if (jira.issues.isResolved(this.issue) && jira.settings.deleteCompletedTasks)
			return false;
		if (!jira.settings.tasksSyncAllProjects) {
			if (!jira.settings.tasksActiveProjects)
				return false;

			var activeProjects = jira.settings.tasksActiveProjects.split(',');
			if (activeProjects.filter((key) => { return key == this.issue.fields.project.key; }).length === 0)
				return false;
		}

		return true;
	}

	getDbItem(dbItem) {
		dbItem.externalId = this.issue.key;
		dbItem.subject = this.issue.key + ': ' + this.issue.fields.summary;
		dbItem.body = this.issue.renderedFields.description.replace(/\s*\<br\/\>/g, '<br>'); //jshint ignore:line
		//dbItem.body = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + dbItem.body + '</body></html>';
		dbItem.isHtmlBody = true;
		if (jira.issues.isResolved(this.issue)) {
			dbItem.completionState = yasoon.outlook.task.completionState.Completed;
			dbItem.completionPercent = 100;
		} else if (dbItem.completionState == yasoon.outlook.task.completionState.Completed) {
			//Do not always overwrite the status --> User may have set it to "pending" or similar to track the status
			//Better: Only reset status to NotStarted if it is an old task AND this task was completed
			dbItem.completionState = yasoon.outlook.task.completionState.NotStarted;
			dbItem.completionPercent = 0;
		}

		let startDateField = jira.settings['customTaskStartDate'];
		if (startDateField && this.issue.fields[startDateField]) {
			dbItem.startDate = moment(this.issue.fields[startDateField]).toDate();
		}

		let reminderDateField = jira.settings['customTaskReminderDate'];
		if (reminderDateField && this.issue.fields[reminderDateField]) {
			dbItem.reminderDate = moment(this.issue.fields[reminderDateField]).toDate();
		}

		let dueDateField = jira.settings['customTaskEndDate'] || 'duedate';
		if (this.issue.fields[dueDateField]) {
			//We need to use momentJS to parse the date correctly
			// Wunderlist JSON contains "2014-04-14"
			// If using new Date(json), this will result in a date:
			//     14.04.2014 00:00 UTC!
			// but we actually need 00:00 local time (moment does that)
			dbItem.dueDate = moment(this.issue.fields.duedate).toDate();
		}
		else {
			dbItem.dueDate = new Date(0);
		}

		if (this.issue.fields.assignee)
			dbItem.owner = this.issue.fields.assignee.displayName;
		else
			delete dbItem.owner;

		dbItem.externalData = JSON.stringify(jiraMinimizeIssue(this.issue));

		return dbItem;

	}

	save(forceSync?: boolean) {
		//Is sync nessecary?
		if (!forceSync && !this.isSyncNeeded())
			return Promise.resolve();

		return jiraGetTask(this.issue.key)
			.then((dbItem) => {
				//Check if it's an update or creation
				var creation = false;
				if (!dbItem) {
					//Creation
					creation = true;
					dbItem = { categories: ['Jira'] };
				} else if (!forceSync && this.issue.fields.updated) {
					var oldIssue = JSON.parse(dbItem.externalData);
					if (new Date(oldIssue.fields.updated).getTime() >= new Date(this.issue.fields.updated).getTime()) {
						//not new and no update needed
						return dbItem;
					}
				}

				dbItem = this.getDbItem(dbItem);

				//Does folder exist?
				return jiraGetFolder(this.issue.fields.project.key)
					.then((folder) => {
						if (!folder)
							return jiraAddFolder(this.issue.fields.project.key, this.issue.fields.project.name, JSON.stringify(this.issue.fields.project));
					})
					.then(() => {
						if (creation)
							return jiraAddTask(dbItem, this.issue.fields.project.key);
						else
							return jiraSaveTask(dbItem);
					});
			});
	}

	saveInspector(inspectorItem) {
		var item = this.getDbItem({});
		inspectorItem.setSubject(item.subject);
		//inspectorItem.setBody(item.body);
		inspectorItem.setCompletionPercentage(item.completionPercent);
		inspectorItem.setCompletionState(item.completionState);
		inspectorItem.setOwner(item.owner);
		inspectorItem.setDueDate(new Date(item.dueDate));
		inspectorItem.setExternalData(item.externalData);

		inspectorItem.save(function () { }, function () { });
	}
}