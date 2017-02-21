/// <reference path="../Field.ts" />
/// <reference path="../FieldController.ts" />
/// <reference path="Select2AjaxField.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
/// <reference path="../../../definitions/common.d.ts" />
/// <reference path="../getter/GetOption.ts" />
/// <reference path="../setter/SetOptionValue.ts" />

interface ProjectFieldOptions {
    cache?: JiraProject[];
    allowClear?: boolean;
    showTemplates?: boolean;
    isMainProjectField?: boolean;
}

@getter(GetterType.Option, "id")
@setter(SetterType.Option)
class ProjectField extends Select2Field {

    static defaultMeta: JiraMetaField = { key: FieldController.projectFieldId, get name() { return yasoon.i18n('dialog.project'); }, required: true, schema: { system: 'project', type: '' } };

    projectCache: JiraProject[];
    returnStructure: Select2Element[];
    isMainProjectField: boolean;
    showTemplates: boolean;
    recentItems: RecentItemController;
    emailController: EmailController;
    templateController: TemplateController;

    constructor(id: string, field: JiraMetaField, fieldOptions: ProjectFieldOptions = { cache: [], allowClear: false, showTemplates: false, isMainProjectField: false }) {
        let options: Select2Options = {};
        options.placeholder = yasoon.i18n('dialog.placeholderSelectProject');
        options.allowClear = fieldOptions.allowClear;
        super(id, field, options);
        this.emailController = jira.emailController;
        this.recentItems = jira.recentItems;
        this.templateController = jira.templateController;

        this.isMainProjectField = fieldOptions.isMainProjectField;
        this.showTemplates = fieldOptions.showTemplates && !!this.templateController;
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
            })
            .catch((e) => { this.handleError(e); });
    }

    init() {
        //Init is called automatically for each new meta --> not necessary for projects
    }

    setDefaultProject() {
        if (this.initialValue)
            return;

        //Applications like tasks may insert 
        if (jira.issue && jira.issue.fields && jira.issue.fields.project) {
            this.setValue(jira.issue.fields.project);
            return;
        }
        // Mail may already contain a conversation. Should this also be valid for newIssue?!
        if (this.emailController) {
            let convData: YasoonConversationData = this.emailController.getConversationData();
            if (convData) {
                //Try to find project that matches
                //We could just lookup the first issue and directly select the projectId.
                //However, we want to support longterm enhancements where conversationData could be shared with others and then the project might not exist for this user.
                for (let id in convData.issues) {
                    let intId = parseInt(id);
                    let issue: YasoonConversationIssue = convData.issues[id];
                    if (this.projectCache.filter((el) => { return el.id === issue.projectId; }).length > 0) //jshint ignore:line
                    {
                        this.setValue(issue.projectId);
                        return; //-> subject handling will not be done if we find something here
                    }
                }
            }
        }
        //If mail is provided && subject contains reference to project, pre-select that
        if (this.emailController && this.emailController.mail && this.emailController.mail.subject && this.projectCache && this.projectCache.length > 0) {
            //Sort projects by key length descending, so we will match the following correctly:
            // Subject: This is for DEMODD project
            // Keys: DEMO, DEMOD, DEMODD
            let projectsByKeyLength = this.projectCache.sort((a, b) => {
                return b.key.length - a.key.length; // ASC -> a - b; DESC -> b - a
            });

            for (let i = 0; i < projectsByKeyLength.length; i++) {
                let curProj = projectsByKeyLength[i];
                if (this.emailController.mail.subject.indexOf(curProj.key) >= 0) {
                    this.setValue(curProj);
                    return;
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

    handleError(e: Error) {
        super.handleError(e);
        if (e instanceof jiraSyncError) {
            $('#MainAlert').removeClass('hidden').find('.error-text').text(yasoon.i18n('dialog.errorInitConnection'));
        } else {
            $('#MainAlert').removeClass('hidden').find('.error-text').text(yasoon.i18n('dialog.errorInitUnknown'));
        }
    }

    hookEventHandler() {
        super.hookEventHandler();

        if (this.showTemplates) {
            this.ownContainer.find('.show-template-modal').click((e) => {
                console.log('Triggered Call Dialog');
                this.templateController.showTemplateSelection();
            });
        }
    }

    render(container: JQuery) {
        super.render(container);

        if (this.showTemplates) {
            container.append('<div style="display:inline-block; margin-left: 5px;"><a class="show-template-modal"><i class="fa fa-magic"></i></a></div>');
        }
    }

    private getReturnStructure(projects?: Select2Element[], queryTerm?: string): Select2Element[] {
        let result: Select2Element[] = [];
        //1. Recent Projects
        if (this.recentItems && this.recentItems.recentProjects) {
            //2.1 Filter
            let currentRecent = projects.filter(p => {
                return this.recentItems.recentProjects.filter(recent => { return p.id === recent.id; }).length > 0;
            });

            if (currentRecent.length > 0) {
                //2.2 Map and Add
                result.push({
                    id: 'recent',
                    text: yasoon.i18n('dialog.recentProjects'),
                    children: currentRecent
                });
            }
        }

        //2. All Projects
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