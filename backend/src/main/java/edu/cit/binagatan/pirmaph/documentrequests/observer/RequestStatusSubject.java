package edu.cit.binagatan.pirmaph.documentrequests.observer;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RequestStatusSubject {

    private final List<RequestObserver> observers;

    public RequestStatusSubject(List<RequestObserver> observers) {
        this.observers = observers;
    }

    public void notifyStatusUpdated(RequestStatusEvent event) {
        for (RequestObserver observer : observers) {
            observer.onStatusUpdated(event);
        }
    }
}
