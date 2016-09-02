(function() {
  var template = Handlebars.template, templates = jira.templates = jira.templates || {};
templates['attachmentLink'] = template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, functionType="function", self=this;

function program1(depth0,data) {
  
  
  return "checked";
  }

function program3(depth0,data) {
  
  var buffer = "", helper, options;
  buffer += "\r\n                    <li class=\"attachmentAddToBlacklist\">\r\n                        <a>"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "dialog.attachmentAddToBlacklist", options) : helperMissing.call(depth0, "i18n", "dialog.attachmentAddToBlacklist", options)))
    + "</a>\r\n                    </li>\r\n                    ";
  return buffer;
  }

  buffer += "<div class=\"jiraAttachmentLink\" data-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\r\n    <div class=\"attachmentCheckbox checkbox awesome pull-left\">\r\n        <input class=\"formValue\" type=\"checkbox\" id=\"attachment-";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" name=\"attachment-";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.selected), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\r\n        <label for=\"attachment-";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"></label>\r\n    </div>\r\n    <div class=\"attachmentIcon\">\r\n        <img src=\"";
  if (helper = helpers.fileIcon) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.fileIcon); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" />\r\n    </div>\r\n    <div class=\"attachmentMain\">\r\n        <div class=\"attachmentName\">\r\n            <span class=\"attachmentNameValue\">\r\n                ";
  if (helper = helpers.fileName) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.fileName); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\r\n            </span>\r\n            <div class=\"attachmentMoreDropup dropdown\">\r\n                <span class=\"attachmentMore dropdown-toggle\" data-toggle=\"dropdown\" title=\""
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "dialog.attachmentLinkTitle", options) : helperMissing.call(depth0, "i18n", "dialog.attachmentLinkTitle", options)))
    + "\">\r\n                    <span class=\"attachmentMoreIcons\">\r\n                        <i class=\"fa fa-circle-o\" />\r\n                        <i class=\"fa fa-circle-o\" />\r\n                        <i class=\"fa fa-circle-o\" />\r\n                    </span>&nbsp;\r\n                </span>\r\n                <ul class=\"dropdown-menu\" style=\"cursor:pointer;\">\r\n                    <li class=\"attachmentRename\">\r\n                        <a>"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "dialog.attachmentRename", options) : helperMissing.call(depth0, "i18n", "dialog.attachmentRename", options)))
    + "</a>\r\n                    </li>\r\n                    <li class=\"attachmentAddRef\">\r\n                        <a>"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "dialog.attachmentReference", options) : helperMissing.call(depth0, "i18n", "dialog.attachmentReference", options)))
    + "</a>\r\n                    </li>\r\n                    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.selected), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n                </ul>\r\n            </div>\r\n        </div>\r\n        <div class=\"attachmentNewName\">\r\n            <div class=\"input-group\">\r\n                <input class=\"text input-sm form-control\" value=\"";
  if (helper = helpers.fileNameNoExtension) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.fileNameNoExtension); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"/>\r\n                <div class=\"input-group-addon\">";
  if (helper = helpers.extension) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.extension); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</div>\r\n            </div>\r\n            <div class=\"attachmentRenameActions\">\r\n                <i class=\"fa fa-check attachmentRenameConfirm\" />\r\n                <i class=\"fa fa-times attachmentRenameCancel\" />\r\n            </div>\r\n        </div>\r\n    </div>    \r\n</div>";
  return buffer;
  });
})();