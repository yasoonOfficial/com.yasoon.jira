var jira = {};
yasoon.app.load("com.yasoon.jira", new function () { //jshint ignore:line
	var self = this;
	jira = this;
	jira.CONST_HEADER = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
	jira.CONST_PULL_RESULTS = 25;

	jira.data = {
		ownUser: null,
		projects: null,
		issueTypes: null
	};

	jira.firstTime = true;
	var startSync = new Date();
	var currentPage = 1;

	this.lifecycle = function(action, oldVersion, newVersion) {
		if (action === yasoon.lifecycle.Upgrade) {
			if (newVersion === '0.3') {
				var notifs = yasoon.notification.getAll();
				$.each(notifs, function (i, notif) {
					yasoon.notification.remove(notif.notificationId);
				});
			}
		}
	};

	this.init = function () {
		jira.settings = new JiraSettingController();
		jira.notifications = new JiraNotificationController();
		jira.ribbons = new JiraRibbonController();
		jira.contacts = new JiraContactController();
		jira.issues = new JiraIssueController();

		yasoon.addHook(yasoon.setting.HookCreateRibbon, jira.ribbons.createRibbon);
		yasoon.addHook(yasoon.notification.HookRenderNotificationAsync, jira.notifications.renderNotification);
		yasoon.addHook(yasoon.feed.HookCreateUserComment, jira.notifications.addComment);
		yasoon.addHook(yasoon.setting.HookRenderSettingsContainer, jira.settings.renderSettingsContainer);
		yasoon.addHook(yasoon.setting.HookSaveSettings, jira.settings.saveSettings);

		yasoon.feed.addFilter([
			{
				name: 'By Project',
				jsonPath: 'fields.project.id',
				label: function (name, id) {
					if (jira.data.projects) {
						var proj = $.grep(jira.data.projects, function (p) { return p.id === id; })[0];
						if (proj) {
							return proj.name;
						}
					}
					return id;
				}
			},
			{
				name: 'By Type',
				jsonPath: 'fields.issuetype.id',
				label: function (name, id) {
					if (jira.data.issueTypes) {
						var issueType = $.grep(jira.data.issueTypes, function (i) { return i.id === id; })[0];
						if (issueType) {
							return issueType.name;
						}
					}
					return id;
				}
			},
		]);
		yasoon.on("sync", jira.sync);
		yasoon.app.on("oAuthSuccess", jira.sync);
		yasoon.periodicCallback(300, jira.sync);
	};

	//Handle Sync Event
	var SyncProcessId = null;
	this.sync = function () {
		//If SyncInProcess flag will not be cleared due to an error, there is no way to sync again! Schedule a timer that reset the flag.
		if (SyncProcessId && !jira.SyncInProcess) {
			clearTimeout(SyncProcessId);
		}
		if (jira.firstTime) {
			self.initData();
		} else if (!jira.SyncInProcess) {
			SyncProcessId = setTimeout(function () { jira.SyncInProcess = false; }, 1000 * 60 * 10);
			jira.SyncInProcess = true;
			startSync = new Date();
			self.pullData(jira.settings.baseUrl + '/activity', jira.CONST_PULL_RESULTS, function () {
				jira.SyncInProcess = false;
				jira.settings.setLastSync(startSync);
				jira.notifications.processChildren();
			});
		}
	};

	this.pullData = function (url, maxResults, finishCallback) {
		if (url.indexOf('?') === -1) {
			url += '?maxResults=' + maxResults;
		} else {
			url += '&maxResults=' + maxResults;
		}
		yasoon.oauth({
			url: url,
			oauthServiceName: 'auth',
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				var obj = jiraXmlToJson(new DOMParser().parseFromString(data, "text/xml"));
				console.log('page:', obj);
				if (obj.feed.entry) {
					//Adjust Data. If it's only 1 entry it's an object instead of array
					if (!$.isArray(obj.feed.entry)) {
						obj.feed.entry = [obj.feed.entry];
					}

					var counter = 0;
					var processEntry = function () {
						var feed = obj.feed.entry[counter];
						if (feed) {
							console.log('Counter: ' + counter, feed);
							//Only for jira!
							if (feed['atlassian:application'] && feed['atlassian:application']['#text'] === 'com.atlassian.jira') {
								var notif = jira.notifications.createNotification(feed);
								notif.save(function () {
									counter++;
									processEntry();
								});
							}
						} else {
							//Determine if paging is required
							var lastObj = obj.feed.entry[obj.feed.entry.length - 1];
							var lastObjDate = new Date(lastObj.updated['#text']);
							if (obj.feed.entry.length === maxResults && jira.settings.lastSync < lastObjDate && currentPage <= 5) {
								currentPage++;
								console.log('currentPage:' + currentPage);
								self.pullData(jira.settings.baseUrl + '/activity?streams=update-date+BEFORE+' + (lastObjDate.getTime() - 2000), jira.CONST_PULL_RESULTS, finishCallback);
							} else {
								if (finishCallback)
									finishCallback();
							}
						}
					};

					processEntry();

				} else {
					if (finishCallback)
						finishCallback();
				}
			}
		});
	};

	this.initData = function () {
		yasoon.oauth({
			url: jira.settings.baseUrl + '/rest/api/2/myself',
			oauthServiceName: 'auth',
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				jira.data.ownUser = JSON.parse(data);
				jira.firstTime = false;
				self.sync();

				yasoon.oauth({
					url: jira.settings.baseUrl + '/rest/api/2/project',
					oauthServiceName: 'auth',
					headers: jira.CONST_HEADER,
					type: yasoon.ajaxMethod.Get,
					error: jira.handleError,
					success: function (data) {
						var projects = JSON.parse(data);
						jira.data.projects = [];
						var counter = 0;
						$.each(projects, function (i, proj) {
							yasoon.oauth({
								url: jira.settings.baseUrl + '/rest/api/2/project/' + proj.id,
								oauthServiceName: 'auth',
								headers: jira.CONST_HEADER,
								type: yasoon.ajaxMethod.Get,
								error: jira.handleError,
								success: function (data) {
									var project = JSON.parse(data);
									jira.data.projects.push(project);
									counter++;
									if (counter === projects.length) {
										jira.settings.updateData();
									}
								}
							});
						});
					}
				});

				yasoon.oauth({
					url: jira.settings.baseUrl + '/rest/api/2/issuetype',
					oauthServiceName: 'auth',
					headers: jira.CONST_HEADER,
					type: yasoon.ajaxMethod.Get,
					error: jira.handleError,
					success: function (data) {
						var issueTypes = JSON.parse(data);
						jira.data.issueTypes = issueTypes;
						jira.settings.updateData();
					}
				});

			}
		});

	};

	this.handleError = function (data, statusCode, result, errorText, cbkParam) {
		console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
	};
}); //jshint ignore:line

