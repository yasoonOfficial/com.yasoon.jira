(function() {
  var template = Handlebars.template, templates = jira.templates = jira.templates || {};
templates['settings'] = template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\r\n<p>"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.headingLogin", options) : helperMissing.call(depth0, "i18n", "settings.headingLogin", options)))
    + "</p>\r\n<form class=\"form-horizontal\" role=\"form\">\r\n	<!-- Instance Selection -->\r\n	<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n		<div class=\"col-sm-4 checkbox\">\r\n			<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.selectSystem", options) : helperMissing.call(depth0, "i18n", "settings.selectSystem", options)))
    + "</b>\r\n		</div>\r\n		<div class=\"col-sm-8\">\r\n			<select id=\"currentService\" class=\"form-control\">\r\n				";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.oAuthServices), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n			</select>\r\n		</div>\r\n	</div>\r\n\r\n	<div class=\"form-group\" style=\"position:relative;margin-top:20px;\">\r\n		<div class=\"col-sm-4\">\r\n			<button class=\"btn btn-primary\" id=\"jiraLogin\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.loginButton", options) : helperMissing.call(depth0, "i18n", "settings.loginButton", options)))
    + "</button>\r\n		</div>\r\n	</div>\r\n	<div>"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.systemMissing", options) : helperMissing.call(depth0, "i18n", "settings.systemMissing", options)))
    + " <button id=\"jiraReloadOAuth\" class=\"btn btn-link\" style=\"padding-top: 4px; margin-left: -10px;\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.reloadSystems", options) : helperMissing.call(depth0, "i18n", "settings.reloadSystems", options)))
    + "</button></div>\r\n</form>\r\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\r\n				<option value=\"";
  if (helper = helpers.serviceName) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.serviceName); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.mainservice), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</option>\r\n				";
  return buffer;
  }
function program3(depth0,data) {
  
  
  return " selected ";
  }

