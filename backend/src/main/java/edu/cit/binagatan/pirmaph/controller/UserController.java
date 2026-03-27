package edu.cit.binagatan.pirmaph.controller;

import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import edu.cit.binagatan.pirmaph.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/me")
    @PreAuthorize("@rbacGuard.isApproved(authentication)")
    public ResponseEntity<?> getCurrentUser() {
        try {
            AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            UUID userId = principal.getId();
            
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
    }

    @GetMapping("/resident/dashboard")
    @PreAuthorize("hasRole('RESIDENT') and @rbacGuard.isApproved(authentication)")
    public ResponseEntity<?> residentDashboard() {
        return ResponseEntity.ok("Resident dashboard access granted");
    }

    @GetMapping("/officer/dashboard")
    @PreAuthorize("hasRole('OFFICER') and @rbacGuard.isApproved(authentication)")
    public ResponseEntity<?> officerDashboard() {
        return ResponseEntity.ok("Officer dashboard access granted");
    }

    @GetMapping("/barangay-admin/dashboard")
    @PreAuthorize("hasRole('BARANGAY_ADMIN') and @rbacGuard.isApproved(authentication)")
    public ResponseEntity<?> barangayAdminDashboard() {
        return ResponseEntity.ok("Barangay Admin dashboard access granted");
    }

    @GetMapping("/super-admin/dashboard")
    @PreAuthorize("hasRole('SUPER_ADMIN') and @rbacGuard.isApproved(authentication)")
    public ResponseEntity<?> superAdminDashboard() {
        return ResponseEntity.ok("Super Admin dashboard access granted");
    }
}
