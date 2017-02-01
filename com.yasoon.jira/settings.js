function JiraSettingController() {
	var self = this;
	var templateLoaded = false;
	var settingTemplate = null;

	var settingsContainer = null;

	var defaults = {
		currentService: '',
		lastSync: new Date(new Date().getTime() - (1000 * 60 * 60 * 24 * 14)),// If nothing in db, set it to 14 days ago
		showDesktopNotif: true,
		addAttachmentsOnNewAddIssue: false,
		addMailHeaderAutomatically: 'off',
		addEmailOnNewAddIssue: false,
		showFeedAssignee: true,
		showFeedMentioned: true,
		showFeedWatcher: true,
		showFeedProjectLead: false,
		showFeedReporter: true,
		showFeedCreator: true,
		showFeedComment: true,
		newCreationScreen: true,
		syncCalendar: false,
		syncFeed: 'auto',
		syncTask: false,
		tasksActiveProjects: '',
		deleteCompletedTasks: false,
		tasksSyncAllProjects: true,
		hideResolvedIssues: false,
		activeFilters: 'fields.project.id,fields.issuetype.id,fields.status.id,fields.priority.id,fields.assignee.emailAddress'
	};

	self.renderSettingsContainer = function renderSettingsContainer(container) {
		if (!container) {
			container = settingsContainer;
		}

		if (!container)
			return;

		settingsContainer = container;
		//Prepare Data for handlebar Template
		//We need all oAuth Services + determine the description
		var oAuthServices = yasoon.app.getOAuthServices();
		oAuthServices.forEach(function (service) {
			service.description = (service.appParams) ? service.appParams.description : service.serviceName;
		});

		//Check selected filters
		jira.filter.filterObj.forEach(function (f) {
			//Is in selected?!            
			f.selected = jira.filter.getSelectedFilters().filter(function (key) { return key === f.key; }).length > 0;
		});

		//Active Projects for Task Sync
		var projects = [];
		if (jira.data.projects) {
			projects = JSON.parse(JSON.stringify(jira.data.projects));
		}
		if (self.tasksActiveProjects) {
			var activeProjects = self.tasksActiveProjects.split(',');
			projects.forEach(function (p) {
				p.selected = activeProjects.filter(function (key) { return key === p.key; }).length > 0;
			});
		}

		var templateParams = {
			oAuthServices: oAuthServices,
			loggedIn: !!jira.settings.currentService,
			filters: jira.filter.filterObj,
			taskSyncEnabled: jira.settings.taskSyncEnabled,
			tasksSyncAllProjects: jira.settings.tasksSyncAllProjects,
			projects: projects,
			loaderPath: yasoon.io.getLinkPath('Dialogs/ajax-loader.gif')

		};

		if (!templateLoaded) {
			var path = yasoon.io.getLinkPath('templates/settings.js');
			$.getScript(path, function (template) {
				templateLoaded = true;
				settingTemplate = jira.templates.settings;
				self.fillSettingsContainer(settingsContainer, settingTemplate, templateParams);
			});
		} else {
			self.fillSettingsContainer(settingsContainer, settingTemplate, templateParams);
		}


	};

	self.fillSettingsContainer = function fillSettingsContainer(container, template, parameter) {
		//Add Values
		var elem = $('<div>' + template(parameter) + '</div>');
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
			$('#activeFilters').multiSelect({
				selectableHeader: yasoon.i18n('settings.filterAvailable'),
				selectionHeader: yasoon.i18n('settings.filterActive')
			});

			$('#tasksActiveProjects').multiSelect({
				selectableHeader: yasoon.i18n('settings.taskProjectAvailable'),
				selectionHeader: yasoon.i18n('settings.taskProjectActive')
			});

			$('#tasksSyncAllProjects').off().on('change', function (e) {
				e.preventDefault();

				if ($('#tasksSyncAllProjects').getValue() === true) {
					$('#tasksProjectfilterContainer').slideUp();
				} else {
					$('#tasksProjectfilterContainer').slideDown();
				}
				return true;
			});
			$('#tasksSyncAllProjects').trigger('change');

			$('#jiraLogin').off().click(function () {
				var selectedServiceName = $('#currentService').val();
				var newService = $.grep(parameter.oAuthServices, function (s) { return s.serviceName == selectedServiceName; })[0];

				if (!newService) {
					yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('settings.loginNotPossible') });
					throw new Error('Selected service ' + selectedServiceName + ' does not exist.');
				}

				if (!newService.appParams || !newService.appParams.url) {
					yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('settings.loginNotPossible') });
					return false;
				}

				//Set new BaseUrl so it's considered for oAuth flow
				yasoon.setting.setAppParameter('baseUrl', newService.appParams.url);
				jira.settings.baseUrl = newService.appParams.url;

				yasoon.app.getOAuthUrlAsync('com.yasoon.jira', selectedServiceName, function (url) {
					window.open(url);
				},
					function () {
						//Setting new currentService also set in jira.handleOauthSuccess() because of automated oAuth popups
						jira.settings.currentService = selectedServiceName;

						//Refresh UI --> standard yasoon Function
						oAuthSuccess();
					});

				return false;
			});

			$('#addMailHeaderAutomatically').select2({ minimumResultsForSearch: 5 })
				.val(jira.settings.addMailHeaderAutomatically).trigger('change');

			$('#syncFeed').select2({ minimumResultsForSearch: 5 })
				.val(jira.settings.syncFeed).trigger('change');

			$('#jiraLogout').off().click(function () {
				yasoon.app.invalidateOAuthToken(self.currentService);
				self.currentService = '';
				yasoon.setting.setAppParameter('settings', JSON.stringify(self));
				yasoon.view.header.triggerOAuthStatus.valueHasMutated();

				yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
				return false;
			});

			function reloadOAuthHandler(e) {
				e.preventDefault();

				//We have a few checks to do.
				//This button shouldn't be used if
				// - it has already been clicked and processing is not finished yet
				// - it's currently an version running from a shadow folder 
				// - Or the downloaded app is newer (prevent implicit updates)
				$('#jiraReloadOAuth').prop('disabled', true).off();
				var app = yasoon.model.apps.get('com.yasoon.jira');
				yasoon.store.getLatestVersions(function (storeApp) {
					if (storeApp.id > app.origin.versionId) {
						yasoon.dialog.showMessageBox(yasoon.i18n('settings.pendingUpdates'));
						$('#jiraReloadOAuth').off().prop('disabled', false).click(reloadOAuthHandler);
						return;
					}
					if (app.origin.basePath.indexOf('update') > -1) {
						yasoon.dialog.showMessageBox(yasoon.i18n('settings.pendingUpdatesApp'));
						$('#jiraReloadOAuth').off().prop('disabled', false).click(reloadOAuthHandler);
						return;
					}

					yasoon.app.downloadManifest(null, function (path) {
						if (path) {
							jira.downloadScript = true;
							yasoon.app.update(null, null, function () {
								yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
								yasoon.alert.add({ message: yasoon.i18n('settings.reloadSuccess'), type: 3 });
							});
						}
					});
				});

				return false;
			}

			$('#jiraReloadOAuth').off().click(reloadOAuthHandler);
		};
		container.setContent(elem.html());
	};

	self.saveSettings = function saveSettings(form) {
		//Create deep copy
		$.each(form, function (i, param) {
			//Special Case for activeFilters
			if (param.key === 'activeFilters' && self[param.key] != param.value) {
				yasoon.dialog.showMessageBox(yasoon.i18n('settings.filterChange'));
				if (param.value === null) //Null filter is not good :D
					param.value = '';
			}
			if (param.key === 'tasksActiveProjects' && self[param.key] != param.value ||
				param.key === 'taskSyncEnabled' && self[param.key] != param.value ||
				param.key === 'tasksSyncAllProjects' && self[param.key] != param.value) {
				jira.tasks.requireFullSync = true;
				jira.sync();
			}
			if (param.value == "true") {
				self[param.key] = true;
			} else if (param.value == "false") {
				self[param.key] = false;
			} else {
				self[param.key] = param.value;
			}
		});
		self.save();
	};

	self.save = function () {
		var result = {};
		Object.keys(defaults).forEach(function (key) {
			result[key] = self[key] || defaults[key];
		});
		yasoon.setting.setAppParameter('settings', JSON.stringify(self));
	};

	self.setLastSync = function (date) {
		self.lastSync = date;
		yasoon.feed.saveSyncDate(date);
		self.save();
	};

	self.updateData = function () {
		yasoon.setting.setAppParameter('data', JSON.stringify(jira.data));
	};

	/****** Initial Load of settings */
	var urlString = yasoon.setting.getAppParameter('baseUrl');
	if (urlString) {
		self.baseUrl = urlString;
	}

	var dataString = yasoon.setting.getAppParameter('ownUser');
	if (dataString) {
		jira.data = {};
		jira.data.ownUser = JSON.parse(dataString);
	}

	//Load License
	var licenseString = yasoon.setting.getAppParameter('license');
	if (licenseString) {
		jira.license = JSON.parse(licenseString);
		jira.license.validUntil = new Date(jira.license.validUntil);
	} else {
		var validUntil = new Date();
		validUntil.setDate(validUntil.getDate() + 14);
		jira.license = { comment: 'Please play fair and pay for your software.', isFullyLicensed: false, validUntil: validUntil };
		yasoon.setting.setAppParameter('license', JSON.stringify(jira.license));
	}

	//Load System Infos
	var sysInfoString = yasoon.setting.getAppParameter('systemInfo');
	if (sysInfoString) {
		jira.sysInfo = JSON.parse(sysInfoString);
	}

	//Load TaskSync Settings
	self.taskSyncEnabled = (yasoon.setting.getAppParameter('taskSyncEnabled') == 'true');

	//Load Temlead CRM Settings
	var teamleadCrmDataString = yasoon.setting.getAppParameter('teamlead');
	if (teamleadCrmDataString) {
		self.teamlead = JSON.parse(teamleadCrmDataString);
		if (self.teamlead.mapping) {
			try {
				self.teamlead.mapping = JSON.parse(self.teamlead.mapping) || {};
			} catch (e) {
				self.teamlead.mapping = {};
			}
		}
	}

	//Merge company defaults
	var defaultSettingsString = yasoon.setting.getAppParameter('defaultSettings');
	if (defaultSettingsString) {
		var def = JSON.parse(defaultSettingsString);
		defaults = $.extend(defaults, def);
	}

	//Determine settings to load:
	var settingsString = yasoon.setting.getAppParameter('settings');
	var settings = null;
	if (!settingsString) {
		//Initial Settings
		settings = defaults;
		yasoon.setting.setAppParameter('settings', JSON.stringify(settings));
	} else {
		//Load Settings
		settings = JSON.parse(settingsString);
		settings = $.extend(defaults, settings);
	}

	$.each(settings, function (key, value) {
		self[key] = value;
	});
	self.lastSync = new Date(self.lastSync);
}

//@ sourceURL=http://Jira/settings.js