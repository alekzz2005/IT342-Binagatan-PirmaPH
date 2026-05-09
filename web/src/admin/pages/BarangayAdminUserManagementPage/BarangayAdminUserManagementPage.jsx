import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Eye,
  FileText,
  Gauge,
  LogOut,
  Search,
  ShieldCheck,
  Users,
  User,
} from 'lucide-react';
import apiService from '../../../shared/services/api';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import './BarangayAdminUserManagementPage.css';

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

function SidebarItem({ active, icon: Icon, label, badge, onClick }) {
  return (
    <button type="button" className={`nav-item nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon"><Icon size={16} /></span>
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  );
}

export default function BarangayAdminUserManagementPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const pageSize = 6;

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const [residents, officers] = await Promise.all([
        apiService.getResidents(),
        apiService.getOfficers(),
      ]);

      const normalizedResidents = (Array.isArray(residents) ? residents : []).map((entry) => ({
        ...entry,
        role: entry.role || 'RESIDENT',
      }));
      const normalizedOfficers = (Array.isArray(officers) ? officers : []).map((entry) => ({
        ...entry,
        role: entry.role || 'OFFICER',
      }));

      setUsers([...normalizedResidents, ...normalizedOfficers]);
    } catch (err) {
      setError(err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredByTab = useMemo(() => {
    if (activeTab === 'residents') {
      return users.filter((u) => u.role === 'RESIDENT');
    }
    if (activeTab === 'officers') {
      return users.filter((u) => u.role === 'OFFICER');
    }
    if (activeTab === 'pending') {
      return users.filter((u) => u.status === 'PENDING_VERIFICATION');
    }
    if (activeTab === 'suspended') {
      return users.filter((u) => u.status === 'SUSPENDED');
    }
    return users;
  }, [users, activeTab]);

  const filtered = useMemo(() => {
    let result = filteredByTab;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          (u.fullName || u.username || '').toLowerCase().includes(query) ||
          (u.email || '').toLowerCase().includes(query) ||
          (u.username || '').toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((u) => {
        if (statusFilter === 'pending') return u.status === 'PENDING_VERIFICATION';
        if (statusFilter === 'active') return u.status === 'APPROVED';
        if (statusFilter === 'suspended') return u.status === 'SUSPENDED';
        return true;
      });
    }

    return result;
  }, [filteredByTab, searchQuery, statusFilter]);

  const sorted = useMemo(() => {
    const result = [...filtered];

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => ((a.fullName || a.username || '') || '').localeCompare((b.fullName || b.username || '') || ''));
    } else if (sortBy === 'role') {
      result.sort((a, b) => (a.role || '').localeCompare(b.role || ''));
    } else if (sortBy === 'status') {
      result.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    }

    return result;
  }, [filtered, sortBy]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage]);

  const totalPages = Math.ceil(sorted.length / pageSize);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === 'APPROVED').length,
      pending: users.filter((u) => u.status === 'PENDING_VERIFICATION').length,
      officers: users.filter((u) => u.role === 'OFFICER').length,
      suspended: users.filter((u) => u.status === 'SUSPENDED').length,
    };
  }, [users]);

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

  const openDashboard = () => {
    navigate('/dashboard/barangay-admin');
  };

  const processApproval = async (userId, role, decision) => {
    try {
      setActionLoadingId(`${userId}:${decision}`);

      if (role === 'OFFICER') {
        if (decision === 'APPROVED') {
          await apiService.approveOfficer(userId);
        } else {
          await apiService.rejectOfficer(userId);
        }
      } else if (decision === 'APPROVED') {
        await apiService.approveResident(userId);
      } else {
        await apiService.rejectResident(userId);
      }

      await loadUsers();
      showModal({
        context: 'success',
        title: 'Decision Saved',
        message: `User was ${decision === 'APPROVED' ? 'approved' : 'rejected'} successfully.`,
        showCancel: false,
        confirmText: 'OK',
      });
    } catch (err) {
      showModal({
        context: 'error',
        title: 'Error',
        message: err.message || 'Action failed',
        showCancel: false,
        confirmText: 'OK',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const suspendUser = async (userId) => {
    try {
      setActionLoadingId(`${userId}:suspend`);
      await apiService.suspendUser(userId);
      await loadUsers();
      showModal({
        context: 'success',
        title: 'User Suspended',
        message: 'User has been suspended successfully.',
        showCancel: false,
        confirmText: 'OK',
      });
    } catch (err) {
      showModal({
        context: 'error',
        title: 'Error',
        message: err.message || 'Failed to suspend user',
        showCancel: false,
        confirmText: 'OK',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const reactivateUser = async (userId) => {
    try {
      setActionLoadingId(`${userId}:reactivate`);
      await apiService.reinstateUser(userId);
      await loadUsers();
      showModal({
        context: 'success',
        title: 'User Reactivated',
        message: 'User has been reactivated successfully.',
        showCancel: false,
        confirmText: 'OK',
      });
    } catch (err) {
      showModal({
        context: 'error',
        title: 'Error',
        message: err.message || 'Failed to reactivate user',
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
        { label: 'Dashboard', icon: Gauge, active: false, action: openDashboard },
        { label: 'User Management', icon: Users, active: true, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
        { label: 'Document Requests', icon: FileText, action: () => navigate('/dashboard/barangay-admin/requests') },
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

  const scope = {
    barangay: user?.barangay || 'Barangay Admin',
  };

  return (
    <div className="barangay-admin-user-management">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="role-badge">🏛️ Barangay Admin</div>
          <div className="scope-note"><span className="scope-dot"></span> {scope.barangay || 'Barangay scope not loaded'}</div>
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
            <div className="header-title">User Management</div>
            <div className="header-crumb">
              {scope.barangay} · <span>Residents & Officers</span>
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
          </div>
        </header>

        <div className="content">
          <div className="page-tabs">
            <button
              type="button"
              className={`ptab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            >
              All Users <span className="ptab-badge">{stats.total}</span>
            </button>
            <button
              type="button"
              className={`ptab ${activeTab === 'residents' ? 'active' : ''}`}
              onClick={() => { setActiveTab('residents'); setCurrentPage(1); }}
            >
              Residents <span className="ptab-badge">{stats.total - stats.officers}</span>
            </button>
            <button
              type="button"
              className={`ptab ${activeTab === 'officers' ? 'active' : ''}`}
              onClick={() => { setActiveTab('officers'); setCurrentPage(1); }}
            >
              Officers <span className="ptab-badge">{stats.officers}</span>
            </button>
            <button
              type="button"
              className={`ptab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
            >
              Pending Approval <span className="ptab-badge">{stats.pending}</span>
            </button>
            <button
              type="button"
              className={`ptab ${activeTab === 'suspended' ? 'active' : ''}`}
              onClick={() => { setActiveTab('suspended'); setCurrentPage(1); }}
            >
              Suspended
            </button>
          </div>

          <div className="stat-strip">
            <div className="ssc ssc-total">
              <div className="ssc-val">{stats.total}</div>
              <div className="ssc-lbl">Total Users</div>
              <span className="ssc-ico">👥</span>
            </div>
            <div className="ssc ssc-active">
              <div className="ssc-val">{stats.active}</div>
              <div className="ssc-lbl">Active</div>
              <span className="ssc-ico">✅</span>
            </div>
            <div className="ssc ssc-pend">
              <div className="ssc-val">{stats.pending}</div>
              <div className="ssc-lbl">Pending Approval</div>
              <span className="ssc-ico">⏳</span>
            </div>
            <div className="ssc ssc-officer">
              <div className="ssc-val">{stats.officers}</div>
              <div className="ssc-lbl">Officers</div>
              <span className="ssc-ico">👮</span>
            </div>
            <div className="ssc ssc-susp">
              <div className="ssc-val">{stats.suspended}</div>
              <div className="ssc-lbl">Suspended</div>
              <span className="ssc-ico">🚫</span>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search by name, email, or username…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <button
              type="button"
              className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            >
              All
            </button>
            <button
              type="button"
              className={`chip c-pend ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
            >
              Pending ({stats.pending})
            </button>
            <button
              type="button"
              className={`chip ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
              style={{ borderColor: 'var(--green)', color: statusFilter === 'active' ? '#fff' : 'var(--green)' }}
            >
              Active
            </button>
            <button
              type="button"
              className={`chip c-susp ${statusFilter === 'suspended' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('suspended'); setCurrentPage(1); }}
            >
              Suspended ({stats.suspended})
            </button>
            <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 3px' }}></div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '7px 11px', border: '1.5px solid var(--border)', borderRadius: '9px', fontFamily: "'Source Sans 3',sans-serif", fontSize: '12px', color: 'var(--text-muted)', background: '#fff', outline: 'none' }}
            >
              <option value="newest">Sort: Newest First</option>
              <option value="name">Sort: Name A–Z</option>
              <option value="role">Sort: Role</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>

          {error && <div style={{ color: 'var(--red)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(206, 17, 38, 0.2)', background: '#fff5f6', marginBottom: '16px' }}>{error}</div>}

          <div className="table-card">
            <div className="table-head">
              <div className="th">User</div>
              <div className="th">Contact</div>
              <div className="th">Role</div>
              <div className="th">Registered</div>
              <div className="th">Status</div>
              <div className="th">Actions</div>
            </div>

            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users…</div>
            ) : paginatedUsers.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</div>
            ) : (
              paginatedUsers.map((userItem) => (
                <div key={userItem.id} className="table-row">
                  <div className="user-cell">
                    <div className={`uc-av ${userItem.role === 'OFFICER' ? 'officer' : ''}`}>
                      {initialsForName(userItem.fullName || userItem.username || '')}
                    </div>
                    <div>
                      <div className="uc-name">{userItem.fullName || userItem.username}</div>
                      <div className="uc-email">{userItem.email}</div>
                    </div>
                  </div>
                  <div className="contact-cell" title={userItem.phoneNumber || 'N/A'}>{userItem.phoneNumber || 'N/A'}</div>
                  <div>
                    <span className={`role-pill ${userItem.role === 'OFFICER' ? 'rp-officer' : 'rp-resident'}`}>
                      {formatRoleLabel(userItem.role)}
                    </span>
                  </div>
                  <div className="date-txt">{formatDate(userItem.createdAt)}</div>
                  <div>
                    <span className={`status-pill sp-${userItem.status === 'PENDING_VERIFICATION' ? 'pending' : userItem.status === 'APPROVED' ? 'active' : 'suspended'}`}>
                      <span className="sp-dot"></span>
                      {formatStatusLabel(userItem.status)}
                    </span>
                  </div>
                  <div className="actions-cell">
                    {userItem.status === 'PENDING_VERIFICATION' && (
                      <>
                        <button type="button" className="abtn abtn-view" disabled={actionLoadingId === `${userItem.id}:view`}>
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          className="abtn abtn-approve"
                          disabled={actionLoadingId === `${userItem.id}:APPROVED`}
                          onClick={() => processApproval(userItem.id, userItem.role, 'APPROVED')}
                        >
                          ✓ Approve
                        </button>
                        <button
                          type="button"
                          className="abtn abtn-reject"
                          disabled={actionLoadingId === `${userItem.id}:REJECTED`}
                          onClick={() => processApproval(userItem.id, userItem.role, 'REJECTED')}
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {userItem.status === 'APPROVED' && (
                      <>
                        <button type="button" className="abtn abtn-view" disabled={actionLoadingId === `${userItem.id}:view`}>
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          className="abtn abtn-suspend"
                          disabled={actionLoadingId === `${userItem.id}:suspend`}
                          onClick={() => suspendUser(userItem.id)}
                        >
                          ⏸ Suspend
                        </button>
                        {userItem.role === 'OFFICER' && (
                          <button type="button" className="abtn abtn-role" disabled={actionLoadingId === `${userItem.id}:revoke`}>
                            Revoke Role
                          </button>
                        )}
                      </>
                    )}
                    {userItem.status === 'SUSPENDED' && (
                      <>
                        <button type="button" className="abtn abtn-view" disabled={actionLoadingId === `${userItem.id}:view`}>
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          className="abtn abtn-activate"
                          disabled={actionLoadingId === `${userItem.id}:reactivate`}
                          onClick={() => reactivateUser(userItem.id)}
                        >
                          ↺ Reactivate
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pagination">
            <div className="page-info">
              Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, sorted.length)}</strong> of <strong>{sorted.length}</strong> users
            </div>
            <div className="page-btns">
              <button
                type="button"
                className="pbtn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`pbtn ${pageNum === currentPage ? 'current' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 7 && (
                <>
                  <button type="button" className="pbtn" disabled>
                    …
                  </button>
                  <button type="button" className="pbtn" onClick={() => setCurrentPage(totalPages)}>
                    {totalPages}
                  </button>
                </>
              )}
              <button
                type="button"
                className="pbtn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

