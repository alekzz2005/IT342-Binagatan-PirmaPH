package edu.cit.binagatan.pirmaph.documentrequests.dto;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentType;
import edu.cit.binagatan.pirmaph.payment.dto.PaymentInfoResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DocumentRequestResponse {

    private UUID id;
    private UUID residentUserId;
    private String residentFullName;
    private String residentEmail;
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
    /** Most recent payment for this request. May be null if no payment initiated. */
    private PaymentInfoResponse paymentInfo;
    /** Amount due in PHP, computed server-side. */
    private BigDecimal amountDue;

    public static DocumentRequestResponse from(DocumentRequest request, List<DocumentRequestFileResponse> files, PaymentInfoResponse paymentInfo) {
        return from(request, files, paymentInfo, null, null);
    }

    public static DocumentRequestResponse from(DocumentRequest request, List<DocumentRequestFileResponse> files, PaymentInfoResponse paymentInfo, String residentFullName, String residentEmail) {
        DocumentRequestResponse response = new DocumentRequestResponse();
        response.setId(request.getId());
        response.setResidentUserId(request.getResidentUserId());
        response.setResidentFullName(residentFullName);
        response.setResidentEmail(residentEmail);
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
        response.setPaymentInfo(paymentInfo);
        if (paymentInfo != null) {
            response.setAmountDue(paymentInfo.getAmount());
        }
        return response;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getResidentFullName() {
        return residentFullName;
    }

    public void setResidentFullName(String residentFullName) {
        this.residentFullName = residentFullName;
    }

    public String getResidentEmail() {
        return residentEmail;
    }

    public void setResidentEmail(String residentEmail) {
        this.residentEmail = residentEmail;
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

    public PaymentInfoResponse getPaymentInfo() {
        return paymentInfo;
    }

    public void setPaymentInfo(PaymentInfoResponse paymentInfo) {
        this.paymentInfo = paymentInfo;
    }

    public BigDecimal getAmountDue() {
        return amountDue;
    }

    public void setAmountDue(BigDecimal amountDue) {
        this.amountDue = amountDue;
    }
}
