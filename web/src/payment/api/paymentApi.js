import apiService from '../../shared/services/api';

/**
 * Payment API - Feature-scoped wrapper for PayMongo payment calls
 */
class PaymentApi {
  /**
   * Create a PayMongo checkout session for the given document request.
   * Returns { checkoutUrl, checkoutSessionId } on success.
   * Throws with error.message on failure.
   */
  async createCheckout(requestId) {
    return apiService.createPaymentCheckout(requestId);
  }

  /**
   * Actively verify a payment status via the backend.
   */
  async verifyPayment(requestId) {
    return apiService.verifyPaymentStatus(requestId);
  }
}

const paymentApi = new PaymentApi();
export default paymentApi;
