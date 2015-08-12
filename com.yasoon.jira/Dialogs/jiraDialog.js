var jira = {};

$(function () {
	$('body').css('overflow-y', 'hidden');
	$('form').on('submit', function(e) {
		e.preventDefault();
		return false;
	});
});

$(window).resize(function () {
	var bodyHeight = $('body').height();
	if (bodyHeight > 460) {
		$('body').css('overflow-y', 'hidden');
		$(".form-body").height(bodyHeight - 170);
	} else {
		$('body').css('overflow-y', 'scroll');
		$(".form-body").height(290);
	}
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

	this.mailAsMarkup = '';
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

		//Register Close Handler
		yasoon.dialog.onClose(self.cleanup);

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

			//Add current mail to clipboard
			var handle = self.mail.getFileHandle();
			var id = yasoon.clipboard.addFile(handle);
			self.addedAttachmentIds.push(id);

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
			yasoon.dialog.close(params);
		}
	};

	this.cleanup = function () {
		//Invalidate dialog events, so that the following won't throw any events => will lead to errors
		// due to pending dialog.close
		yasoon.dialog.clearEvents();

		//If there has been attachments loaded into yasoon clipboard, we need to remove them
		if (self.addedAttachmentIds.length > 0) {
			$.each(self.addedAttachmentIds, function (i, handleId) {
				yasoon.clipboard.remove(handleId);
			});
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

		//Incremnt transaction for Greenhopper API
		jira.transaction.currentCallCounter++;
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

			//Description
			if (self.selectedText) {
				$('#description').val(self.selectedText);
			}

			yasoon.outlook.mail.renderBody(self.mail, 'jiraMarkup')
			.then(function (markup) {
				jira.mailAsMarkup = markup;
				//If there is no selection, set this as description;
				if(!self.selectedText)
					$('#description').val(markup);
			});
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
//@ sourceURL=http://Jira/Dialog/jiraDialog.js