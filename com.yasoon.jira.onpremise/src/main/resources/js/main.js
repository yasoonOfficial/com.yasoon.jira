var authToken = '';
//var serverUrl = 'https://store.yasoon.com';
var serverUrl = 'http://localhost:1337';
var isInstanceRegistered = false;
var currentPage = 1;
var serverId = null;
var systemInfo = null;
var shareUserList = {};
var foundUsers = {};

Promise.config({
    // Enable cancellation.
    cancellation: true
});

$(document).ready(function() {
    //IE9 and lower do not support cross origin requests with mixed protocols (see #7 @ http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx)
    if (isIE() && isIE() <= 9 && document.location.protocol === 'http:') {
        swal("Browser issue..", "You are using Internet Explorer 9 or lower and are accessing JIRA via a non-SSL connection. Unfortunately this is not supported. Please try to register via a newer browser or contact us at support@yasoon.de", "error");
        return;
    } 
    
	loadSystemInfo()
    .then(function() {
        //Hook up Raven error logging        
        Raven.config('https://6271d99937bd403da519654c1cf47879@sentry2.yasoon.com/4', {
          tags: {
              serverId: serverId,
              key: 'onpremise'
          }
        }).install();
        
        //Check if this instance is registered
        return getIsInstanceRegistered();       
    })
    .then(function(isRegistered) {
        //Initialize the UI
        initUI(isRegistered);
        
        if (isRegistered) {
            if (authToken) {
                checkDownloadLink();
                checkProduct();
            }
            
            checkAppLink();
        }
    })
    .caught(function(e) {
        $('#unregisteredArea').hide();
        swal("Oops...", "Failed to load initial data, please contact us at support@yasoon.de", "error");
        Raven.captureMessage('Error while document ready execution!');
        Raven.captureException(e);
    });
});

function isIE () {
  var myNav = navigator.userAgent.toLowerCase();
  return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
}

function loadSystemInfo(cbk) {
    return Promise.resolve($.ajax({
        url: 'sysinfo',
        type: 'get'
    }))
    .then(function(info) {
        if(typeof(info) === 'string')
            systemInfo = JSON.parse(info);
        else
            systemInfo = info;
        
        serverId = systemInfo.serverId || systemInfo.licenses[0].serverId;
    });
}

function getIsInstanceRegistered() {
    return Promise.resolve($.ajax({
        url: serverUrl + '/jira/isInstanceRegistered',
        data: { 
            serverId: serverId,
            baseUrl: systemInfo.baseUrl
        },
        type: 'GET'
    }))
    .then(function(data) {
        return data.registered;
    });
}

function onUserDialogOpen() {
    $('#userNameSearch').val('t').trigger('change');
    $('#userNameSearchTrigger').unbind().click(dialogSearch).trigger('click');
    $('#selectUsers').unbind().click(selectUsers);
}

function renderUserChip(userKey, userName, profilePicUrl) {
    return '<div id="' + userKey + '" class="chip">' +
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
        shareUserList[key] = foundUsers[key];        
        var html = renderUserChip(key, shareUserList[key].displayName, shareUserList[key].avatarUrls['48x48']);
        $(html).appendTo('#userChips').children('i').click(removeUserChip);
    }
    
    $('#userPicker').closeModal();
}

function dialogSearch() {
    var term = $('#userNameSearch').val();
    Promise.resolve($.get(systemInfo.baseUrl + '/rest/api/2/user/search?username=' + term))
    .then(function(users) {
        $('#userPickerList').html('');
        foundUsers = [];
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            foundUsers[user.key] = user;
            $('#userPickerList').append('<li class="collection-item avatar">' + 
								'<img src="' + user.avatarUrls['48x48'] + '" alt="" class="circle">'+
								'<span class="title">' + user.displayName + '</span>'+
								'<p class="grey-text text-lighten-1">' +
									user.emailAddress +
								'</p>' + 
								'<span class="secondary-content"><input type="checkbox" class="filled-in" id="' + user.key +
                                '" /><label for="' + user.key + '"></label></span></li>');
        }
                				
        $('.collection-item.avatar').unbind().click(function(e) {
            $(this).find('input').prop("checked", !$(this).find('input').prop("checked"));
            e.stopPropagation();
        });
    });
}

function loadRegisteredUIState() {
    checkAppLink();
    checkDownloadLink();
    checkProduct();
}

