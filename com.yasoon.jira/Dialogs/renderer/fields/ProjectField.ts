/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />

@getter(GetterType.Object, "id")
@setter(SetterType.Option)
class ProjectField extends Select2Field implements IFieldEventHandler {

    static defaultMeta: JiraMetaField = { key: FieldController.projectFieldId, get name() { return yasoon.i18n('dialog.project'); }, required: true, schema: { system: 'project', type: '' } };
    static settingRecentProjects = 'recentProjects';

    projectCache: JiraProject[];
    recentProjects: JiraProject[];
    returnStructure: Select2Element[];
    isMainProjectField: boolean;

    constructor(id: string, field: JiraMetaField, cache: JiraProject[]) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectProject');
        options.allowClear = false;
        super(id, field, options);

        this.isMainProjectField = (id === FieldController.projectFieldId);

        //Load Recent Projects from DB
        let projectsString = yasoon.setting.getAppParameter(ProjectField.settingRecentProjects);
        if (projectsString) {
            this.recentProjects = JSON.parse(projectsString);
        }

        if (cache) {
            this.projectCache = cache;
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
        FieldController.raiseEvent(EventType.FieldChange, project, this.id);
    }

    handleEvent(type: EventType, newValue: any, source?: string): Promise<any> {
        if (type === EventType.AfterSave) {
            //SAVE TO RECENT PROJECTS
            let project = this.getObjectValue();
            //First make sure to remove the currently selected project
            this.recentProjects = this.recentProjects.filter((proj) => { return proj.id != project.id; });

            //We only want to have 5 entries --> delete the last one if nessecary
            if (this.recentProjects.length > 4) {
                this.recentProjects = this.recentProjects.slice(0, 4);
            }

            //Add current project
            this.recentProjects.unshift(project);
            yasoon.setting.setAppParameter(ProjectField.settingRecentProjects, JSON.stringify(this.recentProjects));
        }
        return null;
    }

    setDefaultProject() {
        //If mail is provided && subject contains reference to project, pre-select that
        if (jira.emailController && jira.emailController.mail && jira.emailController.mail.subject && this.projectCache && this.projectCache.length > 0) {
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
        if (this.recentProjects) {
            //2.1 Filter
            let currentRecent = this.recentProjects.filter(recent => {
                return projects.filter(p => { return p.id === recent.id; }).length > 0;
            });

            //2.2 Map and Add
            let children: Select2Element[] = currentRecent.map(this.convertToSelect2);
            result.push({
                id: 'recent',
                text: yasoon.i18n('dialog.recentProjects'),
                children: children
            });
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