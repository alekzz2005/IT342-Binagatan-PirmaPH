package edu.cit.binagatan.pirmaph.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import edu.cit.binagatan.pirmaph.dto.AuthResponse;
import edu.cit.binagatan.pirmaph.entity.User;
import edu.cit.binagatan.pirmaph.entity.UserStatus;
import edu.cit.binagatan.pirmaph.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, 
                                       Authentication authentication) throws IOException, ServletException {
        
        try {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            String email = oauth2User.getAttribute("email");
            
            // Log all OAuth2 user attributes for debugging
            System.out.println("=== OAuth2 Authentication Success ===");
            System.out.println("OAuth2 Attributes:");
            oauth2User.getAttributes().forEach((key, value) -> 
                System.out.println("  " + key + ": " + value)
            );
            System.out.println("Email from OAuth2User: " + email);
            
            // Validate email
            if (email == null || email.trim().isEmpty()) {
                throw new RuntimeException("Email claim missing from OAuth2 user");
            }
            
            // Find the user in database
            System.out.println("Searching for user by email: " + email);
            var optionalUser = userRepository.findByEmail(email);
            System.out.println("User search result: " + (optionalUser.isPresent() ? "FOUND" : "NOT FOUND"));
            
            if (optionalUser.isEmpty()) {
                // List all users in database for debugging
                System.err.println("User not found! Listing all users in database:");
                var allUsers = userRepository.findAll();
                allUsers.forEach(u -> System.err.println("  - Username: " + u.getUsername() + ", Email: " + u.getEmail() + ", GoogleId: " + u.getGoogleId()));
                
                String errorMsg = "User not found in database after OAuth authentication for email: " + email;
                System.err.println(errorMsg);
                throw new RuntimeException(errorMsg);
            }
            
            User user = optionalUser.get();
            System.out.println("User found: " + user.getUsername() + " (ID: " + user.getId() + ")");

                if (user.getStatus() != null && user.getStatus() != UserStatus.APPROVED) {
                String statusReason = user.getStatus() == UserStatus.SUSPENDED
                    ? "account_suspended"
                    : user.getStatus() == UserStatus.REJECTED
                    ? "account_rejected"
                    : "pending_verification";
                String frontendUrl = allowedOrigins.split(",")[0].trim();
                String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                    .queryParam("error", statusReason)
                    .build().toUriString();
                getRedirectStrategy().sendRedirect(request, response, redirectUrl);
                return;
                }

            // Generate JWT token
            String token = jwtUtil.generateToken(user.getId(), user.getRole().name());
            System.out.println("JWT token generated successfully");
            
            // Create AuthResponse with all user data using constructor
            AuthResponse authResponse = new AuthResponse(user, token);
            
            // Encode the response as JSON
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
            String userDataJson = URLEncoder.encode(mapper.writeValueAsString(authResponse), StandardCharsets.UTF_8);

            // Get the frontend URL (use the first allowed origin)
            String frontendUrl = allowedOrigins.split(",")[0].trim();
            
            // Redirect to frontend with token and user data
            String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                    .queryParam("token", token)
                    .queryParam("user", userDataJson)
                    .build().toUriString();
            
            System.out.println("Redirecting to: " + frontendUrl + "/oauth2/redirect");
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        } catch (Exception e) {
            // Log error and redirect to error page
            System.err.println("OAuth2 authentication failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
            
            String frontendUrl = allowedOrigins.split(",")[0].trim();
            String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                    .queryParam("error", "oauth_failed")
                    .queryParam("reason", e.getMessage())
                    .build().toUriString();
            
            try {
                getRedirectStrategy().sendRedirect(request, response, redirectUrl);
            } catch (IOException ioException) {
                System.err.println("Failed to redirect on OAuth2 error: " + ioException.getMessage());
            }
        }
    }
}
