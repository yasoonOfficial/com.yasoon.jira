declare var jira, moment;
import { Select2Element } from './renderer/fields/Select2Field'
import { JiraSystemInfo, JiraProject, JiraUserConfigMeta } from './renderer/JiraModels';

export class Utilities {
    static sortByText(a: Select2Element, b: Select2Element): number {
        return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1);
    }


    static insertAtCursor(myField: HTMLTextAreaElement, myValue: string) {
        var startPos = myField.selectionStart;
        var endPos = myField.selectionEnd;
        if (startPos > 0)
            myValue = '\n' + myValue;

        myField.value = myField.value.substring(0, startPos) +
            myValue +
            myField.value.substring(endPos, myField.value.length);
    }

    static findWithAttr(array: any[], attr: string, value: any) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    }

    static isEqual(a: any, b: any) {
        if (typeof a === 'number' || typeof b === 'number') {
            //Compare numbers
            return a === b;
        } else {
            //Compare strings and normalize nulls
            a = a || "";
            b = b || "";
            return a == b;
        }
    }

    static isVersionHigher(systemInfo: JiraSystemInfo, versionString: string): boolean {
        let versions = versionString.split('.');

        let result = versions.some(function (version, index) {
            let jiraVersion = systemInfo.versionNumbers[index];
            let versionInt = parseInt(version);
            //We can'T control JIRA version numbers, but if our version has more numbers, we should assume a lower version.
            // E.g. JIRA 7.0 < 7.0.3 (even if we hope, JIRA will send a 7.0.0)
            if (jiraVersion === undefined)
                return false;

            //JIRA version higher
            if (jiraVersion > versionInt)
                return true;

            //JIRA version equals but last element of our version string
            //E.g. JIRA 7.0.2 > 7
            if (index === (versions.length - 1) && jiraVersion === versionInt)
                return true;
        });

        return result;
    }

    static debounce(func: (...rest) => any, wait: number, immediate: boolean = false) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    static getProjectIcon(project: JiraProject): string {
        if (!project.projectTypeKey)
            return '';

        if (project.projectTypeKey === 'business')
            return 'Images/project_business.svg';
        if (project.projectTypeKey === 'service_desk')
            return 'Images/project_service.svg';
        if (project.projectTypeKey === 'software')
            return 'Images/project_software.svg';
    }

    static getUniqueKey(): string {
        //Use current time to get something short unique
        var currentTime = Math.round(new Date().getTime() / 1000);
        var buf = new ArrayBuffer(4);
        var view = new DataView(buf);
        view.setUint32(0, currentTime, false);

        var binary = '';
        var bytes = new Uint8Array(buf);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return window.btoa(binary).replace(/=/g, '').replace(/\//g, '').replace(/\+/g, '');
    }

    static renderMailHeaderText(mail: yasoonModel.Email, useMarkup?: boolean) {
        var result = '';

        if (useMarkup) {
            result = yasoon.i18n('mail.mailHeaderMarkup', {
                senderName: mail.senderName,
                senderEmail: mail.senderEmail,
                date: moment(mail.receivedAt).format('LLL'),
                recipients: ((mail.recipients.length > 0) ? '[mailto:' + mail.recipients.join('],[mailto:') : 'No One'),
                subject: mail.subject
            });
        }
        else {
            result = yasoon.i18n('mail.mailHeaderPlain', {
                senderName: mail.senderName,
                senderEmail: mail.senderEmail,
                date: moment(mail.receivedAt).format('LLL'),
                recipients: mail.recipients.join(','),
                subject: mail.subject
            });
        }

        return result;
    }

    static jiraCloneObject(obj) {
        if (obj)
            return JSON.parse(JSON.stringify(obj));
    }

    static parseUserMeta(metaString: string): JiraUserConfigMeta {
        var userMeta = JSON.parse(metaString);
        userMeta.fields.forEach(function (field) {
            var el = $('<div>' + field.editHtml + '</div>');
            field.defaultValue = el.find('select, input, textarea').val();
            field.data = el.find('select, input, textarea').data();
            delete field.editHtml;
        });

        return userMeta;
    }
}
