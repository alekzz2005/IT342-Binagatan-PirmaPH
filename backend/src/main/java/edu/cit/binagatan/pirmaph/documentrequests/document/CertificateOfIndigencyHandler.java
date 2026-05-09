package edu.cit.binagatan.pirmaph.documentrequests.document;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentType;
import org.springframework.stereotype.Component;

@Component
public class CertificateOfIndigencyHandler extends AbstractDocumentHandler {

    @Override
    public DocumentType getDocumentType() {
        return DocumentType.CERTIFICATE_OF_INDIGENCY;
    }
}
