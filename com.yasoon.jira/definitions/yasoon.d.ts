/// <reference path="bluebird.d.ts" />
interface yasoon_clipboard {
  addFile(handle: yasoonModel.FileHandle): number;
  remove(id: number): void;
  all(): any;
}

interface yasoon_license {
  openPurchaseWindow(productId: number, cbk: any): void;
  getActiveProducts(callback: any, error?: any): void;
}
interface yasoon_valueStore {
  putAttachmentHash(hash: string): any;
  queryAttachmentHashes(hashes: Array<string>): Promise<any>;
}
interface yasoon_dialog {
  open(param: yasoonModel.PopupDialogParameters): void;
  registerInline(target: yasoonModel.OutlookEntityType, param: yasoonModel.InlineDialogParameters): void;
  showMessageBox(text: string, buttons?: yasoonModel.MessageBoxButtons, cbk?: any): void;
  showInputBox(config: yasoonModel.InputDialogConfig): Promise<yasoonModel.InputBoxResult>;
  load(app: any): void;
  init(): void;
  clearEvents(): void;
  onClose(cbk: any): void;
  close(callbackVal: any): void;
  resizeBy(wDelta: number, hDelta: number): void;
}

interface yasoon_internal {
  showDevTools(): void;
  createNotificationImage(): void;
  changeNavigation(type: yasoonModel.NavigationType): void;
  switchDataFile(): void;
  sendLogs(): void;
  checkForUpdates(): void;
  showYasoon(): void;
  downloadCertificate(): void;
  isDevEnabled(): boolean;
  isNetworkLoggingEnabled(): boolean;
  showQueueMonitor(): void;
  cleanOutlook(): void;
  invalidateOAuth(): void;
  createApp(): void;
  reloadApp(): void;
  sync(): void;
  getSystemVersion(): string;
  getYasoonVersion(): string;
  rewriteCss(list: Array<yasoonModel.CssList>, cbk: any): void;
  hasBrandedApp(): boolean;
  getBrandedAppNamespace(): string;
  getBrandedAppName(): string;
  isFeedAvailable(): boolean;
  createSupportTicket(name: string, email: string, message: string, successCbk: any): void;
}

interface yasoon_command {
  all(): Array<yasoonModel.Command>;
}

interface yasoon_alert {
  alertType: any;
  add(alert: yasoonModel.Alert): boolean;
}

interface yasoon_outlook_ribbon {
}

interface yasoon_outlook_calendar {
  add(item: yasoonModel.CalendarItem, calendarId: string): yasoonModel.CalendarItem;
  addAsync(item: yasoonModel.CalendarItem, calendarId: string, cbk: any, err: any): void;
  get(externalId: string): yasoonModel.CalendarItem;
  getAsync(externalId: string, cbk: any, err: any): void;
  all(): Array<yasoonModel.CalendarItem>;
  addCalendar(externalId: string, name: string, externalData: string, groupName: string): void;
  getCalendar(externalId: string): yasoonModel.Folder;
  removeCalendar(externalId: string, deleteIfNonEmpty: boolean): void;
  allCalendars(): Array<yasoonModel.Folder>;
  getFutureItems(): Array<yasoonModel.CalendarItem>;
  save(item: yasoonModel.CalendarItem): void;
  saveAsync(item: yasoonModel.CalendarItem, cbk: any, err: any): void;
  remove(item: yasoonModel.CalendarItem): void;
  show(item: yasoonModel.CalendarItem): void;
}

interface yasoon_io {
  save(relativePath: string, base64Blob: string, overwrite: boolean): void;
  exists(relativePath: string): boolean;
  getFileIconPath(mime: string): string;
  getFilePreviewPath(handle: yasoonModel.FileHandle): Promise<string>;
  showFolderPicker(description: string, cbk: any): void;
  getFolder(folderId: string): yasoonModel.FolderHandle;
  getFileHash(handle: yasoonModel.FileHandle): Promise<string>;
  showFilePicker(title: string, filter: string, cbk: any, cancelCbk: any): void;
  get(relativePath: string): string;
  getLinkPath(relativePath: string): string;
  getAppLinkPath(appNamespace: string, relativePath: string): string;
  downloadToTemp(url: string, callback: any): yasoonModel.ProgressProvider;
  download(url: string, path: string, overwrite: boolean, callback: any, toTemp: boolean): yasoonModel.ProgressProvider;
  downloadAuthed(url: string, path: string, service: string, overwrite: boolean, callback: any): void;
}

