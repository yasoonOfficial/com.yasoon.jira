/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />

declare var isEqual: any;
declare var yasoon: any;
declare var jira: any;

@getter(GetterType.Text)
@setter(SetterType.Text)
class MultiLineTextField extends Field {
    private isMainField: boolean;
    private hasMentions: boolean;
    private height: string;
    //MentionsInput only allows to get the value async... which breaks our concept.
    //So we get the value of the comment box after each change and save it here so we can get it afterwards synchroniously.
    private mentionText: string;

    constructor(id: string, field: any, config: { isMainField: boolean, hasMentions: boolean } = { isMainField: false, hasMentions: false }) {
        super(id, field);
        this.isMainField = config.isMainField;
        this.hasMentions = config.hasMentions;
        this.height = (this.isMainField) ? '200px' : '100px';
    }

    addMainFieldHtml(container: JQuery) {
        if (jira.mail) {
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
    }

    getDomValue() {
        let val = '';
        if (this.isMainField && this.mentionText) {
            //Parse @mentions
            val = this.mentionText.replace(/@.*?\]\(user:([^\)]+)\)/g, '[~$1]');
        } else {
            val = $('#' + this.id).val();
        }

        return val;
    };

    hookEventHandler(): void {
        //Standard Change handler
        $('#' + this.id).change(e => this.triggerValueChange());

        //Private vars for event Handler
        let defaultSelectedText: string = ((jira.selectedText) ? jira.mail.getSelection(0) : '');
        let useMarkup: boolean = true;
        let backup: string = '';
        let lastAction: string = ((jira.selectedText) ? 'selectedText' : (jira.mail) ? 'wholeMail' : '');
        let container: JQuery = $('#' + this.id + 'field-container');

        if (this.isMainField) {
            //Static toggle JIRA markup in drop down menus
            container.find('.toggleJiraMarkup').on('click', (e) => {
                useMarkup = e.target['checked'];
                //Make sure all other toggles (even in other fields) have the same state
                $('.toggleJiraMarkup').prop('checked', useMarkup);
                e.stopPropagation();
            });

            //Temporary toggle markup button below text field until user changes some content
            container.find('#DescriptionUseJiraMarkup').on("change", (e) => {
                useMarkup = e.target['checked'];
                let newContent;
                //Make sure all other toggles (even in other fields) have the same state
                $('.toggleJiraMarkup').prop('checked', useMarkup);

                if (lastAction == 'selectedText') {
                    if (useMarkup)
                        newContent = jira.selectedText;
                    else
                        newContent = defaultSelectedText;

                } else if (lastAction == 'wholeMail') {
                    if (useMarkup) {
                        newContent = jira.mailAsMarkup;
                    } else {
                        newContent = jira.mail.getBody(0);
                    }
                }
                this.setValue(newContent);
                e.preventDefault();

            });

            $('#' + this.id).on("keyup paste", (e) => {
                container.find('#DescriptionOptionToolbar').addClass('hidden');
            });

            container.find('#DescriptionUndoAction').on('click', (e) => {
                this.setValue(backup);
                container.find('#DescriptionOptionToolbar').addClass('hidden');
            });

            container.find('#DescriptionSelectedText').on('click', (e) => {
                backup = $('#' + this.id).val();
                lastAction = 'selectedText';
                container.find('#DescriptionOptionToolbar').removeClass('hidden');
                container.find('#DescriptionUseJiraMarkup').prop('checked', useMarkup);
                container.find('#DescriptionUndoAction').removeClass('hidden');

                if (useMarkup)
                    $('#' + this.id).val(jira.selectedText);
                else
                    $('#' + this.id).val(defaultSelectedText);
            });

            container.find('#DescriptionFullMail').on('click', (e) => {
                backup = $('#' + this.id).val();
                lastAction = 'wholeMail';
                container.find('#DescriptionOptionToolbar').removeClass('hidden');
                container.find('#DescriptionUseJiraMarkup').prop('checked', useMarkup);
                container.find('#DescriptionUndoAction').removeClass('hidden');

                if (useMarkup) {
                    $('#' + this.id).val(jira.mailAsMarkup);
                } else {
                    $('#' + this.id).val(jira.mail.getBody(0));
                }
            });

            container.find('#DescriptionMailInformation').on('click', (e) => {
                let field = $('#' + this.id);
                backup = field.val();
                insertAtCursor(field[0], renderMailHeaderText(jira.mail, useMarkup));
            });
        }

        if (this.hasMentions) {
            //Init Mentions
            /*
            $('#' + this.id)['mentionsInput']({
                onDataRequest: searchJiraUser,
                triggerChar: '@',
                minChars: 2,
                showAvatars: false,
                elastic: false
            });

            $('#' + id).on('scroll', function () {
                $(this).prev().scrollTop($(this).scrollTop());
            });

            $('#' + id).on('updated', debounce(function () {
                $('#' + id).mentionsInput('val', function (content) {
                    mentionTexts[id] = content;
                });
            }, 250));
            */
        }
    };

    render(container: any) {
        container.append(`<textarea class="form-control" id="${this.id}" name="${this.id}" style="height:${this.height};overflow: initial;"></textarea>
            <div class="mentions-help-text bg-warning"><span>${yasoon.i18n('dialog.mentionsAlert')}</span></div>`);
        if (this.isMainField) {
            this.addMainFieldHtml(container);
        }
    };
}