package edu.cit.binagatan.pirmaph.service.filter;

import edu.cit.binagatan.pirmaph.entity.DocumentRequest;
import edu.cit.binagatan.pirmaph.entity.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.entity.UserRole;
import edu.cit.binagatan.pirmaph.repository.DocumentRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class OfficerRequestFilterStrategy implements RequestFilterStrategy {

    @Autowired
    private DocumentRequestRepository documentRequestRepository;

    @Override
    public boolean supports(UserRole role) {
        return role == UserRole.OFFICER;
    }

    @Override
    public List<DocumentRequest> filter(User user, DocumentRequestStatus status) {
        if (status == null) {
            return documentRequestRepository.findByBarangayCodeOrderByRequestTimestampDesc(user.getBarangayCode());
        }

        return documentRequestRepository.findByBarangayCodeAndStatusOrderByRequestTimestampAsc(user.getBarangayCode(), status);
    }
}
