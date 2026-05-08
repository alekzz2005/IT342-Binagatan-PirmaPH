package edu.cit.binagatan.pirmaph.controller;

import edu.cit.binagatan.pirmaph.dto.CreateBarangayAdminRequest;
import edu.cit.binagatan.pirmaph.dto.UpdateUserRoleRequest;
import edu.cit.binagatan.pirmaph.dto.UpdateUserStatusRequest;
import edu.cit.binagatan.pirmaph.dto.DocumentRequestResponse;
import edu.cit.binagatan.pirmaph.entity.UserStatus;
import edu.cit.binagatan.pirmaph.entity.UserRole;
import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import edu.cit.binagatan.pirmaph.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.service.NotificationService;
import edu.cit.binagatan.pirmaph.service.DocumentRequestService;
import edu.cit.binagatan.pirmaph.service.ResidentVerificationService;
import edu.cit.binagatan.pirmaph.service.SecurityAuditService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResidentVerificationService residentVerificationService;

    @Autowired
    private DocumentRequestService documentRequestService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SecurityAuditService securityAuditService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PatchMapping("/users/{userId}/status")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable UUID userId, @Valid @RequestBody UpdateUserStatusRequest request) {
        AuthenticatedUser principal = currentPrincipal();
        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        validateBarangayScope(actor, user);

        UserStatus previousStatus = user.getStatus();

        user.setStatus(request.getStatus());
        User saved = userRepository.save(user);
        notificationService.sendStatusUpdate(saved, saved.getStatus());
        if (saved.getStatus() == UserStatus.SUSPENDED || previousStatus == UserStatus.SUSPENDED) {
            notificationService.sendSuspensionUpdate(saved, saved.getStatus() == UserStatus.SUSPENDED);
        }
        securityAuditService.logRegistrationEvent(saved.getEmail(), "status_updated_by_admin:" + saved.getStatus().name());
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/users/{userId}/role")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> updateRole(@PathVariable UUID userId, @Valid @RequestBody UpdateUserRoleRequest request) {
        AuthenticatedUser principal = currentPrincipal();
        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (actor.getId().equals(user.getId())) {
            throw new IllegalArgumentException("Super admin cannot change own role");
        }

        if (actor.getRole() == UserRole.BARANGAY_ADMIN) {
            validateBarangayScope(actor, user);

            if (user.getRole() == UserRole.BARANGAY_ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
                throw new IllegalArgumentException("Barangay admins cannot change admin-level accounts");
            }

            if (request.getRole() == UserRole.BARANGAY_ADMIN || request.getRole() == UserRole.SUPER_ADMIN) {
                throw new IllegalArgumentException("Barangay admins can only assign resident or officer roles");
            }
        }

        UserRole previousRole = user.getRole();

        user.setRole(request.getRole());
        User saved = userRepository.save(user);
        notificationService.sendRoleUpdated(saved);
        securityAuditService.logRoleChange(actor.getEmail(), saved.getEmail(), previousRole.name(), saved.getRole().name());
        return ResponseEntity.ok(saved);
    }

        @GetMapping("/dashboard")
        @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
        public ResponseEntity<Map<String, Object>> getDashboardOverview() {
        AuthenticatedUser principal = currentPrincipal();
        User actor = userRepository.findById(principal.getId())
            .orElseThrow(() -> new IllegalArgumentException("Actor not found"));

        List<User> residents = actor.getRole() == UserRole.SUPER_ADMIN
            ? userRepository.findByRoleOrderByCreatedAtAsc(UserRole.RESIDENT)
            : userRepository.findByRoleAndBarangayCodeOrderByCreatedAtAsc(UserRole.RESIDENT, actor.getBarangayCode());

        List<User> officers = actor.getRole() == UserRole.SUPER_ADMIN
            ? userRepository.findByRoleOrderByCreatedAtAsc(UserRole.OFFICER)
            : userRepository.findByRoleAndBarangayCodeOrderByCreatedAtAsc(UserRole.OFFICER, actor.getBarangayCode());

        List<User> pendingResidents = residentVerificationService.getPendingResidentsForBarangay(principal);
        List<User> pendingOfficers = residentVerificationService.getPendingOfficersForBarangay(principal);
        List<DocumentRequestResponse> requests = documentRequestService.getAdminMonitorQueue(principal, null);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("scope", buildScope(actor));
        response.put("stats", buildStats(residents, officers, pendingResidents, pendingOfficers, requests));
        response.put("pendingResidents", pendingResidents.stream().map(this::toUserSummary).limit(5).toList());
        response.put("pendingOfficers", pendingOfficers.stream().map(this::toUserSummary).limit(5).toList());
        response.put("officers", officers.stream().map(this::toUserSummary).limit(5).toList());
        response.put("requests", requests.stream().limit(6).map(this::toRequestSummary).toList());
        response.put("activity", buildActivityFeed(pendingResidents, pendingOfficers, officers, requests));

        return ResponseEntity.ok(response);
        }

    @GetMapping("/residents/pending")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<User>> getPendingResidents() {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.getPendingResidentsForBarangay(principal));
    }

    @PatchMapping("/residents/{userId}/approve")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> approveResident(@PathVariable UUID userId) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.reviewResident(principal, userId, UserStatus.APPROVED));
    }

    @PatchMapping("/residents/{userId}/reject")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> rejectResident(@PathVariable UUID userId) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(residentVerificationService.reviewResident(principal, userId, UserStatus.REJECTED));
    }

    @GetMapping("/officers/pending")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<User>> getPendingOfficers() {
        AuthenticatedUser principal = currentPrincipal();
        return ResponseEntity.ok(residentVerificationService.getPendingOfficersForBarangay(principal));
    }

    @PatchMapping("/officers/{userId}/approve")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> approveOfficer(@PathVariable UUID userId) {
        AuthenticatedUser principal = currentPrincipal();
        return ResponseEntity.ok(residentVerificationService.reviewOfficer(principal, userId, UserStatus.APPROVED));
    }

    @PatchMapping("/officers/{userId}/reject")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> rejectOfficer(@PathVariable UUID userId) {
        AuthenticatedUser principal = currentPrincipal();
        return ResponseEntity.ok(residentVerificationService.reviewOfficer(principal, userId, UserStatus.REJECTED));
    }

    @GetMapping("/officers")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<User>> getOfficers() {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));

        if (actor.getRole() == UserRole.SUPER_ADMIN) {
            return ResponseEntity.ok(userRepository.findByRoleOrderByCreatedAtAsc(UserRole.OFFICER));
        }

        return ResponseEntity.ok(userRepository.findByRoleAndBarangayCodeOrderByCreatedAtAsc(UserRole.OFFICER, actor.getBarangayCode()));
    }

    @GetMapping("/residents")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<User>> getResidents() {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));

        if (actor.getRole() == UserRole.SUPER_ADMIN) {
            return ResponseEntity.ok(userRepository.findByRoleOrderByCreatedAtAsc(UserRole.RESIDENT));
        }

        return ResponseEntity.ok(userRepository.findByRoleAndBarangayCodeOrderByCreatedAtAsc(UserRole.RESIDENT, actor.getBarangayCode()));
    }

    @PatchMapping("/users/{userId}/suspend")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> suspendUser(@PathVariable UUID userId) {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (actor.getId().equals(target.getId())) {
            throw new IllegalArgumentException("You cannot suspend your own account");
        }
        validateBarangayScope(actor, target);

        target.setStatus(UserStatus.SUSPENDED);
        User saved = userRepository.save(target);
        notificationService.sendSuspensionUpdate(saved, true);
        securityAuditService.logSuspensionAction(actor.getEmail(), saved.getEmail(), "suspend");
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/users/{userId}/reinstate")
    @PreAuthorize("hasAnyRole('BARANGAY_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<User> reinstateUser(@PathVariable UUID userId) {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        validateBarangayScope(actor, target);

        UserStatus reinstatedStatus = target.getRole() == UserRole.OFFICER ? UserStatus.PENDING_VERIFICATION : UserStatus.APPROVED;
        target.setStatus(reinstatedStatus);
        User saved = userRepository.save(target);
        notificationService.sendSuspensionUpdate(saved, false);
        securityAuditService.logSuspensionAction(actor.getEmail(), saved.getEmail(), "reinstate_to_" + reinstatedStatus.name().toLowerCase());
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/barangay-admins")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> createBarangayAdmin(@Valid @RequestBody CreateBarangayAdminRequest request) {
        User actor = userRepository.findById(currentPrincipal().getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));

        if (request.getUsername() != null && !request.getUsername().isBlank() && userRepository.existsByUsername(request.getUsername().trim())) {
            throw new IllegalArgumentException("Username already taken");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setUsername(resolveBarangayAdminUsername(request));
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getTemporaryPassword()));
        user.setAuthProvider("LOCAL");
        user.setFirstName(request.getFirstName());
        user.setMiddleName(request.getMiddleName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRegionCode(request.getRegionCode());
        user.setProvinceCode(request.getProvinceCode());
        user.setCityMunCode(request.getCityMunCode());
        user.setBarangayCode(request.getBarangayCode());
        user.setBarangay(request.getBarangay());
        user.setCity(request.getCity());
        user.setProvince(request.getProvince());
        user.setRegion(request.getRegion());
        user.setZipCode(request.getZipCode());
        user.setRole(UserRole.BARANGAY_ADMIN);
        user.setStatus(UserStatus.APPROVED);

        User saved = userRepository.save(user);
        notificationService.sendInitialBarangayAdminCredentials(saved, request.getTemporaryPassword());
        securityAuditService.logSuperAdminAction(actor.getEmail(), "create_barangay_admin", saved.getEmail());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", saved.getId());
        response.put("username", saved.getUsername());
        response.put("email", saved.getEmail());
        response.put("role", saved.getRole());
        response.put("status", saved.getStatus());
        response.put("barangayCode", saved.getBarangayCode());
        return ResponseEntity.ok(response);
    }

    private String resolveBarangayAdminUsername(CreateBarangayAdminRequest request) {
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            return request.getUsername().trim();
        }

        String base = buildUsernameBase(request.getEmail(), request.getFirstName(), request.getLastName());
        String candidate = base;
        int suffix = 1;

        while (userRepository.existsByUsername(candidate)) {
            candidate = base + "_" + suffix++;
        }

        return candidate;
    }

    private String buildUsernameBase(String email, String firstName, String lastName) {
        String candidate = email != null && email.contains("@")
                ? email.substring(0, email.indexOf('@'))
                : firstName + "." + lastName;

        candidate = candidate == null ? "" : candidate.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");

        if (candidate.isBlank()) {
            return "barangay_admin";
        }

        return candidate.length() > 40 ? candidate.substring(0, 40) : candidate;
    }

    @GetMapping("/super-dashboard")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getSuperAdminDashboard() {
        AuthenticatedUser principal = currentPrincipal();
        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));

        List<User> users = userRepository.findAll();
        List<DocumentRequestResponse> requests = documentRequestService.getAdminMonitorQueue(principal, null);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("scope", buildSuperScope(actor, users));
        response.put("stats", buildSuperStats(users, requests));
        response.put("users", users.stream().map(this::toUserSummary).toList());
        response.put("requests", requests.stream().map(this::toRequestSummary).toList());
        response.put("activity", buildSuperActivityFeed(users, requests));

        return ResponseEntity.ok(response);
    }

    private AuthenticatedUser currentPrincipal() {
        return (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private void validateBarangayScope(User actor, User target) {
        if (actor.getRole() != UserRole.BARANGAY_ADMIN) {
            return;
        }

        if (target.getRole() == UserRole.SUPER_ADMIN || target.getRole() == UserRole.BARANGAY_ADMIN) {
            throw new IllegalArgumentException("Barangay admins cannot change admin-level accounts");
        }

        if (actor.getBarangayCode() == null || !actor.getBarangayCode().equals(target.getBarangayCode())) {
            throw new IllegalArgumentException("You can only manage accounts in your barangay");
        }
    }

    private Map<String, Object> buildScope(User actor) {
        Map<String, Object> scope = new LinkedHashMap<>();
        scope.put("barangayCode", actor.getBarangayCode());
        scope.put("barangay", actor.getBarangay());
        scope.put("city", actor.getCity());
        scope.put("province", actor.getProvince());
        scope.put("region", actor.getRegion());
        return scope;
    }

    private Map<String, Object> buildSuperScope(User actor, List<User> users) {
        Map<String, Object> scope = new LinkedHashMap<>();
        scope.put("mode", "nationwide");
        scope.put("superAdminName", buildFullName(actor));
        scope.put("activeBarangays", users.stream()
                .map(User::getBarangayCode)
                .filter(code -> code != null && !code.isBlank())
                .distinct()
                .count());
        return scope;
    }

    private Map<String, Object> buildSuperStats(List<User> users, List<DocumentRequestResponse> requests) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("activeBarangays", users.stream()
                .filter(user -> user.getRole() == UserRole.BARANGAY_ADMIN && user.getStatus() == UserStatus.APPROVED)
                .map(User::getBarangayCode)
                .filter(code -> code != null && !code.isBlank())
                .distinct()
                .count());
        stats.put("registeredResidents", users.stream().filter(user -> user.getRole() == UserRole.RESIDENT).count());
        stats.put("officersNationwide", users.stream().filter(user -> user.getRole() == UserRole.OFFICER).count());
        stats.put("totalRequests", requests.size());
        stats.put("openRequests", requests.stream().filter(request -> request.getStatus() == null
                || request.getStatus().name().equals("SUBMITTED")
                || request.getStatus().name().equals("UNDER_REVIEW")
                || request.getStatus().name().equals("PENDING_PAYMENT")).count());
        stats.put("overridePending", requests.stream().filter(request -> request.getStatus() != null && request.getStatus().name().equals("DECLINED")).count());
        stats.put("suspendedUsers", users.stream().filter(user -> user.getStatus() == UserStatus.SUSPENDED).count());
        stats.put("pendingVerifications", users.stream().filter(user -> user.getStatus() == UserStatus.PENDING_VERIFICATION).count());
        stats.put("pendingBarangayAdmins", users.stream().filter(user -> user.getRole() == UserRole.BARANGAY_ADMIN && user.getStatus() == UserStatus.PENDING_VERIFICATION).count());
        return stats;
    }

    private List<Map<String, Object>> buildSuperActivityFeed(List<User> users, List<DocumentRequestResponse> requests) {
        List<Map<String, Object>> activity = new ArrayList<>();

        users.forEach(user -> {
            String role = user.getRole() == null ? "user" : user.getRole().name().toLowerCase().replace('_', ' ');
            String detail = safeLabel(user.getBarangay()) + " · " + (user.getStatus() == null ? "unknown status" : user.getStatus().name().toLowerCase().replace('_', ' '));

            if (user.getRole() == UserRole.BARANGAY_ADMIN || user.getRole() == UserRole.OFFICER || user.getRole() == UserRole.RESIDENT) {
                activity.add(buildActivityItem(
                        user.getId().toString(),
                        role,
                        buildFullName(user) + " updated their " + role + " profile",
                        detail,
                        user.getUpdatedAt() != null ? user.getUpdatedAt() : user.getCreatedAt(),
                        user.getStatus() == UserStatus.SUSPENDED ? "red" : user.getStatus() == UserStatus.APPROVED ? "green" : "gold"
                ));
            }
        });

        requests.forEach(request -> activity.add(buildActivityItem(
                request.getId().toString(),
                "request",
            request.getDocumentType() + " request is " + (request.getStatus() == null ? "unknown" : request.getStatus().name().toLowerCase().replace('_', ' ')),
                safeLabel(request.getBarangayCode()) + " · " + request.getPurpose(),
                request.getUpdatedAt() != null ? request.getUpdatedAt() : request.getRequestTimestamp(),
                request.getStatus() != null && request.getStatus().name().contains("DECLINED") ? "red" : "blue"
        )));

        return activity.stream()
                .sorted(Comparator.comparing(item -> (LocalDateTime) ((Map<String, Object>) item).get("timestamp"), Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(7)
                .toList();
    }

    private String safeLabel(String value) {
        return value == null || value.isBlank() ? "Unassigned" : value;
    }

    private Map<String, Object> buildStats(
            List<User> residents,
            List<User> officers,
            List<User> pendingResidents,
            List<User> pendingOfficers,
            List<DocumentRequestResponse> requests
    ) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("registeredResidents", residents.size());
        stats.put("activeOfficers", officers.stream().filter(user -> user.getStatus() != UserStatus.SUSPENDED).count());
        stats.put("suspendedOfficers", officers.stream().filter(user -> user.getStatus() == UserStatus.SUSPENDED).count());
        stats.put("openRequests", requests.size());
        stats.put("awaitingVerification", pendingResidents.size() + pendingOfficers.size());
        stats.put("pendingResidents", pendingResidents.size());
        stats.put("pendingOfficers", pendingOfficers.size());
        return stats;
    }

    private Map<String, Object> toUserSummary(User user) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("id", user.getId());
        summary.put("username", user.getUsername());
        summary.put("fullName", buildFullName(user));
        summary.put("firstName", user.getFirstName());
        summary.put("middleName", user.getMiddleName());
        summary.put("lastName", user.getLastName());
        summary.put("email", user.getEmail());
        summary.put("role", user.getRole());
        summary.put("status", user.getStatus());
        summary.put("barangayCode", user.getBarangayCode());
        summary.put("barangay", user.getBarangay());
        summary.put("city", user.getCity());
        summary.put("province", user.getProvince());
        summary.put("region", user.getRegion());
        summary.put("phoneNumber", user.getPhoneNumber());
        summary.put("street", user.getStreet());
        summary.put("createdAt", user.getCreatedAt());
        summary.put("updatedAt", user.getUpdatedAt());
        return summary;
    }

    private Map<String, Object> toRequestSummary(DocumentRequestResponse request) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("id", request.getId());
        summary.put("residentUserId", request.getResidentUserId());
        summary.put("assignedOfficerUserId", request.getAssignedOfficerUserId());
        summary.put("barangayCode", request.getBarangayCode());
        summary.put("documentType", request.getDocumentType());
        summary.put("purpose", request.getPurpose());
        summary.put("additionalDetails", request.getAdditionalDetails());
        summary.put("copies", request.getCopies());
        summary.put("status", request.getStatus());
        summary.put("officerRemarks", request.getOfficerRemarks());
        summary.put("requestTimestamp", request.getRequestTimestamp());
        summary.put("updatedAt", request.getUpdatedAt());
        return summary;
    }

    private List<Map<String, Object>> buildActivityFeed(
            List<User> pendingResidents,
            List<User> pendingOfficers,
            List<User> officers,
            List<DocumentRequestResponse> requests
    ) {
        List<Map<String, Object>> activity = new ArrayList<>();

        pendingResidents.forEach(user -> activity.add(buildActivityItem(
                user.getId().toString(),
                "resident",
                buildFullName(user) + " submitted a resident registration",
                user.getBarangay() == null ? "Resident verification is pending review." : "Resident verification is pending review for " + user.getBarangay() + ".",
                user.getCreatedAt(),
                "gold"
        )));

        pendingOfficers.forEach(user -> activity.add(buildActivityItem(
                user.getId().toString(),
                "officer",
                buildFullName(user) + " submitted an officer registration",
                "Officer credentials are pending barangay review.",
                user.getCreatedAt(),
                "red"
        )));

        officers.forEach(user -> {
            if (user.getStatus() == UserStatus.SUSPENDED || user.getStatus() == UserStatus.REJECTED) {
                activity.add(buildActivityItem(
                        user.getId().toString(),
                        "officer-status",
                        buildFullName(user) + " is " + user.getStatus().name().toLowerCase().replace('_', ' '),
                        "Officer account requires admin attention.",
                        user.getUpdatedAt(),
                        "red"
                ));
            }
        });

        requests.forEach(request -> activity.add(buildActivityItem(
                request.getId().toString(),
                "request",
            request.getDocumentType() + " request is " + (request.getStatus() == null ? "unknown" : request.getStatus().name().toLowerCase().replace('_', ' ')),
                request.getPurpose(),
                request.getUpdatedAt() != null ? request.getUpdatedAt() : request.getRequestTimestamp(),
                request.getStatus() == null || request.getStatus().name().contains("DECLINED") ? "red" : "blue"
        )));

        return activity.stream()
                .sorted(Comparator.comparing(item -> (LocalDateTime) ((Map<String, Object>) item).get("timestamp"), Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(6)
                .toList();
    }

    private Map<String, Object> buildActivityItem(String id, String kind, String title, String detail, LocalDateTime timestamp, String tone) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", id);
        item.put("kind", kind);
        item.put("title", title);
        item.put("detail", detail);
        item.put("timestamp", timestamp);
        item.put("tone", tone);
        return item;
    }

    private String buildFullName(User user) {
        StringBuilder fullName = new StringBuilder();
        if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
            fullName.append(user.getFirstName().trim());
        }
        if (user.getMiddleName() != null && !user.getMiddleName().isBlank()) {
            if (!fullName.isEmpty()) {
                fullName.append(' ');
            }
            fullName.append(user.getMiddleName().trim());
        }
        if (user.getLastName() != null && !user.getLastName().isBlank()) {
            if (!fullName.isEmpty()) {
                fullName.append(' ');
            }
            fullName.append(user.getLastName().trim());
        }
        return fullName.length() == 0 ? user.getUsername() : fullName.toString();
    }
}