/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.yasoon.jira;

import com.atlassian.event.api.EventPublisher;
import com.atlassian.extras.api.LicenseEdition;
import com.atlassian.extras.api.jira.JiraLicense;
import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.config.properties.APKeys;
import com.atlassian.jira.config.properties.ApplicationProperties;
import com.atlassian.jira.license.JiraLicenseManager;
import com.atlassian.jira.license.LicenseDetails;
import com.atlassian.extras.api.LicenseType;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.jira.web.util.OutlookDate;
import com.atlassian.jira.web.util.OutlookDateManager;
import com.atlassian.sal.api.auth.LoginUriProvider;
import com.atlassian.sal.api.user.UserManager;
import com.atlassian.upm.api.license.PluginLicenseManager;
import com.atlassian.upm.api.license.entity.PluginLicense;
import com.atlassian.upm.api.util.Option;
import com.google.gson.Gson;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.lang.reflect.Method;
import java.net.URI;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.Properties;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tobias
 */
public class SystemInfoServlet extends HttpServlet {

    private final JiraLicenseManager licenseManager;
    private final PluginLicenseManager pluginLicenseManager;
    private final UserManager userManager;
    private final LoginUriProvider loginUriProvider;
    private final OutlookDateManager dateManager;
    private static final Logger log = LoggerFactory.getLogger(LifecycleListener.class);

    public SystemInfoServlet(JiraLicenseManager licenseManager, UserManager userManager, LoginUriProvider loginUriProvider, OutlookDateManager dateManager,
            PluginLicenseManager pluginLicenseManager) {
        this.licenseManager = licenseManager;
        this.userManager = userManager;
        this.loginUriProvider = loginUriProvider;
        this.dateManager = dateManager;
        this.pluginLicenseManager = pluginLicenseManager;
    }
    
    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        String username = userManager.getRemoteUsername(request);
        if (username == null || !userManager.isSystemAdmin(username)) {
            redirectToLogin(request, response);
            return;
        }
        
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        
        PrintWriter out = response.getWriter();
        try {
            
            Gson gson = new Gson();            
            ArrayList<JiraLicenseInfoDetail> instanceLicenses = new ArrayList<JiraLicenseInfoDetail>();
            JiraLicenseInfo licenseInfo = new JiraLicenseInfo();
            SystemInfo info = new SystemInfo();
            
            getCurrentUserAndCompany(info);
                        
            if (licenseManager != null) {                
                //getLicenses was introduced in 6.3, ensure compat until 6.0
                if(supportsMultipleLicenses(licenseManager)) {                
                    Iterable<LicenseDetails> licenses = licenseManager.getLicenses();

                    if(licenses != null) {            
                        for(LicenseDetails licDetails : licenses) {
                            JiraLicense jiraLicInfo = licDetails.getJiraLicense();
                            instanceLicenses.add(new JiraLicenseInfoDetail(jiraLicInfo));
                        }
                    }
                }
                else {
                    OutlookDate d = this.dateManager.getOutlookDate(Locale.ENGLISH);
                    instanceLicenses.add(new JiraLicenseInfoDetail(licenseManager.getLicense(), d));                    
                }

                licenseInfo.setInstances(instanceLicenses);
                info.setServerId(licenseManager.getServerId());
            }
            
            if (pluginLicenseManager != null) {
                Option<PluginLicense> plugLic = pluginLicenseManager.getLicense();
                if (plugLic.isDefined()) {
                    PluginLicense pluginInfo = plugLic.get();
                    licenseInfo.setAddon(new JiraLicenseInfoDetail(pluginInfo));
                }
            }
            
            info.setLicenseInfo(licenseInfo);
            
            ApplicationProperties props = ComponentAccessor.getApplicationProperties();
            
            if(props != null) {            
                info.setBaseUrl(props.getString(APKeys.JIRA_BASEURL));
                info.setVersion(props.getString(APKeys.JIRA_VERSION));
            }
            
            try {
                Properties p = new Properties();
                InputStream is = getClass().getResourceAsStream("/META-INF/maven/com.yasoon.jira/cloud/pom.properties");
                if (is != null) {
                    p.load(is);
                    info.setPluginVersion( p.getProperty("version", ""));
                }
            } catch (Exception e) {
                // ignore
            }            
            
            out.println(gson.toJson(info));
        } finally {
            out.close();
        }
    }
    
    private boolean supportsMultipleLicenses(JiraLicenseManager licenseManager) {
        Class clazz = licenseManager.getClass();
        Method[] methods = clazz.getMethods();
        
        for (Method method : methods) {
            if (method.getName().equals("getLicenses")) {
                return true;
            }
        }
        
        return false;
    }

    private void redirectToLogin(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.sendRedirect(loginUriProvider.getLoginUri(getUri(request)).toASCIIString());
    }

    private URI getUri(HttpServletRequest request) {
        StringBuffer builder = request.getRequestURL();
        if (request.getQueryString() != null) {
            builder.append("?");
            builder.append(request.getQueryString());
        }
        return URI.create(builder.toString());
    }
    
    private void getCurrentUserAndCompany(SystemInfo info) {
        try {
            ApplicationUser user = ComponentAccessor.getJiraAuthenticationContext().getUser();
            info.setUserEmailAddress(user.getEmailAddress());
            info.setUserName(user.getDisplayName());            
        }
        catch(Exception ex) {
            
        }
    }
    
    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>
}

