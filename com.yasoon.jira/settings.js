function JiraSettingController() {
	var self = this;
	var defaults = {
		currentService: '',
		lastSync: new Date( new Date().getTime() - (1000 * 60* 60* 24 * 30) ),// If nothing in db, set it to 30 days ago
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
		activeFilters: 'fields.project.id,fields.issuetype.id,fields.assignee.emailAddress,fields.status.id,fields.priority.id'
	};

	self.renderSettingsContainer = function renderSettingsContainer(container) {
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
				html += '           <option value="' + service.serviceName + '" '+ ((service.mainService) ? 'selected' : '' ) + '>' + description + '</option>';
			});

			html += '           </select>' +
					'       </div>' +
					'   </div>' +
					'   <div class="form-group" style="position:relative;margin-top:20px;">' +
					'       <div class="col-sm-4">' +
					'           <button class="btn btn-primary" id="jiraLogin">Login</button>' +
					'       </div>' +
					'   </div>' +
					'   <div> Miss a Jira System? <button id="jiraReloadOAuth" class="btn btn-link" style="padding-top: 4px; margin-left: -10px;"> Reload System Information</button></div>' +
					'</form>';

		} else {
			html = '<p>Please choose your settings. Only logout if you like to stop the service or like to connect to another Jira system</p>' +
			'<form class="form-horizontal" role="form">' +
			//Desktop Notification
			'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			'       <div class="col-sm-4 checkbox">' +
			'           <b class="pull-right">Show Desktop Notification</b>' +
			'       </div>' +
			'       <div class="col-sm-8">' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="showDesktopNotif" name="showDesktopNotif">' +
			'               <label for="showDesktopNotif">' +
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
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="addAttachmentsOnNewAddIssue" name="addAttachmentsOnNewAddIssue">' +
			'               <label for="addAttachmentsOnNewAddIssue">' +
			'               </label>' +
			'           </div>' +
			'       </div>' +
			'   </div>' +
			//Auto add emails
			'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			'       <div class="col-sm-4 checkbox">' +
			'           <b class="pull-right">Automatically add email (.msg) in issue dialogs</b>' +
			'       </div>' +
			'       <div class="col-sm-8">' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="addEmailOnNewAddIssue" name="addEmailOnNewAddIssue">' +
			'               <label for="addEmailOnNewAddIssue">' +
			'               </label>' +
			'           </div>' +
			'       </div>' +
			'   </div>' +			
			//Auto Add Mail Header
			'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			'       <div class="col-sm-4">' +
			'           <b class="pull-right">Automatically add email header to description</b>' +
			'       </div>' +
			'       <div class="col-sm-8">' +
			'           <select class="formValue" style="width: 140px" id="addMailHeaderAutomatically" name="addMailHeaderAutomatically">' +
			'              <option value="off">Disabled</option>' +
			'              <option value="top">On Top</option>'+
			'              <option value="bottom">At the Bottom</option>'+
			'           </select>' +
			'       </div>' +
			'   </div>' +
			//The other stuff
			'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			'       <div class="col-sm-4 checkbox">' +
			'           <b class="pull-right">Show feed entry for issue if</b>' +
			'       </div>' +
			'       <div class="col-sm-8">' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="showFeedAssignee" name="showFeedAssignee" disabled checked>' +
			'               <label for="showFeedAssignee">' +
			'                   I am the assignee' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="showFeedMentioned" name="showFeedMentioned" disabled checked>' +
			'               <label for="showFeedMentioned">' +
			'                   I have been mentioned' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="showFeedWatcher" name="showFeedWatcher">' +
			'               <label for="showFeedWatcher">' +
			'                   I am watching the issue' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox awesome">' +
			'				 <input class="formValue" type="checkbox" id="showFeedProjectLead" name="showFeedProjectLead">' +
			'               <label for="showFeedProjectLead">' +
			'                   I am the project lead' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="showFeedReporter" name="showFeedReporter">' +
			'               <label for="showFeedReporter">' +
			'                   I am the reporter' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="showFeedCreator" name="showFeedCreator">' +
			'               <label for="showFeedCreator">' +
			'                    I am the creator' +
			'               </label>' +
			'           </div>' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="showFeedComment" name="showFeedComment">' +
			'               <label for="showFeedComment">' +
			'                   I commented on the issue' +
			'               </label>' +
			'           </div>' +
			'       </div>' +
			'   </div>' +
			'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			'       <div class="col-sm-4 checkbox">' +
			'           <b class="pull-right">Enable User Configuration <br /> in Edit & Create Screens </b>' +
			'       </div>' +
			'		<div class="col-sm-8">' +
			'           <div class="checkbox awesome">' +
			'				<input class="formValue" type="checkbox" id="newCreationScreen" name="newCreationScreen">' +
			'               <label for="newCreationScreen">' +
			'               </label>' +
			'           </div>' +
			'		</div>' +
			'	</div>' +
			'   <div class="form-group" style="position:relative; margin-top:20px;">' +
			'       <div class="col-sm-4 checkbox">' +
			'           <b class="pull-right">Configure Filter</b>' +
			'       </div>' +
			'		<div class="col-sm-8">' +
			'			<select multiple id="activeFilters" class="formValue">';
			jira.filter.filterObj.forEach(function (f) {
				//Is in selected?!
				var selected = jira.filter.getSelectedFilters().filter(function (key) { return key === f.key; }).length > 0;
				html += '<option ' + ((selected) ? 'selected' : '') + ' value="' + f.key + '">' + f.name + '</option>';
			});
			html += '	</select>'+
			'		</div>' +
			'	</div>' +
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
			$('#activeFilters').multiSelect({
				selectableHeader: 'Available',
				selectionHeader: 'Active'
			});

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
						yasoon.dialog.showMessageBox('There are pending updates which prevent this action. Please check for latest updates in the Outlook menu: File --> yasoon, restart Outlook and try again');
						$('#jiraReloadOAuth').unbind().prop('disabled', false).click(reloadOAuthHandler);
						return;
					}
					if (app.origin.basePath.indexOf('update') > -1) {
						yasoon.dialog.showMessageBox('There are pending updates which prevent this action. Please restart Outlook and try again');
						$('#jiraReloadOAuth').unbind().prop('disabled', false).click(reloadOAuthHandler);
						return;
					}

					yasoon.app.downloadManifest(null, function (path) {
						if (path) {
							jira.downloadScript = true;
							yasoon.app.update(null, null, function () {
								yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
								yasoon.alert.add({ message: 'Successfully reloaded the system information!', type: 3});
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
				yasoon.dialog.showMessageBox('Changes to filters will be available with the next Outlook restart.');
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
		var validUntil = new Date();
		validUntil.setDate(validUntil.getDate() + 14);
		jira.license = { comment: 'Please play fair and pay for your software.', isFullyLicensed: false, validUntil: validUntil };
		yasoon.setting.setAppParameter('license', JSON.stringify(jira.license));
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