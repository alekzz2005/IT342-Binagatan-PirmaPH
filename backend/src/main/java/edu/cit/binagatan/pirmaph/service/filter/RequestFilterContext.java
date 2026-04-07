package edu.cit.binagatan.pirmaph.service.filter;

import edu.cit.binagatan.pirmaph.entity.DocumentRequest;
import edu.cit.binagatan.pirmaph.entity.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.entity.User;
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
