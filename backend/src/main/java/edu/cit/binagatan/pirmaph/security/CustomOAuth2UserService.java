package edu.cit.binagatan.pirmaph.security;

import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.entity.UserRole;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        
        // Process and save user information
        try {
            processOAuth2User(oauth2User);
        } catch (Exception e) {
            System.err.println("Error processing OAuth2 user: " + e.getMessage());
            e.printStackTrace();
            // Throw as generic exception - Spring Security will handle with failure handler
            throw new RuntimeException("Failed to process OAuth2 user: " + e.getMessage(), e);
        }
        
        return oauth2User;
    }

    @Transactional
    private void processOAuth2User(OAuth2User oauth2User) {
        String email = oauth2User.getAttribute("email");
        String googleId = oauth2User.getAttribute("sub");
        String givenName = oauth2User.getAttribute("given_name");
        String familyName = oauth2User.getAttribute("family_name");
        String name = oauth2User.getAttribute("name");
        
        // Validate required fields
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email not provided by Google OAuth2. Cannot create user account.");
        }
        if (googleId == null || googleId.trim().isEmpty()) {
            throw new RuntimeException("Google ID (sub claim) not provided. Cannot create user account.");
        }
        
        // Check if user exists by Google ID
        Optional<User> existingUserByGoogleId = userRepository.findByGoogleId(googleId);
        if (existingUserByGoogleId.isPresent()) {
            // User already exists with this Google account
            return;
        }
        
        // Check if user exists by email
        Optional<User> existingUserByEmail = userRepository.findByEmail(email);
        if (existingUserByEmail.isPresent()) {
            // Link Google account to existing user
            User user = existingUserByEmail.get();
            user.setGoogleId(googleId);
            user.setAuthProvider("GOOGLE");
            userRepository.save(user);
            return;
        }
        
        // Create new user
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setGoogleId(googleId);
        newUser.setAuthProvider("GOOGLE");
        
        // Set name fields
        if (givenName != null) {
            newUser.setFirstName(givenName);
        } else if (name != null) {
            // If given_name is not available, use the full name as first name
            newUser.setFirstName(name);
        } else {
            newUser.setFirstName("Google User");
        }
        
        if (familyName != null) {
            newUser.setLastName(familyName);
        } else {
            newUser.setLastName("");
        }
        
        // Generate username from email
        String username = email.split("@")[0];
        
        // Ensure username is unique
        String baseUsername = username;
        int counter = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }
        newUser.setUsername(username);
        
        // Set default role
        newUser.setRole(UserRole.RESIDENT);

        newUser.setPasswordHash("OAUTH2_USER");
        newUser.setBirthDate(LocalDate.of(1970, 1, 1));
        newUser.setSex("Prefer not to say");
        newUser.setPhoneNumber("N/A");
        newUser.setStreet("N/A");
        newUser.setBarangay("N/A");
        newUser.setCity("N/A");
        newUser.setProvince("N/A");

        userRepository.save(newUser);
    }
}
