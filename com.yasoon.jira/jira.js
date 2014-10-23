var jira = {};
yasoon.app.load("com.yasoon.jira", new function () {
	var self = this;
	jira = this;
	jira.CONST_HEADER = { 'Accept': 'application/json', 'Content-Type': 'application/json' };

	var firstTime = true;

	this.init = function () {
		jira.settings = new JiraSettingController();
		jira.notifications = new JiraNotificationController();
		jira.ribbons = new JiraRibbonController();
		jira.contacts = new JiraContactController();
		jira.issues = new JiraIssueController();


		yasoon.addHook(yasoon.setting.HookCreateRibbon, jira.ribbons.createRibbon);
		yasoon.addHook(yasoon.notification.HookRenderNotificationAsync, jira.notifications.renderNotification);
		yasoon.addHook(yasoon.feed.HookCreateUserComment, jira.notifications.addComment);
		yasoon.on("sync", jira.sync);
		yasoon.periodicCallback(300, jira.sync);
	};

	this.sync = function () {
		var startSync = new Date();

		var baseUrl = jira.settings.baseUrl+'/activity';
		var pull = function (url) {
			yasoon.oauth({
				url: url,
				oauthServiceName: 'auth',
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: jira.handleError,
				success: function (data) {
					var obj = jiraXmlToJson(new DOMParser().parseFromString(data, "text/xml"));
					console.log(obj);
					if (obj.feed.entry) {
						//Adjust Data
						if (!$.isArray(obj.feed.entry)) {
							obj.feed.entry = [obj.feed.entry];
						}
						$.each(obj.feed.entry, function (i, feed) {
							console.log(feed);
							//Only for jira!
							if (feed['atlassian:application'] && feed['atlassian:application']['#text'] === 'com.atlassian.jira') {
								var notif = jira.notifications.createNotification(feed);
								notif.save();
							}
						});

						//Determine if paging is required
						var lastObj = obj.feed.entry[obj.feed.entry.length - 1];
						var lastObjDate = new Date(lastObj.published['#text']);
						if (jira.settings.lastSync < lastObjDate) {
							pull(baseUrl + '?streams=update-date+BEFORE+' + (lastObjDate.getTime() - 1));
						} else {
							jira.settings.setLastSync(startSync);
						}
					} else {
						jira.settings.setLastSync(startSync);
					}
				}
			});
		};
		pull(baseUrl);
	};

	this.errorHandler = function (data, statusCode, result, errorText, cbkParam) {
		console.log(statusCode + ' || ' + errorText + ' || ' + result + ' || ' + data);
	};

	this.clickDropdown = function (event) {
		console.log('clicked!', event);
		event.preventDefault();
	};
});

function JiraSettingController() {
	var self = this;

	self.renderSettingsContainer = function (container) {
		var html = '';

		//Add Values
		var elem = $('<div>' + html + '</div>');
		$.each(github.settings, function (i, val) {
			if (elem.find('#' + i).attr('type') == "checkbox") {
				if (val == true) {
					elem.find('#' + i).attr('checked', true);
				}
			} else {
				elem.find('#' + i).val(val);
			}
		});
		//Add JS
		container.afterRender = function () { };
		container.setContent(elem.html());
	};

	self.saveSettings = function (form) {
		//Create deep copy
		$.each(form, function (i, param) {
			if (param.value == "true") {
				self[param.key] = true;
			} else if (param.value == "false") {
				self[param.key] = false;
			} else {
				self[param.key] = param.value;
			}
		});
		yasoon.setting.setAppParameter('settings', JSON.stringify(self));
	};

	self.setLastSync = function (date) {
	    self.lastSync = date;
	    //yasoon.setting.setAppParameter('lastSync', JSON.stringify(date));
	};

	/****** Initial Load of settings */
	var dateString = yasoon.setting.getAppParameter('lastSync');
	//if (dateString) {
	//	self.lastSync = JSON.parse(dateString);
	//} else {
		self.lastSync = new Date(1000);
	//}
	var urlString = yasoon.setting.getAppParameter('baseUrl');
	if (urlString) {
		self.baseUrl = urlString;
	}

	var settingsString = yasoon.setting.getAppParameter('settings');
	if (!settingsString) {
		//Initial Settings
		//yasoon.setting.setAppParameter('settings', JSON.stringify(self));

	} else {
		//Load Settings
		var settings = JSON.parse(settingsString);
		$.each(settings, function (key, value) {
			self[key] = value;
		});
	}
}

