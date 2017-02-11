
class JiraFilterController {
	values = {};
	filterObj = [];
	allFilters = [];

	getLabel(name, id, path) {
		return (this.values[path] && this.values[path][id]) ? this.values[path][id] : null;
	}

	register() {
		var backendFilterObj = [];
		this.filterObj.forEach((f) => {
			if (this.getSelectedFilters().indexOf(f.key) > -1) {
				var getLabelFct = (f.label) ? f.label : this.getLabel;
				backendFilterObj.push({
					name: f.name,
					jsonPath: f.key,
					label: getLabelFct
				});
			}
		});
		yasoon.feed.addFilter(backendFilterObj);
	}

	getSelectedFilters() {
		return jira.settings.activeFilters.split(',');
	}

	load() {
		var string = yasoon.setting.getAppParameter('filter');
		if (string)
			this.values = JSON.parse(string);

		this.filterObj = [
			{
				name: yasoon.i18n('filter.projectFilter'),
				key: 'fields.project.id',
				value: { type: 'json', path: 'fields.project.name' }
				//Without label so it gets the default GetLabel method
			},
			{
				name: yasoon.i18n('filter.typeFilter'),
				key: 'fields.issuetype.id',
				value: { type: 'json', path: 'fields.issuetype.name' }
			},
			{
				name: yasoon.i18n('filter.reporterFilter'),
				key: 'fields.reporter.emailAddress',
				value: { type: 'json', path: 'fields.reporter.displayName' }
			},
			{
				name: yasoon.i18n('filter.statusFilter'),
				key: 'fields.status.id',
				value: { type: 'json', path: 'fields.status.name' }
			},
			{
				name: yasoon.i18n('filter.priorityFilter'),
				key: 'fields.priority.id',
				value: { type: 'json', path: 'fields.priority.name' }
			},
			{
				name: yasoon.i18n('filter.assigneeFilter'),
				key: 'fields.assignee.emailAddress',
				value: { type: 'json', path: 'fields.assignee.displayName' }
			},
			{
				name: yasoon.i18n('filter.fixVersionFilter'),
				key: 'fields.fixVersions[*].id',
				value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: yasoon.i18n('filter.versionFilter'),
				key: 'fields.versions[*].id',
				value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: yasoon.i18n('filter.labelFilter'),
				key: 'fields.labels'
				//value: { type: 'json', path: 'fields.fixVersions[*].name' }
			},
			{
				name: yasoon.i18n('filter.componentFilter'),
				key: 'fields.components[*].id',
				value: { type: 'json', path: 'fields.components[*].name' }
			}
		];

		//Determine allFilters
		this.filterObj.forEach((f) => {
			this.allFilters.push(f.key);
		});

	}

	save() {
		yasoon.model.feeds.updateFilter();
		yasoon.setting.setAppParameter('filter', JSON.stringify(this.values));
	}

	getJsonPathElement(obj, jsonPath) {
		var path = jsonPath.split('.');
		var currentObj = obj;
		//Use some so it stops after any element has returned true
		path.some((currentPath, i) => {
			if (!currentObj)
				return true;

			//Add support for Arrays
			//Check if it has element selector [1] or all [*]
			var regex = /(.+)\[(.+)\]/;
			var regexResult = regex.exec(currentPath);

			if (regexResult) {
				//It should be an array, but it isn't
				var arrayData = currentObj[regexResult[1]];
				if (!$.isArray(arrayData)) {
					currentObj = null;
					return true;
				}

				if (regexResult[2] === '*') {
					currentObj = [];
					//Get remaining path
					var remainingPath = '';
					path.forEach((remPath, index) => {
						if (index > i) {
							if (remainingPath)
								remainingPath += '.';

							remainingPath += remPath;
						}
					});

					arrayData.forEach((o) => {
						var data = this.getJsonPathElement(o, remainingPath);
						if (data)
							currentObj.push(data);
					});
					return true;

				} else {
					//Get requested element
					currentObj = currentObj[regexResult[1]];
				}
			} else {
				currentObj = currentObj[currentPath];
			}
		});

		return currentObj;
	}

	addNotif (obj) {
		//Go through each filter 
		var saveNeeded = false;
		this.getSelectedFilters().forEach((filterKey) => {
			var filter = this.filterObj.filter((f) => { return f.key === filterKey; })[0];
			//Get Key Value for current filter
			var currentKeyObj = this.getJsonPathElement(obj, filter.key);
			if (currentKeyObj) {
				//Get Value for current Filter
				var currentValueObj = currentKeyObj;
				if (filter.value) {
					if (filter.value.type !== 'json') {
						throw 'Filter Types other than json are currently not supported';
					}

					currentValueObj = this.getJsonPathElement(obj, filter.value.path);
				}
				//Update Buffer
				if (!this.values[filter.key])
					this.values[filter.key] = {};

				if ($.isArray(currentKeyObj)) {
					//Add Each currentValueObj as seperate entry
					currentKeyObj.forEach((key, i) => {
						if (this.values[filter.key][key] != currentValueObj[i]) {
							this.values[filter.key][key] = currentValueObj[i];
							saveNeeded = true;
						}
					});
				} else if (this.values[filter.key][currentKeyObj] != currentValueObj) {
					this.values[filter.key][currentKeyObj] = currentValueObj;
					saveNeeded = true;
				}
			}
		});

		if (saveNeeded)
			this.save();
	}

	indexPages(page) {
		//Add Promise to make it async. We want only want to sync 1 page and let other tasks  a chance to do something as well.
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (page.Items) {
					page.Items.forEach((item) => {
						this.addNotif(JSON.parse(item.externalData));
					});

					if (page.CurrentPage < page.TotalPages) {
						this.indexPages(page.nextPage())
							.then(() => {
								resolve();
							});
					} else {
						resolve();
					}
				} else {
					resolve();
				}
			}, 1);
		});
	}

	reIndex () {
		var newValues = {};
		return Promise.resolve()
			.then(() => {
				var page = yasoon.notification.getAll();
				return this.indexPages(page);
			});
	}
}