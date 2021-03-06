/// <reference path="../Field.ts" />
/// <reference path="../FieldController.ts" />
/// <reference path="../../../definitions/handlebars.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../Bootbox.ts" />

class AttachmentField extends Field implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.attachmentFieldId, get name() { return yasoon.i18n('dialog.attachment'); }, required: false, schema: { system: 'attachment', type: '' } };

    static uiActionRename = 'renameAttachment';
    static uiActionSelect = 'selectAttachment';
    static uiActionAddRef = 'addRefAttachment';

    deactivatePreview = false;
    getTemplate: Promise<any> = null;
    currentParameters: any = null;
    attachments: JiraFileHandle[] = [];
    descriptionField: Field = null;
    constructor(id: string, fieldMeta: JiraMetaField, attachments: JiraFileHandle[]) {
        super(id, fieldMeta);

        this.attachments = attachments || [];
        this.getTemplate = Promise.all([
            $.getScript(yasoon.io.getLinkPath('templates/attachmentFieldsNew.js')),
            $.getScript(yasoon.io.getLinkPath('templates/attachmentLink.js')),
        ])
            .spread(function () {
                Handlebars.registerPartial("attachmentLink", jira.templates.attachmentLink);
                return jira.templates.attachmentFieldsNew;
            });

        FieldController.registerEvent(EventType.AfterSave, this);
        FieldController.registerEvent(EventType.AttachmentChanged, this);
        FieldController.registerEvent(EventType.Cleanup, this);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.AfterSave) {
            let lifecycleData: LifecycleData = newValue;
            let formData = [];
            this.attachments.forEach((file) => {
                if (file.selected) {
                    formData.push({
                        type: yasoon.formData.File,
                        name: 'file',
                        value: file
                    });
                }
            });
            this.deactivatePreview = true;

            if (formData.length > 0) {
                return jiraAjax('/rest/api/2/issue/' + lifecycleData.newData.id + '/attachments', yasoon.ajaxMethod.Post, null, formData);
            }
        } else if (type === EventType.Cleanup) {
            //Dispose all Attachments
            this.attachments.forEach((handle) => {
                try {
                    handle.dispose();
                } catch (e) {
                    //System.Exception: TrackedObjectRegistry: Tried to access object which not found! (probably already de-referenced)
                }
            });
        } else if (type === EventType.AttachmentChanged) {
            if (newValue)
                this.attachments = newValue;

            this.render(this.ownContainer)
                .then(() => {
                    this.hookEventHandler();
                });
        }
    }

    getDomValue(): string {
        return '';
    }

    getValue() {
        //Nessecary as attachments will upload differently
        return undefined;
    }

    setValue(): Promise<any> {
        //Attachments work differently
        return Promise.resolve();
    }

    getSelectedAttachments() {
        return this.attachments.filter((a) => a.selected);
    }

    getCurrentAttachment(elem: JQuery): any {
        let handleId = $(elem).closest('.jiraAttachmentLink').data('id');
        return this.attachments.filter((item) => { return item.id === handleId; })[0];
    }

    submitRename(elem): void {
        let domAttachmentLink = elem.closest('.jiraAttachmentLink');
        let handle = this.getCurrentAttachment(elem);
        let newName = domAttachmentLink.find('.attachmentNewName input').val().trim() + handle.extension;
        let oldName = handle.fileName;

        if (handle.fileName != newName) {
            domAttachmentLink.find('.attachmentNameValue').text(newName);
            handle.setFileName(newName);
            handle.fileName = newName;
            handle.fileNameNoExtension = newName.substring(0, newName.lastIndexOf('.'));

            let eventData: UiActionEventData = {
                name: AttachmentField.uiActionRename,
                value: {
                    oldName: oldName,
                    newName: newName
                }
            };
            FieldController.raiseEvent(EventType.UiAction, eventData);

        }
        domAttachmentLink.find('.attachmentMain').removeClass('edit');
    }

    private raiseHandleChangedEvent(handle) {
        let eventData: UiActionEventData = {
            name: AttachmentField.uiActionSelect,
            value: handle
        };

        FieldController.raiseEvent(EventType.UiAction, eventData);
    }

    hookEventHandler(): void {
        //Blacklist Events
        if (this.currentParameters.blacklistedAttachments.length > 0) {
            $(this.ownContainer).find('.show-blacklisted-attachments').removeClass('hidden');

            $(this.ownContainer).find('.show-blacklisted-attachments').off().click((e) => {
                e.preventDefault();
                $(this.ownContainer).find('.attachments-blacklisted').removeClass('hidden');
                $(this.ownContainer).find('.hide-blacklisted-attachments').removeClass('hidden');
                $(e.target).addClass('hidden');
            });

            $(this.ownContainer).find('.hide-blacklisted-attachments').off().click((e) => {
                e.preventDefault();
                $(this.ownContainer).find('.attachments-blacklisted').addClass('hidden');
                $(this.ownContainer).find('.show-blacklisted-attachments').removeClass('hidden');
                $(e.target).addClass('hidden');
            });
        }

        $(this.ownContainer).find('.select-all-none-attachments').off().click((e) => {
            var newState = !$('#attachment-select-all-none').is(':checked');
            $('.jiraAttachmentLink').find('.checkbox input').prop('checked', newState).trigger('change');
            $('#attachment-select-all-none').prop('checked', newState);
        });

        $('#attachment-select-all-none').off().on('change', (e) => {
            var newState = e.target['checked'];
            $('.jiraAttachmentLink').find('.checkbox input').prop('checked', newState).trigger('change');
            $('#attachment-select-all-none').prop('checked', newState);
        });

        $(this.ownContainer).find('.addAttachmentLink').off().click((e) => {
            e.preventDefault();
            yasoon.view.fileChooser.open((selectedFiles) => {
                selectedFiles.forEach((handle) => {
                    handle.selected = true;
                });

                let attachments = this.attachments.concat(selectedFiles);
                //Rerender
                FieldController.raiseEvent(EventType.AttachmentChanged, attachments);
            });
        });

        $('.jiraAttachmentLink .checkbox input').off().on('change', (e) => {
            let handle = this.getCurrentAttachment($(e.target));
            handle.selected = e.target['checked'];
            this.raiseHandleChangedEvent(handle);
        });

        $('.attachmentAddRef').off().click((e) => {
            e.preventDefault();
            let handle = this.getCurrentAttachment($(e.target));
            //Select attachment to be uploaded
            handle.selected = true;
            $(e.target).closest('.jiraAttachmentLink').find('.checkbox input').prop('checked', true);

            //Notify description
            FieldController.raiseEvent(EventType.UiAction, { name: AttachmentField.uiActionAddRef, value: handle });
        });

        $('.attachmentAddToBlacklist').off().click((e) => {
            e.preventDefault();
            let handle = this.getCurrentAttachment($(e.target));

            let hideInfo = yasoon.setting.getAppParameter('dialog.hideAttachmentBlacklistExplanation');
            let showInfoDialog;
            if (hideInfo && hideInfo === 'true') {
                showInfoDialog = Promise.resolve({ ok: true }); //Skip
            }
            else {
                showInfoDialog = Bootbox.confirm({
                    message: yasoon.i18n('dialog.attachmentAddToBlacklistDialog'),
                    checkbox: yasoon.i18n('dialog.dontShowAgain'),
                    primary: yasoon.i18n('dialog.ok'),
                    secondary: yasoon.i18n('dialog.cancel')
                });
            }

            showInfoDialog.then((result) => {
                if (result.ok) {
                    //First, set as blacklisted
                    yasoon.io.getFileHash(handle).then((hash) => {
                        return yasoon.valueStore.putAttachmentHash(hash);
                    });

                    //Now, update UI
                    handle.blacklisted = true;
                    handle.selected = false;

                    //rerender
                    FieldController.raiseEvent(EventType.AttachmentChanged);

                    //Now remove all references from the description field
                    this.raiseHandleChangedEvent(handle);

                    //Only accept dont ask again if was confirmed with ok					
                    if (result.checkbox) { //dont show again
                        yasoon.setting.setAppParameter('dialog.hideAttachmentBlacklistExplanation', 'true');
                    }
                }
            });
        });

        $('.attachmentRename').off().click((e) => {
            e.preventDefault();
            $(e.target).closest('.attachmentMain').addClass('edit');
        });

        $('.attachmentRenameConfirm').off().click((e) => {
            e.preventDefault();
            this.submitRename($(e.target));
        });

        $('.attachmentRenameCancel').click((e) => {
            e.preventDefault();
            let domAttachmentLink = $(e.target).closest('.jiraAttachmentLink');
            domAttachmentLink.find('.attachmentMain').removeClass('edit');
            let handle = this.getCurrentAttachment($(e.target));
            domAttachmentLink.find('.attachmentNewName input').val(handle.fileNameNoExtension);
        });

        $('.attachmentNameValue').off().on('mouseenter', (e) => {
            var elem = $(e.target);
            let domAttachmentLink = elem.closest('.jiraAttachmentLink');
            let handle = this.getCurrentAttachment(elem);

            if (this.deactivatePreview === false && handle.hasFilePreview()) {
                var timeoutFct = setTimeout(function () {
                    yasoon.io.getFilePreviewPath(handle)
                        .then((path) => {
                            $('.thumbnail-preview').remove();
                            $('body').append('<img class="thumbnail-preview" src="' + path + '" style="z-index: 100000; cursor: pointer; background-color: white; position: absolute; left: ' + (e.originalEvent['x'] - 50) + 'px; top: ' + (e.originalEvent['y'] - 30) + 'px" />')
                                .find('.thumbnail-preview')
                                .on('mouseleave', function () {
                                    $(this).unbind().remove();
                                });
                        });
                }, 500);

                $('.attachmentNameValue').on('mouseleave', (e) => {
                    clearTimeout(timeoutFct);
                });

            }
        });

        $('.attachmentNewName input').off().on('keyup', (e) => {
            e.preventDefault();
            if (e.keyCode == 13) {
                this.submitRename($(e.target));
            }
            return false;
        });
    }

    render(container: JQuery) {
        if (!this.attachments)
            return;

        return this.getTemplate
            .then((template) => {
                this.attachments.forEach((attachment) => {
                    //Rename FileName if it contains unsupported characters
                    let oldFileName = attachment.getFileName() || 'unknown.file';
                    let newFileName = oldFileName.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\^/g, '_');
                    if (oldFileName != newFileName)
                        attachment.setFileName(newFileName);

                    //Set Fields for template
                    attachment.fileName = newFileName;
                    attachment.extension = newFileName.substring(newFileName.lastIndexOf('.'));
                    attachment.fileIcon = attachment.getFileIconPath(true);
                    attachment.fileNameNoExtension = newFileName.substring(0, newFileName.lastIndexOf('.'));
                });

                this.currentParameters = {
                    id: this.id,
                    attachments: this.attachments.filter(function (val) { return !val.blacklisted; }) || [],
                    blacklistedAttachments: this.attachments.filter(function (val) { return val.blacklisted; }) || []
                };

                $(container).html(template(this.currentParameters));
            })
            .catch((e) => { this.handleError(e); });

    };
}


