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
	this.mailConversationData = null;
	this.selectedIssue = null;
	this.addedAttachmentIds = [];
	this.selectedAttachments = [];
	this.projects = [];

	this.issueSelect2 = null;
	this.mailAsMarkup = '';
	this.recentIssues = [];
	this.recentProjects = [];
	this.projectIssues = [];
	this.cacheProjects = [];
	this.fieldTypes = {};

	this.init = function (initParams) {
		//Parameter taken over from Main JIRA
		self.mail = initParams.mail;
		self.selectedIssue = initParams.issue;
		self.settings = initParams.settings;
		self.selectedText = initParams.text;
		self.cacheProjects = initParams.projects;

		//Register Close Handler
		yasoon.dialog.onClose(self.cleanup);
		
		// Resize Window if nessecary (sized are optimized for default Window - user may have changed that)
		resizeWindow();
		
		//Init Select2
		initCustomIssueData();
		
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
		if (this.selectedIssue) {
			//Project and Issue should be prepopulated
			//Select issue project manually and immedeately for better layout.
			//var all = $('#project').find('.all');
			//var proj = self.editIssue.fields.project;
			//self.projects.push(proj);
			//self.selectedProject = proj;

			//all.append('<option style="background-image: url(images/projectavatar.png)" value="' + proj.id + '" data-key="' + proj.key + '">' + proj.name + '</option>');
			//$('#project').select2();
			//$('#project').val(proj.id).trigger('change');
			//$('#project').prop("disabled", true);

			////Start Loader
			$('#LoaderArea').show();

			
		} 
		else {
			//Nothing selected
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
					
				var group = $('#project').find('.all');
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
					placeholder: yasoon.i18n('dialog.placeholderFilterProject'),
					templateResult: formatIcon,
					templateSelection: formatIcon,
				});

				$('#ProjectSpinner').css('display', 'none');
				$('#project').change(self.selectProject);
				$('#project').next().find('.select2-selection').first().focus();
				
				//If mail is provided && subject contains reference to project, pre-select that
				if (self.mail) {					
					var convData = yasoon.outlook.mail.getConversationData(self.mail);					
					if (convData) {
						self.mailConversationData = JSON.parse(convData);
						
						//Try to find project that matches
						for (var id in self.mailConversationData.issues) {
							id = parseInt(id);
							if (self.projects.filter(function (el) { return el.id === self.mailConversationData.issues[id].projectId; }).length > 0) //jshint ignore:line
							{
								$('#project').val(self.mailConversationData.issues[id].projectId).trigger('change');
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
			})
			.catch(jira.handleError);
		}

		//Submit Button - (Create & Edit)
		$('#add-issue-submit').unbind().click(self.submitForm);
		$('#add-issue-cancel').unbind().click(function () {
			self.close({ action: 'cancel' });
		});
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
		var selectedIssueId = $('#issue').val() || $('#issue').data('id');

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
		var text = $('#issue').data('text');
		if (!text) {
			//If standard select2 is used (after project has been selected)
			text = $('#issue').find('[value=' + selectedIssueId + ']').text();
		}

		var issueKey = $('#issue').data('key');
		var issueSummary = $('#issue').data('summary');
		var projectKey = $('#issue').data('projectKey');
		var projectId = $('#issue').data('projectId');
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
					throw e;
				})
				.then(function() {
					//Save issueId in conversation data
					if (jira.mail) {
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
		var selectedProject = $('#project').find(':selected').data('key');
		var selectedProjectId = $('#project').val();
		
		$('#IssueSpinner').css('display', 'inline');
		//Filter Issues based on selected Project
		jiraGet('/rest/api/2/search?jql=project%20%3D%20%22'+ selectedProject +'%22%20AND%20status%20!%3D%20%22resolved%22&maxResults=200&fields=summary')
		.then(function (data) {
			data = JSON.parse(data);
			self.projectIssues = [];
			
			if (data.issues.length > 0) {
				data.issues.forEach(function (issue) {
					self.projectIssues.push({
						id: issue.id,
						key: issue.key,
						text: issue.fields.summary + ' (' + issue.key + ')',
						summary: issue.fields.summary,
						project: { id: selectedProjectId, key: selectedProject }
					});
				});
			}

			//Rebuild select2
			self.createIssueLoader();
			
			//If mail is provided && subject contains reference to issue, pre-select that
			if (self.mail) {
				
				var issueKey = null;
				if (self.mailConversationData) {
					//Try to find issue key that is in selected project
					for (var id in self.mailConversationData.issues) {
						id = parseInt(id);
						if (self.mailConversationData.issues[id].projectId === selectedProjectId) {
							issueKey = self.mailConversationData.issues[id].key;
							break;
						}
					}
				}
				else if (self.mail.subject) {
					//Try to extract issue key from subject
					var regEx = new RegExp(selectedProject + '.[0-9]+', 'g');
					var match = regEx.exec(self.mail.subject);
				
					if (match && match.length > 0) {
						issueKey = match[0];
					}					
				}
				
				if (issueKey) {			
					var issue = data.issues.filter(function(i) { return i.key === issueKey; })[0];					
					if (issue) {
						console.log(issue);
						issue.fields.project = {
							id: selectedProjectId,
							key: selectedProject
						};

						//Rebuild select2
						self.createIssueLoader(issue);
					}
					else {
						//Not in the list of the last 200 loaded, look up
						return jiraGet('/rest/api/2/issue/' + issueKey)
						.then(function(data) {
							issue = JSON.parse(data);

							//Add the issue to the dropdown
							self.projectIssues.push({
								id: issue.id,
								key: issue.key,
								text: issue.fields.summary + ' (' + issue.key + ')',
								summary: issue.fields.summary,
								project: { id: selectedProjectId, key: selectedProject }
							});
							
							//Rebuild select2
							self.createIssueLoader(issue);
						})
						.catch(function() {
							//Issue not found? Ignore..
						});
					}
				}
			}
		})
		.finally(function() {
			$('#IssueSpinner').css('display', 'none');
		});
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
		//First Clear DOM
		$('#issue').empty();
		$('#issue').select2("destroy");
		//Second Clear Data
		$('#issue').removeData();

		//Create Initial Selection
		if (issue) {
			$('#issue').append('<option value="' + issue.id + '" selected="selected">' + issue.fields.summary + ' (' + issue.key + ')' + '</option>');
			$('#issue').data('id', issue.id)
				.data('text', issue.fields.summary + ' (' + issue.key + ')')
				.data('key', issue.key)
			    .data('summary', issue.fields.summary)
				.data('projectId', issue.fields.project.id)
				.data('projectKey', issue.fields.project.key);
		}
		
		self.issueSelect2 = $('#issue').select2({
			placeholder: yasoon.i18n('dialog.placeholderSelectIssue'),
			dataAdapter: jira.CustomIssueData,
			data: [{
				id: 'Recent',
				text: yasoon.i18n('dialog.recentIssues'),
				children: jira.recentIssues
			}, {
				id: 'ProjectIssues',
				text: yasoon.i18n('dialog.projectIssues'),
				children: jira.projectIssues
			}]
		});
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

	function initCustomIssueData() {
		jira.CustomIssueData.prototype.current = function (callback) {
			var data = [];
			var self = this;

			this.$element.find(':selected').each(function () {
				var $option = $(this);

				var option = self.item($option);

				data.push(option);
			});

			if (data.length === 0) {
				if (this.$element.data('id')) {
					data.push({
						id: this.$element.data('id'),
						text: this.$element.data('text')
					});
				}
			}
			callback(data);
		};

		jira.CustomIssueData.prototype.select = function (data) {
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
					.data('key', data.key)
					.data('summary', data.summary)
					.data('projectId', data.project.id)
					.data('projectKey', data.project.key);


				this.$element.val(val);
				this.$element.trigger('change');
			}
		};

		var searchIssue = debounce(function (term, callback) {
			console.log('Debounce called');
			jiraGet('/rest/api/2/search?jql=Summary%20~%20%22' + encodeURIComponent(term) + '%22%20OR%20key%20%3D%20%22' + encodeURIComponent(term) + '%22&maxResults=20&fields=summary,project&validateQuery=false')
			.then(function (data) {
				if (term === lastQuery) {
					var jqlResult = JSON.parse(data);
					var result = [];
					//Transform Data
					jqlResult.issues.forEach(function (issue) {
						result.push({ id: issue.id, text: issue.fields.summary + ' (' + issue.key + ')', key: issue.key, summary: issue.fields.summary, project: issue.fields.project });
					});

					callback({
						results: [{
							id: 'Results',
							text: yasoon.i18n('dialog.titleSearchResults', { term: term }),
							children: result
						}]
					});
				}
			});
		}, 250);
		var lastQuery = '';
		jira.CustomIssueData.prototype.query = function (params, callback) {
			if (params && params.term) {
				//Get Issues matching the criteria
				lastQuery = params.term;
				searchIssue(params.term, callback);
			} else {
				//Add Recent Items
				callback({
					results: [{
						id: 'Recent',
						text: yasoon.i18n('dialog.recentIssues'),
						children: jira.recentIssues
					}, {
						id: 'ProjectIssues',
						text: yasoon.i18n('dialog.projectIssues'),
						children: jira.projectIssues
					}]
				});
			}
		};

		jira.issueSelect2 = $('#issue').select2({
			placeholder: yasoon.i18n('dialog.placeholderSearchIssue'),
			dataAdapter: jira.CustomIssueData,
			data: [{
				id: 'Recent',
				text: yasoon.i18n('dialog.recentIssues'),
				children: jira.recentIssues
			}, {
				id: 'ProjectIssues',
				text: yasoon.i18n('dialog.projectIssues'),
				children: jira.projectIssues
			}]
		});
	}
}); //jshint ignore:line


$.fn.select2.amd.require(['select2/data/select', 'select2/utils'],
function (select, Utils) {
	function CustomIssueData($element, options) {
		CustomIssueData.__super__.constructor.call(this, $element, options);
	}

	Utils.Extend(CustomIssueData, select);
	jira.CustomIssueData = CustomIssueData;
});

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