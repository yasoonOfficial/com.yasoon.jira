var authToken = '';
var isCloud = false;
var yasoonServerUrl = '';
var isInstanceRegistered = false;
var systemInfo = {};
var serverId = null;
var yasoonUser = null;
var jwtToken = '';

Promise.config({
    // Enable cancellation.
    cancellation: true
});

$(document).ready(function () {
    //Init Zendesk
    zE(function () {
        zE.identify({ ze23772381: 'JIRA for Outlook' });
        zE.show();
    });

    //IE9 and lower do not support cross origin requests with mixed protocols (see #7 @ http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx)
    if (isIE() && isIE() <= 9) {
        swal("Browser issue..", "You are using Internet Explorer 9 or lower. Unfortunately this is not supported. Please try to register via a newer browser or contact us at support@yasoon.de", "error");
        return;
    }

    //Determine wether we are in Server or Cloud scenario.
    jwtToken = getUrlParameterByName('jwt');
    var prom = Promise.resolve();
    if (jwtToken) {
        isCloud = true;
        var context = getUrlParameterByName('cp');
        systemInfo.baseUrl = getUrlParameterByName('xdm_e') + context;
        var allJsScriptPath = systemInfo.baseUrl + '/atlassian-connect/all.js';
        prom = prom.then(function () {
            return new Promise(function (resolve, reject) {
                return jQuery.getScript(allJsScriptPath, function () {
                    resolve();
                });
            });
        });

        $('body').addClass('isCloud').addClass('ac-content');
    } else {
        $('body').addClass('isOnPremise');
    }

    prom.then(function () {
        if (isCloud) {
            //AP.sizeToParent();
            AP.resize('100%', (window.screen.availHeight - 250) + 'px');
            $('.tab-container').css('max-height', (window.screen.availHeight - 330) + 'px')
        }

        //Load token even if it may does not exist.
        authToken = $.cookie('yasoonAuthToken');

        loadSystemInfo()
            .then(function () {
                //Hook up Raven error logging
                Raven.config('https://6271d99937bd403da519654c1cf47879@sentry2.yasoon.com/4', {
                    tags: {
                        serverId: serverId,
                        key: 'onpremise'
                    }
                }).install();
                /*
                if (systemInfo.userName && systemInfo.userEmailAddress) {
                    zE(function () {
                        zE.identify({
                            ze23772381: 'JIRA for Outlook',
                            name: systemInfo.userName,
                            email: systemInfo.userEmailAddress
                        });
                    });
                }
                */
                return getStoreUrl();
            })
            .then(function (url) {
                yasoonServerUrl = url;
                //Check if this instance is registered
                return getIsInstanceRegistered();
            })
            .then(function (isRegistered) {
                isInstanceRegistered = isRegistered;

                return getOwnUser()
                    .caught(function () {
                        return null;
                    });

            }).then(function (resultUser) {
                //Initialize the UI
                yasoonUser = resultUser;
                loadUI();
                // initUI(isInstanceRegistered, ownUser);
            })
            .caught(function (e) {
                console.log(e, e.stack);
                swal("Oops...", "Failed to load initial data, please contact us at support@yasoon.de", "error");
                captureMessage('Error while document ready execution!', e);
            });
    }).caught(function (e) {
        console.log(e, e.stack);
        swal("Oops...", "Failed to load nessecary files, please contact us at support@yasoon.de", "error");
    });
});

function getStoreUrl() {
    return Promise.resolve($.get('https://routing.yasoon.de/getjiraurl?clientKey=' + serverId))
        .then(function (result) {
            return result.url;
        });
}

function getIsInstanceRegistered() {
    return Promise.resolve($.ajax({
        url: yasoonServerUrl + '/jira/isInstanceRegistered',
        data: getIdentifyingParams(),
        type: 'GET'
    }))
        .then(function (data) {
            return data.registered;
        });
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
                if (typeof (info) === 'string')
                    systemInfo = JSON.parse(info);
                else
                    systemInfo = info;

                serverId = systemInfo.serverId || systemInfo.licenseInfo.instances[0].serverId;

                if (systemInfo.licenseInfo.addon)
                    sen = systemInfo.licenseInfo.addon.supportEntitlementNumber;
            });
    }
}


function loadUI() {
    $('#pageLoading').addClass('hidden');
    if (isCloud) {
        var urlContextParam = getUrlParameterByName('xdm_c');
        var webLinkKey = urlContextParam.split('__')[1];
        if (webLinkKey) {
            // Configure and postInstalls are just aliases for admin
            if (webLinkKey === 'configure' || wenLinkKey === 'postInstall') {
                webLinkKey = 'admin';
            }
            //Make sure we are allowed to load this page
            if (webLinkKey !== 'admin' && !isInstanceRegistered) {
                //If it is not admin, we need to have a registered intance
                //-->Show Error
                $('#pageError').removeClass('hidden').text('Please register this instance first under General Overview');

            } else {
                $('#pageContent').removeClass('hidden').load(webLinkKey + '.html', function () {
                    $.getScript('js/' + webLinkKey + '.js');
                });
            }
        } else {
            $('#pageError').removeClass('hidden').text('Could not load page due to an unknown error: Page unknown');
        }
    } else {

    }
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
        });
    }
}

function getOwnUser() {
    return new Promise(function (resolve, reject) {
        if (!authToken)
            return reject('No Auth token');

        $.ajax({
            url: yasoonServerUrl + '/api/user/ownUser',
            contentType: 'application/json',
            headers: { userAuthToken: authToken },
            processData: false,
            type: 'GET'
        })
            .done(function (data) {
                resolve(data);
            })
            .fail(function () {
                reject('Auth token not valid');
            });
    });
}

