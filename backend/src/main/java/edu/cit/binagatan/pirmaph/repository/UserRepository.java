package edu.cit.binagatan.pirmaph.repository;

import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.entity.UserRole;
import edu.cit.binagatan.pirmaph.entity.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByGoogleId(String googleId);
    
    boolean existsByEmail(String email);
    
    boolean existsByUsername(String username);

    List<User> findByRoleAndStatusOrderByCreatedAtAsc(UserRole role, UserStatus status);

    List<User> findByRoleAndStatusAndBarangayCodeOrderByCreatedAtAsc(UserRole role, UserStatus status, String barangayCode);
}
