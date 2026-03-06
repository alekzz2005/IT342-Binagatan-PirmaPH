package edu.cit.binagatan.pirmaph.service;

import edu.cit.binagatan.pirmaph.dto.AuthResponse;
import edu.cit.binagatan.pirmaph.dto.LoginRequest;
import edu.cit.binagatan.pirmaph.dto.RegisterRequest;
import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import edu.cit.binagatan.pirmaph.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

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

        // Create new user
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
        user.setBarangay(request.getBarangay());
        user.setCity(request.getCity());
        user.setProvince(request.getProvince());
        user.setZipCode(request.getZipCode());
        user.setRole(request.getRole());

        // Save user
        User savedUser = userRepository.save(user);

        // Generate JWT token
        String token = jwtUtil.generateToken(savedUser.getId(), savedUser.getRole().name());

        // Return response with user data and token
        return new AuthResponse(savedUser, token);
    }

    public AuthResponse login(LoginRequest request) {
        // Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        // Generate JWT token
        String token = jwtUtil.generateToken(user.getId(), user.getRole().name());

        // Return response with user data and token
        return new AuthResponse(user, token);
    }
}
