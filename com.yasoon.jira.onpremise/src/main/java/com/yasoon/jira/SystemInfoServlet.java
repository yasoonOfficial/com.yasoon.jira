/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.yasoon.jira;

import com.atlassian.event.api.EventPublisher;
import com.atlassian.extras.api.jira.JiraLicense;
import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.config.properties.APKeys;
import com.atlassian.jira.config.properties.ApplicationProperties;
import com.atlassian.jira.license.JiraLicenseManager;
import com.atlassian.jira.license.LicenseDetails;
import com.atlassian.sal.api.auth.LoginUriProvider;
import com.atlassian.sal.api.user.UserManager;
import com.google.gson.Gson;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.net.URI;
import java.util.ArrayList;
import java.util.Properties;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tobias
 */
public class SystemInfoServlet extends HttpServlet {

    private final JiraLicenseManager licenseManager;
    private final UserManager userManager;
    private final LoginUriProvider loginUriProvider;
    private static final Logger log = LoggerFactory.getLogger(LifecycleListener.class);

    public SystemInfoServlet(JiraLicenseManager licenseManager, UserManager userManager, LoginUriProvider loginUriProvider) {
        this.licenseManager = licenseManager;
        this.userManager = userManager;
        this.loginUriProvider = loginUriProvider;
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
        
        response.setContentType("text/html;charset=UTF-8");
        PrintWriter out = response.getWriter();
        try {
            Gson gson = new Gson();
            
            ArrayList<JiraLicense> collectedLicenses = new ArrayList<JiraLicense>();
            Iterable<LicenseDetails> licenses = licenseManager.getLicenses();
            for(LicenseDetails licDetails : licenses) {
                collectedLicenses.add(licDetails.getJiraLicense());
            }
            
            SystemInfo info = new SystemInfo();
            info.setLicenses(collectedLicenses);
            
            ApplicationProperties props = ComponentAccessor.getApplicationProperties();            
            info.setBaseUrl(props.getString(APKeys.JIRA_BASEURL));
            info.setVersion(props.getString(APKeys.JIRA_VERSION));
            
            try {
                Properties p = new Properties();
                InputStream is = getClass().getResourceAsStream("/META-INF/maven/com.yasoon.jira/onpremise/pom.properties");
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

    public ArrayList<JiraLicense> getLicenses() {
        return licenses;
    }

    public void setLicenses(ArrayList<JiraLicense> licenses) {
        this.licenses = licenses;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }
    
    private ArrayList<JiraLicense> licenses;
    private String baseUrl;
    private String version;
    private String pluginVersion;
}