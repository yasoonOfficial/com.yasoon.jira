/// <reference path="../../js/functions.ts" />
import * as $ from 'jquery';
import 'office-js';
import * as ko from 'knockout';

class YasoonLogin {
    displayName: KnockoutObservable<string>;
    emailAddress: KnockoutObservable<string>;
    notRegistered: KnockoutObservable<boolean>;
    constructor() {
        this.displayName = ko.observable(Office.context.mailbox.userProfile.displayName);
        this.emailAddress = ko.observable(Office.context.mailbox.userProfile.emailAddress);

        this.notRegistered = ko.observable(true);
    }



}