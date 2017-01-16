ko.components.register('group-picker-data', {
    viewModel: function (params) {
        var self = this;
        //default value - either null or groupName
        this.chosenValue = params.group;
        this.hasOthersOption = params.hasOthersOption || false;
        this.disabled = params.disabled;
        this.data = params.data || false;

        this.availableOptions = ko.computed(function () {
            var result = JSON.parse(JSON.stringify(self.data())) || [];
            if (self.chosenValue() && self.chosenValue() != -1) {
                result.push({ id: self.chosenValue(), text: self.chosenValue() })
            }

            result.sort(sortByText);
            return result;
        });

        this.ajaxSettings = {
            transport: function (params, success, failure) {
                success({
                    results: self.availableOptions()
                });
            }
        };

        this.options = {
            minimumResultsForSearch: Infinity,
            placeholder: 'Choose Group',
            allowClear: true,
            ajax: this.ajaxSettings,
            dataObs: this.availableOptions
        };

    },
    template:
    '<div><select style="display:block; width: 100%;" data-bind="select2: options, value:chosenValue, disable: disabled"><option></option></select></div>'
});