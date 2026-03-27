package edu.cit.binagatan.pirmaph.security;

import edu.cit.binagatan.pirmaph.entity.UserRole;
import edu.cit.binagatan.pirmaph.entity.UserStatus;

import java.util.UUID;

public class AuthenticatedUser {

    private final UUID id;
    private final UserRole role;
    private final UserStatus status;

    public AuthenticatedUser(UUID id, UserRole role, UserStatus status) {
        this.id = id;
        this.role = role;
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public UserRole getRole() {
        return role;
    }

    public UserStatus getStatus() {
        return status;
    }
}