
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
		title: yasoon.i18n('dialog.trialExpiredDialogTitle'),
		resizable: false,
		htmlFile: 'dialogs/purchase.html',
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
	var lastColor = '';

	var reservedChars = [
		{ char: '|', regex: '\\|' },
		{ char: '*', regex: '\\*' },
		{ char: '+', regex: '\\+' },
		{ char: '_', regex: '\\_' },
		{ char: '-', regex: '\\-' },
		{ char: '!', regex: '\\!' }
	];

	function escapeText(text) {
		reservedChars.forEach(function (c) {
			text = text.replace(new RegExp(c.regex, 'g'), '\\' + c.char);
		});
		return text;
	}

	return new MailRenderer({
		renderTextElement: function (text, style, context) {
			lastOp = 'renderTextElement';

			//Escape characters that would change the markup (|,* , etc)
			text = escapeText(text);
			if (context && context.inHyperlink)
				return text;

			//Trim the spaces away and restore them later
			var trimmedText = text.trim();
			var prefix = text.substring(0, text.indexOf(trimmedText));
			var suffix = text.substring(text.indexOf(trimmedText) + trimmedText.length, text.length);
			var result = trimmedText;

			if (style.isBold)
				result = '*' + result + '*';

			if (style.isItalic)
				result = '_' + result + '_';

			if (style.isUnderline)
				result = '+' + result + '+';

			if (style.isStrikethrough)
				result = '-' + result + '-';

			if (style.color && style.color != '#1F497D' && style.color != '#000000') //Do not add Outlook standard blue or black as markup
				result = '{color:' + style.color + '}' + result + '{color}';

			if (style.isHeading) { //Heading needs to be the first element in line. 
				result = 'h' + style.headingSize + '. ' + result;
			}

			return prefix + result + suffix;
		},
		renderImage: function (image) {
			return '!' + image + '!';
		},
		renderHyperlink: function (url, label, style) {
			lastOp = 'renderHyperlink';

			if (label)
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
			else if (time === 1)
				return '\n';

			return '';
		},
		renderTableCell: function (time, rowType, colType) {
			if (inTableCount > 1)
				return '';

			lastOp = 'renderTableCell';
			if (time === 1)
				return ' |'; //Add trailing whitespace to support empty cells
		},
		renderNewLine: function () {
			if (inTableCount > 0 && lastOp === 'newLine')
				return '';
			if (inTableCount > 1 && lastOp === 'renderTable') //We ignore nested tables, so ignore their linebreaks as well.
				return '';

			lastOp = 'newLine';
			return '\n';
		},
		renderListLine: function (listLine) {
			var result = '';
			for (var i = 0; i <= listLine.indentLevel; i++) {
				if (listLine.indentStyle[i].format === 0) //decimal
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

	this.add = function (fct, args) {
		if (!$.isArray(args))
			args = [args];

		return new Promise(function (resolve, reject) {
			var promise = null;
			if (lastPromise) {
				promise = lastPromise.finally(function () {
					return fct.apply(this, args);
				});
			} else {
				promise = Promise.resolve().then(function () { return fct.apply(this, args) });
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

function jiraGetTask(id) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.getAsync(id, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAddTask(item, folderId) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.addAsync(item, folderId, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraSaveTask(item) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.saveAsync(item, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraRemoveTask(task) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.removeAsync(task, resolve, reject);
		} catch (e) {
			reject(e);
		}

	});
}

function jiraGetFolderTasks(folderId) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.getFolderTasksAsync(folderId, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraGetFolder(folderId) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.getFolderAsync(folderId, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAllFolders() {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.allFoldersAsync(resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAddFolder(id, name, data, group, pos) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.addFolderAsync({
				externalId: id,
				externalData: data,
				name: name,
				group: group,
				position: pos
			}, resolve, reject);
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