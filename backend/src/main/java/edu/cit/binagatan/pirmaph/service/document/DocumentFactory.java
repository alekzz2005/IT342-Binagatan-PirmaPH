package edu.cit.binagatan.pirmaph.service.document;

import edu.cit.binagatan.pirmaph.entity.DocumentType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class DocumentFactory {

    private final Map<DocumentType, DocumentHandler> handlerByType = new EnumMap<>(DocumentType.class);

    public DocumentFactory(List<DocumentHandler> handlers) {
        for (DocumentHandler handler : handlers) {
            handlerByType.put(handler.getDocumentType(), handler);
        }
    }

    public DocumentHandler createDocumentHandler(DocumentType documentType) {
        DocumentHandler handler = handlerByType.get(documentType);
        if (handler == null) {
            throw new IllegalArgumentException("No document handler configured for type: " + documentType);
        }
        return handler;
    }
}