interface yasoon_outlook_task {
  completionState: any;
  add(task: yasoonModel.Task, folderExternalId: string): yasoonModel.Task;
  addAsync(task: yasoonModel.Task, folderExternalId: string, cbk: any, err: any): void;
  addFolder(externalId: string, name: string, externalData: string, groupName: string): void;
  addFolderAsync(folder: yasoonModel.OutlookFolder, cbk: any, err: any): void;
  updateFolder(externalId: string, name: string, externalData: string, groupName: string): void;
  updateFolderAsync(folder: yasoonModel.OutlookFolder, cbk: any, err: any): void;
  getFolderTasks(externalId: string): Array<yasoonModel.Task>;
  getFolderTasksAsync(externalId: string, cbk: any, err: any): void;
  getFolder(externalId: string): yasoonModel.Folder;
  getFolderAsync(externalId: string, cbk: any, err: any): void;
  removeFolder(externalId: string, deleteIfNotEmpty: boolean): void;
  removeFolderAsync(externalId: string, deleteIfNotEmpty: boolean, cbk: any, err: any): void;
  allFolders(): Array<yasoonModel.Folder>;
  allFoldersAsync(cbk: any, err: any): void;
  get(externalId: string): yasoonModel.Task;
  getAsync(externalId: string, cbk: any, err: any): void;
  getByLocalId(localId: string): yasoonModel.Task;
  getByLocalIdAsync(localId: string, cbk: any, err: any): void;
  all(appNamespace: string): Array<yasoonModel.Task>;
  save(task: yasoonModel.Task): void;
  saveAsync(task: yasoonModel.Task, cbk: any, err: any): void;
  remove(task: yasoonModel.Task): void;
  removeAsync(task: yasoonModel.Task, cbk: any, err: any): void;
  show(task: yasoonModel.Task): void;
  showFolder(externalId: string): void;
}

interface yasoon_setting {
  getSupportedLocales(): Array<yasoonModel.Locale>;
  getUITexts(locale: string): any;
  getUserParameter(key: string): string;
  setUserParameter(key: string, value: string): void;
  getAppParameter(key: string): string;
  getAppParameters(): any;
  setAppParameter(key: string, value: string): void;
  getSettingsHtml(appNamespace: string): string;
  isProxyEnabled(): boolean;
  getProxyMode(): yasoonModel.ProxyMode;
  setProxyMode(mode: yasoonModel.ProxyMode): void;
  setProxyEnabled(enable: boolean): void;
  toggleProxy(enable: boolean): void;
  getSettingsContainer(appNamespace: string, container: any): boolean;
  saveSettings(appNamespace: string, parameters: any): boolean;
  getSidebarElements(): Array<string>;
  renderSidebarElement(appNamespace: string, container: any): void;
  saveProjectSetting(name: string, value: string): boolean;
  getProjectSetting(name: string): string;
  getLogLevel(): number;
}

interface yasoon_setup {
  isWizardRequired(): boolean;
  getOutlookAccounts(): Array<string>;
  validateAccountStore(emailAddress: string): yasoonModel.JsStoreInfo;
  execute(contact: yasoonModel.SetupContact, settings: yasoonModel.SetupSettings, callbackFunc: any): void;
  isInitialSyncComplete(): boolean;
  executeSimple(contact: yasoonModel.SetupContact, settings: yasoonModel.SetupSettings, callbackFunc: any): void;
  updateProfile(profileData: string, callbackFunc?: any): void;
  notifyWizardLaunch(): void;
  isProxyRequired(cbk: any): void;
  configureProxy(): boolean;
  continueWithToken(token: string, callbackFunc: any): void;
  findCompany(emails: Array<string>, cbk: any): void;
}

interface yasoon_store {
  categories(successCbk: any): void;
  all(successCbk: any): void;
  loadReviews(appId: number, callback: any): void;
  updateReview(appId: number, review: yasoonModel.StoreAppReview, callback: any): void;
  getUsage(callback: any): void;
  activateApp(appId: number, appVersionId: number, callback: any): void;
  updateAppVersion(appId: number, appVersionId: number): void;
  deactivateApp(appId: number, callback: any): void;
  downloadInvoice(invoiceId: number, transactionDate: Date): void;
  loadPaymentHistory(callback: any): void;
  getLatestVersions(callback: any): void;
  updatePayment(token: string, last4: string, cardType: string, callback: any): void;
  updatePlan(productId: number, currency: string, callback: any): void;
  getPlans(callback: any): void;
  getOwnPlan(callback: any): void;
  getPaymentDetails(callback: any): void;
  getCompany(callback: any): void;
  getOwnCompany(callback: any): void;
}

interface yasoon_util {
  xml2json(xml: string): string;
  buildFormHtml(parameters: Array<yasoonModel.FormParameter>): string;
  logActivity(activity: string, data: string): void;
  escapeString(data: string): string;
  unescapeString(data: string): string;
  log(message: string, severity?: yasoonModel.Severity, stack?: Array<string>): void;
  clearCookies(domain: string): boolean;

