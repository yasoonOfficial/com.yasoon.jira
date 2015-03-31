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
                  
        Raven.config('https://6271d99937bd403da519654c1cf47879@sentry2.yasoon.com/4', {
          tags: {
              serverId: serverId,
              baseUrl: systemInfo.baseUrl
          }
        }).install();

        $.ajax({
                url: serverUrl + '/jira/isInstanceRegistered',
                data: { serverId: serverId },
                type: 'GET'
        }).done(function(data) {
                if(data.registered) {
                        if($.cookie('yasoonAuthToken')) {
                            authToken = $.cookie('yasoonAuthToken');
                            $('#RegisteredArea').show();
                            $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
                            checkDownloadLink();
                            checkProduct();
                        }   
                        else {
                            $('#LoginArea').show();
                        }
                        
                        checkAppLink();
                } else {
                        $('#UnregisteredArea').show();
                }
                
                $('[data-toggle="popover"]').popover({trigger: 'hover','placement': 'right'});
                
				$('#sendMessage').click(function(e) {
					zE(function() {
					  zE.show();
					});
				});
				
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
                                $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
                                
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
                                    checkProduct();
                                }).fail(function (jxqr, e) {
                                    Raven.captureMessage('Error during assignCompany: ' + e);
                                    alert('An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.');
                                });
                                
                            }).fail(function (jxqr, e) {
                                Raven.captureMessage('Error during userAuth: ' + e);
                                alert('An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.');
                            });
                            
                        }).fail(function (jxqr, e) {
                            Raven.captureMessage('Error during install: ' + e);
                            alert('An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.');
                        }); 
                        
                    }).fail(function (jxqr, e) {
                        Raven.captureMessage('Error during register: ' + e);
                        alert('An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.');
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
                                })
                                .fail(function (jxqr, e) {
                                    Raven.captureMessage('Error during applink creation: ' + e);
                                    alert('An error occurred while creating the application link. Please contact us via the green help button, we\'ll fix this quickly.');
                                });
                            })
                            .fail(function (jxqr, e) {
                                Raven.captureMessage('Error during oauth update: ' + e);
                                alert('An error occurred while creating the application link. Please contact us via the green help button, we\'ll fix this quickly.');
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
                            $('.storeLink').attr("href", "https://store.yasoon.com/?sso=" + authToken);
                            
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
                                checkProduct();
                            }).fail(function (jxqr, e) {
                                Raven.captureMessage('Error during assignCompany: ' + e);
                                alert('An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.');
                            });
                        }).fail(function (jxqr, e) {
                            Raven.captureMessage('Error during login: ' + e);                                 
                            alert('Login failed, probably invalid credentials.');
                        });
                    }).fail(function (jxqr, e) {
                        Raven.captureMessage('Error during install: ' + e);                                 
                        alert('An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.');
                    });
                });
        })
        .fail(function (jxqr, e) {
            Raven.captureMessage('Error during isInstanceRegisterd: ' + e);   
            alert('Could not retrieve system information. Please contact us via the green help button, we\'ll fix this quickly.');
        });
    })
    .fail(function () {
        console.log(arguments);
        alert('Could not retrieve system information. Please contact us via the green help button, we\'ll fix this quickly.');
    });
});


function getUrlParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function checkProduct() {
    $.ajax({
        url: serverUrl + '/api/company/product',
        headers: { userAuthToken: authToken },
        type: 'GET'
    }).done(function (data) {
        var product = null;
        if (data.length === 1) {
            product = data[0];
        }
        
        if (!product || new Date(product.validUntil).getTime() < new Date().getTime()) {
            //License Outdated
            $('#licenseStatus').removeClass('panel-success').removeClass('panel-warning').addClass('panel-danger');
        } else if (new Date(product.validUntil).getTime() < new Date(2099, 11, 1).getTime()) {
            $('#JiraExpirationDate').text(new Date(product.validUntil).toLocaleDateString());
            $('#licenseStatus').removeClass('panel-success').removeClass('panel-danger').addClass('panel-warning');
        } else {
            //License Ok
            $('#JiraSupportDate').text(new Date(product.parameters.supportUntil).toLocaleDateString());
            $('#licenseStatus').removeClass('panel-danger').removeClass('panel-warning').addClass('panel-success');
        }
    })
    .fail(function () {
        $('#licenseStatus').removeClass('panel-danger').removeClass('panel-warning').removeClass('panel-success').addClass('panel-info');
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
            setTimeout(checkDownloadLink, 30000);
        }                
        else {
            $('#downloadLink').append('<a class="bootstrap-wrapper btn btn-default" target="_blank" style="float: left; margin-right: 20px" href="' + infos.downloadUrl + '">Download</a> <input type="text" style="width: 400px" class="form-control" value="' + infos.downloadUrl + '" />');
            $('#downloadLinkStatus').removeClass('panel-warning').addClass('panel-success');
            $('#downloadLinkWaiting').hide();
            $('#downloadLinkArea').show();
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