import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  LogOut,
  RadioTower,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import apiService from '../../../shared/services/api';
import SuperAdminSidebar from '../../../superadmin/components/SuperAdminSidebar';
import './SuperAdminGlobalUserControlPage.css';

const PAGE_SIZE = 6;

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

const formatName = (entry) => {
  const parts = [entry?.firstName, entry?.middleName, entry?.lastName]
    .filter(Boolean)
    .map((piece) => String(piece).trim())
    .filter(Boolean);

  return parts.length ? parts.join(' ') : entry?.username || 'Unnamed user';
};

const initialsForName = (value) => {
  if (!value) {
    return 'SA';
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SA';
};

const roleLabel = (role) => {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'BARANGAY_ADMIN') return 'Brgy Admin';
  if (role === 'OFFICER') return 'Officer';
  return 'Resident';
};

const roleClass = (role) => {
  if (role === 'SUPER_ADMIN' || role === 'BARANGAY_ADMIN') return 'rb-admin';
  if (role === 'OFFICER') return 'rb-officer';
  return 'rb-resident';
};

const avatarClass = (role, status) => {
  if (status === 'SUSPENDED') return 'ua-suspended';
  if (role === 'SUPER_ADMIN' || role === 'BARANGAY_ADMIN') return 'ua-admin';
  if (role === 'OFFICER') return 'ua-officer';
  return 'ua-resident';
};

const statusMeta = (entry, flagged) => {
  if (entry.status === 'SUSPENDED') {
    return { label: 'Suspended', className: 'sb-suspended' };
  }

  if (flagged) {
    return { label: 'Flagged', className: 'sb-flagged' };
  }

  return { label: 'Active', className: 'sb-active' };
};

const safeLabel = (value, fallback = 'Unassigned') => {
  if (!value || !String(value).trim()) {
    return fallback;
  }

  return String(value).trim();
};

function SidebarAction({ icon: Icon, label, active, badge, onClick }) {
  return (
    <button type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon"><Icon size={16} strokeWidth={2} /></span>
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  );
}

function StatCard({ tone, value, label, icon }) {
  return (
    <div className={`stat-card sc-${tone}`}>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
      <span className="stat-icon">{icon}</span>
    </div>
  );
}

export default function SuperAdminGlobalUserControlPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [barangayFilter, setBarangayFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUserId, setExpandedUserId] = useState('');
  const [unsuspendReason, setUnsuspendReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = await apiService.getSuperAdminDashboard();
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
      setRequests(Array.isArray(payload?.requests) ? payload.requests : []);
    } catch (loadError) {
      setUsers([]);
      setRequests([]);
      setError(loadError.message || 'Unable to load global user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const requestStatsByUserId = useMemo(() => {
    const statsMap = new Map();

    const ensure = (userId) => {
      if (!userId) return null;
      if (!statsMap.has(userId)) {
        statsMap.set(userId, {
          total: 0,
          declined: 0,
          latest: null,
          latestBarangayCode: null,
        });
      }
      return statsMap.get(userId);
    };

    requests.forEach((request) => {
      const residentStats = ensure(request.residentUserId);
      if (residentStats) {
        residentStats.total += 1;
        if (request.status === 'DECLINED') {
          residentStats.declined += 1;
        }
        if (!residentStats.latest || new Date(request.updatedAt || request.requestTimestamp) > new Date(residentStats.latest)) {
          residentStats.latest = request.updatedAt || request.requestTimestamp;
          residentStats.latestBarangayCode = request.barangayCode;
        }
      }

      const officerStats = ensure(request.assignedOfficerUserId);
      if (officerStats) {
        officerStats.total += 1;
        if (request.status === 'DECLINED') {
          officerStats.declined += 1;
        }
        if (!officerStats.latest || new Date(request.updatedAt || request.requestTimestamp) > new Date(officerStats.latest)) {
          officerStats.latest = request.updatedAt || request.requestTimestamp;
          officerStats.latestBarangayCode = request.barangayCode;
        }
      }
    });

    return statsMap;
  }, [requests]);

  const enrichedUsers = useMemo(() => {
    return users.map((entry) => {
      const requestStats = requestStatsByUserId.get(entry.id) || { total: 0, declined: 0, latest: null, latestBarangayCode: null };
      const flagged = entry.status !== 'SUSPENDED' && (entry.status === 'REJECTED' || requestStats.declined >= 2);
      const status = statusMeta(entry, flagged);

      return {
        ...entry,
        displayName: formatName(entry),
        initials: initialsForName(formatName(entry)),
        flagged,
        statusLabel: status.label,
        statusClass: status.className,
        requestStats,
      };
    });
  }, [users, requestStatsByUserId]);

  const stats = useMemo(() => {
    const totalUsers = enrichedUsers.length;
    const residents = enrichedUsers.filter((entry) => entry.role === 'RESIDENT').length;
    const officers = enrichedUsers.filter((entry) => entry.role === 'OFFICER').length;
    const suspended = enrichedUsers.filter((entry) => entry.status === 'SUSPENDED').length;
    const flagged = enrichedUsers.filter((entry) => entry.flagged).length;

    return { totalUsers, residents, officers, suspended, flagged };
  }, [enrichedUsers]);

  const barangayOptions = useMemo(() => {
    const map = new Map();

    enrichedUsers.forEach((entry) => {
      const code = safeLabel(entry.barangayCode);
      const label = `${safeLabel(entry.barangay)} - ${safeLabel(entry.city)}`;
      map.set(code, label);
    });

    return [...map.entries()]
      .map(([code, label]) => ({ code, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [enrichedUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return enrichedUsers
      .filter((entry) => {
        if (activeFilter === 'RESIDENTS' && entry.role !== 'RESIDENT') return false;
        if (activeFilter === 'OFFICERS' && entry.role !== 'OFFICER') return false;
        if (activeFilter === 'ADMINS' && !['BARANGAY_ADMIN', 'SUPER_ADMIN'].includes(entry.role)) return false;
        if (activeFilter === 'SUSPENDED' && entry.status !== 'SUSPENDED') return false;
        if (activeFilter === 'FLAGGED' && !entry.flagged) return false;

        if (barangayFilter !== 'ALL' && safeLabel(entry.barangayCode) !== barangayFilter) return false;

        if (!normalizedQuery) return true;

        const blob = [
          entry.displayName,
          entry.email,
          entry.username,
          entry.barangay,
          entry.barangayCode,
          entry.city,
          entry.province,
          roleLabel(entry.role),
          entry.id,
        ].filter(Boolean).join(' ').toLowerCase();

        return blob.includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (sortBy === 'name') {
          return left.displayName.localeCompare(right.displayName);
        }

        if (sortBy === 'requests') {
          return right.requestStats.total - left.requestStats.total;
        }

        if (sortBy === 'status') {
          const order = { SUSPENDED: 0, REJECTED: 1, PENDING_VERIFICATION: 2, APPROVED: 3 };
          const leftScore = left.flagged ? 1 : (order[left.status] ?? 99);
          const rightScore = right.flagged ? 1 : (order[right.status] ?? 99);
          return leftScore - rightScore;
        }

        return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      });
  }, [activeFilter, barangayFilter, enrichedUsers, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, barangayFilter, searchQuery, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredUsers]);

  const handleLogout = () => {
    showModal({
      context: 'confirmation',
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out from the super admin panel?',
      confirmText: 'Yes, Logout',
      cancelText: 'Cancel',
      onConfirm: () => {
        logout();
        navigate('/');
      },
    });
  };

  const openDashboard = () => navigate('/dashboard/super-admin');
  const openBarangayManagement = () => navigate('/dashboard/super-admin/barangays');
  const openMonitoring = () => navigate('/dashboard/super-admin/monitoring');

  const openSystemSettings = () => {
    showModal({
      context: 'info',
      title: 'System settings',
      message: 'System-wide settings remain behind the management console for now.',
      confirmText: 'Close',
      showCancel: false,
    });
  };

  const openUserDetails = (entry) => {
    if (expandedUserId === entry.id) {
      setExpandedUserId('');
      setUnsuspendReason('');
      return;
    }

    setExpandedUserId(entry.id);
    setUnsuspendReason('');
  };

  const suspendUser = (entry) => {
    if (entry.role === 'SUPER_ADMIN') {
      showModal({
        context: 'error',
        title: 'Action blocked',
        message: 'Super admin accounts cannot be suspended here.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    showModal({
      context: 'warning',
      title: 'Suspend this user?',
      message: `${entry.displayName} will lose access until reinstated.`,
      detail: `${roleLabel(entry.role)} · ${safeLabel(entry.barangay)} (${safeLabel(entry.barangayCode)})`,
      confirmText: 'Suspend',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setActionLoadingId(entry.id);
        try {
          await apiService.suspendUser(entry.id);
          await loadData();
          showModal({
            context: 'success',
            title: 'User suspended',
            message: `${entry.displayName} is now suspended.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (requestError) {
          showModal({
            context: 'error',
            title: 'Unable to suspend user',
            message: requestError.message || 'Suspension failed.',
            confirmText: 'OK',
            showCancel: false,
          });
        } finally {
          setActionLoadingId('');
        }
      },
    });
  };

  const reinstateUser = (entry) => {
    const reason = unsuspendReason.trim();

    showModal({
      context: 'confirmation',
      title: 'Unsuspend this user?',
      message: `${entry.displayName} will regain access.`,
      detail: reason ? `Reason: ${reason}` : 'No unsuspension reason entered.',
      confirmText: 'Unsuspend',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setActionLoadingId(entry.id);
        try {
          await apiService.reinstateUser(entry.id);
          await loadData();
          setExpandedUserId('');
          setUnsuspendReason('');
          showModal({
            context: 'success',
            title: 'User unsuspended',
            message: `${entry.displayName} is active again.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (requestError) {
          showModal({
            context: 'error',
            title: 'Unable to unsuspend user',
            message: requestError.message || 'Unsuspension failed.',
            confirmText: 'OK',
            showCancel: false,
          });
        } finally {
          setActionLoadingId('');
        }
      },
    });
  };

  const updateRole = (entry) => {
    if (entry.role === 'SUPER_ADMIN') {
      showModal({
        context: 'info',
        title: 'Role change blocked',
        message: 'Super admin role cannot be changed from this panel.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    if (entry.id === user?.id) {
      showModal({
        context: 'error',
        title: 'Role change blocked',
        message: 'You cannot change your own role.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    const nextRole = entry.role === 'OFFICER'
      ? 'RESIDENT'
      : entry.role === 'RESIDENT'
        ? 'OFFICER'
        : 'RESIDENT';

    showModal({
      context: 'confirmation',
      title: 'Change user role?',
      message: `${entry.displayName} will be changed from ${roleLabel(entry.role)} to ${roleLabel(nextRole)}.`,
      detail: `${safeLabel(entry.barangay)} · ${safeLabel(entry.barangayCode)}`,
      confirmText: 'Apply Role',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setActionLoadingId(entry.id);
        try {
          await apiService.updateUserRole(entry.id, nextRole);
          await loadData();
          showModal({
            context: 'success',
            title: 'Role updated',
            message: `${entry.displayName} is now ${roleLabel(nextRole)}.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (requestError) {
          showModal({
            context: 'error',
            title: 'Unable to update role',
            message: requestError.message || 'Role update failed.',
            confirmText: 'OK',
            showCancel: false,
          });
        } finally {
          setActionLoadingId('');
        }
      },
    });
  };

  const openOverrideCenter = () => navigate('/dashboard/super-admin/manage');

  const getPageText = () => {
    if (!filteredUsers.length) {
      return 'Showing 0 of 0 users';
    }

    const shown = Math.min(filteredUsers.length, (currentPage - 1) * PAGE_SIZE + paginatedUsers.length);
    return `Showing ${shown} of ${filteredUsers.length} users`;
  };

  const expandedEntry = enrichedUsers.find((entry) => entry.id === expandedUserId) || null;

  return (
    <div className="super-admin-global-users">
      <SuperAdminSidebar
        activeItem="users"
        globalUserBadge={stats.flagged > 0 ? String(stats.flagged) : ''}
        onSystemSettings={openSystemSettings}
      />

      <div className="main">
        <header className="header">
          <div className="header-left">
            <div className="header-title">Global User Control</div>
            <div className="header-breadcrumb"><span>Super Admin</span> → Global User Control</div>
          </div>
          <div className="header-right">
            <div className="scope-pill"><Globe2 size={14} strokeWidth={2} /> All Barangays</div>
            <button type="button" className="header-notif" onClick={loadData} aria-label="Refresh users">
              <Bell size={16} strokeWidth={2} />
              <span className="notif-dot"></span>
            </button>
          </div>
        </header>

        <div className="content">
          <div className="stat-strip">
            <StatCard tone="blue" value={stats.totalUsers.toLocaleString()} label="Total Users" icon="👥" />
            <StatCard tone="blue" value={stats.residents.toLocaleString()} label="Residents" icon="🏘️" />
            <StatCard tone="green" value={stats.officers.toLocaleString()} label="Officers" icon="🏅" />
            <StatCard tone="red" value={stats.suspended.toLocaleString()} label="Suspended" icon="🚫" />
            <StatCard tone="orange" value={stats.flagged.toLocaleString()} label="Flagged" icon="⚠️" />
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <Search size={15} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name, email, barangay, or request ID..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="filter-chips">
              <button type="button" className={`chip ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')}>All ({stats.totalUsers})</button>
              <button type="button" className={`chip ${activeFilter === 'RESIDENTS' ? 'active' : ''}`} onClick={() => setActiveFilter('RESIDENTS')}>Residents</button>
              <button type="button" className={`chip ${activeFilter === 'OFFICERS' ? 'active' : ''}`} onClick={() => setActiveFilter('OFFICERS')}>Officers</button>
              <button type="button" className={`chip ${activeFilter === 'ADMINS' ? 'active' : ''}`} onClick={() => setActiveFilter('ADMINS')}>Admins</button>
              <button type="button" className={`chip chip-red ${activeFilter === 'SUSPENDED' ? 'active' : ''}`} onClick={() => setActiveFilter('SUSPENDED')}>Suspended ({stats.suspended})</button>
              <button type="button" className={`chip chip-orange ${activeFilter === 'FLAGGED' ? 'active' : ''}`} onClick={() => setActiveFilter('FLAGGED')}>Flagged ({stats.flagged})</button>
            </div>

            <div className="toolbar-sep"></div>

            <select className="sort-select" value={barangayFilter} onChange={(event) => setBarangayFilter(event.target.value)}>
              <option value="ALL">Filter: All Barangays</option>
              {barangayOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>

            <select className="sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Sort: Newest</option>
              <option value="name">Sort: Name A-Z</option>
              <option value="requests">Sort: Most Requests</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>

          {error ? (
            <div className="page-error">
              <span>{error}</span>
              <button type="button" onClick={loadData}><RefreshCcw size={14} strokeWidth={2} /> Retry</button>
            </div>
          ) : null}

          <div className="table-card">
            <div className="table-head">
              <div className="th">ID</div>
              <div className="th">User</div>
              <div className="th">Role</div>
              <div className="th">Barangay</div>
              <div className="th">Registered</div>
              <div className="th">Status</div>
              <div className="th">Actions</div>
            </div>

            {loading ? (
              <div className="table-empty">Loading users...</div>
            ) : !paginatedUsers.length ? (
              <div className="table-empty">No users found for the selected filters.</div>
            ) : (
              paginatedUsers.map((entry) => {
                const isExpanded = expandedUserId === entry.id;
                const isActionLoading = actionLoadingId === entry.id;

                return (
                  <div key={entry.id}>
                    <div className={`table-row ${entry.status === 'SUSPENDED' ? 'suspended' : ''} ${entry.flagged ? 'flagged' : ''}`}>
                      <div className="td row-id">USR-{String(entry.id).replace(/-/g, '').slice(-5).toUpperCase()}</div>

                      <div className="td user-cell">
                        <div className={`u-avatar ${avatarClass(entry.role, entry.status)}`}>{entry.initials}</div>
                        <div>
                          <div className="u-name">{entry.displayName}</div>
                          <div className="u-email">{entry.email || 'No email'}</div>
                        </div>
                      </div>

                      <div className="td">
                        <span className={`role-badge ${roleClass(entry.role)}`}>{roleLabel(entry.role)}</span>
                      </div>

                      <div className="td brgy-tag">
                        <strong>{safeLabel(entry.barangay)}</strong>
                        {safeLabel(entry.city)}
                      </div>

                      <div className="td date-text">{formatDate(entry.createdAt)}</div>

                      <div className="td">
                        <span className={`status-badge ${entry.statusClass}`}>
                          <span className="sb-dot"></span>
                          {entry.statusLabel}
                        </span>
                      </div>

                      <div className="td actions-cell">
                        <button type="button" className="action-btn ab-view" onClick={() => openUserDetails(entry)}>
                          {isExpanded ? 'Hide' : 'View'}
                        </button>

                        {entry.role !== 'SUPER_ADMIN' ? (
                          <button type="button" className="action-btn ab-role" onClick={() => updateRole(entry)} disabled={isActionLoading}>
                            Role
                          </button>
                        ) : null}

                        {entry.status === 'SUSPENDED' ? (
                          <button type="button" className="action-btn ab-unsuspend" onClick={() => reinstateUser(entry)} disabled={isActionLoading}>
                            Unsuspend
                          </button>
                        ) : (
                          <button type="button" className="action-btn ab-suspend" onClick={() => suspendUser(entry)} disabled={isActionLoading || entry.role === 'SUPER_ADMIN'}>
                            Suspend
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="detail-expand">
                        <div className="de-field">
                          <div className="de-key">Last Known Activity</div>
                          <div className="de-val">{formatDate(entry.requestStats.latest || entry.updatedAt)}</div>
                        </div>
                        <div className="de-field">
                          <div className="de-key">User Status</div>
                          <div className="de-val">{entry.status ? entry.status.replace(/_/g, ' ') : 'N/A'}</div>
                        </div>
                        <div className="de-field">
                          <div className="de-key">Request Footprint</div>
                          <div className="de-val">{entry.requestStats.total} total · {entry.requestStats.declined} declined</div>
                        </div>
                        <div className="de-field">
                          <div className="de-key">Last Request Barangay</div>
                          <div className="de-val">{safeLabel(entry.requestStats.latestBarangayCode, 'No request yet')}</div>
                        </div>

                        {entry.status === 'SUSPENDED' ? (
                          <div className="suspend-form">
                            <span className="sf-label">Lift suspension with reason:</span>
                            <input
                              className="sf-input"
                              type="text"
                              placeholder="State reason for unsuspending this user..."
                              value={unsuspendReason}
                              onChange={(event) => setUnsuspendReason(event.target.value)}
                            />
                            <button type="button" className="sf-btn" onClick={() => reinstateUser(entry)} disabled={isActionLoading}>
                              Unsuspend
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="pagination">
            <div className="page-info">{getPageText()}</div>
            <div className="page-btns">
              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} strokeWidth={2} />
              </button>

              {Array.from({ length: Math.min(4, totalPages) }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    type="button"
                    key={pageNumber}
                    className={`page-btn ${pageNumber === currentPage ? 'current' : ''}`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              {totalPages > 4 ? <button type="button" className="page-btn" disabled>...</button> : null}
              {totalPages > 4 ? (
                <button type="button" className="page-btn" onClick={() => setCurrentPage(totalPages)}>
                  {totalPages}
                </button>
              ) : null}

              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {expandedEntry ? <div className="sr-only">Expanded user: {expandedEntry.displayName}</div> : null}
        </div>
      </div>
    </div>
  );
}
