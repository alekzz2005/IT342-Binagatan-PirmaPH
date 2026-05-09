package edu.cit.binagatan.pirmaph.documentrequests.document;

import edu.cit.binagatan.pirmaph.documentrequests.dto.CreateDocumentRequestRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.users.domain.User;

public abstract class AbstractDocumentHandler implements DocumentHandler {

    @Override
    public DocumentRequest createDocumentRequest(User resident, CreateDocumentRequestRequest request) {
        DocumentRequest documentRequest = new DocumentRequest();
        documentRequest.setResidentUserId(resident.getId());
        documentRequest.setBarangayCode(resident.getBarangayCode());
        documentRequest.setDocumentType(request.getDocumentType());
        documentRequest.setPurpose(request.getPurpose().trim());
        documentRequest.setAdditionalDetails(trimToNull(request.getAdditionalDetails()));
        documentRequest.setCopies(request.getCopies());
        documentRequest.setStatus(DocumentRequestStatus.SUBMITTED);
        documentRequest.setLastUpdatedByUserId(resident.getId());
        return documentRequest;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}
