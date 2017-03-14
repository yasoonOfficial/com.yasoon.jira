

interface JiraSchema {
    type: string,
    custom?: string,
    customId?: string,
    system?: string
}

interface JiraValue {
    id: string,
    name?: string,
    key?: string,
    value?: string,
    iconUrl?: string,
    children?: Array<JiraValue>
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

interface JiraOrganizationResult {
    size?: number;
    start?: number;
    limit?: number;
    isLastPage?: boolean;
    values?: JiraOrganization[];
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
    listDescriptor: string,
    epicNames: JiraEpic[],
}


interface JiraEpic {
    key: string,
    name: string,
    isDone?: boolean
}

interface JiraSprints {
    suggestions: JiraSprint[],
    allMatches: JiraSprint[]
}

interface JiraSprint {
    name: string,
    id: number,
    statusKey: string
}

interface JiraJqlResult {
    issues: JiraIssue[]
}

interface JiraComponent {
    id: string,
    name: string,
    description: string,
    isAssigneeTypeValid: boolean
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

interface JiraIssue {
    id: string;
    key: string;
    fields: { [id: string]: any };
    editmeta?: { fields: { [id: string]: JiraMetaField } };
}

interface JiraUser {
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

interface JiraProjectMeta {
    id: string,
    name: string,
    key: string,
    issuetypes: JiraIssueTypeMeta[],
    avatarUrls: { [id: string]: string }
}

interface JiraIssueType {
    avatarId: number;
    description: string;
    iconUrl: string;
    id: string;
    name: string;
    subtask: boolean;
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
    defaultValue?: any;
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
    data?: any[];
}

interface JiraLabel {
    label: string
}

interface JiraSubmitComment {
    body: string;
    public?: boolean;
}

interface JiraComment {
    id: string;
    body: string;
}

interface YasoonGroupHierarchy {
    name: string,
    position: number
}

interface YasoonInitialSelection {
    group?: string,
    projectId: string,
    issueTypeId: string
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
    id: string,
    key: string,
    summary: string,
    projectId: string
}

type JiraDialogType = 'selectedText' | 'wholeMail' | '';

interface YasoonDialogCloseParams {
    action: 'success' | 'cancel';
    issueKey?: string;
    changeType?: 'updated' | 'created';
    mail?: {
        entryId: string,
        storeId: string
    };
}

