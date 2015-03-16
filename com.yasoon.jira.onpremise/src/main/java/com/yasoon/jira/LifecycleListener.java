/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.yasoon.jira;

import com.atlassian.event.api.EventListener;
import com.atlassian.event.api.EventPublisher;
import com.atlassian.jira.license.JiraLicenseManager;
import com.atlassian.jira.license.LicenseDetails;
import com.atlassian.plugin.event.events.PluginEnabledEvent;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Simple JIRA listener using the atlassian-event library and demonstrating
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

    @EventListener
    public void onPluginEnabledEvent(PluginEnabledEvent pluginEvent) {
        if(pluginEvent.getPlugin().getKey().equals("com.yasoon.jira.yasoononpremise")) {
//            log.info("--------------------- License Info ------------------");
//            log.info("ServerID: " + licenseManager.getServerId());
//            
//            Iterable<LicenseDetails> licenses = licenseManager.getLicenses();
//            for(LicenseDetails licDetails : licenses) {
//                log.info("License: " + licDetails.getLicenseString());
//                log.info("Descr: " + licDetails.getDescription());
//            }
        }
    }
}
