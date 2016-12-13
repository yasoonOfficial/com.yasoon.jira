

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
    released?: boolean,
    archived?: boolean,
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
    html: string,
    labels: JiraGroupLabel[],
    name: string
}

interface JiraGroupLabel {
    text: string,
    title: string,
    type: string
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

interface JiraIssue {
    id: string,
    key: string,
    fields: { [id: string]: any }
}

interface JiraUser {
    key: string,
    displayName: string,
    emailAddress: string,
    name: string,
    locale: string,
    timezone: string,
    active: boolean,
    avatarUrls: any,
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
}

interface JiraIssueType {
    avatarId: number,
    description: string,
    iconUrl: string,
    id: string,
    name: string,
    subtask: boolean
}

interface JiraRequestType {
    id: number,
    cvId: number,
    portalKey: string,
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

interface JiraProjectTemplate {
    senderEmail: string,
    senderName: string,
    project: JiraProject,
    projectTypeKey?: JiraProjectType,
    serviceDesk?: { enabled: boolean, requestType: string },
    values: any
}

interface JiraMetaField {
    required: boolean,
    schema: JiraSchema,
    name: string,
    key: string,
    description?: string,
    hasDefaultValue?: boolean,
    operators?: Array<string>,
    autoCompleteUrl?: string,
    allowedValues?: Array<JiraValue>,
    isHidden?: boolean
}

interface JiraLabel {
    label: string
}

interface YasoonGroupHierarchy {
    name: string,
    position: number
}

interface YasoonInitialSelection {
    group: string,
    projectId: string,
    issueTypeId: string
}

interface YasoonDefaultTemplate {
    group: string,
    projectId: string,
    issueTypeId: string,
    priority: number,
    fields: YasoonTemplateField[]
}

interface YasoonTemplateField {
    fieldId: string,
    fieldValue: any
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