final class JiraLicenseInfo {
    private JiraLicenseInfoDetail addon;
    private ArrayList<JiraLicenseInfoDetail> instances;

    public JiraLicenseInfoDetail getAddon() {
        return addon;
    }

    public void setAddon(JiraLicenseInfoDetail addon) {
        this.addon = addon;
    }

    public ArrayList<JiraLicenseInfoDetail> getInstances() {
        return instances;
    }

    public void setInstances(ArrayList<JiraLicenseInfoDetail> instances) {
        this.instances = instances;
    }
}

final class JiraLicenseInfoDetail {
    
    public JiraLicenseInfoDetail(PluginLicense license) {
        
        setDescription(license.getDescription());
        
        if (license.getMaintenanceExpiryDate().isDefined())
            setMaintenanceEndDate(license.getMaintenanceExpiryDate().get().toString());
        
        if (license.getPartner().isDefined())
            setPartnerName(license.getPartner().get().getName());
            
        if (license.getMaximumNumberOfUsers().isDefined())
            setMaximumNumberOfUsers(license.getMaximumNumberOfUsers().get());
        
        setPurchaseDateString(license.getPurchaseDate().toString());
        setPluginLicenseType(license.getLicenseType());
        setCreationDate(license.getCreationDate().toDate());
        
        setIsEvaluation(license.isEvaluation());
        setIsExpired(license.isMaintenanceExpired());        
        setIsUnlimitedNumberOfUsers(license.isUnlimitedNumberOfUsers());
        
        if (license.getSupportEntitlementNumber().isDefined())
            setSupportEntitlementNumber(license.getSupportEntitlementNumber().get());
    }
    
    public JiraLicenseInfoDetail(JiraLicense jiraLic) {
        setDescription(jiraLic.getDescription());
        
        if(jiraLic.getOrganisation() != null)        
            setOrganisation(jiraLic.getOrganisation().getName());
        
        setCreationDate(jiraLic.getCreationDate());
        setExpiryDate(jiraLic.getExpiryDate());
        setPurchaseDate(jiraLic.getPurchaseDate());
        
        if(jiraLic.getPartner() != null)
            setPartnerName(jiraLic.getPartner().getName());
        
        setMaximumNumberOfUsers(jiraLic.getMaximumNumberOfUsers());
        setIsEvaluation(jiraLic.isEvaluation());        
        setIsExpired(jiraLic.isExpired());
        setMaintenanceExpiryDate(jiraLic.getMaintenanceExpiryDate());
        setIsUnlimitedNumberOfUsers(jiraLic.isUnlimitedNumberOfUsers());
        setLicenseEdition(jiraLic.getLicenseEdition());
        setLicenseType(jiraLic.getLicenseType());
        setSupportEntitlementNumber(jiraLic.getSupportEntitlementNumber());
    }
    
