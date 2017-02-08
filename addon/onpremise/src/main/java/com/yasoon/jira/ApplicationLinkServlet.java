/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.yasoon.jira;

import com.atlassian.applinks.api.ApplicationId;
import com.atlassian.applinks.api.ApplicationLink;
import com.atlassian.applinks.api.ApplicationType;
import com.atlassian.applinks.api.application.generic.GenericApplicationType;
import com.atlassian.applinks.spi.link.ApplicationLinkDetails;
import com.atlassian.applinks.spi.link.MutatingApplicationLinkService;
import com.atlassian.applinks.spi.manifest.ManifestNotFoundException;
import com.atlassian.applinks.spi.util.TypeAccessor;
import com.atlassian.oauth.Consumer;
import com.atlassian.oauth.serviceprovider.ServiceProviderConsumerStore;
import com.atlassian.oauth.util.RSAKeys;
import com.atlassian.sal.api.auth.LoginUriProvider;
import com.atlassian.sal.api.user.UserManager;
import com.google.gson.Gson;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.net.URI;
import java.security.NoSuchAlgorithmException;
import java.security.PublicKey;
import java.security.spec.InvalidKeySpecException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.security.cert.CertificateException;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.stream.util.StreamReaderDelegate;

/**
 *
 * @author Tobias
 */
public class ApplicationLinkServlet extends HttpServlet {

    private final UserManager userManager;
    private final LoginUriProvider loginUriProvider;
    private MutatingApplicationLinkService appLinkService;
    private TypeAccessor accessor;
    private ServiceProviderConsumerStore storeService;
    
    public ApplicationLinkServlet(UserManager userManager, LoginUriProvider loginUriProvider,
            MutatingApplicationLinkService appLinks, TypeAccessor typeAccessor, ServiceProviderConsumerStore storeService)    
    {
        this.userManager = userManager;
        this.loginUriProvider = loginUriProvider;
        this.appLinkService = appLinks;
        this.accessor = typeAccessor;
        this.storeService = storeService;
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
            if(request.getMethod().equalsIgnoreCase("get")) {
                out.println("{ \"exists\": " + checkAppLink() + " }");
            }
            else if(request.getMethod().equalsIgnoreCase("post")){
                Gson g = new Gson();
                PostRequest post = g.fromJson(new InputStreamReader(request.getInputStream()), PostRequest.class);
                try {                
                    createAppLink(post.getCert());
                    out.println("{}");
                } catch (ManifestNotFoundException ex) {
                    Logger.getLogger(ApplicationLinkServlet.class.getName()).log(Level.SEVERE, null, ex);
                } catch (NoSuchAlgorithmException ex) {
                    Logger.getLogger(ApplicationLinkServlet.class.getName()).log(Level.SEVERE, null, ex);
                } catch (InvalidKeySpecException ex) {
                    Logger.getLogger(ApplicationLinkServlet.class.getName()).log(Level.SEVERE, null, ex);
                } catch (CertificateException ex) {
                    Logger.getLogger(ApplicationLinkServlet.class.getName()).log(Level.SEVERE, null, ex);
                } catch (java.security.cert.CertificateException ex) {
                    Logger.getLogger(ApplicationLinkServlet.class.getName()).log(Level.SEVERE, null, ex);
                }
            }
        } finally {
            out.close();
        }
    }

    private boolean checkAppLink() {
        Iterable<ApplicationLink> links = this.appLinkService.getApplicationLinks();
        for(ApplicationLink link : links) {
            try {
                String conKey = (String) link.getProperty("oauth.incoming.consumerkey");
                if(conKey != null) {
                    Consumer con = this.storeService.get(conKey);
                    if(con != null && con.getKey().equals("yasoonjira"))
                        return true;
                }
            }
            catch(Exception ex) {                
            }
        }
        
        return false;
    }    
    
    private ApplicationLink TryGetApplicationLink() {
        try {
            Iterable<ApplicationLink> links = this.appLinkService.getApplicationLinks();
            for(ApplicationLink link : links) {
                if (link.getDisplayUrl().getHost().equals("jira.yasoon.com"))
                    return link;
            }
        }
        catch(Exception ex) {                
        }
        
        return null;
    }
    
    private void createAppLink(String cert) throws ManifestNotFoundException, NoSuchAlgorithmException, InvalidKeySpecException, CertificateException, java.security.cert.CertificateException {
        //Handle broken links
        ApplicationLink existingLink = TryGetApplicationLink();        
        PublicKey key = RSAKeys.fromEncodedCertificateToPublicKey(cert);
        Consumer con = Consumer.key("yasoonjira").name("JIRA for Outlook").publicKey(key).callback(URI.create("http://oauth.yasoon/v1/com.yasoon.jira/auth")).build();

        if(existingLink == null) {        
            ApplicationLinkDetails.Builder builder = ApplicationLinkDetails.builder();
            ApplicationLinkDetails details = builder.name("JIRA for Outlook").displayUrl(URI.create("http://jira.yasoon.com")).build();
            ApplicationType generic = this.accessor.getApplicationType(GenericApplicationType.class);
            existingLink = this.appLinkService.createApplicationLink(generic, details);
        }
        else {
//            String conKey = (String) existingLink.getProperty("oauth.incoming.consumerkey");
//            if(conKey != null) {
//                Consumer conOld = this.storeService.get(conKey);
//                if(conOld != null && conOld.getKey().equals("yasoonjira"))
//                    this.storeService.remove(conKey);
//            }
        }
        
        this.storeService.put(con);
        existingLink.putProperty("oauth.incoming.consumerkey", con.getKey());
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

class PostRequest {
    private String cert;

    public String getCert() {
        return cert;
    }

    public void setCert(String cert) {
        this.cert = cert;
    }
}