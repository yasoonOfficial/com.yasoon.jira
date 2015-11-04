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

	this.init = function (initParams) {
		//Parameter taken over from Main JIRA
		self.mail = initParams.mail;
		self.selectedIssue = initParams.issue;
		self.settings = initParams.settings;
		self.selectedText = initParams.text;

		//Register Close Handler
		yasoon.dialog.onClose(self.cleanup);
		
		// Resize Window if nessecary (sized are optimized for default Window - user may have changed that)
		resizeWindow();
		
		//Add attachments to clipboard
		if (self.mail && self.mail.attachments && self.mail.attachments.length > 0) {
			$.each(self.mail.attachments, function (i, attachment) {
				var handle = attachment.getFileHandle();
				
				if (self.settings.addAttachmentsOnNewAddIssue || (self.selectedText && self.selectedText.indexOf('!' + attachment.contentId + '!') > -1)) {
					//Rename embedded images, because embedded images have generic names
					// like image0001.png that duplicate quickly on issues
					var uniqueKey = getUniqueKey();
					var oldFileName = handle.getFileName();
					var newFileName = oldFileName.substring(0, oldFileName.lastIndexOf('.'));
					newFileName = newFileName + '_' + uniqueKey + oldFileName.substring(oldFileName.lastIndexOf('.'));
					handle.setFileName(newFileName);
					
					//In case of embedded image, we need to rename it as well
					if (self.selectedText && self.selectedText.indexOf('!' + attachment.contentId + '!') > -1) {
						var regEx = new RegExp('!' + attachment.contentId + '!', 'g');
						self.selectedText = self.selectedText.replace(regEx, '!' + newFileName + '!');			
					}
												
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

		//Render fields
		self.UIFormHandler.render('description', { name: 'Comment', schema: { system: 'description' }}, $('#ContentArea'));
		self.UIFormHandler.render('attachment', { name: 'Attachment', schema: { system: 'attachment' }}, $('#ContentArea'));

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
			
			$('#description').val(text);
			self.handleAttachments(text);
		}

		//Render current mail (just in case we need it as it probably needs some time)
		if (self.mail) {
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
					
					$('#description').val(markup);
					self.handleAttachments(markup);
				}
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

			
		} else {
			//Nothing selected
			$('#project').select2({
				placeholder: "Filter by Project"
			});

			$('#ProjectSpinner').css('display', 'inline');

			var projectGet = Promise.resolve(jira.cacheProjects);
			
			if (!jira.cacheProjects || jira.cacheProjects.length <= 0) 
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
					group.append('<option style="background-image: url(images/projectavatar.png)" value="' + project.id + '" data-key="' + project.key + '">' + project.name + '</option>');
				});
				
				group = $('#project').find('.recent');
				$.each(self.recentProjects, function (i, project) {
					group.append('<option style="background-image: url(images/projectavatar.png)" value="' + project.id + '" data-key="' + project.key + '">' + project.name + '</option>');
				});

				$('#project').select2("destroy");
				$('#project').select2({
					placeholder: "Filter by Project"
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
		jiraGet('/rest/api/2/search?jql=project%20%3D%20%22'+ selectedProject +'%22%20AND%20status%20!%3D%20%22resolved%22&maxResults=1000&fields=summary')
		.then(function (data) {
			data = JSON.parse(data);

			$('#issue').html('<option></option>');
			if (data.issues.length > 0) {
				data.issues.forEach(function (issue) {
					$('#issue').append('<option value="' + issue.id + '" data-key="' + issue.key + '">' + issue.fields.summary + ' (' + issue.key + ')' + '</option>');
				});
			}
			$('#issue').select2("destroy");
			$('#issue').select2({
				placeholder: "Select an Issue"
			});

			$('#IssueSpinner').css('display', 'none');
			
			//If mail is provided && subject contains reference to issue, pre-select that
			if (self.mail && self.mail.subject) {
				//Sort issue by key length descending, so we will match the following correctly:
				// Subject: This is for DEMO-123 issue
				// Keys: DEMO-1, DEMO-12, DEMO-124
				var issuesByKeyLength = data.issues.sort(function(a, b){
					return b.key.length - a.key.length; // ASC -> a - b; DESC -> b - a
				});
				
				for (var i = 0; i < issuesByKeyLength.length; i++) {
					var curIssue = issuesByKeyLength[i];
					if (self.mail.subject.indexOf(curIssue.key) >= 0) {							
						$('#issue').val(curIssue.id).trigger('change');
						break;
					}
				}
			}
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

	this.handleAttachments = function (markup) {
		var handles = yasoon.clipboard.all();
		for (var id in handles) {
			if (handles.hasOwnProperty(id)) {
				var fileHandle = handles[id];
				if (markup.indexOf('!' + fileHandle.getFileName() + '!') > -1) {
					self.selectedAttachments.push(fileHandle);
					var index = self.addedAttachmentIds.indexOf(id);
					self.addedAttachmentIds.splice(index, 1);
					fileHandle.setInUse();
					yasoon.clipboard.remove(id);
				}
			}
			jira.UIFormHandler.getRenderer('attachment').renderAttachments('attachment');
		}
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

	CustomIssueData.prototype.query = function (params, callback) {
		if (params && params.term) {
			//Get Issues matching the criteria
			jiraGet('/rest/api/2/search?jql=Summary%20~%20%22' + encodeURIComponent(params.term) + '%22%20OR%20key%20%3D%20%22' + encodeURIComponent(params.term) + '%22&maxResults=20&fields=summary&validateQuery=false')
			.then(function (data) {
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
			});
		} else {
			//Add Recent Items
			callback({
				results: [{
					id: 'Recent',
					text: 'Recent',
					children: jira.recentIssues
				}]
			});
		}
	};

	jira.CustomIssueData = CustomIssueData;

	$('#issue').select2({
		placeholder: "Search for any Issue",
		dataAdapter: jira.CustomIssueData,
		minimumInputLength: 2
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