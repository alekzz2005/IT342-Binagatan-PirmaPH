package edu.cit.binagatan.pirmaph.service.document;

import edu.cit.binagatan.pirmaph.dto.CreateDocumentRequestRequest;
import edu.cit.binagatan.pirmaph.entity.DocumentRequest;
import edu.cit.binagatan.pirmaph.entity.DocumentType;
import edu.cit.binagatan.pirmaph.entity.User;

public interface DocumentHandler {

    DocumentType getDocumentType();

    DocumentRequest createDocumentRequest(User resident, CreateDocumentRequestRequest request);
}
