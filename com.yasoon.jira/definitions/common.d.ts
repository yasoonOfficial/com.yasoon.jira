declare function jiraGet(relativeUrl: string): Promise<string>;

declare function jiraAjax(relativeUrl: string, method: number, data?: any, formData?: any): Promise<any>;

declare function jiraSyncError(message: string, statusCode: number, errorText: string, data: any, result?: any);

declare function jiraIsVersionHigher(systemInfo, versionString: string): boolean;

declare function debounce(func: any, wait: number, immediate?: boolean): any;

declare function jiraHandleImageFallback(img: HTMLElement): void;

declare function getProjectIcon(project: JiraProject): string;

declare function renderMailHeaderText(mail: any, useMarkup: boolean): string;

declare function isEqual(a: any, b: any): boolean;

declare function handleAttachments(markup: string, mail: any): Promise<string>;