var jira = {};
function jiraSyncError(message) {
    this.message = message;
    this.name = "SyncError";
}
jiraSyncError.prototype = Object.create(Error.prototype);

yasoon.app.load("com.yasoon.jira", new function () { //jshint ignore:line
	var self = this;
	jira = this;
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
			return Promise.reject();
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
//@ sourceURL=http://Jira/jira.js