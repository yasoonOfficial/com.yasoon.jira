/// <reference path="notification.ts" />
/// <reference path="../definitions/common.d.ts" />
/// <reference path="../definitions/moment.d.ts" />
/// <reference path="../definitions/bootstrap.ts" />
/// <reference path="../definitions/yasoon.d.ts" />
/// <reference path="issueAppointment.ts" />

declare var jira: any;

class JiraIssueNotification extends JiraNotification {
	worklogOpenInProgress = false;

	constructor(private issue: any) {
		super();
	}

	isSyncNeeded() {
		var found = false;

		//Do not sync 
		if (jira.settings.syncFeed == 'off')
			return false;

		//Do not sync epics
		if (this.issue.fields.issuetype && this.issue.fields.issuetype.iconUrl.indexOf('ico_epic.png') > -1) {
			return false; //Do not sync Epics
		}
		//Check if Issue is relevant

		//Check if issue exist
		var issue = yasoon.notification.getByExternalId(this.issue.id);
		if (issue) {
			jiraLog('Issue already exist');
			return true;
		}
		//Check if I'm creator , reporter or assignee
		if (this.issue.fields.creator && this.issue.fields.creator.name === jira.data.ownUser.name && jira.settings.showFeedCreator) {
			jiraLog('creator equals');
			return true;
		}

		if (this.issue.fields.reporter && this.issue.fields.reporter.name === jira.data.ownUser.name && jira.settings.showFeedReporter) {
			jiraLog('reporter equals');
			return true;
		}

		if (this.issue.fields.assignee && this.issue.fields.assignee.name === jira.data.ownUser.name && jira.settings.showFeedAssignee) {
			jiraLog('assignee equals');
			return true;
		}

		//Am I watcher?
		if (this.issue.fields.watches && this.issue.fields.watches.isWatching && jira.settings.showFeedWatcher) {
			jiraLog('Found in Watchers');
			return true;
		}

		//Is it my own project? --> find project in buffer
		if (jira.data.projects && jira.settings.showFeedProjectLead) {
			var proj = jira.data.projects.filter(project => this.issue.fields.project.id === project.id)[0];
			if (proj && proj.lead && proj.lead.name === jira.data.ownUser.name) {
				jiraLog('Project Lead equals');
				return true;
			}
		}

		//Did I make a comment or have I been mentioned in a comment?
		if (this.issue.fields.comment && this.issue.fields.comment.comments) {
			found = false;
			this.issue.fields.comment.comments.forEach((comment) => {
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

	searchUser(mode, query, callback) {
		//console.log('Search User');
		jiraGet('/rest/api/2/user/viewissue/search?issueKey=' + this.issue.key + '&projectKey=' + this.issue.fields.project.key + '&maxResults=10&username=' + query)
			.then((userJson) => {
				//console.log('Result:',users);
				var data = [];
				let users = JSON.parse(userJson);
				users.forEach((user) => {
					data.push({ id: user.name, name: user.displayName, type: 'user' });
				});
				callback(data);
			});
	}

	renderTitle(feed) {
		var html = '<span>';
		if (this.issue.fields.priority) {
			var icon = jira.icons.mapIconUrl(this.issue.fields.priority.iconUrl);
			html += '<img style="margin-right: 5px; width: 16px;" src="' + icon + '" /> ';
		}

		html += this.issue.key + ': ' + this.issue.fields.summary + '</span>';
		feed.setTitle(html);
	}

	renderBody(feed) {
		//Transform data
		if (this.issue.fields.attachment) {
			this.issue.fields.attachment.forEach((att) => {
				att.fileIcon = yasoon.io.getFileIconPath(att.mimeType);
			});
		}
		//Map known images
		if (this.issue.fields.issuetype) {
			this.issue.fields.issuetype.iconUrl = jira.icons.mapIconUrl(this.issue.fields.issuetype.iconUrl);
		}
		if (this.issue.fields.priority) {
			this.issue.fields.priority.iconUrl = jira.icons.mapIconUrl(this.issue.fields.priority.iconUrl);
		}

		if (this.issue.fields.status) {
			this.issue.fields.status.iconUrl = jira.icons.mapIconUrl(this.issue.fields.status.iconUrl);
		}

		//Get Contacts
		var assignee, creator;
		if (this.issue.fields.assignee)
			assignee = jira.contacts.get(this.issue.fields.assignee.name);
		if (this.issue.fields.creator)
			creator = jira.contacts.get(this.issue.fields.creator.name);

		//Transform Dates
		if (this.issue.renderedFields.duedate)
			this.issue.renderedFields.duedate = moment(new Date(this.issue.fields.duedate)).format('L');
		if (this.issue.renderedFields.resolutiondate)
			this.issue.renderedFields.resolutiondate = moment(new Date(this.issue.fields.resolutiondate)).format('L');

		//Start rendering
		feed.setTemplate('templates/issueNotification.handlebars', {
			fields: this.issue.fields,
			renderedFields: this.issue.renderedFields,
			assignee: {
				avatarUrl: (assignee) ? assignee.ImageURL : yasoon.io.getLinkPath('Images\\useravatar.png'),
				displayName: (this.issue.fields.assignee) ? this.issue.fields.assignee.displayName : yasoon.i18n('notification.nobody')
			},
			creator: {
				avatarUrl: (creator) ? creator.ImageURL : yasoon.io.getLinkPath('Images\\useravatar.png'),
				displayName: (this.issue.fields.creator) ? this.issue.fields.creator.displayName : '-'
			},
			baseUrl: jira.settings.baseUrl
		});
	}

	setProperties(feed) {
		feed.properties.actionComment = { type: "plain", attachments: false, mentions: this.searchUser };
		feed.properties.customActions = [];
		feed.properties.customLabels = [{ description: this.issue.fields.project.name, labelColor: '#D87F47', url: jira.settings.baseUrl + '/browse/' + this.issue.fields.project.key }];

		//Add Components
		if (this.issue.fields.components) {
			this.issue.fields.components.forEach((comp) => {
				feed.properties.customLabels.push({ description: comp.name, labelColor: '#0B96AA', url: jira.settings.baseUrl + '/issues/?jql=project+%3D+' + this.issue.fields.project.key + '+AND+component+%3D+' + comp.id });
			});
		}
		//Add Labels
		if (this.issue.fields.labels) {
			this.issue.fields.labels.forEach((label) => {
				feed.properties.customLabels.push({ description: label });
			});
		}

		//Add Actions
		feed.properties.customActions.push(
			{
				description: '<span><i class="fa fa-external-link"></i> ' + yasoon.i18n('notification.openAction') + '</span>',
				url: jira.settings.baseUrl + '/browse/' + this.issue.key
			});

		var changeStatusHtml = '' +
			'<span style="position:relative;">' +
			'   <span class="dropdown-toggle" data-toggle="dropdown">' +
			'       <span><i class="fa fa-sign-in"></i> <span class="transitionChangeLabel">' + yasoon.i18n('notification.setStatusAction') + '</span></span>' +
			'       <span class="caret"></span>' +
			'   </span>' +
			'   <ul class="dropdown-menu" role="menu">';
		this.issue.transitions.forEach((transition) => {
			changeStatusHtml += '<li><a class="jiraStatusChangeLink" data-transition="' + transition.id + '" data-key="' + this.issue.key + '" data-issue-id="' + this.issue.id + '">' + transition.name + '</a></li>';
		});
		changeStatusHtml += '' +
			'   </ul>' +
			'</span>';
		feed.properties.customActions.push({ description: changeStatusHtml, eventHandler: () => { } });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-paperclip"></i> ' + yasoon.i18n('notification.addFileAction') + '</span>', eventHandler: this.addAttachment });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-pencil"></i> ' + yasoon.i18n('notification.editAction') + '</span>', eventHandler: this.editIssue });
		feed.properties.customActions.push({ description: '<span data-key="' + this.issue.key + '" ><i class="fa fa-clock-o"></i> ' + yasoon.i18n('notification.logWorkAction') + '</span>', eventHandler: this.logWork, issueKey: this.issue.key });
		feed.properties.baseUrl = jira.settings.baseUrl;
		feed.setProperties(feed.properties);

		var icon_url = yasoon.io.getLinkPath('Task-03.png');
		//In JIRA 7 issue types icons are svg so we can display them in the feed
		if (jiraIsVersionHigher(jira.sysInfo, '7')) {
			icon_url = jira.icons.mapIconUrl(this.issue.fields.issuetype.iconUrl);
		}
		feed.setIconHtml('<img src="' + icon_url + '" title="' + this.issue.fields.issuetype.name + '" ></i>');
		feed.afterRenderScript(() => {
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
					.then((data) => {
						var transObj = JSON.parse(data);
						if (transObj.transitions && transObj.transitions.length === 0) {
							yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('notification.changeStatusNotPossible', { error: 'Transition does not exist in current context anymore! Refresh the feed.' }) });
							yasoon.util.log('Transition not found for transition Id ' + transitionId + ' || ' + JSON.stringify(transObj), yasoon.util.severity.warning);
							return;
						}

						if (transObj.transitions[0].hasScreen) {
							yasoon.openBrowser(jira.settings.baseUrl + '/login.jsp?os_destination=' + encodeURIComponent('/secure/CommentAssignIssue!default.jspa?id=' + id + '&action=' + transitionId));
						} else {
							return jiraAjax('/rest/api/2/issue/' + key + '/transitions', yasoon.ajaxMethod.Post, body)
								.then(() => {
									yasoon.feed.allowUpdate(feed.feedId);
									return jira.sync();
								});
						}
					})
					.catch((error) => {
						var msg = (error.getUserFriendlyError) ? error.getUserFriendlyError() : error;
						yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('notification.changeStatusNotPossible', { error: msg }) });
						yasoon.util.log('Unexpected error in Set Status Feed Action: ' + error, yasoon.util.severity.error, getStackTrace(error));
					})
					.finally(() => {
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
	}

	save() {
		if (!this.isSyncNeeded()) {
			return;
		}
		//Save contacts
		if (this.issue.fields.assignee)
			jira.contacts.update(this.issue.fields.assignee);

		if (this.issue.fields.creator)
			jira.contacts.update(this.issue.fields.creator);

		if (this.issue.fields.reporter)
			jira.contacts.update(this.issue.fields.reporter);

		//Download icons if necessary
		if (this.issue.fields.issuetype) {
			jira.icons.addIcon(this.issue.fields.issuetype.iconUrl);
		}
		if (this.issue.fields.priority) {
			jira.icons.addIcon(this.issue.fields.priority.iconUrl);
		}

		return jiraGetNotification(this.issue.id)
			.then((yEvent: yasoonModel.Notification) => {
				var creation = false;
				if (!yEvent) {
					//New Notification
					yEvent = {};
					creation = true;
				} else if (yEvent.createdAt.getTime() >= new Date(this.issue.fields.updated).getTime()) {
					//not new and no update needed
					return yEvent;
				} else {
					this.issue.childrenLoaded = JSON.parse(yEvent.externalData).childrenLoaded; // Take over childrenLoaded flag from old Entity
				}

				//Description is sometimes an object. WTF?! check for it and log so we can probably figure out what's inside
				var content = yasoon.i18n('notification.noContent');
				if (this.issue.fields.description && typeof this.issue.fields.description != 'string') {
					try {
						yasoon.util.log('Description Object found:' + JSON.stringify(this.issue.fields.description) + ' --> Rendered Description: ' + JSON.stringify(this.issue.renderedFields.description));
					} catch (e) {
						//Should't dump
					}
				} else {
					if (this.issue.fields.description && this.issue.fields.description.trim()) {
						content = this.issue.fields.description.trim();
					}
				}
				yEvent.content = content;
				yEvent.title = this.issue.fields.summary;
				yEvent.type = 1;
				yEvent.createdAt = new Date(this.issue.fields.updated);
				yEvent.contactId = ((this.issue.fields.creator) ? this.issue.fields.creator.name : ((this.issue.fields.reporter) ? this.issue.fields.reporter.name : ''));
				yEvent.externalId = this.issue.id;
				yEvent.isRead = true;
				this.issue.type = 'issue';

				/* Clean up data to save DB space */
				yEvent.externalData = JSON.stringify(jiraMinimizeIssue(this.issue));

				jira.filter.addNotif(this.issue);
				if (creation) {
					return jiraAddNotification(yEvent)
						.then((newNotif) => {
							jira.notifications.queueChildren(this.issue); // Trigger Sync of all children. If successfull it will set childrenLoaded!

							//return newNotif;
							return new JiraIssueAppointment(this.issue).save()
								.then(() => {
									return newNotif;
								});
						});
				} else {
					return jiraSaveNotification(yEvent)
						.then((newNotif) => {
							if (!this.issue.childrenLoaded)
								jira.notifications.queueChildren(this.issue); // Trigger Sync of all children. If successfull it will set childrenLoaded!

							//return newNotif;
							return new JiraIssueAppointment(this.issue).save()
								.then(() => {
									return newNotif;
								});
						});
				}
			});
	}

	addAttachment = () => {
		if (!jiraIsLicensed(true)) {
			return;
		}

		yasoon.view.fileChooser.open((selectedFiles) => {
			var formData = [];
			jiraLog('Jira: ', selectedFiles);
			$.each(selectedFiles, (i, file) => {
				formData.push({
					type: yasoon.formData.File,
					name: 'file',
					value: file
				});
			});

			jiraAjax('/rest/api/2/issue/' + this.issue.id + '/attachments', yasoon.ajaxMethod.Post, null, formData)
				.then(() => {
					jira.sync();
				})
				.catch(jiraSyncError, jira.notifications.handleAttachmentError);

		});
	}

	editIssue = (callback) => {
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
				'editIssueId': this.issue.id,
				'systemInfo': jira.sysInfo,
				'projects': jira.data.projects
			},
			closeCallback: cbk
		});
	}

	logWork = () => {
		if (this.worklogOpenInProgress)
			return;

		this.worklogOpenInProgress = true;
		jira.notifications.loadWorklogTemplate(this.issue.key, this.issue.id, this.openLogWorkDialog);
	}

	openLogWorkDialog() {
		this.worklogOpenInProgress = false;
		$('#jiraAddWorklog').modal('show');
		$('#jiraAddWorklog').on('shown.bs.modal', () => {
			var contentHeight = $('#jiraAddWorklog').find('.modal-content').height();
			contentHeight = contentHeight - 56 - 74 - 25; //Height of header / footer;
			$('#jiraAddWorklog').find('.modal-body').height(contentHeight);

		});
	}
}