function JiraNotificationController() {
	var self = this;
	var notificationCounter = 0;
	var notification = null;

	// Custom Debounce 
	var bounce = debounce(function () {
		if (notification == null)
			return;

		if (notificationCounter == 1) {
			jiraLog('Single Desktop Notification shown: ', notification);
			var content = $('<div>' + notification.title + ' </div>').text();
			yasoon.notification.showPopup({ title: 'News on Jira', text: content, contactId: notification.contactId });
		} else {
			jiraLog('Multiple Desktop Notification shown!');
			yasoon.notification.showPopup({ title: "News on Jira", text: 'multiple new notifications' });
		}

		notificationCounter = 0;
		notification = null;
	}, 2000);

	self.addComment = function (parent, comment) {
		var body = JSON.stringify({
				"body": comment
		});

		var issue = JSON.parse(parent.externalData);

		yasoon.oauth({
			url: jira.settings.baseUrl+'/rest/api/2/issue/' + issue.key + '/comment',
			oauthServiceName: 'auth',
			headers: jira.CONST_HEADER,
			data: body,
			type: yasoon.ajaxMethod.Post,
			error: jira.handleError,
			success: function (data) {
				console.log(data);
				jira.sync();
			}
		});
	};

	self.createNotification = function (event) {
		var result = null;
		if (event.type) {
			if (event.type === 'issue') {
				result = new JiraIssueNotification(event);
			} else if (event.type === 'IssueAction') {
				result = new JiraIssueActionNotification(event);
			}
		} else {
			if (event['activity:target']) {
				if (event['activity:target']['activity:object-type']['#text'] === 'http://streams.atlassian.com/syndication/types/issue') {
					result = new JiraIssueActionNotification(event);
					result.addDeferred(jiraIssueGetter);
				}
			} else if (event['activity:object']) {
				if (event['activity:object']['activity:object-type']['#text'] === 'http://streams.atlassian.com/syndication/types/issue') {
					result = new JiraIssueActionNotification(event);
					result.addDeferred(jiraIssueGetter);
				}
			}
		}

		return result;
	};

	self.addDesktopNotification = function (event) {
		notificationCounter++;
		notification = event;
		bounce();
	};

	self.renderNotification = function (feed) {
		var event = self.createNotification(JSON.parse(feed.externalData));
		if (event != null) {
			feed.setContent(event.renderBody());
			feed.setTitle(event.renderTitle());
			event.setProperties(feed);
		}
		return feed;
	};
}

function JiraNotification() {
	this.createNotification = function () {
		
	};

	this.addDeferred = function (def) {
		this.deferreds.push(def);
	};

	this.executeDeferreds = function (callback) {
		allDeferred = [];
		var context = this;
		$.each(this.deferreds, function (i, def) {
			allDeferred.push(def.apply(context));
		});

		$.when.apply(this, allDeferred).then(callback);
	};
}

