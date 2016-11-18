/// <reference path="../Field.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../common.js" />

@getter(GetterType.Object, "id")
@setter(SetterType.Option)
class ProjectField extends Select2Field {

    static defaultMeta: JiraMetaField = { key: FieldController.projectFieldId, name: 'Project', required: true, schema: { system: 'project', type: '' } };

    projectCache: JiraProject[];
    recentProjects: JiraProject[];
    senderTemplates: JiraProjectTemplate[];
    returnStructure: Select2Element[];

    constructor(id: string, field: JiraMetaField, cache: JiraProject[]) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectProject');
        super(id, field, options);

        //Load Recent Projects from DB
        let projectsString = yasoon.setting.getAppParameter('recentProjects');
        if (projectsString) {
            this.recentProjects = JSON.parse(projectsString);
        }

        //Load Sender Email Templates if nessecary
        if (jira.mail) {
            let templateString = yasoon.setting.getAppParameter('createTemplates');
            if (templateString) {
                this.senderTemplates = JSON.parse(templateString);
            }
        }

        if (cache) {
            this.projectCache = cache;
        }

        //Start Getting Data
        this.showSpinner();
        this.getData()
            .then(() => {
                this.hideSpinner();
            });
    }

    hookEventHandler() {
        super.hookEventHandler();
        $('#' + this.id).on('change', () => {
            let projectId = this.getDomValue();

            if (projectId) {
                $('#issueArea').removeClass('hidden');
                let project = this.projectCache.filter(proj => { return proj.id == projectId; })[0];
                FieldController.raiseEvent(EventType.FieldChange, project, this.id);
            } else {
                $('#issueArea').addClass('hidden');
            }
        });
        $('#' + this.id).next().find('.select2-selection').first().focus();
    }

    //Convert project data into displayable data
    private mapProjectValues(projects: JiraProject[]) {
        let result = projects.map(p => {
            let element: Select2Element = {
                id: p.id,
                text: p.name,
                icon: getProjectIcon(p),
                data: p
            };
            return element;
        });
        return result;
    }

    private getReturnStructure(projects?: Select2Element[], queryTerm?: string): Select2Element[] {
        let result: Select2Element[] = [];
        //1. User Templates
        if (this.senderTemplates) {
            //1.1 Filter
            let currentTemplates = this.senderTemplates.filter(templ => {
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
                let children: Select2Element[] = this.mapProjectValues(currentTemplates);
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
            let children: Select2Element[] = this.mapProjectValues(currentRecent);
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
        if (this.projectCache && this.projectCache.length > 0)
            return Promise.resolve(this.mapProjectValues(this.projectCache));

        return jiraGet('/rest/api/2/project')
            .then((data: string) => {
                let projects: JiraProject[] = JSON.parse(data);
                return this.mapProjectValues(projects);
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