function JiraSettingController() {
	var self = this;

	self.renderSettingsContainer = function (container) {
		if (!container) {
			return;
		}

		//if (!yasoon.app.isOAuthed('auth')) {
		//    console.log('No settings - oAuth login missing');
		//    container.setContent('<p> Please login first </p>');
		//    return;
		//}

		var html = '<p>Please use the settings below to configure the Jira app.</p>' +
				   '<form class="form-horizontal" role="form">' +
		//Desktop Notification
					'   <div class="form-group" style="position:relative; margin-top:20px;">' +
					'       <div class="col-sm-4 checkbox">' +
					'           <b class="pull-right">Show Desktop Notification</b>' +
					'       </div>' +
					'       <div class="col-sm-8">' +
					'           <div class="checkbox">' +
					'               <label>' +
					'                   <input class="formValue" type="checkbox" id="showDesktopNotif" name="showDesktopNotif">' +
					'               </label>' +
					'           </div>' +
					'       </div>' +
					'   </div>' +
					'</form>';

		//Add Values
		var elem = $('<div>' + html + '</div>');
		$.each(jira.settings, function (i, val) {
			if (elem.find('#' + i).attr('type') == "checkbox") {
				if (val) {
					elem.find('#' + i).attr('checked', true);
				}
			} else {
				elem.find('#' + i).val(val);
			}
		});
		//Add JS
		container.afterRender = function () { };
		container.setContent(elem.html());
	};

	self.saveSettings = function (form) {
		//Create deep copy
		$.each(form, function (i, param) {
			if (param.value == "true") {
				self[param.key] = true;
			} else if (param.value == "false") {
				self[param.key] = false;
			} else {
				self[param.key] = param.value;
			}
		});
		yasoon.setting.setAppParameter('settings', JSON.stringify(self));
	};

	self.setLastSync = function (date) {
		self.lastSync = date;
		yasoon.setting.setAppParameter('settings', JSON.stringify(self));
	};

	self.updateData = function () {
		yasoon.setting.setAppParameter('data', JSON.stringify(jira.data));
	};

	/****** Initial Load of settings */
	self.lastSync = new Date(1000);
		

	var urlString = yasoon.setting.getAppParameter('baseUrl');
	if (urlString) {
		self.baseUrl = urlString;
	}

	var dataString = yasoon.setting.getAppParameter('data');
	if (dataString) {
		jira.data = JSON.parse(dataString);
	}

	var settingsString = yasoon.setting.getAppParameter('settings');
	if (!settingsString) {
		//Initial Settings
		self.showDesktopNotif = true;
		yasoon.setting.setAppParameter('settings', JSON.stringify(self));

	} else {
		//Load Settings
		var settings = JSON.parse(settingsString);
		$.each(settings, function (key, value) {
			self[key] = value;
		});
	}
}

