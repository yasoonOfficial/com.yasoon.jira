var settingsModel;

function settingsViewModel() {
    var self = this;

    this.yasoonSettings = new yasoonSettingsModel();
    this.jiraSettings = new jiraSettingsModel();
}

function yasoonSettingsModel() {
    var self = this;

    this.sendErrorLogs = ko.observable(true);
    this.sendAnalytics = ko.observable(true);
    this.sendMails = ko.observable(true);
    this.noPstFile = ko.observable(false);
    this.yasoonNavigation = ko.observable(0);
    this.welcomeMessage = ko.observable('');
    this.helpWidget = ko.observable(true);
    this.currentCompnay = null;

    this.yasoonNavigationOptions = {
        data: [
            {
                id: 0,
                text: 'Folder Navigation (left)'
            },
            {
                id: 1,
                text: 'In Ribbon Menu (top)'
            },
            {
                id: 2,
                text: 'Hide Yasoon Tab'
            },
        ],
        minimumResultsForSearch: Infinity
    };


    this.save = function () {
        var overwriteData = {
            remoteErrorLoggingEnabled: self.sendErrorLogs(),
            analyticsEnabled: self.sendAnalytics(),
            helpWidget: self.helpWidget()
        };

        var installOnlyData = {
            'settings.navType': self.yasoonNavigation(),
            sendMails: self.sendMails(),
            noPstFile: self.noPstFile(),
            welcomeMessage: self.welcomeMessage()
        };

        return Promise.resolve($.ajax({
            url: yasoonServerUrl + '/api/companyapp/0/predeliveredConfig',
            contentType: 'application/json',
            headers: { userAuthToken: authToken },
            data: JSON.stringify({ overwrite: overwriteData, installOnly: installOnlyData }),
            processData: false,
            type: 'PUT'
        }))
            .then(function () {
                notyfy({
                    text: 'Save Successful',
                    type: 'success',
                    dismissQueue: true,
                    timeout: 3000,
                    layout: 'topCenter',
                    buttons: false
                });
            })
            .caught(function (e) {
                swal({
                    title: "Save was not possible",
                    text: "Connection Error: " + e.message,
                    type: "error",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Ok!",
                    closeOnConfirm: true
                });
            });

    };

    //Init Data
    //1 Company App
    Promise.resolve($.ajax({
        url: yasoonServerUrl + '/api/companyapp/0/predeliveredConfig',
        contentType: 'application/json',
        headers: { userAuthToken: authToken },
        processData: false,
        type: 'GET'
    }))
        .then(function (data) {
            console.log('Yasoon Config: ', data);
            if (data.overwrite) {
                if (data.overwrite.hasOwnProperty('analyticsEnabled')) {
                    self.sendAnalytics(data.overwrite.analyticsEnabled);
                }
                if (data.overwrite.hasOwnProperty('remoteErrorLoggingEnabled')) {
                    self.sendErrorLogs(data.overwrite.remoteErrorLoggingEnabled);
                }
            }

            if (data.installOnly) {
                if (data.installOnly.hasOwnProperty('sendMails')) {
                    self.sendMails(data.installOnly.sendMails);
                }
                if (data.installOnly.hasOwnProperty('noPstFile')) {
                    self.noPstFile(data.installOnly.noPstFile);
                }
                if (data.installOnly.hasOwnProperty('settings.navType')) {
                    self.yasoonNavigation(data.installOnly['settings.navType']);
                }
                if (data.installOnly.hasOwnProperty('welcomeMessage')) {
                    self.welcomeMessage(data.installOnly['welcomeMessage']);
                }
            }
        });
}

