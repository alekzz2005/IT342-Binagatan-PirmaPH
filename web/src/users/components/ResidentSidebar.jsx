import { useNavigate } from 'react-router-dom';
import { FileText, History, Home, LogOut, User } from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { useModal } from '../../shared/context/ModalContext';
import './ResidentSidebar.css';

const getResidentName = (user) => {
  if (!user) {
    return 'Juan Dela Cruz';
  }

  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Juan Dela Cruz';
};

const getInitials = (name) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) {
    return 'JD';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
};

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard/resident' },
  { key: 'submit', label: 'Submit Request', icon: FileText, path: '/requests/submit' },
  { key: 'requests', label: 'My Requests', icon: History, path: '/requests/mine' },
];

export default function ResidentSidebar({ activeItem = 'dashboard' }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const residentName = getResidentName(user);
  const residentInitials = getInitials(residentName);

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
          onConfirm: () => navigate('/'),
        });
      },
    });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">Pirma<span>PH</span></div>
        <div className="brand-sub">Barangay Digital Services</div>
      </div>

      <span className="nav-section-label">Resident</span>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`nav-item ${activeItem === item.key ? 'active' : ''}`}
          aria-current={activeItem === item.key ? 'page' : undefined}
          onClick={() => {
            if (item.path) {
              navigate(item.path);
            }
          }}
        >
          <span className="nav-icon"><item.icon size={18} strokeWidth={2} /></span>
          <span>{item.label}</span>
        </button>
      ))}

      <span className="nav-section-label">Account</span>
      <button
        type="button"
        className={`nav-item ${activeItem === 'profile' ? 'active' : ''}`}
        aria-current={activeItem === 'profile' ? 'page' : undefined}
        onClick={() => navigate('/profile')}
      >
        <span className="nav-icon"><User size={18} strokeWidth={2} /></span>
        <span>Profile</span>
      </button>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{residentInitials}</div>
          <div className="user-info">
            <h4>{residentName}</h4>
            <p>Resident</p>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
