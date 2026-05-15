import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../shared/services/api';
import paymentApi from '../../../payment/api/paymentApi';
import ResidentSidebar from '../../../users/components/ResidentSidebar';
import './RequestHistoryPage.css';

const DOCUMENT_META = {
  BARANGAY_CLEARANCE: { label: 'Barangay Clearance', icon: '📄' },
  CERTIFICATE_OF_RESIDENCY: { label: 'Certificate of Residency', icon: '🏠' },
  CERTIFICATE_OF_INDIGENCY: { label: 'Certificate of Indigency', icon: '📋' },
  BUSINESS_CLEARANCE: { label: 'Business Clearance', icon: '💼' },
  CERTIFICATE_OF_GOOD_MORAL: { label: 'Good Moral Certificate', icon: '👶' },
  BARANGAY_ID: { label: 'Barangay ID', icon: '🪪' },
};

const STATUS_META = {
  SUBMITTED: { label: 'Pending', badgeClass: 'sb-pending' },
  UNDER_REVIEW: { label: 'Under Review', badgeClass: 'sb-pending' },
  PENDING_PAYMENT: { label: 'Pending Payment', badgeClass: 'sb-payment' },
  APPROVED: { label: 'Approved', badgeClass: 'sb-approved' },
  READY_FOR_RELEASE: { label: 'For Release', badgeClass: 'sb-release' },
  DECLINED: { label: 'Rejected', badgeClass: 'sb-rejected' },
};

const PAGE_SIZE = 8;

const formatRequestId = (id) => {
  if (!id) {
    return 'REQ-000';
  }

  return `REQ-${String(id).slice(0, 3).toUpperCase()}${String(id).slice(3, 6).toUpperCase()}`;
};

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

const formatRelative = (value) => {
  if (!value) {
    return '';
  }

  const now = Date.now();
  const time = new Date(value).getTime();
  const days = Math.max(0, Math.floor((now - time) / (1000 * 60 * 60 * 24)));

  if (days === 0) {
    return 'Today';
  }

  if (days === 1) {
    return '1 day ago';
  }

  return `${days} days ago`;
};

const getGeneratedDocument = (request) => {
  const files = Array.isArray(request?.files) ? request.files : [];
  const generated = files
    .filter((file) => file.fileType === 'GENERATED_DOCUMENT' && file.signedUrl)
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
  return generated[0] || null;
};

const getTimeline = (request) => {
  const hasGenerated = Boolean(getGeneratedDocument(request));

  if (request.status === 'DECLINED') {
    return [
      { key: 'Submitted', state: 'done', dot: '✓' },
      { key: 'Under Review', state: 'done', dot: '✓' },
      { key: 'Rejected', state: 'active', dot: '✕' },
    ];
  }

  return [
    { key: 'Submitted', state: 'done', dot: '✓' },
    {
      key: 'Under Review',
      state: request.status === 'SUBMITTED' ? 'default' : 'done',
      dot: request.status === 'SUBMITTED' ? '2' : '✓',
    },
    {
      key: 'Approved',
      state: ['APPROVED', 'READY_FOR_RELEASE'].includes(request.status) || hasGenerated ? 'done' : 'default',
      dot: ['APPROVED', 'READY_FOR_RELEASE'].includes(request.status) || hasGenerated ? '✓' : '3',
    },
    {
      key: 'For Release',
      state: hasGenerated ? 'done' : request.status === 'READY_FOR_RELEASE' ? 'active' : 'default',
      dot: hasGenerated ? '✓' : request.status === 'READY_FOR_RELEASE' ? '📦' : '4',
    },
    {
      key: 'Released',
      state: hasGenerated ? 'active' : 'default',
      dot: hasGenerated ? '⬇' : '5',
    },
  ];
};

