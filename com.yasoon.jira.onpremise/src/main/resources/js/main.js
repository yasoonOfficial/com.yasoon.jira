var authToken = '';
var yasoonServerUrl = 'https://store.yasoon.com';
//var yasoonServerUrl = 'http://localhost:1337';
var isInstanceRegistered = false;
var currentPage = 1;
var serverId = null;
var sen = null;
var systemInfo = {};
var shareUserList = {};
var foundUsers = {};
var isCloud = false;
var jwtToken = null;

Promise.config({
    // Enable cancellation.
    cancellation: true
});

$(document).ready(function () {
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
        if(isCloud)
            AP.sizeToParent();
        
        loadSystemInfo()
        .then(function () {
            //Hook up Raven error logging        
            Raven.config('https://6271d99937bd403da519654c1cf47879@sentry2.yasoon.com/4', {
                tags: {
                    serverId: serverId,
                    key: 'onpremise'
                }
            }).install();

            if (systemInfo.userName && systemInfo.userEmailAddress) {
                zE(function () {
                    zE.identify({
                        ze23772381: 'JIRA for Outlook',
                        name: systemInfo.userName,
                        email: systemInfo.userEmailAddress
                    });
                });
            }

            //Check if this instance is registered
            return getIsInstanceRegistered();
        })
        .then(function (isRegistered) {
            isInstanceRegistered = isRegistered;
            //Initialize the UI
            initUI(isRegistered);

/*
            if (isRegistered) {
                if (authToken) {
                    checkDownloadLink();
                    checkProduct();
                }

                checkAppLink();
            } */
        })
        .caught(function (e) {
            console.log(e);
            swal("Oops...", "Failed to load initial data, please contact us at support@yasoon.de", "error");
            try {
                Raven.captureMessage('Error while document ready execution!');
                Raven.captureException(e);
            } catch(ex) {
                console.log('Raven is not initialized yet', ex);
            }
        });
    }).caught(function (e) {
        console.log(e);
        swal("Oops...", "Failed to load nessecary files, please contact us at support@yasoon.de", "error");
    });
});



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
                        resolve();
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

                serverId = systemInfo.serverId;
                if (systemInfo.licenses && systemInfo.licenses.length > 0) {
                    serverId = serverId ||  systemInfo.licenses[0].serverId;
                    sen = systemInfo.licenses[0].supportEntitlementNumber;
                }
            });
    }
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

function loadRegisteredUIState() {
    checkAppLink();
    checkDownloadLink();
    checkProduct();
    getCustomCert();
}