function JiraNotificationController() {
	var self = this;
	var notificationCounter = 0;
	var notification = null;
	var notificationEvent = null;

	var childQueue = [];

	// Custom Debounce 
	var bounce = debounce(function () {
		if (!notification)
			return;
		var content = "";
		if (notificationCounter === 1) {
			jiraLog('Single Desktop Notification shown: ', notification);
			content = $('<div>' + notification.title + ' </div>').text();
			yasoon.notification.showPopup({ title: 'News on Jira', text: content, contactId: notification.contactId });
		}
		else if (notificationCounter === 2 && notificationEvent && notificationEvent.category && notificationEvent.category['@attributes'].term === 'created') {
			//Handle the single issue creation case (we want to show a single desktop nofif
			jiraLog('Single Desktop Notification shown: ', notification);
			content = $('<div>' + notification.title + ' </div>').text();
			yasoon.notification.showPopup({ title: 'News on Jira', text: content, contactId: notification.contactId });
		}
		else {
			jiraLog('Multiple Desktop Notification shown!');
			yasoon.notification.showPopup({ title: "News on Jira", text: 'multiple new notifications' });
		}

		notificationCounter = 0;
		notification = null;
	}, 5000);

	self.handleCommentError = function (data, statusCode, result, errorText, cbkParam) {
		var errorMessage = (statusCode === 500) ? 'Connection to Jira not possible' : result;
		yasoon.alert.add({ type: yasoon.alert.alertType.error, message: 'Could not create Comment: ' + errorMessage });
	};

	self.handleAttachmentError = function (data, statusCode, result, errorText, cbkParam) {
		var errorMessage = (statusCode === 500) ? 'Connection to Jira not possible' : result;
		yasoon.alert.add({ type: yasoon.alert.alertType.error, message: 'Could not upload Attachment(s): ' + errorMessage });
	};

	self.addComment = function (parent, comment, successCbk) {
		var body = JSON.stringify({
			"body": comment
		});

		var issue = JSON.parse(parent.externalData);

		yasoon.oauth({
			url: jira.settings.baseUrl + '/rest/api/2/issue/' + issue.key + '/comment',
			oauthServiceName: 'auth',
			headers: jira.CONST_HEADER,
			data: body,
			type: yasoon.ajaxMethod.Post,
			error: self.handleCommentError,
			success: function (data) {
				successCbk();
				jira.sync();
			}
		});
	};

	self.createNotification = function (event) {
		var result = null;
		if (event.type) {
			if (event.type === 'issue') {
				result = new JiraIssueNotification(event);
			} else if (event.type === 'IssueAction') {
				result = new JiraIssueActionNotification(event);
			}
		} else {
			if (event['activity:target']) {
				if (event['activity:target']['activity:object-type']['#text'] === 'http://streams.atlassian.com/syndication/types/issue') {
					result = new JiraIssueActionNotification(event);
					result.addDeferred(jiraIssueGetter);
				}
			} else if (event['activity:object']) {
				if (event['activity:object']['activity:object-type']['#text'] === 'http://streams.atlassian.com/syndication/types/issue') {
					result = new JiraIssueActionNotification(event);
					result.addDeferred(jiraIssueGetter);
				}
			} else if (event.fields) {
				result = new JiraIssueNotification(event);
				result.addDeferred(jiraWatcherGetter);
			}
		}

		return result;
	};

	self.addDesktopNotification = function (notif, event) {
		if (jira.settings.showDesktopNotif) {
			notificationCounter++;
			notification = notif;
			notificationEvent = event;
			bounce();
		}
	};

	self.queueChildren = function (issue) {
		console.log('Queue Child - Function Call ' + issue.key);
		var results = $.grep(childQueue, function (i) { return issue.key === i.key; });
		if (results.length === 0) {
			console.log('Queue Child - Add to Array ' + issue.key);
			childQueue.push(issue);
		}
	};

	self.processChildren = function () {
		//If a new Issue is added, we need to make sure all children are loaded! This is done here via the feed.
		console.log('Process Children called');
		if (childQueue.length === 0)
			return;

		var counter = 0;
		var successMethod = function () {

			var notif = yasoon.notification.getByExternalId(childQueue[counter].id);
			var data = JSON.parse(notif.externalData);
			data.childrenLoaded = true;
			notif.externalData = JSON.stringify(data);
			console.log('Successfully processed for: ' + data.key);
			yasoon.notification.save1(notif); //asnyc

			counter++;
			if (childQueue.length > counter) {
				issue = childQueue[counter];
				jira.pullData(jira.settings.baseUrl + '/activity?streams=issue-key+IS+' + childQueue[counter].key, 500, successMethod);
			} else {
				childQueue = [];
			}
		};


		jira.pullData(jira.settings.baseUrl + '/activity?streams=issue-key+IS+' + childQueue[counter].key, 500, successMethod);
	};

	self.renderNotification = function (feed) {
		var event = self.createNotification(JSON.parse(feed.externalData));
		if (event) {
			event.renderBody(feed);
			event.renderTitle(feed);
			event.setProperties(feed);
		}
	};
}

