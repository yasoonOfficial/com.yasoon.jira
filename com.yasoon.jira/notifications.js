function JiraNotificationController() {
	var self = this;
	var notificationCounter = 0;
	var notification = null;
	var notificationEvent = null;
	var queueProcessingRunning = false;
	var childQueue = [];

	self.worklogTemplateLoaded = false;
	self.worklogTemplate = null;

	self.handleCommentError = function (error) {
		var errorMessage = (error.statusCode === 500) ? yasoon.i18n('feed.connectionToJiraNotPossible') : error.errorText;
		yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('feed.couldNotCreateComment') + ': ' + errorMessage });
	};

	self.handleAttachmentError = function (error) {
		var errorMessage = (error.statusCode === 500) ? yasoon.i18n('feed.connectionToJiraNotPossible') : error.errorText;
		yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('feed.couldNotUploadAttachments') + ': ' + errorMessage });
	};

	self.addComment = function addComment(parent, comment, successCbk, attachments, errorCbk) {
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
			.then(function (data) {
				successCbk();
				yasoon.feed.allowUpdate(parent.feedId);
				jira.sync();
			})
			.catch(function () {
				self.handleCommentError();
				if (errorCbk)
					errorCbk();
			});
		} catch (e) {
			if (errorCbk)
				errorCbk();

			throw e;
		}

	};

	self.createNotification = function (event) {
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
	};

	self.addDesktopNotification = function (notif, event) {
		if (jira.settings.showDesktopNotif && notif.contactId != jira.data.ownUser.key && !queueProcessingRunning) {
			yasoon.notification.incrementCounter();
			notificationCounter++;
			notification = notif;
			notificationEvent = event;
		}
	};

	self.showDesktopNotif = function () {
		if (!notification)
			return;
		var content = "";
		if (notificationCounter === 1) {
			//jiraLog('Single Desktop Notification shown: ', notification);
			content = $('<div>' + notification.title + ' </div>').text();
			yasoon.notification.showPopup({ title: yasoon.i18n('feed.jiraNewsDesktopNotifTitle'), text: content, contactId: notification.contactId });
		}
		else if (notificationCounter === 2 && notificationEvent && notificationEvent.category && notificationEvent.category['@attributes'].term === 'created') {
			//Handle the single issue creation case (we want to show a single desktop nofif
			//jiraLog('Single Desktop Notification shown: ', notification);
			content = $('<div>' + notification.title + ' </div>').text();
			yasoon.notification.showPopup({ title: yasoon.i18n('feed.jiraNewsDesktopNotifTitle'), text: content, contactId: notification.contactId });
		}
		else {
			jiraLog('Multiple Desktop Notification shown!');
			yasoon.notification.showPopup({ title: yasoon.i18n('feed.jiraNewsDesktopNotifTitle'), text: yasoon.i18n('feed.jiraNewsDesktopNotifMultiple') });
		}

		notificationCounter = 0;
		notification = null;
	};

	self.queueChildren = function (issue) {
		var results = $.grep(childQueue, function (i) { return issue.key === i.key; });
		if (results.length === 0) {
			//console.log('Queue Child - Add to Array ' + issue.key);
			childQueue.push(issue);
		}
	};

	self.processChildren = function () {
		//If a new Issue is added, we need to make sure all children are loaded! This is done here via the feed.
		jiraLog('ProcessChildren');
		if (childQueue.length === 0) {
			return;
		}

		queueProcessingRunning = true;
		return Promise.resolve(childQueue)
		.each(function (entry) {
			return jira.syncStream('/activity?streams=issue-key+IS+' + entry.key, 500)
			.then(function () {
				//Update flag on DB, so we know that children are completely loaded
				var notif = yasoon.notification.getByExternalId(entry.id);
				var data = JSON.parse(notif.externalData);
				data.childrenLoaded = true;
				notif.externalData = JSON.stringify(data);
				//console.log('Queue Successfully processed for: ' + data.key);
				return jiraSaveNotification(notif);
			});
		})
		.then(function () {
			queueProcessingRunning = false;
			childQueue = [];
		});
	};

	self.processCommentEdits = function () {
		/* Editing a comment does not affect the acitivity stream - JIRA BUG!
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
		.each(function (issue) {
			if (issue.fields.comment && issue.fields.comment.comments && issue.fields.comment.comments.length > 0) {
				return Promise.resolve(issue.fields.comment.comments)
				.each(function (comment) {
					var event = null;
					if (new Date(comment.updated) >= jira.settings.lastSync && comment.updated != comment.created) {
						//This is an updated comment --> update
						event = self.createCommentAction(comment, issue);
						return self.createNotification(event).save();
					} else if (new Date(comment.created) >= jira.settings.lastSync) {
						//This is a new comment. It may has been created with attachments --> check if it's already on database
						return jiraGetNotification('c' + comment.id)
						.then(function (yEvent) {
							if (!yEvent) {
								event = self.createCommentAction(comment, issue);
								return self.createNotification(event).save();
							}
						});
					}
				});
			}
		});
	};

	self.renderNotification = function renderNotification(feed) {
		var event = self.createNotification(JSON.parse(feed.externalData));
		if (event) {
			event.renderBody(feed);
			event.renderTitle(feed);
			event.setProperties(feed);
		}
	};

	self.createCommentAction = function (comment, issue) {
		return {
			category: {
				'@attributes': {
					'term': 'comment'
				}
			}, commentId: comment.id,
			issue: issue,
			type: 'IssueComment'
		};
	};

	self.loadWorklogTemplate = function (issueKey, issueId, cbk) {
		if (!self.templateLoaded) {
			var path = yasoon.io.getLinkPath('templates/addWorklog.hbs.js');
			$.getScript(path, function (template) {
				self.templateLoaded = true;
				self.worklogTemplate = jira.templates.addWorklog;
				$('body').append(self.worklogTemplate());
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
				$('#LogWorkSave').click(function () {
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
					//WTF... JIRA accepts 2015-09-25T09:56:18.082+0000 but not 2015-09-25T09:56:18Z
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
					.then(function () {
						$('#jiraAddWorklog').modal('hide');
						return jiraGetNotification(issueId);
					})
					.then(function (notif) {
						yasoon.feed.allowUpdate(notif.feedId);
						jira.sync();
					})
					.finally(function () {
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
	};
}

function JiraNotification() {
	this.createNotification = function () { };
}

JiraIssueNotification.prototype = new JiraNotification();
function JiraIssueNotification(issue) {
	var self = this;
	var worklogOpenInProgress = false;

	self.issue = issue;

	function isSyncNeeded() {
		var found = false;

		//Do not sync 
		if (jira.settings.syncFeed == 'off')
			return false;

		//Do not sync epics
		if (self.issue.fields.issuetype && self.issue.fields.issuetype.iconUrl.indexOf('ico_epic.png') > -1) {
			return false; //Do not sync Epics
		}
		//Check if Issue is relevant

		//Check if issue exist
		var issue = yasoon.notification.getByExternalId(self.issue.id);
		if (issue) {
			jiraLog('Issue already exist');
			return true;
		}
		//Check if I'm creator , reporter or assignee
		if (self.issue.fields.creator && self.issue.fields.creator.name === jira.data.ownUser.name && jira.settings.showFeedCreator) {
			jiraLog('creator equals');
			return true;
		}

		if (self.issue.fields.reporter && self.issue.fields.reporter.name === jira.data.ownUser.name && jira.settings.showFeedReporter) {
			jiraLog('reporter equals');
			return true;
		}

		if (self.issue.fields.assignee && self.issue.fields.assignee.name === jira.data.ownUser.name && jira.settings.showFeedAssignee) {
			jiraLog('assignee equals');
			return true;
		}

		//Am I watcher?
		if (self.issue.fields.watches && self.issue.fields.watches.isWatching && jira.settings.showFeedWatcher) {
			jiraLog('Found in Watchers');
			return true;
		}

		//Is it my own project? --> find project in buffer
		if (jira.data.projects && jira.settings.showFeedProjectLead) {
			var proj = $.grep(jira.data.projects, function (project) { return self.issue.fields.project.id === project.id; })[0];
			if (proj && proj.lead && proj.lead.name === jira.data.ownUser.name) {
				jiraLog('Project Lead equals');
				return true;
			}
		}

		//Did I make a comment or have I been mentioned in a comment?
		if (self.issue.fields.comment && self.issue.fields.comment.comments) {
			found = false;
			$.each(self.issue.fields.comment.comments, function (i, comment) {
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
				jiraLog('Found in Comments');
				return true;
			}
		}
		return false;
	}

	function searchUser(mode, query, callback) {
		//console.log('Search User');
		jiraGet('/rest/api/2/user/viewissue/search?issueKey=' + self.issue.key + '&projectKey=' + self.issue.fields.project.key + '&maxResults=10&username=' + query)
		.then(function (users) {
			//console.log('Result:',users);
			var data = [];
			users = JSON.parse(users);
			users.forEach(function (user) {
				data.push({ id: user.name, name: user.displayName, type: 'user' });
			});
			callback(data);
		});
	}

	self.renderTitle = function renderTitle(feed) {
		var html = '<span>';
		if (self.issue.fields.priority) {
			var icon = jira.icons.mapIconUrl(self.issue.fields.priority.iconUrl);
			html += '<img style="margin-right: 5px; width: 16px;" src="' + icon + '" /> ';
		}

		html += self.issue.key + ': ' + self.issue.fields.summary + '</span>';
		feed.setTitle(html);
	};

	self.renderBody = function renderBody(feed) {
		//Transform data
		if (self.issue.fields.attachment) {
			$.each(self.issue.fields.attachment, function (i, att) {
				att.fileIcon = yasoon.io.getFileIconPath(att.mimeType);
			});
		}
		//Map known images
		if (self.issue.fields.issuetype) {
			self.issue.fields.issuetype.iconUrl = jira.icons.mapIconUrl(self.issue.fields.issuetype.iconUrl);
		}
		if (self.issue.fields.priority) {
			self.issue.fields.priority.iconUrl = jira.icons.mapIconUrl(self.issue.fields.priority.iconUrl);
		}

		if (self.issue.fields.status) {
			self.issue.fields.status.iconUrl = jira.icons.mapIconUrl(self.issue.fields.status.iconUrl);
		}

		//Get Contacts
		var assignee, creator;
		if (self.issue.fields.assignee)
			assignee = jira.contacts.get(self.issue.fields.assignee.name);
		if (self.issue.fields.creator)
			creator = jira.contacts.get(self.issue.fields.creator.name);

		//Transform Dates
		if (self.issue.renderedFields.duedate)
			self.issue.renderedFields.duedate = moment(new Date(self.issue.fields.duedate)).format('L');
		if (self.issue.renderedFields.resolutiondate)
			self.issue.renderedFields.resolutiondate = moment(new Date(self.issue.fields.resolutiondate)).format('L');

		//Start rendering
		feed.setTemplate('templates/issueNotification.hbs', {
			fields: self.issue.fields,
			renderedFields: self.issue.renderedFields,
			assignee: {
				avatarUrl: (assignee) ? assignee.ImageURL : yasoon.io.getLinkPath('Images\\useravatar.png'),
				displayName: (self.issue.fields.assignee) ? self.issue.fields.assignee.displayName : yasoon.i18n('notification.nobody')
			},
			creator: {
				avatarUrl: (creator) ? creator.ImageURL : yasoon.io.getLinkPath('Images\\useravatar.png'),
				displayName: (self.issue.fields.creator) ? self.issue.fields.creator.displayName : '-'
			},
			baseUrl: jira.settings.baseUrl
		});
	};

	self.setProperties = function setProperties(feed) {
		feed.properties.actionComment = { type: "plain", attachments: false, mentions: searchUser };
		feed.properties.customActions = [];
		feed.properties.customLabels = [{ description: self.issue.fields.project.name, labelColor: '#D87F47', url: jira.settings.baseUrl + '/browse/' + self.issue.fields.project.key }];

		//Add Components
		if (self.issue.fields.components) {
			$.each(self.issue.fields.components, function (i, comp) {
				feed.properties.customLabels.push({ description: comp.name, labelColor: '#0B96AA', url: jira.settings.baseUrl + 'issues/?jql=project+%3D+' + self.issue.fields.project.key + '+AND+component+%3D+' + comp.id });
			});
		}

		//Add Labels
		if (self.issue.fields.labels) {
			$.each(self.issue.fields.labels, function (i, label) {
				feed.properties.customLabels.push({ description: label });
			});
		}

		//Add Actions
		feed.properties.customActions.push(
		{
			description: '<span><i class="fa fa-external-link"></i> ' + yasoon.i18n('notification.openAction') + '</span>',
			url: jira.settings.baseUrl + '/browse/' + self.issue.key
		});

		var changeStatusHtml = '' +
			'<span style="position:relative;">' +
			'   <span class="dropdown-toggle" data-toggle="dropdown">' +
			'       <span><i class="fa fa-sign-in"></i> <span class="transitionChangeLabel">' + yasoon.i18n('notification.setStatusAction') + '</span></span>' +
			'       <span class="caret"></span>' +
			'   </span>' +
			'   <ul class="dropdown-menu" role="menu">';
		$.each(self.issue.transitions, function (i, transition) {
			changeStatusHtml += '<li><a class="jiraStatusChangeLink" data-transition="' + transition.id + '" data-key="' + self.issue.key + '" data-issue-id="' + self.issue.id + '">' + transition.name + '</a></li>';
		});
		changeStatusHtml += '' +
			'   </ul>' +
			'</span>';
		feed.properties.customActions.push({ description: changeStatusHtml, eventHandler: $.noop });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-paperclip"></i> ' + yasoon.i18n('notification.addFileAction') + '</span>', eventHandler: self.addAttachment });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-pencil"></i> ' + yasoon.i18n('notification.editAction') + '</span>', eventHandler: self.editIssue });
		feed.properties.customActions.push({ description: '<span data-key="' + self.issue.key + '" ><i class="fa fa-clock-o"></i> ' + yasoon.i18n('notification.logWorkAction') + '</span>', eventHandler: self.logWork, issueKey: self.issue.key });
		feed.properties.baseUrl = jira.settings.baseUrl;
		feed.setProperties(feed.properties);

		var icon_url = yasoon.io.getLinkPath('Task-03.png');
		//In JIRA 7 issue types icons are svg so we can display them in the feed
		if (jiraIsVersionHigher(jira.sysInfo, '7')) {
			icon_url = jira.icons.mapIconUrl(self.issue.fields.issuetype.iconUrl);
		}
		feed.setIconHtml('<img src="' + icon_url + '" title="' + self.issue.fields.issuetype.name + '" ></i>');
		feed.afterRenderScript(function () {
			$('[data-feed-id=' + feed.feedId + ']').find('.jiraStatusChangeLink').off().click(function () {
				if (!jiraIsLicensed(true)) {
					return;
				}

				var element = $(this);
				//Get all data
				var transitionId = element.data('transition');
				var bodyObj = {
					"transition": {
						"id": transitionId
					}
				};
				var key = element.data('key');
				var id = element.data('issueId');
				var body = JSON.stringify(bodyObj);

				//Show user something is happening...
				$('[data-feed-id=' + feed.feedId + ']').find('.transitionChangeLabel').text(yasoon.i18n('notification.updating')).prop('disabled', true);


				//Get latest transition information
				jiraGet('/rest/api/2/issue/' + key + '/transitions?transitionId=' + transitionId)
				.then(function (data) {
					var transObj = JSON.parse(data);
					if (transObj.transitions[0].hasScreen) {
						yasoon.openBrowser(jira.settings.baseUrl + '/login.jsp?os_destination=' + encodeURIComponent('/secure/CommentAssignIssue!default.jspa?id=' + id + '&action=' + transitionId));
					} else {
						return jiraAjax('/rest/api/2/issue/' + key + '/transitions', yasoon.ajaxMethod.Post, body)
						.then(function () {
							yasoon.feed.allowUpdate(feed.feedId);
							return jira.sync();
						});
					}
				})
				.catch(function (error) {
					var msg = (error.getUserFriendlyError) ? error.getUserFriendlyError() : error;
					yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('notification.changeStatusNotPossible', { error: msg }) });
					yasoon.util.log('Unexpected error in Set Status Feed Action: ' + error, yasoon.util.severity.error, getStackTrace(error));
				})
				.finally(function () {
					$('[data-feed-id=' + feed.feedId + ']').find('.transitionChangeLabel').text(yasoon.i18n('notification.setStatusAction')).prop('disabled', false);
				});
			});

			$('[data-feed-id=' + feed.feedId + ']').find('.jiraFeedExpand').off().click(function () {
				$(this).parents('.body-collapsed').hide();
				$(this).parents('.jiraContainer').find('.body-open').show();
			});

			$('[data-feed-id=' + feed.feedId + ']').find('.jiraFeedClose').off().click(function () {
				$(this).parents('.body-open').hide();
				$(this).parents('.jiraContainer').find('.body-collapsed').show();
			});
		});
	};

	self.save = function save() {
		if (!isSyncNeeded()) {
			return;
		}
		//Save contacts
		if (self.issue.fields.assignee)
			jira.contacts.update(self.issue.fields.assignee);

		if (self.issue.fields.creator)
			jira.contacts.update(self.issue.fields.creator);

		if (self.issue.fields.reporter)
			jira.contacts.update(self.issue.fields.reporter);

		//Download icons if necessary
		if (self.issue.fields.issuetype) {
			jira.icons.addIcon(self.issue.fields.issuetype.iconUrl);
		}
		if (self.issue.fields.priority) {
			jira.icons.addIcon(self.issue.fields.priority.iconUrl);
		}

		return jiraGetNotification(self.issue.id)
		.then(function cbSaveNotif(yEvent) {
			var creation = false;
			if (!yEvent) {
				//New Notification
				yEvent = {};
				creation = true;
			} else if (yEvent.createdAt.getTime() >= new Date(self.issue.fields.updated).getTime()) {
				//not new and no update needed
				return yEvent;
			} else {
				self.issue.childrenLoaded = JSON.parse(yEvent.externalData).childrenLoaded; // Take over childrenLoaded flag from old Entity
			}

			//Description is sometimes an object. WTF?! check for it and log so we can probably figure out what's inside
			var content = yasoon.i18n('notification.noContent');
			if (self.issue.fields.description && typeof self.issue.fields.description != 'string') {
				try {
					yasoon.util.log('Description Object found:' + JSON.stringify(self.issue.fields.description) + ' --> Rendered Description: ' + JSON.stringify(self.issue.renderedFields.description));
				} catch (e) {
					//Should't dump
				}
			} else {
				if (self.issue.fields.description && self.issue.fields.description.trim()) {
					content = self.issue.fields.description.trim();
				}
			}
			yEvent.content = content;
			yEvent.title = self.issue.fields.summary;
			yEvent.type = 1;
			yEvent.createdAt = new Date(self.issue.fields.updated);
			yEvent.contactId = ((self.issue.fields.creator) ? self.issue.fields.creator.name : ((self.issue.fields.reporter) ? self.issue.fields.reporter.name : ''));
			yEvent.externalId = self.issue.id;
			self.issue.type = 'issue';

			/* Clean up data to save DB space */
			yEvent.externalData = JSON.stringify(jiraMinimizeIssue(self.issue));

			jira.filter.addNotif(self.issue);
			if (creation) {
				return jiraAddNotification(yEvent)
				.then(function (newNotif) {
					jira.notifications.queueChildren(self.issue); // Trigger Sync of all children. If successfull it will set childrenLoaded!

					//return newNotif;
					return new JiraIssueAppointment(self.issue).save()
					.then(function () {
						return newNotif;
					});
				});
			} else {
				return jiraSaveNotification(yEvent)
				.then(function (newNotif) {
					if (!self.issue.childrenLoaded)
						jira.notifications.queueChildren(self.issue); // Trigger Sync of all children. If successfull it will set childrenLoaded!

					//return newNotif;
					return new JiraIssueAppointment(self.issue).save()
					.then(function () {
						return newNotif;
					});
				});
			}
		});
	};

	self.addAttachment = function () {
		if (!jiraIsLicensed(true)) {
			return;
		}

		yasoon.view.fileChooser.open(function (selectedFiles) {
			var formData = [];
			jiraLog('Jira: ', selectedFiles);
			$.each(selectedFiles, function (i, file) {
				formData.push({
					type: yasoon.formData.File,
					name: 'file',
					value: file
				});
			});

			jiraAjax('/rest/api/2/issue/' + self.issue.id + '/attachments', yasoon.ajaxMethod.Post, null, formData)
			.then(function () {
				jira.sync();
			})
			.catch(jiraSyncError, jira.notifications.handleAttachmentError);

		});
	};

	self.editIssue = function (callback) {
		if (!jiraIsLicensed(true)) {
			return;
		}

		var cbk = callback || jira.ribbons.ribbonOnCloseNewIssue;
		yasoon.dialog.open({
			width: 725,
			height: 700,
			title: yasoon.i18n('dialog.editJiraIssueDialogTitle'),
			resizable: true,
			htmlFile: 'dialogs/jiraNewEditIssue.html',
			initParameter: {
				'settings': jira.settings,
				'ownUser': jira.data.ownUser,
				'editIssueId': self.issue.id,
				'editProject': self.issue.fields.project,
				'systemInfo': jira.sysInfo
			},
			closeCallback: cbk
		});
	};

	self.logWork = function () {
		if (worklogOpenInProgress)
			return;

		worklogOpenInProgress = true;
		jira.notifications.loadWorklogTemplate(self.issue.key, self.issue.id, self.openLogWorkDialog);
	};

	self.openLogWorkDialog = function () {
		worklogOpenInProgress = false;
		$('#jiraAddWorklog').modal('show');
		$('#jiraAddWorklog').on('shown.bs.modal', function () {
			var contentHeight = $('#jiraAddWorklog').find('.modal-content').height();
			contentHeight = contentHeight - 56 - 74 - 25; //Height of header / footer;
			$('#jiraAddWorklog').find('.modal-body').height(contentHeight);

		});
	};
}

