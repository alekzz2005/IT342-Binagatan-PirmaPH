package edu.cit.binagatan.pirmaph.shared.infrastructure;

import edu.cit.binagatan.pirmaph.users.domain.User;
import edu.cit.binagatan.pirmaph.users.domain.UserStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final java.net.http.HttpClient httpClient = java.net.http.HttpClient.newHttpClient();

    @Value("${resend.api-key:}")
    private String resendApiKey;

    @Value("${resend.from-email:onboarding@resend.dev}")
    private String fromEmail;

    public void sendRegistrationReceived(User user) {
        String subject = "PirmaPH Registration Received";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + "Your registration has been received and is now pending verification.\n"
                + "You can log in to upload supporting documents and track your status.\n\n"
                + "Current status: PENDING_VERIFICATION";
        sendEmail(user.getEmail(), subject, body);
    }

    public void sendOfficerRegistrationReceived(User user) {
        String subject = "PirmaPH Officer Registration Received";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + "Your officer onboarding request has been submitted and is pending Barangay Admin verification.\n"
                + "Please log in to upload or update your proof of appointment if needed.\n\n"
                + "Current status: PENDING_VERIFICATION";
        sendEmail(user.getEmail(), subject, body);
    }

    public void sendStatusUpdate(User user, UserStatus newStatus) {
        if (newStatus == UserStatus.APPROVED) {
            String subject = "PirmaPH Account Approved";
            String htmlBody = buildApprovalEmailHtml(user.getFirstName());
            sendHtmlEmail(user.getEmail(), subject, htmlBody);
        } else {
            String subject = "PirmaPH Registration Status Update";
            String body = "Hello " + user.getFirstName() + ",\n\n"
                    + "Your verification status has been updated to: " + newStatus.name() + ".\n\n"
                    + statusInstruction(newStatus);
            sendEmail(user.getEmail(), subject, body);
        }
    }

    public void sendRoleUpdated(User user) {
        String subject = "PirmaPH Role Assignment Updated";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + "Your account role has been updated to: " + user.getRole().name() + ".\n"
                + "Please log in to access your updated dashboard and permissions.";
        sendEmail(user.getEmail(), subject, body);
    }

    public void sendSuspensionUpdate(User user, boolean suspended) {
        String subject = suspended ? "PirmaPH Account Suspended" : "PirmaPH Account Reinstated";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + (suspended
                ? "Your account has been suspended by an administrator. Contact your barangay office for details."
                : "Your account has been reinstated. You may now continue using the system according to your role.");
        sendEmail(user.getEmail(), subject, body);
    }

    public void sendInitialBarangayAdminCredentials(User user, String temporaryPassword) {
        String subject = "PirmaPH Barangay Admin Account Created";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + "A Super Admin created your initial Barangay Admin account.\n"
                + "Temporary password: " + temporaryPassword + "\n"
                + "Please log in and change your password immediately.";
        sendEmail(user.getEmail(), subject, body);
    }

    public void sendDocumentRequestSubmitted(User user, java.util.UUID requestId, String documentType) {
        String subject = "PirmaPH Request Submitted";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + "Your document request has been submitted successfully.\n"
                + "Request ID: " + requestId + "\n"
                + "Document Type: " + documentType + "\n"
                + "Current status: SUBMITTED";
        sendEmail(user.getEmail(), subject, body);
    }

    public void sendDocumentRequestStatusUpdate(User user, java.util.UUID requestId, String status) {
        String subject = "PirmaPH Request Status Updated";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + "Your document request status has been updated.\n"
                + "Request ID: " + requestId + "\n"
                + "New status: " + status;
        sendEmail(user.getEmail(), subject, body);
    }

    private String statusInstruction(UserStatus status) {
        if (status == UserStatus.APPROVED) {
            return "You can now access resident services and request barangay documents.";
        }
        if (status == UserStatus.REJECTED) {
            return "Please update your profile and upload corrected supporting documents before reapplying.";
        }
        if (status == UserStatus.SUSPENDED) {
            return "Your account access is restricted. Contact your barangay administrator for assistance.";
        }
        return "Please wait for barangay admin review.";
    }

    private void sendEmail(String recipient, String subject, String body) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            logger.info("Resend API key not configured. Notification to {} | {} | {}", recipient, subject, body);
            return;
        }

        String jsonPayload = "{"
                + "\"from\":\"" + escapeJson(fromEmail) + "\","
                + "\"to\":[\"" + escapeJson(recipient) + "\"],"
                + "\"subject\":\"" + escapeJson(subject) + "\","
                + "\"text\":\"" + escapeJson(body) + "\""
                + "}";

        executeResendRequest(recipient, subject, jsonPayload);
    }

    private void sendHtmlEmail(String recipient, String subject, String htmlBody) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            logger.info("Resend API key not configured. Notification to {} | {} | HTML", recipient, subject);
            return;
        }

        String jsonPayload = "{"
                + "\"from\":\"" + escapeJson(fromEmail) + "\","
                + "\"to\":[\"" + escapeJson(recipient) + "\"],"
                + "\"subject\":\"" + escapeJson(subject) + "\","
                + "\"html\":\"" + escapeJson(htmlBody) + "\""
                + "}";

        executeResendRequest(recipient, subject, jsonPayload);
    }

    private void executeResendRequest(String recipient, String subject, String jsonPayload) {
        try {
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            java.net.http.HttpResponse<String> resp = httpClient.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                logger.info("Notification email sent to {} via Resend", recipient);
            } else {
                logger.error("Resend API error for {}: {} — {}", recipient, resp.statusCode(), resp.body());
            }
        } catch (Exception ex) {
            logger.warn("Notification email failed for {}: {}", recipient, ex.getMessage());
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }

    private String buildApprovalEmailHtml(String firstName) {
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
                + "margin:0 auto 20px;font-size:32px;line-height:72px;text-align:center'>✅</div>"
                + "<h2 style='color:#0a1a3a;font-size:22px;margin:0 0 8px'>Account Approved</h2>"
                + "<p style='color:#5a6a8a;font-size:14px;line-height:1.6;margin:0 0 24px'>"
                + "Hi " + (firstName != null ? firstName : "there") + "! Your account has been successfully approved. You can now access resident services and request barangay documents.</p>"
                + "</td></tr>"
                + "<tr><td style='padding:24px 40px 32px;text-align:center'>"
                + "<p style='color:#5a6a8a;font-size:12px;margin:0'>If you did not request this, you can safely ignore this email.</p>"
                + "</td></tr>"
                + "<tr><td style='height:4px;background:linear-gradient(90deg,#0038A8 33%,#CE1126 33% 66%,#FCD116 66%)'></td></tr>"
                + "</table></td></tr></table></body></html>";
    }
}