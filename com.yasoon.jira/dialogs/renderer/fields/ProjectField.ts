/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

interface ProjectFieldOptions {
    cache?: JiraProject[];
    allowClear?: boolean;
}

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
class ProjectField extends Select2Field {

    static defaultMeta: JiraMetaField = { key: FieldController.projectFieldId, get name() { return yasoon.i18n('dialog.project'); }, required: true, schema: { system: 'project', type: '' } };

    projectCache: JiraProject[];
    returnStructure: Select2Element[];
    isMainProjectField: boolean;
    recentItems: RecentItemController;

    constructor(id: string, field: JiraMetaField, fieldOptions: ProjectFieldOptions = { cache: [], allowClear: false }) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectProject');
        options.allowClear = fieldOptions.allowClear;
        super(id, field, options);

        this.isMainProjectField = (id === FieldController.projectFieldId);

        this.recentItems = jira.recentItems;

        if (fieldOptions.cache) {
            this.projectCache = fieldOptions.cache;
        }

        //Start Getting Data
        this.showSpinner();
        this.getData()
            .then((data) => {
                this.hideSpinner();
                this.setData(data);
                if (this.isMainProjectField) {
                    this.setDefaultProject();
                    $('#' + this.id).next().find('.select2-selection').first().focus();
                }
            });


    }

    triggerValueChange() {
        let project: JiraProject = this.getObjectValue();
        if ((!this.lastValue && project) || (this.lastValue && !project) || (this.lastValue && project && this.lastValue.id !== project.id)) {
            FieldController.raiseEvent(EventType.FieldChange, project, this.id);
            this.lastValue = project;
        }
    }

    setDefaultProject() {
        //Applications like tasks may insert 
        if (jira.issue && jira.issue.fields && jira.issue.fields.project) {
            this.setValue(jira.issue.fields.project);
        }
        // Mail may already contain a conversation. Should this also be valid for newIssue?!
        else if (jira.emailController) {
            let convData: YasoonConversationData = jira.emailController.getConversationData();
            if (convData) {
                //Try to find project that matches
                //We could just lookup the first issue and directly select the projectId.
                //However, we want to support longterm enhancements where conversationData could be shared with others and then the project might not exist for this user.
                for (let id in convData.issues) {
                    let intId = parseInt(id);
                    if (this.projectCache.filter((el) => { return el.id === convData.issues[id].projectId; }).length > 0) //jshint ignore:line
                    {
                        this.setValue(convData.issues[id].projectId);
                        return; //-> subject handling will not be done if we find something here
                    }
                }
            }
        }
        //If mail is provided && subject contains reference to project, pre-select that
        else if (jira.emailController && jira.emailController.mail && jira.emailController.mail.subject && this.projectCache && this.projectCache.length > 0) {
            //Sort projects by key length descending, so we will match the following correctly:
            // Subject: This is for DEMODD project
            // Keys: DEMO, DEMOD, DEMODD
            let projectsByKeyLength = this.projectCache.sort((a, b) => {
                return b.key.length - a.key.length; // ASC -> a - b; DESC -> b - a
            });

            for (let i = 0; i < projectsByKeyLength.length; i++) {
                let curProj = projectsByKeyLength[i];
                if (jira.emailController.mail.subject.indexOf(curProj.key) >= 0) {
                    this.setValue(curProj);
                    break;
                }
            }
        }
    }

    convertToSelect2(project: JiraProject): Select2Element {
        return {
            id: project.id,
            text: project.name,
            icon: getProjectIcon(project),
            data: project
        };
    }

    private getReturnStructure(projects?: Select2Element[], queryTerm?: string): Select2Element[] {
        let result: Select2Element[] = [];
        //1. User Templates
        if (jira.emailController && jira.emailController.senderTemplates) {
            //1.1 Filter
            let currentTemplates = jira.emailController.senderTemplates.filter(templ => {
                if (templ.senderEmail === jira.mail.senderEmail) {
                    //Double Check if Project still exists
                    let templProj = projects.filter(p => { return p.id === templ.id; })[0];
                    if (templProj) {
                        templ.name = templProj.data.name;
                        templ.projectTypeKey = templProj.data.projectTypeKey;
                        return true;
                    }
                }
                return false;
            });
            //1.2 Map and Add
            if (currentTemplates && currentTemplates.length > 0) {
                let children: Select2Element[] = currentTemplates.map(this.convertToSelect2);
                result.push({
                    id: 'templates',
                    text: yasoon.i18n('dialog.templateFor', { name: jira.mail.senderName }),
                    children: children
                });
            }
        }

        //2. Recent Projects
        if (this.recentItems && this.recentItems.recentProjects) {
            //2.1 Filter
            let currentRecent = this.recentItems.recentProjects.filter(recent => {
                return projects.filter(p => { return p.id === recent.id; }).length > 0;
            });

            if (currentRecent.length > 0) {
                //2.2 Map and Add
                let children: Select2Element[] = currentRecent.map(this.convertToSelect2);
                result.push({
                    id: 'recent',
                    text: yasoon.i18n('dialog.recentProjects'),
                    children: children
                });
            }
        }

        //3. All Projects
        let sortedProjects = projects.sort((a, b) => { return ((a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : -1); })
        result.push({
            id: 'all',
            text: yasoon.i18n('dialog.allProjects'),
            children: sortedProjects
        })

        return result;
    }

    queryData(): Promise<Select2Element[]> {
        if (this.projectCache && this.projectCache.length > 0) {
            return Promise.resolve(this.projectCache.map(this.convertToSelect2));
        }

        return jiraGet('/rest/api/2/project')
            .then((data: string) => {
                let projects: JiraProject[] = JSON.parse(data);
                this.projectCache = projects;
                console.log('Return API projects', projects);
                return projects.map(this.convertToSelect2);
            });
    }

    getData(): Promise<Select2Element[]> {
        if (this.returnStructure) {
            return Promise.resolve(this.returnStructure);
        }
        return this.queryData()
            .then(projects => {
                this.returnStructure = this.getReturnStructure(projects);
                return this.returnStructure;
            });
    }
}