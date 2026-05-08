import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Gauge,
  LogOut,
  Package,
  Search,
  ShieldCheck,
  ShieldX,
  User,
  Users,
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import './BarangayAdminDocumentRequestsPage.css';

const STATUSES = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  READY_FOR_RELEASE: 'READY_FOR_RELEASE',
};

const FILTERS = {
  ALL: 'ALL',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  READY: 'READY',
};

const PAGE_SIZE = 6;

const DOCUMENT_LABELS = {
  BARANGAY_CLEARANCE: 'Brgy. Clearance',
  CERTIFICATE_OF_RESIDENCY: 'Cert. of Residency',
  CERTIFICATE_OF_INDIGENCY: 'Cert. of Indigency',
  BUSINESS_CLEARANCE: 'Business Clearance',
  CERTIFICATE_OF_GOOD_MORAL: 'Cert. of Good Moral',
  BARANGAY_ID: 'Brgy. ID',
};

const STATUS_LABELS = {
  [STATUSES.SUBMITTED]: 'Pending',
  [STATUSES.UNDER_REVIEW]: 'Pending',
  [STATUSES.APPROVED]: 'Approved',
  [STATUSES.DECLINED]: 'Rejected',
  [STATUSES.PENDING_PAYMENT]: 'Pending Payment',
  [STATUSES.READY_FOR_RELEASE]: 'For Release',
};

const STATUS_CLASSNAMES = {
  [STATUSES.SUBMITTED]: 'sb-pending',
  [STATUSES.UNDER_REVIEW]: 'sb-pending',
  [STATUSES.APPROVED]: 'sb-approved',
  [STATUSES.DECLINED]: 'sb-rejected',
  [STATUSES.PENDING_PAYMENT]: 'sb-payment',
  [STATUSES.READY_FOR_RELEASE]: 'sb-ready',
};

const getDocumentLabel = (documentType) => DOCUMENT_LABELS[documentType] || documentType?.replace(/_/g, ' ') || 'Unknown Document';

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

const buildRequestNumber = (requestId) => {
  if (!requestId) {
    return 'REQ-000';
  }

  const compact = String(requestId).replace(/-/g, '').toUpperCase();
  return `REQ-${compact.slice(-3)}`;
};

