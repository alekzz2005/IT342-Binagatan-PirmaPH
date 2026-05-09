import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Gauge,
  LogOut,
  Search,
  ShieldCheck,
  ShieldX,
  User,
  Users,
} from 'lucide-react';
import apiService from '../../../shared/services/api';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import './BarangayAdminAuditLogPage.css';

const PAGE_SIZE = 7;

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

const formatTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
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

const formatName = (entry) => {
  if (!entry) {
    return 'Unknown User';
  }

  const fullName = [entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(' ').trim();
  return fullName || entry.fullName || entry.username || 'Unknown User';
};

const formatRoleLabel = (role) => {
  if (role === 'OFFICER') return 'Officer';
  if (role === 'BARANGAY_ADMIN') return 'Admin';
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  return 'Resident';
};

const formatStatusLabel = (status) => {
  if (!status) {
    return 'N/A';
  }

  return status.replace(/_/g, ' ').toLowerCase();
};

const formatRequestNumber = (requestId) => {
  if (!requestId) {
    return 'REQ-000';
  }

  const compact = String(requestId).replace(/-/g, '').toUpperCase();
  return `REQ-${compact.slice(-3)}`;
};

const formatActionLabel = (kind, status) => {
  if (kind === 'request' && status === 'APPROVED') return 'Approve';
  if (kind === 'request' && status === 'DECLINED') return 'Reject';
  if (kind === 'request' && status === 'READY_FOR_RELEASE') return 'For Release';
  if (kind === 'request') return 'Request';
  if (kind === 'suspension') return 'Suspend';
  if (kind === 'role') return 'Role Change';
  if (kind === 'verification') return 'Verify';
  return 'Log';
};

const actionClassForEntry = (entry) => {
  if (entry.kind === 'request') {
    if (entry.action === 'Rejected') return 'at-reject';
    if (entry.action === 'Approved') return 'at-approve';
    return 'at-register';
  }

  if (entry.kind === 'suspension') return 'at-suspend';
  if (entry.kind === 'role') return 'at-assign';
  if (entry.kind === 'verification') return 'at-verify';
  return 'at-register';
};

const toneClassForEntry = (entry) => {
  if (entry.kind === 'suspicious') return 'log-suspicious';
  if (entry.kind === 'request' && entry.action === 'Rejected') return 'log-danger';
  if (entry.kind === 'request' && entry.action === 'Approved') return 'log-success';
  if (entry.kind === 'role') return 'log-warning';
  return 'log-neutral';
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

export default function BarangayAdminAuditLogPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [dashboard, setDashboard] = useState(null);
  const [residents, setResidents] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('2026-02-01');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [dashboardData, residentData, officerData] = await Promise.all([
        apiService.getBarangayAdminDashboard(),
        apiService.getResidents(),
        apiService.getOfficers(),
      ]);

      const requestData = Array.isArray(dashboardData?.requests) ? dashboardData.requests : [];

      setDashboard(dashboardData || null);
      setResidents(Array.isArray(residentData) ? residentData : []);
      setOfficers(Array.isArray(officerData) ? officerData : []);
      setRequests(requestData);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load audit log data');
      setDashboard(null);
      setResidents([]);
      setOfficers([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, activeFilter, fromDate, toDate]);

  const scope = dashboard?.scope || {};
  const activity = dashboard?.activity || [];

  const auditEntries = useMemo(() => {
    const residentById = new Map(residents.map((entry) => [entry.id, entry]));
    const officerById = new Map(officers.map((entry) => [entry.id, entry]));

    const entries = [];

    activity.forEach((item) => {
      let actorRole = 'Admin';
      let actorName = user?.username || 'Barangay Admin';
      let actionType = 'Log';
      let entityText = item.title;
      let entityDetail = item.detail;
      let ipAddress = '192.168.1.1';
      let action = 'Log';

      if (item.kind === 'resident') {
        actorRole = 'Admin';
        actorName = user ? formatName(user) : 'Barangay Admin';
        actionType = 'Register';
        entityText = `Resident Registration — ${item.title.replace(' submitted a resident registration', '')}`;
        entityDetail = item.detail;
        action = 'Submitted';
      } else if (item.kind === 'officer') {
        actorRole = 'Admin';
        actorName = user ? formatName(user) : 'Barangay Admin';
        actionType = 'Verify';
        entityText = `Officer Registration — ${item.title.replace(' submitted an officer registration', '')}`;
        entityDetail = item.detail;
        action = 'Submitted';
      } else if (item.kind === 'officer-status') {
        actorRole = 'Admin';
        actorName = user ? formatName(user) : 'Barangay Admin';
        actionType = 'Suspend';
        entityText = item.title;
        entityDetail = item.detail;
        action = item.title.includes('suspended') ? 'Suspended' : 'Rejected';
      } else if (item.kind === 'request') {
        const request = requests.find((entry) => String(entry.id) === String(item.id));
        const officer = officerById.get(request?.assignedOfficerUserId);
        const resident = residentById.get(request?.residentUserId);

        actorRole = officer ? formatRoleLabel(officer.role) : 'Admin';
        actorName = officer ? formatName(officer) : user ? formatName(user) : 'Barangay Admin';
        actionType = formatActionLabel('request', request?.status || 'SUBMITTED');
        entityText = `${formatDocumentLabel(request?.documentType)} request is ${formatStatusLabel(request?.status || 'submitted')}`;
        entityDetail = request?.purpose || item.detail || 'No additional details';
        ipAddress = officer ? '192.168.1.14' : '192.168.1.1';
        action = formatActionLabel('request', request?.status || 'SUBMITTED');

        entries.push({
          id: `${item.id}:request`,
          logId: `LOG-${String(item.id).replace(/-/g, '').slice(-6).toUpperCase()}`,
          actorName,
          actorInitials: initialsForName(actorName),
          actorRole,
          actionLabel: actionType,
          actionClass: actionClassForEntry({ kind: 'request', action }),
          entityText,
          entityDetail: resident ? `Resident: ${formatName(resident)}` : entityDetail,
          ipAddress,
          timestamp: item.timestamp,
          timeLabel: formatDateTime(item.timestamp),
          toneClass: toneClassForEntry({ kind: 'request', action }),
          kind: 'request',
          raw: request || item,
        });
        return;
      }

      entries.push({
        id: `${item.id}:${item.kind}`,
        logId: `LOG-${String(item.id).replace(/-/g, '').slice(-6).toUpperCase()}`,
        actorName,
        actorInitials: initialsForName(actorName),
        actorRole,
        actionLabel: actionType,
        actionClass: actionClassForEntry({ kind: item.kind, action }),
        entityText,
        entityDetail,
        ipAddress,
        timestamp: item.timestamp,
        timeLabel: formatDateTime(item.timestamp),
        toneClass: toneClassForEntry({ kind: item.kind, action }),
        kind: item.kind,
        raw: item,
      });
    });

    requests.forEach((request) => {
      if (!request.updatedAt && !request.requestTimestamp) {
        return;
      }

      const officer = officerById.get(request.assignedOfficerUserId);
      const resident = residentById.get(request.residentUserId);
      const action = request.status === 'APPROVED'
        ? 'Approved'
        : request.status === 'DECLINED'
          ? 'Rejected'
          : request.status === 'READY_FOR_RELEASE'
            ? 'For Release'
            : request.status === 'PENDING_PAYMENT'
              ? 'Pending Payment'
              : 'Submitted';

      entries.push({
        id: `${request.id}:summary`,
        logId: `LOG-${String(request.id).replace(/-/g, '').slice(-6).toUpperCase()}`,
        actorName: officer ? formatName(officer) : user ? formatName(user) : 'Barangay Admin',
        actorInitials: initialsForName(officer ? formatName(officer) : user ? formatName(user) : 'Barangay Admin'),
        actorRole: officer ? formatRoleLabel(officer.role) : 'Admin',
        actionLabel: formatActionLabel('request', request.status),
        actionClass: actionClassForEntry({ kind: 'request', action }),
        entityText: `${formatDocumentLabel(request.documentType)} request is ${formatStatusLabel(request.status)}`,
        entityDetail: resident ? `Resident: ${formatName(resident)}` : request.purpose || 'No details available',
        ipAddress: officer ? '192.168.1.14' : '192.168.1.1',
        timestamp: request.updatedAt || request.requestTimestamp,
        timeLabel: formatDateTime(request.updatedAt || request.requestTimestamp),
        toneClass: toneClassForEntry({ kind: 'request', action }),
        kind: 'request',
        raw: request,
      });
    });

    residents.forEach((entry) => {
      if (entry.status === 'PENDING_VERIFICATION' || entry.status === 'APPROVED' || entry.status === 'REJECTED') {
        entries.push({
          id: `${entry.id}:resident-state`,
          logId: `LOG-${String(entry.id).replace(/-/g, '').slice(-6).toUpperCase()}`,
          actorName: formatName(user),
          actorInitials: initialsForName(formatName(user)),
          actorRole: 'Admin',
          actionLabel: entry.status === 'PENDING_VERIFICATION' ? 'Register' : entry.status === 'APPROVED' ? 'Approve' : 'Reject',
          actionClass: entry.status === 'APPROVED' ? 'at-approve' : entry.status === 'REJECTED' ? 'at-reject' : 'at-register',
          entityText: `${entry.status === 'PENDING_VERIFICATION' ? 'Resident submitted registration' : `Resident ${entry.status.toLowerCase().replace('_', ' ')}`} — ${formatName(entry)}`,
          entityDetail: `User ID #${String(entry.id).slice(0, 8)}`,
          ipAddress: '192.168.1.1',
          timestamp: entry.updatedAt || entry.createdAt,
          timeLabel: formatDateTime(entry.updatedAt || entry.createdAt),
          toneClass: toneClassForEntry({ kind: entry.status === 'APPROVED' ? 'verification' : entry.status === 'REJECTED' ? 'suspicious' : 'resident' }),
          kind: 'resident',
          raw: entry,
        });
      }
    });

    officers.forEach((entry) => {
      if (entry.status === 'SUSPENDED' || entry.status === 'REJECTED' || entry.status === 'PENDING_VERIFICATION' || entry.status === 'APPROVED') {
        entries.push({
          id: `${entry.id}:officer-state`,
          logId: `LOG-${String(entry.id).replace(/-/g, '').slice(-6).toUpperCase()}`,
          actorName: formatName(user),
          actorInitials: initialsForName(formatName(user)),
          actorRole: 'Admin',
          actionLabel: entry.status === 'SUSPENDED' ? 'Suspend' : entry.status === 'APPROVED' ? 'Verify' : entry.status === 'REJECTED' ? 'Reject' : 'Register',
          actionClass: entry.status === 'SUSPENDED' ? 'at-suspend' : entry.status === 'REJECTED' ? 'at-reject' : entry.status === 'APPROVED' ? 'at-verify' : 'at-register',
          entityText: `${entry.status === 'PENDING_VERIFICATION' ? 'Officer submitted registration' : `Officer ${entry.status.toLowerCase().replace('_', ' ')}`} — ${formatName(entry)}`,
          entityDetail: `User ID #${String(entry.id).slice(0, 8)}`,
          ipAddress: '192.168.1.1',
          timestamp: entry.updatedAt || entry.createdAt,
          timeLabel: formatDateTime(entry.updatedAt || entry.createdAt),
          toneClass: toneClassForEntry({ kind: entry.status === 'SUSPENDED' ? 'suspicious' : 'verification' }),
          kind: 'officer',
          raw: entry,
        });
      }
    });

    return entries
      .filter((entry) => entry.timestamp)
      .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  }, [activity, officers, requests, residents, user]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : Number.NEGATIVE_INFINITY;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

    return auditEntries.filter((entry) => {
      const matchesFilter = activeFilter === 'ALL'
        || (activeFilter === 'Registrations' && (entry.kind === 'resident' || entry.kind === 'officer'))
        || (activeFilter === 'Approvals' && entry.actionLabel === 'Approve')
        || (activeFilter === 'Suspensions' && entry.actionLabel === 'Suspend')
        || (activeFilter === 'Role Changes' && entry.actionLabel === 'Role Assign')
        || (activeFilter === 'Verifications' && entry.actionLabel === 'Verify')
        || (activeFilter === 'Requests' && entry.kind === 'request')
        || (activeFilter === 'Suspicious Events' && entry.toneClass === 'log-suspicious');

      if (!matchesFilter) {
        return false;
      }

      const timestamp = new Date(entry.timestamp).getTime();
      if (timestamp < from || timestamp > to) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const blob = [
        entry.logId,
        entry.actorName,
        entry.actorRole,
        entry.entityText,
        entry.entityDetail,
        entry.ipAddress,
        entry.actionLabel,
        formatDateTime(entry.timestamp),
      ].filter(Boolean).join(' ').toLowerCase();

      return blob.includes(normalizedQuery);
    });
  }, [activeFilter, auditEntries, fromDate, query, toDate]);

  const stats = useMemo(() => {
    const total = auditEntries.length;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const actionsToday = auditEntries.filter((entry) => new Date(entry.timestamp).getTime() >= todayStart).length;
    const suspiciousEvents = auditEntries.filter((entry) => entry.toneClass === 'log-suspicious').length;
    const actorsToday = new Set(auditEntries.filter((entry) => new Date(entry.timestamp).getTime() >= todayStart).map((entry) => entry.actorName)).size;

    return {
      total,
      actionsToday,
      suspiciousEvents,
      actorsToday,
    };
  }, [auditEntries]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredEntries]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  const openDashboard = () => navigate('/dashboard/barangay-admin');
  const openUsers = () => navigate('/dashboard/barangay-admin/users');
  const openRequests = () => navigate('/dashboard/barangay-admin/requests');
  const openVerification = () => navigate('/dashboard/barangay-admin/verification');
  const openOfficerMonitoring = () => navigate('/dashboard/barangay-admin/officer-monitoring');
  const openProfilePage = () => navigate('/dashboard/barangay-admin/profile');

  const dashboardSections = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: Gauge, action: openDashboard },
        { label: 'User Management', icon: Users, action: openUsers },
        { label: 'Document Requests', icon: ClipboardList, action: openRequests },
      ],
    },
    {
      label: 'Verification',
      items: [
        { label: 'Verification Queue', icon: Search, action: openVerification },
        { label: 'Officer Monitoring', icon: ShieldCheck, action: openOfficerMonitoring },
      ],
    },
    {
      label: 'Logs and Reports',
      items: [
        { label: 'Audit Log', icon: FileText, active: true, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
        { label: 'Profile', icon: User, action: openProfilePage },
      ],
    },
  ];

  const exportCsv = () => {
    if (!filteredEntries.length) {
      showModal({
        context: 'info',
        title: 'Nothing to Export',
        message: 'There are no audit entries for the current filters.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    const header = ['logId', 'actor', 'actorRole', 'action', 'entity', 'ipAddress', 'timestamp'];
    const rows = filteredEntries.map((entry) => [
      entry.logId,
      `"${String(entry.actorName).replace(/"/g, '""')}"`,
      `"${String(entry.actorRole).replace(/"/g, '""')}"`,
      `"${String(entry.actionLabel).replace(/"/g, '""')}"`,
      `"${String(entry.entityText).replace(/"/g, '""')}"`,
      entry.ipAddress,
      formatDateTime(entry.timestamp),
    ].join(','));

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `barangay-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openRow = (entry) => {
    showModal({
      context: 'info',
      title: entry.logId,
      message: entry.entityText,
      detail: [
        `Actor: ${entry.actorName}`,
        `Role: ${entry.actorRole}`,
        `Action: ${entry.actionLabel}`,
        `IP Address: ${entry.ipAddress}`,
        `Timestamp: ${formatDateTime(entry.timestamp)}`,
        `Detail: ${entry.entityDetail}`,
      ].join('\n'),
      confirmText: 'Close',
      showCancel: false,
    });
  };

  const pageInfo = filteredEntries.length
    ? `Showing ${Math.min(filteredEntries.length, (currentPage - 1) * PAGE_SIZE + 1)}-${Math.min(filteredEntries.length, currentPage * PAGE_SIZE)} of ${filteredEntries.length} log entries`
    : 'Showing 0 of 0 log entries';

  return (
    <div className="barangay-admin-audit-log">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="role-badge">🏛️ Barangay Admin</div>
          <div className="scope-note"><span className="scope-dot"></span> {scope.barangay || user?.barangay || 'Barangay Admin'}</div>
        </div>
        <span className="nav-section">Overview</span>
        {dashboardSections.map((section) => (
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
          <div className="header-left">
            <div className="header-title">Audit Log</div>
            <div className="header-crumb">
              {scope.barangay || 'Barangay Scope'} · <span>Activity Audit Trail</span>
            </div>
          </div>
          <div className="header-right">
            <div className="hdr-flag" aria-hidden="true">
              <div className="hf-b"></div>
              <div className="hf-r"></div>
            </div>
            <button type="button" className="hdr-notif" aria-label="Notifications">
              <Bell size={18} strokeWidth={2} />
              <span className="ndot"></span>
            </button>
            <button type="button" className="export-btn" onClick={exportCsv}>⬇ Export CSV</button>
          </div>
        </header>

        <div className="content">
          {error ? (
            <div className="dashboard-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button type="button" onClick={loadData}>Retry</button>
            </div>
          ) : null}

          <div className="scope-banner">
            🔐 <strong style={{ marginRight: '4px' }}>Scope-limited view.</strong> This audit log shows activity within your barangay only. Entries from other barangays are not accessible.
          </div>

          <div className="stat-strip">
            <div className="ssc ssc1"><div className="ssc-val">{stats.total.toLocaleString()}</div><div className="ssc-lbl">Total Log Entries</div><span className="ssc-ico">📝</span></div>
            <div className="ssc ssc2"><div className="ssc-val">{stats.actionsToday}</div><div className="ssc-lbl">Actions Today</div><span className="ssc-ico">📅</span></div>
            <div className="ssc ssc3"><div className="ssc-val">{stats.suspiciousEvents}</div><div className="ssc-lbl">Suspicious Events</div><span className="ssc-ico">⚠️</span></div>
            <div className="ssc ssc4"><div className="ssc-val">{stats.actorsToday}</div><div className="ssc-lbl">Actors Today</div><span className="ssc-ico">👤</span></div>
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-ico" aria-hidden="true"><Search size={15} /></span>
              <input
                type="text"
                placeholder="Search by actor, action, entity, or IP address…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {['ALL', 'Registrations', 'Approvals', 'Suspensions', 'Role Changes', 'Verifications', 'Requests', 'Suspicious Events'].map((chip) => (
              <button
                key={chip}
                type="button"
                className={`chip ${activeFilter === chip ? 'active' : ''}`}
                onClick={() => setActiveFilter(chip)}
              >
                {chip === 'ALL' ? 'All' : chip}
              </button>
            ))}
            <input type="date" className="date-input" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <input type="date" className="date-input" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>

          <div className="table-card">
            <div className="table-head">
              <div className="th">Log ID</div>
              <div className="th">Actor</div>
              <div className="th">Actor Role</div>
              <div className="th">Action & Entity</div>
              <div className="th">Action Type</div>
              <div className="th">IP Address</div>
              <div className="th">Timestamp</div>
            </div>

            {loading ? (
              <div className="table-empty">Loading audit log entries...</div>
            ) : paginatedEntries.length ? paginatedEntries.map((entry) => (
              <div key={entry.id} className={`table-row ${entry.toneClass}`}>
                <div className="log-id">{entry.logId}</div>
                <div className="actor-cell">
                  <div className="ac-av">{entry.actorInitials}</div>
                  <div className="ac-name">{entry.actorName}</div>
                </div>
                <div className="table-role">{entry.actorRole}</div>
                <div>
                  <div className="entity-txt">{entry.entityText}</div>
                  <div className="entity-sub">{entry.entityDetail}</div>
                </div>
                <div><span className={`action-tag ${entry.actionClass}`}>{entry.actionLabel}</span></div>
                <div className="ip-txt">{entry.ipAddress}</div>
                <div className="time-cell">
                  <div className="time-txt">{formatTime(entry.timestamp)}</div>
                  <button type="button" className="view-link" onClick={() => openRow(entry)}>
                    View
                  </button>
                </div>
              </div>
            )) : (
              <div className="table-empty">No audit entries match the current filters.</div>
            )}
          </div>

          <div className="pagination">
            <div className="page-info">{pageInfo}</div>
            <div className="page-btns">
              <button type="button" className="pbtn" disabled={currentPage <= 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 4)
                .map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    className={`pbtn ${currentPage === pageNumber ? 'current' : ''}`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              <button type="button" className="pbtn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const formatDocumentLabel = (documentType) => {
  if (!documentType) {
    return 'Unknown Document';
  }

  return String(documentType).replace(/_/g, ' ');
};