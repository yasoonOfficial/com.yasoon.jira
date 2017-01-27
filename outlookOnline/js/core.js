"use strict";
var $ = require("jquery");
require("office-js");
var JiraApp = (function () {
    function JiraApp() {
    }
    return JiraApp;
}());
$(function () {
    Office.initialize = function (reason) {
        console.log('Reason?!', arguments);
        console.log(window.location);
    };
});
