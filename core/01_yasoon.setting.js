if (!yasoon.setting) {  yasoon.setting = {getSupportedLocales: function() { native function getSupportedLocales();return getSupportedLocales();},getUITexts: function(locale) { native function getUITexts();return getUITexts(locale);},getUserParameter: function(key) { native function getUserParameter();return getUserParameter(key);},setUserParameter: function(key,value) { native function setUserParameter();return setUserParameter(key,value);},getAppParameter: function(key) { native function getAppParameter();return getAppParameter(key);},getAppParameters: function() { native function getAppParameters();return getAppParameters();},setAppParameter: function(key,value) { native function setAppParameter();return setAppParameter(key,value);},getSettingsHtml: function(appNamespace) { native function getSettingsHtml();return getSettingsHtml(appNamespace);},isProxyEnabled: function() { native function isProxyEnabled();return isProxyEnabled();},getProxyMode: function() { native function getProxyMode();return getProxyMode();},setProxyMode: function(mode) { native function setProxyMode();return setProxyMode(mode);},setProxyEnabled: function(enable) { native function setProxyEnabled();return setProxyEnabled(enable);},toggleProxy: function(enable) { native function toggleProxy();return toggleProxy(enable);},getSettingsContainer: function(appNamespace,container) { native function getSettingsContainer();return getSettingsContainer(appNamespace,container);},saveSettings: function(appNamespace,parameters) { native function saveSettings();return saveSettings(appNamespace,parameters);},getSidebarElements: function() { native function getSidebarElements();return getSidebarElements();},renderSidebarElement: function(appNamespace,container) { native function renderSidebarElement();return renderSidebarElement(appNamespace,container);},saveProjectSetting: function(name,value) { native function saveProjectSetting();return saveProjectSetting(name,value);},getProjectSetting: function(name) { native function getProjectSetting();return getProjectSetting(name);},getLogLevel: function() { native function getLogLevel();return getLogLevel();}, on: function( eventName, func ) { native function on(); return on(eventName, func); } , proxyChanged: function( func ) { yasoon.setting.on( 'proxyChanged', func); }, HookRenderSettingsView: 'RenderSettingsView', HookRenderSettingsContainer: 'RenderSettingsContainer', HookSaveSettings: 'SaveSettings', HookRenderSidebarElement: 'RenderSidebarElement', HookCreateRibbon: 'CreateRibbons', ClientBranch: 'clientBranch', ClientBranchDeveloper: 'DEVELOPER', ClientBranchProductive: 'PRODUCTIVE'}; }