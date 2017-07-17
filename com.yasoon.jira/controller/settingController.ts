interface JQuery {
    multiSelect(args: any);
    getValue(): boolean;
    select2(args: any);
}

declare function oAuthSuccess();

let templateLoaded = false;
let settingTemplate = null;
let settingsContainer = null;
let defaults = {
    currentService: '',
    lastSync: new Date(new Date().getTime() - (1000 * 60 * 60 * 24 * 14)),// If nothing in db, set it to 14 days ago
    showDesktopNotif: true,
    addAttachmentsOnNewAddIssue: false,
    addMailHeaderAutomatically: 'off',
    addEmailOnNewAddIssue: false,
    showFeedAssignee: true,
    showFeedMentioned: true,
    showFeedWatcher: true,
    showFeedProjectLead: false,
    showFeedReporter: true,
    showFeedCreator: true,
    showFeedComment: true,
    newCreationScreen: true,
    syncCalendar: false,
    syncFeed: 'live',
    syncTask: false,
    tasksActiveProjects: '',
    deleteCompletedTasks: false,
    tasksSyncAllProjects: true,
    hideResolvedIssues: false,
    activeFilters: 'fields.project.id,fields.issuetype.id,fields.status.id,fields.priority.id,fields.assignee.emailAddress'
};

class JiraSettingController {

    baseUrl: string;
    taskSyncEnabled: boolean = false;
    teamlead: any;
    lastSync: Date;
    currentService: string;
    tasksActiveProjects: string;

    constructor() {
        /****** Initial Load of settings */
        var urlString = yasoon.setting.getAppParameter('baseUrl');
        if (urlString) {
            this.baseUrl = urlString;
        }

        var dataString = yasoon.setting.getAppParameter('ownUser');
        if (dataString) {
            jira.data = {};
            jira.data.ownUser = JSON.parse(dataString);
        }

        //Load License
        var licenseString = yasoon.setting.getAppParameter('license');
        if (licenseString) {
            jira.license = JSON.parse(licenseString);
            jira.license.validUntil = new Date(jira.license.validUntil);
        } else {
            var validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 14);
            jira.license = { comment: 'Please play fair and pay for your software.', isFullyLicensed: false, validUntil: validUntil };
            yasoon.setting.setAppParameter('license', JSON.stringify(jira.license));
        }

        //Load System Infos
        var sysInfoString = yasoon.setting.getAppParameter('systemInfo');
        if (sysInfoString) {
            jira.sysInfo = JSON.parse(sysInfoString);
        }

        //Load Temlead CRM Settings
        var teamleadCrmDataString = yasoon.setting.getAppParameter('teamlead');
        if (teamleadCrmDataString) {
            this.teamlead = JSON.parse(teamleadCrmDataString);
            if (this.teamlead.mapping) {
                try {
                    this.teamlead.mapping = JSON.parse(this.teamlead.mapping) || {};
                } catch (e) {
                    this.teamlead.mapping = {};
                }
            }
        }

        //Merge company defaults
        var defaultSettingsString = yasoon.setting.getAppParameter('defaultSettings');
        if (defaultSettingsString) {
            var def = JSON.parse(defaultSettingsString);
            defaults = $.extend(defaults, def);
        }

        //Determine settings to load:
        var settingsString = yasoon.setting.getAppParameter('settings');
        var settings = null;
        if (!settingsString) {
            //Initial Settings
            settings = defaults;
            yasoon.setting.setAppParameter('settings', JSON.stringify(settings));
        } else {
            //Load Settings
            settings = JSON.parse(settingsString);
            settings = $.extend(defaults, settings);
        }

        $.each(settings, (key, value) => {
            this[key] = value;
        });
        this.lastSync = new Date(this.lastSync);

        //Load TaskSync Settings
        let taskSyncString: string = yasoon.setting.getAppParameter('taskSyncEnabled');
        if (taskSyncString) {
            this.taskSyncEnabled = (taskSyncString.toLowerCase() == 'true');
        }

