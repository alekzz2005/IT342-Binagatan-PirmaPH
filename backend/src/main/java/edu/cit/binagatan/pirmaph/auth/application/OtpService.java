package edu.cit.binagatan.pirmaph.auth.application;

import edu.cit.binagatan.pirmaph.users.domain.User;
import edu.cit.binagatan.pirmaph.users.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final int OTP_TTL_MINUTES = 5;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${resend.api-key:}")
    private String resendApiKey;

    @Value("${resend.from-email:onboarding@resend.dev}")
    private String fromEmail;

    public OtpService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Generate and send OTP. Returns false only if the email is not found. */
    @Transactional
    public boolean sendOtp(String email) {
        Optional<User> opt = userRepository.findByEmail(email);
        if (opt.isEmpty()) {
            return false;
        }
        User user = opt.get();

        // Skip OTP for Google OAuth accounts — they are already verified by Google
        if ("GOOGLE".equalsIgnoreCase(user.getAuthProvider())) {
            log.info("Skipping OTP for Google account: {}", email);
            return false;
        }

        String rawCode = generateCode();
        user.setOtpCode(passwordEncoder.encode(rawCode));
        user.setOtpExpiresAt(LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES));
        user.setEmailVerified(false);
        userRepository.save(user);

        deliverViaResend(email, user.getFirstName(), rawCode);
        return true;
    }

    /** Verify the submitted OTP code for the given email. */
    @Transactional
    public OtpResult verifyOtp(String email, String submittedCode) {
        Optional<User> opt = userRepository.findByEmail(email);
        if (opt.isEmpty()) {
            return OtpResult.INVALID;
        }
        User user = opt.get();

        if (user.getOtpCode() == null || user.getOtpExpiresAt() == null) {
            return OtpResult.INVALID;
        }

        if (LocalDateTime.now().isAfter(user.getOtpExpiresAt())) {
            return OtpResult.EXPIRED;
        }

        if (!passwordEncoder.matches(submittedCode, user.getOtpCode())) {
            return OtpResult.INVALID;
        }

        // Clear OTP and mark email as verified
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        user.setEmailVerified(true);
        userRepository.save(user);

        return OtpResult.VERIFIED;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private String generateCode() {
        SecureRandom rng = new SecureRandom();
        int code = 100_000 + rng.nextInt(900_000);
        return String.valueOf(code);
    }

    private void deliverViaResend(String toEmail, String firstName, String code) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.warn("RESEND_API_KEY not configured. OTP for {}: {}", toEmail, code);
            return;
        }

        String html = buildEmailHtml(firstName, code);

        String body = "{"
                + "\"from\":\"" + escapeJson(fromEmail) + "\","
                + "\"to\":[\"" + escapeJson(toEmail) + "\"],"
                + "\"subject\":\"Your PirmaPH Verification Code\","
                + "\"html\":\"" + escapeJson(html) + "\""
                + "}";

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                log.info("OTP email sent to {} via Resend (status {})", toEmail, resp.statusCode());
            } else {
                log.error("Resend API error for {}: {} — {}", toEmail, resp.statusCode(), resp.body());
            }
        } catch (Exception e) {
            log.error("Failed to send OTP email to {} via Resend: {}", toEmail, e.getMessage());
        }
    }

    private String buildEmailHtml(String firstName, String code) {
        // Build each digit cell separately so we can escape safely
        StringBuilder digits = new StringBuilder();
        for (char c : code.toCharArray()) {
            digits.append(
                "<td style='padding:0 6px'>"
                + "<div style='width:52px;height:60px;border:2px solid #0038A8;"
                + "border-radius:12px;font-size:28px;font-weight:700;"
                + "color:#0038A8;text-align:center;line-height:60px;"
                + "font-family:Georgia,serif;background:#EEF2FC'>"
                + c
                + "</div></td>"
            );
        }

        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f4f6fb;"
                + "font-family:Arial,sans-serif'>"
                + "<table width='100%' cellpadding='0' cellspacing='0'><tr><td align='center' style='padding:40px 20px'>"
                + "<table width='480' cellpadding='0' cellspacing='0' style='background:#fff;"
                + "border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(10,26,58,0.12)'>"
                + "<tr><td style='height:5px;background:linear-gradient(90deg,#0038A8 33%,#CE1126 33% 66%,#FCD116 66%)'></td></tr>"
                + "<tr><td style='padding:36px 40px 0;text-align:center'>"
                + "<div style='font-size:28px;font-weight:900;color:#0038A8;"
                + "font-family:Georgia,serif;letter-spacing:1px'>Pirma<span style='color:#FCD116'>PH</span></div>"
                + "<p style='color:#5a6a8a;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:4px 0 24px'>Barangay Digital Services</p>"
                + "<div style='width:72px;height:72px;border-radius:50%;background:#EEF2FC;"
                + "margin:0 auto 20px;font-size:32px;line-height:72px;text-align:center'>📧</div>"
                + "<h2 style='color:#0a1a3a;font-size:22px;margin:0 0 8px'>Verify Your Email</h2>"
                + "<p style='color:#5a6a8a;font-size:14px;line-height:1.6;margin:0 0 24px'>"
                + "Hi " + (firstName != null ? firstName : "there") + "! Enter the code below to verify your PirmaPH account.</p>"
                + "</td></tr>"
                + "<tr><td style='padding:0 40px 8px'>"
                + "<table cellpadding='0' cellspacing='0' align='center'><tr>" + digits + "</tr></table>"
                + "</td></tr>"
                + "<tr><td style='padding:16px 40px 0;text-align:center'>"
                + "<p style='background:#EEF2FC;border-radius:10px;padding:10px 16px;"
                + "color:#0038A8;font-size:13px;margin:0'>⏱ This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>"
                + "</td></tr>"
                + "<tr><td style='padding:24px 40px 32px;text-align:center'>"
                + "<p style='color:#5a6a8a;font-size:12px;margin:0'>If you did not request this, you can safely ignore this email.</p>"
                + "</td></tr>"
                + "<tr><td style='height:4px;background:linear-gradient(90deg,#0038A8 33%,#CE1126 33% 66%,#FCD116 66%)'></td></tr>"
                + "</table></td></tr></table></body></html>";
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }

    /** Result codes for OTP verification. */
    public enum OtpResult {
        VERIFIED, INVALID, EXPIRED
    }
}
