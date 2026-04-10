import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BriefcaseBusiness, CheckCircle2, FileText, HandHelping, Home, Hourglass, IdCard, Sunrise, XCircle } from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import ResidentSidebar from '../components/ResidentSidebar';
import './Dashboard.css';

const DOCUMENT_LABELS = {
  BARANGAY_CLEARANCE: 'Barangay Clearance',
  CERTIFICATE_OF_RESIDENCY: 'Certificate of Residency',
  CERTIFICATE_OF_INDIGENCY: 'Certificate of Indigency',
  BUSINESS_CLEARANCE: 'Business Clearance',
  CERTIFICATE_OF_GOOD_MORAL: 'Certificate of Good Moral',
  BARANGAY_ID: 'Barangay ID',
};

const DOCUMENT_ICONS = {
  BARANGAY_CLEARANCE: FileText,
  CERTIFICATE_OF_RESIDENCY: Home,
  CERTIFICATE_OF_INDIGENCY: HandHelping,
  BUSINESS_CLEARANCE: BriefcaseBusiness,
  CERTIFICATE_OF_GOOD_MORAL: IdCard,
  BARANGAY_ID: IdCard,
};

const STATUS_LABELS = {
  SUBMITTED: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  DECLINED: 'Rejected',
  PENDING_PAYMENT: 'Pending Payment',
  READY_FOR_RELEASE: 'Ready for Release',
};

const STATUS_CLASSES = {
  SUBMITTED: 'status-pending',
  UNDER_REVIEW: 'status-pending',
  APPROVED: 'status-approved',
  DECLINED: 'status-rejected',
  PENDING_PAYMENT: 'status-pending',
  READY_FOR_RELEASE: 'status-ready',
};

const ANNOUNCEMENT_BADGES = {
  SUBMITTED: { label: 'Info', className: 'ab-blue' },
  UNDER_REVIEW: { label: 'Update', className: 'ab-blue' },
  APPROVED: { label: 'Approved', className: 'ab-gold' },
  DECLINED: { label: 'Alert', className: 'ab-red' },
  PENDING_PAYMENT: { label: 'Alert', className: 'ab-red' },
  READY_FOR_RELEASE: { label: 'Ready', className: 'ab-gold' },
};

const formatDocumentType = (documentType) => DOCUMENT_LABELS[documentType] || documentType;

const formatStatusLabel = (status) => STATUS_LABELS[status] || status;

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

