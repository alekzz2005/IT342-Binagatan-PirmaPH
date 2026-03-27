package edu.cit.binagatan.pirmaph.security;

import edu.cit.binagatan.pirmaph.entity.UserStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("rbacGuard")
public class RbacGuard {

    public boolean isApproved(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthenticatedUser authenticatedUser) {
            // Backward compatibility: pre-RBAC accounts may still have null status.
            return authenticatedUser.getStatus() == null || authenticatedUser.getStatus() == UserStatus.APPROVED;
        }

        return false;
    }

    public boolean isSuperAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream().anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }
}