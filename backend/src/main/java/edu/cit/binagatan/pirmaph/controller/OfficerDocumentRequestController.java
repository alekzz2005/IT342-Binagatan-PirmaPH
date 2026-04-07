package edu.cit.binagatan.pirmaph.controller;

import edu.cit.binagatan.pirmaph.dto.DocumentRequestFileResponse;
import edu.cit.binagatan.pirmaph.dto.DocumentRequestResponse;
import edu.cit.binagatan.pirmaph.dto.UpdateDocumentRequestStatusRequest;
import edu.cit.binagatan.pirmaph.entity.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.service.DocumentRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests/officer")
public class OfficerDocumentRequestController {

    @Autowired
    private DocumentRequestService documentRequestService;

    @GetMapping("/queue")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<List<DocumentRequestResponse>> getQueue(@RequestParam(required = false) DocumentRequestStatus status) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.getOfficerQueue(principal, status));
    }

    @GetMapping("/{requestId}")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<DocumentRequestResponse> getById(@PathVariable UUID requestId) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.getOfficerRequestById(principal, requestId));
    }

    @PatchMapping("/{requestId}/status")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<DocumentRequestResponse> updateStatus(
            @PathVariable UUID requestId,
            @Valid @RequestBody UpdateDocumentRequestStatusRequest updateRequest
    ) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.updateRequestStatusByOfficer(principal, requestId, updateRequest));
    }

    @PostMapping("/{requestId}/generated-documents")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<DocumentRequestFileResponse> uploadGeneratedDocument(
            @PathVariable UUID requestId,
            @RequestParam("file") MultipartFile file
    ) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.uploadGeneratedDocument(principal, requestId, file));
    }
}
