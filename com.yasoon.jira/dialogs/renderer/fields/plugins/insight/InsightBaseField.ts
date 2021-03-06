/// <reference path="../../Select2AjaxField.ts" />
/// <reference path="../../../setter/SetOptionValue.ts" />

@setter(SetterType.Option)
abstract class InsightBaseField extends Select2AjaxField implements IFieldEventHandler {
    currentProject: JiraProject;

    currentIssueId: string = '';
    currentUser: JiraUser;

    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options, options.multiple);

        if (jira.editIssueId) {
            this.currentIssueId = jira.editIssueId;
        }

        if (jira.ownUser) {
            this.currentUser = jira.ownUser;
        }
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);

        //Init project
        var projectField = <ProjectField>FieldController.getField(FieldController.projectFieldId);
        this.currentProject = projectField.getObjectValue();
    }

    //Copy from GetOption --> Always needs to return an array
    getValue(onlyChangedData: boolean): any {
        let newValue = this.getDomValue();

        let convertedValues = [];
        if (this.multiple) {
            newValue.forEach((id) => {
                convertedValues.push({
                    key: id
                });
            });
        } else {
            convertedValues.push({
                key: newValue
            });
        }

        //Multi Select
        if (onlyChangedData) {
            //Both empty
            if (!this.initialValue && convertedValues.length === 0)
                return;

            //If length the same and all values match, we do not need to send anything            
            if (this.initialValue && this.initialValue.length === convertedValues.length) {
                let isSame: boolean = this.initialValue.every((c) => {
                    return findWithAttr(convertedValues, 'key', c['key']) > -1;
                });

                if (isSame)
                    return;
            }
            return convertedValues;
        } else {
            //In creation case: Only send if not null	
            return (convertedValues.length > 0) ? convertedValues : undefined;
        }
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange && source === FieldController.projectFieldId) {
            this.currentProject = newValue;
        }

        return null;
    }
}


interface InsightObjectQueryParams {
    currentIssueId?: number;
    currentProject: number;
    currentReporter: string;
    customFieldRequestFields?: { fieldId: string, value: any }[];
    excludeIssueScope?: boolean;
    query: string;
}

interface InsightReferenceQueryParams extends InsightObjectQueryParams {
    parentKeys: string;
}

interface InsightQueryResult {
    objects: InsightObject[];
    offset: number;
    limit: number;
    attributeNamesForSearch: string[];
    size: number;
}


interface InsightObject {
    id: number;
    label: string;
    name: string;
    objectKey?: string;
    objectType: InsightObjectType;
    avatar?: InsightAvatars;
    created?: string;
    updated?: string;
    hasAvatar?: boolean;
    timestamp?: number,
    _links?: {
        self?: string;
    }
}

interface InsightAvatars {
    url16?: string;
    url48?: string;
    url72?: string;
    url144?: string;
    url288?: string;
    objectId?: number;
}

interface InsightObjectType {
    id: number;
    name: string;
    type: number;
    icon?: InsightIcon;
    position?: number;
    created?: string;
    updated?: string;
    objectCount?: number;
    parentObjectTypeId?: number;
    objectSchemaId?: number;
}

interface InsightIcon {
    id: number;
    name: string;
    url16?: string;
    url48?: string;
}

