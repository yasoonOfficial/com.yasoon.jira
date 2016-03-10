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
	jira.restartRequired = false;
	jira.firstSyncedNotifications = 0;
	var startSync = new Date();
	var currentPage = 1;
	var oAuthSuccess = false;

	this.lifecycle = function (action, oldVersion, newVersion) {
		if (action === yasoon.lifecycle.Upgrade && newVersion === '1.0.4' && oldVersion[0] !== '1') { //Only to 1.0.4 if we are coming from an really old version (e.g. 0.9.3)
			yasoon.setting.setAppParameter('recentIssues', '[]');
			jira.restartRequired = true;

		}
		jira.downloadScript = true;
	};

	this.init = function init () {
		jira.settings = new JiraSettingController();
		jira.notifications = new JiraNotificationController();
		jira.ribbons = new JiraRibbonController();
		jira.contacts = new JiraContactController();
		jira.icons = new JiraIconController();
		jira.queue = new jiraSyncQueue();
		jira.filter = new JiraFilterController();
		jira.issues = new JiraIssueController();
		jira.cache = {};

		yasoon.addHook(yasoon.setting.HookCreateRibbon, jira.ribbons.createRibbon);
		yasoon.addHook(yasoon.notification.HookRenderNotificationAsync, jira.notifications.renderNotification);
		yasoon.addHook(yasoon.feed.HookCreateUserComment, jira.notifications.addComment);
		yasoon.addHook(yasoon.setting.HookRenderSettingsContainer, jira.settings.renderSettingsContainer);
		yasoon.addHook(yasoon.setting.HookSaveSettings, jira.settings.saveSettings);

		yasoon.outlook.mail.registerRenderer("jiraMarkup", getJiraMarkupRenderer());

		jira.filter.load();
		jira.filter.register();

		//Check Licensing
		if (jiraIsLicensed(false)) {
			self.registerEvents();
		}
		self.checkLicense();

		//Download custom script
		self.downloadCustomScript();
	};
	
	this.registerEvents = function () {
		//yasoon.view.header.addTab('jiraIssues', 'Issues', self.renderIssueTab);
		yasoon.app.on("oAuthSuccess", jira.handleOAuthSuccess);
		yasoon.app.on("oAuthError", jira.handleOAuthError);
		yasoon.outlook.on("selectionChange", jira.handleSelectionChange);
		yasoon.outlook.on("itemOpen", jira.handleNewInspector);
		yasoon.periodicCallback(300, jira.sync);
		yasoon.on("sync", jira.sync);
	};

	this.handleSelectionChange = function handleSelectionChange(item) {
		jira.ribbons.updateRibbons(item);
		jira.ribbons.updateAttachmentRibbons(item);
	};

	this.handleNewInspector = function handleNewInspector(ribbonCtx) {
		jira.ribbons.updateRibbons(ribbonCtx.items[0], ribbonCtx.inspectorId);
	};

	this.sync = function sync() {
		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			return;
		}
		return jira.queue.add(self.syncData);
	};

	this.syncData = function () {
		if (jira.restartRequired) {
			//Notify user about recent update
			yasoon.dialog.showMessageBox('JIRA for Outlook made some configurations on your Outlook. Please restart Outlook once again to use all new functionalities');
			jira.restartRequired = false;
		}

		var currentTs = new Date().getTime();
		var oldTs = jira.settings.lastSync.getTime() - 1000;

		jiraLog('Sync starts: ' + new Date().toISOString());
		return self.initData()
		.then(jira.issues.refreshBuffer)
		.then(function () {
			return self.syncStream('/activity?streams=update-date+BETWEEN+' + oldTs + '+' + currentTs);
		})
		.then(function () {
			//Only on first sync, make sure there are at least some own issues.
			if (oAuthSuccess) {
				var ownUserKey = jira.data.ownUser.key || jira.data.ownUser.name; //Depending on version >.<
				return jiraGet('/rest/api/2/search?jql=assignee%20%3D%20%22' + ownUserKey + '%22%20AND%20status%20!%3D%20%22resolved%22%20ORDER%20BY%20created%20DESC&maxResults=20&fields=summary')
				.then(function (data) {
					var ownIssues = JSON.parse(data);
					if (ownIssues.total > 0) {
						ownIssues.issues.forEach(function (issue) {
							jira.notifications.queueChildren(issue);
						});
					}
				});
			}
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

			if (oAuthSuccess) {
				oAuthSuccess = false;
				yasoon.util.logActivity('oAuthSuccess', JSON.stringify({
					app: 'com.yasoon.jira',
					count: jira.firstSyncedNotifications
				}));
			}
		})
		.catch(jiraSyncError, function (error) {
			jiraLog('Sync Error:', error);
		})
		.catch(jiraProxyError, function () {
			//Do nothing - just for dev information
			console.log('Proxy error');
		})
		.catch(function (e) {
			yasoon.util.log(((e.message) ? e.message : e), yasoon.util.severity.error, getStackTrace(e));
		})
		.finally(function() {
			jira.notifications.showDesktopNotif();
		});
	};

	this.handleOAuthSuccess = function (serviceName) {
		jira.settings.currentService = serviceName;
		yasoon.setting.setAppParameter('settings', JSON.stringify(jira.settings));
		oAuthSuccess = true;
		self.sync();

		self.checkLicense();
	};

	this.handleOAuthError = function (serviceName, statusCode, error) {
		console.log('OAuth Error', error, statusCode);
		var initialError = error;
		if (statusCode == 500) {
			yasoon.dialog.showMessageBox("Couldn\'t reach JIRA server. Either the system does not exist anymore or is currently not reachable. (e.g. Proxy or VPN is missing)");
		} else if (error.indexOf('oauth_problem') === 0) {
			//Standard OAuth Messages => http://wiki.oauth.net/w/page/12238543/ProblemReporting
			error = error.split('&')[0];
			error = error.split('=')[1];
			if (error) {
				switch (error) {
					case 'consumer_key_unknown':
						yasoon.dialog.showMessageBox("The application link is unknown. Please make sure you have an application link in JIRA called: yasoonjira");
						break;
					case 'timestamp_refused':
						yasoon.dialog.showMessageBox("Jira refuses the request because of time differences. Either your local time is not set correctly or the JIRA server has a wrong time. (different timezones are ok)");
						break;
					case 'signature_invalid':
						yasoon.dialog.showMessageBox("The certificate you are using in the application link is invalid. Please make sure you have setup JIRA correctly. Afterwards visit the settings and click on \"Reload System Information\"");
						break;
					default:
						yasoon.alert.add({ type: yasoon.alert.alertType.error, message: initialError });
				}

				return;
			}
		} else {

		}
	};

	this.renderIssueTab = function (tabContainer) {
		console.log(tabContainer);
		tabContainer.setTemplate('templates/issueSearch.hbs');
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

				if (oAuthSuccess)
					jira.firstSyncedNotifications++;

				if (notif)
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
			return jiraGetWithHeaders('/rest/api/2/serverInfo')
			.spread(function (serverInfo, headers) {
				//This is one of the first calls. We may have a proxy (like starbucks) returning an XML.
				jiraCheckProxyError(serverInfo);
				serverInfo = JSON.parse(serverInfo);
				if (serverInfo.versionNumbers[0] === 6 && serverInfo.versionNumbers[1] < 1)
					return jiraGet('/rest/api/2/user?username=' + headers['X-AUSERNAME']);
				else
					return jiraGet('/rest/api/2/myself');
			})
			.then(function (ownUserData) {
				jira.data.ownUser = JSON.parse(ownUserData);
				yasoon.setting.setAppParameter('ownUser', JSON.stringify(jira.data.ownUser));
				jira.contacts.updateOwn(jira.data.ownUser);
			})
			.then(jira.filter.reIndex)
			.then(function () {
				//Second get all projects
				jiraLog('Get Projects');
				return jiraGet('/rest/api/2/project')
				.then(function (projectData) {
					var projects = JSON.parse(projectData);
					
					//Clear detailed project data, will be filled in next step
					jira.data.projects = [];
					return projects;
				})
				.tap(self.cleanDeletedProjects)
				.each(function (project) {
					//Get detailed information for each project
					return jiraGet('/rest/api/2/project/' + project.key)
					.then(function (singleProject) {
						var proj = JSON.parse(singleProject);
						jira.data.projects.push(proj);
					});
				});
			})
			.then(function () {
				jira.firstTime = false;
			})
			.tap(self.loadProjectCache); //async but not blocking. next then will be executed
			//.then(function () {
			//	//Third get all issue types
			//	jiraLog('Get Issuetypes');
			//	return jiraGet('/rest/api/2/issuetype')
			//	.then(function (issueTypes) {
			//		jira.data.issueTypes = JSON.parse(issueTypes);
			//		jira.settings.updateData();
			//		jira.firstTime = false;
			//	});
			//});
		} else {
			return Promise.resolve();
		}
	};

	this.cleanDeletedProjects = function (projects) {		
		//Check templates for deleted projects
		var templateString = yasoon.setting.getAppParameter('createTemplates');
		if (templateString) {
			var templates = JSON.parse(templateString);
			var newTemplates = [];
			
			for (var i = 0; i < templates.length; i++) {
				var tmpl = templates[i];
				if (projects.filter(function (p) { return p.id === tmpl.project.id; }).length > 0) //jshint ignore:line
					newTemplates.push(tmpl);
			}
			
			if (templates.length !== newTemplates.length)
				yasoon.setting.setAppParameter('createTemplates', JSON.stringify(newTemplates));
		}
					
		//Check for deleted projects in recent projects		
		var recentString = yasoon.setting.getAppParameter('recentProjects');
		if (recentString) {
			var recent = JSON.parse(recentString);
			var newRecent = [];
			
			for (var a = 0; a < recent.length; a++) {
				var rec = recent[a];
				if (projects.filter(function (p) { return p.id === rec.id; }).length > 0) //jshint ignore:line
					newRecent.push(rec);
			}
			
			if (recent.length !== newRecent.length)
				yasoon.setting.setAppParameter('recentProjects', JSON.stringify(newRecent));
		}		
	};

	this.loadProjectCache = function () {
		console.log('Start loading Cache', new Date());
		var cacheProjects = [];
		return Promise.resolve()
		.then(function () {
			//First determine Projects for which we create a cache
			var recentProjectsString = yasoon.setting.getAppParameter('recentProjects') || '[]';
			var recentProjects = JSON.parse(recentProjectsString);
			
			recentProjects.forEach(function (project) {
				cacheProjects.push(project);
			});

			//If we haven't a full recent items list --> add a few random projects. Maybe we have luck :D
			if (cacheProjects.length < 10) {
				jira.data.projects.forEach(function (project) {
					if (cacheProjects.length >= 10)
						return false;

					var r = recentProjects.filter(function (rec) { return rec.key === project.key; });
					if (r.length === 0)
						cacheProjects.push(project);
				});
			}

		})
		.then(function () {
			var promises = [];
			//Get Create Meta for each project (and automatically for each issuetype)
			cacheProjects.forEach(function (project) {
				promises.push(jiraGet('/rest/api/2/issue/createmeta?projectIds=' + project.id + '&expand=projects.issuetypes.fields'));
			});
			return Promise.all(promises)
			.then(function (metas) {
				//
				for (var i = 0; i < metas.length; i++)
					metas[i] = JSON.parse(metas[i]);

				//Transform data structure
				var result = [];
				metas.forEach(function (meta) {
					meta.projects.forEach(function (project) {
						result.push(project);
					});
				});
				jira.cache.createMetas = result;
			});
		})
		.then(function () {
			//Get user Preferences for each project and each issue type
			var promises = [];
			jira.cache.userMeta = {};
			cacheProjects.forEach(function (project) {
				jira.cache.userMeta[project.id] = {};
				project.issueTypes.forEach(function (issueType) {
					promises.push(
						jiraGet('/secure/QuickCreateIssue!default.jspa?decorator=none&pid=' + project.id + '&issuetype=' + issueType.id)
						.then(function (data) {
							var userMeta = JSON.parse(data);
							jira.cache.userMeta[project.id][issueType.id] = userMeta;
						}).catch(function () { })
					);
				});
			});

			return Promise.all(promises);
		})
		.then(function () {
			console.log('Cache loading finshed', new Date());
		});
	};

	this.downloadCustomScript = function () {
		if (jira.downloadScript) {
			var customScriptUrl = yasoon.setting.getAppParameter('customScript');
			if (customScriptUrl) {
				yasoon.io.download(customScriptUrl, 'Dialogs\\customScript.js', true, function () {
					jira.downloadScript = false;
				});
			}
		}
	};

	this.checkLicense = function () {
		if (!jira.license.isFullyLicensed) {
			var isLicensed = jiraIsLicensed(false);
			//Check License Information
			jiraGetProducts()
			.then(function (products) {
				if (products && products.length > 0) {
					jira.license.validUntil = products[0].validUntil;
				}

				//Check if it's valid license 
				if (jiraIsLicensed(false)) {
					//Check if it's valid forever and if it's a Server instance (url does not ends with jira.com or atlassian.net) 
					if (jira.license.validUntil > new Date(2099, 0, 1) & !jiraIsCloud(jira.settings.baseUrl))
						jira.license.isFullyLicensed = true; //No need to check license again

					if (!isLicensed) {
						//If addon hasn't been licensed before, we need to register events now.
						jira.registerEvents();
					}
				} else {
					setTimeout(function () {
						jiraOpenPurchaseDialog();
					}, 10);
				}
				yasoon.setting.setAppParameter('license', JSON.stringify(jira.license));
			})
			.catch(function (e) {
				if (new Date() > jira.license.validUntil) {
					setTimeout(function () {
						jiraOpenPurchaseDialog();
					}, 10);
				}
			});
		}
	};

}); //jshint ignore:line
//@ sourceURL=http://Jira/jira.js