function program5(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\r\n<p>"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.headingChooseSettings", options) : helperMissing.call(depth0, "i18n", "settings.headingChooseSettings", options)))
    + "</p>\r\n<form class=\"form-horizontal\" role=\"form\">\r\n		<!-- Logout -->\r\n	<div class=\"form-group\" style=\"position:relative;margin-top:20px;\">\r\n		<div class=\"col-sm-4\">\r\n			<button class=\"btn btn-default\" id=\"jiraLogout\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.logoutButton", options) : helperMissing.call(depth0, "i18n", "settings.logoutButton", options)))
    + "</button>\r\n		</div>\r\n	</div>\r\n	<div class=\"panel-group\" id=\"accordion\" role=\"tablist\" aria-multiselectable=\"true\">\r\n		<div class=\"panel panel-default\">\r\n			<div class=\"panel-heading\" role=\"tab\" id=\"headingOne\">\r\n				<h4 class=\"panel-title\">\r\n					<a role=\"button\" data-toggle=\"collapse\"  href=\"#collapseOne\" aria-expanded=\"false\" aria-controls=\"collapseOne\">\r\n						"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.general", options) : helperMissing.call(depth0, "i18n", "settings.general", options)))
    + "\r\n					</a>\r\n				</h4>\r\n			</div>\r\n			<div id=\"collapseOne\" class=\"panel-collapse collapse\" role=\"tabpanel\" aria-labelledby=\"headingOne\">\r\n				<div class=\"panel-body\">\r\n					<!--Desktop Notification -->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.showDesktopNotif", options) : helperMissing.call(depth0, "i18n", "settings.showDesktopNotif", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"showDesktopNotif\" name=\"showDesktopNotif\">\r\n								<label for=\"showDesktopNotif\"></label>\r\n							</div>\r\n						</div>\r\n					</div>\r\n				</div>\r\n			</div>\r\n		</div>\r\n\r\n		<div class=\"panel panel-default\">\r\n			<div class=\"panel-heading\" role=\"tab\" id=\"headingTwo\">\r\n				<h4 class=\"panel-title\">\r\n					<a role=\"button\" data-toggle=\"collapse\" href=\"#collapseTwo\" aria-expanded=\"false\" aria-controls=\"collapseTwo\">\r\n						"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.dialogs", options) : helperMissing.call(depth0, "i18n", "settings.dialogs", options)))
    + "\r\n					</a>\r\n				</h4>\r\n			</div>\r\n			<div id=\"collapseTwo\" class=\"panel-collapse collapse\" role=\"tabpanel\" aria-labelledby=\"headingTwo\">\r\n				<div class=\"panel-body\">\r\n					<!--Auto Add Attachments-->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.addAttachmentsOnNewAddIssue", options) : helperMissing.call(depth0, "i18n", "settings.addAttachmentsOnNewAddIssue", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"addAttachmentsOnNewAddIssue\" name=\"addAttachmentsOnNewAddIssue\">\r\n								<label for=\"addAttachmentsOnNewAddIssue\"></label>\r\n							</div>\r\n						</div>\r\n					</div>\r\n					<!--Auto add emails-->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.addEmailOnNewAddIssue", options) : helperMissing.call(depth0, "i18n", "settings.addEmailOnNewAddIssue", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"addEmailOnNewAddIssue\" name=\"addEmailOnNewAddIssue\">\r\n								<label for=\"addEmailOnNewAddIssue\">\r\n								</label>\r\n							</div>\r\n						</div>\r\n					</div>\r\n					<!--Auto Add Mail Header -->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.addMailHeaderAutomatically", options) : helperMissing.call(depth0, "i18n", "settings.addMailHeaderAutomatically", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<select class=\"formValue\" style=\"width: 140px\" id=\"addMailHeaderAutomatically\" name=\"addMailHeaderAutomatically\">\r\n								<option value=\"off\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.optionDisabled", options) : helperMissing.call(depth0, "i18n", "settings.optionDisabled", options)))
    + "</option>\r\n								<option value=\"top\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.optionTop", options) : helperMissing.call(depth0, "i18n", "settings.optionTop", options)))
    + "</option>\r\n								<option value=\"bottom\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.optionBottom", options) : helperMissing.call(depth0, "i18n", "settings.optionBottom", options)))
    + "</option>\r\n							</select>\r\n						</div>\r\n					</div>\r\n					<!-- User Config -->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.enableUserConfig", options) : helperMissing.call(depth0, "i18n", "settings.enableUserConfig", options)))
    + " </b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"newCreationScreen\" name=\"newCreationScreen\">\r\n								<label for=\"newCreationScreen\"></label>\r\n							</div>\r\n						</div>\r\n					</div>\r\n\r\n					<!-- Hide Resolved issues -->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.hideResolvedIssues", options) : helperMissing.call(depth0, "i18n", "settings.hideResolvedIssues", options)))
    + " </b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"hideResolvedIssues\" name=\"hideResolvedIssues\">\r\n								<label for=\"hideResolvedIssues\"></label>\r\n							</div>\r\n						</div>\r\n					</div>\r\n				</div>\r\n			</div>\r\n		</div>\r\n\r\n		<div class=\"panel panel-default\">\r\n			<div class=\"panel-heading\" role=\"tab\" id=\"headingThree\">\r\n				<h4 class=\"panel-title\">\r\n					<a role=\"button\" data-toggle=\"collapse\" href=\"#collapseThree\" aria-expanded=\"false\" aria-controls=\"collapseThree\">\r\n						"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.feed", options) : helperMissing.call(depth0, "i18n", "settings.feed", options)))
    + "\r\n					</a>\r\n				</h4>\r\n			</div>\r\n			<div id=\"collapseThree\" class=\"panel-collapse collapse\" role=\"tabpanel\" aria-labelledby=\"headingThree\">\r\n				<div class=\"panel-body\">\r\n					<!-- Sync Feed -->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncFeed", options) : helperMissing.call(depth0, "i18n", "settings.syncFeed", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<select class=\"formValue\" style=\"width: 200px\" id=\"syncFeed\" name=\"syncFeed\">\r\n								<option value=\"auto\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncFeedAuto", options) : helperMissing.call(depth0, "i18n", "settings.syncFeedAuto", options)))
    + "</option>\r\n								<option value=\"manual\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncFeedManual", options) : helperMissing.call(depth0, "i18n", "settings.syncFeedManual", options)))
    + "</option>\r\n								<option value=\"off\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncFeedOff", options) : helperMissing.call(depth0, "i18n", "settings.syncFeedOff", options)))
    + "</option>\r\n							</select>\r\n						</div>\r\n					</div>\r\n					<!-- Sync Options -->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.showFeedIf", options) : helperMissing.call(depth0, "i18n", "settings.showFeedIf", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"showFeedAssignee\" name=\"showFeedAssignee\" checked>\r\n								<label for=\"showFeedAssignee\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncAssignee", options) : helperMissing.call(depth0, "i18n", "settings.syncAssignee", options)))
    + "</label>\r\n							</div>\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"showFeedMentioned\" name=\"showFeedMentioned\" checked>\r\n								<label for=\"showFeedMentioned\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncMention", options) : helperMissing.call(depth0, "i18n", "settings.syncMention", options)))
    + "</label>\r\n							</div>\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"showFeedWatcher\" name=\"showFeedWatcher\">\r\n								<label for=\"showFeedWatcher\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncWatch", options) : helperMissing.call(depth0, "i18n", "settings.syncWatch", options)))
    + "</label>\r\n							</div>\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"showFeedProjectLead\" name=\"showFeedProjectLead\">\r\n								<label for=\"showFeedProjectLead\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncProjectLead", options) : helperMissing.call(depth0, "i18n", "settings.syncProjectLead", options)))
    + "</label>\r\n							</div>\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"showFeedReporter\" name=\"showFeedReporter\">\r\n								<label for=\"showFeedReporter\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncReporter", options) : helperMissing.call(depth0, "i18n", "settings.syncReporter", options)))
    + "</label>\r\n							</div>\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"showFeedCreator\" name=\"showFeedCreator\">\r\n								<label for=\"showFeedCreator\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncCreator", options) : helperMissing.call(depth0, "i18n", "settings.syncCreator", options)))
    + "</label>\r\n							</div>\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"showFeedComment\" name=\"showFeedComment\">\r\n								<label for=\"showFeedComment\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncComment", options) : helperMissing.call(depth0, "i18n", "settings.syncComment", options)))
    + "</label>\r\n							</div>\r\n						</div>\r\n					</div>\r\n					<!-- Filters -->\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.configureFilter", options) : helperMissing.call(depth0, "i18n", "settings.configureFilter", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<select multiple id=\"activeFilters\" class=\"formValue\">\r\n								";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.filters), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n							</select>\r\n						</div>\r\n					</div>\r\n				</div>\r\n			</div>\r\n		</div>\r\n		";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.taskSyncEnabled), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n	</div>\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n	<!-- Calendar Integration -->\r\n	<!--\r\n	<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n		<div class=\"col-sm-4 checkbox\">\r\n			<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.calendarIntegration", options) : helperMissing.call(depth0, "i18n", "settings.calendarIntegration", options)))
    + "</b>\r\n		</div>\r\n	<div class=\"col-sm-8\">\r\n			 <label>\r\n				 <input class=\"formValue\" type=\"checkbox\" id=\"syncCalendar\" name=\"syncCalendar\" />\r\n			</label>\r\n		</div>\r\n	</div>\r\n		-->\r\n\r\n</form>\r\n\r\n";
  return buffer;
  }
