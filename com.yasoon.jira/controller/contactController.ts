/// <reference path="../definitions/yasoon.d.ts" />
/// <reference path="../definitions/jira.d.ts" />
declare var jira: any;

class JiraContactController {
	buffer = [];

	update(actor) {
		if (jiraIsCloud(jira.settings.baseUrl)) {
			actor.name = actor.accountId;
			actor.key = actor.accountId;
		}

		if (!actor.name || !actor.displayName || !actor.emailAddress)
			return;

		var c = yasoon.contact.get(actor.name);
		var dbContact = null;
		var avatarUrl = null;
		if (actor.avatarUrls && actor.avatarUrls['48x48']) {
			avatarUrl = actor.avatarUrls['48x48'].replace('size=large', 'size=xlarge');
		}
		if (!c) {
			var newContact: yasoonModel.Contact = {
				contactId: actor.name,
				contactLastName: actor.displayName,
				contactEmail: actor.emailAddress,
				externalData: JSON.stringify(actor),
				externalAvatarUrl: avatarUrl,
				useAuthedDownloadService: jira.settings.currentService
			};
			jiraLog('New Contact created: ', newContact);
			dbContact = yasoon.contact.add(newContact);
			this.buffer.push(dbContact);

		} else {
			//We don't want to override an existing avatrUrl with null
			if (!avatarUrl)
				avatarUrl = c.externalAvatarUrl;

			if (c.contactId != actor.name ||
				c.contactLastName != actor.displayName ||
				c.contactEmail != actor.contactEmailAddress ||
				c.externalAvatarUrl != avatarUrl) {

				var updContact = {
					contactId: actor.name,
					contactLastName: actor.displayName,
					contactEmailAddress: actor.emailAddress,
					externalData: JSON.stringify(actor),
					externalAvatarUrl: avatarUrl,
					useAuthedDownloadService: jira.settings.currentService
				};

				yasoon.contact.save(updContact);
			}
		}
	}

	updateOwn(ownUser) {
		var avatarUrl = null;
		if (ownUser.avatarUrls && ownUser.avatarUrls['48x48']) {
			avatarUrl = ownUser.avatarUrls['48x48'].replace('size=large', 'size=xlarge');
		}
		var c = yasoon.contact.getOwnUser();

		if (!c)
			return;

		//We don't want to override an existing avatrUrl with null
		if (!avatarUrl)
			avatarUrl = c.externalAvatarUrl;

		var oldOwnUser: JiraUser = {};
		if (c.externalData)
			oldOwnUser = JSON.parse(c.externalData);

		if (ownUser.displayName != oldOwnUser.displayName || c.externalAvatarUrl != avatarUrl) {
			//Admins may have [Administrator] added to their name. Maybe there are more roles

			var cleanName = ownUser.displayName.replace(/\[.*\]/g, '').trim();
			var nameParts = cleanName.split(' ');
			var firstName = '';
			var lastName = '';

			if (nameParts.length === 1) {
				lastName = cleanName;
			}
			else {
				lastName = nameParts[nameParts.length - 1];
				firstName = cleanName.replace(lastName, '').trim();
			}

			c.externalAvatarUrl = avatarUrl;
			c.useAuthedDownloadService = jira.settings.currentService;
			c.contactFirstName = firstName;
			c.contactLastName = lastName;
			c.externalData = JSON.stringify(ownUser);
			yasoon.contact.updateOwnUser(c);
			yasoon.setup.updateProfile(JSON.stringify({ firstName: firstName, lastName: lastName }));
		}
	}

	get(id) {
		var result = this.buffer.filter((c) => c.contactId === id);
		if (result.length === 1) {
			return result[0];
		} else {
			let res = yasoon.contact.get(id);
			if (res && res.contactId) {
				this.buffer.push(res);
			}
			return res;
		}
	}
}
