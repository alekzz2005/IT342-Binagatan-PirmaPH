package edu.cit.binagatan.pirmaph.controller;

import edu.cit.binagatan.pirmaph.dto.UpdateUserRoleRequest;
import edu.cit.binagatan.pirmaph.dto.UpdateUserStatusRequest;
import edu.cit.binagatan.pirmaph.entity.UserStatus;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
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

    @PatchMapping("/users/{userId}/status")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable UUID userId, @Valid @RequestBody UpdateUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setStatus(request.getStatus());
        User saved = userRepository.save(user);
        notificationService.sendStatusUpdate(saved, saved.getStatus());
        securityAuditService.logRegistrationEvent(saved.getEmail(), "status_updated_by_admin:" + saved.getStatus().name());
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/users/{userId}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> updateRole(@PathVariable UUID userId, @Valid @RequestBody UpdateUserRoleRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setRole(request.getRole());
        userRepository.save(user);
        return ResponseEntity.ok(user);
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
}