var authToken = '';
var serverUrl = 'https://store.yasoon.com';

$(document).ready(function () {
    $.ajax({
        url: 'sysinfo',
        type: 'get'
    }).done(function(systemInfo) {

        if(typeof(systemInfo) === 'string')
            systemInfo = JSON.parse(systemInfo);
        
        var serverId = systemInfo.licenses[0].serverId;    
        $.ajax({
                url: serverUrl + '/jira/isInstanceRegistered',
                data: { serverId: serverId },
                type: 'GET'
        }).done(function(data) {
                if(data.registered) {
                        if($.cookie('yasoonAuthToken')) {
                            authToken = $.cookie('yasoonAuthToken');
                            $('#RegisteredArea').show();
                            $('#storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
                            checkDownloadLink();
                        }   
                        else {
                            $('#LoginArea').show();
                        }
                        
                        checkAppLink();
                } else {
                        $('#UnregisteredArea').show();
                }
                
                $('#RegisterCompanyButton').click(function (e) {
                    
                    $('#RegisterCompanyButton').prop("disabled", true);
                    
                    //Transform data                    
                    var formArray = $('#RegisterCompanyForm').serializeArray();
                    var formData = {};
                    $.each(formArray, function (i, elem) {
                        formData[elem.name] = elem.value;
                    });

                    //Clean all invalid states
                    $('.form-group').removeClass('has-error');
                    $('.help-block').css('visibility', 'hidden');

                    //Make checks
                    if (!formData.company) {
                        $('#company').parent().addClass('has-error');
                        return;
                    }
                    if (!formData.firstName) {
                        $('#firstname').parent().addClass('has-error');
                        return;
                    }
                    if (!formData.lastName) {
                        $('#lastname').parent().addClass('has-error');
                        return;
                    }
                    if (!formData.emailAddress) {
                        $('#emailaddress').parent().addClass('has-error');
                        return;
                    }
                    if (!formData.password) {
                        $('#password').parent().addClass('has-error');
                        return;
                    }
                    if (!formData.password1) {
                        $('#password1').parent().addClass('has-error');
                        return;
                    }
                    if (formData.password != formData.password1) {
                        $('#password1').parent().addClass('has-error');
                        $('.help-block').css('visibility', 'visible');
                        return;
                    }
                    //Send Data
                    $.ajax({
                        url: serverUrl + '/api/company/register',
                        contentType: 'application/json',
                        data: JSON.stringify(formData),
                        processData: false,
                        type: 'POST'
                    }).done(function (result) {
                        if (result.success === false) {
                            alert('Account already exists. Please login.');
                            return;
                        }
                        
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
                        
                        $.ajax({
                            url: serverUrl + '/jira/install',
                            contentType: 'application/json',
                            data: JSON.stringify(instanceData),
                            processData: false,
                            type: 'POST'
                        }).done(function (result) {
                        
                            //User created... Get authorization token
                            $.ajax({
                                url: serverUrl + '/api/user/auth',
                                contentType: 'application/json',
                                data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
                                processData: false,
                                type: 'POST'
                            }).done(function (auth) {
                                authToken = auth;
                                $.cookie('yasoonAuthToken', authToken);
                                $('#storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
                                
                                $.ajax({
                                    url: serverUrl + '/jira/assigncompany',
                                    contentType: 'application/json',
                                    data: JSON.stringify({ serverId: serverId }),
                                    headers: { userAuthToken: authToken },
                                    processData: false,
                                    type: 'POST'
                                }).done(function () {
                                    $('#RegisteredArea').show();
                                    $('#UnregisteredArea').hide();
                                    checkAppLink();
                                    checkDownloadLink();
                                }).fail(function () {
                                    alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
                                });
                                
                            }).fail(function () {
                                alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
                            });
                            
                        }).fail(function () {
                            alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
                        }); 
                        
                    }).fail(function () {
                        alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
                    });

                    e.preventDefault();
                });
                
                $('#LoginYasoon').click(function (e) {
                    $('#UnregisteredArea').hide();
                    $('#LoginArea').show();
                });
                
                $('#AddApplicationLinkButton').click(function(e) {
                    
                    $('#AddApplicationLinkButton').text('Creating link...').prop("disabled",true);
                                        
                     //First, generate certificate
                     $.ajax({
                        url: serverUrl + '/api/support/genkeypair',
                        type: 'GET'
                     }).done(function(data) {
                         //Create the OAuth service on yasoon side                         
                         $.ajax({
                                url: serverUrl + '/jira/oauth',
                                contentType: 'application/json',
                                data: JSON.stringify({ 
                                    clientCertificate: data.pkcs12,
                                    serverId: serverId
                                }),
                                headers: { userAuthToken: authToken },
                                processData: false,
                                type: 'POST'
                            }).done(function () {
                                //Create the app link
                                $.ajax({
                                   url: 'applink',
                                   contentType: 'application/json',
                                   data: JSON.stringify({ cert: data.certificate }),
                                   processData: false,
                                   type: 'POST'
                                }).done(function (auth) {
                                    checkAppLink();
                                });                                
                            });                        
                     });
                });
                
                $('#LoginYasoonButton').click(function (e) {
                    
                    //Transform data                    
                    var formArray = $('#LoginForm').serializeArray();
                    var formData = {};
                    $.each(formArray, function (i, elem) {
                        formData[elem.name] = elem.value;
                    });

                    var instanceData = {
                            clientKey: serverId,
                            baseUrl: data.baseUrl,
                            key: 'com.yasoon.jira.onpremise',
                            description: 'Jira on Premise',
                            pluginsVersion: data.pluginVersion,
                            productType: 'jira',
                            serverVersion: data.version,
                            licenseInfo: data.licenses
                        };
                        
                    $.ajax({
                        url: serverUrl + '/jira/install',
                        contentType: 'application/json',
                        data: JSON.stringify(instanceData),
                        processData: false,
                        type: 'POST'
                    }).done(function (result) {

                        //Login
                        $.ajax({
                            url: serverUrl + '/api/user/auth',
                            contentType: 'application/json',
                            data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
                            processData: false,
                            type: 'POST'
                        }).done(function (auth) {
                            authToken = auth;
                            $.cookie('yasoonAuthToken', authToken);
                            $('#storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
                            
                            $.ajax({
                                url: serverUrl + '/jira/assigncompany',
                                contentType: 'application/json',
                                data: JSON.stringify({ serverId: serverId }),
                                headers: { userAuthToken: authToken },
                                processData: false,
                                type: 'POST'
                            }).done(function () {
                                $('#RegisteredArea').show();
                                $('#LoginArea').hide();
                                checkAppLink();
                                checkDownloadLink();
                            }).fail(function () {
                                alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
                            });
                        }).fail(function () {
                            alert('Invalid credentials.');
                        });
                    }).fail(function () {
                        alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
                    });
                });
        });    
    });
});


function getUrlParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function checkDownloadLink() {
    $.ajax({
        url: serverUrl + '/api/company/build',
        type: 'GET',
        headers: { userAuthToken: authToken }
    })
    .done(function(infos) {
        if(infos.state !== 5) {
            setTimeout(checkDownloadLink, 30000);
        }                
        else {
            $('#downloadLinkArea').empty().append('<a class="bootstrap-wrapper btn btn-default" target="_blank" href="' + infos.downloadUrl + '">Download</a>');
            $('#downloadLinkStatus').removeClass('panel-warning').addClass('panel-success');
        }
    })
	.fail(function() {
		setTimeout(checkDownloadLink, 30000);
	});
}

function checkAppLink() {
    $.ajax({
        url: 'applink',
        type: 'GET'
    }).done(function(applink) {
        if(typeof(applink) === 'string')
            applink = JSON.parse(applink);
        
        if(applink.exists) {
            $('#appLinkStatus').removeClass('panel-warning').addClass('panel-success');
            $('#AddApplicationLinkButton').hide();
        }
        else {
            $('#appLinkStatus').removeClass('panel-success').addClass('panel-warning');
            $('#AddApplicationLinkButton').show();
        }
    });
}