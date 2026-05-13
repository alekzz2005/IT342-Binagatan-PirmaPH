import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Gauge,
  LogOut,
  Search,
  ShieldCheck,
  ShieldX,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import apiService from '../../../shared/services/api';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import './BarangayAdminDashboardPage.css';

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

const formatRoleLabel = (role) => {
  if (role === 'OFFICER') return 'Officer';
  if (role === 'BARANGAY_ADMIN') return 'Barangay Admin';
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  return 'Resident';
};

const formatStatusLabel = (status) => {
  if (!status) return 'N/A';
  return status.replace(/_/g, ' ').toLowerCase();
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

function SidebarItem({ active, icon: Icon, label, badge, onClick }) {
  return (
    <button type="button" className={`nav-item nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon"><Icon size={16} /></span>
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  );
}

export default function BarangayAdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiService.getBarangayAdminDashboard();
      setDashboard(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load barangay admin dashboard');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const scope = dashboard?.scope || {};
  const stats = dashboard?.stats || {};
  const pendingResidents = dashboard?.pendingResidents || [];
  const pendingOfficers = dashboard?.pendingOfficers || [];
  const requests = dashboard?.requests || [];
  const activity = dashboard?.activity || [];

  const pendingApprovals = useMemo(() => {
    return [
      ...pendingResidents.map((entry) => ({ ...entry, reviewType: 'resident' })),
      ...pendingOfficers.map((entry) => ({ ...entry, reviewType: 'officer' })),
    ].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
  }, [pendingResidents, pendingOfficers]);

  const bannerCopy = useMemo(() => {
    if (!dashboard) {
      return 'Loading barangay scope data...';
    }

    const residentCount = stats.pendingResidents ?? pendingResidents.length;
    const officerCount = stats.pendingOfficers ?? pendingOfficers.length;
    const requestCount = stats.openRequests ?? requests.length;

    return `You have ${residentCount} pending resident approval${residentCount === 1 ? '' : 's'}, ${officerCount} pending officer approval${officerCount === 1 ? '' : 's'}, and ${requestCount} document request${requestCount === 1 ? '' : 's'} in your barangay scope.`;
  }, [dashboard, pendingResidents.length, pendingOfficers.length, requests.length, stats.pendingResidents, stats.pendingOfficers, stats.openRequests]);

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

  const openManagementPage = () => {
    navigate('/dashboard/barangay-admin/officer-monitoring');
  };

  const openUserManagementPage = () => {
    navigate('/dashboard/barangay-admin/users');
  };

  const openRequestPage = () => {
    navigate('/dashboard/barangay-admin/requests');
  };

  const openAuditLogPage = () => {
    navigate('/dashboard/barangay-admin/audit-log');
  };

  const openProfilePage = () => {
    navigate('/dashboard/barangay-admin/profile');
  };

  const openReviewModal = (entry) => {
    const isOfficer = entry.reviewType === 'officer';
    showModal({
      context: 'info',
      title: isOfficer ? 'Officer Verification Review' : 'Resident Verification Review',
      message: `${entry.fullName || entry.username || 'This account'} is waiting for barangay admin verification.`,
      detail: [
        `Role: ${formatRoleLabel(entry.role)}`,
        `Status: ${formatStatusLabel(entry.status)}`,
        `Barangay: ${entry.barangay || scope.barangay || 'N/A'}`,
        `Email: ${entry.email || 'N/A'}`,
        `Submitted: ${formatDate(entry.createdAt)}`,
      ].join('\n'),
      confirmText: 'Open Management Console',
      showCancel: false,
      onConfirm: openManagementPage,
    });
  };

  const processApproval = async (entry, decision) => {
    const entryId = entry?.id;
    if (!entryId) {
      return;
    }

    const reviewType = entry.reviewType;
    const isOfficer = reviewType === 'officer';
    const actionKey = `${entryId}:${decision}`;

    try {
      setActionLoadingId(actionKey);

      if (isOfficer) {
        if (decision === 'APPROVED') {
          await apiService.approveOfficer(entryId);
        } else {
          await apiService.rejectOfficer(entryId);
        }
      } else if (decision === 'APPROVED') {
        await apiService.approveResident(entryId);
      } else {
        await apiService.rejectResident(entryId);
      }

      await loadDashboard();
      showModal({
        context: 'success',
        title: 'Decision Saved',
        message: `${entry.fullName || entry.username || 'The account'} was ${decision === 'APPROVED' ? 'approved' : 'rejected'} successfully.`,
        showCancel: false,
        confirmText: 'OK',
      });
    } catch (requestError) {
      showModal({
        context: 'error',
        title: 'Unable to Update Account',
        message: requestError.message || 'The admin action could not be completed.',
        showCancel: false,
        confirmText: 'OK',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const dashboardLinkSections = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: Gauge, active: true, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
        { label: 'User Management', icon: Users, action: openUserManagementPage },
        { label: 'Document Requests', icon: ClipboardList, action: openRequestPage },
      ],
    },
    {
      label: 'Verification',
      items: [
        { label: 'Verification Queue', icon: Search, action: openManagementPage },
        { label: 'Officer Monitoring', icon: ShieldCheck, action: openManagementPage },
      ],
    },
    {
      label: 'Logs and Reports',
      items: [
        { label: 'Audit Log', icon: FileText, action: openAuditLogPage },
        { label: 'Profile', icon: User, action: openProfilePage },
      ],
    },
  ];

  const quickActions = [
    { label: 'Approve Users', sub: `${stats.awaitingVerification ?? pendingApprovals.length} pending`, icon: CheckCircle2, action: openManagementPage },
    { label: 'Verify Identity', sub: `${stats.pendingResidents ?? pendingResidents.length} queued`, icon: Search, action: openManagementPage },
    { label: 'Assign Role', sub: 'Manage officers', icon: UserCog, action: openManagementPage },
    { label: 'Audit Log', sub: 'View activity', icon: FileText, action: openAuditLogPage },
  ];

  return (
    <div className="barangay-admin-dashboard">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="role-badge">🏛️ Barangay Admin</div>
          <div className="scope-note"><span className="scope-dot"></span> {scope.barangay || user?.barangay || 'Barangay scope not loaded'}</div>
        </div>
        <span className="nav-section">Overview</span>
        {dashboardLinkSections.map((section) => (
          <div key={section.label}>
            {section.label !== 'Overview' && <span className="nav-section">{section.label}</span>}
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
              <p>{formatRoleLabel(user?.role)}</p>
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout} aria-label="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="header">
          <div className="header-left">
            <div className="header-title">Barangay Admin Dashboard</div>
            <div className="header-crumb">
              {scope.barangay || 'Barangay Scope'} · <span>Overview</span>
            </div>
          </div>
          <div className="header-right">
            <div className="hdr-flag" aria-hidden="true">
              <div className="hf-b"></div>
              <div className="hf-r"></div>
            </div>
            {/* Notifications removed for Barangay Admin role */}
          </div>
        </header>

        <div className="content">
          <div className="scope-notice">
            <span className="sn-icon"><ShieldCheck size={16} /></span>
            <div className="sn-text">
              <strong>Scope: barangay only.</strong> You can only manage users and requests within your assigned barangay. Cross-barangay access is blocked.
            </div>
          </div>

          <div className="welcome-banner">
            <div className="wb-text">
              <h2>{loading ? 'Loading dashboard data...' : `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user?.firstName || 'Admin'} 👋`}</h2>
              <p>{loading ? 'Please wait while we fetch the barangay scope summary.' : bannerCopy}</p>
            </div>
            <div className="wb-scope">
              <div className="wb-scope-label">Your Scope</div>
              <div className="wb-scope-val">{scope.barangay || user?.barangay || 'Barangay Admin'}</div>
            </div>
          </div>

          {error ? (
            <div className="dashboard-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button type="button" onClick={loadDashboard}>Retry</button>
            </div>
          ) : null}

          <div className="stat-grid">
            <div className="stat-card sc-users">
              <div className="stat-val">{stats.registeredResidents ?? 0}</div>
              <div className="stat-lbl">Registered Residents</div>
              <div className="stat-sub">{stats.pendingResidents ?? pendingResidents.length} pending approval</div>
              <span className="stat-ico"><Users size={26} /></span>
            </div>
            <div className="stat-card sc-officers">
              <div className="stat-val">{stats.activeOfficers ?? 0}</div>
              <div className="stat-lbl">Active Officers</div>
              <div className="stat-sub">{stats.suspendedOfficers ?? 0} suspended</div>
              <span className="stat-ico"><ShieldCheck size={26} /></span>
            </div>
            <div className="stat-card sc-requests">
              <div className="stat-val">{stats.openRequests ?? 0}</div>
              <div className="stat-lbl">Open Requests</div>
              <div className="stat-sub">Live barangay document queue</div>
              <span className="stat-ico"><ClipboardList size={26} /></span>
            </div>
            <div className="stat-card sc-verify">
              <div className="stat-val">{stats.awaitingVerification ?? 0}</div>
              <div className="stat-lbl">Awaiting Verification</div>
              <div className="stat-sub">Resident and officer review</div>
              <span className="stat-ico"><Search size={26} /></span>
            </div>
          </div>

          <div className="two-col">
            <div className="card">
              <div className="card-hdr">
                <span className="card-title">⏳ Pending Approvals</span>
                <button type="button" className="card-link" onClick={openManagementPage}>Manage All <ChevronRight size={14} /></button>
              </div>
              {loading ? (
                <div className="empty-state">Loading approvals...</div>
              ) : pendingApprovals.length > 0 ? (
                pendingApprovals.slice(0, 5).map((entry) => (
                  <div key={`${entry.reviewType}:${entry.id}`} className="approval-item">
                    <div className="ai-av">{initialsForName(entry.fullName || entry.username || '')}</div>
                    <div className="ai-info">
                      <div className="ai-name">{entry.fullName || entry.username}</div>
                      <div className="ai-meta">
                        <span className={`ai-type ${entry.reviewType === 'officer' ? 'at-officer' : 'at-resident'}`}>{entry.reviewType === 'officer' ? 'Officer' : 'Resident'}</span>
                        Applied {formatDate(entry.createdAt)}
                      </div>
                    </div>
                    <div className="ai-actions">
                      <button type="button" className="abtn abtn-view" onClick={() => openReviewModal(entry)}>
                        <Eye size={12} /> View
                      </button>
                      <button
                        type="button"
                        className="abtn abtn-approve"
                        disabled={actionLoadingId === `${entry.id}:APPROVED`}
                        onClick={() => processApproval(entry, 'APPROVED')}
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        className="abtn abtn-reject"
                        disabled={actionLoadingId === `${entry.id}:REJECTED`}
                        onClick={() => processApproval(entry, 'REJECTED')}
                      >
                        <ShieldX size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No pending resident or officer approvals are available right now.</div>
              )}
            </div>

            <div className="right-column-stack">
              <div className="card">
                <div className="card-hdr">
                  <span className="card-title">⚡ Quick Actions</span>
                </div>
                <div className="qa-grid">
                  {quickActions.map((action) => (
                    <button key={action.label} type="button" className="qa-btn" onClick={action.action}>
                      <div className="qa-icon"><action.icon size={18} /></div>
                      <div>
                        <div className="qa-label">{action.label}</div>
                        <div className="qa-sub">{action.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-hdr">
                  <span className="card-title">🕐 Recent Activity</span>
                  <button type="button" className="card-link" onClick={openManagementPage}>View All <ChevronRight size={14} /></button>
                </div>
                {loading ? (
                  <div className="empty-state">Loading activity feed...</div>
                ) : activity.length > 0 ? (
                  activity.map((entry) => (
                    <div key={`${entry.kind}:${entry.id}`} className="act-item">
                      <div className="act-dot-wrap">
                        <div className={`act-dot ad-${entry.tone || 'muted'}`}></div>
                        <div className="act-line"></div>
                      </div>
                      <div className="act-content">
                        <div className="act-text">{entry.title}</div>
                        <div className="act-meta">{entry.detail}</div>
                        <div className="act-time">{formatRelativeTime(entry.timestamp)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No recent barangay activity found yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
