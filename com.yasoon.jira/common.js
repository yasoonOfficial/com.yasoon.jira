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

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

function getUniqueKey() {
	//Use current time to get something short unique
	var currentTime = Math.round(new Date().getTime() / 1000);
	var buf = new ArrayBuffer(4);
	var view = new DataView(buf);
	view.setUint32(0, currentTime, false);
	
	var binary = '';
	var bytes = new Uint8Array(buf);
	var len = bytes.byteLength;
	for (var i = 0; i < len; i++) {
		binary += String.fromCharCode( bytes[ i ] );
	}
	
	return window.btoa( binary ).replace(/=/g, '');
}

function renderMailHeaderText(mail, useMarkup) {
	var result = '';
	
	if (useMarkup) {
		result = '*From:* ' + mail.senderName + ' <[mailto:' + mail.senderEmail + ']> \n*Sent:* ' + moment(mail.receivedAt).format('MMMM Do YYYY, h:mm a') + '\n'+ ((mail.recipients.length > 0) ? '*To:* [mailto:' + mail.recipients.join('],[mailto:') + ']\n *Subject*: '+ mail.subject + '\n----\n' : '');
	}
	else {
		result = 'From: ' + mail.senderName + ' <' + mail.senderEmail + '> \n Sent: ' + moment(mail.receivedAt).format('MMMM Do YYYY, h:mm a') + ' \n To: ' + mail.recipients.join(',') + '\n Subject: ' + mail.subject + '\n';
	}
	
	return result;
}

function jiraLog(text, obj, stacktrace) {
	if (yasoon.logLevel == 0) { //jshint ignore:line
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
		console.log(text, obj);
		yasoon.util.log(text + ' ' + json + ' ' + stack);
	}
}

function JiraIconController() {
	var self = this;
	//Contains object { url: '' , fileName: '' }
	var iconBuffer = [];

	var saveIcon = function (url) {
		//generate unique FileName
		var fileName = 'Images\\' + jiraCreateHash(url);
		console.log('Download Icon - URL: ' + url + ' : FileName: ' + fileName);
		//Download File
		yasoon.io.download(url, fileName, false, function (handle) {
			//Success Handler --> update IconBuffer to local URL
			var result = iconBuffer.filter(function (elem) { return elem.url == url; });
			if (result.length === 1) {
				result[0].fileName = 'Images\\' + handle.getFileName();
				saveSettings();
			}
			
		});

		//Temporary save URL in Buffer
		iconBuffer.push({ url: url, fileName: url });
		return url;
	};

	var saveSettings = function () {
		yasoon.setting.setAppParameter('icons', JSON.stringify(iconBuffer));
	};

	this.mapIconUrl = function (url) {
		//Avoid mapping local URLs
		
		if (url.indexOf('http') !== 0) {
			return url;
		}

		try  {
			var result = iconBuffer.filter(function (elem) { return elem.url == url; });
			if (result.length > 1) {
				//Should never happen --> remove both elements from buffer
				iconBuffer = iconBuffer.filter(function (elem) { return elem.url != url; });
				result = [];
			}

			//Only map if mappping to local URL exist
			if (result.length === 1 && result[0].fileName.indexOf('http') !== 0) {
				return yasoon.io.getLinkPath(result[0].fileName);	
			} else if (result.length === 0) {
				return saveIcon(url);
			}
		} catch (e) {
			//Can dump ... e.g. it seems to be possible to add font awesome icons without valid URL
			//This method should never dump completely as it may prevents everything from working. just return the input url
		}
		return url;
		
	};

	this.addIcon = function (url) {
		var result = iconBuffer.filter(function (elem) { return elem.url == url; });
		if (result.length === 0) {
			saveIcon(url);
		}
	};

	//Init - load data
	var settingString = yasoon.setting.getAppParameter('icons');
	if (settingString) {
		iconBuffer = JSON.parse(settingString);

		//Check consistency of buffer
		iconBUffer = iconBuffer.filter(function (entry) {
			if (entry.fileName.indexOf('http') === 0) {
				//http links should be in index only temporary --> download newly this time
				return false;
			}
			//Remove link if file does not exist
			return yasoon.io.exists('Images\\' + entry.fileName);
		});

		//console.log('Initial Icon Buffer', iconBuffer);
	}
}

