var jiraFields = {};
function UIFormHandler() {
	function getFieldType(field) {
		return field.schema.custom || field.schema.system;
	}

	renderer = {};

	return {
		register: function(key, newRenderer) {
			renderer[key] = newRenderer;
		},
		getFieldType: function(field) {
			return getFieldType(field);
		},
		getRenderer: function(key) {
			return renderer[key];
		},
		render: function (id, field, container) {
			var type = getFieldType(field);
			if (type) {
				var responsibleRenderer = renderer[type];
				if (responsibleRenderer)
					responsibleRenderer.render(id, field, container);
			}
		},

		getValue: function(id,field) {
			var type = getFieldType(field);
			if (type) {
				var responsibleRenderer = renderer[type];
				if (responsibleRenderer)
					return responsibleRenderer.getValue(id);
			}
		},

		getFormData: function (result) {
			result = result || { fields: {} };
			var self = this;
			//Find Meta for current Issue Type
			if (jira.currentMeta) {
				$.each(jira.currentMeta.fields, function (key, field) {
					var newValue = self.getValue(key,field);
					if (newValue !== undefined)
						result.fields[key] = newValue;
				});
			}
		},

		setValue: function(id,field, value) {
			var type = getFieldType(field);
			if (type) {
				var responsibleRenderer = renderer[type];
				if (responsibleRenderer)
					return responsibleRenderer.setValue(id, value);
			}
		},

		setFormData: function (issue) {
			var self = this;
			if (jira.currentMeta) {
				$.each(jira.currentMeta.fields, function (key, field) {
					try {
						self.setValue(key, field, issue.fields[key]);
					} catch (e) {
						console.log('Error SetValue for Field: ', field, e.message);
						yasoon.util.log('Error: ' + e.message + '. Couldn\'t setValue for field' + JSON.stringify(field), yasoon.util.severity.warning);
					}	
				});
			}
		},

		triggerEvent: function (eventType, data) {
			if (jira.currentMeta) {
				$.each(jira.currentMeta.fields, function (key, field) {
					var type = getFieldType(field);
					if (type) {
						var responsibleRenderer = renderer[type];
						if (responsibleRenderer && responsibleRenderer.hasOwnProperty('handleEvent')) {
							responsibleRenderer.handleEvent(eventType, key, field, data);
						}
					}
				});
			}
		},
	};
}

var UIRenderer = new UIFormHandler();

//@ sourceURL=http://Jira/Dialog/jiraFieldRendererCore.js