import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Gauge,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Search,
  Shield,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import './BarangayAdminDashboardPage.css';
import './BarangayAdminProfilePage.css';

const INITIAL_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const formatFullName = (account) => [account?.firstName, account?.middleName, account?.lastName].filter(Boolean).join(' ') || 'Barangay Admin';

const formatAddress = (account) => [account?.street, account?.barangay, account?.city, account?.province, account?.zipCode].filter(Boolean).join(', ') || 'N/A';

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
};

const formatRoleLabel = (role) => {
  if (role === 'BARANGAY_ADMIN') return 'Barangay Admin';
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'OFFICER') return 'Officer';
  return 'Resident';
};

const formatStatusLabel = (status) => {
  if (!status) return 'Pending';
  return status.replaceAll('_', ' ').toLowerCase();
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

const toDateInputValue = (value) => {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
};

const buildProfileForm = (account) => ({
  firstName: account?.firstName || '',
  middleName: account?.middleName || '',
  lastName: account?.lastName || '',
  email: account?.email || '',
  phoneNumber: account?.phoneNumber || '',
  birthDate: toDateInputValue(account?.birthDate),
  street: account?.street || '',
  barangay: account?.barangay || '',
  city: account?.city || '',
  province: account?.province || '',
  zipCode: account?.zipCode || '',
});

const statusClass = (status) => {
  if (status === 'APPROVED') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'SUSPENDED') return 'suspended';
  return 'pending';
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

export default function BarangayAdminProfilePage() {
  const navigate = useNavigate();
  const { user, token, logout, setAuthData } = useAuth();
  const { showModal } = useModal();

  const [profile, setProfile] = useState(user);
  const [dashboard, setDashboard] = useState(null);
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(user));
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      const [currentUserResult, dashboardResult] = await Promise.allSettled([
        apiService.getCurrentUser(),
        apiService.getBarangayAdminDashboard(),
      ]);

      if (cancelled) {
        return;
      }

      const currentUser = currentUserResult.status === 'fulfilled' && currentUserResult.value ? currentUserResult.value : user;
      const dashboardPayload = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;

      setProfile(currentUser);
      setProfileForm(buildProfileForm(currentUser));
      setDashboard(dashboardPayload);

      const messages = [];
      if (currentUserResult.status === 'rejected') {
        messages.push(currentUserResult.reason?.message || 'Unable to load account details');
      }
      if (dashboardResult.status === 'rejected') {
        messages.push(dashboardResult.reason?.message || 'Unable to load barangay summary');
      }
      setError(messages.join(' '));
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = formatFullName(profile);
  const initials = initialsForName(fullName);
  const scopeBarangay = profile?.barangay || profile?.barangayCode || dashboard?.scope?.barangay || user?.barangay || 'Barangay Admin';
  const stats = dashboard?.stats || {};
  const summaryCards = useMemo(() => ([
    {
      label: 'Registered Residents',
      value: stats.registeredResidents ?? 0,
      sub: `${stats.pendingResidents ?? 0} pending verification`,
      icon: Users,
    },
    {
      label: 'Active Officers',
      value: stats.activeOfficers ?? 0,
      sub: `${stats.suspendedOfficers ?? 0} suspended`,
      icon: ShieldCheck,
    },
    {
      label: 'Open Requests',
      value: stats.openRequests ?? 0,
      sub: 'Live barangay document queue',
      icon: ClipboardList,
    },
    {
      label: 'Awaiting Verification',
      value: stats.awaitingVerification ?? 0,
      sub: 'Resident and officer review',
      icon: Search,
    },
  ]), [stats]);

  const dashboardLinks = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: Gauge, action: () => navigate('/dashboard/barangay-admin') },
        { label: 'User Management', icon: Users, action: () => navigate('/dashboard/barangay-admin/users') },
        { label: 'Document Requests', icon: ClipboardList, action: () => navigate('/dashboard/barangay-admin/requests') },
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
        { label: 'Profile', icon: User, active: true, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
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

  const handleStartEdit = () => {
    setProfileForm(buildProfileForm(profile));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setProfileForm(buildProfileForm(profile));
    setIsEditing(false);
  };

  const handleSaveProfile = () => {
    if (!profileForm.firstName.trim() || !profileForm.lastName.trim() || !profileForm.email.trim()) {
      showModal({
        context: 'error',
        title: 'Missing Profile Fields',
        message: 'First name, last name, and email are required before saving.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    const updatedProfile = {
      ...(profile || {}),
      firstName: profileForm.firstName.trim(),
      middleName: profileForm.middleName.trim(),
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim(),
      phoneNumber: profileForm.phoneNumber.trim(),
      birthDate: profileForm.birthDate || null,
      street: profileForm.street.trim(),
      barangay: profileForm.barangay.trim(),
      city: profileForm.city.trim(),
      province: profileForm.province.trim(),
      zipCode: profileForm.zipCode.trim(),
    };

    setProfile(updatedProfile);
    setProfileForm(buildProfileForm(updatedProfile));
    setIsEditing(false);

    if (token) {
      setAuthData(token, updatedProfile);
    }

    localStorage.setItem('user', JSON.stringify(updatedProfile));

    showModal({
      context: 'success',
      title: 'Profile Saved',
      message: 'Your profile changes are now reflected across the current session.',
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

    if (passwordForm.newPassword.length < 8) {
      showModal({
        context: 'error',
        title: 'Password Too Short',
        message: 'New password must be at least 8 characters long.',
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

    setPasswordForm(INITIAL_PASSWORD_FORM);

    showModal({
      context: 'success',
      title: 'Password Updated',
      message: 'The form was validated successfully and reset for the current session.',
      confirmText: 'OK',
      showCancel: false,
    });
  };

  const openAuditLog = () => {
    navigate('/dashboard/barangay-admin/audit-log');
  };

  return (
    <div className="barangay-admin-dashboard barangay-admin-profile">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="role-badge">🏛️ Barangay Admin</div>
          <div className="scope-note"><span className="scope-dot"></span> {scopeBarangay || 'Barangay scope not loaded'}</div>
        </div>
        <span className="nav-section">Overview</span>
        {dashboardLinks.map((section) => (
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
            <div className="user-av">{initials}</div>
            <div className="user-info">
              <h4>{fullName || 'Barangay Admin'}</h4>
              <p>{formatRoleLabel(profile?.role)}</p>
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
            <div className="header-title">My Profile</div>
            <div className="header-crumb">Dashboard / Profile</div>
          </div>
          <div className="header-right">
            <div className="hdr-flag" aria-hidden="true">
              <div className="hf-b"></div>
              <div className="hf-r"></div>
            </div>
          </div>
        </header>

        <div className="content">
          <div className="profile-card">
            <div className="profile-cover"></div>
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-big">{initials}</div>
            </div>
            <div className="profile-name">{fullName}</div>
            <div className="profile-role"><ShieldCheck size={14} strokeWidth={2} /> {formatRoleLabel(profile?.role)} · {scopeBarangay}</div>
            <div className={`profile-status-pill ${statusClass(profile?.status)}`}>{formatStatusLabel(profile?.status)}</div>

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
                <div className="info-icon"><FileText size={16} strokeWidth={2} /></div>
                <div>
                  <div className="info-key">Role</div>
                  <div className="info-val">{formatRoleLabel(profile?.role)}</div>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              {isEditing ? (
                <>
                  <button type="button" className="edit-profile-btn primary" onClick={handleSaveProfile}>
                    <Save size={14} strokeWidth={2} /> Save Changes
                  </button>
                  <button type="button" className="edit-profile-btn secondary" onClick={handleCancelEdit}>
                    <X size={14} strokeWidth={2} /> Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="edit-profile-btn" onClick={handleStartEdit}>
                  <Pencil size={14} strokeWidth={2} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="right-col">
            {error && <div className="profile-banner profile-error">{error}</div>}
            {loading && <div className="profile-banner profile-loading">Loading profile data...</div>}

            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Personal Information</div>
                {isEditing ? (
                  <div className="section-actions">
                    <button type="button" className="section-action" onClick={handleCancelEdit}>
                      <X size={14} strokeWidth={2} /> Cancel
                    </button>
                    <button type="button" className="section-action primary" onClick={handleSaveProfile}>
                      <Save size={14} strokeWidth={2} /> Save Changes
                    </button>
                  </div>
                ) : (
                  <button type="button" className="section-action" onClick={handleStartEdit}>
                    <Pencil size={14} strokeWidth={2} /> Edit
                  </button>
                )}
              </div>
              <div className="section-body">
                <div className="edit-grid">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.firstName}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.lastName}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Middle Name</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.middleName}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, middleName: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      type={isEditing ? 'date' : 'text'}
                      value={isEditing ? profileForm.birthDate : formatDate(profile?.birthDate)}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, birthDate: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.phoneNumber}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.email}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Home Address</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.street}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, street: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Barangay</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.barangay}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, barangay: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City / Municipality</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.city}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Province</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.province}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, province: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZIP Code</label>
                    <input
                      className={`form-input ${isEditing ? '' : 'readonly'}`}
                      value={profileForm.zipCode}
                      readOnly={!isEditing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, zipCode: event.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Barangay Scope</div>
                <button type="button" className="section-action" onClick={openAuditLog}>
                  <FileText size={14} strokeWidth={2} /> Audit Log
                </button>
              </div>
              <div className="section-body">
                <div className="summary-grid">
                  {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div className="summary-card" key={card.label}>
                        <div className="summary-top">
                          <div>
                            <div className="summary-value">{card.value}</div>
                            <div className="summary-label">{card.label}</div>
                          </div>
                          <div className="summary-icon"><Icon size={20} strokeWidth={2} /></div>
                        </div>
                        <div className="summary-sub">{card.sub}</div>
                      </div>
                    );
                  })}
                </div>
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
                  <button type="button" className="update-password-btn" onClick={handleUpdatePassword}>
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}