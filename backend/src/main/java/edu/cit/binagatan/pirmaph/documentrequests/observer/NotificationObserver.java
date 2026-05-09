package edu.cit.binagatan.pirmaph.documentrequests.observer;

import edu.cit.binagatan.pirmaph.shared.infrastructure.NotificationService;
import org.springframework.stereotype.Component;

@Component
public class NotificationObserver implements RequestObserver {

    private final NotificationService notificationService;

    public NotificationObserver(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Override
    public void onStatusUpdated(RequestStatusEvent event) {
        notificationService.sendDocumentRequestStatusUpdate(
                event.getResident(),
                event.getRequestId(),
                event.getStatus()
        );
    }
}
