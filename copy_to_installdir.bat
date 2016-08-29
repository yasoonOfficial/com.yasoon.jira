CMD /C handlebars com.yasoon.jira\templates\addWorklog.handlebars -f com.yasoon.jira\templates\addWorklog.hbs.js --namespace=jira.templates
CMD /C handlebars com.yasoon.jira\templates\attachmentFields.handlebars -f com.yasoon.jira\templates\attachmentFields.hbs.js --namespace=jira.templates
CMD /C handlebars com.yasoon.jira\templates\settings.handlebars -f com.yasoon.jira\templates\settings.hbs.js --namespace=jira.templates

robocopy . %localappdata%\yasoon\apps /S /XF copy_to_installdir.bat LICENSE README.md .gitignore certs.txt com.yasoon.jira.json /XD node_modules .git com.yasoon.jira.cloud com.yasoon.jira.onpremise