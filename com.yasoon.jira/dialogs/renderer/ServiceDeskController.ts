import { Field, IFieldEventHandler, UiActionEventData } from './Field';
import { EventType } from './Enumerations';
import { FieldController } from './FieldController';
import { UserSelectField } from './fields/UserSelectField';
import { RequestTypeField } from './fields/RequestTypeField';
import { IssueTypeField } from './fields/IssueTypeField';
import { ServiceDeskUtil } from './ServiceDeskUtil';

export interface ServiceDeskSaveResult {
    issueCreated: boolean;
    issueId?: string;
    issueKey?: string;
}

export class ServiceDeskController implements IFieldEventHandler {

    private serviceDeskVersion: string;
    private currentProject: JiraProject;
    private requestTypes: { [id: string]: JiraRequestType[] } = {};
    private serviceDeskKeys: { [id: string]: JiraServiceDeskKey } = {};
    private _isServiceDeskActive: boolean = false;
    private currentRequestTypeMeta: JiraRequestTypeFieldMeta = { requestTypeFields: [] };

    constructor() {
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.requestTypeFieldId);
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.UiAction, this);
    }

    isServiceDeskActive(): boolean {
        return this._isServiceDeskActive;
    }

    async handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.UiAction) {
            let eventData: UiActionEventData = newValue;
            if (eventData.name === IssueTypeField.uiActionServiceDesk) {
                this._isServiceDeskActive = eventData.value;
            }
        } else if (type === EventType.FieldChange) {
            if (source == FieldController.requestTypeFieldId) {
                if (await ServiceDeskUtil.isVersionAtLeast('3.3.0')) {
                    this.currentRequestTypeMeta = await ServiceDeskUtil.getRequestTypeMeta(newValue);

                    //We need to put the fields back into original state, without the modifications from the previous request type
                    FieldController.resetFields();

                    //Now process the request type field meta (add possible required flags)
                    this.updateFieldMeta();
                }
            } else if (source === FieldController.projectFieldId) {
                this.currentProject = newValue;
            }
        }

        return null;
    }

    private updateFieldMeta() {
        this.currentRequestTypeMeta.requestTypeFields.forEach(field => {
            let uiField = FieldController.getField(field.fieldId);
            if (uiField)
                uiField.setRequired(field.required);
        });
    }

    async doBeforeSave(data: any): Promise<ServiceDeskSaveResult> {
        if (await ServiceDeskUtil.isVersionAtLeast('3.3.0')) {
            let projectId = data.fields[FieldController.projectFieldId].id;
            let requestTypeField = <RequestTypeField>FieldController.getField(FieldController.requestTypeFieldId);
            let onBehalfOfField = <UserSelectField>FieldController.getField(FieldController.onBehalfOfFieldId);

            let postData: any = {
                serviceDeskId: (await ServiceDeskUtil.getServiceDeskKey(projectId)).id,
                requestTypeId: requestTypeField.getDomValue(),
                requestFieldValues: {}
            };

            let meta = this.currentRequestTypeMeta;
            if (meta.canRaiseOnBehalfOf) {
                let user = onBehalfOfField.getObjectValue();
                postData.raiseOnBehalfOf = (user.name.indexOf('<new>') === 0) ? user.emailAddress : user.name;
            }

            meta.requestTypeFields.forEach(field => {
                if (!field.required)
                    return;

                postData.requestFieldValues[field.fieldId] = data.fields[field.fieldId];
            });

            let response = await jiraAjax('/rest/servicedeskapi/request', yasoon.ajaxMethod.Post, JSON.stringify(postData));
            let responseData = JSON.parse(response);

            return {
                issueCreated: true,
                issueId: responseData.issueId,
                issueKey: responseData.issueKey
            };
        } else {
            let onBehalfOfField = <UserSelectField>FieldController.getField(FieldController.onBehalfOfFieldId);
            let user = onBehalfOfField.getValue();
            data.fields[FieldController.reporterFieldId] = user;
        }

        return { issueCreated: false };
    }

    async doAfterSave(issue: JiraIssue): Promise<any> {
        if (!(await ServiceDeskUtil.isVersionAtLeast('3.3.0'))) {
            try {
                let requestTypeOption: { id: string } = FieldController.getField(FieldController.requestTypeFieldId).getValue(false);
                let requestTypeId = parseInt(requestTypeOption.id);

                return jiraAjax('/rest/servicedesk/1/servicedesk/request/' + issue.id + '/request-types', yasoon.ajaxMethod.Post, JSON.stringify({ rtId: requestTypeId }));
            } catch (e) {
                return Promise.reject(new Error('Could not create ServiceDesk Data'));
            }
        }
    }
}