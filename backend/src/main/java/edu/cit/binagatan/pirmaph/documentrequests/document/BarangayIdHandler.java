package edu.cit.binagatan.pirmaph.documentrequests.document;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentType;
import org.springframework.stereotype.Component;

@Component
public class BarangayIdHandler extends AbstractDocumentHandler {

    @Override
    public DocumentType getDocumentType() {
        return DocumentType.BARANGAY_ID;
    }
}
