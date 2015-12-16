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
	this.selectedIssue = null;
	this.addedAttachmentIds = [];
	this.selectedAttachments = [];
	this.projects = [];

	this.mailAsMarkup = '';
	this.recentIssues = [];
	this.recentProjects = [];
	this.projectIssues = [];
	this.cacheProjects = [];

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
		
		//Render fields
		self.UIFormHandler.render('description', { name: 'Comment', schema: { system: 'description' }}, $('#ContentArea'));
		self.UIFormHandler.render('attachment', { name: 'Attachment', schema: { system: 'attachment' }}, $('#ContentArea'));
		
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
			$('#description').val(text);
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
					$('#description').val(markup);
				}
			})
			.finally(function() {
				$('#markupLoader').hide();
			});
		}		

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
				placeholder: "Filter by Project"
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
					placeholder: "Filter by Project",
					templateResult: formatIcon,
					templateSelection: formatIcon,
				});

				$('#ProjectSpinner').css('display', 'none');
				$('#project').change(self.selectProject);
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
		var selectedIssue = $('#issue').val() || $('#issue').data('id');

		if (!selectedIssue) {
			alert('Please select the issue you want to comment!');
			return;
		}

		if (!$('#description').val() && !jira.selectedAttachments.length) {
			alert('Please add either an comment or select an attachment');
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
			text = $('#issue').find('[value=' + selectedIssue + ']').text();
		}
		self.addRecentIssue({ id: selectedIssue, text: text });

		var promises = [];
		if ($('#description').val()) {
			//Upload comments
			promises.push(
				jiraAjax('/rest/api/2/issue/' + selectedIssue + '/comment', yasoon.ajaxMethod.Post, JSON.stringify({ body: $('#description').val() }))
				.catch(jiraSyncError, function (e) {
					$('#MainAlert .errorText').text('Connection Error: Commenting did not work: ' + e.getUserFriendlyError());
					$('#MainAlert').show();
					throw e;
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
				jiraAjax('/rest/api/2/issue/' + selectedIssue + '/attachments', yasoon.ajaxMethod.Post, null, formData)
				.catch(jiraSyncError, function (e) {
					console.log(e.getUserFriendlyError());
					$('#MainAlert .errorText').text('Connection Error: Uploading the attachments failed: ' + e.getUserFriendlyError());
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
			console.log(e);
		}).finally(function () {
			$('#add-issue-submit').removeAttr("disabled");
			$('#JiraSpinner').hide();
		});
		
		e.preventDefault();
	};

	this.handleError = function (data, statusCode, result, errorText, cbkParam) {
		$('#MainAlert .errorText').text('Connection Error. Loading Values from Jira not possible.');
		$('#MainAlert').show();
		$('#LoaderArea').hide();
		console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
		yasoon.util.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data, yasoon.util.severity.error);
	};

	this.selectProject = function () {
		var selectedProject = $('#project').find(':selected').data('key');
		$('#IssueSpinner').css('display', 'inline');
		//Filter Issues based on selected Project
		jiraGet('/rest/api/2/search?jql=project%20%3D%20%22'+ selectedProject +'%22%20AND%20status%20!%3D%20%22resolved%22&maxResults=200&fields=summary')
		.then(function (data) {
			data = JSON.parse(data);
			self.projectIssues = [];
			
			$('#issue').html('<option></option>');
			if (data.issues.length > 0) {
				data.issues.forEach(function (issue) {
					self.projectIssues.push({
						id: issue.id,
						text: issue.fields.summary + ' (' + issue.key + ')'
					});
					
					$('#issue').append('<option value="' + issue.id + '" data-key="' + issue.key + '">' + issue.fields.summary + ' (' + issue.key + ')' + '</option>');
				});
			}
			$('#issue').select2("destroy");
			$('#issue').select2({
				placeholder: "Select an Issue",
				dataAdapter: jira.CustomIssueData
			});
			
			//If mail is provided && subject contains reference to issue, pre-select that
			if (self.mail && self.mail.subject) {
				//Try to extract issue key from subject
				var regEx = new RegExp(selectedProject + '.[0-9]+', 'g');
				var match = regEx.exec(self.mail.subject);
				
				if (match && match.length > 0) {
					var issueKey = match[0];
					var issue = data.issues.filter(function(i) { return i.key === issueKey; })[0];
					
					if (issue) {
						$('#issue').val(issue.id).trigger('change');
					}
					else {
						//Not in the list of the last 200 loaded, look up
						return jiraGet('/rest/api/2/issue/' + issueKey)
						.then(function(data) {
							issue = JSON.parse(data);

							//Add the issue to the dropdown
							self.projectIssues.push({
								id: issue.id,
								text: issue.fields.summary + ' (' + issue.key + ')'
							});
							
							$('#issue').append('<option value="' + issue.id + '" data-key="' + issue.key + '">' + issue.fields.summary + ' (' + issue.key + ')' + '</option>');
					
							//Rebuild select2
							$('#issue').select2("destroy");
							$('#issue').select2({
								placeholder: "Select an Issue",
								dataAdapter: jira.CustomIssueData
							});
							
							//Select the issue							
							$('#issue').val(issue.id).trigger('change');
						})
						.catch(function() {
							//Issue not found? Ignore..
						});
					}
				}
			}
		})
		.then(function() {
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
			self.recentIssues.push(selectedIssue);
			yasoon.setting.setAppParameter('recentIssues', JSON.stringify(self.recentIssues));
		}
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
}); //jshint ignore:line


$.fn.select2.amd.require(['select2/data/select', 'select2/utils'],
function (select, Utils) {
	function CustomIssueData($element, options) {
		CustomIssueData.__super__.constructor.call(this, $element, options);
	}

	Utils.Extend(CustomIssueData, select);

	CustomIssueData.prototype.current = function (callback) {
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

	CustomIssueData.prototype.select = function (data) {
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
				.data('text', data.text);

			this.$element.val(val);
			this.$element.trigger('change');
		}
	};

	var lastQuery = '';

	CustomIssueData.prototype.query = debounce(function (params, callback) {
		if (params && params.term) {
			//Get Issues matching the criteria
			lastQuery = params.term;
			jiraGet('/rest/api/2/search?jql=Summary%20~%20%22' + encodeURIComponent(params.term) + '%22%20OR%20key%20%3D%20%22' + encodeURIComponent(params.term) + '%22&maxResults=20&fields=summary&validateQuery=false')
			.then(function (data) {
				if (params.term === lastQuery) {
					var jqlResult = JSON.parse(data);
					var result = [];
					
					//Transform Data
					jqlResult.issues.forEach(function (issue) {
						result.push({ id: issue.id, text: issue.fields.summary + ' (' + issue.key + ')' });
					});
					
					callback({
						results: [{
							id: 'Results',
							text: 'Results for "' + params.term + '"',
							children: result
						}]
					});
				}
			});
		} else {
			//Add Recent Items
			callback({
				results: [{
					id: 'Recent',
					text: 'Recent',
					children: jira.recentIssues
				}, {
					id: 'ProjectIssues',
					text: 'Project Issues',
					children: jira.projectIssues
				}]
			});
		}
	}, 250);

	jira.CustomIssueData = CustomIssueData;

	$('#issue').select2({
		placeholder: "Search for any Issue",
		dataAdapter: jira.CustomIssueData
	});
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
			$('#description').height((bodyHeight - 185 - 270));

	} else {
		$('body').css('overflow-y', 'scroll');
		$('.form-body').height(350);
		$('#description').height(155);
	}
}
//@ sourceURL=http://Jira/Dialog/jiraAddCommentDialog.js