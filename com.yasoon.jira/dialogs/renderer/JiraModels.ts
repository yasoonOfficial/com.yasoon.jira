export interface JiraSchema {
    type: string,
    custom?: string,
    customId?: string,
    system?: string
}

export interface JiraValue {
    id: string,
    name?: string,
    key?: string,
    value?: string,
    iconUrl?: string,
    children?: Array<JiraValue>
}

export interface JiraRequestTypeFieldValue {
    label: string,
    value?: string,
    children?: Array<JiraValue>
}

export interface JiraSentObj {
    id?: string,
    name?: string,
    child?: JiraSentObj
}

export interface JiraTimetrackingValue {
    originalEstimate?: string,
    remainingEstimate?: string
}

export interface JiraGroups {
    total: number,
    header: string,
    groups: JiraGroup[]
}

export interface JiraGroup {
    html?: string,
    labels?: JiraGroupLabel[],
    name: string
}

export interface JiraGroupLabel {
    text: string,
    title: string,
    type: string
}

export interface JiraOrganization {
    id: string;
    name: string;
}

export interface JiraPageResult {
    size?: number;
    start?: number;
    limit?: number;
    isLastPage?: boolean;
    values?: JiraOrganization[];
}

export interface JiraOrganizationResult extends JiraPageResult {

}

export interface Jira6Epics {
    epicNames: JiraEpic[],
    total: number
}

export interface Jira7Epics {
    epicLists: JiraEpicList[],
    total: number
}

export interface JiraEpicList {
    listDescriptor: string,
    epicNames: JiraEpic[],
}


export interface JiraEpic {
    key: string,
    name: string,
    isDone?: boolean
}

export interface JiraSprints {
    suggestions: JiraSprint[],
    allMatches: JiraSprint[]
}

export interface JiraSprint {
    name: string,
    id: number,
    statusKey: string
}

export interface JiraJqlResult {
    issues: JiraIssue[]
}

export interface JiraComponent {
    id: string,
    name: string,
    description: string,
    isAssigneeTypeValid: boolean
}

export interface JiraVersion {
    id: string,
    name: string,
    description?: string,
    archived?: boolean,
    projectId?: number,
    releaseStart?: string, //format: 2015-09-13
    released?: boolean,
    startDate?: string, //format 2015-09-13
    userReleaseDate?: string, //Userformat: e.g. 13/Sept/2015
    userStartDate?: string //Userformat: e.g. 13/Sept/2015

}

export interface JiraIssue {
    id: string;
    key: string;
    fields: { [id: string]: any };
    editmeta?: { fields: { [id: string]: JiraMetaField } };
}

export interface JiraUser {
    key?: string,
    displayName?: string,
    emailAddress?: string,
    name?: string,
    locale?: string,
    timezone?: string,
    active?: boolean,
    avatarUrls?: any,
    groups?: JiraUserGroups,
    applicationRoles?: JiraUserApplicationRoles
}

export interface JiraUserGroups {
    size: number,
    items: JiraUserGroup[]
}

export interface JiraUserGroup {
    name: string,
    self: string
}

export interface JiraUserApplicationRoles {
    size: number,
    items: JiraUserApplicationRole[]
}

export interface JiraUserApplicationRole {
    key: string,
    name: string
}

export type JiraProjectType = 'business' | 'service_desk' | 'software';

export interface JiraProject {
    id: string,
    name: string,
    key: string,
    projectTypeKey?: JiraProjectType,
    issueTypes?: JiraIssueType[],
    avatarUrls?: { [id: string]: string },
    roles?: { [id: string]: string },
    assigneeType?: string,
    components?: JiraComponent[],
    lead?: JiraUser,
    versions?: JiraVersion[],
    self?: string,
}

export interface JiraProjectMeta {
    id: string,
    name: string,
    key: string,
    issuetypes: JiraIssueTypeMeta[],
    avatarUrls: { [id: string]: string }
}

export interface JiraIssueType {
    avatarId: number;
    description: string;
    iconUrl: string;
    id: string;
    name: string;
    subtask: boolean;
}

export interface JiraIssueTypeMeta extends JiraIssueType {
    fields?: { [id: string]: JiraMetaField }
}

export interface JiraRequestType {
    id: number,
    cvId: number,
    portalKey: string,
    portalId: number,
    key: string,
    icon: number,
    issueType: number,
    issueTypeName: string,
    name: string,
    description?: string,
    descriptionHtml?: string,
    helpText?: string,
    helpTextHtml?: string,
    order: number,
    usedByEmailSettings: boolean,
    groups: JiraRequestTypeGroup[]
}

export interface JiraRequestTypeFieldMeta {
    requestTypeFields?: JiraServiceDeskMetaField[];
    canRaiseOnBehalfOf?: boolean;
    canAddRequestParticipants?: boolean;
}

export interface JiraUserConfigMeta {
    fields?: JiraUserConfigField[];
    sortedTabs: JiraTab[];
    userPreferences: JiraUserPreferences;
}

