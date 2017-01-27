/// <reference path="functions.ts" />
import * as $ from 'jquery';
import 'office-js';
let jiraApp: JiraApp = null;
const yasoonUserKey = 'user';
class JiraApp {
    storeUrl = 'http://localhost:1337';
    yasoonUser: YasoonUser;

    constructor() {
        this.yasoonUser = this.loadRoamingSettings(yasoonUserKey);

    }

    loadRoamingSettings(key: string): any {
        return Office.context.roamingSettings.get(key);
    }

    saveSettings(key: string, value: any): void {
        Office.context.roamingSettings.set(key, value);
        Office.context.roamingSettings.saveAsync();
    }

    loadHtmlModule(key: string): void {
        $('body').load('components/' + key + '/' + key + '.html', function() {
            $.getScript('components/' + key + '/' + key + '.js');
        });
    }

    getYasoonItemData(): Promise<any> {
        let item = Office.context.mailbox.item;
        return new Promise<any>((resolve, reject) => {
            Office.context.mailbox.makeEwsRequestAsync(this.getRequestContentGetItem(item.itemId), (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    let resultItem = $.parseXML(result.value);
                    let addProps = resultItem.getElementsByTagName("AdditionalProperties");
                    if(!addProps) {
                        //Behaves different in IE... needs prefix.
                        addProps = resultItem.getElementsByTagName("t:AdditionalProperties");
                    }
                    console.log('Result', addProps, result.value);
                    resolve(addProps);
                } else {
                    reject(new Error('Error Making Ews Request'));
                }
            });
        });

    }

    private getRequestContentGetItem(id) {
        // Return a GetItem operation request for the subject of the specified item. 
        var result =
            '<?xml version="1.0" encoding="utf-8"?>' +
            '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
            '               xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
            '               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
            '               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">' +
            '  <soap:Header>' +
            '    <RequestServerVersion Version="Exchange2013" xmlns="http://schemas.microsoft.com/exchange/services/2006/types" soap:mustUnderstand="0" />' +
            '  </soap:Header>' +
            '  <soap:Body>' +
            '    <GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">' +
            '      <ItemShape>' +
            '        <t:BaseShape>IdOnly</t:BaseShape>' +
            '        <t:AdditionalProperties>' +
            '            <t:FieldURI FieldURI="item:Subject"/>' +
            '            <t:ExtendedFieldURI DistinguishedPropertySetId="PublicStrings"  PropertyName="yasoonExternalData"  PropertyType="String" />' +
            '            <t:ExtendedFieldURI DistinguishedPropertySetId="PublicStrings"  PropertyName="yasoonExternalId"  PropertyType="String" />' +
            '            <t:ExtendedFieldURI DistinguishedPropertySetId="PublicStrings"  PropertyName="yasoonAppNamespace"  PropertyType="String" />' +
            '        </t:AdditionalProperties>' +
            '      </ItemShape>' +
            '      <ItemIds><t:ItemId Id="' + id + '"/></ItemIds>' +
            '    </GetItem>' +
            '  </soap:Body>' +
            '</soap:Envelope>';
        return result;
    }
}


Office.initialize = function (reason) {
    $(function () {
        jiraApp = new JiraApp();

        if(!jiraApp.yasoonUser) {
            return jiraApp.loadHtmlModule('yasoonLogin');
        }

    });
};