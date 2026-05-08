import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileBadge,
  FileText,
  HandHelping,
  Home,
  Hourglass,
  IdCard,
  Mail,
  MapPin,
  Package,
  Phone,
  Pencil,
  Search,
  Shield,
  User,
  XCircle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import apiService from '../services/api';
import OfficerVerificationPanel from '../components/OfficerVerificationPanel';
import './OfficerRequestQueuePage.css';
import './OfficerProfilePage.css';

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
  CERTIFICATE_OF_GOOD_MORAL: FileBadge,
  BARANGAY_ID: IdCard,
};

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'READY', label: 'For Release' },
  { key: 'REJECTED', label: 'Rejected' },
];

const QUEUE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DECLINED', 'READY_FOR_RELEASE'];

const formatFullName = (account) => [account?.firstName, account?.middleName, account?.lastName].filter(Boolean).join(' ') || 'Barangay Officer';

const formatAddress = (account) => [account?.street, account?.barangay, account?.city, account?.province, account?.zipCode].filter(Boolean).join(', ') || 'N/A';

const formatDate = (value, withYear = true) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(new Date(value));
};

const formatStatusClass = (status) => {
  if (status === 'READY_FOR_RELEASE') return 'sb-ready';
  if (status === 'APPROVED') return 'sb-approved';
  if (status === 'DECLINED') return 'sb-rejected';
  return 'sb-pending';
};

const formatStatusLabel = (status) => {
  if (status === 'READY_FOR_RELEASE') return 'For Release';
  if (status === 'DECLINED') return 'Rejected';
  if (status === 'UNDER_REVIEW') return 'Pending';
  if (status === 'SUBMITTED') return 'Pending';
  return status?.replaceAll('_', ' ') || 'Pending';
};

const matchesFilter = (request, filter) => {
  if (filter === 'ALL') return true;
  if (filter === 'PENDING') return ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'].includes(request.status);
  if (filter === 'APPROVED') return request.status === 'APPROVED';
  if (filter === 'READY') return request.status === 'READY_FOR_RELEASE';
  if (filter === 'REJECTED') return request.status === 'DECLINED';
  return true;
};

const getDisplayName = (request) => request.residentFullName || `Resident ${String(request.residentUserId || '').slice(0, 8) || 'Unknown'}`;

const getDisplayPurpose = (request) => request.purpose || 'No purpose provided';

