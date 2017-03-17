declare var jira;
import { FieldController } from '../FieldController';
import { IFieldEventHandler } from '../Field';
import { getter, setter } from '../Annotations';
import { GetterType, SetterType, EventType } from '../Enumerations';
import { RecentItemController } from '../RecentItemController';
import { Select2Field, Select2Element, Select2Options } from './Select2Field';
import { ServiceDeskUtil } from '../ServiceDeskUtil';
import { Utilities, JiraIconController } from '../../Util';

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
export class RequestTypeField extends Select2Field implements IFieldEventHandler {
    static defaultMeta: JiraMetaField = { key: FieldController.requestTypeFieldId, get name() { return yasoon.i18n('dialog.requestType'); }, required: true, schema: { system: 'requesttype', type: '' } };

    private currentProject: JiraProject;
    private iconController: JiraIconController;

    constructor(id: string, field: JiraMetaField) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderRequestType');
        options.allowClear = false;

        super(id, field, options);
        this.iconController = jira.icons;
        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
    }

    init() {
        //Not necessary--> handled in handleEvent
    }

    triggerValueChange() {
        let requestType: JiraRequestType = this.getObjectValue();
        FieldController.raiseEvent(EventType.FieldChange, requestType, this.id);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange) {
            if (source === FieldController.projectFieldId && (<JiraProject>newValue).projectTypeKey === 'service_desk') {
                this.setProject(newValue);
            }
        }

        return null;
    }

    convertToSelect2(requestType: JiraRequestType): Select2Element {
        var data: Select2Element = {
            id: requestType.id.toString(),
            text: requestType.name,
            data: requestType
        };

        //Das klappt, aber bin zu blöd das Font Icon zu alignen.
        //if (requestType.icon - 10500 > 36) {
        data.icon = this.iconController.mapIconUrl(jira.settings.baseUrl + '/servicedesk/customershim/secure/viewavatar?avatarType=SD_REQTYPE&avatarId=' + requestType.icon)
        // } else {
        //     data.iconClass = 'vp-rq-icon vp-rq-icon-' + (requestType.icon - 10500);
        // }
        return data;
    }

    getReturnStructure(requestTypes: JiraRequestType[]): Select2Element[] {
        //First we need to gather all groups
        let result: Select2Element[] = [];

        requestTypes.forEach((rt) => {
            if (!rt.groups)
                return;

            rt.groups.forEach((group) => {
                //First check if group does already exist in result structure
                let parent = result.filter((elem) => { return elem.id == group.id.toString(); })[0];
                if (!parent) {
                    parent = {
                        id: group.id.toString(),
                        text: group.name,
                        children: []
                    };
                    result.push(parent);
                }

                //Now add requestType to this group
                parent.children.push(this.convertToSelect2(rt));
            });
        });

        result.sort(Utilities.sortByText);
        return result;
    }

    setProject(project: JiraProject) {
        this.currentProject = project;
        this.showSpinner();
        ServiceDeskUtil.getServiceDeskKey(this.currentProject.id, this.currentProject.key)
            .then((serviceDeskKey) => {
                return ServiceDeskUtil.getRequestTypes(serviceDeskKey);
            })
            .then((requestTypes) => {
                this.hideSpinner();
                this.setData(this.getReturnStructure(requestTypes));
            })
            .catch(e => {
                console.log('Error while loading request types', e);
                yasoon.util.log('Error while loading request types: ' + e.message, yasoon.util.severity.warning, getStackTrace(e));
                this.hideSpinner();
            });
    }
}