function initUI(isRegistered) {
    console.log('initUi', isRegistered);
    $('.wizard').bootstrapWizard();
    //Hide page loader first
    $('#pageLoading').hide();

    var cookiePage = $.cookie('currentPage');
    if (cookiePage) {
        currentPage = parseInt(cookiePage);
    }

    if (isRegistered && (currentPage === 1 || currentPage > 4)) {
        if ($.cookie('yasoonAuthToken')) {
            authToken = $.cookie('yasoonAuthToken');
            $('#AreaRegistered').removeClass('hidden');
            $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
            loadRegisteredUIState();
        }
        else {
            $('#AreaLogin').removeClass('hidden');
        }
    }
    else {
        if (currentPage === 1 || currentPage > 4) {
            currentPage = 1;
            setTimeout(function () {
                $('ul.tabs').tabs('select_tab', 'tab1');
            }, 1);
            $('#AreaPreRegister').removeClass('hidden');
        } else {
            authToken = $.cookie('yasoonAuthToken');
            gotoPage(currentPage);
        }
        $('#AreaUnregistered').removeClass('hidden');
    }

    $('#ButtonLogin').click(function () {
        $('#AreaPreRegister').addClass('hidden');
        $('#AreaInitialLogin').removeClass('hidden');
        $('#nextText').text('Login');
        $('#next').data('type', 'login').removeClass('hidden');
    });

    $('#ButtonRegister').click(function () {
        $('#AreaPreRegister').addClass('hidden');
        $('#AreaRegister').removeClass('hidden');
        $('#nextText').text('Register');
        $('#next').data('type', 'register').removeClass('hidden');
    });

    //Init Modals
    $('.modal-trigger').leanModal({
        ready: onUserDialogOpen
    });
    

    if (isCloud) {
        $('.subscribeLink').attr('href', systemInfo.baseUrl + '/plugins/servlet/upm');
        $('.applicationCreateLink').attr('href', systemInfo.baseUrl + '/plugins/servlet/applinks/listApplicationLinks');
        $('.checkCloudApplicationLink').click(handleCheckCloudApplicationLink);
        $('.showCustomCertLink').leanModal();
    } else {
        $('.purchaseDialogLink').leanModal();
    }
    

    //Init Popover
    $('[data-toggle="popover"]').popover({
        trigger: "hover",
        placement: "right"
    });

    $('.send-message').click(function (e) {
        zE(function () {
            zE.activate();
        });
    });

    $('#manualInviteButton').click(function () {
        $('#UserEmailForm')
            .html('')
            .attr('action', yasoonServerUrl + '/api/support/createJiraInvite?authToken=' + authToken);


        Object.keys(shareUserList).forEach(function (key) {
            var currentUser = shareUserList[key];
            $('#UserEmailForm').append('<input type="hidden" name="emails[]" value="' + currentUser.emailAddress + '"/>');
        });

        $('#UserEmailForm').trigger('submit');
    });

    $('.licenseRefresh').click(refreshLicense);

    $('#next').click(handleNext);
    $('#addApplicationLinkButton, #addApplicationLinkButtonMain').click(handleAddApplicationLink);
    $('#LoginYasoonButton').click(handleLogin);

    //Prefill Wizard
    if (systemInfo.userName) {
        var userNameSplitted = systemInfo.userName.split(' ');
        if (userNameSplitted && userNameSplitted.length > 1) {
            $('#first_name').val(userNameSplitted[0]).trigger('change');
            $('#last_name').val(systemInfo.userName.replace(userNameSplitted[0] + ' ', '')).trigger('change');
        }
    }

    $('#emailAddress').val(systemInfo.userEmailAddress).trigger('change');
}

function handleLogin() {

    //Transform data                    
    var formArray = (isInstanceRegistered) ? $('#LoginForm').serializeArray() : $('#InitialLoginForm').serializeArray();
    var formData = {};
    $.each(formArray, function (i, elem) {
        formData[elem.name] = elem.value;
    });

    var instanceData = {
        clientKey: serverId,
        supportEntitlementNumber: sen,
        baseUrl: systemInfo.baseUrl,
        key: 'com.yasoon.jira.onpremise',
        pluginsVersion: systemInfo.pluginVersion,
        description: 'Jira on Premise',
        productType: 'jira',
        serverVersion: systemInfo.version,
        licenseInfo: systemInfo.licenses
    };

    //A) Login case with existing instance
    // -----------------------------------
    var promise = null;
    if (isInstanceRegistered) {


        promise = new Promise(function (success, reject) {
            $.ajax({
                url: yasoonServerUrl + '/api/user/auth',
                contentType: 'application/json',
                data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
                processData: false,
                type: 'POST'
            })
                .done(function (auth) {
                    authToken = auth;
                    $.cookie('yasoonEmail', formData.emailAddress);
                    $.cookie('yasoonAuthToken', authToken);
                    $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);

                    $('#AreaRegistered').removeClass('hidden');
                    $('#AreaLogin').addClass('hidden');
                    loadRegisteredUIState();
                    success();
                })
                .fail(function (jxqr, e) {
                    Raven.captureMessage('Error during login: ' + e);
                    swal("Oops...", "Login failed! Please check your credentials", "error");
                    reject();
                });
        });
    }
    //B) Login case with new instance
    // -----------------------------------
    else {
        promise = Promise.resolve($.ajax({
            url: yasoonServerUrl + '/api/user/auth',
            contentType: 'application/json',
            data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
            processData: false,
            type: 'POST'
        }))
            .caught(function (e) {
                Raven.captureMessage('Error during login: ' + e);
                swal("Oops...", "Login failed! Please check your credentials.", "error");
                promise.cancel();
            })
            .then(function (auth) {
                authToken = auth;
                $.cookie('yasoonEmail', formData.emailAddress);
                $.cookie('yasoonAuthToken', authToken);
                $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
                if (isCloud)
                    return;

                return $.ajax({
                    url: yasoonServerUrl + '/jira/install',
                    contentType: 'application/json',
                    data: JSON.stringify(instanceData),
                    processData: false,
                    type: 'POST'
                });
            })
            .then(function (result) {
                return $.ajax({
                    url: yasoonServerUrl + '/jira/assigncompany',
                    contentType: 'application/json',
                    data: JSON.stringify(getIdentifyingParams()),
                    headers: { userAuthToken: authToken },
                    processData: false,
                    type: 'POST'
                });
            })
            .caught(function (e) {
                Raven.captureMessage('Error during assignCompany: ' + e);
                swal("Oops...", 'An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.', "error");

                promise.cancel();
            });
    }

    return promise;
}
function handleCheckCloudApplicationLink () {
    //Add Spinner & disabled
    $('.checkCloudApplicationLink').find('.link-text').text('Refreshing').prop('disabled', true);
    checkAppLink()
        .then(function (applinkExist) {
            //If it exist, it swiches to another box, so we don't need to do anything here.
        })
        .lastly(function () {
            $('.checkCloudApplicationLink').find('.link-text').text('Refresh').prop('disabled', true);
        });
}