JiraIssueActionNotification.prototype = new JiraNotification();
function JiraIssueActionNotification(event) {
	var self = this;
	self.event = event;

	self.isSyncNeeded = function () {
		return true;
	};

	self.renderBody = function (feed) {
		var html;
		if (self.event.type === 'IssueComment') {
			html = '<span>' + self.event.renderedComment.body + '</span>';
		} else if (self.event.title) {
			html = '<span>' + self.event.title['#text'] + '</span>';
			var title = null;
			if (self.event.content) {
				title = $('<div></div>').html(self.event.content['#text']).text().trim().replace(/>/g, '&gt;');
				if (!title && self.event['activity:object']) {
					if ($.isArray(self.event['activity:object'])) {
						//Can be an array (e.g. if mutiple files has been uploaded at once.
						title = '';
						self.event['activity:object'].forEach(function (elem) {
							if (title)
								title += ', ';

							title += elem.title['#text'].trim();
						});

					} else {
						title = self.event['activity:object'].title['#text'].trim();
					}
				}
			}
			if (title)
				html += '<span class="small yasoon-tooltip" style="cursor:pointer;" data-toggle="tooltip" data-html="true" title="' + title + '">( <i class="fa fa-exclamation-circle"></i> ' + yasoon.i18n('feed.more') + ')</span>';
		} else {
			yasoon.util.log('Coulnd\'t determine title for:' + JSON.stringify(self.event), yasoon.util.severity.error);
		}
		feed.setContent(html);
	};

	self.setProperties = function (feed) {
		var iconHtml = null;
		var obj = JSON.parse(feed.externalData);
		if (obj.category) {
			if (obj.category['@attributes'].term === 'created') {
				iconHtml = '<i class="fa fa-plus-circle" style="color:grey;"></i>';
			} else if (obj.category['@attributes'].term === 'started') {
				iconHtml = '<i class="fa fa-caret-square-o-right" style="color:grey;"></i>';
			} else if (obj.category['@attributes'].term === 'started') {
				iconHtml = '<i class="fa fa-caret-square-o-right" style="color:grey;"></i>';
			}
		}
		if (!iconHtml && obj['activity:verb']) {
			var activityLookup = {};
			//Convert Datatstructure. Can be either a single object or array :(
			if (obj['activity:verb'].length > 1) {
				for (var i = 0, len = obj['activity:verb'].length; i < len; i++) {
					activityLookup[obj['activity:verb'][i]['#text']] = obj['activity:verb'][i];
				}
			} else if (obj['activity:verb'].length === 1) {
				activityLookup[obj['activity:verb']['#text']] = obj['activity:verb'];
			}

			//Now check for value
			if (activityLookup['http://streams.atlassian.com/syndication/verbs/jira/transition']) {
				iconHtml = '<i class="fa fa-cog" style="color:grey;"></i>';
			} else if (activityLookup['http://activitystrea.ms/schema/1.0/update'] && obj['activity:verb'].length === 1) {
				iconHtml = '<i class="fa fa-pencil" style="color:grey;"></i>';
			}
		}

		if (!iconHtml) {
			iconHtml = '<i class="fa fa-info-circle" style="color:grey;"></i>';
		}
		feed.setIconHtml(iconHtml);
	};

	self.renderTitle = function (feed) { };

	self.save = function () {
		return Promise.resolve()
		.then(function () {
			//Get issue
			var issueKey = '';
			if (self.event.type === 'IssueComment')
				issueKey = self.event.issue.id;
			else
				issueKey = (self.event['activity:target']) ? self.event['activity:target'].title['#text'] : self.event['activity:object'].title['#text'];
			return jira.issues.get(issueKey);
		})
		.then(function (issue) {
			self.event.issue = issue;
			if (!self.isSyncNeeded()) {
				return;
			}
			//Save Issue first
			return jira.notifications.createNotification(self.event.issue).save();
		})
		.then(function (notif) {
			if (!notif) {
				return;
			}
			//Save Activity Notification
			var isComment = (self.event.category && self.event.category['@attributes'].term === 'comment');
			var comment = null;
			if (isComment && self.event.issue.fields.comment) {
				comment = $.grep(self.event.issue.fields.comment.comments, function (c) {
					//Fake Action has commentId Attribute
					if (self.event.commentId) {
						return self.event.commentId === c.id;
					} else {
						//Standard ones only have them in the URL!
						return (self.event['activity:object'].link['@attributes'].href.indexOf('comment-' + c.id) > -1);
					}
				})[0];
			}
			//self.event.id can be null :o 
			var externalId = '';
			if (comment && comment.id) {
				externalId = 'c' + comment.id;
			} else if (self.event.id) {
				externalId = self.event.id['#text'];
			} else {
				var logObj = JSON.parse(JSON.stringify(self.event));
				delete logObj.issue;
				yasoon.util.log('Action found that is neither an comment, nor an normal activity:' + JSON.stringify(logObj), yasoon.util.severity.error);
				return;
			}

			return jiraGetNotification(externalId)
			.then(function (yEvent) {
				if (isComment) {
					jiraLog('Save Comment');
					return self.saveComment(yEvent, notif, comment);
				} else {
					jiraLog('Save Action');
					return self.saveAction(yEvent, notif);
				}
			});
		});
	};

	self.saveComment = function (yEvent, parent, comment) {
		var creation = false;
		if (!comment) {
			//Timing Issue! Comment has been retrieved via feed, but not via Rest API.
			yasoon.util.log('Comments inconsistency! Comment retrieved by feed but not via REST API.', yasoon.util.severity.error);
			return;
		}
		jiraLog('Comment Save', { event: yEvent, parent: parent });
		if (!yEvent && parent) {
			//New Notification
			yEvent = {};
			creation = true;
		} else {
			//not new - update needed?
			if (!comment || yEvent.createdAt >= new Date(comment.updated)) {
				return;
			}
		}

		////Update Author
		jira.contacts.update(comment.updateAuthor);

		//Determine Renderd Comment
		var renderedComment = $.grep(self.event.issue.renderedFields.comment.comments, function (c) { return c.id === comment.id; })[0];

		yEvent.parentNotificationId = parent.notificationId;
		yEvent.externalId = 'c' + comment.id;
		//"Render" title for desktop notification
		yEvent.title = yasoon.i18n('notification.commentedOn', {
			name: comment.updateAuthor.displayName,
			text: self.event.issue.fields.summary
		});
		yEvent.content = (renderedComment.body) ? renderedComment.body : yasoon.i18n('notification.noContent');
		yEvent.contactId = comment.updateAuthor.name;
		yEvent.createdAt = new Date(comment.updated);
		yEvent.type = 1;

		yEvent.externalData = JSON.stringify({
			comment: comment,
			renderedComment: renderedComment,
			type: 'IssueComment'
		});
		if (creation) {
			return jiraAddNotification(yEvent)
			.then(function (newNotif) {
				yasoon.notification.incrementCounter();
				jira.notifications.addDesktopNotification(newNotif, self.event);
			});
		} else {
			return jiraSaveNotification(yEvent)
			.then(function (newNotif) {
				yasoon.notification.incrementCounter();
				jira.notifications.addDesktopNotification(newNotif, self.event);
			});
		}
	};

	self.saveAction = function (yEvent, parent) {
		var creation = false;
		if (!yEvent && parent) {
			//New Notification
			yEvent = {};
			creation = true;
		} else if (yEvent.createdAt >= new Date(self.event.updated['#text'])) {
			return;
		}

		//Update Author
		jira.contacts.update({
			displayName: (self.event.author.name) ? self.event.author.name['#text'] : '',
			name: (self.event.author['usr:username']) ? self.event.author['usr:username']['#text'] : '',
			emailAddress: (self.event.author.email) ? self.event.author.email['#text'] : '',
			avatarUrls: { '48x48': ((self.event.author.link && self.event.author.link[1]) ? self.event.author.link[1].href : '') }
		});

		yEvent.parentNotificationId = parent.notificationId;
		yEvent.externalId = self.event.id['#text'];
		yEvent.title = $('<div>' + self.event.title['#text'] + '</div>').text();
		yEvent.content = (yEvent.title) ? yEvent.title : yasoon.i18n('notification.noContent');
		yEvent.createdAt = new Date(self.event.updated['#text']);
		yEvent.type = 2;

		self.event.type = 'IssueAction';

		///* Clear unused data to save DB space*/
		var event = jiraMinimizeIssue(self.event); // Performance Intensive but nessecary. Never change original object
		delete event.issue.fields;
		delete event.issue.renderedFields;
		delete event.issue.transitions;
		delete event.link;

		yEvent.externalData = JSON.stringify(event);
		if (creation) {
			return jiraAddNotification(yEvent)
			.then(function (newNotif) {
				jira.notifications.addDesktopNotification(newNotif, event);
			});
		} else {
			return jiraSaveNotification(yEvent)
			.then(function (newNotif) {
				jira.notifications.addDesktopNotification(newNotif, event);
			});
		}
	};

}

