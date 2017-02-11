
declare function jiraGetNotification(id);

declare function jiraAddNotification(notif);

declare function jiraSaveNotification(notif);

declare function jiraGetCalendarItem(id);

declare function jiraAddCalendarItem(item, calendarId?);

declare function jiraSaveCalendarItem(item);

declare function jiraGetTask(id);

declare function jiraAddTask(item, folderId);

declare function jiraSaveTask(item);

declare function jiraRemoveTask(task);

declare function jiraGetFolderTasks(folderId);

declare function jiraGetFolder(folderId);

declare function jiraAllFolders();

declare function jiraAddFolder(id, name, data?, group?, pos?);

declare function jiraGetProducts();

declare function jiraXmlToJson(xmlDom);

declare function jiraQueue();
declare function jiraIsLicensed(openDialog);

declare function jiraOpenPurchaseDialog();