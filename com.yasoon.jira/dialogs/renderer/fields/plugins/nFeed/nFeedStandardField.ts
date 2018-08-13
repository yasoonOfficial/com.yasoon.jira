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
let config = {
    "customfield_10400": {
        isMulti: true
    },
    "customfield_10500": {
        isMulti: false,
        dependency: {
            fieldId: 'customfield_10400'
        }
    }
};


@getter(GetterType.Array)
@setter(SetterType.Option)
class NFeedField extends Select2AjaxField implements IFieldEventHandler {
    dependendValue: NFeedOption;
    ownConfig: any;

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        let ownConfig = {};
        if (jira.settings.nfeed && jira.settings.nfeed[id]) {
            ownConfig = jira.settings.nfeed[id];
        }

        let multiple = ownConfig.isMultiple || false;

        super(id, field, options, multiple);


        this.ownConfig = ownConfig;

        if (ownConfig && ownConfig.dependency) {
            console.log('Register Field', id, ownConfig.dependency.fieldId);
            this.dependendValue = null;
            FieldController.registerEvent(EventType.FieldChange, this, ownConfig.dependency.fieldId);
        }
    }

    getData(searchTerm: string): Promise<Select2Element[]> {
        let formData = {
            [this.id]: []
        };
        //If we have a dependend value, we need to send it...
        if (this.dependendValue) {
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