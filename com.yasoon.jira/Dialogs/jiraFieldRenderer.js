function SingleTextRenderer() {
	this.getValue = function (id) {
		return $('#' + id).val();
	};

	this.setValue = function (id, value) {
		if(value)
			$('#' + id).val(value);
	};

	this.render = function (id, field, container) {
		$(container).append('<div class="field-group">' +
					'   <label for="' + id + '">' + field.name +
					'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
					'   </label>' +
					'    <input class="text long-field" id="' + id + '" name="' + id + '" value="" type="text" data-type="com.atlassian.jira.plugin.system.customfieldtypes:textfield">' +
					'</div>');
	};
}
	
function MultilineTextRenderer() {
	function isDescription(id) {
		return (id === 'description' || id === 'comment');
	}

	//MentionsInput only allows to get the value async... which breaks our concept.
	//So we get the value of the comment box after each change and save it here so we can get it afterwards synchroniously.
	mentionTexts = {};

	this.getValue = function (id) {
		if (isDescription(id)) {
			//Parse @mentions
			return mentionTexts[id].replace(/@.*?\]\(user:([^\)]+)\)/g, '[~$1]');
		} else {
			return $('#' + id).val();
		}


	};

	this.setValue = function (id, value) {
		if(value)
			$('#' + id).val(value);
	};

	this.render = function (id, field, container) {
		var descriptionHtml = '<div class="mentions-help-text bg-warning"><span>' + yasoon.i18n('dialog.mentionsAlert') + '</span></div>';
		if (isDescription(id) && jira.mail) {
			descriptionHtml += '<div style="margin-top:5px; position:relative;">' +
				'<span id="DescriptionOptionToolbar" class="' + ((jira.mail) ? '' : 'hidden') + '" style="padding: 3px;">' +
				'	<span title="'+ yasoon.i18n('dialog.titleToggleJiraMarkup') +'"><input id="DescriptionUseJiraMarkup" class="toggle-checkbox" type="checkbox" checked="checked"/>' + yasoon.i18n('dialog.toggleJiraMarkup') +'</span>' +
				'	<a style="cursor:pointer;" class="hidden" id="DescriptionUndoAction"><i class="fa fa-undo"></i> ' + yasoon.i18n('dialog.undo') +' </a>' +
				'</span>' +
				'<span class="dropup pull-right">' +
				'	<a style="cursor:pointer;" data-toggle="dropdown" class="dropdown-toggle" title="' + yasoon.i18n('dialog.titleReplaceWith') +'" >'+ yasoon.i18n('dialog.replaceWith') + '<span class="caret"></span></a>' +
				'	<ul class="dropdown-menu">' +
				'	<li><span style="display: block;padding: 4px 10px;">'+ yasoon.i18n('dialog.toggleJiraMarkup') +'<input class="toggleJiraMarkup toggle-checkbox" type="checkbox" checked="checked" /></span></li>' +
				'	<li role="separator" class="divider"></li>' +
				((jira.selectedText) ? '<li id="DescriptionSelectedText"><a href="#">'+ yasoon.i18n('dialog.addSelectedText') +'</a></li>' : '') +
				((jira.mail) ? '<li id="DescriptionFullMail"><a href="#">'+ yasoon.i18n('dialog.addConversation') +'</a></li>' : '') +
				'	</ul>' +
				'</span>' +

				'<span class="dropup pull-right" style="margin-right: 20px;">' +
				'	<a style="cursor:pointer;" data-toggle="dropdown" class="dropdown-toggle" title="' + yasoon.i18n('dialog.titleReplaceWith') + '" >'+ yasoon.i18n('dialog.add') +'<span class="caret"></span></a>' +
				'	<ul class="dropdown-menu">' +
				'	<li><span style="display: block;padding: 4px 10px;">'+yasoon.i18n('dialog.toggleJiraMarkup') +'<input class="toggleJiraMarkup toggle-checkbox" type="checkbox" checked="checked" /></span></li>' +
				'	<li role="separator" class="divider"></li>' +
				((jira.mail) ? '<li id="DescriptionMailInformation"><a href="#">' + yasoon.i18n('dialog.addMailInformation') +'</a></li>' : '') +

				'	</ul>' +
				'</span>' +
				'</div>';
		}

		$(container).append('<div class="field-group">' +
			'   <label for="' + id + '">' + field.name +
			'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
			'   </label>' +
			'    <textarea class="form-control" id="' + id + '" name="' + id + '" style="height:' + ((isDescription(id)) ? '200px' : '100px') + ';overflow: initial;" data-type="com.atlassian.jira.plugin.system.customfieldtypes:textarea"></textarea>' +
			descriptionHtml + //Is only filled if nessecary
			'</div>');

		if (isDescription(id)) {
			var defaultSelectedText = ((jira.selectedText) ? jira.mail.getSelection(0) : null);
			var useMarkup = true;
			var backup = '';
			var lastAction = ((jira.selectedText) ? 'selectedText' : (jira.mail) ? 'wholeMail' : '');

			$('.toggleJiraMarkup').on('click', function (e) {
				useMarkup = this.checked;
				$('.toggleJiraMarkup').prop('checked', useMarkup);
				event.stopPropagation();
			});

			$('#DescriptionUseJiraMarkup').on("change", function (e) {
				useMarkup = this.checked;
				$('.toggleJiraMarkup').prop('checked', useMarkup);
				if (lastAction == 'selectedText') {
					if (useMarkup)
						$('#' + id).val(jira.selectedText);
					else
						$('#' + id).val(defaultSelectedText);

				} else if (lastAction == 'wholeMail') {
					if (useMarkup) {
						$('#' + id).val(jira.mailAsMarkup);
					} else {
						$('#' + id).val(jira.mail.getBody(0));
					}
				}
				e.preventDefault();
			});

			$("#description").on("keyup paste", function (e) {
				$('#DescriptionOptionToolbar').addClass('hidden');
			});

			$('#DescriptionUndoAction').on('click', function (e) {
				$('#' + id).val(backup);
				$('#DescriptionOptionToolbar').addClass('hidden');
			});

			$('#DescriptionSelectedText').on('click', function (e) {
				backup = $('#' + id).val();
				lastAction = 'selectedText';
				$('#DescriptionOptionToolbar').removeClass('hidden');
				$('#DescriptionUseJiraMarkup').checked = useMarkup;
				$('#DescriptionUndoAction').removeClass('hidden');

				if (useMarkup)
					$('#' + id).val(jira.selectedText);
				else
					$('#' + id).val(jira.mail.getSelection(0));

			});

			$('#DescriptionFullMail').on('click', function (e) {
				backup = $('#' + id).val();
				lastAction = 'wholeMail';
				$('#DescriptionOptionToolbar').removeClass('hidden');
				$('#DescriptionUseJiraMarkup').checked = useMarkup;
				$('#DescriptionUndoAction').removeClass('hidden');

				if (useMarkup) {
					$('#description').val(jira.mailAsMarkup);
				} else {
					$('#description').val(jira.mail.getBody(0));
				}
			});

			$('#DescriptionMailInformation').on('click', function (e) {
				backup = $('#' + id).val();				
				insertAtCursor($('#description')[0], renderMailHeaderText(jira.mail, useMarkup));
			});

			$('#' + id).mentionsInput({
				onDataRequest: searchUser,
				triggerChar: '@',
				minChars: 2,
				showAvatars: false,
				elastic: false
			});

			$('#' + id).bind('scroll', function () {
				console.log($(this).scrollTop());
				$(this).prev().css('margin-top', '-' + $(this).scrollTop() + 'px');
			});

			$('#' + id).bind('change', function () {
				$('#' + id).mentionsInput('val', function (content) {
					mentionTexts[id] = content;
				});
			});


			
		}
	};
}

