package edu.cit.binagatan.pirmaph.controller;

import edu.cit.binagatan.pirmaph.dto.CreateBarangayAdminRequest;
import edu.cit.binagatan.pirmaph.dto.UpdateUserRoleRequest;
import edu.cit.binagatan.pirmaph.dto.UpdateUserStatusRequest;
import edu.cit.binagatan.pirmaph.entity.UserStatus;
import edu.cit.binagatan.pirmaph.entity.UserRole;
import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import edu.cit.binagatan.pirmaph.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.service.NotificationService;
import edu.cit.binagatan.pirmaph.service.ResidentVerificationService;
import edu.cit.binagatan.pirmaph.service.SecurityAuditService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResidentVerificationService residentVerificationService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SecurityAuditService securityAuditService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PatchMapping("/users/{userId}/status")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable UUID userId, @Valid @RequestBody UpdateUserStatusRequest request) {
        AuthenticatedUser principal = currentPrincipal();
        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        validateBarangayScope(actor, user);

        UserStatus previousStatus = user.getStatus();

        user.setStatus(request.getStatus());
        User saved = userRepository.save(user);
        notificationService.sendStatusUpdate(saved, saved.getStatus());
        if (saved.getStatus() == UserStatus.SUSPENDED || previousStatus == UserStatus.SUSPENDED) {
            notificationService.sendSuspensionUpdate(saved, saved.getStatus() == UserStatus.SUSPENDED);
        }
        securityAuditService.logRegistrationEvent(saved.getEmail(), "status_updated_by_admin:" + saved.getStatus().name());
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/users/{userId}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> updateRole(@PathVariable UUID userId, @Valid @RequestBody UpdateUserRoleRequest request) {
        AuthenticatedUser principal = currentPrincipal();
        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (actor.getId().equals(user.getId())) {
            throw new IllegalArgumentException("Super admin cannot change own role");
        }

        UserRole previousRole = user.getRole();

        user.setRole(request.getRole());
        User saved = userRepository.save(user);
        notificationService.sendRoleUpdated(saved);
        securityAuditService.logRoleChange(actor.getEmail(), saved.getEmail(), previousRole.name(), saved.getRole().name());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/residents/pending")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<User>> getPendingResidents() {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.getPendingResidentsForBarangay(principal));
    }

    @PatchMapping("/residents/{userId}/approve")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> approveResident(@PathVariable UUID userId) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.reviewResident(principal, userId, UserStatus.APPROVED));
    }

    @PatchMapping("/residents/{userId}/reject")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> rejectResident(@PathVariable UUID userId) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.reviewResident(principal, userId, UserStatus.REJECTED));
    }

    @GetMapping("/officers/pending")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<User>> getPendingOfficers() {
        AuthenticatedUser principal = currentPrincipal();
        return ResponseEntity.ok(residentVerificationService.getPendingOfficersForBarangay(principal));
    }

    @PatchMapping("/officers/{userId}/approve")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> approveOfficer(@PathVariable UUID userId) {
        AuthenticatedUser principal = currentPrincipal();
        return ResponseEntity.ok(residentVerificationService.reviewOfficer(principal, userId, UserStatus.APPROVED));
    }

    @PatchMapping("/officers/{userId}/reject")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> rejectOfficer(@PathVariable UUID userId) {
        AuthenticatedUser principal = currentPrincipal();
        return ResponseEntity.ok(residentVerificationService.reviewOfficer(principal, userId, UserStatus.REJECTED));
    }

    @GetMapping("/officers")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<User>> getOfficers() {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));

        if (actor.getRole() == UserRole.SUPER_ADMIN) {
            return ResponseEntity.ok(userRepository.findByRoleOrderByCreatedAtAsc(UserRole.OFFICER));
        }

        return ResponseEntity.ok(userRepository.findByRoleAndBarangayCodeOrderByCreatedAtAsc(UserRole.OFFICER, actor.getBarangayCode()));
    }

    @PatchMapping("/users/{userId}/suspend")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> suspendUser(@PathVariable UUID userId) {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (actor.getId().equals(target.getId())) {
            throw new IllegalArgumentException("You cannot suspend your own account");
        }
        validateBarangayScope(actor, target);

        target.setStatus(UserStatus.SUSPENDED);
        User saved = userRepository.save(target);
        notificationService.sendSuspensionUpdate(saved, true);
        securityAuditService.logSuspensionAction(actor.getEmail(), saved.getEmail(), "suspend");
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/users/{userId}/reinstate")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> reinstateUser(@PathVariable UUID userId) {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        validateBarangayScope(actor, target);

        UserStatus reinstatedStatus = target.getRole() == UserRole.OFFICER ? UserStatus.PENDING_VERIFICATION : UserStatus.APPROVED;
        target.setStatus(reinstatedStatus);
        User saved = userRepository.save(target);
        notificationService.sendSuspensionUpdate(saved, false);
        securityAuditService.logSuspensionAction(actor.getEmail(), saved.getEmail(), "reinstate_to_" + reinstatedStatus.name().toLowerCase());
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/barangay-admins")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> createBarangayAdmin(@Valid @RequestBody CreateBarangayAdminRequest request) {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getTemporaryPassword()));
        user.setAuthProvider("LOCAL");
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setBarangayCode(request.getBarangayCode());
        user.setBarangay(request.getBarangay());
        user.setCity(request.getCity());
        user.setProvince(request.getProvince());
        user.setRegion(request.getRegion());
        user.setRole(UserRole.BARANGAY_ADMIN);
        user.setStatus(UserStatus.APPROVED);

        User saved = userRepository.save(user);
        notificationService.sendInitialBarangayAdminCredentials(saved, request.getTemporaryPassword());
        securityAuditService.logSuperAdminAction(actor.getEmail(), "create_barangay_admin", saved.getEmail());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", saved.getId());
        response.put("username", saved.getUsername());
        response.put("email", saved.getEmail());
        response.put("role", saved.getRole());
        response.put("status", saved.getStatus());
        response.put("barangayCode", saved.getBarangayCode());
        return ResponseEntity.ok(response);
    }

    private AuthenticatedUser currentPrincipal() {
        return (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private void validateBarangayScope(User actor, User target) {
        if (actor.getRole() != UserRole.BARANGAY_ADMIN) {
            return;
        }

        if (target.getRole() == UserRole.SUPER_ADMIN || target.getRole() == UserRole.BARANGAY_ADMIN) {
            throw new IllegalArgumentException("Barangay admins cannot change admin-level accounts");
        }

        if (actor.getBarangayCode() == null || !actor.getBarangayCode().equals(target.getBarangayCode())) {
            throw new IllegalArgumentException("You can only manage accounts in your barangay");
        }
    }
}