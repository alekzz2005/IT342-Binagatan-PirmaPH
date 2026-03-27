package edu.cit.binagatan.pirmaph.controller;

import edu.cit.binagatan.pirmaph.dto.UpdateUserRoleRequest;
import edu.cit.binagatan.pirmaph.dto.UpdateUserStatusRequest;
import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @PatchMapping("/users/{userId}/status")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable UUID userId, @Valid @RequestBody UpdateUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setStatus(request.getStatus());
        userRepository.save(user);
        return ResponseEntity.ok(user);
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
}