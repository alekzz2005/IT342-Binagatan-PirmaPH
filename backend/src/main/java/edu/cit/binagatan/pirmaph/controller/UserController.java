package edu.cit.binagatan.pirmaph.controller;

import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<?> getCurrentUser() {
        try {
            // Get user ID from security context (set by JWT filter)
            UUID userId = (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
    }
}
