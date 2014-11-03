var jira = {};

$(function () {
    $('body').css('overflow-y', 'hidden');
});

function formatIcon(element) {
    if (!element.id) return element.text; // optgroup
    return '<img style="margin-right:3px;" src="'+ $(element.element).data('icon')+'"/>' + element.text;
}

function formatUser(user) { return user.displayName; }

yasoon.dialog.load(new function () {
    var self = this;
    jira = this;
    jira.CONST_HEADER = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
        

    self.init = function (initParams) {
        self.settings = initParams.settings;

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
                    group.append('<option style="background-image: url(images/projectavatar.png)" value="' +project.id + '" data-key="' + project.key+'">' + project.name +'</option>');
                });
                group = $('#project').find('.recent');
                $.each(self.recentProjects, function (i, project) {
                    group.append('<option style="background-image: url(images/projectavatar.png)" value="' + project.id + '" data-key="' + project.key + '">' + project.name + '</option>');
                });

                $('#project').select2({
                    placeholder: "Select a Project",
                    allowClear: true
                });

                $('#project').change(function () {
                    console.log('changed: ' + $('#project').val());
                    if ($('#project').val() !== '0') {
                        var project = $.grep(self.projects, function (proj) { return proj.id === $('#project').val(); })[0];

                        // Save Project in recently used
                        self.addRecentProject(project);

                        //Get Values of project
                        yasoon.oauth({
                            url: self.settings.baseUrl + '/rest/api/2/project/' + $('#project').val(),
                            oauthServiceName: 'auth',
                            headers: jira.CONST_HEADER,
                            type: yasoon.ajaxMethod.Get,
                            error: jira.handleError,
                            success: function (data) {
                                var project = JSON.parse(data);
                                $('#issuetype').html(' ');
                                $.each(project.issueTypes, function (i, type) {
                                    $('#issuetype').append('<option data-icon="' + type.iconUrl + '" value="' + type.id + '">' + type.name + '</option>');
                                });

                                $("#issuetype").select2({
                                    formatResult: formatIcon,
                                    formatSelection: formatIcon,
                                    escapeMarkup: function (m) { return m; }
                                });
                                $('#IssueArea').show();
                            }
                        });

                        yasoon.oauth({
                            url: self.settings.baseUrl + '/rest/api/2/project/' + $('#project').val() + '/components',
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

                                $('#priority').select2({
                                    formatResult: formatIcon,
                                    formatSelection: formatIcon,
                                    escapeMarkup: function (m) { return m; }
                                });

                                $('#ContentArea').show();
                            }
                        });

                        yasoon.oauth({
                            url: self.settings.baseUrl + '/rest/api/2/project/' + $('#project').val() + '/versions',
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
                            }
                        });

                        
                        yasoon.oauth({
                            url: self.settings.baseUrl + '/rest/api/2/user/assignable/search?project=' + project.key,
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
                                console.log(assignees);
                                $('#assignee').select2({
                                    data: { results: assignees, text: 'displayName' },
                                    formatResult: formatUser,
                                    formatSelection: formatUser,
                                });
                            }
                        });

                        yasoon.oauth({
                            url: self.settings.baseUrl + '/rest/api/2/issue/createmeta?projectIds=' + $('#project').val() + '&expand=projects.issuetypes.fields',
                            oauthServiceName: 'auth',
                            headers: jira.CONST_HEADER,
                            type: yasoon.ajaxMethod.Get,
                            error: jira.handleError,
                            success: function (data) {
                                var meta = JSON.parse(data);
                                console.log(meta);
                            }
                        });
                    }
                });

                $('#create-issue-submit').click(function (e) {
                    var result = {
                        fields: {}
                    };

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
                        result.fields.duedate = new Date($('#duedate').val()).toISOString().split('T')[0];
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
                        result.fields.fixversions = fixversions;
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
                    if($('#assignee').val()) {
                        result.fields.assignee = {
                            name: $('#assignee').val()
                        };
                    }

                    console.log(result);

                    yasoon.oauth({
                        url: self.settings.baseUrl + '/rest/api/2/issue',
                        oauthServiceName: 'auth',
                        headers: jira.CONST_HEADER,
                        data: JSON.stringify(result),
                        type: yasoon.ajaxMethod.Post,
                        error: function (data, statusCode, result, errorText, cbkParam) {
                            alert('Sorry, that did not work. Check your input and try again. ' + errorText);
                        },
                        success: function (data) {
                            yasoon.dialog.close({ action: 'success' });
                        }
                    });

                    e.preventDefault();
                });

                $('#create-issue-cancel').click(function () {
                    yasoon.dialog.close({ action: 'cancel' });
                });
            }
        });
    };

    this.handleError = function (data, statusCode, result, errorText, cbkParam) {
        console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
    };

    this.addRecentProject = function (project) {
        var exists = $.grep(self.recentProjects, function (proj) { return proj.id === project.id; });
        if (exists.length === 0) {
            //It does not exist, so we'll add it! But make sure there is a maximum of 9 recent Items.
            if (self.recentProjects.length >= 9) {
                self.recentProjects = self.recentProjects.slice(1);
            }
            self.recentProjects.push(project);
            yasoon.setting.setAppParameter('recentProjects', JSON.stringify(self.recentProjects));
        }
    };
});


 