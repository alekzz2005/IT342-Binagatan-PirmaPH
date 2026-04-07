package edu.cit.binagatan.pirmaph.service.filter;

import edu.cit.binagatan.pirmaph.entity.DocumentRequest;
import edu.cit.binagatan.pirmaph.entity.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.entity.UserRole;

import java.util.List;

public interface RequestFilterStrategy {

    boolean supports(UserRole role);

    List<DocumentRequest> filter(User user, DocumentRequestStatus status);
}
