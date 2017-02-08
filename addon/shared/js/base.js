function getUrlParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function setInstanceProperty(property, valueObj) {
    if (isCloud) {
        return new Promise(function (resolve, reject) {
            AP.require(['request'], function (request) {
                request({
                    url: '/rest/atlassian-connect/1/addons/com.yasoon.jira.cloud/properties/' + property,
                    type: 'PUT',
                    data: JSON.stringify(valueObj),
                    contentType: "application/json",
                    success: function (responseText) {
                        resolve();
                    },
                    error: function () {
                        reject('Could not set Instance Property');
                    }
                });
            });
        })
            .caught(function () {
                return '';
            });
    } else {
        return Promise.resolve($.ajax({
            url: 'pluginsettings',
            type: 'POST',
            data: JSON.stringify({ key: property, value: valueObj }),
            contentType: "application/json"
        }))
            .caught(function () {
                return '';
            });
    }
}

function getInstanceProperty(property) {
    if (isCloud) {
        return new Promise(function (resolve, reject) {
            AP.require(['request'], function (request) {
                request({
                    url: '/rest/atlassian-connect/1/addons/com.yasoon.jira.cloud/properties/' + property,
                    type: 'GET',
                    contentType: "application/json",
                    success: function (responseText) {
                        resolve(JSON.parse(responseText));
                    },
                    error: function () {
                        reject('Could not get Instance Property');
                    }
                });
            });
        })
            .caught(function () {
                return '';
            });
    } else {
        return Promise.resolve($.get('pluginsettings?key=' + property))
            .then(function (result) {
                return result.value;
            })
            .caught(function () {
                return '';
            });
    }
}

function getStoreUrl() {
    return Promise.resolve($.get('https://routing.yasoon.de/getjiraurl?clientKey=' + serverId))
        .then(function (result) {
            return result.url;
        })
        .caught(function () {
            return 'https://store.yasoon.com';
        });
}

function getSeverIdFromJwt(jwt) {
    var jwtParts = jwt.split('.');
    //Part 0: Technical Header data: "{"typ":"JWT","alg":"HS256"}"
    //Part 1: Interesting Jira data: "{"sub":"admin","qsh":"9be61b3cd841396b4752c5642d6f2373cad510f7bfbba7241eae75d6efbacaf1","iss":"jira:1d8e5359-761b-410f-8924-bb4e93b89f94","context":{"user":{"userKey":"admin","username":"admin","displayName":"admin"}},"exp":1484155945,"iat":1484155765}"
    //Part 2: Signature

    var jiraData = JSON.parse(atob(jwtParts[1]));
    return jiraData.iss;
}

function loadSystemInfo() {
    if (isCloud) {
        return new Promise(function (resolve, reject) {
            AP.require('request', function (request) {
                request({
                    url: '/rest/api/2/myself',
                    type: 'GET',
                    success: function (user) {
                        user = JSON.parse(user);
                        systemInfo.userName = user.displayName || '';
                        systemInfo.userEmailAddress = user.emailAddress || '';
                        serverId = getSeverIdFromJwt(jwtToken);
                        resolve();
                    },
                    error: function (response) {
                        reject('Could not load own Jira user: ' + reponse);
                    }
                });
            });
        });
    } else {
        return Promise.resolve($.ajax({
            url: 'sysinfo',
            type: 'get'
        }))
            .then(function (info) {
                systemInfo = info;

                serverId = systemInfo.serverId || systemInfo.licenseInfo.instances[0].serverId;

                if (systemInfo.licenseInfo.addon)
                    sen = systemInfo.licenseInfo.addon.supportEntitlementNumber;
                else {
                    throw 'MissingTrial';
                }
            });
    }
}