function JiraIssueAppointment(issue) {
	var self = this;
	this.issue = issue;

	this.save = function () {

		if (!jira.settings.syncCalendar)
			return Promise.resolve();

		if (!self.issue.fields.duedate)
			return Promise.resolve();

		//Check if it's an update or creation
		return jiraGetCalendarItem(self.issue.id)
		.then(function (dbItem) {
			var creation = false;
			if (!dbItem) {
				//Creation
				creation = true;
				dbItem = { categories: ['Jira', self.issue.fields.project.name] };
			}

			dbItem.subject = self.issue.fields.summary;
			dbItem.body = self.issue.self + ' \n\r ' + (self.issue.fields.description || '');

			//Even though "normal" js date supports conversion for full dates with timezone,
			// it messes up dates without any time (all day events)

			//CustomField: customfield_10201
			//Estimate: timtracking.remainingEstimateSeconds
			dbItem.endDate = moment(self.issue.fields.duedate).add(17, 'hour').toDate();

			//Calc Startdate
			var startDate = moment(self.issue.fields.duedate).add(16, 'hour').toDate(); //Default 1 hour
			if (self.issue.fields.timetracking && self.issue.fields.timetracking.remainingEstimateSeconds) {
				//Split into full Working days (8 hours) and single hours
				var fullDays = Math.floor(self.issue.fields.timetracking.remainingEstimateSeconds / 28800);
				var hours = (self.issue.fields.timetracking.remainingEstimateSeconds % 28800) / 3600;
				if (hours > 0) {
					startDate = moment(self.issue.fields.duedate).add((17 - hours), 'hour').subtract(fullDays, 'days').toDate();
				} else {
					startDate = moment(self.issue.fields.duedate).add(9, 'hour').subtract(fullDays - 1, 'days').toDate();
				}
			} else if (self.issue.fields.customfield_10201) {
				startDate = moment(self.issue.fields.customfield_10201).add(9, 'hour').toDate();
			}
			dbItem.startDate = startDate;

			dbItem.isHtmlBody = false;
			dbItem.externalId = self.issue.id;

			//Really needed?!
			dbItem.externalData = JSON.stringify(self.issue);
			if (creation)
				return jiraAddCalendarItem(dbItem);
			else
				return jiraSaveCalendarItem(dbItem);
		});
	};
}

