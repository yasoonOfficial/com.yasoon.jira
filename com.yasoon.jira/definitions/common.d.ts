declare function jiraGet(relativeUrl: string): Promise<string>;

declare function jiraAjax(relativeUrl: string, method: number, data?: any, formData?: any): Promise<any>;

declare class jiraSyncError {
    message?: string;
    statusCode?: number; 
    errorText?: string;
    data?: any; 
    result?: any;
    getUserFriendlyError(): string;
}

declare interface IconBufferEntry {
    url: string;
    fileName: string;
}

declare class JiraIconController {
    mapIconUrl: (url: string) => string;
    addIcon: (url: string) => string;
    getFullBuffer: () => IconBufferEntry[]
}

declare function jiraIsVersionHigher(systemInfo, versionString: string): boolean;

declare function debounce(func: any, wait: number, immediate?: boolean): any;

declare function jiraHandleImageFallback(img: HTMLElement): void;

declare function getProjectIcon(project: JiraProject): string;

declare function renderMailHeaderText(mail: any, useMarkup: boolean): string;

declare function isEqual(a: any, b: any): boolean;

declare function handleAttachments(markup: string, mail: any): Promise<string>;

declare function jiraMinimizeIssue(issue: JiraIssue): JiraIssue;

declare class JiraAppSettings {
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
    teamleadApiKey: 'string';
}