export default function RequestHistoryPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('NEWEST');
  const [page, setPage] = useState(1);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [payingRequestId, setPayingRequestId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await apiService.getMyDocumentRequests();
        if (!cancelled) {
          setRequests(Array.isArray(data) ? data : []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setRequests([]);
          setError(requestError.message || 'Unable to load requests');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    return requests.reduce(
      (acc, request) => {
        acc.total += 1;

        if (['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'].includes(request.status)) {
          acc.pending += 1;
        }

        if (request.status === 'APPROVED') {
          acc.approved += 1;
        }

        if (request.status === 'READY_FOR_RELEASE') {
          acc.release += 1;
        }

        if (request.status === 'DECLINED') {
          acc.rejected += 1;
        }

        return acc;
      },
      { total: 0, pending: 0, approved: 0, release: 0, rejected: 0 },
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();

    const filtered = requests.filter((request) => {
      if (filter === 'PENDING' && !['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'].includes(request.status)) {
        return false;
      }

      if (filter === 'APPROVED' && request.status !== 'APPROVED') {
        return false;
      }

      if (filter === 'RELEASE' && request.status !== 'READY_FOR_RELEASE') {
        return false;
      }

      if (filter === 'REJECTED' && request.status !== 'DECLINED') {
        return false;
      }

      if (!lowerQuery) {
        return true;
      }

      const docLabel = DOCUMENT_META[request.documentType]?.label || request.documentType || '';
      const searchBlob = [
        request.id,
        docLabel,
        request.purpose,
        request.additionalDetails,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchBlob.includes(lowerQuery);
    });

    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sort === 'OLDEST') {
        return new Date(left.requestTimestamp || 0) - new Date(right.requestTimestamp || 0);
      }

      if (sort === 'STATUS') {
        return (STATUS_META[left.status]?.label || left.status || '').localeCompare(STATUS_META[right.status]?.label || right.status || '');
      }

      if (sort === 'DOCUMENT') {
        const leftDoc = DOCUMENT_META[left.documentType]?.label || left.documentType || '';
        const rightDoc = DOCUMENT_META[right.documentType]?.label || right.documentType || '';
        return leftDoc.localeCompare(rightDoc);
      }

      return new Date(right.requestTimestamp || 0) - new Date(left.requestTimestamp || 0);
    });

    return sorted;
  }, [filter, query, requests, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));

  const pagedRequests = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, page]);

  useEffect(() => {
    setPage(1);
  }, [query, filter, sort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const toggleDetails = (requestId) => {
    setExpandedRequestId((current) => (current === requestId ? null : requestId));
  };

  const downloadGenerated = (request) => {
    const generated = getGeneratedDocument(request);
    if (generated?.signedUrl) {
      window.open(generated.signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePayNow = async (request) => {
    if (payingRequestId) return;
    setPayingRequestId(request.id);
    try {
      const result = await paymentApi.createCheckout(request.id);
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setError('Unable to start payment. Please try again.');
      }
    } catch (payErr) {
      setError(payErr.message || 'Unable to start payment. Please try again.');
    } finally {
      setPayingRequestId(null);
    }
  };

  return (
    <div className="my-requests-shell">
      <ResidentSidebar activeItem="requests" />

      <div className="my-requests-main">
        <header className="my-requests-header">
          <div className="my-requests-header-left">
            <div className="my-requests-header-title">My Requests</div>
            <div className="my-requests-header-breadcrumb">Dashboard → <span>My Requests</span></div>
          </div>
          <div className="my-requests-header-right">
            <div className="my-requests-header-flag" aria-hidden="true">
              <div className="hf-blue"></div>
              <div className="hf-red"></div>
            </div>
            <button type="button" className="btn-new-request" onClick={() => navigate('/requests/submit')}>
              <span>＋</span> New Request
            </button>
          </div>
        </header>

        <div className="my-requests-content">
          <div className="stat-strip">
            <div className="stat-card sc-total">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Requests</div>
              <span className="stat-icon">📋</span>
            </div>
            <div className="stat-card sc-pending">
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">Pending Review</div>
              <span className="stat-icon">⏳</span>
            </div>
            <div className="stat-card sc-approved">
              <div className="stat-value">{stats.approved}</div>
              <div className="stat-label">Approved</div>
              <span className="stat-icon">✅</span>
            </div>
            <div className="stat-card sc-release">
              <div className="stat-value">{stats.release}</div>
              <div className="stat-label">For Release</div>
              <span className="stat-icon">📦</span>
            </div>
            <div className="stat-card sc-rejected">
              <div className="stat-value">{stats.rejected}</div>
              <div className="stat-label">Rejected</div>
              <span className="stat-icon">❌</span>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by document type, purpose, or request ID…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="filter-chips">
              <button type="button" className={`chip ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
                All ({stats.total})
              </button>
              <button type="button" className={`chip c-pending ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>
                Pending ({stats.pending})
              </button>
              <button type="button" className={`chip c-approved ${filter === 'APPROVED' ? 'active' : ''}`} onClick={() => setFilter('APPROVED')}>
                Approved ({stats.approved})
              </button>
              <button type="button" className={`chip c-release ${filter === 'RELEASE' ? 'active' : ''}`} onClick={() => setFilter('RELEASE')}>
                For Release ({stats.release})
              </button>
              <button type="button" className={`chip c-rejected ${filter === 'REJECTED' ? 'active' : ''}`} onClick={() => setFilter('REJECTED')}>
                Rejected ({stats.rejected})
              </button>
            </div>

            <div className="toolbar-sep"></div>

            <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="NEWEST">Sort: Newest First</option>
              <option value="OLDEST">Sort: Oldest First</option>
              <option value="STATUS">Sort: Status</option>
              <option value="DOCUMENT">Sort: Document Type</option>
            </select>
          </div>

          <div className="requests-card">
            <div className="table-head">
              <div className="th">Request ID</div>
              <div className="th">Document</div>
              <div className="th">Date Submitted</div>
              <div className="th">Purpose</div>
              <div className="th">Copies</div>
              <div className="th">Status</div>
              <div className="th">Actions</div>
            </div>

            {loading && <div className="table-state">Loading requests...</div>}
            {!loading && error && <div className="table-state table-error">{error}</div>}
            {!loading && !error && pagedRequests.length === 0 && <div className="table-state">No matching requests found.</div>}

            {!loading && !error && pagedRequests.map((request) => {
              const isOpen = expandedRequestId === request.id;
              const documentMeta = DOCUMENT_META[request.documentType] || { label: request.documentType, icon: '📄' };
              const statusMeta = STATUS_META[request.status] || { label: request.status, badgeClass: 'sb-pending' };
              const generatedDocument = getGeneratedDocument(request);
              const timeline = getTimeline(request);

              return (
                <div key={request.id} className={`table-row-wrapper ${isOpen ? 'expanded' : ''}`}>
                  <div className="table-row">
                    <div className="td req-id">{formatRequestId(request.id)}</div>
                    <div className="td doc-cell">
                      <div className="doc-icon-wrap">{documentMeta.icon}</div>
                      <div>
                        <div className="doc-name">{documentMeta.label}</div>
                        <div className="doc-copies">{request.copies || 1} {request.copies === 1 ? 'copy' : 'copies'}</div>
                      </div>
                    </div>
                    <div className="td">
                      <div className="date-text">{formatDate(request.requestTimestamp)}</div>
                      <div className="date-text date-sub">{formatRelative(request.requestTimestamp)}</div>
                    </div>
                    <div className="td"><span className="purpose-tag">{request.purpose || 'General'}</span></div>
                    <div className="td copies-text">{request.copies || 1}</div>
                    <div className="td">
                      <span className={`status-badge ${statusMeta.badgeClass}`}>
                        <span className="sb-dot"></span> {statusMeta.label}
                      </span>
                    </div>
                    <div className="td actions-cell">
                      <button type="button" className="action-btn ab-view" onClick={() => toggleDetails(request.id)}>View</button>
                      {request.status === 'PENDING_PAYMENT' && (() => {
                        const pymtStatus = request.paymentInfo?.paymentStatus;

                        // Already paid — button shouldn't appear (status would have changed), but guard anyway
                        if (pymtStatus === 'PAID') return null;

                        // Checkout already created but not yet completed — offer to resume
                        if (pymtStatus === 'PENDING') {
                          return (
                            <button
                              type="button"
                              className="action-btn ab-pay ab-pay-resume"
                              onClick={() => handlePayNow(request)}
                              disabled={payingRequestId === request.id}
                              title="Resume your existing PayMongo checkout"
                            >
                              {payingRequestId === request.id ? '...' : '↩ Resume Payment'}
                            </button>
                          );
                        }

                        // No payment record yet — fresh checkout
                        return (
                          <button
                            type="button"
                            className="action-btn ab-pay"
                            onClick={() => handlePayNow(request)}
                            disabled={payingRequestId === request.id}
                            title="Pay via PayMongo"
                          >
                            {payingRequestId === request.id ? '...' : '💳 Pay Now'}
                          </button>
                        );
                      })()}
                      {request.status === 'DECLINED' && (
                        <button type="button" className="action-btn ab-resubmit" onClick={() => navigate('/requests/submit')}>
                          ↺ Resubmit
                        </button>
                      )}
                      {generatedDocument && (
                        <button type="button" className="action-btn ab-download" onClick={() => downloadGenerated(request)}>⬇</button>
                      )}
                    </div>
                  </div>

                  {request.status === 'DECLINED' && request.officerRemarks && (
                    <div className="remarks-wrap">
                      <div className="remarks-row">
                        <span className="remarks-icon">⚠️</span>
                        <div className="remarks-text">
                          <span className="remarks-label">Rejection Reason: </span>
                          {request.officerRemarks}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`detail-panel ${isOpen ? 'open' : ''}`}>
                    <div className="detail-field">
                      <div className="detail-key">Approved by</div>
                      <div className="detail-val">{request.assignedOfficerUserId ? String(request.assignedOfficerUserId).slice(0, 8) : 'Not assigned yet'}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-key">Date Updated</div>
                      <div className="detail-val">{formatDate(request.updatedAt || request.requestTimestamp)}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-key">Estimated Release</div>
                      <div className="detail-val">{request.status === 'READY_FOR_RELEASE' ? 'Ready for pickup' : 'To be announced'}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-key">Officer Remarks</div>
                      <div className={`detail-val ${request.officerRemarks ? '' : 'muted'}`}>{request.officerRemarks || 'No remarks provided.'}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-key">Pickup Location</div>
                      <div className="detail-val">Barangay Hall</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-key">Primary Attachment</div>
                      <div className={`detail-val ${request.files?.length ? '' : 'muted'}`}>
                        {request.files?.[0]?.originalFileName || 'No attachment uploaded'}
                      </div>
                    </div>

                    <div className="detail-timeline">
                      <div className="tl-label">Request Timeline</div>
                      <div className="tl-track">
                        {timeline.map((step) => (
                          <div key={`${request.id}-${step.key}`} className={`tl-step ${step.state === 'done' ? 'done' : ''} ${step.state === 'active' ? 'active' : ''}`}>
                            <div className="tl-dot">{step.dot}</div>
                            <div className="tl-step-label">{step.key}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pagination">
            <div className="page-info">Showing <strong>{pagedRequests.length}</strong> of <strong>{filteredRequests.length}</strong> requests</div>
            <div className="page-btns">
              <button type="button" className="page-btn" title="Previous" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>‹</button>
              <button type="button" className="page-btn current">{page}</button>
              <button type="button" className="page-btn" title="Next" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