function JiraIssueTask(issue) {
	var self = this;
	this.issue = issue;

	this.isSyncNeeded = function isSyncNeeded() {
		if (!jira.settings.syncTask)
			return false;
		if (!self.issue.fields.assignee || jira.data.ownUser.name != self.issue.fields.assignee.name)
			return false;
		if (jira.issues.isResolved(issue) && jira.settings.deleteCompletedTasks)
			return false;
		if (!jira.settings.tasksSyncAllProjects) {
			if(!jira.settings.tasksActiveProjects)
				return false;

			var activeProjects = jira.settings.tasksActiveProjects.split(',');
			if (activeProjects.filter(function (key) { return key == self.issue.fields.project.key; }).length === 0)
				return false;
		}

		return true;
	};

	this.getDbItem = function getDbItem(dbItem) {
		dbItem.externalId = self.issue.key;
		dbItem.subject = self.issue.key + ': ' + self.issue.fields.summary;
		dbItem.body = self.issue.renderedFields.description.replace(/\s*\<br\/\>/g, '<br>'); //jshint ignore:line
		//dbItem.body = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + dbItem.body + '</body></html>';
		dbItem.isHtmlBody = true;
		if (jira.issues.isResolved(self.issue)) {
			dbItem.completionState = yasoon.outlook.task.completionState.Completed;
			dbItem.completionPercent = 100;
		} else if (dbItem.completionState == yasoon.outlook.task.completionState.Completed) {
			//Do not always overwrite the status --> User may have set it to "pending" or similar to track the status
			//Better: Only reset status to NotStarted if it is an old task AND this task was completed
			dbItem.completionState = yasoon.outlook.task.completionState.NotStarted;
			dbItem.completionPercent = 0;
		}

		if (self.issue.fields.duedate) {
			//We need to use momentJS to parse the date correctly
			// Wunderlist JSON contains "2014-04-14"
			// If using new Date(json), this will result in a date:
			//     14.04.2014 00:00 UTC!
			// but we actually need 00:00 local time (moment does that)
			dbItem.dueDate = moment(self.issue.fields.duedate).toDate();
		}
		else {
			dbItem.dueDate = new Date(0);
		}

		if (self.issue.fields.assignee)
			dbItem.owner = self.issue.fields.assignee.displayName;
		else
			delete dbItem.owner;

		dbItem.externalData = JSON.stringify(jiraMinimizeIssue(self.issue));

		return dbItem;

	}

	this.save = function save(forceSync) {
		//Is sync nessecary?
		if (!forceSync && !self.isSyncNeeded())
			return Promise.resolve();

		return jiraGetTask(self.issue.key)
		.then(function (dbItem) {
			//Check if it's an update or creation
			var creation = false;
			if (!dbItem) {
				//Creation
				creation = true;
				dbItem = { categories: ['JIRA'] };
			} else if (!forceSync && self.issue.fields.updated) {
				var oldIssue = JSON.parse(dbItem.externalData);
				if (new Date(oldIssue.fields.updated) >= new Date(self.issue.fields.updated).getTime()) {
					//not new and no update needed
					return dbItem;
				}
			}

			dbItem = self.getDbItem(dbItem);
			
			//Does folder exist?
			return jiraGetFolder(self.issue.fields.project.key)
			.then(function (folder) {
				if (!folder)
					return jiraAddFolder(self.issue.fields.project.key, self.issue.fields.project.name, JSON.stringify(self.issue.fields.project));
			})
			.then(function () {
				if (creation)
					return jiraAddTask(dbItem, self.issue.fields.project.key);
				else
					return jiraSaveTask(dbItem);
			});
		});
	};

	this.saveInspector = function saveInspector(inspectorItem) {
		var item = self.getDbItem({});
		inspectorItem.setSubject(item.subject);
		//inspectorItem.setBody(item.body);
		inspectorItem.setCompletionPercentage(item.completionPercent);
		inspectorItem.setCompletionState(item.completionState);
		inspectorItem.setOwner(item.owner);
		inspectorItem.setDueDate(new Date(item.dueDate));
		inspectorItem.setExternalData(item.externalData);

		inspectorItem.save(function () { }, function () { });
	};
}

