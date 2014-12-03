var jira = {};

$(function () {
    $('body').css('overflow-y', 'hidden');
});

function formatIcon(element) {
    if (!element.id) return element.text; // optgroup
    return '<img style="margin-right:3px;" src="'+ $(element.element).data('icon')+'"/>' + element.text;
}

function formatUser(user) { return user.displayName; }

yasoon.dialog.load(new function () { //jshint ignore:line
    var self = this;
    var projectMeta = '';
    jira = this;
    jira.CONST_HEADER = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
        
    self.UIFormHandler = UIFormHandler();

    self.init = function (initParams) {
        self.settings = initParams.settings;
        self.ownUser = initParams.ownUser;
        self.editIssue = initParams.editIssue;

        self.projects = [];
        self.selectedAttachments = [];
        //Load Recent Projects
        var projectsString = yasoon.setting.getAppParameter('recentProjects');
        if (projectsString) {
            self.recentProjects = JSON.parse(projectsString);
        } else {
            self.recentProjects = [];
        }

        if (initParams.text) {
            $('#description').val(initParams.text);
        }

        if (!initParams.editIssue) {
            //Create case --> Select all projects and if user select one, load project settings
            $('#project').select2({
                placeholder: "Select a Project"
            });

            //Select all projects
            yasoon.oauth({
                url: self.settings.baseUrl + '/rest/api/2/project',
                oauthServiceName: 'auth',
                headers: jira.CONST_HEADER,
                type: yasoon.ajaxMethod.Get,
                error: jira.handleError,
                success: function (data) {
                    self.projects = JSON.parse(data);
                    console.log('Projects: ', self.projects);
                    var group = $('#project').find('.all');
                    $.each(self.projects, function (i, project) {
                        group.append('<option style="background-image: url(images/projectavatar.png)" value="' + project.id + '" data-key="' + project.key + '">' + project.name + '</option>');
                    });
                    group = $('#project').find('.recent');
                    $.each(self.recentProjects, function (i, project) {
                        group.append('<option style="background-image: url(images/projectavatar.png)" value="' + project.id + '" data-key="' + project.key + '">' + project.name + '</option>');
                    });

                    $('#project').select2("destroy");
                    $('#project').select2({
                        placeholder: "Select a Project"
                    });

                    $('#project').change(self.selectProject);
                }
            });
        } else {
            //It's the edit case
            //Set Title & Labels
            $('.jira-title').html('Edit Issue');
            $('.qf-create-another').hide(); //Create another button
            $('#create-issue-submit').html('Save');

            //Set Text data
            if (self.editIssue.fields.summary)
                $('#summary').val(self.editIssue.fields.summary);
            if (self.editIssue.fields.duedate) 
                $('#duedate').val(moment(new Date(self.editIssue.fields.duedate)).format('YYYY/MM/DD'));
            if (self.editIssue.fields.enviroment)
                $('#enviroment').val(self.editIssue.fields.enviroment);
            if (self.editIssue.fields.description)
                $('#description').val(self.editIssue.fields.description);

            //Select issue project manually and load all project parameters
            var all = $('#project').find('.all');
            var proj = self.editIssue.fields.project;
            self.projects.push(proj);
            all.append('<option style="background-image: url(images/projectavatar.png)" value="' + proj.id + '" data-key="' + proj.key + '">' + proj.name + '</option>');
            $('#project').select2("destroy");
            $('#project').select2();
            $('#project').select2('val', proj.id);
            $('#project').select2("enable", false);

            self.selectProject();
        }

        $('#AddAttachmentLink').click(function () {
            yasoon.view.fileChooser.open(function (selectedFiles) {
                self.selectedAttachments = selectedFiles;

                $('#AttachmentContainer').html('');
                //Render Attachments
                $.each(self.selectedAttachments, function (i, fileHandle) {
                    $('#AttachmentContainer').append('<div><span><img style="width:16px;" src="' + fileHandle.getFileIconPath() + '">' + fileHandle.getFileName() + '</span></div>');
                });

            });
        });

        //Submit Button - (Create & Edit)
        $('#create-issue-submit').unbind().click(function (e) {
            $('#MainAlert').hide();
            var result = {
                fields: {}
            };

            $('#create-issue-submit').attr('disabled', 'disabled');
            $('#JiraSpinner').show();

            //Project ID
            result.fields.project = {
                id: $('#project').val()
            };

            //Issue Type
            result.fields.issuetype = {
                id: $('#issuetype').val()
            };

            //Title
            result.fields.summary = $('#summary').val();

            //Due Date
            if ($('#duedate').val()) {
                result.fields.duedate = moment(new Date($('#duedate').val())).format('YYYY-MM-DD');
            }
            //Priority
            result.fields.priority = {
                id: $('#priority').val()
            };

            //Components
            if ($('#components').val() && $('#components').val().length > 0) {
                var comps = [];
                $.each($('#components').val(), function (i, id) {
                    comps.push({ id: id });
                });
                result.fields.components = comps;
            }

            //Versions
            if ($('#versions').val() && $('#versions').val().length > 0) {
                var versions = [];
                $.each($('#versions').val(), function (i, id) {
                    versions.push({ id: id });
                });
                result.fields.versions = versions;
            }
            //FixVersions
            if ($('#fixVersions').val() && $('#fixVersions').val().length > 0) {
                var fixversions = [];
                $.each($('#fixVersions').val(), function (i, id) {
                    fixversions.push({ id: id });
                });
                result.fields.fixVersions = fixversions;
            }
            //Labels
            if ($('#labels').val()) {
                result.fields.labels = $('#labels').val().split(',');
            }

            //Enviroment
            if ($('#enviroment').val()) {
                result.fields.enviroment = $('#enviroment').val();
            }
            //Description
            if ($('#description').val()) {
                result.fields.description = $('#description').val();
            }
            //Assignee
            if ($('#assignee').val()) {
                result.fields.assignee = {
                    name: $('#assignee').val()
                };
            }

            //Get Custom Fields
            self.UIFormHandler.getFormData(projectMeta, result);

            //Switch for edit or create
            var url = self.settings.baseUrl + '/rest/api/2/issue';
            var method = yasoon.ajaxMethod.Post;
            if (self.editIssue) {
                url = url + '/' + self.editIssue.key;
                method = yasoon.ajaxMethod.Put;
            }
            yasoon.oauth({
                url:url,
                oauthServiceName: 'auth',
                headers: jira.CONST_HEADER,
                data: JSON.stringify(result),
                type: method,
                error: function (data, statusCode, result, errorText, cbkParam) {
                    $('#JiraSpinner').hide();
                    $('#create-issue-submit').removeAttr("disabled");
                    var error = (JSON.parse(result).errors.summary) ? JSON.parse(result).errors.summary : JSON.stringify(JSON.parse(result).errors);
                    alert('Sorry, that did not work. Check your input and try again. ' + error);
                },
                success: function (data) {
                    if (self.selectedAttachments.length > 0 && data) {
                        var issue = JSON.parse(data);
                        var formData = [];
                        $.each(self.selectedAttachments, function (i, file) {
                            formData.push({
                                type: yasoon.formData.File,
                                name: 'file',
                                value: file
                            });
                        });

                        yasoon.oauth({
                            url: jira.settings.baseUrl + '/rest/api/2/issue/' + issue.id + '/attachments',
                            oauthServiceName: 'auth',
                            type: yasoon.ajaxMethod.Post,
                            formData: formData,
                            headers: { Accept: 'application/json', 'X-Atlassian-Token': 'nocheck' },
                            error: function (data, statusCode, result, errorText, cbkParam) {
                                self.close({ action: 'success' });
                                yasoon.dialog.showMessageBox('Issue ' + issue.key + ' created, but uploading the attachments did not work.');

                            },
                            success: function (data) {
                                self.close({ action: 'success' });
                            }
                        });
                    } else {
                        self.close({ action: 'success' });
                    }
                }
            });
            e.preventDefault();
        });

        $('#create-issue-cancel').unbind().click(function () {
            self.close({ action: 'cancel' });
        });
    }; 

    this.close = function (params) {
        //Check if dialog should be closed or not
        if (params && params.action === 'success' && $('#qf-create-another').is(':checked')) {
            $('#JiraSpinner').hide();
            $('.form-body').scrollTop(0);
            $('#create-issue-submit').removeAttr("disabled");
            $('#summary').val('');
            $('#description').val('');
        } else {
            yasoon.dialog.close({ action: 'success' });
        }
    };

    this.handleError = function (data, statusCode, result, errorText, cbkParam) {
        $('#MainAlert').show();
        console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
    };

    this.addRecentProject = function (project) {
        var exists = $.grep(self.recentProjects, function (proj) { return proj.id === project.id; });
        if (exists.length === 0) {
            //It does not exist, so we'll add it! But make sure there is a maximum of 5 recent Items.
            if (self.recentProjects.length >= 5) {
                self.recentProjects = self.recentProjects.slice(1);
            }
            self.recentProjects.push(project);
            yasoon.setting.setAppParameter('recentProjects', JSON.stringify(self.recentProjects));
        }
    };

    this.updateCustomFields = function (meta) {
        if (!meta)
            return;

        //Find Meta for current Issue Type
        var metaIssue = $.grep(meta.issuetypes, function (i) { return i.id == $('#issuetype').val(); })[0];

        if (metaIssue) {
            //Init Data - hide everything and cleanup custom fields --> generate them afterwards again based on new meta
            $('.field-group').hide();
            $('#ContainerCustomFields').html('');

            //Apply new meta
            $.each(metaIssue.fields, function (key, value) {
                //Handle Priority
                if (key === 'priority') {
                    $('#priority').html('');
                    $.each(value.allowedValues, function(i, prio) {
                        $('#priority').append('<option class="imagebacked" data-icon="'+prio.iconUrl +'" value="'+ prio.id +'">'+ prio.name +'</option>');
                    });
                    $('#priority').val('3'); //Set major as default
                    if (self.editIssue && self.editIssue.fields.priority) {
                        $('#priority').val(self.editIssue.fields.priority.id);
                    }

                    $('#priority').select2('destroy');
                    $('#priority').select2({
                        formatResult: formatIcon,
                        formatSelection: formatIcon,
                        escapeMarkup: function (m) { return m; }
                    });
                }

                //Show/Hide Standard Fields
                if ($('#' + key).length > 0) {
                    $('#' + key).closest('.field-group').show();
                }
                //Handle Custom Fields
                if (key.indexOf('customfield_') > -1) {
                    self.UIFormHandler.render(key, value, $('#ContainerCustomFields'));
                }
            });
        }

    };

    this.selectProject = function () {
        var edit = !!self.editIssue;
        $('#MainAlert').hide();
        console.log('selected Project: ' + $('#project').val());
        if ($('#project').val() && $('#project').val() !== '0') {
            var project = $.grep(self.projects, function (proj) { return proj.id === $('#project').val(); })[0];

            // Save Project in recently used
            self.addRecentProject(project);

            //Get Values of project
            yasoon.oauth({
                url: self.settings.baseUrl + '/rest/api/2/project/' + project.id,
                oauthServiceName: 'auth',
                headers: jira.CONST_HEADER,
                type: yasoon.ajaxMethod.Get,
                error: jira.handleError,
                success: function (data) {
                    var project = JSON.parse(data);
                    $('#issuetype').html(' ');
                    project.issueTypes.sort(function (a, b) {
                        if (a.id > b.id)
                            return 1;
                        else
                            return -1;
                    });
                    $.each(project.issueTypes, function (i, type) {
                        $('#issuetype').append('<option data-icon="' + type.iconUrl + '" value="' + type.id + '">' + type.name + '</option>');
                    });

                    $("#issuetype").select2({
                        formatResult: formatIcon,
                        formatSelection: formatIcon,
                        escapeMarkup: function (m) { return m; }
                    });

                    //Handle edit case
                    if (edit) {
                        $("#issuetype").select2('val', self.editIssue.fields.issuetype.id);
                        $("#issuetype").select2('enable', false);
                        $("#priority").select2('val', self.editIssue.fields.priority.id);
                    }

                    $('#issuetype').change(function () {
                        self.updateCustomFields(projectMeta);
                    });

                    self.updateCustomFields(projectMeta);

                    $('#IssueArea').show();
                    $('#ContentArea').show();
                }
            });

            //Get components
            yasoon.oauth({
                url: self.settings.baseUrl + '/rest/api/2/project/' + project.id + '/components',
                oauthServiceName: 'auth',
                headers: jira.CONST_HEADER,
                type: yasoon.ajaxMethod.Get,
                error: jira.handleError,
                success: function (data) {
                    var components = JSON.parse(data);
                    $('#components').html('');
                    $.each(components, function (i, comp) {
                        $('#components').append('<option title="' + comp.description + '" value="' + comp.id + '">' + comp.name + '</option>');
                    });
                    $('#components').select2();

                    //Edit case
                    if (edit) {
                        var comps = [];
                        $.each(self.editIssue.fields.components, function (i, comp) {
                            comps.push(comp.id);
                        });
                        $('#components').select2('val', comps);
                    }
                }
            });

            //Get Versions
            yasoon.oauth({
                url: self.settings.baseUrl + '/rest/api/2/project/' + project.id + '/versions',
                oauthServiceName: 'auth',
                headers: jira.CONST_HEADER,
                type: yasoon.ajaxMethod.Get,
                error: jira.handleError,
                success: function (data) {
                    var versions = JSON.parse(data);
                    $('#versions').html('');
                    $('#fixVersions').html('');

                    $.each(versions, function (i, comp) {
                        $('#versions').append('<option title="' + comp.description + '" value="' + comp.id + '">' + comp.name + '</option>');
                        $('#fixVersions').append('<option title="' + comp.description + '" value="' + comp.id + '">' + comp.name + '</option>');
                    });
                    $('#versions').select2();
                    $('#fixVersions').select2();

                    //Edit case
                    if (edit) {
                        var fixVers = [];
                        $.each(self.editIssue.fields.fixVersions, function (i, version) {
                            fixVers.push(version.id);
                        });
                        $('#fixVersions').select2('val', fixVers);

                        var vers = [];
                        $.each(self.editIssue.fields.versions, function (i, version) {
                            vers.push(version.id);
                        });
                        $('#versions').select2('val', vers);
                    }
                }
            });

            //Get Assignable Users
            yasoon.oauth({
                url: self.settings.baseUrl + '/rest/api/2/user/assignable/search?project=' + project.key + '&maxResults=1000',
                oauthServiceName: 'auth',
                headers: jira.CONST_HEADER,
                type: yasoon.ajaxMethod.Get,
                error: jira.handleError,
                success: function (data) {
                    var assignees = JSON.parse(data);
                    //Transform Data
                    $.each(assignees, function (i, user) {
                        user.id = user.name;
                    });

                    $('#assignee').select2({
                        data: { results: assignees, text: 'displayName' },
                        formatResult: formatUser,
                        formatSelection: formatUser,
                    });

                    if (edit && self.editIssue.fields.assignee) {
                        $('#assignee').select2('val', self.editIssue.fields.assignee.id);
                    }

                    $('#assign-to-me-trigger').click(function () {
                        if (self.ownUser) {
                            $('#assignee').val(self.ownUser.name).trigger("change");
                        }
                    });
                }
            });

            //Meta Data for custom fields
            yasoon.oauth({
                url: self.settings.baseUrl + '/rest/api/2/issue/createmeta?projectIds=' + project.id + '&expand=projects.issuetypes.fields',
                oauthServiceName: 'auth',
                headers: jira.CONST_HEADER,
                type: yasoon.ajaxMethod.Get,
                error: jira.handleError,
                success: function (data) {
                    var meta = JSON.parse(data);
                    console.log(meta);
                    //Find selected project (should be selected by API Call, but I'm not sure if it works due to missing test data )
                    projectMeta = $.grep(meta.projects, function (p) { return p.id === project.id; })[0];
                    self.updateCustomFields(projectMeta);
                }
            });

            //Label Data
            yasoon.oauth({
                url: self.settings.baseUrl + '/rest/api/1.0/labels/suggest?query=',
                oauthServiceName: 'auth',
                headers: jira.CONST_HEADER,
                type: yasoon.ajaxMethod.Get,
                error: jira.handleError,
                success: function (data) {
                    var labels = JSON.parse(data);
                    var labelArray = [];
                    if (labels.suggestions) {
                        $.each(labels.suggestions, function (i, label) {
                            labelArray.push(label.label);
                        });
                    }
                    $('#labels').select2({
                        tags: labelArray,
                        tokenSeparators: [" "]
                    });

                    if (edit && self.editIssue.fields.labels) {
                        $('#labels').select2('val', self.editIssue.fields.labels);
                    }

                }
            });
        }
    };
}); //jshint ignore:line

