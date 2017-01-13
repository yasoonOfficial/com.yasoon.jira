node build_onpremise.js
node build_cloud.js

robocopy addon\cloud ..\yasoonNodeBackend\assets\jira /S 

cd addon\onpremise
atlas-package