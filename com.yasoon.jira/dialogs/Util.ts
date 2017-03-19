import { Select2Element } from './renderer/fields/Select2Field'

export class Utilities {
    static sortByText(a: Select2Element, b: Select2Element): number {
        return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1);
    }


    static insertAtCursor(myField: HTMLTextAreaElement, myValue: string) {
        var startPos = myField.selectionStart;
        var endPos = myField.selectionEnd;
        if (startPos > 0)
            myValue = '\n' + myValue;

        myField.value = myField.value.substring(0, startPos) +
            myValue +
            myField.value.substring(endPos, myField.value.length);
    }

    static findWithAttr(array: any[], attr: string, value: any) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    }

}