const initialsForName = (name) => {
  if (!name) {
    return 'BA';
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'BA';
};

const formatName = (resident) => {
  if (!resident) {
    return 'Unknown Resident';
  }

  const fullName = [resident.firstName, resident.middleName, resident.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || resident.fullName || resident.username || 'Unknown Resident';
};

const formatAddress = (resident) => {
  if (!resident) {
    return 'N/A';
  }

  const line1 = [resident.street, resident.barangay]
    .filter(Boolean)
    .join(', ')
    .trim();
  const line2 = [resident.city, resident.province]
    .filter(Boolean)
    .join(', ')
    .trim();

  return [line1, line2, resident.region].filter(Boolean).join(' · ') || 'N/A';
};

const isPendingStatus = (status) => status === STATUSES.SUBMITTED
  || status === STATUSES.UNDER_REVIEW
  || status === STATUSES.PENDING_PAYMENT;

const matchesFilter = (request, filter) => {
  switch (filter) {
    case FILTERS.PENDING:
      return isPendingStatus(request.status);
    case FILTERS.APPROVED:
      return request.status === STATUSES.APPROVED;
    case FILTERS.REJECTED:
      return request.status === STATUSES.DECLINED;
    case FILTERS.READY:
      return request.status === STATUSES.READY_FOR_RELEASE;
    case FILTERS.ALL:
    default:
      return true;
  }
};

const sortRequests = (requests, sortBy) => {
  const sorted = [...requests];

  if (sortBy === 'oldest') {
    return sorted.sort((left, right) => new Date(left.requestTimestamp || 0) - new Date(right.requestTimestamp || 0));
  }

  if (sortBy === 'status') {
    return sorted.sort((left, right) => String(left.status || '').localeCompare(String(right.status || '')));
  }

  if (sortBy === 'document') {
    return sorted.sort((left, right) => getDocumentLabel(left.documentType).localeCompare(getDocumentLabel(right.documentType)));
  }

  return sorted.sort((left, right) => new Date(right.requestTimestamp || 0) - new Date(left.requestTimestamp || 0));
};

const getActionLabel = (status) => {
  if (status === STATUSES.APPROVED) {
    return 'Approve';
  }

  if (status === STATUSES.DECLINED) {
    return 'Reject';
  }

  if (status === STATUSES.READY_FOR_RELEASE) {
    return 'Mark Ready';
  }

  return 'Update';
};

function SidebarItem({ active, icon: Icon, label, badge, onClick }) {
  return (
    <button type="button" className={`nav-item nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon"><Icon size={16} /></span>
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  );
}

export default function BarangayAdminDocumentRequestsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();
  const hasAutoSelectedRequest = useRef(false);

  const [requests, setRequests] = useState([]);
  const [residents, setResidents] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [sortBy, setSortBy] = useState('newest');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadPageData = async () => {
    setLoading(true);
    setError('');

    try {
      const [requestData, residentData] = await Promise.all([
        apiService.getAdminRequestQueue(),
        apiService.getResidents().catch(() => []),
      ]);

      setRequests(Array.isArray(requestData) ? requestData : []);
      setResidents(Array.isArray(residentData) ? residentData : []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load document requests');
      setRequests([]);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const residentsById = useMemo(() => {
    return residents.reduce((map, resident) => {
      map.set(resident.id, resident);
      return map;
    }, new Map());
  }, [residents]);

  const enrichedRequests = useMemo(() => {
    return requests.map((request) => ({
      ...request,
      resident: residentsById.get(request.residentUserId) || null,
    }));
  }, [requests, residentsById]);

  const stats = useMemo(() => {
    return enrichedRequests.reduce((summary, request) => {
      summary.total += 1;

      if (isPendingStatus(request.status)) {
        summary.pending += 1;
      }

      if (request.status === STATUSES.APPROVED) {
        summary.approved += 1;
      }

      if (request.status === STATUSES.DECLINED) {
        summary.rejected += 1;
      }

      if (request.status === STATUSES.READY_FOR_RELEASE) {
        summary.ready += 1;
      }

      return summary;
    }, {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      ready: 0,
    });
  }, [enrichedRequests]);

  const visibleRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = enrichedRequests.filter((request) => {
      if (!matchesFilter(request, activeFilter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const resident = request.resident || {};
      const searchBlob = [
        buildRequestNumber(request.id),
        request.id,
        formatName(resident),
        resident.email,
        resident.username,
        getDocumentLabel(request.documentType),
        request.purpose,
        request.additionalDetails,
        request.officerRemarks,
        request.status,
        request.barangayCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchBlob.includes(normalizedQuery);
    });

    return sortRequests(filtered, sortBy);
  }, [activeFilter, enrichedRequests, query, sortBy]);

  useEffect(() => {
    if (!visibleRequests.length) {
      setSelectedRequestId(null);
      return;
    }

    const selectedExists = visibleRequests.some((request) => request.id === selectedRequestId);

    if (!selectedRequestId && !hasAutoSelectedRequest.current) {
      setSelectedRequestId(visibleRequests[0].id);
      hasAutoSelectedRequest.current = true;
      return;
    }

    if (selectedRequestId && !selectedExists) {
      setSelectedRequestId(visibleRequests[0].id);
    }
  }, [selectedRequestId, visibleRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, query, sortBy]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(visibleRequests.length / PAGE_SIZE));
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, visibleRequests.length]);

  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) {
      return null;
    }

    return visibleRequests.find((request) => request.id === selectedRequestId) || requests.find((request) => request.id === selectedRequestId) || null;
  }, [requests, selectedRequestId, visibleRequests]);

  useEffect(() => {
    setRemarks(selectedRequest?.officerRemarks || '');
  }, [selectedRequest?.id]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleRequests.slice(start, start + PAGE_SIZE);
  }, [currentPage, visibleRequests]);

  const totalPages = Math.max(1, Math.ceil(visibleRequests.length / PAGE_SIZE));

  const pageInfo = useMemo(() => {
    if (!visibleRequests.length) {
      return 'Showing 0 of 0 requests';
    }

    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = start + paginatedRequests.length - 1;
    return `Showing ${start}-${end} of ${visibleRequests.length} requests`;
  }, [currentPage, paginatedRequests.length, visibleRequests.length]);

  const scopeBarangay = user?.barangay || user?.barangayCode || 'Barangay Admin';

  const sidebarSections = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: Gauge, action: () => navigate('/dashboard/barangay-admin') },
        { label: 'User Management', icon: Users, action: () => navigate('/dashboard/barangay-admin/users') },
        { label: 'Document Requests', icon: ClipboardList, active: true, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
      ],
    },
    {
      label: 'Verification',
      items: [
        { label: 'Verification Queue', icon: Search, action: () => navigate('/dashboard/barangay-admin/verification') },
        { label: 'Officer Monitoring', icon: ShieldCheck, action: () => navigate('/dashboard/barangay-admin/officer-monitoring') },
      ],
    },
    {
      label: 'Logs and Reports',
      items: [
        { label: 'Audit Log', icon: FileText, action: () => navigate('/dashboard/barangay-admin/audit-log') },
        { label: 'Profile', icon: User, action: () => navigate('/dashboard/barangay-admin/profile') },
      ],
    },
  ];

  const handleLogout = () => {
    showModal({
      context: 'confirmation',
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out from the barangay admin panel?',
      confirmText: 'Yes, Logout',
      cancelText: 'Cancel',
      onConfirm: () => {
        logout();
        navigate('/');
      },
    });
  };

  const refreshPageData = async (nextSelectedId = selectedRequestId) => {
    await loadPageData();
    if (nextSelectedId) {
      setSelectedRequestId(nextSelectedId);
    }
  };

  const confirmStatusChange = (request, nextStatus) => {
    if (!request?.id) {
      return;
    }

    const requestNumber = buildRequestNumber(request.id);
    const nextLabel = STATUS_LABELS[nextStatus] || nextStatus;
    const actionLabel = getActionLabel(nextStatus);

    showModal({
      context: 'confirmation',
      title: `${actionLabel} request?`,
      message: `Update ${requestNumber} to ${nextLabel}.`,
      detail: `${getDocumentLabel(request.documentType)}\nPurpose: ${request.purpose || 'N/A'}`,
      confirmText: actionLabel,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoadingId(`${request.id}:${nextStatus}`);
          await apiService.overrideAdminRequestStatus(request.id, {
            status: nextStatus,
            remarks: remarks || '',
          });
          await refreshPageData(request.id);
          showModal({
            context: 'success',
            title: 'Request Updated',
            message: `${requestNumber} is now ${nextLabel}.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (requestError) {
          showModal({
            context: 'error',
            title: 'Unable to Update Request',
            message: requestError.message || 'The request status could not be updated.',
            confirmText: 'Close',
            showCancel: false,
          });
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const exportVisibleRequests = () => {
    if (!visibleRequests.length) {
      showModal({
        context: 'info',
        title: 'Nothing to Export',
        message: 'There are no visible requests for the current filters.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    const header = ['requestNumber', 'resident', 'email', 'documentType', 'purpose', 'status', 'submitted', 'barangay'];
    const rows = visibleRequests.map((request) => {
      const resident = request.resident || {};
      return [
        buildRequestNumber(request.id),
        `"${formatName(resident).replace(/"/g, '""')}"`,
        `"${String(resident.email || '').replace(/"/g, '""')}"`,
        `"${getDocumentLabel(request.documentType).replace(/"/g, '""')}"`,
        `"${String(request.purpose || '').replace(/"/g, '""')}"`,
        request.status,
        request.requestTimestamp || '',
        `"${String(request.barangayCode || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `barangay-document-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openSelectedRequest = (request) => {
    setSelectedRequestId(request.id);
  };

  const selectedResident = selectedRequest?.resident || residentsById.get(selectedRequest?.residentUserId) || null;
  const submittedFile = selectedRequest?.files?.[0] || null;
  const selectedRequestStatusLabel = STATUS_LABELS[selectedRequest?.status] || selectedRequest?.status || 'N/A';
  const selectedRequestStatusClass = STATUS_CLASSNAMES[selectedRequest?.status] || 'sb-pending';

  return (
    <div className="barangay-admin-document-requests">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="role-badge">🏛️ Barangay Admin</div>
          <div className="scope-note"><span className="scope-dot"></span> {scopeBarangay}</div>
        </div>
        <span className="nav-section">Overview</span>
        {sidebarSections.map((section) => (
          <div key={section.label}>
            {section.label !== 'Overview' ? <span className="nav-section">{section.label}</span> : null}
            {section.items.map((item) => (
              <SidebarItem
                key={item.label}
                active={item.active}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                onClick={item.action}
              />
            ))}
          </div>
        ))}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-av">{initialsForName(`${user?.firstName || ''} ${user?.lastName || ''}`)}</div>
            <div className="user-info">
              <h4>{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Barangay Admin'}</h4>
              <p>Barangay Admin</p>
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout} aria-label="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="header">
          <div>
            <div className="header-title">Request Management</div>
          </div>
          <div className="header-right">
            <div className="search-box">
              <span className="search-icon" aria-hidden="true"><Search size={16} /></span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, request ID..."
                aria-label="Search document requests"
              />
            </div>
            <button type="button" className="btn-export" onClick={exportVisibleRequests}>
              <Download size={16} /> Export
            </button>
          </div>
        </header>

        <div className="content">
          <div className="stats-row">
            <div className="stat-card total">
              <div className="stat-label">Total Requests</div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-icon"><ClipboardList size={22} /></div>
            </div>
            <div className="stat-card pending">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-icon"><Package size={22} /></div>
            </div>
            <div className="stat-card approved">
              <div className="stat-label">Approved</div>
              <div className="stat-value">{stats.approved}</div>
              <div className="stat-icon"><CheckCircle2 size={22} /></div>
            </div>
            <div className="stat-card rejected">
              <div className="stat-label">Rejected</div>
              <div className="stat-value">{stats.rejected}</div>
              <div className="stat-icon"><ShieldX size={22} /></div>
            </div>
            <div className="stat-card ready">
              <div className="stat-label">For Release</div>
              <div className="stat-value">{stats.ready}</div>
              <div className="stat-icon"><Package size={22} /></div>
            </div>
          </div>

          <div className="filters-row">
            <span className="filter-label">Filter:</span>
            <button type="button" className={`filter-chip ${activeFilter === FILTERS.ALL ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.ALL)}>
              All ({stats.total})
            </button>
            <button type="button" className={`filter-chip chip-pending ${activeFilter === FILTERS.PENDING ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.PENDING)}>
              Pending ({stats.pending})
            </button>
            <button type="button" className={`filter-chip chip-approved ${activeFilter === FILTERS.APPROVED ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.APPROVED)}>
              Approved ({stats.approved})
            </button>
            <button type="button" className={`filter-chip chip-rejected ${activeFilter === FILTERS.REJECTED ? 'active' : ''}`} onClick={() => setActiveFilter(FILTERS.REJECTED)}>
              Rejected ({stats.rejected})
            </button>
            <button
              type="button"
              className={`filter-chip filter-ready ${activeFilter === FILTERS.READY ? 'active' : ''}`}
              onClick={() => setActiveFilter(FILTERS.READY)}
            >
              For Release ({stats.ready})
            </button>
            <div className="filter-sep"></div>
            <select className="sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="status">Sort: Status</option>
              <option value="document">Sort: Document Type</option>
            </select>
          </div>

          {error ? (
            <div className="page-alert error">
              <span>{error}</span>
              <button type="button" onClick={loadPageData}>Retry</button>
            </div>
          ) : null}

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

            {loading ? (
              <div className="table-empty">Loading request queue...</div>
            ) : paginatedRequests.length ? (
              paginatedRequests.map((request) => {
                const resident = request.resident || residentsById.get(request.residentUserId) || null;
                const requestNumber = buildRequestNumber(request.id);
                const isSelected = selectedRequestId === request.id;
                const rowStatusLabel = STATUS_LABELS[request.status] || request.status;
                const rowStatusClass = STATUS_CLASSNAMES[request.status] || 'sb-pending';
                const isReady = request.status === STATUSES.READY_FOR_RELEASE;
                const isApproved = request.status === STATUSES.APPROVED;
                const isPending = isPendingStatus(request.status);

                return (
                  <div
                    key={request.id}
                    className={`table-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => openSelectedRequest(request)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openSelectedRequest(request);
                      }
                    }}
                  >
                    <div className="td req-num">{requestNumber}</div>
                    <div className="td">
                      <div className="resident-name">{formatName(resident)}</div>
                      <div className="resident-email">{resident?.email || `ID: ${String(request.residentUserId || '').slice(0, 12) || 'N/A'}`}</div>
                    </div>
                    <div className="td"><span className="doc-tag">{getDocumentLabel(request.documentType)}</span></div>
                    <div className="td date-text">{formatDate(request.requestTimestamp)}</div>
                    <div className="td purpose-cell">{request.purpose || 'N/A'}</div>
                    <div className="td"><span className={`status-badge ${rowStatusClass}`}>{rowStatusLabel}</span></div>
                    <div className="td actions">
                      <button type="button" className="action-btn ab-view" onClick={(event) => { event.stopPropagation(); openSelectedRequest(request); }}>
                        <Eye size={12} /> View
                      </button>
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            className="action-btn ab-approve"
                            disabled={actionLoadingId === `${request.id}:${STATUSES.APPROVED}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              confirmStatusChange(request, STATUSES.APPROVED);
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            className="action-btn ab-reject"
                            disabled={actionLoadingId === `${request.id}:${STATUSES.DECLINED}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              confirmStatusChange(request, STATUSES.DECLINED);
                            }}
                          >
                            ✗ Reject
                          </button>
                        </>
                      ) : null}
                      {isApproved ? (
                        <button
                          type="button"
                          className="action-btn ab-ready"
                          disabled={actionLoadingId === `${request.id}:${STATUSES.READY_FOR_RELEASE}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            confirmStatusChange(request, STATUSES.READY_FOR_RELEASE);
                          }}
                        >
                          📦 Ready
                        </button>
                      ) : null}
                      {isReady ? (
                        <button
                          type="button"
                          className="action-btn ab-ready"
                          onClick={(event) => {
                            event.stopPropagation();
                            showModal({
                              context: 'info',
                              title: 'Request Ready',
                              message: `${requestNumber} is already marked as ready for release.`,
                              confirmText: 'OK',
                              showCancel: false,
                            });
                          }}
                        >
                          ✓ Released
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="table-empty">No requests found for the current filters.</div>
            )}
          </div>

          <div className="pagination">
            <div className="page-info">{pageInfo}</div>
            <div className="page-btns">
              <button type="button" className="page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 4).map((pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  className={`page-btn ${currentPage === pageNumber ? 'current' : ''}`}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button type="button" className="page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedRequest ? (
        <div className="detail-overlay">
          <div className="detail-header">
            <div className="detail-title">Request Detail</div>
            <div className="detail-id">{buildRequestNumber(selectedRequest.id)} · {formatDate(selectedRequest.requestTimestamp)}</div>
            <button type="button" className="close-btn" onClick={() => setSelectedRequestId(null)}>✕</button>
          </div>
          <div className="detail-body">
            <div className="detail-section">
              <div className="detail-section-title">Resident Info</div>
              <div className="detail-field">
                <div className="detail-key">Full Name</div>
                <div className="detail-val">{formatName(selectedResident)}</div>
              </div>
              <div className="detail-field">
                <div className="detail-key">Email</div>
                <div className="detail-val">{selectedResident?.email || 'N/A'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-key">Phone</div>
                <div className="detail-val">{selectedResident?.phoneNumber || 'N/A'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-key">Address</div>
                <div className="detail-val">{formatAddress(selectedResident)}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Request Info</div>
              <div className="detail-field">
                <div className="detail-key">Document Type</div>
                <div className="detail-val">{getDocumentLabel(selectedRequest.documentType)}</div>
              </div>
              <div className="detail-field">
                <div className="detail-key">Purpose</div>
                <div className="detail-val">{selectedRequest.purpose || 'N/A'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-key">Remarks</div>
                <div className="detail-val detail-remarks">{selectedRequest.additionalDetails || selectedRequest.officerRemarks || 'No remarks provided.'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-key">Status</div>
                <div className="detail-val"><span className={`status-badge ${selectedRequestStatusClass}`}>{selectedRequestStatusLabel}</span></div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Submitted ID</div>
              {submittedFile ? (
                <div className="id-preview">
                  <div className="id-preview-icon">🪪</div>
                  <div className="id-file-name">{submittedFile.originalFileName || 'Uploaded file'}</div>
                  <div className="id-file-meta">
                    {submittedFile.fileType || 'ATTACHMENT'} · {submittedFile.contentType || 'application/octet-stream'} · {formatDate(submittedFile.uploadedAt)}
                  </div>
                  {submittedFile.signedUrl ? (
                    <a
                      href={submittedFile.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="id-view-link"
                    >
                      View ID Image
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="id-preview id-empty">
                  <div className="id-preview-icon">🪪</div>
                  <div className="id-file-name">No attachment available</div>
                  <div className="id-file-meta">This request does not include a submitted file.</div>
                </div>
              )}
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Request Attachments</div>
              <div className="attachment-list">
                {selectedRequest.files?.length ? (
                  selectedRequest.files.map((file) => (
                    <a key={file.id} className="attachment-item" href={file.signedUrl || '#'} target="_blank" rel="noreferrer">
                      <div className="attachment-name">{file.originalFileName || 'Attachment'}</div>
                      <div className="attachment-meta">
                        {file.fileType || 'ATTACHMENT'} · {file.signedUrl ? 'Open in new tab' : 'No access URL'}
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="attachment-empty">No request attachments found.</div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Officer Remarks</div>
              <textarea
                className="remarks-input"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Add remarks or reason for rejection (optional)..."
              />
            </div>
          </div>
          <div className="detail-footer">
            <div className="action-row">
              <button
                type="button"
                className="btn-approve"
                disabled={actionLoadingId === `${selectedRequest.id}:${STATUSES.APPROVED}`}
                onClick={() => confirmStatusChange(selectedRequest, STATUSES.APPROVED)}
              >
                ✓ Approve
              </button>
              <button
                type="button"
                className="btn-reject"
                disabled={actionLoadingId === `${selectedRequest.id}:${STATUSES.DECLINED}`}
                onClick={() => confirmStatusChange(selectedRequest, STATUSES.DECLINED)}
              >
                ✗ Reject
              </button>
            </div>
            <button
              type="button"
              className="btn-ready"
              disabled={actionLoadingId === `${selectedRequest.id}:${STATUSES.READY_FOR_RELEASE}`}
              onClick={() => confirmStatusChange(selectedRequest, STATUSES.READY_FOR_RELEASE)}
            >
              📦 Mark as Ready for Release
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