  severity: {
    error: 1,
    warning: 2,
    info: 3,
    success: 4
  };
}

interface yasoon_app {
  load(appNamespace: string, appObject: any): void;
  initI18n(): Promise<any>;
  get(appNamespace: string): yasoonModel.App;
  enterContext(appNamespace: string): string;
  leaveContext(token: string): void;
  install(app: yasoonModel.StoreApp, successCbk: any, errorCbk: any): void;
  download(app: yasoonModel.StoreApp, successCbk: any, errorCbk: any): void;
  update(appNamespace: string, jsonPath: string, callback: any): boolean;
  all(): Array<yasoonModel.App>;
  reportLoadError(error: string): void;
  callFunctionName(nameSpace: string, method: string, parameters: any): void;
  callFunction(nameSpace: string, method: any): void;
  getOAuthUrlAsync(appNamespace: string, serviceName: string, urlCallback: any, successCallback?: any, errorCallback?: any): void;
  hasValidOAuthToken(appNamespace: string, serviceName: string): boolean;
  isOAuthed(serviceName: string): boolean;
  invalidateAppOAuthToken(appNamespace: string, serviceName: string): void;
  invalidateOAuthToken(serviceName: string): void;
  getOAuthServiceNames(appNamespace: string): Array<string>;
  raiseAppLoaded(appNamespace: string): void;
  isHookRegistered(appNamespace: string, hook: string): boolean;
  getCurrentAppNamespace(): string;
  hasHigherVersion(oldVersion: string, newVersion: string): boolean;
  getOAuthService(name: string): yasoonModel.AppOauthService;
  getOAuthServices(): Array<yasoonModel.AppOauthService>;
  downloadManifest(appNamespace: string, callback: any): void;
  reloadApp(appNamespace: string): void;
}

interface yasoon_outlook {
  calendar: yasoon_outlook_calendar;
  mail: yasoon_outlook_mail;
  task: yasoon_outlook_task;

  supportsFeature(feature: string): boolean;
  isOffice365Account(): boolean;
  getStoreAccountSectionUID(): string;
  isOffice365AppInstalled(guid: string): boolean;
  getVersion(): number;
  showTaskPane(): boolean;
}

interface yasoon_outlook_mail {
  registerRenderer(name: string, cbkObj: any): void;
  showEmail(entryId: string, storeEntryId: string): void;
  get(entryId: string, storeEntryId: string): Promise<yasoonModel.Email>;
  showConversation(convSubject: string): void;
  renderSelection(mail: yasoonModel.OutlookEntity, format: string): Promise<string>;
  renderBody(mail: yasoonModel.OutlookEntity, format: string): Promise<string>;
  send(to: string, content: string): void;
  getConversationData(caller: yasoonModel.Email): string;
  setConversationData(caller: yasoonModel.Email, data: string): void;
}

interface yasoon_feed {
  enableLiveMode();
  addFilter(filter: any);
  saveSyncDate(d: Date);
  allowUpdate(id: string): boolean;
  get(feedId: string): yasoonModel.FeedEntry;
  all(filter: any): yasoonModel.PageEntity;
  getChildren(parentId: string, offset: number, limit: number): yasoonModel.PageEntity;
  countUnread(): number;
  getUnread(): yasoonModel.PageEntity;
  addComment(parent: yasoonModel.FeedEntry, comment: string, successCbk: any, attachments: any, errorCbk: any): void;
  render(appNamespace: string, feed: any): void;
  getFilterObject(cbk: any): void;
  addFilterCore(filters: any): void;
}

interface yasoon_notification {
  add(notif: yasoonModel.Notification): yasoonModel.Notification;
  add1(notif: yasoonModel.Notification, cbk: any): void;
  get(notificationId: number): yasoonModel.Notification;
  getByExternalId(externalId: string): yasoonModel.Notification;
  getByExternalId1(externalId: string, cbk: any): void;
  all(pageNo: number): yasoonModel.PageEntity;
  getAll(): yasoonModel.PageEntity;
  remove(notifId: number): boolean;
  save(notif: yasoonModel.Notification): boolean;
  save1(notif: yasoonModel.Notification, cbk: any): void;
  query(): Array<yasoonModel.Notification>;
  incrementCounter(): void;
  showPopup(param: yasoonModel.NotificationPopupParam): void;
}

