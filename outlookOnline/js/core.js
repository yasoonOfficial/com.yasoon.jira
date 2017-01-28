/// <reference path="functions.ts" />
/// <reference path="../definitions/yasoonOnline.d.ts" />
//import * as $ from 'jquery';
//import 'office-js';
var jiraApp = null;
var yasoonUserKey = 'user';
var JiraApp = (function () {
    function JiraApp() {
        //this.yasoonUser = this.loadRoamingSettings(yasoonUserKey);
        this.storeUrl = 'http://localhost:1337';
    }
    JiraApp.prototype.loadRoamingSettings = function (key) {
        return Office.context.roamingSettings.get(key);
    };
    JiraApp.prototype.saveSettings = function (key, value) {
        Office.context.roamingSettings.set(key, value);
        Office.context.roamingSettings.saveAsync();
    };
    JiraApp.prototype.loadHtmlModule = function (key) {
        $('body').load('components/' + key + '/' + key + '.html', function () {
            $.getScript('components/' + key + '/' + key + '.js');
        });
    };
    JiraApp.prototype.getYasoonItemData = function () {
        var _this = this;
        var item = Office.context.mailbox.item;
        return new Promise(function (resolve, reject) {
            Office.context.mailbox.makeEwsRequestAsync(_this.getRequestContentGetItem(item.itemId), function (result) {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    var resultItem = $.parseXML(result.value);
                    var addProps = resultItem.getElementsByTagName("AdditionalProperties");
                    if (!addProps) {
                        //Behaves different in IE... needs prefix.
                        addProps = resultItem.getElementsByTagName("t:AdditionalProperties");
                    }
                    console.log('Result', addProps, result.value);
                    resolve(addProps);
                }
                else {
                    reject(new Error('Error Making Ews Request'));
                }
            });
        });
    };
    JiraApp.prototype.getRequestContentGetItem = function (id) {
        // Return a GetItem operation request for the subject of the specified item. 
        var result = '<?xml version="1.0" encoding="utf-8"?>' +
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
    };
    return JiraApp;
}());
var consumer = {
    key: 'yasoonjira',
    secret: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDn5d6LgnJeV9Ho\nH8F+pTfsQV5w3JUfbwqhGOA4ClPe13gAoiE9w7mw9Y5CTNbKaIVJqkQ734KiVEzo\nRlBrFi5b3XznNR3SbC4BJfqul47a/NSi2J5MzpOBqNlg4uA5cLvMwAd+5mGT+Mt/\nF0k0CrEoafZ5Jj88d8JObIKug2jmd27alYT7mYs6r9w783Lcdz9vkkSRsD7rFnAD\nyoU06J7laxjRhDjrYj3YVLV7eXYSRFmfskDStrwE3sufBLJyEvbFyNEDBRPaixx1\n90m512mcVEx0MS4U++NpS6a6YWiMbaaWygLts2PZWHw4XWOvVvPXN9Kt+o7X9HOj\n5QQEMl/TAgMBAAECggEBAI2uozanf4rmqwfghw8CkNVW5wWbr7yh0mO02CFFJhML\noHT6mcar08MrdDxLyBuomm70iXXvTFgzmz164F1dEvvrqgl1KYBLuhvXgX60eIKR\nYLUSFj2lJPheGloYo5hUqVkipjHBPjLzGhnPN1mFgtHHU+CXHqGqJdxWbc2D2k6b\n1iK1QspzlgFhvcnk+tUrSGIJB7y/DiLj9FeuSGflF5yIFDaGjFbY3hjBA68hsa5M\nnXB06SoHy3yf+T9L0XviirtsJ9N/8zZSnBOCrygZCMPUymQXlTq4xTNEicM+FKBy\ngBBfoewVvB9rZ0t5PXq3RiIz2lUBDlZ9hbwoeaQGX8ECgYEA+LYTfUDSlpT+86Nj\nipZ6Xy6MdrZVhrJyuM8+NfMYYdjzH46cbRXylrAWufCw80kv1CKFYLXZx8O+jNG4\nGMn37eEXvV30ePhzNIhen+nKNCNVjW/bhWmemwmpEkviTi2ZjugiVp1pZFYx1zzZ\nYQAPHHq0Aud1tHEVvnpEyvq7V+ECgYEA7rGnTQEid/F5ZKgebojp5Y77UgEic56y\nkO4Wmw6AufDRp/vmv6HsPg7IX1E7wQNPTfE20DMoRaJHH+t9GI5BuVO9fcCsVqNF\nw3wVDMqB27JcJYe7npdkKZ1NMfRryGjSFOopJRgS3BQu1HRhXv/8l2Kw6FcKU7Hf\nU45O+4kDnjMCgYA+1GBgB/wrJkCx89i1rgYD/ZJmevFoMbRhk5k3r829Cj2A/1nt\nBNpfzuQu3OsWyqpWgNII+Gen239Lu78yI/OKGI8Su6WC2eDgqIKfC0SVn0eBj3x5\nW5FBwVMA2EK3VTWxsFrcXq+9NTkqEqknpAgtPaI0CZzmlJrVn7W5QVYKgQKBgCbC\nblpQvtofOgkgS6DDVsfSCfls+b0wnepu3vjayAhplIHko7mmf4gsOllQBZX4BZ6w\ndqgkRnvYOBh00uFz6DRB5tlOui1vYdq2gWyMTb3xHolxmwPLrZYcVvavq/jlHIgM\n5hWB7T4TgO863rzgcJHcksGHsMOadJtK1oR94TqFAoGAXVKCGO/pZMhTwEpQlIZb\nNoph+TN79f6B29ej8quQyAXZ5Z3c9XAaCQ2WW3MFnI4H9Nv1vFSTxY/8X0UdY6R3\nkl40LP6vIqCmY+wvhnY+NHk89b6BQTsGdxr1H6OUXadRwViHqkt7OiPzEk08Wm8P\ndhTq0e2gd6+emqjWsCSFNi0=\n-----END PRIVATE KEY-----"
};
function hashFunction(baseString, key) {
    //Der key der hier reinkommt ist encoded :S Können wir nicht im sig.init verwenden...
    console.log('Hash Function key', decodeURI(key));
    debugger;
    var sig = new KJUR.crypto.Signature({ "alg": "SHA1withRSA" });
    // initialize for signature generation
    sig.init("-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDn5d6LgnJeV9Ho\nH8F+pTfsQV5w3JUfbwqhGOA4ClPe13gAoiE9w7mw9Y5CTNbKaIVJqkQ734KiVEzo\nRlBrFi5b3XznNR3SbC4BJfqul47a/NSi2J5MzpOBqNlg4uA5cLvMwAd+5mGT+Mt/\nF0k0CrEoafZ5Jj88d8JObIKug2jmd27alYT7mYs6r9w783Lcdz9vkkSRsD7rFnAD\nyoU06J7laxjRhDjrYj3YVLV7eXYSRFmfskDStrwE3sufBLJyEvbFyNEDBRPaixx1\n90m512mcVEx0MS4U++NpS6a6YWiMbaaWygLts2PZWHw4XWOvVvPXN9Kt+o7X9HOj\n5QQEMl/TAgMBAAECggEBAI2uozanf4rmqwfghw8CkNVW5wWbr7yh0mO02CFFJhML\noHT6mcar08MrdDxLyBuomm70iXXvTFgzmz164F1dEvvrqgl1KYBLuhvXgX60eIKR\nYLUSFj2lJPheGloYo5hUqVkipjHBPjLzGhnPN1mFgtHHU+CXHqGqJdxWbc2D2k6b\n1iK1QspzlgFhvcnk+tUrSGIJB7y/DiLj9FeuSGflF5yIFDaGjFbY3hjBA68hsa5M\nnXB06SoHy3yf+T9L0XviirtsJ9N/8zZSnBOCrygZCMPUymQXlTq4xTNEicM+FKBy\ngBBfoewVvB9rZ0t5PXq3RiIz2lUBDlZ9hbwoeaQGX8ECgYEA+LYTfUDSlpT+86Nj\nipZ6Xy6MdrZVhrJyuM8+NfMYYdjzH46cbRXylrAWufCw80kv1CKFYLXZx8O+jNG4\nGMn37eEXvV30ePhzNIhen+nKNCNVjW/bhWmemwmpEkviTi2ZjugiVp1pZFYx1zzZ\nYQAPHHq0Aud1tHEVvnpEyvq7V+ECgYEA7rGnTQEid/F5ZKgebojp5Y77UgEic56y\nkO4Wmw6AufDRp/vmv6HsPg7IX1E7wQNPTfE20DMoRaJHH+t9GI5BuVO9fcCsVqNF\nw3wVDMqB27JcJYe7npdkKZ1NMfRryGjSFOopJRgS3BQu1HRhXv/8l2Kw6FcKU7Hf\nU45O+4kDnjMCgYA+1GBgB/wrJkCx89i1rgYD/ZJmevFoMbRhk5k3r829Cj2A/1nt\nBNpfzuQu3OsWyqpWgNII+Gen239Lu78yI/OKGI8Su6WC2eDgqIKfC0SVn0eBj3x5\nW5FBwVMA2EK3VTWxsFrcXq+9NTkqEqknpAgtPaI0CZzmlJrVn7W5QVYKgQKBgCbC\nblpQvtofOgkgS6DDVsfSCfls+b0wnepu3vjayAhplIHko7mmf4gsOllQBZX4BZ6w\ndqgkRnvYOBh00uFz6DRB5tlOui1vYdq2gWyMTb3xHolxmwPLrZYcVvavq/jlHIgM\n5hWB7T4TgO863rzgcJHcksGHsMOadJtK1oR94TqFAoGAXVKCGO/pZMhTwEpQlIZb\nNoph+TN79f6B29ej8quQyAXZ5Z3c9XAaCQ2WW3MFnI4H9Nv1vFSTxY/8X0UdY6R3\nkl40LP6vIqCmY+wvhnY+NHk89b6BQTsGdxr1H6OUXadRwViHqkt7OiPzEk08Wm8P\ndhTq0e2gd6+emqjWsCSFNi0=\n-----END PRIVATE KEY-----"); // rsaPrivateKey of RSAKey object
    // update data
    sig.updateString(baseString);
    // calculate signature
    return hexToBase64(sig.sign());
}
function hexToBase64(str) {
    return btoa(String.fromCharCode.apply(null, str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" ")));
}
//Office.initialize = function (reason) {
$(function () {
    jiraApp = new JiraApp();
    var oauth = OAuth({
        consumer: consumer,
        signature_method: 'RSA-SHA1',
        hash_function: hashFunction,
        last_ampersand: false
    });
    var data = {
        url: 'https://f0dfce03.ngrok.io/plugins/servlet/oauth/request-token',
        method: 'POST',
        data: {
            oauth_callback: 'oob'
        }
    };
    $.ajax({
        url: data.url,
        type: data.method,
        data: oauth.authorize(data)
    }).done(function (data) {
        //process your data here 
        console.log(data, arguments);
    })
        .fail(function (e) {
        console.log(arguments);
    });
    // if (!jiraApp.yasoonUser) {
    //     return jiraApp.loadHtmlModule('yasoonLogin');
    // }
});
//}; 
