package edu.cit.binagatan.pirmaph.service.observer;

import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.service.SecurityAuditService;
import org.springframework.stereotype.Component;

@Component
public class LoggingObserver implements RequestObserver {

    private final SecurityAuditService securityAuditService;

    public LoggingObserver(SecurityAuditService securityAuditService) {
        this.securityAuditService = securityAuditService;
    }

    @Override
    public void onStatusUpdated(RequestStatusEvent event) {
        User actor = event.getActor();
        String actorId = actor == null || actor.getId() == null ? "n/a" : actor.getId().toString();
        String actorRole = actor == null || actor.getRole() == null ? "n/a" : actor.getRole().name();
        securityAuditService.logDocumentRequestAction(
                actorId,
                actorRole,
                event.getAuditAction(),
                event.getRequestId() == null ? "n/a" : event.getRequestId().toString()
        );
    }
}