function initUI(isRegistered) {    
    //Hide page loader first
    $('#pageLoading').hide();
    
    if (isRegistered) {
        if($.cookie('yasoonAuthToken')) {
            authToken = $.cookie('yasoonAuthToken');
            $('#registeredArea').show();
            $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
            loadRegisteredUIState();
        }
        else {
            $('#AreaLogin').removeClass('hidden'); 
        }
    }
    else {  
        $('#unregisteredArea').show();  
        $('ul.tabs').tabs('select_tab', 'tab1');    
        $('#AreaPreRegister').removeClass('hidden');        
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
        
    //Init Modals & Tooltips
    $('[data-toggle="popover"]').popover({
		trigger: "hover",
		placement: "right"
	});
	
	$('.modal-trigger').leanModal({
        ready: onUserDialogOpen
    });

    $('.send-message').click(function(e) {
        //zE(function() {
        //    zE.activate();
        //});
    });
      
    $('#next').click(handleNext);
    $('#addApplicationLinkButton, #addApplicationLinkButtonMain').click(handleAddApplicationLink);
    $('#loginYasoonButton').click(handleLogin);
        
    //Prefill Wizard
    var userNameSplitted = systemInfo.userName.split(' ');
    if (userNameSplitted && userNameSplitted.length > 1) {
        $('#first_name').val(userNameSplitted[0]).trigger('change');
        $('#last_name').val(systemInfo.userName.replace(userNameSplitted[0] + ' ', '')).trigger('change');
    }
    
    $('#emailAddress').val(systemInfo.userEmailAddress).trigger('change');
}

function handleLogin() {
    //Transform data                    
    var formArray = $('#loginForm').serializeArray();
    var formData = {};
    $.each(formArray, function (i, elem) {
        formData[elem.name] = elem.value;
    });

    var instanceData = {
        clientKey: serverId,
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
                url: serverUrl + '/api/user/auth',
                contentType: 'application/json',
                data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
                processData: false,
                type: 'POST'
            })
            .done(function (auth) {
                authToken = auth;
                $.cookie('yasoonAuthToken', authToken);
                $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);

                $('#RegisteredArea').show();
                $('#LoginArea').hide();
                loadRegisteredUIState();
                success();
            })
            .fail(function (jxqr, e) {
                Raven.captureMessage('Error during login: ' + e);
                alert('Login failed, probably invalid credentials.');
                reject();
            });
        });
    } 
    //B) Login case with new instance
    // -----------------------------------
    else {
        promise = Promise.resolve($.ajax({
            url: serverUrl + '/api/user/auth',
            contentType: 'application/json',
            data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
            processData: false,
            type: 'POST'
        }))
        .caught(function(e) {
            Raven.captureMessage('Error during login: ' + e);
            swal("Oops...", "Login failed, probably invalid credentials.", "error");
            promise.cancel();
        })
        .then(function (auth) {
            authToken = auth;
            $.cookie('yasoonAuthToken', authToken);
            $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
            
            return $.ajax({
                url: serverUrl + '/jira/install',
                contentType: 'application/json',
                data: JSON.stringify(instanceData),
                processData: false,
                type: 'POST'
            });
        })
        .then(function (result) {
            return $.ajax({
                url: serverUrl + '/jira/assigncompany',
                contentType: 'application/json',
                data: JSON.stringify({ 
                    serverId: serverId,
                    baseUrl: systemInfo.baseUrl
                }),
                headers: { userAuthToken: authToken },
                processData: false,
                type: 'POST'
            });
        })
        .then(function () {
            $('#registeredArea').show();
            $('#loginArea').hide();
            loadRegisteredUIState();
        })
        .caught(function (e) {
            Raven.captureMessage('Error during assignCompany: ' + e);
            alert('An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.');
        });
    }
    
    return promise;
}

