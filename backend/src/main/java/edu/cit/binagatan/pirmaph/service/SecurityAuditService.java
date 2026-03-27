package edu.cit.binagatan.pirmaph.service;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class SecurityAuditService {

    private static final Logger logger = LoggerFactory.getLogger(SecurityAuditService.class);

    public void logFailedLogin(String email, String reason, HttpServletRequest request) {
        logger.warn(
                "SECURITY_AUDIT failed_login email={} reason={} ip={} userAgent={} path={}",
                sanitize(email),
                sanitize(reason),
                request != null ? request.getRemoteAddr() : "n/a",
                request != null ? sanitize(request.getHeader("User-Agent")) : "n/a",
                request != null ? request.getRequestURI() : "n/a"
        );
    }

    public void logUnauthorizedAccess(HttpServletRequest request, Authentication authentication, String reason) {
        String principal = authentication != null ? String.valueOf(authentication.getPrincipal()) : "anonymous";
        logger.warn(
                "SECURITY_AUDIT unauthorized_access principal={} reason={} method={} path={} ip={} userAgent={}",
                sanitize(principal),
                sanitize(reason),
                request != null ? request.getMethod() : "n/a",
                request != null ? request.getRequestURI() : "n/a",
                request != null ? request.getRemoteAddr() : "n/a",
                request != null ? sanitize(request.getHeader("User-Agent")) : "n/a"
        );
    }

    private String sanitize(String value) {
        if (value == null) {
            return "n/a";
        }
        return value.replaceAll("[\\r\\n\\t]", " ").trim();
    }
}