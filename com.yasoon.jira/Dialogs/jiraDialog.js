var jira = {};

$(function () {
    $('body').css('overflow-y', 'hidden');

    yasoon.dialog.load(new function () {
        var self = this;
        jira = this;


        self.init = function () {
            new AJS.SingleSelect({
                element: $("#project"),
                itemAttrDisplayed: "label",
                errorMessage: AJS.params.singleselectComponentsError
            });

            new AJS.SingleSelect({
                element: $("#issuetype"),
                itemAttrDisplayed: "label",
                errorMessage: AJS.params.singleselectComponentsError
            });

            new AJS.SingleSelect({
                element: $("#priority"),
                itemAttrDisplayed: "label",
                errorMessage: AJS.params.singleselectComponentsError
            });

            new AJS.SingleSelect({
                element: $("#assignee"),
                itemAttrDisplayed: "label",
                errorMessage: AJS.params.singleselectComponentsError
            });

        };
    });

});

