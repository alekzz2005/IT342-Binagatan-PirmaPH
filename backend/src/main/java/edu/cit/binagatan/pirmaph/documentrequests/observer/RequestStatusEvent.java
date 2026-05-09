package edu.cit.binagatan.pirmaph.documentrequests.observer;

import edu.cit.binagatan.pirmaph.users.domain.User;

import java.util.UUID;

public class RequestStatusEvent {

    private final UUID requestId;
    private final String status;
    private final User actor;
    private final User resident;
    private final String auditAction;

    public RequestStatusEvent(UUID requestId, String status, User actor, User resident, String auditAction) {
        this.requestId = requestId;
        this.status = status;
        this.actor = actor;
        this.resident = resident;
        this.auditAction = auditAction;
    }

    public UUID getRequestId() {
        return requestId;
    }

    public String getStatus() {
        return status;
    }

    public User getActor() {
        return actor;
    }

    public User getResident() {
        return resident;
    }

    public String getAuditAction() {
        return auditAction;
    }
}
