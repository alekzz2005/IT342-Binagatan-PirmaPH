import { useNavigate, useSearchParams } from 'react-router-dom';
import ResidentSidebar from '../../../users/components/ResidentSidebar';
import './PaymentResultPage.css';

export default function PaymentFailedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');

  return (
    <div className="payment-result-shell">
      <ResidentSidebar activeItem="requests" />

      <div className="payment-result-main">
        <header className="payment-result-header">
          <div className="payment-result-header-left">
            <div className="payment-result-header-title">Payment</div>
            <div className="payment-result-header-breadcrumb">
              My Requests → <span>Payment Failed</span>
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
          <div className="result-card failed-card">
            {/* Top bar */}
            <div className="result-topbar">
              <span style={{ background: '#CE1126' }} />
              <span style={{ background: '#0038A8' }} />
              <span style={{ background: '#FCD116' }} />
            </div>

            <div className="result-icon-zone">
              <div className="result-icon failed-icon">❌</div>
            </div>

            <div className="result-body">
              <h1 className="result-title" style={{ color: 'var(--red)' }}>Payment Cancelled or Failed</h1>
              <p className="result-message">
                Your payment was not completed. Your document request is still in the
                <strong> Pending Payment</strong> status. You can try again at any time
                from your request history.
              </p>

              {requestId && (
                <div className="result-info-box failed-info">
                  <div className="result-info-row">
                    <span className="result-info-key">Request ID</span>
                    <span className="result-info-val">REQ-{requestId.slice(0, 6).toUpperCase()}</span>
                  </div>
                  <div className="result-info-row">
                    <span className="result-info-key">Payment Status</span>
                    <span className="result-info-val" style={{ color: 'var(--red)' }}>❌ Not Paid</span>
                  </div>
                  <div className="result-info-row">
                    <span className="result-info-key">Request Status</span>
                    <span className="result-info-val">Pending Payment</span>
                  </div>
                  <div className="result-info-row">
                    <span className="result-info-key">Next Step</span>
                    <span className="result-info-val">Click "Pay Now" in My Requests to retry</span>
                  </div>
                </div>
              )}

              <div className="result-note failed-note">
                <span>⚠️</span>
                <span>
                  No charges were made. Your request is still saved and waiting for payment.
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
                  onClick={() => navigate('/')}
                >
                  Go to Dashboard
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