        //Determine URL from service if possible
        if (this.currentService) {
            var service = yasoon.app.getOAuthService(this.currentService);
            if (service && service.appParams && service.appParams.url) {
                this.baseUrl = service.appParams.url;
            }
        }
    }

    renderSettingsContainer = (container) => {
        if (!container) {
            container = settingsContainer;
        }

        if (!container)
            return;

        settingsContainer = container;
        //Prepare Data for handlebar Template
        //We need all oAuth Services + determine the description
        var oAuthServices = yasoon.app.getOAuthServices();
        oAuthServices.forEach((service: any) => {
            service.description = (service.appParams) ? service.appParams.description : service.serviceName;
        });

        //Check selected filters
        jira.filter.filterObj.forEach((f) => {
            //Is in selected?!            
            f.selected = jira.filter.getSelectedFilters().filter((key) => { return key === f.key; }).length > 0;
        });

        //Active Projects for Task Sync
        var projects = [];
        if (jira.data.projects) {
            projects = JSON.parse(JSON.stringify(jira.data.projects));
        }
        if (this.tasksActiveProjects) {
            var activeProjects = this.tasksActiveProjects.split(',');
            projects.forEach((p) => {
                p.selected = activeProjects.filter((key) => { return key === p.key; }).length > 0;
            });
        }

        var templateParams = {
            oAuthServices: oAuthServices,
            loggedIn: !!jira.settings.currentService,
            filters: jira.filter.filterObj,
            taskSyncEnabled: jira.settings.taskSyncEnabled,
            tasksSyncAllProjects: jira.settings.tasksSyncAllProjects,
            projects: projects,
            loaderPath: yasoon.io.getLinkPath('images/ajax-loader.gif')

        };

        if (!templateLoaded) {
            var path = yasoon.io.getLinkPath('templates/settings.js');
            $.getScript(path, (template) => {
                templateLoaded = true;
                settingTemplate = jira.templates.settings;
                this.fillSettingsContainer(settingsContainer, settingTemplate, templateParams);
            });
        } else {
            this.fillSettingsContainer(settingsContainer, settingTemplate, templateParams);
        }
    }

    fillSettingsContainer(container, template, parameter) {
        //Add Values
        var elem = $('<div>' + template(parameter) + '</div>');
        $.each(jira.settings, (i, val) => {
            if (elem.find('#' + i).attr('type') == "checkbox") {
                if (val) {
                    elem.find('#' + i).attr('checked', 'true');
                }
            } else {
                elem.find('#' + i).val(val);
            }
        });
        //Add JS
        container.afterRender = () => {
            $('#activeFilters').multiSelect({
                selectableHeader: yasoon.i18n('settings.filterAvailable'),
                selectionHeader: yasoon.i18n('settings.filterActive')
            });

            $('#tasksActiveProjects').multiSelect({
                selectableHeader: yasoon.i18n('settings.taskProjectAvailable'),
                selectionHeader: yasoon.i18n('settings.taskProjectActive')
            });

            $('#tasksSyncAllProjects').off().on('change', (e) => {
                e.preventDefault();

                if ($('#tasksSyncAllProjects').getValue() === true) {
                    $('#tasksProjectfilterContainer').slideUp();
                } else {
                    $('#tasksProjectfilterContainer').slideDown();
                }
                return true;
            });
            $('#tasksSyncAllProjects').trigger('change');

            $('#jiraLogin').off().click(() => {
                var selectedServiceName = $('#currentService').val();
                var newService = parameter.oAuthServices.filter((s) => s.serviceName == selectedServiceName)[0];

                if (!newService) {
                    yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('settings.loginNotPossible') });
                    throw new Error('Selected service ' + selectedServiceName + ' does not exist.');
                }

                if (!newService.appParams || !newService.appParams.url) {
                    yasoon.alert.add({ type: yasoon.alert.alertType.error, message: yasoon.i18n('settings.loginNotPossible') });
                    return false;
                }

                //Set new BaseUrl so it's considered for oAuth flow
                yasoon.setting.setAppParameter('baseUrl', newService.appParams.url);
                jira.settings.baseUrl = newService.appParams.url;

                yasoon.app.getOAuthUrlAsync('com.yasoon.jira', selectedServiceName, (url) => {
                    window.open(url);
                },
                    () => {
                        //Setting new currentService also set in jira.handleOauthSuccess() because of automated oAuth popups
                        jira.settings.currentService = selectedServiceName;

                        //Refresh UI --> standard yasoon Function
                        oAuthSuccess();
                    });

                return false;
            });

            $('#addMailHeaderAutomatically').select2({ minimumResultsForSearch: 5 })
                .val(jira.settings.addMailHeaderAutomatically).trigger('change');

            $('#syncFeed').select2({ minimumResultsForSearch: 5 })
                .val(jira.settings.syncFeed).trigger('change');

            $('#jiraLogout').off().click(() => {
                yasoon.app.invalidateOAuthToken(this.currentService);
                this.currentService = '';
                yasoon.setting.setAppParameter('settings', JSON.stringify(this));
                yasoon.view.header.triggerOAuthStatus.valueHasMutated();

                yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
                return false;
            });

            let reloadOAuthHandler = (e) => {
                e.preventDefault();

                //We have a few checks to do.
                //This button shouldn't be used if
                // - it has already been clicked and processing is not finished yet
                // - it's currently an version running from a shadow folder 
                // - Or the downloaded app is newer (prevent implicit updates)
                $('#jiraReloadOAuth').prop('disabled', true).off();
                var app = yasoon.model.apps.get('com.yasoon.jira');
                yasoon.store.getLatestVersions((storeApp) => {
                    if (storeApp.id > app.origin.versionId) {
                        yasoon.dialog.showMessageBox(yasoon.i18n('settings.pendingUpdates'));
                        $('#jiraReloadOAuth').off().prop('disabled', false).click(reloadOAuthHandler);
                        return;
                    }
                    if (app.origin.basePath.indexOf('update') > -1) {
                        yasoon.dialog.showMessageBox(yasoon.i18n('settings.pendingUpdatesApp'));
                        $('#jiraReloadOAuth').off().prop('disabled', false).click(reloadOAuthHandler);
                        return;
                    }

                    yasoon.app.downloadManifest(null, (path) => {
                        if (path) {
                            jira.downloadScript = true;
                            yasoon.app.update(null, null, () => {
                                yasoon.view.settings.renderOptionPane(yasoon.view.settings.currentApp());
                                yasoon.alert.add({ message: yasoon.i18n('settings.reloadSuccess'), type: 3 });
                            });
                        }
                    });
                });

                return false;
            }

            $('#jiraReloadOAuth').off().click(reloadOAuthHandler);
        };
        container.setContent(elem.html());
    }

    saveSettings = (form) => {
        //Create deep copy
        $.each(form, (i, param) => {
            //Special Case for activeFilters
            if (param.key === 'activeFilters' && this[param.key] != param.value) {
                yasoon.dialog.showMessageBox(yasoon.i18n('settings.filterChange'));
                if (param.value === null) //Null filter is not good :D
                    param.value = '';
            }

            if (param.key === 'syncFeed' && this[param.key] === 'live') {
                yasoon.feed.enableLiveMode();
            }

            if (param.key === 'tasksActiveProjects' && this[param.key] != param.value ||
                param.key === 'taskSyncEnabled' && this[param.key] != param.value ||
                param.key === 'tasksSyncAllProjects' && this[param.key] != param.value) {
                jira.tasks.requireFullSync = true;
                jira.sync();
            }
            if (param.value == "true") {
                this[param.key] = true;
            } else if (param.value == "false") {
                this[param.key] = false;
            } else {
                this[param.key] = param.value;
            }
        });

        this.save();
    }

    save() {
        var result = {};
        Object.keys(defaults).forEach((key) => {
            result[key] = this[key] || defaults[key];
        });
        yasoon.setting.setAppParameter('settings', JSON.stringify(this));
    }

    setLastSync(date) {
        this.lastSync = date;
        yasoon.feed.saveSyncDate(date);
        this.save();
    }

    updateData() {
        yasoon.setting.setAppParameter('data', JSON.stringify(jira.data));
    }
}