function JiraIssueController() {
	var self = this;
	var issues = [];

	self.refreshBuffer = function () {
		//Reset Buffer
		issues = [];
		var getIssueData = function (jql, startAt) {
			return jiraGet('/rest/api/2/search?jql=' + jql + '&fields=*all&startAt=' + startAt +'&expand=transitions,renderedFields')
			.then(function (issueData) {
				//This is one of the first calls. We may have a proxy (like starbucks) returning an XML.
				jiraCheckProxyError(issueData);

				var result = JSON.parse(issueData);
				if (result.issues && result.issues.length > 0) {
					issues = issues.concat(result.issues);
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
		.catch(function (e) {
			console.log('Error:', e);
			jiraLog('Refresh Buffer Error:', e);
		});
	};

	self.get = function (id, bypassBuffer) {
		if (!bypassBuffer) {
			var result = $.grep(issues, function (issue) { return (issue.id === id || issue.key === id); });
			if (result.length > 0) {
				return Promise.resolve(result[0]);
			}
		}
		return jiraGet('/rest/api/2/issue/' + id + '?expand=transitions,renderedFields') //,schema,editmeta,names
		.then(function (issueData) {
			var issue = JSON.parse(issueData);

			if(!bypassBuffer)
				issues.push(issue);

			return issue;
		});
	};

	self.all = function () {
		return issues;
	};

	self.isResolved = function isResolved(issue) {
		if(issue.fields && issue.fields.resolution) {
			return true;
		}
		return false;
	};
}

function JiraTaskController() {
	var self = this;
	this.requireFullSync = false;

	this.handleTask = function handleTask(issue, task) {
		return Promise.resolve()
		.then(function () {
			if (task)
				return task;
			else
				return jiraGetTask(issue.key);
		})
		.then(function (dbTask) {
			var taskIssue = new JiraIssueTask(issue);
			if (taskIssue.isSyncNeeded()) {
				return taskIssue.save();
			} else if(dbTask){
				return jiraRemoveTask(dbTask);
			}
		});
	};

	this.syncLatestChanges = function () {
		if (!jira.settings.syncTask)
			return Promise.resolve();

		if (self.requireFullSync) {
			self.requireFullSync = false;
			return self.syncTasks();
		}

		return Promise.resolve().then(function () {
			return jira.issues.all();
		})
		.each(function (issue) {
			return self.handleTask(issue)
			.catch(function (e) {
				//Do not stop sync on error

			});
		});
	};

	this.syncTasks = function (forceSync) {
		if (!jira.settings.syncTask) {
			return Promise.resolve();
		}

		var updatedIssues = [];
		var ownIssues = [];
		var ownUserKey = jira.data.ownUser.key || jira.data.ownUser.name; //Depending on version >.<

		var getIssueData = function (jql, startAt) {
			return jiraGet('/rest/api/2/search?jql=' + jql + '&startAt=' + startAt + '&expand=transitions,renderedFields')
			.then(function (issueData) {
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
		.then(function (data) {
			return ownIssues;
		})
		.each(function (issue) {
			return new JiraIssueTask(issue).save(forceSync)
			.then(function () {
				updatedIssues.push(issue.key);
			})
			.catch(function (e) {
				yasoon.util.log('Error while updating task' + e);
			});
		})
		.then(function () {
			//Check other way around and look for resolved or reassigned issues
			return jiraAllFolders()
			.each(function (folder) {
				return jiraGetFolderTasks(folder.externalId)
				.each(function (task) {
					//First check if it has already been updated
					if (updatedIssues.indexOf(task.externalId) > -1)
						return;

					//If we are here, we need to update the issue. it has either been assigned to someone else or it has been resolved
					return jira.issues.get(task.externalId)
					.then(function (issue) {
						return jira.tasks.handleTask(issue, task);
					})
					.catch(function (e) {
						yasoon.util.log('Error while removing task' + e);
					});
				});
			});

		});
	};
}
//@ sourceURL=http://Jira/notifications.js