function JiraSettingController() {
	var self = this;
	var defaults = {
		currentService: '',
		lastSync: new Date( new Date().getTime() - (1000 * 60* 60* 24 * 30) ),// If nothing in db, set it to 30 days ago
		showDesktopNotif: true,
		addAttachmentsOnNewAddIssue: false,
		showFeedAssignee: true,
		showFeedMentioned: true,
		showFeedWatcher: true,
		showFeedProjectLead: false,
		showFeedReporter: true,
		showFeedCreator: true,
		showFeedComment: true,
		syncCalendar: false
	};

	self.renderSettingsContainer = function renderSettingsContainer (container) {
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
			//Auto Add Attachments
			'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			'       <div class="col-sm-4 checkbox">' +
			'           <b class="pull-right">Automatically add attachments in issue dialogs</b>' +
			'       </div>' +
			'       <div class="col-sm-8">' +
			'           <div class="checkbox">' +
			'               <label>' +
			'                   <input class="formValue" type="checkbox" id="addAttachmentsOnNewAddIssue" name="addAttachmentsOnNewAddIssue">' +
			'               </label>' +
			'           </div>' +
			'       </div>' +
			'   </div>' +
			'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			'       <div class="col-sm-4 checkbox">' +
			'           <b class="pull-right">Show feed entry for issue if</b>' +
			'       </div>' +
			'       <div class="col-sm-8">' +
			'           <div class="checkbox">' +
			'               <label>' +
			'                   <input class="formValue" type="checkbox" id="showFeedAssignee" name="showFeedAssignee" disabled checked> I am the assignee' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox">' +
			'               <label>' +
			'                   <input class="formValue" type="checkbox" id="showFeedMentioned" name="showFeedMentioned" disabled checked> I have been mentioned' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox">' +
			'               <label>' +
			'                   <input class="formValue" type="checkbox" id="showFeedWatcher" name="showFeedWatcher"> I am watching the issue' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox">' +
			'               <label>' +
			'                   <input class="formValue" type="checkbox" id="showFeedProjectLead" name="showFeedProjectLead"> I am the project lead' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox">' +
			'               <label>' +
			'                   <input class="formValue" type="checkbox" id="showFeedReporter" name="showFeedReporter"> I am the reporter' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox">' +
			'               <label>' +
			'                   <input class="formValue" type="checkbox" id="showFeedCreator" name="showFeedCreator"> I am the creator' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox">' +
			'               <label>' +
			'                   <input class="formValue" type="checkbox" id="showFeedComment" name="showFeedComment"> I commented on the issue' +
			'               </label>' +
			'           </div>' +
			'       </div>' +
			'   </div>' +
			//'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			//'       <div class="col-sm-4 checkbox">' +
			//'           <b class="pull-right">Enable Calendar Integration</b>' +
			//'       </div>' +
			//'		<div class="col-sm-8">' +
			//'           <label>' +
			//'               <input class="formValue" type="checkbox" id="syncCalendar" name="syncCalendar">' +
			//'           </label>' +
			//'		</div>' +
			//'	</div>'+
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

				yasoon.app.getOAuthUrlAsync('com.yasoon.jira', selectedServiceName, function (url) {
					window.open(url);
				},
				function () {
					//Setting new currentService is done in jira.handleOauthSuccess()

					//Refresh UI --> standard yasoon Function
					oAuthSuccess();
				});

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

			function reloadOAuthHandler(e) {
				e.preventDefault();
				
				//We have a few checks to do.
				//This button shouldn't be used if
				// - it has already been clicked and processing is not finished yet
				// - it's currently an version running from a shadow folder 
				// - Or the downloaded app is newer (prevent implicit updates)
				$('#jiraReloadOAuth').unbind();
				var app = yasoon.model.apps.get('com.yasoon.jira');
				yasoon.store.getLatestVersions(function (storeApp) {
					if (storeApp.id != app.origin.versionId) {
						yasoon.dialog.showMessageBox('There are pending updates which prevent this action. Please check for latest updates in the Outlook menu: File --> yasoon, restart Outlook and try again');
						$('#jiraReloadOAuth').unbind().click(reloadOAuthHandler);
						return;
					}
					if (app.origin.basePath.indexOf('update') > -1) {
						yasoon.dialog.showMessageBox('There are pending updates which prevent this action. Please restart Outlook and try again');
						$('#jiraReloadOAuth').unbind().click(reloadOAuthHandler);
						return;
					}

					yasoon.app.downloadManifest(null, function (path) {
						if (path) {
							yasoon.app.update(null, null, function () {
								yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
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

	var dataString = yasoon.setting.getAppParameter('data');
	if (dataString) {
		jira.data = JSON.parse(dataString);
	}

	//Load License
	var licenseString = yasoon.setting.getAppParameter('license');
	if (licenseString) {
		jira.license = JSON.parse(licenseString);
		jira.license.validUntil = new Date(jira.license.validUntil);
	} else {
		jira.license = { comment: 'Please play fair and pay for your software.', isFullyLicensed: false, validUntil: new Date(2099, 11, 01)};
		yasoon.setting.setAppParameter('license', JSON.stringify(jira.license));
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