function JiraNotification() {
	this.createNotification = function () {

	};

	this.addDeferred = function (def) {
		this.deferreds.push(def);
	};

	this.executeDeferreds = function (callback) {
		allDeferred = [];
		var context = this;
		$.each(this.deferreds, function (i, def) {
			allDeferred.push(def.apply(context));
		});

		$.when.apply(this, allDeferred).then(callback);
	};
}

JiraIssueNotification.prototype = new JiraNotification();
function JiraIssueNotification(issue) {
	var self = this;
	self.issue = issue;
	self.deferreds = [];
	self.deferredObject = issue;

	function isSyncNeeded() {
		var found = false;
		//Check if Issue is relevant

		//Check if issue exist
		var issue = yasoon.notification.getByExternalId(self.issue.id);
		if (issue) {
			console.log('Issue already exist');
			return true;
		}
		//Check if I'm creator , reporter or assignee
		if (self.issue.fields.creator && self.issue.fields.creator.name === jira.data.ownUser.name) {
			console.log('creator equals');
			return true;
		}

		if (self.issue.fields.reporter && self.issue.fields.reporter.name === jira.data.ownUser.name) {
			console.log('reporter equals');
			return true;
		}

		if (self.issue.fields.assignee && self.issue.fields.assignee.name === jira.data.ownUser.name) {
			console.log('assignee equals');
			return true;
		}

		//Am I watcher?
		if (self.issue.fields.watches.watchers) {
			found = false;
			$.each(self.issue.fields.watches.watchers, function (i, watcher) {
				if (watcher.name === jira.data.ownUser.name) {
					found = true;
					return false;
				}
			});
			if (found) {
				console.log('Found in Watchers');
				return true;
			}
		}

		//Is it my own project? --> find project in buffer
		if (jira.data.projects) {
			var proj = $.grep(jira.data.projects, function (project) { return self.issue.fields.project.id === project.id; })[0];
			if (proj && proj.lead && proj.lead.name === jira.data.ownUser.name) {
				console.log('Project Lead equals');
				return true;
			}
		}

		//Did I make a comment or have I been mentioned in a comment?
		if (self.issue.fields.comment && self.issue.fields.comment.comments) {
			found = false;
			$.each(self.issue.fields.comment.comments, function (i, comment) {
				if (comment.author && comment.author.name === jira.data.ownUser.name) {
					found = true;
					return false;
				}
				if (comment.body && comment.body.indexOf('[~' + jira.data.ownUser.name + ']') > -1) {
					found = true;
					return false;
				}
			});
			if (found) {
				console.log('Found in Comments');
				return true;
			}
		}
		return false;
	}

	self.renderTitle = function (feed) {
		var html = '<span>';
		if (self.issue.fields.priority)
			html += '<img style="margin-right: 5px;" src="' + self.issue.fields.priority.iconUrl + '" /> ';

		html += self.issue.fields.summary + '</span>';
		feed.setTitle(html);
	};

	self.renderBody = function (feed) {
		//Transform data
		$.each(self.issue.fields.attachment, function (i, att) {
			att.fileIcon = yasoon.io.getFileIconPath(att.mimeType);
		});

		feed.setTemplate('templates/issueNotification.hbs', {
			issuetype: self.issue.fields.issuetype,
			status: self.issue.fields.status,
			duedate: self.issue.renderedFields.duedate,
			assignee: {
				avatarUrl: (self.issue.fields.assignee) ? self.issue.fields.assignee.avatarUrls['16x16'] : '',
				displayName: (self.issue.fields.assignee) ? self.issue.fields.assignee.displayName : 'niemand'
			},
			creator: {
				avatarUrl: (self.issue.fields.creator) ? self.issue.fields.creator.avatarUrls['16x16'] : '',
				displayName: (self.issue.fields.creator) ? self.issue.fields.creator.displayName : 'anonym'
			},
			baseUrl: jira.settings.baseUrl,
			project: self.issue.fields.project,
			priority: self.issue.fields.priority,
			versions: self.issue.fields.versions,
			environment: self.issue.renderedFields.environment,
			resolution: self.issue.fields.resolution,
			fixVersions: self.issue.fields.fixVersions,
			description: self.issue.renderedFields.description,
			resolutiondate: self.issue.fields.resolutiondate,
			attachments: self.issue.fields.attachment
		});
	};

	self.setProperties = function (feed) {
		feed.properties.customActions = [];
		feed.properties.customLabels = [{ description: self.issue.fields.project.name, labelColor: '#D87F47', url: jira.settings.baseUrl + '/browse/' + self.issue.fields.project.key }];

		//Add Components
		if (self.issue.fields.components) {
			$.each(self.issue.fields.components, function (i, label) {
				feed.properties.customLabels.push({ description: label.name, labelColor: '#0B96AA', url: jira.settings.baseUrl + '/browse/' + self.issue.fields.project.key + '/component/' + label.id });
			});
		}

		//Add Labels
		if (self.issue.fields.labels) {
			$.each(self.issue.fields.labels, function (i, label) {
				feed.properties.customLabels.push({ description: label });
			});
		}

		//Add Actions
		feed.properties.customActions.push({ description: '<span><i class="fa fa-external-link"></i> Open </span>', url: jira.settings.baseUrl + '/browse/' + self.issue.key });

		var changeStatusHtml = '' +
			'<span style="position:relative;">' +
			'   <span class="dropdown-toggle" data-toggle="dropdown">' +
			'       <span><i class="fa fa-sign-in"></i> Set status</span>' +
			'       <span class="caret"></span>' +
			'   </span>' +
			'   <ul class="dropdown-menu" role="menu">';
		$.each(self.issue.transitions, function (i, transition) {
			changeStatusHtml += '<li><a class="jiraStatusChangeLink" data-transition="' + transition.id + '" data-key="' + self.issue.key + '">' + transition.name + '</a></li>';
		});
		changeStatusHtml += '' +
			'   </ul>' +
			'</span>';
		feed.properties.customActions.push({ description: changeStatusHtml, eventHandler: $.noop });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-paperclip"></i> Add file</span>', eventHandler: self.addAttachment });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-user"></i> Set assignee</span>', url: jira.settings.baseUrl + '/secure/AssignIssue%21default.jspa?id=' + self.issue.id });
		feed.setProperties(feed.properties);

		var icon_url = yasoon.io.getLinkPath('Task-03.png');
		feed.setIconHtml('<img src="' + icon_url + '" title="Issue" ></i>');
		feed.afterRenderScript(function () {
			$('.jiraStatusChangeLink').unbind().click(function () {
				var transitionId = $(this).data('transition');
				var bodyObj = {
					"transition": {
						"id": transitionId
					}
				};
				var key = $(this).data('key');
				var body = JSON.stringify(bodyObj);
				yasoon.oauth({
					url: jira.settings.baseUrl + '/rest/api/2/issue/' + key + '/transitions',
					oauthServiceName: 'auth',
					headers: jira.CONST_HEADER,
					data: body,
					type: yasoon.ajaxMethod.Post,
					error: jira.handleError,
					success: function (data) {
						console.log(data);
						jira.sync();

					}
				});

			});

			$('.jiraFeedExpand').unbind().click(function () {
				$(this).parents('.body-collapsed').hide();
				$(this).parents('.jiraContainer').find('.body-open').show();
			});

			$('.jiraFeedClose').unbind().click(function () {
				$(this).parents('.body-open').hide();
				$(this).parents('.jiraContainer').find('.body-collapsed').show();
			});
		});
	};

	self.save = function (cbk) {
		self.executeDeferreds(function () {
			if (!isSyncNeeded()) {
				cbk();
				return;
			}
			//Save contacts
			if (self.issue.assignee)
				jira.contacts.update(self.issue.assignee);

			if (self.issue.creator)
				jira.contacts.update(self.issue.creator);

			if (self.issue.reporter)
				jira.contacts.update(self.issue.reporter);

			//Save Notification
			var creation = false;
			yasoon.notification.getByExternalId1(self.issue.id, function (yEvent) {
				if (!yEvent) {
					//New Notification
					yEvent = {};
					creation = true;
				} else if (yEvent.createdAt.getTime() >= new Date(self.issue.fields.updated).getTime()) {
					//not new and no update needed
					if (cbk)
						cbk(yEvent);
					return;
				} else {
					self.issue.childrenLoaded = JSON.parse(yEvent.externalData).childrenLoaded; // Take over childrenLoaded flag from old Entity
				}

				yEvent.content = (self.issue.fields.description) ? self.issue.fields.description : 'no content';
				yEvent.title = self.issue.fields.summary;
				yEvent.type = 1;
				yEvent.createdAt = new Date(self.issue.fields.updated);
				yEvent.contactId = ((self.issue.fields.creator) ? self.issue.fields.creator.name : ((self.issue.fields.reporter) ? self.issue.fields.reporter.name : ''));
				yEvent.externalId = self.issue.id;
				self.issue.type = 'issue';

				/* Clean up data to save DB space */
				var tempIssue = JSON.parse(JSON.stringify(self.issue)); // Performance Intensive but nessecary
				delete tempIssue.fields.comment;
				delete tempIssue.fields.worklog;
				delete tempIssue.renderedFields.comment;
				delete tempIssue.renderedFields.worklog;

				yEvent.externalData = JSON.stringify(tempIssue);

				if (creation) {
					yasoon.notification.add1(yEvent, function (newNotif) {
						jira.notifications.queueChildren(self.issue); // Trigger Sync of all children. If successfull it will set childrenLoaded!
						jira.notifications.addDesktopNotification(newNotif);
						if (cbk)
							cbk(newNotif);
					});
				} else {
					yasoon.notification.save1(yEvent, function (notif) {
						if (!self.issue.childrenLoaded)
							jira.notifications.queueChildren(self.issue); // Trigger Sync of all children. If successfull it will set childrenLoaded!

						if (cbk)
							cbk(notif);
					});
				}
			});

		});
	};

	self.addAttachment = function () {
		yasoon.view.fileChooser.open(function (selectedFiles) {
			var formData = [];
			console.log('Jira: ', selectedFiles);
			$.each(selectedFiles, function (i, file) {
				formData.push({
					type: yasoon.formData.File,
					name: 'file',
					value: file
				});
			});

			yasoon.oauth({
				url: jira.settings.baseUrl + '/rest/api/2/issue/' + self.issue.id + '/attachments',
				oauthServiceName: 'auth',
				type: yasoon.ajaxMethod.Post,
				formData: formData,
				headers: { Accept: 'application/json', 'X-Atlassian-Token': 'nocheck' },
				error: jira.notifications.handleAttachmentError,
				success: function (data) {
				}
			});

		});
	};
}

