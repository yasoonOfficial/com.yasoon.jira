
interface Select2Options {
    allowClear?: boolean,
    placeholder?: string,
    templateResult?: Select2FormatMethod,
    templateSelection?: Select2FormatMethod,
    minimumInputLength?: number,
    ajax?: Select2Ajax,
    data?: Select2Element[],
    multiple?: boolean
}

interface Select2Element {
    id: string,
    text: string,
    icon?: string,
    iconClass?: string,
    children?: Select2Element[],
    data?: any
}

interface Select2Ajax {
    url?: string,
    transport?: Select2AjaxMethod,
    processResults?: any
}

interface Select2AjaxMethod {
    (params: Select2CallbackParams, success: Select2Callback, failure: Select2Callback): void
}

interface Select2FormatMethod {
    (element: Select2Element): string | JQuery
}

interface Select2CallbackParams {
    data: { q: string }
}

interface Select2Callback {
    (result?: { results: any[] }): void
}