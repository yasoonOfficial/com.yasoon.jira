/// <reference path="../../Select2AjaxField.ts" />

interface NFeedOption {
    "id": string;
    "index": number;
    "values": string[];
    "isSelected": boolean;
}

interface NFeedQueryResult {
    "columnNames": string[];
    "options": NFeedOption[];
    "start": number,
    "hasNext": boolean;
    "messages": {
        "infoMessages": string[],
        "warningMessages": string[],
        "errorMessages": string[],
        "criticalMessages": string[]
    };
}

interface NFeedConfig {
    isMulti?: boolean;
    dependency?: {
        fieldId: string;
    };
}

@getter(GetterType.Array)
@setter(SetterType.Option)
class NFeedField extends Select2AjaxField implements IFieldEventHandler {
    dependendValue: NFeedOption;
    ownConfig: NFeedConfig;

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        let ownConfig: NFeedConfig = {};
        if (jira.settings.nFeed && jira.settings.nFeed[id]) {
            ownConfig = jira.settings.nFeed[id];
        }

        let multiple = ownConfig.isMulti || false;

        super(id, field, options, multiple);

        this.ownConfig = ownConfig;

        if (ownConfig && ownConfig.dependency) {
            console.log('Register Field', id, ownConfig.dependency.fieldId);
            this.dependendValue = null;
            FieldController.registerEvent(EventType.FieldChange, this, ownConfig.dependency.fieldId);
        }
    }

    async getEmptyData(): Promise<Select2Element[]> {
        //Don't Buffer!
        return this.getData('');
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        let formData = {
            [this.id]: []
        };
        //If we have a dependend value, we need to send it...
        if ($.isArray(this.dependendValue)) {
            formData[this.ownConfig.dependency.fieldId] = this.dependendValue.map(v => v.id);
        } else if (this.dependendValue) {
            formData[this.ownConfig.dependency.fieldId] = [this.dependendValue.id];
        }

        return jiraAjax('/rest/nfeed/3.0/nFeed/field-new/input/options', yasoon.ajaxMethod.Post, JSON.stringify({
            customFieldId: this.id,
            userInput: searchTerm,
            fieldContext: {},
            formData: formData,
            startIndex: 0,
            view: "EDIT"
        }))
            .then((resultString) => {
                let result = JSON.parse(resultString);
                return result.options.map(this.convertToSelect2);
            });
    }

    convertToSelect2(obj: NFeedOption): Select2Element {
        return {
            id: obj.id,
            text: obj.values[0],
            data: obj
        };
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        console.log('Get Event', type, newValue, source);
        this.dependendValue = newValue;
        this.setData(null);
        return Promise.resolve();
    }
}