var jira = {};

$(function() {
    $('body').css('overflow-y', 'hidden');
    $('form').on('submit', function(e) {
        e.preventDefault();
        return false;
    });
});

$(window).resize(resizeWindow);

yasoon.dialog.load(new function() { //jshint ignore:line
    var self = this;
    jira = this;

    this.UIFormHandler = UIRenderer;
    this.icons = new JiraIconController();

    this.transaction = { currentCallCounter: 0, errorOccured: null };

    this.currentTemplates = [];
    this.currentMeta = null;
    this.currentIssue = null;
    this.selectedProject = null;
    this.serviceDesks = null;
    this.senderUser = { name: -1 };
    this.projectMeta = null;
    this.systemInfo = null;

    this.mailAsMarkup = '';
    this.recentProjects = [];
    this.projects = [];
    this.selectedAttachments = [];
    this.savedTemplates = [];
    this.userCommonValues = {};

    //For IssuePicker
    this.projectIssues = [];
    this.selectedProjectId = null;
    this.selectedProjectKey = null;
    this.mode = 'jiraDialog';

    //Order of Fields in the form. Fields not part of the array will be rendered afterwards
    //This can be customized by JIRA admin
    var fieldOrder = [
        'summary',
        'priority',
        'duedate',
        'components',
        'versions',
        'fixVersions',
        'assignee',
        'reporter',
        'environment',
        'description',
        'attachment',
        'labels',
        'timetracking'
    ];

    //If custom script is specified, load it as well.
    var customScriptUrl = yasoon.setting.getAppParameter('customScript');
    if (customScriptUrl) {
        $.getScript('dialogs/customScript.js');
    }

    this.init = function(initParams) {
        //Parameter taken over from Main JIRA
        self.settings = initParams.settings;
        self.ownUser = initParams.ownUser || {};
        self.isEditMode = !!initParams.editIssueId;
        self.editIssueId = initParams.editIssueId;
        self.editProject = initParams.editProject;
        self.mail = initParams.mail;
        self.selectedText = initParams.text;
        self.cacheUserMeta = initParams.userMeta;
        self.cacheCreateMetas = initParams.createMetas;
        self.cacheProjects = initParams.projects;
        self.systemInfo = initParams.systemInfo || { versionNumbers: [6, 4, 0] };

        //Register Close Handler
        yasoon.dialog.onClose(self.cleanup);

        // Resize Window if nessecary (sized are optimized for default Window - user may have changed that)
        resizeWindow();

        //It's the edit case
        //Add Class to change title & labels
        if (self.isEditMode) {
            $('#create-issue-dialog').addClass('edit-mode');
        }

        setTimeout(self.initDelayed, 1);
    };

    this.initDelayed = function() {
        //Init Fields
        self.loadFields();

        //Load DB settings
        var fieldOrderString = yasoon.setting.getAppParameter('fieldOrder');
        if (fieldOrderString) {
            fieldOrder = JSON.parse(fieldOrderString);
        }

        if (jira.mail)
            jira.emailController = new EmailController(jira.mail, jira.selectedText, jira.settings, jira.ownUser);

        //Render Header fields
        FieldController.loadField(ProjectField.defaultMeta, ProjectField, jira.cacheProjects);
        FieldController.render(FieldController.projectFieldId, $('#HeaderArea'));

        FieldController.loadField(IssueTypeField.defaultMeta, IssueTypeField);
        FieldController.render(FieldController.issueTypeFieldId, $('#IssueArea'));

        //Hook Events
        FieldController.registerEvent(EventType.FieldChange, self, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.FieldChange, self, FieldController.issueTypeFieldId);

        if (self.isEditMode) {
            $('#LoaderArea').show();
            jiraGet('/rest/api/2/issue/' + self.editIssueId + '?expand=editmeta,renderedFields')
                .then(function(issueString) {
                    jira.currentIssue = JSON.parse(issueString);
                    $('#LoaderArea').hide();

                    //Set Project and issueType and make read-only
                    FieldController.setValue(FieldController.projectFieldId, jira.currentIssue.fields.project, true);
                    $('#' + FieldController.projectFieldId).prop('disabled', true);

                    FieldController.setValue(FieldController.issueTypeFieldId, jira.currentIssue.fields.issuetype, true);
                    $('#' + FieldController.issueTypeFieldId).prop('disabled', true);
                });
        }

        //Submit Button - (Create & Edit)
        $('#create-issue-submit').click(self.submitForm);

        $('#create-issue-cancel').click(function() {
            self.close({ action: 'cancel' });
        });
    };

    this.handleEvent = function(type, newValue, source) {
        if (source === FieldController.projectFieldId) {
            var project = newValue;
            jira.selectedProject = project;

            if (project) {
                $('#IssueArea').removeClass('hidden');

                //Check Service Desk
                $('#ServiceArea').addClass('hidden'); //removing the class is controlled by issueTypeField
                if (project.projectTypeKey === "service_desk") {
                    if (!FieldController.getField(FieldController.requestTypeFieldId)) {
                        //First time we need the requesttype field --> render
                        var requestTypeField = FieldController.loadField(RequestTypeField.defaultMeta, RequestTypeField);
                        requestTypeField.setProject(project);
                        FieldController.render(FieldController.requestTypeFieldId, $('#ServiceAreaRequestField'));

                        //Create On-Behalf of field
                        var behalfOfField = FieldController.loadField(UserSelectField.reporterDefaultMeta, UserSelectField);
                        FieldController.render(FieldController.onBehalfOfFieldId, $('#ServiceAreaReporterField'));
                    }
                }
            }

        } else if (source === FieldController.issueTypeFieldId) {
            var issueType = newValue;
            if (issueType.subtask) {
                if (!FieldController.getField(FieldController.issueFieldId)) {
                    //First time we need the issue field
                    var issueField = FieldController.loadField(IssueField.defaultMeta, IssueField);
                    issueField.setProject(jira.selectedProject);
                    FieldController.render(FieldController.issueFieldId, $('#SubtaskArea'));
                }

                $('#SubtaskArea').removeClass('hidden');
            } else {
                $('#SubtaskArea').addClass('hidden');
            }

            //Get latest meta and start new Rendering
            $('#LoaderArea').removeClass('hidden');
            $('#ContentArea').css('visibility', 'hidden');
            self.getMetaData(jira.selectedProject.id, issueType.id)
                .then(function(meta) {
                    return self.renderIssue(meta);
                })
                .then(function() {
                    //Set Email Values
                    if (jira.emailController) {
                        jira.emailController.insertEmailValues();
                    }
                    //Set all Values in edit case
                    if (self.currentIssue) {
                        FieldController.setFormData(self.currentIssue);
                    }
                })
                .then(function() {
                    $('#LoaderArea').addClass('hidden');
                    $('#ContentArea').css('visibility', 'visible');
                })
                .catch(function(e) {
                    console.log('Error during rendering', e, e.stack)
                });

        }
    };

    this.close = function(params) {
        //Check if dialog should be closed or not
        if (params && params.action === 'success' && $('#qf-create-another').is(':checked')) {
            $('#JiraSpinner').hide();
            $('.form-body').scrollTop(0);
            $('#create-issue-submit').removeAttr("disabled");

			/* TODO - rerender screen and add template
			$('#summary').val('');
			$('#description').val('');
			$('#AttachmentContainer').empty();
			self.selectedAttachments = [];
			*/
        } else {
            yasoon.dialog.close(params);
        }
    };

    this.cleanup = function() {
        //Invalidate dialog events so the following won't throw any events => will lead to errors
        // due to pending dialog.close
        yasoon.dialog.clearEvents();

        //Dispose all Attachments
        jira.selectedAttachments.forEach(function(handle) {
            try {
                handle.dispose();
            } catch (e) {
                //System.Exception: TrackedObjectRegistry: Tried to access object which not found! (probably already de-referenced)
            }
        });
    };

    this.submitForm = function(e) {
        e.preventDefault();
        //Reset data
        var lifecycleData = {};
        var result = {};
        jira.transaction.currentCallCounter = 0;
        jira.issueCreated = false;

        //Prepare UI
        $('#MainAlert').hide();
        $('#create-issue-submit').prop('disabled', true);
        $('#JiraSpinner').show();


        //Check if Request type is needed and add it
        var isServiceDesk = jira.selectedProject.projectTypeKey == 'service_desk' && $('#switchServiceMode').hasClass('active');

        return Promise.resolve()
            .then(function() {

                //1. Collect data:
                result = FieldController.getFormData(jira.isEditMode);

                //Inform Fields that save is going to start.
                lifecycleData = {
                    cancel: false,
                    data: result
                };

                //Wait till all beforeSave actions are done
                return FieldController.raiseEvent(EventType.BeforeSave, lifecycleData);

            })
            .then(function() {
                if (result.cancel) {
                    //Todo cancel this shit
                    throw new Exception("Save canceled");
                }
                console.log('Send Data:', result);


                //Switch for edit or create
                var url = (jira.isEditMode) ? '/rest/api/2/issue/' + self.editIssueId : '/rest/api/2/issue';
                var method = (jira.isEditMode) ? yasoon.ajaxMethod.Put : yasoon.ajaxMethod.Post;

                //Submit request		
                return jiraAjax(url, method, JSON.stringify(result));
            })
            .then(function(data) {
                var issue = self.isEditMode ? jira.currentIssue : JSON.parse(data);
                jira.issueCreated = true;
                lifecycleData.newData = issue;
                //Wait till all AfterSave actions are done
                return FieldController.raiseEvent(EventType.AfterSave, lifecycleData);
            })
            .then(function() {
                //Save issueId in conversation data
                if (jira.mail) {
                    try {
                        //Set Conversation Data
                        var conversationString = yasoon.outlook.mail.getConversationData(jira.mail); //That derives wrong appNamespace, since the object wsa created in main window context: jira.mail.getConversationData();
                        var conversation = {
                            issues: {}
                        };

                        if (conversationString)
                            conversation = JSON.parse(conversationString);

                        conversation.issues[issue.id] = { id: issue.id, key: issue.key, summary: result.fields.summary, projectId: self.selectedProject.id };
                        yasoon.outlook.mail.setConversationData(jira.mail, JSON.stringify(conversation)); //jira.mail.setConversationData(JSON.stringify(conversation));

                        //Set new message class to switch icon
                        if (!jira.mail.isSignedOrEncrypted || jira.settings.overwriteEncrypted)
                            jira.mail.setMessageClass('IPM.Note.Jira');
                    } catch (e) {
                        //Not so important
                        yasoon.util.log('Failed to set Conversation data', yasoon.util.severity.info, getStackTrace(e));
                    }

                    //Save Template if created by Email
                    if (self.mail) {
                        jira.emailController.saveSenderTemplate(result);
                    }

                }

                jira.close({ action: 'success' });
            })
            //Todo Refactor Error Messages
            .catch(jiraSyncError, function(e) {
                yasoon.util.log('Couldn\'t submit New Issue Dialog: ' + e.getUserFriendlyError() + ' || Issue: ' + JSON.stringify(result), yasoon.util.severity.warning);
                jira.transaction.currentCallCounter = -1; //Make sure the window will never close as issue has not been created
                yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSubmitIssue', { error: e.getUserFriendlyError() }));
                $('#JiraSpinner').hide();
                $('#create-issue-submit').prop('disabled', false);
            })
            .catch(function(e) {
                $('#JiraSpinner').hide();
                if (jira.issueCreated) {
                    yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorAfterSubmitIssue', { error: 'Unknown' }));
                } else {
                    $('#create-issue-submit').prop('disabled', false);
                    yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSubmitIssue', { error: 'Unknown' }));
                }
                jira.transaction.currentCallCounter = -1; //Make sure the window will never close as issue has not been created

                yasoon.util.log('Unexpected error in Create Issue Dialog: ' + e + ' || Issue: ' + JSON.stringify(result), yasoon.util.severity.error, getStackTrace(e));
            });
    };

    this.handleError = function(data, statusCode, result, errorText, cbkParam) {
        $('#MainAlert').show();
        $('#LoaderArea').hide();
        if (data && data.stack) {
            yasoon.util.log('Unexpected JS Error: ' + data, yasoon.util.severity.error, getStackTrace(data));
            window.lastError = data;
            console.log(arguments);
        } else {
            console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
            yasoon.util.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data, yasoon.util.severity.error);
        }
    };

    this.selectProject = function() {
        var selectedProject = $('#project').val();
        $('#MainAlert').hide();

        var templateServiceData = null;

        if (selectedProject) {
            var isTemplate = (selectedProject.indexOf('template') > -1);
            if (isTemplate) {
                var projId = selectedProject.replace('template', '');
                var template = $.grep(self.currentTemplates, function(temp) { return temp.project.id === projId; })[0];
                if (template) {
                    jira.selectedProject = $.grep(self.projects, function(proj) { return proj.id === projId; })[0];
                    self.currentIssue = template.values;
                    templateServiceData = template.serviceDesk;
                }
                else {
                    //Project does not exist (anymore?), return
                    $('#project').val('').trigger('change');
                    return;
                }
            }
            else {
                self.currentIssue = null;
                jira.selectedProject = $.grep(self.projects, function(proj) { return proj.id === selectedProject; })[0];
            }

            //For issue Picker
            jira.selectedProjectKey = jira.selectedProject.key;
            jira.selectedProjectId = jira.selectedProject.id;
            jira.projectIssues = [];

            //Show Loader!
            $('#ContentArea').css('visibility', 'hidden');
            $('#LoaderArea').show();

            Promise.all([
                self.getRequestTypes(jira.selectedProject),
                self.getProjectValues(),
                self.getMetaData(),
                //self.loadSenderUser()
            ])
                .spread(function(requestTypes) {
                    //New with JIRA 7: Depending on the project type, we render a little bit differently.
                    //Common stuff
                    $('#issuetype').empty().off();

                    //Render Issue Types
                    $.each(self.selectedProject.issueTypes, function(i, type) {
                        type.iconUrl = jira.icons.mapIconUrl(type.iconUrl);
                        $('#issuetype').append('<option data-icon="' + type.iconUrl + '" value="' + type.id + '">' + type.name + '</option>');
                    });

                    $('#issuetype').select2("destroy");
                    $("#issuetype").select2({
                        templateResult: formatIcon,
                        templateSelection: formatIcon
                    });
                    $('#issuetype').val(self.selectedProject.issueTypes[0].id).trigger('change');

                    $('#issuetype').change(function(e, promise) {
                        var meta = $.grep(self.projectMeta.issuetypes, function(i) { return i.id == $('#issuetype').val(); })[0];
                        $('#LoaderArea').show();
                        $('#ContentArea').css('visibility', 'hidden');
                        if (promise) {
                            promise.innerPromise = promise.innerPromise.then(function() {
                                return jira.renderIssue(meta);
                            });
                        } else {
                            jira.renderIssue(meta);
                        }

                    });

                    //Hide and revert Service Stuff
                    $('#switchServiceMode').addClass('hidden').removeClass('active');
                    $('#issuetype').prop("disabled", false);
                    $('#ServiceArea').addClass('hidden');
                    $('#behalfOfUserReporter').empty();

                    //Service Specific Stuff
                    if (jira.selectedProject.projectTypeKey == 'service_desk' && requestTypes) {
                        $('#requestType').empty().off();
                        //Render Request Types if it's an service project
                        requestTypes.groups.forEach(function(group) {
                            $('#requestType').append('<optgroup label="' + group.name + '"></optgroup>');
                            var currentGroup = $('#requestType').find('optgroup').last();
                            requestTypes.forEach(function(rt) {
                                if (rt.groups.filter(function(g) { return g.id === group.id; }).length > 0) {
                                    //This request type is assigned to current group --> display.
                                    if ((jira.systemInfo.versionNumbers[0] === 7 && jira.systemInfo.versionNumbers[1] > 0) || jira.systemInfo.versionNumbers[0] >= 1000) {
                                        currentGroup.append('<option data-icon = "' + rt.iconUrl + '" data-requesttype="' + rt.portalKey + '/' + rt.key + '" data-issuetype="' + rt.issueType + '" value="' + rt.id + '">' + rt.name + '</option>');
                                    } else {
                                        currentGroup.append('<option data-iconclass = "vp-rq-icon vp-rq-icon-' + rt.icon + '" data-requesttype="' + rt.portalKey + '/' + rt.key + '" data-issuetype="' + rt.issueType + '" value="' + rt.id + '">' + rt.name + '</option>');

                                    }
                                }
                            });
                        });
                        $('#requestType').select2("destroy");
                        $("#requestType").select2({
                            templateResult: formatIcon,
                            templateSelection: formatIcon
                        });

                        //Set Reporter Data
                        self.UIFormHandler.render('behalfReporter', { name: 'Reporter', required: false, schema: { system: 'reporter' } }, '#behalfOfUserReporter');
                        //self.setDefaultReporter('behalfReporter');

                        //Hide Label of newly generated Reporter Field
                        $('#behalfReporter-container label').addClass('hidden');

                        //Event for show/ hide portal data
                        $('#switchServiceMode').removeClass('hidden').off().click(function() {
                            $('#ServiceArea').toggleClass('hidden');
                            $('#switchServiceMode').toggleClass('active');

                            if ($('#switchServiceMode').hasClass('active')) {
                                $('#issuetype').prop("disabled", true);
                                $('#reporter-container').addClass('hidden');
                            } else {
                                $('#issuetype').prop("disabled", false);
                                $('#reporter-container').removeClass('hidden');
                            }
                        });

                        //Change Handler for Request Types
                        $('#requestType').change(function() {
                            var promise = { innerPromise: Promise.resolve() };
                            $('#issuetype').val($('#requestType').find(':selected').data('issuetype')).trigger('change', promise);

                            promise.innerPromise.then(function() {
                                $('#reporter-container').addClass('hidden');
                            });

                        });

                        //Check and set Service Desk specific template data
                        if (templateServiceData) {
                            if (templateServiceData.enabled) {
                                $('#switchServiceMode').trigger('click');
                            }
                            if (templateServiceData.requestType) {
                                $('#requestType').val(templateServiceData.requestType).trigger('change');
                            }
                        }
                    }

                    $('#IssueArea').show();

                    //Get Meta of first issue type and start rendering
                    var meta = $.grep(self.projectMeta.issuetypes, function(i) { return i.id == self.selectedProject.issueTypes[0].id; })[0];
                    return jira.renderIssue(meta);
                })
                .catch(jira.handleError);
        }
    };

    this.renderIssue = function(meta) {
        //Set this as current meta
        jira.currentMeta = meta;
        FieldController.loadMeta(jira.currentMeta.fields);

        return self.renderIssueUser()
            .catch(function(e) {
                window.lastError = e;
                console.log('Error in new renderLogic - switch to old one', e);
                return self.renderIssueFixed(meta);
            });
    };

    this.renderIssueFixed = function(meta) {
        $('#ContainerFields').empty();
        $('#tab-list').empty();
        $('#tab-list').addClass('hidden');

        var addedFields = [];

        //Render Standard Fields on a predefined order if they are in the current meta. (We do not get any order from JIRA, so we assume one for standard fields)
        fieldOrder.forEach(function(name) {
            if (meta.fields[name]) {
                jira.UIFormHandler.render(name, meta.fields[name], '#ContainerFields');
                addedFields.push(name);
            }
        });

        //Render all other fields (ordered by id - aka random :))
        $.each(meta.fields, function(key, value) {
            if (addedFields.indexOf(key) === -1) {
                self.UIFormHandler.render(key, value, $('#ContainerFields'));
            }
        });

        return true;
    };

    this.renderIssueUser = function() {
        return self.getUserPreferences()
            .then(function(renderData) {
                //First clean up everything
                $('#ContainerFields').empty();
                $('#tab-list').empty();
                $('#MainAlert').hide();

                //Render each field
                var renderedTabs = {};
                renderData.fields.forEach(function(field) {
                    if (field.id === FieldController.projectFieldId || field.id === FieldController.issueTypeFieldId)
                        return;

                    //Check if userPrefences allow current field
                    if (renderData.userPreferences.useQuickForm && (renderData.userPreferences.fields.indexOf(field.id) === -1 && field.required === false)) {
                        return;
                    }

                    //Render tab if nessecary
                    var containerId = '#ContainerFields';
                    if (renderData.sortedTabs.length > 1) {
                        if (!renderedTabs[field.tab.position]) {
                            $('#tab-list').append('<li role="presentation" class="' + ((field.tab.position === 0) ? 'active' : '') + '"><a href="#tab-content' + field.tab.position + '" role="tab" data-toggle="tab">' + field.tab.label + '</a></li>');
                            $('#ContainerFields').addClass('tab-content');
                            $('#ContainerFields').append('<div role="tabpanel" class="tab-pane" id="tab-content' + field.tab.position + '"></div>');
                            if (field.tab.position === 0) {
                                $('#tab-content' + field.tab.position).addClass('active');

                            }
                            renderedTabs[field.tab.position] = true;
                        }
                        containerId = '#tab-content' + field.tab.position;
                    }
                    if (jira.currentMeta.fields[field.id]) {
                        FieldController.render(field.id, $(containerId));
                    }
                });

                //Tabs nessecary?
                if (Object.keys(renderedTabs).length > 1) {
                    $('#tab-list').removeClass('hidden');
                } else {
                    $('#tab-list').addClass('hidden');
                }
            });
    };

    this.setBodyMarkup = function(baseMarkup, noProcessing) {
        var markup = baseMarkup;
        var bodyType = self.UIFormHandler.getFieldType(jira.currentMeta.fields[fieldMapping.body]);

        if (noProcessing) {
            jira.mailAsMarkup = markup;
            jira.UIFormHandler.setValue(fieldMapping.body, { schema: { custom: bodyType } }, jira.mailAsMarkup);
            return;
        }

        if (self.settings.addMailHeaderAutomatically === 'top') {
            markup = renderMailHeaderText(self.mail, true) + '\n' + markup;
        }
        else if (self.settings.addMailHeaderAutomatically === 'bottom') {
            markup = markup + '\n' + renderMailHeaderText(self.mail, true);
        }

        return handleAttachments(markup, self.mail).then(function(newMarkup) {
            jira.mailAsMarkup = newMarkup;
            jira.UIFormHandler.setValue(fieldMapping.body, { schema: { custom: bodyType } }, newMarkup);
        });
    };

    this.getProjectValues = function() {
        //Obsolete
        //Check in Cache
        if (jira.cacheProjects && jira.cacheProjects.length > 0) {
            var project = jira.cacheProjects.filter(function(p) { return p.key === jira.selectedProject.key; })[0];
            if (project) {
                jira.selectedProject = project;
                return Promise.resolve();
            }
        }

        return jiraGet('/rest/api/2/project/' + jira.selectedProject.key)
            .then(function(data) {
                jira.selectedProject = JSON.parse(data);

                //Sort Issue Types
                jira.selectedProject.issueTypes.sort(function(a, b) {
                    if (a.id > b.id)
                        return 1;
                    else
                        return -1;
                });
            });
    };

    this.getMetaData = function(projectId, issueTypeId) {
        if (self.currentIssue && self.currentIssue.editMeta) {
            return Promise.resolve(self.currentIssue.editMeta);
        }
        return self.getProjectMeta(projectId)
            .then(function(projectMeta) {
                return projectMeta.issuetypes.filter(function(it) { return it.id === issueTypeId; })[0];
            });
    };

    this.getProjectMeta = function(projectId) {
        //Check in Cache
        //Do not check cache for Teamlead Instance to have latest data every time.
        if (jira.cacheCreateMetas && jira.cacheCreateMetas.length > 0 && !jira.settings.teamleadApiKey) {
            var projectMeta = jira.cacheCreateMetas.filter(function(m) { return m.id === projectId; })[0];
            if (projectMeta) {
                jira.projectMeta = projectMeta;
                return Promise.resolve(projectMeta);
            }
        }

        return jiraGet('/rest/api/2/issue/createmeta?projectIds=' + projectId + '&expand=projects.issuetypes.fields')
            .then(function(data) {
                var meta = JSON.parse(data);
                //Find selected project (should be selected by API Call, but I'm not sure if it works due to missing test data )
                self.projectMeta = $.grep(meta.projects, function(p) { return p.id === projectId; })[0];
                return self.projectMeta;
            });
    };

    this.getRequestTypes = function getRequestTypes(project) {
        /*
        if (!project || project.projectTypeKey != 'service_desk') {
            return;
        }

        //We are not sure with which JIRA version they added servicedesk API. Using the project key is default, but does not work if project Key has been changed.
        //Use serviceDeskApi if possible.
        var serviceDeskKey = project.key.toLowerCase();
        request = jiraGet('/rest/servicedesk/1/servicedesk-data')
            .then(function(data) {
                var serviceData = JSON.parse(data);
                if (serviceData.length > 0)
                    serviceDeskKey = serviceData.filter(function(s) { return s.projectId == project.id; })[0].key;
            })
            .catch(function(e) {
                console.log(e);
                yasoon.util.log(e.toString(), yasoon.util.severity.warning);
            });

        //New cloud versioning
        if (jira.systemInfo.versionNumbers[0] >= 1000) {
            request = request.then(function() {
                return jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/groups')
            })
                .then(function(data) {
                    var groups = JSON.parse(data);
                    return groups;
                })
                .map(function(group) {
                    return jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/groups/' + group.id + '/request-types');
                })
                .map(function(typesData) {
                    return JSON.parse(typesData);
                })
                .then(function(types) {
                    var allTypes = [];
                    types.forEach(function(typesInner) {
                        typesInner.forEach(function(type) {
                            if (allTypes.filter(function(t) { return t.id === type.id; }).length === 0) {
                                allTypes.push(type);
                            }
                        });
                    });

                    return allTypes;
                });
        }
        else {
            request = request.then(function() {
                return jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/request-types')
            })
                .then(function(data) {
                    return JSON.parse(data);
                });
        }

        return request
            .then(function(data) {
                var requestTypes = data;

                //Get all Groups to make rendering easier
                var groups = [];

                requestTypes.forEach(function(rt) {
                    //a request type can be assigned to multiple groups:
                    if (!rt.groups) {
                        return;
                    }

                    rt.groups.forEach(function(group) {
                        if (groups.filter(function(g) { return g.id == group.id; }).length === 0) {
                            groups.push(group);
                        }
                    });

                    //Download Icon
                    rt.iconUrl = jira.icons.mapIconUrl(self.settings.baseUrl + '/servicedesk/customershim/secure/viewavatar?avatarType=SD_REQTYPE&avatarId=' + rt.icon);
                });

                //Sort groups by name
                groups.sort(function(a, b) { return a.name > b.name; });

                requestTypes.groups = groups;

                return requestTypes;
            }); */
    };

    this.getUserPreferences = function() {
        if (!jira.currentMeta)
            return Promise.reject();

        if (!jira.settings.newCreationScreen)
            return Promise.reject();

        //Check Cache
        if (jira.cacheUserMeta && jira.cacheUserMeta[jira.selectedProject.id] && jira.cacheUserMeta[jira.selectedProject.id][jira.currentMeta.id]) {
            return Promise.resolve(jira.cacheUserMeta[jira.selectedProject.id][jira.currentMeta.id]);
        }

        if (self.editIssueId) {
            return jiraGet('/secure/QuickEditIssue!default.jspa?issueId=' + jira.editIssueId + '&decorator=none').then(function(data) { return JSON.parse(data); }).catch(function() { });
        } else {
            return jiraGet('/secure/QuickCreateIssue!default.jspa?decorator=none&pid=' + jira.selectedProject.id + '&issuetype=' + jira.currentMeta.id).then(function(data) { return JSON.parse(data); }).catch(function() { });
        }
    };

    this.loadFields = function() {
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:textfield', SingleTextField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:url', SingleTextField);
        FieldController.register('com.pyxis.greenhopper.jira:gh-epic-label', SingleTextField);
        FieldController.register('summary', SingleTextField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:textarea', MultiLineTextField);
        FieldController.register('description', MultiLineTextField, { hasMentions: true });
        FieldController.register('environment', MultiLineTextField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes', CheckboxField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons', RadioField);
        FieldController.register('duedate', DateField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:datepicker', DateField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:datetime', DateTimeField);
        FieldController.register('labels', LabelSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:labels', LabelSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:float', NumberField);
        FieldController.register('priority', SingleSelectField);
        FieldController.register('security', SingleSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:select', SingleSelectField);
        FieldController.register('components', MultiSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multiselect', MultiSelectField);
        FieldController.register('fixVersions', VersionMultiSelectField, { multiSelect: true, releasedFirst: false });
        FieldController.register('versions', VersionMultiSelectField, { multiSelect: true, releasedFirst: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multiversion', VersionMultiSelectField, { multiSelect: true, releasedFirst: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:version', VersionMultiSelectField, { multiSelect: false, releasedFirst: true });
        FieldController.register('reporter', UserSelectField);
        FieldController.register('assignee', UserSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:userpicker', UserSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker', UserSelectField, { multiple: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect', CascadedSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:project', ProjectField);
        FieldController.register('timetracking', TimeTrackingField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:grouppicker', GroupSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multigrouppicker', GroupSelectField, { multiple: true });

        FieldController.register('attachment', AttachmentField);
        FieldController.register('com.pyxis.greenhopper.jira:gh-epic-link', EpicLinkSelectField);
        FieldController.register('com.pyxis.greenhopper.jira:gh-sprint', SprintSelectField);

        //Tempo
        FieldController.register('com.tempoplugin.tempo-accounts:accounts.customfield', TempoAccountField);
    };

}); //jshint ignore:line

function submitErrorHandler(data, statusCode, result, errorText, cbkParam) {
    $('#JiraSpinner').hide();
    var error = '';

    if (data !== null && data instanceof jiraSyncError) {
        result = data.result;
        statusCode = data.statusCode;
        errorText = data.errorText;
        cbkParam = data.cbkParam;
        error = data.getUserFriendlyError();
        data = data.data;
    } else {
        result = JSON.parse(result);

        //Parse different error messages summary --> errorMessages --> errors --> plain JSON

        if (result.errors && result.errors.summary) {
            error = result.errors.summary;
        } else if (result.errorMessages && result.errorMessages.length > 0) {
            result.errorMessages.forEach(function(msg) {
                if (error)
                    error += '\n';
                error += msg;
            });
        } else if (result.errors) {
            for (var key in result.errors) {
                var msg = result.errors[key];
                if (error)
                    error += '\n';
                error += msg;
            }
        } else {
            error = JSON.stringify(result);
        }
    }

    if (jira.issueCreated) {
        yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorAfterSubmitIssue', { error: error }));
    } else {
        $('#create-issue-submit').removeAttr("disabled");
        yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorSubmitIssue', { error: error }));
    }

    yasoon.util.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data + ' || ' + error, yasoon.util.severity.warning);

    jira.transaction.currentCallCounter = -1;
}

function submitSuccessHandler(data) {
    jira.transaction.currentCallCounter--;

    if (jira.transaction.currentCallCounter === 0) {
        //Creation successfull
        jira.close({ action: 'success' });
    }
}



function resizeWindow() {
    var bodyHeight = $('body').height();
    if (bodyHeight > 460) {
        $('body').css('overflow-y', 'hidden');
        $(".form-body").height(bodyHeight - 170);
    } else {
        $('body').css('overflow-y', 'scroll');
        $(".form-body").height(290);
    }
}
//@ sourceURL=http://Jira/Dialog/jiraDialog.js