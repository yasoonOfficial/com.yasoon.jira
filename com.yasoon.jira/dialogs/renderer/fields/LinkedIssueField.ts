import { FieldController } from '../FieldController';
import { Field, IFieldEventHandler, LifecycleData } from '../Field';
import { getter, setter } from '../Annotations';
import { EventType } from '../Enumerations';
import { JiraSelectField } from './JiraSelectField';
import { IssueField } from './IssueField';
import { ProjectField } from './ProjectField';
import { JiraMetaField, JiraProject, JiraValue, JiraIssueLinkTypes, JiraIssue, JiraIssueLinkCreate, JiraSentObj } from '../JiraModels';
import { AjaxService } from '../../AjaxService';

export class LinkedIssueField extends Field implements IFieldEventHandler {

    blocksMeta: JiraMetaField = {
        required: false,
        schema: {
            type: 'IssueLinkBlocks'
        },
        name: 'blocks',
        key: this.id + '_blocks'
    };

    currentProject: JiraProject;
    blocksField: JiraSelectField;
    issueField: IssueField;
    constructor(id: string, field: JiraMetaField, options: any = {}) {
        super(id, field, options);

        FieldController.registerEvent(EventType.FieldChange, this, FieldController.projectFieldId);
        FieldController.registerEvent(EventType.AfterSave, this);

        //Init project
        var projectField = <ProjectField>FieldController.getField(FieldController.projectFieldId);
        this.currentProject = projectField.getObjectValue();


        //Init fields

        this.blocksField = new JiraSelectField(this.id + '_blocks', this.blocksMeta, {});

        this.issueField = new IssueField(this.id + 'issue', IssueField.defaultMeta, { excludeSubtasks: true, multiple: true });
        this.issueField.setProject(this.currentProject);

        this.initData();
    }

    async initData() {
        let issueLinksString = await AjaxService.get('/rest/api/2/issueLinkType');

        let issueLinks = <JiraIssueLinkTypes>JSON.parse(issueLinksString);
        let allowedValues: JiraValue[] = [];
        issueLinks.issueLinkTypes.forEach(issueLink => {
            //Add on inward and one outward options
            allowedValues.push({
                name: issueLink.inward,
                id: issueLink.id + '_in',
                key: 'inward',
                value: issueLink.id
            });

            allowedValues.push({
                name: issueLink.outward,
                id: issueLink.id + '_out',
                key: 'outward',
                value: issueLink.id
            });
        });

        this.blocksField.setData(allowedValues.map(this.blocksField.convertToSelect2));
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.FieldChange && source === FieldController.projectFieldId) {
            this.currentProject = newValue;
        } else if (type === EventType.AfterSave) {
            let data = <LifecycleData>newValue;
            let newIssueId = data.newData['id'];

            let issueTypeValue: JiraValue = this.blocksField.getObjectValue();
            let issues: JiraIssue[] = this.issueField.getObjectValue();

            let promises: Promise<any>[] = [];
            if (issues && issues.length > 0 && issueTypeValue) {
                issues.forEach(issue => {
                    //Create link to each issue separately
                    let outward: string, inward: string;
                    if (issueTypeValue.key === 'outward') {
                        outward = issue.id;
                        inward = newIssueId;
                    } else {
                        inward = issue.id;
                        outward = newIssueId;
                    }
                    let requestData: JiraIssueLinkCreate = {
                        type: {
                            id: issueTypeValue.value
                        },
                        outwardIssue: {
                            id: outward
                        },
                        inwardIssue: {
                            id: inward
                        }
                    };
                    console.log('Post', requestData);
                    promises.push(AjaxService.ajax('/rest/api/2/issueLink', yasoon.ajaxMethod.Post, JSON.stringify(requestData)))
                });
            }


            return Promise.all(promises);
        }

        return null;
    }

    getValue(onlyChangedData: boolean = false): JiraSentObj {
        //Handled Seperately in AfterSave
        return undefined;
    }

    setValue(value: any): Promise<any> {
        //Never set by edit
        return Promise.resolve(null);
    }

    getDomValue() {
        return this.getValue();
    }

    hookEventHandler(): void { }

    render(container: JQuery): void {
        let blocksContainer = $(`<div id="${this.id}_blocks-container" style="margin-bottom: 5px;"></div>`).appendTo(container);
        this.blocksField.render(blocksContainer);
        this.blocksField.hookEventHandler();
        this.blocksField.ownContainer = blocksContainer;

        let issueContainer = $(`<div id="${this.id}_issue-container"></div>`).appendTo(container);
        this.issueField.render(issueContainer);
        this.issueField.hookEventHandler();
        this.issueField.ownContainer = issueContainer;
    }

}