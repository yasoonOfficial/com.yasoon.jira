/// <reference path="../../Select2AjaxField.ts" />

interface NFeedOption {
    id: string;
    index: number;
    values: string[];
    isSelected: boolean;
}

interface NFeedQueryResult {
    columnNames: string[];
    selectedOptions?: NFeedOption[];
    options: NFeedOption[];
    start: number,
    hasNext: boolean;
    messages: {
        infoMessages: string[],
        warningMessages: string[],
        errorMessages: string[],
        criticalMessages: string[]
    };
}

interface NFeedConfig {
    isMulti?: boolean;
    isReadOnly?: boolean;
    dependency?: {
        fieldId: string;
    };
}

@getter(GetterType.Array)
@setter(SetterType.Option)
class NFeedField extends Select2AjaxField implements IFieldEventHandler {
    dependendValue: NFeedOption;
    ownConfig: NFeedConfig;
    currentProject: JiraProject;
    currentIssueType: JiraIssueType;

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        let ownConfig: NFeedConfig = {};
        if (jira.settings.nFeed && jira.settings.nFeed[id]) {
            ownConfig = jira.settings.nFeed[id];
        }

        let multiple = ownConfig.isMulti || false;

        if (ownConfig.isReadOnly) {
            options.disabled = true;
        }

        super(id, field, options, multiple);

        this.ownConfig = ownConfig;

        if (ownConfig && ownConfig.dependency) {
            console.log('Register Field', id, ownConfig.dependency.fieldId);
            this.dependendValue = null;
            FieldController.registerEvent(EventType.FieldChange, this, ownConfig.dependency.fieldId);
        }
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);

        //Init project
        var projectField = <ProjectField>FieldController.getField(FieldController.projectFieldId);
        this.currentProject = projectField.getObjectValue();

        //Init IssueType
        var issueTypeField = <IssueTypeField>FieldController.getField(FieldController.issueTypeFieldId);
        this.currentIssueType = issueTypeField.getObjectValue();
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

        return jiraAjax('/rest/nfeed/3.0/nFeed/field/input/options', yasoon.ajaxMethod.Post, JSON.stringify({
            customFieldId: this.id,
            userInput: searchTerm,
            fieldContext: {
                issueCreateProjectId: this.currentProject.id,
                issueCreateIssueTypeId: this.currentIssueType.id
            },
            formData: formData,
            startIndex: 0,
            view: "EDIT"
        }))
            .then((resultString) => {
                let result: NFeedQueryResult = JSON.parse(resultString);

                console.log('Result', this.id, result);
                let select2Result = result.options.map(this.convertToSelect2);

                if (result.selectedOptions && result.selectedOptions.length > 0) {
                    //Dangerously set Default Values (important for ReadOnly fields)
                    setTimeout(() => {
                        this.setValue(result.selectedOptions[0]);
                    }, 100);
                }

                return select2Result;
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
        if (type === EventType.FieldChange && source === FieldController.projectFieldId) {
            this.currentProject = newValue;
        } else if (type === EventType.FieldChange && source === FieldController.issueTypeFieldId) {
            this.currentIssueType = newValue;
        } else {
            console.log('Get Event', type, newValue, source);
            this.dependendValue = newValue;
            this.setData([]);
            return this.getData('');
        }
    }
}