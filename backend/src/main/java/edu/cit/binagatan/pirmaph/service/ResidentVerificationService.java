package edu.cit.binagatan.pirmaph.service;

import edu.cit.binagatan.pirmaph.dto.ResidentFileResponse;
import edu.cit.binagatan.pirmaph.dto.ResidentVerificationStatusResponse;
import edu.cit.binagatan.pirmaph.entity.*;
import edu.cit.binagatan.pirmaph.repository.ResidentFileRepository;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import edu.cit.binagatan.pirmaph.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class ResidentVerificationService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024L * 1024L;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResidentFileRepository residentFileRepository;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SecurityAuditService securityAuditService;

    @Transactional
    public ResidentFileResponse uploadResidentFile(AuthenticatedUser principal, ResidentFileCategory category, MultipartFile file) {
        User user = requireUser(principal.getId());
        ensureResidentUploadAllowed(user);
        validateFile(file, category);

        String bucket = supabaseStorageService.resolveBucket(category.name());
        String sanitizedFileName = sanitizeFileName(file.getOriginalFilename());
        String objectPath = user.getBarangayCode() + "/" + user.getId() + "/" + System.currentTimeMillis() + "_" + sanitizedFileName;

        try {
            supabaseStorageService.uploadPrivateObject(bucket, objectPath, file.getBytes(), file.getContentType());
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to upload file to secure storage: " + ex.getMessage(), ex);
        }

        ResidentFile residentFile = new ResidentFile();
        residentFile.setUserId(user.getId());
        residentFile.setBarangayCode(user.getBarangayCode());
        residentFile.setCategory(category);
        residentFile.setBucket(bucket);
        residentFile.setObjectPath(objectPath);
        residentFile.setOriginalFileName(sanitizedFileName);
        residentFile.setContentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
        residentFile.setFileSize(file.getSize());
        residentFile.setUploadedAt(LocalDateTime.now());
        residentFileRepository.save(residentFile);

        securityAuditService.logRegistrationEvent(user.getEmail(), "file_uploaded:" + category.name());
        return ResidentFileResponse.from(residentFile, supabaseStorageService.createSignedUrl(bucket, objectPath, 600));
    }

    public ResidentVerificationStatusResponse getResidentVerificationStatus(AuthenticatedUser principal) {
        User user = requireUser(principal.getId());
        List<ResidentFile> files = residentFileRepository.findByUserIdOrderByUploadedAtDesc(user.getId());

        ResidentVerificationStatusResponse response = new ResidentVerificationStatusResponse();
        response.setUserId(user.getId());
        response.setBarangayCode(user.getBarangayCode());
        response.setStatus(user.getStatus());
        response.setFileCount(files.size());
        response.setFiles(files.stream()
                .map(file -> ResidentFileResponse.from(file, supabaseStorageService.createSignedUrl(file.getBucket(), file.getObjectPath(), 600)))
                .toList());
        return response;
    }

    public List<User> getPendingResidentsForBarangay(AuthenticatedUser principal) {
        User admin = requireUser(principal.getId());
        if (admin.getRole() != UserRole.BARANGAY_ADMIN && admin.getRole() != UserRole.SUPER_ADMIN) {
            throw new AccessDeniedException("Only admin roles can review residents");
        }

        if (admin.getRole() == UserRole.SUPER_ADMIN) {
            return userRepository.findByRoleAndStatusOrderByCreatedAtAsc(UserRole.RESIDENT, UserStatus.PENDING_VERIFICATION);
        }

        return userRepository.findByRoleAndStatusAndBarangayCodeOrderByCreatedAtAsc(
                UserRole.RESIDENT,
                UserStatus.PENDING_VERIFICATION,
                admin.getBarangayCode()
        );
    }

    @Transactional
    public User reviewResident(AuthenticatedUser principal, UUID residentUserId, UserStatus decision) {
        if (decision != UserStatus.APPROVED && decision != UserStatus.REJECTED) {
            throw new IllegalArgumentException("Decision must be APPROVED or REJECTED");
        }

        User reviewer = requireUser(principal.getId());
        User resident = requireUser(residentUserId);

        if (resident.getRole() != UserRole.RESIDENT) {
            throw new IllegalArgumentException("Target account is not a resident");
        }

        if (reviewer.getRole() != UserRole.BARANGAY_ADMIN && reviewer.getRole() != UserRole.SUPER_ADMIN) {
            throw new AccessDeniedException("Only admin roles can review residents");
        }

        if (reviewer.getRole() == UserRole.BARANGAY_ADMIN && !safeEquals(reviewer.getBarangayCode(), resident.getBarangayCode())) {
            throw new AccessDeniedException("Barangay admins can only review residents in the same barangay");
        }

        resident.setStatus(decision);
        User updated = userRepository.save(resident);
        notificationService.sendStatusUpdate(updated, decision);
        securityAuditService.logRegistrationEvent(updated.getEmail(), "status_changed_to:" + decision.name());
        return updated;
    }

    public List<ResidentFileResponse> getResidentFilesForAdminReview(AuthenticatedUser principal, UUID residentUserId) {
        User reviewer = requireUser(principal.getId());
        User resident = requireUser(residentUserId);

        boolean isOwner = reviewer.getId().equals(resident.getId());
        boolean isAdmin = reviewer.getRole() == UserRole.BARANGAY_ADMIN || reviewer.getRole() == UserRole.SUPER_ADMIN;
        boolean sameBarangay = safeEquals(reviewer.getBarangayCode(), resident.getBarangayCode());

        if (!(isOwner || (isAdmin && (reviewer.getRole() == UserRole.SUPER_ADMIN || sameBarangay)))) {
            throw new AccessDeniedException("You are not authorized to access these files");
        }

        return residentFileRepository.findByUserIdOrderByUploadedAtDesc(residentUserId)
                .stream()
                .map(file -> ResidentFileResponse.from(file, supabaseStorageService.createSignedUrl(file.getBucket(), file.getObjectPath(), 600)))
                .toList();
    }

    private void validateFile(MultipartFile file, ResidentFileCategory category) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds maximum size of 10 MB");
        }

        String rawContentType = file.getContentType();
        String contentType = rawContentType == null ? "" : rawContentType.toLowerCase(Locale.ROOT);
        boolean isImage = contentType.equals("image/jpeg") || contentType.equals("image/jpg") || contentType.equals("image/png");
        boolean isPdf = contentType.equals("application/pdf");

        if (category == ResidentFileCategory.PROFILE_PHOTO && !isImage) {
            throw new IllegalArgumentException("Profile photo must be JPG, JPEG, or PNG");
        }

        if (category != ResidentFileCategory.PROFILE_PHOTO && !(isImage || isPdf)) {
            throw new IllegalArgumentException("Supporting documents must be JPG, JPEG, PNG, or PDF");
        }
    }

    private void ensureResidentUploadAllowed(User user) {
        if (user.getRole() != UserRole.RESIDENT) {
            throw new AccessDeniedException("Only residents can upload onboarding files");
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new AccessDeniedException("Suspended accounts cannot upload files");
        }
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private String sanitizeFileName(String fileName) {
        String fallback = fileName == null || fileName.isBlank() ? "upload.bin" : fileName;
        return fallback.replaceAll("[^a-zA-Z0-9._-]", "_");
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
}