function jiraGet(relativeUrl) {
	return new Promise(function (resolve, reject) {
		yasoon.oauth({
			url: jira.settings.baseUrl + relativeUrl,
			oauthServiceName: jira.settings.currentService,
			headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
			type: yasoon.ajaxMethod.Get,
			error: function jiraGetError(data, statusCode, result, errorText, cbkParam) {
				//Detect if oAuth token has become invalid
				if (statusCode == 401 && result == 'oauth_problem=token_rejected') {
					yasoon.app.invalidateOAuthToken(jira.settings.currentService);
					jira.settings.currentService = '';
					jira.settings.save();
				}

				reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText, data, result));
			},
			success: function jiraGetSuccess(data) {
				resolve(data);
			}
		});
	});
}

function jiraGetWithHeaders(relativeUrl) {
	return new Promise(function (resolve, reject) {
		yasoon.oauth({
			url: jira.settings.baseUrl + relativeUrl,
			oauthServiceName: jira.settings.currentService,
			headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
			type: yasoon.ajaxMethod.Get,
			error: function jiraGetError(data, statusCode, result, errorText, cbkParam) {
				reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText,data, result));
			},
			success: function jiraGetSuccess(data, something, headers) {
				resolve([data, headers]);
			}
		});
	});
}

function jiraAjax(relativeUrl, method, data, formData) {
	return new Promise(function (resolve, reject) {
		var request = {
			url: jira.settings.baseUrl + relativeUrl,
			oauthServiceName: jira.settings.currentService,
			headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
			data: data,
			formData: formData,
			type: method,
			error: function jiraAjaxError(data, statusCode, result, errorText, cbkParam) {
				reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText, data, result));
			},
			success: function jiraAjaxSuccess(data) {
				resolve(data);
			}
		};
		yasoon.oauth(request);
	});
}

function jiraCheckProxyError(input) {
	if (input.indexOf('<!') === 0 || input.indexOf('<html') === 0) {
		throw new jiraProxyError();
	}
}

function jiraSyncError(message, statusCode, errorText, data, result) {
	var self = this;

	this.message = message;
	this.name = "SyncError";
	this.statusCode = statusCode;
	this.errorText = errorText;
	this.data = data;
	this.result = result;

	this.getUserFriendlyError = function () {
		try {
			var result = '';
			var error = JSON.parse(self.result);
			if (error.errorMessages && error.errorMessages.length > 0) {
				error.errorMessages.forEach(function (msg) {
					result += msg + '<br />';
				});
			} else if (error.errors) {
				if (error.errors.comment) {
					result = error.errors.comment;
				} else {
					result = JSON.stringify(error.errors);
				}
			} else {
				result = 'This did not work due to an unexpected JIRA error.';
			}

			return result;
		} catch (e) {
			return 'This did not work due to an unexpected JIRA error.';
		}
	};
}
jiraSyncError.prototype = Object.create(Error.prototype);

function jiraProxyError() {
	var self = this;
}
jiraProxyError.prototype = Object.create(Error.prototype);

function jiraIsCloud(url) {
	return jiraEndsWith(url, 'jira.com') || jiraEndsWith(url, 'atlassian.net');
}

function jiraEndsWith(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getProjectIcon(project) {
	if (!project.projectTypeKey)
		return '';

	if (project.projectTypeKey === 'business')
		return 'Images/project_business.svg';
	if (project.projectTypeKey === 'service_desk')
		return 'Images/project_service.svg';
	if (project.projectTypeKey === 'software')
		return 'Images/project_software.svg';
}

//@ sourceURL=http://Jira/common.js