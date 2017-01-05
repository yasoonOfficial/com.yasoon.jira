var jira = null;

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
		var baseUrl = initParams.baseUrl;
		$('#FirstName').text(ownUser.contactFirstName);

		yasoon.store.getOwnCompany(function (company) {
			console.log('Company', company);
			var admin = null;
			var isAdmin = false;
			var isAdminServer = false;
			if (company && company.admins && company.admins.length > 0) {
				company.admins.forEach(function (item) {
					if (item.role == 6) {
						admin = item;
					}
					if (item.emailAddress == ownUser.contactEmail){
						isAdmin = true;
						isAdminServer = !jiraIsCloud(baseUrl);
						return false;
					}
				});

				$('.mailSupport').click(function () {
					yasoon.openBrowser('mailto:contact@yasoon.de');
				});

				if (isAdmin && isAdminServer) {
					$('.isAdminServer').removeClass('hidden');
					$('#buyLicenses').click(function () {
						yasoon.openBrowser('https://store.yasoon.com/#/main/company/own/tabPayments');
					});
					$('#openSettings').click(function () {
						yasoon.openBrowser('https://store.yasoon.com/#/main/company/own/tabSettings');
					});
				} else if(isAdmin && !isAdminServer) {
					$('.isAdminCloud').removeClass('hidden');
					$('#OpenAddonPage').click(function () {
						yasoon.openBrowser(baseUrl + '/plugins/servlet/upm');
					});
					$('#openSettings').click(function () {
						yasoon.openBrowser('https://store.yasoon.com/#/main/company/own/tabSettings');
					});
					$('#buyLicensesCloud').click(function () {
						yasoon.openBrowser(baseUrl + '/plugins/servlet/upm');
					});
				} else if (admin) {
					$('.isNoAdmin').removeClass('hidden');
					$('.isAdminKnown').removeClass('hidden');

					$('#AdminName').text(admin.firstName + ' ' + admin.lastName);
					$('#AdminEmail').text(admin.emailAddress).click(function () {
						yasoon.openBrowser('mailto:' + admin.emailAddress);
					});
					$('#SendMailAdmin').click(function() {
						yasoon.openBrowser('mailto:' + admin.emailAddress);
					});
				}
			}
		});
	}; 

}); //jshint ignore:line

//@ sourceURL=http://Jira/Dialog/purchaseDialog.js