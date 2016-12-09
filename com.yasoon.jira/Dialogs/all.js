var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Confirmation = (function () {
    function Confirmation() {
    }
    Confirmation.show = function (options) {
        return new Promise(function (resolve, reject) {
            var optionsInt = {
                size: 'large',
                backdrop: false,
                message: options.message,
                callback: function (ok) {
                    var checkState = $('#checkboxConfirm').prop("checked");
                    resolve({
                        checkbox: checkState,
                        ok: ok
                    });
                },
                buttons: {
                    cancel: {
                        label: options.secondary,
                        className: "btn-secondary"
                    },
                    confirm: {
                        label: options.primary,
                        className: "btn-primary"
                    },
                }
            };
            if (options.checkbox) {
                optionsInt.checkbox = {
                    id: 'checkboxConfirm',
                    label: options.checkbox
                };
            }
            bootbox.confirm(optionsInt);
        });
    };
    return Confirmation;
}());
/// <reference path="../../definitions/bluebird.d.ts" />
/// <reference path="../../definitions/yasoon.d.ts" />
var EmailController = (function () {
    function EmailController(mail, type, settings, ownUser) {
        var _this = this;
        this.fieldMapping = {
            subject: 'summary',
            body: 'description',
            sender: 'reporter',
            sentAt: ''
        };
        this.mail = mail;
        this.attachments = mail.attachments;
        this.settings = settings;
        this.ownUser = ownUser;
        this.type = type;
        var fieldMappingString = yasoon.setting.getAppParameter('fieldMapping');
        if (fieldMappingString) {
            this.fieldMapping = JSON.parse(fieldMappingString);
        }
        //Start Render Markup
        this.renderBodyMarkupPromise = yasoon.outlook.mail.renderBody(mail, 'jiraMarkup')
            .then(function (markup) {
            _this.bodyAsMarkup = markup;
            return markup;
        })
            .catch(function () {
            _this.bodyAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
        });
        this.bodyPlain = jira.mail.getBody(0).replace(/\r/g, '').replace(/\n\n/g, '\n');
        if (this.type === 'selectedText') {
            this.selectionPlain = this.mail.getSelection(0).replace(/\r/g, '').replace(/\n\n/g, '\n');
            this.renderSelectionMarkupPromise = yasoon.outlook.mail.renderSelection(mail, 'jiraMarkup')
                .then(function (markup) {
                _this.selectionAsMarkup = markup;
                return markup;
            })
                .catch(function () {
                _this.selectionAsMarkup = yasoon.i18n('general.couldNotRenderMarkup');
                return _this.selectionAsMarkup;
            });
        }
        //Get Reporter User
        this.loadSenderPromise = jiraGet('/rest/api/2/user/search?username=' + mail.senderEmail)
            .then(function (data) {
            var users = JSON.parse(data);
            if (users.length > 0) {
                _this.senderUser = users[0];
                FieldController.raiseEvent(EventType.SenderLoaded, _this.senderUser);
                return _this.senderUser;
            }
        });
        //Get Sender templates            
        var templateString = yasoon.setting.getAppParameter(EmailController.settingCreateTemplates);
        if (templateString) {
            this.senderTemplates = JSON.parse(templateString);
        }
        else {
            this.senderTemplates = [];
        }
        //Load Attachment Handles
        this.getAttachmentFileHandles();
    }
    EmailController.prototype.getAttachmentFileHandles = function () {
        var _this = this;
        //If created by email, check for templates and attachments
        if (this.mail && !this.attachmentHandles) {
            this.attachmentHandles = [];
            //Add current mail to clipboard
            var handle = this.mail.getFileHandle();
            if (this.settings.addEmailOnNewAddIssue) {
                handle.selected = true;
            }
            this.attachmentHandles.push(handle);
            if (this.mail.attachments && this.mail.attachments.length > 0) {
                this.mail.attachments.forEach(function (attachment) {
                    var handle = attachment.getFileHandle();
                    //Skip too small images	
                    if (_this.settings.addAttachmentsOnNewAddIssue) {
                        handle.selected = true;
                    }
                    _this.attachmentHandles.push(handle);
                });
            }
        }
        return this.attachmentHandles || [];
    };
    EmailController.prototype.insertEmailValues = function () {
        this.setSubject();
        this.setBody();
        this.setSender();
    };
    EmailController.prototype.setSubject = function () {
        if (this.fieldMapping.subject) {
            FieldController.getField(this.fieldMapping.subject).setValue(this.mail.subject);
        }
    };
    EmailController.prototype.setBody = function () {
        var _this = this;
        if (this.fieldMapping.body) {
            var field_1 = FieldController.getField(this.fieldMapping.body);
            if (field_1) {
                var markupPromise = Promise.resolve('');
                if (this.type === 'wholeMail') {
                    markupPromise = this.renderBodyMarkupPromise;
                }
                else if (this.type === 'selectedText') {
                    markupPromise = this.renderSelectionMarkupPromise;
                }
                markupPromise.then(function (markup) {
                    field_1.setValue(markup);
                    if (jira.settings.addMailHeaderAutomatically === 'top') {
                        markup = renderMailHeaderText(_this.mail, true) + '\n' + markup;
                    }
                    else if (jira.settings.addMailHeaderAutomatically === 'bottom') {
                        markup = markup + '\n' + renderMailHeaderText(_this.mail, true);
                    }
                    return _this.handleAttachments(markup, _this.mail)
                        .then(function (newMarkup) {
                        if (_this.type === 'selectedText') {
                            _this.selectionAsMarkup = newMarkup;
                        }
                        else if (_this.type === 'wholeMail') {
                            _this.bodyAsMarkup = newMarkup;
                        }
                        field_1.setValue(newMarkup);
                    });
                });
            }
        }
    };
    EmailController.prototype.getMailHeaderText = function (useMarkup) {
        var result = '';
        if (useMarkup) {
            result = yasoon.i18n('mail.mailHeaderMarkup', {
                senderName: this.mail.senderName,
                senderEmail: this.mail.senderEmail,
                date: moment(this.mail.receivedAt).format('LLL'),
                recipients: ((this.mail.recipients.length > 0) ? '[mailto:' + this.mail.recipients.join('],[mailto:') + ']' : yasoon.i18n('dialog.noRecipient')),
                subject: this.mail.subject
            });
        }
        else {
            result = yasoon.i18n('mail.mailHeaderPlain', {
                senderName: this.mail.senderName,
                senderEmail: this.mail.senderEmail,
                date: moment(this.mail.receivedAt).format('LLL'),
                recipients: ((this.mail.recipients.length > 0) ? this.mail.recipients.join(',') : yasoon.i18n('dialog.noRecipient')),
                subject: this.mail.subject
            });
        }
        return result;
    };
    EmailController.prototype.handleAttachments = function (originalMarkup, mail) {
        var _this = this;
        //Check each attachment if it needs to be embedded
        var embeddedItems = [];
        var markup = originalMarkup;
        this.attachmentHandles.forEach(function (attachment) {
            if (markup.indexOf('!' + attachment.contentId + '!') > -1) {
                embeddedItems.push(attachment);
            }
        });
        if (embeddedItems.length === 0)
            return Promise.resolve(originalMarkup);
        //Ensure they are persisted (performance)
        return new Promise(function (resolve, reject) {
            mail.persistAttachments(embeddedItems, resolve, reject);
        })
            .then(function () {
            return embeddedItems;
        })
            .map(function (handle) {
            return yasoon.io.getFileHash(handle)
                .then(function (hash) {
                handle.hash = hash;
                return hash;
            });
        })
            .then(function (hashes) {
            return yasoon.valueStore.queryAttachmentHashes(hashes)
                .catch(function (e) {
                yasoon.util.log('Could not load Attachment Blacklist', yasoon.util.severity.warning, getStackTrace(e));
                return { foundHashes: [] };
            });
        })
            .then(function (result) {
            embeddedItems.forEach(function (handle) {
                //Skip files whose hashes that were blocked	
                var regEx = new RegExp('!' + handle.contentId + '!', 'g');
                if (result.foundHashes.indexOf(handle.hash) >= 0) {
                    markup = markup.replace(regEx, '');
                    handle.blacklisted = true;
                    return;
                }
                //Replace the reference in the markup	
                handle.selected = true;
                markup = markup.replace(regEx, '!' + handle.getFileName() + '!');
                handle.setInUse();
            });
            FieldController.raiseEvent(EventType.AttachmentChanged, _this.attachmentHandles);
            return markup;
        })
            .catch(function (e) {
            yasoon.util.log('Error during handling of attachments', yasoon.util.severity.warning, getStackTrace(e));
        });
    };
    EmailController.prototype.setSender = function () {
        var _this = this;
        if (this.fieldMapping.sender) {
            var field_2 = FieldController.getField(this.fieldMapping.sender);
            if (field_2) {
                this.loadSenderPromise.then(function (senderUser) {
                    var valueUser;
                    var valueMail;
                    if (senderUser) {
                        valueUser = senderUser;
                        valueMail = senderUser.emailAddress;
                    }
                    else {
                        valueUser = _this.ownUser;
                        valueMail = _this.mail.senderEmail;
                    }
                    if (field_2.getType() == 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker' || 'reporter') {
                        field_2.setValue(valueUser);
                    }
                    else {
                        field_2.setValue(valueMail);
                    }
                    //If Service is active, set onBehalf user
                    var onBehalfOfField = FieldController.getField(FieldController.onBehalfOfFieldId);
                    if (onBehalfOfField) {
                        onBehalfOfField.setValue(valueUser);
                    }
                });
            }
        }
    };
    EmailController.prototype.saveSenderTemplate = function (values) {
        if (this.mail) {
            var projectField = FieldController.getField(FieldController.projectFieldId);
            var project = projectField.getObjectValue();
            var projectCopy = JSON.parse(JSON.stringify(project));
            delete projectCopy.issueTypes;
            var newValues = JSON.parse(JSON.stringify(values));
            var template_1 = {
                senderEmail: this.mail.senderEmail,
                senderName: this.mail.senderName,
                project: project,
                values: values
            };
            delete template_1.values.fields.summary;
            delete template_1.values.fields.description;
            delete template_1.values.fields.duedate;
            //Service Desk Data
            if (project.projectTypeKey === 'service_desk') {
                template_1.serviceDesk = {
                    enabled: false,
                    requestType: '100'
                };
            }
            //Add or replace template
            var templateFound = false;
            this.senderTemplates.map(function (templ) {
                if (templ.senderEmail == template_1.senderEmail && templ.project.id == template_1.project.id) {
                    templateFound = true;
                    return template_1;
                }
                return templ;
            });
            if (!templateFound) {
                this.senderTemplates.push(template_1);
            }
            yasoon.setting.setAppParameter(EmailController.settingCreateTemplates, JSON.stringify(this.senderTemplates));
        }
    };
    return EmailController;
}());
EmailController.settingCreateTemplates = 'createTemplates';
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetValue = (function () {
    function SetValue() {
    }
    SetValue.prototype.setValue = function (field, value) {
        if (value || value === 0)
            $('#' + field.id).val(value).trigger('change');
    };
    return SetValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
var GetTextValue = (function () {
    function GetTextValue() {
    }
    GetTextValue.prototype.getValue = function (field, onlyChangedData) {
        var newValue = field.getDomValue();
        if (onlyChangedData)
            //In edit case: Only send if changed	
            return (isEqual(field.initialValue, newValue)) ? undefined : newValue;
        else
            //In creation case: Only send if not null	
            return (newValue) ? newValue : undefined;
    };
    return GetTextValue;
}());
/// <reference path="../../definitions/jquery.d.ts" />
/// <reference path="../../definitions/jira.d.ts" />
/// <reference path="../../definitions/customSelect2.d.ts" />
/// <reference path="setter/SetValue.ts" />
/// <reference path="getter/GetTextValue.ts" />
var Field = (function () {
    function Field(id, fieldMeta, params) {
        this.id = id;
        this.fieldMeta = fieldMeta;
        this.params = params;
    }
    Field.prototype.getValue = function (onlyChangedData) {
        if (onlyChangedData === void 0) { onlyChangedData = false; }
        if (!getter)
            throw new Error("Please either redefine method getValue or add a @getter Annotation for " + this.id);
        return this.getter.getValue(this, onlyChangedData);
    };
    Field.prototype.setInitialValue = function (value) {
        this.initialValue = value;
    };
    Field.prototype.setValue = function (value) {
        if (!setter)
            throw new Error("Please either redefine method setValue or add a @setter Annotation for " + this.id);
        return this.setter.setValue(this, value);
    };
    Field.prototype.getType = function () {
        return this.fieldMeta.schema.system || this.fieldMeta.schema.custom;
    };
    Field.prototype.triggerValueChange = function () {
        var currentValue = this.getValue(false);
        if (JSON.stringify(this.lastValue) != JSON.stringify(currentValue)) {
            FieldController.raiseEvent(EventType.FieldChange, currentValue, this.id);
            this.lastValue = currentValue;
        }
    };
    Field.prototype.updateFieldMeta = function (newMeta) {
        this.lastValue = undefined;
        this.fieldMeta = newMeta;
    };
    Field.prototype.renderField = function (container) {
        var _this = this;
        var fieldGroup = container.find('#' + this.id + '-field-group');
        //First render the field-group container for this field if it does not exist yet
        if (fieldGroup.length === 0) {
            fieldGroup = $("<div id=\"" + this.id + "-field-group\" data-field-id=\"" + this.id + "\"></div>").appendTo(container);
        }
        //Render label, mandatory and hidden logic
        var html = "<div class=\"field-group " + ((this.fieldMeta.required) ? 'required' : '') + " " + ((this.fieldMeta.isHidden) ? 'hidden' : '') + "\" >\n\t\t\t\t\t\t<label for=\"" + this.id + "\">" + this.fieldMeta.name + " \n\t\t\t\t\t\t\t<span class=\"aui-icon icon-required\">Required</span>\n\t\t\t\t\t\t</label>\n\t\t\t\t\t\t<div class=\"field-container\">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t" + ((this.fieldMeta.description) ? '<div class="description">' + this.fieldMeta.description + '</div>' : '') + "\n\t\t\t\t\t</div>";
        this.ownContainer = $(fieldGroup).html(html).find('.field-container');
        //Only inject inner container for easier usage
        var result = this.render(this.ownContainer);
        //If it returns a promise, waitbefore adding event handler
        if (result && result.then) {
            result.then(function () {
                _this.hookEventHandler();
            });
        }
        else {
            this.hookEventHandler();
        }
    };
    Field.prototype.isRendered = function () {
        return (this.ownContainer != null);
    };
    return Field;
}());
var GetterType;
(function (GetterType) {
    GetterType[GetterType["Text"] = 0] = "Text";
    GetterType[GetterType["Object"] = 1] = "Object";
    GetterType[GetterType["ObjectArray"] = 2] = "ObjectArray";
    GetterType[GetterType["Array"] = 3] = "Array";
    GetterType[GetterType["Option"] = 4] = "Option";
})(GetterType || (GetterType = {}));
var SetterType;
(function (SetterType) {
    SetterType[SetterType["Text"] = 0] = "Text";
    SetterType[SetterType["CheckedValues"] = 1] = "CheckedValues";
    SetterType[SetterType["Date"] = 2] = "Date";
    SetterType[SetterType["DateTime"] = 3] = "DateTime";
    SetterType[SetterType["Option"] = 4] = "Option";
    SetterType[SetterType["Tag"] = 5] = "Tag";
})(SetterType || (SetterType = {}));
var EventType;
(function (EventType) {
    EventType[EventType["FieldChange"] = 0] = "FieldChange";
    EventType[EventType["AfterRender"] = 1] = "AfterRender";
    EventType[EventType["AfterSave"] = 2] = "AfterSave";
    EventType[EventType["BeforeSave"] = 3] = "BeforeSave";
    EventType[EventType["SenderLoaded"] = 4] = "SenderLoaded";
    EventType[EventType["UiAction"] = 5] = "UiAction";
    EventType[EventType["Cleanup"] = 6] = "Cleanup";
    EventType[EventType["AttachmentChanged"] = 7] = "AttachmentChanged";
})(EventType || (EventType = {}));
//@getter Annotation
function getter(getterType) {
    var params = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        params[_i - 1] = arguments[_i];
    }
    return function (target) {
        var proto = target.prototype;
        switch (getterType) {
            case GetterType.Text:
                proto.getter = new GetTextValue();
                break;
            case GetterType.Object:
                proto.getter = new GetObject(params[0]);
                break;
            case GetterType.ObjectArray:
                proto.getter = new GetObjectArray(params[0]);
                break;
            case GetterType.Array:
                proto.getter = new GetArray();
                break;
            case GetterType.Option:
                proto.getter = new GetOption(params[0], params[1]);
                break;
        }
    };
}
//@setter Annotation
function setter(setterType) {
    return function (target) {
        var proto = target.prototype;
        switch (setterType) {
            case SetterType.Text:
                proto.setter = new SetValue();
                break;
            case SetterType.CheckedValues:
                proto.setter = new SetCheckedValues();
                break;
            case SetterType.Date:
                proto.setter = new SetDateValue();
                break;
            case SetterType.DateTime:
                proto.setter = new SetDateTimeValue();
                break;
            case SetterType.Option:
                proto.setter = new SetOptionValue();
                break;
            case SetterType.Tag:
                proto.setter = new SetTagValue();
                break;
        }
    };
}
/// <reference path="../../definitions/jquery.d.ts" />
var FieldController;
(function (FieldController) {
    FieldController.projectFieldId = 'project';
    FieldController.issueTypeFieldId = 'issuetype';
    FieldController.issueFieldId = 'parent';
    FieldController.requestTypeFieldId = 'requesttype';
    FieldController.reporterFieldId = 'reporter';
    FieldController.onBehalfOfFieldId = 'onBehalfOf';
    FieldController.attachmentFieldId = 'attachment';
    FieldController.descriptionFieldId = 'description';
    var fieldTypes = {};
    var metaFields = {};
    var currentMeta = {};
    //Event --> Fields[]
    var lifecycleHandler = {};
    // Event --> FieldId --> Fields[]
    var fieldEventHandler = {};
    function register(key, newField, params) {
        fieldTypes[key] = { field: newField, params: params };
    }
    FieldController.register = register;
    function getFieldType(field) {
        return field.schema.custom || field.schema.system;
    }
    FieldController.getFieldType = getFieldType;
    function getField(id) {
        return metaFields[id];
    }
    FieldController.getField = getField;
    function enrichFieldMeta(field) {
        var hasChanged = false;
        //Look up in config and set mandatory flag
        //Look up in config and set Hidden field
        //Currently all visible
        field.isHidden = false;
        return hasChanged;
    }
    FieldController.enrichFieldMeta = enrichFieldMeta;
    function getMeta() {
        return currentMeta;
    }
    FieldController.getMeta = getMeta;
    function loadMeta(fields) {
        currentMeta = fields;
        for (var key in fields) {
            var field = fields[key];
            field.key = key; //Is not always set by Jira :/
            var type = getFieldType(field);
            if (type) {
                var buffer = fieldTypes[type];
                if (buffer) {
                    loadField(field, buffer.field, buffer.params);
                }
            }
        }
    }
    FieldController.loadMeta = loadMeta;
    function loadField(fieldMeta, type, params) {
        enrichFieldMeta(fieldMeta);
        var field = getField(fieldMeta.key);
        if (field) {
            field.updateFieldMeta(fieldMeta);
            return field;
        }
        else {
            var handler = new type(fieldMeta.key, fieldMeta, params);
            metaFields[fieldMeta.key] = handler;
            return handler;
        }
    }
    FieldController.loadField = loadField;
    function render(id, container) {
        var field = getField(id);
        if (field) {
            field.renderField(container);
        }
    }
    FieldController.render = render;
    function getValue(id, changedDataOnly) {
        var renderer = getField(id);
        if (renderer) {
            try {
                return renderer.getValue(changedDataOnly);
            }
            catch (e) {
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t getValue for field ' + id, yasoon.util.severity.warning);
            }
        }
    }
    FieldController.getValue = getValue;
    function getFormData(changedDataOnly) {
        var result = { fields: {} };
        //Find Meta for current Issue Type
        for (var key in metaFields) {
            var newValue = getValue(key, changedDataOnly);
            if (newValue !== undefined)
                result.fields[key] = newValue;
        }
        return result;
    }
    FieldController.getFormData = getFormData;
    function setValue(id, value, isInitialValue) {
        var field = getField(id);
        if (field) {
            try {
                field.setValue(value);
                if (isInitialValue)
                    field.setInitialValue(value);
            }
            catch (e) {
                yasoon.util.log('Error: ' + e.message + '. Couldn\'t setValue for field ' + id, yasoon.util.severity.warning);
            }
        }
    }
    FieldController.setValue = setValue;
    function setFormData(issue) {
        for (var key in metaFields) {
            if (key == FieldController.projectFieldId || key == FieldController.issueTypeFieldId)
                continue;
            setValue(key, issue.fields[key], true);
        }
    }
    FieldController.setFormData = setFormData;
    function raiseEvent(eventType, newValue, id) {
        //Check for Event Type
        console.log('Event raised', eventType, id, newValue);
        var returnPromises = [];
        switch (eventType) {
            case EventType.FieldChange:
                //get Field handler
                if (fieldEventHandler[eventType] && fieldEventHandler[eventType][id]) {
                    fieldEventHandler[eventType][id].forEach(function (field) {
                        try {
                            setTimeout(function (eventType, newValue, id) {
                                field.handleEvent(eventType, newValue, id);
                            }, 1, eventType, newValue, id);
                        }
                        catch (e) {
                            console.log('Error occured', e, e.stack);
                        }
                    });
                }
                break;
            default:
                if (lifecycleHandler[eventType]) {
                    lifecycleHandler[eventType].forEach(function (field) {
                        try {
                            var result = field.handleEvent(eventType, newValue);
                            if (result) {
                                returnPromises.push(result);
                            }
                        }
                        catch (e) {
                            console.log('Error occured', e, e.stack);
                        }
                    });
                }
                break;
        }
        if (returnPromises.length > 0) {
            return Promise.all(returnPromises);
        }
    }
    FieldController.raiseEvent = raiseEvent;
    function registerEvent(eventType, handler, id) {
        switch (eventType) {
            case EventType.FieldChange:
                if (!fieldEventHandler[eventType]) {
                    fieldEventHandler[eventType] = {};
                }
                if (!fieldEventHandler[eventType][id]) {
                    fieldEventHandler[eventType][id] = [];
                }
                fieldEventHandler[eventType][id].push(handler);
                break;
            default:
                if (!lifecycleHandler[eventType]) {
                    lifecycleHandler[eventType] = [];
                }
                lifecycleHandler[eventType].push(handler);
                break;
        }
    }
    FieldController.registerEvent = registerEvent;
})(FieldController || (FieldController = {}));
//Util Stuff --> New File
function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}
function insertAtCursor(myField, myValue) {
    var startPos = myField.selectionStart;
    var endPos = myField.selectionEnd;
    if (startPos > 0)
        myValue = '\n' + myValue;
    myField.value = myField.value.substring(0, startPos) +
        myValue +
        myField.value.substring(endPos, myField.value.length);
}
function sortByText(a, b) {
    return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1);
}
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/handlebars.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
var AttachmentField = (function (_super) {
    __extends(AttachmentField, _super);
    function AttachmentField(id, fieldMeta, attachments) {
        var _this = _super.call(this, id, fieldMeta) || this;
        _this.getTemplate = null;
        _this.currentParameters = null;
        _this.attachments = [];
        _this.descriptionField = null;
        _this.attachments = attachments;
        _this.getTemplate = Promise.all([
            $.getScript(yasoon.io.getLinkPath('templates/attachmentFieldsNew.hbs.js')),
            $.getScript(yasoon.io.getLinkPath('templates/attachmentLink.hbs.js')),
        ])
            .spread(function () {
            Handlebars.registerPartial("attachmentLink", jira.templates.attachmentLink);
            return jira.templates.attachmentFieldsNew;
        });
        FieldController.registerEvent(EventType.AfterSave, _this);
        FieldController.registerEvent(EventType.AttachmentChanged, _this);
        FieldController.registerEvent(EventType.Cleanup, _this);
        return _this;
    }
    AttachmentField.prototype.handleEvent = function (type, newValue, source) {
        var _this = this;
        if (type === EventType.AfterSave) {
            var lifecycleData_1 = newValue;
            var formData_1 = [];
            var selectedAttachments = this.attachments.forEach(function (file) {
                if (file.selected) {
                    formData_1.push({
                        type: yasoon.formData.File,
                        name: 'file',
                        value: file
                    });
                }
            });
            if (formData_1.length > 0) {
                var uploadPromise = jiraAjax('/rest/api/2/issue/' + lifecycleData_1.newData.id + '/attachments', yasoon.ajaxMethod.Post, null, formData_1)
                    .catch(jiraSyncError, function (e) {
                    yasoon.util.log('Couldn\'t upload attachments: ' + e.getUserFriendlyError() + ' || ' + JSON.stringify(formData_1), yasoon.util.severity.warning);
                    yasoon.dialog.showMessageBox(yasoon.i18n('dialog.errorCreateAttachment', { key: lifecycleData_1.newData.key, error: e.getUserFriendlyError() }));
                });
                return uploadPromise;
            }
        }
        else if (type === EventType.Cleanup) {
            //Dispose all Attachments
            this.attachments.forEach(function (handle) {
                try {
                    handle.dispose();
                }
                catch (e) {
                }
            });
        }
        else if (type === EventType.AttachmentChanged) {
            if (newValue)
                this.attachments = newValue;
            this.render(this.ownContainer)
                .then(function () {
                _this.hookEventHandler();
            });
        }
    };
    AttachmentField.prototype.getDomValue = function () {
        return '';
    };
    AttachmentField.prototype.getValue = function () {
        //Nessecary as attachments will upload differently
        return undefined;
    };
    AttachmentField.prototype.setValue = function () {
        //Attachments work differently
    };
    AttachmentField.prototype.getCurrentAttachment = function (elem) {
        var handleId = $(elem).closest('.jiraAttachmentLink').data('id');
        return this.attachments.filter(function (item) { return item.id === handleId; })[0];
    };
    AttachmentField.prototype.submitRename = function (elem) {
        var domAttachmentLink = elem.closest('.jiraAttachmentLink');
        var handle = this.getCurrentAttachment(elem);
        var newName = domAttachmentLink.find('.attachmentNewName input').val().trim() + handle.extension;
        var oldName = handle.fileName;
        if (handle.fileName != newName) {
            domAttachmentLink.find('.attachmentNameValue').text(newName);
            handle.setFileName(newName);
            handle.fileName = newName;
            handle.fileNameNoExtension = newName.substring(0, newName.lastIndexOf('.'));
            var eventData = {
                name: AttachmentField.uiActionRename,
                value: {
                    oldName: oldName,
                    newName: newName
                }
            };
            FieldController.raiseEvent(EventType.UiAction, eventData);
        }
        domAttachmentLink.find('.attachmentMain').removeClass('edit');
    };
    AttachmentField.prototype.raiseHandleChangedEvent = function (handle) {
        var eventData = {
            name: AttachmentField.uiActionSelect,
            value: handle
        };
        FieldController.raiseEvent(EventType.UiAction, eventData);
    };
    AttachmentField.prototype.hookEventHandler = function () {
        var _this = this;
        //Blacklist Events
        if (this.currentParameters.blacklistedAttachments.length > 0) {
            $(this.ownContainer).find('.show-blacklisted-attachments').removeClass('hidden');
            $(this.ownContainer).find('.show-blacklisted-attachments').off().click(function (e) {
                e.preventDefault();
                $(_this.ownContainer).find('.attachments-blacklisted').removeClass('hidden');
                $(_this.ownContainer).find('.hide-blacklisted-attachments').removeClass('hidden');
                $(e.target).addClass('hidden');
            });
            $(this.ownContainer).find('.hide-blacklisted-attachments').off().click(function (e) {
                e.preventDefault();
                $(_this.ownContainer).find('.attachments-blacklisted').addClass('hidden');
                $(_this.ownContainer).find('.show-blacklisted-attachments').removeClass('hidden');
                $(e.target).addClass('hidden');
            });
        }
        $(this.ownContainer).find('.addAttachmentLink').off().click(function (e) {
            e.preventDefault();
            yasoon.view.fileChooser.open(function (selectedFiles) {
                selectedFiles.forEach(function (handle) {
                    handle.selected = true;
                });
                var attachments = _this.attachments.concat(selectedFiles);
                //Rerender
                FieldController.raiseEvent(EventType.AttachmentChanged, attachments);
            });
        });
        $('.jiraAttachmentLink .checkbox input').off().on('change', function (e) {
            var handle = _this.getCurrentAttachment($(e.target));
            handle.selected = !handle.selected;
            _this.raiseHandleChangedEvent(handle);
        });
        $('.attachmentAddRef').off().click(function (e) {
            e.preventDefault();
            var handle = _this.getCurrentAttachment($(e.target));
            //Select attachment to be uploaded
            handle.selected = true;
            $(e.target).closest('.jiraAttachmentLink').find('.checkbox input').prop('checked', true);
            //Notify description
            FieldController.raiseEvent(EventType.UiAction, { name: AttachmentField.uiActionAddRef, value: handle });
        });
        $('.attachmentAddToBlacklist').off().click(function (e) {
            e.preventDefault();
            var handle = _this.getCurrentAttachment($(e.target));
            var hideInfo = yasoon.setting.getAppParameter('dialog.hideAttachmentBlacklistExplanation');
            var showInfoDialog;
            if (hideInfo && hideInfo === 'true') {
                showInfoDialog = Promise.resolve({ ok: true }); //Skip
            }
            else {
                showInfoDialog = Confirmation.show({
                    message: yasoon.i18n('dialog.attachmentAddToBlacklistDialog'),
                    checkbox: yasoon.i18n('dialog.dontShowAgain'),
                    primary: yasoon.i18n('dialog.ok'),
                    secondary: yasoon.i18n('dialog.cancel')
                });
            }
            showInfoDialog.then(function (result) {
                if (result.ok) {
                    //First, set as blacklisted
                    yasoon.io.getFileHash(handle).then(function (hash) {
                        return yasoon.valueStore.putAttachmentHash(hash);
                    });
                    //Now, update UI
                    handle.blacklisted = true;
                    handle.selected = false;
                    //rerender
                    FieldController.raiseEvent(EventType.AttachmentChanged);
                    //Now remove all references from the description field
                    _this.raiseHandleChangedEvent(handle);
                    //Only accept dont ask again if was confirmed with ok					
                    if (result.checkbox) {
                        yasoon.setting.setAppParameter('dialog.hideAttachmentBlacklistExplanation', 'true');
                    }
                }
            });
        });
        $('.attachmentRename').off().click(function (e) {
            e.preventDefault();
            $(e.target).closest('.attachmentMain').addClass('edit');
        });
        $('.attachmentRenameConfirm').off().click(function (e) {
            e.preventDefault();
            _this.submitRename($(e.target));
        });
        $('.attachmentRenameCancel').click(function (e) {
            e.preventDefault();
            var domAttachmentLink = $(e.target).closest('.jiraAttachmentLink');
            domAttachmentLink.find('.attachmentMain').removeClass('edit');
            var handle = _this.getCurrentAttachment($(e.target));
            domAttachmentLink.find('.attachmentNewName input').val(handle.fileNameNoExtension);
        });
        $('.attachmentNameValue').off().on('mouseenter', function (e) {
            var elem = $(e.target);
            var domAttachmentLink = elem.closest('.jiraAttachmentLink');
            var handle = _this.getCurrentAttachment(elem);
            if (handle.hasFilePreview()) {
                var timeoutFct = setTimeout(function () {
                    yasoon.io.getFilePreviewPath(handle)
                        .then(function (path) {
                        $('.thumbnail-preview').remove();
                        $('body').append('<img class="thumbnail-preview" src="' + path + '" style="z-index: 100000; cursor: pointer; background-color: white; position: absolute; left: ' + (e.originalEvent['x'] - 50) + 'px; top: ' + (e.originalEvent['y'] - 30) + 'px" />')
                            .find('.thumbnail-preview')
                            .on('mouseleave', function () {
                            $(this).unbind().remove();
                        });
                    });
                }, 500);
                $('.attachmentNameValue').on('mouseleave', function (e) {
                    clearTimeout(timeoutFct);
                });
            }
        });
        $('.attachmentNewName input').off().on('keyup', function (e) {
            e.preventDefault();
            if (e.keyCode == 13) {
                _this.submitRename($(e.target));
            }
            return false;
        });
    };
    AttachmentField.prototype.render = function (container) {
        var _this = this;
        return this.getTemplate
            .then(function (template) {
            _this.attachments.forEach(function (attachment) {
                //Rename FileName if it contains unsupported characters
                var oldFileName = attachment.getFileName();
                var newFileName = oldFileName.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\^/g, '_');
                if (oldFileName != newFileName)
                    attachment.setFileName(newFileName);
                //Set Fields for template
                attachment.fileName = newFileName;
                attachment.extension = newFileName.substring(newFileName.lastIndexOf('.'));
                attachment.fileIcon = attachment.getFileIconPath(true);
                attachment.fileNameNoExtension = newFileName.substring(0, newFileName.lastIndexOf('.'));
            });
            _this.currentParameters = {
                id: _this.id,
                attachments: _this.attachments.filter(function (val) { return !val.blacklisted; }),
                blacklistedAttachments: _this.attachments.filter(function (val) { return val.blacklisted; })
            };
            $(container).html(template(_this.currentParameters));
        });
    };
    ;
    return AttachmentField;
}(Field));
AttachmentField.uiActionRename = 'renameAttachment';
AttachmentField.uiActionSelect = 'selectAttachment';
AttachmentField.uiActionAddRef = 'addRefAttachment';
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var Select2Field = (function (_super) {
    __extends(Select2Field, _super);
    function Select2Field(id, field, options, multiple, style) {
        if (multiple === void 0) { multiple = false; }
        if (style === void 0) { style = "min-width: 350px; width: 80%;"; }
        var _this = _super.call(this, id, field) || this;
        _this.options = $.extend({ data: [], minimumInputLength: 0, allowClear: true, templateResult: Select2Field.formatIcon, templateSelection: Select2Field.formatIcon }, options);
        _this.styleCss = style;
        _this.multiple = multiple;
        //https://github.com/select2/select2/issues/3497
        //AllowClear needs placeholder
        if (_this.options.allowClear && !_this.options.placeholder) {
            _this.options.placeholder = '';
        }
        return _this;
    }
    Select2Field.prototype.getDomValue = function () {
        return $('#' + this.id).val();
    };
    Select2Field.prototype.getObjectValue = function () {
        var elements = $('#' + this.id)['select2']('data');
        if (this.multiple) {
            return elements.map(function (p) { return p.data; });
        }
        else {
            return elements[0].data;
        }
    };
    Select2Field.prototype.setData = function (newValues, fromSetValue) {
        if (fromSetValue === void 0) { fromSetValue = false; }
        this.options.data = newValues;
        if (this.isRendered()) {
            //Get selected Properties
            var isDisabled = $('#' + this.id).prop('disabled');
            $('#' + this.id)["select2"]("destroy");
            this.ownContainer.html('');
            this.render(this.ownContainer);
            //Set saved Properties
            $('#' + this.id).prop('disabled', isDisabled);
            this.hookEventHandler();
            //If intial value has been set, we need to set it again now.
            if (this.initialValue && !fromSetValue) {
                this.setValue(this.initialValue);
            }
        }
    };
    Select2Field.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).on('change', function (e) { return _this.triggerValueChange(); });
    };
    Select2Field.prototype.render = function (container) {
        container.append($("<select class=\"select input-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" style=\"" + this.styleCss + "\" " + ((this.multiple) ? 'multiple' : '') + ">\n\t\t\t\t\t\t\t" + ((!this.multiple) ? '<option></option>' : '') + "\n\t\t\t\t\t\t\t</select>\n\t\t\t\t\t\t\t<img src=\"images/ajax-loader.gif\" class=\"hidden\" id=\"" + this.id + "-spinner\" />"));
        $('#' + this.id)["select2"](this.options);
    };
    Select2Field.prototype.convertId = function (id) {
        //Best Guess: Return data object with same "ID" property
        if (typeof id === 'string' && this.options.data) {
            var result_1 = null;
            this.options.data.forEach(function (data) {
                if (data.children) {
                    data.children.forEach(function (child) {
                        if (child.id === id)
                            result_1 = child;
                    });
                }
                else if (data.id === id) {
                    result_1 = data;
                }
            });
            var returnValue = ((result_1) ? result_1.data : null);
            return Promise.resolve(returnValue);
        }
        return Promise.resolve(id);
    };
    Select2Field.prototype.showSpinner = function () {
        $('#' + this.id + '-spinner').removeClass('hidden');
    };
    Select2Field.prototype.hideSpinner = function () {
        $('#' + this.id + '-spinner').addClass('hidden');
    };
    Select2Field.formatIcon = function (element) {
        if (!element.id)
            return element.text; // optgroup
        if (element.icon)
            return $('<span><img style="margin-right:3px; width: 16px;" src="' + element.icon + '"  onerror="jiraHandleImageFallback(this)"/>' + element.text + '</span>');
        else if (element.iconClass) {
            return $('<span><i style="margin-right:4px;" class="' + element.iconClass + '"></i><span>' + element.text + '</span></span>');
        }
        else {
            return element.text;
        }
    };
    return Select2Field;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var CascadedSelectField = (function (_super) {
    __extends(CascadedSelectField, _super);
    function CascadedSelectField(id, field) {
        var _this = _super.call(this, id, field) || this;
        _this.parentField = new SingleSelectField(id + '_parent', field, {}, "min-width: 150px; width: 45%;");
        FieldController.registerEvent(EventType.FieldChange, _this, id + '_parent');
        var childFieldMeta = JSON.parse(JSON.stringify(field));
        childFieldMeta.allowedValues = [];
        _this.childField = new SingleSelectField(id + '_child', childFieldMeta, {}, "min-width: 150px; width: 45%; ");
        FieldController.registerEvent(EventType.FieldChange, _this, id + '_child');
        return _this;
    }
    CascadedSelectField.prototype.getDomValue = function () {
    };
    CascadedSelectField.prototype.getValue = function (onlyChangedData) {
        if (onlyChangedData === void 0) { onlyChangedData = false; }
        var selectedParentId = this.parentField.getDomValue() || null;
        var selectedChildId = this.childField.getDomValue() || null;
        var resultObj = null;
        if (onlyChangedData) {
            //In edit case: Only send if changed	
            var oldParentValue = (this.initialValue) ? this.initialValue.id : null;
            var oldChildValue = (this.initialValue && this.initialValue.child) ? this.initialValue.child.id : null;
            if (!isEqual(oldParentValue, selectedParentId) ||
                !isEqual(oldChildValue, selectedChildId)) {
                if (selectedParentId) {
                    var childObj = (selectedChildId) ? { id: selectedChildId } : null;
                    return {
                        id: selectedParentId,
                        child: childObj
                    };
                }
                else {
                    return null;
                }
            }
        }
        else {
            //In creation case: Only send if not null
            if (selectedParentId) {
                resultObj = { id: selectedParentId };
                if (selectedChildId) {
                    resultObj.child = { id: selectedChildId };
                }
                return resultObj;
            }
        }
    };
    CascadedSelectField.prototype.setValue = function (value) {
        this.parentField.setValue(value.id);
        this.parentField.initialValue = value.id;
        if (value.child) {
            this.childField.setValue(value.child.id);
            this.childField.initialValue = value.child.id;
        }
    };
    CascadedSelectField.prototype.handleEvent = function (type, newValue, source) {
        if (source === this.id + '_parent') {
            //Adjust Child Collection
            var allowedValues = [];
            if (newValue) {
                var currentSelection = this.fieldMeta.allowedValues.filter(function (v) { return v.id == newValue.id; })[0];
                allowedValues = (currentSelection) ? currentSelection.children : [];
            }
            this.childField.setData(allowedValues.map(this.childField.convertToSelect2));
        }
        FieldController.raiseEvent(EventType.FieldChange, this.getValue(false), this.id);
        return null;
    };
    CascadedSelectField.prototype.hookEventHandler = function () { };
    CascadedSelectField.prototype.render = function (container) {
        var parentContainer = $("<div id=\"{this.id}_parent-container\" style=\"display:inline;\"></div>").appendTo(container);
        this.parentField.render(parentContainer);
        this.parentField.hookEventHandler();
        this.parentField.ownContainer = parentContainer;
        container.append('<span style="margin-left: 10px;">&nbsp</span>');
        var childContainer = $("<div id=\"{this.id}_child-container\" style=\"display:inline;\"></div>").appendTo(container);
        this.childField.render(childContainer);
        this.childField.hookEventHandler();
        this.childField.ownContainer = childContainer;
    };
    return CascadedSelectField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
var GetObjectArray = (function () {
    function GetObjectArray(keyName) {
        this.keyName = keyName;
    }
    GetObjectArray.prototype.getValue = function (field, onlyChangedData) {
        var _this = this;
        var newValue = field.getDomValue();
        //In edit case: Only send changes
        if (onlyChangedData) {
            //Both empty
            if (!field.initialValue && newValue.length === 0)
                return;
            //If length the same and all values match, we do not need to send anything            
            if (field.initialValue && field.initialValue.length === newValue.length) {
                var isSame = field.initialValue.every(function (c) {
                    return findWithAttr(newValue, _this.keyName, c[_this.keyName]) > -1;
                });
                if (isSame)
                    return;
            }
            return newValue;
        }
        else {
            //In creation case: Only send if not null	
            return (newValue.length > 0) ? newValue : undefined;
        }
    };
    return GetObjectArray;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetCheckedValues = (function () {
    function SetCheckedValues() {
    }
    SetCheckedValues.prototype.setValue = function (field, value) {
        if (value) {
            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    field.ownContainer.find('[value=' + item.id + ']').prop('checked', true).trigger('change');
                });
            }
            else {
                field.ownContainer.find('[value=' + value.id + ']').prop('checked', true).trigger('change');
            }
        }
    };
    return SetCheckedValues;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObjectArray.ts" />
/// <reference path="../setter/SetCheckedValues.ts" />
var CheckboxField = (function (_super) {
    __extends(CheckboxField, _super);
    function CheckboxField() {
        return _super.apply(this, arguments) || this;
    }
    CheckboxField.prototype.getDomValue = function () {
        var checkedValues = [];
        $(this.ownContainer).find('input').each(function () {
            if ($(this).is(':checked')) {
                checkedValues.push({ id: $(this).val() });
            }
        });
        return checkedValues;
    };
    CheckboxField.prototype.hookEventHandler = function () {
        var _this = this;
        $("#" + this.id + "-field-group").find('input').change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    CheckboxField.prototype.render = function (container) {
        var _this = this;
        var innerContainer = $('<div class="awesome-wrapper"></div>').appendTo(container);
        this.fieldMeta.allowedValues.forEach(function (option) {
            innerContainer.append($("<div class=\"checkbox awesome\">\n                                    <input type=\"checkbox\" id=\"" + _this.id + "_" + option.id + "\" value=\"" + option.id + "\">\n                                    <label for=\"" + _this.id + "_" + option.id + "\">" + option.value + "</label>\n                                </div>"));
        });
    };
    ;
    return CheckboxField;
}(Field));
CheckboxField = __decorate([
    getter(GetterType.ObjectArray, "id"),
    setter(SetterType.CheckedValues)
], CheckboxField);
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetDateValue = (function () {
    function SetDateValue() {
    }
    SetDateValue.prototype.setValue = function (field, value) {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + field.id)["datetimepicker"]('setOptions', { value: momentDate.format('L') });
            $('#' + field.id).trigger('change');
        }
    };
    return SetDateValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetDateValue.ts" />
var DateField = (function (_super) {
    __extends(DateField, _super);
    function DateField() {
        return _super.apply(this, arguments) || this;
    }
    DateField.prototype.getDomValue = function () {
        var date = $('#' + this.id)["datetimepicker"]("getValue");
        if (date) {
            date = moment(date).format('YYYY-MM-DD');
        }
        return date;
    };
    DateField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    DateField.prototype.render = function (container) {
        var _this = this;
        container.append($("<input style=\"height: 28px;\" class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" placeholder=\"" + yasoon.i18n('dialog.datePickerFormatTitle') + "\" value=\"\" type=\"text\" >\n\t\t\t\t\t\t\t<a href=\"#\" id=\"" + this.id + "-trigger\" title=\"" + yasoon.i18n('dialog.titleSelectDate') + "\"><span class=\"aui-icon icon-date\">" + yasoon.i18n('dialog.titleSelectDate') + "</span></a>"));
        $('#' + this.id)["datetimepicker"]({
            timepicker: false,
            format: yasoon.i18n('dialog.datePickerDateFormat'),
            scrollInput: false,
            allowBlank: true
        });
        var country = yasoon.setting.getProjectSetting('locale').split('-')[0];
        $["datetimepicker"].setLocale(country);
        $('#' + this.id + '-trigger').off().click(function (e) {
            $('#' + _this.id)["datetimepicker"]("show");
        });
    };
    ;
    return DateField;
}(Field));
DateField = __decorate([
    getter(GetterType.Text),
    setter(SetterType.Date)
], DateField);
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetDateTimeValue = (function () {
    function SetDateTimeValue() {
    }
    SetDateTimeValue.prototype.setValue = function (field, value) {
        if (value) {
            var momentDate = moment(new Date(value));
            $('#' + field.id)["datetimepicker"]('setOptions', { value: momentDate.format('L') + ' ' + momentDate.format('HH:mm') });
            $('#' + field.id).trigger('change');
        }
    };
    return SetDateTimeValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetDateTimeValue.ts" />
var DateTimeField = (function (_super) {
    __extends(DateTimeField, _super);
    function DateTimeField() {
        return _super.apply(this, arguments) || this;
    }
    DateTimeField.prototype.getDomValue = function () {
        var date = $('#' + this.id)["datetimepicker"]("getValue");
        if (date) {
            date = moment(date).format('YYYY-MM-DD[T]HH:mm:ss.[000]ZZ');
        }
        return date;
    };
    DateTimeField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    DateTimeField.prototype.render = function (container) {
        var _this = this;
        container.append($("<input style=\"height: 28px;\" class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" placeholder=\"" + yasoon.i18n('dialog.dateTimePickerFormatTitle') + "\" value=\"\" type=\"text\" >\n\t\t\t\t\t\t\t<a href=\"#\" id=\"" + this.id + "-trigger\" title=\"" + yasoon.i18n('dialog.titleSelectDate') + "\"><span class=\"aui-icon icon-date\">" + yasoon.i18n('dialog.titleSelectDate') + "</span></a>"));
        var country = yasoon.setting.getProjectSetting('locale').split('-')[0];
        $('#' + this.id)["datetimepicker"]({
            allowTimes: [
                //'00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30',
                '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
            ],
            format: yasoon.i18n('dialog.dateTimePickerFormat'),
            scrollInput: false,
            allowBlank: true
        });
        $["datetimepicker"].setLocale(country);
        $('#' + this.id + '-trigger').off().click(function (e) {
            $('#' + _this.id)["datetimepicker"]("show");
        });
    };
    ;
    return DateTimeField;
}(Field));
DateTimeField = __decorate([
    getter(GetterType.Text),
    setter(SetterType.DateTime)
], DateTimeField);
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
var Select2AjaxField = (function (_super) {
    __extends(Select2AjaxField, _super);
    function Select2AjaxField(id, field, options, multiple, style) {
        if (options === void 0) { options = {}; }
        if (multiple === void 0) { multiple = false; }
        if (style === void 0) { style = "min-width: 350px; width: 80%;"; }
        var _this;
        if (!options.ajax) {
            options.ajax = {
                url: '',
                transport: function (params, success, failure) {
                    var queryTerm = '';
                    if (params && params.data && params.data.q) {
                        queryTerm = params.data.q;
                    }
                    var promise;
                    if (queryTerm) {
                        promise = _this.getDataDebounced(queryTerm);
                    }
                    else {
                        promise = _this.getEmptyDataInternal();
                    }
                    _this.showSpinner();
                    promise
                        .spread(function (result, searchTerm) {
                        //This handler is registered multiple times on the same promise.
                        //Check if we are responsible to make sure we call the correct success function
                        if (searchTerm == queryTerm) {
                            _this.hideSpinner();
                            success(result);
                        }
                    })
                        .catch(function (error) {
                        console.log(error);
                        window["lastError"] = error;
                        _this.hideSpinner();
                        //yasoon.util.log();
                        success();
                    });
                },
                processResults: function (data, page) {
                    if (!data)
                        data = [];
                    return {
                        results: data
                    };
                }
            };
        }
        _this = _super.call(this, id, field, options, multiple, style) || this;
        _this.debouncedFunction = debounce(function (searchTerm) {
            _this.getData(searchTerm)
                .then(function (result) {
                _this.currentResolve([result, searchTerm]);
            })
                .catch(function (e) {
                _this.currentReject(e);
            });
        }, 500, false);
        return _this;
    }
    Select2AjaxField.prototype.getDataDebounced = function (searchTerm) {
        var _this = this;
        //Complicated...
        //We don'T want to spam Promises that never fullfill...
        //So we only create Promises if the previous one is already fullfilled.
        //But we need to save all Promise Data and call them debounced...
        if (!this.currentPromise || this.currentPromise.isFulfilled()) {
            this.currentPromise = new Promise(function (resolve, reject) {
                _this.currentReject = reject;
                _this.currentResolve = resolve;
                _this.debouncedFunction.call(_this, searchTerm);
            });
            return this.currentPromise;
        }
        this.debouncedFunction.call(this, searchTerm);
        return this.currentPromise;
    };
    Select2AjaxField.prototype.getEmptyDataInternal = function () {
        return this.getEmptyData()
            .then(function (result) {
            return [result, '']; //Keep signature for spread
        });
    };
    Select2AjaxField.prototype.getEmptyData = function () {
        var _this = this;
        if (this.emptySearchResult)
            return Promise.resolve(this.emptySearchResult);
        return this.getData("")
            .then(function (result) {
            _this.emptySearchResult = result;
            return result;
        });
    };
    return Select2AjaxField;
}(Select2Field));
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetOptionValue = (function () {
    function SetOptionValue() {
    }
    SetOptionValue.prototype.setValue = function (field, value) {
        var _this = this;
        var selectField = field;
        if (!field.isRendered()) {
            //Not rendered, nothing to do... will be called with field.initialValue again
            return;
        }
        if (value && Array.isArray(value)) {
            //Multiselect       
            Promise.all(value.map(function (v) { return selectField.convertId(v); }))
                .then(function (arrayObj) {
                arrayObj = arrayObj.filter(function (v) { return !!v; });
                if (arrayObj.length === 0)
                    return;
                // Convert value into normalized select2 format
                var select2Values = arrayObj.map(function (v) { return selectField.convertToSelect2.call(selectField, v); });
                //Now there are two cases:
                //All values already exist in data --> we can just select the data
                //Some data do not yet exist --> rerender and select data
                var nonExistingElements = [];
                var selectedValues = [];
                select2Values.forEach(function (v) {
                    if (!_this.findInOptions(selectField.options.data, v.id)) {
                        nonExistingElements.push(v);
                    }
                    selectedValues.push(v.id);
                });
                if (nonExistingElements.length > 0) {
                    var newValues = selectField.options.data.concat(nonExistingElements);
                    selectField.setData(newValues);
                }
                $('#' + field.id).val(selectedValues).trigger('change');
            });
        }
        else if (value) {
            //Single Select
            //Convert value into correct value
            return selectField.convertId(value)
                .then(function (obj) {
                if (!obj)
                    return;
                // Convert value into normalized select2 format
                var select2Value = selectField.convertToSelect2(obj);
                //Now there are two cases:
                //All values already exist in data --> we can just select the data
                //Some data do not yet exist --> rerender and select data
                if (!_this.findInOptions(selectField.options.data, select2Value.id)) {
                    selectField.options.data.push(select2Value);
                    selectField.setData(selectField.options.data, true);
                }
                $('#' + field.id).val(select2Value.id).trigger('change');
            });
        }
    };
    SetOptionValue.prototype.findInOptions = function (inputData, id) {
        var result = inputData.filter(function (data) {
            if (data.children) {
                return (data.children.filter(function (child) { return child.id === id; }).length > 0);
            }
            else {
                return data.id === id;
            }
        });
        return result.length > 0;
    };
    return SetOptionValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var EpicLinkSelectField = (function (_super) {
    __extends(EpicLinkSelectField, _super);
    function EpicLinkSelectField(id, field) {
        var _this = _super.call(this, id, field) || this;
        //Update Epic JIRA 6.x and 7.0
        _this.updateEpic6 = function (newEpicLink, issueKey) {
            return jiraAjax('/rest/greenhopper/1.0/epics/' + newEpicLink + '/add', yasoon.ajaxMethod.Put, '{ "issueKeys":["' + issueKey + '"] }');
        };
        //Update Epic JIRA > 7.1
        _this.updateEpic7 = function (newEpicLink, issueKey) {
            return jiraAjax('/rest/agile/1.0/epic/' + newEpicLink + '/issue', yasoon.ajaxMethod.Post, '{ "issues":["' + issueKey + '"] }');
        };
        //Delete Epic JIRA 6.x and 7.0
        _this.deleteEpic6 = function (issueKey) {
            return jiraAjax('/rest/greenhopper/1.0/epics/remove', yasoon.ajaxMethod.Put, '{ "issueKeys":["' + issueKey + '"] }');
        };
        //Delete Epic JIRA > 7.1
        _this.deleteEpic7 = function (issueKey) {
            return jiraAjax('/rest/agile/1.0/epic/none/issue', yasoon.ajaxMethod.Post, '{ "issues":["' + issueKey + '"] }');
        };
        FieldController.registerEvent(EventType.AfterSave, _this);
        return _this;
    }
    EpicLinkSelectField.prototype.handleEvent = function (type, newValue, source) {
        if (type === EventType.AfterSave) {
            var newEpicLink = this.getDomValue();
            var eventData = newValue;
            if (jira.isEditMode) {
                //We cannot change epic Links via standard API, so trigger the call here
                var oldEpicLink = this.initialValue;
                if (newEpicLink != oldEpicLink) {
                    if (newEpicLink) {
                        //Create or update
                        if (jiraIsVersionHigher(jira.systemInfo, '7.1')) {
                            return this.updateEpic7(newEpicLink, eventData.newData.key);
                        }
                        else {
                            return this.updateEpic6(newEpicLink, eventData.newData.key);
                        }
                    }
                    else {
                        //Delete
                        if (jiraIsVersionHigher(jira.systemInfo, '7.1')) {
                            return this.deleteEpic7(eventData.newData.key);
                        }
                        else {
                            return this.deleteEpic6(eventData.newData.key);
                        }
                    }
                }
            }
            else if (!jira.isEditMode && jiraIsVersionHigher(jira.systemInfo, '7.1')) {
                if (newEpicLink) {
                    this.updateEpic7(newEpicLink, eventData.newData.key);
                }
            }
        }
        return null;
    };
    EpicLinkSelectField.prototype.getValue = function (changedDataOnly) {
        //Only for creation as Epic links cannot be changed via REST APi --> Status code 500
        //Ticket: https://jira.atlassian.com/browse/GHS-10333
        //There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
        var value = this.getDomValue();
        if (!jiraIsVersionHigher(jira.systemInfo, '7') && !changedDataOnly && value) {
            return 'key:' + value;
        }
    };
    EpicLinkSelectField.prototype.setValue = function (value) {
        //Format in JIRA < 7.0 "key: epicId" , JIRA 7+: just epic Id
        if (!jiraIsVersionHigher(jira.systemInfo, '7')) {
            value = value.replace('key:', '');
        }
        this.setter.setValue(this, value);
    };
    EpicLinkSelectField.prototype.convertToSelect2 = function (epic) {
        return {
            id: epic.key,
            text: epic.name + ' ( ' + epic.key + ' )',
            data: epic
        };
    };
    EpicLinkSelectField.prototype.convertId = function (id) {
        return this.getData(id)
            .then(function (result) {
            if (result[0].children) {
                return result[0].children[0].data;
            }
            else {
                return result[0].data;
            }
        });
    };
    EpicLinkSelectField.prototype.getData = function (searchTerm) {
        var _this = this;
        //Result of Service
        // JIRA 6.x: {"epicNames":[{"key":"SSP-24","name":"Epic 1"},{"key":"SSP-25","name":"Epic 2"}],"total":2}
        // JIRA 7+:  {"epicLists":[{"listDescriptor":"All epics","epicNames":[{"key":"SSP-24","name":"Epic 1","isDone":false},{"key":"SSP-25","name":"Epic 2","isDone":false},{"key":"SSP-28","name":"Epic New","isDone":false}]}],"total":3}
        var url = '/rest/greenhopper/1.0/epics?maxResults=10&projectKey=' + jira.selectedProject.key + '&searchQuery=' + searchTerm;
        return jiraGet(url)
            .then(function (data) {
            var epics = JSON.parse(data);
            var results = [];
            if (epics && epics.total > 0) {
                if (epics.epicLists) {
                    var epic7 = epics;
                    epic7.epicLists.forEach(function (epicList) {
                        var children = epicList.epicNames.map(_this.convertToSelect2);
                        results.push({
                            id: epicList.listDescriptor,
                            text: epicList.listDescriptor,
                            children: children
                        });
                    });
                }
                else {
                    var epic6 = epics;
                    results = epic6.epicNames.map(_this.convertToSelect2);
                }
            }
            return results;
        });
    };
    return EpicLinkSelectField;
}(Select2AjaxField));
EpicLinkSelectField = __decorate([
    setter(SetterType.Option)
], EpicLinkSelectField);
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/common.d.ts" />
var GetOption = (function () {
    function GetOption(keyName, nullValue) {
        this.nullValue = '-1';
        this.keyName = keyName;
        if (nullValue !== undefined) {
            this.nullValue = nullValue;
        }
    }
    GetOption.prototype.getValue = function (field, onlyChangedData) {
        var _this = this;
        var selectField = field;
        var newValue = selectField.getDomValue();
        if (selectField.multiple) {
            var convertedValues_1 = [];
            newValue.forEach(function (id) {
                var obj = {};
                obj[_this.keyName] = id;
                convertedValues_1.push(obj);
            });
            //Multi Select
            if (onlyChangedData) {
                //Both empty
                if (!field.initialValue && convertedValues_1.length === 0)
                    return;
                //If length the same and all values match, we do not need to send anything            
                if (field.initialValue && field.initialValue.length === convertedValues_1.length) {
                    var isSame = field.initialValue.every(function (c) {
                        return findWithAttr(convertedValues_1, _this.keyName, c[_this.keyName]) > -1;
                    });
                    if (isSame)
                        return;
                }
                return convertedValues_1;
            }
            else {
                //In creation case: Only send if not null	
                return (convertedValues_1.length > 0) ? convertedValues_1 : undefined;
            }
        }
        else {
            //Single Select
            var result = {};
            if (onlyChangedData) {
                //In edit case: Only send if changed	
                //Normalize
                var select2Value = { id: null };
                if (field.initialValue) {
                    select2Value = selectField.convertToSelect2(field.initialValue);
                }
                if (!isEqual(select2Value.id, newValue)) {
                    result[this.keyName] = newValue || this.nullValue;
                    return result;
                }
            }
            else {
                //In creation case: Only send if not null	
                if (newValue) {
                    result[this.keyName] = newValue;
                    return result;
                }
            }
        }
    };
    return GetOption;
}());
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var GroupSelectField = (function (_super) {
    __extends(GroupSelectField, _super);
    function GroupSelectField(id, field, options) {
        if (options === void 0) { options = { multiple: false }; }
        return _super.call(this, id, field, {}, options.multiple) || this;
    }
    GroupSelectField.prototype.getData = function (searchTerm) {
        var _this = this;
        var url = '/rest/api/2/groups/picker?maxResults=50&query=' + searchTerm;
        return jiraGet(url)
            .then(function (data) {
            var groupsResult = JSON.parse(data);
            var groupsArray = [];
            groupsResult.groups.forEach(function (group) {
                groupsArray.push(_this.convertToSelect2(group));
            });
            return groupsArray;
        });
    };
    GroupSelectField.prototype.convertToSelect2 = function (group) {
        return {
            id: group.name,
            text: group.name,
            data: group
        };
    };
    return GroupSelectField;
}(Select2AjaxField));
GroupSelectField = __decorate([
    getter(GetterType.Option, "name", null),
    setter(SetterType.Option)
], GroupSelectField);
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var IssueField = (function (_super) {
    __extends(IssueField, _super);
    function IssueField(id, field, excludeSubtasks) {
        var _this;
        var options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectIssue');
        _this = _super.call(this, id, field, options) || this;
        _this.excludeSubtasks = excludeSubtasks;
        //Load Recent Issues from DB
        var issuesString = yasoon.setting.getAppParameter('recentIssues');
        if (issuesString) {
            _this.recentIssues = JSON.parse(issuesString);
        }
        FieldController.registerEvent(EventType.FieldChange, _this, FieldController.projectFieldId);
        return _this;
    }
    IssueField.prototype.handleEvent = function (type, newValue, source) {
        if (source === FieldController.projectFieldId) {
            this.setProject(newValue);
        }
        return null;
    };
    IssueField.prototype.hookEventHandler = function () {
        _super.prototype.hookEventHandler.call(this);
        $('#' + this.id).on('select2:select', function (evt, data) {
            //Move all this to addComment Dialog
            //We trigger this event manually in setValue.
            //This leads to different eventData :/
            /*var issue = null;
            if (data) {
                issue = {
                    project: data.fields.project,
                    id: data.id
                };
            } else if (jira.mode === 'jiraAddCommentDialog' && evt.params && evt.params.data) {
                issue = evt.params.data;
            } else {
                $('.buttons').removeClass('servicedesk');
                $('.buttons').removeClass('no-requesttype');
                return;
            }


            var currentProject = jira.projects.filter(function (p) { return p.id === issue.project.id; })[0];
            if (!currentProject || currentProject.projectTypeKey !== 'service_desk') {
                $('.buttons').removeClass('servicedesk');
                $('.buttons').removeClass('no-requesttype');
                return;
            }

            //We have a service Project... Check if it is a service request
            jiraGet('/rest/servicedeskapi/request/' + issue.id)
                .then(function (data) {
                    $('.buttons').addClass('servicedesk');
                    $('.buttons').removeClass('no-requesttype');
                })
                .catch(function (e) {
                    $('.buttons').addClass('no-requesttype');
                    $('.buttons').removeClass('servicedesk');
                });*/
        });
    };
    IssueField.prototype.getReturnStructure = function (issues, queryTerm) {
        var result = [];
        // 1. Build recent suggestion
        if (this.recentIssues && !queryTerm) {
            result.push({
                id: 'Suggested',
                text: yasoon.i18n('dialog.recentIssues'),
                children: this.recentIssues,
            });
        }
        //2. Search Results
        if (issues) {
            if (queryTerm) {
                result.push({
                    id: 'Search',
                    text: yasoon.i18n('dialog.titleSearchResults', { term: queryTerm }),
                    children: issues
                });
            }
            else {
                result.push({
                    id: 'Search',
                    text: yasoon.i18n('dialog.projectIssues'),
                    children: issues
                });
            }
        }
        return result;
    };
    IssueField.prototype.queryData = function (searchTerm) {
        //Concat JQL
        var jql = '';
        if (searchTerm) {
            jql += 'key = "' + searchTerm + '" OR ( Summary ~ "' + searchTerm + '"';
        }
        if (this.currentProject) {
            jql += ((jql) ? ' AND' : '') + ' project = "' + this.currentProject.key + '"';
        }
        if (jira.settings.hideResolvedIssues) {
            jql += ((jql) ? ' AND' : '') + ' status != "resolved" AND status != "closed" AND status != "done"';
        }
        if (this.excludeSubtasks) {
            jql += ((jql) ? ' AND' : '') + ' type NOT IN subtaskIssueTypes()';
        }
        //Closing brackets for first Summary
        if (searchTerm) {
            jql += ' )';
        }
        console.log('JQL' + jql);
        return jiraGet('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&maxResults=20&fields=summary,project&validateQuery=false')
            .then(function (data) {
            var jqlResult = JSON.parse(data);
            var result = [];
            console.log(jqlResult);
            //Transform Data
            jqlResult.issues.forEach(function (issue) {
                result.push(this.convertToSelect2(issue));
            });
            return result;
        });
    };
    IssueField.prototype.convertToSelect2 = function (issue) {
        return {
            id: issue.id,
            text: issue.fields['summary'] + ' (' + issue.key + ')',
            data: issue
        };
    };
    IssueField.prototype.getData = function (searchTerm) {
        var _this = this;
        return this.queryData(searchTerm)
            .then(function (result) {
            return _this.getReturnStructure(result, searchTerm);
        });
    };
    IssueField.prototype.getEmptyData = function () {
        if (this.currentProject) {
            return this.getProjectIssues;
        }
        else {
            return Promise.resolve(this.getReturnStructure());
        }
    };
    IssueField.prototype.setProject = function (project) {
        var _this = this;
        this.currentProject = project;
        this.getProjectIssues = this.queryData('')
            .then(function (issues) {
            return _this.getReturnStructure(issues);
        });
    };
    return IssueField;
}(Select2AjaxField));
IssueField.defaultMeta = { key: FieldController.issueFieldId, get name() { return yasoon.i18n('dialog.issue'); }, required: true, schema: { system: 'issue', type: '' } };
IssueField = __decorate([
    getter(GetterType.Option, "id"),
    setter(SetterType.Option)
], IssueField);
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var IssueTypeField = IssueTypeField_1 = (function (_super) {
    __extends(IssueTypeField, _super);
    function IssueTypeField(id, field) {
        var _this;
        var options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderIssueType');
        options.allowClear = false;
        _this = _super.call(this, id, field, options) || this;
        FieldController.registerEvent(EventType.FieldChange, _this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.FieldChange, _this, FieldController.requestTypeFieldId);
        FieldController.registerEvent(EventType.UiAction, _this);
        return _this;
    }
    IssueTypeField.prototype.hookEventHandler = function () {
        _super.prototype.hookEventHandler.call(this);
        $('#switchServiceMode').click(function (e) {
            //Just raise Event so this can be raised from outside as well.
            //Ui Changes will be done in HandleEvent()
            var eventData = {
                name: IssueTypeField_1.uiActionServiceDesk,
                value: !$('#switchServiceMode').hasClass('active')
            };
            FieldController.raiseEvent(EventType.UiAction, eventData);
            e.preventDefault();
        });
    };
    IssueTypeField.prototype.render = function (container) {
        _super.prototype.render.call(this, container);
        container.append("<br /><a id=\"switchServiceMode\" class=\"hidden\" style=\"cursor:pointer;\" title=\"\">\n                            <span class=\"showPortal\"><i class=\"fa fa-plus\"></i><span data-bind=\"localizedText: 'dialog.SDAssignment'\">Service Desk assignment</span> </span>\n                            <span class=\"hidePortal\"><i class=\"fa fa-minus\"></i><span data-bind=\"localizedText: 'dialog.SDAssignment'\">Service Desk assignment</span> </span>\n                        </a>");
    };
    IssueTypeField.prototype.triggerValueChange = function () {
        var issueType = this.getObjectValue();
        if (!this.lastValue || this.lastValue.id !== issueType.id) {
            FieldController.raiseEvent(EventType.FieldChange, issueType, this.id);
            this.lastValue = issueType;
        }
    };
    IssueTypeField.prototype.convertToSelect2 = function (issueType) {
        return {
            id: issueType.id,
            text: issueType.name,
            icon: jira.icons.mapIconUrl(issueType.iconUrl),
            data: issueType
        };
    };
    IssueTypeField.prototype.handleEvent = function (type, newValue, source) {
        var _this = this;
        if (type == EventType.FieldChange) {
            if (source === FieldController.projectFieldId && newValue) {
                var project = newValue;
                if (this.currentProject && this.currentProject.id == project.id)
                    return;
                var promise = void 0;
                if (!project.issueTypes) {
                    this.showSpinner();
                    promise = jiraGet('/rest/api/2/project/' + project.key)
                        .then(function (data) {
                        _this.hideSpinner();
                        var proj = JSON.parse(data);
                        return proj;
                    });
                }
                else {
                    promise = Promise.resolve(project);
                }
                promise.then(function (proj) {
                    _this.currentProject = proj;
                    var result = proj.issueTypes.map(_this.convertToSelect2);
                    _this.setData(result);
                    //Check Service Desk
                    if (proj.projectTypeKey === "service_desk") {
                        $(_this.ownContainer).find('#switchServiceMode').removeClass('hidden');
                    }
                    else {
                        $(_this.ownContainer).find('#switchServiceMode').addClass('hidden');
                    }
                    _this.setValue(result[0].data);
                });
            }
            else if (source === FieldController.requestTypeFieldId) {
                var requestType_1 = newValue;
                var issueType = this.options.data.filter(function (sel) { return sel.id === requestType_1.issueType.toString(); })[0];
                this.setValue(issueType.data);
            }
        }
        else if (type === EventType.UiAction) {
            var eventData = newValue;
            if (eventData.name === IssueTypeField_1.uiActionServiceDesk) {
                if (eventData.value) {
                    //Enable Service mode
                    $('#' + this.id).prop("disabled", true);
                    $('#switchServiceMode').addClass('active');
                    $('#ServiceArea').removeClass('hidden');
                    $('#' + FieldController.reporterFieldId + '-field-group').addClass('hidden');
                }
                else {
                    //Disable Service mode
                    $('#' + this.id).prop("disabled", false);
                    $('#switchServiceMode').removeClass('active');
                    $('#ServiceArea').addClass('hidden');
                    $('#' + FieldController.reporterFieldId + '-field-group').removeClass('hidden');
                }
            }
        }
        return null;
    };
    return IssueTypeField;
}(Select2Field));
IssueTypeField.defaultMeta = { key: FieldController.issueTypeFieldId, get name() { return yasoon.i18n('dialog.issueType'); }, required: true, schema: { system: 'issue', type: '' } };
IssueTypeField.uiActionServiceDesk = 'ServiceDeskActivated';
IssueTypeField = IssueTypeField_1 = __decorate([
    getter(GetterType.Option, "id"),
    setter(SetterType.Option)
], IssueTypeField);
var IssueTypeField_1;
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var GetArray = (function () {
    function GetArray() {
    }
    GetArray.prototype.getValue = function (field, onlyChangedData) {
        var newValue = field.getDomValue();
        if (!Array.isArray(newValue)) {
            newValue = [newValue];
        }
        //In edit case: Only send changes
        if (onlyChangedData) {
            //Both empty
            if (!field.initialValue && newValue.length === 0)
                return;
            //If length the same and all values match, we do not need to send anything            
            if (field.initialValue && field.initialValue.length === newValue.length) {
                var isSame = field.initialValue.every(function (c) {
                    return newValue.indexOf(c) > -1;
                });
                if (isSame)
                    return;
            }
            return newValue;
        }
        else {
            //In creation case: Only send if not null	
            return (newValue.length > 0) ? newValue : undefined;
        }
    };
    return GetArray;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var SetTagValue = (function () {
    function SetTagValue() {
    }
    SetTagValue.prototype.setValue = function (field, value) {
        if (value) {
            value.forEach(function (label) {
                //Add Option tags so initial selection will work
                $('#' + field.id).append("<option val=\"" + label + "\">" + label + "</option>");
            });
            $('#' + field.id).val(value).trigger('change');
            $('#' + field.id).data('value', value);
        }
    };
    return SetTagValue;
}());
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../getter/GetArray.ts" />
/// <reference path="../setter/SetTagValue.ts" />
/// <reference path="../../../definitions/common.d.ts" />
var LabelSelectField = (function (_super) {
    __extends(LabelSelectField, _super);
    function LabelSelectField(id, field, options) {
        if (options === void 0) { options = {}; }
        var _this;
        options.tags = true;
        _this = _super.call(this, id, field, options, true) || this;
        return _this;
    }
    LabelSelectField.prototype.getDomValue = function () {
        return $('#' + this.id).val() || [];
    };
    LabelSelectField.prototype.convertToSelect2 = function (label) {
        return {
            id: label.label,
            text: label.label,
            data: label
        };
    };
    LabelSelectField.prototype.getData = function (searchTerm) {
        var _this = this;
        //Damit JIRA!! ... in old JIRA releases the autocomplete URL is wrong :/
        var url = '/rest/api/1.0/labels/suggest?maxResults=50&query=';
        if (this.id !== 'labels') {
            url = '/rest/api/1.0/labels/suggest?maxResults=50&customFieldId=' + this.fieldMeta.schema.customId + '&query=';
        }
        this.lastSearchTerm = searchTerm;
        return jiraGet(url + searchTerm)
            .then(function (data) {
            var labels = JSON.parse(data);
            var labelArray = [];
            if (labels.token === _this.lastSearchTerm && labels.suggestions) {
                labels.suggestions.forEach(function (label) {
                    labelArray.push(_this.convertToSelect2(label));
                });
            }
            return labelArray;
        });
    };
    LabelSelectField.prototype.getEmptyData = function () {
        if (!this.emptyData)
            this.emptyData = this.getData('');
        return this.emptyData;
    };
    return LabelSelectField;
}(Select2AjaxField));
LabelSelectField = __decorate([
    getter(GetterType.Array),
    setter(SetterType.Tag)
], LabelSelectField);
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
var MultiLineTextField = (function (_super) {
    __extends(MultiLineTextField, _super);
    function MultiLineTextField(id, field, config) {
        if (config === void 0) { config = { isMainField: false, hasMentions: false }; }
        var _this = _super.call(this, id, field) || this;
        _this.searchJiraUser = function (mode, query, callback) {
            if (_this.currentIssue || _this.currentProject) {
                var queryKey = (_this.currentIssue) ? 'issueKey=' + _this.currentIssue.key : 'projectKey=' + _this.currentProject.key;
                jiraGet('/rest/api/2/user/viewissue/search?' + queryKey + '&maxResults=10&username=' + query)
                    .then(function (usersString) {
                    var data = [];
                    var users = JSON.parse(usersString);
                    users.forEach(function (user) {
                        data.push({ id: user.name, name: user.displayName, type: 'user' });
                    });
                    callback(data);
                });
            }
            else {
                //Show alert
                $('.mentions-input-box + .mentions-help-text').slideDown();
                if (_this.timeoutSearchUser) {
                    clearTimeout(_this.timeoutSearchUser);
                }
                _this.timeoutSearchUser = setTimeout(function () { $('.mentions-input-box + .mentions-help-text').slideUp(); }, 2000);
                callback([]);
            }
        };
        _this.emailController = jira.emailController;
        _this.isMainField = ((_this.emailController && _this.emailController.fieldMapping.body == id)); //|| id === FieldController.descriptionFieldId
        _this.hasMentions = config.hasMentions;
        _this.height = (_this.isMainField) ? '200px' : '100px';
        if (_this.hasMentions) {
            FieldController.registerEvent(EventType.FieldChange, _this, FieldController.projectFieldId);
            FieldController.registerEvent(EventType.FieldChange, _this, FieldController.issueFieldId);
        }
        FieldController.registerEvent(EventType.UiAction, _this);
        return _this;
    }
    MultiLineTextField.prototype.removeAttachmentFromBody = function (handle) {
        var regEx = new RegExp('(\\[\\^|!)' + handle.fileName + '(\\]|!)', 'g');
        var oldDescr = $('#' + this.id).val();
        var newDescr = oldDescr.replace(regEx, '').trim();
        this.setValue(newDescr);
    };
    MultiLineTextField.prototype.hasReference = function (handle) {
        var content = $('#' + this.id).val();
        if (content) {
            return content.indexOf(handle.fileName) >= 0;
        }
        return false;
    };
    MultiLineTextField.prototype.showOptionToolbar = function (useMarkup, showUndo) {
        this.ownContainer.find('#DescriptionOptionToolbar').removeClass('hidden');
        this.ownContainer.find('#DescriptionUseJiraMarkup').prop('checked', useMarkup);
        if (showUndo)
            this.ownContainer.find('#DescriptionUndoAction').removeClass('hidden');
    };
    MultiLineTextField.prototype.handleEvent = function (type, newValue, source) {
        var _this = this;
        if (type === EventType.UiAction && this.isMainField) {
            var eventData_1 = newValue;
            if (eventData_1.name === AttachmentField.uiActionRename) {
                //Replace references of this attachment with new name (if necessary)
                var oldText = $('#' + this.id).val();
                if (oldText) {
                    var regEx = new RegExp(eventData_1.value.oldName, 'g');
                    var newText = oldText.replace(regEx, eventData_1.value.newName);
                    this.setValue(newText);
                }
            }
            else if (eventData_1.name === AttachmentField.uiActionSelect) {
                //We currently only care about attachments that have been deselected
                if (!eventData_1.value.selected) {
                    var autoRemove = yasoon.setting.getAppParameter('dialog.autoRemoveAttachmentReference');
                    if (autoRemove && autoRemove === 'true' && !eventData_1.value.selected) {
                        this.removeAttachmentFromBody(eventData_1.value);
                    }
                    else if (!autoRemove && this.hasReference(eventData_1.value)) {
                        Confirmation.show({
                            message: yasoon.i18n('dialog.attachmentReferenceStillActive'),
                            checkbox: yasoon.i18n('dialog.rememberDecision'),
                            primary: yasoon.i18n('dialog.yes'),
                            secondary: yasoon.i18n('dialog.no')
                        })
                            .then(function (result) {
                            if (result.ok) {
                                _this.removeAttachmentFromBody(eventData_1.value);
                            }
                            if (result.checkbox) {
                                yasoon.setting.setAppParameter('dialog.autoRemoveAttachmentReference', result.ok.toString());
                            }
                        });
                    }
                }
            }
            else if (eventData_1.name === AttachmentField.uiActionAddRef) {
                var markup = '';
                if (eventData_1.value.hasFilePreview()) {
                    markup = '!' + eventData_1.value.fileName + '!\n';
                }
                else {
                    markup = '[^' + eventData_1.value.fileName + ']\n';
                }
                insertAtCursor($('#' + this.id)[0], markup);
            }
        }
        else if (type === EventType.FieldChange) {
            if (source === FieldController.projectFieldId) {
                this.currentProject = newValue;
            }
            else if (source === FieldController.issueFieldId) {
                this.currentIssue = newValue;
            }
        }
        return null;
    };
    MultiLineTextField.prototype.addMainFieldHtml = function (container) {
        var html = " <div style=\"margin-top:5px; position:relative;\">\n                            <span id=\"DescriptionOptionToolbar\" style=\"padding: 3px;\">\n                                <span title=\"" + yasoon.i18n('dialog.titleToggleJiraMarkup') + "\">\n                                    <input id=\"DescriptionUseJiraMarkup\" class=\"toggle-checkbox\" type=\"checkbox\" checked=\"checked\"/>\n                                    " + yasoon.i18n('dialog.toggleJiraMarkup') + "\n                                </span>\n                                <a style=\"cursor:pointer;\" class=\"hidden\" id=\"DescriptionUndoAction\">\n                                    <i class=\"fa fa-undo\"></i>\n                                    " + yasoon.i18n('dialog.undo') + "\n                                </a>\n                            </span>\n                            <span class=\"dropup pull-right\">\n                                <a style=\"cursor:pointer;\" data-toggle=\"dropdown\" class=\"dropdown-toggle\" title=\"" + yasoon.i18n('dialog.titleReplaceWith') + "\" >\n                                    " + yasoon.i18n('dialog.replaceWith') + "\n                                    <span class=\"caret\"></span>\n                                </a>\n                                <ul class=\"dropdown-menu\">\n                                    <li>\n                                        <span style=\"display: block;padding: 4px 10px;\">\n                                            " + yasoon.i18n('dialog.toggleJiraMarkup') + "\n                                            <input class=\"toggleJiraMarkup toggle-checkbox\" type=\"checkbox\" checked=\"checked\" />\n                                        </span>\n                                    </li>\n                                    <li role=\"separator\" class=\"divider\"></li>\n                                    " + ((jira.selectedText) ? '<li id="DescriptionSelectedText"><a href="#">' + yasoon.i18n('dialog.addSelectedText') + '</a></li>' : '') + "\n                                    " + ((jira.mail) ? '<li id="DescriptionFullMail"><a href="#">' + yasoon.i18n('dialog.addConversation') + '</a></li>' : '') + "\n                \t            </ul>\n                            </span>\n                            <span class=\"dropup pull-right\" style=\"margin-right: 20px;\">\n                                <a style=\"cursor:pointer;\" data-toggle=\"dropdown\" class=\"dropdown-toggle\" title=\"" + yasoon.i18n('dialog.titleReplaceWith') + "\" >\n                                    " + yasoon.i18n('dialog.add') + "\n                                    <span class=\"caret\"></span>\n                                </a>\n                                <ul class=\"dropdown-menu\">\n                                    <li>\n                                        <span style=\"display: block;padding: 4px 10px;\">\n                                            " + yasoon.i18n('dialog.toggleJiraMarkup') + "\n                                            <input class=\"toggleJiraMarkup toggle-checkbox\" type=\"checkbox\" checked=\"checked\" />\n                                        </span>\n                                    </li>\n                                    <li role=\"separator\" class=\"divider\"></li>\n                                    " + ((jira.mail) ? '<li id="DescriptionMailInformation"><a href="#">' + yasoon.i18n('dialog.addMailInformation') + '</a></li>' : '') + "\n                                </ul>\n                            </span>\n                        </div>";
        container.append(html);
    };
    MultiLineTextField.prototype.getDomValue = function () {
        var val = '';
        if (this.hasMentions && this.mentionText) {
            //Parse @mentions
            val = this.mentionText.replace(/@.*?\]\(user:([^\)]+)\)/g, '[~$1]');
        }
        else {
            val = $('#' + this.id).val();
        }
        return val;
    };
    MultiLineTextField.prototype.hookEventHandler = function () {
        var _this = this;
        //Standard Change handler
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
        if (this.isMainField) {
            //Private vars for event Handler
            var useMarkup_1 = true;
            var backup_1 = '';
            var lastAction_1 = this.emailController.type;
            //Static toggle JIRA markup in drop down menus
            this.ownContainer.find('.toggleJiraMarkup').on('click', function (e) {
                useMarkup_1 = e.target['checked'];
                //Make sure all other toggles (even in other fields) have the same state
                $('.toggleJiraMarkup').prop('checked', useMarkup_1);
                e.stopPropagation();
            });
            //Temporary toggle markup button below text field until user changes some content
            this.ownContainer.find('#DescriptionUseJiraMarkup').on("change", function (e) {
                useMarkup_1 = e.target['checked'];
                var newContent;
                //Make sure all other toggles (even in other fields) have the same state
                $('.toggleJiraMarkup').prop('checked', useMarkup_1);
                if (lastAction_1 == 'selectedText') {
                    if (useMarkup_1)
                        newContent = _this.emailController.selectionAsMarkup;
                    else
                        newContent = _this.emailController.selectionPlain;
                }
                else if (lastAction_1 == 'wholeMail') {
                    if (useMarkup_1) {
                        newContent = _this.emailController.bodyAsMarkup;
                    }
                    else {
                        newContent = _this.emailController.bodyPlain;
                    }
                }
                else if (lastAction_1 == 'mailHeader') {
                    newContent = _this.emailController.getMailHeaderText(useMarkup_1) + backup_1;
                }
                _this.setValue(newContent);
                e.preventDefault();
            });
            $('#' + this.id).on("keyup paste", function (e) {
                _this.ownContainer.find('#DescriptionOptionToolbar').addClass('hidden');
            });
            this.ownContainer.find('#DescriptionUndoAction').on('click', function (e) {
                _this.setValue(backup_1);
                _this.ownContainer.find('#DescriptionOptionToolbar').addClass('hidden');
            });
            this.ownContainer.find('#DescriptionSelectedText').on('click', function (e) {
                backup_1 = $('#' + _this.id).val();
                lastAction_1 = 'selectedText';
                var content = (useMarkup_1) ? _this.emailController.selectionAsMarkup : _this.emailController.selectionPlain;
                $('#' + _this.id).val(content);
            });
            this.ownContainer.find('#DescriptionFullMail').on('click', function (e) {
                backup_1 = $('#' + _this.id).val();
                lastAction_1 = 'wholeMail';
                _this.showOptionToolbar(useMarkup_1, true);
                var content = (useMarkup_1) ? _this.emailController.bodyAsMarkup : _this.emailController.bodyPlain;
                $('#' + _this.id).val(content);
            });
            this.ownContainer.find('#DescriptionMailInformation').on('click', function (e) {
                var field = $('#' + _this.id);
                lastAction_1 = 'mailHeader';
                backup_1 = field.val();
                _this.showOptionToolbar(useMarkup_1, true);
                field.val(_this.emailController.getMailHeaderText(useMarkup_1) + backup_1);
            });
        }
        if (this.hasMentions) {
            //Init Mentions
            $('#' + this.id)['mentionsInput']({
                onDataRequest: this.searchJiraUser,
                triggerChar: '@',
                minChars: 2,
                showAvatars: false,
                elastic: false
            });
            $('#' + this.id).on('scroll', function () {
                $(this).prev().scrollTop($(this).scrollTop());
            });
            $('#' + this.id).on('updated', debounce(function () {
                $('#' + _this.id)['mentionsInput']('val', function (content) {
                    _this.mentionText = content;
                });
            }, 250));
        }
    };
    MultiLineTextField.prototype.render = function (container) {
        container.append("<textarea class=\"form-control text\" id=\"" + this.id + "\" name=\"" + this.id + "\" style=\"height:" + this.height + ";overflow: initial;\"></textarea>\n            <div class=\"mentions-help-text bg-warning\"><span>" + yasoon.i18n('dialog.mentionsAlert') + "</span></div>");
        if (this.isMainField) {
            this.addMainFieldHtml(container);
        }
    };
    return MultiLineTextField;
}(Field));
MultiLineTextField = __decorate([
    getter(GetterType.Text),
    setter(SetterType.Text)
], MultiLineTextField);
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var MultiSelectField = (function (_super) {
    __extends(MultiSelectField, _super);
    function MultiSelectField(id, field, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, id, field, options, true) || this;
        _this.options.data = field.allowedValues.map(_this.convertToSelect2);
        return _this;
    }
    MultiSelectField.prototype.convertToSelect2 = function (obj) {
        var result = {
            id: obj.id,
            text: obj.name || obj.value,
            data: obj
        };
        if (obj.iconUrl) {
            result.icon = jira.icons.mapIconUrl(obj.iconUrl);
        }
        return result;
    };
    return MultiSelectField;
}(Select2Field));
MultiSelectField = __decorate([
    getter(GetterType.Option, "id"),
    setter(SetterType.Option)
], MultiSelectField);
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
var NumberField = (function (_super) {
    __extends(NumberField, _super);
    function NumberField() {
        return _super.apply(this, arguments) || this;
    }
    NumberField.prototype.getDomValue = function () {
        var domValue = $('#' + this.id).val();
        if (domValue !== '') {
            return parseFloat(domValue);
        }
        else {
            return null;
        }
    };
    NumberField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    NumberField.prototype.render = function (container) {
        container.append($("<input class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" type=\"number\" />"));
    };
    ;
    return NumberField;
}(Field));
NumberField = __decorate([
    getter(GetterType.Text),
    setter(SetterType.Text)
], NumberField);
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var ProjectField = ProjectField_1 = (function (_super) {
    __extends(ProjectField, _super);
    function ProjectField(id, field, cache) {
        var _this;
        var options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectProject');
        options.allowClear = (FieldController.projectFieldId !== id);
        _this = _super.call(this, id, field, options) || this;
        _this.isMainProjectField = (id === FieldController.projectFieldId);
        //Load Recent Projects from DB
        var projectsString = yasoon.setting.getAppParameter(ProjectField_1.settingRecentProjects);
        if (projectsString) {
            _this.recentProjects = JSON.parse(projectsString);
        }
        if (cache) {
            _this.projectCache = cache;
        }
        //Start Getting Data
        _this.showSpinner();
        _this.getData()
            .then(function (data) {
            _this.hideSpinner();
            _this.setData(data);
            if (_this.isMainProjectField) {
                _this.setDefaultProject();
                $('#' + _this.id).next().find('.select2-selection').first().focus();
            }
        });
        return _this;
    }
    ProjectField.prototype.triggerValueChange = function () {
        var project = this.getObjectValue();
        if (!this.lastValue || this.lastValue.id !== project.id) {
            FieldController.raiseEvent(EventType.FieldChange, project, this.id);
            this.lastValue = project;
        }
    };
    ProjectField.prototype.handleEvent = function (type, newValue, source) {
        if (type === EventType.AfterSave) {
            //SAVE TO RECENT PROJECTS
            var project_1 = this.getObjectValue();
            //First make sure to remove the currently selected project
            this.recentProjects = this.recentProjects.filter(function (proj) { return proj.id != project_1.id; });
            //We only want to have 5 entries --> delete the last one if nessecary
            if (this.recentProjects.length > 4) {
                this.recentProjects = this.recentProjects.slice(0, 4);
            }
            //Add current project
            this.recentProjects.unshift(project_1);
            yasoon.setting.setAppParameter(ProjectField_1.settingRecentProjects, JSON.stringify(this.recentProjects));
        }
        return null;
    };
    ProjectField.prototype.setDefaultProject = function () {
        //If mail is provided && subject contains reference to project, pre-select that
        if (jira.emailController && jira.emailController.mail && jira.emailController.mail.subject && this.projectCache && this.projectCache.length > 0) {
            //Sort projects by key length descending, so we will match the following correctly:
            // Subject: This is for DEMODD project
            // Keys: DEMO, DEMOD, DEMODD
            var projectsByKeyLength = this.projectCache.sort(function (a, b) {
                return b.key.length - a.key.length; // ASC -> a - b; DESC -> b - a
            });
            for (var i = 0; i < projectsByKeyLength.length; i++) {
                var curProj = projectsByKeyLength[i];
                if (jira.emailController.mail.subject.indexOf(curProj.key) >= 0) {
                    this.setValue(curProj);
                    break;
                }
            }
        }
    };
    ProjectField.prototype.convertToSelect2 = function (project) {
        return {
            id: project.id,
            text: project.name,
            icon: getProjectIcon(project),
            data: project
        };
    };
    ProjectField.prototype.getReturnStructure = function (projects, queryTerm) {
        var result = [];
        //1. User Templates
        if (jira.emailController && jira.emailController.senderTemplates) {
            //1.1 Filter
            var currentTemplates = jira.emailController.senderTemplates.filter(function (templ) {
                if (templ.senderEmail === jira.mail.senderEmail) {
                    //Double Check if Project still exists
                    var templProj = projects.filter(function (p) { return p.id === templ.id; })[0];
                    if (templProj) {
                        templ.name = templProj.data.name;
                        templ.projectTypeKey = templProj.data.projectTypeKey;
                        return true;
                    }
                }
                return false;
            });
            //1.2 Map and Add
            if (currentTemplates && currentTemplates.length > 0) {
                var children = currentTemplates.map(this.convertToSelect2);
                result.push({
                    id: 'templates',
                    text: yasoon.i18n('dialog.templateFor', { name: jira.mail.senderName }),
                    children: children
                });
            }
        }
        //2. Recent Projects
        if (this.recentProjects) {
            //2.1 Filter
            var currentRecent = this.recentProjects.filter(function (recent) {
                return projects.filter(function (p) { return p.id === recent.id; }).length > 0;
            });
            //2.2 Map and Add
            var children = currentRecent.map(this.convertToSelect2);
            result.push({
                id: 'recent',
                text: yasoon.i18n('dialog.recentProjects'),
                children: children
            });
        }
        //3. All Projects
        var sortedProjects = projects.sort(function (a, b) { return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1); });
        result.push({
            id: 'all',
            text: yasoon.i18n('dialog.allProjects'),
            children: sortedProjects
        });
        return result;
    };
    ProjectField.prototype.queryData = function () {
        var _this = this;
        if (this.projectCache && this.projectCache.length > 0) {
            return Promise.resolve(this.projectCache.map(this.convertToSelect2));
        }
        return jiraGet('/rest/api/2/project')
            .then(function (data) {
            var projects = JSON.parse(data);
            _this.projectCache = projects;
            console.log('Return API projects', projects);
            return projects.map(_this.convertToSelect2);
        });
    };
    ProjectField.prototype.getData = function () {
        var _this = this;
        if (this.returnStructure) {
            return Promise.resolve(this.returnStructure);
        }
        return this.queryData()
            .then(function (projects) {
            _this.returnStructure = _this.getReturnStructure(projects);
            return _this.returnStructure;
        });
    };
    return ProjectField;
}(Select2Field));
ProjectField.defaultMeta = { key: FieldController.projectFieldId, get name() { return yasoon.i18n('dialog.project'); }, required: true, schema: { system: 'project', type: '' } };
ProjectField.settingRecentProjects = 'recentProjects';
ProjectField = ProjectField_1 = __decorate([
    getter(GetterType.Option, "id"),
    setter(SetterType.Option)
], ProjectField);
var ProjectField_1;
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/common.d.ts" />
var GetObject = (function () {
    function GetObject(keyName) {
        this.keyName = keyName;
    }
    GetObject.prototype.getValue = function (field, onlyChangedData) {
        var newValue = field.getDomValue();
        var result = {};
        if (onlyChangedData) {
            //In edit case: Only send if changed	
            //Normalize
            var value = null;
            if (field.initialValue) {
                value = field.initialValue[this.keyName];
            }
            if (!isEqual(value, newValue)) {
                result[this.keyName] = newValue || "-1";
                return result;
            }
        }
        else {
            //In creation case: Only send if not null	
            if (newValue) {
                result[this.keyName] = newValue;
                return result;
            }
        }
    };
    return GetObject;
}());
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetObject.ts" />
/// <reference path="../setter/SetCheckedValues.ts" />
var RadioField = (function (_super) {
    __extends(RadioField, _super);
    function RadioField() {
        return _super.apply(this, arguments) || this;
    }
    RadioField.prototype.getDomValue = function () {
        return $(this.ownContainer).find('input:checked').first().val();
    };
    ;
    RadioField.prototype.hookEventHandler = function () {
        var _this = this;
        $("#" + this.id + "-field-group").find('input').change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    RadioField.prototype.render = function (container) {
        var _this = this;
        var innerContainer = $('<div class="awesome-wrapper"></div>').appendTo(container);
        if (!this.fieldMeta.required) {
            //If it isn't required we should allow a None option
            innerContainer.append($("<div class=\"radio awesome\">\n                                    <input type=\"radio\" id=\"" + this.id + "_none\" name=\"" + this.id + "\" value=\"\" checked>\n                                    <label for=\"" + this.id + "_none\">" + yasoon.i18n('dialog.selectNone') + "</label>\n                                </div>"));
        }
        this.fieldMeta.allowedValues.forEach(function (option) {
            innerContainer.append($("<div class=\"radio awesome\">\n                                    <input type=\"radio\" id=\"" + _this.id + "_" + option.id + "\" name=\"" + _this.id + "\" value=\"" + option.id + "\">\n                                    <label for=\"" + _this.id + "_" + option.id + "\">" + option.value + "</label>\n                                </div>"));
        });
    };
    ;
    return RadioField;
}(Field));
RadioField = __decorate([
    getter(GetterType.Object, "id"),
    setter(SetterType.CheckedValues)
], RadioField);
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var RequestTypeField = (function (_super) {
    __extends(RequestTypeField, _super);
    function RequestTypeField(id, field) {
        var _this;
        var options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderRequestType');
        options.allowClear = false;
        _this = _super.call(this, id, field, options) || this;
        _this.serviceDeskKeys = {};
        _this.requestTypes = {};
        _this.isServiceDeskActive = false;
        FieldController.registerEvent(EventType.FieldChange, _this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.AfterSave, _this);
        FieldController.registerEvent(EventType.UiAction, _this);
        return _this;
    }
    RequestTypeField.prototype.triggerValueChange = function () {
        var requestType = this.getObjectValue();
        FieldController.raiseEvent(EventType.FieldChange, requestType, this.id);
    };
    RequestTypeField.prototype.handleEvent = function (type, newValue, source) {
        if (type === EventType.FieldChange) {
            if (source === FieldController.projectFieldId) {
                this.setProject(newValue);
            }
        }
        else if (type === EventType.UiAction) {
            var eventData = newValue;
            if (eventData.name === IssueTypeField.uiActionServiceDesk) {
                this.isServiceDeskActive = eventData.value;
            }
        }
        else if (type === EventType.AfterSave) {
            //Service Request? Assignment Type have an own call
            if (this.isServiceDeskActive) {
                var requestTypeId = this.getValue(false);
                var lifecycleData = newValue;
                return jiraAjax('/rest/servicedesk/1/servicedesk/request/' + lifecycleData.newData.id + '/request-types', yasoon.ajaxMethod.Post, JSON.stringify({ rtId: requestTypeId }));
            }
        }
        return null;
    };
    RequestTypeField.prototype.convertToSelect2 = function (requestType) {
        return {
            id: requestType.id.toString(),
            text: requestType.name,
            icon: jira.icons.mapIconUrl(jira.settings.baseUrl + '/servicedesk/customershim/secure/viewavatar?avatarType=SD_REQTYPE&avatarId=' + requestType.icon),
            data: requestType
        };
    };
    RequestTypeField.prototype.getReturnStructure = function (requestTypes) {
        var _this = this;
        //First we need to gather all groups
        var result = [];
        requestTypes.forEach(function (rt) {
            if (!rt.groups)
                return;
            rt.groups.forEach(function (group) {
                //First check if group does already exist in result structure
                var parent = result.filter(function (elem) { return elem.id == group.id.toString(); })[0];
                if (!parent) {
                    parent = {
                        id: group.id.toString(),
                        text: group.name,
                        children: []
                    };
                    result.push(parent);
                }
                //Now add requestType to this group
                parent.children.push(_this.convertToSelect2(rt));
            });
        });
        result.sort(sortByText);
        return result;
    };
    RequestTypeField.prototype.setProject = function (project) {
        var _this = this;
        this.currentProject = project;
        this.getServiceDeskKey()
            .then(function (serviceDeskKey) {
            return _this.getRequestTypes(serviceDeskKey);
        })
            .then(function (requestTypes) {
            _this.setData(_this.getReturnStructure(requestTypes));
        });
    };
    RequestTypeField.prototype.getServiceDeskKey = function () {
        var _this = this;
        var currentProject = this.currentProject;
        //Return buffer
        if (this.serviceDeskKeys[currentProject.id]) {
            return Promise.resolve(this.serviceDeskKeys[currentProject.id]);
        }
        return jiraGet('/rest/servicedesk/1/servicedesk-data')
            .then(function (data) {
            var serviceData = JSON.parse(data);
            if (serviceData.length > 0) {
                var serviceDeskKey = serviceData.filter(function (s) { return s.projectId == currentProject.id; })[0].key;
                _this.serviceDeskKeys[currentProject.id] = serviceDeskKey;
                return serviceDeskKey;
            }
        })
            .catch(function (e) {
            console.log(e);
            yasoon.util.log(e.toString(), yasoon.util.severity.warning);
            this.serviceDeskKeys[currentProject.id] = this.currentProject.key.toLowerCase();
            return this.currentProject.key.toLowerCase();
        });
    };
    RequestTypeField.prototype.getRequestTypes = function (serviceDeskKey) {
        var _this = this;
        if (this.requestTypes[serviceDeskKey]) {
            return Promise.resolve(this.requestTypes[serviceDeskKey]);
        }
        //New cloud versioning
        if (jira.systemInfo.versionNumbers[0] >= 1000) {
            return jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/groups')
                .then(function (data) {
                var groups = JSON.parse(data);
                var promises = [];
                groups.forEach(function (group) {
                    promises.push(jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/groups/' + group.id + '/request-types'));
                });
                //Load in parallel
                return Promise.all(promises);
            })
                .map(function (typeString) { return JSON.parse(typeString); })
                .then(function (types) {
                var allTypes = [];
                types.forEach(function (typesInner) {
                    typesInner.forEach(function (type) {
                        //Do not add twice
                        if (allTypes.filter(function (t) { return t.id === type.id; }).length === 0) {
                            allTypes.push(type);
                        }
                    });
                });
                _this.requestTypes[serviceDeskKey] = allTypes;
                return allTypes;
            });
        }
        else {
            return jiraGet('/rest/servicedesk/1/servicedesk/' + serviceDeskKey + '/request-types')
                .then(function (data) {
                var allTypes = JSON.parse(data);
                _this.requestTypes[serviceDeskKey] = allTypes;
                return allTypes;
            });
        }
    };
    return RequestTypeField;
}(Select2Field));
RequestTypeField.defaultMeta = { key: FieldController.requestTypeFieldId, get name() { return yasoon.i18n('dialog.requestType'); }, required: true, schema: { system: 'requesttype', type: '' } };
RequestTypeField = __decorate([
    getter(GetterType.Option, "id"),
    setter(SetterType.Option)
], RequestTypeField);
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var SingleSelectField = (function (_super) {
    __extends(SingleSelectField, _super);
    function SingleSelectField(id, field, options, style) {
        if (options === void 0) { options = {}; }
        if (style === void 0) { style = "min-width: 350px; width: 80%;"; }
        var _this = _super.call(this, id, field, options, false, style) || this;
        //Default value or None?
        var placeholder = (field.hasDefaultValue && !jira.isEditMode) ? yasoon.i18n('dialog.selectDefault') : yasoon.i18n('dialog.selectNone');
        _this.options.data = field.allowedValues.map(_this.convertToSelect2);
        _this.options.placeholder = placeholder;
        return _this;
    }
    SingleSelectField.prototype.convertToSelect2 = function (obj) {
        var result = {
            id: obj.id,
            text: obj.name || obj.value,
            data: obj
        };
        if (obj.iconUrl) {
            result.icon = jira.icons.mapIconUrl(obj.iconUrl);
        }
        return result;
    };
    return SingleSelectField;
}(Select2Field));
SingleSelectField = __decorate([
    getter(GetterType.Option, "id"),
    setter(SetterType.Option)
], SingleSelectField);
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
var SingleTextField = (function (_super) {
    __extends(SingleTextField, _super);
    function SingleTextField() {
        return _super.apply(this, arguments) || this;
    }
    SingleTextField.prototype.getDomValue = function () {
        return $('#' + this.id).val();
    };
    SingleTextField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    SingleTextField.prototype.render = function (container) {
        container.append($("<input class=\"text long-field\" id=\"" + this.id + "\" name=\"" + this.id + "\" type=\"text\" />"));
    };
    ;
    return SingleTextField;
}(Field));
SingleTextField = __decorate([
    getter(GetterType.Text),
    setter(SetterType.Text)
], SingleTextField);
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var SprintSelectField = (function (_super) {
    __extends(SprintSelectField, _super);
    function SprintSelectField(id, field) {
        var _this = _super.call(this, id, field, {}) || this;
        FieldController.registerEvent(EventType.BeforeSave, _this);
        _this.getData()
            .then(function (data) {
            _this.setData(data);
        });
        return _this;
    }
    SprintSelectField.prototype.handleEvent = function (type, newValue, source) {
        if (type === EventType.BeforeSave && jira.isEditMode) {
            var eventData = newValue;
            var oldSprintId = '';
            if (this.initialValue)
                oldSprintId = this.parseSprintId(this.initialValue);
            var newSprintId = this.getValue(false);
            if (oldSprintId != newSprintId) {
                if (newSprintId) {
                    return jiraAjax('/rest/greenhopper/1.0/sprint/rank', yasoon.ajaxMethod.Put, '{"idOrKeys":["' + jira.currentIssue.key + '"],"sprintId":' + newSprintId + ',"addToBacklog":false}');
                }
                else {
                    return jiraAjax('/rest/greenhopper/1.0/sprint/rank', yasoon.ajaxMethod.Put, '{"idOrKeys":["' + jira.currentIssue.key + '"],"sprintId":"","addToBacklog":true}');
                }
            }
        }
        return null;
    };
    SprintSelectField.prototype.getValue = function (changedDataOnly) {
        //Only for creation as Epic links cannot be changed via REST APi --> Status code 500
        //Ticket: https://jira.atlassian.com/browse/GHS-10333
        //There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
        //We aren't sure with which version this change happened. 7.0.0 definitely requires a string, 7.1.6. requires an int :)
        if (!changedDataOnly) {
            var stringValue = this.getDomValue();
            if (stringValue) {
                if (jiraIsVersionHigher(jira.systemInfo, '7.1')) {
                    return parseInt(stringValue);
                }
                else {
                    return stringValue;
                }
            }
        }
    };
    SprintSelectField.prototype.setValue = function (value) {
        if (value && value.length > 0) {
            var sprintId = this.parseSprintId(value[0]);
            this.setter.setValue(this, sprintId);
        }
    };
    SprintSelectField.prototype.convertToSelect2 = function (sprint) {
        return {
            id: sprint.id.toString(),
            text: sprint.name,
            data: sprint
        };
    };
    SprintSelectField.prototype.getData = function () {
        var _this = this;
        return jiraGet('/rest/greenhopper/1.0/sprint/picker')
            .then(function (data) {
            //{"suggestions":[{"name":"Sample Sprint 2","id":1,"stateKey":"ACTIVE"}],"allMatches":[]}
            var sprints = JSON.parse(data);
            var result = [];
            if (sprints && sprints.suggestions.length > 0) {
                var suggestions = sprints.suggestions.map(_this.convertToSelect2);
                result.push({
                    id: 'suggestions',
                    text: yasoon.i18n('dialog.sprintSuggestion'),
                    children: suggestions
                });
            }
            if (sprints && sprints.allMatches && sprints.allMatches.length > 0) {
                var matches = sprints.allMatches.map(_this.convertToSelect2);
                result.push({
                    id: 'allMatches',
                    text: yasoon.i18n('dialog.sprintAll'),
                    children: matches
                });
            }
            return result;
        });
    };
    SprintSelectField.prototype.parseSprintId = function (input) {
        //Wierd --> it's an array of strings with following structure:  "com.atlassian.greenhopper.service.sprint.Sprint@7292f4[rapidViewId=<null>,state=ACTIVE,name=Sample Sprint 2,startDate=2015-04-09T01:54:26.773+02:00,endDate=2015-04-23T02:14:26.773+02:00,completeDate=<null>,sequence=1,id=1]"
        //First get content of array (everything between [])
        //Then split at ,
        //Then find id
        var result = '';
        var matches = /\[(.+)\]/g.exec(input);
        if (matches.length > 0) {
            var splitResult = matches[1].split(',');
            var idObj = splitResult.filter(function (elem) { return elem.indexOf('id') === 0; });
            if (idObj.length > 0) {
                result = idObj[0].split('=')[1];
            }
        }
        return result;
    };
    return SprintSelectField;
}(Select2Field));
SprintSelectField = __decorate([
    setter(SetterType.Option)
], SprintSelectField);
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var TempoAccountField = (function (_super) {
    __extends(TempoAccountField, _super);
    function TempoAccountField(id, field, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, id, field, options) || this;
        _this.getData()
            .then(function (elements) {
            _this.setData(elements);
        });
        return _this;
    }
    TempoAccountField.prototype.getDomValue = function () {
        var result = $('#' + this.id).val();
        if (result)
            return parseInt(result);
        return null;
    };
    TempoAccountField.prototype.convertToSelect2 = function (obj) {
        return {
            id: obj.id,
            text: obj.name,
            data: obj
        };
    };
    TempoAccountField.prototype.getData = function () {
        var _this = this;
        return Promise.all([
            jiraGet('/rest/tempo-accounts/1/account'),
            jiraGet('/rest/tempo-accounts/1/account/project/' + jira.selectedProject.id)
        ])
            .spread(function (accountDataString, projectAccountsString) {
            var accountData = JSON.parse(accountDataString);
            var projectAccounts = JSON.parse(projectAccountsString);
            var result = [];
            if (projectAccounts && projectAccounts.length > 0) {
                var childs = projectAccounts.map(_this.convertToSelect2);
                result.push({
                    id: 'projectAccounts',
                    text: yasoon.i18n('dialog.projectAccounts'),
                    children: childs
                });
            }
            if (accountData && accountData.length > 0) {
                accountData = accountData.filter(function (acc) { return acc.global; });
                if (accountData.length > 0) {
                    var accChilds = accountData.map(_this.convertToSelect2);
                    result.push({
                        id: 'globalAccounts',
                        text: yasoon.i18n('dialog.globalAccounts'),
                        children: accChilds
                    });
                }
            }
            return result;
        });
    };
    return TempoAccountField;
}(Select2Field));
TempoAccountField = __decorate([
    getter(GetterType.Text),
    setter(SetterType.Option)
], TempoAccountField);
/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
var TimeTrackingField = (function (_super) {
    __extends(TimeTrackingField, _super);
    function TimeTrackingField(id, field) {
        var _this = _super.call(this, id, field) || this;
        var origFieldMeta = JSON.parse(JSON.stringify(field));
        var remainingFieldMeta = JSON.parse(JSON.stringify(field));
        origFieldMeta.name = yasoon.i18n('dialog.timetrackingOriginal');
        origFieldMeta.description = yasoon.i18n('dialog.timetrackingDescrOriginal');
        remainingFieldMeta.name = yasoon.i18n('dialog.timetrackingRemaining');
        remainingFieldMeta.description = yasoon.i18n('dialog.timetrackingDescrRemain');
        _this.origField = new SingleTextField(id + '_originalestimate', origFieldMeta);
        _this.remainingField = new SingleTextField(id + '_remainingestimate', remainingFieldMeta);
        return _this;
    }
    TimeTrackingField.prototype.getValue = function (onlyChangedData) {
        if (onlyChangedData === void 0) { onlyChangedData = false; }
        var origVal = this.origField.getDomValue();
        var remainVal = this.remainingField.getDomValue();
        //JIRA timetracking legacy mode
        // --> it's not allowed to set orig and remainaing Estimate during creation
        // --> it's not allowed to change original estimate.
        var result = {};
        //Edit Case
        if (onlyChangedData) {
            if ((!this.initialValue && origVal) || (this.initialValue && this.initialValue.originalEstimate != origVal)) {
                result.originalEstimate = origVal;
            }
            if ((!this.initialValue && remainVal) || (this.initialValue && this.initialValue.remainingEstimate != remainVal)) {
                result.remainingEstimate = remainVal;
            }
        }
        else {
            if (origVal) {
                result.originalEstimate = origVal;
            }
            if (remainVal) {
                result.remainingEstimate = remainVal;
            }
        }
        //Only return an object if it's not empty;
        return (Object.keys(result).length > 0) ? result : undefined;
    };
    TimeTrackingField.prototype.setValue = function (value) {
        if (value) {
            this.origField.setValue(value.originalEstimate);
            this.remainingField.setValue(value.remainingEstimate);
        }
    };
    TimeTrackingField.prototype.getDomValue = function () {
        return "";
    };
    TimeTrackingField.prototype.hookEventHandler = function () {
        var _this = this;
        $('#' + this.id).change(function (e) { return _this.triggerValueChange(); });
    };
    ;
    TimeTrackingField.prototype.renderField = function (container) {
        this.origField.renderField(container);
        this.remainingField.renderField(container);
    };
    TimeTrackingField.prototype.render = function (container) {
        //Not nessecary as we redefine renderField
    };
    ;
    return TimeTrackingField;
}(Field));
/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var UserSelectField = (function (_super) {
    __extends(UserSelectField, _super);
    function UserSelectField(id, field, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, id, field, options, options.multiple) || this;
        _this.ownUser = jira.ownUser;
        _this.avatarPath = yasoon.io.getLinkPath('Images/useravatar.png');
        FieldController.registerEvent(EventType.SenderLoaded, _this);
        FieldController.registerEvent(EventType.FieldChange, _this, FieldController.projectFieldId);
        return _this;
    }
    UserSelectField.prototype.handleEvent = function (type, newValue, source) {
        if (type == EventType.SenderLoaded) {
            if (newValue) {
                this.senderUser = newValue;
            }
        }
        else if (type === EventType.FieldChange && source === FieldController.projectFieldId) {
            this.currentProject = newValue;
        }
        return null;
    };
    UserSelectField.prototype.hookEventHandler = function () {
        var _this = this;
        _super.prototype.hookEventHandler.call(this);
        this.ownContainer.find('.assign-to-me-trigger').click(function (e) {
            if (_this.ownUser) {
                _this.setValue(_this.ownUser);
            }
            e.preventDefault();
        });
        this.ownContainer.find('.add-myself-trigger').click(function (e) {
            e.preventDefault();
            if (_this.ownUser) {
                var currentValues = _this.getObjectValue() || [];
                console.log('Current User', currentValues);
                if (currentValues.filter(function (user) { return user.name === _this.ownUser.name; }).length > 0) {
                    //Check if own user is already added
                    return;
                }
                currentValues.push(_this.ownUser);
                _this.setValue(currentValues);
            }
        });
    };
    UserSelectField.prototype.render = function (container) {
        //If assignee, preselect 
        if (this.id === "assignee" && !this.options.data) {
            this.options.data = [{
                    id: -1,
                    'icon': this.avatarPath,
                    'text': 'Automatic'
                }];
        }
        _super.prototype.render.call(this, container);
        if (this.options.multiple) {
            container.append("<span style=\"display:block; padding: 5px 0px;\">\n\t\t\t\t            <a href=\"#" + this.id + "\" class=\"add-myself-trigger\" title=\"" + yasoon.i18n('dialog.addMyselfTitle') + "\">" + yasoon.i18n('dialog.addMyself') + "</a>\n                        </span>");
        }
        else {
            container.append("<span style=\"display:block; padding: 5px 0px;\">\n\t\t\t\t            <a href=\"#" + this.id + "\" class=\"assign-to-me-trigger\" title=\"" + yasoon.i18n('dialog.assignMyselfTitle') + "\">" + yasoon.i18n('dialog.assignMyself') + "</a>\n                        </span>");
        }
        if (this.id === "assignee") {
            $('#' + this.id).val('-1').trigger('change');
        }
    };
    UserSelectField.prototype.convertToSelect2 = function (user) {
        var result = {
            id: user.name,
            text: user.displayName,
            data: user
        };
        if (this.senderUser && user.name == this.senderUser.name) {
            result.iconClass = 'fa fa-envelope';
        }
        if (user.name == this.ownUser.name) {
            result.iconClass = 'fa fa-user';
        }
        return result;
    };
    UserSelectField.prototype.getReturnStructure = function (users) {
        var result = [];
        if (users) {
            result.push({
                id: 'Search',
                text: yasoon.i18n('dialog.userSearchResult'),
                children: users
            });
        }
        else {
            //Build common suggestion
            var suggestions = [];
            if (this.id === 'assignee') {
                suggestions.push({
                    'id': '-1',
                    'icon': this.avatarPath,
                    'text': 'Automatic'
                });
            }
            suggestions.push(this.convertToSelect2(this.ownUser));
            if (this.senderUser) {
                suggestions.push(this.convertToSelect2(this.senderUser));
            }
            result.push({
                id: 'Suggested',
                text: yasoon.i18n('dialog.suggested'),
                children: suggestions
            });
        }
        return result;
    };
    UserSelectField.prototype.convertId = function (user) {
        if (!user.displayName) {
            return this.getData(user.name)
                .then(function (result) {
                return result[0].children[0].data;
            });
        }
        return Promise.resolve(user);
    };
    UserSelectField.prototype.getData = function (searchTerm) {
        var _this = this;
        var url = '/rest/api/2/user/picker?query=' + searchTerm + '&maxResults=50';
        if (this.id === 'assignee' && this.currentProject) {
            //Only get assignable users
            url = '/rest/api/2/user/assignable/search?project=' + this.currentProject.key + '&username=' + searchTerm + '&maxResults=50';
        }
        return jiraGet(url)
            .then(function (data) {
            var users = JSON.parse(data);
            //1. Build User Result Array
            var result = [];
            //Yay, Jira change of return structure....
            var userArray = [];
            if (users && users.users && users.users.length > 0) {
                userArray = users.users;
            }
            else if (users && users.length > 0) {
                userArray = users;
            }
            userArray.forEach(function (user) {
                result.push(_this.convertToSelect2(user));
            });
            return _this.getReturnStructure(result);
        });
    };
    UserSelectField.prototype.getEmptyData = function () {
        return Promise.resolve(this.getReturnStructure());
    };
    return UserSelectField;
}(Select2AjaxField));
UserSelectField.reporterDefaultMeta = { key: FieldController.onBehalfOfFieldId, get name() { return yasoon.i18n('dialog.behalfOf'); }, required: true, schema: { system: 'user', type: '' } };
UserSelectField = __decorate([
    getter(GetterType.Option, "name", null),
    setter(SetterType.Option)
], UserSelectField);
/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />
var VersionSelectField = (function (_super) {
    __extends(VersionSelectField, _super);
    function VersionSelectField(id, field, config) {
        var _this;
        var options = {
            data: []
        };
        _this = _super.call(this, id, field, options, config.multiSelect) || this;
        var releasedVersions = field.allowedValues
            .filter(function (option) { return option.released && !option.archived; })
            .map(_this.convertToSelect2);
        var unreleasedVersions = field.allowedValues
            .filter(function (option) { return !option.released && !option.archived; })
            .map(_this.convertToSelect2);
        var releasedOptGroup = {
            id: 'releasedVersions',
            text: yasoon.i18n('dialog.releasedVersions'),
            children: releasedVersions
        };
        var unreleasedOptGroup = {
            id: 'unreleasedVersions',
            text: yasoon.i18n('dialog.unreleasedVersions'),
            children: unreleasedVersions
        };
        if (config.releasedFirst) {
            _this.options.data.push(releasedOptGroup);
            _this.options.data.push(unreleasedOptGroup);
        }
        else {
            _this.options.data.push(unreleasedOptGroup);
            _this.options.data.push(releasedOptGroup);
        }
        return _this;
    }
    VersionSelectField.prototype.convertToSelect2 = function (version) {
        var result = {
            id: version.id,
            text: version.name || version.value,
            data: version
        };
        if (version.iconUrl) {
            result.icon = jira.icons.mapIconUrl(version.iconUrl);
        }
        return result;
    };
    return VersionSelectField;
}(Select2Field));
VersionSelectField = __decorate([
    getter(GetterType.Option, "id", null),
    setter(SetterType.Option)
], VersionSelectField);
var TemplateController = (function () {
    function TemplateController(ownUser) {
        var _this = this;
        this.groupHierachy = [];
        this.dependentFields = {};
        this.defaultTemplates = [];
        this.ownUser = ownUser;
        //Load Data
        var groupsString = yasoon.setting.getAppParameter(TemplateController.settingGroupHierarchy);
        if (!groupsString)
            groupsString = '[]';
        var initialDataString = yasoon.setting.getAppParameter(TemplateController.settingInitialSelection);
        if (!initialDataString)
            initialDataString = '[]';
        var defaultTemplatesString = yasoon.setting.getAppParameter(TemplateController.settingDefaultTemplates);
        if (!defaultTemplatesString)
            defaultTemplatesString = '[]';
        this.groupHierachy = JSON.parse(groupsString);
        var initialSelection = JSON.parse(initialDataString);
        this.defaultTemplates = JSON.parse(defaultTemplatesString);
        //Filter for current Data 
        //Only keep groups that are assigned to current user
        this.groupHierachy = this.groupHierachy.filter(function (group) {
            return _this.ownUser.groups.items.filter(function (userGroup) {
                return userGroup.name === group.name;
            }).length > 0;
        });
        //Only keep initial Selections necessary for current user
        //--> Sort by Group Hierarchy and pick the highest
        if (initialSelection.length > 0) {
            this.initialSelection = initialSelection.sort(function (a, b) {
                var groupA = _this.getGroup(a.group);
                var groupB = _this.getGroup(b.group);
                var posA = (groupA) ? groupA.position : 10000;
                var posB = (groupB) ? groupB.position : 10000;
                return posA - posB;
            })[0];
        }
        //Only keep defaultTemplates for groups of current user
        this.defaultTemplates = this.defaultTemplates.filter(function (defaultTemplate) {
            return defaultTemplate.group === '-1' || _this.getGroup(defaultTemplate.group) != null;
        });
        //Sort Asc by priority
        this.defaultTemplates = this.defaultTemplates.sort(function (a, b) { return a.priority - b.priority; });
    }
    TemplateController.prototype.handleEvent = function (type, newValue, source) {
        if (type === EventType.FieldChange) {
            var dependentFieldId = this.dependentFields[source];
            var dependentField = FieldController.getField(dependentFieldId);
            var currentValue = dependentField.getValue(false);
            if (!currentValue || !dependentField.initialValue || JSON.stringify(currentValue) == JSON.stringify(dependentField.initialValue)) {
                FieldController.setValue(dependentFieldId, newValue, true);
            }
        }
        return null;
    };
    TemplateController.prototype.setInitialValues = function () {
        if (this.initialSelection) {
            if (this.initialSelection.projectId)
                FieldController.setValue(FieldController.projectFieldId, this.initialSelection.projectId, true);
            if (this.initialSelection.issueTypeId != '-1') {
                FieldController.setValue(FieldController.issueTypeFieldId, this.initialSelection.issueTypeId, true);
            }
        }
    };
    TemplateController.prototype.setFieldValues = function (projectId, issueTypeId) {
        var _this = this;
        if (this.defaultTemplates) {
            //Default Templates are already filtered by current user groups and are sorted by priority --> defined on server
            //Here we blindly pick the first template that matches our criteria
            var result = this.getTemplate(projectId, issueTypeId);
            if (result && result.fields) {
                result.fields.forEach(function (field) {
                    //Check for variables
                    var value = null;
                    if (typeof field.fieldValue === 'string' && field.fieldValue.indexOf('<') === 0) {
                        //Fixed variables
                        value = _this.getFixedValue(field.fieldValue);
                    }
                    else if (typeof field.fieldValue === 'string' && field.fieldValue.indexOf('|') === 0) {
                        value = _this.getDynamicValue(field.fieldId, field.fieldValue);
                    }
                    else {
                        value = field.fieldValue;
                    }
                    if (value) {
                        FieldController.setValue(field.fieldId, value, true);
                    }
                });
            }
        }
    };
    TemplateController.prototype.getFixedValue = function (value) {
        if (value === '<TODAY>') {
            return moment(new Date()).format('YYYY-MM-DD');
        }
        else if (value.indexOf('<TODAY>') === 0) {
            try {
                //Replace all non numeric chars
                var numOfDays = parseInt(value.replace(/\D/g, ''));
                var currentDate = new Date();
                currentDate.setDate(currentDate.getDate() + numOfDays);
                return moment(currentDate).format('YYYY-MM-DD');
            }
            catch (e) {
            }
        }
        else if (value === '<USER>') {
            return this.ownUser;
        }
    };
    TemplateController.prototype.getDynamicValue = function (fieldId, value) {
        var parentFieldId = value.replace(/\|/g, '');
        var parentField = FieldController.getField(parentFieldId);
        if (parentField) {
            this.dependentFields[parentFieldId] = fieldId;
            FieldController.registerEvent(EventType.FieldChange, this, parentFieldId);
            return parentField.getValue(false);
        }
    };
    TemplateController.prototype.getTemplate = function (projectId, issueTypeId) {
        var result = null;
        this.defaultTemplates.some(function (template) {
            //Check if Project and issueType matches
            if ((template.projectId === '-1' || template.projectId === projectId) &&
                (template.issueTypeId === '-1' || template.issueTypeId === issueTypeId)) {
                result = template;
                return true;
            }
            return false;
        });
        return result;
    };
    TemplateController.prototype.getGroup = function (group) {
        if (group === '-1') {
            return {
                name: 'Default',
                position: 1000
            };
        }
        else {
            return this.groupHierachy.filter(function (userGroup) {
                return userGroup.name === group;
            })[0];
        }
    };
    return TemplateController;
}());
TemplateController.settingGroupHierarchy = 'groups';
TemplateController.settingInitialSelection = 'initialSelection';
TemplateController.settingDefaultTemplates = 'defaultTemplates';
