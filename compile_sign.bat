@echo off
set /p version="Enter Version (e.g. 1.3.0): "

CMD /C tsc
CMD /C handlebars com.yasoon.jira\templates\addWorklog.handlebars -f com.yasoon.jira\templates\addWorklog.hbs.js --namespace=jira.templates
CMD /C handlebars com.yasoon.jira\templates\attachmentFields.handlebars -f com.yasoon.jira\templates\attachmentFields.hbs.js --namespace=jira.templates
CMD /C handlebars com.yasoon.jira\templates\attachmentLink.handlebars -f com.yasoon.jira\templates\attachmentLink.hbs.js --namespace=jira.templates
CMD /C handlebars com.yasoon.jira\templates\settings.handlebars -f com.yasoon.jira\templates\settings.hbs.js --namespace=jira.templates

..\yasoonFrontendRedesign\yasoonBase\distTools\7z a com.yasoon.jira-%version%.zip com.yasoon.jira\ -xr!*.ts

openssl dgst -sha256 com.yasoon.jira-%version%.zip > com.yasoon.jira-%version%.zip.hash
openssl rsautl -sign -inkey ..\yasoonFrontendRedesign\yasoonBase\yasoonBase\yasoonfixed.pfx -keyform pkcs12 -passin pass:%SSL_PW% -in com.yasoon.jira-%version%.zip.hash > com.yasoon.jira-%version%.zip.sig

del com.yasoon.jira-%version%.zip.hash