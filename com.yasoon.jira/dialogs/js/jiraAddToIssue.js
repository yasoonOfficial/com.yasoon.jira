var jira = {};

$(function () {
	$('body').css('overflow-y', 'hidden');
	$('form').on('submit', function (e) {
		e.preventDefault();
		return false;
	});
});

$(window).resize(resizeWindow);

yasoon.dialog.load(new function () { //jshint ignore:line
	var a = {}; //just for correct highlighting :) Otherwise Visual Code does not work correctly
	var self = this;
	jira = this;
	this.icons = new JiraIconController();

	this.settings = {};
	this.mail = {};
	this.cacheProjects = [];
	this.issue = {};
	this.type = ''; //Either '' or 'wholeMail' or 'selectedText'


	this.currentProject = null;
	this.currentIssue = null;


	this.init = function (initParams) {
		//Parameter taken over from Main JIRA
		self.mail = initParams.mail;
		self.settings = initParams.settings;
		self.selectedText = initParams.text;
		self.cacheProjects = initParams.projects;
		self.issue = initParams.issue;
		self.type = initParams.type;

		//Register Close Handler
		yasoon.dialog.onClose(self.cleanup);

		// Resize Window if nessecary (sized are optimized for default Window - user may have changed that)
		resizeWindow();

		//Popover for Service Desk Warning
		$('.servicedesk-popover').popover({
			content: yasoon.i18n('dialog.serviceDeskWarningBody'),
			title: yasoon.i18n('dialog.serviceDeskWarning'),
			placement: 'top',
			html: true,
			template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title" style="background-color:#fcf8e3;"></h3><div class="popover-content"></div></div>',
			trigger: 'click' //'click'
		});
		setTimeout(self.initDelayed, 1);
	};

	this.initDelayed = function () {
		//Render Header fields
		FieldController.loadField(ProjectField.defaultMeta, ProjectField, { cache: jira.cacheProjects, allowClear: true });
		FieldController.render(FieldController.projectFieldId, $('#HeaderArea'));

		FieldController.loadField(IssueField.defaultMeta, IssueField);
		FieldController.render(FieldController.issueFieldId, $('#IssueArea'));

		//Render Content fields
		FieldController.loadField(MultiLineTextField.defaultCommentMeta, MultiLineTextField, { hasMentions: true });
		FieldController.render(FieldController.commentFieldId, $('#ContentArea'));

		FieldController.loadField(AttachmentField.defaultMeta, AttachmentField);
		FieldController.render(FieldController.attachmentFieldId, $('#ContentArea'));


		//Hook up events
		FieldController.registerEvent(EventType.FieldChange, self, FieldController.projectFieldId);
		FieldController.registerEvent(EventType.FieldChange, self, FieldController.issueFieldId);

		if (jira.mail) {
			jira.emailController = new EmailController(jira.mail, jira.type, jira.settings, jira.ownUser);
			jira.emailController.setBody(FieldController.commentFieldId);
		}

		// Resize Window to maximize Comment field
		resizeWindow();
		FieldController.raiseEvent(EventType.AfterRender, {});

		//Submit Button - (Create & Edit)
		$('.submit-button').off().click(self.submitForm);
		$('#add-issue-cancel').off().click(function () {
			yasoon.dialog.close({ action: 'cancel' });
		});
	};

	this.cleanup = function () {
		//Invalidate dialog events so the following won't throw any events => will lead to errors
		// due to pending dialog.close
		yasoon.dialog.clearEvents();
		FieldController.raiseEvent(EventType.Cleanup, null);
	};

	this.handleEvent = function (type, newValue, source) {
		if (source === FieldController.projectFieldId) {
			self.currentProject = newValue;
		} else if (source === FieldController.issueFieldId) {
			self.currentIssue = newValue;
			if (newValue) {
				self.currentProject = newValue.fields.project;
			}
			console.log(newValue);
			$('.buttons').removeClass('servicedesk');
			$('.buttons').removeClass('no-requesttype');

			if (self.currentIssue && self.currentIssue.fields.project && self.currentIssue.fields.project.projectTypeKey === 'service_desk') {

				//We have a service Project... Check if it is a service request
				jiraGet('/rest/servicedeskapi/request/' + self.currentIssue.id)
					.then(function (data) {
						$('.buttons').addClass('servicedesk');
						$('.buttons').removeClass('no-requesttype');
					})
					.catch(function (e) {
						$('.buttons').addClass('no-requesttype');
						$('.buttons').removeClass('servicedesk');
					});
			}
		}
	};

	this.submitForm = function (e) {
		if (!self.currentIssue) {
			yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSelectIssue'));
			return;
		}

		var comment = FieldController.getValue(FieldController.commentFieldId);
		console.log('Kommentar:', comment);

		var attachments = FieldController.getField(FieldController.attachmentFieldId).getSelectedAttachments();

		if (!comment && (!attachments || attachments.length === 0)) {
			yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorNoData'));
			return;
		}

		//Prepare UI
		$('#MainAlert').addClass('hidden');
		$('#add-issue-submit').attr('disabled', 'disabled');
		$('#JiraSpinner').removeClass('hidden');

		//Todo: Add Recent Issue
		//Add Recent Project
		Promise.resolve()
			.then(function () {
				// Pre Save Event
				var lifecycleData = {
					data: {
						comment: comment
					}
				};
				return FieldController.raiseEvent(EventType.BeforeSave, lifecycleData);
			})
			.then(function () {
				//Saving... (and AfterSave Event)
				var promises = [];

				var url = '';
				var body = null;
				var type = $(e.target).data('type');
				if (type == 'submit') {
					url = '/rest/api/2/issue/' + self.currentIssue.id + '/comment';
					body = { body: comment };
				} else if (type == 'submitCustomer') {
					url = '/rest/servicedeskapi/request/' + self.currentIssue.key + '/comment';
					body = { body: comment, "public": true };
				} else if (type == 'submitInternal') {
					url = '/rest/servicedeskapi/request/' + self.currentIssue.key + '/comment';
					body = { body: comment, "public": false };
				}

				if (comment) {
					//Upload comment
					promises.push(
						jiraAjax(url, yasoon.ajaxMethod.Post, JSON.stringify(body))
							.catch(jiraSyncError, function (e) {
								$('#MainAlert .errorText').text(yasoon.i18n('dialog.errorSubmitComment', { error: e.getUserFriendlyError() }));
								$('#MainAlert').show();
								yasoon.util.log('Error on sending a comment: ' + e.getUserFriendlyError(), yasoon.util.severity.info);
								throw e;
							})
					);
				}

				var lifecycleData = {
					newData: self.selectedIssue
				};

				//Hmm... breaks a little the concept that attachments gets uploaded with AfterSave Event :(
				var eventPromise = FieldController.raiseEvent(EventType.AfterSave, lifecycleData);
				if (eventPromise) {
					promises.push(eventPromise);
				}

				return promises;
			})
			.then(function () {
				yasoon.dialog.close({ action: "success" });
			})
			.catch(function (e) {
				console.log('Exception occured', e);
				if (e.name === 'SyncError') {
					yasoon.util.log(e.message + ' || ' + e.statusCode + ' || ' + e.errorText + ' || ' + e.result + ' || ' + e.data, yasoon.util.severity.warning);
				}
			}).finally(function () {
				$('#add-issue-submit').removeAttr("disabled");
				$('#JiraSpinner').addClass('hidden');
			});

		e.preventDefault();
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