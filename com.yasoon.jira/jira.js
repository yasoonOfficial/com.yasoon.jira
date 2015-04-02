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
		}
	};

	this.init = function () {
		jira.settings = new JiraSettingController();
		jira.notifications = new JiraNotificationController();
		jira.ribbons = new JiraRibbonController();
		jira.contacts = new JiraContactController();
		jira.icons = new JiraIconController();
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

	var SyncProcessId = null;
	this.sync = function () {

		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			return;
		}

		if (SyncProcessId && !jira.SyncInProcess) {
			clearTimeout(SyncProcessId);
		}

		if (!jira.SyncInProcess) {
			SyncProcessId = setTimeout(function () { jira.SyncInProcess = false; }, 1000 * 60 * 4);
			jira.SyncInProcess = true;
			startSync = new Date();

			jiraQueue(
				self.initData,
				jira.issues.refreshBuffer,
				self.syncStream,
				jira.notifications.processChildren,
				jira.notifications.processCommentEdits
			).done(function () {
				//Everything done
				jiraLog('Everything done!');
				clearTimeout(SyncProcessId);
				SyncProcessId = '';
				jira.SyncInProcess = false;
				jira.settings.setLastSync(startSync);
			});
		}
	};

	//Handle Sync Event
	this.syncStream = function () {
		var dfd = $.Deferred();
		var currentTs = new Date().getTime();
		var oldTs = jira.settings.lastSync.getTime() - 1000;
		self.pullData(jira.settings.baseUrl + '/activity?streams=update-date+BETWEEN+' + oldTs + '+' + currentTs, jira.CONST_PULL_RESULTS, function () {
			jiraLog('FinishSyncCbk');
			dfd.resolve();
		},dfd);
		return dfd.promise();
	};

	this.pullData = function (url, maxResults, finishCallback,dfd) {
		if (url.indexOf('?') === -1) {
			url += '?maxResults=' + maxResults;
		} else {
			url += '&maxResults=' + maxResults;
		}
		jiraLog('Get Activity Stream');
		yasoon.oauth({
			url: url,
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			callbackParameter: dfd,
			error: jira.handleError,
			success: function (data) {
				var obj = jiraXmlToJson(new DOMParser().parseFromString(data, "text/xml"));
				console.log('page:', obj);
				if (obj.feed && obj.feed.entry) {
					//Adjust Data. If it's only 1 entry it's an object instead of array
					if (!$.isArray(obj.feed.entry)) {
						obj.feed.entry = [obj.feed.entry];
					}
					//Start Processing (striclty one by one)
					var counter = 0;
					var processEntry = function () {
						var feed = obj.feed.entry[counter];
						if (feed) {
							console.log('Counter: ' + counter, feed);
							//Only for jira!
							if (feed['atlassian:application'] && feed['atlassian:application']['#text'].toLowerCase().indexOf('jira') > -1) {
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
		var dfd = $.Deferred();

		if (!jira.firstTime) {
			dfd.resolve();
		} else {
			jiraLog('Get Own Data');
			yasoon.oauth({
				url: jira.settings.baseUrl + '/rest/api/2/myself',
				oauthServiceName: jira.settings.currentService,
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				callbackParameter: dfd,
				error: jira.handleError,
				success: function (data) {
					jira.data.ownUser = JSON.parse(data);
					jira.firstTime = false;
					dfd.resolve();
					jiraLog('Get Projects');
					yasoon.oauth({
						url: jira.settings.baseUrl + '/rest/api/2/project',
						oauthServiceName: jira.settings.currentService,
						headers: jira.CONST_HEADER,
						type: yasoon.ajaxMethod.Get,
						error: jira.handleErrorSoft,
						success: function (data) {
							var projects = JSON.parse(data);
							jira.data.projects = [];
							var counter = 0;
							$.each(projects, function (i, proj) {
								jiraLog('Get Single Project Data');
								yasoon.oauth({
									url: jira.settings.baseUrl + '/rest/api/2/project/' + proj.id,
									oauthServiceName: jira.settings.currentService,
									headers: jira.CONST_HEADER,
									type: yasoon.ajaxMethod.Get,
									error: jira.handleErrorSoft,
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
					jiraLog('Get Issuetypes');
					yasoon.oauth({
						url: jira.settings.baseUrl + '/rest/api/2/issuetype',
						oauthServiceName: jira.settings.currentService,
						headers: jira.CONST_HEADER,
						type: yasoon.ajaxMethod.Get,
						error: jira.handleErrorSoft,
						success: function (data) {
							var issueTypes = JSON.parse(data);
							jira.data.issueTypes = issueTypes;
							jira.settings.updateData();
						}
					});

				}
			});
		}

		return dfd.promise();

	};

	this.handleError = function (data, statusCode, result, errorText, cbkParam) {
	    self.handleErrorSoft(data, statusCode, result, errorText, cbkParam);
	    jira.SyncInProcess = false;
	};

	this.handleErrorSoft = function (data, statusCode, result, errorText, cbkParam) {
	    console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);

	    //Detect if oAuth token has become invalid
	    if (statusCode == 401 && result == 'oauth_problem=token_rejected') {
	        yasoon.app.invalidateOAuthToken(jira.settings.currentService);
	    }

	    if (cbkParam && cbkParam.fail) {
	        cbkParam.fail();
	    }
	};

}); //jshint ignore:line

function JiraSettingController() {
	var self = this;

	self.renderSettingsContainer = function (container) {
		if (!container) {
			return;
		}

		var oAuthServices = yasoon.app.getOAuthServices();
		var html = '';
		var description = '';

		if (!jira.settings.currentService) {
			html = '<p>Please choose your Jira instance and login.</p>' +
				   '<form class="form-horizontal" role="form">' +
		// Instance Selection
					'   <div class="form-group" style="position:relative; margin-top:20px;">' +
					'       <div class="col-sm-4 checkbox">' +
					'           <b class="pull-right">Select your System</b>' +
					'       </div>' +
					'       <div class="col-sm-8">' +
					'           <select id="currentService" class="form-control">';
			$.each(oAuthServices, function (i, service) {
				description = service.serviceName;
				if (service.appParams)
					description = service.appParams.description;
				html += '           <option value="' + service.serviceName + '">' + description + '</option>';
			});

			html += '           </select>' +
					'       </div>' +
					'   </div>' +
					'   <div class="form-group" style="position:relative;margin-top:20px;">' +
					'       <div class="col-sm-4">' +
					'           <button class="btn btn-primary" id="jiraLogin">Login</button>' +
					'       </div>' +
					'   </div>' +
					'   <div> Miss a Jira System? <a id="jiraReloadOAuth"> Reload System Information</a></div>' +
					'</form>';


		} else {
			html = '<p>Choose your settings. Only logout if you like to stop the service or like to connect to another Jira system</p>' +
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
			'	<div class="form-group" style="position:relative;margin-top:20px;">' +
			'       <div class="col-sm-4">' +
			'           <button class="btn btn-default" id="jiraLogout">Logout</button>' +
			'       </div>' +
			'   </div>' +
			'</form>';
		}

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
		container.afterRender = function () {
			$('#jiraLogin').unbind().click(function () {
				var selectedServiceName = $('#currentService').val();
				var newService = $.grep(oAuthServices, function (s) { return s.serviceName == selectedServiceName; })[0];

				if (!newService) {
					yasoon.alert.add({ type: yasoon.alert.alertType.error, message: "Login to this systen not possible due to a missing configuration. Please contact your admin." });
					throw new Error('Selected service ' + selectedServiceName + ' does not exist.');
				}

				if(!newService.appParams || !newService.appParams.url){
					yasoon.alert.add({ type: yasoon.alert.alertType.error, message: "Login to this system not possible due to a missing configuration. Please contact your admin." });
					return false;
				}

				//Set new BaseUrl so it's considered for oAuth flow
				yasoon.setting.setAppParameter('baseUrl', newService.appParams.url);
				jira.settings.baseUrl = newService.appParams.url;

				if (newService.accessToken) {

					//Set new currentService
					self.currentService = selectedServiceName;
					yasoon.setting.setAppParameter('settings', JSON.stringify(self));

					//Refresh UI
					oAuthSuccess();
				} else {
					yasoon.app.getOAuthUrlAsync('com.yasoon.jira', selectedServiceName, function (url) {
						window.open(url);
					},
					function () {
						//Set new currentService
						self.currentService = selectedServiceName;
						yasoon.setting.setAppParameter('settings', JSON.stringify(self));

						//Refresh UI
						oAuthSuccess();
					});
				}

				return false;
			});

			$('#jiraLogout').unbind().click(function () {
				self.baseUrl = '';
				self.currentService = '';
				yasoon.setting.setAppParameter('baseUrl', '');
				yasoon.setting.setAppParameter('settings', JSON.stringify(self));


				yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
				return false;
			});

			$('#jiraReloadOAuth').unbind().click(function () {
				yasoon.app.downloadManifest(null, function (path) {
					if (path) {
						yasoon.app.update(null, null, function () {
							yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
						});
						
					}
				});
				return false;
			});
		};
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
	self.lastSync = new Date( new Date().getTime() - (1000 * 60* 60* 24 * 30) ); // If nothing in db, set it to 30 days ago
		

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
		self.currentService = '';
		var oAuthServices = yasoon.app.getOAuthServices();
		if (oAuthServices.length === 1) {
			self.currentService = oAuthServices[0].serviceName;
		}
		
		yasoon.setting.setAppParameter('settings', JSON.stringify(self));

	} else {
		//Load Settings
		var settings = JSON.parse(settingsString);
		$.each(settings, function (key, value) {
			self[key] = value;
		});

		self.lastSync = new Date(self.lastSync);
	}
	
	//
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
			//jiraLog('Single Desktop Notification shown: ', notification);
			content = $('<div>' + notification.title + ' </div>').text();
			yasoon.notification.showPopup({ title: 'News on Jira', text: content, contactId: notification.contactId });
		}
		else if (notificationCounter === 2 && notificationEvent && notificationEvent.category && notificationEvent.category['@attributes'].term === 'created') {
			//Handle the single issue creation case (we want to show a single desktop nofif
			//jiraLog('Single Desktop Notification shown: ', notification);
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
			oauthServiceName: jira.settings.currentService,
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
			} else if (event.type === 'IssueComment') {
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
		var dfd = $.Deferred();

		jiraLog('ProcessChildren');
		if (childQueue.length === 0) {
			dfd.resolve();
			return dfd.promise();
		}

		var counter = 0;
		var successMethod = function () {

			var notif = yasoon.notification.getByExternalId(childQueue[counter].id);
			var data = JSON.parse(notif.externalData);
			data.childrenLoaded = true;
			notif.externalData = JSON.stringify(data);
			console.log('Queue Successfully processed for: ' + data.key);
			yasoon.notification.save1(notif); //asnyc

			counter++;
			if (childQueue.length > counter) {
				issue = childQueue[counter];
				jira.pullData(jira.settings.baseUrl + '/activity?streams=issue-key+IS+' + childQueue[counter].key, 500, successMethod,dfd);
			} else {
				dfd.resolve();
				childQueue = [];
			}
		};


		jira.pullData(jira.settings.baseUrl + '/activity?streams=issue-key+IS+' + childQueue[counter].key, 500, successMethod,dfd);

		return dfd.promise();
	};

	self.processCommentEdits = function () {
		/* Editing a comment does not affect the acitivity stream - JIRA BUG!
			Issue is open since 2007, so we do not expect a quick fix and we create a workaround.
			We check manually all changed issues and check if update date is newer than last sync
		*/

		/* Second Bug - If you upload files and add a comment this is shown as one entry in the activity stream.
		--> find comments that are not in Database yet and add them manually
		*/

		var dfd = $.Deferred();
		jiraLog('ProcessComments');
		//Find comments in all chnaged issues that changed since last Sync date
		var issues = jira.issues.all();
		if (issues.length > 0) {
			$.each(issues, function (i, issue) {
				console.log(issue);
				if (issue.fields.comment && issue.fields.comment.comments && issue.fields.comment.comments.length > 0) {
					var counter = 0;
					$.each(issue.fields.comment.comments, function (i, comment) {
						var event = null;
						if (new Date(comment.updated) >= jira.settings.lastSync && comment.updated != comment.created) {
							
							////This is an updated comment --> update
							//event = self.createCommentAction(comment, issue);
							//self.createNotification(event).save(function () {
							//	counter++;
							//	if (counter == issue.fields.comment.comments.length) {
							//		dfd.resolve();
							//	}
							//});
						} else if (new Date(comment.created) >= jira.settings.lastSync) {
							//This is a new comment. It may has been created with attachments --> check if it's already on database
							var yEvent = yasoon.notification.getByExternalId('c' + comment.id);
							if (!yEvent) {
								event = self.createCommentAction(comment, issue);
								self.createNotification(event).save(function () {
									counter++;
									if (counter == issue.fields.comment.comments.length) {
										dfd.resolve();
									}
								});
							} else {
								counter++;
								if (counter == issue.fields.comment.comments.length) {
									dfd.resolve();
								}
							}
						} else {
							counter++;
							if (counter == issue.fields.comment.comments.length) {
								dfd.resolve();
							}
						}
					});
				} else {
					dfd.resolve();
				}
			});
		} else {
			dfd.resolve();
		}
		
		return dfd.promise();

	};

	self.renderNotification = function (feed) {
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
		if (self.issue.fields.priority) {
		    var icon = jira.icons.mapIconUrl(self.issue.fields.priority.iconUrl);
		    html += '<img style="margin-right: 5px; width: 16px;" src="' + icon + '" /> ';
		}

		html += self.issue.fields.summary + '</span>';
		feed.setTitle(html);
	};

	self.renderBody = function (feed) {
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

        //Start rendering
		feed.setTemplate('templates/issueNotification.hbs', {
			fields: self.issue.fields,
			renderedFields: self.issue.renderedFields,
			assignee: {
			    avatarUrl: (self.issue.fields.assignee) ? jira.contacts.get(self.issue.fields.assignee.name).ImageURL : yasoon.io.getLinkPath('Images\\useravatar.png'),
				displayName: (self.issue.fields.assignee) ? self.issue.fields.assignee.displayName : 'no one'
			},
			creator: {
			    avatarUrl: (self.issue.fields.creator) ? jira.contacts.get(self.issue.fields.creator.name).ImageURL : yasoon.io.getLinkPath('Images\\useravatar.png'),
				displayName: (self.issue.fields.creator) ? self.issue.fields.creator.displayName : 'anonym'
			},
			baseUrl: jira.settings.baseUrl
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
		if (!self.issue.transitions) {
			console.log(self.issue);
		}

		$.each(self.issue.transitions, function (i, transition) {
			changeStatusHtml += '<li><a class="jiraStatusChangeLink" data-transition="' + transition.id + '" data-key="' + self.issue.key + '">' + transition.name + '</a></li>';
		});
		changeStatusHtml += '' +
			'   </ul>' +
			'</span>';
		feed.properties.customActions.push({ description: changeStatusHtml, eventHandler: $.noop });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-paperclip"></i> Add file</span>', eventHandler: self.addAttachment });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-pencil"></i> Edit</span>', eventHandler: self.editIssue });
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
					oauthServiceName: jira.settings.currentService,
					headers: jira.CONST_HEADER,
					data: body,
					type: yasoon.ajaxMethod.Post,
					error: jira.handleErrorSoft,
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
				var tempIssue = JSON.parse(JSON.stringify(self.issue)); // Performance Intensive but nessecary. Never change original object
				delete tempIssue.fields.comment;
				delete tempIssue.fields.worklog;
				delete tempIssue.fields.workratio; //Lead to a dump in JSON Convert due to Int64 Overflow
				delete tempIssue.renderedFields.comment;
				delete tempIssue.renderedFields.worklog;
				delete tempIssue.renderedFields.attachment;

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
				oauthServiceName: jira.settings.currentService,
				type: yasoon.ajaxMethod.Post,
				formData: formData,
				headers: { Accept: 'application/json', 'X-Atlassian-Token': 'nocheck' },
				error: jira.notifications.handleAttachmentError,
				success: function (data) {
				    jira.sync();
				}
			});

		});
	};

	self.editIssue = function () {
		yasoon.dialog.open({
			width: 900,
			height: 650,
			title: 'Edit Jira Issue',
			resizable: true,
			htmlFile: 'Dialogs/newIssueDialog.html',
			initParameter: { 'settings': jira.settings, 'ownUser': jira.data.ownUser, 'editIssue': self.issue },
			closeCallback: jira.ribbons.ribbonOnCloseNewIssue
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
		jiraLog('Render Action');
		if (self.event.type === 'IssueComment') {
			html = '<span>' + self.event.renderedComment.body + '</span>';
		} else if (self.event.category && self.event.category['@attributes'].term === 'comment') {
			//Legacy code!! Nov 2014
			html = '<span>' + self.event.content['#text'] + '</span>';
		} else {
			html = '<span>' + self.event.title['#text'] + '</span>';
			if (self.event.content) {
				html += '<span class="small yasoon-tooltip" style="cursor:pointer;" data-toggle="tooltip" data-html="true" title="' + $('<div></div>').html(self.event.content['#text']).text().trim() + '">( <i class="fa fa-exclamation-circle"></i> more)</span>';
			}
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
				//Save Activity Notification
				var isComment = (self.event.category && self.event.category['@attributes'].term === 'comment');
				var comment = null;
				if (isComment) {
					comment = $.grep(self.event.issue.fields.comment.comments, function (c) {
						//Fake Action has commentId Attribute
						if (self.event.commentId) {
							return self.event.commentId === c.id;
						} else {
							//Standard ones only have them in the URL!
							if (self.event['activity:object'].link['@attributes'].href.indexOf('comment-' + c.id) > -1) {
								return true;
							} else {
								return false;
							}
						}
					})[0];
				}
				var externalId = (comment && comment.id) ? 'c' + comment.id : self.event.id['#text'];
				yasoon.notification.getByExternalId1(externalId, function (yEvent) {
					if (isComment) {
						jiraLog('Save Comment');
						self.saveComment(yEvent,notif,comment,cbk);
					} else {
						jiraLog('Save Action');
						self.saveAction(yEvent,notif,cbk);
					}
				});

			});
		});
	};

	self.saveComment = function (yEvent, parent, comment, cbk) {
		var creation = false;
		if (!yEvent && parent) {
			//New Notification
			yEvent = {};
			creation = true;
		} else {
			//not new - update needed?
			if (!comment || yEvent.createdAt >= new Date(comment.updated)) {
				cbk();
				return;
			}
		}

		////Update Author
		jira.contacts.update({
			displayName: comment.updateAuthor.displayName,
			name: comment.updateAuthor.name
		});
		//Determine Renderd Comment
		var renderedComment = $.grep(self.event.issue.renderedFields.comment.comments, function (c) { return c.id === comment.id; })[0];
	   
		yEvent.parentNotificationId = parent.notificationId;
		yEvent.externalId = 'c'+comment.id;
		//"Render" title for desktop notification
		yEvent.title = comment.updateAuthor.displayName + ' commented on: ' + self.event.issue.fields.summary;
		yEvent.content = renderedComment.body;
		yEvent.contactId = comment.updateAuthor.name;
		yEvent.createdAt = new Date(comment.updated);
		yEvent.type = 1;		

		yEvent.externalData = JSON.stringify({
			comment: comment,
			renderedComment: renderedComment,
			type: 'IssueComment'
		});
		if (creation) {
			yasoon.notification.add1(yEvent, function (newNotif) {
				yasoon.notification.incrementCounter();
				jira.notifications.addDesktopNotification(newNotif, self.event);
				cbk();
			});
		} else {
			yasoon.notification.save1(yEvent, function (newNotif) {
				yasoon.notification.incrementCounter();
				jira.notifications.addDesktopNotification(newNotif);
				cbk();
			});
		}
	};

	self.saveAction = function (yEvent, parent,cbk) {
		if (!yEvent && parent) {
			//New Notification
			yEvent = {};
			creation = true;
		} else if (yEvent.createdAt >= new Date(self.event.updated['#text'])) {
				cbk();
				return;
		}

		//Update Author
		jira.contacts.update({
			displayName: self.event.author.name['#text'],
			name: self.event.author['usr:username']['#text'],
			emailAddress: self.event.author.email['#text'],
			avatarUrls: { '48x48': self.event.author.link[1].href }
		});

		yEvent.parentNotificationId = parent.notificationId;
		yEvent.externalId = self.event.id['#text'];
		yEvent.title = $(self.event.title['#text']).text();
		yEvent.content = (self.event.title['#text']) ? self.event.title['#text'] : 'no content';
		yEvent.createdAt = new Date(self.event.updated['#text']);
		yEvent.type = 2;

		self.event.type = 'IssueAction';

		///* Clear unused data to save DB space*/
		var tempIssue = JSON.parse(JSON.stringify(self.event.issue)); // Performance Intensive but nessecary. Never change original object
		delete tempIssue.fields;
		delete tempIssue.renderedFields;
		delete tempIssue.transitions;
		delete self.event.link;

		self.event.issue = tempIssue;

		yEvent.externalData = JSON.stringify(self.event);
		if (creation) {
			yasoon.notification.add1(yEvent, function (newNotif) {
				yasoon.notification.incrementCounter();
				jira.notifications.addDesktopNotification(newNotif, self.event);
				cbk();
			});
		} else {
			yasoon.notification.save1(yEvent, function (newNotif) {
				yasoon.notification.incrementCounter();
				jira.notifications.addDesktopNotification(newNotif);
				cbk();
			});
		}
	};

}

function JiraIssueController() {
	var self = this;
	var issues = [];

	self.refreshBuffer = function () {
		//Download issues since last sync
		var dfd = $.Deferred();
		var lastSync = moment(jira.settings.lastSync).format('YYYY/MM/DD HH:mm');
		//lastSync = '2014/12/04 15:30';
		var jql = encodeURIComponent('updated > "' + lastSync + '"');
		jiraLog('Get Changed Issues');
		yasoon.oauth({
			url: jira.settings.baseUrl + '/rest/api/2/search?jql=' + jql + '&fields=*all&expand=transitions,renderedFields',
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			callbackParameter: dfd,
			error: jira.handleError,
			success: function (data) {
				issues = [];
				var needReload = [];
				var result = JSON.parse(data);
				if (result.total > 0) {
					issues = result.issues;
				}
				dfd.resolve();
			}
		});

		return dfd.promise();
	};

	self.get = function (id) {
		var result = $.grep(issues, function (issue) { return (issue.id === id || issue.key === id); });
		if (result.length > 0) {
			return result[0];
		}
		return null;
	};

	self.all = function () {
		return issues;
	};
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
		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
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
				initParameter: { settings: jira.settings, 'ownUser': jira.data.ownUser, text: selection, mail: ribbonCtx.items[ribbonCtx.readingPaneItem] },
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
	var buffer = [];

	self.update = function (actor) {
	    var c = yasoon.contact.get(actor.name);
	    var dbContact = null;
	    var avatarUrl = null;
	    if (actor.avatarUrls && actor.avatarUrls['48x48']) {
	        avatarUrl = actor.avatarUrls['48x48'].replace('size=large', 'size=xlarge');
	    }
		if (!c) {
			var newContact = {
				contactId: actor.name,
				contactLastName: actor.displayName,
				contactEmailAddress: actor.emailAddress,
				externalData: JSON.stringify(actor),
				externalAvatarUrl: avatarUrl,
				useAuthedDownloadService: jira.settings.currentService
			};
			jiraLog('New Contact created: ', newContact);
			dbContact = yasoon.contact.add(newContact);
			buffer.push(dbContact);

		} else {
            //We don't want to override an existing avatrUrl with null
		    if (!avatarUrl)
		        avatarUrl = c.externalAvatarUrl;

			if (c.contactId != actor.name ||
			   c.contactLastName != actor.displayName ||
			   c.contactEmailAddress != actor.contactEmailAddress ||
			   c.externalAvatarUrl != avatarUrl) {

				var updContact = {
					contactId: actor.name,
					contactLastName: actor.displayName,
					contactEmailAddress: actor.emailAddress,
					externalData: JSON.stringify(actor),
					externalAvatarUrl: avatarUrl,
					useAuthedDownloadService: jira.settings.currentService
				};
				dbContact = yasoon.contact.save(updContact);
				if (dbContact) {
				    //Remove old entry from array
				    buffer = buffer.filter(function (elem) { return elem.contactId != dbContact.contactId; });
				    //Add new entry
				    buffer.push(dbContact);
				}

			}
		}
	};

	self.get = function (id) {
		var result = $.grep(buffer, function (c) { return c.contactId === id; });
		if (result.length === 1) {
			return result[0];
		} else {
			result = yasoon.contact.get(id);
			if (result && result.contactId) {
				buffer.push(result);
			}
			return result;
		}
	};
}

function JiraIconController() {
    var self = this;
    //Contains object { url: '' , fileName: '' }
    var iconBuffer = [];

    var saveIcon = function (url) {
        //generate unique FileName
        var fileName = 'Images\\' + jiraCreateHash(url) + '.png';
        console.log(url + ' : '+ fileName);
        //Download File
        yasoon.io.download(url, fileName, false, function () {
            //Success Handler
            var result = iconBuffer.filter(function (elem) { return elem.url == url; });
            if (result.length === 1) {
                result[0].fileName = yasoon.io.getLinkPath(fileName);
            }
            yasoon.setting.setAppParameter('icons', JSON.stringify(iconBuffer));
        });

        //Temporary save URL in Buffer
        iconBuffer.push({ url: url, fileName: url });

        return url;
    };

    this.mapIconUrl = function (url) {
        //Avoid mapping local URLs
        if (url.indexOf('http') !== 0) {
            return url;
        }

        var result = iconBuffer.filter(function (elem) { return elem.url == url; });
        if (result.length > 1) {
            //Should never happen --> remove both elements from buffer
            iconBuffer = iconBuffer.filter(function (elem) { return elem.url != url; });
            result = [];
        }

        if (result.length === 1) {
            return result[0].fileName;
        } else {
            return saveIcon(url);
        }
    };

    this.addIcon = function (url) {
        var result = iconBuffer.filter(function (elem) { return elem.url == url; });
        if (result.length === 0) {
            saveIcon(url);
        }
    };
    

    // init
    var iconString = yasoon.setting.getAppParameter('icons');
    if (iconString) {
        iconBuffer = JSON.parse(iconString);
    }
}

function jiraIssueGetter() {
	var deferredObject = this.deferredObject;

	return $.Deferred(function (dfd) {
		if (deferredObject && !deferredObject.issue) {
			var issueKey = (deferredObject['activity:target']) ? deferredObject['activity:target'].title['#text'] : deferredObject['activity:object'].title['#text'];
			deferredObject.issue = jira.issues.get(issueKey);
			if (deferredObject.issue) {
				dfd.resolve();
			} else {
				jiraLog('Call Issue');
				yasoon.oauth({
					url: jira.settings.baseUrl + '/rest/api/2/issue/' + issueKey + '?expand=transitions,renderedFields',
					oauthServiceName: jira.settings.currentService,
					headers: jira.CONST_HEADER,
					type: yasoon.ajaxMethod.Get,
					error: jira.handleError,
					success: function (data) {
						deferredObject.issue = JSON.parse(data);
						dfd.resolve();
					}
				});
			}
		} else {
			dfd.resolve();
		}
	});
}

function jiraWatcherGetter() {
	var deferredObject = this.deferredObject;

	return $.Deferred(function (dfd) {
		if (deferredObject && deferredObject.fields.watches && !deferredObject.fields.watches.watchers) {
			jiraLog('Get Watchers');
			yasoon.oauth({
				url: jira.settings.baseUrl + '/rest/api/2/issue/' + deferredObject.id + '/watchers',
				oauthServiceName: jira.settings.currentService,
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
		if (stacktrace !== undefined && stacktrace) {
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

function jiraQueue() {

	var deferred = $.Deferred();
	var promise = deferred.promise();

	$.each(arguments, function (i, obj) {

		promise = promise.then(function () {
			return obj();
		});
	});

	deferred.resolve();

	return promise;
}

function jiraCreateHash(input) {
    var hash = 0, i, chr, len;
    if (input.length === 0) return hash;
    for (i = 0, len = input.length; i < len; i++) {
        chr = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
//@ sourceURL=http://Jira/jira.js