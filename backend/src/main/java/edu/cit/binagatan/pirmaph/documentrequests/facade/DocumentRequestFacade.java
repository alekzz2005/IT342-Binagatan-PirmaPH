package edu.cit.binagatan.pirmaph.documentrequests.facade;

import edu.cit.binagatan.pirmaph.documentrequests.dto.CreateDocumentRequestRequest;
import edu.cit.binagatan.pirmaph.documentrequests.dto.DocumentRequestResponse;
import edu.cit.binagatan.pirmaph.shared.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.documentrequests.application.DocumentRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class DocumentRequestFacade {

    @Autowired
    private DocumentRequestService documentRequestService;

    public DocumentRequestResponse submitRequest(CreateDocumentRequestRequest request) {
        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return documentRequestService.submitRequest(principal, request);
    }
}
