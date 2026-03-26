import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showModal } = useModal();

  const handleLogout = () => {
    showModal({
      context: 'confirmation',
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out? You will need to log in again to access your account.',
      confirmText: 'Yes, Logout',
      cancelText: 'Stay Logged In',
      onConfirm: () => {
        logout();
        showModal({
          context: 'success',
          title: 'Logged Out Successfully',
          message: 'You have been successfully logged out. Thank you for using PirmaPH!',
          confirmText: 'Back to Login',
          showCancel: false,
          onConfirm: () => {
            navigate('/');
          }
        });
      }
    });
  };

  const getInitials = () => {
    if (!user) return 'JD';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const getFullName = () => {
    if (!user) return 'Juan Dela Cruz';
    return `${user.firstName} ${user.lastName}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            Pirma<span>PH</span>
          </div>
          <div className="brand-sub">Barangay Digital Services</div>
        </div>

        <span className="nav-section-label">Resident</span>
        <a href="#" className="nav-item active">
          <span className="nav-icon">🏠</span> Dashboard
        </a>
        <a href="#" className="nav-item">
          <span className="nav-icon">📋</span> Submit Request
        </a>
        <a href="#" className="nav-item">
          <span className="nav-icon">🕐</span> My Requests
        </a>
        <a href="#" className="nav-item">
          <span className="nav-icon">📢</span> Announcements
        </a>

        <span className="nav-section-label">Account</span>
        <a href="#" className="nav-item">
          <span className="nav-icon">👤</span> Profile
        </a>
        <a href="#" className="nav-item">
          <span className="nav-icon">⚙️</span> Settings
        </a>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{getInitials()}</div>
            <div className="user-info">
              <h4>{getFullName()}</h4>
              <p>{user?.role || 'RESIDENT'}</p>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              →
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main">
        {/* Header */}
        <header className="header">
          <div>
            <div className="header-title">Dashboard</div>
            <div className="header-breadcrumb">Welcome back, {user?.firstName || 'Juan'}</div>
          </div>
          <div className="header-right">
            <div className="header-flag">
              <div className="hf-blue"></div>
              <div className="hf-red"></div>
            </div>
            <div className="notif-btn">
              🔔
              <span className="notif-badge"></span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="content">
          {/* Banner */}
          <div className="flag-banner">
            <div className="banner-text">
              <h2>{getGreeting()}, {user?.firstName || 'Juan'}! 🌅</h2>
              <p>
                You have 1 pending request and 2 new announcements from your barangay.
              </p>
            </div>
            <button className="banner-cta">+ New Request</button>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card blue">
              <div className="stat-label">Total Requests</div>
              <div className="stat-value">5</div>
              <div className="stat-sub">All time submissions</div>
              <span className="stat-icon">📋</span>
            </div>
            <div className="stat-card gold">
              <div className="stat-label">Pending</div>
              <div className="stat-value">1</div>
              <div className="stat-sub">Awaiting officer review</div>
              <span className="stat-icon">⏳</span>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Approved</div>
              <div className="stat-value">3</div>
              <div className="stat-sub">Ready for release</div>
              <span className="stat-icon">✅</span>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Rejected</div>
              <div className="stat-value">1</div>
              <div className="stat-sub">See remarks</div>
              <span className="stat-icon">❌</span>
            </div>
          </div>

          {/* Two-column */}
          <div className="two-col">
            {/* Recent Requests */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Recent Requests</div>
                <a href="#" className="card-action">
                  View All
                </a>
              </div>
              <div className="req-item">
                <div className="req-type-icon">📄</div>
                <div className="req-info">
                  <div className="req-name">Barangay Clearance</div>
                  <div className="req-meta">Requested on Dec 1, 2024</div>
                </div>
                <span className="req-status status-pending">Pending</span>
              </div>
              <div className="req-item">
                <div className="req-type-icon">🆔</div>
                <div className="req-info">
                  <div className="req-name">Certificate of Residency</div>
                  <div className="req-meta">Requested on Nov 28, 2024</div>
                </div>
                <span className="req-status status-approved">Approved</span>
              </div>
              <div className="req-item">
                <div className="req-type-icon">📄</div>
                <div className="req-info">
                  <div className="req-name">Barangay Clearance</div>
                  <div className="req-meta">Requested on Nov 20, 2024</div>
                </div>
                <span className="req-status status-ready">Ready</span>
              </div>
              <div className="req-item">
                <div className="req-type-icon">💼</div>
                <div className="req-info">
                  <div className="req-name">Certificate of Indigency</div>
                  <div className="req-meta">Requested on Nov 15, 2024</div>
                </div>
                <span className="req-status status-approved">Approved</span>
              </div>
              <div className="req-item">
                <div className="req-type-icon">🆔</div>
                <div className="req-info">
                  <div className="req-name">Barangay ID</div>
                  <div className="req-meta">Requested on Nov 10, 2024</div>
                </div>
                <span className="req-status status-rejected">Rejected</span>
              </div>
            </div>

            {/* Announcements */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Announcements</div>
                <a href="#" className="card-action">
                  View All
                </a>
              </div>
              <div className="announce-item">
                <span className="announce-badge ab-red">Urgent</span>
                <div className="announce-title">Community Meeting - Dec 10</div>
                <div className="announce-body">
                  All residents are invited to attend the quarterly barangay assembly at
                  the covered court.
                </div>
                <div className="announce-date">Posted 2 hours ago</div>
              </div>
              <div className="announce-item">
                <span className="announce-badge ab-blue">Info</span>
                <div className="announce-title">New Document Processing Schedule</div>
                <div className="announce-body">
                  Starting December 2024, document claims will be available Monday to
                  Friday, 9 AM to 4 PM.
                </div>
                <div className="announce-date">Posted 1 day ago</div>
              </div>
              <div className="announce-item">
                <span className="announce-badge ab-gold">Event</span>
                <div className="announce-title">Christmas Festival 2024</div>
                <div className="announce-body">
                  Join us for our annual Christmas celebration on December 20 at the
                  barangay hall.
                </div>
                <div className="announce-date">Posted 3 days ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
