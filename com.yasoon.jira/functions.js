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

	this.ribbonOnNewIssue = function (ribbonId, ribbonCtx) {
		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			yasoon.dialog.showMessageBox('Please login to Jira in settings menu first!');
			return;
		}
		if (ribbonId == 'newIssue') {

			yasoon.dialog.open({
				width: 900,
				height: 650,
				title: 'New Jira Issue',
				resizable: true,
				htmlFile: 'Dialogs/newIssueDialog.html',
				initParameter: { 'settings': jira.settings, 'ownUser': jira.data.ownUser },
				closeCallback: self.ribbonOnCloseNewIssue
			});

		}
		else {
			
			var selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);

			if (!selection || !selection.trim()) {
				yasoon.dialog.showMessageBox('Please select some text first!');
				return;
			}

			yasoon.dialog.open({
				width: 900,
				height: 650,
				title: 'New Jira Issue',
				resizable: true,
				htmlFile: 'Dialogs/newIssueDialog.html',
				initParameter: { settings: jira.settings, 'ownUser': jira.data.ownUser, text: selection, mail: ribbonCtx.items[ribbonCtx.readingPaneItem] },
				closeCallback: self.ribbonOnCloseNewIssue
			});
		}
	};

	this.ribbonOnCloseNewIssue = function () {
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

function JiraIconController() {
    var self = this;
    //Contains object { url: '' , fileName: '' }
    var iconBuffer = [];

    var saveIcon = function (url) {
        //generate unique FileName
        var fileName = 'Images\\' + jiraCreateHash(url) + '.png';
        console.log(url + ' : '+ fileName);
        //Download File
        yasoon.io.download(url, fileName, false, function () {
            //Success Handler
            var result = iconBuffer.filter(function (elem) { return elem.url == url; });
            if (result.length === 1) {
                result[0].fileName = yasoon.io.getLinkPath(fileName);
            }
            yasoon.setting.setAppParameter('icons', JSON.stringify(iconBuffer));
        });

        //Temporary save URL in Buffer
        iconBuffer.push({ url: url, fileName: url });

        return url;
    };

    this.mapIconUrl = function (url) {
        //Avoid mapping local URLs
        if (url.indexOf('http') !== 0) {
            return url;
        }

        var result = iconBuffer.filter(function (elem) { return elem.url == url; });
        if (result.length > 1) {
            //Should never happen --> remove both elements from buffer
            iconBuffer = iconBuffer.filter(function (elem) { return elem.url != url; });
            result = [];
        }

        if (result.length === 1) {
            return result[0].fileName;
        } else {
            return saveIcon(url);
        }
    };

    this.addIcon = function (url) {
        var result = iconBuffer.filter(function (elem) { return elem.url == url; });
        if (result.length === 0) {
            saveIcon(url);
        }
    };
    

    // init
    var iconString = yasoon.setting.getAppParameter('icons');
    if (iconString) {
        iconBuffer = JSON.parse(iconString);
    }
}

function jiraIssueGetter() {
	var deferredObject = this.deferredObject;

	return $.Deferred(function (dfd) {
		if (deferredObject && !deferredObject.issue) {
			var issueKey = (deferredObject['activity:target']) ? deferredObject['activity:target'].title['#text'] : deferredObject['activity:object'].title['#text'];
			deferredObject.issue = jira.issues.get(issueKey);
			if (deferredObject.issue) {
				dfd.resolve();
			} else {
				jiraLog('Call Issue');
				yasoon.oauth({
					url: jira.settings.baseUrl + '/rest/api/2/issue/' + issueKey + '?expand=transitions,renderedFields',
					oauthServiceName: jira.settings.currentService,
					headers: jira.CONST_HEADER,
					type: yasoon.ajaxMethod.Get,
					error: jira.handleError,
					success: function (data) {
						deferredObject.issue = JSON.parse(data);
						dfd.resolve();
					}
				});
			}
		} else {
			dfd.resolve();
		}
	});
}

function jiraWatcherGetter() {
	var deferredObject = this.deferredObject;

	return $.Deferred(function (dfd) {
		if (deferredObject && deferredObject.fields.watches && !deferredObject.fields.watches.watchers) {
			jiraLog('Get Watchers');
			yasoon.oauth({
				url: jira.settings.baseUrl + '/rest/api/2/issue/' + deferredObject.id + '/watchers',
				oauthServiceName: jira.settings.currentService,
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: jira.handleError,
				success: function (data) {
					deferredObject.fields.watches.watchers = JSON.parse(data).watchers;
					dfd.resolve();
				}
			});
		} else {
			dfd.resolve();
		}
	});
}

function jiraLog(text, obj, stacktrace) {
	if (yasoon.logLevel === 0) {
		var stack = '';
		var json = '';
		if (stacktrace !== undefined && stacktrace) {
			try {
				var a = doesNotExit + forceException;
			} catch (e) {
				stack = '\n' + printStackTrace(e).split('\n')
					.slice(1)
					.join('\n');

			}
		}
		if (obj) {
			json = '\n' + JSON.stringify(obj);
		}

		yasoon.util.log(text + ' ' + json + ' ' + stack);
	}
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

function jiraCreateHash(input) {
    var hash = 0, i, chr, len;
    if (input.length === 0) return hash;
    for (i = 0, len = input.length; i < len; i++) {
        chr = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function jiraGetData(relativeUrl) {
    return new Promise(function (resolve, reject) {
        yasoon.oauth({
            url: jira.settings.baseUrl + relativeUrl,
            oauthServiceName: jira.settings.currentService,
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            type: yasoon.ajaxMethod.Get,
            error: function (data, statusCode, result, errorText, cbkParam) {
                reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText));
            },
            success: function (data) {
                resolve(data);
            }
        });
    });
}

function jiraAjaxData(relativeUrl, method, data) {
    //We could return $.ajax directly, but it always has 3 return parameters :-( 
    // I just want to have a single return parameter - the result --> build own deferred and only take over one parameter
    return new Promise(function (resolve, reject) {
        yasoon.oauth({
            url: jira.settings.baseUrl + relativeUrl,
            oauthServiceName: jira.settings.currentService,
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            data: data,
            type: method,
            error: function (data, statusCode, result, errorText, cbkParam) {
                reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText));
            },
            success: function (data) {
                resolve(data);
            }
        });
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
//@ sourceURL=http://Jira/functions.js