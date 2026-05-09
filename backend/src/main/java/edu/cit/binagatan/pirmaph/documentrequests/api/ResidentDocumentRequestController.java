package edu.cit.binagatan.pirmaph.documentrequests.api;

import edu.cit.binagatan.pirmaph.documentrequests.dto.CreateDocumentRequestRequest;
import edu.cit.binagatan.pirmaph.documentrequests.dto.DocumentRequestResponse;
import edu.cit.binagatan.pirmaph.documentrequests.dto.DocumentRequestFileResponse;
import edu.cit.binagatan.pirmaph.shared.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.documentrequests.application.DocumentRequestService;
import edu.cit.binagatan.pirmaph.documentrequests.facade.DocumentRequestFacade;
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
@RequestMapping("/api/requests/resident")
public class ResidentDocumentRequestController {

    @Autowired
    private DocumentRequestService documentRequestService;

    @Autowired
    private DocumentRequestFacade documentRequestFacade;

    @PostMapping
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<DocumentRequestResponse> submitRequest(@Valid @RequestBody CreateDocumentRequestRequest request) {
        return ResponseEntity.ok(documentRequestFacade.submitRequest(request));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<List<DocumentRequestResponse>> getMyRequests() {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.getResidentRequestHistory(principal));
    }

    @GetMapping("/{requestId}")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<DocumentRequestResponse> getMyRequestById(@PathVariable UUID requestId) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.getResidentRequestById(principal, requestId));
    }

    @PostMapping("/{requestId}/attachments")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<DocumentRequestFileResponse> uploadAttachment(
            @PathVariable UUID requestId,
            @RequestParam("file") MultipartFile file
    ) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(documentRequestService.uploadResidentAttachment(principal, requestId, file));
    }
}
