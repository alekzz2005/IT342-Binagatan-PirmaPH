package edu.cit.binagatan.pirmaph.documentrequests.filter;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.users.domain.User;
import edu.cit.binagatan.pirmaph.users.domain.UserRole;

import java.util.List;

public interface RequestFilterStrategy {

    boolean supports(UserRole role);

    List<DocumentRequest> filter(User user, DocumentRequestStatus status);
}
