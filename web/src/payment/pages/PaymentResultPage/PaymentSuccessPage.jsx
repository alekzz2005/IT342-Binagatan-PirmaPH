import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ResidentSidebar from '../../../users/components/ResidentSidebar';
import './PaymentResultPage.css';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');
  const [countdown, setCountdown] = useState(8);

  // Auto-redirect to request history after countdown
  useEffect(() => {
    if (countdown <= 0) {
      navigate('/requests/mine');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <div className="payment-result-shell">
      <ResidentSidebar activeItem="requests" />

      <div className="payment-result-main">
        <header className="payment-result-header">
          <div className="payment-result-header-left">
            <div className="payment-result-header-title">Payment</div>
            <div className="payment-result-header-breadcrumb">
              My Requests → <span>Payment Confirmation</span>
            </div>
          </div>
          <div className="payment-result-header-right">
            <div className="payment-result-header-flag" aria-hidden="true">
              <div className="hf-blue" />
              <div className="hf-red" />
            </div>
          </div>
        </header>

        <div className="payment-result-content">
          <div className="result-card success-card">
            {/* Top bar */}
            <div className="result-topbar">
              <span style={{ background: '#0038A8' }} />
              <span style={{ background: '#CE1126' }} />
              <span style={{ background: '#FCD116' }} />
            </div>

            <div className="result-icon-zone">
              <div className="result-icon success-icon">✅</div>
            </div>

            <div className="result-body">
              <h1 className="result-title" style={{ color: 'var(--green)' }}>Payment Successful!</h1>
              <p className="result-message">
                Your payment has been confirmed. Your document request is now back in the
                processing queue. You will be notified when your document is ready.
              </p>

              {requestId && (
                <div className="result-info-box success-info">
                  <div className="result-info-row">
                    <span className="result-info-key">Request ID</span>
                    <span className="result-info-val">REQ-{requestId.slice(0, 6).toUpperCase()}</span>
                  </div>
                  <div className="result-info-row">
                    <span className="result-info-key">Payment Status</span>
                    <span className="result-info-val" style={{ color: 'var(--green)' }}>✅ Paid</span>
                  </div>
                  <div className="result-info-row">
                    <span className="result-info-key">Payment Provider</span>
                    <span className="result-info-val">PayMongo</span>
                  </div>
                  <div className="result-info-row">
                    <span className="result-info-key">Next Step</span>
                    <span className="result-info-val">Document processing by barangay officer</span>
                  </div>
                </div>
              )}

              <div className="result-note success-note">
                <span>ℹ️</span>
                <span>
                  Redirecting to My Requests in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}…
                </span>
              </div>

              <div className="result-actions">
                <button
                  type="button"
                  className="result-btn primary"
                  onClick={() => navigate('/requests/mine')}
                >
                  View My Requests
                </button>
                <button
                  type="button"
                  className="result-btn secondary"
                  onClick={() => navigate('/requests/submit')}
                >
                  Submit Another Request
                </button>
              </div>
            </div>

            {/* Bottom flag strip */}
            <div className="result-flag">
              <div style={{ background: '#0038A8' }} />
              <div style={{ background: '#CE1126' }} />
              <div style={{ background: '#FCD116' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
