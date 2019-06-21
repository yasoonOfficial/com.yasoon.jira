/// <reference path="../definitions/bluebird.d.ts" />
/// <reference path="../definitions/jira.d.ts" />
/// <reference path="../definitions/common.d.ts" />
/// <reference path="../definitions/yasoon.d.ts" />
/// <reference path="../models/issueTask.ts" />

declare var jira: any;

class JiraRibbonController {

	createRibbon = (ribbonFactory) => {
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
				onAction: this.ribbonOnNewIssue
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
				onAction: this.ribbonOnNewIssue
			}, {
				id: 'addToIssueFullMail',
				type: 'button',
				image: 'logo_icon1.png',
				label: yasoon.i18n('ribbon.addToIssue'),
				onAction: this.ribbonOnAddToIssue
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
				onAction: this.uploadAttachment
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
		var newIssueRibbons = this.createContextRibbonItems(yasoon.i18n('ribbon.newIssue'), 'newIssueFromText', this.ribbonOnNewIssue);
		contextMenuItems = contextMenuItems.concat(newIssueRibbons);

		var addToIssueRibbons = this.createContextRibbonItems(yasoon.i18n('ribbon.addToIssue'), 'addToIssueFromText', this.ribbonOnAddToIssue);
		contextMenuItems = contextMenuItems.concat(addToIssueRibbons);

		let office365AppGuid = "7164e150-dc86-49ff-b549-1bac57abdc7c";
		let hasOffice365App = yasoon.outlook.isOffice365AppInstalled(office365AppGuid);

		/*
			<group idQ="online:Group_7164e150-dc86-49ff-b549-1bac57abdc7c_groupJiraMsgRead" insertAfterMso="GroupMailRespond">
				<button idQ="online:Btn_7164e150-dc86-49ff-b549-1bac57abdc7c_buttonJiraOpenNewEdit" visible="false"/>
				<button idQ="online:Btn_7164e150-dc86-49ff-b549-1bac57abdc7c_buttonJiraOpenAddToIssue" visible="false"/>
			</group>
		*/
		let hideOffice365RibbonMail = {
			type: 'group',
			idQ: 'jira_online:Group_' + office365AppGuid + '_groupJiraMsgRead_TabMail',
			insertAfterMso: 'GroupMailRespond',
			items: [{
				type: 'button',
				idQ: 'jira_online:Btn_' + office365AppGuid + '_buttonJiraOpenNewEdit_TabMail',
				visible: false
			}, {
				type: 'button',
				idQ: 'jira_online:Btn_' + office365AppGuid + '_buttonJiraOpenAddToIssue_TabMail',
				visible: false
			}]
		};

		let explorerRibbon: any = {
			type: 'ribbon',
			renderTo: [
				'Microsoft.Outlook.Explorer'
			],
			namespaces: {
				"jira_online": office365AppGuid + "_" + yasoon.outlook.getStoreAccountSectionUID()
			},
			items: [{
				type: 'tabs',
				items: [{
					type: 'tab',
					idMso: 'TabMail',
					items: [{
						type: 'group',
						id: 'jiraMailExplorerGroup',
						insertAfterMso: 'GroupMailRespond',
						label: 'Jira',
						image: 'brandedlogo-64',
						items: this.createJiraRibbonGroup('MailMain')
					}]
				},
				{
					type: 'tab',
					idMso: 'TabTasks',
					items: [{
						type: 'group',
						id: 'jiraTaskExplorerGroup',
						insertAfterMso: 'GroupTaskRespond',
						label: 'Jira',
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
								onAction: this.ribbonRefreshTasks
							}, {
								type: 'menu',
								id: 'RefreshMenu',
								items: [{
									type: 'button',
									id: 'jiraTaskForceRefresh',
									label: yasoon.i18n('ribbon.forceSyncTasks'),
									onAction: this.ribbonRefreshTasks
								}]
							}]
						}]
					}]
				}]
			}]
		};

		/*if (hasOffice365App) {
			explorerRibbon.items[0].items[0].items.unshift(hideOffice365RibbonMail);
		}*/

		ribbonFactory.create(explorerRibbon);

		//Add Mail Read
		let mailReadRibbon: any = {
			type: 'ribbon',
			renderTo: [
				'Microsoft.Outlook.Mail.Read'
			],
			namespaces: {
				"jira_online": office365AppGuid + "_" + yasoon.outlook.getStoreAccountSectionUID()
			},
			items: [{
				type: 'tabs',
				items: [{
					type: 'tab',
					idMso: 'TabReadMessage',
					items: [{
						type: 'group',
						id: 'jiraMailReadGroup',
						insertAfterMso: 'GroupShow',
						label: 'Jira',
						image: 'brandedlogo-64',
						items: this.createJiraRibbonGroup('MailRead')
					}]
				}]
			}]
		};

		let hideOffice365RibbonRead = {
			type: 'group',
			idQ: 'jira_online:Group_' + office365AppGuid + '_groupJiraMsgRead_TabReadMessage',
			insertAfterMso: 'GroupShow',
			items: [{
				type: 'button',
				idQ: 'jira_online:Btn_' + office365AppGuid + '_buttonJiraOpenNewEdit_TabReadMessage',
				visible: false
			}, {
				type: 'button',
				idQ: 'jira_online:Btn_' + office365AppGuid + '_buttonJiraOpenAddToIssue_TabReadMessage',
				visible: false
			}]
		};

		/*
		if (hasOffice365App) {
			mailReadRibbon.items[0].items[0].items.unshift(hideOffice365RibbonRead);
		}
		*/

		ribbonFactory.create(mailReadRibbon);

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
						label: 'Jira',
						items: [{
							type: 'button',
							id: 'jiraOpenTask',
							size: 'large',
							label: 'Open Issue',
							image: 'images/ribbonOpen.png',
							visible: 'appItem',
							onAction: this.ribbonOpenIssue
						}, {
							type: 'button',
							id: 'jiraEditTask',
							size: 'large',
							label: 'Edit Issue',
							image: 'brandedlogo-64',
							visible: 'appItem',
							onAction: this.ribbonEditIssue
						}, {
							id: 'jiraAddTask',
							type: 'button',
							size: 'large',
							image: 'images/ribbonAdd.png',
							visible: 'appItem',
							label: yasoon.i18n('ribbon.addToIssue'),
							onAction: this.ribbonOnAddToIssue
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

	createContextRibbonItems(label, id, action) {
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

		mailContextMenuMso.forEach((mso, i) => {
			var counter = i + 1;
			result.push({
				type: 'contextMenu',
				idMso: mso,
				items: [{
					type: 'button',
					id: id + '' + ((counter != 1) ? counter : ''), //Don't ask! compatibility with old ribbon updater
					label: label,
					image: 'logo_icon1.png',
					onAction: action
				}]
			});
		});

		return result;
	};

	createJiraRibbonGroup(id) {
		var ribbon: any[] = [{
			type: 'button',
			id: 'newIssueFrom' + id,
			size: 'large',
			label: yasoon.i18n('ribbon.newIssue'),
			image: 'images/ribbonNew.png',
			onAction: this.ribbonOnNewIssue
		}, {
			type: 'button',
			id: 'addToIssueFrom' + id,
			size: 'large',
			label: yasoon.i18n('ribbon.addToIssue'),
			image: 'images/ribbonAdd.png',
			onAction: this.ribbonOnAddToIssue
		}, {
			type: 'button',
			id: 'openIssueFrom' + id,
			enabled: false,
			size: 'large',
			label: yasoon.i18n('ribbon.openIssue'),
			image: 'images/ribbonOpen.png',
			onAction: this.ribbonOpenIssue
		}, {
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

		return ribbon;
	}

	updateRibbons(item, inspectorId) {
		if (!item)
			return;

		var parameters = (inspectorId) ? inspectorId : true;
		var method = (inspectorId) ? 'updateSingle' : 'update';

		if (jiraIsTask(item) || item.fields) { //In update we do not have an up-to-date task, so we insert the issue.
			var issue = item;
			if (!issue.fields)
				issue = JSON.parse(item.externalData);

			if (issue.transitions) {
				var transitionItems = [];
				issue.transitions.forEach((t) => {
					transitionItems.push({
						type: 'button',
						id: 'transition-' + t.id,
						label: t.name,
						externalData: JSON.stringify({ transitionId: t.id, issueKey: issue.key, issueId: issue.id }),
						onAction: this.ribbonExecuteTransition
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
						Object.keys(convData.issues).forEach((key) => {
							var currentItem = convData.issues[key];
							convItems.push({
								type: 'button',
								id: 'openIssueMenu-' + currentItem.id,
								label: yasoon.i18n('ribbon.openIssueWithKey', { key: currentItem.key }),
								externalData: currentItem.key,
								image: 'images/ribbonOpen.png',
								onAction: this.ribbonOpenIssue
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
			} else {
				let jiraUrl = jira.settings.baseUrl;
				let issuePattern = new RegExp(jiraUrl + '\/browse\/([^"^\\?^\\/^>]+?-[0-9]+)', 'g');
				let matches = issuePattern.exec(item.getBody(0));
				let issueKey = null;
				if (matches && matches.length > 0) {
					issueKey = matches[1];
				}

				if (issueKey) {
					jira.ribbonFactory[method](ribbonButton, {
						label: yasoon.i18n('ribbon.openIssueWithKey', { key: issueKey }),
						externalData: issueKey,
						enabled: true,
						visible: true
					}, parameters);

					jira.ribbonFactory[method](ribbonDynamicMenu, {
						visible: false
					}, parameters);

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
	}

	updateAttachmentRibbons(item, inspectorId) {
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
					Object.keys(convData.issues).forEach((key) => {
						var currentItem = convData.issues[key];
						convItems.push({
							type: 'button',
							id: 'uploadToIssue-' + currentItem.id,
							label: yasoon.i18n('ribbon.uploadToIssueWithKey', { key: currentItem.key }),
							externalData: currentItem.key,
							image: 'images/ribbonOpen.png',
							onAction: this.uploadAttachment
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
	}

	ribbonOpenIssue(ribbonId, ribbonCtx) {
		console.log(arguments);
		var issueKey = null;
		if (ribbonCtx.externalData)
			issueKey = ribbonCtx.externalData;
		else if (ribbonCtx.items && ribbonCtx.items.length > 0)
			issueKey = ribbonCtx.items[0].externalId;

		if (issueKey) {
			try {
				yasoon.openBrowser(jira.settings.baseUrl + '/browse/' + issueKey);
			} catch (e) {
				yasoon.util.log('Error in ribbonOpenIssue' + e.message, yasoon.util.severity.warning);
			}
		}
		else
			yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotOpenIssue'));
	};

	ribbonEditIssue(ribbonId, ribbonCtx) {
		if (!jiraIsLicensed(true)) {
			return;
		}

		if (!ribbonCtx.items && ribbonCtx.items.length === 0) {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotOpenIssue'));
			return;
		}

		var outlookTask = ribbonCtx.items[0];
		var issue = JSON.parse(outlookTask.externalData);
		new JiraIssueNotification(issue).editIssue((type, data) => {
			if (data && data.action === 'success') {
				return jira.issues.get(issue.key, true)
					.then((newIssue) => {
						new JiraIssueTask(newIssue).saveInspector(outlookTask);
						jira.sync();
					});
			}
		});
	}

	uploadAttachment(ribbonId, ribbonCtx) {

		if (ribbonCtx.items && ribbonCtx.items.length > 0) {
			//Upload every file to the issue and show Loader
			var formData = [];
			ribbonCtx.items.forEach((file) => {
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
				headers: { Accept: 'application/json', 'X-Atlassian-Token': 'no-check' },
				error: function (data, statusCode, result, errorText, cbkParam) {
					yasoon.dialog.showMessageBox(yasoon.i18n('general.couldNotUploadAttachments') + ' - ' + errorText);
				},
				success: function () {
					ribbonCtx.items[0].completeLoader();
					jira.sync();
				}
			});

			ribbonCtx.items[0].showLoader([progressProvider]);
		}
	}

	ribbonExecuteTransition = (ribbonId, ribbonCtx) => {
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
			.then((data: string) => {
				var transObj = JSON.parse(data);
				if (transObj.transitions[0].hasScreen) {
					yasoon.openBrowser(jira.settings.baseUrl + '/login.jsp?os_destination=' + encodeURIComponent('/secure/CommentAssignIssue!default.jspa?id=' + issueId + '&action=' + transitionId));
				} else {
					return jiraAjax('/rest/api/2/issue/' + issueKey + '/transitions', yasoon.ajaxMethod.Post, body)
						.then(() => {
							return jira.issues.get(issueKey, true);
						})
						.then((newIssue) => {
							jira.ribbonFactory.updateSingle('jiraTransitionDynamicMenu', {
								enabled: true
							}, issue.inspectorId);

							this.updateRibbons(newIssue, issue.inspectorId);
							new JiraIssueTask(newIssue).saveInspector(issue);
							jira.sync();
						});
				}
			})
			.catch((error) => {
				var msg = (error.getUserFriendlyError) ? error.getUserFriendlyError() : error;
				yasoon.dialog.showMessageBox(yasoon.i18n('notification.changeStatusNotPossible', { error: msg }));
				yasoon.util.log('Unexpected error in Set Transition in Task: ' + error, yasoon.util.severity.error, getStackTrace(error));

				jira.ribbonFactory.updateSingle('jiraTransitionDynamicMenu', {
					enabled: true
				}, issue.inspectorId);
			});
	};

	ribbonRefreshTasks(ribbonId, ribbonCtx) {
		jira.ribbonFactory.update('jiraTaskSync', {
			enabled: false
		}, true);

		var forceSync = (ribbonId == 'jiraTaskForceRefresh');

		jira.tasks.syncTasks(forceSync)
			.then(() => {
				yasoon.dialog.showMessageBox(yasoon.i18n('general.taskSyncSuccess'));

				jira.ribbonFactory.update('jiraTaskSync', {
					enabled: true
				}, true);
			})
			.catch(() => {
				yasoon.dialog.showMessageBox(yasoon.i18n('general.taskSyncFailed'));
			});
	}

	ribbonOnNewIssue = (ribbonId, ribbonCtx) => {
		if (!jiraIsLicensed(true)) {
			return;
		}
		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.loginFirst'));
			return;
		}

		var initParams: any = {
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
			closeCallback: this.ribbonOnCloseNewIssue
		};

		if (ribbonId == 'newIssueFullMail' || ribbonId == 'newIssueFromMailMain' || ribbonId == 'newIssueFromMailRead') {
			//Ribbon on Mail Item
			initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
			initParams.type = 'wholeMail';

		} else if (ribbonId == 'newIssue') {
			//Ribbon in Standard New EMail Dropdown
			initParams.type = '';
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
			initParams.type = 'selectedText';
		}

		yasoon.dialog.open(dialogOptions);
		return;
	}

	ribbonOnAddToIssue = (ribbonId, ribbonCtx) => {
		if (!jiraIsLicensed(true)) {
			return;
		}

		if (!jira.settings.currentService || !yasoon.app.isOAuthed(jira.settings.currentService)) {
			yasoon.dialog.showMessageBox(yasoon.i18n('general.loginFirst'));
			return;
		}

		var initParams: any = {
			settings: jira.settings,
			ownUser: jira.data.ownUser,
			projects: jira.data.projects,
			systemInfo: jira.sysInfo
		};

		var dialogOptions = {
			width: 610,
			height: 625,
			title: yasoon.i18n('dialog.addToIssueDialogTitle'),
			resizable: true,
			htmlFile: 'Dialogs/jiraAddToIssue.html',
			initParameter: initParams,
			closeCallback: this.ribbonOnCloseAddToIssue
		};

		if (ribbonId == 'addToIssueFullMail' || ribbonId == 'addToIssueFromMailMain' || ribbonId == 'addToIssueFromMailRead') {
			initParams.mail = ribbonCtx.items[ribbonCtx.readingPaneItem];
			initParams.type = 'wholeMail';
		} else if (ribbonId == 'jiraAddTask') {
			var task = ribbonCtx.items[ribbonCtx.readingPaneItem];
			initParams.issue = JSON.parse(task.externalData);
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
			initParams.type = 'selectedText';
		}

		yasoon.dialog.open(dialogOptions);
	}

	ribbonOnCloseNewIssue(type, data) {
		if (data && data.action === 'success')
			jira.sync();

		if (data && data.issueKey) {
			var text = '';
			var title = '';
			if (data.changeType === 'updated') {
				text = yasoon.i18n('dialog.successAddPopupText', { key: data.issueKey });
				title = yasoon.i18n('dialog.successAddPopupTitle');
			} else {
				text = yasoon.i18n('dialog.successPopupText', { key: data.issueKey });
				title = yasoon.i18n('dialog.successPopupTitle');
			}
			yasoon.notification.showPopup({ title: title, text: text, click: notificationOpenIssue, eventParam: { issueKey: data.issueKey } });
		}

		if (data && data.mail) {
			yasoon.outlook.mail.get(data.mail.entryId, data.mail.storeId)
				.then((mail) => {
					jira.ribbons.updateRibbons(mail);
				});
		}
	}

	ribbonOnCloseAddToIssue(type, data) {
		if (data && data.action === 'success')
			jira.sync();

		if (data && data.mail) {
			yasoon.outlook.mail.get(data.mail.entryId, data.mail.storeId)
				.then((mail) => {
					jira.ribbons.updateRibbons(mail);
				});
		}
	}
}