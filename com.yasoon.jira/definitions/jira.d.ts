interface JiraSchema {
    type: string,
    custom?: string,
    customId?: string,
    system?: string
}

interface JiraValue {
    id: string;
    name?: string;
    key?: string;
    value?: string;
    label?: string; //E.g. for IconSelectFields
    iconUrl?: string;
    children?: Array<JiraValue>;
}

interface JiraRequestTypeFieldValue {
    label: string,
    value?: string,
    children?: Array<JiraValue>
}

interface JiraSentObj {
    id?: string,
    name?: string,
    child?: JiraSentObj
}

interface JiraTimetrackingValue {
    originalEstimate?: string,
    remainingEstimate?: string
    originalEstimateSeconds?: number;
    remainingEstimateSeconds?: number;
}

interface JiraGroups {
    total: number,
    header: string,
    groups: JiraGroup[]
}

interface JiraGroup {
    html?: string,
    labels?: JiraGroupLabel[],
    name: string
}

interface JiraGroupLabel {
    text: string,
    title: string,
    type: string
}

interface JiraOrganization {
    id: string;
    name: string;
}

interface JiraPageResult {
    size?: number;
    start?: number;
    limit?: number;
    isLastPage?: boolean;
    values?: JiraOrganization[];
}

interface JiraOrganizationResult extends JiraPageResult {

}

interface Jira6Epics {
    epicNames: JiraEpic[],
    total: number
}

interface Jira7Epics {
    epicLists: JiraEpicList[],
    total: number
}

interface JiraEpicList {
    listDescriptor: string;
    epicNames: JiraEpic[];
}


interface JiraEpic {
    key: string;
    name: string;
    isDone?: boolean;
}

interface JiraSprints {
    suggestions: JiraSprint[];
    allMatches: JiraSprint[];
}

interface JiraSprint {
    name: string;
    id: number;
    statusKey: string;
}

interface JiraJqlResult {
    issues?: JiraIssue[];
    startAt?: number;
    maxResults?: number;
    total?: number;
}

interface JiraComponent {
    id: string;
    name: string;
    description: string;
    isAssigneeTypeValid: boolean;
}

