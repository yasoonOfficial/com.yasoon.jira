function JiraRibbonController() {
	var self = this;

	this.createRibbon = function createRibbon (ribbonFactory) {
		jira.ribbonFactory = ribbonFactory;

		ribbonFactory.create({
			type: 'contextMenus',
			renderTo: [
				'Microsoft.Outlook.Explorer',
				'Microsoft.Outlook.Mail.Read'
			],
			items: [
			//	{
			//	type: 'contextMenu',
			//	idMso: 'ContextMenuMailItem',
			//	items: [
			//		{
			//			id: 'newIssueFullMail',
			//			type: 'button',
			//			image: 'logo_icon1.png',
			//			label: 'New Issue',
			//			onAction: self.ribbonOnNewIssue
			//		}
			//	]
			//},
			{
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
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailText',
				items: [{
					type: 'button',
					id: 'newIssueFromText',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailTable',
				items: [{
					type: 'button',
					id: 'newIssueFromText2',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailTableCell',
				items: [{
					type: 'button',
					id: 'newIssueFromText3',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailListTable',
				items: [{
					type: 'button',
					id: 'newIssueFromText4',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailPictureTable',
				items: [{
					type: 'button',
					id: 'newIssueFromText5',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailTextTable',
				items: [{
					type: 'button',
					id: 'newIssueFromText6',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailTableWhole',
				items: [{
					type: 'button',
					id: 'newIssueFromText7',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailList',
				items: [{
					type: 'button',
					id: 'newIssueFromText8',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}, {
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailHyperlink',
				items: [{
					type: 'button',
					id: 'newIssueFromText9',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}]
		});
	};

	this.ribbonOnNewIssue = function ribbonOnNewIssue (ribbonId, ribbonCtx) {
		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			yasoon.dialog.showMessageBox('Please login to Jira in settings menu first!');
			return;
		}
		var initParams = { 'settings': jira.settings, 'ownUser': jira.data.ownUser };

		var dialogOptions = {
			width: 900,
			height: 650,
			title: 'New Jira Issue',
			resizable: true,
			htmlFile: 'Dialogs/newIssueDialog.html',
			initParameter: initParams,
			closeCallback: self.ribbonOnCloseNewIssue
		};

		if (ribbonId == 'newIssueFullMail') {
			//Ribbon on Mail Item
			//yasoon.outlook.mail.renderSelection(ribbonCtx.items[ribbonCtx.readingPaneItem], 'jiraMarkup').then(function (markup) {
			//	initParams.text = markup;
			//	initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];

			//	yasoon.dialog.open(dialogOptions);
			//});

			return;
		} else if (ribbonId == 'newIssue') {
			//Ribbon in Email Selection
			yasoon.dialog.open(dialogOptions);
			return;
		} else {
			var selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);
			if (!selection || !selection.trim()) {
					yasoon.dialog.showMessageBox('Please select some text first!');
					return;
			}
			
			yasoon.outlook.mail.renderSelection(ribbonCtx.items[ribbonCtx.readingPaneItem], 'jiraMarkup').then(function(markup) {
				initParams.text = markup;
				initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
				
				yasoon.dialog.open(dialogOptions);
			});
			
			return;
		}
	};

	this.ribbonOnCloseNewIssue = function ribbonOnCloseNewIssue () {
		jira.sync();
	};
}

function JiraContactController() {
	var self = this;
	var buffer = [];

	self.update = function (actor) {
		if (!actor.name || !actor.displayName || !actor.emailAddress)
			return;

		var c = yasoon.contact.get(actor.name);
		var dbContact = null;
		var avatarUrl = null;
		if (actor.avatarUrls && actor.avatarUrls['48x48']) {
			avatarUrl = actor.avatarUrls['48x48'].replace('size=large', 'size=xlarge');
		}
		if (!c) {
			var newContact = {
				contactId: actor.name,
				contactLastName: actor.displayName,
				contactEmailAddress: actor.emailAddress,
				externalData: JSON.stringify(actor),
				externalAvatarUrl: avatarUrl,
				useAuthedDownloadService: jira.settings.currentService
			};
			jiraLog('New Contact created: ', newContact);
			dbContact = yasoon.contact.add(newContact);
			buffer.push(dbContact);

		} else {
			//We don't want to override an existing avatrUrl with null
			if (!avatarUrl)
				avatarUrl = c.externalAvatarUrl;

			if (c.contactId != actor.name ||
			   c.contactLastName != actor.displayName ||
			   c.contactEmailAddress != actor.contactEmailAddress ||
			   c.externalAvatarUrl != avatarUrl) {

				var updContact = {
					contactId: actor.name,
					contactLastName: actor.displayName,
					contactEmailAddress: actor.emailAddress,
					externalData: JSON.stringify(actor),
					externalAvatarUrl: avatarUrl,
					useAuthedDownloadService: jira.settings.currentService
				};
				dbContact = yasoon.contact.save(updContact);
				if (dbContact) {
					//Remove old entry from array
					buffer = buffer.filter(function (elem) { return elem.contactId != dbContact.contactId; });
					//Add new entry
					buffer.push(dbContact);
				}

			}
		}
	};

	self.get = function (id) {
		var result = $.grep(buffer, function (c) { return c.contactId === id; });
		if (result.length === 1) {
			return result[0];
		} else {
			result = yasoon.contact.get(id);
			if (result && result.contactId) {
				buffer.push(result);
			}
			return result;
		}
	};
}

function jiraXmlToJson(xmlDom) {
	var js_obj = {};
	if (xmlDom.nodeType == 1) {
		if (xmlDom.attributes.length > 0) {
			js_obj["@attributes"] = {};
			for (var j = 0; j < xmlDom.attributes.length; j++) {
				var attribute = xmlDom.attributes.item(j);
				js_obj["@attributes"][attribute.nodeName] = attribute.value;
			}
		}
	} else if (xmlDom.nodeType == 3) {
		js_obj = xmlDom.nodeValue;
	}
	if (xmlDom.hasChildNodes()) {
		for (var i = 0; i < xmlDom.childNodes.length; i++) {
			var item = xmlDom.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof (js_obj[nodeName]) == "undefined") {
				js_obj[nodeName] = jiraXmlToJson(item);
			} else {
				if (typeof (js_obj[nodeName].push) == "undefined") {
					var old = js_obj[nodeName];
					js_obj[nodeName] = [];
					js_obj[nodeName].push(old);
				}
				js_obj[nodeName].push(jiraXmlToJson(item));
			}
		}
	}
	return js_obj;
}

function jiraQueue() {

	var deferred = $.Deferred();
	var promise = deferred.promise();

	$.each(arguments, function (i, obj) {

		promise = promise.then(function () {
			return obj();
		});
	});

	deferred.resolve();

	return promise;
}

function getJiraMarkupRenderer() {
	var inTable = false;
	var lastOp = '';
	
	return new MailRenderer({
		renderTextElement: function(text, style) {
			lastOp = 'renderTextElement';
			
			//Trim the spaces away and restore them later
			var trimmedText = text.trim();
			var prefix = text.substring(0, text.indexOf(trimmedText));
			var suffix = text.substring(text.indexOf(trimmedText) + trimmedText.length, text.length);
			var result = trimmedText;
			
			if(style.isBold)
				result = '*' + result + '*';
			
			if(style.isItalic)
				result = '_' + result + '_';
				
			if(style.isUnderline)
				result = '+' + result + '+';
				
			if(style.isStrikethrough)
				result = '-' + result + '-';
				
			if(style.isHeading)
				result = 'h' + style.headingSize + '. ' + result;

			if(style.color) 
				result = '{color:' + style.color + '}' + result + '{color}';
			 
			return prefix + result + suffix; 
		},
		renderHyperlink: function(url, label, style) {
			lastOp = 'renderHyperlink';
			
			if(label)
				return '[' + label + '|' + url + ']';
			else
				return '[' + url + ']';
		},
		renderTable: function(time) {
			lastOp = 'renderTable';
			
			if(time === 0)
				inTable = true;
			else
				inTable = false;
		},
		renderTableRow: function(time, type) {
			lastOp = 'renderTableRow';
			
			if(time === 1)
				return '\n';
				
			return '';
		},
		renderTableCell: function(time, rowType, colType) {
			lastOp = 'renderTableCell';
			
			if(time === 0 && colType === 1)
				return '|';
			else if(time === 1)
				return '|'; 
		},
		renderNewLine: function() {
			if(inTable && lastOp === 'newLine')
				return '';
			
			lastOp = 'newLine';
			return '\n';
		},
		renderListLine: function(listLine) {
			var result = '';
			for(var i = 0; i <= listLine.indentLevel; i++) {
				if(listLine.indentStyle[i].format === 0) //decimal
					result = result + '#';
				else 
					result = result + '*';
			}
			
			result += ' ';
			return result;
		}
	});
}

function jiraSyncQueue() {
	var self = this;
	var lastPromise = null;

	this.add = function (fct) {
		return new Promise(function (resolve, reject) {
			var promise = null;
			if (lastPromise) {
				promise = lastPromise.finally(function () {
					return fct();
				});
			} else {
				promise = fct();
			}

			lastPromise = promise
			.then(function () {
				//next();
				resolve.apply(this, arguments);
			})
			.catch(function () {
				//next();
				resolve.apply(this, arguments);
			});
		});
	};
}

function jiraGetNotification(id) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.notification.getByExternalId1(id, resolve);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAddNotification(notif) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.notification.add1(notif, resolve);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraSaveNotification(notif) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.notification.save1(notif, resolve);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraGetCalendarItem(id) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.calendar.getAsync(id, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAddCalendarItem(item, calendarId) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.calendar.addAsync(item, calendarId, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraSaveCalendarItem(item) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.calendar.saveAsync(item, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}
//@ sourceURL=http://Jira/functions.js