function handleAddApplicationLink() {
    $('#addApplicationLinkButton').text('Creating link...').prop("disabled", true);
    $('#addApplicationLinkButtonMain').text('Creating...').prop("disabled", true);

    //First, generate certificate
    var keyData = null;
    
    Promise.resolve($.ajax({
        url: serverUrl + '/api/support/genkeypair',
        type: 'GET'
    }))
    .then(function(data) {
        //Create the OAuth service on yasoon side
        keyData = data;                         
        return $.ajax({
            url: serverUrl + '/jira/oauth',
            contentType: 'application/json',
            data: JSON.stringify({ 
                clientCertificate: data.pkcs12,
                serverId: serverId,
                baseUrl: systemInfo.baseUrl
            }),
            headers: { userAuthToken: authToken },
            processData: false,
            type: 'POST'
        });
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
        alert('An error occurred while creating the application link. Please contact us via the green help button, we\'ll fix this quickly.');
    })
    .then(function() {
        return checkAppLink();
    })
    .then(function(exists) {
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
    else if (currentPage === 5) {
        $('#unregisteredArea').hide();
        $('#registeredArea').show();
        loadRegisteredUIState();
    }
    else {
        gotoNextPage();
    }    		
}

function gotoNextPage() {    
    $('ul.tabs :nth-child(' + currentPage + ')').addClass('disabled finished');
    currentPage++;
    $('ul.tabs :nth-child(' + currentPage + ')').removeClass('disabled');
    $('ul.tabs').tabs('select_tab', 'tab' + currentPage);
    
    if (currentPage === 2) {
        $('#next').prop('disabled', true);
        $('#nextText').text('Next');
        checkAppLink().then(function(appLinkExists) {
            if (appLinkExists) {
                $('#next').prop("disabled", false);
            }
        });       
    }
    else if (currentPage === 3) {
        $('#nextText').text('It\'s working!');
        checkDownloadLink();
    }
    else if (currentPage === 4) {
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
        url: serverUrl + '/api/company/register',
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
        
        var instanceData = {
            clientKey: serverId,
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
            url: serverUrl + '/jira/install',
            contentType: 'application/json',
            data: JSON.stringify(instanceData),
            processData: false,
            type: 'POST'
        });
    })
    .then(function (result) {        
        //User created... Get authorization token
        return $.ajax({
            url: serverUrl + '/api/user/auth',
            contentType: 'application/json',
            data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
            processData: false,
            type: 'POST'
        });
    })
    .then(function (auth) {
        authToken = auth;
        $.cookie('yasoonAuthToken', authToken);
        $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
           
        return $.ajax({
            url: serverUrl + '/jira/assigncompany',
            contentType: 'application/json',
            data: JSON.stringify({ 
                serverId: serverId,
                baseUrl: systemInfo.baseUrl
            }),
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

function getUrlParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function checkProduct() {
    $.ajax({
        url: serverUrl + '/api/company/activeproducts',
        headers: { userAuthToken: authToken },
        type: 'GET'
    }).done(function (data) {
        var product = null;
        if (data.length > 0) {
            //Find correct product
            var products = data.filter(function(el) { return el.product === 5; });
            
            if (products.length === 1) {
                product = data[0];
            }
            else if (products.length > 1) {
                var newestDate = new Date();
                for(var i = 0; i < products.length; i++) {
                    if (products[i].validUntil > newestDate){
                        newestDate = products[i].validUntil;
                        product = products[i];
                    }
                }
            }
        }
        
        if (!product || new Date(product.validUntil).getTime() < new Date().getTime()) {
            //License Outdated
            $('#trialExpired').show();
        } else if (new Date(product.validUntil).getTime() < new Date(2099, 10, 1).getTime()) {
            $('#JiraExpirationDate').text(new Date(product.validUntil).toLocaleDateString());
            $('#trialStatus').show();
        } else {
            //License Ok
            $('#JiraSupportDate').text(new Date(product.parameters.supportUntil).toLocaleDateString());
            $('#purchasedStatus').show();
        }
    })
    .fail(function () {
        
    }); 
}

function checkDownloadLink() {
    $.ajax({
        url: serverUrl + '/api/company/build',
        type: 'GET',
        headers: { userAuthToken: authToken }
    })
    .done(function(infos) {
        if(infos.state !== 5) {
            setTimeout(checkDownloadLink, 10000);
            $('#downloadLinkReady, #downloadReady').hide();
            $('#downloadLinkWaiting, #downloadLoading').show();
        }                
        else {
            $('#downloadSetupButton, #downloadSetupButtonMain').prop('href', infos.downloadUrl);
            $('#downloadLink').val(infos.downloadUrl);
            $('#downloadLinkStatus').removeClass('panel-warning').addClass('panel-success');
            $('#downloadLinkWaiting, #downloadLoading').hide();
            $('#downloadLinkReady, #downloadReady').show();
        }
    })
    .fail(function(e) {
        if (e.statusCode === 401) {
            $.removeCookie('yasoonAuthToken');
            location.reload();
            return;
        }
        
        setTimeout(checkDownloadLink, 10000);
    });
}

function checkAppLink() {
    return Promise.resolve($.ajax({
        url: 'applink',
        type: 'GET'
    }))
    .then(function(applink) {
        if(typeof(applink) === 'string')
            applink = JSON.parse(applink);
        
        if(applink.exists) {
            $('#appLinkStatus').removeClass('panel-warning').addClass('panel-success');
            $('#addApplicationLinkButton').prop('disabled', true).text('Application Link Active!');
            $('#applicationLinkActive').show();
            $('#applicationLinkInactive').hide();
        }
        else {
            $('#appLinkStatus').removeClass('panel-success').addClass('panel-warning');
            $('#addApplicationLinkButton').prop('disabled', false).text('Create Application Link');
            $('#applicationLinkInactive').show();
            $('#applicationLinkActive').hide();
        }
        
        return applink.exists;
    });
}