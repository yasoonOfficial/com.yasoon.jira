class EmailController {
    public fieldMapping = {
        subject: 'summary',
        body: 'description',
        sender: 'reporter',
        sentAt: ''
    }

    public mail: any;
    public settings: any;
    public attachmentHandles: any;

    constructor(mail: any, settings: any) {
        this.mail = mail;
        this.settings = settings;

        let fieldMappingString = yasoon.setting.getAppParameter('fieldMapping');
        if (fieldMappingString) {
            this.fieldMapping = JSON.parse(fieldMappingString);
        }
    }

    getAttachmentFileHandles() {
        //If created by email, check for templates and attachments
        if (this.mail && !this.attachmentHandles) {
            this.attachmentHandles = [];
            //Add current mail to clipboard
            let handle = this.mail.getFileHandle();
            if (this.settings.addEmailOnNewAddIssue) {
                handle.selected = true;
            }
            this.attachmentHandles.push(handle);

            if (this.mail.attachments && this.mail.attachments.length > 0) {
                this.mail.attachments.forEach(function (attachment) {
                    let handle = attachment.getFileHandle();
                    //Skip too small images	
                    if (this.settings.addAttachmentsOnNewAddIssue) {
                        handle.selected = true;
                    }
                    this.attachmentHandles.push(handle);
                });
            }
        }

        return this.attachmentHandles || [];
    }
}