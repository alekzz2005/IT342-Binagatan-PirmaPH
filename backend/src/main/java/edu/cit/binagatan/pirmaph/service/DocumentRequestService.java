package edu.cit.binagatan.pirmaph.service;

import edu.cit.binagatan.pirmaph.dto.CreateDocumentRequestRequest;
import edu.cit.binagatan.pirmaph.dto.DocumentRequestFileResponse;
import edu.cit.binagatan.pirmaph.dto.DocumentRequestResponse;
import edu.cit.binagatan.pirmaph.dto.UpdateDocumentRequestStatusRequest;
import edu.cit.binagatan.pirmaph.entity.*;
import edu.cit.binagatan.pirmaph.repository.DocumentRequestFileRepository;
import edu.cit.binagatan.pirmaph.repository.DocumentRequestRepository;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import edu.cit.binagatan.pirmaph.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class DocumentRequestService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024L * 1024L;

    @Autowired
    private DocumentRequestRepository documentRequestRepository;

    @Autowired
    private DocumentRequestFileRepository documentRequestFileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private SecurityAuditService securityAuditService;

    @Autowired
    private NotificationService notificationService;

    @Transactional
    public DocumentRequestResponse submitRequest(AuthenticatedUser principal, CreateDocumentRequestRequest request) {
        User resident = requireApprovedRole(principal.getId(), UserRole.RESIDENT);

        DocumentRequest documentRequest = new DocumentRequest();
        documentRequest.setResidentUserId(resident.getId());
        documentRequest.setBarangayCode(resident.getBarangayCode());
        documentRequest.setDocumentType(request.getDocumentType());
        documentRequest.setPurpose(request.getPurpose().trim());
        documentRequest.setAdditionalDetails(trimToNull(request.getAdditionalDetails()));
        documentRequest.setCopies(request.getCopies());
        documentRequest.setStatus(DocumentRequestStatus.SUBMITTED);
        documentRequest.setLastUpdatedByUserId(resident.getId());

        DocumentRequest saved = documentRequestRepository.save(documentRequest);
        auditRequestAction(resident, "request_submitted", saved.getId());
        notificationService.sendDocumentRequestSubmitted(resident, saved.getId(), saved.getDocumentType().name());
        return toResponse(saved);
    }

    @Transactional
    public DocumentRequestFileResponse uploadResidentAttachment(AuthenticatedUser principal, UUID requestId, MultipartFile file) {
        User resident = requireApprovedRole(principal.getId(), UserRole.RESIDENT);
        DocumentRequest request = requireRequest(requestId);

        if (!request.getResidentUserId().equals(resident.getId())) {
            throw new AccessDeniedException("You can only upload files for your own requests");
        }

        if (request.getStatus() != DocumentRequestStatus.SUBMITTED && request.getStatus() != DocumentRequestStatus.UNDER_REVIEW) {
            throw new IllegalArgumentException("Files can only be uploaded while request is submitted or under review");
        }

        DocumentRequestFile uploaded = uploadFile(request, resident, file, DocumentFileType.SUPPORTING_ATTACHMENT);
        auditRequestAction(resident, "supporting_file_uploaded", request.getId());
        return toFileResponse(uploaded);
    }

    public List<DocumentRequestResponse> getResidentRequestHistory(AuthenticatedUser principal) {
        User resident = requireApprovedRole(principal.getId(), UserRole.RESIDENT);
        return documentRequestRepository.findByResidentUserIdOrderByRequestTimestampDesc(resident.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public DocumentRequestResponse getResidentRequestById(AuthenticatedUser principal, UUID requestId) {
        User resident = requireApprovedRole(principal.getId(), UserRole.RESIDENT);
        DocumentRequest request = requireRequest(requestId);

        if (!request.getResidentUserId().equals(resident.getId())) {
            throw new AccessDeniedException("You can only access your own requests");
        }

        return toResponse(request);
    }

    public List<DocumentRequestResponse> getOfficerQueue(AuthenticatedUser principal, DocumentRequestStatus status) {
        User officer = requireApprovedRole(principal.getId(), UserRole.OFFICER);

        List<DocumentRequest> requests;
        if (status == null) {
            requests = documentRequestRepository.findByBarangayCodeOrderByRequestTimestampDesc(officer.getBarangayCode());
        } else {
            requests = documentRequestRepository.findByBarangayCodeAndStatusOrderByRequestTimestampAsc(officer.getBarangayCode(), status);
        }

        return requests.stream().map(this::toResponse).toList();
    }

    public DocumentRequestResponse getOfficerRequestById(AuthenticatedUser principal, UUID requestId) {
        User officer = requireApprovedRole(principal.getId(), UserRole.OFFICER);
        DocumentRequest request = requireRequest(requestId);
        ensureSameBarangay(officer, request);
        return toResponse(request);
    }

    @Transactional
    public DocumentRequestResponse updateRequestStatusByOfficer(AuthenticatedUser principal, UUID requestId, UpdateDocumentRequestStatusRequest updateRequest) {
        User officer = requireApprovedRole(principal.getId(), UserRole.OFFICER);
        DocumentRequest request = requireRequest(requestId);
        ensureSameBarangay(officer, request);

        DocumentRequestStatus next = updateRequest.getStatus();
        validateOfficerStatusUpdate(next, updateRequest.getRemarks());
        validateTransition(request.getStatus(), next);

        request.setStatus(next);
        request.setOfficerRemarks(trimToNull(updateRequest.getRemarks()));
        request.setAssignedOfficerUserId(officer.getId());
        request.setLastUpdatedByUserId(officer.getId());

        DocumentRequest saved = documentRequestRepository.save(request);
        User resident = requireUser(saved.getResidentUserId());
        notificationService.sendDocumentRequestStatusUpdate(resident, saved.getId(), saved.getStatus().name());
        auditRequestAction(officer, "status_updated_to_" + saved.getStatus().name().toLowerCase(Locale.ROOT), saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public DocumentRequestFileResponse uploadGeneratedDocument(AuthenticatedUser principal, UUID requestId, MultipartFile file) {
        User officer = requireApprovedRole(principal.getId(), UserRole.OFFICER);
        DocumentRequest request = requireRequest(requestId);
        ensureSameBarangay(officer, request);

        if (request.getStatus() != DocumentRequestStatus.APPROVED && request.getStatus() != DocumentRequestStatus.UNDER_REVIEW) {
            throw new IllegalArgumentException("Generated documents can only be uploaded when request is under review or approved");
        }

        DocumentRequestFile uploaded = uploadFile(request, officer, file, DocumentFileType.GENERATED_DOCUMENT);
        auditRequestAction(officer, "generated_document_uploaded", request.getId());
        return toFileResponse(uploaded);
    }

    public List<DocumentRequestResponse> getAdminMonitorQueue(AuthenticatedUser principal, DocumentRequestStatus status) {
        User admin = requireUser(principal.getId());
        if (admin.getStatus() != UserStatus.APPROVED) {
            throw new AccessDeniedException("Only approved accounts can monitor requests");
        }

        if (admin.getRole() != UserRole.BARANGAY_ADMIN && admin.getRole() != UserRole.SUPER_ADMIN) {
            throw new AccessDeniedException("Only admin roles can monitor requests");
        }

        List<DocumentRequest> requests;
        if (admin.getRole() == UserRole.SUPER_ADMIN) {
            requests = status == null
                    ? documentRequestRepository.findAll().stream().sorted((a, b) -> b.getRequestTimestamp().compareTo(a.getRequestTimestamp())).toList()
                    : documentRequestRepository.findByStatusOrderByRequestTimestampAsc(status);
        } else {
            requests = status == null
                    ? documentRequestRepository.findByBarangayCodeOrderByRequestTimestampDesc(admin.getBarangayCode())
                    : documentRequestRepository.findByBarangayCodeAndStatusOrderByRequestTimestampAsc(admin.getBarangayCode(), status);
        }

        return requests.stream().map(this::toResponse).toList();
    }

    @Transactional
    public DocumentRequestResponse overrideStatusAsAdmin(AuthenticatedUser principal, UUID requestId, UpdateDocumentRequestStatusRequest updateRequest) {
        User admin = requireUser(principal.getId());
        if (admin.getStatus() != UserStatus.APPROVED) {
            throw new AccessDeniedException("Only approved accounts can override request status");
        }
        if (admin.getRole() != UserRole.BARANGAY_ADMIN && admin.getRole() != UserRole.SUPER_ADMIN) {
            throw new AccessDeniedException("Only admin roles can override request status");
        }

        DocumentRequest request = requireRequest(requestId);
        if (admin.getRole() == UserRole.BARANGAY_ADMIN && !safeEquals(admin.getBarangayCode(), request.getBarangayCode())) {
            throw new AccessDeniedException("Barangay admins can only override requests in their barangay");
        }

        request.setStatus(updateRequest.getStatus());
        request.setOfficerRemarks(trimToNull(updateRequest.getRemarks()));
        request.setLastUpdatedByUserId(admin.getId());

        DocumentRequest saved = documentRequestRepository.save(request);
        User resident = requireUser(saved.getResidentUserId());
        notificationService.sendDocumentRequestStatusUpdate(resident, saved.getId(), saved.getStatus().name());
        auditRequestAction(admin, "admin_override_status_to_" + saved.getStatus().name().toLowerCase(Locale.ROOT), saved.getId());
        return toResponse(saved);
    }

    private DocumentRequestResponse toResponse(DocumentRequest request) {
        List<DocumentRequestFileResponse> files = documentRequestFileRepository.findByRequestIdOrderByUploadedAtDesc(request.getId())
                .stream()
                .map(this::toFileResponse)
                .toList();
        return DocumentRequestResponse.from(request, files);
    }

    private DocumentRequestFileResponse toFileResponse(DocumentRequestFile file) {
        String signedUrl = supabaseStorageService.createSignedUrl(file.getBucket(), file.getObjectPath(), 600);
        return DocumentRequestFileResponse.from(file, signedUrl);
    }

    private DocumentRequestFile uploadFile(DocumentRequest request, User actor, MultipartFile file, DocumentFileType fileType) {
        validateFile(file);

        String bucket = "documents";
        String objectPath = request.getBarangayCode() + "/"
                + request.getResidentUserId() + "/"
                + request.getId() + "/"
                + System.currentTimeMillis() + "_" + sanitizeFileName(file.getOriginalFilename());

        try {
            supabaseStorageService.uploadPrivateObject(bucket, objectPath, file.getBytes(), file.getContentType());
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to upload file to secure storage: " + ex.getMessage(), ex);
        }

        DocumentRequestFile requestFile = new DocumentRequestFile();
        requestFile.setRequestId(request.getId());
        requestFile.setUploaderUserId(actor.getId());
        requestFile.setBarangayCode(request.getBarangayCode());
        requestFile.setFileType(fileType);
        requestFile.setBucket(bucket);
        requestFile.setObjectPath(objectPath);
        requestFile.setOriginalFileName(sanitizeFileName(file.getOriginalFilename()));
        requestFile.setContentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
        requestFile.setFileSize(file.getSize());
        return documentRequestFileRepository.save(requestFile);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds maximum size of 10 MB");
        }

        String rawContentType = file.getContentType();
        String contentType = rawContentType == null ? "" : rawContentType.toLowerCase(Locale.ROOT);
        boolean allowed = contentType.equals("application/pdf")
                || contentType.equals("image/jpeg")
                || contentType.equals("image/jpg")
                || contentType.equals("image/png");

        if (!allowed) {
            throw new IllegalArgumentException("Only PDF, JPG, JPEG, and PNG files are allowed");
        }
    }

    private User requireApprovedRole(UUID userId, UserRole role) {
        User user = requireUser(userId);
        if (user.getRole() != role) {
            throw new AccessDeniedException("Account does not have required role: " + role.name());
        }
        if (user.getStatus() != UserStatus.APPROVED) {
            throw new AccessDeniedException("Only approved accounts can perform this action");
        }
        return user;
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private DocumentRequest requireRequest(UUID requestId) {
        return documentRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));
    }

    private void ensureSameBarangay(User officer, DocumentRequest request) {
        if (!safeEquals(officer.getBarangayCode(), request.getBarangayCode())) {
            throw new AccessDeniedException("You can only access requests within your barangay");
        }
    }

    private void validateOfficerStatusUpdate(DocumentRequestStatus status, String remarks) {
        if (status == DocumentRequestStatus.PENDING_PAYMENT || status == DocumentRequestStatus.READY_FOR_RELEASE) {
            throw new IllegalArgumentException("Status is reserved for future sprint workflow");
        }

        if (status == DocumentRequestStatus.DECLINED && (remarks == null || remarks.isBlank())) {
            throw new IllegalArgumentException("Remarks are required when declining a request");
        }
    }

    private void validateTransition(DocumentRequestStatus current, DocumentRequestStatus next) {
        if (current == DocumentRequestStatus.SUBMITTED &&
                (next == DocumentRequestStatus.UNDER_REVIEW || next == DocumentRequestStatus.APPROVED || next == DocumentRequestStatus.DECLINED)) {
            return;
        }

        if (current == DocumentRequestStatus.UNDER_REVIEW &&
                (next == DocumentRequestStatus.APPROVED || next == DocumentRequestStatus.DECLINED)) {
            return;
        }

        if (current == next) {
            return;
        }

        throw new IllegalArgumentException("Invalid status transition from " + current.name() + " to " + next.name());
    }

    private void auditRequestAction(User actor, String action, UUID requestId) {
        securityAuditService.logDocumentRequestAction(
                actor.getId() == null ? "n/a" : actor.getId().toString(),
                actor.getRole() == null ? "n/a" : actor.getRole().name(),
                action,
                requestId == null ? "n/a" : requestId.toString()
        );
    }

    private boolean safeEquals(String a, String b) {
        if (a == null && b == null) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        return a.equals(b);
    }

    private String sanitizeFileName(String fileName) {
        String fallback = fileName == null || fileName.isBlank() ? "upload.bin" : fileName;
        return fallback.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}
