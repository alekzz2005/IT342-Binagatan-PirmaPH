package edu.cit.binagatan.pirmaph.dto;

import edu.cit.binagatan.pirmaph.entity.ResidentFile;
import edu.cit.binagatan.pirmaph.entity.ResidentFileCategory;

import java.time.LocalDateTime;
import java.util.UUID;

public class ResidentFileResponse {

    private UUID id;
    private ResidentFileCategory category;
    private String originalFileName;
    private String contentType;
    private long fileSize;
    private LocalDateTime uploadedAt;
    private String signedUrl;

    public static ResidentFileResponse from(ResidentFile file, String signedUrl) {
        ResidentFileResponse response = new ResidentFileResponse();
        response.setId(file.getId());
        response.setCategory(file.getCategory());
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

    public ResidentFileCategory getCategory() {
        return category;
    }

    public void setCategory(ResidentFileCategory category) {
        this.category = category;
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