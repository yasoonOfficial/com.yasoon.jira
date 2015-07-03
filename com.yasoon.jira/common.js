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

		if (result.length === 1) {
			return yasoon.io.getLinkPath(result[0].fileName);
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
				reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText));
			},
			success: function jiraGetSuccess(data) {
				resolve(data);
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
				reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText, data));
			},
			success: function jiraAjaxSuccess(data) {
				resolve(data);
			}
		};
		yasoon.oauth(request);
	});
}

function jiraSyncError(message, statusCode, errorText, data) {
	this.message = message;
	this.name = "SyncError";
	this.statusCode = statusCode;
	this.errorText = errorText;
	this.data = data;
}

jiraSyncError.prototype = Object.create(Error.prototype);
//@ sourceURL=http://Jira/common.js