package edu.cit.binagatan.pirmaph.repository;

import edu.cit.binagatan.pirmaph.entity.DocumentRequest;
import edu.cit.binagatan.pirmaph.entity.DocumentRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRequestRepository extends JpaRepository<DocumentRequest, UUID> {

    List<DocumentRequest> findByResidentUserIdOrderByRequestTimestampDesc(UUID residentUserId);

    List<DocumentRequest> findByBarangayCodeOrderByRequestTimestampDesc(String barangayCode);

    List<DocumentRequest> findByBarangayCodeAndStatusOrderByRequestTimestampAsc(String barangayCode, DocumentRequestStatus status);

    List<DocumentRequest> findByStatusOrderByRequestTimestampAsc(DocumentRequestStatus status);
}
