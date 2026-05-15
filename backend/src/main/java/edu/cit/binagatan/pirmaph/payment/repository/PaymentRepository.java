package edu.cit.binagatan.pirmaph.payment.repository;

import edu.cit.binagatan.pirmaph.payment.domain.Payment;
import edu.cit.binagatan.pirmaph.payment.domain.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByCheckoutSessionId(String checkoutSessionId);

    Optional<Payment> findTopByRequestIdOrderByCreatedAtDesc(UUID requestId);

    List<Payment> findByRequestIdOrderByCreatedAtDesc(UUID requestId);

    boolean existsByRequestIdAndPaymentStatus(UUID requestId, PaymentStatus status);
}