function handleAddApplicationLink() {
    $('#addApplicationLinkButton').text('Creating link...').prop("disabled", true);
    $('#addApplicationLinkButtonMain').text('Creating...').prop("disabled", true);

    //First, generate certificate
    var keyData = null;

    genKeyPair()
        .then(function (certInfo) {
            return createOAuthService(certInfo.pkcs12);
        })
        .then(function () {
            //Create the app link
            return $.ajax({
                url: 'applink',
                contentType: 'application/json',
                data: JSON.stringify({ cert: keyData.certificate }),
                processData: false,
                type: 'POST'
            });
        })
        .caught(function (e) {
            Raven.captureMessage('Error during oauth update: ' + e);
            swal("Oops...", 'An error occurred while creating the application link. Please contact us via the help button and we\'ll fix this quickly.', "error");
        })
        .then(function () {
            return checkAppLink();
        })
        .then(function (exists) {
            if (exists) {
                $('#next').prop('disabled', false);
            }
        });
}

function handleNext() {
    //Todo: Checks
    if (currentPage === 1) {
        var type = $('#next').data('type');
        $('#next').prop("disabled", true);
        if (type === 'register') {

            registerAccount(function (result) {
                $('#next').prop("disabled", false);

                if (result.success) {
                    gotoNextPage();
                }
                else if (result.error) {
                    //Highlight error fields
                    $('#' + result.error).addClass('invalid');

                    if (result.message)
                        swal("Oops...", result.message, "error");
                    else
                        swal("Oops...", "Please fill out all fields to continue!", "error");
                }
                else if (result.message) {
                    swal("Oops...", result.message, "error");
                }
            });
        } else if (type === 'login') {

            return handleLogin()
                .then(function () {
                    gotoNextPage();
                })
                .caught(function () {
                    swal("Oops...", "Login did not work. Please try again.", "error");
                })
                .lastly(function () {
                    $('#next').prop("disabled", false);
                });
        }
    }
    else if (currentPage === 2) {
        if (isCloud) {
            return checkAppLink()
            .then(function (appLinkExists) {
                if (appLinkExists)
                    gotoNextPage();
                else {
                    swal({
                        title: "Are you sure?",
                        text: "We could not find a correctly configured application link and JIRA for Outlook may not work until you have created it. ",
                        type: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Continue anyway",
                        cancelButtonText: "Cancel",
                    },
                    function successHandler(isConfirm){
                        if (isConfirm)
                            gotoNextPage();    
                    });

                }
            });
        } else {
            gotoNextPage();  
        }
    }
    else if (currentPage === 4) {
        $('#AreaUnregistered').addClass('hidden');
        $('#AreaRegistered').removeClass('hidden');
        $.cookie('currentPage', "1");
        loadRegisteredUIState();
    }
    else {
        gotoNextPage();
    }
}

