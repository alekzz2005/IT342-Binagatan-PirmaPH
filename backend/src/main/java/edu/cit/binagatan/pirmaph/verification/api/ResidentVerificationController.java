package edu.cit.binagatan.pirmaph.verification.api;

import edu.cit.binagatan.pirmaph.verification.dto.ResidentFileResponse;
import edu.cit.binagatan.pirmaph.verification.dto.ResidentVerificationStatusResponse;
import edu.cit.binagatan.pirmaph.verification.domain.ResidentFileCategory;
import edu.cit.binagatan.pirmaph.shared.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.verification.application.ResidentVerificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/resident")
public class ResidentVerificationController {

    @Autowired
    private ResidentVerificationService residentVerificationService;

    @GetMapping("/verification-status")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ResidentVerificationStatusResponse> getMyVerificationStatus() {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.getResidentVerificationStatus(principal));
    }

    @PostMapping("/files/upload")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ResidentFileResponse> uploadFile(
            @RequestParam("category") ResidentFileCategory category,
            @RequestParam("file") MultipartFile file
    ) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.uploadResidentFile(principal, category, file));
    }

    @GetMapping("/files")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<List<ResidentFileResponse>> getMyFiles() {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.getResidentFilesForAdminReview(principal, principal.getId()));
    }

    @GetMapping("/files/{residentUserId}")
    @PreAuthorize("hasAnyRole('RESIDENT','OFFICER','BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<ResidentFileResponse>> getResidentFilesForReview(@PathVariable UUID residentUserId) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.getResidentFilesForAdminReview(principal, residentUserId));
    }
}