function getIdentifyingParams() {
    if (isCloud) {
        return { jwt: jwtToken };
    } else {
        return {
            serverId: serverId,
            baseUrl: systemInfo.baseUrl
        };
    }
}

function isIE() {
    var myNav = navigator.userAgent.toLowerCase();
    return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
}

function getUrlParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function captureMessage(message, e) {
    if (!Raven.isSetup())
        return console.log(message, e);
    try {
        if (!e) {
            Raven.captureMessage(message);
        } else if (isError(e)) {
            //Plain JS Exception - Set message into error and log as exception
            e.message = message + ': ' + e.message;
            Raven.captureException(e);
        } else if (e.responseText) {
            //jQuery AJAX Error
            var errorText = e.responseText;
            var stackElement = $(e.responseText).find('#stacktrace');
            if (stackElement.length > 0) {
                //JIRA Error message
                //Get first characters and send it.
                errorText = stackElement.text().substr(0, 300);
            }
            Raven.captureMessage(e.statusCode + ': ' + message + ' - ' + errorText);
        } else {
            //Probably string
            Raven.captureMessage(message + ': ' + e);
        }
    } catch (ex) {
        console.log('Error while sending Raven error! ' + message, e, ex);
    }
}

function isError(what) {
    return isObject(what) &&
        Object.prototype.toString.call(what) === '[object Error]' ||
        what instanceof Error;
}

function isObject(what) {
    return typeof what === 'object' && what !== null;
}

function getSeverIdFromJwt(jwt) {
    var jwtParts = jwt.split('.');
    //Part 0: Technical Header data: "{"typ":"JWT","alg":"HS256"}"
    //Part 1: Interesting Jira data: "{"sub":"admin","qsh":"9be61b3cd841396b4752c5642d6f2373cad510f7bfbba7241eae75d6efbacaf1","iss":"jira:1d8e5359-761b-410f-8924-bb4e93b89f94","context":{"user":{"userKey":"admin","username":"admin","displayName":"admin"}},"exp":1484155945,"iat":1484155765}"
    //Part 2: Signature

    var jiraData = JSON.parse(atob(jwtParts[1]));
    return jiraData.iss;
}


ko.bindingHandlers.select2 = {
    init: function (el, valueAccessor, allBindingsAccessor, viewModel) {
        ko.utils.domNodeDisposal.addDisposeCallback(el, function () {
            $(el).select2('destroy');
        });

        var allBindings = allBindingsAccessor();
        var select2 = ko.utils.unwrapObservable(allBindings.select2);
        if (select2.dataObs) {
            select2.data = select2.dataObs();
        }

        var optionAdded = false;
        var oldValue = ko.utils.unwrapObservable(allBindings.value);
        if (oldValue && select2.dataObs) {
            var obj = select2.dataObs().filter(function (e) { return e.id == oldValue; })[0];
            if (obj) {
                $(el).append('<option value="' + obj.id + '" selected>' + obj.text + '</option>');
                optionAdded = true;
            }
        }

        $(el).select2(select2);

        if (optionAdded) {
            $(el).val(oldValue).trigger('change');
        }
    },
    update: function (el, valueAccessor, allBindingsAccessor, viewModel) {
        var allBindings = allBindingsAccessor();
        if ("value" in allBindings) {
            if ((allBindings.select2.multiple || el.multiple) && allBindings.value().constructor != Array) {
                $(el).val(allBindings.value().split(',')).trigger('change');
            }
            else {
                $(el).val(allBindings.value()).trigger('change');
            }
        } else if ("selectedOptions" in allBindings) {
            var converted = [];
            var textAccessor = function (value) { return value; };
            if ("optionsText" in allBindings) {
                textAccessor = function (value) {
                    var valueAccessor = function (item) { return item; }
                    if ("optionsValue" in allBindings) {
                        valueAccessor = function (item) { return item[allBindings.optionsValue]; }
                    }
                    var items = $.grep(allBindings.options(), function (e) { return valueAccessor(e) == value });
                    if (items.length == 0 || items.length > 1) {
                        return "UNKNOWN";
                    }
                    return items[0][allBindings.optionsText];
                }
            }
            $.each(allBindings.selectedOptions(), function (key, value) {
                converted.push({ id: value, text: textAccessor(value) });
            });
            $(el).select2("data", converted);
        }
        $(el).trigger("change");
    }
};

$.fn.sortable = function (options) {
    return sortable(this, options);
};

ko.bindingHandlers.sortable = {
    init: function (el, valueAccessor, allBindingsAccessor, viewModel) {
        var data = ko.utils.unwrapObservable(valueAccessor());
        var options = {
            items: 'li:not(.disabled)',
            forcePlaceholderSize: true,
            placeholder: '<li>&nbsp;</li>',
            handle: '.material-icons'
        };
        $(el).sortable(options);

        $(el).on('sortupdate', function (event, args) {
            var list = ko.utils.unwrapObservable(valueAccessor());
            console.log('Move from ' + args.oldindex + ' to ' + args.index, JSON.parse(JSON.stringify(list)));
            var currentItem = list.splice(args.oldindex, 1)[0];
            list.splice(args.index, 0, currentItem);

            valueAccessor()(list);
            viewModel.rerender();
            console.log('List after:', JSON.parse(JSON.stringify(list)));
        });
    },
    update: function (el, valueAccessor, allBindingsAccessor, viewModel) {
        var data = ko.utils.unwrapObservable(valueAccessor());
        setTimeout(function () { $(el).sortable('reload') }, 1);
    }
};