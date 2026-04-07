package edu.cit.binagatan.pirmaph.dto;

import edu.cit.binagatan.pirmaph.entity.DocumentRequest;
import edu.cit.binagatan.pirmaph.entity.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.entity.DocumentType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DocumentRequestResponse {

    private UUID id;
    private UUID residentUserId;
    private UUID assignedOfficerUserId;
    private String barangayCode;
    private DocumentType documentType;
    private String purpose;
    private String additionalDetails;
    private Integer copies;
    private DocumentRequestStatus status;
    private String officerRemarks;
    private LocalDateTime requestTimestamp;
    private LocalDateTime updatedAt;
    private List<DocumentRequestFileResponse> files;

    public static DocumentRequestResponse from(DocumentRequest request, List<DocumentRequestFileResponse> files) {
        DocumentRequestResponse response = new DocumentRequestResponse();
        response.setId(request.getId());
        response.setResidentUserId(request.getResidentUserId());
        response.setAssignedOfficerUserId(request.getAssignedOfficerUserId());
        response.setBarangayCode(request.getBarangayCode());
        response.setDocumentType(request.getDocumentType());
        response.setPurpose(request.getPurpose());
        response.setAdditionalDetails(request.getAdditionalDetails());
        response.setCopies(request.getCopies());
        response.setStatus(request.getStatus());
        response.setOfficerRemarks(request.getOfficerRemarks());
        response.setRequestTimestamp(request.getRequestTimestamp());
        response.setUpdatedAt(request.getUpdatedAt());
        response.setFiles(files);
        return response;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getResidentUserId() {
        return residentUserId;
    }

    public void setResidentUserId(UUID residentUserId) {
        this.residentUserId = residentUserId;
    }

    public UUID getAssignedOfficerUserId() {
        return assignedOfficerUserId;
    }

    public void setAssignedOfficerUserId(UUID assignedOfficerUserId) {
        this.assignedOfficerUserId = assignedOfficerUserId;
    }

    public String getBarangayCode() {
        return barangayCode;
    }

    public void setBarangayCode(String barangayCode) {
        this.barangayCode = barangayCode;
    }

    public DocumentType getDocumentType() {
        return documentType;
    }

    public void setDocumentType(DocumentType documentType) {
        this.documentType = documentType;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public String getAdditionalDetails() {
        return additionalDetails;
    }

    public void setAdditionalDetails(String additionalDetails) {
        this.additionalDetails = additionalDetails;
    }

    public Integer getCopies() {
        return copies;
    }

    public void setCopies(Integer copies) {
        this.copies = copies;
    }

    public DocumentRequestStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentRequestStatus status) {
        this.status = status;
    }

    public String getOfficerRemarks() {
        return officerRemarks;
    }

    public void setOfficerRemarks(String officerRemarks) {
        this.officerRemarks = officerRemarks;
    }

    public LocalDateTime getRequestTimestamp() {
        return requestTimestamp;
    }

    public void setRequestTimestamp(LocalDateTime requestTimestamp) {
        this.requestTimestamp = requestTimestamp;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<DocumentRequestFileResponse> getFiles() {
        return files;
    }

    public void setFiles(List<DocumentRequestFileResponse> files) {
        this.files = files;
    }
}
