package edu.cit.binagatan.pirmaph.documentrequests.filter;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.users.domain.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RequestFilterContext {

    @Autowired
    private List<RequestFilterStrategy> strategies;

    public List<DocumentRequest> filter(User user, DocumentRequestStatus status) {
        return strategies.stream()
                .filter(strategy -> strategy.supports(user.getRole()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No request filter strategy found for role: " + user.getRole()))
                .filter(user, status);
    }
}
