package edu.cit.binagatan.pirmaph.payment.dto;

public class CheckoutResponse {

    private String checkoutUrl;
    private String checkoutSessionId;

    public CheckoutResponse(String checkoutUrl, String checkoutSessionId) {
        this.checkoutUrl = checkoutUrl;
        this.checkoutSessionId = checkoutSessionId;
    }

    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String checkoutUrl) { this.checkoutUrl = checkoutUrl; }

    public String getCheckoutSessionId() { return checkoutSessionId; }
    public void setCheckoutSessionId(String checkoutSessionId) { this.checkoutSessionId = checkoutSessionId; }
}
