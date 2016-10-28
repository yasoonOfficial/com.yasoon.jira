/// <reference path="../Renderer.ts" />
/// <reference path="../getter/GetTextValue.ts" />
/// <reference path="../setter/SetValue.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
declare var isEqual: any;
/*
class MultiLineTextRenderer extends Field {

    private id: string;
    private field: any;
    private isDescription: boolean;

    //MentionsInput only allows to get the value async... which breaks our concept.
    //So we get the value of the comment box after each change and save it here so we can get it afterwards synchroniously.
    private mentionText: string;

    constructor(id: string, field: any) {
        super(id, field);
        this.id = id;
        this.field = field;
        this.isDescription = (id === 'description' || id === 'comment');
    }

    getValue(id: string, isEditMode: boolean, fields: Array<any>) {
        let val = '';
        if (this.isDescription && this.mentionText) {
            //Parse @mentions
            val = this.mentionText.replace(/@.*?\]\(user:([^\)]+)\)/g, '[~$1]');
        } else {
            val = $('#' + id).val();
        }

        if (isEditMode)
            //In edit case: Only send if changed	
            return (isEqual(fields[id], val)) ? undefined : val;
        else
            //In creation case: Only send if not null	
            return (val) ? val : undefined;
    }

    render(id: string, field: any, container: any) {
        let contentContainer: JQuery = super.addBaseHtml(id, field, container);

        contentContainer.append($(`<input class="text long-field" id="${id}" name="${id}" value="" type="text" />`));
    }
}*/