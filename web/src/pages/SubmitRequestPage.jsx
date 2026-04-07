import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useModal } from '../context/ModalContext';
import './SubmitRequestPage.css';

const DOC_OPTIONS = [
  { value: 'BARANGAY_CLEARANCE', label: 'Barangay Clearance', icon: '📄', days: '3-5 days' },
  { value: 'CERTIFICATE_OF_RESIDENCY', label: 'Certificate of Residency', icon: '🏠', days: '2-3 days' },
  { value: 'CERTIFICATE_OF_INDIGENCY', label: 'Certificate of Indigency', icon: '🤲', days: '3-5 days' },
  { value: 'BUSINESS_CLEARANCE', label: 'Business Clearance', icon: '💼', days: '5-7 days' },
  { value: 'CERTIFICATE_OF_GOOD_MORAL', label: 'Certificate of Good Moral', icon: '👶', days: '2-3 days' },
  { value: 'BARANGAY_ID', label: 'Barangay ID', icon: '📋', days: '5-7 days' },
];

const PURPOSE_OPTIONS = [
  'Employment / Job Application',
  'Bank / Financial Requirement',
  'School / Educational Enrollment',
  'Travel / Visa Application',
  'Medical / Health Services',
  'Government Transaction',
  'Other',
];

export default function SubmitRequestPage() {
  const navigate = useNavigate();
  const { showModal } = useModal();

  const [form, setForm] = useState({
    documentType: 'BARANGAY_CLEARANCE',
    purpose: PURPOSE_OPTIONS[0],
    additionalDetails: '',
    copies: 1,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [requestResult, setRequestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedDoc = useMemo(() => DOC_OPTIONS.find((item) => item.value === form.documentType), [form.documentType]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const created = await apiService.submitDocumentRequest({
        documentType: form.documentType,
        purpose: form.purpose,
        additionalDetails: form.additionalDetails,
        copies: Number(form.copies),
      });

      if (selectedFile) {
        await apiService.uploadRequestAttachment(created.id, selectedFile);
      }

      setRequestResult(created);
      showModal({
        context: 'success',
        title: 'Request Submitted',
        message: `Your ${selectedDoc?.label || 'document'} request has been submitted successfully.`,
        detail: `Request ID: ${created.id}\nStatus: ${created.status}`,
        confirmText: 'View My Requests',
        showCancel: false,
        onConfirm: () => navigate('/requests/mine'),
      });
    } catch (e) {
      setError(e.message || 'Unable to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="submit-request-page">
      <header className="submit-header">
        <button className="back-btn" onClick={() => navigate('/dashboard/resident')} aria-label="Back">←</button>
        <div>
          <h1>Submit Document Request</h1>
          <p>Fill in your request details and optional supporting file.</p>
        </div>
      </header>

      <div className="submit-layout">
        <form className="submit-card" onSubmit={onSubmit}>
          <h2>Request Details</h2>

          <div className="doc-grid">
            {DOC_OPTIONS.map((doc) => (
              <button
                key={doc.value}
                type="button"
                className={`doc-option ${form.documentType === doc.value ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, documentType: doc.value })}
              >
                <span className="doc-icon">{doc.icon}</span>
                <strong>{doc.label}</strong>
                <small>{doc.days}</small>
              </button>
            ))}
          </div>

          <label>Purpose</label>
          <select
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            required
          >
            {PURPOSE_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <label>Additional Details</label>
          <textarea
            value={form.additionalDetails}
            onChange={(e) => setForm({ ...form, additionalDetails: e.target.value })}
            placeholder="Optional details..."
            rows={4}
          />

          <label>Number of Copies</label>
          <select
            value={form.copies}
            onChange={(e) => setForm({ ...form, copies: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>{count} {count === 1 ? 'copy' : 'copies'}</option>
            ))}
          </select>

          <label>Supporting File (Optional)</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <small>Allowed: PDF, JPG, JPEG, PNG. Max 10 MB.</small>

          {error && <div className="error-text">{error}</div>}

          <div className="actions">
            <button type="button" className="secondary" onClick={() => navigate('/dashboard/resident')}>Cancel</button>
            <button type="submit" className="primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </form>

        <aside className="summary-card">
          <h3>Request Summary</h3>
          <div className="summary-row"><span>Type</span><strong>{selectedDoc?.label}</strong></div>
          <div className="summary-row"><span>Purpose</span><strong>{form.purpose}</strong></div>
          <div className="summary-row"><span>Copies</span><strong>{form.copies}</strong></div>
          <div className="summary-row"><span>Estimated Processing</span><strong>{selectedDoc?.days}</strong></div>
          <div className="summary-row"><span>File Attached</span><strong>{selectedFile ? selectedFile.name : 'None'}</strong></div>

          {requestResult && (
            <div className="request-meta">
              <div><span>Last Request ID</span><strong>{requestResult.id}</strong></div>
              <div><span>Status</span><strong>{requestResult.status}</strong></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
