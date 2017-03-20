declare var jira;
import { FieldController } from '../FieldController';
import { Field, IFieldEventHandler, UiActionEventData } from '../Field';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType, EventType } from '../Enumerations';
import { JiraMetaField, JiraProject, JiraIssue, JiraUser } from '../JiraModels';
import { EmailController } from '../EmailController';
import { AttachmentField } from './AttachmentField';
import { Bootbox } from '../Bootbox';
import { Utilities } from '../../Util';
import { AjaxService } from '../../AjaxService';

interface MultiLineTextFieldOptions {
    isMainField?: boolean;
    hasMentions?: boolean;
}

@getter(GetterType.Text)
@setter(SetterType.Text)
export class MultiLineTextField extends Field implements IFieldEventHandler {
    static defaultCommentMeta: JiraMetaField = { key: FieldController.commentFieldId, get name() { return yasoon.i18n('dialog.comment'); }, required: false, schema: { system: 'description', type: '' } };

    private isMainField: boolean;
    private hasMentions: boolean;
    private timeoutSearchUser: any;
    private emailController: EmailController;
    private currentProject: JiraProject;
    private currentIssue: JiraIssue;

    //MentionsInput only allows to get the value async... which breaks our concept.
    //So we get the value of the comment box after each change and save it here so we can get it afterwards synchroniously.
    private mentionText: string;

    constructor(id: string, field: any, config: MultiLineTextFieldOptions = { isMainField: false, hasMentions: false }) {
        super(id, field);

        this.emailController = jira.emailController;
        this.hasMentions = config.hasMentions;
        this.isMainField = config.isMainField;

        if (this.hasMentions) {
            FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
            FieldController.registerEvent(EventType.FieldChange, this, FieldController.issueFieldId);
        }
        FieldController.registerEvent(EventType.UiAction, this);
    }

    private removeAttachmentFromBody(handle: any) {
        let regEx = new RegExp('(\\[\\^|!)' + handle.fileName + '(\\]|!)', 'g');
        let oldDescr = $('#' + this.id).val();
        let newDescr = oldDescr.replace(regEx, '').trim();
        this.setValue(newDescr);
    }

    private hasReference(handle): boolean {
        let content: string = $('#' + this.id).val();
        if (content) {
            return content.indexOf(handle.fileName) >= 0;
        }
        return false;
    }

    private showOptionToolbar(useMarkup, showUndo) {
        this.ownContainer.find('#DescriptionOptionToolbar').removeClass('hidden');
        this.ownContainer.find('#DescriptionUseJiraMarkup').prop('checked', useMarkup);
        if (showUndo)
            this.ownContainer.find('#DescriptionUndoAction').removeClass('hidden');
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.UiAction && this.isMainField) {
            let eventData: UiActionEventData = newValue;

            if (eventData.name === AttachmentField.uiActionRename) {
                //Replace references of this attachment with new name (if necessary)
                let oldText = $('#' + this.id).val();
                if (oldText) {
                    let regEx = new RegExp(eventData.value.oldName, 'g');
                    let newText = oldText.replace(regEx, eventData.value.newName);
                    this.setValue(newText);
                }
            } else if (eventData.name === AttachmentField.uiActionSelect) {

                //We currently only care about attachments that have been deselected
                if (!eventData.value.selected) {
                    let autoRemove: string = yasoon.setting.getAppParameter('dialog.autoRemoveAttachmentReference');
                    if (autoRemove && autoRemove === 'true' && !eventData.value.selected) {
                        this.removeAttachmentFromBody(eventData.value);
                    }
                    else if (!autoRemove && this.hasReference(eventData.value)) {
                        Bootbox.confirm({
                            message: yasoon.i18n('dialog.attachmentReferenceStillActive'),
                            checkbox: yasoon.i18n('dialog.rememberDecision'),
                            primary: yasoon.i18n('dialog.yes'),
                            secondary: yasoon.i18n('dialog.no')
                        })
                            .then((result: any) => {
                                if (result.ok) {
                                    this.removeAttachmentFromBody(eventData.value);
                                }

                                if (result.checkbox) {//rememberDecision
                                    yasoon.setting.setAppParameter('dialog.autoRemoveAttachmentReference', result.ok.toString());
                                }
                            });
                    }
                }
            } else if (eventData.name === AttachmentField.uiActionAddRef) {
                let markup = '';
                if (eventData.value.hasFilePreview()) {
                    markup = '!' + eventData.value.fileName + '!\n'
                } else {
                    markup = '[^' + eventData.value.fileName + ']\n'
                }

                Utilities.insertAtCursor(<HTMLTextAreaElement>$('#' + this.id)[0], markup);
            }
        } else if (type === EventType.FieldChange) {
            if (source === FieldController.projectFieldId) {
                this.currentProject = newValue;
            } else if (source === FieldController.issueFieldId) {
                this.currentIssue = newValue;
            }
        }