const formatRelativeTime = (value) => {
  if (!value) {
    return 'just now';
  }

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showModal } = useModal();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          setError(requestError.message || 'Unable to load dashboard data');
          setRequests([]);
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

  const sortedRequests = useMemo(() => {
    return [...requests].sort((left, right) => new Date(right.requestTimestamp) - new Date(left.requestTimestamp));
  }, [requests]);

  const requestStats = useMemo(() => {
    return sortedRequests.reduce((summary, request) => {
      summary.total += 1;

      if (request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW' || request.status === 'PENDING_PAYMENT') {
        summary.pending += 1;
      }

      if (request.status === 'APPROVED' || request.status === 'READY_FOR_RELEASE') {
        summary.approved += 1;
      }

      if (request.status === 'DECLINED') {
        summary.rejected += 1;
      }

      return summary;
    }, { total: 0, pending: 0, approved: 0, rejected: 0 });
  }, [sortedRequests]);

  const recentRequests = sortedRequests.slice(0, 5);

  const announcementItems = useMemo(() => {
    return sortedRequests.slice(0, 4).map((request) => {
      const badge = ANNOUNCEMENT_BADGES[request.status] || ANNOUNCEMENT_BADGES.SUBMITTED;
      const releaseLabel = request.status === 'READY_FOR_RELEASE'
        ? 'Ready for release'
        : request.status === 'APPROVED'
          ? 'Approved and in process'
          : request.status === 'DECLINED'
            ? 'Action required'
            : 'Processing update';

      return {
        badge,
        title: `${formatDocumentType(request.documentType)} ${releaseLabel}`,
        body: `Submitted on ${formatDate(request.requestTimestamp)} for ${request.purpose}.`,
        date: request.updatedAt ? `Updated ${formatRelativeTime(request.updatedAt)}` : `Submitted ${formatRelativeTime(request.requestTimestamp)}`,
      };
    });
  }, [sortedRequests]);

  const pendingCount = requestStats.pending;
  const approvedCount = requestStats.approved;
  const rejectedCount = requestStats.rejected;

  const bannerCopy = sortedRequests.length > 0
    ? `You have ${pendingCount} pending request${pendingCount === 1 ? '' : 's'} and ${approvedCount} approved request${approvedCount === 1 ? '' : 's'} in your barangay queue.`
    : 'You do not have any submitted requests yet.';

  const openRequestDetails = (request) => {
    showModal({
      context: 'success',
      title: formatDocumentType(request.documentType),
      message: `Status: ${formatStatusLabel(request.status)}`,
      detail: [
        `Purpose: ${request.purpose}`,
        `Submitted: ${formatDate(request.requestTimestamp)}`,
        `Copies: ${request.copies}`,
        `Additional details: ${request.additionalDetails || 'None'}`,
        `Attachments: ${(request.files || []).length}`,
      ].join('\n'),
      confirmText: 'View Request History',
      showCancel: false,
      onConfirm: () => navigate('/requests/mine'),
    });
  };

  const showRequestSummary = () => {
    showModal({
      context: 'success',
      title: 'Request Summary',
      message: 'Here is a live summary of your document requests.',
      detail: [
        `Total requests: ${requestStats.total}`,
        `Pending: ${requestStats.pending}`,
        `Approved: ${requestStats.approved}`,
        `Rejected: ${requestStats.rejected}`,
      ].join('\n'),
      confirmText: 'View My Requests',
      showCancel: false,
      onConfirm: () => navigate('/requests/mine'),
    });
  };

  const openAnnouncements = () => {
    const details = announcementItems.length > 0
      ? announcementItems.map((item) => `${item.title} - ${item.body}`).join('\n\n')
      : 'No recent request updates are available yet.';

    showModal({
      context: 'success',
      title: 'Recent Updates',
      message: 'The right panel is driven by your live request history.',
      detail: details,
      confirmText: 'View My Requests',
      showCancel: false,
      onConfirm: () => navigate('/requests/mine'),
    });
  };

  return (
    <div className="dashboard-container">
      <ResidentSidebar activeItem="dashboard" />

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <div className="dashboard-header-title">Dashboard</div>
            <div className="dashboard-header-breadcrumb">Welcome back, {user?.firstName || 'Juan'}</div>
          </div>
          <div className="dashboard-header-right">
            <div className="header-flag" aria-hidden="true">
              <div className="hf-blue"></div>
              <div className="hf-red"></div>
            </div>
            <button type="button" className="notif-btn" onClick={showRequestSummary} aria-label="Show request summary">
              <Bell size={18} strokeWidth={2} />
              <span className="notif-badge"></span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="flag-banner">
            <div className="banner-text">
              <h2><Sunrise size={20} strokeWidth={2} /> {getGreeting()}, {user?.firstName || 'Juan'}!</h2>
              <p>{bannerCopy}</p>
            </div>
            <button type="button" className="banner-cta" onClick={() => navigate('/requests/submit')}>
              + New Request
            </button>
          </div>

          <div className="stats-row">
            <div className="stat-card blue">
              <div className="stat-label">Total Requests</div>
              <div className="stat-value">{requestStats.total}</div>
              <div className="stat-sub">All time submissions</div>
              <span className="stat-icon"><FileText size={24} strokeWidth={2} /></span>
            </div>
            <div className="stat-card gold">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{requestStats.pending}</div>
              <div className="stat-sub">Awaiting officer review</div>
              <span className="stat-icon"><Hourglass size={24} strokeWidth={2} /></span>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Approved</div>
              <div className="stat-value">{requestStats.approved}</div>
              <div className="stat-sub">Ready for release</div>
              <span className="stat-icon"><CheckCircle2 size={24} strokeWidth={2} /></span>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Rejected</div>
              <div className="stat-value">{rejectedCount}</div>
              <div className="stat-sub">See remarks</div>
              <span className="stat-icon"><XCircle size={24} strokeWidth={2} /></span>
            </div>
          </div>

          {error && <div className="dashboard-error">{error}</div>}

          <div className="two-col">
            <div className="card">
              <div className="card-header">
                <div className="card-title">My Recent Requests</div>
                <button type="button" className="card-action" onClick={() => navigate('/requests/mine')}>
                  View All
                </button>
              </div>

              {loading && <div className="empty-state">Loading recent requests...</div>}

              {!loading && recentRequests.length === 0 && (
                <div className="empty-state">
                  No requests yet. Submit your first document request to get started.
                </div>
              )}

              {!loading && recentRequests.map((request) => (
                <button key={request.id} type="button" className="req-item req-item-button" onClick={() => openRequestDetails(request)}>
                  <div className="req-type-icon">
                    {(() => {
                      const IconComponent = DOCUMENT_ICONS[request.documentType] || FileText;
                      return <IconComponent size={20} strokeWidth={2} />;
                    })()}
                  </div>
                  <div className="req-info">
                    <div className="req-name">{formatDocumentType(request.documentType)}</div>
                    <div className="req-meta">Submitted {formatDate(request.requestTimestamp)} · {request.purpose}</div>
                  </div>
                  <span className={`req-status ${STATUS_CLASSES[request.status] || 'status-pending'}`}>
                    {formatStatusLabel(request.status)}
                  </span>
                </button>
              ))}
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Announcements</div>
                <button type="button" className="card-action" onClick={openAnnouncements}>
                  See All
                </button>
              </div>

              {loading && <div className="empty-state">Loading updates...</div>}

              {!loading && announcementItems.length === 0 && (
                <div className="empty-state">No recent updates yet.</div>
              )}

              {!loading && announcementItems.map((item) => (
                <div className="announce-item" key={`${item.title}-${item.date}`}>
                  <span className={`announce-badge ${item.badge.className}`}>{item.badge.label}</span>
                  <div className="announce-title">{item.title}</div>
                  <div className="announce-body">{item.body}</div>
                  <div className="announce-date">{item.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
