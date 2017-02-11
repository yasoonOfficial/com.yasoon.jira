/// <reference path="../definitions/functions.d.ts" />
/// <reference path="../definitions/yasoon.d.ts" />

class JiraIssueAppointment {

    constructor(private issue: any) {
    }

	save() {
		if (!jira.settings.syncCalendar)
			return Promise.resolve();

		if (! this.issue.fields.duedate)
			return Promise.resolve();

		//Check if it's an update or creation
		return jiraGetCalendarItem(this.issue.id)
			.then((dbItem: yasoonModel.CalendarItem) => {
				var creation = false;
				if (!dbItem) {
					//Creation
					creation = true;
					dbItem = { categories: ['Jira',  this.issue.fields.project.name] };
				}

				dbItem.subject =  this.issue.fields.summary;
				dbItem.body =  this.issue. this + ' \n\r ' + ( this.issue.fields.description || '');

				//Even though "normal" js date supports conversion for full dates with timezone,
				// it messes up dates without any time (all day events)

				//CustomField: customfield_10201
				//Estimate: timtracking.remainingEstimateSeconds
				dbItem.endDate = moment( this.issue.fields.duedate).add(17, 'hour').toDate();

				//Calc Startdate
				var startDate = moment( this.issue.fields.duedate).add(16, 'hour').toDate(); //Default 1 hour
				if ( this.issue.fields.timetracking &&  this.issue.fields.timetracking.remainingEstimateSeconds) {
					//Split into full Working days (8 hours) and single hours
					var fullDays = Math.floor( this.issue.fields.timetracking.remainingEstimateSeconds / 28800);
					var hours = ( this.issue.fields.timetracking.remainingEstimateSeconds % 28800) / 3600;
					if (hours > 0) {
						startDate = moment( this.issue.fields.duedate).add((17 - hours), 'hour').subtract(fullDays, 'days').toDate();
					} else {
						startDate = moment( this.issue.fields.duedate).add(9, 'hour').subtract(fullDays - 1, 'days').toDate();
					}
				} else if ( this.issue.fields.customfield_10201) {
					startDate = moment( this.issue.fields.customfield_10201).add(9, 'hour').toDate();
				}
				dbItem.startDate = startDate;

				dbItem.isHtmlBody = false;
				dbItem.externalId =  this.issue.id;

				//Really needed?!
				dbItem.externalData = JSON.stringify( this.issue);
				if (creation)
					return jiraAddCalendarItem(dbItem);
				else
					return jiraSaveCalendarItem(dbItem);
			});
	}
}
