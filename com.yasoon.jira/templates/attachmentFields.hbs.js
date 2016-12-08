(function() {
  var template = Handlebars.template, templates = jira.templates = jira.templates || {};
templates['attachmentFields'] = template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, helper, options, self=this, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\r\n				";
  stack1 = self.invokePartial(partials.attachmentLink, 'attachmentLink', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n			";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\r\n					";
  stack1 = self.invokePartial(partials.attachmentLink, 'attachmentLink', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n				";
  return buffer;
  }

  buffer += "<div class=\"field-group\" id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "-container\">\r\n	<label for=\"description\">\r\n		<span class=\"descr\">";
  if (helper = helpers.label) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.label); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span>\r\n	</label>\r\n	<div>\r\n		<div id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "-selected-container\" style=\"position:relative;\">\r\n			";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.attachments), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n			<hr style=\"margin-top: 10px; margin-bottom: 0px;\">\r\n			<div id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "-blacklisted\" class=\"attachments-blacklisted\">\r\n				";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.blacklistedAttachments), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n			</div>\r\n		</div>\r\n		<div id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "-link\" class=\"attachment-bottom-actions\">\r\n			<a class=\"show-blacklisted-attachments-old\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "dialog.showBlacklistedAttachments", options) : helperMissing.call(depth0, "i18n", "dialog.showBlacklistedAttachments", options)))
    + " (<span id=\"blacklistedAttachmentCount\">3</span>)</a>\r\n			<a class=\"hide-blacklisted-attachments-old\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "dialog.hideBlacklistedAttachments", options) : helperMissing.call(depth0, "i18n", "dialog.hideBlacklistedAttachments", options)))
    + " </a>			\r\n			<a class=\"addAttachmentLink\">"
    + escapeExpression((helper = helpers.i18n || (depth0 && depth0.i18n),options={hash:{},data:data},helper ? helper.call(depth0, "dialog.attachmentAdd", options) : helperMissing.call(depth0, "i18n", "dialog.attachmentAdd", options)))
    + "</a>\r\n		</div>\r\n	</div>\r\n</div>";
  return buffer;
  });
})();