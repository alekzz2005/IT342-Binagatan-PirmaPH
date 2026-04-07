package edu.cit.binagatan.pirmaph.service.facade;

import edu.cit.binagatan.pirmaph.dto.CreateDocumentRequestRequest;
import edu.cit.binagatan.pirmaph.dto.DocumentRequestResponse;
import edu.cit.binagatan.pirmaph.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.service.DocumentRequestService;
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
