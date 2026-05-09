package edu.cit.binagatan.pirmaph.documentrequests.filter;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.users.domain.User;
import edu.cit.binagatan.pirmaph.users.domain.UserRole;
import edu.cit.binagatan.pirmaph.documentrequests.repository.DocumentRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BarangayAdminRequestFilterStrategy implements RequestFilterStrategy {

    @Autowired
    private DocumentRequestRepository documentRequestRepository;

    @Override
    public boolean supports(UserRole role) {
        return role == UserRole.BARANGAY_ADMIN;
    }

    @Override
    public List<DocumentRequest> filter(User user, DocumentRequestStatus status) {
        if (status == null) {
            return documentRequestRepository.findByBarangayCodeOrderByRequestTimestampDesc(user.getBarangayCode());
        }

        return documentRequestRepository.findByBarangayCodeAndStatusOrderByRequestTimestampAsc(user.getBarangayCode(), status);
    }
}