interface yasoon_contact {
  add(contact: yasoonModel.Contact): yasoonModel.Contact;
  get(contactId: string, appNamespace?: string): yasoonModel.Contact;
  remove(contact: yasoonModel.Contact): void;
  save(contact: yasoonModel.Contact): void;
  getOwnUser(): yasoonModel.Contact;
  updateOwnUser(contact: yasoonModel.Contact): void;
}

interface yasoon {
  model: any;
  alert: yasoon_alert;
  app: yasoon_app;
  clipboard: yasoon_clipboard;
  command: yasoon_command;
  contact: yasoon_contact;
  dialog: yasoon_dialog;
  feed: yasoon_feed;
  internal: yasoon_internal;
  io: yasoon_io;
  license: yasoon_license;
  notification: yasoon_notification;
  outlook: yasoon_outlook;
  setting: yasoon_setting;
  setup: yasoon_setup;
  store: yasoon_store;
  util: yasoon_util;
  valueStore: yasoon_valueStore;

  i18n(identifier: string, params?: any): string;
  view: any;

  periodicCallback(intervalInSeconds: number, jsFunction: any): boolean;
  oauth(request: yasoonModel.AppOAuthRequest): yasoonModel.ProgressProvider;
  collectAnalytics(category: string, action: string, label: string): void;
  openBrowser(url: string): boolean;
  addHook(hook: string, jsFunction: any): void;
  invalidateHook(hook: string): void;
  isVisible(): boolean;
  isOnline(): boolean;
  consoleMode(active: boolean): void;

  ajaxMethod: {
    Post: 1,
    Put: 2,
    Patch: 3,
    Get: 4,
    Head: 5,
    Delete: 6
  }

  formData: {
    String: 1,
    Json: 2,
    File: 3
  }
}

declare namespace yasoonModel {
  interface FileHandle {
    id: number;
    inUse: boolean;

    getFileName(): string;
    setFileName(name: string): void;
    getFileSize(): number;
    getFileIconPath(forceRelative: boolean): string;
    getContentType(): string;
    hasFilePreview(): boolean;
    setInUse(): void;
    dispose(): void;
    saveTo(folder: yasoonModel.FolderHandle, cbk: any): void;
  }

  interface FolderHandle {
    folderId: string;
    path: string;
    permissions: yasoonModel.PermissionType;

    getSubfolder(folderName: string): yasoonModel.FolderHandle;
    createSubfolder(folderName: string): yasoonModel.FolderHandle;
  }

  enum PermissionType {
    Read = 1, ReadWrite = 2
  }

  interface PopupDialogParameters {
    width: number;
    height: number;
    title: string;
    resizable: boolean;
    closeCallback: any;
    closeCallbackNatives?: any;
    basePath?: string;
    htmlFile: string;
    initParameter: any;
    browserId?: number;
  }

  interface StoreUserProduct {
    id: number;
    validUntil: any;
  }

  enum OutlookEntityType {
    Task = 1, Appointment = 2, Mail = 3, Folder = 4, Contact = 5
  }

  interface InlineDialogParameters {
    width: string;
    widthValue: number;
    widthMode: yasoonModel.EmbedSizeMode;
    inspectorId: string;
    ExternalId: string;
    ItemType: yasoonModel.OutlookEntityType;
    basePath: string;
    htmlFile: string;
    initParameter: any;
    browserId: number;
  }

  enum EmbedSizeMode {
    Pixel = 0, Percentage = 1
  }

  enum MessageBoxButtons {
    OK = 0, OKCancel = 1, AbortRetryIgnore = 2, YesNoCancel = 3, YesNo = 4, RetryCancel = 5
  }

  interface InputDialogConfig {
    title: string;
    message: string;
    starred: boolean;
    backgroundImagePath: string;
    leftButtonText: string;
    rightButtonText: string;
    inputValue: string;
    attachments: Array<yasoonModel.OutlookAttachment>;
    inspectorId: string;
  }

  interface OutlookAttachment {
    parentEntryId: string;
    parentStoreId: string;
    fileName: string;
    fileSize: number;
    isHidden: boolean;
    isEmbeddedItem: boolean;
    mimeType: string;
    attachmentNumber: number;
    inspectorId: string;
    recordKey: string;
    parentWindowHandle: number;
    contentId: string;

    getFileHandle(): yasoonModel.FileHandle;
    showLoader(providers: Array<yasoonModel.ProgressProvider>): yasoonModel.ProgressHandler;
    completeLoader(): void;
  }

  interface ProgressProvider {
    Progress: number;

    getProgress(): number;
  }

  interface ProgressHandler {
    IsCompleted: boolean;

    setProgress(progress: number): void;
  }

  interface InputBoxResult {
    buttonPressed: number;
    inputText: string;
    starred: boolean;
    date: Date;
    attachments: Array<yasoonModel.OutlookAttachment>;
  }

