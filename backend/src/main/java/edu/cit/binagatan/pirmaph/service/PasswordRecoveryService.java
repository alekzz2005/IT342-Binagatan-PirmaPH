package edu.cit.binagatan.pirmaph.service;

import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class PasswordRecoveryService {

    private static final Logger logger = LoggerFactory.getLogger(PasswordRecoveryService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${password.reset.ttl-minutes:30}")
    private long passwordResetTtlMinutes;

    @Value("${spring.mail.username:no-reply@pirmaph.local}")
    private String senderEmail;

    @Transactional
    public void requestPasswordReset(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();
        String rawToken = UUID.randomUUID().toString();
        user.setPasswordResetTokenHash(passwordEncoder.encode(rawToken));
        user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(passwordResetTtlMinutes));
        userRepository.save(user);

        sendResetEmail(user, rawToken);
    }

    @Transactional
    public void resetPassword(String token, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        User user = userRepository.findAll().stream()
                .filter(u -> u.getPasswordResetTokenHash() != null && passwordEncoder.matches(token, u.getPasswordResetTokenHash()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));

        if (user.getPasswordResetExpiresAt() == null || user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetExpiresAt(null);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
    }

    private void sendResetEmail(User user, String rawToken) {
        String resetLink = frontendUrl + "/reset-password?token=" + rawToken;

        if (mailSender != null) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(user.getEmail());
            message.setSubject("PirmaPH Password Recovery");
            message.setText("Hello " + user.getFirstName() + ",\n\n"
                    + "We received a password reset request for your account.\n"
                    + "Use this link to set a new password: " + resetLink + "\n\n"
                    + "This link will expire in " + passwordResetTtlMinutes + " minutes.\n"
                    + "If you did not request this, you can safely ignore this email.");
            mailSender.send(message);
            return;
        }

        logger.info("Password reset requested for {}. Mail sender not configured. Reset link: {}", user.getEmail(), resetLink);
    }
}