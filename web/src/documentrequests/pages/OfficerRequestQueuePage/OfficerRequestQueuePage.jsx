import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  Home,
  Hourglass,
  LogOut,
  Package,
  Search,
  RefreshCcw,
  User,
  XCircle,
} from 'lucide-react';
import apiService from '../../../shared/services/api';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import OfficerVerificationPanel from '../../../verification/components/OfficerVerificationPanel';
import './OfficerRequestQueuePage.css';

const STATUS = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  READY_FOR_RELEASE: 'READY_FOR_RELEASE',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
};

const FILTERS = {
  ALL: 'ALL',
  PENDING: 'PENDING',
  PAYMENT: 'PAYMENT',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  READY: 'READY',
};

const QUEUE_STATUSES = [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.APPROVED, STATUS.DECLINED, STATUS.READY_FOR_RELEASE, STATUS.PENDING_PAYMENT];

const DOCUMENT_LABELS = {
  BARANGAY_CLEARANCE: 'Brgy. Clearance',
  CERTIFICATE_OF_RESIDENCY: 'Cert. of Residency',
  CERTIFICATE_OF_INDIGENCY: 'Cert. of Indigency',
  BUSINESS_CLEARANCE: 'Business Clearance',
  CERTIFICATE_OF_GOOD_MORAL: 'Cert. of Good Moral',
  BARANGAY_ID: 'Brgy. ID',
};

const STATUS_LABELS = {
  [STATUS.SUBMITTED]: 'Pending',
  [STATUS.UNDER_REVIEW]: 'Under Review',
  [STATUS.APPROVED]: 'Approved',
  [STATUS.DECLINED]: 'Rejected',
  [STATUS.READY_FOR_RELEASE]: 'For Release',
  [STATUS.PENDING_PAYMENT]: 'Pending Payment',
};

const STATUS_BADGE_CLASS = {
  [STATUS.SUBMITTED]: 'sb-pending',
  [STATUS.UNDER_REVIEW]: 'sb-pending',
  [STATUS.APPROVED]: 'sb-approved',
  [STATUS.DECLINED]: 'sb-rejected',
  [STATUS.READY_FOR_RELEASE]: 'sb-ready',
  [STATUS.PENDING_PAYMENT]: 'sb-payment',
};

const isPendingStatus = (status) => status === STATUS.SUBMITTED || status === STATUS.UNDER_REVIEW;

const getDocumentLabel = (documentType) => DOCUMENT_LABELS[documentType] || documentType || 'Unknown Document';

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
};

const getRequestNumber = (id) => {
  if (!id) {
    return 'REQ-000';
  }

  const compact = String(id).replace(/-/g, '').slice(-3).toUpperCase();
  return `REQ-${compact}`;
};

const getDisplayName = (request) => {
  const fallback = `Resident ${String(request.residentUserId || '').slice(0, 8) || 'Unknown'}`;
  return request.residentFullName || fallback;
};

const getDisplayEmail = (request) => {
  return request.residentEmail || `ID: ${String(request.residentUserId || '').slice(0, 12) || 'N/A'}`;
};

const matchesFilter = (request, activeFilter) => {
  switch (activeFilter) {
    case FILTERS.PENDING:
      return isPendingStatus(request.status);
    case FILTERS.PAYMENT:
      return request.status === STATUS.PENDING_PAYMENT;
    case FILTERS.APPROVED:
      return request.status === STATUS.APPROVED;
    case FILTERS.REJECTED:
      return request.status === STATUS.DECLINED;
    case FILTERS.READY:
      return request.status === STATUS.READY_FOR_RELEASE;
    case FILTERS.ALL:
    default:
      return true;
  }
};

const sortRequests = (requests, sortBy) => {
  const sorted = [...requests];

  if (sortBy === 'oldest') {
    sorted.sort((a, b) => new Date(a.requestTimestamp) - new Date(b.requestTimestamp));
    return sorted;
  }

  if (sortBy === 'status') {
    sorted.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
    return sorted;
  }

  if (sortBy === 'document') {
    sorted.sort((a, b) => getDocumentLabel(a.documentType).localeCompare(getDocumentLabel(b.documentType)));
    return sorted;
  }

  sorted.sort((a, b) => new Date(b.requestTimestamp) - new Date(a.requestTimestamp));
  return sorted;
};