  enum NavigationType {
    Folder = 0, Ribbon = 1
  }

  interface CssList {
    files: Array<string>;
  }

  interface Command {
    commandId: number;
    type: yasoonModel.CommandType;
    creationDate: Date;
    title: string;
    description: string;
    status: yasoonModel.CommandStatus;
    NextExecution: Date;

    complete(): void;
    retry(minutes: number): void;
  }

  enum CommandType {
    api = 1, oAuth = 2
  }

  enum CommandStatus {
    New = 1, InProcess = 2, Error = 3, Completed = 4
  }

  interface Alert {
    type: yasoonModel.AlertType;
    message: string;
    action?: yasoonModel.CustomAction;
  }

  enum AlertType {
    error = 1, warning = 2, info = 3, success = 4
  }

  interface CustomAction {
    description: string;
    eventHandler: any;
    url: string;
  }

  interface CalendarItem {
    entryId?: string;
    parentEntryId?: string;
    storeId?: string;
    subject?: string;
    body?: string;
    location?: string;
    attendees?: Array<string>;
    isHtmlBody?: boolean;
    isAllDay?: boolean;
    isResponsePossible?: boolean;
    startDate?: Date;
    endDate?: Date;
    reminderMinutesBeforeStart?: number;
    importance?: yasoonModel.AppointmentImportance;
    isPrivate?: boolean;
    responseStatus?: yasoonModel.AppointmentResponse;
    attachments?: Array<yasoonModel.OutlookAttachment>;
    categories?: Array<string>;
    internalLocalId?: number;
    externalId?: string;
    externalData?: string;
    inspectorId?: string;
    parentWindowHandle?: number;
    type?: yasoonModel.OutlookEntityType;

    save?(): void;
    remove?(): void;
    show?(): void;
    attach?(externalData: string): void;
    hasPendingChanges?(): boolean;
    getParentFolder?(): yasoonModel.Folder;
    getParentFolderAsync?(success: any, error: any): void;
    showMessageBox?(text: string): void;
    getSubject?(): string;
    showLoader?(providers: Array<yasoonModel.ProgressProvider>): yasoonModel.ProgressHandler;
    completeLoader?(): void;
    onClose?(handler: any): void;
    onSend?(callback: any): void;
    unbind?(): void;
    send?(): void;
    insertWordMarkup?(markup: string, loc: yasoonModel.InsertLocation): void;
    insertHtml?(html: string): void;
    setSubject?(newSubject: string): void;
    setMessageClass?(newMessageClass: string): void;
    setImportance?(newImportance: number): void;
    setFolder?(folderId: string): void;
    setBody?(body: string): void;
    setCategories?(categories: Array<string>): void;
    removeAttachments?(): void;
    getSelectionLinks?(): any;
    getBody?(format: yasoonModel.TextFormat): string;
    getSelection?(format: yasoonModel.TextFormat): string;
    setExternalData?(data: string): void;
    getAttachments?(): Array<yasoonModel.OutlookAttachment>;
  }

  enum AppointmentImportance {
    Low = 1, Normal = 2, High = 3
  }

  enum AppointmentResponse {
    None = 0, Organized = 1, Tentative = 2, Accepted = 3, Declined = 4, NotResponded = 5
  }

  interface Folder {
    entryId: string;
    parentEntryId: string;
    storeId: string;
    folderName: string;
    defaultItemType: yasoonModel.rdoItemType;
    internalLocalId: number;
    externalId: string;
    externalData: string;
    inspectorId: string;
    parentWindowHandle: number;
    type: yasoonModel.OutlookEntityType;
  }

  enum rdoItemType {
    olMailItem = 0, olAppointmentItem = 1, olContactItem = 2, olTaskItem = 3, olJournalItem = 4, olNoteItem = 5, olPostItem = 6, olDistributionListItem = 7
  }

  enum InsertLocation {
    Top = 0, Bottom = 1, ReplyBeforeQuoted = 2
  }

  enum TextFormat {
    PlainText = 0, WordMarkup = 1, Markdown = 2
  }

  interface Task {
    entryId: string;
    parentEntryId: string;
    storeId: string;
    subject: string;
    body: string;
    isHtmlBody: boolean;
    startDate: Date;
    dueDate: Date;
    reminderDate: Date;
    completionState: yasoonModel.TaskCompletionState;
    completionPercent: number;
    importance: yasoonModel.TaskImportance;
    owner: string;
    categories: Array<string>;
    internalLocalId: number;
    externalId: string;
    externalData: string;
    inspectorId: string;
    parentWindowHandle: number;
    type: yasoonModel.OutlookEntityType;

