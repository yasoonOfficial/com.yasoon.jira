var jira = null;
yasoon.app.load("com.yasoon.jira", new function () { //jshint ignore:line
	var self = this;
	jira = this;
	jira.CONST_PULL_RESULTS = 25;
	jira.CONST_LIVE_PAGE_SIZE = 10;

	jira.data = {
		ownUser: null,
		projects: null,
		issueTypes: null
	};

	jira.firstTime = true;
	jira.restartRequired = false;
	var startSync = new Date();
	var ignoreEntriesAtSync = 0;
	var oAuthSuccess = false;
	var liveModeCurrentPageSize = jira.CONST_LIVE_PAGE_SIZE;

	this.lifecycle = function (action, oldVersion, newVersion) {
		if (action === yasoon.lifecycle.Upgrade && newVersion === '1.0.4' && oldVersion[0] !== '1') { //Only to 1.0.4 if we are coming from an really old version (e.g. 0.9.3)
			yasoon.setting.setAppParameter('recentIssues', '[]');
			jira.restartRequired = true;

		}
		if (action === yasoon.lifecycle.Upgrade && newVersion === '1.1.6') {
			var templatesString = yasoon.setting.getAppParameter('createTemplates');
			if (templatesString) {
				var templates = JSON.parse(templatesString);
				templates.forEach(function (t) {
					var proj = t.project;
					t.project = { id: proj.id, name: proj.name, key: proj.key };
				});

				yasoon.setting.setAppParameter('createTemplates', JSON.stringify(templates));
			}

			//Set new initial settings (not strictly nessecary, as extend should add them but we want to have consistent settings)
			var settingsString = yasoon.setting.getAppParameter('settings');
			var settings = null;
			if (settingsString) {
				//Load Settings
				settings = JSON.parse(settingsString);
				settings.syncFeed = true;
				yasoon.setting.setAppParameter('settings', JSON.stringify(settings));
			}
		}

		if (action === yasoon.lifecycle.Upgrade && newVersion === '1.2.3') {
			var settingsString = yasoon.setting.getAppParameter('settings');
			var settings = null;
			if (settingsString) {
				//Load Settings
				settings = JSON.parse(settingsString);
				settings.syncFeed = 'auto';
				yasoon.setting.setAppParameter('settings', JSON.stringify(settings));
			}
		}

		if (action === yasoon.lifecycle.Upgrade && newVersion === '1.5.6') {
			yasoon.setting.setAppParameter('createTemplates', '{}');
			yasoon.setting.setAppParameter('recentIssues', '[]');
		}

		jira.downloadScript = true;
	};

	this.init = function init() {
		jira.settings = new JiraSettingController();
		jira.notifications = new JiraNotificationController();
		jira.tasks = new JiraTaskController();
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
		yasoon.addHook(yasoon.setting.HookLoadFeedChildren, jira.syncChildren);
		yasoon.addHook(yasoon.setting.HookLoadNextFeedPage, jira.syncNextFeed);

		yasoon.outlook.mail.registerRenderer("jiraMarkup", getJiraMarkupRenderer());

		jira.filter.load();
		jira.filter.register();

		//Check Licensing
		if (jiraIsLicensed(false)) {
			self.registerEvents();
		}
		self.checkLicense();

		//Check if live mode needs to be enabled
		if (jira.settings.syncFeed === 'live') {
			yasoon.feed.enableLiveMode();
			jira.sync();
		}

		//Download custom script
		self.downloadCustomScript();

		//Upgrade to 2.5 check
		try {
			//"2.5.6500.26063 x64"
			var versionNums = yasoon.internal.getYasoonVersion().split('.');
			if (versionNums[0] == 2 && versionNums[1] < 5) {
				//On first time, we will set the pendingUpdate25 parameter.
				//If it does not exist here --> first start, always try to start the updater.exe via openHomepage (you remember... hacky workaround to start a Process)
				//If it does exist --> not first start, check for require25.upgrade file. If it still exists, updater.exe could not be spawned and we will show a popup instead
				var param = yasoon.setting.getAppParameter('pendingUpdate25');
				var spawnUpdater = false;
				if (!param) {
					spawnUpdater = true;
					yasoon.setting.setAppParameter('pendingUpdate25', 'true');
				} else {
					spawnUpdater = !yasoon.io.exists('require25.upgrade');
				}

				if (spawnUpdater) {
					yasoon.app.get('com.yasoon.jira').openHomepage();
				} else {
					window.open('https://static-resources.yasoon.com/outlook/manualupgrade.html');
				}
			}
		}
		catch (e) {
			//?!
		}
	};

	this.registerEvents = function () {
		//yasoon.view.header.addTab('jiraIssues', 'Issues', self.renderIssueTab);
		yasoon.app.on("oAuthSuccess", jira.handleOAuthSuccess);
		yasoon.app.on("oAuthError", jira.handleOAuthError);
		yasoon.outlook.on("selectionChange", jira.handleSelectionChange);
		yasoon.outlook.on("itemOpen", jira.handleNewInspector);

		if (jira.settings.syncFeed !== 'live') {
			yasoon.periodicCallback(300, function () {
				//Don't pass the function directly, as yasoon will hook itself
				// to the promise otherwise
				jira.sync(arguments[0]);
			});
		}

		yasoon.on("sync", function () {
			//Don't pass the function directly, as yasoon will hook itself
			// to the promise otherwise
			jira.sync(arguments[0]);
		});
	};

	this.handleSelectionChange = function handleSelectionChange(item) {
		jira.ribbons.updateRibbons(item);
		jira.ribbons.updateAttachmentRibbons(item);
	};

	this.handleNewInspector = function handleNewInspector(ribbonCtx) {
		jira.ribbons.updateRibbons(ribbonCtx.items[0], ribbonCtx.inspectorId);
	};

	this.sync = function sync(source) {

		//Technical check
		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			return;
		}

		if (jira.settings.feedDisabled) {
			console.log('Feed disabled by Admin');
			return;
		}

		//Settings Check, Do not sync regularly if turned off.
		//If sync is turned off, we still need to sync data if task sync is active
		//+ For intial sync
		if (!self.firstTime && !jira.settings.syncTasks) {
			if (jira.settings.syncFeed == "manual" && source != 'manualRefresh')
				return;

			if (jira.settings.syncFeed == "off")
				return;
		}

		if (self.firstTime && (jira.settings.syncFeed == 'off' || jira.settings.syncFeed === 'manual') && !jira.settings.syncTasks) {
			return self.initData();
		}

		if (jira.settings.syncFeed === 'live')
			return jira.queue.add(self.syncLive, source);
		else
			return jira.queue.add(self.syncData, source);
	};

	this.syncLive = function (source) {
		//On sync from tab activation: limit entries to 10 again
		if (source !== 'manualRefresh') {
			liveModeCurrentPageSize = self.CONST_LIVE_PAGE_SIZE;
			yasoon.model.feeds.displayedEntries(self.CONST_LIVE_PAGE_SIZE);
		}

		self.initData()
			.then(function () {
				return jira.issues.getLastRelevant(liveModeCurrentPageSize);
			})
			.then(function (lastRelevant) {
				return lastRelevant.map(function (i) { return i.key });
			})
			.each(function (issueKey) {
				return self.syncStream('/activity?providers=issues&streams=issue-key+IS+' + issueKey, 4, true);
			});
	};

	this.syncNextFeed = function () {
		liveModeCurrentPageSize += self.CONST_LIVE_PAGE_SIZE;
		jira.issues.getLastRelevant(self.CONST_LIVE_PAGE_SIZE, true)
			.then(function (lastRelevant) {
				return lastRelevant.map(function (i) { return i.key });
			})
			.each(function (issueKey) {
				return self.syncStream('/activity?providers=issues&streams=issue-key+IS+' + issueKey, 4, true);
			});
	};

	this.syncChildren = function (notif, count) {
		var key = JSON.parse(notif.externalData).key;
		self.syncStream('/activity?providers=issues&streams=issue-key+IS+' + key, count + 1, true);
	};

	this.syncData = function (source) {
		console.log('Source', source);
		if (jira.restartRequired) {
			//Notify user about recent update
			yasoon.dialog.showMessageBox(yasoon.i18n('general.restartNecessary'));
			jira.restartRequired = false;
		}

		var currentTs = new Date().getTime();
		var oldTs = jira.settings.lastSync.getTime() - 1000;

		jiraLog('Sync starts: ' + new Date().toISOString() + ' Source: ' + source);
		return self.initData()
			.then(function () {
				return jira.issues.refreshBuffer();
			})
			.then(function () {
				if (jira.settings.syncFeed == "off" || (jira.settings.syncFeed == "manual" && source != 'manualRefresh'))
					return;

				return self.syncStream('/activity?providers=issues&streams=update-date+BETWEEN+' + oldTs + '+' + currentTs);
			})
			.then(function () {
				return jira.tasks.syncLatestChanges();
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
				if (!(jira.settings.syncFeed == "off" || (jira.settings.syncFeed == "manual" && source != 'manualRefresh'))) {
					jira.settings.setLastSync(startSync);
				}

				jiraLog('Sync done: ' + new Date().toISOString());
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
			.finally(function () {
				jira.notifications.showDesktopNotif();
			});
	};

	this.handleOAuthSuccess = function (serviceName) {
		jira.settings.currentService = serviceName;
		yasoon.setting.setAppParameter('settings', JSON.stringify(jira.settings));
		try {
			yasoon.util.logActivity('oAuthSuccess', JSON.stringify({
				app: 'com.yasoon.jira'
			}));
		} catch (e) {

		}
		oAuthSuccess = true;
		self.sync();
		window.oAuthSuccess();
		self.checkLicense();
	};

	this.handleOAuthError = function (serviceName, statusCode, error) {
		if (statusCode === 500) {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotReachJira'));
		} else if (statusCode === 401) {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.ssoActive'));
		} else if (error.indexOf('oauth_problem') > -1) {
			//Standard OAuth Messages => http://wiki.oauth.net/w/page/12238543/ProblemReporting
			var regex = /oauth_problem=([^&]+)/g;
			var oauthError = regex.exec(error)[1];
			if (oauthError) {
				switch (oauthError) {
					case 'consumer_key_unknown':
						yasoon.dialog.showMessageBox(yasoon.i18n('general.applicationLinkUnknown'));
						break;
					case 'timestamp_refused':
						yasoon.dialog.showMessageBox(yasoon.i18n('general.timestampRefused'));
						break;
					case 'signature_invalid':
						yasoon.dialog.showMessageBox(yasoon.i18n('general.certificateInvalid'));
						break;
					case 'parameter_absent':
						yasoon.dialog.showMessageBox(yasoon.i18n('general.oauthParameterAbsent'));
						break;
					default:
						yasoon.alert.add({ type: yasoon.alert.alertType.error, message: error });
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
	this.syncStream = function (url, maxResults, noPaging) {
		//Defaults
		maxResults = maxResults || jira.CONST_PULL_RESULTS;

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
				//These entries have already been fetched...
				if (index < ignoreEntriesAtSync)
					return;

				jiraLog('Item #' + index + ':', feedEntry);
				//Only for jira!

				if (feedEntry['atlassian:application'] && feedEntry['atlassian:application']['#text'].toLowerCase().indexOf('jira') > -1) {
					var notif = jira.notifications.createNotification(feedEntry);
					if (notif) {
						return notif.save()
							.catch(function (e) {
								yasoon.util.log(((e.message) ? e.message : e), yasoon.util.severity.warning, getStackTrace(e));
							});
					}
				}
			})
			.then(function (entries) {
				//Determine if paging is required
				if (entries && entries.length > 0) {
					var lastObj = entries[entries.length - 1];
					var lastObjDate = new Date(lastObj.updated['#text']);
					var firstObjDate = new Date(entries[0].updated['#text']);

					if (entries.length == maxResults && lastObjDate > jira.settings.lastSync && !noPaging) {
						var newSyncDate = new Date(lastObjDate.getTime() + 2000);
						if ((firstObjDate.getTime() - lastObjDate.getTime()) <= 2000) {
							//Special Case... If all page entries are within 2 seconds, newSyncDate will be bigger than the lastSync date and we will receive exactly the same page again --> endless loop.
							//We need to fetch more data and ignore the first maxResults data.
							ignoreEntriesAtSync = maxResults;
							return self.syncStream('/activity?providers=issues&streams=update-date+BEFORE+' + firstObjDate.getTime(), maxResults + 50);
						} else {
							ignoreEntriesAtSync = 0;
							//MaxResults remembers the increased value from case above.
							//Complicated!!  We thought about it and if it happens once, we want to pull the larger list till end of sync!
							return self.syncStream('/activity?providers=issues&streams=update-date+BEFORE+' + newSyncDate.getTime(), maxResults);
						}
					}
				}
			});
	};

	this.initData = function initData() {
		var recentProjects = [];
		//First Get Own User Data
		jiraLog('Get Own Data');
		if (jira.firstTime) {
			return jiraGetWithHeaders('/rest/api/2/serverInfo')
				.spread(function (serverInfoString, headers) {
					//This is one of the first calls. We may have a proxy (like starbucks) returning an XML.
					jiraCheckProxyError(serverInfoString);
					jira.sysInfo = JSON.parse(serverInfoString);
					yasoon.setting.setAppParameter('systemInfo', serverInfoString);

					if (jira.sysInfo.versionNumbers[0] === 6 && jira.sysInfo.versionNumbers[1] < 1)
						return jiraGet('/rest/api/2/user?username=' + headers['X-AUSERNAME']);
					else
						return jiraGet('/rest/api/2/myself?expand=groups,applicationRoles');
				})
				.then(function (ownUserData) {
					jira.data.ownUser = JSON.parse(ownUserData);
					yasoon.setting.setAppParameter('ownUser', JSON.stringify(jira.data.ownUser));
					jira.contacts.updateOwn(jira.data.ownUser);
				})
				.then(function () {
					return jira.filter.reIndex();
				})
				.then(function () {
					return jira.tasks.syncTasks();
				})
				.then(function () {
					//Second get all projects
					jiraLog('Get Projects');
					return jiraGet('/rest/api/2/project')
						.then(function (projectData) {
							var projects = JSON.parse(projectData);

							//Clear detailed project data, will be filled in next step
							jira.data.projects = projects;
							return projects;
						})
						.then(function (projects) {
							return self.cleanDeletedProjects(projects);
						})
						.then(function (projects) {
							var recentString = yasoon.setting.getAppParameter('recentProjects');
							if (recentString) {
								recentProjects = JSON.parse(recentString);
							}

							if (projects.length > 10) {
								return recentProjects;
							} else {
								return projects;
							}
						})
						.each(function (project) {
							//Get detailed information for each project
							return jiraGet('/rest/api/2/project/' + project.key + '?expand=issueTypes')
								.then(function (singleProject) {
									var proj = JSON.parse(singleProject);
									var foundIndex = -1;
									jira.data.projects.some(function (p, index) {
										if (p.id == proj.id) {
											foundIndex = index;
											return true;
										}
										return false;
									});
									if (foundIndex > -1) {
										jira.data.projects[foundIndex] = proj;
									}
								});
						})
						.then(function () {
							console.log(jira.data.projects);
							jira.settings.renderSettingsContainer();
						});
				})
				.then(function () {
					jira.firstTime = false;
				})
				.tap(function () {
					self.loadProjectCache();
				}); //async but not blocking. next then will be executed
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

	this.cleanDeletedProjects = function cleanDeletedProjects(projects) {
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

		return projects;
	};

	this.loadProjectCache = function loadProjectCache() {
		console.log('Start loading Cache', new Date());
		var cacheProjects = [];
		return Promise.resolve()
			.then(function () {
				//First determine Projects for which we create a cache
				var recentProjectsString = yasoon.setting.getAppParameter('recentProjects') || '[]';
				var recentProjects = JSON.parse(recentProjectsString);

				recentProjects.forEach(function (project) {
					var expandedProject = jira.data.projects.filter(function (p) { return p.key === project.key; })[0] || project;
					cacheProjects.push(expandedProject);
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

					//Legacy - In old edit logic we didn't update recent items correctly.
					if (!project.issueTypes)
						return;

					project.issueTypes.forEach(function (issueType) {
						promises.push(
							jiraGet('/secure/QuickCreateIssue!default.jspa?decorator=none&pid=' + project.id + '&issuetype=' + issueType.id)
								.then(function (data) {
									var userMeta = parseUserMeta(data);
									//userMeta may have some important data html attibutes in attribute "editHtml"
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
						if (jira.license.validUntil > new Date(2099, 0, 1) && !jiraIsCloud(jira.settings.baseUrl))
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