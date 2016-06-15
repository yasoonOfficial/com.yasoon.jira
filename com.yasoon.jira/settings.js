function JiraSettingController() {
	var self = this;
	var templateLoaded = false;
	var settingTemplate = null;

	var defaults = {
		currentService: '',
		lastSync: new Date( new Date().getTime() - (1000 * 60* 60* 24 * 14) ),// If nothing in db, set it to 14 days ago
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
		syncTask: false,
		syncFeed: true,
		deleteCompletedTasks: false,
		hideResolvedIssues: false,
		activeFilters: 'fields.project.id,fields.issuetype.id,fields.assignee.emailAddress,fields.status.id,fields.priority.id'
	};

	self.renderSettingsContainer = function renderSettingsContainer(container) {
		if (!container) {
			return;
		}

		//Prepare Data for handlebar Template
		//We need all oAuth Services + determine the description
		var oAuthServices = yasoon.app.getOAuthServices();
		oAuthServices.forEach(function (service) {
			service.description = (service.appParams) ? service.appParams.description: service.serviceName;
		});

		//Check selecte filters
		jira.filter.filterObj.forEach(function (f) {
			//Is in selected?!
			f.selected = jira.filter.getSelectedFilters().filter(function (key) { return key === f.key; }).length > 0;
		});

		var templateParams = {
			oAuthServices: oAuthServices,
			loggedIn: !!jira.settings.currentService,
			filters: jira.filter.filterObj
		};

		if (!templateLoaded) {
			var path = yasoon.io.getLinkPath('templates/settings.hbs');
			$.get(path, function (template) {
				templateLoaded = true;
				settingTemplate = Handlebars.compile(template);
				self.fillSettingsContainer(container, settingTemplate, templateParams);
			});
		} else {
			self.fillSettingsContainer(container, settingTemplate, templateParams);
		}


	};

	self.fillSettingsContainer= function fillSettingsContainer(container, template, parameter) {
		//Add Values
		var elem = $('<div>' + template(parameter)+ '</div>');
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

			$('#jiraLogin').unbind().click(function () {
				var selectedServiceName = $('#currentService').val();
				var newService = $.grep(parameter.oAuthServices, function (s) { return s.serviceName == selectedServiceName; })[0];

				if (!newService) {
					yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('settings.loginNotPossible') });
					throw new Error('Selected service ' + selectedServiceName + ' does not exist.');
				}

				if(!newService.appParams || !newService.appParams.url){
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

			$('#jiraLogout').unbind().click(function () {
				yasoon.app.invalidateOAuthToken(self.currentService);
				self.baseUrl = '';
				self.currentService = '';
				yasoon.setting.setAppParameter('baseUrl', '');
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
				$('#jiraReloadOAuth').prop('disabled', true).unbind();
				var app = yasoon.model.apps.get('com.yasoon.jira');
				yasoon.store.getLatestVersions(function (storeApp) {
					if (storeApp.id > app.origin.versionId) {
						yasoon.dialog.showMessageBox(yasoon.i18n('settings.pendingUpdates'));
						$('#jiraReloadOAuth').unbind().prop('disabled', false).click(reloadOAuthHandler);
						return;
					}
					if (app.origin.basePath.indexOf('update') > -1) {
						yasoon.dialog.showMessageBox(yasoon.i18n('settings.pendingUpdatesApp'));
						$('#jiraReloadOAuth').unbind().prop('disabled', false).click(reloadOAuthHandler);
						return;
					}

					yasoon.app.downloadManifest(null, function (path) {
						if (path) {
							jira.downloadScript = true;
							yasoon.app.update(null, null, function () {
								yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
								yasoon.alert.add({ message: yasoon.i18n('settings.reloadSuccess'), type: 3});
							});
						}
					});
				});

				return false;
			}
			
			$('#jiraReloadOAuth').unbind().click(reloadOAuthHandler);
		};
		container.setContent(elem.html());
	};

	self.saveSettings = function saveSettings (form) {
		//Create deep copy
		$.each(form, function (i, param) {
			//Special Case for activeFilters
			if (param.key === 'activeFilters' && self[param.key] != param.value ) {
				yasoon.dialog.showMessageBox(yasoon.i18n('settings.filterChange'));
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

	//Server Default Settings
	var defSettingsString = yasoon.setting.getAppParameter('defaultSettings');
	if (defSettingsString) {
		jira.defaultSettings = JSON.parse(defSettingsString);
	}

	//Determine settings to load:
	var settingsString = yasoon.setting.getAppParameter('settings');
	var settings = null;
	if (!settingsString) {
		//Initial Settings
		settings = $.extend(defaults, jira.defaultSettings);
		yasoon.setting.setAppParameter('settings', JSON.stringify(settings));
	} else {
		//Load Settings
		settings = JSON.parse(settingsString);
		settings = $.extend(defaults, jira.defaultSettings, settings);
	}
	$.each(settings, function (key, value) {
		self[key] = value;
	});
	self.lastSync = new Date(self.lastSync);
}

//@ sourceURL=http://Jira/settings.js