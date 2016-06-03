var jira = {};

$(function () {
	$('body').css('overflow-y', 'hidden');
	$('form').on('submit', function(e) {
		e.preventDefault();
		return false;
	});
});

$(window).resize(resizeWindow);

yasoon.dialog.load(new function () { //jshint ignore:line
	var self = this;

	jira = this;
	jira.CONST_HEADER = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
	
	this.UIFormHandler = UIRenderer;
	this.icons = new JiraIconController();
	this.fromTemplate = false;

	this.transaction = { currentCallCounter: 0, errorOccured: null };

	this.currentTemplates = [];
	this.currentMeta = null;
	this.currentIssue = null;
	this.selectedProject = null;
	this.serviceDesks = null;
	this.senderUser = { name: -1 };
	this.projectMeta = null;
	this.systemInfo = null;

	this.mailAsMarkup = '';
	this.recentProjects = [];
	this.projects = [];
	this.addedAttachmentIds = [];
	this.selectedAttachments = [];
	this.savedTemplates = [];
	this.userCommonValues = {};

	//Order of Fields in the form. Fields not part of the array will be rendered afterwards
	//This can be customized by JIRA admin
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

	//Which email field maps to which JIRA field
	var fieldMapping = {
		subject: 'summary',
		body: 'description',
		sender: 'reporter',
		sentAt: ''
	};

	//If custom script is specified, load it as well.
	var customScriptUrl = yasoon.setting.getAppParameter('customScript');
	if (customScriptUrl) {
		$.getScript('Dialogs/customScript.js');
	}

	this.init = function (initParams) {
		//Parameter taken over from Main JIRA
		self.settings = initParams.settings;
		self.ownUser = initParams.ownUser || {};
		self.isEditMode = !!initParams.editIssueId;
		self.editIssueId = initParams.editIssueId;
		self.editProject = initParams.editProject;
		self.mail = initParams.mail;
		self.selectedText = initParams.text;
		self.cacheUserMeta = initParams.userMeta;
		self.cacheCreateMetas = initParams.createMetas;
		self.cacheProjects = initParams.projects;
		self.systemInfo = initParams.systemInfo || { versionNumbers: [6, 4, 0] };

		self.userCommonValues = {
			results: [{
				id: 'Suggested',
				text: yasoon.i18n('dialog.suggested'),
				children: [{
					'id': jira.ownUser.name,
					'icon': 'ownUser',
					'text': jira.ownUser.displayName
				}]
			},
			{
				id: 'Search',
				text: yasoon.i18n('dialog.userSearchResult'),
				children: []
			}]
		};

		self.assigneeCommonValues = JSON.parse(JSON.stringify(self.userCommonValues));

		self.assigneeCommonValues.results[0].children.push({
			'id': '-1',
			'selected': true,
			'icon': 'avatar',
			'text': 'Automatic'
		});
				
		//Register Close Handler
		yasoon.dialog.onClose(self.cleanup);

		// Resize Window if nessecary (sized are optimized for default Window - user may have changed that)
		resizeWindow();

		//Load Recent Projects from DB
		var projectsString = yasoon.setting.getAppParameter('recentProjects');
		if (projectsString) {
			self.recentProjects = JSON.parse(projectsString);
		}

		//Load Recent Issues from DB
		var issuesString = yasoon.setting.getAppParameter('recentIssues');
		if (issuesString) {
			self.recentIssues = JSON.parse(issuesString);
		}

		//Load DB settings
		var fieldOrderString = yasoon.setting.getAppParameter('fieldOrder');
		if (fieldOrderString) {
			fieldOrder = JSON.parse(fieldOrderString);
		}

		var fieldMappingString = yasoon.setting.getAppParameter('fieldMapping');
		if (fieldMappingString) {
			fieldMapping = JSON.parse(fieldMappingString);
		}

		//If created by email, check for templates and attachments
		if (self.mail) {
			//Check if we have templates on db for current sender.
			var templateString = yasoon.setting.getAppParameter('createTemplates');
			if (templateString) {
				self.savedTemplates = JSON.parse(templateString);
			}
			
			self.currentTemplates = self.savedTemplates.filter(function (t) { 
				//Check that senderEmail matches & project does still exist
				if (t.senderEmail === self.mail.senderEmail) {
					if (self.cacheProjects) {
						var proj = self.cacheProjects.filter(function (p) { return p.id === t.project.id; });
						return proj.length === 1;
					}
					
					//No cache there yet, check later again
					return true;
				}
				
				return false;
			});
			
			if (self.currentTemplates.length > 0) {
				var group = $('#project').find('.templates');
				group.attr('label', yasoon.i18n('dialog.templateFor', { name: self.mail.senderName}));
				$.each(self.currentTemplates, function (i, template) {
					group.append('<option value="template' + template.project.id + '" data-icon="' + getProjectIcon(template.project) + '">' + template.project.name + '</option>');
				});
				group.show();
			}

			//Add current mail to clipboard
			var handle = self.mail.getFileHandle();
			if (self.settings.addEmailOnNewAddIssue) {
				self.selectedAttachments.push(handle);
			} else {
				var id = yasoon.clipboard.addFile(handle);
				self.addedAttachmentIds.push(id);
			}
		}
		
		if (self.mail && self.mail.attachments && self.mail.attachments.length > 0) {
			self.mail.attachments.forEach(function(attachment) {				
				var handle = attachment.getFileHandle();		
				//Skip hidden attachments (mostly embedded images)	
				if (self.settings.addAttachmentsOnNewAddIssue && !attachment.isHidden) {
					self.selectedAttachments.push(handle);
				}
				else {
					var id = yasoon.clipboard.addFile(handle);
					self.addedAttachmentIds.push(id);
				}
			});
		}

		if (self.isEditMode) {
			//It's the edit case
			//Set Title & Labels
			$('.jira-title').html(yasoon.i18n('dialog.titleEditIssue'));
			$('#createAnotherCheckbox').hide(); //Create another button
			$('#create-issue-submit').html(yasoon.i18n('dialog.save'));

			//Select issue project manually and immedeately for better layout.
			self.selectedProject = self.editProject;
			
			var all = $('#project').find('.all');
			all.append('<option data-icon="' + getProjectIcon(project) +'"  value="' + self.editProject.id + '" data-key="' + self.editProject.key + '">' + self.editProject.name + '</option>');
			$('#project').select2();
			$('#project').val(self.editProject.id).trigger('change');
			$('#project').prop("disabled", true);

			//Start Loader
			$('#LoaderArea').show();

			//Load issue Meta in edit case and render UI!
			Promise.all([
				jiraGet('/rest/api/2/issue/' + self.editIssueId + '?expand=editmeta,renderedFields,transitions,changelog,operations,names'),
				self.getProjectValues()
			])
			.spread(function (data) { //Result of getProjectValues is set to jira.selectedProject
				self.currentIssue = JSON.parse(data);
				console.log(JSON.parse(data));
				
				self.projects.push(self.selectedProject);
				//Select Issue Type
				$('#issuetype').append('<option data-icon="' + jira.currentIssue.fields.issuetype.iconUrl + '" value="' + jira.currentIssue.fields.issuetype.id + '">' + jira.currentIssue.fields.issuetype.name + '</option>');

				$('#issuetype').select2({
					templateResult: formatIcon,
					templateSelection: formatIcon
				});
				$('#issuetype').val(jira.currentIssue.fields.issuetype.id).trigger('change');
				$('#issuetype').select2("enable", false);
				$('#IssueArea').show();

				self.renderIssue(self.currentIssue.editmeta);
			})
			.catch(jira.handleError);

		} else {
			//Create case --> Select all projects and if user select one, load project settings
			//Create select2 dropdown, so it looks better while loading.
			$('#project').select2({
				placeholder: yasoon.i18n('dialog.placeholderSelectProject')
			});
			$("#issuetype").select2({
				placeholder: yasoon.i18n('dialog.placeholderIssueType')
			});
			$("#requestType").select2({
				placeholder: yasoon.i18n('dialog.placeholderRequestType')
			});
			$('#ProjectSpinner').css('display', 'inline');
			
			//Please don't change, weird resize bug whatever
			// => We need the thenable to be executed async
			var projectGet = Promise.delay(jira.cacheProjects, 1); 
			
			if (!jira.cacheProjects || jira.cacheProjects.length === 0) 
				projectGet = jiraGet('/rest/api/2/project');
			
			Promise.all([
				projectGet,
				jiraGet('/rest/servicedeskapi/servicedesk').catch(function (e) { return null;})
			])
			.spread(function (data, serviceDesks) {				
				//Populate Project Dropdown
				if (typeof(data) === 'string')
					self.projects = JSON.parse(data);
				else 
					self.projects = data;
				
				if (serviceDesks)
					self.serviceDesks = JSON.parse(serviceDesks);

				var group = $('#project').find('.all');
				self.projects.sort(function (a, b) { return a.name.toLowerCase() > b.name.toLowerCase(); });
				$.each(self.projects, function (i, project) {
					group.append('<option value="' + project.id + '" data-icon="' + getProjectIcon(project) + '" data-key="' + project.key + '">' + project.name + '</option>');
				});
				
				group = $('#project').find('.recent');
				$.each(self.recentProjects, function (i, proj) {
					var project = self.projects.filter(function (p) { return p.key === proj.key; })[0];
					if (project) {
						group.append('<option value="' + project.id + '" data-icon="' + getProjectIcon(project) + '" data-key="' + project.key + '">' + project.name + '</option>');
					}
				});

				$('#project').select2("destroy");
				$('#project').select2({
					placeholder: yasoon.i18n('dialog.placeholderSelectProject'),
					templateResult: formatIcon,
					templateSelection: formatIcon,
				});

				$('#ProjectSpinner').css('display', 'none');
				$('#project').on('change', self.selectProject);
				$('#project').next().find('.select2-selection').first().focus();
				
				//If mail is provided && subject contains reference to project, pre-select that
				if (self.mail && self.mail.subject) {					
					//Sort projects by key length descending, so we will match the following correctly:
					// Subject: This is for DEMODD project
					// Keys: DEMO, DEMOD, DEMODD
					var projectsByKeyLength = self.projects.sort(function(a, b){
						return b.key.length - a.key.length; // ASC -> a - b; DESC -> b - a
					});
					
					for (var i = 0; i < projectsByKeyLength.length; i++) {
						var curProj = projectsByKeyLength[i];
						if (self.mail.subject.indexOf(curProj.key) >= 0) {							
							$('#project').val(curProj.id).trigger('change');
							break;
						}
					}
				}
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
			$('#AttachmentContainer').empty();
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
		jira.issueCreated = false;
		
		//Prepare UI
		$('#MainAlert').hide();
		$('#create-issue-submit').attr('disabled', 'disabled');
		$('#JiraSpinner').show();
		
		e.preventDefault();
		//Check if Request type is needed and add it
		var isServiceDesk = jira.selectedProject.projectTypeKey == 'service_desk' && $('#switchServiceMode').hasClass('active');
		
		return Promise.resolve()
			.then(function () {

			//Collect fixed data:
			//1. Project ID
			result.fields.project = {
				id: self.selectedProject.id
			};
			//2. Issue Type
			result.fields.issuetype = {
				id: $('#issuetype').val()
			};

			// 2.1 Issue if it's a subtask
			if (jira.currentMeta.subtask) {
				var parent = $('#issue').val();
				if (parent) {
					result.fields.parent = {
						key: parent
					};
				}
			}
			//Increment transaction for Greenhopper API
			jira.transaction.currentCallCounter++;
			//Get Generated Fields
			self.UIFormHandler.getFormData(result);

			//3.2 Change reporter if we have a "on behalf of" case.
			if (isServiceDesk) {
				var user = $('#behalfReporter').val();
				if (user) {
					result.fields.reporter = { name: user };
				}
			}

			//Inform Fields that save is going to start.
			self.UIFormHandler.triggerEvent('save', result);

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

			// Save Project in recently used
			self.addRecentProject(jira.selectedProject);

			console.log('Send Data:', result);

			//Switch for edit or create
			var url = '/rest/api/2/issue';
			var method = yasoon.ajaxMethod.Post;

			if (self.editIssueId && !self.fromTemplate) {
				url = url + '/' + self.editIssueId;
				method = yasoon.ajaxMethod.Put;
			}
			//Submit request		
			return jiraAjax(url, method, JSON.stringify(result));
		})	
		.then(function (data) {
			jira.transaction.currentCallCounter--;
			var issue = self.isEditMode ? jira.currentIssue : JSON.parse(data);
			jira.issueCreated = true;
			//Trigger AfterSave Event (needed for Epics :( )
			self.UIFormHandler.triggerEvent('afterSave', { input: result, newIssue: issue });

			//Save issueId in conversation data
			if (jira.mail) {
				try {
					//Set Conversation Data
					var conversationString = yasoon.outlook.mail.getConversationData(jira.mail); //That derives wrong appNamespace, since the object wsa created in main window context: jira.mail.getConversationData();
					var conversation = {
						issues: {}
					};

					if (conversationString)
						conversation = JSON.parse(conversationString);

					conversation.issues[issue.id] = { id: issue.id, key: issue.key, summary: result.fields.summary, projectId: self.selectedProject.id };
					yasoon.outlook.mail.setConversationData(jira.mail, JSON.stringify(conversation)); //jira.mail.setConversationData(JSON.stringify(conversation));

					//Set new message class to switch icon
					if (!jira.mail.isSignedOrEncrypted || jira.settings.overwriteEncrypted)
						jira.mail.setMessageClass('IPM.Note.Jira');
				} catch (e) {
					//Not so important
					yasoon.util.log('Failed to set Conversation data', yasoon.util.severity.info, getStackTrace(e));
				}
			}

			//Service Request? Assignment Type have an own call
			if (isServiceDesk) {
				var requestTypeId = $('#requestType').val();
				jira.transaction.currentCallCounter++;

				jiraAjax('/rest/servicedesk/1/servicedesk/request/'+ issue.id + '/request-types', yasoon.ajaxMethod.Post, JSON.stringify({ rtId: requestTypeId }))
				.then(submitSuccessHandler)
				.catch(jiraSyncError, function (e) {
					jira.transaction.currentCallCounter--;
					yasoon.util.log('Couldn\'t update RequestType assignment' + e.getUserFriendlyError(), yasoon.util.severity.warning);
				});
			}

			//Attachments?
			if (self.selectedAttachments.length > 0) {

				var formData = [];
				$.each(self.selectedAttachments, function (i, file) {
					formData.push({
						type: yasoon.formData.File,
						name: 'file',
						value: file
					});
				});
				jira.transaction.currentCallCounter++;

				jiraAjax('/rest/api/2/issue/' + issue.id + '/attachments', yasoon.ajaxMethod.Post, null, formData )
				.then(submitSuccessHandler)
				.catch(jiraSyncError, function(e) {
					jira.transaction.currentCallCounter--;
					yasoon.util.log('Couldn\'t upload attachments: ' + e.getUserFriendlyError() +' || ' +  JSON.stringify(formData), yasoon.util.severity.warning);
					yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorCreateAttachment', { key: issue.key, error: e.getUserFriendlyError() }));

					//If there is no open request, close Window
					if (jira.transaction.currentCallCounter === 0)
						self.close({ action: 'success' });
				});
			}

			//If there is no open request, close Window
			if (jira.transaction.currentCallCounter === 0)
				self.close({ action: 'success' });
		})
		.catch(jiraSyncError, function (e) {
			yasoon.util.log('Couldn\'t submit New Issue Dialog: ' + e.getUserFriendlyError() + ' || Issue: ' + JSON.stringify(result), yasoon.util.severity.warning);
			jira.transaction.currentCallCounter = -1; //Make sure the window will never close as issue has not been created
			yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSubmitIssue', { error: e.getUserFriendlyError() }));
			$('#JiraSpinner').hide();
			$('#create-issue-submit').removeAttr("disabled");
		})
		.catch(function (e) {
			$('#JiraSpinner').hide();
			if (jira.issueCreated) {
				yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorAfterSubmitIssue', { error: 'Unknown' }));	
			} else {
				$('#create-issue-submit').removeAttr("disabled");
				yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSubmitIssue', { error: 'Unknown' }));	
			}	
			jira.transaction.currentCallCounter = -1; //Make sure the window will never close as issue has not been created
					
			yasoon.util.log('Unexpected error in Create Issue Dialog: ' + e + ' || Issue: ' + JSON.stringify(result), yasoon.util.severity.error, getStackTrace(e));
		});
	};

	this.handleError = function (data, statusCode, result, errorText, cbkParam) {
		$('#MainAlert').show();
		$('#LoaderArea').hide();
		if (data && data.stack) {
			yasoon.util.log('Unexpected JS Error: ' + data, yasoon.util.severity.error, getStackTrace(data));
			console.log(data);
		} else {
			console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
			yasoon.util.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data, yasoon.util.severity.error);
		}	
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
		
		var templateServiceData = null;

		if (selectedProject) {
			var isTemplate = (selectedProject.indexOf('template') > -1);
			if (isTemplate) {
				var projId = selectedProject.replace('template', '');
				var template = $.grep(self.currentTemplates, function (temp) { return temp.project.id === projId; })[0];
				if (template) {
					jira.selectedProject = $.grep(self.projects, function (proj) { return proj.id === projId; })[0];
					self.currentIssue = template.values;
					templateServiceData = template.serviceDesk;
				}
				else {
					//Project does not exist (anymore?), return
					$('#project').val('').trigger('change');
					return;
				}
			} 
			else {
				self.currentIssue = null;
				jira.selectedProject = $.grep(self.projects, function (proj) { return proj.id === selectedProject; })[0];
			}
			
			//Show Loader!
			$('#ContentArea').css('visibility','hidden');
			$('#LoaderArea').show();

			Promise.all([								
				self.getRequestTypes(jira.selectedProject),
				self.getProjectValues(),
				self.getMetaData(),
				self.loadSenderUser()
			])
			.delay(1)
			.spread(function (requestTypes) {
				//New with JIRA 7: Depending on the project type, we render a little bit differently.
				//Common stuff
				$('#issuetype').empty().unbind();

				//Render Issue Types
				$.each(self.selectedProject.issueTypes, function (i, type) {
					type.iconUrl = jira.icons.mapIconUrl(type.iconUrl);
					$('#issuetype').append('<option data-icon="' + type.iconUrl + '" value="' + type.id + '">' + type.name + '</option>');
				});

				$('#issuetype').select2("destroy");
				$("#issuetype").select2({
					templateResult: formatIcon,
					templateSelection: formatIcon
				});
				$('#issuetype').val(self.selectedProject.issueTypes[0].id).trigger('change');

				$('#issuetype').change(function (e, promise) {
					var meta = $.grep(self.projectMeta.issuetypes, function (i) { return i.id == $('#issuetype').val(); })[0];
					$('#LoaderArea').show();
					$('#ContentArea').css('visibility', 'hidden');
					if (promise) {
						promise.innerPromise = promise.innerPromise.then(function () {
							return jira.renderIssue(meta);
						});
					} else {
						jira.renderIssue(meta);
					}

				});

				//Hide and revert Service Stuff
				$('#switchServiceMode').addClass('hidden').removeClass('active');
				$('#issuetype').prop("disabled", false);
				$('#ServiceArea').addClass('hidden');
				$('#behalfOfUserReporter').empty();

				//Service Specific Stuff
				if (jira.selectedProject.projectTypeKey == 'service_desk' && requestTypes) {
					$('#requestType').empty().unbind();
					//Render Request Types if it's an service project
					requestTypes.groups.forEach(function (group) {
						$('#requestType').append('<optgroup label="' + group.name + '"></optgroup>');
						var currentGroup = $('#requestType').find('optgroup').last();
						requestTypes.forEach(function (rt) {
							if (rt.groups.filter(function (g) { return g.id === group.id; }).length > 0) {
								//This request type is assigned to current group --> display.
								if (jira.systemInfo.versionNumbers[0] === 7 && jira.systemInfo.versionNumbers[1] > 0) {
									currentGroup.append('<option data-icon = "' + rt.iconUrl + '" data-requesttype="' + rt.portalKey + '/' + rt.key + '" data-issuetype="' + rt.issueType + '" value="' + rt.id + '">' + rt.name + '</option>');
								} else {
									currentGroup.append('<option data-iconclass = "vp-rq-icon vp-rq-icon-' + rt.icon + '" data-requesttype="' + rt.portalKey + '/' + rt.key + '" data-issuetype="' + rt.issueType + '" value="' + rt.id + '">' + rt.name + '</option>');
									
								}
							}
						});
					});
					$('#requestType').select2("destroy");
					$("#requestType").select2({
						templateResult: formatIcon,
						templateSelection: formatIcon
					});

					//Set Reporter Data
					self.UIFormHandler.render('behalfReporter', { name: 'Reporter', required: false, schema: { system: 'reporter' } }, '#behalfOfUserReporter');
					self.setDefaultReporter('behalfReporter');

					//Hide Label of newly generated Reporter Field
					$('#behalfReporter-container label').addClass('hidden');
					
					//Event for show/ hide portal data
					$('#switchServiceMode').removeClass('hidden').unbind().click(function () {
						$('#ServiceArea').toggleClass('hidden');
						$('#switchServiceMode').toggleClass('active');

						if ($('#switchServiceMode').hasClass('active')) {
							$('#issuetype').prop("disabled", true);
							$('#reporter-container').addClass('hidden');
						} else {
							$('#issuetype').prop("disabled", false);
							$('#reporter-container').removeClass('hidden');
						}
					});

					//Change Handler for Request Types
					$('#requestType').change(function () {
						var promise = { innerPromise: Promise.resolve() };
						$('#issuetype').val($('#requestType').find(':selected').data('issuetype')).trigger('change', promise);

						promise.innerPromise.then(function () {
							$('#reporter-container').addClass('hidden');
						});
						
					});

					//Check and set Service Desk specific template data
					if (templateServiceData) {
						if (templateServiceData.enabled) {
							$('#switchServiceMode').trigger('click');
						}
						if (templateServiceData.requestType) {
							$('#requestType').val(templateServiceData.requestType).trigger('change');
						}
					}
				}


				$('#IssueArea').show();

				//Get Meta of first issue type and start rendering
				var meta = $.grep(self.projectMeta.issuetypes, function (i) { return i.id == self.selectedProject.issueTypes[0].id; })[0];
				return jira.renderIssue(meta);
			})
			.catch(jira.handleError);
		}
	};
	
	this.loadingSenderUser = null;
	this.loadSenderUser = function() {		
		if (self.loadingSenderUser)
			return self.loadingSenderUser;		
		
		if (!jira.mail)
			return Promise.resolve();		
		
		self.loadingSenderUser = jiraGet('/rest/api/2/user/search?username=' + self.mail.senderEmail)
			.then(function (data) {
				var users = JSON.parse(data);
				if (users.length > 0) {
					jira.senderUser = users[0];
					jira.userCommonValues.results[0].children.push({
						id: jira.senderUser.name,
						text: jira.senderUser.displayName,
						icon: 'emailSender'
					});
				} 
				else {
					$('.create-sender').css('display', 'inline');
				}
				
				self.setDefaultReporter(fieldMapping.sender);
			});
		return self.loadingSenderUser;
	};

	this.renderIssue = function (meta) {
		//Set this as current meta
		jira.currentMeta = meta;
		$('#SubtaskArea').addClass('hidden');
		return Promise.resolve()
		.then(function() {
			//If currentMeta is a subtask, render Issue Renderer
			if (jira.currentMeta.subtask) {
				new IssuePickerRenderer().render('issue', { required: true }, $('#SubtaskArea'));
				$('#SubtaskArea').removeClass('hidden');
			}
		})
		.then(function() {
			return self.renderIssueUser();
		})
		.catch(function (e) {
			console.log('Error in new renderLogic - switch to old one', e);
			return self.renderIssueFixed(meta);
		})
		.then(function () {
			//self.UIFormHandler.triggerEvent('afterRender'); //Not needed yet!

			//Fill with intial Values
			self.insertValues();

			//Show Area again and hide loader
			$('#LoaderArea').hide();
			$('#ContentArea').css('visibility', 'visible');
		});
	};

	this.renderIssueFixed = function (meta) {
		$('#ContainerFields').empty();
		$('#tab-list').empty();
		$('#tab-list').addClass('hidden');

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

		return true;
	};

	this.renderIssueUser = function () {
		return self.getUserPreferences()
		.then(function (renderData) {
			//First clean up everything
			$('#ContainerFields').empty();
			$('#tab-list').empty();
			$('#MainAlert').hide();

			//Render each field
			var renderedTabs = {};
			renderData.fields.forEach(function (field) {
				if (field.id === 'project' || field.id === 'issuetype')
					return;

				//Check if userPrefences allow current field
				if (renderData.userPreferences.useQuickForm && (renderData.userPreferences.fields.indexOf(field.id) === -1 && field.required === false)) {
					return;
				}

				//Render tab if nessecary
				var containerId = '#ContainerFields';
				if (renderData.sortedTabs.length > 1) {
					if (!renderedTabs[field.tab.position]) {
						$('#tab-list').append('<li role="presentation" class="' + ((field.tab.position === 0) ? 'active' : '') + '"><a href="#tab-content' + field.tab.position + '" role="tab" data-toggle="tab">' + field.tab.label + '</a></li>');
						$('#ContainerFields').addClass('tab-content');
						$('#ContainerFields').append('<div role="tabpanel" class="tab-pane" id="tab-content' + field.tab.position + '"></div>');
						if (field.tab.position === 0) {
							$('#tab-content' + field.tab.position).addClass('active');

						}
						renderedTabs[field.tab.position] = true;
					}
					containerId = '#tab-content' + field.tab.position;
				}
				if (jira.currentMeta.fields[field.id]) {
					jira.UIFormHandler.render(field.id, jira.currentMeta.fields[field.id], containerId);
				}
			});

			//Tabs nessecary?
			if (Object.keys(renderedTabs).length > 1) {
				$('#tab-list').removeClass('hidden');
			} else {
				$('#tab-list').addClass('hidden');
			}
		});
	};

	this.markupRenderProcess = null;
	this.insertValues = function () {
		//Always default Reporter
		self.setDefaultReporter(fieldMapping.sender);

		//Values if created by mail
		if (self.mail) {
			//Subject
			if (self.mail.subject && fieldMapping.subject) {
				var subjectType = $('#' + fieldMapping.subject).data('type');
				jira.UIFormHandler.setValue(fieldMapping.subject, { schema: { custom: subjectType }}, self.mail.subject);
			}

			//Description			
			var bodyType = $('#' + fieldMapping.body).data('type');	
			if (self.selectedText && fieldMapping.body) {			
				var text = self.selectedText;
				
				//Handle auto header add setting
				if (self.settings.addMailHeaderAutomatically === 'top') {
					text = renderMailHeaderText(self.mail, true) + '\n' + text;
				}
				else if (self.settings.addMailHeaderAutomatically === 'bottom') {
					text = text + '\n' + renderMailHeaderText(self.mail, true);
				}
				
				text = self.handleAttachments(text, self.mail.attachments);
				jira.UIFormHandler.setValue(fieldMapping.body, { schema: { custom: bodyType } }, text);				
			}
			
			if (jira.mailAsMarkup) {
				jira.UIFormHandler.setValue(fieldMapping.body, { schema: { custom: bodyType } }, jira.mailAsMarkup);	
			}
			else if (!self.markupRenderProcess && $('#' + fieldMapping.body).length > 0) {
				//Rendering may take some time, so we add a loader.
				var descriptionPos = $('#' + fieldMapping.body).offset();
				var scrollPos = $('#' + fieldMapping.body).scrollTop();
				//56 px = height of header
				$('#markupLoader').css('top', (descriptionPos.top + scrollPos - 66) + 'px').show();
				self.markupRenderProcess = yasoon.outlook.mail.renderBody(self.mail, 'jiraMarkup')
				.then(function (markup) {
					//If there is no selection, set this as description;
					if (!self.selectedText && fieldMapping.body) {
						//Handle auto header add setting
						if (self.settings.addMailHeaderAutomatically === 'top') {
							markup = renderMailHeaderText(self.mail, true) + '\n' + markup;
						}
						else if (self.settings.addMailHeaderAutomatically === 'bottom') {
							markup = markup + '\n' + renderMailHeaderText(self.mail, true);
						}

						markup = self.handleAttachments(markup, self.mail.attachments);
						jira.mailAsMarkup = markup;
						jira.UIFormHandler.setValue(fieldMapping.body, { schema: { custom: bodyType } }, markup);
					}
				})
				.catch(function () {
					jira.mailAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
					if (!self.selectedText && fieldMapping.body) {
						jira.UIFormHandler.setValue(fieldMapping.body, { schema: { custom: bodyType } }, jira.mailAsMarkup);
					}
				})
				.finally(function () {
					$('#markupLoader').hide();
				});
			}
		}

		//Set all Values in edit case
		if (self.currentIssue) {
			self.UIFormHandler.setFormData(self.currentIssue);
		}
	};

	this.getProjectValues = function () {
		return new Promise(function (resolve, reject) {
			//Check in Cache
			if (jira.cacheProjects && jira.cacheProjects.length > 0) {
				var project = jira.cacheProjects.filter(function (p) { return p.key === jira.selectedProject.key; })[0];
				if (project) {
					jira.selectedProject = project;
					return resolve();
				}
			}

			//Get Values of a single project
			yasoon.oauth({
				url: self.settings.baseUrl + '/rest/api/2/project/' + jira.selectedProject.key,
				oauthServiceName: jira.settings.currentService,
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: function () {
					reject.apply(this, arguments);
				},
				success: function (data) {
					jira.selectedProject = JSON.parse(data);

					//Sort Issue Types
					jira.selectedProject.issueTypes.sort(function (a, b) {
						if (a.id > b.id)
							return 1;
						else
							return -1;
					});
					resolve();
				}
			});
		});
	};

	this.getMetaData = function () {
		return new Promise(function (resolve, reject) {
			//Check in Cache
			if (jira.cacheCreateMetas && jira.cacheCreateMetas.length > 0) {
				var projectMeta = jira.cacheCreateMetas.filter(function (m) { return m.key === jira.selectedProject.key; })[0];
				if (projectMeta) {
					jira.projectMeta = projectMeta;
					return resolve();
				}
			}

			//Meta Data for custom fields
			yasoon.oauth({
				url: self.settings.baseUrl + '/rest/api/2/issue/createmeta?projectIds=' + jira.selectedProject.id + '&expand=projects.issuetypes.fields',
				oauthServiceName: jira.settings.currentService,
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: function () {
					reject.apply(this, arguments);
				},
				success: function (data) {
					var meta = JSON.parse(data);
					//Find selected project (should be selected by API Call, but I'm not sure if it works due to missing test data )
					self.projectMeta = $.grep(meta.projects, function (p) { return p.id === jira.selectedProject.id; })[0];
					resolve();
				}
			});

		});
	};

	this.getRequestTypes = function getRequestTypes(project) {
		if (!project || project.projectTypeKey != 'service_desk') {
			return;
		}

		//Only call for service desk projects
		return jiraGet('/rest/servicedesk/1/servicedesk/' + project.key.toLowerCase() + '/request-types')
		.then(function (data) {
			var requestTypes = JSON.parse(data);

			//Get all Groups to make rendering easier
			var groups = [];
			requestTypes.forEach(function (rt) {
				//a request type can be assigned to multiple groups:
				if (!rt.groups) {
					return;
				}

				rt.groups.forEach(function (group) {
					if (groups.filter(function (g) { return g.id == group.id; }).length === 0) {
						groups.push(group);
					}
				});

				//Download Icon
				rt.iconUrl = jira.icons.mapIconUrl(self.settings.baseUrl + '/servicedesk/customershim/secure/viewavatar?avatarType=SD_REQTYPE&avatarId=' + rt.icon);
			});

			//Sort groups by name
			groups.sort(function (a, b) { return a.name > b.name; });

			requestTypes.groups = groups;

			return requestTypes;
		});
	};

	this.getUserPreferences = function () {
		if (!jira.currentMeta)
			return Promise.reject();

		if (!jira.settings.newCreationScreen)
			return Promise.reject();

		//Check Cache
		if (jira.cacheUserMeta && jira.cacheUserMeta[jira.selectedProject.id] && jira.cacheUserMeta[jira.selectedProject.id][jira.currentMeta.id]) {
			return Promise.resolve(jira.cacheUserMeta[jira.selectedProject.id][jira.currentMeta.id]);
		}

		if (self.editIssueId) {
			return jiraGet('/secure/QuickEditIssue!default.jspa?issueId=' + jira.editIssueId + '&decorator=none').then(function (data) { return JSON.parse(data); }).catch(function () { });
		} else {
			return jiraGet('/secure/QuickCreateIssue!default.jspa?decorator=none&pid=' + jira.selectedProject.id + '&issuetype=' + jira.currentMeta.id).then(function (data) { return JSON.parse(data); }).catch(function () { });
		}
	};

	this.getDefaultReporter = function (fieldId) {
		//Only if there is a fieldMaping for sender and it's an creation case.
		var senderValue = '';
		var senderIcon = '';
		var senderType = '';
		if (fieldId && !jira.editIssue) {
			senderType = $('#' + fieldId).data('type');
			if (jira.mail) {
				//If senderField Mapping is set to an UserField and sender is an known user 
				if (senderType === 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker') {
					if (jira.senderUser && jira.senderUser.name !== -1) {
						senderValue = jira.senderUser;
						senderIcon = 'emailSender';
					}
					else {
						senderIcon = 'ownUser';
						senderValue = jira.ownUser;
					}

				} else {
					senderValue = jira.mail.senderEmail;
				}
			} else {
				//Default to own user
				if (senderType === 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker') {
					senderIcon = 'ownUser';
					senderValue = jira.ownUser;
				} else {
					senderValue = jira.ownUser.emailAddress;
				}
			}
		}
		return {
			sender: senderValue,
			icon: senderIcon,
			type: senderType
		};
	};

	this.setDefaultReporter = function (fieldId) {
		var reporterData = self.getDefaultReporter(fieldId);
		if (reporterData.sender) {
			jira.UIFormHandler.setValue(fieldId, { schema: { custom: reporterData.type } }, reporterData.sender);
		}
	};
	
	this.handleAttachments = function (markup, attachments) {
		//Check each attachment if it needs to be embedded
		var clipboardContent = yasoon.clipboard.all();
		attachments.forEach(function(attachment) {			
			if (markup.indexOf('!' + attachment.contentId + '!') > -1) {				
				//Replace the reference in the markup								
				var handle = attachment.getFileHandle();								
				var regEx = new RegExp('!' + attachment.contentId + '!', 'g');
				markup = markup.replace(regEx, '!' + handle.getFileName() + '!');		
				handle.setInUse();
				
				//May have been added earlier
				if (self.selectedAttachments.indexOf(handle) === -1) {
					self.selectedAttachments.push(handle);
					
					//Remove it from the clipboard as well
					var id = null;
					
					for (var key in clipboardContent) {
						if (handle.contentId && clipboardContent[key].contentId === handle.contentId) {
							id = key;
							break;
						}
					}
					
					if (id) {
						var index = self.addedAttachmentIds.indexOf(id);
						if (index > -1) {
							self.addedAttachmentIds.splice(index, 1);
						}
						yasoon.clipboard.remove(id);
					}
				}
			}
		});
		
		jira.UIFormHandler.getRenderer('attachment').renderAttachments('attachment');		
		return markup;
	};
	
}); //jshint ignore:line

function submitErrorHandler(data, statusCode, result, errorText, cbkParam) {
	$('#JiraSpinner').hide();
	var error = '';
	
	if (data !== null && data instanceof jiraSyncError) {
		result = data.result;
		statusCode = data.statusCode;
		errorText = data.errorText;
		cbkParam = data.cbkParam;
		error = data.getUserFriendlyError();
		data = data.data;
	} else {
		result = JSON.parse(result);

		//Parse different error messages summary --> errorMessages --> errors --> plain JSON
		
		if (result.errors && result.errors.summary) {
			error = result.errors.summary;
		} else if (result.errorMessages && result.errorMessages.length > 0) {
			result.errorMessages.forEach(function (msg) {
				if (error)
					error += '\n';
				error += msg;
			});
		} else if (result.errors) {
			for (var key in result.errors) {
				var msg = result.errors[key];
				if (error)
					error += '\n';
				error += msg;
			}
		} else {
			error = JSON.stringify(result);
		}
	}

	if (jira.issueCreated) {
		yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorAfterSubmitIssue', { error: error }));	
	} else {
		$('#create-issue-submit').removeAttr("disabled");
		yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSubmitIssue', { error: error }));	
	}	
	
	yasoon.util.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data + ' || ' + error, yasoon.util.severity.warning);

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

	//Service Desk Data
	
	if (jira.selectedProject.projectTypeKey == 'service_desk') {
		this.serviceDesk = {
			enabled: jira.selectedProject.projectTypeKey == 'service_desk' && $('#switchServiceMode').hasClass('active')
		};
		if (this.serviceDesk.enabled) {
			this.serviceDesk.requestType = $('#requestType').val();
		}
		
	}
}

function resizeWindow () {
	var bodyHeight = $('body').height();
	if (bodyHeight > 460) {
		$('body').css('overflow-y', 'hidden');
		$(".form-body").height(bodyHeight - 170);
	} else {
		$('body').css('overflow-y', 'scroll');
		$(".form-body").height(290);
	}
}
//@ sourceURL=http://Jira/Dialog/jiraDialog.js