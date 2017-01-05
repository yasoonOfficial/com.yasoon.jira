declare var bootbox;

class Confirmation {

    static show(options): Promise<any> {
        return new Promise((resolve, reject) => {
            let optionsInt: any = {
                size: 'large',
                backdrop: false,
                message: options.message,
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

}