    setStartDate(dateTime: Date): void;
    setDueDate(dateTime: Date): void;
    setCompletionState(state: yasoonModel.OlTaskStatus): void;
    setReminderDate(dateTime: Date): void;
    setOwner(owner: string): void;
    setCompletionPercentage(percentage: number): void;
    save(success: any, error: any): void;
    remove(): void;
    show(): void;
    attach(externalData: string): void;
    hasPendingChanges(): boolean;
    getParentFolder(): yasoonModel.Folder;
    getParentFolderAsync(success: any, error: any): void;
    showMessageBox(text: string): void;
    getSubject(): string;
    showLoader(providers: Array<yasoonModel.ProgressProvider>): yasoonModel.ProgressHandler;
    completeLoader(): void;
    onClose(handler: any): void;
    onSend(callback: any): void;
    unbind(): void;
    send(): void;
    insertWordMarkup(markup: string, loc: yasoonModel.InsertLocation): void;
    insertHtml(html: string): void;
    setSubject(newSubject: string): void;
    setMessageClass(newMessageClass: string): void;
    setImportance(newImportance: number): void;
    setFolder(folderId: string): void;
    setBody(body: string): void;
    setCategories(categories: Array<string>): void;
    removeAttachments(): void;
    getSelectionLinks(): any;
    getBody(format: yasoonModel.TextFormat): string;
    getSelection(format: yasoonModel.TextFormat): string;
    setExternalData(data: string): void;
    getAttachments(): Array<yasoonModel.OutlookAttachment>;
  }

  enum TaskCompletionState {
    NotStarted = 0, InProgress = 1, Completed = 2, TaskWaiting = 3, TaskDeferred = 4
  }

  enum TaskImportance {
    Low = 1, Normal = 2, High = 3
  }

  enum OlTaskStatus {
    olTaskNotStarted = 0, olTaskInProgress = 1, olTaskComplete = 2, olTaskWaiting = 3, olTaskDeferred = 4
  }

  interface OutlookFolder {
    name: string;
    externalId: string;
    externalData?: string;
    group?: string;
    position?: number;
    allowManualSort?: boolean;
  }

  interface Locale {
    LocaleKey: string;
    LocaleName: string;
    DefaultLocale: boolean;
  }

  enum ProxyMode {
    bypassProxy = 1, customProxy = 2
  }

  interface JsStoreInfo {
    userChoiceRequired: boolean;
    stores: Array<yasoonModel.JsStore>;
  }

  interface JsStore {
    name: string;
    entryId: string;
    restriction: string;
    restrictionSeverity: yasoonModel.Severity;
  }

  enum Severity {
    error = 1, warning = 2, info = 3, success = 4
  }

  interface SetupContact {
    contactEmail: string;
    contactFirstName: string;
    contactLastName: string;
    aboutMe: string;
    image: yasoonModel.Base64Image;
  }

  interface Base64Image {
    image: string;
    xOffset: number;
    yOffset: number;
    height: number;
    width: number;
  }

  interface SetupSettings {
    store: string;
    loggingEnabled: boolean;
    subscribe: boolean;
  }

  interface StoreAppReview {
    rating: number;
    title: string;
    comment: string;
    userName: string;
    createdAt: Date;
    userId: number;
  }

  interface FormParameter {
    key: string;
    value: string;
    label: string;
    type: yasoonModel.FormParameterType;
    dropdownValues: any;
    children: Array<yasoonModel.FormParameter>;
  }

  enum FormParameterType {
    Text = 1, TextArea = 2, Checkbox = 3, DropDown = 4, Container = 5
  }

  interface App {
    id: number;
    versionId: number;
    active: boolean;
    title: string;
    version: string;
    vendorUrl: string;
    description: string;
    iconFile: string;
    notificationIconFile: string;
    moduleFile: string;
    IsAuthorized: boolean;
    files: Array<string>;
    main: string;
    basePath: string;
    authorizations: any;
    mainOauthService: yasoonModel.AppOauthService;
    homepage: string;
    logoImage: string;
    notificationImage: string;
    oauth: any;

    getMissingAuthorizations(): any;
    activate(): void;
    deactivate(): void;
    load(cbk: any): void;
    openHomepage(): void;
  }

  interface AppOauthService {
    serviceName: string;
    oauthVersion: yasoonModel.OauthVersion;
    clientId: string;
    clientSecret: string;
    clientCertificate: string;
    signatureMethod: yasoonModel.OauthSignatureMethod;
    requestUrl: string;
    requestMethod: yasoonModel.HttpDeliveryMethods;
    authorizationUrl: string;
    authorizationMethod: yasoonModel.HttpDeliveryMethods;
    tokenUrl: string;
    tokenMethod: yasoonModel.HttpDeliveryMethods;
    accessToken: string;
    refreshToken: string;
    accessTokenSecret: string;
    accessTokenExpirationDate: Date;
    accessTokenExpirationDuration: number;
    appParams: any;
    mainService: boolean;
    customCertificate: string;
    IsLocal: boolean;
    HasRequestParameters: boolean;
  }

