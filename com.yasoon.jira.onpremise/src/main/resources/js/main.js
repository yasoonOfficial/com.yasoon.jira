var authToken = '';
$(document).ready(function () {
    $.ajax({
        url: 'sysinfo',
        type: 'get'
    }).done(function(systemInfo) {

        if(typeof(systemInfo) === 'string')
            systemInfo = JSON.parse(systemInfo);
        
        var serverId = systemInfo.licenses[0].serverId;    
        $.ajax({
                url: 'http://localhost:1337/jira/isInstanceRegistered',
                data: { serverId: serverId },
                type: 'GET'
        }).done(function(data) {
                if(data.registered) {
                        $('#RegisteredArea').show();
                        checkAppLink();
                } else {
                        $('#UnregisteredArea').show();
                }
                $('#RegisterCompanyButton').click(function (e) {
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
                        url: 'http://localhost:1337/api/company/register',
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
                            url: 'http://localhost:1337/jira/install',
                            contentType: 'application/json',
                            data: JSON.stringify(instanceData),
                            processData: false,
                            type: 'POST'
                        }).done(function (result) {
                        
                            //User created... Get authorization token
                            $.ajax({
                                url: 'http://localhost:1337/api/user/auth',
                                contentType: 'application/json',
                                data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
                                processData: false,
                                type: 'POST'
                            }).done(function (auth) {
                                authToken = auth;
                                $.ajax({
                                    url: 'http://localhost:1337/jira/assigncompany',
                                    contentType: 'application/json',
                                    data: JSON.stringify({ serverId: serverId }),
                                    headers: { userAuthToken: authToken },
                                    processData: false,
                                    type: 'POST'
                                }).done(function () {
                                    $('#RegisteredArea').show();
                                    $('#UnregisteredArea').hide();
                                    checkAppLink();
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
                        url: 'http://localhost:1337/api/support/genkeypair',
                        type: 'GET'
                     }).done(function(data) {
                         //Create the app link
                         $.ajax({
                            url: 'applink',
                            contentType: 'application/json',
                            data: JSON.stringify({ cert: data.certificate }),
                            processData: false,
                            type: 'POST'
                        }).done(function (auth) {
                            //Create the OAuth service on yasoon side
                            // todo
                            checkAppLink();
                        });
                     });                     
                });
                
                $('#LoginYasoonButton').click(function (e) {
                    
                    //Transform data                    
                    var formArray = $('#RegisterCompanyForm').serializeArray();
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
                        url: 'http://localhost:1337/jira/install',
                        contentType: 'application/json',
                        data: JSON.stringify(instanceData),
                        processData: false,
                        type: 'POST'
                    }).done(function (result) {

                        //Login
                        $.ajax({
                            url: 'http://localhost:1337/api/user/auth',
                            contentType: 'application/json',
                            data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
                            processData: false,
                            type: 'POST'
                        }).done(function (auth) {
                            authToken = auth;
                            $.ajax({
                                url: 'http://localhost:1337/jira/assigncompany',
                                contentType: 'application/json',
                                data: JSON.stringify({ serverId: serverId }),
                                headers: { userAuthToken: authToken },
                                processData: false,
                                type: 'POST'
                            }).done(function () {
                                $('#RegisteredArea').show();
                                $('#LoginArea').hide();
                                checkAppLink()
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