export default function OfficerProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [profile, setProfile] = useState(user);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const isOfficerApproved = profile?.status === 'APPROVED';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const currentUser = await apiService.getCurrentUser();
        const queueResults = await Promise.all(QUEUE_STATUSES.map((status) => apiService.getOfficerRequestQueue(status)));
        const merged = queueResults.flat().filter(Boolean);
        const deduped = merged.reduce((acc, item) => {
          if (!acc.some((existing) => existing.id === item.id)) {
            acc.push(item);
          }
          return acc;
        }, []);

        if (cancelled) {
          return;
        }

        setProfile(currentUser || user);
        setRequests(deduped);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load profile details');
          setProfile(user);
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
  }, [user]);

  const fullName = formatFullName(profile);
  const initials = [profile?.firstName?.charAt(0), profile?.lastName?.charAt(0)].filter(Boolean).join('').toUpperCase() || 'OF';

  const sortedRequests = useMemo(() => {
    return [...requests].sort((left, right) => new Date(right.requestTimestamp) - new Date(left.requestTimestamp));
  }, [requests]);

  const filterCounts = useMemo(() => {
    return {
      ALL: sortedRequests.length,
      PENDING: sortedRequests.filter((request) => matchesFilter(request, 'PENDING')).length,
      APPROVED: sortedRequests.filter((request) => matchesFilter(request, 'APPROVED')).length,
      READY: sortedRequests.filter((request) => matchesFilter(request, 'READY')).length,
      REJECTED: sortedRequests.filter((request) => matchesFilter(request, 'REJECTED')).length,
    };
  }, [sortedRequests]);

  const visibleRequests = useMemo(() => {
    return sortedRequests.filter((request) => matchesFilter(request, filter));
  }, [sortedRequests, filter]);

  const openNotImplementedSidebar = (label) => {
    showModal({
      context: 'info',
      title: `${label} Endpoint`,
      message: 'This endpoint is not implemented yet.',
      detail: `The ${label} tab is visible in the Officer panel, but the backend endpoint is still pending implementation.`,
      confirmText: 'OK',
      showCancel: false,
    });
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

  const handleEditProfile = () => {
    showModal({
      context: 'success',
      title: 'Profile Editing',
      message: 'Profile editing endpoint is not available yet. Your current data below is fetched live from your account.',
      confirmText: 'OK',
      showCancel: false,
    });
  };

  const handleUpdatePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showModal({
        context: 'error',
        title: 'Missing Password Fields',
        message: 'Please complete all password fields before updating.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showModal({
        context: 'error',
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    showModal({
      context: 'success',
      title: 'Password Update',
      message: 'Password update endpoint is not available yet. Please use Forgot Password from the login page for now.',
      confirmText: 'OK',
      showCancel: false,
    });
  };

  if (!isOfficerApproved) {
    return (
      <div className="officer-panel-shell officer-profile-shell">
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand">Pirma<span>PH</span></div>
            <div className="brand-sub">Barangay Digital Services</div>
            <div className="officer-badge">Officer Panel</div>
          </div>

          <span className="nav-section-label">Management</span>
          <button type="button" className="nav-item" onClick={() => navigate('/officer/requests')}>
            <span className="nav-icon"><ClipboardList size={18} strokeWidth={2} /></span>
            <span>Requests</span>
          </button>
          <button type="button" className="nav-item active">
            <span className="nav-icon"><User size={18} strokeWidth={2} /></span>
            <span>Profile</span>
          </button>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <h4>{fullName}</h4>
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
            <div className="header-title">Officer Profile</div>
          </header>
          <div className="content onboarding-content">
            <OfficerVerificationPanel user={profile || user} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="officer-panel-shell officer-profile-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="officer-badge">Officer Panel</div>
        </div>

        <span className="nav-section-label">Management</span>
        <button type="button" className="nav-item" onClick={() => navigate('/officer/requests')}>
          <span className="nav-icon"><ClipboardList size={18} strokeWidth={2} /></span>
          <span>Requests</span>
        </button>
        <button type="button" className="nav-item active">
          <span className="nav-icon"><User size={18} strokeWidth={2} /></span>
          <span>Profile</span>
        </button>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <h4>{fullName}</h4>
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
          <div>
            <div className="header-title">My Profile</div>
            <div className="header-breadcrumb">Dashboard / Profile</div>
          </div>
          <div className="header-right">
            <div className="search-box">
              <span className="search-icon"><Search size={16} strokeWidth={2} /></span>
              <input type="text" value="Officer account profile" readOnly />
            </div>
          </div>
        </header>

        <div className="profile-content">
          <div>
            <div className="profile-card">
              <div className="profile-cover"></div>
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-big">{initials}</div>
              </div>
              <div className="profile-name">{fullName}</div>
              <div className="profile-role"><Shield size={14} strokeWidth={2} /> Officer · {profile?.barangay || profile?.barangayCode || 'Barangay N/A'}</div>

              <div className="profile-flag">
                <div className="pf-blue"></div>
                <div className="pf-red"></div>
                <div className="pf-gold"></div>
              </div>

              <div className="profile-info">
                <div className="info-row">
                  <div className="info-icon"><Mail size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="info-key">Email</div>
                    <div className="info-val">{profile?.email || 'N/A'}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon"><Phone size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="info-key">Phone</div>
                    <div className="info-val">{profile?.phoneNumber || 'N/A'}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon"><CalendarDays size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="info-key">Birthday</div>
                    <div className="info-val">{formatDate(profile?.birthDate)}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon"><MapPin size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="info-key">Address</div>
                    <div className="info-val">{formatAddress(profile)}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon"><CalendarDays size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="info-key">Member Since</div>
                    <div className="info-val">{formatDate(profile?.createdAt)}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon"><ClipboardList size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="info-key">Queue Visibility</div>
                    <div className="info-val">{filterCounts.ALL} request{filterCounts.ALL === 1 ? '' : 's'} in barangay queue</div>
                  </div>
                </div>
              </div>

              <button type="button" className="edit-profile-btn" onClick={handleEditProfile}><Pencil size={14} strokeWidth={2} /> Edit Profile</button>
            </div>
          </div>

          <div className="right-col">
            {error && <div className="profile-error">{error}</div>}
            {loading && <div className="profile-loading">Loading profile data...</div>}

            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Personal Information</div>
                <button type="button" className="section-action" onClick={handleEditProfile}><Pencil size={14} strokeWidth={2} /> Edit</button>
              </div>
              <div className="section-body">
                <div className="edit-grid">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input readonly" value={profile?.firstName || ''} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input readonly" value={profile?.lastName || ''} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Middle Name</label>
                    <input className="form-input readonly" value={profile?.middleName || 'N/A'} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input className="form-input readonly" value={formatDate(profile?.birthDate)} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input readonly" value={profile?.phoneNumber || 'N/A'} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input readonly" value={profile?.email || 'N/A'} readOnly />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Home Address</label>
                    <input className="form-input readonly" value={formatAddress(profile)} readOnly />
                  </div>
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Request Queue History</div>
                <button type="button" className="section-action" onClick={() => navigate('/officer/requests')}>View Full Queue</button>
              </div>
              <div className="hist-tabs">
                {STATUS_FILTERS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`hist-tab ${filter === tab.key ? 'active' : ''}`}
                    onClick={() => setFilter(tab.key)}
                  >
                    {tab.label} ({filterCounts[tab.key] ?? 0})
                  </button>
                ))}
              </div>

              {visibleRequests.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon"><FileText size={40} strokeWidth={1.8} /></div>
                  <div className="empty-text">No request records available for this filter.</div>
                </div>
              )}

              {visibleRequests.map((request) => (
                <div className="hist-item" key={request.id}>
                  <div className="hist-type-icon">
                    {(() => {
                      const IconComponent = DOCUMENT_ICONS[request.documentType] || FileText;
                      return <IconComponent size={20} strokeWidth={2} />;
                    })()}
                  </div>
                  <div className="hist-info">
                    <div className="hist-name">{DOCUMENT_LABELS[request.documentType] || request.documentType}</div>
                    <div className="hist-meta">Resident: {getDisplayName(request)} · Purpose: {getDisplayPurpose(request)}</div>
                    {request.officerRemarks && <div className="hist-remarks">Remarks: {request.officerRemarks}</div>}
                  </div>
                  <div className="hist-right">
                    <div className="req-id">REQ-{String(request.id).slice(0, 4).toUpperCase()}</div>
                    <div className="req-date">{formatDate(request.requestTimestamp)}</div>
                    <span className={`status-badge ${formatStatusClass(request.status)}`}>{formatStatusLabel(request.status)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Officer Verification</div>
              </div>
              <div className="section-body">
                <OfficerVerificationPanel user={profile || user} />
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-title"><Shield size={16} strokeWidth={2} /> Security Settings</div>
              </div>
              <div className="section-body">
                <div className="edit-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Current Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="At least 8 characters"
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Repeat new password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="security-action-row">
                  <button type="button" className="update-password-btn" onClick={handleUpdatePassword}>Update Password</button>
                </div>
              </div>
            </div>

            <div className="section-card mini-stats-card">
              <div className="mini-stats-grid">
                <div className="mini-stat-item">
                  <div className="mini-stat-label">Pending</div>
                  <div className="mini-stat-value"><Hourglass size={16} strokeWidth={2} /> {filterCounts.PENDING}</div>
                </div>
                <div className="mini-stat-item">
                  <div className="mini-stat-label">Approved</div>
                  <div className="mini-stat-value"><CheckCircle2 size={16} strokeWidth={2} /> {filterCounts.APPROVED}</div>
                </div>
                <div className="mini-stat-item">
                  <div className="mini-stat-label">For Release</div>
                  <div className="mini-stat-value"><Package size={16} strokeWidth={2} /> {filterCounts.READY}</div>
                </div>
                <div className="mini-stat-item">
                  <div className="mini-stat-label">Rejected</div>
                  <div className="mini-stat-value"><XCircle size={16} strokeWidth={2} /> {filterCounts.REJECTED}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
