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
	this.settings = null;

	this.mail = null;
	this.issue = null;
	this.mailConversationData = null;
	this.addedAttachmentIds = [];
	this.selectedAttachments = [];
	this.projects = [];
	this.selectedProjectId = null;
	this.selectedProjectKey = null;

	this.mailAsMarkup = '';
	this.recentIssues = [];
	this.recentProjects = [];
	this.projectIssues = [];
	this.cacheProjects = [];
	this.fieldTypes = {};
	

	this.init = function (initParams) {
		//Parameter taken over from Main JIRA
		self.mail = initParams.mail;
		self.isEditMode = false;
		self.isAddCommentMode = true;
		self.settings = initParams.settings;
		self.selectedText = initParams.text;
		self.cacheProjects = initParams.projects;
		self.issue = initParams.issue;

		//Register Close Handler
		yasoon.dialog.onClose(self.cleanup);
		
		// Resize Window if nessecary (sized are optimized for default Window - user may have changed that)
		resizeWindow();
		
		//Init Select2
		//initCustomIssueData();
		
		//Save FieldType for later reuse.
		self.fieldTypes = {
			comment: { name: yasoon.i18n('dialog.comment'), schema: { system: 'description' } },
			attachment: { name: yasoon.i18n('dialog.attachment'), schema: { system: 'attachment' } }
		};

		//Render fields
		self.UIFormHandler.render('comment', self.fieldTypes.comment, $('#ContentArea'));
		self.UIFormHandler.render('attachment', self.fieldTypes.attachment, $('#ContentArea'));
		
		//Add attachments to clipboard if requested
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
		
		//Add current mail to clipboard
		if (self.mail) {
			var handle = self.mail.getFileHandle();
			if (self.settings.addEmailOnNewAddIssue) {
				self.selectedAttachments.push(handle);
			} else {
				var id = yasoon.clipboard.addFile(handle);
				self.addedAttachmentIds.push(id);
			}
		}

		//Load Recent Issues from DB
		var projectsString = yasoon.setting.getAppParameter('recentProjects');
		if (projectsString) {
			self.recentProjects = JSON.parse(projectsString);
		}
		
		//Load Recent Issues from DB
		var issuesString = yasoon.setting.getAppParameter('recentIssues');
		if (issuesString) {
			self.recentIssues = JSON.parse(issuesString);
		}
		
		//Add Default Data
		if (self.selectedText) {
			var text = self.selectedText;
			
			//Handle auto header add setting
			if (self.settings.addMailHeaderAutomatically === 'top') {
				text = renderMailHeaderText(self.mail, true) + '\n' + text;
			}
			else if (self.settings.addMailHeaderAutomatically === 'bottom') {
				text = text + '\n' + renderMailHeaderText(self.mail, true);
			}
			
			text = self.handleAttachments(text, self.mail.attachments);
			$('#comment').val(text);
		}

		//Render current mail (just in case we need it as it probably needs some time)
		if (self.mail) {			
			//Only show loader if no text is rendered yet 
			if (!self.selectedText)
				$('#markupLoader').show();
								
			yasoon.outlook.mail.renderBody(self.mail, 'jiraMarkup')
			.then(function (markup) {
				jira.mailAsMarkup = markup;
				//If there is no selection, set this as description;
				if (!self.selectedText) {
					//Handle auto header add setting
					if (self.settings.addMailHeaderAutomatically === 'top') {
						markup = renderMailHeaderText(self.mail, true) + '\n' + markup;
					}
					else if (self.settings.addMailHeaderAutomatically === 'bottom') {
						markup = markup + '\n' + renderMailHeaderText(self.mail, true);
					}
					
					markup = self.handleAttachments(markup, self.mail.attachments);
					$('#comment').val(markup);
				}
			})
			.catch(function () {
				jira.mailAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
				if (!self.selectedText) {
					jira.UIFormHandler.setValue('description', { schema: { custom: 'description' } }, jira.mailAsMarkup);
				}
			})
			.finally(function() {
				$('#markupLoader').hide();
			});
		}		

		self.loadingFinished();

		//Init Projects
		$('#project').select2({
			placeholder: yasoon.i18n('dialog.placeholderFilterProject')
		});
		$('#ProjectSpinner').css('display', 'inline');

		//Please don't change, weird resize bug whatever
		// => We need the thenable to be executed async
		var projectGet = Promise.delay(jira.cacheProjects, 1);
			
		if (!jira.cacheProjects || jira.cacheProjects.length === 0) 
			projectGet = Promise.resolve(jiraGet('/rest/api/2/project'));
				
		projectGet
		.then(function (data) {
			//Populate Project Dropdown
			if (typeof(data) === 'string')
				self.projects = JSON.parse(data);
			else
				self.projects = data;
					
			self.createProjectLoader(self.projects);

			//Issue is provided by Task Object
			if (self.issue) {
				$('#project').val(self.issue.fields.project.id).trigger('change');
				return;
			}
			//If mail is provided && subject contains reference to project, pre-select that
			else if (self.mail) {					
				var convData = self.getConversationData(self.mail);
				if(convData) {
					//Try to find project that matches
					//We could just lookup the first issue and directly select the projectId.
					//However, we want to support longterm enhancements where conversationData could be shared with others and then the project might not exist for this user.
					for (var id in convData.issues) {
						id = parseInt(id);
						if (self.projects.filter(function (el) { return el.id === convData.issues[id].projectId; }).length > 0) //jshint ignore:line
						{
							$('#project').val(convData.issues[id].projectId).trigger('change');
							return; //Quit loop & promise chain -> subject handling will not be done if we find something here
						}
					}
				}
					
				if (self.mail.subject) {
					//Sort projects by key length descending, so we will match the following correctly:
					// Subject: This is for DEMODD project
					// Keys: DEMO, DEMOD, DEMODD
					var projectsByKeyLength = self.projects.sort(function(a, b) {
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
			}
		}).catch(jira.handleError);

		//Submit Button - (Create & Edit)
		$('#add-issue-submit').off().click(self.submitForm);
		$('#add-issue-cancel').off().click(function () {
			self.close({ action: 'cancel' });
		});

		self.createIssueLoader();
	}; 

	this.close = function (params) {
		yasoon.dialog.close(params);
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
		//technical stuff:
		//If Issue has been preselected, the data attributes may be found on $('issue') instead of the option itself.
		var selectedIssueId = self.getSelectedIssueId();
		var selectedOption = self.getSelectedIssueOption();

		if (!selectedIssueId) {
			yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSelectIssue'));
			return;
		}
		var comment = jira.UIFormHandler.getValue('comment', self.fieldTypes.comment);
		console.log('Kommentar:', comment);

		if (!comment && !jira.selectedAttachments.length) {
			yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorNoData'));
			return;
		}

		//Prepare UI
		$('#MainAlert').hide();
		$('#add-issue-submit').attr('disabled', 'disabled');
		$('#JiraSpinner').show();

		//Add Recent issue
		var text = selectedOption.data('text');
		var issueKey = selectedOption.data('key');
		var issueSummary = selectedOption.data('summary');
		var projectKey = selectedOption.data('projectKey');
		var projectId = selectedOption.data('projectId');
		projectId = projectId.toString();

		self.addRecentIssue({ id: selectedIssueId, text: text, key: issueKey, project: { id: projectId, key: projectKey }, summary: issueSummary });

		var promises = [];

		if (comment) {
			//Upload comment
			promises.push(
				jiraAjax('/rest/api/2/issue/' + selectedIssueId + '/comment', yasoon.ajaxMethod.Post, JSON.stringify({ body: comment }))
				.catch(jiraSyncError, function (e) {
					$('#MainAlert .errorText').text(yasoon.i18n('dialog.errorSubmitComment', { error: e.getUserFriendlyError() }));
					$('#MainAlert').show();
					yasoon.util.log('Error on sending a comment: ' + e.getUserFriendlyError(), yasoon.util.severity.info);
					throw e;
				})
				.then(function() {
					//Save issueId in conversation data
					if (jira.mail) {
						try {
							//Set Conversation Data
							var conversationString = yasoon.outlook.mail.getConversationData(jira.mail);
							var conversation = {
								issues: {}
							};
	
							if (conversationString)
								conversation = JSON.parse(conversationString);

							conversation.issues[selectedIssueId] = { id: selectedIssueId, key: issueKey, summary: issueSummary, projectId: projectId };
							yasoon.outlook.mail.setConversationData(jira.mail, JSON.stringify(conversation));
						
							//Set new message class to switch icon
							if(!jira.mail.isSignedOrEncrypted || jira.settings.overwriteEncrypted)
								jira.mail.setMessageClass('IPM.Note.Jira');

						} catch (e) {
							yasoon.util.log('Failed to set Conversation data', yasoon.util.severity.info, getStackTrace(e));
						}
					}
				})
			);
		}

		if (jira.selectedAttachments.length > 0) {
			//Upload files
			var formData = [];
			$.each(jira.selectedAttachments, function (i, file) {
				formData.push({
					type: yasoon.formData.File,
					name: 'file',
					value: file
				});
			});

			promises.push(
				jiraAjax('/rest/api/2/issue/' + selectedIssueId + '/attachments', yasoon.ajaxMethod.Post, null, formData)
				.catch(jiraSyncError, function (e) {
					yasoon.util.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data + ' || ' + e.getUserFriendlyError() + ' || ' + JSON.stringify(formData), yasoon.util.severity.warning);
					$('#MainAlert .errorText').text(yasoon.i18n('dialog.errorAttachment', { error: e.getUserFriendlyError() }));
					$('#MainAlert').show();
					throw e;
				})
			);
		}

		Promise.all(promises)
		.then(function () {
			self.close({ action: "success" });
		})
		.catch(function (e) {
			console.log('Exception occured', e);
			if (e.name === 'SyncError') {
				yasoon.util.log(e.message + ' || ' + e.statusCode + ' || ' + e.errorText + ' || ' + e.result + ' || ' + e.data , yasoon.util.severity.warning);
			}
		}).finally(function () {
			$('#add-issue-submit').removeAttr("disabled");
			$('#JiraSpinner').hide();
		});
		
		e.preventDefault();
	};

	this.handleError = function (data, statusCode, result, errorText, cbkParam) {
		$('#MainAlert .errorText').text(yasoon.i18n('dialog.connectionError'));
		$('#MainAlert').show();
		$('#LoaderArea').hide();
		yasoon.util.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data, yasoon.util.severity.warning);
	};

	this.selectProject = function () {
		jira.selectedProjectKey = $('#project').find(':selected').data('key');
		jira.selectedProjectId = $('#project').val();
		jira.projectIssues = [];

		//Self.issue is provided by task object
		var issueKey = null;
		if (self.issue) {
			issueKey = self.issue.key;

		//If mail is provided && subject contains reference to issue, pre-select that
		} else if (self.mail) {
			var convData = self.getConversationData(self.mail);
			
			if (convData) {
				//Try to find issue key that is in selected project
				for (var id in convData.issues) {
					id = parseInt(id);
					if (convData.issues[id].projectId === jira.selectedProjectId) {
						issueKey = convData.issues[id].key;
						break;
					}
				}
			}
			else if (self.mail.subject) {
				//Try to extract issue key from subject
				var regEx = new RegExp(jira.selectedProjectKey + '.[0-9]+', 'g');
				var match = regEx.exec(self.mail.subject);

				if (match && match.length > 0) {
					issueKey = match[0];
				}
			}			
		}

		if (issueKey) {
			$('#IssueSpinner').css('display', 'inline');
			return jiraGet('/rest/api/2/issue/' + issueKey)
			.then(function (data) {
				var issue = JSON.parse(data);

				//Add the issue to the dropdown
				self.projectIssues.push({
					id: issue.id,
					key: issue.key,
					text: issue.fields.summary + ' (' + issue.key + ')',
					summary: issue.fields.summary,
					project: { id: issue.fields.project.id, key: issue.fields.project.key }
				});

				//Rebuild select2
				self.createIssueLoader(issue);
			})
			.catch(function () {
				yasoon.util.log('Couldn\'t find issue: ' + issueKey, yasoon.util.severity.warning);
				//Issue not found? Ignore..
			})
			.finally(function () {
				$('#IssueSpinner').css('display', 'none');
			});
		}
	};

	this.addRecentIssue = function (selectedIssue) {
		var exists = $.grep(self.recentIssues, function (issue) { return issue.id === selectedIssue.id; });
		if (exists.length === 0) {
			//It does not exist, so we'll add it! But make sure there is a maximum of 10 recent Items.
			if (self.recentIssues.length >= 10) {
				self.recentIssues = self.recentIssues.slice(1);
			}
			self.recentIssues.unshift(selectedIssue); //Add at beginning
			yasoon.setting.setAppParameter('recentIssues', JSON.stringify(self.recentIssues));
		}
	};

	this.createIssueLoader = function createIssueLoader(issue) {
		var issueRenderer = new IssuePickerRenderer();

		issueRenderer.render('issue', { required: true }, $('#IssueArea'));

		//Create Initial Selection
		if (issue) {
			console.log('Init Selection' , issue);
			issueRenderer.setValue('issue', issue);
		}		
	};
	
	this.createProjectLoader = function createProjectLoader(projects) {
		if ($('#project').data('select2')) {
			//Refresh
			$('#project').select2("destroy").removeData();
		}

		//Create new DOM
		var group = $('#project').find('.all').empty();
		$.each(projects, function (i, project) {
			group.append('<option value="' + project.id + '" data-icon="' + getProjectIcon(project) + '" data-key="' + project.key + '">' + project.name + '</option>');
		});
				
		group = $('#project').find('.recent').empty();
		$.each(self.recentProjects, function (i, proj) {
			var project = projects.filter(function (p) { return p.key === proj.key; })[0];
			if (project) {
				group.append('<option value="' + project.id + '" data-icon="' + getProjectIcon(project) + '" data-key="' + project.key + '">' + project.name + '</option>');
			}
		});


		$('#project').select2({
			placeholder: yasoon.i18n('dialog.placeholderFilterProject'),
			templateResult: formatIcon,
			templateSelection: formatIcon,
			allowClear: true
		});

		$('#ProjectSpinner').css('display', 'none');
		$('#project').change(self.selectProject);
		$('#project').next().find('.select2-selection').first().focus();
	};
	
	this.getConversationData = function getConversationData(mail) {
		if(!self.mailConversationData) {
			var convData = yasoon.outlook.mail.getConversationData(self.mail);					
			if (convData) {
				self.mailConversationData = JSON.parse(convData);
			}
		}

		return self.mailConversationData;
	};

	this.getSelectedIssueId = function getSelectedIssueId() {
		return self.getSelectedIssueOption().data('id');
	};

	this.getSelectedIssueOption = function getSelectedIssueOption() {
		var selectedOption = $('#issue').find(':selected');
		var id = selectedOption.data('id');
		if (!id) {
			selectedOption = $('#issue');
		}
		return selectedOption;
	};

	this.handleAttachments = function (markup, attachments) {
		//Check each attachment if it needs to be embedded
		var clipboardContent = yasoon.clipboard.all();
		attachments.forEach(function(attachment) {			
			if (markup.indexOf('!' + attachment.contentId + '!') > -1) {								
				var handle = attachment.getFileHandle();
				var uniqueKey = getUniqueKey();
				var oldFileName = handle.getFileName();
				var newFileName = oldFileName.substring(0, oldFileName.lastIndexOf('.'));
				newFileName = newFileName + '_' + uniqueKey + oldFileName.substring(oldFileName.lastIndexOf('.'));
				handle.setFileName(newFileName);
				handle.setInUse();
				
				//Replace the reference in the markup
				var regEx = new RegExp('!' + attachment.contentId + '!', 'g');
				markup = markup.replace(regEx, '!' + newFileName + '!');		
				
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

	this.loadingFinished = function () {
		$('#create-issue-dialog-loader').css('display', 'none');
		$('#create-issue-dialog').css('display', 'block');
	};
}); //jshint ignore:line

function resizeWindow() {
	var bodyHeight = $('body').height();
	if (bodyHeight > 535) {
		$('body').css('overflow-y', 'hidden');
		$('.form-body').height(bodyHeight - 185);
		//185 => Difference between Body und form-body
		//270 => Space for project, issue and attachment field (in maximum)
		//155 => Min height of comment field

		//If the rest has 270 pixel, only increase the comment field
		if ((bodyHeight - 185 - 270 - 155) > 0) 
			$('#comment').height((bodyHeight - 185 - 270));

	} else {
		$('body').css('overflow-y', 'scroll');
		$('.form-body').height(350);
		$('#comment').height(155);
	}
}

//@ sourceURL=http://Jira/Dialog/jiraAddCommentDialog.js