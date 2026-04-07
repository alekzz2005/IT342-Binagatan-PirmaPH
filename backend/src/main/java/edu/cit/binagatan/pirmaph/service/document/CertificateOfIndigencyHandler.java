package edu.cit.binagatan.pirmaph.service.document;

import edu.cit.binagatan.pirmaph.entity.DocumentType;
import org.springframework.stereotype.Component;

@Component
public class CertificateOfIndigencyHandler extends AbstractDocumentHandler {

    @Override
    public DocumentType getDocumentType() {
        return DocumentType.CERTIFICATE_OF_INDIGENCY;
    }
}