function CheckboxRenderer() {
	this.getValue = function (id) {
		if ($('#' + id).length === 0)
			return;

		var checkedValues = [];
		$('#'+id).find('input').each(function () {
			if ($(this).is(':checked')) {
				checkedValues.push({ id: $(this).val() });
			}
		});
		return (checkedValues.length > 0) ? checkedValues : null;
	};

	this.setValue = function (id, value) {
		if (value) {
			var elem = $('#' + id);
			$.each(value, function (i, item) {
				elem.find('[value=' + item.id + ']').prop('checked', true);
			});
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group" id="' + id + '" data-type="com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes">' +
					'    <label>' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label> ';
		$.each(field.allowedValues, function (i, option) {
			html += '   <div class="checkbox awesome">' +
					'		<input type="checkbox" id="'+id+'_'+option.id+'" value="' + option.id + '">'+
					'       <label for="' + id + '_' + option.id + '">' + option.value + '</label>'+
					'   </div>';
		});

		html += '</div>';
		$(container).append(html);
	};
}

function RadioButtonRenderer() {
	this.getValue = function (id) {
		if ($('#' + id).length === 0)
			return;

		var checkedValue = $('#' + id).find('input:checked').first().val();
		return (checkedValue) ? { id: checkedValue } : null;
	};

	this.setValue = function (id, value) {
		if (value) {
			var elem = $('#' + id).find('[value=' + value.id + ']').prop('checked', true);
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group" id="' + id + '" data-type="com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons">' +
					'    <label>' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label> ';
		if (!field.required) {
			// Show None option only if it's not mandatory
			html += '   <div class="radio">' +
			'		<input name="' + id + '" type="radio" value="" checked>' +
			'       <label>None</label>' +
			'   </div>';
		}
		$.each(field.allowedValues, function (i, option) {
			html += '   <div class="radio">' +
					'		<input name="'+ id +'" type="radio" value="' + option.id + '">' +
					'       <label>' + option.value + '</label>' +
					'   </div>';
		});

		html += '</div>';
		$(container).append(html);
	};
}

function DateRenderer() {
	this.getValue = function (id) {
		var value = $('#' +id).datepicker("getDate");
		if (value) {
			return moment(value).format('YYYY-MM-DD');
		}
	};

	this.setValue = function (id, value) {
		if (value) {
			$('#' + id).val(moment(new Date(value)).format('L'));
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group aui-field-datepicker"> ' +
					'    <label for="' + id + '">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label> ' +
					'    <input style="height: 28px;" class="text long-field" id="' + id + '" name="' + id + '" placeholder="' + yasoon.i18n('dialog.datePickerFormatTitle') + '" value="" type="text" data-type="com.atlassian.jira.plugin.system.customfieldtypes:datepicker"> ' +
					'    <a href="#" id="' + id + '-trigger" title="' + yasoon.i18n('dialog.titleSelectDate') + '" tabindex="-1"><span class="aui-icon icon-date">' + yasoon.i18n('dialog.titleSelectDate') + '</span></a> ' +
					'</div>';
		$(container).append(html);
		var format = yasoon.i18n('dialog.datePickerDateFormat');
		var country = yasoon.setting.getProjectSetting('locale').split('-')[0];
		var regionalTexts = $.datepicker.regional[country];

		$('#' + id).datepicker($.extend(
			{},
			regionalTexts,
			{
				showOtherMonths: true,
				selectOtherMonths: true,
				dateFormat: format,
			}));

		$('#' + id + '-trigger').unbind().click(function (e) {
			$('#' + id).datepicker("show");
		});
	};
}

function DateTimeRenderer() {
	this.getValue = function (id) {
		var value = $('#' + id).datetimepicker('getValue');
		var oldValue = $('#' + id).data('oldValue');
		if (value && value.valueOf() != oldValue) {
			return moment(value).format('YYYY-MM-DD[T]HH:mm:ss.[000]ZZ');
		}
	};

	this.setValue = function (id, value) {
		if (value) {			
			var momentDate = moment(new Date(value));
			$('#' + id).datetimepicker('setOptions', { value: momentDate.format('L') + ' ' + momentDate.format('LT') });
			$('#' + id).data('oldValue', momentDate.valueOf());
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group aui-field-datepicker"> ' +
					'    <label for="' + id + '">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label> ' +
					'    <input style="height: 28px;" class="text long-field" id="' + id + '" name="' + id + '" placeholder="' + yasoon.i18n('dialog.dateTimePickerFormatTitle') +'" value="" type="text" data-type="com.atlassian.jira.plugin.system.customfieldtypes:datepicker"> ' +
					'    <a href="#" id="' + id + '-trigger" "title="'+ yasoon.i18n('dialog.titleSelectDate')+'" tabindex="-1"><span class="aui-icon icon-date">'+ yasoon.i18n('dialog.titleSelectDate') + '</span></a> ' +
					'</div>';
		$(container).append(html);

		var country = yasoon.setting.getProjectSetting('locale').split('-')[0];

		$('#'+id).datetimepicker({
			allowTimes: [
				//'00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30',
				'07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
				'12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
				//,'20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
			],
			format: yasoon.i18n('dialog.dateTimePickerFormat'),
		});
		$.datetimepicker.setLocale(country);

		$('#' + id + '-trigger').unbind().click(function (e) {
			$('#' + id).datetimepicker("show");
		});
	};
}

function LabelRenderer() {
	this.getValue = function (id) {
		return $('#' + id).val();
	};

	this.setValue = function (id, value) {
		if (value && value.length > 0) {
			value.forEach(function (label) {
				//Add Option tags so initial selection will work
				$('#' + id).append('<option val="' + label + '">' + label + '</option>');
			});

			$('#' + id).val(value).trigger('change');
			$('#' + id).data('value', value);
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group aui-field-componentspicker frother-control-renderer">' +
						'    <label for="' + id + '">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
						'    <select style="min-width: 350px; width: 80%;" class="select input-field" id="' + id + '" multiple="" name="' + id + '" data-type="com.atlassian.jira.plugin.system.customfieldtypes:labels"></select>' +
						'	<div class="description">' + yasoon.i18n('dialog.labelDescription') + '</div>' +
						'</div>';

		$(container).append(html);
		//DAMIT JIRA!!! 
		//field.autoCompleteUrl delivered by JIRA contains errors.
		//So we need to decide wether it's JIRA standard label or any customfield label
		var url = '/rest/api/1.0/labels/suggest?maxResults=500&query=';
		if (id !== 'labels') {
			url = '/rest/api/1.0/labels/suggest?maxResults=500&customFieldId=' + field.schema.customId + '&query=';
		}
		
		$('#' + id).select2({
			tags: true,
			ajax: {
				url: url,
				transport: function (params, success, failure) {
					var queryTerm = '';
					if (params && params.data) {
						queryTerm = params.data.q;
					}

					jiraGet(url + queryTerm)
					.then(function (data) {
						
						var labels = JSON.parse(data);
						var labelArray = [];
						if (labels.suggestions) {
							$.each(labels.suggestions, function (i, label) {
								labelArray.push({ text: label.label, id: label.label });
							});
						}
						success(labelArray);
					})
					.catch(function (e) {
						failure();
					});
				},
				processResults: function (data, page) {
					return {
						results: data
					};
				}
			},
			tokenSeparators: [" "]
		});
	};
}

function NumberRenderer() {
	this.getValue = function (id) {
		var float = parseFloat($('#'+id).val());
		if (float)
			return float;
	};

	this.setValue = function (id, value) {
		if (value)
			$('#' + id).val(value);
	};

	this.render = function (id, field, container) {
		$(container).append('<div class="field-group">' +
					'   <label for="' + id + '">' + field.name +
					'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
					'   </label>' +
					'    <input class="text long-field" id="' + id + '" name="' + id + '" value="" type="number" data-type="com.atlassian.jira.plugin.system.customfieldtypes:float">' +
					'</div>');
	};
}

function SelectListRenderer() {
	this.getValue = function (id) {
		if ($('#' + id).val()) {
			return { id: $('#' + id).val() };
		}
	};

	this.setValue = function (id, value) {
		if (value) {
			$('#' + id).val(value.id).trigger('change');
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group input-field">' +
						'    <label for="' + id + '">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
						'    <select class="select input-field" id="' + id + '" name="' + id + '" style="min-width: 350px; width: 80%;" data-type="com.atlassian.jira.plugin.system.customfieldtypes:select">' +
						'		<option value="">' + ((field.hasDefaultValue) ? yasoon.i18n('dialog.selectDefault') : yasoon.i18n('dialog.selectNone')) + '</option>';

		$.each(field.allowedValues, function (i, option) {
			var icon = null;
			if (option.iconUrl) {
				icon = jira.icons.mapIconUrl(option.iconUrl);
			}
			var text = option.name || option.value;
			html += '<option value="' + option.id + '" data-icon="' + ((icon) ? icon : '') + '">' + text + '</option>';
		});
		html += '   </select>' +
				'</div>';

		$(container).append(html);

		$('#' + id).select2({
			templateResult: formatIcon,
			templateSelection: formatIcon,
			//escapeMarkup: function (m) { return m; }
		});
	};
}

function MultiSelectListRenderer() {
	this.getValue = function (id) {
		if ($('#' + id).val()) {
			var selectedValues = [];
			$.each($('#' + id).val(), function (i, id) {
				selectedValues.push({ id: id });
			});
			return selectedValues;
		}
	};

	this.setValue = function (id, value) {
		if (value) {
			var selectedValues = [];
			$.each(value, function (i, item) {
				selectedValues.push(item.id);
			});
			$('#' + id).val(selectedValues).trigger('change');
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group input-field">' +
				'    <label for="issuetype">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				'    <select data-container-class="issuetype-ss" class="select text" id="' + id + '" name="' + id + '" style="min-width: 350px; width: 80%;" multiple="multiple" data-type="com.atlassian.jira.plugin.system.customfieldtypes:multiselect">';
		$.each(field.allowedValues, function (i, option) {
			var text = option.name || option.value;
			html += '<option value="' + option.id + '">' + text + '</option>';
		});
		html += '      </select>' +
				'</div>';

		$(container).append(html);

		$('#' + id).select2();
	};
}

function VersionMultiSelectListRenderer() {
	this.getValue = function (id) {
		if ($('#' + id).val()) {
			var selectedValues = [];
			$.each($('#' + id).val(), function (i, id) {
				selectedValues.push({ id: id });
			});
			return selectedValues;
		}
	};

	this.setValue = function (id, value) {
		if (value) {
			var selectedValues = [];
			$.each(value, function (i, item) {
				selectedValues.push(item.id);
			});
			$('#' + id).val(selectedValues).trigger('change');
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group input-field">' +
				'    <label for="issuetype">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				'    <select data-container-class="issuetype-ss" class="select text" id="' + id + '" name="' + id + '" style="min-width: 350px; width: 80%;" multiple="multiple" data-type="com.atlassian.jira.plugin.system.customfieldtypes:multiselect">' +
				'		<optgroup label="'+ yasoon.i18n('dialog.releasedVersions') +'">';
		$.each(field.allowedValues, function (i, option) {
			if (option.released) {
				var text = option.name || option.value;
				html += '<option value="' + option.id + '">' + text + '</option>';
			}
		});
		html += '		</optgroup>' + 
				'		<optgroup label="' + yasoon.i18n('dialog.unreleasedVersions') + '">';
		$.each(field.allowedValues, function (i, option) {
			if (!option.released) {
				var text = option.name || option.value;
				html += '<option value="' + option.id + '">' + text + '</option>';
			}
		});
		html += '		</optgroup>' +
				'    </select>' +
				'</div>';

		$(container).append(html);

		$('#' + id).select2();
	};
}

function UserPickerRenderer() {
	this.getValue = function (id) {
		var name = $('#'+id).data('id');
		if (name) {
			return { name: name };
		}
	};

	this.setValue = function (id, value) {
		if (value) {
			$('#' + id)
			.data('id', value.name)
			.data('text', value.displayName)
			.data('icon', '')
			.val(value.name)
			.trigger('change');
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group" id="' + id + '-container">' +
				'	<label for="' + id + '"><span class="descr">' + field.name +
				'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
				'	</label>' +
				'	<select id="' + id + '" name="' + id + '" style="min-width: 350px; width: 80%;" class="select input-field" data-type="com.atlassian.jira.plugin.system.customfieldtypes:userpicker"></select>' +
				'	<span style="display:block; padding: 5px 0px;">' +
				'	<a href="#' + id + '" class="assign-to-me-trigger" title="'+ yasoon.i18n('dialog.assignMyselfTitle') +'">'+ yasoon.i18n('dialog.assignMyself') +'</a>';

		//Create User link is a little tricky. It should only be visible if it's based on an email and senderUser does not exist in system. 
		// But we cannot be sure when user has been loaded.
		//So we create this link invisible in case user has not been loaded yet (and then user loading will activate the links)
		// or we'll display it immediately if we already have all information.
		if (id !== 'assignee') {
			if (jira.mail && jira.senderUser.name === -1) {
				//user does not exist in system
				html += '<a style="margin-left: 50px;" href="#' + id + '" class="create-sender">'+ yasoon.i18n('dialog.createUserLink', { name: jira.mail.senderName}) + '</a>';
			} else if (jira.mail && !jira.senderUser) {
				//user may not exist in system
				html += '<a style="margin-left: 50px; display:none" href="#' + id + '" class="create-sender">' + yasoon.i18n('dialog.createUserLink', { name: jira.mail.senderName }) + '</a>';
			}
		}
		html += '</span></div>';

		$(container).append(html);

		$('#' + id + '-container').find('.assign-to-me-trigger').unbind().click(function (e) {
			if (jira.ownUser) {
				$('#' + id)
					.data('id', jira.ownUser.name)
					.data('text', jira.ownUser.displayName)
					.data('icon', 'ownUser')
					.val(jira.ownUser.name)
					.trigger('change');

				//If created by service assignment, set flag for "On Behalf of"
				if (id === 'behalfReporter') {
					$('#behalfOfUserCheckbox').prop('checked', true).trigger('change');
				}
			}
			e.preventDefault();
		});

		$('#' + id + '-container').find('.create-sender').unbind().click(function (e) {
			var elem = $(this);
			elem.prop('disabled', true);
			var newUser = {
				"name": jira.mail.senderEmail,
				"emailAddress": jira.mail.senderEmail,
				"displayName": jira.mail.senderName
			};

			jiraAjax('/rest/api/2/user', yasoon.ajaxMethod.Post, JSON.stringify(newUser))
			.then(function (user) {
				user = JSON.parse(user);
				return jiraAjax('/rest/api/2/group/user?groupname=jira-users&username=' + encodeURI(user.name), yasoon.ajaxMethod.Delete)
				.catch(function() {})
				.return(user);
			})
			.then(function (user) {
				//New user successfully created
				console.log('Successfull:', user);
				//1. Set it as value for current field
				$('#' + id)
				.data('id', user.name)
				.data('text', user.displayName)
				.data('icon', 'emailSender')
				.val(user.name)
				.trigger('change');

				//2. Add as emailSender for commonValues
				jira.userCommonValues.results[0].children.push({
					id: user.name,
					text: user.displayName,
					icon: 'emailSender'
				});

				elem.css('display', 'none');
			})
			.catch(function (error) {
				elem.prop('disabled', false);
				console.log(error);
				if (error && error.statusCode == 403) {
					yasoon.dialog.showMessageBox(yasoon.i18n('dialog.createUserError403'));
				} else if (error && error.statusCode == 404) {
					yasoon.dialog.showMessageBox(yasoon.i18n('dialog.createUserError404'));
				} else {
					yasoon.dialog.showMessageBox(yasoon.i18n('dialog.createUserErrorOther'));
				}
			});
			e.preventDefault();
		});


		$('#' + id).select2({
			templateResult: formatUser,
			templateSelection: formatUser,
			dataAdapter: jiraFields.CustomUserDataSet,
			minimumInputLength: 0,
		});
	};
}

function AttachmentLinkRenderer() {
	var self = this;
	
	this.getValue = function (id) {
		//Attachments are handled seperately
	};

	this.setValue = function (id, value) {
		//Attachments are handled seperately
	};
	
	
	this.renderMoreActions = function renderMoreActions() {
		return '<span class="dropup" style="position:relative;">' +
				'	<span class="attachmentMore dropdown-toggle" data-toggle="dropdown" title="' + yasoon.i18n('dialog.attachmentLinkTitle') + '" style="cursor: pointer; color:grey;"><span style="font-size:6px;"> <i class="fa fa-circle-o" /><i class="fa fa-circle-o" style="margin-left: 1px;"/><i class="fa fa-circle-o" style="margin-left: 1px;"/></span>&nbsp;</span>' +
				'	<ul class="dropdown-menu" style="cursor:pointer;">' +
				'		<li class="attachmentRename"><a>' + yasoon.i18n('dialog.attachmentRename') + '</a></li>' +
				'		<li class="attachmentAddRef"><a>' + yasoon.i18n('dialog.attachmentReference') + 'Add Reference to Text</a></li>' +
				'		<li class="attachmentDelete"><a>' + yasoon.i18n('dialog.attachmentDelete') + '</a></li>' +
				'	</ul>' +
				'</span>';
	};
	
	this.renderAttachments = function(id) {
		$('#' + id + '-selected-container').empty();
		
		//Render Attachments
		jira.selectedAttachments.forEach(function (fileHandle, i) {
			//To support references to this file, [ ] and ^ are not supported by JIRA --> replace them and change FileName if nessecary		
			var oldFileName = fileHandle.getFileName();
			var newFileName = oldFileName.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\^/g, '_');
			if (oldFileName != newFileName)
				fileHandle.setFileName(newFileName);

			$('#' + id + '-selected-container').append(
			'<div class="jiraAttachmentLink" data-id="' + fileHandle.id + '">'+
				'<span>' +
					'<img style="width:16px;" src="' + fileHandle.getFileIconPath() + '" />' +
					'<span class="attachmentName">' + newFileName + '</span>' +
					'<div style="display:inline-block" class="attachmentNewName hidden">' +  
						'<div class="input-group" style="width:300px;display:inline-table;margin-top:10px;">' +
							'<input class="text input-sm form-control" /><div class="input-group-addon attachmentExtension">.txt</div>' +
						'</div>' +
					'</div>' +
				'</span>' + self.renderMoreActions() + 
			'</div>');			
		});

		//Hook EventHandler
		$('.attachmentRename').unbind().click(function (e) {
			e.preventDefault();
			//Save DOM References
			var domAttachmentLink = $(this).closest('.jiraAttachmentLink');
			var domAttachmentName = domAttachmentLink.find('.attachmentName');
			var domAttachmentNewName = domAttachmentLink.find('.attachmentNewName');
			var domAttachmentNewNameInput = domAttachmentNewName.find('input');

			//Hide Standard Stuff
			domAttachmentName.addClass('hidden');
			domAttachmentLink.find('.attachmentMore').addClass('hidden');

			//Split FileName into pure name and extension
			var attachmentName = domAttachmentName.text();
			var extension = attachmentName.substring(attachmentName.lastIndexOf('.'));
			attachmentName = attachmentName.substring(0, attachmentName.lastIndexOf('.'));

			//Add Change Input Fields
			domAttachmentNewName.removeClass('hidden');
			domAttachmentNewNameInput.val(attachmentName).focus();
			domAttachmentNewName.find('.attachmentExtension').text(extension);
			domAttachmentNewName.after('<span class="attachmentRenameActions" style="font-size: 20px; margin-left: 5px; cursor: pointer;"><i class="fa fa-check attachmentRenameConfirm" /> <i class="fa fa-times attachmentRenameCancel" style="margin-left: 5px;" /></span>');

			var closeHandler = function () {
				domAttachmentName.removeClass('hidden');
				domAttachmentLink.find('.attachmentMore').removeClass('hidden');

				domAttachmentNewName.addClass('hidden');
				domAttachmentLink.find('.attachmentRenameActions').remove();
			};

			//Create Click Handler
			domAttachmentLink.find('.attachmentRenameConfirm').click(function (e) {
				e.preventDefault();
				var newName = domAttachmentNewNameInput.val();
				if (attachmentName != newName) {
					domAttachmentName.text(newName + extension);
					var handleId = domAttachmentLink.data('id');
					var currentHandle = jira.selectedAttachments.filter(function (item) { return item.id == handleId; })[0];
					currentHandle.setFileName(newName + extension);
					
					//Replace references in description (if necessary)
					var oldText = $('#description').val();
					var regEx = new RegExp(attachmentName + extension, 'g');
					var newText = oldText.replace(regEx, newName + extension);
					$('#description').val(newText);
				}
				closeHandler();
			});

			domAttachmentLink.find('.attachmentRenameCancel').click(function (e) {
				e.preventDefault();
				closeHandler();
			});

			domAttachmentLink.on('keyup', function (e) {
				e.preventDefault();
				if (e.keyCode == 13) {
					domAttachmentLink.unbind();
					var newName = domAttachmentNewNameInput.val();
					if (attachmentName != newName) {
						domAttachmentName.text(newName + extension);
						var handleId = domAttachmentLink.data('id');
						var currentHandle = jira.selectedAttachments.filter(function (item) { return item.id == handleId; })[0];
						currentHandle.setFileName(newName + extension);

						//Replace references in description (if necessary)
						var oldText = $('#description').val();
						var regEx = new RegExp(attachmentName + extension, 'g');
						var newText = oldText.replace(regEx, newName + extension);
						$('#description').val(newText);
					}
					closeHandler();
					return false;
				}
			});
		});

		$('.attachmentAddRef').unbind().click(function (e) {
			e.preventDefault();
			var attachmentName = $(this).closest('.jiraAttachmentLink').find('.attachmentName').text();
			insertAtCursor($('#description')[0], '\n[^' + attachmentName + ']');
		});

		$('.attachmentDelete').unbind().click(function (e) {
			e.preventDefault();
			var domAttachmentLink = $(this).closest('.jiraAttachmentLink');
			var handleId = domAttachmentLink.data('id');
			jira.selectedAttachments = jira.selectedAttachments.filter(function (item) { return item.id != handleId; });
			domAttachmentLink.remove();
		});
	};

	this.render = function (id, field, container) {
		$(container).append('<div class="field-group" id="' + id + '-container">' +
								'	<label for="description"><span class="descr">Attachment</span></label>' +
								'	<div>' +
								'		<div id="' + id + '"><a class="AddAttachmentLink" style="display:block; margin-top: 5px; cursor:pointer;">' + yasoon.i18n('dialog.attachmentAdd') + '</a></div>' +
								'		<div id="' + id + '-selected-container"></div>' +
								'	</div>' +
								'</div>');
		
		if (jira.selectedAttachments.length > 0)
			self.renderAttachments(id);
		
		$('#' + id + '-container').find('.AddAttachmentLink').click(function (e) {
			e.preventDefault();
			yasoon.view.fileChooser.open(function jiraFileChooserCloseHandler(selectedFiles) {
				jira.selectedAttachments = jira.selectedAttachments.concat(selectedFiles);
				self.renderAttachments(id);
			});
		});
	};
}

function TimeTrackingRenderer() {
	this.getValue = function (id) {
		if ($('#' + id + '_originalestimate').length === 0)
			return;

		var origVal = $('#' + id + '_originalestimate').val();
		var remainVal = $('#' + id + '_remainingestimate').val();

		//JIRA timetracking legacy mode
		// --> it's not allowed to set orig and remainaing Estimate during creation
		// --> it's not allowed to change original estimate.
		var result = {};
		//Edit Case
		if (jira.editIssue) {
			if (origVal && jira.editIssue.fields.timetracking.originalEstimate != origVal) {
				result.originalEstimate = origVal;
			}
			if (remainVal && jira.editIssue.fields.timetracking.remainingEstimate != remainVal) {
				result.remainingEstimate = remainVal;
			}
		} else {
			if (origVal) {
				result.originalEstimate = origVal;
			}
			if (remainVal) {
				result.remainingEstimate = remainVal;
			}
		}

		//Only return an object if it's not empty;
		return (Object.keys(result).length > 0) ? result : null;
	};

	this.setValue = function (id, value) {
		if (value) {
			$('#' + id + '_originalestimate').val(value.originalEstimate);
			$('#' + id + '_remainingestimate').val(value.remainingEstimate);
		}
	};

	this.render = function (id, field, container) {
		$(container).append('<div id="' + id + '" data-type="timetracking"></div>');
		$('#' + id).append('<div class="field-group">' +
							'   <label for="' + id + '_originalestimate">' + yasoon.i18n('dialog.timetrackingOriginal') +
							'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
							'   </label>' +
							'	<span style="min-width: 350px; width: 80%;">' +
							'		<input class="text" style="min-width: 350px; width: 60%;" id="' + id + '_originalestimate" name="' + id + '_originalestimate" value="" type="text">' +
							'		<span class="aui-form example">' + yasoon.i18n('dialog.timetrackingExample') + '</span>' +
							'	</span>' +
							'	<div class="description">' + yasoon.i18n('dialog.timetrackingDescrOriginal') + '</div>' +
							'</div>');

		$('#' + id).append('<div class="field-group">' +
							'   <label for="' + id + '_remainingestimate">' + yasoon.i18n('dialog.timetrackingRemaining') +
							'       ' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') +
							'   </label>' +
							'	<span style="min-width: 350px; width: 80%;">' +
							'		<input class="text" style="min-width: 350px; width: 60%;" id="' + id + '_remainingestimate" name="' + id + '_remainingestimate" value="" type="text">' +
							'		<span class="aui-form example">' + yasoon.i18n('dialog.timetrackingExample') + ')</span>' +
							'	</span>' +
							'	<div class="description">' + yasoon.i18n('dialog.timetrackingDescrRemain') + '</div>' +
							'</div>');
	};
}

function EpicLinkRenderer() {
	this.getValue = function (id) {
		//Only for creation as Epic links cannot be changed via REST APi --> Status code 500
		//Ticket: https://jira.atlassian.com/browse/GHS-10333
		//There is a workaround --> update it via unofficial greenhopper API --> For update see handleEvent
		if (!jira.editIssue && $('#'+id).val()) {
			return 'key:' + $('#' + id).val();
		}
	};

	this.setValue = function (id, value) {
		if (value) {
			$('#' + id).val(value).trigger('change');
			$('#' + id).data('value', value);
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group input-field">' +
				'    <label for="issuetype">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				'    <select data-container-class="issuetype-ss" style="min-width: 350px; width: 80%;" class="select input-field" id="' + id + '" name="' + id + '" data-type="com.pyxis.greenhopper.jira:gh-epic-link">' +
				'        <option value="">' + yasoon.i18n('dialog.selectNone') +'</option>' +
				'    </select>' +
				'</div>';

		$(container).append(html);
		
		jiraGet('/rest/greenhopper/1.0/epics?maxResults=100&projectKey=' + jira.selectedProject.key)
		.then(function (data) {
			//{"epicNames":[{"key":"SSP-24","name":"Epic 1"},{"key":"SSP-25","name":"Epic 2"}],"total":2}
			// JIRA 7+: {"epicLists":[{"listDescriptor":"All epics","epicNames":[{"key":"SSP-24","name":"Epic 1","isDone":false},{"key":"SSP-25","name":"Epic 2","isDone":false},{"key":"SSP-28","name":"Epic New","isDone":false}]}],"total":3}
			var epics = JSON.parse(data);
			var result = [];
			var oldValue = $('#' + id).data('value');						
			var elem = $(container).find('#' + id);
			elem.html('<option value="">' + yasoon.i18n('dialog.selectNone') + '</option>');
			
			if (epics && epics.total > 0) {				
				if (epics.epicLists) {
					epics.epicLists.forEach(function(epicList) {
						var optGroup = $('<optgroup label="' + epicList.listDescriptor + '"></optgroup>').appendTo(elem);
						epicList.epicNames.forEach(function (epic) {
							optGroup.append('<option value="' + epic.key + '"> ' + epic.name + ' ( ' + epic.key + ' )</option>');
						});
					});
				}
				else {				
					epics.epicNames.forEach(function (epic) {
						elem.append('<option value="' + epic.key + '"> ' + epic.name + ' ( ' + epic.key + ' )</option>');
					});
				}
			}
			$('#' + id).select2();
			$('#' + id).val(oldValue).trigger('change');
		}).catch(function (e) {
			jira.handleError(e.data, e.statusCode, e.result, e.errorText);
		});
	};

	this.handleEvent = function (type, field, data) {
		var newEpicLink = $('#'+field.key).val();
		if (type === 'save' && jira.editIssue && jira.editIssue.fields[field.key] != newEpicLink) {
			jira.transaction.currentCallCounter++;
			if (newEpicLink) {
				//Create or update
				yasoon.oauth({
					url: jira.settings.baseUrl + '/rest/greenhopper/1.0/epics/' + newEpicLink + '/add',
					oauthServiceName: jira.settings.currentService,
					type: yasoon.ajaxMethod.Put,
					data: '{ "issueKeys":["' + jira.editIssue.key + '"] }',
					headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
					error: submitErrorHandler,
					success: submitSuccessHandler
				});
			} else {
				//Delete
				yasoon.oauth({
					url: jira.settings.baseUrl + '/rest/greenhopper/1.0/epics/remove',
					oauthServiceName: jira.settings.currentService,
					type: yasoon.ajaxMethod.Put,
					data: '{ "issueKeys":["' + jira.editIssue.key + '"] }',
					headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
					error: submitErrorHandler,
					success: submitSuccessHandler
				});
			}
		}
	};
}

function SprintLinkRenderer() {
	this.getValue = function (id) {
		//Bug in JIRA --> Edit is not supported via normal REST api --> See type com.pyxis.greenhopper.jira:gh-epic-link for more information.
		if (!jira.editIssue && $('#' + id).val())
			return $('#' + id).val();
	};

	this.setValue = function (id, value) {
		if (value && value.length > 0) {
			$('#' + id).val(parseSprintId(value[0])).trigger('change');
			$('#' + id).data('value', parseSprintId(value[0]));
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group input-field">' +
				'    <label for="issuetype">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				'    <select data-container-class="issuetype-ss" style="min-width: 350px; width: 80%;" class="select input-field" id="' + id + '" name="' + id + '" data-type="com.pyxis.greenhopper.jira:gh-sprint">' +
				'        <option value="">' + yasoon.i18n('dialog.selectNone') + '</option>' +
				'    </select>' +
				'</div>';

		$(container).append(html);

		jiraGet('/rest/greenhopper/1.0/sprint/picker')
		.then(function (data) {
			//{"suggestions":[{"name":"Sample Sprint 2","id":1,"stateKey":"ACTIVE"}],"allMatches":[]}
			var sprints = JSON.parse(data);
			var result = [];
			var oldValue = $('#' + id).data('value');
			if (sprints && sprints.suggestions.length > 0) {
				$(container).find('#' + id).html('<option value="">' + yasoon.i18n('dialog.selectNone') + '</option>');
				$.each(sprints.suggestions, function (i, sprint) {
					$(container).find('#' + id).append('<option value="' + sprint.id + '"> ' + sprint.name + '</option>');
				});
			}
			$('#' + id).select2();
			$('#' + id).val(oldValue).trigger('change');
		}).catch(function (e) {
			jira.handleError(e.data, e.statusCode, e.result, e.errorText);
		});
	};

	this.handleEvent = function (type, field, data) {
		if (type === 'save' && jira.editIssue) {
			var sprintId = '';
			if (jira.editIssue.fields[field.key])
				sprintId = parseSprintId(jira.editIssue.fields[field.key][0]);

			var newSprintId = $('#' + field.key).val();
			if (sprintId != newSprintId) {
				
				jira.transaction.currentCallCounter++;
				if (newSprintId) {
					yasoon.oauth({
						url: jira.settings.baseUrl + '/rest/greenhopper/1.0/sprint/rank',
						oauthServiceName: jira.settings.currentService,
						type: yasoon.ajaxMethod.Put,
						data: '{"idOrKeys":["' + jira.editIssue.key + '"],"sprintId":' + newSprintId + ',"addToBacklog":false}',
						headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
						error: submitErrorHandler,
						success: submitSuccessHandler
					});
				} else {
					yasoon.oauth({
						url: jira.settings.baseUrl + '/rest/greenhopper/1.0/sprint/rank',
						oauthServiceName: jira.settings.currentService,
						type: yasoon.ajaxMethod.Put,
						data: '{"idOrKeys":["' + jira.editIssue.key + '"],"sprintId":"","addToBacklog":true}',
						headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'nocheck' },
						error: submitErrorHandler,
						success: submitSuccessHandler
					});
				}
			}
		}
	};
}

function TempoAccountRenderer() {
	this.getValue = function (id) {
		if ($('#' + id).val())
			return parseInt($('#' + id).val());        
	};

	this.setValue = function (id, value) {
		if (value && value.length > 0) {
			$('#' + id).val(value).trigger('change');
			$('#' + id).data('value', value);
		}
	};

	this.render = function (id, field, container) {
		var html = '<div class="field-group input-field">' +
				'    <label for="' + id + '">' + field.name + '' + ((field.required) ? '<span class="aui-icon icon-required">Required</span>' : '') + '</label>' +
				'    <select class="select input-field" id="' + id + '" name="' + id + '" style="min-width: 350px; width: 80%;" data-type="com.atlassian.jira.plugin.system.customfieldtypes:select">' +
				'      <option value="">' + yasoon.i18n('dialog.selectNone') + '</option>' +
				'    </select>' +
				'</div>';

		$(container).append(html);
		
		Promise.all([
			jiraGet('/rest/tempo-accounts/1/account'),
			jiraGet('/rest/tempo-accounts/1/account/project/' + jira.selectedProject.id)
		])        
		.spread(function (accountData, projectAccounts) {
			accountData = JSON.parse(accountData);
			projectAccounts = JSON.parse(projectAccounts);
						
			var result = [];
			
			if (projectAccounts && projectAccounts.length > 0) {
				var childs = [];
				
				projectAccounts.forEach(function(projectAcc) {
					childs.push({
						'id': projectAcc.id,
						'text': projectAcc.name
					});
				});
				
				result.push({
					id: 'projectAccounts',
					text: yasoon.i18n('dialog.projectAccounts'),
					children: childs
				});
			}
		   
			if (accountData && accountData.length > 0) {
				accountData = accountData.filter(function(acc) { return acc.global; });
								
				if (accountData.length > 0) {
				
					var accChilds = [];
					
					accountData.forEach(function(projectAcc) {
						accChilds.push({
							'id': projectAcc.id,
							'text': projectAcc.name
						});
					});
					
					result.push({
						id: 'globalAccounts',
						text: yasoon.i18n('dialog.globalAccounts'),
						children: accChilds
					});
				}
			}
			
			$('#' + id).select2({
				data: result 
			});
		});        
	};
}

//Utility Methods
function parseSprintId(input) {
	//Wierd --> it's an array of strings with following structure:  "com.atlassian.greenhopper.service.sprint.Sprint@7292f4[rapidViewId=<null>,state=ACTIVE,name=Sample Sprint 2,startDate=2015-04-09T01:54:26.773+02:00,endDate=2015-04-23T02:14:26.773+02:00,completeDate=<null>,sequence=1,id=1]"
	//First get content of array (everything between [])
	//Then split at ,
	//Then find id
	var result = '';
	var matches = /\[(.+)\]/g.exec(input);
	if (matches.length > 0) {
		var splitResult = matches[1].split(',');
		var idObj = splitResult.filter(function (elem) { return elem.indexOf('id') === 0; });
		if (idObj.length > 0) {
			result = idObj[0].split('=')[1];
		}
	}
	return result;
}

function formatIcon(element) {
	if (!element.id) return element.text; // optgroup
	var icon = $(element.element).data('icon');
	if (icon)
		return $('<span><img style="margin-right:3px; width: 16px;" src="' + icon + '"/>' + element.text + '</span>');
	else {
		icon = $(element.element).data('iconclass');
		if (icon) {
			return $('<span><i style="margin-right:3px; float:left;" class="' + icon + '"></i><span>' + element.text + '</span></span>');
		} else {
			return element.text;
		}
	}
}

function formatUser(user) {
	if (!user)
		return '';

	if (user.icon === 'ownUser') {
		return $('<span><i style="margin-right:3px; width: 16px;" class="fa fa-user" />' + user.text +'</span>');
	} else if (user.icon === 'emailSender') {
		return $('<span><i style="margin-right:3px; width: 16px;" class="fa fa-envelope" />' + user.text + '</span>');
	} else {
		return user.text;
	}
}

function insertAtCursor(myField, myValue) {
	var startPos = myField.selectionStart;
	var endPos = myField.selectionEnd;
	if (startPos > 0)
		myValue = '\n' + myValue;

	myField.value = myField.value.substring(0, startPos) +
		myValue +
		myField.value.substring(endPos, myField.value.length);

}

var timeoutSearchUser = null;
function searchUser(mode, query, callback) {
	//First try to get an issue key ... if it doesn't exist, get project.
	var selectedIssueKey = $('#issue').data('key');
	var selectedProjectKey = null;
	if (!selectedIssueKey) {
		selectedProjectKey = $('#project').data('key') || ((jira.selectedProject) ? jira.selectedProject.key : null);
	}
	if (selectedIssueKey || selectedProjectKey) {
		var queryKey = (selectedIssueKey) ? 'issueKey=' + selectedIssueKey : 'projectKey=' + selectedProjectKey;
		jiraGet('/rest/api/2/user/viewissue/search?' + queryKey + '&maxResults=10&username=' + query)
		.then(function (users) {
			var data = [];
			users = JSON.parse(users);
			users.forEach(function (user) {
				data.push({ id: user.name, name: user.displayName, type: 'user' });
			});
			callback(data);
		});
	} else {
		//Show alert
		$('.mentions-input-box + .mentions-help-text').slideDown();
		if (timeoutSearchUser) {
			clearTimeout(timeoutSearchUser);
		}
		timeoutSearchUser = setTimeout(function () { $('.mentions-input-box + .mentions-help-text').slideUp(); }, 2000);
		callback([]);
	}
}

// Custom Data Provider for SELECT2  User retrieval
$.fn.select2.amd.require(['select2/data/select', 'select2/utils','select2/selection/allowClear'],
function (select, Utils, allowClear) {

	// User Data Retrieval
	function CustomUserData($element, options) {
		CustomUserData.__super__.constructor.call(this, $element, options);
	}
	Utils.Extend(CustomUserData, select);

	CustomUserData.prototype.current = function (callback) {
		var data = [];
		var self = this;

		this.$element.find(':selected').each(function () {
			var $option = $(this);

			var option = self.item($option);

			data.push(option);
		});

		if (data.length === 0) {
			if (this.$element.data('id')) {
				var user = {
					id: this.$element.data('id'),
					text: this.$element.data('text'),
					icon: this.$element.data('icon'),
					selected: true
				};
				data.push(user);
			}
		}
		callback(data);
	};

	CustomUserData.prototype.select = function (data) {
		var self = this;

		data.selected = true;

		// If data.element is a DOM node, use it instead
		if ($(data.element).is('option')) {
			data.element.selected = true;

			this.$element.trigger('change');

			return;
		}

		if (this.$element.prop('multiple')) {
			this.current(function (currentData) {
				var val = [];

				data = [data];
				data.push.apply(data, currentData);

				for (var d = 0; d < data.length; d++) {
					var id = data[d].id;

					if ($.inArray(id, val) === -1) {
						val.push(id);
					}
				}

				self.$element.val(val);
				self.$element.trigger('change');
			});
		} else {
			var val = data.id;
			this.$element
				.data('id', data.id)
				.data('text', data.text)
				.data('icon', data.icon || '');

			this.$element.val(val);
			this.$element.trigger('change');
		}
	};

	CustomUserData.prototype.query = function (params, callback) {
		var id = this.$element.attr('id');
		if (params && params.term) {
			//Get all Users
			var url = jira.settings.baseUrl + '/rest/api/2/user/picker?query=' + params.term + '&maxResults=50';
			if (id === 'assignee') {
				//Only get assignable users
				url = jira.settings.baseUrl + '/rest/api/2/user/assignable/search?project=' + jira.selectedProject.key + '&username=' + params.term + '&maxResults=50';
			}
			yasoon.oauth({
				url: url,
				oauthServiceName: jira.settings.currentService,
				headers: jira.CONST_HEADER,
				type: yasoon.ajaxMethod.Get,
				error: function () {
					jira.handleError.apply(this, arguments);
					callback([]);
				},
				success: function (data) {
					var users = JSON.parse(data);
					console.log('Query for ' + id + ', Term: ' + params.term, users);
					//Transform Data
					var result = [];
					if (users && users.users && users.users.length > 0) {
						$.each(users.users, function (i, user) {
							result.push({
								id: user.name,
								text: user.displayName
							});
						});
					} else if (users && users.length > 0) {
						$.each(users, function (i, user) {
							result.push({
								id: user.name,
								text: user.displayName
							});
						});
					}
					if (id === 'assignee') {
						jira.assigneeCommonValues.results[1].children = result;
						callback(jira.assigneeCommonValues);
					} else {
						jira.userCommonValues.results[1].children = result;
						callback(jira.userCommonValues);
					}


				}
			});
		} else {
			jira.userCommonValues.results[1].children = [];
			callback(jira.userCommonValues);
		}
	};

	jiraFields.CustomUserDataSet = CustomUserData;
});


//Register Components for each supported type
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:textfield', new SingleTextRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:url', new SingleTextRenderer());
UIRenderer.register('com.pyxis.greenhopper.jira:gh-epic-label', new SingleTextRenderer());
UIRenderer.register('summary', new SingleTextRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:textarea', new MultilineTextRenderer());
UIRenderer.register('description', new MultilineTextRenderer());
UIRenderer.register('environment', new MultilineTextRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes', new CheckboxRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons', new RadioButtonRenderer());
UIRenderer.register('duedate', new DateRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:datepicker', new DateRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:datetime', new DateTimeRenderer());
UIRenderer.register('labels', new LabelRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:labels', new LabelRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:float', new NumberRenderer());
UIRenderer.register('priority', new SelectListRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:select', new SelectListRenderer());
UIRenderer.register('components', new MultiSelectListRenderer());
UIRenderer.register('fixVersions', new VersionMultiSelectListRenderer());
UIRenderer.register('versions', new VersionMultiSelectListRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:multiselect', new MultiSelectListRenderer());
UIRenderer.register('reporter', new UserPickerRenderer());
UIRenderer.register('assignee', new UserPickerRenderer());
UIRenderer.register('com.atlassian.jira.plugin.system.customfieldtypes:userpicker', new UserPickerRenderer());
UIRenderer.register('attachment', new AttachmentLinkRenderer());
UIRenderer.register('timetracking', new TimeTrackingRenderer());
UIRenderer.register('com.pyxis.greenhopper.jira:gh-epic-link', new EpicLinkRenderer());
UIRenderer.register('com.pyxis.greenhopper.jira:gh-sprint', new SprintLinkRenderer());
UIRenderer.register('com.tempoplugin.tempo-accounts:accounts.customfield', new TempoAccountRenderer());

//@ sourceURL=http://Jira/Dialog/jiraFieldRenderer.js