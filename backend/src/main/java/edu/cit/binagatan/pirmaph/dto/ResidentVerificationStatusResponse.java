package edu.cit.binagatan.pirmaph.dto;

import edu.cit.binagatan.pirmaph.entity.UserStatus;

import java.util.List;
import java.util.UUID;

public class ResidentVerificationStatusResponse {

    private UUID userId;
    private String barangayCode;
    private UserStatus status;
    private int fileCount;
    private List<ResidentFileResponse> files;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getBarangayCode() {
        return barangayCode;
    }

    public void setBarangayCode(String barangayCode) {
        this.barangayCode = barangayCode;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public int getFileCount() {
        return fileCount;
    }

    public void setFileCount(int fileCount) {
        this.fileCount = fileCount;
    }

    public List<ResidentFileResponse> getFiles() {
        return files;
    }

    public void setFiles(List<ResidentFileResponse> files) {
        this.files = files;
    }
}