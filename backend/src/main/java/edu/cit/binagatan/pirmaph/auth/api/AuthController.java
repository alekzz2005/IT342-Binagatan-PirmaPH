package edu.cit.binagatan.pirmaph.auth.api;

import edu.cit.binagatan.pirmaph.auth.dto.AuthResponse;
import edu.cit.binagatan.pirmaph.shared.dto.ErrorResponse;
import edu.cit.binagatan.pirmaph.auth.dto.ForgotPasswordRequest;
import edu.cit.binagatan.pirmaph.auth.dto.LoginRequest;
import edu.cit.binagatan.pirmaph.auth.dto.RegisterRequest;
import edu.cit.binagatan.pirmaph.auth.dto.ResetPasswordRequest;
import edu.cit.binagatan.pirmaph.auth.dto.SendOtpRequest;
import edu.cit.binagatan.pirmaph.auth.dto.VerifyOtpRequest;
import edu.cit.binagatan.pirmaph.auth.application.OtpService;
import edu.cit.binagatan.pirmaph.shared.security.AuthenticatedUser;
import edu.cit.binagatan.pirmaph.auth.application.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private OtpService otpService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            ErrorResponse error = new ErrorResponse(HttpStatus.BAD_REQUEST.value(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            ErrorResponse error = new ErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(), 
                    "An error occurred during registration");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            ErrorResponse error = new ErrorResponse(HttpStatus.UNAUTHORIZED.value(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        } catch (Exception e) {
            ErrorResponse error = new ErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(), 
                    "An error occurred during login");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return ResponseEntity.ok(authService.getCurrentUser(principal));
        } catch (IllegalArgumentException e) {
            ErrorResponse error = new ErrorResponse(HttpStatus.NOT_FOUND.value(), e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.getEmail());
        Map<String, String> response = new HashMap<>();
        response.put("message", "If this email is registered, a password reset link has been sent.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getNewPassword(), request.getConfirmPassword());
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password has been reset successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            ErrorResponse error = new ErrorResponse(HttpStatus.BAD_REQUEST.value(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        Map<String, String> response = new HashMap<>();
        boolean sent = otpService.sendOtp(request.getEmail());
        if (sent) {
            response.put("message", "OTP sent successfully");
            return ResponseEntity.ok(response);
        } else {
            // Do not reveal whether the email exists or not (security best practice).
            // Return 200 to avoid email enumeration.
            response.put("message", "If this email is registered, an OTP has been sent.");
            return ResponseEntity.ok(response);
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        OtpService.OtpResult result = otpService.verifyOtp(request.getEmail(), request.getCode());
        Map<String, String> response = new HashMap<>();
        switch (result) {
            case VERIFIED:
                response.put("message", "Email verified successfully");
                return ResponseEntity.ok(response);
            case EXPIRED:
                ErrorResponse expiredError = new ErrorResponse(HttpStatus.GONE.value(), "OTP has expired. Please request a new code.");
                return ResponseEntity.status(HttpStatus.GONE).body(expiredError);
            default:
                ErrorResponse invalidError = new ErrorResponse(HttpStatus.BAD_REQUEST.value(), "Invalid OTP code. Please try again.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(invalidError);
        }
    }

    @PostMapping("/complete-profile")
    public ResponseEntity<?> completeProfile(@Valid @RequestBody edu.cit.binagatan.pirmaph.users.dto.CompleteProfileRequest request) {
        try {
            AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            AuthResponse response = authService.completeProfile(principal, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            ErrorResponse error = new ErrorResponse(HttpStatus.BAD_REQUEST.value(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            ErrorResponse error = new ErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(), 
                    "An error occurred while completing profile");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // Handle validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
}
