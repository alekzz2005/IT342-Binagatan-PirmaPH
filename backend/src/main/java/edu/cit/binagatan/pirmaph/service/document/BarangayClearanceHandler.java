package edu.cit.binagatan.pirmaph.service.document;

import edu.cit.binagatan.pirmaph.entity.DocumentType;
import org.springframework.stereotype.Component;

@Component
public class BarangayClearanceHandler extends AbstractDocumentHandler {

    @Override
    public DocumentType getDocumentType() {
        return DocumentType.BARANGAY_CLEARANCE;
    }
}
