function loadRegisteredUIState() {
    $('#mainMenuTabs').tabs();
    $('#selectBitness, #selectAppData').material_select();

    checkAppLink();
    checkDownloadLink();
    checkProduct();
    getCustomCert();
    setExternalCompanyData();
}

function initAdminUI() {
    console.log('initUi', isInstanceRegistered);
    $('.wizard').bootstrapWizard();
    //Hide page loader first
    $('#pageLoading').hide();

    var cookiePage = $.cookie('currentPage');
    if (cookiePage) {
        currentPage = parseInt(cookiePage);
    }

    if (isInstanceRegistered && (currentPage === 1 || currentPage > 4)) {
        $('#AreaRegistered').removeClass('hidden');
        $('.storeLink').attr("href", yasoonServerUrl + "/?sso=" + authToken);
        loadRegisteredUIState();
    } else if (isInstanceRegistered && (currentPage >= 2 || currentPage <= 4)) {
        //Already registered but didn't finish the wizard yet.
        $('#AreaUnregistered').removeClass('hidden');
        $('#unregisteredTabs').tabs();
        gotoPage(currentPage);
    }
    else {
        //Unregistered
        currentPage = 1;
        $('#AreaPreRegister').removeClass('hidden');
        $('#AreaUnregistered').removeClass('hidden');
        $('#unregisteredTabs').tabs();
        initTracking();

        $('#ButtonLogin').click(function () {
            $('#AreaPreRegister').addClass('hidden');
            $('#AreaInitialLogin').removeClass('hidden');
            $('#nextText').text('Add');
            $('#next').data('type', 'login').removeClass('hidden');
        });

        $('#ButtonRegister').click(function () {
            $('#AreaPreRegister').addClass('hidden');
            $('#AreaRegister').removeClass('hidden');
            $('#nextText').text('Register');
            $('#next').data('type', 'register').removeClass('hidden');


            //Prefill Wizard
            if (isCloud) {
                $('#comment').val('Registered via JIRA Cloud');
            } else {
                $('#comment').val('Registered via JIRA Server');
            }
            if (systemInfo.userName) {
                var userNameSplitted = systemInfo.userName.split(' ');
                if (userNameSplitted && userNameSplitted.length > 1) {
                    $('#first_name').val(userNameSplitted[0]).trigger('change');
                    $('#last_name').val(systemInfo.userName.replace(userNameSplitted[0] + ' ', '')).trigger('change');
                }
            }

            $('#emailAddress').val(systemInfo.userEmailAddress).trigger('change');
        });
    }

    //Init Modals
    $('.modal-trigger').modal({
        ready: onUserDialogOpen
    });


    if (isCloud) {
        $('.subscribeLink').attr('href', systemInfo.baseUrl + '/plugins/servlet/upm');
        $('.applicationCreateLink').attr('href', systemInfo.baseUrl + '/plugins/servlet/applinks/listApplicationLinks');
        $('.checkCloudApplicationLink').click(handleCheckCloudApplicationLink);
        $('#show-cert-dialog').modal();
    } else {
        $('.purchaseDialogLink').modal();
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
}

function initTracking() {
    $('body').append('<iframe style="height: 0px; width: 0px;" src="https://www.yasoon.com/track_install.html?id=' + serverId + '"></iframe>');
    $('body').append('<iframe style="height: 0px; width: 0px;" src="https://www.yasoon.de/track_install.html?id=' + serverId + '"></iframe>');
}

function assignToCompany(externalCompanyKey) {
    //ToDo: Check externalCompanyKey and get authToken
    return Promise.resolve($.ajax())
        .then(function (auth) {
            authToken = auth;
            return setInstanceProperty(PROP_AUTHTOKEN, authToken);
        })
        .then(function () {
            $('.storeLink').attr("href", yasoonServerUrl + '/?sso=' + authToken);
            if (isCloud)
                return;

            return $.ajax({
                url: yasoonServerUrl + '/jira/install',
                contentType: 'application/json',
                data: JSON.stringify(getInstanceData()),
                processData: false,
                type: 'POST'
            });
        })
        .then(function () {
            return $.ajax({
                url: yasoonServerUrl + '/jira/assigncompany',
                contentType: 'application/json',
                data: JSON.stringify(getIdentifyingParams()),
                headers: { userAuthToken: authToken },
                processData: false,
                type: 'POST'
            });
        })
        .then(function (result) {
            return setInstanceProperty(PROP_JIRADATAID, result.jiraDataId);
        })
        .caught(function (e) {
            captureMessage('Error during assignCompany: ', e);
            swal("Oops...", 'An error occurred during your registration. Please contact us via the green help button, we\'ll fix this quickly.', "error");

            promise.cancel();
        });
}

function handleLogin() {
    //Only necessary for migration path. Usually authToken is stored in instanceData
}

function handleUrlChange() {
    $('#MigrateUrlDialog').modal('open');
    $('#UpdateUrlAction').off().click(function (e) {
        console.log('Update');
    });

    $('#CreateNewInstanceAction').off().click(function (e) {
        console.log('Instance Add');
    });
}

function handleCheckCloudApplicationLink() {
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
            keyData = certInfo;
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
            captureMessage('Error during handleAddApplicationLink: ', ((e.message) ? e.message : e));
            swal("Oops...", 'An error occurred while creating the application link. Please contact us via the help button and we\'ll fix this quickly.', "error");
        })
        .then(function () {
            $('#addApplicationLinkButton').text('Create').prop("disabled", false);
            $('#addApplicationLinkButtonMain').text('Create').prop("disabled", false);
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
            $('#next').prop("disabled", true);
            $('#nextText').text('checking...');
            return checkAppLink()
                .then(function (appLinkExists) {
                    $('#next').prop("disabled", false);
                    $('#nextText').text('Yes, Application Link created!');
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
                            function successHandler(isConfirm) {
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
        $.cookie('currentPage', "1", { expires: 365 });
        isInstanceRegistered = true;
        initAdminUI();
    }
    else {
        gotoNextPage();
    }
}

function gotoNextPage() {
    currentPage++;
    $.cookie('currentPage', currentPage, { expires: 365 });
    gotoPage(currentPage);
}

function gotoPage(newPage) {
    console.log('GotoPage:', newPage);
    //Disable all previous steps
    for (var a = 1; a < newPage; a++) {
        $('#unregisteredTabs :nth-child(' + a + ')').addClass('disabled finished');
    }
    //Enable current step
    $('#unregisteredTabs :nth-child(' + newPage + ')').removeClass('disabled');
    setTimeout(function () {
        $('#unregisteredTabs').tabs('select_tab', 'tab' + newPage);
    }, 1);

    if (newPage > 1) {
        $('#next').removeClass('hidden');
    }

    if (newPage === 2) {
        if (isCloud) {
            $('#next').prop('disabled', true);
            $('#nextText').text('Loading...');
            getCustomCert()
                .then(function (cert) {
                    if (!cert.customCert) {
                        return cloudUpdateCerts();
                    }
                })
                .then(function () {
                    $('#next').prop('disabled', false);
                    $('#nextText').text('Yes, Application Link created!');
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
    var formData = {
        newFlow: true
    };
    formArray.forEach(function (elem) {
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

    //Send Data
    var promise = Promise.resolve();
    //Instance is already registered in Cloud (during Addon install Event)
    if (!isCloud) {
        promise = Promise.resolve($.ajax({
            url: yasoonServerUrl + '/jira/install',
            contentType: 'application/json',
            data: JSON.stringify(getInstanceData()),
            processData: false,
            type: 'POST'
        }))
            .then(function (result) {
                if (result && !jiraDataId) {
                    jiraDataId = result.id;
                    return setInstanceProperty(PROP_JIRADATAID, jiraDataId);
                }
            });
    }

    promise
        .then(function () {
            formData.jiraDataId = jiraDataId;
            $.ajax({
                url: yasoonServerUrl + '/api/company/register',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                processData: false,
                type: 'POST'
            })
        })
        .then(function (result) {
            //Means: User is already registered
            if (!result.success) {
                promise.cancel();
                return cbk({
                    success: false,
                    message: 'Account already exists. You may want to add this instance instead of registering a new one?'
                });
            }
            authToken = result.authToken
            $('.storeLink').attr('href', yasoonServerUrl + '/?sso=' + authToken);
            return setInstanceProperty(PROP_AUTHTOKEN, authToken);
        })
        .then(function () {
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
            captureMessage('Error during registration: ', e);
            cbk({
                success: false,
                message: 'An error occurred during your registration. Please contact us via the help button, we\'ll fix this quickly.'
            });
        });
}

function getInstanceData() {
    return {
        clientKey: serverId,
        supportEntitlementNumber: sen,
        baseUrl: systemInfo.baseUrl,
        key: 'com.yasoon.jira.onpremise',
        pluginsVersion: systemInfo.pluginVersion,
        description: 'Jira on Premise',
        productType: 'jira',
        serverVersion: systemInfo.version,
        licenseInfo: systemInfo.licenseInfo,
        eventType: 'installed'
    };
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
            var products = data.filter(function (el) { return (el.product === 4 || el.product === 5 || el.product === 9); });

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
            if (product.parameters && product.parameters.supportUntil)
                $('#JiraSupportDate').text(new Date(product.parameters.supportUntil).toLocaleDateString());

            if (product.id === 9) {
                $('#JiraLicensedFlexible').removeClass('hidden');
                $('#JiraLicensedAllUsers').addClass('hidden');
                $('#JiraUserNumber').text(product.userCount);
            }
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

    licenseRefreshActive = true;
    $('.licenseRefresh').addClass('grey-text text-lighten-2');
    if (isCloud) {
        return Promise.resolve($.ajax({
            url: yasoonServerUrl + '/jira/checkCloudLicense?jwt=' + jwtToken,
            contentType: 'application/json',
            processData: false,
            headers: { userAuthToken: authToken },
            type: 'GET'
        }))
            .then(function (data) {
                if (data.success && data.product) {
                    loadRegisteredUIState();
                }
            })
            .caught(function () {
                swal("Oops...", 'Something went wrong while refreshing your license information. Please try once more or contact us via the help button.', "error");
            })
            .lastly(function () {
                licenseRefreshActive = false;
                $('.licenseRefresh').removeClass('grey-text text-lighten-2');
            });

    } else {
        Promise.resolve($.ajax({
            url: yasoonServerUrl + '/jira/install',
            contentType: 'application/json',
            data: JSON.stringify(getInstanceData()),
            processData: false,
            type: 'POST'
        }))
            .then(function () {
                return $.ajax({
                    url: yasoonServerUrl + '/jira/checkSingleMarketplaceLicense',
                    type: 'POST',
                    data: JSON.stringify(getIdentifyingParams()),
                    contentType: 'application/json',
                    processData: false,
                    headers: { userAuthToken: authToken }
                });
            })
            .then(function (result) {
                if (result.updated)
                    loadRegisteredUIState();
            })
            .caught(function (e) {
                swal("Oops...", 'Something went wrong while refreshing your license information. Please try once more or contact us via the help button.', "error");
            })
            .lastly(function () {
                licenseRefreshActive = false;
                $('.licenseRefresh').removeClass('grey-text text-lighten-2');
            });
    }
}

function checkDownloadLink() {
    $.ajax({
        url: yasoonServerUrl + '/api/company/build',
        type: 'GET',
        headers: { userAuthToken: authToken }
    })
        .done(function (infos) {
            $('#downloadSetupButton, #downloadSetupButtonMain').prop('href', infos.downloadUrl);
            $('#downloadLink').val(infos.downloadUrl);

            setTimeout(function () {
                $('#selectBitness, #selectAppData').on('change', function () {
                    var bitness = $('#selectBitness').val();
                    var target = $('#selectAppData').val();

                    if (bitness && target) {
                        $('#downloadSetupButton, #downloadSetupButtonMain').removeClass('disabled');
                        $('#downloadSetupButton, #downloadSetupButtonMain').prop('href', calcAdvancedDownloadUrl(infos.downloadUrl, bitness, target));
                    }
                });

                $('#installerTabs').tabs({
                    onShow: function (el) {
                        var id = el.attr('id');
                        if (id === 'default') {
                            $('#downloadSetupButton, #downloadSetupButtonMain').removeClass('disabled');
                            $('#downloadSetupButton, #downloadSetupButtonMain').prop('href', infos.downloadUrl);
                        }
                        else {
                            var bitness = $('#selectBitness').val();
                            var target = $('#selectAppData').val();

                            if (!bitness || !target)
                                $('#downloadSetupButton, #downloadSetupButtonMain').addClass('disabled');
                            else
                                $('#downloadSetupButton, #downloadSetupButtonMain').prop('href', calcAdvancedDownloadUrl(infos.downloadUrl, bitness, target));
                        }
                    }
                });
            }, 1);
        })
        .fail(function (e) {
            if (e.statusCode === 401) {
                $.removeCookie('yasoonAuthToken');
                location.reload();
                return;
            }
            $('#DownloadLinkText').text('Could not load JIRA for Outlook Download URL.');
        });
}

function calcAdvancedDownloadUrl(baseUrl, bitness, target) {
    var url = baseUrl + "?bundleBuildId=7&arch=" + bitness;
    if (target === 'roaming')
        url += '&roaming=true';

    return url;
}

function checkAppLink() {
    if (isCloud) {
        return Promise.resolve($.ajax({
            url: yasoonServerUrl + '/jira/checkCloudApplicationLink?jwt=' + jwtToken,
            headers: { userAuthToken: authToken },
            contentType: 'application/json',
            type: 'GET'
        }))
            .then(function (result) {
                if (result.oauthToken) {
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

    return Promise.resolve($.ajax({
        url: yasoonServerUrl + '/jira/getCustomCert',
        data: { jwt: jwtToken },
        headers: { userAuthToken: authToken },
        type: 'GET'
    }))
        .then(function (data) {
            $('.certTextArea').val(data.customCert);
        });
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
    var params = getIdentifyingParams();
    params.clientCertificate = cert;

    return Promise.resolve($.ajax({
        url: yasoonServerUrl + '/jira/oauth',
        contentType: 'application/json',
        data: JSON.stringify(params),
        headers: { userAuthToken: authToken },
        processData: false,
        type: 'POST'
    }));
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

function setExternalCompanyData() {
    return Promise.resolve($.ajax({
        url: yasoonServerUrl + '/company/own',
        headers: { userAuthToken: authToken },
        type: 'GET'
    }))
        .then(function (data) {
            $('#ExternalCompanyKey').val(data.externalCompanyKey);
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
                    url: '/rest/api/2/user/search?username=' + term,
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
        })
        .caught(function (e) {
            captureMessage('Could not query user for ' + term, e);
            swal("Oops...", "Could not search for users.", "error");
        });
}

(function () {
    initAdminUI();
})()

//# sourceURL=admin.js