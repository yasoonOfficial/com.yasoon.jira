/// <reference path="../../definitions/yasoon.d.ts" />

declare var jira;

export interface IconBufferEntry {
    url: string;
    fileName: string;
}

export namespace JiraIconController {
    let iconBuffer: IconBufferEntry[] = [];

    function jiraCreateHash(input) {
        var hash = 0, i, chr, len;
        if (input.length === 0) return hash;
        for (i = 0, len = input.length; i < len; i++) {
            chr = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    function saveIcon(url: string): string {
        //generate unique FileName
        var fileName = 'Images\\' + jiraCreateHash(url);
        console.log('Download Icon - URL: ' + url + ' : FileName: ' + fileName);

        if (url.indexOf('secure') > -1) {
            //Authed
            yasoon.io.downloadAuthed(url, fileName, jira.settings.currentService, false, function (handle) {
                //Success Handler --> update IconBuffer to local URL
                var result = iconBuffer.filter(function (elem) { return elem.url == url; });
                if (result.length === 1) {
                    result[0].fileName = 'Images\\' + handle.getFileName();
                    saveSettings();
                }

            });

        } else {
            //Download File
            yasoon.io.download(url, fileName, false, function (handle) {
                //Success Handler --> update IconBuffer to local URL
                var result = iconBuffer.filter(function (elem) { return elem.url == url; });
                if (result.length === 1) {
                    result[0].fileName = 'Images\\' + handle.getFileName();
                    saveSettings();
                }

            }, false);

        }
        //Temporary save URL in Buffer
        iconBuffer.push({ url: url, fileName: url });
        return url;
    };

    function saveSettings() {
        yasoon.setting.setAppParameter('icons', JSON.stringify(iconBuffer));
    };

    export function mapIconUrl(url: string): string {
        if (!url)
            return;

        //Avoid mapping local URLs
        if (url.indexOf('http') !== 0) {
            return url;
        }

        try {
            var result = iconBuffer.filter(function (elem) { return elem.url == url; });
            if (result.length > 1) {
                //Should never happen --> remove both elements from buffer
                iconBuffer = iconBuffer.filter(function (elem) { return elem.url != url; });
                result = [];
            }

            //Only map if mappping to local URL exist
            if (result.length === 1 && result[0].fileName.indexOf('http') !== 0) {
                return yasoon.io.getLinkPath(result[0].fileName);
            } else if (result.length === 0) {
                return saveIcon(url);
            }
        } catch (e) {
            //Can dump ... e.g. it seems to be possible to add font awesome icons without valid URL
            //This method should never dump completely as it may prevents everything from working. just return the input url
        }
        return url;

    }

    export function addIcon(url: string): string {
        var result = iconBuffer.filter(function (elem) { return elem.url == url; });
        if (result.length === 0) {
            return saveIcon(url);
        } else {
            return result[0].url;
        }
    }

    export function getFullBuffer(): IconBufferEntry[] {
        return iconBuffer;
    }

    //Init - load data
    var settingString = yasoon.setting.getAppParameter('icons');
    if (settingString) {
        iconBuffer = JSON.parse(settingString);

        //Check consistency of buffer
        iconBuffer = iconBuffer.filter(function (entry) {
            if (entry.fileName.indexOf('http') === 0) {
                //http links should be in index only temporary --> download newly this time
                return false;
            }
            //Remove link if file does not exist
            return yasoon.io.exists(entry.fileName);
        });
    }
}