export default function OfficerRequestQueuePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [sortBy, setSortBy] = useState('newest');
  const [query, setQuery] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOfficerApproved = user?.status === 'APPROVED';

  const loadQueue = async () => {
    setLoading(true);
    setError('');

    try {
      const queueResults = await Promise.all(QUEUE_STATUSES.map((status) => apiService.getOfficerRequestQueue(status)));
      const merged = queueResults.flat().filter(Boolean);

      const deduped = merged.reduce((acc, item) => {
        if (!acc.some((existing) => existing.id === item.id)) {
          acc.push(item);
        }
        return acc;
      }, []);

      setRequests(deduped);

      if (selectedRequestId && !deduped.some((item) => item.id === selectedRequestId)) {
        setSelectedRequestId(null);
        setSelectedRequestDetails(null);
      }
    } catch (queueError) {
      setError(queueError.message || 'Unable to load officer requests');
      setRequests([]);
      setSelectedRequestId(null);
      setSelectedRequestDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOfficerApproved) {
      setLoading(false);
      setRequests([]);
      return;
    }

    loadQueue();
  }, [isOfficerApproved]);

  const counts = useMemo(() => {
    return requests.reduce((summary, request) => {
      summary.total += 1;

      if (isPendingStatus(request.status)) {
        summary.pending += 1;
      }

      if (request.status === STATUS.PENDING_PAYMENT) {
        summary.payment += 1;
      }

      if (request.status === STATUS.APPROVED) {
        summary.approved += 1;
      }

      if (request.status === STATUS.DECLINED) {
        summary.rejected += 1;
      }

      if (request.status === STATUS.READY_FOR_RELEASE) {
        summary.ready += 1;
      }

      return summary;
    }, { total: 0, pending: 0, payment: 0, approved: 0, rejected: 0, ready: 0 });
  }, [requests]);

  const visibleRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = requests.filter((request) => {
      if (!matchesFilter(request, activeFilter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchBlob = [
        getRequestNumber(request.id),
        getDisplayName(request),
        getDisplayEmail(request),
        getDocumentLabel(request.documentType),
        request.purpose,
      ].join(' ').toLowerCase();

      return searchBlob.includes(normalizedQuery);
    });

    return sortRequests(filtered, sortBy);
  }, [requests, activeFilter, query, sortBy]);

  const selectedRequest = useMemo(() => {
    if (!selectedRequestId || !visibleRequests.length) {
      return null;
    }

    const selectedFromQueue = visibleRequests.find((request) => request.id === selectedRequestId);
    if (!selectedFromQueue) {
      return null;
    }

    return selectedRequestDetails && selectedRequestDetails.id === selectedRequestId
      ? selectedRequestDetails
      : selectedFromQueue;
  }, [visibleRequests, selectedRequestDetails, selectedRequestId]);

  useEffect(() => {
    if (selectedRequestId && !visibleRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(null);
      setSelectedRequestDetails(null);
    }
  }, [selectedRequestId, visibleRequests]);

  useEffect(() => {
    setRemarks(selectedRequest?.officerRemarks || '');
  }, [selectedRequest?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadSelectedRequestDetails = async () => {
      if (!selectedRequestId) {
        setSelectedRequestDetails(null);
        setDetailLoading(false);
        return;
      }

      setDetailLoading(true);

      try {
        const data = await apiService.getOfficerRequestById(selectedRequestId);
        if (!cancelled) {
          setSelectedRequestDetails(data || null);
        }
      } catch (detailError) {
        if (!cancelled) {
          setSelectedRequestDetails(null);
          setError(detailError.message || 'Unable to load request details');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    loadSelectedRequestDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedRequestId]);

  const updateStatus = async (nextStatus, targetRequest = selectedRequest) => {
    if (!targetRequest) {
      return;
    }

    const requestRemarks = targetRequest.id === selectedRequest?.id
      ? remarks
      : (targetRequest.officerRemarks || '');

    if (nextStatus === STATUS.DECLINED && !requestRemarks.trim()) {
      setError('Remarks are required when rejecting a request.');
      return;
    }

    setError('');

    try {
      await apiService.updateOfficerRequestStatus(targetRequest.id, {
        status: nextStatus,
        remarks: requestRemarks,
      });

      await loadQueue();

      if (selectedRequestId === targetRequest.id) {
        const refreshed = await apiService.getOfficerRequestById(targetRequest.id);
        setSelectedRequestDetails(refreshed || null);
      }

      showModal({
        context: 'success',
        title: 'Request Updated',
        message: `Request ${getRequestNumber(targetRequest.id)} moved to ${STATUS_LABELS[nextStatus] || nextStatus}.`,
        confirmText: 'OK',
        showCancel: false,
      });
    } catch (updateError) {
      setError(updateError.message || 'Unable to update request status');
    }
  };

  const markReady = () => updateStatus(STATUS.READY_FOR_RELEASE);
  const markPendingPayment = () => updateStatus(STATUS.PENDING_PAYMENT);

  const handleVerifyPayment = async (manual = false) => {
    if (!selectedRequest?.id) return;
    setDetailLoading(true);
    setError('');
    try {
      await apiService.verifyPaymentStatus(selectedRequest.id, manual);
      await loadQueue();
      const refreshed = await apiService.getOfficerRequestById(selectedRequest.id);
      setSelectedRequestDetails(refreshed || null);
      showModal({
        context: 'success',
        title: 'Payment Verified',
        message: manual ? 'Payment manually confirmed as Paid.' : 'Payment status updated successfully.',
        confirmText: 'OK',
        showCancel: false,
      });
    } catch (err) {
      setError(err.message || 'Unable to verify payment status');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogout = () => {
    showModal({
      context: 'confirmation',
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out from the officer panel?',
      confirmText: 'Yes, Logout',
      cancelText: 'Cancel',
      onConfirm: () => {
        logout();
        navigate('/');
      },
    });
  };

  if (!isOfficerApproved) {
    return (
      <div className="officer-panel-shell">
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand">Pirma<span>PH</span></div>
            <div className="brand-sub">Barangay Digital Services</div>
            <div className="officer-badge">Officer Panel</div>
          </div>
        </aside>

        <div className="main">
          <header className="header">
            <div className="header-title">Officer Dashboard</div>
          </header>
          <div className="content onboarding-content">
            <OfficerVerificationPanel user={user} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="officer-panel-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="officer-badge">Officer Panel</div>
        </div>

        <span className="nav-section-label">Management</span>
        <button type="button" className="nav-item active">
          <span className="nav-icon"><ClipboardList size={18} strokeWidth={2} /></span>
          <span>Requests</span>
          <span className="nav-badge">{counts.pending}</span>
        </button>
        <button type="button" className="nav-item" onClick={() => navigate('/officer/profile')}>
          <span className="nav-icon"><User size={18} strokeWidth={2} /></span>
          <span>Profile</span>
        </button>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{String(user?.firstName || 'O').slice(0, 1).toUpperCase()}{String(user?.lastName || 'F').slice(0, 1).toUpperCase()}</div>
            <div className="user-info">
              <h4>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Barangay Officer'}</h4>
              <p>Barangay Officer</p>
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="header">
          <div className="header-title">Request Management</div>
          <div className="header-right">
            <div className="search-box">
              <span className="search-icon"><Search size={16} strokeWidth={2} /></span>
              <input
                type="text"
                placeholder="Search by name, request ID..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button type="button" className="btn-icon" onClick={loadQueue} aria-label="Refresh requests">
              <RefreshCcw size={16} strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="content officer-queue-content">
          <div className="queue-controls">
            <div className="stats-row">
              <div className="stat-card total">
                <div className="stat-label">Total Requests</div>
                <div className="stat-value">{counts.total}</div>
                <div className="stat-icon"><ClipboardList size={22} strokeWidth={2} /></div>
              </div>
              <div className="stat-card pending">
                <div className="stat-label">Pending</div>
                <div className="stat-value">{counts.pending}</div>
                <div className="stat-icon"><Hourglass size={22} strokeWidth={2} /></div>
              </div>
              <div className="stat-card approved">
                <div className="stat-label">Approved</div>
                <div className="stat-value">{counts.approved}</div>
                <div className="stat-icon"><CheckCircle2 size={22} strokeWidth={2} /></div>
              </div>
              <div className="stat-card rejected">
                <div className="stat-label">Rejected</div>
                <div className="stat-value">{counts.rejected}</div>
                <div className="stat-icon"><XCircle size={22} strokeWidth={2} /></div>
              </div>
              <div className="stat-card ready">
                <div className="stat-label">For Release</div>
                <div className="stat-value">{counts.ready}</div>
                <div className="stat-icon"><Package size={22} strokeWidth={2} /></div>
              </div>
            </div>

            <div className="filters-row">
              <span className="filter-label">Filter:</span>
              <button type="button" className={`filter-chip ${activeFilter === FILTERS.ALL ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.ALL)}>
                All ({counts.total})
              </button>
              <button type="button" className={`filter-chip chip-pending ${activeFilter === FILTERS.PENDING ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.PENDING)}>
                Pending ({counts.pending})
              </button>
              <button type="button" className={`filter-chip chip-payment ${activeFilter === FILTERS.PAYMENT ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.PAYMENT)}>
                Payment ({counts.payment})
              </button>
              <button type="button" className={`filter-chip chip-approved ${activeFilter === FILTERS.APPROVED ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.APPROVED)}>
                Approved ({counts.approved})
              </button>
              <button type="button" className={`filter-chip chip-rejected ${activeFilter === FILTERS.REJECTED ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.REJECTED)}>
                Rejected ({counts.rejected})
              </button>
              <button type="button" className={`filter-chip chip-ready ${activeFilter === FILTERS.READY ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.READY)}>
                For Release ({counts.ready})
              </button>
              <div className="filter-sep" />
              <select className="sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="status">Sort: Status</option>
                <option value="document">Sort: Document Type</option>
              </select>
            </div>
          </div>

          {error && <div className="officer-error">{error}</div>}

          <div className="request-list-panel">
            <div className="table-card">
            <div className="table-header-row">
              <div className="th">#</div>
              <div className="th">Resident</div>
              <div className="th">Document</div>
              <div className="th">Submitted</div>
              <div className="th">Purpose</div>
              <div className="th">Status</div>
              <div className="th">Actions</div>
            </div>

            {loading && <div className="table-empty">Loading requests...</div>}

            {!loading && visibleRequests.length === 0 && (
              <div className="table-empty">No requests found for the current filters.</div>
            )}

            {!loading && visibleRequests.map((request) => (
              <button
                type="button"
                key={request.id}
                className={`table-row ${selectedRequest?.id === request.id ? 'selected' : ''}`}
                onClick={() => setSelectedRequestId(request.id)}
              >
                <div className="td req-num">{getRequestNumber(request.id)}</div>
                <div className="td">
                  <div className="resident-name">{getDisplayName(request)}</div>
                  <div className="resident-email">{getDisplayEmail(request)}</div>
                </div>
                <div className="td"><span className="doc-tag">{getDocumentLabel(request.documentType)}</span></div>
                <div className="td date-text">{formatDate(request.requestTimestamp)}</div>
                <div className="td purpose-text">{request.purpose || 'N/A'}</div>
                <div className="td">
                  <span className={`status-badge ${STATUS_BADGE_CLASS[request.status] || 'sb-pending'}`}>
                    {STATUS_LABELS[request.status] || request.status}
                  </span>
                </div>
                <div className="td actions" onClick={(event) => event.stopPropagation()}>
                  {isPendingStatus(request.status) && (
                    <>
                      <button type="button" className="action-btn ab-approve" onClick={() => { setSelectedRequestId(request.id); updateStatus(STATUS.APPROVED, request); }}>
                        Approve
                      </button>
                      <button type="button" className="action-btn ab-reject" onClick={() => { setSelectedRequestId(request.id); updateStatus(STATUS.DECLINED, request); }}>
                        Reject
                      </button>
                    </>
                  )}
                  {!isPendingStatus(request.status) && (
                    <button type="button" className="action-btn ab-view" onClick={() => setSelectedRequestId(request.id)}>
                      View
                    </button>
                  )}
                </div>
              </button>
            ))}

            <div className="pagination">
              <div className="page-info">Showing {visibleRequests.length} of {counts.total} requests</div>
              <div className="page-btns">
                <button type="button" className="page-btn current">1</button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <div className="detail-overlay">
          <div className="detail-header">
            <div className="detail-title">Request Detail</div>
            <div className="detail-id">{getRequestNumber(selectedRequest.id)} · {formatDate(selectedRequest.requestTimestamp)}</div>
            <button type="button" className="close-btn" onClick={() => setSelectedRequestId(null)}>✕</button>
          </div>

          <div className="detail-body">
            {detailLoading && <div className="officer-error">Refreshing request details...</div>}

            <div className="detail-section">
              <div className="detail-section-title">Resident Info</div>
              <div className="detail-field"><div className="detail-key">Name</div><div className="detail-val">{getDisplayName(selectedRequest)}</div></div>
              <div className="detail-field"><div className="detail-key">Contact</div><div className="detail-val">{getDisplayEmail(selectedRequest)}</div></div>
              <div className="detail-field"><div className="detail-key">Barangay</div><div className="detail-val">{selectedRequest.barangayCode || 'N/A'}</div></div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Request Info</div>
              <div className="detail-field"><div className="detail-key">Document Type</div><div className="detail-val">{getDocumentLabel(selectedRequest.documentType)}</div></div>
              <div className="detail-field"><div className="detail-key">Purpose</div><div className="detail-val">{selectedRequest.purpose || 'N/A'}</div></div>
              <div className="detail-field"><div className="detail-key">Remarks</div><div className="detail-val detail-muted">{selectedRequest.additionalDetails || 'No additional details provided.'}</div></div>
              <div className="detail-field"><div className="detail-key">Status</div><div className="detail-val"><span className={`status-badge ${STATUS_BADGE_CLASS[selectedRequest.status] || 'sb-pending'}`}>{STATUS_LABELS[selectedRequest.status] || selectedRequest.status}</span></div></div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Submitted Files</div>
              <div className="id-preview">
                {(selectedRequest.files || []).length === 0 && <div>No uploaded file found.</div>}
                {(selectedRequest.files || []).slice(0, 3).map((file) => (
                  <div key={file.id} className="file-item">
                    <div className="file-name">{file.originalFileName}</div>
                    <div className="file-meta">{file.fileType} · {formatDate(file.uploadedAt)}</div>
                    {file.signedUrl && (
                      <a href={file.signedUrl} target="_blank" rel="noreferrer" className="file-link">View File</a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Payment Info</div>
              {selectedRequest.paymentInfo ? (
                <>
                  <div className="detail-field"><div className="detail-key">Payment Status</div><div className="detail-val">
                    <span className={`status-badge ${selectedRequest.paymentInfo.paymentStatus === 'PAID' ? 'sb-approved' : 'sb-payment'}`}>
                      {selectedRequest.paymentInfo.paymentStatus === 'PAID' ? '✅ Paid' : selectedRequest.paymentInfo.paymentStatus}
                    </span>
                  </div></div>
                  <div className="detail-field"><div className="detail-key">Amount</div><div className="detail-val">₱{Number(selectedRequest.paymentInfo.amount || 0).toFixed(2)}</div></div>
                  <div className="detail-field"><div className="detail-key">Provider</div><div className="detail-val">{selectedRequest.paymentInfo.paymentProvider || 'N/A'}</div></div>
                  {selectedRequest.paymentInfo.paidAt && (
                    <div className="detail-field"><div className="detail-key">Paid At</div><div className="detail-val">{new Date(selectedRequest.paymentInfo.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
                  )}
                  {selectedRequest.paymentInfo.paymentStatus !== 'PAID' && (
                    <div className="payment-verify-actions" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <button type="button" className="action-btn ab-approve" style={{ padding: '5px 12px', fontSize: 11, fontWeight: 500 }} onClick={() => handleVerifyPayment(false)}>
                        Verify via PayMongo
                      </button>
                      <button type="button" className="action-btn ab-pay" style={{ padding: '5px 12px', fontSize: 11, fontWeight: 500 }} onClick={() => handleVerifyPayment(true)}>
                        Manual Confirm Paid
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="detail-muted" style={{ fontSize: 13 }}>No payment recorded yet.</div>
                  {selectedRequest.status === 'PENDING_PAYMENT' && (
                    <div style={{ marginTop: 12 }}>
                      <button type="button" className="action-btn ab-pay" style={{ padding: '5px 12px', fontSize: 11, fontWeight: 500 }} onClick={() => handleVerifyPayment(true)}>
                        Manual Confirm Paid
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Officer Remarks</div>
              <textarea
                className="remarks-input"
                placeholder="Add remarks or reason for rejection (required when rejecting)..."
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </div>
          </div>

          <div className="detail-footer">
            <div className="action-row">
              <button type="button" className="btn-approve" onClick={() => updateStatus(STATUS.APPROVED)}>Approve</button>
              <button type="button" className="btn-reject" onClick={() => updateStatus(STATUS.DECLINED)}>Reject</button>
              <button type="button" className="btn-payment" onClick={markPendingPayment} title="Request payment from resident">Request Payment</button>
            </div>
            <button type="button" className="btn-ready" onClick={markReady}>Mark as Ready for Release</button>
          </div>
        </div>
      )}
    </div>
  );
}
