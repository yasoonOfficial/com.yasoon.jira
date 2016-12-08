function templateViewModel() {
    var self = this;

    this.availableGroups = ko.observableArray();

    this.groupHierarchy = new groupHierarchyViewModel(this.availableGroups);
    this.initialSelection = new initialSelectionViewModel(this.availableGroups);
    this.defaultTemplates = new defaultTemplatesViewModel(this.availableGroups);

    this.save = function () {
        try {
            //Group Hierarchies
            var result = {};
            result.groups = ko.toJS(self.groupHierarchy.groups) || [];
            result.groups.forEach(function (g, index) {
                g.position = index;
            });

            //Initial selection
            var initialSelection = ko.toJS(self.initialSelection.entries) || [];
            result.initialSelection = [];
            initialSelection.forEach(function (selection) {
                if (selection.group || selection.projectId || selection.issueTypeId) {
                    result.initialSelection.push({
                        group: selection.group,
                        projectId: selection.projectId,
                        issueTypeId: selection.issueTypeId
                    });
                }
            });
            var findGroup = function (group) {
                return result.groups.filter(function (g) { return g.name === group; })[0];
            };
            var calculateTemplatePriority = function (template) {
                //Template Priority is calculated by group Priority + template Priority
                var group = findGroup(template.group);
                var templatePrio = 99;
                if (template.group != '-1' && template.projectId != '-1' && template.issueTypeId != '-1') {
                    templatePrio = 1;
                } else if (template.group != '-1' && template.issueTypeId != '-1') {
                    templatePrio = 2;
                } else if (template.group != '-1' && template.projectId != '-1') {
                    templatePrio = 3;
                } else if (template.group != '-1') {
                    templatePrio = 4;
                } else if (template.projectId != '-1' && template.issueTypeId != '-1') {
                    templatePrio = 5;
                } else if (template.issueTypeId != '-1') {
                    templatePrio = 6;
                } else if (template.projectId != '-1') {
                    templatePrio = 7;
                } else {
                    template = 8;
                }

                return (group.position + 1) * 100 + templatePrio;
            };

            result.initialSelection.sort(function (a, b) {
                var groupA = findGroup(a.group);
                var groupB = findGroup(b.group);

                if (!groupA)
                    return 1;
                if (!groupB)
                    return -1;

                return groupA.position - groupB.position;
            });

            //defaultTemplates
            var defaultTemplates = ko.toJS(self.defaultTemplates.entries) || [];
            result.defaultTemplates = [];

            defaultTemplates.forEach(function (templ) {
                if (templ.group || templ.projectId || templ.issueTypeId) {
                    //Remove empty fields
                    var fields = templ.fields.filter(
                        function (field) { return !!field.fieldId && !!field.fieldValue; }
                    )
                        .map(function (field) {
                            //Minor conversions.. array, int, ...
                            if (field.currentField) { //If this is set, field has been changed and we may need to convert
                                switch (field.currentField.schema.type) {
                                    case 'array':
                                        if (field.fieldValue) {
                                            field.fieldValue = field.fieldValue.split(',');
                                        }
                                        break;
                                    case 'number':
                                        try {
                                            field.fieldValue = parseInt(field.fieldValue);
                                        } catch (e) {
                                            throw new Error(field.fieldId + " must be a number");
                                        }
                                        break;
                                }
                            }
                            delete field.currentField; //Delete outside of if to delete also as undefined
                            delete field.isEmpty;
                            return field;
                        });

                    var priority = calculateTemplatePriority(templ);
                    result.defaultTemplates.push({
                        group: templ.group,
                        projectId: templ.projectId,
                        issueTypeId: templ.issueTypeId,
                        fields: fields,
                        priority: priority
                    });
                }
            });

            result.defaultTemplates.sort(function (a, b) { return a.priority - b.priority; });
            console.log('Save', result);

            return Promise.resolve($.ajax({
                url: yasoonServerUrl + '/api/companyapp/16/predeliveredConfig',
                contentType: 'application/json',
                headers: { userAuthToken: authToken },
                data: JSON.stringify({ overwrite: result }),
                processData: false,
                type: 'PUT'
            }))
                .caught(function (e) {
                    swal({
                        title: "Save was not possible",
                        text: "Connection Error: " + e.message,
                        type: "error",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Ok!",
                        closeOnConfirm: true
                    });
                });

        } catch (e) {
            swal({
                title: "Save was not possible",
                text: "Error Message: " + e.message,
                type: "error",
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Ok!",
                closeOnConfirm: true
            });
        }
    };

    //Init Data
    Promise.resolve($.ajax({
        url: yasoonServerUrl + '/api/companyapp/16/predeliveredConfig',
        contentType: 'application/json',
        headers: { userAuthToken: authToken },
        processData: false,
        type: 'GET'
    }))
        .then(function (data) {
            console.log(data);
            self.groupHierarchy.load(data.overwrite.groups);
            self.initialSelection.load(data.overwrite.initialSelection);
            self.defaultTemplates.load(data.overwrite.defaultTemplates);
        })
        .caught(function (e) {

        });
}

