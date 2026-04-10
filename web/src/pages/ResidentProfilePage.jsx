import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, FileBadge, FileText, HandHelping, Home, IdCard, Mail, MapPin, Phone, Pencil, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import apiService from '../services/api';
import ResidentSidebar from '../components/ResidentSidebar';
import ResidentVerificationPanel from '../components/ResidentVerificationPanel';
import './ResidentProfilePage.css';

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

const formatFullName = (user) => [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ') || 'Juan Dela Cruz';

const formatAddress = (user) => [user?.street, user?.barangay, user?.city, user?.province, user?.zipCode].filter(Boolean).join(', ') || 'N/A';

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

export default function ResidentProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [currentUser, myRequests] = await Promise.all([
          apiService.getCurrentUser(),
          apiService.getMyDocumentRequests(),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(currentUser || user);
        setRequests(Array.isArray(myRequests) ? myRequests : []);
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
  const initials = [profile?.firstName?.charAt(0), profile?.lastName?.charAt(0)].filter(Boolean).join('').toUpperCase() || 'JD';

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

  return (
    <div className="resident-profile-shell">
      <ResidentSidebar activeItem="profile" />

      <div className="main">
        <header className="header">
          <div>
            <div className="header-title">My Profile</div>
            <div className="header-breadcrumb">Dashboard / Profile</div>
          </div>
        </header>

        <div className="content">
          <div>
            <div className="profile-card">
              <div className="profile-cover"></div>
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-big">{initials}</div>
              </div>
              <div className="profile-name">{fullName}</div>
              <div className="profile-role"><Home size={14} strokeWidth={2} /> Resident · {profile?.barangay || profile?.barangayCode || 'Barangay N/A'}</div>

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
                    <div className="info-key">Total Requests</div>
                    <div className="info-val">{filterCounts.ALL} request{filterCounts.ALL === 1 ? '' : 's'} submitted</div>
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
                <div className="section-title">Request History</div>
                <button type="button" className="section-action" onClick={() => navigate('/requests/mine')}>View Full List</button>
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
                    <div className="hist-meta">Purpose: {request.purpose} · {request.copies} {request.copies === 1 ? 'copy' : 'copies'}</div>
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
                <div className="section-title">Resident Verification</div>
              </div>
              <div className="section-body">
                <ResidentVerificationPanel user={profile || user} />
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
          </div>
        </div>
      </div>
    </div>
  );
}
