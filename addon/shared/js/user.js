var isCloud = false;
var jwtToken = null;
var PROP_AUTHTOKEN = 'authToken';
var serverId = null;
var user = null;
var systemInfo = null;
var sen = null;
var yasoonServerUrl = null;

$(document).ready(function () {
    jwtToken = getUrlParameterByName('jwt');
    if (jwtToken)
        isCloud = true;

    if (isCloud) {
        //AP.sizeToParent();
        AP.resize('100%', (window.screen.availHeight - 250) + 'px');
        $('.tab-container').css('max-height', (window.screen.availHeight - 330) + 'px')
    }

    loadSystemInfo()
        .then(function () {
            return getStoreUrl();
        })
        .then(function (url) {
            yasoonServerUrl = url;

            $('#pageLoading').addClass('hidden');
            var htmlPath = '';
            if (isCloud) {
                htmlPath = 'user.html';
            } else {
                htmlPath = pathHtml;
            }

            $('#pageContent').removeClass('hidden').load(htmlPath, function () {
                $('#homepage').css('height', (window.innerHeight - $('#content').offset().top) + 'px');
                getInstanceProperty(PROP_AUTHTOKEN)
                    .then(function (authToken) {
                        return $.ajax({
                            url: yasoonServerUrl + '/api/company/build',
                            type: 'GET',
                            headers: { userAuthToken: authToken }
                        });
                    })
                    .then(function (infos) {
                        var url = btoa(infos.downloadUrl);
                        $('#homepage').attr('src', "https://yasoon.com/jira-for-outlook-in-product/?url=" + url);
                    });
            });
        });
});
