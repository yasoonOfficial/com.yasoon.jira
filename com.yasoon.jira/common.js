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
		var fileName = 'Images\\' + jiraCreateHash(url) + '.png';
		console.log(url + ' : ' + fileName);
		//Download File
		yasoon.io.download(url, fileName, false, function () {
			//Success Handler --> update IconBuffer to local URL
			var result = iconBuffer.filter(function (elem) { return elem.url == url; });
			if (result.length === 1) {
				result[0].fileName = fileName;
			}
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

		//Only map if mappping to local URL exist
		if (result.length === 1) {
			if (result[0].fileName.indexOf('http') !== 0)
				return yasoon.io.getLinkPath(result[0].fileName);
			else
				return url;
		} else {
			//Does file exist on DB?
			var fileName = 'Images\\' + jiraCreateHash(url) + '.png';
			if (yasoon.io.exists(fileName)) {
				iconBuffer.push({ url: url, fileName: fileName });
				return yasoon.io.getLinkPath(fileName);
			} else {
				return saveIcon(url);
			}
			
		}
	};

	this.addIcon = function (url) {
		var result = iconBuffer.filter(function (elem) { return elem.url == url; });
		if (result.length === 0) {
			saveIcon(url);
		}
	};
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
//@ sourceURL=http://Jira/common.js