export interface JiraUserConfigField {
    id: string;
    label: string;
    required: boolean;
    tab?: JiraUserConfigFieldTab;
    data?: any[];
    defaultValue?: any;
}

export interface JiraUserConfigFieldTab {
    label: string;
    position: number;
}

export interface JiraTab {
    label: string;
    fields: JiraTabField[];
}

export interface JiraTabField {
    id: string;
    label: string;
}

export interface JiraSystemInfo {
    versionNumbers: number[];
}

export interface JiraUserPreferences {
    fields: string[];
    showWelcomeScreen: boolean;
    useQuickForm: boolean;
}

export interface JiraRequestTypeGroup {
    id: number,
    name: string
}

export interface JiraServiceDeskData {
    id: string,
    key: string,
    name: string,
    description?: string,
    projectId: string,
    sendEmailNotification?: boolean
}

export interface JiraServiceDeskKey {
    id: string,
    key: string
}

export interface JiraServiceDeskMetaField {
    required: boolean,
    jiraSchema: JiraSchema,
    name: string,
    fieldId: string,
    description?: string,
    validValues?: Array<JiraRequestTypeFieldValue>
}

export interface JiraMetaField {
    required: boolean;
    schema: JiraSchema;
    name: string;
    key: string;
    description?: string;
    hasDefaultValue?: boolean;
    operators?: Array<string>;
    autoCompleteUrl?: string;
    allowedValues?: Array<JiraValue>;
    isHidden?: boolean;
    defaultValue?: any;
    data?: any[];
}

export interface JiraLabel {
    label: string
}

export interface JiraSubmitComment {
    body: string;
    public?: boolean;
}

export interface JiraComment {
    id: string;
    body: string;
}

export interface JiraIssueLinkTypes {
    issueLinkTypes: JiraIssueLinkType[];
}

export interface JiraIssueLinkType {
    id: string;
    name: string;
    inward?: string;
    outward?: string;
    self?: string;
}

export interface JiraIssueLinkCreate {
    type: {
        name?: string;
        id?: string;
    };

    inwardIssue: {
        key?: string;
        id?: string;
    };

    outwardIssue: {
        key?: string;
        id?: string;
    };

    comment?: {
        body: string;
        visibility?: JiraCommentVisibility
    };
}

export interface JiraCommentVisibility {
    type: 'group' | 'role',
    value: string;
}

export interface YasoonGroupHierarchy {
    name: string,
    position: number
}

export interface YasoonInitialSelection {
    group?: string,
    projectId: string,
    issueTypeId: string
}

export interface YasoonDefaultTemplate {
    group?: string;
    projectId?: string;
    issueTypeId?: string;
    priority?: number;
    templateName?: string;
    fields?: { [id: string]: any };
    lastUpdated?: string;
}

//{ "issues":{ "17801":{ "id":"17801", "key":"YJD-12", "summary":"Verbesserungsvorschlag", "projectId":"10300" } } }
export interface YasoonConversationData {
    issues: YasoonConversationIssueDict;
}

export type YasoonConversationIssueDict = { [id: string]: YasoonConversationIssue };


export interface YasoonConversationIssue {
    id: string,
    key: string,
    summary: string,
    projectId: string
}

export type JiraDialogType = 'selectedText' | 'wholeMail' | '';

export interface YasoonDialogCloseParams {
    action: 'success' | 'cancel';
    issueKey?: string;
    changeType?: 'updated' | 'created';
    mail?: {
        entryId: string,
        storeId: string
    };
}


export interface JiraAppSettings {
    currentService: string;
    lastSync: Date;
    showDesktopNotif: boolean;
    addAttachmentsOnNewAddIssue: boolean;
    addMailHeaderAutomatically: string;
    addEmailOnNewAddIssue: boolean;
    showFeedAssignee: boolean;
    showFeedMentioned: boolean;
    showFeedWatcher: boolean;
    showFeedProjectLead: boolean;
    showFeedReporter: boolean;
    showFeedCreator: boolean;
    showFeedComment: boolean;
    newCreationScreen: boolean;
    syncCalendar: boolean;
    syncFeed: string;
    syncTask: boolean;
    taskSyncEnabled: boolean;
    tasksActiveProjects: string;
    deleteCompletedTasks: boolean;
    tasksSyncAllProjects: boolean;
    hideResolvedIssues: boolean;
    activeFilters: string;
    teamlead: {
        apiKey: string,
        mapping: string
    };
}

export interface NewEditDialogInitParams {
    mail: yasoonModel.Email;
    settings: JiraAppSettings;
    text: string;
    projects: JiraProject[];
    issue: JiraIssue;
    type: JiraDialogType;
    ownUser: JiraUser;
    editIssueId: string;
    userMeta: JiraUserConfigMeta[];
    createMetas: JiraProjectMeta[];
    systemInfo: JiraSystemInfo;
}

export type YasoonFieldMappingConfig = {
    [id: string]: string | {
        module: string,
        options: any
    }
}