/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.yasoon.jira;

import com.atlassian.event.api.EventListener;
import com.atlassian.event.api.EventPublisher;
import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.config.properties.APKeys;
import com.atlassian.jira.config.properties.ApplicationProperties;
import com.atlassian.jira.license.JiraLicenseManager;
import com.atlassian.jira.license.LicenseDetails;
import com.atlassian.plugin.event.events.PluginDisabledEvent;
import com.atlassian.plugin.event.events.PluginEnabledEvent;
import com.atlassian.plugin.event.events.PluginUninstalledEvent;
import com.atlassian.plugin.event.events.PluginUpgradedEvent;
import com.google.gson.Gson;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Simple Jira listener using the atlassian-event library and demonstrating
 * plugin lifecycle integration.
 */
public class LifecycleListener implements InitializingBean, DisposableBean {

    private final EventPublisher eventPublisher;
    private final JiraLicenseManager licenseManager;
    private static final Logger log = LoggerFactory.getLogger(LifecycleListener.class);

    public LifecycleListener(EventPublisher eventPublisher, JiraLicenseManager licenseManager) {
        this.eventPublisher = eventPublisher;
        this.licenseManager = licenseManager;
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        // register ourselves with the EventPublisher
        eventPublisher.register(this);
    }

    @Override
    public void destroy() throws Exception {
        // unregister ourselves with the EventPublisher
        eventPublisher.unregister(this);
    }
    
//    @EventListener
//    public void onPluginEnabledEvent(PluginEnabledEvent pluginEvent) {
//        if(pluginEvent.getPlugin().getKey().equals("com.yasoon.jira.cloud")) {
//            ApplicationProperties props = ComponentAccessor.getApplicationProperties();
//            SystemData data = new SystemData();
//            
//            if (props != null)
//                data.setBaseUrl(props.getString(APKeys.JIRA_BASEURL));
//            
//            data.setClientKey(licenseManager.getServerId());
//            data.setEventType("enabled");
//            updateSystem(new Gson().toJson(data));
//        }
//    }
//    
//    @EventListener
//    public void onPluginDisabledEvent(PluginDisabledEvent disabledEvent) {
//        if(disabledEvent.getPlugin().getKey().equals("com.yasoon.jira.cloud")) {
//            ApplicationProperties props = ComponentAccessor.getApplicationProperties();
//            SystemData data = new SystemData();
//            
//            if (props != null)
//                data.setBaseUrl(props.getString(APKeys.JIRA_BASEURL));
//            
//            data.setClientKey(licenseManager.getServerId());
//            data.setEventType("disabled");
//            updateSystem(new Gson().toJson(data));
//        }
//    }
//    
//    @EventListener
//    public void onPluginUninstalledEvent(PluginUninstalledEvent uninstalledEvent) {
//        if(uninstalledEvent.getPlugin().getKey().equals("com.yasoon.jira.cloud")) {
//            ApplicationProperties props = ComponentAccessor.getApplicationProperties();
//            SystemData data = new SystemData();
//            
//            if (props != null)
//                data.setBaseUrl(props.getString(APKeys.JIRA_BASEURL));
//            
//            data.setClientKey(licenseManager.getServerId());
//            data.setEventType("uninstalled");
//            updateSystem(new Gson().toJson(data));
//        }
//    }
//    
//    @EventListener
//    public void onPluginUpgradedEvent(PluginUpgradedEvent upgradedEvent) {
//        if(upgradedEvent.getPlugin().getKey().equals("com.yasoon.jira.cloud")) {
//            ApplicationProperties props = ComponentAccessor.getApplicationProperties();
//            SystemData data = new SystemData();
//            
//            if (props != null)
//                data.setBaseUrl(props.getString(APKeys.JIRA_BASEURL));
//            
//            data.setClientKey(licenseManager.getServerId());
//            data.setPluginsVersion(upgradedEvent.getPlugin().getPluginsVersion() + "");
//            updateSystem(new Gson().toJson(data));
//        }
//    }
//    
//    private void updateSystem(String data) {
//        try {
//
//            URL url = new URL("http://localhost:1337/jira/change");
//            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
//            conn.setDoOutput(true);
//            conn.setRequestMethod("POST");
//            conn.setRequestProperty("Content-Type", "application/json");
//
//            OutputStream os = conn.getOutputStream();
//            os.write(data.getBytes());
//            os.flush();
//
//            if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
//                log.error("Received non-OK http response from update: " + conn.getResponseMessage());
//                return;
//            }
//
//            conn.disconnect();
//            
//        } catch (MalformedURLException e) {
//            log.error("Error while updating Jira data", e);
//        } catch (IOException e) {
//            log.error("Error while updating Jira data", e);
//       }
//    }
//
//    private class SystemData {
//        private String clientKey;
//        private String pluginsVersion;
//        private String baseUrl;
//        private String eventType;
//
//        public String getClientKey() {
//            return clientKey;
//        }
//
//        public void setClientKey(String clientKey) {
//            this.clientKey = clientKey;
//        }
//
//        public String getPluginsVersion() {
//            return pluginsVersion;
//        }
//
//        public void setPluginsVersion(String pluginsVersion) {
//            this.pluginsVersion = pluginsVersion;
//        }
//
//        public String getBaseUrl() {
//            return baseUrl;
//        }
//
//        public void setBaseUrl(String baseUrl) {
//            this.baseUrl = baseUrl;
//        }
//
//        public String getEventType() {
//            return eventType;
//        }
//
//        public void setEventType(String eventType) {
//            this.eventType = eventType;
//        }
//    }
}
