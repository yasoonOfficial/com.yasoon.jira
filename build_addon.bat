node build_onpremise.js
node build_cloud.js

robocopy addon\distribution\cloud ..\yasoonNodeBackend\assets\jira /S 

cd addon\distribution\onpremise
atlas-package