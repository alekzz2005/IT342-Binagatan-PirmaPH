import { useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  RadioTower,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { useModal } from '../../shared/context/ModalContext';
import './SuperAdminSidebar.css';

const formatName = (entry) => {
  const parts = [entry?.firstName, entry?.middleName, entry?.lastName]
    .filter(Boolean)
    .map((piece) => String(piece).trim())
    .filter(Boolean);

  return parts.length ? parts.join(' ') : entry?.username || entry?.email || 'System Administrator';
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

const SuperAdminSidebar = ({
  activeItem,
  globalUserBadge,
  onSystemSettings,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const openSystemSettings = () => {
    if (typeof onSystemSettings === 'function') {
      onSystemSettings();
      return;
    }

    showModal({
      context: 'info',
      title: 'System settings',
      message: 'System-wide settings are currently read-only from this page.',
      confirmText: 'Close',
      showCancel: false,
    });
  };

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

  return (
    <aside className="super-admin-sidebar super-admin-shared-sidebar">
      <div className="sidebar-top">
        <div className="brand">Pirma<span>PH</span></div>
        <div className="brand-sub">National Admin Portal</div>
        <div className="sa-badge">Super Admin</div>
      </div>

      <span className="nav-section-label">System</span>
      <button
        type="button"
        className={`nav-item ${activeItem === 'dashboard' ? 'active' : ''}`}
        onClick={() => navigate('/dashboard/super-admin')}
      >
        <span className="nav-icon"><LayoutDashboard size={16} strokeWidth={2} /></span>
        Dashboard
      </button>
      <button
        type="button"
        className={`nav-item ${activeItem === 'barangays' ? 'active' : ''}`}
        onClick={() => navigate('/dashboard/super-admin/barangays')}
      >
        <span className="nav-icon"><Building2 size={16} strokeWidth={2} /></span>
        Barangay Management
      </button>
      <button
        type="button"
        className={`nav-item ${activeItem === 'users' ? 'active' : ''}`}
        onClick={() => navigate('/dashboard/super-admin/users')}
      >
        <span className="nav-icon"><Users size={16} strokeWidth={2} /></span>
        Global User Control
        {globalUserBadge ? <span className="nav-badge">{globalUserBadge}</span> : null}
      </button>

      <span className="nav-section-label">Monitoring</span>
      <button
        type="button"
        className={`nav-item ${activeItem === 'monitoring' ? 'active' : ''}`}
        onClick={() => navigate('/dashboard/super-admin/monitoring')}
      >
        <span className="nav-icon"><RadioTower size={16} strokeWidth={2} /></span>
        System Monitoring
      </button>

      <span className="nav-section-label">Config</span>
      <button type="button" className="nav-item" onClick={openSystemSettings}>
        <span className="nav-icon"><Settings size={16} strokeWidth={2} /></span>
        System Settings
      </button>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initialsForName(formatName(user))}</div>
          <div className="user-info">
            <h4>{formatName(user)}</h4>
            <p>Super Admin</p>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout} aria-label="Logout">⇥</button>
        </div>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
