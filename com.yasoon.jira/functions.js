function JiraRibbonController() {
	var self = this;

	this.createRibbon = function createRibbon (ribbonFactory) {
		jira.ribbonFactory = ribbonFactory;

		//Add Ribbon in top toolbar Ribbon on new Item
		var contextMenuItems = [{
			type: 'contextMenu',
			idMso: 'MenuMailNewItem',
			items: [{
				type: 'button',
				id: 'newIssue',
				insertAfterMso: 'NewTaskCompact',
				label: yasoon.i18n('ribbon.newIssue'),
				image: 'logo_icon1.png',
				onAction: self.ribbonOnNewIssue
			}]
		},
		{
		type: 'contextMenu',
		idMso: 'ContextMenuMailItem',
		items: [{
				id: 'newIssueFullMail',
				type: 'button',
				image: 'logo_icon1.png',
				label: yasoon.i18n('ribbon.newIssue'),
				onAction: self.ribbonOnNewIssue
			}, {
				id: 'addToIssueFullMail',
				type: 'button',
				image: 'logo_icon1.png',
				label: yasoon.i18n('ribbon.addToIssue'),
				onAction: self.ribbonOnAddToIssue
			}]
		}, {
			type: 'contextMenu',
			idMso: 'ContextMenuAttachments',
			items: [{
				type: 'button',
				id: 'uploadAttachmentToIssue',
				label: yasoon.i18n('ribbon.uploadToIssue'),
				enabled: false,
				image: 'logo_icon1.png',
				onAction: self.uploadAttachment
			}, {
				type: 'dynamicMenu',
				id: 'uploadAttachmentDynamicMenu',
				label: yasoon.i18n('ribbon.uploadToIssues'),
				image: 'logo_icon1.png',
				visible: false,
				items: [{
					type: 'menu',
					id: 'uploadAttachmentMenu',
					items: []
				}]

			}]
		}];

		//Add New Issue Ribbons in email
		var newIssueRibbons = self.createContextRibbonItems(yasoon.i18n('ribbon.newIssue'), 'newIssueFromText', self.ribbonOnNewIssue);
		contextMenuItems = contextMenuItems.concat(newIssueRibbons);
		
		var addToIssueRibbons = self.createContextRibbonItems(yasoon.i18n('ribbon.addToIssue'), 'addToIssueFromText', self.ribbonOnAddToIssue);
		contextMenuItems = contextMenuItems.concat(addToIssueRibbons);

		//Add main menu ribbon
		ribbonFactory.create({
			type: 'ribbon',
			renderTo: [
				'Microsoft.Outlook.Explorer'
			],
			items: [{
				type: 'tabs',
				items: [{
					type: 'tab',
					idMso: 'TabMail',
					items: [{
						type: 'group',
						id: 'jiraMailExplorerGroup',
						insertAfterMso: 'GroupMailRespond',
						label: 'JIRA',
						image: 'brandedlogo-64',
						items: self.createJiraRibbonGroup('MailMain')
					}]
				},
				{
					type: 'tab',
					idMso: 'TabTasks',
					items: [{
						type: 'group',
						id: 'jiraTaskExplorerGroup',
						insertAfterMso: 'GroupTaskRespond',
						label: 'JIRA',
						image: 'brandedlogo-64',
						items: [{
						    type: 'splitButton',
						    id: 'jiraTaskSync',
						    size: 'large',
						    items: [{
						        type: 'button',
						        id: 'jiraTaskRefresh',
						        label: yasoon.i18n('ribbon.syncTasks'),
						        screentip: yasoon.i18n('ribbon.syncTasks'),
						        image: 'images/ribbonSyncing.png',
						        supertip: yasoon.i18n('ribbon.syncTasksScreenTip'),
						        enabled: true,
						        onAction: self.ribbonRefreshTasks
						    }, {
						        type: 'menu',
						        id: 'RefreshMenu',
						        items: [{
						            type: 'button',
						            id: 'jiraTaskForceRefresh',
						            label: yasoon.i18n('ribbon.forceSyncTasks'),
						            onAction: self.ribbonRefreshTasks
						        }]
						    }]
						}]
					}]
				}]
			}]
		});

		//Add Mail Read
		ribbonFactory.create({
			type: 'ribbon',
			renderTo: [
				'Microsoft.Outlook.Mail.Read'
			],
			items: [{
				type: 'tabs',
				items: [{
					type: 'tab',
					idMso: 'TabReadMessage',
					items: [{
						type: 'group',
						id: 'jiraMailReadGroup',
						insertAfterMso: 'GroupShow',
						label: 'JIRA',
						image: 'brandedlogo-64',
						items: self.createJiraRibbonGroup('MailRead')
					}]
				}]
			}]
		});

		//Add Context Menus
		ribbonFactory.create({
			type: 'contextMenus',
			renderTo: [
				'Microsoft.Outlook.Explorer',
				'Microsoft.Outlook.Mail.Read'
			],
			items: contextMenuItems
		});

		//Add Task Ribbon
		ribbonFactory.create({
			type: 'ribbon',
			renderTo: [
				'Microsoft.Outlook.Task'
			],
			items: [{
				type: 'tabs',
				items: [{
					type: 'tab',
					idMso: 'TabTask',
					items: [{
						type: 'group',
						id: 'buttonGroupTask',
						insertAfterMso: 'GroupActions',
						label: 'JIRA',
						items: [{
							type: 'button',
							id: 'jiraOpenTask',
							size: 'large',
							label: 'Open Issue',
							image: 'images/ribbonOpen.png',
							visible: 'appItem',
							onAction: self.ribbonOpenIssue
						}, {
							type: 'button',
							id: 'jiraEditTask',
							size: 'large',
							label: 'Edit Issue',
							image: 'brandedlogo-64',
							visible: 'appItem',
							onAction: self.ribbonEditIssue
						}, {
							id: 'jiraAddTask',
							type: 'button',
							size: 'large',
							image: 'images/ribbonAdd.png',
							visible: 'appItem',
							label: yasoon.i18n('ribbon.addToIssue'),
							onAction: self.ribbonOnAddToIssue
						}, {
							type: 'dynamicMenu',
							id: 'jiraTransitionDynamicMenu',
							size: 'large',
							label: yasoon.i18n('ribbon.changeTransition'),
							image: 'images/ribbonTransition.png',
							visible: 'appItem',
							items: [{
								type: 'menu',
								id: 'jiraTransitionMenu',
								items: []
							}]
						}]
					}]
				}]
			}]
		});
	};

	this.createContextRibbonItems = function createContextRibbonItems(label, id, action) {
		var result = [];
		//var mailContextMenuMso = [
		//	'ContextMenuHeading',
		//	'ContextMenuHeadingLinked',
		//	'ContextMenuReadOnlyMailText',
		//	'ContextMenuReadOnlyMailList',
		//	'ContextMenuReadOnlyMailTable',
		//	'ContextMenuReadOnlyMailTableCell',
		//	'ContextMenuReadOnlyMailListTable',
		//	'ContextMenuReadOnlyMailPictureTable',
		//	'ContextMenuReadOnlyMailTableWhole',
		//	'ContextMenuReadOnlyMailTextTable',
		//	'ContextMenuReadOnlyMailHyperlink'
		//];
		var mailContextMenuMso = [
			'ContextMenuReadOnlyMailText',
			'ContextMenuReadOnlyMailTable',
			'ContextMenuReadOnlyMailTableCell',
			'ContextMenuReadOnlyMailListTable',
			'ContextMenuReadOnlyMailPictureTable',
			'ContextMenuReadOnlyMailTextTable',
			'ContextMenuReadOnlyMailTableWhole',
			'ContextMenuReadOnlyMailList',
			'ContextMenuReadOnlyMailHyperlink',
			'ContextMenuHeading',
			'ContextMenuHeadingLinked',
			'ContextMenuFieldDisplay'
		];

		mailContextMenuMso.forEach(function (mso, i) {
			var counter = i + 1;
			result.push({
				type: 'contextMenu',
				idMso: mso,
				items: [{
					type: 'button',
					id: id+''+((counter != 1) ? counter  : ''), //Don't ask! compatibility with old ribbon updater
					label: label,
					image: 'logo_icon1.png',
					onAction: action
				}]
			});
		});

		return result;
	};
	
	this.createJiraRibbonGroup = function createJiraRibbonGroup(id) {
		return [{
			type: 'button',
			id: 'newIssueFrom' + id,
			size: 'large',
			label: yasoon.i18n('ribbon.newIssue'),
			image: 'images/ribbonNew.png',
			onAction: self.ribbonOnNewIssue
		},{
			type: 'button',
			id: 'addToIssueFrom' + id,
			size: 'large',
			label: yasoon.i18n('ribbon.addToIssue'),
			image: 'images/ribbonAdd.png',
			onAction: self.ribbonOnAddToIssue
		},{
			type: 'button',
			id: 'openIssueFrom' + id,
			enabled: false,
			size: 'large',
			label: yasoon.i18n('ribbon.openIssue'),
			image: 'images/ribbonOpen.png',
			onAction: self.ribbonOpenIssue
		},{
			type: 'dynamicMenu',
			id: 'openIssueDynamicMenuFrom' + id,
			size: 'large',
			label: yasoon.i18n('ribbon.openIssues'),
			image: 'images/ribbonOpen.png',
			visible: false,
			items: [{
				type: 'menu',
				id: 'openIssueMenuFrom' + id,
				items: []
			}]
			
		}];
	};

	this.updateRibbons = function updateRibbons(item, inspectorId) {
		if (!item)
			return;

		var parameters = (inspectorId) ? inspectorId : true;
		var method = (inspectorId) ? 'updateSingle' : 'update';

		if (jiraIsTask(item) || item.fields) { //In update we do not have an up-to-date task, so we insert the issue.
			var issue = item;
			if(!issue.fields)
				issue = JSON.parse(item.externalData);
			
			if (issue.transitions) {
				var transitionItems = [];
				issue.transitions.forEach(function (t) {
					transitionItems.push({
						type: 'button',
						id: 'transition-' + t.id,
						label: t.name,
						externalData: JSON.stringify({ transitionId: t.id, issueKey: issue.key, issueId: issue.id }),
						onAction: self.ribbonExecuteTransition
					});
				});

				jira.ribbonFactory[method]('jiraTransitionMenu', {
					items: transitionItems
				}, parameters);

				jira.ribbonFactory[method]('jiraTransitionDynamicMenu', {
					visible: 'appItem'
				}, parameters);
			} else {
				jira.ribbonFactory[method]('jiraTransitionDynamicMenu', {
					visible: false
				}, parameters);
			}

		} else {
			if (!item.getConversationData)
				return;

			//This method can be called with or without inspector. In inspector it has another method to call(updateSingle instead of update) and different Ids
			var where = (inspectorId) ? 'MailRead' : 'MailMain';
			var ribbonButton = 'openIssueFrom' + where;
			var ribbonDynamicMenu = 'openIssueDynamicMenuFrom' + where;
			var ribbonInnerMenu = 'openIssueMenuFrom' + where;

			var convData = item.getConversationData();
			if (convData) {
				convData = JSON.parse(convData);

				if (convData.issues) {
					if (Object.keys(convData.issues).length > 1) {
						//Create Items for Dyn Menu
						var convItems = [];
						Object.keys(convData.issues).forEach(function (key) {
							var currentItem = convData.issues[key];
							convItems.push({
								type: 'button',
								id: 'openIssueMenu-' + currentItem.id,
								label: yasoon.i18n('ribbon.openIssueWithKey', { key: currentItem.key }),
								externalData: currentItem.key,
								image: 'images/ribbonOpen.png',
								onAction: self.ribbonOpenIssue
							});
						});

						jira.ribbonFactory[method](ribbonButton, {
							visible: false
						}, parameters);

						jira.ribbonFactory[method](ribbonDynamicMenu, {
							visible: true
						}, parameters);
						jira.ribbonFactory[method](ribbonInnerMenu, {
							items: convItems
						}, parameters);

					} else {
						var key = convData.issues[Object.keys(convData.issues)[0]].key;
						jira.ribbonFactory[method](ribbonButton, {
							label: yasoon.i18n('ribbon.openIssueWithKey', { key: key }),
							externalData: key,
							enabled: true,
							visible: true
						}, parameters);

						jira.ribbonFactory[method](ribbonDynamicMenu, {
							visible: false
						}, parameters);
					}

					return;
				}
			}

			jira.ribbonFactory[method](ribbonButton, {
				label: yasoon.i18n('ribbon.openIssue'),
				enabled: false,
				visible: true
			}, parameters);

			jira.ribbonFactory[method](ribbonDynamicMenu, {
				visible: false
			}, parameters);

		}
	};

	this.updateAttachmentRibbons = function updateAttachmentRibbons(item, inspectorId) {
		var ribbonButton = 'uploadAttachmentToIssue';
		var ribbonDynamicMenu = 'uploadAttachmentDynamicMenu';
		var ribbonInnerMenu = 'uploadAttachmentMenu';

		var parameters = (inspectorId) ? inspectorId : true;
		var method = (inspectorId) ? 'updateSingle' : 'update';

		var convData = item.getConversationData();

		if (convData) {
			convData = JSON.parse(convData);
			if (convData.issues) {
				if (Object.keys(convData.issues).length > 1) {
					//Create Items for Dyn Menu
					var convItems = [];
					Object.keys(convData.issues).forEach(function (key) {
						var currentItem = convData.issues[key];
						convItems.push({
							type: 'button',
							id: 'uploadToIssue-' + currentItem.id,
							label: yasoon.i18n('ribbon.uploadToIssueWithKey', { key: currentItem.key }),
							externalData: currentItem.key,
							image: 'images/ribbonOpen.png',
							onAction: self.uploadAttachment
						});
					});

					jira.ribbonFactory[method](ribbonButton, {
						visible: false
					}, parameters);

					jira.ribbonFactory[method](ribbonDynamicMenu, {
						visible: true
					}, parameters);
					jira.ribbonFactory[method](ribbonInnerMenu, {
						items: convItems
					}, parameters);

				} else {
					var key = convData.issues[Object.keys(convData.issues)[0]].key;
					jira.ribbonFactory[method](ribbonButton, {
						label: yasoon.i18n('ribbon.uploadToIssueWithKey', { key: key }),
						externalData: key,
						enabled: true,
						visible: true
					}, parameters);

					jira.ribbonFactory[method](ribbonDynamicMenu, {
						visible: false
					}, parameters);
				}

				return;
			}
		}

		jira.ribbonFactory[method](ribbonButton, {
			label: yasoon.i18n('ribbon.uploadToIssue'),
			enabled: false,
			visible: true
		}, parameters);

		jira.ribbonFactory[method](ribbonDynamicMenu, {
			visible: false
		}, parameters);
	};

	this.ribbonOpenIssue = function ribbonOpenIssue(ribbonId, ribbonCtx) {
		console.log(arguments);
		var issueKey = null;
		if (ribbonCtx.externalData)
			issueKey = ribbonCtx.externalData;
		else if (ribbonCtx.items && ribbonCtx.items.length > 0)
			issueKey = ribbonCtx.items[0].externalId;

		if (issueKey)
			yasoon.openBrowser(jira.settings.baseUrl + '/browse/' + issueKey);
		else
			yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotOpenIssue'));
	};

	this.ribbonEditIssue = function ribbonOpenIssue(ribbonId, ribbonCtx) {
		if (!jiraIsLicensed(true)) {
			return;
		}

		if (!ribbonCtx.items && ribbonCtx.items.length === 0) {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotOpenIssue'));
			return;
		}

		var outlookTask = ribbonCtx.items[0];
		var issue = JSON.parse(outlookTask.externalData);
		new JiraIssueNotification(issue).editIssue(function (type, data) {
		    if (data && data.action === 'success') {
		        return jira.issues.get(issue.key, true)
		        .then(function (newIssue) {
		            new JiraIssueTask(newIssue).saveInspector(outlookTask);
		            jira.sync();
		        });
		    }
		});
	};

	this.uploadAttachment = function uploadAttachment(ribbonId, ribbonCtx) {

		if (ribbonCtx.items && ribbonCtx.items.length > 0) {
			//Upload every file to the issue and show Loader
			var formData = [];
			ribbonCtx.items.forEach(function (file) {
				formData.push({
					type: yasoon.formData.File,
					name: 'file',
					value: file.getFileHandle()
				});
			});

			var progressProvider = yasoon.oauth({
				url: jira.settings.baseUrl + '/rest/api/2/issue/' + ribbonCtx.externalData + '/attachments',
				oauthServiceName: jira.settings.currentService,
				type: yasoon.ajaxMethod.Post,
				formData: formData,
				headers: { Accept: 'application/json', 'X-Atlassian-Token': 'nocheck' },
				error: function (data, statusCode, result, errorText, cbkParam) {
					yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotUploadAttachments') + ' - ' + errorText );
				},
				success: function () {
					ribbonCtx.items[0].completeLoader();
					jira.sync();
				}
			});

			ribbonCtx.items[0].showLoader([progressProvider]);
		}
		
	};

	this.ribbonExecuteTransition = function (ribbonId, ribbonCtx) {
		if (!jiraIsLicensed(true)) {
			return;
		}

		var extData = JSON.parse(ribbonCtx.externalData);
		var issue = ribbonCtx.items[0];
		var issueKey = extData.issueKey;
		var issueId = extData.issueId;
		var transitionId = extData.transitionId;
		var body = JSON.stringify({
			"transition": {
				"id": transitionId
			}
		});

		jira.ribbonFactory.updateSingle('jiraTransitionDynamicMenu', {
		    enabled: false
		}, issue.inspectorId);

		jiraGet('/rest/api/2/issue/' + issueKey + '/transitions?transitionId=' + transitionId)
		.then(function (data) {
			var transObj = JSON.parse(data);
			if (transObj.transitions[0].hasScreen) {
				yasoon.openBrowser(jira.settings.baseUrl + '/login.jsp?os_destination=' + encodeURIComponent('/secure/CommentAssignIssue!default.jspa?id=' + issueId + '&action=' + transitionId));
			} else {
				return jiraAjax('/rest/api/2/issue/' + issueKey + '/transitions', yasoon.ajaxMethod.Post, body)
				.then(function () {
					return jira.issues.get(issueKey, true);
				})
				.then(function (newIssue) {
				    jira.ribbonFactory.updateSingle('jiraTransitionDynamicMenu', {
				        enabled: true
				    }, issue.inspectorId);

					self.updateRibbons(newIssue, issue.inspectorId);

					new JiraIssueTask(newIssue).saveInspector(issue);

					jira.sync();
				});
			}
		})
		.catch(function (error) {
			var msg = (error.getUserFriendlyError) ? error.getUserFriendlyError() : error;
			yasoon.dialog.showMessageBox(yasoon.i18n('notification.changeStatusNotPossible', { error: msg }));
			yasoon.util.log('Unexpected error in Set Transition in Task: ' + error, yasoon.util.severity.error, getStackTrace(error));

			jira.ribbonFactory.updateSingle('jiraTransitionDynamicMenu', {
			    enabled: true
			}, issue.inspectorId);
		});
	};

	this.ribbonRefreshTasks = function (ribbonId, ribbonCtx) {
		jira.ribbonFactory.update('jiraTaskSync', {
			enabled: false
		}, true);

		var forceSync = (ribbonId == 'jiraTaskForceRefresh');

		jira.tasks.syncTasks(forceSync)
		.then(function () {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.taskSyncSuccess'));

			jira.ribbonFactory.update('jiraTaskSync', {
				enabled: true
			}, true);
		})
		.catch(function () {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.taskSyncFailed'));
		});
	};

	this.ribbonOnNewIssue = function ribbonOnNewIssue(ribbonId, ribbonCtx) {
		if (!jiraIsLicensed(true)) {
			return;
		}
		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.loginFirst'));
			return;
		}
		var initParams = {
			'settings': jira.settings,
			'ownUser': jira.data.ownUser,
			'userMeta': jira.cache.userMeta,
			'createMetas': jira.cache.createMetas,
			'projects': jira.data.projects,
			'systemInfo': jira.sysInfo
		};

		var dialogOptions = {
			width: 735,
			height: 700,
			title: yasoon.i18n('dialog.newIssueDialogTitle'),
			resizable: true,
			htmlFile: 'dialogs/jiraNewEditIssue.html',
			initParameter: initParams,
			closeCallback: self.ribbonOnCloseNewIssue
		};
		
		if (ribbonId == 'newIssueFullMail' || ribbonId == 'newIssueFromMailMain' || ribbonId == 'newIssueFromMailRead') {
			//Ribbon on Mail Item
			initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
			yasoon.dialog.open(dialogOptions);
			return;
		} else if (ribbonId == 'newIssue') {
			//Ribbon in Standard New EMail Dropdown
			yasoon.dialog.open(dialogOptions);
			return;
		} else {
			var selection = '';
			try {
				selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);
			} catch (e) {
				yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotDetectEmail'));
				return;
			}
			if (!selection || !selection.trim()) {
					yasoon.dialog.showMessageBox(yasoon.i18n('general.selectTextFirst'));
					return;
			}
						
			initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
						
			yasoon.outlook.mail.renderSelection(ribbonCtx.items[ribbonCtx.readingPaneItem], 'jiraMarkup')
			.then(function (markup) {
				initParams.text = markup;
				yasoon.dialog.open(dialogOptions);
			})
			.catch(function () {
				initParams.text = yasoon.i18n('general.couldNotRenderMarkup');
				yasoon.dialog.open(dialogOptions);
			});
			
			return;
		}
	};

	this.ribbonOnAddToIssue = function ribbonOnAddToIssue(ribbonId, ribbonCtx) {
		if (!jiraIsLicensed(true)) {
			return;
		}

		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.loginFirst'));
			return;
		}

		var initParams = { 
			settings: jira.settings, 
			ownUser: jira.data.ownUser,
			projects: jira.data.projects,
			systemInfo: jira.sysInfo
		};

		var dialogOptions = {
			width: 610,
			height: 575,
			title: yasoon.i18n('dialog.addToIssueDialogTitle'),
			resizable: true,
			htmlFile: 'Dialogs/jiraAddToIssue.html',
			initParameter: initParams,
			closeCallback: self.ribbonOnCloseAddToIssue
		};

		if (ribbonId == 'addToIssueFullMail' || ribbonId == 'addToIssueFromMailMain' || ribbonId == 'newIssueFromMailRead') {
			initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
			yasoon.dialog.open(dialogOptions);
			return;
		} else if (ribbonId == 'jiraAddTask') {
			var task = ribbonCtx.items[ribbonCtx.readingPaneItem];
			initParams.issue = JSON.parse(task.externalData);
			yasoon.dialog.open(dialogOptions);
			return;
		} else {
			var selection = '';
			try {
				selection = ribbonCtx.items[ribbonCtx.readingPaneItem].getSelection(0);
			} catch (e) {
				yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotDetectEmail'));
				return;
			}
			if (!selection || !selection.trim()) {
				yasoon.dialog.showMessageBox(yasoon.i18n('general.selectTextFirst'));
				return;
			}

			initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];

			yasoon.outlook.mail.renderSelection(ribbonCtx.items[ribbonCtx.readingPaneItem], 'jiraMarkup')
			.then(function (markup) {
				initParams.text = markup;
				yasoon.dialog.open(dialogOptions);
			})
			.catch(function () {
				initParams.text = yasoon.i18n('general.couldNotRenderMarkup');
				yasoon.dialog.open(dialogOptions);
			});
		}
	};

	this.ribbonOnCloseNewIssue = function ribbonOnCloseNewIssue(type, data) {
		if(data && data.action === 'success')
			jira.sync();
	};

	this.ribbonOnCloseAddToIssue = function ribbonOnCloseAddToIssue(type, data) {
		if (data && data.action === 'success')
			jira.sync();
	};
}

