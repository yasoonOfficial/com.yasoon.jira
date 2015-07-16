var jira = {};

$(function () {
	$('body').css('overflow-y', 'hidden');
});

yasoon.dialog.load(new function () { //jshint ignore:line
	var self = this;
   
	jira = this;
	jira.CONST_HEADER = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
	

	this.UIFormHandler = UIFormHandler();
	this.icons = new JiraIconController();
	this.fromTemplate = false;

	this.transaction = { currentCallCounter: 0, errorOccured: null };

	this.currentTemplates = [];
	this.currentMeta = null;
	this.currentIssue = null;
	this.selectedProject = null;
	this.senderUser = null;
	this.projectMeta = null;

	this.recentProjects = [];
	this.projects = [];
	this.addedAttachmentIds = [];
	this.selectedAttachments = [];
	this.savedTemplates = [];
	this.userCommonValues = {};

	this.init = function (initParams) {
		//Parameter taken over from Main JIRA
		self.settings = initParams.settings;
		self.ownUser = initParams.ownUser;
		self.editIssue = initParams.editIssue;
		self.mail = initParams.mail;
		self.selectedText = initParams.text;

		self.userCommonValues = {
			results: [{
				id: 'Suggested',
				text: 'Suggested',
				children: [{
					'id': jira.ownUser.name,
					'icon': 'ownUser',
					'selected': true,
					'text': jira.ownUser.displayName
				}]
			},
			{
				id: 'Search',
				text: 'SearchResult',
				children: []
			}]
		};

		self.assigneeCommonValues = JSON.parse(JSON.stringify(self.userCommonValues));

		//Load Recent Projects from DB
		var projectsString = yasoon.setting.getAppParameter('recentProjects');
		if (projectsString) {
			self.recentProjects = JSON.parse(projectsString);
		}

		//If created by email, check for templates and attachments
		if (self.mail) {
			//Check if we have templates on db for current sender.
			var templateString = yasoon.setting.getAppParameter('createTemplates');
			if (templateString) {
				self.savedTemplates = JSON.parse(templateString);
			}
			self.currentTemplates = $.grep(self.savedTemplates, function (t) { return t.senderEmail === self.mail.senderEmail; });
			if (self.currentTemplates.length > 0) {
				var group = $('#project').find('.templates');
				group.attr('label', 'Templates for ' + self.mail.senderName);
				$.each(self.currentTemplates, function (i, template) {
					group.append('<option style="background-image: url(images/projectavatar.png)" value="template' + template.project.id + '">' + template.project.name + '</option>');
				});
				group.show();
			}

			//Add attachments to clipboard
			if (self.mail.attachments && self.mail.attachments.length > 0) {
				$.each(self.mail.attachments, function (i, attachment) {
					var handle = attachment.getFileHandle();
					var id = yasoon.clipboard.addFile(handle);
					self.addedAttachmentIds.push(id);
				});
			}

			//Find senderUser
			jiraGet('/rest/api/2/user/search?username=' + self.mail.senderEmail)
			.then(function (data) {
				var users = JSON.parse(data);
				if (users.length > 0) {
					jira.senderUser = users[0];
					jira.userCommonValues.results[0].children.push({
						id: jira.senderUser.name,
						text: jira.senderUser.displayName,
						icon: 'emailSender'
					});
				} else {
					jira.senderUser = { name: -1 };
					$('.create-sender').css('display', 'inline');
				}
				self.setDefaultReporter();
			})
			.catch(jira.handleError);
		}

		if (!!initParams.editIssue) {
			//It's the edit case
			//Set Title & Labels
			$('.jira-title').html('Edit Issue');
			$('.qf-create-another').hide(); //Create another button
			$('#create-issue-submit').html('Save');

			//Select issue project manually and immedeately for better layout.
			var all = $('#project').find('.all');
			var proj = self.editIssue.fields.project;
			self.projects.push(proj);
			self.selectedProject = proj;

			all.append('<option style="background-image: url(images/projectavatar.png)" value="' + proj.id + '" data-key="' + proj.key + '">' + proj.name + '</option>');
			$('#project').select2();
			$('#project').val(proj.id).trigger('change');
			$('#project').prop("disabled", true);

			//Start Loader
			$('#LoaderArea').show();

			//Load issue Meta in edit case and render UI!
			jiraGet('/rest/api/2/issue/' + self.editIssue.id + '?expand=editmeta,renderedFields,transitions,changelog,operations,names')
			.then(function (data) {
				self.currentIssue = JSON.parse(data);

				//Select Issue Type
				$('#issuetype').append('<option data-icon="' + jira.currentIssue.fields.issuetype.iconUrl + '" value="' + jira.currentIssue.fields.issuetype.id + '">' + jira.currentIssue.fields.issuetype.name + '</option>');

				$("#issuetype").select2({
					templateResult: formatIcon,
					templateSelection: formatIcon
				});
				$('#issuetype').select2('val', jira.currentIssue.fields.issuetype.id);
				$('#issuetype').select2("enable", false);
				$('#IssueArea').show();

				self.renderIssue(self.currentIssue.editmeta);
			})
			.catch(jira.handleError);

		} else {
			//Create case --> Select all projects and if user select one, load project settings
			//Create select2 dropdown, so it looks better while loading.
			$('#project').select2({
				placeholder: "Select a Project"
			});
			$('#ProjectSpinner').css('display', 'inline');

			jiraGet('/rest/api/2/project')
			.then(function (data) {
				//Populate Project Dropdown
				self.projects = JSON.parse(data);
				console.log('Projects: ', self.projects);
				var group = $('#project').find('.all');
				$.each(self.projects, function (i, project) {
					group.append('<option style="background-image: url(images/projectavatar.png)" value="' + project.id + '" data-key="' + project.key + '">' + project.name + '</option>');
				});
				group = $('#project').find('.recent');
				$.each(self.recentProjects, function (i, project) {
					group.append('<option style="background-image: url(images/projectavatar.png)" value="' + project.id + '" data-key="' + project.key + '">' + project.name + '</option>');
				});

				$('#project').select2("destroy");
				$('#project').select2({
					placeholder: "Select a Project"
				});

				$('#ProjectSpinner').css('display', 'none');

				$('#project').change(self.selectProject);
			})
			.catch(jira.handleError);

		}

		//Submit Button - (Create & Edit)
		$('#create-issue-submit').unbind().click(self.submitForm);

		$('#create-issue-cancel').unbind().click(function () {
			self.close({ action: 'cancel' });
		});
	}; 

	this.close = function (params) {
		//Check if dialog should be closed or not
		if (params && params.action === 'success' && $('#qf-create-another').is(':checked')) {
			$('#JiraSpinner').hide();
			$('.form-body').scrollTop(0);
			$('#create-issue-submit').removeAttr("disabled");
			$('#summary').val('');
			$('#description').val('');
			$('#AttachmentContainer').html('');
			self.selectedAttachments = [];
		} else {
			//Invalidate dialog events, so that the following won't throw any events => will lead to errors
			// due to pending dialog.close
			yasoon.dialog.clearEvents();

			//If there has been attachments loaded into yasoon clipboard, we need to remove them
			if (self.addedAttachmentIds.length > 0) {
				$.each(self.addedAttachmentIds, function (i, handleId) {
					yasoon.clipboard.remove(handleId);
				});
			}

			yasoon.dialog.close({ action: 'success' });
		}
	};

	this.submitForm = function (e) {
		//Reset data
		jira.transaction.currentCallCounter = 0;
		var result = {
			fields: {}
		};

		//Prepare UI
		$('#MainAlert').hide();
		$('#create-issue-submit').attr('disabled', 'disabled');
		$('#JiraSpinner').show();

		//Collect fixed data:
		//1. Project ID
		result.fields.project = {
			id: self.selectedProject.id
		};
		//2. Issue Type
		result.fields.issuetype = {
			id: $('#issuetype').val()
		};

		//Get Generated Fields
		self.UIFormHandler.getFormData(result);

		//Save Template if created by Email
		if (self.mail) {
			var newTemplate = new createTemplate(self.mail.senderEmail, self.mail.senderName, self.selectedProject, result);
			var templateFound = false;
			$.each(self.savedTemplates, function (i, temp) {
				if (temp.senderEmail == newTemplate.senderEmail && temp.project.id == newTemplate.project.id) {
					self.savedTemplates[i] = newTemplate;
					templateFound = true;
				}
			});

			if (!templateFound) {
				self.savedTemplates.push(newTemplate);
			}
			yasoon.setting.setAppParameter('createTemplates', JSON.stringify(self.savedTemplates));
		}

		console.log('Send Data:', result);

		//Switch for edit or create
		var url = self.settings.baseUrl + '/rest/api/2/issue';
		var method = yasoon.ajaxMethod.Post;

		if (self.editIssue && !self.fromTemplate) {
			url = url + '/' + self.editIssue.key;
			method = yasoon.ajaxMethod.Put;
		}
		jira.transaction.currentCallCounter++;
		yasoon.oauth({
			url: url,
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			data: JSON.stringify(result),
			type: method,
			error: submitErrorHandler,
			success: function (data) {
				if (self.selectedAttachments.length > 0 && data) {
					var issue = JSON.parse(data);
					var formData = [];
					$.each(self.selectedAttachments, function (i, file) {
						formData.push({
							type: yasoon.formData.File,
							name: 'file',
							value: file
						});
					});

					yasoon.oauth({
						url: jira.settings.baseUrl + '/rest/api/2/issue/' + issue.id + '/attachments',
						oauthServiceName: jira.settings.currentService,
						type: yasoon.ajaxMethod.Post,
						formData: formData,
						headers: { Accept: 'application/json', 'X-Atlassian-Token': 'nocheck' },
						error: function (data, statusCode, result, errorText, cbkParam) {
							jira.transaction.currentCallCounter--;
							yasoon.dialog.showMessageBox('Issue ' + issue.key + ' created, but uploading the attachments did not work.');

							if (jira.transaction.currentCallCounter === 0)
								self.close({ action: 'success' });

						},
						success: submitSuccessHandler
					});
				} else {
					jira.transaction.currentCallCounter--;
					if (jira.transaction.currentCallCounter === 0)
						self.close({ action: 'success' });
				}
			}
		});
		e.preventDefault();
	};

	this.handleError = function (data, statusCode, result, errorText, cbkParam) {
		$('#MainAlert').show();
		$('#LoaderArea').hide();
		console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
	};

	this.addRecentProject = function (project) {
		var exists = $.grep(self.recentProjects, function (proj) { return proj.id === project.id; });
		if (exists.length === 0) {
			//It does not exist, so we'll add it! But make sure there is a maximum of 5 recent Items.
			if (self.recentProjects.length >= 5) {
				self.recentProjects = self.recentProjects.slice(1);
			}
			self.recentProjects.push(project);
			yasoon.setting.setAppParameter('recentProjects', JSON.stringify(self.recentProjects));
		}
	};

	this.selectProject = function () {
		var selectedProject = $('#project').val();
		$('#MainAlert').hide();
		console.log('selected Project: ' + selectedProject);
		if (selectedProject) {
			var isTemplate = (selectedProject.indexOf('template') > -1);
			if (isTemplate) {
				var projId = selectedProject.replace('template', '');
				var template = $.grep(self.currentTemplates, function (temp) { return temp.project.id === projId; })[0];
				if (template) {
					jira.selectedProject = $.grep(self.projects, function (proj) { return proj.id === projId; })[0];
					self.currentIssue = template.values;
					//Legacy code 0.6 --> description and summary have been saved inside the template
					delete self.currentIssue.summary;
					delete self.currentIssue.description;

				}
			} else {
				jira.selectedProject = $.grep(self.projects, function (proj) { return proj.id === selectedProject; })[0];
				// Save Project in recently used
				self.addRecentProject(jira.selectedProject);
			}
			//Show Loader!
			$('#ContentArea').hide();
			$('#LoaderArea').show();

			$.when(
				self.getProjectValues(),
				self.getMetaData()
			).done(function () {
				//Sort Issue Types
				self.selectedProject.issueTypes.sort(function (a, b) {
					if (a.id > b.id)
						return 1;
					else
						return -1;
				});

				//Render Issue Types
				$('#issuetype').html(' ');
				$.each(self.selectedProject.issueTypes, function (i, type) {
					if (!type.subtask) {
						type.iconUrl = jira.icons.mapIconUrl(type.iconUrl);
						$('#issuetype').append('<option data-icon="' + type.iconUrl + '" value="' + type.id + '">' + type.name + '</option>');
					}
				});

				$("#issuetype").select2({
					templateResult: formatIcon,
					templateSelection: formatIcon
				});
				$('#issuetype').val(self.selectedProject.issueTypes[0].id).trigger('change');
				$('#issuetype').change(function () {
					var meta = $.grep(self.projectMeta.issuetypes, function (i) { return i.id == $('#issuetype').val(); })[0];
					console.log('New Meta', meta);
					jira.renderIssue(meta);
				});
				$('#IssueArea').show();

				var meta = $.grep(self.projectMeta.issuetypes, function (i) { return i.id == $('#issuetype').val(); })[0];
				jira.renderIssue(meta);

				$('#LoaderArea').hide();
				$('#ContentArea').show();
			});

		}
	};

	this.renderIssue = function (meta) {
		//Set this as current meta
		jira.currentMeta = meta;

		//First clean up everything
		$('#ContainerFields').html('');
		$('#LoaderArea').show();
		$('#ContentArea').hide();

		//Order of Fields in the form. Fields not part of the array will be rendered afterwards
		//This can be customized later on by JIRA admin?!
		var fieldOrder = [
			'summary',
			'priority',
			'duedate',
			'components',
			'versions',
			'fixVersions',
			'assignee',
			'reporter',
			'environment',
			'description',
			'attachment',
			'labels',
			'timetracking'
		];
		var addedFields = [];

		//Render Standard Fields on a predefined order if they are in the current meta. (We do not get any order from JIRA, so we assume one for standard fields)
		fieldOrder.forEach(function (name) {
			if (meta.fields[name]) {
				jira.UIFormHandler.render(name, meta.fields[name], '#ContainerFields');
				addedFields.push(name);
			}
		});
				
		//Render all other fields (ordered by id - aka random :))
		$.each(meta.fields, function (key, value) {
			if (addedFields.indexOf(key) === -1) {
				self.UIFormHandler.render(key, value, $('#ContainerFields'));
			}
		});

		//Fill with intial Values
		self.insertValues();

		//Show Area again and hide loader
		$('#LoaderArea').hide();
		$('#ContentArea').show();
	};

	this.insertValues = function () {
		//Always default Reporter
		self.setDefaultReporter();

		//Values if created by mail
		if (self.mail) {
			//Subject
			if (self.mail.subject) {
				$('#summary').val(self.mail.subject);
			}

			//Selected Text
			if (self.selectedText) {
				$('#description').val(self.selectedText);
			}
		}

		//Set all Values in edit case
		if (self.editIssue) {
			self.UIFormHandler.setFormData(self.editIssue);
		}
	};

	this.getProjectValues = function () {
		var dfd = $.Deferred();
		//Get Values of a single project
		yasoon.oauth({
			url: self.settings.baseUrl + '/rest/api/2/project/' + jira.selectedProject.key,
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				jira.selectedProject = JSON.parse(data);
				dfd.resolve();
			}
		});
		return dfd.promise();
	};

	this.getMetaData = function () {
		var dfd = $.Deferred();
		//Meta Data for custom fields
		yasoon.oauth({
			url: self.settings.baseUrl + '/rest/api/2/issue/createmeta?projectIds=' + jira.selectedProject.id + '&expand=projects.issuetypes.fields',
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				var meta = JSON.parse(data);
				//Find selected project (should be selected by API Call, but I'm not sure if it works due to missing test data )
				self.projectMeta = $.grep(meta.projects, function (p) { return p.id === jira.selectedProject.id; })[0];
				dfd.resolve();
			}
		});

		return dfd.promise();
	};

	this.setDefaultReporter = function () {
		if (jira.mail) {
			//In Creation case based on a mail, we need to wait for the senderUser.
			if (!jira.senderUser)
				return;

			if (jira.senderUser.name !== -1) {
				//Sender user is known --> Set it as default
				$('#reporter')
				.data('id', jira.senderUser.name)
				.data('text', jira.senderUser.displayName)
				.data('icon', 'emailSender')
				.val(jira.senderUser.name)
				.trigger('change');
			}
		} else if (!jira.editIssue) {
			//All other creation cases
			$('#reporter')
			.data('id', jira.ownUser.name)
			.data('text', jira.ownUser.displayName)
			.data('icon', 'ownUser')
			.val(jira.ownUser.name)
			.trigger('change');
		}

	};
}); //jshint ignore:line