    public JiraLicenseInfoDetail(LicenseDetails details, OutlookDate date) {
        setDescription(details.getDescription());
        setMaintenanceEndDate(details.getMaintenanceEndString(date));
        setOrganisation(details.getOrganisation());
        setPartnerName(details.getPartnerName());
        setMaximumNumberOfUsers(details.getMaximumNumberOfUsers());
        setPurchaseDateString(details.getPurchaseDate(date));
        setIsCommercial(details.isCommercial());
        setIsCommunity(details.isCommunity());
        setIsDemonstration(details.isDemonstration());
        setIsDeveloper(details.isDeveloper());
        setIsEntitledToSupport(details.isEntitledToSupport());
        setIsEvaluation(details.isEvaluation());
        setIsExpired(details.isExpired());
        setIsLicenseAlmostExpired(details.isLicenseAlmostExpired());
        setIsLicenseSet(details.isLicenseSet());
        setIsNonProfit(details.isNonProfit());
        setIsOpenSource(details.isOpenSource());
        setIsPersonalLicense(details.isPersonalLicense());
        setIsStarter(details.isStarter());
        setIsUnlimitedNumberOfUsers(details.isUnlimitedNumberOfUsers());
        setSupportEntitlementNumber(details.getSupportEntitlementNumber());
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getMaximumNumberOfUsers() {
        return maximumNumberOfUsers;
    }

    public void setMaximumNumberOfUsers(int maximumNumberOfUsers) {
        this.maximumNumberOfUsers = maximumNumberOfUsers;
    }

    public String getOrganisation() {
        return organisation;
    }

    public void setOrganisation(String organisation) {
        this.organisation = organisation;
    }

    public String getPartnerName() {
        return partnerName;
    }

    public void setPartnerName(String partnerName) {
        this.partnerName = partnerName;
    }

    public Date getMaintenanceExpiryDate() {
        return maintenanceExpiryDate;
    }

    public void setMaintenanceExpiryDate(Date maintenanceExpiryDate) {
        this.maintenanceExpiryDate = maintenanceExpiryDate;
    }
    
    public boolean isIsCommercial() {
        return isCommercial;
    }

    public void setIsCommercial(boolean isCommercial) {
        this.isCommercial = isCommercial;
    }

    public boolean isIsCommunity() {
        return isCommunity;
    }

    public void setIsCommunity(boolean isCommunity) {
        this.isCommunity = isCommunity;
    }

    public boolean isIsDemonstration() {
        return isDemonstration;
    }

    public void setIsDemonstration(boolean isDemonstration) {
        this.isDemonstration = isDemonstration;
    }

    public boolean isIsDeveloper() {
        return isDeveloper;
    }

    public void setIsDeveloper(boolean isDeveloper) {
        this.isDeveloper = isDeveloper;
    }

    public boolean isIsEntitledToSupport() {
        return isEntitledToSupport;
    }

    public void setIsEntitledToSupport(boolean isEntitledToSupport) {
        this.isEntitledToSupport = isEntitledToSupport;
    }

    public boolean isIsEvaluation() {
        return isEvaluation;
    }

    public void setIsEvaluation(boolean isEvaluation) {
        this.isEvaluation = isEvaluation;
    }

    public boolean isIsExpired() {
        return isExpired;
    }

    public void setIsExpired(boolean isExpired) {
        this.isExpired = isExpired;
    }

    public boolean isIsLicenseAlmostExpired() {
        return isLicenseAlmostExpired;
    }

    public void setIsLicenseAlmostExpired(boolean isLicenseAlmostExpired) {
        this.isLicenseAlmostExpired = isLicenseAlmostExpired;
    }

    public boolean isIsLicenseSet() {
        return isLicenseSet;
    }

    public void setIsLicenseSet(boolean isLicenseSet) {
        this.isLicenseSet = isLicenseSet;
    }

    public boolean isIsNonProfit() {
        return isNonProfit;
    }

    public void setIsNonProfit(boolean isNonProfit) {
        this.isNonProfit = isNonProfit;
    }

    public boolean isIsOpenSource() {
        return isOpenSource;
    }

    public void setIsOpenSource(boolean isOpenSource) {
        this.isOpenSource = isOpenSource;
    }

    public boolean isIsPersonalLicense() {
        return isPersonalLicense;
    }

    public void setIsPersonalLicense(boolean isPersonalLicense) {
        this.isPersonalLicense = isPersonalLicense;
    }

    public boolean isIsStarter() {
        return isStarter;
    }

    public void setIsStarter(boolean isStarter) {
        this.isStarter = isStarter;
    }

    public boolean isIsUnlimitedNumberOfUsers() {
        return isUnlimitedNumberOfUsers;
    }

    public void setIsUnlimitedNumberOfUsers(boolean isUnlimitedNumberOfUsers) {
        this.isUnlimitedNumberOfUsers = isUnlimitedNumberOfUsers;
    }

    public String getPurchaseDateString() {
        return purchaseDateString;
    }

    public void setPurchaseDateString(String purchaseDateString) {
        this.purchaseDateString = purchaseDateString;
    }

    public Date getCreationDate() {
        return creationDate;
    }

    public void setCreationDate(Date creationDate) {
        this.creationDate = creationDate;
    }

    public Date getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(Date purchaseDate) {
        this.purchaseDate = purchaseDate;
    }

    public Date getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(Date expiryDate) {
        this.expiryDate = expiryDate;
    }

    public LicenseType getLicenseType() {
        return licenseType;
    }

    public void setLicenseType(LicenseType licenseType) {
        this.licenseType = licenseType;
    }

    public LicenseEdition getLicenseEdition() {
        return licenseEdition;
    }

    public void setLicenseEdition(LicenseEdition licenseEdition) {
        this.licenseEdition = licenseEdition;
    }

    public String getMaintenanceEndDate() {
        return maintenanceEndDate;
    }

    public void setMaintenanceEndDate(String maintenanceEndDate) {
        this.maintenanceEndDate = maintenanceEndDate;
    }

    public String getSupportEntitlementNumber() {
        return supportEntitlementNumber;
    }

    public void setSupportEntitlementNumber(String supportEntitlementNumber) {
        this.supportEntitlementNumber = supportEntitlementNumber;
    }

    public com.atlassian.upm.api.license.entity.LicenseType getPluginLicenseType() {
        return pluginLicenseType;
    }

    public void setPluginLicenseType(com.atlassian.upm.api.license.entity.LicenseType pluginLicenseType) {
        this.pluginLicenseType = pluginLicenseType;
    }

    private String description;
    private int maximumNumberOfUsers;
    private String organisation;
    private String partnerName;
    private String purchaseDateString;
    private String maintenanceEndDate;
    private boolean isCommercial;
    private boolean isCommunity;
    private boolean isDemonstration;
    private boolean isDeveloper;
    private boolean isEntitledToSupport;
    private boolean isEvaluation;
    private boolean isExpired;
    private boolean isLicenseAlmostExpired;
    private boolean isLicenseSet;
    private boolean isNonProfit;
    private boolean isOpenSource;
    private boolean isPersonalLicense;
    private boolean isStarter;
    private boolean isUnlimitedNumberOfUsers;
    private Date creationDate;
    private Date purchaseDate;
    private Date expiryDate;
    private Date maintenanceExpiryDate;
    private LicenseType licenseType;
    private com.atlassian.upm.api.license.entity.LicenseType pluginLicenseType;
    private LicenseEdition licenseEdition;
    private String supportEntitlementNumber;

}

class SystemInfo {

    public String getPluginVersion() {
        return pluginVersion;
    }

    public void setPluginVersion(String pluginVersion) {
        this.pluginVersion = pluginVersion;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public JiraLicenseInfo getLicenseInfo() {
        return licenseInfo;
    }

    public void setLicenseInfo(JiraLicenseInfo licenseInfo) {
        this.licenseInfo = licenseInfo;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getServerId() {
        return serverId;
    }

    public void setServerId(String serverId) {
        this.serverId = serverId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userFirstName) {
        this.userName = userFirstName;
    }


    public String getUserEmailAddress() {
        return userEmailAddress;
    }

    public void setUserEmailAddress(String userEmailAddress) {
        this.userEmailAddress = userEmailAddress;
    }
    
    private JiraLicenseInfo licenseInfo;
    private String baseUrl;
    private String version;
    private String pluginVersion;
    private String serverId;
    
    private String userName;
    private String userEmailAddress;
}