function jiraSettingsModel() {
    var self = this;
    this.defaultSettings = new jiraDefaultSettingsModel();

    this.taskSyncEnabled = ko.observable(false);
    this.teamleadApiKey = ko.observable('');
    this.teamleadMapping = ko.observable('');

    this.emailHeaderOptions = {
        data: [
            {
                id: 'off',
                text: 'Disabled'
            },
            {
                id: 'top',
                text: 'On top'
            },
            {
                id: 'bottom',
                text: 'At the bottom'
            },
        ],
        minimumResultsForSearch: Infinity
    };

    this.syncFeedOptions = {
        data: [
            {
                id: 'auto',
                text: 'Automatically'
            },
            {
                id: 'manual',
                text: 'Manually'
            },
            {
                id: 'off',
                text: 'Off'
            },
        ],
        minimumResultsForSearch: Infinity
    };

    //Init Data
    Promise.resolve($.ajax({
        url: yasoonServerUrl + '/api/companyapp/16/predeliveredConfig',
        contentType: 'application/json',
        headers: { userAuthToken: authToken },
        processData: false,
        type: 'GET'
    }))
        .then(function (data) {
            console.log('Jira Config: ', data);
            if (data.overwrite) {
                if (data.overwrite.defaultSettings) {
                    self.defaultSettings.load(JSON.parse(data.overwrite.defaultSettings));
                }
                if (data.overwrite.taskSyncEnabled) {
                    self.taskSyncEnabled(data.overwrite.taskSyncEnabled);
                }
                if (data.overwrite.teamlead) {
                    self.teamleadApiKey(data.overwrite.teamlead.apiKey);
                    self.teamleadMapping(data.overwrite.teamlead.mapping);
                }
            }
        });

    this.save = function () {
        var result = {
            overwrite: {
                defaultSettings: JSON.stringify(ko.toJS(self.defaultSettings)),
                taskSyncEnabled: self.taskSyncEnabled(),
                teamlead: {
                    apiKey: self.teamleadApiKey(),
                    mapping: self.teamleadMapping()
                }
            }
        };

        console.log('save', result);

        return Promise.resolve($.ajax({
            url: yasoonServerUrl + '/api/companyapp/16/predeliveredConfig',
            contentType: 'application/json',
            headers: { userAuthToken: authToken },
            data: JSON.stringify(result),
            processData: false,
            type: 'PUT'
        }))
            .then(function () {
                notyfy({
                    text: 'Save Successful',
                    type: 'success',
                    dismissQueue: true,
                    timeout: 3000,
                    layout: 'topCenter',
                    buttons: false
                });
            })
            .caught(function (e) {
                swal({
                    title: "Save was not possible",
                    text: "Connection Error: " + e.message,
                    type: "error",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Ok!",
                    closeOnConfirm: true
                });
            });

    };
}

function jiraDefaultSettingsModel() {
    var self = this;
    this.showDesktopNotif = ko.observable(true);
    this.addAttachmentsOnNewAddIssue = ko.observable(false);
    this.addMailHeaderAutomatically = ko.observable('off');
    this.addEmailOnNewAddIssue = ko.observable(false);
    this.syncFeed = ko.observable('auto');
    this.hideResolvedIssues = ko.observable(false);

    this.load = function (data) {
        if (data.hasOwnProperty('showDesktopNotif')) {
            self.showDesktopNotif(data['showDesktopNotif']);
        }
        if (data.hasOwnProperty('addAttachmentsOnNewAddIssue')) {
            self.addAttachmentsOnNewAddIssue(data['addAttachmentsOnNewAddIssue']);
        }
        if (data.hasOwnProperty('addMailHeaderAutomatically')) {
            self.addMailHeaderAutomatically(data['addMailHeaderAutomatically']);
        }
        if (data.hasOwnProperty('addEmailOnNewAddIssue')) {
            self.addEmailOnNewAddIssue(data['addEmailOnNewAddIssue']);
        }
        if (data.hasOwnProperty('syncFeed')) {
            self.syncFeed(data['syncFeed']);
        }
        if (data.hasOwnProperty('hideResolvedIssues')) {
            self.hideResolvedIssues(data['hideResolvedIssues']);
        }
    }
}

(function () {
    ko.bindingHandlers['wysiwyg'].defaults = {
        height: 450,
        width: 650,
        menubar: false,
        plugins: [
            'advlist autolink lists link image charmap print preview anchor',
            'searchreplace visualblocks code fullscreen',
            'insertdatetime media table contextmenu paste code'
        ],
        toolbar: ['undo redo | insert | styleselect | bold italic | alignleft aligncenter alignright alignjustify',
            'bullist numlist outdent indent | link image table code'],
    };

    settingsModel = new settingsViewModel();
    ko.applyBindings(settingsModel, document.getElementById('settings'));

    $('#SettingsCollapsible').collapsible();
    $('[data-toggle="popover"]').popover();
})();

//# sourceURL=settings.js