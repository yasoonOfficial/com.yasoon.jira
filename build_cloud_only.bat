node build_cloud.js

robocopy addon\distribution ..\yasoonNodeBackend\assets\jira /S 
cd ..
cd yasoonNodeBackend
grunt sync
