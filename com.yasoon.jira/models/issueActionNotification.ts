/// <reference path="../definitions/yasoon.d.ts" />
/// <reference path="notification.ts" />

class JiraIssueActionNotification extends JiraNotification {

	constructor(private event: any) {
		super();
	}

	isSyncNeeded() {
		return true;
	}

	renderBody(feed) {
		var html;
		if (this.event.type === 'IssueComment') {
			html = '<span>' + this.event.renderedComment.body + '</span>';
		} else if (this.event.title) {
			html = '<span>' + this.event.title['#text'] + '</span>';
			var title = null;
			if (this.event.content) {
				title = $('<div></div>').html(this.event.content['#text']).text().trim().replace(/>/g, '&gt;');
				if (!title && this.event['activity:object']) {
					if ($.isArray(this.event['activity:object'])) {
						//Can be an array (e.g. if mutiple files has been uploaded at once.
						title = '';
						this.event['activity:object'].forEach((elem) => {
							if (title)
								title += ', ';

							title += elem.title['#text'].trim();
						});

					} else {
						title = this.event['activity:object'].title['#text'].trim();
					}
				}
			}
			if (title)
				html += '<span class="small yasoon-tooltip" style="cursor:pointer;" data-toggle="tooltip" data-html="true" title="' + title + '">( <i class="fa fa-exclamation-circle"></i> ' + yasoon.i18n('feed.more') + ')</span>';
		} else {
			yasoon.util.log('Coulnd\'t determine title for:' + JSON.stringify(this.event), yasoon.util.severity.error);
		}
		feed.setContent(html);
	}

	setProperties(feed) {
		var iconHtml = null;
		var obj = JSON.parse(feed.externalData);
		if (obj.category) {
			if (obj.category['@attributes'].term === 'created') {
				iconHtml = '<i class="fa fa-plus-circle" style="color:grey;"></i>';
			} else if (obj.category['@attributes'].term === 'started') {
				iconHtml = '<i class="fa fa-caret-square-o-right" style="color:grey;"></i>';
			} else if (obj.category['@attributes'].term === 'started') {
				iconHtml = '<i class="fa fa-caret-square-o-right" style="color:grey;"></i>';
			}
		}
		if (!iconHtml && obj['activity:verb']) {
			var activityLookup = {};
			//Convert Datatstructure. Can be either a single object or array :(
			if (obj['activity:verb'].length > 1) {
				for (var i = 0, len = obj['activity:verb'].length; i < len; i++) {
					activityLookup[obj['activity:verb'][i]['#text']] = obj['activity:verb'][i];
				}
			} else if (obj['activity:verb'].length === 1) {
				activityLookup[obj['activity:verb']['#text']] = obj['activity:verb'];
			}

			//Now check for value
			if (activityLookup['http://streams.atlassian.com/syndication/verbs/jira/transition']) {
				iconHtml = '<i class="fa fa-cog" style="color:grey;"></i>';
			} else if (activityLookup['http://activitystrea.ms/schema/1.0/update'] && obj['activity:verb'].length === 1) {
				iconHtml = '<i class="fa fa-pencil" style="color:grey;"></i>';
			}
		}

		if (!iconHtml) {
			iconHtml = '<i class="fa fa-info-circle" style="color:grey;"></i>';
		}
		feed.setIconHtml(iconHtml);
	}

	renderTitle(feed) {

	}

	save() {
		return Promise.resolve()
			.then(() => {
				//Get issue
				var issueKey = '';
				if (this.event.type === 'IssueComment')
					issueKey = this.event.issue.id;
				else
					issueKey = (this.event['activity:target']) ? this.event['activity:target'].title['#text'] : this.event['activity:object'].title['#text'];

				return jira.issues.get(issueKey);
			})
			.then((issue) => {
				this.event.issue = issue;
				if (!this.isSyncNeeded()) {
					return;
				}
				//Save Issue first
				return jira.notifications.createNotification(this.event.issue).save();
			})
			.then((notif) => {
				if (!notif) {
					return;
				}
				//Save Activity Notification
				var isComment = (this.event.category && this.event.category['@attributes'].term === 'comment');
				var comment = null;
				if (isComment && this.event.issue.fields.comment) {
					comment = this.event.issue.fields.comment.comments.filter((c: JiraComment) => {
						//Fake Action has commentId Attribute
						if (this.event.commentId) {
							return this.event.commentId === c.id;
						} else {
							//Standard ones only have them in the URL!
							return (this.event['activity:object'].link['@attributes'].href.indexOf('comment-' + c.id) > -1);
						}
					})[0];
				}
				//this.event.id can be null :o 
				var externalId = '';
				if (comment && comment.id) {
					externalId = 'c' + comment.id;
				} else if (this.event.id) {
					externalId = this.event.id['#text'];
				} else {
					var logObj = JSON.parse(JSON.stringify(this.event));
					delete logObj.issue;
					yasoon.util.log('Action found that is neither an comment, nor an normal activity:' + JSON.stringify(logObj), yasoon.util.severity.error);
					return;
				}

				return jiraGetNotification(externalId)
					.then((yEvent) => {
						if (isComment) {
							jiraLog('Save Comment');
							return this.saveComment(yEvent, notif, comment);
						} else {
							jiraLog('Save Action');
							return this.saveAction(yEvent, notif);
						}
					});
			});
	}

