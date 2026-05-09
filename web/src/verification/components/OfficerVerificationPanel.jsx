import { useEffect, useState } from 'react';
import apiService from '../../shared/services/api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const statusLabel = {
  PENDING_VERIFICATION: 'Pending Verification',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

export default function OfficerVerificationPanel({ user }) {
  const [statusData, setStatusData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allowUpload = ['PENDING_VERIFICATION', 'REJECTED', 'APPROVED'].includes(user?.status);

  const loadStatus = async () => {
    try {
      const response = await apiService.getOfficerVerificationStatus();
      setStatusData(response);
    } catch (e) {
      setError(e.message || 'Unable to load officer verification status');
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const validateFile = (file) => {
    if (!file) {
      return 'Please choose a file.';
    }

    if (file.size > MAX_SIZE_BYTES) {
      return 'File must be 10 MB or less.';
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'File must be JPG, JPEG, PNG, or PDF.';
    }

    return '';
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    setError('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    setError('');
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await apiService.uploadOfficerAppointmentProof(selectedFile);
      setSelectedFile(null);
      await loadStatus();
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <div className="card-title">Officer Onboarding Verification</div>
      </div>

      <div style={{ padding: '14px 0', display: 'grid', gap: '12px' }}>
        <div>
          <strong>Status:</strong> {statusLabel[statusData?.status || user?.status] || user?.status}
        </div>
        <div>
          <strong>Barangay:</strong> {statusData?.barangayCode || user?.barangayCode || 'N/A'}
        </div>
        <div>
          <strong>Submitted Proof Files:</strong> {statusData?.fileCount ?? 0}
        </div>

        {allowUpload && (
          <>
            <div style={{ color: '#475569', fontSize: '14px' }}>
              Upload your appointment proof from the barangay office. You may re-upload if your request is rejected.
            </div>

            <div className="form-group">
              <label className="form-label">Appointment Proof File</label>
              <input
                className="form-input"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileSelect}
              />
              <small style={{ color: '#6b7280' }}>Allowed: JPG, JPEG, PNG, PDF. Max size: 10 MB.</small>
            </div>

            {selectedFile && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
                <div><strong>Selected:</strong> {selectedFile.name}</div>
                <div><strong>Size:</strong> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
            )}

            <button className="btn-primary" onClick={handleUpload} disabled={loading || !selectedFile}>
              {loading ? 'Uploading...' : 'Upload Appointment Proof'}
            </button>
          </>
        )}

        {error && <div className="error-message">{error}</div>}

        <div style={{ marginTop: '8px' }}>
          <strong>Latest Files</strong>
          <div style={{ marginTop: '8px', display: 'grid', gap: '8px' }}>
            {(statusData?.files || []).slice(0, 5).map((file) => (
              <div key={file.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
                <div><strong>{file.originalFileName}</strong> ({file.category})</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Uploaded: {new Date(file.uploadedAt).toLocaleString()}</div>
                {file.signedUrl && (
                  <a href={file.signedUrl} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#1d4ed8' }}>
                    View Secure File
                  </a>
                )}
              </div>
            ))}
            {(!statusData?.files || statusData.files.length === 0) && (
              <div style={{ fontSize: '13px', color: '#6b7280' }}>No uploaded files yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
