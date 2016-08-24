(function() {
  var template = Handlebars.template, templates = jira.templates = jira.templates || {};
templates['addWorklog'] = template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", helper, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;


  buffer += "<div class=\"modal fade\" id=\"jiraAddWorklog\" tabindex=\"-1\" style=\"top:5%;\" role=\"dialog\" data-backdrop=\"static\" data-app-namespace=\"com.yasoon.jira\">\r\n	<div class=\"modal-dialog\" role=\"document\" style=\"width:900px; height: 90%;max-height: 630px;\">\r\n		<div class=\"modal-content\" style=\"width:900px; height: 100%;\">\r\n			<div class=\"modal-header\">\r\n				<button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-label=\"Close\">\r\n					<span aria-hidden=\"true\">&times;</span>\r\n				</button>\r\n				<h4 class=\"modal-title\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.title", options) : helperMissing.call(depth0, "i18n", "logWork.title", options)))
    + "</h4>\r\n			</div>\r\n			<div class=\"modal-body\" style=\"max-height: 500px; width: 897px; overflow-y: auto;\">\r\n				<form class=\"form-horizontal\">\r\n				  <div class=\"form-group\">\r\n					<label for=\"jiraInputTimeSpent\" class=\"col-sm-3 control-label\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.timeSpent", options) : helperMissing.call(depth0, "i18n", "logWork.timeSpent", options)))
    + "<span style=\"color:red;\">*</span></label>\r\n					<div class=\"col-sm-9\">\r\n						<div><input type=\"text\" class=\"form-control\" id=\"jiraInputTimeSpent\" style=\"width: 150px; display:inline;\"/> "
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.timeSpentExample", options) : helperMissing.call(depth0, "i18n", "logWork.timeSpentExample", options)))
    + "</div>\r\n						<small>"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.timeSpentDescription", options) : helperMissing.call(depth0, "i18n", "logWork.timeSpentDescription", options)))
    + "</small>\r\n					</div>\r\n				  </div>\r\n				  <div class=\"form-group\">\r\n					<label for=\"jiraInputDateStarted\" class=\"col-sm-3 control-label\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.dateStarted", options) : helperMissing.call(depth0, "i18n", "logWork.dateStarted", options)))
    + "<span style=\"color:red;\">*</span></label>\r\n					<div class=\"col-sm-9\">\r\n					  <input type=\"text\" class=\"form-control\" id=\"jiraInputDateStarted\" style=\"width: 150px;\" />\r\n					</div>\r\n				  </div>\r\n				  <div class=\"form-group\">\r\n					<label for=\"inputRemainingEstimate\" class=\"col-sm-3 control-label\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.remainingEstimate", options) : helperMissing.call(depth0, "i18n", "logWork.remainingEstimate", options)))
    + "</label>\r\n					<div class=\"col-sm-9\">\r\n						<div class=\"radio awesome\">\r\n							<input type=\"radio\" name=\"jiraOptionsRadios\" id=\"jiraRemainingEstimateAuto\" value=\"auto\" checked=\"checked\" />\r\n							<label for=\"jiraRemainingEstimateAuto\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.adjustAutomatically", options) : helperMissing.call(depth0, "i18n", "logWork.adjustAutomatically", options)))
    + "</label>\r\n						</div>\r\n						<div class=\"radio awesome\">\r\n							<input type=\"radio\" name=\"jiraOptionsRadios\" id=\"jiraRemainingEstimateAsIs\" value=\"leave\" />\r\n							<label for=\"jiraRemainingEstimateAsIs\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.leaveEstimateUnset", options) : helperMissing.call(depth0, "i18n", "logWork.leaveEstimateUnset", options)))
    + "</label>\r\n						</div>\r\n						<div class=\"radio awesome\">\r\n							<input type=\"radio\" name=\"jiraOptionsRadios\" id=\"jiraRemainingEstimateSet\" value=\"new\" />\r\n							<label for=\"jiraRemainingEstimateSet\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.setTo", options) : helperMissing.call(depth0, "i18n", "logWork.setTo", options)))
    + ": <input type=\"text\" id=\"jiraRemainingEstimateSetInput\" class=\"form-control\" style=\"width: 100px; display:inline;\" disabled=\"disabled\" /></label>\r\n						</div>\r\n						<div class=\"radio awesome\">\r\n							<input type=\"radio\" name=\"jiraOptionsRadios\" id=\"jiraRemainingEstimateReduce\" value=\"manual\" />\r\n							<label for=\"jiraRemainingEstimateReduce\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.reduceBy", options) : helperMissing.call(depth0, "i18n", "logWork.reduceBy", options)))
    + ": <input type=\"text\" id=\"jiraRemainingEstimateReduceInput\" class=\"form-control\" style=\"width: 100px; display:inline;\" disabled=\"disabled\" /></label>\r\n						</div>\r\n					</div>\r\n				  </div>\r\n				  <div class=\"form-group\">\r\n					<label for=\"jiraInputComment\" class=\"col-sm-3 control-label\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.workDescription", options) : helperMissing.call(depth0, "i18n", "logWork.workDescription", options)))
    + "</label>\r\n					<div class=\"col-sm-9\">\r\n						<textarea id=\"jiraInputComment\" class=\"form-control\" style=\"width: 450px; height: 150px;\"></textarea>\r\n					</div>\r\n				  </div>\r\n				</form>\r\n			</div>\r\n			<div class=\"modal-footer\" style=\"margin-top: 0px;\">\r\n				<button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.close", options) : helperMissing.call(depth0, "i18n", "logWork.close", options)))
    + "</button>\r\n				<button id=\"LogWorkSave\" type=\"button\" class=\"btn btn-primary\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "logWork.add", options) : helperMissing.call(depth0, "i18n", "logWork.add", options)))
    + "</button>\r\n			</div>\r\n		</div>\r\n	</div>\r\n</div>";
  return buffer;
  });
})();