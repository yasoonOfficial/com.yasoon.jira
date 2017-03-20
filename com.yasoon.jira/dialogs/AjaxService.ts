/// <reference path="../definitions/yasoon.d.ts" />
declare var jira;
import { JiraPageResult } from './renderer/JiraModels';

export namespace AjaxService {

    export function get(relativeUrl: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            yasoon.oauth({
                url: jira.settings.baseUrl + relativeUrl,
                oauthServiceName: jira.settings.currentService,
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-ExperimentalApi': 'true' },
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


    export function getAll(relativeUrl: string): Promise<JiraPageResult> {
        var url = relativeUrl + ((relativeUrl.indexOf('?') > -1) ? '&start=' : '?start=');
        var data = [];

        var getData = function (offset, resolve, reject) {
            AjaxService.get(url + offset)
                .then(function (result) {
                    var response = JSON.parse(result);
                    data.push(response.values);

                    if (response.isLastPage) {
                        response.start = 0;
                        response.limit = response.start + response.size;
                        response.size = response.start + response.size;
                        response.values = data;
                        resolve(response);
                    } else {
                        getData(response.start + response.size, resolve, reject);
                    }
                })
                .catch(function (e) {
                    reject(e);
                });
        };
        return new Promise<JiraPageResult>(function (resolve, reject) {
            getData(0, resolve, reject);
        });
    }

    export function getWithHeaders(relativeUrl: string): Promise<[string, any]> {
        return new Promise<[string, any]>(function (resolve, reject) {
            yasoon.oauth({
                url: jira.settings.baseUrl + relativeUrl,
                oauthServiceName: jira.settings.currentService,
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-ExperimentalApi': 'true' },
                type: yasoon.ajaxMethod.Get,
                error: function jiraGetError(data, statusCode, result, errorText, cbkParam) {
                    reject(new jiraSyncError(relativeUrl + ' --> ' + statusCode + ' || ' + result + ': ' + errorText, statusCode, errorText, data, result));
                },
                success: function jiraGetSuccess(data, something, headers) {
                    resolve([data, headers]);
                }
            });
        });
    }

    export function ajax(relativeUrl: string, method: yasoonModel.WebRequestMethod, data?: string, formData?: any): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            if (jira.testPreventJiraGet === true) {
                return reject(new jiraSyncError(relativeUrl + ' --> 500 || Internal Testing Error: Reason', 500, 'Reason', {}, 'Error Messages'));
            }

            var request = {
                url: jira.settings.baseUrl + relativeUrl,
                oauthServiceName: jira.settings.currentService,
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck', 'X-ExperimentalApi': 'true' }, //nocheck is deprecated since REST 3.0.0 - us no-check instead
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

}



export function jiraSyncError(message, statusCode, errorText, data, result) {
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
                    result += msg + '\n';
                });
            } else if (error.errors) {
                Object.keys(error.errors).forEach(function (key) {
                    result += error.errors[key] + '\n';
                });
            } else if (error.message) {
                result = error.message;
            } else if (error.errorMessage) {
                result = error.errorMessage;
            } else {
                result = yasoon.i18n('general.unexpectedJiraError');
            }

            return result;
        } catch (e) {
            return yasoon.i18n('general.unexpectedJiraError');
        }
    };
}
jiraSyncError.prototype = Object.create(Error.prototype);

export function jiraProxyError() {
    var self = this;
}
jiraProxyError.prototype = Object.create(Error.prototype);
