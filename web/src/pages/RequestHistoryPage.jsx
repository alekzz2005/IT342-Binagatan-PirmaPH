import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import './RequestHistoryPage.css';

const STATUS_COLORS = {
  SUBMITTED: '#a07800',
  UNDER_REVIEW: '#1d4ed8',
  APPROVED: '#15803d',
  DECLINED: '#b91c1c',
  PENDING_PAYMENT: '#7c3aed',
  READY_FOR_RELEASE: '#0f766e',
};

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
      setRequests(data);
    } catch (e) {
      setError(e.message || 'Unable to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="request-history-page">
      <header>
        <button onClick={() => navigate('/dashboard/resident')}>← Back</button>
        <div>
          <h1>My Document Requests</h1>
          <p>Track statuses and view submitted attachments.</p>
        </div>
        <button className="new-btn" onClick={() => navigate('/requests/submit')}>+ New Request</button>
      </header>

      {loading && <div className="state-text">Loading requests...</div>}
      {error && <div className="error-text">{error}</div>}
      {!loading && !error && requests.length === 0 && <div className="state-text">No requests yet.</div>}

      {!loading && !error && requests.length > 0 && (
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
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.id.slice(0, 8)}...</td>
                  <td>{request.documentType}</td>
                  <td>{request.purpose}</td>
                  <td>{new Date(request.requestTimestamp).toLocaleString()}</td>
                  <td>
                    <span className="status-pill" style={{ color: STATUS_COLORS[request.status] || '#334155' }}>{request.status}</span>
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
  );
}