function gotoNextPage() {
    currentPage++;
    $.cookie('currentPage', currentPage);
    gotoPage(currentPage);
}

function gotoPage(newPage) {
    console.log('GotoPage:', newPage);
    //Disable all previous steps
    for (var a = 1; a < newPage; a++) {
        $('ul.tabs :nth-child(' + a + ')').addClass('disabled finished');
    }
    //Enable current step
    $('ul.tabs :nth-child(' + newPage + ')').removeClass('disabled');
    setTimeout(function () {
        $('ul.tabs').tabs('select_tab', 'tab' + newPage);
    }, 1);

    if (newPage > 1) {
        $('#next').removeClass('hidden');
    }

    if (newPage === 2) {
        if (isCloud) {
            $('#nextText').prop('disabled', true).text('Loading...');
            getCustomCert()
            .then(function (cert) {
                if (!cert.customCert) {
                    return cloudUpdateCerts();
                }
            })
            .then(function () {
                $('#nextText').prop('disabled', false).text('Yes, Application Link created!');
            })
            .caught(function () {
                swal("Oops...", "Could not generate Certificates. Please reload to page to try again or contact us via the help button below.", "error");
            });
        } else {
            $('#next').prop('disabled', true);
            $('#nextText').text('Next');
            checkAppLink().then(function (appLinkExists) {
                if (appLinkExists) {
                    $('#next').prop("disabled", false);
                }
            });
        }
    }
    else if (newPage === 3) {
        $('#nextText').text('Yes! It\'s working!');
        checkDownloadLink();
    }
    else if (newPage === 4) {
        $('#nextText').text('Complete Setup');
    }
}

function registerAccount(cbk) {

    //Transform data                    
    var formArray = $('#registerForm').serializeArray();
    var formData = {};
    $.each(formArray, function (i, elem) {
        formData[elem.name] = elem.value;
    });

    //Clean all invalid states
    $('.validate').removeClass('invalid');

    //Make checks
    for (var propName in formData) {
        if (formData.hasOwnProperty(propName)) {
            if (!formData[propName]) {
                return cbk({
                    success: false,
                    error: propName
                });
            }
        }
    }

    if (formData.emailAddress.indexOf("@") < 0) {
        return cbk({
            success: false,
            error: 'emailAddress',
            message: 'Please enter a valid e-mail address, it necessary to create your account.'
        });
    }

    if (formData.password !== formData.password2) {
        return cbk({
            success: false,
            error: 'password2',
            message: 'Passwords do not match, please make sure that they are identical.'
        });
    }


    //Send Data
    var promise = Promise.resolve($.ajax({
        url: yasoonServerUrl + '/api/company/register',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        processData: false,
        type: 'POST'
    }))
        .then(function (result) {
            //Means: User is already registered
            if (!result.success) {
                promise.cancel();
                return cbk({
                    success: false,
                    message: 'Account already exists. Please use login instead!'
                });
            }

            //Instance is already registered in Cloud (during Addon install Event)
            if (isCloud)
                return;

            var instanceData = {
                clientKey: serverId,
                supportEntitlementNumber: sen,
                baseUrl: systemInfo.baseUrl,
                key: 'com.yasoon.jira.onpremise',
                pluginsVersion: systemInfo.pluginVersion,
                description: 'Jira on Premise',
                productType: 'jira',
                serverVersion: systemInfo.version,
                licenseInfo: systemInfo.licenses,
                eventType: 'installed'
            };

            return $.ajax({
                url: yasoonServerUrl + '/jira/install',
                contentType: 'application/json',
                data: JSON.stringify(instanceData),
                processData: false,
                type: 'POST'
            });
        })
        .then(function () {
            //User created... Get authorization token
            return $.ajax({
                url: yasoonServerUrl + '/api/user/auth',
                contentType: 'application/json',
                data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
                processData: false,
                type: 'POST'
            });
        })
        .then(function (auth) {
            authToken = auth;
            $.cookie('yasoonEmail', formData.emailAddress);
            $.cookie('yasoonAuthToken', authToken);
            $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);

            return $.ajax({
                url: yasoonServerUrl + '/jira/assigncompany',
                contentType: 'application/json',
                data: JSON.stringify(getIdentifyingParams()),
                headers: { userAuthToken: authToken },
                processData: false,
                type: 'POST'
            });
        })
        .then(function () {
            cbk({
                success: true
            });
        })
        .caught(function (e) {
            Raven.captureMessage('Error during registration: ' + e);

            cbk({
                success: false,
                message: 'An error occurred during your registration. Please contact us via the help button, we\'ll fix this quickly.'
            });
        });
}

