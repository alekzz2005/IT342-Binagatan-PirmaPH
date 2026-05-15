package edu.cit.binagatan.pirmaph.payment.application;

import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequest;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentRequestStatus;
import edu.cit.binagatan.pirmaph.documentrequests.domain.DocumentType;
import edu.cit.binagatan.pirmaph.documentrequests.repository.DocumentRequestRepository;
import edu.cit.binagatan.pirmaph.payment.domain.Payment;
import edu.cit.binagatan.pirmaph.payment.domain.PaymentStatus;
import edu.cit.binagatan.pirmaph.payment.dto.CheckoutResponse;
import edu.cit.binagatan.pirmaph.payment.dto.PaymentInfoResponse;
import edu.cit.binagatan.pirmaph.payment.repository.PaymentRepository;
import edu.cit.binagatan.pirmaph.users.domain.User;
import edu.cit.binagatan.pirmaph.users.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class PayMongoService {

    private static final Logger log = LoggerFactory.getLogger(PayMongoService.class);
    private static final String PAYMONGO_API = "https://api.paymongo.com/v1";
    private static final String PROVIDER = "PAYMONGO";

    /** Base price per document type in Philippine Peso. */
    private static final Map<DocumentType, BigDecimal> BASE_PRICE = new EnumMap<>(DocumentType.class);

    static {
        BASE_PRICE.put(DocumentType.BARANGAY_CLEARANCE,        new BigDecimal("50.00"));
        BASE_PRICE.put(DocumentType.CERTIFICATE_OF_RESIDENCY,  new BigDecimal("50.00"));
        BASE_PRICE.put(DocumentType.CERTIFICATE_OF_INDIGENCY,  new BigDecimal("0.00"));
        BASE_PRICE.put(DocumentType.BUSINESS_CLEARANCE,        new BigDecimal("200.00"));
        BASE_PRICE.put(DocumentType.CERTIFICATE_OF_GOOD_MORAL, new BigDecimal("50.00"));
        BASE_PRICE.put(DocumentType.BARANGAY_ID,               new BigDecimal("100.00"));
    }

    /** Additional fee per copy beyond the first. */
    private static final BigDecimal PER_EXTRA_COPY = new BigDecimal("20.00");

    // ── Dependencies ──────────────────────────────────────────────────────────
    private final PaymentRepository paymentRepository;
    private final DocumentRequestRepository documentRequestRepository;
    private final UserRepository userRepository;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${paymongo.secret.key:}")
    private String secretKey;

    @Value("${paymongo.public.key:}")
    private String publicKey;

    @Value("${paymongo.webhook.secret:}")
    private String webhookSecret;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public PayMongoService(PaymentRepository paymentRepository,
                           DocumentRequestRepository documentRequestRepository,
                           UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.documentRequestRepository = documentRequestRepository;
        this.userRepository = userRepository;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Create a PayMongo Checkout Session for the given document request and
     * persist a PENDING payment record. Returns the checkout URL.
     */
    @Transactional
    public CheckoutResponse createCheckout(UUID requestId, UUID residentUserId) {
        DocumentRequest request = documentRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Document request not found"));

        // Security: only the owning resident may pay
        if (!request.getResidentUserId().equals(residentUserId)) {
            throw new AccessDeniedException("You can only pay for your own requests");
        }

        // Must be in PENDING_PAYMENT status
        if (request.getStatus() != DocumentRequestStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Payment is only required when request status is PENDING_PAYMENT. Current status: " + request.getStatus().name());
        }

        // If already paid, don't create another session
        if (paymentRepository.existsByRequestIdAndPaymentStatus(requestId, PaymentStatus.PAID)) {
            throw new IllegalStateException("This request has already been paid.");
        }

        // If there's a prior PENDING session, mark it CANCELLED so we can create a new one
        paymentRepository.findTopByRequestIdOrderByCreatedAtDesc(requestId).ifPresent(prior -> {
            if (prior.getPaymentStatus() == PaymentStatus.PENDING) {
                prior.setPaymentStatus(PaymentStatus.CANCELLED);
                paymentRepository.save(prior);
                log.info("Prior PENDING checkout cancelled, creating fresh session for requestId={}", requestId);
            }
        });

        User resident = userRepository.findById(residentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        BigDecimal amount = computeAmount(request);

        // Certificate of Indigency is free — skip payment
        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalStateException("This document type requires no payment.");
        }

        // Create PayMongo checkout session
        String sessionJson = buildCheckoutSessionPayload(request, resident, amount);
        PayMongoCheckoutResult result = callPayMongoCreateCheckout(sessionJson);

        // Persist PENDING payment record
        Payment payment = new Payment();
        payment.setRequestId(requestId);
        payment.setResidentUserId(residentUserId);
        payment.setAmount(amount);
        payment.setPaymentStatus(PaymentStatus.PENDING);
        payment.setPaymentProvider(PROVIDER);
        payment.setCheckoutSessionId(result.sessionId());
        paymentRepository.save(payment);

        log.info("PayMongo checkout created: sessionId={} requestId={} amount={}", result.sessionId(), requestId, amount);
        return new CheckoutResponse(result.checkoutUrl(), result.sessionId());
    }

    /**
     * Process a PayMongo webhook event. Called from the controller without
     * authentication (PayMongo sends directly to this endpoint).
     *
     * We handle: checkout_session.payment.paid
     */
    @Transactional
    public void handleWebhook(String rawBody, String signature) {
        // Verify signature if webhook secret is configured
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            verifyWebhookSignature(rawBody, signature);
        } else {
            log.warn("PayMongo webhook secret not configured — skipping signature verification");
        }
        String eventType = extractJsonString(rawBody, "type");
        log.info("PayMongo webhook event: {}", eventType);

        if (!"checkout_session.payment.paid".equals(eventType)
                && !"payment.paid".equals(eventType)) {
            // Ignore other event types silently
            return;
        }

        // Determine checkout session id from the webhook payload
        String checkoutSessionId = resolveCheckoutSessionId(rawBody, eventType);
        if (checkoutSessionId == null || checkoutSessionId.isBlank()) {
            log.warn("Could not extract checkoutSessionId from webhook payload");
            return;
        }

        // Extract PayMongo payment id
        String paymentId = extractPaymentId(rawBody, eventType);

        paymentRepository.findByCheckoutSessionId(checkoutSessionId).ifPresentOrElse(payment -> {
            if (payment.getPaymentStatus() == PaymentStatus.PAID) {
                log.info("Webhook duplicate — payment already recorded: {}", checkoutSessionId);
                return;
            }

            // Mark payment as PAID
            payment.setPaymentStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            if (paymentId != null && !paymentId.isBlank()) {
                payment.setPaymentId(paymentId);
            }
            paymentRepository.save(payment);

            // Advance document request from PENDING_PAYMENT → SUBMITTED (back into processing)
            documentRequestRepository.findById(payment.getRequestId()).ifPresent(req -> {
                if (req.getStatus() == DocumentRequestStatus.PENDING_PAYMENT) {
                    req.setStatus(DocumentRequestStatus.SUBMITTED);
                    documentRequestRepository.save(req);
                    log.info("Request {} advanced from PENDING_PAYMENT to SUBMITTED after payment", req.getId());
                }
            });

        }, () -> log.warn("No payment record found for checkoutSessionId={}", checkoutSessionId));
    }

    /**
     * Retrieve the most recent payment for a given request (may be null).
     */
    public Payment getLatestPaymentForRequest(UUID requestId) {
        return paymentRepository.findTopByRequestIdOrderByCreatedAtDesc(requestId).orElse(null);
    }

    /**
     * Check whether a request has been paid.
     */
    public boolean isPaid(UUID requestId) {
        return paymentRepository.existsByRequestIdAndPaymentStatus(requestId, PaymentStatus.PAID);
    }

    /**
     * Actively verify the status of a checkout session with PayMongo API.
     */
    @Transactional
    public PaymentInfoResponse verifyPaymentWithProvider(UUID requestId) {
        Payment payment = paymentRepository.findTopByRequestIdOrderByCreatedAtDesc(requestId)
                .orElseThrow(() -> new IllegalArgumentException("No payment record found for this request"));

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            return PaymentInfoResponse.from(payment);
        }

        if (payment.getCheckoutSessionId() == null || payment.getCheckoutSessionId().isBlank()) {
            throw new IllegalStateException("No checkout session ID associated with this payment");
        }

        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("PayMongo secret key is not configured");
        }

        String auth = Base64.getEncoder().encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(PAYMONGO_API + "/checkout_sessions/" + payment.getCheckoutSessionId()))
                    .header("Authorization", "Basic " + auth)
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                String body = resp.body();
                boolean isPaid = body.contains("\"status\":\"paid\"") || body.contains("\"status\": \"paid\"")
                        || body.contains("\"status\":\"succeeded\"") || body.contains("\"status\": \"succeeded\"");

                if (isPaid) {
                    payment.setPaymentStatus(PaymentStatus.PAID);
                    if (payment.getPaidAt() == null) {
                        payment.setPaidAt(LocalDateTime.now());
                    }
                    String paymentId = extractPaymentId(body, "payment.paid");
                    if (paymentId != null && !paymentId.isBlank()) {
                        payment.setPaymentId(paymentId);
                    }
                    paymentRepository.save(payment);

                    documentRequestRepository.findById(requestId).ifPresent(reqDoc -> {
                        if (reqDoc.getStatus() == DocumentRequestStatus.PENDING_PAYMENT) {
                            reqDoc.setStatus(DocumentRequestStatus.SUBMITTED);
                            documentRequestRepository.save(reqDoc);
                            log.info("Request {} automatically advanced to SUBMITTED after active API verification", requestId);
                        }
                    });
                }
            }
        } catch (Exception e) {
            log.error("Failed to verify payment with PayMongo API", e);
            throw new IllegalStateException("Failed to verify payment with PayMongo API: " + e.getMessage(), e);
        }

        return PaymentInfoResponse.from(payment);
    }

    /**
     * Manually mark a payment as PAID (e.g. for over the counter / offline verification).
     */
    @Transactional
    public PaymentInfoResponse markPaymentAsPaidManually(UUID requestId) {
        Payment payment = paymentRepository.findTopByRequestIdOrderByCreatedAtDesc(requestId)
                .orElseThrow(() -> new IllegalArgumentException("No payment record found for this request"));

        if (payment.getPaymentStatus() != PaymentStatus.PAID) {
            payment.setPaymentStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            payment.setPaymentProvider("MANUAL / OVER-THE-COUNTER");
            paymentRepository.save(payment);

            documentRequestRepository.findById(requestId).ifPresent(reqDoc -> {
                if (reqDoc.getStatus() == DocumentRequestStatus.PENDING_PAYMENT) {
                    reqDoc.setStatus(DocumentRequestStatus.SUBMITTED);
                    documentRequestRepository.save(reqDoc);
                    log.info("Request {} advanced to SUBMITTED after manual payment verification", requestId);
                }
            });
        }
        return PaymentInfoResponse.from(payment);
    }

    // ── Amount calculation ─────────────────────────────────────────────────────

    public BigDecimal computeAmount(DocumentRequest request) {
        BigDecimal base = BASE_PRICE.getOrDefault(request.getDocumentType(), new BigDecimal("50.00"));
        int copies = request.getCopies() == null ? 1 : request.getCopies();
        int extraCopies = Math.max(0, copies - 1);
        return base.add(PER_EXTRA_COPY.multiply(BigDecimal.valueOf(extraCopies)));
    }

    // ── PayMongo HTTP calls ────────────────────────────────────────────────────

    private PayMongoCheckoutResult callPayMongoCreateCheckout(String sessionJson) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("PayMongo secret key is not configured");
        }

        String auth = Base64.getEncoder().encodeToString((secretKey + ":").getBytes());

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(PAYMONGO_API + "/checkout_sessions"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(sessionJson))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                log.error("PayMongo API error: {} — {}", resp.statusCode(), resp.body());
                throw new IllegalStateException("PayMongo API error: " + resp.statusCode());
            }

            String body = resp.body();
            String sessionId  = extractNestedJsonString(body, "data", "id");
            String checkoutUrl = extractNestedJsonString(body, "data.attributes", "checkout_url");

            if (checkoutUrl == null || checkoutUrl.isBlank()) {
                // Fallback parse path
                checkoutUrl = extractJsonString(body, "checkout_url");
            }

            log.debug("PayMongo session created: {}", sessionId);
            return new PayMongoCheckoutResult(sessionId, checkoutUrl);

        } catch (IllegalStateException ise) {
            throw ise;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create PayMongo checkout session: " + e.getMessage(), e);
        }
    }

    // ── Payload builder ────────────────────────────────────────────────────────

    private String buildCheckoutSessionPayload(DocumentRequest request, User resident, BigDecimal amount) {
        // PayMongo expects amounts in centavos (integer)
        long amountCentavos = amount.multiply(BigDecimal.valueOf(100)).longValue();

        String docLabel = friendlyLabel(request.getDocumentType());
        String successUrl = frontendUrl + "/payment/success?requestId=" + request.getId();
        String cancelUrl  = frontendUrl + "/payment/failed?requestId=" + request.getId();
        String residentEmail = resident.getEmail() != null ? resident.getEmail() : "";
        String residentName  = trim(resident.getFirstName()) + " " + trim(resident.getLastName());

        return "{"
                + "\"data\":{"
                + "\"attributes\":{"
                + "\"billing\":{"
                + "\"name\":\"" + escJson(residentName) + "\","
                + "\"email\":\"" + escJson(residentEmail) + "\""
                + "},"
                + "\"send_email_receipt\":true,"
                + "\"show_description\":true,"
                + "\"show_line_items\":true,"
                + "\"line_items\":[{"
                + "\"currency\":\"PHP\","
                + "\"amount\":" + amountCentavos + ","
                + "\"description\":\"" + escJson(docLabel + " · Request #" + request.getId().toString().substring(0, 8).toUpperCase()) + "\","
                + "\"name\":\"" + escJson(docLabel) + "\","
                + "\"quantity\":" + (request.getCopies() != null ? request.getCopies() : 1)
                + "}],"
                + "\"payment_method_types\":[\"card\",\"gcash\",\"grab_pay\",\"paymaya\"],"
                + "\"description\":\"" + escJson("PirmaPH · " + docLabel + " for " + residentName) + "\","
                + "\"success_url\":\"" + escJson(successUrl) + "\","
                + "\"cancel_url\":\"" + escJson(cancelUrl) + "\","
                + "\"metadata\":{"
                + "\"request_id\":\"" + request.getId() + "\","
                + "\"resident_id\":\"" + resident.getId() + "\","
                + "\"document_type\":\"" + request.getDocumentType().name() + "\""
                + "}"
                + "}"
                + "}"
                + "}";
    }

    // ── JSON helpers ──────────────────────────────────────────────────────────

    /**
     * Very lightweight JSON field extractor — avoids a JSON library dependency.
     * Finds the FIRST occurrence of "key":"value" or "key":value in the string.
     */
    private String extractJsonString(String json, String key) {
        String token = "\"" + key + "\":";
        int idx = json.indexOf(token);
        if (idx < 0) return null;
        int start = idx + token.length();
        if (start >= json.length()) return null;

        char first = json.charAt(start);
        if (first == '"') {
            // string value
            int end = json.indexOf('"', start + 1);
            if (end < 0) return null;
            return json.substring(start + 1, end);
        } else {
            // non-string value (number, boolean, null)
            int end = start;
            while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}') {
                end++;
            }
            return json.substring(start, end).trim();
        }
    }

    /**
     * Extract value from data.attributes path.
     * Supports simple "parent.child" path for checkout_url.
     */
    private String extractNestedJsonString(String json, String path, String key) {
        // For "data" → find that object then search for key
        // For "data.attributes" → find attributes inside data
        if (path.contains(".")) {
            String[] parts = path.split("\\.", 2);
            String parent = parts[0];
            String rest   = parts[1];
            String token  = "\"" + parent + "\":";
            int idx = json.indexOf(token);
            if (idx < 0) return null;
            int start = idx + token.length();
            while (start < json.length() && json.charAt(start) != '{') start++;
            if (start >= json.length()) return null;
            int depth = 0;
            int end = start;
            for (; end < json.length(); end++) {
                char c = json.charAt(end);
                if (c == '{') depth++;
                else if (c == '}') { depth--; if (depth == 0) { end++; break; } }
            }
            return extractNestedJsonString(json.substring(start, end), rest, key);
        }
        // Single level
        String token = "\"" + path + "\":";
        int idx = json.indexOf(token);
        if (idx < 0) return extractJsonString(json, key);
        int start = idx + token.length();
        while (start < json.length() && json.charAt(start) != '{') start++;
        if (start >= json.length()) return extractJsonString(json, key);
        int depth = 0;
        int end = start;
        for (; end < json.length(); end++) {
            char c = json.charAt(end);
            if (c == '{') depth++;
            else if (c == '}') { depth--; if (depth == 0) { end++; break; } }
        }
        return extractJsonString(json.substring(start, end), key);
    }

    private String resolveCheckoutSessionId(String rawBody, String eventType) {
        if ("checkout_session.payment.paid".equals(eventType)) {
            // data.attributes.data.id is the checkout session id
            String id = extractNestedJsonString(rawBody, "data", "id");
            if (id != null) return id;
        }
        // Fallback: search for checkout_session_id anywhere
        return extractJsonString(rawBody, "checkout_session_id");
    }

    private String extractPaymentId(String rawBody, String eventType) {
        // The payment id is usually nested inside data.attributes.payments[0].id
        // or top-level id for payment.paid events
        String id = extractJsonString(rawBody, "payment_id");
        if (id != null) return id;
        // Fallback — first "id" inside "payments" array section
        int paymentsIdx = rawBody.indexOf("\"payments\"");
        if (paymentsIdx >= 0) {
            String sub = rawBody.substring(paymentsIdx);
            return extractJsonString(sub, "id");
        }
        return null;
    }

    /**
     * Verify that the webhook request genuinely came from PayMongo.
     *
     * PayMongo signature format:
     *   paymongo-signature: t=<timestamp>,te=<hmac-sha256-hex>,li=<hmac-sha256-hex>
     *
     * We compute HMAC-SHA256(webhookSecret, timestamp + "." + rawBody)
     * and compare against the "te" value.
     */
    private void verifyWebhookSignature(String rawBody, String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank()) {
            throw new SecurityException("Missing paymongo-signature header");
        }

        // Parse header: t=<ts>,te=<hex>,li=<hex>
        String timestamp = null;
        String receivedHmac = null;
        for (String part : signatureHeader.split(",")) {
            if (part.startsWith("t=")) timestamp = part.substring(2);
            if (part.startsWith("te=")) receivedHmac = part.substring(3);
        }

        if (timestamp == null || receivedHmac == null) {
            throw new SecurityException("Malformed paymongo-signature header");
        }

        try {
            String signedPayload = timestamp + "." + rawBody;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);

            if (!computedHex.equalsIgnoreCase(receivedHmac)) {
                log.warn("Webhook signature mismatch — possible forged request");
                throw new SecurityException("Invalid webhook signature");
            }
            log.debug("Webhook signature verified OK");
        } catch (SecurityException se) {
            throw se;
        } catch (Exception e) {
            throw new SecurityException("Webhook signature verification failed: " + e.getMessage());
        }
    }

    // ── Misc helpers ──────────────────────────────────────────────────────────

    private String friendlyLabel(DocumentType type) {
        return switch (type) {
            case BARANGAY_CLEARANCE        -> "Barangay Clearance";
            case CERTIFICATE_OF_RESIDENCY  -> "Certificate of Residency";
            case CERTIFICATE_OF_INDIGENCY  -> "Certificate of Indigency";
            case BUSINESS_CLEARANCE        -> "Business Clearance";
            case CERTIFICATE_OF_GOOD_MORAL -> "Certificate of Good Moral";
            case BARANGAY_ID               -> "Barangay ID";
        };
    }

    private String trim(String s) { return s == null ? "" : s.trim(); }

    private String escJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }

    // ── Inner record ──────────────────────────────────────────────────────────

    private record PayMongoCheckoutResult(String sessionId, String checkoutUrl) {}
}
