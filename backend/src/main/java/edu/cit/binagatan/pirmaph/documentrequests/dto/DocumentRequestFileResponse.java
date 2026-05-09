package edu.cit.binagatan.pirmaph.documentrequests.dto;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentFileType;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequestFile;

import java.time.LocalDateTime;
import java.util.UUID;

public class DocumentRequestFileResponse {

    private UUID id;
    private DocumentFileType fileType;
    private String originalFileName;
    private String contentType;
    private long fileSize;
    private LocalDateTime uploadedAt;
    private String signedUrl;

    public static DocumentRequestFileResponse from(DocumentRequestFile file, String signedUrl) {
        DocumentRequestFileResponse response = new DocumentRequestFileResponse();
        response.setId(file.getId());
        response.setFileType(file.getFileType());
        response.setOriginalFileName(file.getOriginalFileName());
        response.setContentType(file.getContentType());
        response.setFileSize(file.getFileSize());
        response.setUploadedAt(file.getUploadedAt());
        response.setSignedUrl(signedUrl);
        return response;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public DocumentFileType getFileType() {
        return fileType;
    }

    public void setFileType(DocumentFileType fileType) {
        this.fileType = fileType;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public String getSignedUrl() {
        return signedUrl;
    }

    public void setSignedUrl(String signedUrl) {
        this.signedUrl = signedUrl;
    }
}