JiraIssueNotification.prototype = new JiraNotification();
function JiraIssueNotification(issue) {
	var self = this;
	self.issue = issue;
	self.deferreds = [];
	self.deferredObject = issue;

	function isSyncNeeded() {
		return true;
	}

	self.renderTitle = function () {
		return '<span>' + self.issue.fields.summary + '<img style="margin-left: 5px;" src="' + self.issue.fields.priority.iconUrl + '" /> </span>';
	};

	self.renderBody = function () {
		var html = '' +
			'<div class="row" style="line-height: 1.42857">' +
			'   <div class="col-sm-8" style="padding: 10px 20px;">' +
			'       <div style="font:bold 14px arial, sans-serif; position:relative; overflow:hidden;"> Details <span style="position:absolute;  border-bottom: 1px solid #E2E2E2;width: 100%;top: 8px;margin: 0px 4px;"></span> </div>' +
			'       <div class="row" >' +
			'           <div class="col-sm-6">' +
			'               <div class="row" style="margin-top: 5px;">' +
			'                   <div class="col-sm-4">' +
			'                       <span style="color: #707070">Typ:</span>' +
			'                   </div>' +
			'                   <div class="col-sm-8">' +
			'                       <span title="' + self.issue.fields.issuetype.description + '"><img src="' + self.issue.fields.issuetype.iconUrl + '" style="margin-right: 2px;">' + self.issue.fields.issuetype.name + '</span>' +
			'                   </div>' +
			'               </div>' +
			'               <div class="row" style="margin-top: 5px;">' +
			'                   <div class="col-sm-4">' +
			'                       <span style="color: #707070">Priorit&auml;t:</span>' +
			'                   </div>' +
			'                   <div class="col-sm-8">' +
			'                       <span><img src="' + self.issue.fields.priority.iconUrl + '" style="margin-right: 2px;">' + self.issue.fields.priority.name + '</span>' +
			'                   </div>' +
			'               </div>';
			if (self.issue.fields.versions && self.issue.fields.versions.length > 0) {
				html += '       <div class="row" style="margin-top: 5px;">' +
				'                   <div class="col-sm-4">' +
				'                       <span style="color: #707070">betrifft Version(en):</span>' +
				'                   </div>' +
				'                   <div class="col-sm-8">' +
				'                       <span>';
				$.each(self.issue.fields.versions, function (i, version) {
					html +=             ((i > 0) ? ',' : '') + ' <span title="' + version.description + '">' + version.name + '</span>';
				});
				html += '               </span>' +
				'                   </div>' +
				'               </div>';
			}
			if (self.issue.renderedFields.environment) {
				html += '   <div class="row" style="margin-top: 5px;">' +
				'              <div class="col-sm-4">' +
				'                    <span style="color: #707070">Umgebung:</span>' +
				'               </div>' +
				'               <div class="col-sm-8">' +
				'                    <div>' + self.issue.renderedFields.environment + '</div>' +
				'                </div>' +
				'            </div>';
			}
			html += '   </div>' +
			'           <div class="col-sm-6">' +
			'               <div class="row" style="margin-top: 5px;">' +
			'                   <div class="col-sm-4">' +
			'                       <span style="color: #707070">Status:</span>' +
			'                   </div>' +
			'                   <div class="col-sm-8">' +
			'                       <span title="' + self.issue.fields.status.description + '" ><img src="' + self.issue.fields.status.iconUrl + '" style="margin-right: 2px;">' + self.issue.fields.status.name + '</span>' +
			'                   </div>' +
			'               </div>' +
			'               <div class="row" style="margin-top: 5px;">' +
			'                   <div class="col-sm-4">' +
			'                       <span style="color: #707070">L&ouml;sung:</span>' +
			'                   </div>' +
			'                   <div class="col-sm-8">' +
			'                       <span>' + ((self.issue.fields.resolution) ? self.issue.fields.resolution.name : 'nicht erledigt') + '</span>' +
			'                   </div>' +
			'               </div>';
			if (self.issue.fields.fixVersions && self.issue.fields.fixVersions.length > 0) {
			   html += '        <div class="row" style="margin-top: 5px;">' +
			    '                   <div class="col-sm-4">' +
			    '                       <span style="color: #707070">L&ouml;sungs- version(en):</span>' +
			    '                   </div>' +
			    '                   <div class="col-sm-8">' +
			    '                       <span>';
			    $.each(self.issue.fields.fixVersions, function (i, version) {
			        html +=                 ((i > 0) ? ',' : '')+' <a href="'+ jira.settings.baseUrl+'/browse/' + self.issue.fields.project.key + '/fixforversion/' + version.id + '" title="' + version.description + '">' + version.name + '</a>';
			    });
			    html += '               </span>' +
			    '                   </div>' +
			    '               </div>';
			}
			html += '     </div>' +
			'       </div>' +
			'       <div style="font:bold 14px arial, sans-serif; position:relative; overflow:hidden; margin-top: 15px;"> Beschreibung <span style="position:absolute;  border-bottom: 1px solid #E2E2E2;width: 100%;top: 8px;margin: 0px 4px;"></span> </div>' +
			'       <div class="row" style="margin-top: 5px;">' +
			'           <div class="col-sm-12">' + self.issue.renderedFields.description + '</div>'+
			'       </div>' +
			'   </div>' +
			'   <div class="col-sm-4" style="padding: 10px 20px;">' +
			'       <div style="font:bold 14px arial, sans-serif; position:relative; overflow:hidden;"> Personen <span style="position:absolute;  border-bottom: 1px solid #E2E2E2;width: 100%;top: 8px;margin: 0px 4px;"></span> </div>' +
			'       <div class="row" style="margin-top: 5px;">' +
			'           <div class="col-sm-4">' +
			'               <span style="color: #707070">Bearbeiter:</span>' +
			'           </div>' +
			'           <div class="col-sm-8">' +
			'               <span><img src="' + ((self.issue.fields.assignee) ? self.issue.fields.assignee.avatarUrls['16x16'] : '') + '" style="margin-right: 2px;">' + ((self.issue.fields.assignee) ? self.issue.fields.assignee.displayName : 'niemand') + '</span>' +
			'           </div>' +
			'       </div>' +
			'       <div class="row" style="margin-top: 5px;">' +
			'           <div class="col-sm-4">' +
			'               <span style="color: #707070">Autor:</span>' +
			'           </div>' +
			'           <div class="col-sm-8">' +
			'               <span><img src="' + self.issue.fields.creator.avatarUrls['16x16'] + '" style="margin-right: 2px;">' + self.issue.fields.creator.displayName + '</span>' +
			'           </div>' +
			'       </div>' +
			'   </div>' +
			'</div>';

			return html;
	};

	self.setProperties = function (feed) {
		feed.properties.customActions = [];
		feed.properties.customLabels = [{ description: self.issue.fields.project.name, labelColor: '#D87F47', url: jira.settings.baseUrl+'/browse/'+ self.issue.fields.project.key }];

		//Add Labels
		if (self.issue.fields.labels) {
			$.each(self.issue.fields.labels, function (i, label) {
				feed.properties.customLabels.push({ description: label });
			});
		}

		//Add Actions
		feed.properties.customActions.push({ description: '<span><i class="fa fa-external-link"></i> Open </span>', url: jira.settings.baseUrl+'/browse/' + self.issue.key });

		var changeStatusHtml = '' +
			'<span style="position:relative;">' +
			'   <span class="dropdown-toggle" data-toggle="dropdown">' +
			'       <span><i class="fa fa-sign-in"></i> Set status</span>' +
			'       <span class="caret"></span>' +
			'   </span>' +
			'   <ul class="dropdown-menu" role="menu">';
		$.each(self.issue.transitions, function (i, transition) {
			changeStatusHtml += '<li><a class="jiraStatusChangeLink" data-transition="' + transition.id + '" data-key="'+ self.issue.key +'">' + transition.name + '</a></li>';
		});
		changeStatusHtml += '' +
			'   </ul>'+
			'</span>';
		feed.properties.customActions.push({ description: changeStatusHtml, eventHandler: $.noop });
		feed.properties.customActions.push({ description: '<span><i class="fa fa-user"></i> Set assignee</span>', url: jira.settings.baseUrl+'/secure/AssignIssue%21default.jspa?id=' + self.issue.id })
		feed.setProperties(feed.properties);

		var icon_url = yasoon.io.getLinkPath('Task-03.png');
		feed.setIconHtml('<img src="' + icon_url + '" title="Issue" ></i>');
		feed.afterRenderScript(function () {
			$('.jiraStatusChangeLink').unbind().click(function () {
				var transitionId = $(this).data('transition');
				var bodyObj = {
					"transition": {
						"id": transitionId
					}
				};
				var key = $(this).data('key');
				var body = JSON.stringify(bodyObj);
				yasoon.oauth({
				    url: jira.settings.baseUrl+'/rest/api/2/issue/' + key + '/transitions',
					oauthServiceName: 'auth',
					headers: jira.CONST_HEADER,
					data: body,
					type: yasoon.ajaxMethod.Post,
					error: jira.handleError,
					success: function (data) {
						console.log(data);
						jira.sync();
						
					}
				});

			});
		});
	};
	
	self.save = function (cbk) {
		if (!isSyncNeeded) {
			return;
		}
		self.executeDeferreds(function () {
			//Save contacts
			if (self.issue.assignee)
				jira.contacts.update(self.issue.assignee);

			if (self.issue.creator)
				jira.contacts.update(self.issue.creator);

			if (self.issue.reporter)
				jira.contacts.update(self.issue.reporter);

			//Save Notification
			var creation = false;
			var yEvent = yasoon.notification.getByExternalId(self.issue.id);
			if (yEvent == null) {
				//New Notification
				yEvent = {};
				creation = true;
			} else if (yEvent.createdAt.getTime() >= new Date(self.issue.fields.updated).getTime()) {
				//not new and no update needed
				if (cbk)
					cbk(yEvent);
				return;
			}

			yEvent.content = self.issue.fields.description;
			yEvent.title = self.issue.fields.summary;
			yEvent.type = 1;
			yEvent.createdAt = new Date(self.issue.fields.updated);
			yEvent.contactId = self.issue.fields.creator.name;
			yEvent.externalId = self.issue.id;
			self.issue.type = 'issue';
			yEvent.externalData = JSON.stringify(self.issue);

			if (creation) {
				yasoon.notification.add1(yEvent, function (newNotif) {
					jira.notifications.addDesktopNotification(newNotif);
					if (cbk)
						cbk(newNotif);
				});
			} else {
				yasoon.notification.save1(yEvent, function (notif) {
					if (cbk)
						cbk(notif);
				});
			}
		});
	};
}

