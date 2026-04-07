package edu.cit.binagatan.pirmaph.controller;

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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests/admin")
public class AdminDocumentRequestController {

    @Autowired
    private DocumentRequestService documentRequestService;

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<DocumentRequestResponse>> getQueue(@RequestParam(required = false) DocumentRequestStatus status) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.getAdminMonitorQueue(principal, status));
    }

    @PatchMapping("/{requestId}/status")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<DocumentRequestResponse> overrideStatus(
            @PathVariable UUID requestId,
            @Valid @RequestBody UpdateDocumentRequestStatusRequest updateRequest
    ) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.overrideStatusAsAdmin(principal, requestId, updateRequest));
    }
}
