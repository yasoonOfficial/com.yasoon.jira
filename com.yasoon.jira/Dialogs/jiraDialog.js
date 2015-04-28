var jira = {};

$(function () {
	$('body').css('overflow-y', 'hidden');
});

function formatIcon(element) {
	if (!element.id) return element.text; // optgroup
	return '<img style="margin-right:3px; width: 16px;" src="'+ $(element.element).data('icon')+'"/>' + element.text;
}

function formatUser(user) { return user.displayName; }

function createTemplate(email, sender, project, values) {
	this.senderEmail = email;
	this.senderName = sender;
	this.project = project;
	//Create deep copy
	values = JSON.parse(JSON.stringify(values));
	delete values.summary;
	delete values.description;
	this.values = values;
}

function submitErrorHandler(data, statusCode, result, errorText, cbkParam) {
	$('#JiraSpinner').hide();
	$('#create-issue-submit').removeAttr("disabled");
	result = JSON.parse(result);

	//Parse different error messages
	var error = '';
	if(result.errors && result.errors.summary)
		error = result.errors.summary;
	else if(result.errorMessages && result.errorMessages.length > 0)
		error = result.errorMessages[0];
	else 
		error = JSON.stringify(result);

	alert('Sorry, that did not work. Check your input and try again. ' + error);
	jira.transaction.currentCallCounter = -1;
}

function submitSuccessHandler(data) {
	jira.transaction.currentCallCounter--;

	if(jira.transaction.currentCallCounter === 0)
		jira.close({ action: 'success' });
}

