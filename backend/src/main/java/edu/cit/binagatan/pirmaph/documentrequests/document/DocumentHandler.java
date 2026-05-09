package edu.cit.binagatan.pirmaph.documentrequests.document;

import edu.cit.binagatan.pirmaph.documentrequests.dto.CreateDocumentRequestRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentType;
import edu.cit.binagatan.pirmaph.users.domain.User;

public interface DocumentHandler {

    DocumentType getDocumentType();

    DocumentRequest createDocumentRequest(User resident, CreateDocumentRequestRequest request);
}