JiraIssueActionNotification.prototype = new JiraNotification();
function JiraIssueActionNotification(event) {
	var self = this;
	self.event = event;
	self.deferreds = [];
	self.deferredObject = event;

	self.isSyncNeeded = function () {
		return true;
	};

	self.renderBody = function (feed) {
		var html;
		if (self.event.category && self.event.category['@attributes'].term === 'comment') {
			html = '<span>' + self.event.content['#text'] + '</span>';
		} else {
			html = '<span>' + self.event.title['#text'] + '</span>';
		}

		if (self.event.content && (!self.event.category || self.event.category['@attributes'].term !== 'comment')) {
			html += '<span class="small yasoon-tooltip" data-toggle="tooltip" data-html="true" title="' + $('<div></div>').html(self.event.content['#text']).text().trim() + '">( <i class="fa fa-exclamation-circle"></i> more)</span>';
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

	self.save = function (cbk) {
		if (!self.isSyncNeeded()) {
			cbk();
			return;
		}
		self.executeDeferreds(function () {
			jira.notifications.createNotification(self.event.issue).save(function (notif) {
				if (!notif) {
					cbk();
					return;
				}

				var creation = false;
				//Update Author
				jira.contacts.update({
					displayName: self.event.author.name['#text'],
					name: self.event.author['usr:username']['#text'],
					emailAddress: self.event.author.email['#text'],
					avatarUrls: { '48x48': self.event.author.link[1].href }
				});
				//Save Activity Notification
				var isComment = (self.event.category && self.event.category['@attributes'].term === 'comment');
				var comment = null;
				if (isComment) {
					comment = $.grep(self.event.issue.fields.comment.comments, function (c) {
						if (self.event['activity:object'].link['@attributes'].href.indexOf('comment-' + c.id) > -1) {
							return true;
						} else {
							return false;
						}
					})[0];
				}
				yasoon.notification.getByExternalId1(self.event.id['#text'], function (yEvent) {
					if (!yEvent && notif) {
						//New Notification
						yEvent = {};
						creation = true;
					} else {
						//not new - update needed?
						//Comments can be edited. But they do not change the updated flag in the feed (damn bug!).
						//Lookup changed date in comment object
						if (isComment) {
							if (!comment || yEvent.createdAt >= new Date(comment.updated)) {
								cbk();
								return;
							}
						} else if (yEvent.createdAt >= new Date(self.event.updated['#text'])) {
							cbk();
							return;
						}
					}

					yEvent.parentNotificationId = notif.notificationId;
					yEvent.externalId = self.event.id['#text'];

					if (isComment) {
						//Determine Renderd Comment
						var renderedComment = $.grep(self.event.issue.renderedFields.comment.comments, function (c) { return c.id === comment.id; })[0];
						if (renderedComment)
							self.event.content['#text'] = renderedComment.body;

						//"Render" title for desktop notification
						yEvent.title = $(self.event.title['#text']).text();
						yEvent.content = self.event.content['#text'];
						yEvent.content = $(yEvent.content).html();
						yEvent.contactId = self.event.author['usr:username']['#text'];
						yEvent.createdAt = new Date(comment.updated);
						yEvent.type = 1;
					} else {
						yEvent.title = $(self.event.title['#text']).text();
						yEvent.content = (self.event.title['#text']) ? self.event.title['#text'] : 'no content';
						yEvent.createdAt = new Date(self.event.updated['#text']);
						yEvent.type = 2;
					}
					self.event.type = 'IssueAction';

					/* Clear unused data to save DB space*/
					delete self.event.issue.fields;
					delete self.event.issue.renderedFields;
					delete self.event.issue.transitions;
					delete self.event.link;

					yEvent.externalData = JSON.stringify(self.event);
					if (creation) {
						yasoon.notification.add1(yEvent, function (newNotif) {
							jira.notifications.addDesktopNotification(newNotif, self.event);
							cbk();
						});
					} else {
						yasoon.notification.save1(yEvent, function (newNotif) {
							jira.notifications.addDesktopNotification(newNotif);
							cbk();
						});
					}
				});

			});
		});
	};
}

function JiraIssueController() {
	var self = this;
}

function JiraRibbonController() {
	var self = this;
	this.createRibbon = function (ribbonFactory) {
		jira.ribbonFactory = ribbonFactory;

		ribbonFactory.create({
			type: 'contextMenus',
			renderTo: [
				'Microsoft.Outlook.Explorer'
			],
			items: [{
				type: 'contextMenu',
				idMso: 'MenuMailNewItem',
				items: [{
					type: 'button',
					id: 'newIssue',
					insertAfterMso: 'NewTaskCompact',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailText',
				items: [{
					type: 'button',
					id: 'newIssueFromText',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailTable',
				items: [{
					type: 'button',
					id: 'newIssueFromText2',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailTableCell',
				items: [{
					type: 'button',
					id: 'newIssueFromText3',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailListTable',
				items: [{
					type: 'button',
					id: 'newIssueFromText4',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailPictureTable',
				items: [{
					type: 'button',
					id: 'newIssueFromText5',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailTextTable',
				items: [{
					type: 'button',
					id: 'newIssueFromText6',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailTableWhole',
				items: [{
					type: 'button',
					id: 'newIssueFromText7',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailList',
				items: [{
					type: 'button',
					id: 'newIssueFromText8',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailHyperlink',
				items: [{
					type: 'button',
					id: 'newIssueFromText9',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}]
		});
	};

	this.ribbonOnNewIssue = function (ribbonId, ribbonCtx) {
		if (!yasoon.app.isOAuthed('auth')) {
			yasoon.dialog.showMessageBox('Please login to Jira in settings menu first!');
			return;
		}
		if (ribbonId == 'newIssue') {

			yasoon.dialog.open({
				width: 900,
				height: 650,
				title: 'New Jira Issue',
				resizable: true,
				htmlFile: 'Dialogs/newIssueDialog.html',
				initParameter: { 'settings': jira.settings, 'ownUser': jira.data.ownUser },
				closeCallback: self.ribbonOnCloseNewIssue
			});

		}
		else {
			var selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);

			if (!selection || !selection.trim()) {
				yasoon.dialog.showMessageBox('Please select some text first!');
				return;
			}

			yasoon.dialog.open({
				width: 900,
				height: 650,
				title: 'New Jira Issue',
				resizable: true,
				htmlFile: 'Dialogs/newIssueDialog.html',
				initParameter: { settings: jira.settings, 'ownUser': jira.data.ownUser, text: selection },
				closeCallback: self.ribbonOnCloseNewIssue
			});
		}
	};

	this.ribbonOnCloseNewIssue = function () {
		jira.sync();
	};
}

function JiraContactController() {
	var self = this;

	self.update = function (actor) {
		var c = yasoon.contact.get(actor.name);
		if (!c) {
			var newContact = {
				contactId: actor.name,
				contactLastName: actor.displayName,
				contactEmailAddress: actor.emailAddress,
				externalData: JSON.stringify(actor),
				externalAvatarUrl: actor.avatarUrls['48x48']
			};
			jiraLog('New Contact created: ', newContact);
			yasoon.contact.add(newContact);

		} else {
			//Todo: Update of Avatar
		}
	};
}

function jiraIssueGetter() {
	var deferredObject = this.deferredObject;

	return $.Deferred(function (dfd) {
		if (deferredObject && !deferredObject.issue) {
			var issueKey = (deferredObject['activity:target']) ? deferredObject['activity:target'].title['#text'] : deferredObject['activity:object'].title['#text'];
			yasoon.oauth({
				url: jira.settings.baseUrl + '/rest/api/2/issue/' + issueKey + '?expand=transitions,renderedFields',
				oauthServiceName: 'auth',
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: jira.handleError,
				success: function (data) {
					deferredObject.issue = JSON.parse(data);
					dfd.resolve();
				}
			});
		} else {
			dfd.resolve();
		}
	});
}

function jiraWatcherGetter() {
	var deferredObject = this.deferredObject;

	return $.Deferred(function (dfd) {
		if (deferredObject && deferredObject.fields.watches && !deferredObject.fields.watches.watchers) {
			yasoon.oauth({
				url: jira.settings.baseUrl + '/rest/api/2/issue/' + deferredObject.id + '/watchers',
				oauthServiceName: 'auth',
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: jira.handleError,
				success: function (data) {
					deferredObject.fields.watches.watchers = JSON.parse(data).watchers;
					dfd.resolve();
				}
			});
		} else {
			dfd.resolve();
		}
	});
}

function jiraLog(text, obj, stacktrace) {
	if (yasoon.logLevel === 0) {
		var stack = '';
		var json = '';
		if (stacktrace !== undefined || stacktrace) {
			try {
				var a = doesNotExit + forceException;
			} catch (e) {
				stack = '\n' + printStackTrace(e).split('\n')
					.slice(1)
					.join('\n');

			}
		}
		if (obj) {
			json = '\n' + JSON.stringify(obj);
		}

		yasoon.util.log(text + ' ' + json + ' ' + stack);
	}
}

function jiraXmlToJson(xmlDom) {
	var js_obj = {};
	if (xmlDom.nodeType == 1) {
		if (xmlDom.attributes.length > 0) {
			js_obj["@attributes"] = {};
			for (var j = 0; j < xmlDom.attributes.length; j++) {
				var attribute = xmlDom.attributes.item(j);
				js_obj["@attributes"][attribute.nodeName] = attribute.value;
			}
		}
	} else if (xmlDom.nodeType == 3) {
		js_obj = xmlDom.nodeValue;
	}
	if (xmlDom.hasChildNodes()) {
		for (var i = 0; i < xmlDom.childNodes.length; i++) {
			var item = xmlDom.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof (js_obj[nodeName]) == "undefined") {
				js_obj[nodeName] = jiraXmlToJson(item);
			} else {
				if (typeof (js_obj[nodeName].push) == "undefined") {
					var old = js_obj[nodeName];
					js_obj[nodeName] = [];
					js_obj[nodeName].push(old);
				}
				js_obj[nodeName].push(jiraXmlToJson(item));
			}
		}
	}
	return js_obj;
}

//@ sourceURL=jira.js