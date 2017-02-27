@echo off
set /p version="Enter Version (e.g. 1.3.0): "

rmdir distribution /s /q
CMD /C node build.js

..\yasoonFrontendRedesign\yasoonBase\distTools\7z a com.yasoon.jira-%version%.zip .\distribution\*

openssl dgst -sha256 -binary com.yasoon.jira-%version%.zip > com.yasoon.jira-%version%.zip.hash
openssl rsautl -sign -inkey ..\yasoonFrontendRedesign\yasoonBase\yasoonBase\yasoonfixed.pfx -keyform pkcs12 -passin pass:%SSL_PW% -in com.yasoon.jira-%version%.zip.hash > com.yasoon.jira-%version%.zip.sig

del com.yasoon.jira-%version%.zip.hash