function initialSelection(parent, initParams) {
    var self = this;
    var owner = parent;

    this.group = ko.observable();
    this.projectId = ko.observable();
    this.issueTypeId = ko.observable();

    if (initParams) {
        this.group(initParams.group);
        this.projectId(initParams.projectId);
        this.issueTypeId(initParams.issueTypeId);
    }

    this.isEmpty = ko.computed(function () {
        //Do this async so it will not be within this computed call
        setTimeout(owner.checkEmptyLines, 1);
        if (!self.group() && !self.projectId() && !self.issueTypeId()) {
            return true;
        } else {
            return false;
        }
    });

    this.group.subscribe(function () {
        setTimeout(owner.adjustGroups, 1);
    });
}

function initialSelectionViewModel(groups) {
    var self = this;

    this.entries = ko.observableArray();
    this.allGroups = groups;
    this.allGroupsSelect2 = ko.computed(function () {
        //Map Groups into Select2 Format
        var result = [];
        self.allGroups().forEach(function (g) {
            result.push({
                id: g.name,
                text: g.name
            });
        });
        result.push({ id: -1, text: 'All Others' });
        return result;
    });

    this.availableGroups = ko.observableArray();

    this.adjustGroups = function () {
        //2. Check if Groups are different.
        var groups = JSON.parse(JSON.stringify(self.allGroupsSelect2()));
        self.entries().forEach(function (entry) {
            groups = groups.filter(function (g) { return g.id != entry.group(); });
        });
        self.availableGroups(groups);
    };

    this.checkEmptyLines = function () {
        //Called on every value change
        if (self.entries().length == 0 || self.entries().every(function (e) { return !e.isEmpty(); })) {
            self.add();
        }
    };

    this.add = function () {
        self.entries.push(new initialSelection(self));
    };

    this.remove = function (obj) {
        self.entries.remove(obj);
        self.adjustGroups();
    };

    this.load = function (data) {
        if (data && data.length > 0) {
            self.entries([]);
            data.forEach(function (selection) {
                self.entries.push(new initialSelection(self, selection));
            });
        } else {
            self.checkEmptyLines();
        }
    };

    this.allGroupsSelect2.subscribe(this.adjustGroups);

}

function defaultTemplateField(owner, initParams) {
    var self = this;
    this.fieldId = ko.observable();
    this.fieldValue = ko.observable();
    this.currentField = ko.observable();

    if (initParams) {
        this.fieldId(initParams.fieldId);
        if (Array.isArray(initParams.fieldValue)) {
            this.fieldValue(initParams.fieldValue.join(','));
        } else {
            this.fieldValue(initParams.fieldValue);
        }
    }

    this.isEmpty = ko.computed(function () {
        //Do this async so it will not be within this computed call
        setTimeout(owner.checkEmptyFieldLines, 1);
        if (!self.fieldId() && !self.fieldValue())
            return true;
        else {
            return false;
        }
    });
}

