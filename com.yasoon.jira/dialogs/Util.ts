import { Select2Element } from './renderer/fields/Select2Field'

export class Utilities {
    static sortByText(a: Select2Element, b: Select2Element): number {
        return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1);
    }
}

export interface IconBufferEntry {
    url: string;
    fileName: string;
}

export interface JiraIconController {
    mapIconUrl: (url: string) => string;
    addIcon: (url: string) => string;
    getFullBuffer: () => IconBufferEntry[]
}