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
    secret: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQClB+QzljpSGZR/\noOI9qYdR4IaGNisj1fJPWw3EnuqVuightVpZkvLWooZOFpOvapMlc/DYvP2I6oHA\nQHlOql/Qx9v6v1Z8INtw6ZdSAwAC6OQyzUsPCb4+ol2mVS8x2RQZdOb428XNctsF\n4GrHs+myyZeaGsTATCOdfHFVN6rytIOE7KinkZcAM1eV/QsuMzgOF4pCtCrEIzYD\nzpw7TXi44o/TAKRDC4KUNEuFbcso6WxFp1sOIQWqFnC9aD1t4TrTLPpkBS1GTbkX\nSU0pG7Ty4SINZm8WrvmXvzfnqZy+ENlUZPufC6kmJc98q1aODtOVf04DZbC5VhSV\nOG5tKcH/AgMBAAECggEBAIFxKyD7WEtFHSDuRAYxjp4+CcYDftrg2Oo9dRMfwsgl\n94xY/sD7bdXELKvbMYOJiFj8E5Esy4A00AjHiV6WbAkKehS3N1KtQvHRhoshJ0Ug\n/ryKIbFt5vahy+rHLflfV1CQTQos930p9XkqiRaSm19Ml8ib7m8WSWkhTpOU0lUC\n1o47uW8xtjnprv+JYJUOj/g4TlbxdM7ZBcivhYYHm5KdMkr9v8nb6IH3v4t44agQ\n3GVorpn6kNhtghG2yXuMtVYdnevXWTidtAhhBImb7+jgbVm8CS9WhtftY4BaOezD\ncHcEwwr2qwyUQqO6xur5QmOw0gdz+P5AGNZLGkokrKECgYEA2lmFpPqodXzd2u4Y\nZa7nVtAIGv7uFSPYDGK7JrJlOQ+5XKIhBw33sFQUStZdphPcXE3BjVs2gYqcv96B\nMAYUuV6ICkGbZPj/t3M8Wx4sWBYCYDIQ1+Ax4M8ll3FfTXjbzp8EBHZmOwHM/Ui5\nPjoFXjW3Ms3vt0VjeV/8gM0VgXsCgYEAwXy/NGMCZzJ/GLpWeOw07RnsQxCJ9xsx\n3DqjPDcltzu2knhog8VIzGJtU7eG9z16NIgEnuRfiSXgyaLMOSjRnvGr3sa7boow\nALG1/MRQY3jtOnw/C8Brp8gUvTgCgR3lodBsxKQ0keIiXKvXRMhK+Hyrpqv6hilC\ngzESK/NkcE0CgYEAu5n3DYyfeHJUW2n+ZD8mXJxYmnk2LcuiMOITUmgsOB6ecEyM\ne/cwPLvAw5vy0mJ2DohwJ/eamSpzCxctgAl5fNsPn2BHFzYo34GO9eqyxuwCFoxt\nlEz4DeNstPWfoHyavqg5V2wy4bfmXChDoIdRXWRhhrERqTFhCkPCOxf5xkkCgYBU\nNmNR/bXSDJxcut1gDA6NE7dNCSnDL0boP21EjAwSUB8KaPW0RG2G52AGC97mRQ+n\nRXwdW/Bo1N+dYwnX5vg1YaIYeA6j8ekqpC49MYR7hupZhjI6fylcAS1lnbcZU1Xa\ns8hjXcSzqeSiyPgMq9BVjo13IWsMcXDNgNIT5v9UEQKBgQCvNE/iZn/kOO7Fi9kv\np0+JibTho/9LmH1lmrS9bh2YLq25iEM5LQV6A6++5Wojpt1LWLC0cd++ogfAJAob\nDR+SHcaSRklfYEOaTn2P50DsnJNnxDc3PrMf3X8hd0vB2n8cE2GsXWwi/XqhByWO\ne5vC/QpWYm+HETBmFTgVmN0tSQ==\n-----END PRIVATE KEY-----"
};
function hashFunction(baseString, key) {
    //Der key der hier reinkommt ist encoded :S Können wir nicht im sig.init verwenden...
    console.log('Hash Function key', decodeURI(key));
    debugger;
    var sig = new KJUR.crypto.Signature({ "alg": "SHA1withRSA" });
    // initialize for signature generation
    sig.init("-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDO5xVBoQ+umzly\np/EChGrxwDFSMBheMVyTqxUVkiDRRriUbUHh8rHhOvcasIfPXvV1+hFuqhF7dviM\nCL22hRkZFaHRCHxZsiNI1+yktWgIpvn0ltb4SnyGBcwzpPs+1dU/z8Xiy0RrWYn2\n698v5gfgtAtEn1NlguKI3NvFzm7NmheXO6IQ2J+P/pVDQ8Ke+wkgEXYMX5/VhV1k\ngq256P4PPSsNA/iuA3j46xOshgvdA0OLc3pGf3w+SXqJ/cORuerwxrh7+dntOFTA\n7ZqC2zOmE5LT7xyuGPuYDMpQqo7QhoE5RDc3ZLdvYZeAzgCR06a8RobWlYzU37sS\n3QLCi2NnAgMBAAECggEASktmMZvREsTAWzB89YdxE4AM9dM5XNFiyc+8EXPYfu1j\nKEEXUDgisZrH0nijO86AW63BBrjg8DGnTDlzTg/7FCvVYEcox9iUnPqUCgzt33V9\n+dsUNDIjBskcK0tJwKVuHqzQBQEyf022ocjO6tcx6vkbtrdzbdcS20xbSms3FHJk\nOdFL2A0uop+AwLPP8oxTH/L9XwKaoZABCcYtXcbZvGbi/BOLvHuoftpICsgtvSVn\ny+LJFk6SNhsRDzQ2ZX79EmBxUUiggKJFIMvb6QlXodFaVbRt+qrGLWAqkBCwME1h\n2Eyl+RSaLtAYNjg01Cztplg9/yVujMI2nL3FT9IVsQKBgQDto+ePL2T5h/8lLMpL\nF6r0fzU1/3/Zw43C+FCwMahbAhFGAXQS9MCy6ta4XnP92OhDUzpgt60Q+bYMmdPD\n/6ilRjryIcfRA6gyLsNDISN7YPQYY36rJZaqfSCth9Onv5lLH84fTx4zkptCwZUo\nO1Lp0HogI7PJMz/j2XXsDaaKiQKBgQDe4z6ahNgaQe8xQJQReZTV0yC/ZGQA/Eee\nJTvHgsoJIYz6zWAv3sESSOxCnw6wC57vGtWVxtPOSTqSx7cmLlSleojGlXCC7o8E\nZMq+4+gqJ1PNKxpuj/lqInUPf+L2w3/OZlKB4xdSbTxv2jToFejxiWIdtjS8kbkK\ns3biKy5CbwKBgC7CBErhGW4buzE2WetikcmfyfmA90gCuT72mvHAI48cngd3O76L\nF+tcV7lZJFt7NWAh3SewnEXtzEs4bTlwcV9rrSd9TBKtNIgDOXpY5+Fb10uBMCg+\nsiGDk01xn0yvX1svu9/fMmMVYqVE77NF0O+ejJkMTVC2W8jaPeCfYvh5AoGAXpxh\nl5+qR8MTMHn0IFLWrck4DmYj2RM9p1CwxmirMCMQv+lr2gYZOJTBzSnNR0c3iNGA\nNlq2z8rf1Sx3fvqNrcyMwJbwsnNnO/s44LzHcRVOijmwt5vfyICl5hVoF003NDrU\n7ROjc7awv94FNTsPrW+euXP9gMnunS8+2JRxx3sCgYBJjNxT8ALKZGKVHVYBR+dC\nL1e0djEho4p/b18RD7w4FlGtfmJ/1/GAlDFv+Wn0sgSLPZfxQ2qUTylqT8sPsxxr\n1qC0h1leLHcTeU8dA1EMVWi/XSwVrJ/LjlACZS7JLuycTO4s2NAsRvIZtJtICrLN\n7brd5k6eijg3W9KgKdrh5g==\n-----END PRIVATE KEY-----"); // rsaPrivateKey of RSAKey object
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
        url: 'https://yasoonbox.synology.me:8080/plugins/servlet/oauth/request-token',
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