function UIFormHandler() {

    function renderSingleText(id, field, container) {
        $(container).append('<div class="field-group">' +
                            '   <label for="' + field.name + '">' + field.name +
                            '       '+(( field.required) ? '<span class="aui-icon icon-required">Required</span>' : '' ) + 
                            '   </label>' +
                            '    <input class="text long-field" id="' + id + '" name="' + id + '" value="" type="text" data-type="com.atlassian.jira.plugin.system.customfieldtypes:textfield">' +
                            '</div>');
    }
    
    return {
        render: function (id, field, container) {
            switch (field.schema.custom) {
                case 'com.atlassian.jira.plugin.system.customfieldtypes:textfield':
                case 'com.atlassian.jira.plugin.system.customfieldtypes:url':
                    renderSingleText(id, field, container);
                    break;
            }
        },
        getFormData: function (meta, result) {
            result = result || {};

            //Find Meta for current Issue Type
            var metaIssue = $.grep(meta.issuetypes, function (i) { return i.id == $('#issuetype').val(); })[0];

            if (metaIssue) {
                $.each(metaIssue.fields, function (key, value) {
                    if (key.indexOf('customfield_') > -1) {
                        //Try to find the field in form
                        var elem = $('#' + key);
                        if (elem.length > 0 && elem.val()) {
                            console.log('Element found: ', elem);
                            switch (elem.data('type')) {
                                case 'com.atlassian.jira.plugin.system.customfieldtypes:textfield':
                                    result.fields[key] = elem.val();
                                    break;
                            }
                        }
                    }
                });
            }

        }
    };
}


 