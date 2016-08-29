if (!yasoon.app) {  yasoon.app = {load: function(appNamespace,appObject) { native function load();return load(appNamespace,appObject);},initI18n: function() { native function initI18n();return new Promise(function(resolve, reject) {initI18n(resolve, reject);});},get: function(appNamespace) { native function get();return get(appNamespace);},enterContext: function(appNamespace) { native function enterContext();return enterContext(appNamespace);},leaveContext: function(token) { native function leaveContext();return leaveContext(token);},install: function(app,successCbk,errorCbk) { native function install();return install(app,successCbk,errorCbk);},download: function(app,successCbk,errorCbk) { native function download();return download(app,successCbk,errorCbk);},update: function(appNamespace,jsonPath,callback) { native function update();return update(appNamespace,jsonPath,callback);},all: function() { native function all();return all();},reportLoadError: function(error) { native function reportLoadError();return reportLoadError(error);},callFunctionName: function(nameSpace,method,parameters) { native function callFunctionName();return callFunctionName(nameSpace,method,parameters);},callFunction: function(nameSpace,method) { native function callFunction();return callFunction(nameSpace,method);},getOAuthUrlAsync: function(appNamespace,serviceName,urlCallback,successCallback,errorCallback) { native function getOAuthUrlAsync();return getOAuthUrlAsync(appNamespace,serviceName,urlCallback,successCallback,errorCallback);},hasValidOAuthToken: function(appNamespace,serviceName) { native function hasValidOAuthToken();return hasValidOAuthToken(appNamespace,serviceName);},isOAuthed: function(serviceName) { native function isOAuthed();return isOAuthed(serviceName);},invalidateAppOAuthToken: function(appNamespace,serviceName) { native function invalidateAppOAuthToken();return invalidateAppOAuthToken(appNamespace,serviceName);},invalidateOAuthToken: function(serviceName) { native function invalidateOAuthToken();return invalidateOAuthToken(serviceName);},getOAuthServiceNames: function(appNamespace) { native function getOAuthServiceNames();return getOAuthServiceNames(appNamespace);},raiseAppLoaded: function(appNamespace) { native function raiseAppLoaded();return raiseAppLoaded(appNamespace);},isHookRegistered: function(appNamespace,hook) { native function isHookRegistered();return isHookRegistered(appNamespace,hook);},getCurrentAppNamespace: function() { native function getCurrentAppNamespace();return getCurrentAppNamespace();},hasHigherVersion: function(oldVersion,newVersion) { native function hasHigherVersion();return hasHigherVersion(oldVersion,newVersion);},getOAuthService: function(name) { native function getOAuthService();return getOAuthService(name);},getOAuthServices: function() { native function getOAuthServices();return getOAuthServices();},downloadManifest: function(appNamespace,callback) { native function downloadManifest();return downloadManifest(appNamespace,callback);},reloadApp: function(appNamespace) { native function reloadApp();return reloadApp(appNamespace);}, on: function( eventName, func ) { native function on(); return on(eventName, func); } , appUnload: function( func ) { yasoon.app.on( 'appUnload', func); }, appInit: function( func ) { yasoon.app.on( 'appInit', func); }, oAuthSuccess: function( func ) { yasoon.app.on( 'oAuthSuccess', func); }, allAppsLoaded: function( func ) { yasoon.app.on( 'allAppsLoaded', func); }, oAuthError: function( func ) { yasoon.app.on( 'oAuthError', func); }}; }