yasoon.dialog.load(new function () { //jshint ignore:line
	var self = this;
   
	jira = this;
	jira.CONST_HEADER = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
	jira.selectedProject = null;

	self.UIFormHandler = UIFormHandler();
	var project = null;
	var templates = [];
	var projectMeta = '';

	self.init = function (initParams) {
		self.icons = new JiraIconController();
		self.settings = initParams.settings;
		self.ownUser = initParams.ownUser;
		self.editIssue = initParams.editIssue;
		self.fromTemplate = false;
		self.mail = initParams.mail;
		self.currentMeta = null;
		self.transaction = { currentCallCounter: 0, errorOccured: null };

		self.currentTemplates = [];
		self.projects = [];
		self.addedAttachmentIds = [];
		self.selectedAttachments = [];
		//Load Recent Projects
		var projectsString = yasoon.setting.getAppParameter('recentProjects');
		if (projectsString) {
			self.recentProjects = JSON.parse(projectsString);
		} else {
			self.recentProjects = [];
		}

		if (initParams.text) {
			$('#description').val(initParams.text);
		}

		if (self.mail) {
			//Created from an email --> check for templates
			var templateString = yasoon.setting.getAppParameter('createTemplates');
			if (templateString) {
				templates = JSON.parse(templateString);
			}
			self.currentTemplates = $.grep(templates, function (t) { return t.senderEmail === self.mail.senderEmail; });
			if (self.currentTemplates.length > 0) {
				var group = $('#project').find('.templates');
				group.attr('label', 'Templates for ' + self.mail.senderName);
				$.each(self.currentTemplates, function (i, template) {
					group.append('<option style="background-image: url(images/projectavatar.png)" value="template' + template.project.id + '">' + template.project.name + '</option>');
				});
				group.show();
			}

			//Take over Subject
			if (self.mail.subject) {
				$('#summary').val(self.mail.subject);
			}

			////Check for attachments
			//if (self.mail.attachments && self.mail.attachments.length > 0) {
			//	$.each(self.mail.attachments, function (i, attachment) {
			//		var handle = attachment.getFileHandle();
			//		var id = yasoon.clipboard.addFile(handle);
			//		self.addedAttachmentIds.push(id);
			//	});
			//}
		}

		if (!initParams.editIssue) {
			//Create case --> Select all projects and if user select one, load project settings
			$('#project').select2({
				placeholder: "Select a Project"
			});

			//Select all projects
			yasoon.oauth({
				url: self.settings.baseUrl + '/rest/api/2/project',
				oauthServiceName: jira.settings.currentService,
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: jira.handleError,
				success: function (data) {
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

					$('#project').change(self.selectProject);
				}
			});
		} else {
			//It's the edit case
			//Set Title & Labels
			$('.jira-title').html('Edit Issue');
			$('.qf-create-another').hide(); //Create another button
			$('#create-issue-submit').html('Save');

			//Select issue project manually and load all project parameters
			var all = $('#project').find('.all');
			var proj = self.editIssue.fields.project;
			self.projects.push(proj);
			all.append('<option style="background-image: url(images/projectavatar.png)" value="' + proj.id + '" data-key="' + proj.key + '">' + proj.name + '</option>');
			$('#project').select2();
			$('#project').select2('val', proj.id);
			$('#project').select2("enable", false);

			//Load issue Meta in edit case!
			yasoon.oauth({
				url: self.settings.baseUrl + '/rest/api/2/issue/'+self.editIssue.id+'?expand=editmeta,renderedFields,transitions,changelog,operations,names',
				oauthServiceName: jira.settings.currentService,
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: jira.handleError,
				success: function (data) {
					self.editIssue = JSON.parse(data);
					self.selectProject();
				}
			});
		}

		$('#AddAttachmentLink').click(function () {
			yasoon.view.fileChooser.open(function (selectedFiles) {
				self.selectedAttachments = selectedFiles;

				$('#AttachmentContainer').html('');
				//Render Attachments
				$.each(self.selectedAttachments, function (i, fileHandle) {
					$('#AttachmentContainer').append('<div><span><img style="width:16px;" src="' + fileHandle.getFileIconPath() + '">' + fileHandle.getFileName() + '</span></div>');
				});

			});
		});

		$('#duedate').datepicker({
			showOtherMonths: true,
			selectOtherMonths: true,
			dateFormat: 'yy/mm/dd'
		});

		$('#duedate-trigger').unbind().click(function (e) {
			$("#duedate").datepicker("show");
		});

		//Submit Button - (Create & Edit)
		$('#create-issue-submit').unbind().click(function (e) {
			jira.transaction.currentCallCounter = 0;
			$('#MainAlert').hide();
			var result = {
				fields: {}
			};

			$('#create-issue-submit').attr('disabled', 'disabled');
			$('#JiraSpinner').show();

			//Project ID
			result.fields.project = {
				id: project.id
			};

			//Issue Type
			result.fields.issuetype = {
				id: $('#issuetype').val()
			};

			//Title
			result.fields.summary = $('#summary').val();

			//Due Date
			if ($('#duedate').val()) {
				result.fields.duedate = moment(new Date($('#duedate').val())).format('YYYY-MM-DD');
			}
			//Priority
			result.fields.priority = {
				id: $('#priority').val()
			};

			//Components
			if ($('#components').val() && $('#components').val().length > 0) {
				var comps = [];
				$.each($('#components').val(), function (i, id) {
					comps.push({ id: id });
				});
				result.fields.components = comps;
			}

			//Versions
			if ($('#versions').val() && $('#versions').val().length > 0) {
				var versions = [];
				$.each($('#versions').val(), function (i, id) {
					versions.push({ id: id });
				});
				result.fields.versions = versions;
			}
			//FixVersions
			if ($('#fixVersions').val() && $('#fixVersions').val().length > 0) {
				var fixversions = [];
				$.each($('#fixVersions').val(), function (i, id) {
					fixversions.push({ id: id });
				});
				result.fields.fixVersions = fixversions;
			}
			//Labels
			if ($('#labels').val()) {
				result.fields.labels = $('#labels').val().split(',');
			}

			//Enviroment
			if ($('#enviroment').val()) {
				result.fields.enviroment = $('#enviroment').val();
			}
			//Description
			if ($('#description').val()) {
				result.fields.description = $('#description').val();
			}
			//Assignee
			if ($('#assignee').val()) {
				result.fields.assignee = {
					name: $('#assignee').val()
				};
			}

			//Get Custom Fields
			self.UIFormHandler.getFormData(result);

			//Save Template if created by Email
			if (self.mail) {
				var newTemplate = new createTemplate(self.mail.senderEmail, self.mail.senderName, project, result);
				newTemplate.project = project;
				var templateFound = false;
				$.each(templates, function (i, temp) {
					if (temp.senderEmail == newTemplate.senderEmail && temp.project.id == newTemplate.project.id) {
						templates[i] = newTemplate;
						templateFound = true;
					}
				});

				if (!templateFound) {
					templates.push(newTemplate);
				}
				yasoon.setting.setAppParameter('createTemplates', JSON.stringify(templates));
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
				url:url,
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

								if(jira.transaction.currentCallCounter === 0)
									self.close({ action: 'success' });

							},
							success: submitSuccessHandler
						});
					} else {
						jira.transaction.currentCallCounter--;
						if(jira.transaction.currentCallCounter === 0)
							self.close({ action: 'success' });
					}
				}
			});
			e.preventDefault();
		});

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
			//yasoon.dialog.clearEvents();

			////If there has been attachments loaded into yasoon clipboard, we need to remove them
			//if (self.addedAttachmentIds.length > 0) {
			//	$.each(self.addedAttachmentIds, function (i, handleId) {
			//		yasoon.clipboard.remove(handleId);
			//	});
			//}

			yasoon.dialog.close({ action: 'success' });
		}
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

	this.updateCustomFields = function (meta) {
		if (!meta)
			return;

		//Find Meta for current Issue Type
		if (meta.issuetypes) {
			jira.currentMeta = $.grep(meta.issuetypes, function (i) { return i.id == $('#issuetype').val(); })[0];
		} else {
			jira.currentMeta = meta;
		}

		if (jira.currentMeta) {
			//Init Data - hide everything and cleanup custom fields --> generate them afterwards again based on new meta
			$('.field-group').hide();
			$('.icon-required').hide();
			$('#ContainerCustomFields').html('');

			//Apply new meta
			$.each(jira.currentMeta.fields, function (key, value) {
				//Handle Priority
				if (key === 'priority') {
					$('#priority').html('');
					$.each(value.allowedValues, function (i, prio) {
						prio.iconUrl = jira.icons.mapIconUrl(prio.iconUrl);
						$('#priority').append('<option class="imagebacked" data-icon="'+prio.iconUrl +'" value="'+ prio.id +'">'+ prio.name +'</option>');
					});
					$('#priority').val('3'); //Set major as default
					if (self.editIssue && self.editIssue.fields.priority) {
						$('#priority').val(self.editIssue.fields.priority.id);
					}

					$('#priority').select2('destroy');
					$('#priority').select2({
						formatResult: formatIcon,
						formatSelection: formatIcon,
						escapeMarkup: function (m) { return m; }
					});
				}

				//Show/Hide Standard Fields
				if ($('#' + key).length > 0) {
					//Show Field
					$('#' + key).closest('.field-group').show();
					//Set Custom Description
					$('#' + key).closest('.field-group').find('label').children('.descr').html(value.name);
					//Set Custom Description
					if(value.required)
						$('#' + key).closest('.field-group').find('label').children('.icon-required').show();
				}

				

				//Handle Custom Fields
				if (key.indexOf('customfield_') > -1) {
					self.UIFormHandler.render(key, value, $('#ContainerCustomFields'));
				}
			});
		}

	};

	this.selectProject = function () {
		var edit = !!self.editIssue;
		var selectedProject = $('#project').val();
		$('#MainAlert').hide();
		console.log('selected Project: ' + selectedProject);
		if (selectedProject) {
			var isTemplate = (selectedProject.indexOf('template') > -1);
			if (isTemplate) {
				var projId = selectedProject.replace('template', '');
				var template = $.grep(self.currentTemplates, function (temp) { return temp.project.id === projId; })[0];
				if (template) {
					project = $.grep(self.projects, function (proj) { return proj.id === projId; })[0];
					edit = true;
					self.editIssue = template.values;
					//Legacy code 0.6 --> description and summary have been saved inside the template
					delete self.editIssue.summary;
					delete self.editIssue.description;

					self.fromTemplate = true;
				}
			} else {
				project = $.grep(self.projects, function (proj) { return proj.id === selectedProject; })[0];

				//Reset values if from template was true
				if (self.fromTemplate)
					edit = false;
				
				// Save Project in recently used
				self.addRecentProject(project);
			}
			jira.selectedProject = project;
			//Show Loader!
			$('#ContentArea').hide();
			$('#LoaderArea').show();

			$.when(
				self.getProjectValues(),
				self.getComponents(),
				self.getVersions(),
				self.getUser(),
				self.getMetaData(),
				self.getLabels()
			).done(function () {
				if (edit) {
					self.updateCustomFields(self.editIssue.editmeta);

					//Set Text data
					if (self.editIssue.fields.summary && self.currentMeta.fields.summary)
						$('#summary').val(self.editIssue.fields.summary);
					if (self.editIssue.fields.duedate && self.currentMeta.fields.duedate)
						$('#duedate').val(moment(new Date(self.editIssue.fields.duedate)).format('YYYY/MM/DD'));
					if (self.editIssue.fields.enviroment && self.currentMeta.fields.enviroment)
						$('#enviroment').val(self.editIssue.fields.enviroment);
					if (self.editIssue.fields.description && self.currentMeta.fields.description)
						$('#description').val(self.editIssue.fields.description);

					//Project Data
					$("#issuetype").select2('val', self.editIssue.fields.issuetype.id);

					if (!self.fromTemplate)
						$("#issuetype").select2('enable', false);

					if(self.currentMeta.fields.priority)
						$("#priority").select2('val', self.editIssue.fields.priority.id);

					//Components
					if (self.currentMeta.fields.components) {
						var comps = [];
						$.each(self.editIssue.fields.components, function (i, comp) {
							comps.push(comp.id);
						});
						$('#components').select2('val', comps);
					}

					//Versions
					if (self.currentMeta.fields.fixVersions) {
						var fixVers = [];
						$.each(self.editIssue.fields.fixVersions, function (i, version) {
							fixVers.push(version.id);
						});
						$('#fixVersions').select2('val', fixVers);
					}
					if (self.currentMeta.fields.versions) {
						var vers = [];
						$.each(self.editIssue.fields.versions, function (i, version) {
							vers.push(version.id);
						});
						$('#versions').select2('val', vers);
					}
					//User
					if (self.editIssue.fields.assignee && self.currentMeta.fields.assignee) {
						$('#assignee').select2('val', self.editIssue.fields.assignee.id);
					}

					//Labels
					if (self.editIssue.fields.labels && self.currentMeta.fields.labels) {
						$('#labels').select2('val', self.editIssue.fields.labels);
					}

					//Set Custom Fields
					self.UIFormHandler.setFormData(self.editIssue);
				}

				$('#IssueArea').show();
				$('#LoaderArea').hide();
				$('#ContentArea').show();
			});
		}
	};

	self.getProjectValues = function () {
		var dfd = $.Deferred();
		//Get Values of project
		yasoon.oauth({
			url: self.settings.baseUrl + '/rest/api/2/project/' + project.id,
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				var project = JSON.parse(data);
				$('#issuetype').html(' ');
				project.issueTypes.sort(function (a, b) {
					if (a.id > b.id)
						return 1;
					else
						return -1;
				});
				$.each(project.issueTypes, function (i, type) {
					if (!type.subtask) {
						type.iconUrl = jira.icons.mapIconUrl(type.iconUrl);
						$('#issuetype').append('<option data-icon="' + type.iconUrl + '" value="' + type.id + '">' + type.name + '</option>');
					}
				});

				$("#issuetype").select2({
					formatResult: formatIcon,
					formatSelection: formatIcon,
					escapeMarkup: function (m) { return m; }
				});

				$('#issuetype').change(function () {
					self.updateCustomFields(projectMeta);
				});

				dfd.resolve();
			}
		});

		return dfd.promise();

	};

	self.getComponents = function () {
		var dfd = $.Deferred();
		//Get components
		yasoon.oauth({
			url: self.settings.baseUrl + '/rest/api/2/project/' + project.id + '/components',
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				var components = JSON.parse(data);
				$('#components').html('');
				$.each(components, function (i, comp) {
					$('#components').append('<option title="' + comp.description + '" value="' + comp.id + '">' + comp.name + '</option>');
				});
				$('#components').select2();

				dfd.resolve();
			}
		});

		return dfd.promise();
	};

	self.getVersions = function () {
		var dfd = $.Deferred();
		//Get Versions
		yasoon.oauth({
			url: self.settings.baseUrl + '/rest/api/2/project/' + project.id + '/versions',
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				var versions = JSON.parse(data);
				$('#versions').html('');
				$('#fixVersions').html('');

				if (versions && versions.length > 0) {
					$.each(versions, function (i, comp) {
						$('#versions').append('<option title="' + comp.description + '" value="' + comp.id + '">' + comp.name + '</option>');
						$('#fixVersions').append('<option title="' + comp.description + '" value="' + comp.id + '">' + comp.name + '</option>');
					});
				}
				$('#versions').select2();
				$('#fixVersions').select2();

				dfd.resolve();
			}
		});

		return dfd.promise();
	};

	self.getUser = function () {
		var dfd = $.Deferred();
		//Get Assignable Users
		yasoon.oauth({
			url: self.settings.baseUrl + '/rest/api/2/user/assignable/search?project=' + project.key + '&maxResults=1000',
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				var assignees = JSON.parse(data);
				//Transform Data
				if (assignees && assignees.length > 0) {
					$.each(assignees, function (i, user) {
						user.id = user.name;
					});
				}

				$('#assignee').select2({
					data: { results: assignees, text: 'displayName' },
					formatResult: formatUser,
					formatSelection: formatUser,
				});

				$('#assign-to-me-trigger').click(function () {
					if (self.ownUser) {
						$('#assignee').val(self.ownUser.name).trigger("change");
					}
				});

				dfd.resolve();
			}
		});
		return dfd.promise();
	};

	self.getMetaData = function () {
		var dfd = $.Deferred();
		//Meta Data for custom fields
		yasoon.oauth({
			url: self.settings.baseUrl + '/rest/api/2/issue/createmeta?projectIds=' + project.id + '&expand=projects.issuetypes.fields',
			oauthServiceName: jira.settings.currentService,
			headers: jira.CONST_HEADER,
			type: yasoon.ajaxMethod.Get,
			error: jira.handleError,
			success: function (data) {
				var meta = JSON.parse(data);
				//Find selected project (should be selected by API Call, but I'm not sure if it works due to missing test data )
				projectMeta = $.grep(meta.projects, function (p) { return p.id === project.id; })[0];
				self.updateCustomFields(projectMeta);
				console.log(projectMeta);
				dfd.resolve();
			}
		});

		return dfd.promise();
	};

	self.getLabels = function () {
		var dfd = $.Deferred();
		//Label Data
		yasoon.oauth({
			url: self.settings.baseUrl + '/rest/api/1.0/labels/suggest?query=',
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
				$('#labels').select2({
					tags: labelArray,
					tokenSeparators: [" "]
				});

				dfd.resolve();
			}
		});
		return dfd.promise();
	};

}); //jshint ignore:line

