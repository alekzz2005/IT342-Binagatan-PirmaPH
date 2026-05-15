package edu.cit.binagatan.pirmaph.payment.dto;

import java.util.UUID;

public class CreateCheckoutRequest {

    private UUID requestId;

    public UUID getRequestId() { return requestId; }
    public void setRequestId(UUID requestId) { this.requestId = requestId; }
}
