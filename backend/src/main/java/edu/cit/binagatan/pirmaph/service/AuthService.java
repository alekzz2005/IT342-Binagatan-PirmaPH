package edu.cit.binagatan.pirmaph.service;

import edu.cit.binagatan.pirmaph.dto.AuthResponse;
import edu.cit.binagatan.pirmaph.dto.LoginRequest;
import edu.cit.binagatan.pirmaph.dto.RegisterRequest;
import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.entity.UserRole;
import edu.cit.binagatan.pirmaph.entity.UserStatus;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import edu.cit.binagatan.pirmaph.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordRecoveryService passwordRecoveryService;

    @Autowired
    private SecurityAuditService securityAuditService;

    @Autowired
    private HttpServletRequest request;

    public AuthResponse register(RegisterRequest request) {
        // Validate passwords match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken");
        }

        // Create new user as Resident only (no self-role escalation)
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setAuthProvider("LOCAL");
        user.setFirstName(request.getFirstName());
        user.setMiddleName(request.getMiddleName());
        user.setLastName(request.getLastName());
        user.setBirthDate(request.getBirthDate());
        user.setSex(request.getSex());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setStreet(request.getStreet());
        
        // Set PSGC location codes
        user.setRegionCode(request.getRegionCode());
        user.setProvinceCode(request.getProvinceCode());
        user.setCityMunCode(request.getCityMunCode());
        user.setBarangayCode(request.getBarangayCode());
        
        // Set location display names
        user.setRegion(request.getRegion());
        user.setProvince(request.getProvince());
        user.setCity(request.getCity());
        user.setBarangay(request.getBarangay());
        user.setZipCode(request.getZipCode());
        user.setRole(UserRole.RESIDENT);
        user.setStatus(UserStatus.PENDING_VERIFICATION);

        // Save user
        User savedUser = userRepository.save(user);

        // Registration does not auto-login until account is approved
        return new AuthResponse(savedUser, null);
    }

    public AuthResponse login(LoginRequest request) {
        // Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    securityAuditService.logFailedLogin(request.getEmail(), "email_not_found", this.request);
                    return new IllegalArgumentException("Invalid email or password");
                });

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            user.setFailedLoginAttempts((user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1);
            user.setLastFailedLoginAt(LocalDateTime.now());
            userRepository.save(user);
            securityAuditService.logFailedLogin(request.getEmail(), "invalid_password", this.request);
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            securityAuditService.logFailedLogin(request.getEmail(), "pending_verification", this.request);
            throw new IllegalArgumentException("Your account is pending verification. Please wait for approval.");
        }

        if (user.getStatus() == UserStatus.REJECTED) {
            securityAuditService.logFailedLogin(request.getEmail(), "account_rejected", this.request);
            throw new IllegalArgumentException("Your account has been rejected. Contact your barangay administrator.");
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            securityAuditService.logFailedLogin(request.getEmail(), "account_suspended", this.request);
            throw new IllegalArgumentException("Your account is suspended. Contact your barangay administrator.");
        }

        if (user.getStatus() == null) {
            user.setStatus(UserStatus.APPROVED);
        }

        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        // Generate JWT token
        String token = jwtUtil.generateToken(user.getId(), user.getRole().name());

        // Return response with user data and token
        return new AuthResponse(user, token);
    }

    public void requestPasswordReset(String email) {
        passwordRecoveryService.requestPasswordReset(email);
    }

    public void resetPassword(String token, String newPassword, String confirmPassword) {
        passwordRecoveryService.resetPassword(token, newPassword, confirmPassword);
    }
}