function UIFormHandler() {

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
				   '    <div class="long-field">' + 
				   '        <input class="text input-field" id="' + id + '" name="' + id + '" data-type="com.atlassian.jira.plugin.system.customfieldtypes:labels"></input>' +
				   '    </div>'+
				   '</div>';

		$(container).append(html);
		yasoon.oauth({
			url: jira.settings.baseUrl + '/rest/api/1.0/labels/suggest?customFieldId='+ field.schema.customId +'&query=',
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
					tags: labelArray,
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
				   '    <label for="issuetype">' + field.name+ '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				   '    <select data-container-class="issuetype-ss" class="select input-field" id="' + id + '" name="' + id + '" data-type="com.atlassian.jira.plugin.system.customfieldtypes:select">' +
				   '        <option value="">None</option>';
		$.each(field.allowedValues, function (i, option) {
			html += '<option value="' + option.id + '">' + option.value + '</option>';
		});
		html +=  '      </select>' +
				  '</div>';

		$(container).append(html);

		$('#'+id).select2();
	}

	function renderMultiSelectList(id, field, container) {
		var html = '<div class="field-group input-field">' +
		   '    <label for="issuetype">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
		   '    <select data-container-class="issuetype-ss" class="select text input-field" id="' + id + '" name="' + id + '" multiple="multiple" data-type="com.atlassian.jira.plugin.system.customfieldtypes:multiselect">';
		$.each(field.allowedValues, function (i, option) {
			html += '<option value="' + option.id + '">' + option.value + '</option>';
		});
		html += '      </select>' +
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
			'</div>');
	}

	function renderUserPicker(id, field, container) {

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

	return {
		render: function (id, field, container) {
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
		},

		getFormData: function (result) {
			result = result || {};
			//Find Meta for current Issue Type
			
			if (jira.currentMeta) {
				$.each(jira.currentMeta.fields, function (key, value) {
					if (key.indexOf('customfield_') > -1) {
						//Try to find the field in form
						var elem = $('#' + key);
						if (elem.length > 0 ) {
							switch (elem.data('type')) {
								case 'com.atlassian.jira.plugin.system.customfieldtypes:textfield':
								case 'com.atlassian.jira.plugin.system.customfieldtypes:textarea':
								case 'com.atlassian.jira.plugin.system.customfieldtypes:url':
									if(elem.val())
										result.fields[key] = elem.val();
									break;
								case 'com.pyxis.greenhopper.jira:gh-sprint':
									
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
									if(float)
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
										result.fields[key] = elem.val().split(',');
									}
									break;
								case 'com.atlassian.jira.plugin.system.customfieldtypes:select':
									if(elem.val())
										result.fields[key] = { id: elem.val() };
									break;
								case 'com.pyxis.greenhopper.jira:gh-epic-link':
									if (!jira.editIssue && elem.val()) {
										result.fields[key] = 'key:' + elem.val();
									}
									else if (jira.editIssue && jira.editIssue.fields[key] != elem.val())
									{
										//Time to make it dirty! Epic links cannot be changed via REST APi --> Status code 500
										// Ticket: https://jira.atlassian.com/browse/GHS-10333
										//There is a workaround --> update it via unofficial greenhopper API --> that completely breaks ou concept so just do it now and do not return an result
										jira.transaction.currentCallCounter++;
										if (elem.val()) {
											//Create or update
											yasoon.oauth({
												url: jira.settings.baseUrl + '/rest/greenhopper/1.0/epics/' + elem.val() +'/add',
												oauthServiceName: jira.settings.currentService,
												type: yasoon.ajaxMethod.Put,
												data: '{ "issueKeys":["' + jira.editIssue.key +'"] }',
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
												data: '{ "issueKeys":["'+ jira.editIssue.key +'"] }',
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
							}
						}
					}
				});
			}

		},

		setFormData: function (issue) {
			if (jira.currentMeta) {
				$.each(jira.currentMeta.fields, function (key, value) {
					if (key.indexOf('customfield_') > -1) {
						switch (jira.currentMeta.fields[key].schema.custom) {
							case 'com.atlassian.jira.plugin.system.customfieldtypes:textfield':
							case 'com.atlassian.jira.plugin.system.customfieldtypes:url':
							case 'com.atlassian.jira.plugin.system.customfieldtypes:float':
							case 'com.atlassian.jira.plugin.system.customfieldtypes:textarea':
								if (issue.fields[key]) {
									$('#' + key).val(issue.fields[key]);
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes':
								if (issue.fields[key]) {
									var elem = $('#' + key);
									$.each(issue.fields[key], function (i, value) {
										elem.find('[value='+ value.id +']').prop('checked', true);
									});
									
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker':
								if (issue.fields[key]) {
									$('#' + key).val(moment(new Date(issue.fields[key])).format('YYYY/MM/DD'));
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:datetime':
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:select':		                    
								if (issue.fields[key]) {
									$('#' + key).select2('val', issue.fields[key].id);
								}
								break;
							case 'com.pyxis.greenhopper.jira:gh-sprint':
								if (issue.fields[key] && issue.fields[key].length > 0) {
									$('#' + key).select2('val', parseSprintId(issue.fields[key][0]));
									$('#' + key).data('value', parseSprintId(issue.fields[key][0]));
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:labels':
							case 'com.pyxis.greenhopper.jira:gh-epic-link':
								if (issue.fields[key]) {
									$('#' + key).select2('val', issue.fields[key]);
									$('#' + key).data('value', issue.fields[key]);
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect':
								if (issue.fields[key]) {
									var selectedValues = [];
									$.each(issue.fields[key], function (i, value) {
										selectedValues.push(value.id);
									});
									$('#' + key).select2('val', selectedValues);
								}
								break;
							case 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker':
								break;
						}
					}
				});
			}
		}
		
	};
}

function JiraIconController() {
	var self = this;
	//Contains object { url: '' , fileName: '' }
	var iconBuffer = [];

	var saveIcon = function (url) {
		//generate unique FileName
		var fileName = 'Images\\' + jiraCreateHash(url) + '.png';
		console.log(url + ' : ' + fileName);
		//Download File
		yasoon.io.download(url, fileName, false, function () {
			//Success Handler
			var result = iconBuffer.filter(function (elem) { return elem.url == url; });
			if (result.length === 1) {
				result[0].fileName = yasoon.io.getLinkPath(fileName);
			}
			yasoon.setting.setAppParameter('icons', JSON.stringify(iconBuffer));
		});

		//Temporary save URL in Buffer
		iconBuffer.push({ url: url, fileName: url });

		return url;
	};

	this.mapIconUrl = function (url) {
		//Avoid mapping local URLs
		if (url.indexOf('http') !== 0) {
			return url;
		}

		var result = iconBuffer.filter(function (elem) { return elem.url == url; });
		if (result.length > 1) {
			//Should never happen --> remove both elements from buffer
			iconBuffer = iconBuffer.filter(function (elem) { return elem.url != url; });
			result = [];
		}

		var absUrl = '';
		if (result.length === 1) {
			absUrl = result[0].fileName;
		} else {
			absUrl = saveIcon(url);
		}

		return yasoon.io.getDialogRelativePath(absUrl);
	};

	this.addIcon = function (url) {
		var result = iconBuffer.filter(function (elem) { return elem.url == url; });
		if (result.length === 0) {
			saveIcon(url);
		}
	};


	// init
	var iconString = yasoon.setting.getAppParameter('icons');
	if (iconString) {
		iconBuffer = JSON.parse(iconString);
	}
}

function jiraCreateHash(input) {
	var hash = 0, i, chr, len;
	if (input.length === 0) return hash;
	for (i = 0, len = input.length; i < len; i++) {
		chr = input.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
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

 