  enum OauthVersion {
    V10a = 1, V2 = 2
  }

  enum OauthSignatureMethod {
    plain = 1, hmacSha1 = 2, rsaSha1 = 3
  }

  enum HttpDeliveryMethods {
    None = 0, AuthorizationHeaderRequest = 1, PostRequest = 2, GetRequest = 4, PutRequest = 8, DeleteRequest = 16, HeadRequest = 32, PatchRequest = 64, OptionsRequest = 128, HttpVerbMask = 254
  }

  interface StoreApp {
    id: number;
    name: string;
    logoUrl: string;
    rating: number;
    ratingCount: number;
    changeLog: string;
    company: yasoonModel.StoreCompany;
    categories: Array<yasoonModel.AppCategory>;
    currentVersion: yasoonModel.StoreAppVersion;
  }

  interface StoreCompany {
    id: number;
    name: string;
    logoUrl: string;
    contactEmail: string;
    comment: string;
    settings: yasoonModel.MaybeCompanySettings;
    admins: Array<yasoonModel.StoreUser>;
  }

  interface MaybeCompanySettings {
    welcomeText: string;
  }

  interface StoreUser {
    id: number;
    firstName: string;
    lastName: string;
    emailAddress: string;
    aboutMe: string;
    locale: string;
    role: number;
    isSubscribed: boolean;
    company: yasoonModel.StoreUserCompany;
  }

  interface StoreUserCompany {
    id: number;
    name: string;
    contactEmail: string;
    settings: yasoonModel.StoreCompanySettings;
  }

  interface StoreCompanySettings {
    welcomeText: string;
  }

  interface AppCategory {
    category: number;
  }

  interface StoreAppVersion {
    id: number;
    version: string;
    downloadUrl: string;
    fileHash: string;
    releasedAt: Date;
    authorizations: Array<yasoonModel.AppAuthorization>;
    descriptions: Array<yasoonModel.AppDescription>;
    pictures: Array<yasoonModel.AppPicture>;
    status: number;
  }

  interface AppAuthorization {
    authorization: yasoonModel.Authorization;
    authorizationMode: yasoonModel.AuthorizationMode;
    filter: string;
    name: yasoonModel.Authorization;
    mode: yasoonModel.AuthorizationMode;
    AuthorizationDescription: string;
  }

  enum Authorization {
    Attachments = 1, Calendar = 2, Categories = 3, Contacts = 4, Mails = 5, Notes = 6, Notifications = 7, Tasks = 8, Files = 9, UserProfile = 10, CoreApi = 11
  }

  enum AuthorizationMode {
    Read = 1, Write = 2, Full = 3
  }

  interface AppDescription {
    language: string;
    shortDescription: string;
    longDescription: string;
  }

  interface AppPicture {
    pictureUrl: string;
    pictureDescriptions: Array<yasoonModel.AppPictureDescription>;
  }

  interface AppPictureDescription {
    language: string;
    description: string;
  }

  interface Email {
    entryId: string;
    parentEntryId: string;
    storeId: string;
    messageId: string;
    subject: string;
    isHtmlBody: boolean;
    body: string;
    receivedAt: Date;
    sentOn: Date;
    reminderDate: Date;
    isSignedOrEncrypted: boolean;
    categoriesList: string;
    categories: Array<string>;
    senderEmail: string;
    senderName: string;
    attachments: Array<yasoonModel.OutlookAttachment>;
    recipients: Array<string>;
    unread: boolean;
    importance: yasoonModel.MailImportance;
    sensitivity: number;
    flagStatus: number;
    isSent: boolean;
    conversationId: string;
    conversationTopic: string;
    internalLocalId: number;
    externalId: string;
    externalData: string;
    inspectorId: string;
    parentWindowHandle: number;
    type: yasoonModel.OutlookEntityType;