JiraIssueActionNotification.prototype = new JiraNotification();
function JiraIssueActionNotification(event) {
	var self = this;
	self.event = event;
	self.deferreds = [];
	self.deferredObject = event;

	self.isSyncNeeded= function() {
		return true;
	}

	self.renderBody = function () {
		var html;
		if (self.event.category && self.event.category['@attributes'].term === 'comment') {
			html = '<span>' + $(self.event.content['#text']).html() + '</span>';
		} else {
			html = '<span>' + self.event.title['#text'] + '</span>';
		}

		if (self.event.content &&self.event.category && self.event.category['@attributes'].term !== 'comment') {
			var title = $('<div></div>').text(self.event.content['#text']).html();
			html += '<span class="small yasoon-tooltip" data-toggle="tooltip" data-html="true" title="' + title + '">( <i class="fa fa-exclamation-circle"></i> more)</span>';
		}
		return html;
	};

	self.setProperties = function (feed) {
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
			} else if( obj['activity:verb'].length === 1) {
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
	};

	self.renderTitle = function () { };

	self.save = function () {
		if (!self.isSyncNeeded()) {
			return;
		}
		self.executeDeferreds(function () {
			new JiraIssueNotification(self.event.issue).save(function (notif) {
				var creation = false;
				//Update Author
				jira.contacts.update({
					displayName: self.event.author.name['#text'],
					name: self.event.author['usr:username']['#text'],
					emailAddress: self.event.author.email['#text'],
					avatarUrls: { '48x48': self.event.author.link[1].href }
				})
				//Save Activity Notification
				var isComment = (self.event.category && self.event.category['@attributes'].term === 'comment');
				var comment = null;
				if (isComment) {
					var comment = $.grep(self.event.issue.fields.comment.comments, function (c) {
						if (self.event['activity:object'].link['@attributes'].href.indexOf('comment-' + c.id) > -1) {
							return true;
						} else {
							return false;
						}
					})[0];
				}
				var yEvent = yasoon.notification.getByExternalId(self.event.id['#text']);
				if (!yEvent && notif) {
					//New Notification
					yEvent = {};
					creation = true;
				} else {
					//not new - update needed?
					//Comments can be edited. But they do not change the updated flag in the feed (damn bug!).
					//Lookup changed date in comment object
					if (isComment) {
						if (!comment || yEvent.createdAt >= new Date(comment.updated)) {
							return;
						}
					} else if (yEvent.createdAt >= new Date(self.event.updated['#text'])) {
						return;
					}
				}

				yEvent.parentNotificationId = notif.notificationId;
				yEvent.externalId = self.event.id['#text'];

				if (isComment) {
					//Determine Renderd Comment
					var renderedComment = $.grep(self.event.issue.renderedFields.comment.comments, function (c) { return c.id === comment.id; })[0];
					if (renderedComment)
						self.event.content['#text'] = renderedComment.body;

					yEvent.content = self.event.content['#text'];
					yEvent.content = $(yEvent.content).html();
					yEvent.contactId = self.event.author['usr:username']['#text'];
					yEvent.createdAt = new Date(comment.updated);
					yEvent.type = 1;
				} else {
					yEvent.content = (self.event.title['#text']) ? self.event.title['#text'] : 'no content';
					yEvent.createdAt = new Date(self.event.updated['#text']);
					yEvent.type = 2;
				}
				self.event.type = 'IssueAction';
				yEvent.externalData = JSON.stringify(self.event);
				if (creation) {
					yasoon.notification.add1(yEvent, function (newNotif) {
						jira.notifications.addDesktopNotification(newNotif);
					});
				} else {
					yasoon.notification.save1(yEvent, function (newNotif) {
						jira.notifications.addDesktopNotification(newNotif);
					});
				}
			});
		});
	};
}

