package edu.cit.binagatan.pirmaph.verification.repository;

import edu.cit.binagatan.pirmaph.verification.domain.ResidentFile;
import edu.cit.binagatan.pirmaph.verification.domain.ResidentFileCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResidentFileRepository extends JpaRepository<ResidentFile, UUID> {

    List<ResidentFile> findByUserIdOrderByUploadedAtDesc(UUID userId);

    List<ResidentFile> findByUserIdAndCategoryOrderByUploadedAtDesc(UUID userId, ResidentFileCategory category);

    List<ResidentFile> findByBarangayCodeOrderByUploadedAtDesc(String barangayCode);

    Optional<ResidentFile> findByIdAndUserId(UUID fileId, UUID userId);
}