package edu.cit.binagatan.pirmaph.shared.infrastructure;

import edu.cit.binagatan.pirmaph.users.domain.User;
import edu.cit.binagatan.pirmaph.users.domain.UserStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@pirmaph.local}")
    private String senderEmail;

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
        String subject = "PirmaPH Registration Status Update";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + "Your verification status has been updated to: " + newStatus.name() + ".\n\n"
                + statusInstruction(newStatus);
        sendEmail(user.getEmail(), subject, body);
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
        if (mailSender == null) {
            logger.info("Mail sender not configured. Notification to {} | {} | {}", recipient, subject, body);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception ex) {
            // Non-blocking notification: registration/approval should proceed even if mail is down.
            logger.warn("Notification email failed for {}: {}", recipient, ex.getMessage());
            logger.info("Notification fallback log for {} | {} | {}", recipient, subject, body);
        }
    }
}