function checkProduct() {
    $.ajax({
        url: yasoonServerUrl + '/api/company/activeproducts',
        headers: { userAuthToken: authToken },
        type: 'GET'
    }).done(function (data) {
        var product = null;
        if (data.length > 0) {
            //Find correct product
            var products = data.filter(function (el) { return el.product === 5; });

            if (products.length === 1) {
                product = data[0];
            }
            else if (products.length > 1) {
                var newestDate = new Date();
                for (var i = 0; i < products.length; i++) {
                    if (products[i].validUntil > newestDate) {
                        newestDate = products[i].validUntil;
                        product = products[i];
                    }
                }
            }
        }

        $('#trialStatus').addClass('hidden');
        $('#trialExpired').addClass('hidden');
        $('#purchasedStatus').addClass('hidden');

        if (!product || new Date(product.validUntil).getTime() < new Date().getTime()) {
            //License Outdated
            $('#trialExpired').removeClass('hidden');
        } else if (new Date(product.validUntil).getTime() < new Date(2099, 10, 1).getTime()) {
            $('#JiraExpirationDate').text(new Date(product.validUntil).toLocaleDateString());
            $('#trialStatus').removeClass('hidden');
        } else {
            //License Ok
            $('#JiraSupportDate').text(new Date(product.parameters.supportUntil).toLocaleDateString());
            $('#JiraUserNumber').text(product.userCount);
            $('#purchasedStatus').removeClass('hidden');
        }
    })
        .fail(function () {

        });
}

var licenseRefreshActive = false;
function refreshLicense() {

    if (licenseRefreshActive)
        return;

    if (isCloud)
        return;

    licenseRefreshActive = true;
    $('.licenseRefresh').addClass('grey-text text-lighten-2');

    $.ajax({
        url: yasoonServerUrl + '/jira/checkSingleMarketplaceLicense',
        type: 'POST',
        data: JSON.stringify({
            serverId: serverId,
            sen: sen
        }),
        contentType: 'application/json',
        processData: false,
        headers: { userAuthToken: authToken }
    }).done(function (result) {
        licenseRefreshActive = false;
        $('.licenseRefresh').removeClass('grey-text text-lighten-2');

        if (result.success)
            loadRegisteredUIState();
        else
            swal("No transaction found", 'Sorry, we couldn\'t find any payment transaction yet. If the purchase was made through the Atlassian Marketplace, it may takes several hours.', "error");
    })
        .fail(function (e) {
            swal("No transaction found", 'Sorry, we couldn\'t find any payment transaction yet. If the purchase was made through the Atlassian Marketplace, it may takes several hours.', "error");
        });
}

var intervalTimer = null;
function checkDownloadLink() {
    if (intervalTimer)
        return;

    $('#downloadLinkWaiting, #downloadLoading').removeClass('hidden');
    getDownloadLink();
}

