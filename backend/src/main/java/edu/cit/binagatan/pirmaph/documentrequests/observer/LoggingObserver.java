package edu.cit.binagatan.pirmaph.documentrequests.observer;

import edu.cit.binagatan.pirmaph.users.domain.User;
import edu.cit.binagatan.pirmaph.shared.infrastructure.SecurityAuditService;
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
