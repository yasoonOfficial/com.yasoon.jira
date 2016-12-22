var issueTypePromise = null;
function getIssueTypeValues() {
    if (!issueTypePromise) {
        if (isCloud) {
            issueTypePromise = new Promise(function (resolve, reject) {
                AP.require('request', function (request) {
                    request({
                        url: '/rest/api/2/issuetype',
                        type: 'GET',
                        success: function (issuetypes) {
                            issuetypes = JSON.parse(issuetypes);
                            resolve(issuetypes);
                        }
                    });
                });
            });
        } else {
            issueTypePromise = Promise.resolve($.get(systemInfo.baseUrl + '/rest/api/2/issuetype'));
        }

        issueTypePromise = issueTypePromise.then(function (issuetypes) {
            var result = [];
            if (issuetypes && issuetypes.length > 0) {
                issuetypes.forEach(function (issuetype) {
                    result.push({ id: issuetype.id, text: issuetype.name });
                });
            }

            return result;
        });
    }
    return issueTypePromise;
}

ko.components.register('issue-type-picker', {
    viewModel: function (params) {
        // Data: default value - either null or group
        var self = this;
        this.hasOthersOption = params.hasOthersOption;
        this.currentProjectId = params.projectId || ko.observable();
        this.chosenValue = params.issueTypeId || ko.observable();

        this.currentProjectId.subscribe(function (newProjectId) {
            if (newProjectId && newProjectId != -1) {
                self.getProjectIssueTypes(newProjectId)
                    .then(function (project) {
                        if (project && project.issueTypes) {
                            var result = [];
                            project.issueTypes.forEach(function (issuetype) {
                                result.push({ id: issuetype.id, text: issuetype.name });
                            });

                            if (self.hasOthersOption) {
                                result.push({ id: -1, text: 'Others (*)' });
                            }
                            self.data(null);
                            self.data(result);
                        }
                    });
            } else {
                self.setDefaultData();
            }

        });

        this.data = ko.observable();

        this.setDefaultData = function () {
            getIssueTypeValues()
                .then(function (issueTypes) {
                    var ownIssueTypes = JSON.parse(JSON.stringify(issueTypes));
                    if (self.hasOthersOption) {
                        ownIssueTypes.push({ id: -1, text: 'Others (*)' });
                    }
                    self.data(ownIssueTypes);
                });
        };

        this.getProjectIssueTypes = function (projectId) {
            if (isCloud) {
                return new Promise(function (resolve, reject) {
                    AP.require('request', function (request) {
                        request({
                            url: '/rest/api/2/project/' + projectId,
                            type: 'GET',
                            success: function (project) {
                                project = JSON.parse(project);
                                resolve(project);
                            }
                        });
                    });
                });
            } else {
                return Promise.resolve($.get(systemInfo.baseUrl + '/rest/api/2/project/' + projectId));
            }
        };

        this.options = {
            allowClear: true,
            placeholder: 'Choose issuetype',
            dataObs: this.data
        };

        if (this.currentProjectId()) {
            this.currentProjectId.valueHasMutated();
        } else {
            this.setDefaultData();
        }
    },
    template:
    '<div data-bind="if: data"><select style="display:block; width: 100%;" data-bind="select2: options, value:chosenValue"><option></option></select></div>'
});