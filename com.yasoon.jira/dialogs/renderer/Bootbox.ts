declare var bootbox;

class Bootbox {
    static confirm(options): Promise<any> {
        return new Promise((resolve, reject) => {
            let optionsInt: any = {
                size: 'large',
                backdrop: false,
                message: options.message,
                className: 'jira-modal',
                callback: function (ok) {
                    var checkState = $('#checkboxConfirm').prop("checked");
                    resolve({
                        checkbox: checkState,
                        ok: ok
                    });
                },
                buttons: {
                    cancel: {
                        label: options.secondary,
                        className: "btn-secondary"
                    },
                    confirm: {
                        label: options.primary,
                        className: "btn-primary"
                    },
                }
            };

            if (options.checkbox) {
                optionsInt.checkbox = {
                    id: 'checkboxConfirm',
                    label: options.checkbox
                };
            }

            bootbox.confirm(optionsInt);
        });
    }

    static showDialog(title, message, init): any {
        let dialog = bootbox.dialog({
            title: title,
            message: message
        });
        dialog.init(init);

        return dialog;
    }
}