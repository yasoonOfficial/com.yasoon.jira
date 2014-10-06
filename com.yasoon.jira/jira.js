var jira = {};
yasoon.app.load("com.yasoon.jira", new function () {
	var self = this;
	jira = this;
	jira.CONST_HEADER = '';

	var firstTime = true;

	this.init = function () {
		jira.settings = new JiraSettingController();
		jira.notifications = new JiraNotificationController();
		jira.ribbons = new JiraRibbonController();
		jira.contacts = new JiraContactController();


		yasoon.addHook(yasoon.setting.HookCreateRibbon, jira.ribbons.createRibbon);
		yasoon.periodicCallback(300, self.sync);
	};

	this.sync = function () {
		
	};

	this.errorHandler = function (data, statusCode, result, errorText, cbkParam) {
		console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
	};
});

function JiraSettingController() {
	var self = this;

	self.renderSettingsContainer = function (container) {
	    var html = '';

		//Add Values
		var elem = $('<div>' + html + '</div>');
		$.each(github.settings, function (i, val) {
			if (elem.find('#' + i).attr('type') == "checkbox") {
				if (val == true) {
					elem.find('#' + i).attr('checked', true);
				}
			} else {
				elem.find('#' + i).val(val);
			}
		});
		//Add JS
		container.afterRender = function () {
		}
		container.setContent(elem.html());
	};

	self.saveSettings = function (form) {
		//Create deep copy
		$.each(form, function (i, param) {
			if (param.value == "true") {
				self[param.key] = true;
			} else if (param.value == "false") {
				self[param.key] = false;
			} else {
				self[param.key] = param.value;
			}
		});
		yasoon.setting.setAppParameter('settings', JSON.stringify(self));
	};

	/****** Initial Load of settings */
	var userString = yasoon.setting.getAppParameter('user');
	if (userString) {
		self.ownUser = JSON.parse(userString);
	}

	var settingsString = yasoon.setting.getAppParameter('settings');
	if (!settingsString) {
		//Initial Settings
		//yasoon.setting.setAppParameter('settings', JSON.stringify(self));

	} else {
		//Load Settings
		var settings = JSON.parse(settingsString);
		$.each(settings, function (key, value) {
			self[key] = value;
		});
	}
}

function JiraNotificationController() {
	var self = this;
	var notificationCounter = 0;
	var notification = null;

	// Custom Debounce 
	var bounce = debounce(function () {
		if (notification == null)
			return;

		if (notificationCounter == 1) {
			ghLog('Single Desktop Notification shown: ', notification);
			var content = $('<div>' + notification.title + ' </div>').text();
			yasoon.notification.showPopup({ title: 'News on GitHub', text: content, contactId: notification.contactId });
		} else {
			ghLog('Multiple Desktop Notification shown!');
			yasoon.notification.showPopup({ title: "News on GitHub", text: 'multiple new notifications' });
		}

		notificationCounter = 0;
		notification = null;
	}, 2000);

	self.createNotification = function (event) {
		
	};

	self.addDesktopNotification = function (event) {
		notificationCounter++;
		notification = event;
		bounce();
	};

	self.renderNotification = function (feed) {
		var event = self.createNotification(JSON.parse(feed.externalData));
		if (event != null) {
			feed.contentHtml = event.renderBody();
		}
		return feed;
	};
}

function JiraNotification() {
	this.createNotification = function () {
		
	};

	this.addDeferred = function (def) {
		this.deferreds.push(def);
	};

	this.executeDeferreds = function (callback) {
		allDeferred = [];
		var context = this;
		$.each(this.deferreds, function (i, def) {
			allDeferred.push(def.apply(context));
		});

		$.when.apply(this, allDeferred).then(callback);
	};
}

