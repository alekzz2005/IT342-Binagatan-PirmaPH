import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Building2,
  ClipboardList,
  Clock3,
  FileText,
  Globe2,
  HardHat,
  LayoutDashboard,
  RadioTower,
  RefreshCcw,
  Settings,
  ShieldAlert,
  TriangleAlert,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import apiService from '../services/api';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import './SuperAdminDashboardPage.css';

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

const formatName = (entry) => {
  const pieces = [entry?.firstName, entry?.middleName, entry?.lastName]
    .filter((piece) => piece && piece.trim())
    .map((piece) => piece.trim());

  return pieces.length > 0 ? pieces.join(' ') : entry?.username || 'Unnamed account';
};

const initialsForName = (value) => {
  if (!value) {
    return 'SA';
  }

  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'SA';
  }

  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

const safeLabel = (value) => {
  if (!value || !String(value).trim()) {
    return 'Unassigned';
  }

  return value;
};

const formatStatusLabel = (status) => {
  if (!status) {
    return 'unknown';
  }

  return status.replaceAll('_', ' ').toLowerCase();
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const isOpenRequest = (status) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'].includes(status);

const isOverrideCandidate = (status) => ['SUBMITTED', 'UNDER_REVIEW', 'DECLINED'].includes(status);

const toTimestamp = (value) => {
  if (!value) {
    return 0;
  }

  return new Date(value).getTime();
};

export default function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showModal } = useModal();

  const [dashboard, setDashboard] = useState({
    scope: {},
    stats: {},
    users: [],
    requests: [],
    activity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = await apiService.getSuperAdminDashboard();
      setDashboard({
        scope: payload?.scope || {},
        stats: payload?.stats || {},
        users: Array.isArray(payload?.users) ? payload.users : [],
        requests: Array.isArray(payload?.requests) ? payload.requests : [],
        activity: Array.isArray(payload?.activity) ? payload.activity : [],
      });
    } catch (dashboardError) {
      setError(dashboardError.message || 'Unable to load super admin dashboard');
      setDashboard({ scope: {}, stats: {}, users: [], requests: [], activity: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const users = dashboard.users;
  const requests = dashboard.requests;
  const activity = dashboard.activity;
  const stats = dashboard.stats;

  const barangays = useMemo(() => {
    const groups = new Map();

    users.forEach((entry) => {
      const barangayCode = entry.barangayCode || 'UNASSIGNED';

      if (!groups.has(barangayCode)) {
        groups.set(barangayCode, {
          barangayCode,
          barangay: entry.barangay || barangayCode,
          city: entry.city || '',
          province: entry.province || '',
          residents: 0,
          officers: 0,
          requests: 0,
          pendingRequests: 0,
          suspendedUsers: 0,
          pendingResidents: 0,
          pendingOfficers: 0,
          approvedAdmins: 0,
          anyAdminName: null,
          latestActivity: entry.updatedAt || entry.createdAt || null,
        });
      }

      const summary = groups.get(barangayCode);
      summary.barangay = summary.barangay || entry.barangay || barangayCode;
      summary.city = summary.city || entry.city || '';
      summary.province = summary.province || entry.province || '';

      if (summary.latestActivity && entry.updatedAt && new Date(summary.latestActivity) > new Date(entry.updatedAt)) {
        summary.latestActivity = summary.latestActivity;
      } else {
        summary.latestActivity = entry.updatedAt || entry.createdAt || summary.latestActivity;
      }

      if (entry.role === 'RESIDENT') {
        summary.residents += 1;
        if (entry.status === 'PENDING_VERIFICATION') {
          summary.pendingResidents += 1;
        }
      }

      if (entry.role === 'OFFICER') {
        summary.officers += 1;
        if (entry.status === 'PENDING_VERIFICATION') {
          summary.pendingOfficers += 1;
        }
      }

      if (entry.role === 'BARANGAY_ADMIN' && entry.status === 'APPROVED') {
        summary.approvedAdmins += 1;
        summary.anyAdminName = summary.anyAdminName || formatName(entry);
      }

      if (entry.status === 'SUSPENDED') {
        summary.suspendedUsers += 1;
      }

      if (entry.role === 'BARANGAY_ADMIN' && !summary.anyAdminName) {
        summary.anyAdminName = formatName(entry);
      }
    });

    requests.forEach((request) => {
      const barangayCode = request.barangayCode || 'UNASSIGNED';

      if (!groups.has(barangayCode)) {
        groups.set(barangayCode, {
          barangayCode,
          barangay: barangayCode,
          city: '',
          province: '',
          residents: 0,
          officers: 0,
          requests: 0,
          pendingRequests: 0,
          suspendedUsers: 0,
          pendingResidents: 0,
          pendingOfficers: 0,
          approvedAdmins: 0,
          anyAdminName: null,
          latestActivity: request.updatedAt || request.requestTimestamp || null,
        });
      }

      const summary = groups.get(barangayCode);
      summary.requests += 1;

      if (isOpenRequest(request.status)) {
        summary.pendingRequests += 1;
      }

      if (summary.latestActivity && request.updatedAt && new Date(summary.latestActivity) > new Date(request.updatedAt)) {
        summary.latestActivity = summary.latestActivity;
      } else {
        summary.latestActivity = request.updatedAt || request.requestTimestamp || summary.latestActivity;
      }
    });

    return [...groups.values()]
      .sort((left, right) => {
        const requestDelta = right.requests - left.requests;
        if (requestDelta !== 0) {
          return requestDelta;
        }

        return right.residents - left.residents;
      })
      .slice(0, 6);
  }, [users, requests]);

  const alertItems = useMemo(() => {
    const items = [];

    barangays.filter((entry) => entry.approvedAdmins === 0).slice(0, 2).forEach((entry) => {
      items.push({
        id: `no-admin-${entry.barangayCode}`,
        kind: 'barangay',
        title: 'Barangay needs bootstrap',
        detail: `${entry.barangay} (${entry.barangayCode}) has no approved barangay admin yet.`,
        timestamp: entry.latestActivity,
        tone: 'gold',
        actionLabel: 'Inspect',
      });
    });

    requests
      .filter((request) => request.status === 'DECLINED')
      .sort((left, right) => toTimestamp(right.updatedAt || right.requestTimestamp) - toTimestamp(left.updatedAt || left.requestTimestamp))
      .slice(0, 2)
      .forEach((request) => {
        items.push({
          id: request.id,
          kind: 'request',
          title: 'Declined request awaiting review',
          detail: `${request.documentType} in ${safeLabel(request.barangayCode)} needs a national review.`,
          timestamp: request.updatedAt || request.requestTimestamp,
          tone: 'red',
          actionLabel: 'Review',
        });
      });

    users
      .filter((entry) => entry.status === 'SUSPENDED')
      .sort((left, right) => toTimestamp(right.updatedAt || right.createdAt) - toTimestamp(left.updatedAt || left.createdAt))
      .slice(0, 2)
      .forEach((entry) => {
        items.push({
          id: entry.id,
          kind: 'user',
          title: 'Suspended account detected',
          detail: `${formatName(entry)} is suspended in ${safeLabel(entry.barangayCode)}.`,
          timestamp: entry.updatedAt || entry.createdAt,
          tone: 'red',
          actionLabel: 'Inspect',
        });
      });

    return items.slice(0, 6);
  }, [barangays, requests, users]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((left, right) => toTimestamp((right.updatedAt || right.requestTimestamp)) - toTimestamp((left.updatedAt || left.requestTimestamp)))
      .slice(0, 5);
  }, [requests]);

  const heroAttentionCount = alertItems.length + Number(stats.overridePending || 0);
  const heroActiveBarangays = Number(stats.activeBarangays || barangays.filter((entry) => entry.approvedAdmins > 0).length);

  const openRequestReview = (request) => {
    showModal({
      context: 'info',
      title: `${request.documentType} Review`,
      message: `Request ${request.id} from ${safeLabel(request.barangayCode)} is currently ${request.status}.`,
      detail: [
        `Purpose: ${request.purpose}`,
        `Submitted: ${formatDate(request.requestTimestamp)}`,
        `Last updated: ${formatDate(request.updatedAt || request.requestTimestamp)}`,
        `Copies: ${request.copies}`,
        `Remarks: ${request.officerRemarks || 'None'}`,
      ].join('\n'),
      confirmText: 'Open Management Console',
      showCancel: false,
      onConfirm: () => navigate('/dashboard/super-admin/manage'),
    });
  };

  const overrideRequest = (request) => {
    const nextStatus = request.status === 'DECLINED' ? 'UNDER_REVIEW' : request.status === 'UNDER_REVIEW' ? 'APPROVED' : 'UNDER_REVIEW';

    showModal({
      context: 'warning',
      title: 'Override request status?',
      message: `This will update the request from ${request.status} to ${nextStatus}.`,
      detail: `${request.documentType} in ${safeLabel(request.barangayCode)}\nPurpose: ${request.purpose}`,
      confirmText: 'Override',
      onConfirm: async () => {
        setActionLoadingId(request.id);
        try {
          await apiService.overrideAdminRequestStatus(request.id, {
            status: nextStatus,
            remarks: 'Super admin override from dashboard',
          });
          showModal({
            context: 'success',
            title: 'Request updated',
            message: 'The request status was successfully overridden.',
            confirmText: 'Refresh dashboard',
            showCancel: false,
            onConfirm: () => loadDashboard(),
          });
        } catch (overrideError) {
          showModal({
            context: 'error',
            title: 'Override failed',
            message: overrideError.message || 'Unable to override the request status.',
            confirmText: 'Close',
            showCancel: false,
          });
        } finally {
          setActionLoadingId('');
        }
      },
    });
  };

  const navigateToManage = () => navigate('/dashboard/super-admin/manage');
  const navigateToGlobalUsers = () => navigate('/dashboard/super-admin/users');
  const navigateToMonitoring = () => navigate('/dashboard/super-admin/monitoring');
  const navigateToBarangayManagement = () => navigate('/dashboard/super-admin/barangays');

  const openSystemSettings = () => {
    showModal({
      context: 'info',
      title: 'System settings',
      message: 'System-wide settings remain behind the management console for now.',
      confirmText: 'Open Management Console',
      showCancel: false,
      onConfirm: navigateToManage,
    });
  };

  const openBarangayDetails = (barangay) => {
    showModal({
      context: 'info',
      title: `${barangay.barangay} overview`,
      message: barangay.approvedAdmins > 0
        ? `${barangay.barangay} is actively managed by ${barangay.anyAdminName || 'an approved administrator'}.`
        : `${barangay.barangay} currently needs an approved barangay admin.`,
      detail: [
        `Barangay code: ${barangay.barangayCode}`,
        `Residents: ${barangay.residents}`,
        `Officers: ${barangay.officers}`,
        `Requests: ${barangay.requests}`,
        `Pending requests: ${barangay.pendingRequests}`,
      ].join('\n'),
      confirmText: 'Open Management Console',
      showCancel: false,
      onConfirm: navigateToManage,
    });
  };

  return (
    <div className="super-admin-dashboard">
      <SuperAdminSidebar activeItem="dashboard" onSystemSettings={openSystemSettings} />

      <main className="super-admin-main">
        <header className="super-admin-header">
          <div className="header-left">
            <div className="header-title">System Dashboard</div>
            <div className="header-breadcrumb"><span>Super Admin</span> → Dashboard</div>
          </div>
          <div className="header-right">
            <div className="scope-pill"><Globe2 size={14} strokeWidth={2} /> Nationwide Scope</div>
            <button type="button" className="header-notif" onClick={navigateToManage} aria-label="Open management console">
              <Bell size={16} strokeWidth={2} />
              <span className="notif-dot"></span>
            </button>
          </div>
        </header>

        <div className="super-admin-content">
          <div className="alert-banner">
            <div className="ab-left">
              <h2>{getGreeting()}, {user?.firstName || 'Administrator'} 🇵🇭</h2>
              <p>
                {loading
                  ? 'Loading live system data...'
                  : `System is operating normally · ${heroAttentionCount} item${heroAttentionCount === 1 ? '' : 's'} require your attention · Last sync: ${formatRelativeTime(dashboard.activity?.[0]?.timestamp || dashboard.requests?.[0]?.updatedAt || dashboard.requests?.[0]?.requestTimestamp || new Date().toISOString())}`}
              </p>
            </div>
            <div className="ab-stat">
              <div className="ab-stat-val">{heroActiveBarangays}</div>
              <div className="ab-stat-lbl">Active Barangays</div>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card kpi-blue">
              <div className="kpi-val">{Number(stats.activeBarangays || heroActiveBarangays)}</div>
              <div className="kpi-lbl">Active Barangays</div>
              <div className="kpi-delta">Nationwide managed areas</div>
              <span className="kpi-icon"><Building2 size={24} strokeWidth={2} /></span>
            </div>
            <div className="kpi-card kpi-green">
              <div className="kpi-val">{Number(stats.registeredResidents || 0).toLocaleString()}</div>
              <div className="kpi-lbl">Registered Residents</div>
              <div className="kpi-delta">All resident accounts</div>
              <span className="kpi-icon"><Users size={24} strokeWidth={2} /></span>
            </div>
            <div className="kpi-card kpi-gold">
              <div className="kpi-val">{Number(stats.totalRequests || requests.length).toLocaleString()}</div>
              <div className="kpi-lbl">Total Requests</div>
              <div className="kpi-delta">Live document submissions</div>
              <span className="kpi-icon"><FileText size={24} strokeWidth={2} /></span>
            </div>
            <div className="kpi-card kpi-red">
              <div className="kpi-val">{Number(stats.overridePending || 0)}</div>
              <div className="kpi-lbl">Override Pending</div>
              <div className="kpi-delta down">Needs national review</div>
              <span className="kpi-icon"><ShieldAlert size={24} strokeWidth={2} /></span>
            </div>
          </div>

          <div className="kpi-grid secondary-grid">
            <div className="kpi-card kpi-purple">
              <div className="kpi-val">{Number(stats.officersNationwide || 0).toLocaleString()}</div>
              <div className="kpi-lbl">Officers Nationwide</div>
              <div className="kpi-delta">Barangay officers in service</div>
              <span className="kpi-icon"><HardHat size={24} strokeWidth={2} /></span>
            </div>
            <div className="kpi-card kpi-orange">
              <div className="kpi-val">{Number(stats.suspendedUsers || 0)}</div>
              <div className="kpi-lbl">Suspended Users</div>
              <div className="kpi-delta down">Require attention</div>
              <span className="kpi-icon"><XCircle size={24} strokeWidth={2} /></span>
            </div>
            <div className="kpi-card kpi-green">
              <div className="kpi-val">{Number(stats.pendingVerifications || 0)}</div>
              <div className="kpi-lbl">Pending Verifications</div>
              <div className="kpi-delta">Residents and officers awaiting review</div>
              <span className="kpi-icon"><Clock3 size={24} strokeWidth={2} /></span>
            </div>
            <div className="kpi-card kpi-blue">
              <div className="kpi-val">{Number(stats.pendingBarangayAdmins || 0)}</div>
              <div className="kpi-lbl">Pending Barangay Admins</div>
              <div className="kpi-delta">Accounts awaiting approval</div>
              <span className="kpi-icon"><UserCog size={24} strokeWidth={2} /></span>
            </div>
          </div>

          {error && <div className="dashboard-error">{error}</div>}

          <div className="two-col">
            <div className="card">
              <div className="card-header ch-blue">
                <span className="card-title">🏛️ Barangay Overview</span>
                <button type="button" className="card-action" onClick={navigateToBarangayManagement}>Manage All →</button>
              </div>

              {loading && <div className="empty-state">Loading barangay overview...</div>}
              {!loading && barangays.length === 0 && (
                <div className="empty-state">No barangays were found yet.</div>
              )}

              {barangays.map((barangay) => (
                <button type="button" key={barangay.barangayCode} className="brgy-item" onClick={() => openBarangayDetails(barangay)}>
                  <div className="brgy-avatar">
                    <Building2 size={18} strokeWidth={2} />
                  </div>
                  <div className="brgy-copy">
                    <div className="brgy-name">{barangay.barangay}</div>
                    <div className="brgy-meta">
                      <span className={`online-dot ${barangay.approvedAdmins > 0 ? 'online' : 'offline'}`}></span>
                      {safeLabel(barangay.city)}{barangay.province ? ` · ${barangay.province}` : ''}
                      {barangay.approvedAdmins > 0 ? ` · Admin: ${barangay.anyAdminName || 'Approved admin'}` : ' · No approved admin assigned'}
                    </div>
                  </div>
                  <div className="brgy-stats">
                    <div className="brgy-req">{barangay.requests} requests</div>
                    <div className="brgy-status">{barangay.pendingRequests} pending</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="right-stack">
              <div className="card">
                <div className="card-header ch-red">
                  <span className="card-title">🚨 System Alerts</span>
                  <button type="button" className="card-action" onClick={navigateToManage}>View All →</button>
                </div>

                {alertItems.length === 0 && !loading && <div className="empty-state">No active alerts.</div>}

                {alertItems.map((item) => (
                  <div className="alert-item" key={item.id}>
                    <div className={`alert-icon-wrap ${item.tone === 'gold' ? 'ai-gold' : item.tone === 'red' ? 'ai-red' : 'ai-blue'}`}>
                      {item.kind === 'barangay' ? <TriangleAlert size={16} strokeWidth={2} /> : item.kind === 'request' ? <ClipboardList size={16} strokeWidth={2} /> : <AlertTriangle size={16} strokeWidth={2} />}
                    </div>
                    <div className="alert-text">
                      <h4>{item.title}</h4>
                      <p>{item.detail}</p>
                    </div>
                    <div className="alert-meta">
                      <span className="alert-time">{formatRelativeTime(item.timestamp)}</span>
                      <button type="button" className="alert-action" onClick={navigateToManage}>{item.actionLabel}</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-header ch-blue">
                  <span className="card-title">⏱ Recent Activity</span>
                  <div className="card-inline-tools">
                    <RefreshCcw size={14} strokeWidth={2} />
                    Live
                  </div>
                </div>
                {activity.length === 0 && !loading && <div className="empty-state">No recent activity yet.</div>}
                {activity.map((item) => (
                  <div className="activity-item" key={`${item.kind}-${item.id}-${item.timestamp}`}>
                    <div className={`act-dot act-${item.tone || 'blue'}`}></div>
                    <div className="act-text">
                      <strong>{item.title}</strong>
                      <div className="act-detail">{item.detail}</div>
                    </div>
                    <span className="act-time">{formatRelativeTime(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header ch-red">
              <span className="card-title">⚖️ Pending Override Requests</span>
              <button type="button" className="card-action" onClick={navigateToManage}>View All →</button>
            </div>

            {loading && <div className="empty-state">Loading override queue...</div>}
            {!loading && recentRequests.filter((request) => isOverrideCandidate(request.status)).length === 0 && (
              <div className="empty-state">No override candidates are waiting right now.</div>
            )}

            {recentRequests.filter((request) => isOverrideCandidate(request.status)).map((request) => (
              <div className="pending-item" key={request.id}>
                <div className="pending-icon">📄</div>
                <div className="pending-copy">
                  <div className="pending-name">{request.id.slice(0, 8)} · {request.documentType}</div>
                  <div className="pending-meta">
                    {safeLabel(request.barangayCode)} · Purpose: {request.purpose} · Status: {formatStatusLabel(request.status)}
                  </div>
                </div>
                <div className="pending-action-group">
                  <button type="button" className="btn-sm btn-sm-blue" onClick={() => openRequestReview(request)}>
                    Review
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-sm-gold"
                    onClick={() => overrideRequest(request)}
                    disabled={actionLoadingId === request.id}
                  >
                    {actionLoadingId === request.id ? 'Working...' : 'Override'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
