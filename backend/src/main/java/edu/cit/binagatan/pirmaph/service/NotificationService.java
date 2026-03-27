package edu.cit.binagatan.pirmaph.service;

import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.entity.UserStatus;
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

    public void sendStatusUpdate(User user, UserStatus newStatus) {
        String subject = "PirmaPH Registration Status Update";
        String body = "Hello " + user.getFirstName() + ",\n\n"
                + "Your verification status has been updated to: " + newStatus.name() + ".\n\n"
                + statusInstruction(newStatus);
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