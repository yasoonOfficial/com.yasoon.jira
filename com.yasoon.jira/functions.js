function JiraRibbonController() {
	var self = this;

	this.createRibbon = function createRibbon (ribbonFactory) {
		jira.ribbonFactory = ribbonFactory;

		//Add Ribbon in top toolbar Ribbon on new Item
		var contextMenuItems = [{
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
		},
		{
		type: 'contextMenu',
		idMso: 'ContextMenuMailItem',
		items: [{
				id: 'newIssueFullMail',
				type: 'button',
				image: 'logo_icon1.png',
				label: 'New Issue',
				onAction: self.ribbonOnNewIssue
			}, {
				id: 'addToIssueFullMail',
				type: 'button',
				image: 'logo_icon1.png',
				label: 'Add to Issue',
				onAction: self.ribbonOnAddToIssue
			}]
		}];

		//Add New Issue Ribbons in email
		var newIssueRibbons = self.createEmailItems('New Issue', 'newIssueFromText', self.ribbonOnNewIssue);
		contextMenuItems = contextMenuItems.concat(newIssueRibbons);
		
		var addToIssueRibbons = self.createEmailItems('Add to Issue', 'addToIssueFromText', self.ribbonOnAddToIssue);
		contextMenuItems = contextMenuItems.concat(addToIssueRibbons);

		//Add main menu ribbon
		ribbonFactory.create({
			type: 'ribbon',
			renderTo: [
				'Microsoft.Outlook.Explorer',
			],
			items: [{
				type: 'tabs',
				items: [{
					type: 'tab',
					idMso: 'TabMail',
					items: [{
						type: 'group',
						id: 'jiraMailExplorerGroup',
						insertAfterMso: 'GroupMailRespond',
						label: 'JIRA',
						items: [{
							type: 'button',
							id: 'newIssueFromMailMain',
							size: 'large',
							label: 'New Issue',
							image: 'images/ribbonNew.png',
							onAction: self.ribbonOnNewIssue
						}, {
							type: 'button',
							id: 'addToIssueFromMailMain',
							size: 'large',
							label: 'Add To Issue',
							image: 'images/ribbonAdd.png',
							onAction: self.ribbonOnAddToIssue
						}]
					}]
				}]
			}]
		});

		ribbonFactory.create({
			type: 'contextMenus',
			renderTo: [
				'Microsoft.Outlook.Explorer',
				'Microsoft.Outlook.Mail.Read'
			],
			items: contextMenuItems
		});
	};

	this.createEmailItems = function (label,id, action) {
		var result = [];
		//var mailContextMenuMso = [
		//	'ContextMenuHeading',
		//	'ContextMenuHeadingLinked',
		//	'ContextMenuReadOnlyMailText',
		//	'ContextMenuReadOnlyMailList',
		//	'ContextMenuReadOnlyMailTable',
		//	'ContextMenuReadOnlyMailTableCell',
		//	'ContextMenuReadOnlyMailListTable',
		//	'ContextMenuReadOnlyMailPictureTable',
		//	'ContextMenuReadOnlyMailTableWhole',
		//	'ContextMenuReadOnlyMailTextTable',
		//	'ContextMenuReadOnlyMailHyperlink'
		//];
		var mailContextMenuMso = [
			'ContextMenuReadOnlyMailText',
			'ContextMenuReadOnlyMailTable',
			'ContextMenuReadOnlyMailTableCell',
			'ContextMenuReadOnlyMailListTable',
			'ContextMenuReadOnlyMailPictureTable',
			'ContextMenuReadOnlyMailTextTable',
			'ContextMenuReadOnlyMailTableWhole',
			'ContextMenuReadOnlyMailList',
			'ContextMenuReadOnlyMailHyperlink',
			'ContextMenuHeading',
			'ContextMenuHeadingLinked',
		];

		mailContextMenuMso.forEach(function (mso, i) {
			var counter = i + 1;
			result.push({
				type: 'contextMenu',
				idMso: mso,
				items: [{
					type: 'button',
					id: id+''+((counter != 1) ? counter  : ''), //Don't ask! compatibility with old ribbon updater
					label: label,
					image: 'logo_icon1.png',
					onAction: action
				}]
			});
		});

		return result;
	};

	this.ribbonOnNewIssue = function ribbonOnNewIssue(ribbonId, ribbonCtx) {
		if (!jiraIsLicensed(true)) {
			return;
		}
		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			yasoon.dialog.showMessageBox('Please login to Jira in settings menu first!');
			return;
		}
		var initParams = {
			'settings': jira.settings,
			'ownUser': jira.data.ownUser,
			'userMeta': jira.cache.userMeta,
			'createMetas': jira.cache.createMetas,
			'projects': jira.data.projects
		};

		var dialogOptions = {
			width: 735,
			height: 700,
			title: 'New Jira Issue',
			resizable: true,
			htmlFile: 'Dialogs/newIssueDialog.html',
			initParameter: initParams,
			closeCallback: self.ribbonOnCloseNewIssue
		};

		if (ribbonId == 'newIssueFullMail' || ribbonId == 'newIssueFromMailMain') {
			//Ribbon on Mail Item
			initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
			yasoon.dialog.open(dialogOptions);
			return;
		} else if (ribbonId == 'newIssue') {
			//Ribbon in Standard New EMail Dropdown
			yasoon.dialog.open(dialogOptions);
			return;
		} else {
			var selection = '';
			try {
				selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);
			} catch (e) {
				yasoon.dialog.showMessageBox('Couldn\'t determine the current email. Please switch the focus to another email and try again');
				return;
			}
			if (!selection || !selection.trim()) {
					yasoon.dialog.showMessageBox('Please select some text first!');
					return;
			}
			
			yasoon.outlook.mail.renderSelection(ribbonCtx.items[ribbonCtx.readingPaneItem], 'jiraMarkup')
			.then(function (markup) {
				initParams.text = markup;
				initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
				
				yasoon.dialog.open(dialogOptions);
			});
			
			return;
		}
	};

	this.ribbonOnAddToIssue = function ribbonOnAddToIssue(ribbonId, ribbonCtx) {
		if (!jiraIsLicensed(true)) {
			return;
		}

		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			yasoon.dialog.showMessageBox('Please login to Jira in settings menu first!');
			return;
		}

		var initParams = { 'settings': jira.settings, 'ownUser': jira.data.ownUser };

		var dialogOptions = {
			width: 610,
			height: 575,
			title: 'Add Comment',
			resizable: true,
			htmlFile: 'Dialogs/AddCommentDialog.html',
			initParameter: initParams,
			closeCallback: self.ribbonOnCloseAddToIssue
		};

		if (ribbonId == 'addToIssueFullMail' || ribbonId == 'addToIssueFromMailMain') {
			initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
			yasoon.dialog.open(dialogOptions);
			return;
		} else {
			var selection = '';
			try {
				selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);
			} catch (e) {
				yasoon.dialog.showMessageBox('Couldn\'t determine the current email. Please switch the focus to another email and try again');
				return;
			}
			if (!selection || !selection.trim()) {
				yasoon.dialog.showMessageBox('Please select some text first!');
				return;
			}

			yasoon.outlook.mail.renderSelection(ribbonCtx.items[ribbonCtx.readingPaneItem], 'jiraMarkup')
			.then(function (markup) {
				initParams.text = markup;
				initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];

				yasoon.dialog.open(dialogOptions);
			});
		}
	};

	this.ribbonOnCloseNewIssue = function ribbonOnCloseNewIssue() {
		jira.sync();
	};

	this.ribbonOnCloseAddToIssue = function ribbonOnCloseAddToIssue() {
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

				yasoon.contact.save(updContact);
			}
		}
	};

	self.updateOwn = function (ownUser) {
		var avatarUrl = null;
		if (ownUser.avatarUrls && ownUser.avatarUrls['48x48']) {
			avatarUrl = ownUser.avatarUrls['48x48'].replace('size=large', 'size=xlarge');
		}
		var c = yasoon.contact.getOwnUser();

		if (!c)
			return;

		//We don't want to override an existing avatrUrl with null
		if (!avatarUrl)
			avatarUrl = c.externalAvatarUrl;

		if ( c.externalAvatarUrl != avatarUrl) {

			c.externalAvatarUrl = avatarUrl;
			c.useAuthedDownloadService = jira.settings.currentService;

			yasoon.contact.updateOwnUser(c);
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

function JiraFilterController() {
	var self = this;

	this.values = {};
	this.filterObj = [];
	this.allFilters = [];

	function getLabel(name, id, path) {
		return (self.values[path] && self.values[path][id]) ? self.values[path][id] : null;
	}

	this.register = function () {
		var backendFilterObj = [];
		self.filterObj.forEach(function (f) {
			if (self.getSelectedFilters().indexOf(f.key) > -1) {
				var getLabelFct = (f.label) ? f.label : getLabel;
				backendFilterObj.push({
					name: f.name,
					jsonPath: f.key,
					label: getLabelFct
				});
			}
		});
		yasoon.feed.addFilter(backendFilterObj);
	};

	this.getSelectedFilters = function () {
		return jira.settings.activeFilters.split(',');
	};

	this.load = function () {
		var string = yasoon.setting.getAppParameter('filter');
		if (string)
			self.values = JSON.parse(string);

		self.filterObj = [
			{
				name: 'Project',
				key: 'fields.project.id',
				value: { type: 'json', path: 'fields.project.name' }
				//Without label so it gets the default GetLabel method
			},
			{
				name: 'Type',
				key: 'fields.issuetype.id',
				value: { type: 'json', path: 'fields.issuetype.name' }
			},
			{
				name: 'Reporter',
				key: 'fields.reporter.emailAddress',
				value: { type: 'json', path: 'fields.reporter.displayName' }
			},
			{
				name: 'Status',
				key: 'fields.status.id',
				value: { type: 'json', path: 'fields.status.name' }
			},
			{
				name: 'Priority',
				key: 'fields.priority.id',
				value: { type: 'json', path: 'fields.priority.name' }
			},
			{
				name: 'Assignee',
				key: 'fields.assignee.emailAddress',
				value: { type: 'json', path: 'fields.assignee.displayName' }
			},
			{
				name: 'FixVersion',
				key: 'fields.fixVersions[*].id',
				value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: 'Version',
				key: 'fields.versions[*].id',
				value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: 'Label',
				key: 'fields.labels'
				//value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: 'Component',
				key: 'fields.components[*].id',
				value: { type: 'json', path: 'fields.components[*].name' }
			}
		];

		//Determine allFilters
		self.filterObj.forEach(function (f) {
			self.allFilters.push(f.key);
		});

	};

	this.save = function () {
		yasoon.model.feeds.updateFilter();
		yasoon.setting.setAppParameter('filter', JSON.stringify(self.values));
	};

	function getJsonPathElement(obj, jsonPath) {
		var path = jsonPath.split('.');
		var currentObj = obj;
		//Use some so it stops after any element has returned true
		path.some(function (currentPath,i) {
			if (!currentObj)
				return true;

			//Add support for Arrays
			//Check if it has element selector [1] or all [*]
			var regex = /(.+)\[(.+)\]/;
			var regexResult = regex.exec(currentPath);

			if (regexResult) {
				//It should be an array, but it isn't
				var arrayData = currentObj[regexResult[1]];
				if (!$.isArray(arrayData)) {
					currentObj = null;
					return true;
				}

				if (regexResult[2] === '*') {
					currentObj = [];
					//Get remaining path
					var remainingPath = '';
					path.forEach(function(remPath, index) {
						if(index > i) {
							if(remainingPath)
								remainingPath += '.';

							remainingPath += remPath;
						}
					});

					arrayData.forEach(function (o) {
						var data = getJsonPathElement(o, remainingPath);
						if (data)
							currentObj.push(data);
					});
					return true;

				} else {
					//Get requested element
					currentObj = currentObj[regexResult[1]];
				}
			} else {
				currentObj = currentObj[currentPath];
			}
		});

		return currentObj;
	}

	this.addNotif = function (obj) {
		//Go through each filter 
		var saveNeeded = false;
		self.getSelectedFilters().forEach(function (filterKey) {
			var filter = self.filterObj.filter(function (f) { return f.key === filterKey; })[0];
			//Get Key Value for current filter
			var currentKeyObj = getJsonPathElement(obj, filter.key);
			if (currentKeyObj) {
				//Get Value for current Filter
				var currentValueObj = currentKeyObj;
				if (filter.value) {
					if (filter.value.type !== 'json') {
						throw 'Filter Types other than json are currently not supported';
					}

					currentValueObj = getJsonPathElement(obj, filter.value.path);
				}
				//Update Buffer
				if (!self.values[filter.key])
					self.values[filter.key] = {};

				if ($.isArray(currentKeyObj)) {
					//Add Each currentValueObj as seperate entry
					currentKeyObj.forEach(function (key,i) {
						if (self.values[filter.key][key] != currentValueObj[i]) {
							self.values[filter.key][key] = currentValueObj[i];
							saveNeeded = true;
						}
					});
				} else if (self.values[filter.key][currentKeyObj] != currentValueObj) {
					self.values[filter.key][currentKeyObj] = currentValueObj;
					saveNeeded = true;
				}
			}
		});

		if(saveNeeded)
			self.save();
	};

	function indexPages(page) {
		//Add Promise to make it async. We want only want to sync 1 page and let other tasks  a chance to do something as well.
		return new Promise(function (resolve, reject) {
			setTimeout(function () {
				if (page.Items) {
					page.Items.forEach(function (item) {
						self.addNotif(JSON.parse(item.externalData));
					});

					if (page.CurrentPage < page.TotalPages) {
						indexPage(page.nextPage())
						.then(function () {
							resolve();
						});
					} else {
						resolve();
					}
				} else {
					resolve();
				}
			},1);
		});
	}

	this.reIndex = function () {
		var newValues = {};
		return Promise.resolve()
		.then(function () {
			var page = yasoon.notification.getAll();
			return indexPages(page);
		});
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

function jiraIsLicensed(openDialog) {
	//Add 1 day bonus. This means, compare with yesterday instead of today
	var yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	if (!jira.license.isFullyLicensed && jira.license.validUntil < yesterday) {
		if (openDialog) {
			//Open Dialog
			jiraOpenPurchaseDialog();
		}
		return false;
	}
	return true;
}

var isLicenseDialogOpen = false;
function jiraOpenPurchaseDialog() {
	if (isLicenseDialogOpen)
		return;

	isLicenseDialogOpen = true;
	yasoon.dialog.open({
		width: 720,
		height: 610,
		title: 'Your trial has expired',
		resizable: false,
		htmlFile: 'Dialogs/purchase.html',
		initParameter: {
			baseUrl: jira.settings.baseUrl
		},
		closeCallback: function () {
			isLicenseDialogOpen = false;
		}
	});
}

function getJiraMarkupRenderer() {
	var inTableCount = 0;
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
				
			if (style.color && style.color != '#1F497D') //Do not add Outlook standard blue as markup
				result = '{color:' + style.color + '}' + result + '{color}';
			 
			if (style.isHeading) { //Heading needs to be the first element in line. 
				result = 'h' + style.headingSize + '. ' + result;
			}

			return prefix + result + suffix; 
		},
		renderHyperlink: function(url, label, style) {
			lastOp = 'renderHyperlink';
			
			if(label)
				return '[' + label + '|' + url + ']';
			else
				return '[' + url + ']';
		},
		renderTable: function (time) {
			//JIRA does not support nested tables
			//So we count how often renderTable has been called and only render rows & cells if inTableCount = 1.
			lastOp = 'renderTable';
			
			if (time === 0)
				inTableCount++;
			else
				inTableCount--;
		},
		renderTableRow: function (time, type) {
			if (inTableCount > 1)
				return '';

			lastOp = 'renderTableRow';
			if (time === 0)
				return '|';
			else if(time === 1)
				return '\n';
				
			return '';
		},
		renderTableCell: function (time, rowType, colType) {
			if (inTableCount > 1)
				return '';

			lastOp = 'renderTableCell';
			if(time === 1)
				return '|'; 
		},
		renderNewLine: function () {
			if(inTableCount > 0 && lastOp === 'newLine')
				return '';
			if (inTableCount > 1 && lastOp === 'renderTable') //We ignore nested tables, so ignore their linebreaks as well.
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

function jiraGetProducts() {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.license.getActiveProducts(resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}
//@ sourceURL=http://Jira/functions.js