    getOffice365WebLink(): string;
    getFileHandle(): yasoonModel.FileHandle;
    getConversationData(): string;
    setConversationData(data: string): void;
    attach(externalData: string): void;
    hasPendingChanges(): boolean;
    getParentFolder(): yasoonModel.Folder;
    getParentFolderAsync(success: any, error: any): void;
    showMessageBox(text: string): void;
    getSubject(): string;
    showLoader(providers: Array<yasoonModel.ProgressProvider>): yasoonModel.ProgressHandler;
    completeLoader(): void;
    onClose(handler: any): void;
    onSend(callback: any): void;
    persistAttachments(attachments: Array<yasoonModel.EmailAttachmentFileHandle>, cbk: any, err: any): void;
    unbind(): void;
    send(): void;
    insertWordMarkup(markup: string, loc: yasoonModel.InsertLocation): void;
    insertHtml(html: string): void;
    setSubject(newSubject: string): void;
    setMessageClass(newMessageClass: string): void;
    setImportance(newImportance: number): void;
    setFolder(folderId: string): void;
    setBody(body: string): void;
    setCategories(categories: Array<string>): void;
    removeAttachments(): void;
    getSelectionLinks(): any;
    getBody(format: yasoonModel.TextFormat): string;
    getSelection(format: yasoonModel.TextFormat): string;
    setExternalData(data: string): void;
    getAttachments(): Array<yasoonModel.OutlookAttachment>;
  }

  enum MailImportance {
    Low = 1, Normal = 2, High = 3
  }

  interface OutlookEntity {
    internalLocalId: number;
    entryId: string;
    externalId: string;
    externalData: string;
    inspectorId: string;
    parentWindowHandle: number;
    type: yasoonModel.OutlookEntityType;
  }

  interface FeedEntry {
    feedId: string;
    feedType: number;
    subType: number;
    parentId: string;
    rootId: string;
    App: yasoonModel.App;
    externalData: string;
    contactId: string;
    lastActivity: Date;
    childCount: number;
    isRead: boolean;
    title: string;
    content: string;
    notifId: number;
    pictureUrl: string;
    contentHtml: string;
    properties: yasoonModel.FeedProperties;
    hierarchy: Array<yasoonModel.FeedEntry>;

  }

  interface FeedProperties {
    actionComment: boolean;
    customActions: Array<yasoonModel.CustomAction>;
    customLabels: Array<yasoonModel.CustomLabel>;
  }

  interface CustomLabel {
    description: string;
    url: string;
    labelColor: string;
  }

  interface PageEntity {
    CurrentPage: number;
    ItemsPerPage: number;
    TotalPages: number;
    TotalItems: number;
    PageBufferKey: number;
    ItemEntityType: string;
    Items: Array<yasoonModel.Entity>;

    nextPage(): yasoonModel.PageEntity;
    page(page: number): yasoonModel.PageEntity;
    previousPage(): yasoonModel.PageEntity;
  }

  interface Entity {
  }

  interface Notification {
    notificationId?: number;
    type?: yasoonModel.NotificationType;
    externalId?: string;
    externalData?: string;
    contactId?: string;
    title?: string;
    content?: string;
    isRead?: boolean;
    createdAt?: Date;
    parentNotificationId?: number;
  }

  enum NotificationType {
    Notification = 1, Task = 2, Activity = 3, Appointment = 4
  }

  interface NotificationPopupParam {
    imagePath?: string;
    contactId?: string;
    title: string;
    text?: string;
    click?: any;
    eventParam?: any;
  }

  interface Contact {
    contactId?: string;
    contactEmail?: string;
    contactFirstName?: string;
    contactLastName?: string;
    status?: yasoonModel.ContactStatus;
    notifies?: boolean;
    follows?: boolean;
    aboutMe?: string;
    keywords?: string;
    birthday?: Date;
    externalAvatarUrl?: string;
    joinDate?: Date;
    externalData?: string;
    useAuthedDownloadService?: string;
    ImageURL?: string;
    NotificationImageURL?: string;

    save?(): boolean;
    remove?(): boolean;
  }

  enum ContactStatus {
    OwnUser = 1, Invited = 2, Active = 3, Inactive = 4
  }

  interface AppOAuthRequest {
    url: string;
    oauthServiceName: string;
    type: yasoonModel.WebRequestMethod;
    data?: string;
    formData?: Array<yasoonModel.FormData>;
    file?: yasoonModel.FileHandle;
    headers?: any;
    success?: (data: string, callbackParameter: any, headers: any) => void;
    error?: (data: string, statusCode: number, result: string, errorText: string, cbkParam: any) => void;
    callbackParameter?: any;
  }

  enum WebRequestMethod {
    Post = 1, Put = 2, Patch = 3, Get = 4, Head = 5, Delete = 6
  }

  interface FormData {
    name: string;
    type: yasoonModel.FormDataType;
    value: Object;
  }

  enum FormDataType {
    String = 1, Json = 2, File = 3
  }


  interface EmailAttachmentFileHandle extends FileHandle {
    contentId: string;
    id: number;
    inUse: boolean;
  }

}
declare var yasoon: yasoon;


declare function getStackTrace(e: Error): string[];