interface JiraVersion {
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

interface JiraTransitions {
    expand?: string;
    transitions: JiraTransition[];
}

interface JiraTransition {
    id: string;
    name: string;
    hasScreen?: boolean;
    to?: JiraStatus;
}

interface JiraStatus {
    self?: string;
    description?: string;
    iconUrl?: string;
    name?: string;
    id?: string;
    statusCategory?: JiraStatusCategory;

}

interface JiraSubmitTransition {
    transition: {
        id: string;
    };
}

interface JiraStatusCategory {
    self?: string;
    id: number;
    key: string;
    colorName?: string;
    name?: string;
}

interface JiraResolution {
    self?: string;
    id?: string;
    description?: string;
    name?: string;
}

interface JiraPriority {
    self?: string;
    iconUrl?: string;
    name?: string;
    id?: string;
}

interface JiraProgress {
    progress?: number;
    total?: number;
    percent?: number;
}

interface JiraVotes {
    self?: string;
    votes?: number;
    hasVoted?: boolean;
}

interface JiraWorklogResult {
    startAt?: number;
    maxResults?: number;
    total?: number;
    worklogs?: JiraWorklog[];
}

interface JiraWorklog {

}

interface JiraAttachment {
    self?: string;
    id?: string;
    filename?: string;
    author?: JiraUser;
    created?: string; //Format	"2017-08-17T11:50:23.772+0200"
    size?: number;
    mimeType?: string;
    content?: string;
}

interface JiraWatches {
    self?: string;
    watchCount?: number;
    isWatching?: boolean;
}

interface JiraIssueKey {
    id: string;
    key: string;
}

interface JiraIssue extends JiraIssueKey {
    fields: JiraIssueFields;
    renderedFields?: { [id: string]: any };
    editmeta?: { fields: { [id: string]: JiraMetaField } };
    transitions?: JiraTransition[];
}

interface JiraIssueFields {
    project?: JiraProject;
    issuetype?: JiraIssueType;
    fixVersions?: JiraVersion[];
    resolution?: JiraResolution;
    resolutiondate?: string; //Format: 2016-04-28T11:54:19.957+0200
    lastViewed?: string;
    priority?: JiraPriority;
    labels?: string[];
    aggregatetimeoriginalestimate?: number;
    aggregatetimeestimate?: number;
    aggregatetimespent?: number;
    aggregateprogress?: JiraProgress;
    timeestimate?: number;
    timeoriginalestimate?: number;
    timespent?: number;
    versions?: JiraVersion[];
    issuelinks?: JiraIssueLinkType[];
    assignee?: JiraUser;
    status?: JiraStatus;
    components?: JiraComponent[];
    creator?: JiraUser;
    subTasks?: JiraIssue[];
    reporter?: JiraUser;
    progress?: JiraProgress;
    votes?: JiraVotes;
    worklog?: JiraWorklogResult;
    watches?: JiraWatches;
    created?: string; //Format: 2016-04-28T11:54:19.957+0200
    updated?: string; //Format: 2016-04-28T11:54:19.957+0200
    description?: string;
    timetracking?: JiraTimetrackingValue;
    summary?: string;
    environment?: string;
    duedate?: string; //Format 2016-04-28
    comment?: JiraCommentResult;
    attachment?: JiraAttachment[];
    // allow custom fields
    [x: string]: any;
}

interface JiraUser {
    key?: string,
    displayName?: string,
    emailAddress?: string,
    name?: string,
    accountId?: string; //Cloud only
    locale?: string,
    timezone?: string,
    active?: boolean,
    avatarUrls?: any,
    groups?: JiraUserGroups,
    applicationRoles?: JiraUserApplicationRoles
}

interface JiraUserGroups {
    size: number,
    items: JiraUserGroup[]
}

interface JiraUserGroup {
    name: string,
    self: string
}

interface JiraUserApplicationRoles {
    size: number,
    items: JiraUserApplicationRole[]
}

interface JiraUserApplicationRole {
    key: string,
    name: string
}

type JiraProjectType = 'business' | 'service_desk' | 'software';

interface JiraProject {
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


interface JiraCreateMeta {
    projects: JiraProjectMeta[];
}

interface JiraProjectMeta {
    id: string,
    name: string,
    key: string,
    issuetypes: JiraIssueTypeMeta[],
    avatarUrls: { [id: string]: string }
}

interface JiraIssueType {
    avatarId?: number;
    description?: string;
    iconUrl?: string;
    id?: string;
    name?: string;
    subtask?: boolean;
}

interface JiraIssueTypeMeta extends JiraIssueType {
    fields?: { [id: string]: JiraMetaField }
}

interface JiraRequestType {
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

interface JiraRequestTypeFieldMeta {
    requestTypeFields?: JiraServiceDeskMetaField[];
    canRaiseOnBehalfOf?: boolean;
    canAddRequestParticipants?: boolean;
}

interface JiraUserConfigMeta {
    fields?: JiraUserConfigField[];
    sortedTabs: JiraTab[];
    userPreferences: JiraUserPreferences;
}

interface JiraUserConfigField {
    id: string;
    label: string;
    required: boolean;
    tab?: JiraUserConfigFieldTab;
    data?: any[];
    editHtml?: string;
    defaultValue?: any;
    description: string;
}

interface JiraUserConfigFieldTab {
    label: string;
    position: number;
}

interface JiraTab {
    label: string;
    fields: JiraTabField[];
}

interface JiraTabField {
    id: string;
    label: string;
}

interface JiraSystemInfo {
    versionNumbers: number[];
}

interface JiraUserPreferences {
    fields: string[];
    showWelcomeScreen: boolean;
    useQuickForm: boolean;
}

interface JiraRequestTypeGroup {
    id: number,
    name: string
}

interface JiraServiceDeskData {
    id: string,
    key: string,
    name: string,
    description?: string,
    projectId: string,
    sendEmailNotification?: boolean
}

interface JiraServiceDeskKey {
    id: string,
    key: string
}

interface JiraServiceDeskMetaField {
    required: boolean,
    jiraSchema: JiraSchema,
    name: string,
    fieldId: string,
    description?: string,
    validValues?: Array<JiraRequestTypeFieldValue>
}

interface JiraServiceDeskInfo {
    version?: string;
    platformVersion?: string;
    isLicensedForUse?: boolean;
}

interface JiraMetaField {
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
    data?: { [id: string]: any };
}

interface JiraLabel {
    label: string
}

interface JiraLabelResult {
    token?: string;
    suggestions?: JiraLabel[];
}

interface JiraSubmitComment {
    body: string;
    public?: boolean;
}

interface JiraComment {
    id: string;
    body?: string;
    created?: string; //Format	"2016-10-12T17:40:13.787+0200"
    author?: JiraUser;
    updated?: string; // Format	"2016-10-12T17:40:13.787+0200"
    updateAuthor?: JiraUser;
}

interface JiraCommentResult {
    maxResults?: number;
    total?: number;
    startAt?: number;
    comments?: JiraComment[];
}
interface JiraIssueLinkTypes {
    issueLinkTypes: JiraIssueLinkType[];
}

interface JiraIssueLinkType {
    id: string;
    name: string;
    inward?: string;
    outward?: string;
    self?: string;
}

interface JiraIssueLinkCreate {
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

interface JiraCommentVisibility {
    type: 'group' | 'role',
    value: string;
}

interface YasoonGroupHierarchy {
    name: string,
    position: number
}

interface YasoonInitialSelection {
    group?: string,
    projectId?: string,
    issueTypeId?: string
}

interface YasoonDefaultTemplate {
    group?: string;
    projectId?: string;
    issueTypeId?: string;
    priority?: number;
    templateName?: string;
    fields?: { [id: string]: any };
    lastUpdated?: string;
}

//{ "issues":{ "17801":{ "id":"17801", "key":"YJD-12", "summary":"Verbesserungsvorschlag", "projectId":"10300" } } }
interface YasoonConversationData {
    issues: YasoonConversationIssueDict;
}

type YasoonConversationIssueDict = { [id: string]: YasoonConversationIssue };


interface YasoonConversationIssue {
    id: string;
    key: string;
    summary: string;
    projectId: string;
    instanceId?: number;
}

type JiraDialogType = 'selectedText' | 'wholeMail' | '';

interface YasoonDialogCloseParams {
    action: 'success' | 'cancel' | 'errorAfterSave';
    errorMessage?: string;
    issueKey?: string;
    changeType?: 'updated' | 'created';
    mail?: {
        entryId: string,
        storeId: string
    };
}


interface JiraAppSettings {
    currentService: string;
    baseUrl: string;
    lastSync?: Date;
    showDesktopNotif?: boolean;
    addAttachmentsOnNewAddIssue?: boolean;
    addMailHeaderAutomatically?: string;
    addEmailOnNewAddIssue?: boolean;
    showFeedAssignee?: boolean;
    showFeedMentioned?: boolean;
    showFeedWatcher?: boolean;
    showFeedProjectLead?: boolean;
    showFeedReporter?: boolean;
    showFeedCreator?: boolean;
    showFeedComment?: boolean;
    newCreationScreen?: boolean;
    syncCalendar?: boolean;
    syncFeed?: string;
    syncTask?: boolean;
    taskSyncEnabled?: boolean;
    tasksActiveProjects?: string;
    deleteCompletedTasks?: boolean;
    tasksSyncAllProjects?: boolean;
    hideResolvedIssues?: boolean;
    activeFilters?: string;
    teamlead?: {
        apiKey: string,
        mapping: string
    };
}

interface NewEditDialogInitParams {
    mail?: yasoonModel.Email;
    settings?: JiraAppSettings;
    text?: string;
    projects?: JiraProject[];
    issue?: JiraIssue;
    type?: JiraDialogType;
    ownUser?: JiraUser;
    editIssueId?: string;
    userMeta?: JiraUserConfigMeta[];
    createMetas?: JiraProjectMeta[];
    systemInfo?: JiraSystemInfo;
    hideHeader?: boolean;
}

interface CommentDialogInitParams {
    mail: yasoonModel.Email;
    settings: JiraAppSettings;
    text: string;
    projects: JiraProject[];
    issue: JiraIssue;
    type: JiraDialogType;
    ownUser: JiraUser;
}


type YasoonFieldMappingConfig = {
    [id: string]: string | {
        module: string,
        options: any
    }
}

interface JiraFileHandle extends yasoonModel.EmailAttachmentFileHandle {
    selected: boolean;
    hash: string;
    blacklisted: boolean;
    fileName: string;
    extension: string;
    fileIcon: string;
    fileNameNoExtension: string;
    attachment: yasoonModel.OutlookAttachment;
}

interface IconBufferEntry {
    url: string;
    fileName: string;
}