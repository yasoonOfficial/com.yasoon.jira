var jira = {};

$(function () {
	$('body').css('overflow-y', 'hidden');
	$('form').on('submit', function(e) {
		e.preventDefault();
		return false;
	});
});

yasoon.dialog.load(new function () { //jshint ignore:line
	var self = this;
	jira = this;

	this.init = function (initParams) {
		var ownUser = yasoon.contact.getOwnUser();
		$('#FirstName').text(ownUser.contactFirstName);

		yasoon.store.getOwnCompany(function (company) {
			console.log('Company', company);
			var admin = null;
			var isAdmin = false;
			if (company && company.admins && company.admins.length > 0) {
				company.admins.forEach(function (item) {
					if (item.role == 6) {
						admin = item;
					}
					if (item.emailAddress == ownUser.contactEmail) {
						isAdmin = true;
						return false;
					}
				});

				if (isAdmin) {
					$('.isAdmin').removeClass('hidden');
					$('#buyLicenses').click(function () {
						yasoon.openBrowser('https://store.yasoon.com/#/main/company/own/tabPayments');
					});
				} else if (admin) {
					$('.isNoAdmin').removeClass('hidden');
					$('.isAdminKnown').removeClass('hidden');
					$('#AdminName').text(admin.firstName + ' ' + admin.lastName);
					$('#AdminEmail').attr('href', 'mailto:' + admin.emailAddress).text(admin.emailAddress);
				}
			}
		});
	}; 

}); //jshint ignore:line

//@ sourceURL=http://Jira/Dialog/purchaseDialog.js