function getDownloadLink() {
    $.ajax({
        url: yasoonServerUrl + '/api/company/build',
        type: 'GET',
        headers: { userAuthToken: authToken }
    })
        .done(function (infos) {
            if (infos.state !== 5) {
                if (!intervalTimer)
                    intervalTimer = setInterval(getDownloadLink, 10000);
                $('#downloadLinkReady, #downloadReady').addClass('hidden');
                $('#DownloadLinkErrorText').text('Your JIRA for Outlook setup file is being prepared. This may take a few minutes.');
                $('#downloadLinkWaiting, #downloadLoading').removeClass('hidden');
            }
            else {
                clearInterval(intervalTimer);
                $('#downloadSetupButton, #downloadSetupButtonMain').prop('href', infos.downloadUrl);
                $('#downloadLink').val(infos.downloadUrl);
                $('#downloadLinkStatus').removeClass('panel-warning').addClass('panel-success');
                $('#downloadLinkWaiting, #downloadLoading').addClass('hidden');
                $('#downloadLinkReady, #downloadReady').removeClass('hidden');
            }
        })
        .fail(function (e) {
            if (e.statusCode === 401) {
                $.removeCookie('yasoonAuthToken');
                location.reload();
                return;
            }
            $('#downloadLinkReady, #downloadReady').addClass('hidden');
            $('#downloadLinkWaiting, #downloadLoading').removeClass('hidden');
            $('#DownloadLinkErrorText').text('Could not load JIRA for Outlook Download URL.');

            if (!intervalTimer)
                intervalTimer = setInterval(getDownloadLink, 10000);
        });
}


function checkAppLink() {
    if (isCloud) {
        return Promise.resolve($.ajax({
            url: yasoonServerUrl + '/jira/checkCloudApplicationLink?jwt=' + jwtToken,
            headers: { userAuthToken: authToken },
            type: 'GET'
        }))
            .then(function (result) {
                if (result.outhToken) {
                    $('#addApplicationLinkButton').prop('disabled', true).text('Application Link Active!');
                    $('#applicationLinkActive').removeClass('hidden');
                    $('#applicationLinkInactive').addClass('hidden');
                } else {
                    throw 'No oauth Token';
                }
                return true;
            })
            .caught(function () {
                $('#addApplicationLinkButton').prop('disabled', false).text('Create Application Link');
                $('#applicationLinkInactive').removeClass('hidden');
                $('#applicationLinkActive').addClass('hidden');
                return false;
            });

    } else {

        return Promise.resolve($.ajax({
            url: 'applink',
            type: 'GET'
        }))
            .then(function (applink) {
                if (typeof (applink) === 'string')
                    applink = JSON.parse(applink);

                if (applink.exists) {
                    $('#addApplicationLinkButton').prop('disabled', true).text('Application Link Active!');
                    $('#applicationLinkActive').removeClass('hidden');
                    $('#applicationLinkInactive').addClass('hidden');
                }
                else {
                    $('#addApplicationLinkButton').prop('disabled', false).text('Create Application Link');
                    $('#applicationLinkInactive').removeClass('hidden');
                    $('#applicationLinkActive').addClass('hidden');
                }

                return applink.exists;
            });
    }
}

function getCustomCert() {
    if (!isCloud)
        return Promise.resolve();
    
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: yasoonServerUrl + '/jira/getCustomCert',
            data: { jwt: jwtToken },
            headers: { userAuthToken: authToken },
            type: 'GET'
        }).done(function (data) {
            $('.certTextArea').val(data.customCert);
            resolve(data);
        }).fail(function () {
            reject('Could not load Custom Cert');
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

function genKeyPair() {
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: 'https://store.yasoon.com/api/support/genkeypair',
            contentType: 'application/json',
            type: 'GET'
        }).done(function (certInfo) {
            resolve(certInfo);
        }).fail(function () {
            reject('Could not generate a Certificate');
        });
    });
}

