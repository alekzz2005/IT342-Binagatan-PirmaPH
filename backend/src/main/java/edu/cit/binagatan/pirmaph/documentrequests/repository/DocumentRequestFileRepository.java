package edu.cit.binagatan.pirmaph.documentrequests.repository;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequestFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRequestFileRepository extends JpaRepository<DocumentRequestFile, UUID> {

    List<DocumentRequestFile> findByRequestIdOrderByUploadedAtDesc(UUID requestId);
}
