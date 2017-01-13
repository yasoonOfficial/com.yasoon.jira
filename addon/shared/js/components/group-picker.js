ko.components.register('group-picker', {
    viewModel: function (params) {
        var self = this;
        // Data: default value - either null or group
        this.chosenValue = params.group || ko.observable();
        this.filter = params.filter || ko.observableArray();
        this.hasOthersOption = params.hasOthersOption || false;

        this.ajaxSettings = {
            delay: 150,
            transport: function (params, success, failure) {
                var queryTerm = '';
                if (params && params.data && params.data.q) {
                    queryTerm = params.data.q;
                }

                var prom;
                if (isCloud) {
                    prom = new Promise(function (resolve, reject) {
                        AP.require('request', function (request) {
                            request({
                                url: '/rest/api/2/groups/picker?query=' + queryTerm,
                                type: 'GET',
                                success: function (groups) {
                                    groups = JSON.parse(groups);
                                    resolve(groups);
                                }
                            });
                        });
                    });
                } else {
                    prom = Promise.resolve($.get(systemInfo.baseUrl + '/rest/api/2/groups/picker?query=' + queryTerm));
                }

                prom
                    .then(function (groups) {
                        success(groups);
                    })
                    .caught(function (e) {
                        success({});
                    });
            },
            processResults: function (groups) {
                var result = [];
                if (groups && groups.groups) {
                    groups.groups.forEach(function (group) {
                        result.push({ id: group.name, text: group.name });
                    });
                }
                if (self.hasOthersOption) {
                    result.push({ id: -1, text: 'All Others' });
                }

                //Filter already selected values
                if (self.filter()) {
                    self.filter().forEach(function (g) {
                        result = result.filter(function (f) { return f.id != g.name; });
                    });
                }
                result = result.sort(sortByText);
                return {
                    results: result
                };
            }
        };

        this.options = {
            ajax: this.ajaxSettings,
            allowClear: true,
            placeholder: 'Choose group'
        };

    },
    template:
    '<div><select style="display:block; width: 100%;" data-bind="value:chosenValue, select2: options"><option></option></select></div>'
});