package edu.cit.binagatan.pirmaph.verification.api;

import edu.cit.binagatan.pirmaph.verification.dto.ResidentFileResponse;
import edu.cit.binagatan.pirmaph.verification.dto.ResidentVerificationStatusResponse;
import edu.cit.binagatan.pirmaph.shared.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.verification.application.ResidentVerificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/officer")
public class OfficerVerificationController {

    @Autowired
    private ResidentVerificationService residentVerificationService;

    @GetMapping("/verification-status")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<ResidentVerificationStatusResponse> getMyVerificationStatus() {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.getOfficerVerificationStatus(principal));
    }

    @PostMapping("/files/upload")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<ResidentFileResponse> uploadAppointmentProof(@RequestParam("file") MultipartFile file) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.uploadOfficerAppointmentProof(principal, file));
    }

    @GetMapping("/files")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<List<ResidentFileResponse>> getMyFiles() {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.getResidentFilesForAdminReview(principal, principal.getId()));
    }
}
