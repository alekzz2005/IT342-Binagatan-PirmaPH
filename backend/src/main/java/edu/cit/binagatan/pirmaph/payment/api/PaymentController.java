package edu.cit.binagatan.pirmaph.payment.api;

import edu.cit.binagatan.pirmaph.payment.application.PayMongoService;
import edu.cit.binagatan.pirmaph.payment.dto.CheckoutResponse;
import edu.cit.binagatan.pirmaph.payment.dto.CreateCheckoutRequest;
import edu.cit.binagatan.pirmaph.shared.dto.ErrorResponse;
import edu.cit.binagatan.pirmaph.shared.security.AuthenticatedUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;
import edu.cit.binagatan.pirmaph.payment.dto.PaymentInfoResponse;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private PayMongoService payMongoService;

    /**
     * POST /api/v1/payments/checkout
     * Creates a PayMongo checkout session for a document request.
     * Only the owning RESIDENT may call this.
     */
    @PostMapping("/checkout")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<?> createCheckout(@RequestBody CreateCheckoutRequest body) {
        try {
            AuthenticatedUser principal = (AuthenticatedUser)
                    SecurityContextHolder.getContext().getAuthentication().getPrincipal();

            CheckoutResponse resp = payMongoService.createCheckout(body.getRequestId(), principal.getId());
            return ResponseEntity.ok(resp);
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(403, ex.getMessage()));
        } catch (IllegalStateException | IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(400, ex.getMessage()));
        } catch (Exception ex) {
            log.error("Unexpected error creating checkout", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Unable to create payment session. Please try again."));
        }
    }

    /**
     * POST /api/v1/payments/webhook
     * Receives PayMongo webhook events. No JWT authentication — PayMongo calls
     * this directly. Permitted in SecurityConfig via path pattern.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "paymongo-signature", required = false) String signature) {
        try {
            payMongoService.handleWebhook(rawBody, signature);
            return ResponseEntity.ok(Map.of("received", true));
        } catch (Exception ex) {
            log.error("Webhook processing error", ex);
            // Always return 200 to PayMongo so it doesn't retry indefinitely
            return ResponseEntity.ok(Map.of("received", true, "error", ex.getMessage()));
        }
    }

    /**
     * POST /api/v1/payments/verify/{requestId}
     * Actively verifies payment status via API or manual confirmation.
     * Accessible by officers.
     */
    @PostMapping("/verify/{requestId}")
    @PreAuthorize("hasAnyRole('OFFICER', 'RESIDENT')")
    public ResponseEntity<?> verifyPayment(
            @PathVariable UUID requestId,
            @RequestParam(value = "manual", defaultValue = "false") boolean manual) {
        try {
            AuthenticatedUser principal = (AuthenticatedUser)
                    SecurityContextHolder.getContext().getAuthentication().getPrincipal();

            PaymentInfoResponse resp;
            if (manual) {
                boolean isOfficer = principal.getRole() == edu.cit.binagatan.pirmaph.users.domain.UserRole.OFFICER;
                if (!isOfficer) {
                    throw new AccessDeniedException("Only officers can manually verify payments");
                }
                resp = payMongoService.markPaymentAsPaidManually(requestId);
            } else {
                resp = payMongoService.verifyPaymentWithProvider(requestId);
            }
            return ResponseEntity.ok(resp);
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(403, ex.getMessage()));
        } catch (IllegalStateException | IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(400, ex.getMessage()));
        } catch (Exception ex) {
            log.error("Unexpected error verifying payment", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Unable to verify payment. Please try again."));
        }
    }
}
