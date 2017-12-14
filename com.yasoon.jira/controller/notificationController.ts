/// <reference path="../definitions/jira.d.ts" />
/// <reference path="../definitions/common.d.ts" />
/// <reference path="../definitions/functions.d.ts" />
/// <reference path="../models/issueNotification.ts" />
/// <reference path="../models/issueActionNotification.ts" />

interface JQuery {
	datetimepicker(any): JQuery;
}

class JiraNotificationController {
	notificationCounter = 0;
	notification = null;
	notificationEvent = null;
	queueProcessingRunning = false;
	childQueue = [];
	worklogTemplateLoaded = false;
	worklogTemplate = null;

	handleCommentError(error) {
		var errorMessage = (error.statusCode === 500) ? yasoon.i18n('feed.connectionToJiraNotPossible') : error.errorText;
		yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('feed.couldNotCreateComment') + ': ' + errorMessage });
	}

	handleAttachmentError(error) {
		var errorMessage = (error.statusCode === 500) ? yasoon.i18n('feed.connectionToJiraNotPossible') : error.errorText;
		yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('feed.couldNotUploadAttachments') + ': ' + errorMessage });
	}

	addComment = (parent, comment, successCbk, attachments, errorCbk) => {
		if (!jiraIsLicensed(true)) {
			return errorCbk();
		}
		try {
			//check comment for mention
			comment = comment.replace(/@.*?\]\(user:([^\)]+)\)/g, '[~$1]');
			var body = JSON.stringify({
				"body": comment
			});

			var issue = JSON.parse(parent.externalData);

			return jiraAjax('/rest/api/2/issue/' + issue.key + '/comment', yasoon.ajaxMethod.Post, body)
				.then((data) => {
					successCbk();
					yasoon.feed.allowUpdate(parent.feedId);
					jira.sync();
				})
				.catch((e) => {
					this.handleCommentError(e);
					if (errorCbk)
						errorCbk();
				});
		} catch (e) {
			if (errorCbk)
				errorCbk();

			throw e;
		}

	}

	createNotification(event) {
		var result = null;
		if (event.type) {
			if (event.type === 'issue') {
				result = new JiraIssueNotification(event);
			} else if (event.type === 'IssueAction') {
				result = new JiraIssueActionNotification(event);
			} else if (event.type === 'IssueComment') {
				result = new JiraIssueActionNotification(event);
			}
		} else {
			if (event['activity:target']) {
				if (event['activity:target']['activity:object-type'] && event['activity:target']['activity:object-type']['#text'] === 'http://streams.atlassian.com/syndication/types/issue') {
					result = new JiraIssueActionNotification(event);
				}
			} else if (event['activity:object']) {
				if (event['activity:object']['activity:object-type'] && event['activity:object']['activity:object-type']['#text'] === 'http://streams.atlassian.com/syndication/types/issue') {
					result = new JiraIssueActionNotification(event);
				}
			} else if (event.fields) {
				result = new JiraIssueNotification(event);
			}
		}

		return result;
	}

	addDesktopNotification(notif, event) {
		if (jira.settings.showDesktopNotif && notif.contactId != jira.data.ownUser.key && !this.queueProcessingRunning) {
			yasoon.notification.incrementCounter();
			this.notificationCounter++;
			this.notification = notif;
			this.notificationEvent = event;
		}
	}

	showDesktopNotif() {
		if (!this.notification)
			return;

		var content = "";
		var title = "";

		if (this.notificationCounter === 1) {
			//jiraLog('Single Desktop Notification shown: ', notification);
			var type = '';
			var verbs = [];
			if (this.notificationEvent['activity:object'] && this.notificationEvent['activity:object']['activity:object-type'])
				type = this.notificationEvent['activity:object']['activity:object-type']['#text'];

			if (this.notificationEvent['activity:verb'])
				verbs = this.notificationEvent['activity:verb'].map((el) => { return el['#text']; })

			if (type === 'http://streams.atlassian.com/syndication/types/issue' && verbs.indexOf('http://streams.atlassian.com/syndication/verbs/jira/transition') > -1) {
				var issueSummary = this.notificationEvent['activity:object']['summary']['#text'];
				content = $('<div>' + this.notification.content + ' </div>').text().replace(/\s\s+/g, ' ').replace('- ' + issueSummary, '').replace(/\s\s+/g, ' ');
				title = yasoon.i18n('feed.jiraDesktopNotifTransition', { key: this.notificationEvent.issue.key, title: issueSummary });
				yasoon.notification.showPopup({ title: title, text: content, contactId: this.notification.contactId });
			}
			else if (type === 'http://activitystrea.ms/schema/1.0/comment') {
				content = $('<div>' + this.notification.content + ' </div>').text();
				title = yasoon.i18n('feed.jiraDesktopNotifNewCommentTitle', { key: this.notificationEvent.issue.key, title: this.notificationEvent.issue.fields.summary });
				yasoon.notification.showPopup({ title: title, text: content, contactId: this.notification.contactId });
			}
			else {
				content = $('<div>' + this.notification.title + ' </div>').text().replace(/\s\s+/g, ' ');
				yasoon.notification.showPopup({ title: yasoon.i18n('feed.jiraNewsDesktopNotifTitle'), text: content, contactId: this.notification.contactId });
			}
		}
		else if (this.notificationCounter === 2 && this.notificationEvent && this.notificationEvent.category && this.notificationEvent.category['@attributes'].term === 'created') {
			//Handle the single issue creation case (we want to show a single desktop nofif
			//jiraLog('Single Desktop Notification shown: ', notification);
			content = $('<div>' + this.notification.title + ' </div>').text();
			yasoon.notification.showPopup({ title: yasoon.i18n('feed.jiraNewsDesktopNotifTitle'), text: content, contactId: this.notification.contactId });
		}
		else {
			jiraLog('Multiple Desktop Notification shown!');
			yasoon.notification.showPopup({ title: yasoon.i18n('feed.jiraNewsDesktopNotifTitle'), text: yasoon.i18n('feed.jiraNewsDesktopNotifMultiple') });
		}

		this.notificationCounter = 0;
		this.notification = null;
	};

	queueChildren(issue) {
		if (jira.settings.syncFeed === 'live')
			return;

		var results = $.grep(this.childQueue, (i) => { return issue.key === i.key; });
		if (results.length === 0) {
			//console.log('Queue Child - Add to Array ' + issue.key);
			this.childQueue.push(issue);
		}
	}

	processChildren() {
		//If a new Issue is added, we need to make sure all children are loaded! This is done here via the feed.
		jiraLog('ProcessChildren');
		if (this.childQueue.length === 0) {
			return;
		}

		this.queueProcessingRunning = true;
		return Promise.resolve(this.childQueue)
			.each((entry: any) => {
				return jira.syncStream('/activity?streams=issue-key+IS+' + entry.key, 500)
					.then(() => {
						//Update flag on DB, so we know that children are completely loaded
						var notif = yasoon.notification.getByExternalId(entry.id);
						var data = JSON.parse(notif.externalData);
						data.childrenLoaded = true;
						notif.externalData = JSON.stringify(data);
						//console.log('Queue Successfully processed for: ' + data.key);
						return jiraSaveNotification(notif);
					});
			})
			.then(() => {
				this.queueProcessingRunning = false;
				this.childQueue = [];
			});
	}

	processCommentEdits() {
		/* Editing a comment does not affect the acitivity stream - Jira BUG!
			Issue is open since 2007, so we do not expect a quick fix and we create a workaround.
			We check manually all changed issues and check if update date is newer than last sync
		*/

		/* Second Bug - If you upload files and add a comment this is shown as one entry in the activity stream.
		--> find comments that are not in Database yet and add them manually
		*/


		jiraLog('ProcessComments');
		//Find comments in all chnaged issues that changed since last Sync date
		var issues = jira.issues.all();

		return Promise.resolve(issues)
			.each((issue: any) => {
				if (issue.fields.comment && issue.fields.comment.comments && issue.fields.comment.comments.length > 0) {
					return Promise.resolve(issue.fields.comment.comments)
						.each((comment: any) => {
							var event = null;
							if (new Date(comment.updated) >= jira.settings.lastSync && comment.updated != comment.created) {
								//This is an updated comment --> update
								event = this.createCommentAction(comment, issue);
								return this.createNotification(event).save();
							} else if (new Date(comment.created) >= jira.settings.lastSync) {
								//This is a new comment. It may has been created with attachments --> check if it's already on database
								return jiraGetNotification('c' + comment.id)
									.then((yEvent) => {
										if (!yEvent) {
											event = this.createCommentAction(comment, issue);
											return this.createNotification(event).save();
										}
									});
							}
						});
				}
			});
	}

	renderNotification = (feed) => {
		var event = this.createNotification(JSON.parse(feed.externalData));
		if (event) {
			event.renderBody(feed);
			event.renderTitle(feed);
			event.setProperties(feed);
		}
	}

	createCommentAction(comment, issue) {
		return {
			category: {
				'@attributes': {
					'term': 'comment'
				}
			}, commentId: comment.id,
			issue: issue,
			type: 'IssueComment'
		};
	}

	loadWorklogTemplate(issueKey, issueId, cbk) {
		if (!this.worklogTemplateLoaded) {
			var path = yasoon.io.getLinkPath('templates/addWorklog.js');
			$.getScript(path, (template) => {
				this.worklogTemplateLoaded = true;
				this.worklogTemplate = jira.templates.addWorklog;
				$('body').append(this.worklogTemplate());
				$('#jiraAddWorklog').data('key', issueKey);

				//Create Datetime Picker
				$('#jiraInputDateStarted').datetimepicker({
					allowTimes: [
						//'00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30',
						'07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
						'12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
						//,'20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
					]
				});
				//Selection changed
				$('input[name=jiraOptionsRadios]').change(function () {
					//Make inputFields read-only
					$('#jiraRemainingEstimateSetInput').prop('disabled', true);
					$('#jiraRemainingEstimateReduceInput').prop('disabled', true);

					if ($(this).attr('id') === 'jiraRemainingEstimateSet')
						$('#jiraRemainingEstimateSetInput').prop('disabled', false);

					if ($(this).attr('id') === 'jiraRemainingEstimateReduce')
						$('#jiraRemainingEstimateReduceInput').prop('disabled', false);

				});
				//Submit
				var saveInProgress = false;
				$('#LogWorkSave').click(() => {
					saveInProgress = true;
					$('#LogWorkSave').removeClass('btn-primary').addClass('btn-default');
					//Reset UI states
					$('#jiraAddWorklog').find('form-group').remove('has-error');

					//Check Mandatory fields
					var dataTimeSpent = $('#jiraInputTimeSpent').val();
					var dataWorkStarted = $('#jiraInputDateStarted').val();

					var dataSetTimeInput = $('#jiraRemainingEstimateSetInput').val();
					var dataReduceTimeInput = $('#jiraRemainingEstimateReduceInput').val();
					var dataIssueKey = $('#jiraAddWorklog').data('key');
					var dataOptionValue = $('input[name=jiraOptionsRadios]:checked').val();
					var dataComment = $('#jiraInputComment').val();

					if (!dataWorkStarted) {
						$('#jiraInputDateStarted').closest('.form-group').addClass('has-error');
						return;
					}

					if (!dataTimeSpent) {
						$('#jiraInputTimeSpent').closest('.form-group').addClass('has-error');
						return;
					}

					if (dataOptionValue === 'new' && !dataSetTimeInput) {
						$('#jiraRemainingEstimateSetInput').closest('.form-group').addClass('has-error');
						return;
					}

					if (dataOptionValue === 'manual' && !dataReduceTimeInput) {
						$('#jiraRemainingEstimateReduceInput').closest('.form-group').addClass('has-error');
						return;
					}

					//Parse date --> it's in format YYYY/MM/DD hh:mm --> Date can parse it automcatically
					var dateString = new Date(dataWorkStarted).toISOString();
					//WTF... Jira accepts 2015-09-25T09:56:18.082+0000 but not 2015-09-25T09:56:18Z
					dateString = dateString.replace('Z', '+0000');

					//Set Data
					var data = {
						comment: dataComment,
						timeSpent: $('#jiraInputTimeSpent').val(),
						started: dateString
					};

					//Build url
					var url = '/rest/api/2/issue/' + dataIssueKey + '/worklog?adjustEstimate=' + dataOptionValue;

					if (dataOptionValue === 'new')
						url += '&newEstimate=' + dataSetTimeInput;

					if (dataOptionValue === 'manual')
						url += '&newEstimate=' + dataReduceTimeInput;

					//Dirty dirty dirty
					var token = yasoon.app.enterContext('com.yasoon.jira');
					jiraAjax(url, yasoon.ajaxMethod.Post, JSON.stringify(data))
						.then(() => {
							$('#jiraAddWorklog').modal('hide');
							return jiraGetNotification(issueId);
						})
						.then((notif) => {
							yasoon.feed.allowUpdate(notif.feedId);
							jira.sync();
						})
						.finally(() => {
							$('#LogWorkSave').addClass('btn-primary').removeClass('btn-default');
							saveInProgress = false;
						});
					yasoon.app.leaveContext(token);
				});

				cbk();
			});
		} else {
			$('#jiraAddWorklog').data('key', issueKey);
			//Clear input fields
			$('#jiraInputTimeSpent, #jiraInputDateStarted, #jiraRemainingEstimateSetInput, #jiraRemainingEstimateReduceInput,#jiraInputComment').val('');
			$('input[name=jiraOptionsRadios]').first().prop('checked', true);
			cbk();
		}
	}
}