function UIFormHandler() {

	function renderStandard(id, field, container) {
		switch (field.schema.system) {
			case 'assignee':
				renderUserPicker(id, field, container);
				break;
			case 'attachment':
				renderAttachmentLink(id, field, container);
				break;
			case 'components':
				renderMultiSelectList(id, field, container);
				break;
			case 'description':
				renderTextarea(id, field, container);
				break;
			case 'duedate':
				renderDatePicker(id, field, container);
				break;
			case 'environment':
				renderTextarea(id, field, container);
				break;
			case 'fixVersions':
				renderMultiSelectList(id, field, container);
				break;
			case 'labels':
				renderLabels(id, field, container);
				break;
			case 'priority':
				renderSelectList(id, field, container);
				break;
			case 'reporter':
				renderUserPicker(id, field, container);
				break;
			case 'summary':
				renderSingleText(id, field, container);
				break;
			case 'timetracking':
				renderTimeTracking(id, field, container);
				break;
			case 'versions':
				renderMultiSelectList(id, field, container);
				break;
		}
	}

	function renderCustom(id, field, container) {
		switch (field.schema.custom) {
			case 'com.atlassian.jira.plugin.system.customfieldtypes:textfield':
			case 'com.atlassian.jira.plugin.system.customfieldtypes:url':
				renderSingleText(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes':
				renderCheckboxes(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker':
				renderDatePicker(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:datetime':
				renderDateTimePicker(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:labels':
				renderLabels(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:float':
				renderNumber(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:select':
				renderSelectList(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect':
				renderMultiSelectList(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:textarea':
				renderTextarea(id, field, container);
				break;

			case 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker':
				renderUserPicker(id, field, container);
				break;

			case 'com.pyxis.greenhopper.jira:gh-epic-link':
				renderEpicLink(id, field, container);
				break;

			case 'com.pyxis.greenhopper.jira:gh-sprint':
				renderSprintLink(id, field, container);
				break;
		}
	}

	return {
		render: function (id, field, container) {
			if (field.schema.system) {
				renderStandard(id, field, container);
			} else if (field.schema.custom) {
				renderCustom(id, field, container);
			}
		},

		getFormData: function (result) {
			result = result || {};
			//Find Meta for current Issue Type
			if (jira.currentMeta) {
				$.each(jira.currentMeta.fields, function (key, value) {
					//Try to find the field in form
					var elem = $('#' + key);
					if (elem.length > 0) {
						switch (elem.data('type')) {
							case 'com.atlassian.jira.plugin.system.customfieldtypes:textfield':
							case 'com.atlassian.jira.plugin.system.customfieldtypes:textarea':
							case 'com.atlassian.jira.plugin.system.customfieldtypes:url':
								if (elem.val())
									result.fields[key] = elem.val();
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker':
								if (elem.data('id')) {
									result.fields[key] = {
										name: elem.data('id')
									};
								}
								break;
							case 'com.pyxis.greenhopper.jira:gh-sprint':
								//Bug in JIRA --> Edit is not supported via normal REST api --> See type com.pyxis.greenhopper.jira:gh-epic-link for more information.
								if (elem.val() && !jira.editIssue)
									result.fields[key] = elem.val();
								else if (jira.editIssue) {
									var sprintId = '';
									if (jira.editIssue.fields[key])
										sprintId = parseSprintId(jira.editIssue.fields[key][0]);
									if (sprintId != elem.val()) {
										jira.transaction.currentCallCounter++;
										if (elem.val()) {
											yasoon.oauth({
												url: jira.settings.baseUrl + '/rest/greenhopper/1.0/sprint/rank',
												oauthServiceName: jira.settings.currentService,
												type: yasoon.ajaxMethod.Put,
												data: '{"idOrKeys":["' + jira.editIssue.key + '"],"sprintId":' + elem.val() + ',"addToBacklog":false}',
												headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
												error: submitErrorHandler,
												success: submitSuccessHandler
											});
										} else {
											yasoon.oauth({
												url: jira.settings.baseUrl + '/rest/greenhopper/1.0/sprint/rank',
												oauthServiceName: jira.settings.currentService,
												type: yasoon.ajaxMethod.Put,
												data: '{"idOrKeys":["' + jira.editIssue.key + '"],"sprintId":"","addToBacklog":true}',
												headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
												error: submitErrorHandler,
												success: submitSuccessHandler
											});
										}
									}
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:float':
								var float = parseFloat(elem.val());
								if (float)
									result.fields[key] = float;
								break;

							case 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes':
								var checkedValues = [];
								elem.find('input').each(function () {
									if ($(this).is(':checked')) {
										checkedValues.push({ id: $(this).val() });
									}
								});
								result.fields[key] = checkedValues;
								break;

							case 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker':
								if (elem.val()) {
									result.fields[key] = moment(new Date(elem.val())).format('YYYY-MM-DD');
								}
								break;

							case 'com.atlassian.jira.plugin.system.customfieldtypes:labels':
								if (elem.val()) {
									result.fields[key] = elem.val();
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:select':
								if (elem.val())
									result.fields[key] = { id: elem.val() };
								break;
							case 'com.pyxis.greenhopper.jira:gh-epic-link':
								if (!jira.editIssue && elem.val()) {
									result.fields[key] = 'key:' + elem.val();
								}
								else if (jira.editIssue && jira.editIssue.fields[key] != elem.val()) {
									//Time to make it dirty! Epic links cannot be changed via REST APi --> Status code 500
									// Ticket: https://jira.atlassian.com/browse/GHS-10333
									//There is a workaround --> update it via unofficial greenhopper API --> that completely breaks ou concept so just do it now and do not return an result
									jira.transaction.currentCallCounter++;
									if (elem.val()) {
										//Create or update
										yasoon.oauth({
											url: jira.settings.baseUrl + '/rest/greenhopper/1.0/epics/' + elem.val() + '/add',
											oauthServiceName: jira.settings.currentService,
											type: yasoon.ajaxMethod.Put,
											data: '{ "issueKeys":["' + jira.editIssue.key + '"] }',
											headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
											error: submitErrorHandler,
											success: submitSuccessHandler
										});
									} else {
										//Delete
										yasoon.oauth({
											url: jira.settings.baseUrl + '/rest/greenhopper/1.0/epics/remove',
											oauthServiceName: jira.settings.currentService,
											type: yasoon.ajaxMethod.Put,
											data: '{ "issueKeys":["' + jira.editIssue.key + '"] }',
											headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
											error: submitErrorHandler,
											success: submitSuccessHandler
										});
									}
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect':
								var selectedValues = [];
								$.each(elem.val(), function (i, id) {
									selectedValues.push({ id: id });
								});
								result.fields[key] = selectedValues;
								break;
							case 'timetracking':
								//Timetracking consists of two fields :o
								result.fields[key] = {
									originalEstimate: $('#' + key + '_originalestimate').val(),
									remainingEstimate: $('#' + key + '_remainingestimate').val()
								};
								break;
						}
					}
				});
			}

		},

		setFormData: function (issue) {
			if (jira.currentMeta) {
				$.each(jira.currentMeta.fields, function (key, value) {
					var type = jira.currentMeta.fields[key].schema.custom || jira.currentMeta.fields[key].schema.system;
					switch (type) {
						case 'com.atlassian.jira.plugin.system.customfieldtypes:textfield':
						case 'com.atlassian.jira.plugin.system.customfieldtypes:url':
						case 'com.atlassian.jira.plugin.system.customfieldtypes:float':
						case 'com.atlassian.jira.plugin.system.customfieldtypes:textarea':
						case 'summary':
						case 'description':
						case 'environment':
							if (issue.fields[key]) {
								$('#' + key).val(issue.fields[key]);
							}
							break;
						case 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes':
							if (issue.fields[key]) {
								var elem = $('#' + key);
								$.each(issue.fields[key], function (i, value) {
									elem.find('[value=' + value.id + ']').prop('checked', true);
								});

							}
							break;
						case 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker':
						case 'duedate':
							if (issue.fields[key]) {
								$('#' + key).val(moment(new Date(issue.fields[key])).format('YYYY/MM/DD'));
							}
							break;
						case 'com.atlassian.jira.plugin.system.customfieldtypes:datetime':
							break;
						case 'com.atlassian.jira.plugin.system.customfieldtypes:select':
						case 'priority':
						case 'issuetype':
							if (issue.fields[key]) {
								$('#' + key).val(issue.fields[key].id).trigger('change');
							}
							break;
						case 'com.pyxis.greenhopper.jira:gh-sprint':
							if (issue.fields[key] && issue.fields[key].length > 0) {
								$('#' + key).val(parseSprintId(issue.fields[key][0])).trigger('change');
								$('#' + key).data('value', parseSprintId(issue.fields[key][0]));
							}
							break;
						case 'com.atlassian.jira.plugin.system.customfieldtypes:labels':
						case 'labels':
						case 'com.pyxis.greenhopper.jira:gh-epic-link':
							if (issue.fields[key]) {
								$('#' + key).val(issue.fields[key]).trigger('change');
								$('#' + key).data('value', issue.fields[key]);
							}
							break;
						case 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect':
						case 'fixVersions':
						case 'versions':
						case 'components':
							if (issue.fields[key]) {
								var selectedValues = [];
								$.each(issue.fields[key], function (i, value) {
									selectedValues.push(value.id);
								});
								$('#' + key).val(selectedValues).trigger('change');
							}
							break;
						case 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker':
						case 'assignee':
						case 'reporter':
							if (issue.fields[key]) {
								$('#' + key)
								.data('id', issue.fields[key].name)
								.data('text', issue.fields[key].displayName)
								.data('type', '')
								.val(issue.fields[key].name)
								.trigger('change');
							}
							break;

						case 'timetracking':
							if (issue.fields[key]) {
								$('#' + key + '_originalestimate').val(issue.fields[key].originalEstimate);
								$('#' + key + '_remainingestimate').val(issue.fields[key].remainingEstimate);
							}
					}
				});
			}
		}

	};
}

function renderSingleText(id, field, container) {
	$(container).append('<div class="field-group">' +
						'   <label for="' + field.name + '">' + field.name +
						'       '+(( field.required) ? '<span class="aui-icon icon-required">Required</span>' : '' ) +
						'   </label>' +
						'    <input class="text long-field" id="' + id + '" name="' + id + '" value="" type="text" data-type="com.atlassian.jira.plugin.system.customfieldtypes:textfield">' +
						'</div>');
}
	
function renderCheckboxes(id, field, container) {
	var html = '<div class="field-group" id="' + id + '" data-type="com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes">' +
		'    <label>' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label> ';
	$.each(field.allowedValues, function (i, option) {
		html += '   <div class="checkbox">' +
				'       <label><input type="checkbox" value="' + option.id +'">' + option.value +
				'   </div>';
	});

	html += '</div>';
	$(container).append(html);
}

function renderDatePicker(id, field, container) {
	var html = '<div class="field-group aui-field-datepicker"> ' +
				'    <label for="' + id + '">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label> ' +
				'    <input class="text medium-field" id="' + id + '" name="' + id + '" placeholder="yyyy/mm/dd" value="" type="text" data-type="com.atlassian.jira.plugin.system.customfieldtypes:datepicker"> ' +
				'    <a href="#" id="' + id + '-trigger" title="Select a date" tabindex="-1"><span class="aui-icon icon-date">Select a date</span></a> ' +
				'</div>';
	$(container).append(html);

	$('#' + id).datepicker({
		showOtherMonths: true,
		selectOtherMonths: true,
		dateFormat: 'yy/mm/dd'
	});

	$('#'+ id +'-trigger').unbind().click(function (e) {
		$('#' + id).datepicker("show");
	});

}

function renderDateTimePicker(id, field, container) {

}

function renderLabels(id, field, container) {
	var html = '<div class="field-group aui-field-componentspicker frother-control-renderer">' +
				'    <label for="' + id + '">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				'       <select style="width:50%;" class="select input-field" id="' + id + '" multiple="" name="' + id + '" data-type="com.atlassian.jira.plugin.system.customfieldtypes:labels"></select>' +
				'	<div class="description">Start typing to get a list of possible matches or press down to select.</div>' +
				'</div>';

	$(container).append(html);

	//DAMIT JIRA!!! 
	//field.autoCompleteUrl delivered by JIRA contains errors.
	//So we need to decide wether it's JIRA standard label or any customfield label
	var url = jira.settings.baseUrl+'/rest/api/1.0/labels/suggest?query=';
	if (id !== 'labels') {
		url = jira.settings.baseUrl + '/rest/api/1.0/labels/suggest?customFieldId=' + field.schema.customId + '&query=';
	}

	yasoon.oauth({
		url: url,
		oauthServiceName: jira.settings.currentService,
		headers: jira.CONST_HEADER,
		type: yasoon.ajaxMethod.Get,
		error: jira.handleError,
		success: function (data) {
			var labels = JSON.parse(data);
			var labelArray = [];
			if (labels.suggestions) {
				$.each(labels.suggestions, function (i, label) {
					labelArray.push(label.label);
				});
			}
			$('#' + id).select2({
				tags: true,
				data: labelArray,
				tokenSeparators: [" "]
			});
		}
	});
}

function renderNumber(id, field, container) {
	$(container).append('<div class="field-group">' +
				'   <label for="' + id + '">' + field.name +
				'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
				'   </label>' +
				'    <input class="text long-field" id="' + id + '" name="' + id + '" value="" type="number" data-type="com.atlassian.jira.plugin.system.customfieldtypes:float">' +
				'</div>');
}

function renderSelectList(id, field, container) {
	var html = '<div class="field-group input-field">' +
				'    <label for="' + id + '">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				'    <select class="select input-field" id="' + id + '" name="' + id + '" style="width: 50%" data-type="com.atlassian.jira.plugin.system.customfieldtypes:select">' +
				'		<option value="">' + ((field.hasDefaultValue) ? 'Default' : 'None') +'</option>';

	$.each(field.allowedValues, function (i, option) {
		var icon = null;
		if (option.iconUrl) {
			icon = jira.icons.mapIconUrl(option.iconUrl);
		}
		var text = option.name || option.value;
		html += '<option value="' + option.id + '" data-icon="'+ ((icon) ? icon : '' ) +'">' + text + '</option>';
	});
	html += '      </select>' +
			//'	<div class="description">Start typing to get a list of possible matches or press down to select.</div>' +
			'</div>';

	$(container).append(html);

	$('#' + id).select2({
		templateResult: formatIcon,
		templateSelection: formatIcon,
		//escapeMarkup: function (m) { return m; }
	});
}

function renderMultiSelectList(id, field, container) {
	var html = '<div class="field-group input-field">' +
				'    <label for="issuetype">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				'    <select data-container-class="issuetype-ss" class="select text input-field" id="' + id + '" name="' + id + '" style="width: 50%" multiple="multiple" data-type="com.atlassian.jira.plugin.system.customfieldtypes:multiselect">';
			$.each(field.allowedValues, function (i, option) {
				var text = option.name || option.value;
				html += '<option value="' + option.id + '">' + text + '</option>';
			});
		html += '      </select>' +
				//'	<div class="description">Start typing to get a list of possible matches or press down to select.</div>' +
				'</div>';

	$(container).append(html);

	$('#' + id).select2();
}

function renderTextarea(id, field, container) {
	$(container).append('<div class="field-group">' +
		'   <label for="' + id + '">' + field.name +
		'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
		'   </label>' +
		'    <textarea class="form-control" id="' + id + '" name="' + id + '" rows="5" data-type="com.atlassian.jira.plugin.system.customfieldtypes:textarea"></textarea>' +
		((id === 'description' && jira.mail) ? '<a id="DescriptionInsertPlaintext" style="cursor:pointer;"> Replace with Plaintext</a>' : '' ) +
		'</div>');

	$('#DescriptionInsertPlaintext').click(function (e) {
		$('#description').val(jira.mail.getSelection(0));
		e.preventDefault();
	});
}

function renderUserPicker(id, field, container) {
	var html = '<div class="field-group" id="' + id + '-container">' +
		'	<label for="' + id + '"><span class="descr">' + field.name +
		'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
		'	</label>' +
		'	<select id="' + id + '" name="' + id + '" style="width: 50%;" class="select input-field" data-type="com.atlassian.jira.plugin.system.customfieldtypes:userpicker"></select>' +
		'	<span style="display:block; padding: 5px 0px;">'+
		'	<a href="#' + id + '" class="assign-to-me-trigger">Assign to me</a>';

	//Create User link is a little tricky. It should only be visible if it's based on an email and senderUser does not exist in system. 
	// But we cannot be sure when user has been loaded.
	//So we create this link invisible in case user has not been loaded yet (and then user loading will activate the links)
	// or we'll display it immediately if we already have all information.
	if(id !== 'assignee') {
		if (jira.mail && jira.senderUser.name === -1) {
			//user does not exist in system
			html += '<a style="margin-left: 50px;" href="#' + id + '" class="create-sender">Create User ' + jira.mail.senderName + '</a>';
		} else if (jira.mail && !jira.senderUser) {
			//user may not exist in system
			html += '<a style="margin-left: 50px; display:none" href="#' + id + '" class="create-sender">Create User ' + jira.mail.senderName + '</a>';
		}
	}
	 html += '</span></div>';

	$(container).append(html);

	$('#' + id + '-container').find('.assign-to-me-trigger').unbind().click(function (e) {
		if (jira.ownUser) {
			$('#' + id)
				.data('id', jira.ownUser.name)
				.data('text', jira.ownUser.displayName)
				.data('icon', 'ownUser')
				.val(jira.ownUser.name)
				.trigger('change');
		}
		e.preventDefault();
	});

	$('#' + id + '-container').find('.create-sender').unbind().click(function (e) {
		var newUser = {
			"name": jira.mail.senderEmail,
			"emailAddress": jira.mail.senderEmail,
			"displayName": jira.mail.senderName
		};

		jiraAjax('/rest/api/2/user', yasoon.ajaxMethod.Post, JSON.stringify(newUser))
		.then(function (user) {
			user = JSON.parse(user);
			//New user successfully created
			console.log('Successfull:', user);
			//1. Set it as value for current field
			$('#' + id)
			.data('id', user.name)
			.data('text', user.displayName)
			.data('icon', 'emailSender')
			.val(user.name)
			.trigger('change');

			//2. Add as emailSender for commonValues
			jira.userCommonValues.results[0].children.push({
				id: user.name,
				text: user.displayName,
				icon: 'emailSender'
			});
			
			$('#' + id + '-container').find('.create-sender').css('display', 'none');

		})
		.catch(function (error) {
			if (error && error.statusCode == 403) {
				alert('You are not allowed to create new users in JIRA. Please contact your administrator to use this function');
			} else if(error && error.statusCode == 404) {
				alert('Your JIRA instance is too old and does not support this functionality');
			} else {
				alert('That does not work. Please try it again in a few seconds or contact our support (contact@yasoon.de)');
			}
		});
		e.preventDefault();
	});

	
	$('#' + id).select2({
		templateResult: formatUser,
		templateSelection: formatUser,
		dataAdapter: jira.CustomDataSet,
		minimumInputLength: 0
	});
}

function renderEpicLink(id, field, container) {
	var html = '<div class="field-group input-field">' +
		'    <label for="issuetype">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
		'    <select data-container-class="issuetype-ss" class="select input-field" id="' + id + '" name="' + id + '" data-type="com.pyxis.greenhopper.jira:gh-epic-link">' +
		'        <option value="">None</option>'+
		'    </select>' +
		'</div>';

	$(container).append(html);

	//$('#' + id).select2();

	yasoon.oauth({
		url: jira.settings.baseUrl + '/rest/greenhopper/1.0/epics?maxResults=100&projectKey='+ jira.selectedProject.key,
		oauthServiceName: jira.settings.currentService,
		headers: jira.CONST_HEADER,
		type: yasoon.ajaxMethod.Get,
		error: jira.handleError,
		success: function (data) {
			//{"epicNames":[{"key":"SSP-24","name":"Epic 1"},{"key":"SSP-25","name":"Epic 2"}],"total":2}
			var epics = JSON.parse(data);
			var result = [];
			var oldValue = $('#' + id).data('value');
			if (epics && epics.total > 0) {
				$(container).find('#' + id).html('<option value="">None</option>');
				$.each(epics.epicNames, function (i, epic) {
					$(container).find('#' + id).append('<option value="' + epic.key + '"> ' + epic.name + ' ( ' + epic.key + ' )</option>');
				});
			}
			$('#' + id).select2();
			$('#' + id).select2('val', oldValue);
		}
	});
		
}

function renderSprintLink(id, field, container) {
	var html = '<div class="field-group input-field">' +
		'    <label for="issuetype">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
		'    <select data-container-class="issuetype-ss" class="select input-field" id="' + id + '" name="' + id + '" data-type="com.pyxis.greenhopper.jira:gh-sprint">' +
		'        <option value="">None</option>'+
		'    </select>' +
		'</div>';

	$(container).append(html);

	//$('#' + id).select2();

	yasoon.oauth({
		url: jira.settings.baseUrl + '/rest/greenhopper/1.0/sprint/picker',
		oauthServiceName: jira.settings.currentService,
		headers: jira.CONST_HEADER,
		type: yasoon.ajaxMethod.Get,
		error: jira.handleError,
		success: function (data) {
			//{"suggestions":[{"name":"Sample Sprint 2","id":1,"stateKey":"ACTIVE"}],"allMatches":[]}
			var sprints = JSON.parse(data);
			var result = [];
			var oldValue = $('#' + id).data('value');
			if (sprints && sprints.suggestions.length > 0) {
				$(container).find('#' + id).html('<option value="">None</option>');
				$.each(sprints.suggestions, function (i, sprint) {
					$(container).find('#'+id).append('<option value="' + sprint.id + '"> ' + sprint.name + '</option>');
				});
			}
			$('#' + id).select2();
			$('#' + id).select2('val', oldValue);
		}
	});

}

function renderAttachmentLink(id, field, container) {
	$(container).append('<div class="field-group" id="'+id+'-container">'+
						'	<label for="description"><span class="descr">Attachment</span></label>' +
						'	<div>'+
						'		<div id="'+ id + '"><a class="AddAttachmentLink" style="margin-top: 2px; cursor:pointer;"> add Attachment</a></div>'+
						'		<div id="'+id+'-selected-container"></div>'+
						'	</div>'+
						'</div>');

	$('#'+id+'-container').find('.AddAttachmentLink').click(function () {
		yasoon.view.fileChooser.open(function (selectedFiles) {
			jira.selectedAttachments = selectedFiles;

			$('#' + id + '-selected-container').html('');
			//Render Attachments
			$.each(jira.selectedAttachments, function (i, fileHandle) {
				$('#' + id + '-selected-container').append('<div><span><img style="width:16px;" src="' + fileHandle.getFileIconPath() + '">' + fileHandle.getFileName() + '</span></div>');
			});
		});
	});
}

function renderTimeTracking(id, field, container) {
	$(container).append('<div id="' + id + '" data-type="timetracking"></div>');
	$('#' + id).append('<div class="field-group">' +
						'   <label for="'+ id +'_originalestimate"> Original Estimate'+
						'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
						'   </label>' +
						'   <input class="text long-field" style="width:50%;" id="' + id + '_originalestimate" name="' + id + '_originalestimate" value="" type="text">' +
						'	<span class="aui-form example">(eg. 3w 4d 12h)</span>' +
						'	<div class="description">The original estimate of how much work is involved in resolving this issue.</div>'+
						'</div>');

	$('#' + id).append('<div class="field-group">' +
						'   <label for="' + id + '_remainingestimate"> Remaining Estimate' +
						'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
						'   </label>' +
						'   <input class="text long-field" style="width:50%;" id="' + id + '_remainingestimate" name="' + id + '_remainingestimate" value="" type="text">' +
						'	<span class="aui-form example">(eg. 3w 4d 12h)</span>' +
						'	<div class="description">An estimate of how much work remains until this issue will be resolved.</div>' +
						'</div>');
}

function parseSprintId(input) {
	//Wierd --> it's an array of strings with following structure:  "com.atlassian.greenhopper.service.sprint.Sprint@7292f4[rapidViewId=<null>,state=ACTIVE,name=Sample Sprint 2,startDate=2015-04-09T01:54:26.773+02:00,endDate=2015-04-23T02:14:26.773+02:00,completeDate=<null>,sequence=1,id=1]"
	//First get content of array (everything between [])
	//Then split at ,
	//Then find id
	var result = '';
	var matches = /\[(.+)\]/g.exec(input);
	if (matches.length > 0) {
		var splitResult = matches[1].split(',');
		var idObj = splitResult.filter(function (elem) { return elem.indexOf('id') === 0; });
		if (idObj.length > 0) {
			result = idObj[0].split('=')[1];
		}
	}
	return result;
}

function formatIcon(element) {
	if (!element.id) return element.text; // optgroup
	var icon = $(element.element).data('icon');
	if (icon)
		return $('<span><img style="margin-right:3px; width: 16px;" src="' + icon + '"/>' + element.text + '</span>');
	else
		return element.text;
}

function formatUser(user) {
	if (!user)
		return '';

	if (user.icon === 'ownUser') {
		return $('<span><i style="margin-right:3px; width: 16px;" class="fa fa-user" />' + user.text +'</span>');
	} else if (user.icon === 'emailSender') {
		return $('<span><i style="margin-right:3px; width: 16px;" class="fa fa-envelope" />' + user.text + '</span>');
	} else {
		return user.text;
	}
}

function createTemplate(email, sender, project, values) {
	this.senderEmail = email;
	this.senderName = sender;
	this.project = project;
	//Create deep copy
	values = JSON.parse(JSON.stringify(values));
	delete values.fields.summary;
	delete values.fields.description;
	this.values = values;
}

function submitErrorHandler(data, statusCode, result, errorText, cbkParam) {
	$('#JiraSpinner').hide();
	$('#create-issue-submit').removeAttr("disabled");
	result = JSON.parse(result);

	//Parse different error messages
	var error = '';
	if (result.errors && result.errors.summary)
		error = result.errors.summary;
	else if (result.errorMessages && result.errorMessages.length > 0)
		error = result.errorMessages[0];
	else
		error = JSON.stringify(result);

	alert('Sorry, that did not work. Check your input and try again. ' + error);
	jira.transaction.currentCallCounter = -1;
}

function submitSuccessHandler(data) {
	jira.transaction.currentCallCounter--;

	if (jira.transaction.currentCallCounter === 0) {
		//Creation successfull
		jira.close({ action: 'success' });
	}
}

// Custom Data Provider for SELECT2  User retrieval
jira.CustomDataSet = null;
$.fn.select2.amd.require( ['select2/data/select', 'select2/utils'],
function (select, Utils) {
	function CustomData($element, options) {
		CustomData.__super__.constructor.call(this, $element, options);
	}

	Utils.Extend(CustomData, select);
	
	CustomData.prototype.current = function (callback) {
		var data = [];
		var self = this;

		this.$element.find(':selected').each(function () {
			var $option = $(this);

			var option = self.item($option);

			data.push(option);
		});

		if (data.length === 0) {
			if(this.$element.data('id')){
				var user = {
					id: this.$element.data('id'),
					text: this.$element.data('text'),
					icon: this.$element.data('icon'),
					selected: true
				};
				data.push(user);
			}
		}
		callback(data);
	};

	CustomData.prototype.select = function (data) {
		var self = this;

		data.selected = true;

		// If data.element is a DOM node, use it instead
		if ($(data.element).is('option')) {
			data.element.selected = true;

			this.$element.trigger('change');

			return;
		}

		if (this.$element.prop('multiple')) {
			this.current(function (currentData) {
				var val = [];

				data = [data];
				data.push.apply(data, currentData);

				for (var d = 0; d < data.length; d++) {
					var id = data[d].id;

					if ($.inArray(id, val) === -1) {
						val.push(id);
					}
				}

				self.$element.val(val);
				self.$element.trigger('change');
			});
		} else {
			var val = data.id;
			this.$element
				.data('id', data.id)
				.data('text', data.text)
				.data('icon', data.icon || '');

			this.$element.val(val);
			this.$element.trigger('change');
		}
	};

	CustomData.prototype.query = function (params, callback) {
		var id = this.$element.attr('id');
		if (params && params.term) {
			//Get all Users
			var url = jira.settings.baseUrl + '/rest/api/2/user/picker?query=' + params.term + '&maxResults=50';
			if (id === 'assignee') {
				//Only get assignable users
				url = jira.settings.baseUrl + '/rest/api/2/user/assignable/search?project=' + jira.selectedProject.key + '&username=' + params.term + '&maxResults=50';
			}
			yasoon.oauth({
				url: url,
				oauthServiceName: jira.settings.currentService,
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: function () {
					jira.handleError.apply(this, arguments);
					callback([]);
				},
				success: function (data) {
					var users = JSON.parse(data);
					console.log('Query for ' + id + ', Term: '+ params.term, users);
					//Transform Data
					var result = [];
					if (users && users.users && users.users.length > 0) {
						$.each(users.users, function (i, user) {
							result.push({
								id: user.name,
								text: user.displayName
							});
						});
					} else if (users && users.length > 0) {
						$.each(users, function (i, user) {
							result.push({
								id: user.name,
								text: user.displayName
							});
						});
					}
					if (id === 'assignee') {
						jira.assigneeCommonValues.results[1].children = result;
						callback(jira.assigneeCommonValues);
					} else {
						jira.userCommonValues.results[1].children = result;
						callback(jira.userCommonValues);
					}

					
				}
			});
		} else {
			jira.userCommonValues.results[1].children = [];
			callback(jira.userCommonValues);
		}
	};

	jira.CustomDataSet = CustomData;
});
//@ sourceURL=http://Jira/Dialog/jiraDialog.js