function program6(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\r\n								<option value=\"";
  if (helper = helpers.key) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.key); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.selected), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</option>\r\n								";
  return buffer;
  }
function program7(depth0,data) {
  
  
  return "selected";
  }

function program9(depth0,data) {
  
  var buffer = "", helper, options;
  buffer += "\r\n		<div class=\"panel panel-default\">\r\n			<div class=\"panel-heading\" role=\"tab\" id=\"headingFour\">\r\n				<h4 class=\"panel-title\">\r\n					<a role=\"button\" data-toggle=\"collapse\" href=\"#collapseFour\" aria-expanded=\"false\" aria-controls=\"collapseFour\">\r\n						"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.headingSyncTasks", options) : helperMissing.call(depth0, "i18n", "settings.headingSyncTasks", options)))
    + "\r\n					</a>\r\n				</h4>\r\n			</div>\r\n			<div id=\"collapseFour\" class=\"panel-collapse collapse\" role=\"tabpanel\" aria-labelledby=\"headingFour\">\r\n				<div class=\"panel-body\">\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.syncTasks", options) : helperMissing.call(depth0, "i18n", "settings.syncTasks", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"syncTask\" name=\"syncTask\">\r\n								<label for=\"syncTask\"></label>\r\n							</div>\r\n						</div>\r\n					</div>\r\n					<div class=\"form-group\" style=\"position:relative; margin-top:20px;\">\r\n						<div class=\"col-sm-4 checkbox\">\r\n							<b class=\"pull-right\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "settings.deleteCompletedTasks", options) : helperMissing.call(depth0, "i18n", "settings.deleteCompletedTasks", options)))
    + "</b>\r\n						</div>\r\n						<div class=\"col-sm-8\">\r\n							<div class=\"checkbox awesome\">\r\n								<input class=\"formValue\" type=\"checkbox\" id=\"deleteCompletedTasks\" name=\"deleteCompletedTasks\">\r\n								<label for=\"deleteCompletedTasks\"></label>\r\n							</div>\r\n						</div>\r\n					</div>\r\n				</div>\r\n			</div>\r\n		</div>\r\n		";
  return buffer;
  }

  stack1 = helpers.unless.call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n\r\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  });
})();