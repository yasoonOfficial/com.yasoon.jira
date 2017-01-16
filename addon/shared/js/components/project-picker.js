var projectPromise = null;
function getProjectValues() {
    if (!projectPromise) {
        if (isCloud) {
            projectPromise = new Promise(function (resolve, reject) {
                AP.require('request', function (request) {
                    request({
                        url: '/rest/api/2/project',
                        type: 'GET',
                        success: function (projects) {
                            projects = JSON.parse(projects);
                            resolve(projects);
                        }
                    });
                });
            });
        } else {
            projectPromise = Promise.resolve($.get(systemInfo.baseUrl + '/rest/api/2/project'));
        }

        projectPromise = projectPromise.then(function (projects) {
            var result = [];
            if (projects && projects.length > 0) {
                projects.forEach(function (project) {
                    result.push({ id: project.id, text: project.name + ' (' + project.key + ')' });
                });
            }

            return result;
        });
    }
    return projectPromise;
}

ko.components.register('project-picker', {
    viewModel: function (params) {
        // Data: default value - either null or group
        var self = this;
        this.hasOthersOption = params.hasOthersOption;
        this.chosenValue = params.projectId || ko.observable();
        this.disabled = params.disabled || false;

        this.data = ko.observable();

        this.options = {
            allowClear: true,
            placeholder: 'Choose project',
            dataObs: this.data
        };

        getProjectValues()
            .then(function (projects) {
                var ownProjects = JSON.parse(JSON.stringify(projects));
                if (self.hasOthersOption) {
                    ownProjects.push({ id: -1, text: 'Others (*)' });
                }
                self.data(ownProjects);
            });

    },
    template:
    '<div data-bind="if: data"><select style="display:block; width: 100%;" data-bind="select2: options, value:chosenValue, disable: disabled"><option></option></select></div>'
});