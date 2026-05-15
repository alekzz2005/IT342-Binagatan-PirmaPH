package edu.cit.binagatan.pirmaph.payment.dto;

import edu.cit.binagatan.pirmaph.payment.domain.Payment;
import edu.cit.binagatan.pirmaph.payment.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class PaymentInfoResponse {

    private UUID id;
    private UUID requestId;
    private BigDecimal amount;
    private PaymentStatus paymentStatus;
    private String paymentProvider;
    private String checkoutSessionId;
    private String paymentId;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;

    public static PaymentInfoResponse from(Payment payment) {
        if (payment == null) return null;
        PaymentInfoResponse resp = new PaymentInfoResponse();
        resp.setId(payment.getId());
        resp.setRequestId(payment.getRequestId());
        resp.setAmount(payment.getAmount());
        resp.setPaymentStatus(payment.getPaymentStatus());
        resp.setPaymentProvider(payment.getPaymentProvider());
        resp.setCheckoutSessionId(payment.getCheckoutSessionId());
        resp.setPaymentId(payment.getPaymentId());
        resp.setPaidAt(payment.getPaidAt());
        resp.setCreatedAt(payment.getCreatedAt());
        return resp;
    }

    // Getters & Setters

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getRequestId() { return requestId; }
    public void setRequestId(UUID requestId) { this.requestId = requestId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentProvider() { return paymentProvider; }
    public void setPaymentProvider(String paymentProvider) { this.paymentProvider = paymentProvider; }

    public String getCheckoutSessionId() { return checkoutSessionId; }
    public void setCheckoutSessionId(String checkoutSessionId) { this.checkoutSessionId = checkoutSessionId; }

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