function defaultTemplate(parent, initParams) {
    var self = this;
    var owner = parent;

    this.group = ko.observable();
    this.projectId = ko.observable();
    this.issueTypeId = ko.observable();
    this.fields = ko.observableArray();

    if (initParams) {
        this.group(initParams.group);
        this.projectId(initParams.projectId);
        this.issueTypeId(initParams.issueTypeId);
        var templates = [];
        initParams.fields.forEach(function (templ) {
            templates.push(new defaultTemplateField(self, templ));
        });
        this.fields(templates);
    }

    this.isEmpty = ko.computed(function () {
        //Do this async so it will not be within this computed call
        setTimeout(owner.checkEmptyLines, 1);
        if (!self.group() && !self.projectId() && !self.issueTypeId())
            return true;
        else {
            return false;
        }
    });

    this.isEditEnabled = ko.computed(function () {
        if (self.group() && self.projectId() && self.issueTypeId())
            return true;
        else {
            return false;
        }
    });

    this.add = function () {
        self.fields.push(new defaultTemplateField(self));
    };

    this.checkEmptyFieldLines = function () {
        //Called on every value change
        if (self.fields().length == 0 || self.fields().every(function (e) { return !e.isEmpty(); })) {
            self.add();
        }
    };

    this.removeField = function (field) {
        self.fields.remove(field);
        self.checkEmptyFieldLines();
    }

    this.checkEmptyFieldLines();
}

function defaultTemplatesViewModel(groups) {
    var self = this;

    this.entries = ko.observableArray();
    this.editObj = ko.observable();
    this.allGroups = groups;
    this.allGroupsSelect2 = ko.computed(function () {
        //Map Groups into Select2 Format
        var result = [];
        self.allGroups().forEach(function (g) {
            result.push({
                id: g.name,
                text: g.name
            });
        });
        result.push({ id: -1, text: 'All Others' });

        return result;
    });

    this.remove = function (obj) {
        self.entries.remove(obj);
        self.checkEmptyLines();
    };

    this.add = function () {
        self.entries.push(new defaultTemplate(self));
    };

    this.edit = function (currentObj) {
        if (!currentObj.isEditEnabled())
            return;

        self.editObj(currentObj);
        $('#fieldPickerModal').modal({
            dismissible: true, // Modal can be dismissed by clicking outside of the modal
            opacity: .5, // Opacity of modal background
            in_duration: 300, // Transition in duration
            out_duration: 200, // Transition out duration
            //starting_top: '4%', // Starting top style attribute
            // ending_top: '10%', // Ending top style attribute
        });

        $('#fieldPickerModal').modal('open');

    };

    this.checkEmptyLines = function () {
        //Called on every value change
        if (self.entries().length == 0 || self.entries().every(function (e) { return !e.isEmpty(); })) {
            self.add();
        }
    };

    this.load = function (data) {
        if (data && data.length > 0) {
            self.entries([]);
            data.forEach(function (template) {
                self.entries.push(new defaultTemplate(self, template));
            });
        }
        self.checkEmptyLines();
    };

    self.checkEmptyLines();
}

function groupHierarchyViewModel(groups) {
    var self = this;

    this.groups = groups;
    this.newGroup = ko.observable('');
    this.forceRerender = ko.observable(true);

    this.newGroup.subscribe(function (newValue) {
        if (newValue) {
            self.groups.push({
                name: newValue
            });
            setTimeout(function () { self.newGroup(''); }, 1);
        }
    });

    this.remove = function (obj) {
        console.log('Object to remove', obj);
        swal({
            title: "Are you sure?",
            text: "When deleting this group, it will also delete all dependend entries for intial keys and issue templates.",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, delete it!",
            closeOnConfirm: true
        },
            function (isConfirmed) {
                //Do stuff
                console.log('Would have been deleted', isConfirmed);
                if (isConfirmed) {
                    //First Delete all sub-entries with current group
                    templateModel.initialSelection.entries.remove(function (e) {
                        return (e.group() == obj.name);
                    });

                    templateModel.defaultTemplates.entries.remove(function (e) {
                        return (e.group() == obj.name);
                    });

                    //Now remove own entry
                    self.groups.remove(function (g) { return g.name == obj.name; });
                    self.rerender();
                }
            });
    };

    this.rerender = function () {
        self.forceRerender(false);
        self.forceRerender(true);
    };

    this.load = function (data) {
        if (data && data.length > 0) {
            //sort by position
            data = data.sort(function (a, b) { return (a.position > b.position) ? 1 : -1; });
            data.forEach(function (group) {
                self.groups.push(group)
            });
        }
    }
}

// Helpers
function sortByText(a, b) {
    return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1);
}