function JiraIssueController() {
	var self = this;
}

function JiraRibbonController() {
	var self = this;
	this.createRibbon = function (ribbonFactory) {
		jira.ribbonFactory = ribbonFactory;

		ribbonFactory.create({
			type: 'contextMenus',
			renderTo: [
				'Microsoft.Outlook.Explorer'
			],
			items: [{
				type: 'contextMenu',
				idMso: 'MenuMailNewItem',
				items: [{
					type: 'button',
					id: 'newIssue',
					insertAfterMso: 'NewTaskCompact',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			} ,{
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailText',
				items: [{
					type: 'button',
					id: 'newIssueFromText',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			} ,{
				type: 'contextMenu',
				idMso: 'ContextMenuReadOnlyMailList',
				items: [{
					type: 'button',
					id: 'newIssueFromText2',
					label: 'New Issue',
					image: 'logo_icon1.png',
					onAction: self.ribbonOnNewIssue
				}]
			}]
		});
	};

	this.ribbonOnNewIssue = function (ribbonId, ribbonCtx) {
	
		if (ribbonId == 'newIssue') {
			//if (yasoon.app.isOAuthed('auth')) {
				yasoon.dialog.open({
					width: 900,
					height: 650,
					title: 'New Jira Issue',
					resizable: false,
					htmlFile: 'Dialogs/newIssueDialog.html',
					//initParameter: { 'ownUser': jira.settings.ownUser },
					closeCallback: self.ribbonOnCloseNewIssue
				});
			//} else {
			//	yasoon.dialog.showMessageBox('Please login to GitHub in settings menu first!');
			//	return;
			//}
		}
		else {			
			var selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);
			
			if(!selection || !selection.trim()) {
				yasoon.dialog.showMessageBox('Please select some text first!');
				return;
			}
			
			yasoon.dialog.open({
					width: 900,
					height: 650,
					title: 'New Jira Issue',
					resizable: false,
					htmlFile: 'Dialogs/newIssueDialog.html',
					//initParameter: { ownUser: github.settings.ownUser, text: selection },
					closeCallback: self.ribbonOnCloseNewIssue
				});
		}
	};

	this.ribbonOnCloseNewIssue = function () {

	};
}

function JiraContactController() {
	var self = this;

	self.update = function (actor) {
		var c = yasoon.contact.get(actor.name);
		if (c == null) {
			var newContact = {
				contactId: actor.name,
				contactLastName: actor.displayName,
				contactEmailAddress: actor.emailAddress,
				externalData: JSON.stringify(actor),
				externalAvatarUrl: actor.avatarUrls['48x48']
			}
			jiraLog('New Contact created: ', newContact);
			yasoon.contact.add(newContact);

		} else {
			//Todo: Update of Avatar
		}
	};
}

function jiraIssueGetter() {
	var deferredObject = this.deferredObject;

	return $.Deferred(function (dfd) {
		if (deferredObject && !deferredObject.issue) {
			var issueKey = (deferredObject['activity:target']) ? deferredObject['activity:target']['title']['#text'] : deferredObject['activity:object']['title']['#text'];
			yasoon.oauth({
			    url: jira.settings.baseUrl+'/rest/api/2/issue/' + issueKey + '?expand=transitions,renderedFields',
				oauthServiceName: 'auth',
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: jira.handleError,
				success: function (data) {
					deferredObject.issue = JSON.parse(data);
					dfd.resolve();
				}
			});
		} else {
			dfd.resolve();
		}
	});
}

function jiraLog(text, obj, stacktrace) {
	if (yasoon.logLevel == 0) {
		var stack = '';
		var json = '';
		if (stacktrace !== undefined || stacktrace == true) {
			try {
				var a = doesNotExit + forceException;
			} catch (e) {
				stack = '\n' + printStackTrace(e).split('\n')
					.slice(1)
					.join('\n');

			}
		}
		if (obj != null) {
			json = '\n' + JSON.stringify(obj);
		}

		yasoon.util.log(text + ' ' + json + ' ' + stack);
	}
}

function jiraXmlToJson(xmlDom) {
	var js_obj = {};
	if (xmlDom.nodeType == 1) {
		if (xmlDom.attributes.length > 0) {
			js_obj["@attributes"] = {};
			for (var j = 0; j < xmlDom.attributes.length; j++) {
				var attribute = xmlDom.attributes.item(j);
				js_obj["@attributes"][attribute.nodeName] = attribute.value;
			}
		}
	} else if (xmlDom.nodeType == 3) {
		js_obj = xmlDom.nodeValue;
	}
	if (xmlDom.hasChildNodes()) {
		for (var i = 0; i < xmlDom.childNodes.length; i++) {
			var item = xmlDom.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof (js_obj[nodeName]) == "undefined") {
				js_obj[nodeName] = jiraXmlToJson(item);
			} else {
				if (typeof (js_obj[nodeName].push) == "undefined") {
					var old = js_obj[nodeName];
					js_obj[nodeName] = [];
					js_obj[nodeName].push(old);
				}
				js_obj[nodeName].push(jiraXmlToJson(item));
			}
		}
	}
	return js_obj;
}

//@ sourceURL=jira.js