        return null;
    }

    addMainFieldHtml(container: JQuery) {
        let html = ` <div style="margin-top:5px; position:relative;">
                            <span id="DescriptionOptionToolbar" style="padding: 3px;">
                                <span title="${yasoon.i18n('dialog.titleToggleJiraMarkup')}">
                                    <input id="DescriptionUseJiraMarkup" class="toggle-checkbox" type="checkbox" checked="checked"/>
                                    ${yasoon.i18n('dialog.toggleJiraMarkup')}
                                </span>
                                <a style="cursor:pointer;" class="hidden" id="DescriptionUndoAction">
                                    <i class="fa fa-undo"></i>
                                    ${yasoon.i18n('dialog.undo')}
                                </a>
                            </span>
                            <span class="dropup pull-right">
                                <a style="cursor:pointer;" data-toggle="dropdown" class="dropdown-toggle" title="${yasoon.i18n('dialog.titleReplaceWith')}" >
                                    ${yasoon.i18n('dialog.replaceWith')}
                                    <span class="caret"></span>
                                </a>
                                <ul class="dropdown-menu">
                                    <li>
                                        <span style="display: block;padding: 4px 10px;">
                                            ${yasoon.i18n('dialog.toggleJiraMarkup')}
                                            <input class="toggleJiraMarkup toggle-checkbox" type="checkbox" checked="checked" />
                                        </span>
                                    </li>
                                    <li role="separator" class="divider"></li>
                                    ${((jira.selectedText) ? '<li id="DescriptionSelectedText"><a href="#">' + yasoon.i18n('dialog.addSelectedText') + '</a></li>' : '')}
                                    ${((jira.mail) ? '<li id="DescriptionFullMail"><a href="#">' + yasoon.i18n('dialog.addConversation') + '</a></li>' : '')}
                	            </ul>
                            </span>
                            <span class="dropup pull-right" style="margin-right: 20px;">
                                <a style="cursor:pointer;" data-toggle="dropdown" class="dropdown-toggle" title="${yasoon.i18n('dialog.titleReplaceWith')}" >
                                    ${yasoon.i18n('dialog.add')}
                                    <span class="caret"></span>
                                </a>
                                <ul class="dropdown-menu">
                                    <li>
                                        <span style="display: block;padding: 4px 10px;">
                                            ${yasoon.i18n('dialog.toggleJiraMarkup')}
                                            <input class="toggleJiraMarkup toggle-checkbox" type="checkbox" checked="checked" />
                                        </span>
                                    </li>
                                    <li role="separator" class="divider"></li>
                                    ${((jira.mail) ? '<li id="DescriptionMailInformation"><a href="#">' + yasoon.i18n('dialog.addMailInformation') + '</a></li>' : '')}
                                </ul>
                            </span>
                        </div>`;

        container.append(html);
    }

    getDomValue() {
        let val = '';
        if (this.hasMentions && this.mentionText) {
            //Parse @mentions
            val = this.mentionText.replace(/@.*?\]\(user:([^\)]+)\)/g, '[~$1]');
        } else {
            val = $('#' + this.id).val();
        }

        return val;
    }

    hookEventHandler(): void {
        //Standard Change handler
        $('#' + this.id).change(e => this.triggerValueChange());


        if (this.isMainField && this.emailController) {
            //Private vars for event Handler
            let useMarkup: boolean = true;
            let backup: string = '';
            let lastAction: string = this.emailController.type;

            //Static toggle JIRA markup in drop down menus
            this.ownContainer.find('.toggleJiraMarkup').on('click', (e) => {
                useMarkup = e.target['checked'];
                //Make sure all other toggles (even in other fields) have the same state
                $('.toggleJiraMarkup').prop('checked', useMarkup);
                e.stopPropagation();
            });

            //Temporary toggle markup button below text field until user changes some content
            this.ownContainer.find('#DescriptionUseJiraMarkup').on("change", (e) => {
                useMarkup = e.target['checked'];

                let newContent: string;
                //Make sure all other toggles (even in other fields) have the same state
                $('.toggleJiraMarkup').prop('checked', useMarkup);

                if (lastAction == 'selectedText') {
                    if (useMarkup)
                        newContent = this.emailController.selectionAsMarkup;
                    else
                        newContent = this.emailController.selectionPlain;

                } else if (lastAction == 'wholeMail') {
                    if (useMarkup) {
                        newContent = this.emailController.bodyAsMarkup;
                    } else {
                        newContent = this.emailController.bodyPlain;
                    }
                } else if (lastAction == 'mailHeader') {
                    newContent = this.emailController.getMailHeaderText(useMarkup) + backup;
                }

                this.setValue(newContent);
                e.preventDefault();

            });

            $('#' + this.id).on("keyup paste", (e) => {
                this.ownContainer.find('#DescriptionOptionToolbar').addClass('hidden');
            });

            this.ownContainer.find('#DescriptionUndoAction').on('click', (e) => {
                this.setValue(backup);
                this.ownContainer.find('#DescriptionOptionToolbar').addClass('hidden');
            });

            this.ownContainer.find('#DescriptionSelectedText').on('click', (e) => {
                backup = $('#' + this.id).val();
                lastAction = 'selectedText';


                let content: string = (useMarkup) ? this.emailController.selectionAsMarkup : this.emailController.selectionPlain;
                $('#' + this.id).val(content);
            });

            this.ownContainer.find('#DescriptionFullMail').on('click', (e) => {
                backup = $('#' + this.id).val();
                lastAction = 'wholeMail';
                this.showOptionToolbar(useMarkup, true);

                let content: string = (useMarkup) ? this.emailController.bodyAsMarkup : this.emailController.bodyPlain;
                $('#' + this.id).val(content);
            });

            this.ownContainer.find('#DescriptionMailInformation').on('click', (e) => {
                let field = $('#' + this.id);

                lastAction = 'mailHeader';
                backup = field.val();
                this.showOptionToolbar(useMarkup, true);

                field.val(this.emailController.getMailHeaderText(useMarkup) + backup);
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

            $('#' + this.id).on('updated', Utilities.debounce(() => {
                $('#' + this.id)['mentionsInput']('val', (content) => {
                    this.mentionText = content;
                });
            }, 250));

        }
    }

    render(container: any) {
        let height: string = (this.isMainField) ? '200px' : '100px';
        container.append(`<div style="position:relative;"><textarea class="form-control text" id="${this.id}" name="${this.id}" style="height:${height};overflow: initial;"></textarea>
            <img src="images/ajax-loader.gif" class="hidden" id="${this.id}-spinner" style="position: absolute;top: 20px;left: 20px;" /></div>
            <div class="mentions-help-text bg-warning"><span>${yasoon.i18n('dialog.mentionsAlert')}</span></div>`);


        if (this.isMainField && this.emailController) {
            this.addMainFieldHtml(container);
        }
    }


    searchJiraUser = (mode, query, callback) => {
        if (this.currentIssue || this.currentProject) {
            var queryKey = (this.currentIssue) ? 'issueKey=' + this.currentIssue.key : 'projectKey=' + this.currentProject.key;

            AjaxService.get('/rest/api/2/user/viewissue/search?' + queryKey + '&maxResults=10&username=' + query)
                .then(function (usersString) {
                    var data = [];
                    var users: JiraUser[] = JSON.parse(usersString);
                    users.forEach(function (user) {
                        data.push({ id: user.name, name: user.displayName, type: 'user' });
                    });
                    callback(data);
                });
        } else {
            //Show alert
            $('.mentions-input-box + .mentions-help-text').slideDown();
            if (this.timeoutSearchUser) {
                clearTimeout(this.timeoutSearchUser);
            }
            this.timeoutSearchUser = setTimeout(function () { $('.mentions-input-box + .mentions-help-text').slideUp(); }, 2000);
            callback([]);
        }
    }

    showSpinner() {
        $('#' + this.id + '-spinner').removeClass('hidden');
    }

    hideSpinner() {
        $('#' + this.id + '-spinner').addClass('hidden');
    }

}