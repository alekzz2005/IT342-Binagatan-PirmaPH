package edu.cit.binagatan.pirmaph.dto;

import edu.cit.binagatan.pirmaph.entity.DocumentRequestStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UpdateDocumentRequestStatusRequest {

    @NotNull(message = "Status is required")
    private DocumentRequestStatus status;

    @Size(max = 800)
    private String remarks;

    public DocumentRequestStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentRequestStatus status) {
        this.status = status;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