	saveComment(yEvent, parent, comment) {
		var creation = false;
		if (!comment) {
			//Timing Issue! Comment has been retrieved via feed, but not via Rest API.
			yasoon.util.log('Comments inconsistency! Comment retrieved by feed but not via REST API.', yasoon.util.severity.error);
			return;
		}
		jiraLog('Comment Save', { event: yEvent, parent: parent });
		if (!yEvent && parent) {
			//New Notification
			yEvent = {};
			creation = true;
		} else {
			//not new - update needed?
			if (!comment || yEvent.createdAt >= new Date(comment.updated)) {
				return;
			}
		}

		////Update Author
		jira.contacts.update(comment.updateAuthor);

		//Determine Renderd Comment
		var renderedComment = this.event.issue.renderedFields.comment.comments.filter((c: JiraComment) => { return c.id === comment.id; })[0];

		yEvent.parentNotificationId = parent.notificationId;
		yEvent.externalId = 'c' + comment.id;
		//"Render" title for desktop notification
		yEvent.title = yasoon.i18n('notification.commentedOn', {
			name: comment.updateAuthor.displayName,
			text: this.event.issue.fields.summary
		});
		yEvent.content = (renderedComment.body) ? renderedComment.body : yasoon.i18n('notification.noContent');
		yEvent.contactId = comment.updateAuthor.name;
		yEvent.createdAt = new Date(comment.updated);
		yEvent.type = 1;

		yEvent.externalData = JSON.stringify({
			comment: comment,
			renderedComment: renderedComment,
			type: 'IssueComment'
		});
		if (creation) {
			return jiraAddNotification(yEvent)
				.then((newNotif) => {
					jira.notifications.addDesktopNotification(newNotif, this.event);
				});
		} else {
			return jiraSaveNotification(yEvent)
				.then((newNotif) => {
					jira.notifications.addDesktopNotification(newNotif, this.event);
				});
		}
	};

	saveAction(yEvent, parent) {
		var creation = false;
		if (!yEvent && parent) {
			//New Notification
			yEvent = {};
			creation = true;
		} else if (yEvent.createdAt >= new Date(this.event.updated['#text'])) {
			return;
		}

		//Update Author
		jira.contacts.update({
			displayName: (this.event.author.name) ? this.event.author.name['#text'] : '',
			name: (this.event.author['usr:username']) ? this.event.author['usr:username']['#text'] : '',
			emailAddress: (this.event.author.email) ? this.event.author.email['#text'] : '',
			avatarUrls: { '48x48': ((this.event.author.link && this.event.author.link[1]) ? this.event.author.link[1].href : '') }
		});

		yEvent.parentNotificationId = parent.notificationId;
		yEvent.externalId = this.event.id['#text'];
		yEvent.title = $('<div>' + this.event.title['#text'] + '</div>').text();
		yEvent.content = (yEvent.title) ? yEvent.title : yasoon.i18n('notification.noContent');
		yEvent.contactId = (this.event.author['usr:username']) ? this.event.author['usr:username']['#text'] : '';
		yEvent.createdAt = new Date(this.event.updated['#text']);
		yEvent.type = 2;
		yEvent.isRead = (yEvent.contactId == jira.data.ownUser.key);

		this.event.type = 'IssueAction';

		///* Clear unused data to save DB space*/
		let minEvent: any = jiraMinimizeIssue(this.event); // Performance Intensive but nessecary. Never change original object
		delete minEvent.issue.fields;
		delete minEvent.issue.renderedFields;
		delete minEvent.issue.transitions;
		delete minEvent.link;

		yEvent.externalData = JSON.stringify(minEvent);
		if (creation) {
			return jiraAddNotification(yEvent)
				.then((newNotif) => {
					jira.notifications.addDesktopNotification(newNotif, minEvent);
				});
		} else {
			return jiraSaveNotification(yEvent)
				.then((newNotif) => {
					jira.notifications.addDesktopNotification(newNotif, minEvent);
				});
		}
	}

}