function createOAuthService(cert) {
    return new Promise(function (resolve, reject) {
        var params = getIdentifyingParams();
        params.clientCertificate = cert;
        $.ajax({
            url: yasoonServerUrl + '/jira/oauth',
            contentType: 'application/json',
            data: JSON.stringify(params),
            headers: { userAuthToken: authToken },
            processData: false,
            type: 'POST'
        })
        .done(function () {
            resolve();
        })
        .fail(function () {
            reject('Could not create oAuth Service');
        });
    });
}

function updateCustomJiraCert(cert) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: yasoonServerUrl + '/jira/updateCustomCert',
            contentType: 'application/json',
            data: JSON.stringify({ customCert: cert, jwt: jwtToken }),
            headers: { userAuthToken: authToken },
            processData: false,
            type: 'PUT'
        })
        .done(function () {
            resolve();
        })
        .fail(function () {
            reject('Could not update Custom JIRA Certificate');
        });
    });
}

function cloudUpdateCerts() {
    return genKeyPair()
        .then(function (certInfo) {
            return createOAuthService(certInfo.pkcs12)
                .thenReturn(certInfo);
        })
        .then(function (certInfo) {
            return updateCustomJiraCert(certInfo.certificate)
                .thenReturn(certInfo);
        })
        .then(function (certInfo) {
            $('.certTextArea').val(certInfo.certificate);
        });
}

// User Dialog
function onUserDialogOpen() {
    var userEmail = $.cookie('yasoonEmail');
    var splittedEmail = userEmail.split('@');
    if (splittedEmail.length === 2) {
        $('#userNameSearch').val(splittedEmail[1]).trigger('change');
    }
    $('#userNameSearchTrigger').unbind().click(dialogSearch).trigger('click');
    $('#userNameSearch').unbind().keypress(function (e) {
        if (e.which === 13) {
            dialogSearch();
            e.preventDefault();
            return false;
        }
    });

    $('#selectUsers').unbind().click(selectUsers);
}

function renderUserChip(userKey, userName, profilePicUrl) {
    return '<div id="' + userKey + '" class="chip" style="margin:10px;">' +
        '<img src="' + profilePicUrl + '" />' +
        userName + '<i class="material-icons">close</i></div>';
}

function removeUserChip(e) {
    delete shareUserList[e.target.parentNode.id];
}

function selectUsers() {
    var users = $('#userPickerList > li > span > input:checked');

    for (var i = 0; i < users.length; i++) {
        var key = users[i].id;
        //Is already rendered?
        if (!shareUserList[key]) {
            shareUserList[key] = foundUsers[key];
            var html = renderUserChip(key, shareUserList[key].displayName, shareUserList[key].avatarUrls['48x48']);
            $(html).appendTo('#userChips').children('i').click(removeUserChip);
        }
    }

    $('#userPicker').closeModal();
}
function searchUser(term) {
    if (isCloud) {
        return new Promise(function (resolve, reject) {
            AP.require('request', function (request) {
                request({
                    url: '/rest/api/2/user/search?username='  + term,
                    type: 'GET',
                    success: function (users) {
                        users = JSON.parse(users);
                        resolve(users);
                    }
                });
            });
        });
    } else {
        return Promise.resolve($.get(systemInfo.baseUrl + '/rest/api/2/user/search?username=' + term));
    }
    
}
function dialogSearch() {
    var term = $('#userNameSearch').val();
    searchUser(term)
        .then(function (users) {
            $('#userPickerList').html('');
            foundUsers = [];
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                foundUsers[user.key] = user;
                $('#userPickerList').append('<li class="collection-item avatar">' +
                    '<img src="' + user.avatarUrls['48x48'] + '" alt="" class="circle">' +
                    '<span class="title">' + user.displayName + '</span>' +
                    '<p class="grey-text text-lighten-1">' +
                    user.emailAddress +
                    '</p>' +
                    '<span class="secondary-content"><input type="checkbox" class="filled-in" id="' + user.key +
                    '" /><label for="' + user.key + '"></label></span></li>');
            }

            $('.collection-item.avatar').unbind().click(function (e) {
                $(this).find('input').prop("checked", !$(this).find('input').prop("checked"));
                e.stopPropagation();
            });
        });
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