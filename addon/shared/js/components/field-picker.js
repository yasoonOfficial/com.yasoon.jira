var fieldPromise = null;
function getFieldValues() {
    if (!fieldPromise) {
        if (isCloud) {
            fieldPromise = new Promise(function (resolve, reject) {
                AP.require('request', function (request) {
                    request({
                        url: '/rest/api/2/field',
                        type: 'GET',
                        success: function (fields) {
                            fields = JSON.parse(fields);
                            resolve(fields);
                        }
                    });
                });
            });
        } else {
            fieldPromise = Promise.resolve($.get(systemInfo.baseUrl + '/rest/api/2/field'));
        }

        fieldPromise = fieldPromise.then(function (fields) {
            console.log(fields);
            var result = [];
            if (fields && fields.length > 0) {
                fields = filterFields(fields);
                fields.forEach(function (field) {
                    result.push({ id: field.id, text: field.name + ' (' + field.id + ')', data: field });
                });
            }

            return result.sort(sortByText);
        });
    }
    return fieldPromise;
}

var fieldBlacklist = [
    "issuetype",
    "project",
    "attachment",
    "comment",
    "created",
    "creator",
    "thumbnail",
    "issuekey",
    "lastViewed",
    "issuelinks",
    "worklog",
    "progress",
    "resolution",
    "resolutiondate",
    "subtasks",
    "votes",
    "watches",
    "workratio",
    "aggregatetimeoriginalestimate",
    "aggregateprogress",
    "aggregatetimeestimate",
    "aggregatetimespent"
];

function filterFields(fields) {
    if (fields.length) {
        return fields.filter(function (f) {
            return (fieldBlacklist.indexOf(f.id) == -1);
        });
    } else {
        var copy = JSON.parse(JSON.stringify(fields));
        fieldBlacklist.forEach(function (blackListField) {
            delete copy[blackListField];
        });
        return copy;
    }
}

ko.components.register('field-picker', {
    viewModel: function (params) {
        // Data: default value - either null or group
        var self = this;
        this.currentProjectId = params.projectId || ko.observable();
        this.currentIssueTypeId = params.issueTypeId || ko.observable();
        this.chosenValue = params.fieldId || ko.observable();
        this.chosenField = params.chosenField || ko.observable();
        this.data = ko.observable();

        this.loadData = function () {
            if (self.currentProjectId() > -1 && self.currentIssueTypeId() > -1) {
                console.log('Field-Picker load Data- project specific');
                getFieldMeta(self.currentProjectId(), self.currentIssueTypeId())
                    .then(function (issueType) {
                        console.log('Field-Picker load Data- project specific', issueType);
                        var result = [];

                        if (issueType.fields) {
                            var fields = filterFields(issueType.fields);
                            var keys = Object.keys(fields);
                            keys.forEach(function (key) {
                                var field = fields[key];
                                result.push({ id: key, text: field.name + ' (' + key + ')', data: field });
                            });
                        }
                        result = result.sort(sortByText);
                        self.data(result);
                    });
            } else {
                getFieldValues()
                    .then(function (fields) {
                        var ownFields = JSON.parse(JSON.stringify(fields));
                        self.data(ownFields);
                    });
            }
        };

        this.options = {
            allowClear: true,
            placeholder: 'Choose Field',
            dataObs: this.data
        };

        //Subscribe to fieldChanges and load current Meta
        this.chosenValue.subscribe(function (newValue) {
            if (self.data().length === 0 || !newValue)
                return;

            var currentField = self.data().filter(function (field) {
                return field.id == newValue;
            })[0];

            if (currentField) {
                self.chosenField(currentField.data);
            }
        });


        //Subscribe to Project and Issue Type changes to update Field List
        this.currentProjectId.subscribe(this.loadData);
        this.currentIssueTypeId.subscribe(this.loadData);

        this.loadData();
    },
    template:
    '<div data-bind="if: data"><select style="display:block; width: 100%;" data-bind="select2: options, value:chosenValue"><option></option></select></div>'
});