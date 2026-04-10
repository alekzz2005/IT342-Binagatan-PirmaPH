import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import apiService from '../services/api';
import ResidentSidebar from '../components/ResidentSidebar';
import './RequestHistoryPage.css';

const STATUS_COLORS = {
  SUBMITTED: '#a07800',
  UNDER_REVIEW: '#1d4ed8',
  APPROVED: '#15803d',
  DECLINED: '#b91c1c',
  PENDING_PAYMENT: '#7c3aed',
  READY_FOR_RELEASE: '#0f766e',
};

const DOCUMENT_LABELS = {
  BARANGAY_CLEARANCE: 'Barangay Clearance',
  CERTIFICATE_OF_RESIDENCY: 'Certificate of Residency',
  CERTIFICATE_OF_INDIGENCY: 'Certificate of Indigency',
  BUSINESS_CLEARANCE: 'Business Clearance',
  CERTIFICATE_OF_GOOD_MORAL: 'Certificate of Good Moral',
  BARANGAY_ID: 'Barangay ID',
};

const formatDocumentType = (documentType) => DOCUMENT_LABELS[documentType] || documentType;

export default function RequestHistoryPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiService.getMyDocumentRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((left, right) => new Date(right.requestTimestamp) - new Date(left.requestTimestamp));
  }, [requests]);

  return (
    <div className="request-history-shell">
      <ResidentSidebar activeItem="requests" />

      <div className="main">
        <div className="request-history-page">
          <header>
            <button type="button" onClick={() => navigate('/dashboard/resident')}><ArrowLeft size={16} strokeWidth={2} /> Back</button>
            <div>
              <h1>My Document Requests</h1>
              <p>Track statuses and view submitted attachments.</p>
            </div>
            <button type="button" className="new-btn" onClick={() => navigate('/requests/submit')}>+ New Request</button>
          </header>

          {loading && <div className="state-text">Loading requests...</div>}
          {error && <div className="error-text">{error}</div>}
          {!loading && !error && sortedRequests.length === 0 && <div className="state-text">No requests yet.</div>}

          {!loading && !error && sortedRequests.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Document</th>
                    <th>Purpose</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Files</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.id.slice(0, 8)}...</td>
                      <td>{formatDocumentType(request.documentType)}</td>
                      <td>{request.purpose}</td>
                      <td>{new Date(request.requestTimestamp).toLocaleString()}</td>
                      <td>
                        <span className="status-pill" style={{ color: STATUS_COLORS[request.status] || '#334155' }}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        <div className="file-list">
                          {(request.files || []).slice(0, 2).map((file) => (
                            <a key={file.id} href={file.signedUrl} target="_blank" rel="noreferrer">{file.originalFileName}</a>
                          ))}
                          {(request.files || []).length === 0 && <span>No files</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