JiraPushNotification.prototype = new JiraNotification();
function JiraPushNotification(event) {
	var self = this;
	self.event = event;
	self.deferreds = [];
	self.deferredObject = event;

	function isSyncNeeded() {
		return true;

	}

	self.renderBody = function () {
		//var icon_url = yasoon.io.getLinkPath('Images/pushEvent.png');
		//var html = '' +
		//	'<div style="position:relative">' +
		//	'   <div class="push-left" style="width:80%">' +
		//	'       <ul>';
		//$.each(self.event.payload.commits, function (i, commit) {
		//	var contact = yasoon.contact.get(commit.author.name);
		//	var avatarUrl = (contact == null) ? './avatars/dummy_user.png' : contact.ImageURL;
		//	html += ' <li style="list-style-type: none;">' +
		//			'   <img style="width:16px; height:16px;" src="' + avatarUrl + '" title="'+commit.author.name+'"/> ' +
		//			'   <a href="' + self.event.repo.html_url +'/commit/'+commit.sha+'">' + commit.sha.substring(0,6)+'</a>' +
		//			'   <span> ' + commit.message + '</span>' +
		//			'</li>';
		//});

		//html += '   </ul>' +
		//	'   </div>' +
		//	'   <div " style="position:absolute; top:0px; right:10px;">' +
		//	'       <img src="' + icon_url + '" style="height:40px;" title="Push Notification"> ' +  
		//	'   </div>' +
		//	'</div>';

		//return html;
	};

	self.renderTitle = function () {
		//var branch = self.event.payload.ref.split('/');

		//return '<a href="https://github.com/' + self.event.actor.login + '">' + self.event.actor.login + '</a> pushed to <a href="' + self.event.repo.html_url + '/tree/' + branch[branch.length - 1] + '">' + branch[branch.length - 1] + '</a> at <a href="' + self.event.repo.html_url + '">' + self.event.repo.name + '</a>';
	};

	self.save = function () {
		if (!isSyncNeeded) {
			return;
		}
		self.executeDeferreds(function () {
			//Create Standard Notification by Super class
			//var result = self.createNotification();
			//if (result != null) {
			//	//Do Push event specific stuff
			  
			//	// Save
			//	if (result.creation) {
			//		result.notification = yasoon.notification.add(result.notification);
			//		github.notifications.addDesktopNotification(result.notification);
			//	} else {
			//		yasoon.notification.save(result.notification);
			//	}
			//}
		});
	};
}

function JiraRibbonController() {
	var self = this;
	this.createRibbon = function (ribbonFactory) {
		jira.ribbonFactory = ribbonFactory;

		ribbonFactory.create({
			type: 'contextMenus',
			renderTo: [
				'Microsoft.Outlook.Explorer'
			],
			items: [{
				type: 'contextMenu',
				idMso: 'MenuMailNewItem',
				items: [{
					type: 'button',
					id: 'newIssue',
					insertAfterMso: 'NewTaskCompact',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			} ,{
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailText',
				items: [{
					type: 'button',
					id: 'newIssueFromText',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			} ,{
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailList',
				items: [{
					type: 'button',
					id: 'newIssueFromText2',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}]
		});
	};

	this.ribbonOnNewIssue = function (ribbonId, ribbonCtx) {
	
	    if (ribbonId == 'newIssue') {
	        //if (yasoon.app.isOAuthed('auth')) {
	            yasoon.dialog.open({
	                width: 900,
	                height: 650,
	                title: 'New Jira Issue',
	                resizable: false,
	                htmlFile: 'Dialogs/newIssueDialog.html',
	                //initParameter: { 'ownUser': jira.settings.ownUser },
	                closeCallback: self.ribbonOnCloseNewIssue
	            });
	        //} else {
			//	yasoon.dialog.showMessageBox('Please login to GitHub in settings menu first!');
			//	return;
	        //}
		}
		else {			
			var selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);
			
			if(!selection || !selection.trim()) {
				yasoon.dialog.showMessageBox('Please select some text first!');
				return;
			}
			
			yasoon.dialog.open({
	                width: 900,
	                height: 650,
	                title: 'New Jira Issue',
	                resizable: false,
	                htmlFile: 'Dialogs/newIssueDialog.html',
	                //initParameter: { ownUser: github.settings.ownUser, text: selection },
	                closeCallback: self.ribbonOnCloseNewIssue
	            });
		}
	};

	this.ribbonOnCloseNewIssue = function () {

	};
}

function JiraContactController() {
	var self = this;

	self.update = function (actor) {
		var c = yasoon.contact.get(actor.login);
		if (c == null) {
			var newContact = {
				contactId: actor.login,
				contactLastName: actor.login,
				externalData: JSON.stringify(actor),
				externalAvatarUrl: actor.avatar_url
			}
			ghLog('New Contact created: ', newContact);
			yasoon.contact.add(newContact);

		} else {
			//Todo: Update of Avatar
		}
	};
}

function jiraLog(text, obj, stacktrace) {
	if (yasoon.logLevel == 0) {
		var stack = '';
		var json = '';
		if (stacktrace !== undefined || stacktrace == true) {
			try {
				var a = doesNotExit + forceException;
			} catch (e) {
				stack = '\n' + printStackTrace(e).split('\n')
					.slice(1)
					.join('\n');

			}
		}
		if (obj != null) {
			json = '\n' + JSON.stringify(obj);
		}

		yasoon.util.log(text + ' ' + json + ' ' + stack);
	}
}


//@ sourceURL=jira.js