function JiraContactController() {
	var self = this;
	var buffer = [];

	self.update = function updateContact(actor) {
		if (!actor.name || !actor.displayName || !actor.emailAddress)
			return;

		var c = yasoon.contact.get(actor.name);
		var dbContact = null;
		var avatarUrl = null;
		if (actor.avatarUrls && actor.avatarUrls['48x48']) {
			avatarUrl = actor.avatarUrls['48x48'].replace('size=large', 'size=xlarge');
		}
		if (!c) {
			var newContact = {
				contactId: actor.name,
				contactLastName: actor.displayName,
				contactEmailAddress: actor.emailAddress,
				externalData: JSON.stringify(actor),
				externalAvatarUrl: avatarUrl,
				useAuthedDownloadService: jira.settings.currentService
			};
			jiraLog('New Contact created: ', newContact);
			dbContact = yasoon.contact.add(newContact);
			buffer.push(dbContact);

		} else {
			//We don't want to override an existing avatrUrl with null
			if (!avatarUrl)
				avatarUrl = c.externalAvatarUrl;

			if (c.contactId != actor.name ||
			   c.contactLastName != actor.displayName ||
			   c.contactEmailAddress != actor.contactEmailAddress ||
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
	};

	self.updateOwn = function updateOwnUser(ownUser) {
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

		var oldOwnUser = {};
		if(c.externalData) 
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
	};

	self.get = function getContact(id) {
		var result = $.grep(buffer, function (c) { return c.contactId === id; });
		if (result.length === 1) {
			return result[0];
		} else {
			result = yasoon.contact.get(id);
			if (result && result.contactId) {
				buffer.push(result);
			}
			return result;
		}
	};
}

function JiraFilterController() {
	var self = this;

	this.values = {};
	this.filterObj = [];
	this.allFilters = [];

	function getLabel(name, id, path) {
		return (self.values[path] && self.values[path][id]) ? self.values[path][id] : null;
	}

	this.register = function registerFilter() {
		var backendFilterObj = [];
		self.filterObj.forEach(function (f) {
			if (self.getSelectedFilters().indexOf(f.key) > -1) {
				var getLabelFct = (f.label) ? f.label : getLabel;
				backendFilterObj.push({
					name: f.name,
					jsonPath: f.key,
					label: getLabelFct
				});
			}
		});
		yasoon.feed.addFilter(backendFilterObj);
	};

	this.getSelectedFilters = function getSelectedFilter() {
		return jira.settings.activeFilters.split(',');
	};

	this.load = function loadFilter() {
		var string = yasoon.setting.getAppParameter('filter');
		if (string)
			self.values = JSON.parse(string);

		self.filterObj = [
			{
				name: yasoon.i18n('filter.projectFilter'),
				key: 'fields.project.id',
				value: { type: 'json', path: 'fields.project.name' }
				//Without label so it gets the default GetLabel method
			},
			{
				name: yasoon.i18n('filter.typeFilter'),
				key: 'fields.issuetype.id',
				value: { type: 'json', path: 'fields.issuetype.name' }
			},
			{
				name: yasoon.i18n('filter.reporterFilter'),
				key: 'fields.reporter.emailAddress',
				value: { type: 'json', path: 'fields.reporter.displayName' }
			},
			{
				name: yasoon.i18n('filter.statusFilter'),
				key: 'fields.status.id',
				value: { type: 'json', path: 'fields.status.name' }
			},
			{
				name: yasoon.i18n('filter.priorityFilter'),
				key: 'fields.priority.id',
				value: { type: 'json', path: 'fields.priority.name' }
			},
			{
				name: yasoon.i18n('filter.assigneeFilter'),
				key: 'fields.assignee.emailAddress',
				value: { type: 'json', path: 'fields.assignee.displayName' }
			},
			{
				name: yasoon.i18n('filter.fixVersionFilter'),
				key: 'fields.fixVersions[*].id',
				value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: yasoon.i18n('filter.versionFilter'),
				key: 'fields.versions[*].id',
				value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: yasoon.i18n('filter.labelFilter'),
				key: 'fields.labels'
				//value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: yasoon.i18n('filter.componentFilter'),
				key: 'fields.components[*].id',
				value: { type: 'json', path: 'fields.components[*].name' }
			}
		];

		//Determine allFilters
		self.filterObj.forEach(function (f) {
			self.allFilters.push(f.key);
		});

	};

	this.save = function saveFilter() {
		yasoon.model.feeds.updateFilter();
		yasoon.setting.setAppParameter('filter', JSON.stringify(self.values));
	};

	function getJsonPathElement(obj, jsonPath) {
		var path = jsonPath.split('.');
		var currentObj = obj;
		//Use some so it stops after any element has returned true
		path.some(function (currentPath,i) {
			if (!currentObj)
				return true;

			//Add support for Arrays
			//Check if it has element selector [1] or all [*]
			var regex = /(.+)\[(.+)\]/;
			var regexResult = regex.exec(currentPath);

			if (regexResult) {
				//It should be an array, but it isn't
				var arrayData = currentObj[regexResult[1]];
				if (!$.isArray(arrayData)) {
					currentObj = null;
					return true;
				}

				if (regexResult[2] === '*') {
					currentObj = [];
					//Get remaining path
					var remainingPath = '';
					path.forEach(function(remPath, index) {
						if(index > i) {
							if(remainingPath)
								remainingPath += '.';

							remainingPath += remPath;
						}
					});

					arrayData.forEach(function (o) {
						var data = getJsonPathElement(o, remainingPath);
						if (data)
							currentObj.push(data);
					});
					return true;

				} else {
					//Get requested element
					currentObj = currentObj[regexResult[1]];
				}
			} else {
				currentObj = currentObj[currentPath];
			}
		});

		return currentObj;
	}

	this.addNotif = function addNotifToFilter(obj) {
		//Go through each filter 
		var saveNeeded = false;
		self.getSelectedFilters().forEach(function (filterKey) {
			var filter = self.filterObj.filter(function (f) { return f.key === filterKey; })[0];
			//Get Key Value for current filter
			var currentKeyObj = getJsonPathElement(obj, filter.key);
			if (currentKeyObj) {
				//Get Value for current Filter
				var currentValueObj = currentKeyObj;
				if (filter.value) {
					if (filter.value.type !== 'json') {
						throw 'Filter Types other than json are currently not supported';
					}

					currentValueObj = getJsonPathElement(obj, filter.value.path);
				}
				//Update Buffer
				if (!self.values[filter.key])
					self.values[filter.key] = {};

				if ($.isArray(currentKeyObj)) {
					//Add Each currentValueObj as seperate entry
					currentKeyObj.forEach(function (key,i) {
						if (self.values[filter.key][key] != currentValueObj[i]) {
							self.values[filter.key][key] = currentValueObj[i];
							saveNeeded = true;
						}
					});
				} else if (self.values[filter.key][currentKeyObj] != currentValueObj) {
					self.values[filter.key][currentKeyObj] = currentValueObj;
					saveNeeded = true;
				}
			}
		});

		if(saveNeeded)
			self.save();
	};

	function indexPages(page) {
		//Add Promise to make it async. We want only want to sync 1 page and let other tasks  a chance to do something as well.
		return new Promise(function (resolve, reject) {
			setTimeout(function () {
				if (page.Items) {
					page.Items.forEach(function (item) {
						self.addNotif(JSON.parse(item.externalData));
					});

					if (page.CurrentPage < page.TotalPages) {
						indexPages(page.nextPage())
						.then(function () {
							resolve();
						});
					} else {
						resolve();
					}
				} else {
					resolve();
				}
			},1);
		});
	}

	this.reIndex = function reindexFilter() {
		var newValues = {};
		return Promise.resolve()
		.then(function () {
			var page = yasoon.notification.getAll();
			return indexPages(page);
		});
	};

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

function jiraQueue() {

	var deferred = $.Deferred();
	var promise = deferred.promise();

	$.each(arguments, function (i, obj) {

		promise = promise.then(function () {
			return obj();
		});
	});

	deferred.resolve();

	return promise;
}

function jiraIsLicensed(openDialog) {
	//Add 1 day bonus. This means, compare with yesterday instead of today
	var yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	if (!jira.license.isFullyLicensed && jira.license.validUntil < yesterday) {
		if (openDialog) {
			//Open Dialog
			jiraOpenPurchaseDialog();
		}
		return false;
	}
	return true;
}

var isLicenseDialogOpen = false;
function jiraOpenPurchaseDialog() {
	if (isLicenseDialogOpen)
		return;

	isLicenseDialogOpen = true;
	yasoon.dialog.open({
		width: 720,
		height: 610,
		title: yasoon.i18n('dialog.trialExpiredDialogTitle'),
		resizable: false,
		htmlFile: 'dialogs/purchase.html',
		initParameter: {
			baseUrl: jira.settings.baseUrl
		},
		closeCallback: function () {
			isLicenseDialogOpen = false;
		}
	});
}

function getJiraMarkupRenderer() {
	var inTableCount = 0;
	var lastOp = '';
	var lastColor = '';
	
	var reservedChars = [
		{ char: '|', regex: '\\|' },
		{ char: '*', regex: '\\*' },
		{ char: '+', regex: '\\+' },
		{ char: '_', regex: '\\_' },
		{ char: '-', regex: '\\-' },
		{ char: '!', regex: '\\!' }
	];

	function escapeText(text) {
		reservedChars.forEach(function (c) {
			text = text.replace(new RegExp(c.regex, 'g'), '\\' + c.char);
		});
		return text;
	}

	return new MailRenderer({
		renderTextElement: function(text, style, context) {
			lastOp = 'renderTextElement';
			
			//Escape characters that would change the markup (|,* , etc)
			text = escapeText(text);
			if (context && context.inHyperlink)
				return text;

			//Trim the spaces away and restore them later
			var trimmedText = text.trim();
			var prefix = text.substring(0, text.indexOf(trimmedText));
			var suffix = text.substring(text.indexOf(trimmedText) + trimmedText.length, text.length);
			var result = trimmedText;
			
			if(style.isBold)
				result = '*' + result + '*';
			
			if(style.isItalic)
				result = '_' + result + '_';
				
			if(style.isUnderline)
				result = '+' + result + '+';
				
			if(style.isStrikethrough)
				result = '-' + result + '-';
				
			if (style.color && style.color != '#1F497D' && style.color != '#000000') //Do not add Outlook standard blue or black as markup
				result = '{color:' + style.color + '}' + result + '{color}';
			 
			if (style.isHeading) { //Heading needs to be the first element in line. 
				result = 'h' + style.headingSize + '. ' + result;
			}
			
			return prefix + result + suffix; 
		},
		renderImage: function(image) {
			return '!' + image + '!';
		},		
		renderHyperlink: function(url, label, style) {
			lastOp = 'renderHyperlink';
			
			if(label)
				return '[' + label + '|' + url + ']';
			else
				return '[' + url + ']';
		},
		renderTable: function (time) {
			//JIRA does not support nested tables
			//So we count how often renderTable has been called and only render rows & cells if inTableCount = 1.
			lastOp = 'renderTable';
			
			if (time === 0)
				inTableCount++;
			else
				inTableCount--;
		},
		renderTableRow: function (time, type) {
			if (inTableCount > 1)
				return '';

			lastOp = 'renderTableRow';
			if (time === 0)
				return '|';
			else if(time === 1)
				return '\n';
				
			return '';
		},
		renderTableCell: function (time, rowType, colType) {
			if (inTableCount > 1)
				return '';

			lastOp = 'renderTableCell';
			if(time === 1)
				return ' |'; //Add trailing whitespace to support empty cells
		},
		renderNewLine: function () {
			if(inTableCount > 0 && lastOp === 'newLine')
				return '';
			if (inTableCount > 1 && lastOp === 'renderTable') //We ignore nested tables, so ignore their linebreaks as well.
				return '';

			lastOp = 'newLine';
			return '\n';
		},
		renderListLine: function(listLine) {
			var result = '';
			for(var i = 0; i <= listLine.indentLevel; i++) {
				if(listLine.indentStyle[i].format === 0) //decimal
					result = result + '#';
				else 
					result = result + '*';
			}
			
			result += ' ';
			return result;
		}
	});
}

function jiraSyncQueue() {
	var self = this;
	var lastPromise = null;

	this.add = function (fct, args) {
	    if (!$.isArray(args))
	        args = [args];

		return new Promise(function (resolve, reject) {
			var promise = null;
			if (lastPromise) {
				promise = lastPromise.finally(function () {
					return fct.apply(this, args);
				});
			} else {
			    promise = Promise.resolve().then(function() { return fct.apply(this, args) });
			}

			lastPromise = promise
			.then(function () {
				//next();
				resolve.apply(this, arguments);
			})
			.catch(function () {
				//next();
				resolve.apply(this, arguments);
			});
		});
	};
}

function jiraGetNotification(id) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.notification.getByExternalId1(id, resolve);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAddNotification(notif) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.notification.add1(notif, resolve);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraSaveNotification(notif) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.notification.save1(notif, resolve);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraGetCalendarItem(id) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.calendar.getAsync(id, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAddCalendarItem(item, calendarId) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.calendar.addAsync(item, calendarId, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraSaveCalendarItem(item) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.calendar.saveAsync(item, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraGetTask(id) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.getAsync(id, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAddTask(item, folderId) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.addAsync(item, folderId, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraSaveTask(item) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.saveAsync(item, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraRemoveTask(task) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.removeAsync(task, resolve, reject);
		} catch (e) {
			reject(e);
		}

	});
}

function jiraGetFolderTasks(folderId) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.getFolderTasksAsync(folderId, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraGetFolder(folderId) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.getFolderAsync(folderId, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAllFolders() {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.allFoldersAsync(resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraAddFolder(id, name, data, group, pos) {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.outlook.task.addFolderAsync({
				externalId: id,
				externalData: data,
				name: name,
				group: group,
				position: pos
			}, resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

function jiraGetProducts() {
	return new Promise(function (resolve, reject) {
		try {
			yasoon.license.getActiveProducts(resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}
//@ sourceURL=http://Jira/functions.js