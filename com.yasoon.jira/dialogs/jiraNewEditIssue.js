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
    var a = {}; //just for correct highlighting :) Otherwise Visual Code does not work correctly

    var self = this;
    jira = this;

    //For application
    this.icons = new JiraIconController();
    this.emailController = null;
    this.templateController = null;
    this.selectedProject = null;
    this.selectedIssueType = null;

    //From Init
    this.isEditMode = false;
    this.systemInfo = null;
    this.editIssueId = null;
    this.settings = {};
    this.ownUser = {};
    this.mail = {};
    this.cacheUserMeta = [];
    this.cacheCreateMetas = [];
    this.cacheProjects = [];
    this.type = ''; //Either '' or 'wholeMail' or 'selectedText'
    //Current Issue for editIssueId
    this.currentIssue = null;

    //Order of Fields in the form if in fixed mode. Fields not part of the array will be rendered afterwards
    //This can be customized by JIRA admin
    var fieldOrder = [];

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
        self.mail = initParams.mail;
        self.cacheUserMeta = initParams.userMeta || [];
        self.cacheCreateMetas = initParams.createMetas || [];
        self.cacheProjects = initParams.projects || [];
        self.systemInfo = initParams.systemInfo || { versionNumbers: [6, 4, 0] };
        self.type = initParams.type;

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
        } else {
            fieldOrder = [
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
        }

        if (jira.mail)
            jira.emailController = new EmailController(jira.mail, jira.type, jira.settings, jira.ownUser);

        //Render Header fields
        FieldController.loadField(ProjectField.defaultMeta, ProjectField, jira.cacheProjects);
        FieldController.render(FieldController.projectFieldId, $('#HeaderArea'));

        FieldController.loadField(IssueTypeField.defaultMeta, IssueTypeField);
        FieldController.render(FieldController.issueTypeFieldId, $('#IssueArea'));


        //Register Attachment Field with concrete attachments
        var attachments = [];
        if (jira.emailController) {
            attachments = jira.emailController.getAttachmentFileHandles();
        }
        FieldController.register(FieldController.attachmentFieldId, AttachmentField, attachments);

        //Hook Events
        FieldController.registerEvent(EventType.FieldChange, self, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.FieldChange, self, FieldController.issueTypeFieldId);

        if (self.isEditMode) {
            $('#LoaderArea').removeClass('hidden');

            //Set Project and issueType read-only
            $('#' + FieldController.projectFieldId).prop('disabled', true);
            $('#' + FieldController.issueTypeFieldId).prop('disabled', true);
            jiraGet('/rest/api/2/issue/' + self.editIssueId + '?expand=editmeta,renderedFields')
                .then(function(issueString) {
                    jira.currentIssue = JSON.parse(issueString);

                    //Set Project and issueType 
                    FieldController.setValue(FieldController.projectFieldId, jira.currentIssue.fields.project, true);
                    FieldController.setValue(FieldController.issueTypeFieldId, jira.currentIssue.fields.issuetype, true);
                });
        } else {
            jira.templateController = new TemplateController(jira.ownUser);
            jira.templateController.setInitialValues();
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
            jira.selectedIssueType = newValue;
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
                    //Set this as current meta
                    FieldController.loadMeta(meta.fields);
                    return self.renderIssue(meta.fields);
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

                    //Set Templates Values
                    if (jira.templateController) {
                        jira.templateController.setFieldValues(self.selectedProject.id, self.selectedIssueType.id);
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

        FieldController.raiseEvent(EventType.Cleanup, null);
    };

    this.submitForm = function(e) {
        e.preventDefault();
        //Reset data
        var lifecycleData = {};
        var result = {};
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
                yasoon.util.log('Unexpected error in Create Issue Dialog: ' + e + ' || Issue: ' + JSON.stringify(result), yasoon.util.severity.error, getStackTrace(e));
            });
    };

    this.renderIssue = function(meta) {
        return self.renderIssueUser(meta)
            .catch(function(e) {
                window.lastError = e;
                console.log('Error in new renderLogic - switch to old one', e);
                return self.renderIssueFixed(meta);
            });
    };

    this.renderIssueUser = function(meta) {
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
                    if (meta[field.id]) {
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

    this.renderIssueFixed = function(meta) {
        $('#ContainerFields').empty();
        $('#tab-list').empty();
        $('#tab-list').addClass('hidden');

        var addedFields = [];

        //Render Standard Fields on a predefined order if they are in the current meta. (We do not get any order from JIRA, so we assume one for standard fields)
        fieldOrder.forEach(function(name) {
            if (meta[name]) {
                FieldController.render(name, $('#ContainerFields'));
                addedFields.push(name);
            }
        });

        //Render all other fields (ordered by id - aka random :))
        Object.keys(meta).forEach(function(name) {
            FieldController.render(name, $('#ContainerFields'));
        });

        return true;
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
                return Promise.resolve(projectMeta);
            }
        }

        return jiraGet('/rest/api/2/issue/createmeta?projectIds=' + projectId + '&expand=projects.issuetypes.fields')
            .then(function(data) {
                var meta = JSON.parse(data);
                //Find selected project (should be selected by API Call, but I'm not sure if it works due to missing test data )
                var projectMeta = meta.projects.filter(function(p) { return p.id === projectId; })[0];
                jira.cacheCreateMetas.push(projectMeta);
                return projectMeta;
            });
    };

    this.getUserPreferences = function() {
        //Check Cache
        if (jira.cacheUserMeta && jira.cacheUserMeta[jira.selectedProject.id] && jira.cacheUserMeta[jira.selectedProject.id][jira.selectedIssueType.id]) {
            return Promise.resolve(jira.cacheUserMeta[jira.selectedProject.id][jira.selectedIssueType.id]);
        }

        if (jira.isEditMode) {
            return jiraGet('/secure/QuickEditIssue!default.jspa?issueId=' + jira.editIssueId + '&decorator=none')
                .then(function(data) { return JSON.parse(data); })
                .catch(function() { });
        } else {
            return jiraGet('/secure/QuickCreateIssue!default.jspa?decorator=none&pid=' + jira.selectedProject.id + '&issuetype=' + jira.selectedIssueType.id)
                .then(function(data) { return JSON.parse(data); })
                .catch(function() { });
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
        FieldController.register('fixVersions', VersionSelectField, { multiSelect: true, releasedFirst: false });
        FieldController.register('versions', VersionSelectField, { multiSelect: true, releasedFirst: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multiversion', VersionSelectField, { multiSelect: true, releasedFirst: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:version', VersionSelectField, { multiSelect: false, releasedFirst: true });
        FieldController.register('reporter', UserSelectField);
        FieldController.register('assignee', UserSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:userpicker', UserSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker', UserSelectField, { multiple: true });
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect', CascadedSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:project', ProjectField);
        FieldController.register('timetracking', TimeTrackingField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:grouppicker', GroupSelectField);
        FieldController.register('com.atlassian.jira.plugin.system.customfieldtypes:multigrouppicker', GroupSelectField, { multiple: true });
        FieldController.register('com.pyxis.greenhopper.jira:gh-epic-link', EpicLinkSelectField);
        FieldController.register('com.pyxis.greenhopper.jira:gh-sprint', SprintSelectField);

        //Tempo
        FieldController.register('com.tempoplugin.tempo-accounts:accounts.customfield', TempoAccountField);
    };

}); //jshint ignore:line

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