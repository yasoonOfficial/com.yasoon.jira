var jira = {};
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
	jira.firstSyncedNotifications = 0;
	var startSync = new Date();
	var currentPage = 1;
 
	this.lifecycle = function(action, oldVersion, newVersion) {
		if (action === yasoon.lifecycle.Upgrade) {
			if (newVersion == "0.6.1") {
				var oAuthServices = yasoon.app.getOAuthServices();
				if (oAuthServices.length > 0) {
					var authedServices = oAuthServices.filter(function (element) { return !!element.accessToken; });
					if (authedServices.length > 0) {
						var data = yasoon.setting.getAppParameter('settings');
						if (data) {
							data = JSON.parse(data);
							data.currentService = authedServices[0].serviceName;
							yasoon.setting.setAppParameter('settings', JSON.stringify(data));
						}
					}
				}
			}
		}
	};

	this.init = function init () {
		jira.settings = new JiraSettingController();
		jira.notifications = new JiraNotificationController();
		jira.ribbons = new JiraRibbonController();
		jira.contacts = new JiraContactController();
		jira.icons = new JiraIconController();
		jira.queue = new jiraSyncQueue();
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
			{
				name: 'By Reporter',
				jsonPath: 'fields.reporter.emailAddress',
				label: function (name, id) {
					//if (jira.data.issueTypes) {
					//	var issueType = $.grep(jira.data.issueTypes, function (i) { return i.id === id; })[0];
					//	if (issueType) {
					//		return issueType.name;
					//	}
					//}
					return id;
				}
			}
		]);
		yasoon.on("sync", jira.sync);
		yasoon.app.on("oAuthSuccess", jira.sync);
		yasoon.periodicCallback(300, jira.sync);
	};

	this.sync = function sync () {

		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			return;
		}

		return jira.queue.add(self.syncData);
	};

	this.syncData = function () {
	    var currentTs = new Date().getTime();
	    var oldTs = jira.settings.lastSync.getTime() - 1000;

	    jiraLog('Sync starts: ' + new Date().toISOString());
	    return self.initData()
        .then(function () {
            jira.issues.refreshBuffer();
            return self.syncStream('/activity?streams=update-date+BETWEEN+' + oldTs + '+' + currentTs);
        })
        .then(function () {
            return jira.notifications.processChildren();
        })
        .then(function () {
            return jira.notifications.processCommentEdits();
        })
        .then(function () {
            jira.settings.setLastSync(startSync);
            jiraLog('Sync done: ' + new Date().toISOString());
			if(jira.firstTime) {
				yasoon.util.logActivity('syncCompleted', JSON.stringify({
					app: 'com.yasoon.jira',
					count: jira.firstSyncedNotifications
				}));
			}
        })
        .catch(jiraSyncError, function (error) {
            jiraLog('Sync Error:', error);
        })
        .catch(function (e) {
            yasoon.util.log(e.message, yasoon.util.severity.error, getStackTrace(e));
        })
		.finally(function() {
			jira.notifications.showDesktopNotif();
		});
	};

	//Handle Sync Event
	this.syncStream = function (url, maxResults, currentPage) {
	    //Defaults
	    maxResults = maxResults || jira.CONST_PULL_RESULTS;
	    currentPage = currentPage || 0;

        //Add maxResults to URL
	    if (url.indexOf('?') === -1) 
	        url += '?maxResults=' + maxResults;
	    else 
			url += '&maxResults=' + maxResults;
	
		jiraLog('Get Activity Stream');

		return jiraGet(url)
        .then(function (xmlData) {
            var jsonPage = jiraXmlToJson(new DOMParser().parseFromString(xmlData, "text/xml"));
            jiraLog('page:', jsonPage);
            if (jsonPage.feed && jsonPage.feed.entry) {
                //Adjust Data. If it's only 1 entry it's an object instead of array
                if (!$.isArray(jsonPage.feed.entry)) {
                    jsonPage.feed.entry = [jsonPage.feed.entry];
                }
                return jsonPage.feed.entry;
            }
            return [];
        })
        .each(function (feedEntry, index) {
            jiraLog('Item #' + index + ':', feedEntry);
            //Only for jira!
            if (feedEntry['atlassian:application'] && feedEntry['atlassian:application']['#text'].toLowerCase().indexOf('jira') > -1) {
            	var notif = jira.notifications.createNotification(feedEntry);
				
				if(jira.firstTime) 
					jira.firstSyncedNotifications++;
				
				if(notif)
					return notif.save();
            }
        })
        .then(function (entries) {
            //Determine if paging is required
            if (entries && entries.length > 0) {
                var lastObj = entries[entries.length - 1];
                var lastObjDate = new Date(lastObj.updated['#text']);

                if (entries.length == maxResults && jira.settings.lastSync < lastObjDate && currentPage < 2) {
                    return self.syncStream('/activity?streams=update-date+BEFORE+' + (lastObjDate.getTime() - 2000), maxResults, currentPage + 1);
                }
            }
        });

	};

	this.initData = function () {
        //First Get Own User Data
	    jiraLog('Get Own Data');
	    if (jira.firstTime) {
	        return jiraGet('/rest/api/2/myself')
            .then(function (ownUserData) {
                jira.data.ownUser = JSON.parse(ownUserData);
            })
            .then(function () {
                //Second get all projects
                jiraLog('Get Projects');
                return jiraGet('/rest/api/2/project')
                .then(function (projectData) {
                    var projects = JSON.parse(projectData);
                    jira.data.projects = [];
                    return projects;
                })
                .each(function (project) {
                    //Get detailed information for each project
                    return jiraGet('/rest/api/2/project/' + project.id)
                    .then(function (singleProject) {
                        var proj = JSON.parse(singleProject);
                        jira.data.projects.push(proj);
                    });
                });
            })
            .then(function () {
                //Third get all issue types
                jiraLog('Get Issuetypes');
                return jiraGet('/rest/api/2/issuetype')
                .then(function (issueTypes) {
                    jira.data.issueTypes = JSON.parse(issueTypes);
                    jira.settings.updateData();
                    jira.firstTime = false;
                });
            });
	    } else {
	        return Promise.resolve();
	    }
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