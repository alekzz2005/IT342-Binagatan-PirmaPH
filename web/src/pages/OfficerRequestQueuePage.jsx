import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useModal } from '../context/ModalContext';
import './OfficerRequestQueuePage.css';

const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DECLINED'];

export default function OfficerRequestQueuePage() {
  const navigate = useNavigate();
  const { showModal } = useModal();

  const [filter, setFilter] = useState('SUBMITTED');
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [generatedFile, setGeneratedFile] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const data = await apiService.getOfficerRequestQueue(filter);
      setQueue(data);
      if (data.length) {
        setSelected(data[0]);
      } else {
        setSelected(null);
      }
    } catch (e) {
      setError(e.message || 'Unable to load queue');
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const selectedDetails = useMemo(() => selected || null, [selected]);

  const changeStatus = async (status) => {
    if (!selectedDetails) return;
    try {
      await apiService.updateOfficerRequestStatus(selectedDetails.id, { status, remarks });
      showModal({
        context: 'success',
        title: 'Status Updated',
        message: `Request moved to ${status}.`,
        showCancel: false,
        confirmText: 'OK',
      });
      setRemarks('');
      await load();
    } catch (e) {
      setError(e.message || 'Unable to update status');
    }
  };

  const uploadGenerated = async () => {
    if (!selectedDetails || !generatedFile) return;
    try {
      await apiService.uploadGeneratedRequestDocument(selectedDetails.id, generatedFile);
      showModal({
        context: 'success',
        title: 'Generated Document Uploaded',
        message: 'The signed/generated document is now attached to this request.',
        showCancel: false,
        confirmText: 'OK',
      });
      setGeneratedFile(null);
      await load();
    } catch (e) {
      setError(e.message || 'Unable to upload generated document');
    }
  };

  return (
    <div className="officer-queue-page">
      <header>
        <button onClick={() => navigate('/dashboard/officer')}>← Back</button>
        <h1>Officer Request Queue</h1>
      </header>

      <div className="filter-row">
        {STATUSES.map((status) => (
          <button
            key={status}
            className={filter === status ? 'active' : ''}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="queue-layout">
        <section className="queue-list">
          <h3>Requests ({queue.length})</h3>
          {queue.map((request) => (
            <button
              key={request.id}
              className={`queue-item ${selectedDetails?.id === request.id ? 'selected' : ''}`}
              onClick={() => setSelected(request)}
            >
              <strong>{request.documentType}</strong>
              <span>{request.purpose}</span>
              <small>{new Date(request.requestTimestamp).toLocaleString()}</small>
            </button>
          ))}
          {queue.length === 0 && <div className="empty">No requests in this status.</div>}
        </section>

        <section className="queue-detail">
          {!selectedDetails && <div>Select a request to review.</div>}

          {selectedDetails && (
            <>
              <h3>{selectedDetails.documentType}</h3>
              <p><strong>Purpose:</strong> {selectedDetails.purpose}</p>
              <p><strong>Status:</strong> {selectedDetails.status}</p>
              <p><strong>Submitted:</strong> {new Date(selectedDetails.requestTimestamp).toLocaleString()}</p>
              <p><strong>Remarks:</strong> {selectedDetails.officerRemarks || 'None'}</p>

              <div className="files-box">
                <strong>Attachments</strong>
                {(selectedDetails.files || []).map((file) => (
                  <a key={file.id} href={file.signedUrl} target="_blank" rel="noreferrer">{file.originalFileName} ({file.fileType})</a>
                ))}
                {(selectedDetails.files || []).length === 0 && <span>No files attached.</span>}
              </div>

              <textarea
                placeholder="Remarks (required when declining)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />

              <div className="action-row">
                <button onClick={() => changeStatus('UNDER_REVIEW')}>Mark Under Review</button>
                <button onClick={() => changeStatus('APPROVED')} className="approve">Approve</button>
                <button onClick={() => changeStatus('DECLINED')} className="decline">Decline</button>
              </div>

              <div className="upload-generated">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setGeneratedFile(e.target.files?.[0] || null)} />
                <button onClick={uploadGenerated} disabled={!generatedFile}>Upload Generated Document</button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
