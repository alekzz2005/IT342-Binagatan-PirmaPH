import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Globe2,
  HardHat,
  LayoutDashboard,
  LogOut,
  RadioTower,
  Search,
  Settings,
  Shield,
  TriangleAlert,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import apiService from '../../../shared/services/api';
import locationService from '../../../shared/services/locationService';
import SuperAdminSidebar from '../../../superadmin/components/SuperAdminSidebar';
import './SuperAdminBarangayManagementPage.css';

const PAGE_SIZE = 6;

const initialForm = {
  barangayName: '',
  regionCode: '',
  city: '',
  cityMunCode: '',
  province: '',
  provinceCode: '',
  region: '',
  zipCode: '',
  barangayCode: '',
  adminFirstName: '',
  adminMiddleName: '',
  adminLastName: '',
  adminEmail: '',
  adminPhone: '',
  temporaryPassword: '',
  termStart: '',
  termEnd: '',
};

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

const safeLabel = (value) => {
  if (!value || !String(value).trim()) {
    return 'Unassigned';
  }

  return String(value).trim();
};

const formatName = (entry) => {
  const pieces = [entry?.firstName, entry?.middleName, entry?.lastName]
    .filter((piece) => piece && piece.trim())
    .map((piece) => piece.trim());

  return pieces.length > 0 ? pieces.join(' ') : entry?.username || 'Unnamed account';
};

const initialsForName = (value) => {
  if (!value) {
    return 'SA';
  }

  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'SA';
  }

  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

const formatBadgeName = (barangay) => {
  if (!barangay) {
    return 'Barangay';
  }

  return barangay;
};

const getSortValue = (barangay, sortBy) => {
  if (sortBy === 'requests') {
    return barangay.requestsCount;
  }

  if (sortBy === 'newest') {
    return new Date(barangay.latestActivity || 0).getTime();
  }

  if (sortBy === 'region') {
    return `${safeLabel(barangay.region)} ${safeLabel(barangay.city)} ${safeLabel(barangay.barangay)}`.toLowerCase();
  }

  return barangay.barangay.toLowerCase();
};

const matchesSearch = (barangay, query) => {
  if (!query) {
    return true;
  }

  const haystack = [
    barangay.barangay,
    barangay.barangayCode,
    barangay.city,
    barangay.province,
    barangay.region,
    barangay.approvedAdminName,
    barangay.pendingAdminName,
    String(barangay.requestsCount),
    String(barangay.residentsCount),
    String(barangay.officersCount),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
};

const matchesFilter = (barangay, filter) => {
  if (filter === 'ALL') {
    return true;
  }

  if (filter === 'ACTIVE') {
    return barangay.status === 'ACTIVE';
  }

  if (filter === 'NO_ADMIN') {
    return barangay.status === 'NO_ADMIN';
  }

  if (filter === 'INACTIVE') {
    return barangay.status === 'INACTIVE';
  }

  return true;
};

function SidebarAction({ icon: Icon, label, active, badge, onClick }) {
  return (
    <button type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon">
        <Icon size={16} strokeWidth={2} />
      </span>
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  );
}

function StatCard({ tone, value, label, icon: Icon }) {
  return (
    <div className={`stat-card sc-${tone}`}>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
      <span className="stat-icon">
        <Icon size={22} strokeWidth={2} />
      </span>
    </div>
  );
}

export default function SuperAdminBarangayManagementPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const panelRef = useRef(null);
  const firstFieldRef = useRef(null);

  const [dashboard, setDashboard] = useState({ scope: {}, stats: {}, users: [], requests: [], activity: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [selectedBarangayCode, setSelectedBarangayCode] = useState('');
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = await apiService.getSuperAdminDashboard();
      setDashboard({
        scope: payload?.scope || {},
        stats: payload?.stats || {},
        users: Array.isArray(payload?.users) ? payload.users : [],
        requests: Array.isArray(payload?.requests) ? payload.requests : [],
        activity: Array.isArray(payload?.activity) ? payload.activity : [],
      });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load barangay management data');
      setDashboard({ scope: {}, stats: {}, users: [], requests: [], activity: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadRegions = async () => {
      setLoadingLocations(true);
      const data = await locationService.fetchRegions();
      setRegions(Array.isArray(data) ? data : []);
      setLoadingLocations(false);
    };

    loadRegions();
  }, []);

  const handleRegionChange = async (event) => {
    const selectedRegion = regions.find((entry) => entry.code === event.target.value);

    setForm((current) => ({
      ...current,
      regionCode: event.target.value,
      region: selectedRegion?.name || '',
      provinceCode: '',
      province: '',
      cityMunCode: '',
      city: '',
      barangayCode: '',
      barangayName: '',
    }));

    setProvinces([]);
    setCities([]);
    setBarangayOptions([]);

    if (!event.target.value) {
      return;
    }

    setLoadingLocations(true);
    const provincesData = await locationService.fetchProvincesByRegion(event.target.value);

    if (provincesData && provincesData.length > 0) {
      setProvinces(provincesData);
    } else {
      const citiesData = await locationService.fetchCitiesByRegion(event.target.value);
      setCities(citiesData);
    }

    setLoadingLocations(false);
  };

  const handleProvinceChange = async (event) => {
    const selectedProvince = provinces.find((entry) => entry.code === event.target.value);

    setForm((current) => ({
      ...current,
      provinceCode: event.target.value,
      province: selectedProvince?.name || '',
      cityMunCode: '',
      city: '',
      barangayCode: '',
      barangayName: '',
    }));

    setCities([]);
    setBarangayOptions([]);

    if (!event.target.value) {
      return;
    }

    setLoadingLocations(true);
    const citiesData = await locationService.fetchCitiesByProvince(event.target.value);
    setCities(citiesData);
    setLoadingLocations(false);
  };

  const handleCityChange = async (event) => {
    const selectedCity = cities.find((entry) => entry.code === event.target.value);

    setForm((current) => ({
      ...current,
      cityMunCode: event.target.value,
      city: selectedCity?.name || '',
      barangayCode: '',
      barangayName: '',
    }));

    setBarangayOptions([]);

    if (!event.target.value) {
      return;
    }

    setLoadingLocations(true);
    const barangaysData = await locationService.fetchBarangaysByCity(event.target.value);
    setBarangayOptions(barangaysData);
    setLoadingLocations(false);
  };

  const handleBarangayChange = (event) => {
    const selectedBarangay = barangayOptions.find((entry) => entry.code === event.target.value);

    setForm((current) => ({
      ...current,
      barangayCode: event.target.value,
      barangayName: selectedBarangay?.name || '',
    }));
  };

  const barangays = useMemo(() => {
    const groups = new Map();

    const ensureGroup = (entry = {}, key, fallbackBarangay = '') => {
      if (!groups.has(key)) {
        groups.set(key, {
          barangayCode: key,
          barangay: fallbackBarangay || key,
          city: entry.city || '',
          province: entry.province || '',
          region: entry.region || '',
          zipCode: entry.zipCode || '',
          residentsCount: 0,
          officersCount: 0,
          requestsCount: 0,
          pendingRequestsCount: 0,
          inactiveUsersCount: 0,
          approvedAdminCount: 0,
          pendingAdminCount: 0,
          approvedAdmin: null,
          pendingAdmin: null,
          suspendedAdmin: null,
          latestActivity: entry.updatedAt || entry.createdAt || null,
          users: [],
          requests: [],
        });
      }

      return groups.get(key);
    };

    dashboard.users.forEach((entry) => {
      const barangayCode = entry.barangayCode || 'UNASSIGNED';
      const summary = ensureGroup(entry, barangayCode, entry.barangay || barangayCode);

      summary.users.push(entry);
      summary.barangay = summary.barangay || entry.barangay || barangayCode;
      summary.city = summary.city || entry.city || '';
      summary.province = summary.province || entry.province || '';
      summary.region = summary.region || entry.region || '';
      summary.zipCode = summary.zipCode || entry.zipCode || '';
      summary.latestActivity = entry.updatedAt || entry.createdAt || summary.latestActivity;

      if (entry.role === 'RESIDENT') {
        summary.residentsCount += 1;
      }

      if (entry.role === 'OFFICER') {
        summary.officersCount += 1;
      }

      if (entry.role === 'BARANGAY_ADMIN') {
        if (entry.status === 'APPROVED') {
          summary.approvedAdminCount += 1;
          summary.approvedAdmin = summary.approvedAdmin || entry;
        } else if (entry.status === 'PENDING_VERIFICATION') {
          summary.pendingAdminCount += 1;
          summary.pendingAdmin = summary.pendingAdmin || entry;
        } else if (entry.status === 'SUSPENDED') {
          summary.suspendedAdmin = summary.suspendedAdmin || entry;
        }
      }

      if (entry.status === 'SUSPENDED') {
        summary.inactiveUsersCount += 1;
      }
    });

    dashboard.requests.forEach((request) => {
      const barangayCode = request.barangayCode || 'UNASSIGNED';
      const summary = ensureGroup(request, barangayCode, request.barangayCode || barangayCode);

      summary.requests.push(request);
      summary.requestsCount += 1;
      summary.latestActivity = request.updatedAt || request.requestTimestamp || summary.latestActivity;

      if (['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'].includes(request.status)) {
        summary.pendingRequestsCount += 1;
      }
    });

    return [...groups.values()]
      .map((summary) => {
        const hasApprovedAdmin = summary.approvedAdminCount > 0;
        const hasSuspendedAdmin = Boolean(summary.suspendedAdmin);
        const hasAnyAdmin = hasApprovedAdmin || Boolean(summary.pendingAdmin) || hasSuspendedAdmin;

        let status = 'NO_ADMIN';
        if (hasApprovedAdmin && !hasSuspendedAdmin) {
          status = 'ACTIVE';
        } else if (hasApprovedAdmin && hasSuspendedAdmin) {
          status = 'INACTIVE';
        } else if (!hasAnyAdmin) {
          status = 'NO_ADMIN';
        }

        return {
          ...summary,
          status,
          displayAdmin: summary.approvedAdmin || summary.pendingAdmin || summary.suspendedAdmin,
          approvedAdminName: summary.approvedAdmin ? formatName(summary.approvedAdmin) : '',
          pendingAdminName: summary.pendingAdmin ? formatName(summary.pendingAdmin) : '',
          adminLabel: summary.approvedAdmin
            ? 'Barangay Admin'
            : summary.pendingAdmin
              ? 'Pending Admin'
              : summary.suspendedAdmin
                ? 'Suspended Admin'
                : 'No Barangay Admin assigned',
        };
      })
      .sort((left, right) => {
        const valueDelta = getSortValue(right, sortBy) > getSortValue(left, sortBy) ? 1 : getSortValue(right, sortBy) < getSortValue(left, sortBy) ? -1 : 0;

        if (sortBy === 'name' || sortBy === 'region') {
          return getSortValue(left, sortBy).localeCompare(getSortValue(right, sortBy));
        }

        if (valueDelta !== 0) {
          return valueDelta;
        }

        return left.barangay.localeCompare(right.barangay);
      });
  }, [dashboard.requests, dashboard.users, sortBy]);

  const filteredBarangays = useMemo(() => {
    return barangays
      .filter((entry) => matchesSearch(entry, searchQuery))
      .filter((entry) => matchesFilter(entry, filter));
  }, [barangays, filter, searchQuery]);

  const totalBarangays = barangays.length;
  const activeBarangays = barangays.filter((entry) => entry.status === 'ACTIVE').length;
  const noAdminBarangays = barangays.filter((entry) => entry.status === 'NO_ADMIN').length;
  const inactiveBarangays = barangays.filter((entry) => entry.status === 'INACTIVE').length;
  const totalOfficers = dashboard.users.filter((entry) => entry.role === 'OFFICER').length;

  const pageCount = Math.max(1, Math.ceil(filteredBarangays.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortBy]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const currentBarangays = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBarangays.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredBarangays]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openManagementConsole = () => {
    navigate('/dashboard/super-admin/manage');
  };

  const openGlobalUserControl = () => {
    navigate('/dashboard/super-admin/users');
  };

  const openMonitoring = () => navigate('/dashboard/super-admin/monitoring');

  const openSystemSettings = () => {
    showModal({
      context: 'info',
      title: 'System settings',
      message: 'Use the management console for system-wide settings and user operations.',
      confirmText: 'Open Management Console',
      showCancel: false,
      onConfirm: openManagementConsole,
    });
  };

  const openDashboard = () => {
    navigate('/dashboard/super-admin');
  };

  const refreshPage = async () => {
    await loadData();
    showModal({
      context: 'success',
      title: 'Refreshed',
      message: 'Barangay management data has been refreshed from the server.',
      confirmText: 'OK',
      showCancel: false,
    });
  };

  const openCreateForm = () => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => firstFieldRef.current?.focus(), 200);
  };

  const selectBarangayForForm = (barangay) => {
    setSelectedBarangayCode(barangay.barangayCode || '');
    openCreateForm();
  };

  const clearForm = () => {
    setForm(initialForm);
    setSelectedBarangayCode('');
  };

  const viewBarangay = (barangay) => {
    const approvedAdmin = barangay.approvedAdmin ? formatName(barangay.approvedAdmin) : 'No approved admin yet';

    showModal({
      context: barangay.status === 'ACTIVE' ? 'info' : 'warning',
      title: `${barangay.barangay} overview`,
      message: barangay.status === 'ACTIVE'
        ? `${barangay.barangay} is currently active and managed by ${approvedAdmin}.`
        : barangay.status === 'INACTIVE'
          ? `${barangay.barangay} has an assigned admin but the account is suspended.`
          : `${barangay.barangay} still needs an approved barangay admin.`,
      detail: [
        `Barangay code: ${barangay.barangayCode}`,
        `City: ${safeLabel(barangay.city)}`,
        `Province: ${safeLabel(barangay.province)}`,
        `Region: ${safeLabel(barangay.region)}`,
        `Residents: ${barangay.residentsCount}`,
        `Officers: ${barangay.officersCount}`,
        `Requests: ${barangay.requestsCount}`,
        `Pending requests: ${barangay.pendingRequestsCount}`,
        `Admin: ${approvedAdmin}`,
      ].join('\n'),
      confirmText: 'Open Management Console',
      showCancel: false,
      onConfirm: openManagementConsole,
    });
  };

  const editBarangay = (barangay) => {
    showModal({
      context: 'info',
      title: 'Edit barangay details',
      message: `Use the management console to revise barangay-level account details for ${barangay.barangay}.`,
      detail: 'The create panel on this page can bootstrap a new barangay admin. Existing account edits remain in the management console.',
      confirmText: 'Open Management Console',
      showCancel: false,
      onConfirm: openManagementConsole,
    });
  };

  const suspendAdmin = (barangay) => {
    const targetAdmin = barangay.approvedAdmin;
    if (!targetAdmin?.id) {
      selectBarangayForForm(barangay);
      return;
    }

    showModal({
      context: 'warning',
      title: 'Suspend barangay admin?',
      message: `This will suspend ${formatName(targetAdmin)} in ${barangay.barangay}.`,
      detail: 'Suspended admins can be reinstated from the management console.',
      confirmText: 'Suspend',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setActionLoadingId(targetAdmin.id);
        try {
          await apiService.suspendUser(targetAdmin.id);
          await loadData();
          showModal({
            context: 'success',
            title: 'Admin suspended',
            message: `${formatName(targetAdmin)} has been suspended successfully.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (suspendError) {
          showModal({
            context: 'error',
            title: 'Unable to suspend admin',
            message: suspendError.message || 'The suspension request could not be completed.',
            confirmText: 'OK',
            showCancel: false,
          });
        } finally {
          setActionLoadingId('');
        }
      },
    });
  };

  const reinstateAdmin = (barangay) => {
    const targetAdmin = barangay.suspendedAdmin || barangay.approvedAdmin;
    if (!targetAdmin?.id) {
      selectBarangayForForm(barangay);
      return;
    }

    showModal({
      context: 'confirmation',
      title: 'Reinstate barangay admin?',
      message: `This will restore ${formatName(targetAdmin)} for ${barangay.barangay}.`,
      confirmText: 'Reinstate',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setActionLoadingId(targetAdmin.id);
        try {
          await apiService.reinstateUser(targetAdmin.id);
          await loadData();
          showModal({
            context: 'success',
            title: 'Admin reinstated',
            message: `${formatName(targetAdmin)} has been reinstated successfully.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (reinstateError) {
          showModal({
            context: 'error',
            title: 'Unable to reinstate admin',
            message: reinstateError.message || 'The reinstatement request could not be completed.',
            confirmText: 'OK',
            showCancel: false,
          });
        } finally {
          setActionLoadingId('');
        }
      },
    });
  };

  const submitBarangayAdmin = async (event) => {
    event.preventDefault();

    if (!form.regionCode || !form.cityMunCode || !form.barangayCode || !form.barangayName.trim() || !form.city.trim() || !form.region.trim() || !form.adminFirstName.trim() || !form.adminLastName.trim() || !form.adminEmail.trim() || !form.adminPhone.trim() || !form.temporaryPassword.trim()) {
      showModal({
        context: 'error',
        title: 'Missing information',
        message: 'Please complete the hierarchical location fields (region, city/municipality, barangay) and admin information.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    const firstName = form.adminFirstName.trim();
    const lastName = form.adminLastName.trim();
    const middleName = form.adminMiddleName.trim();

    if (!firstName || !lastName) {
      showModal({
        context: 'error',
        title: 'Invalid admin name',
        message: 'Please enter both the first name and last name.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    if (form.temporaryPassword.length < 8) {
      showModal({
        context: 'error',
        title: 'Weak temporary password',
        message: 'The temporary password must contain at least 8 characters.',
        confirmText: 'OK',
        showCancel: false,
      });
      return;
    }

    try {
      setActionLoadingId('create-barangay-admin');
      const response = await apiService.createBarangayAdmin({
        email: form.adminEmail.trim(),
        temporaryPassword: form.temporaryPassword,
        firstName,
        middleName,
        lastName,
        phoneNumber: form.adminPhone.trim(),
        regionCode: form.regionCode,
        provinceCode: form.provinceCode,
        cityMunCode: form.cityMunCode,
        barangayCode: form.barangayCode.trim(),
        barangay: form.barangayName.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        region: form.region.trim(),
        zipCode: form.zipCode.trim(),
      });

      await loadData();
      showModal({
        context: 'success',
        title: 'Barangay admin created',
        message: `${response.username || 'The new barangay admin'} was created successfully.`,
        detail: [
          `Barangay: ${form.barangayName.trim()}`,
          `Username: ${response.username || 'Generated automatically'}`,
          `Email: ${response.email || form.adminEmail.trim()}`,
          `Status: ${response.status || 'APPROVED'}`,
        ].join('\n'),
        confirmText: 'OK',
        showCancel: false,
      });
      clearForm();
    } catch (createError) {
      showModal({
        context: 'error',
        title: 'Unable to create barangay admin',
        message: createError.message || 'The account could not be created.',
        confirmText: 'OK',
        showCancel: false,
      });
    } finally {
      setActionLoadingId('');
    }
  };

  const pageItems = useMemo(() => {
    const totalPages = Math.max(1, pageCount);
    const visiblePages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      visiblePages.push(pageNumber);
    }

    return visiblePages;
  }, [currentPage, pageCount]);

  const pageSummary = filteredBarangays.length;

  return (
    <div className="super-admin-barangay-management">
      <SuperAdminSidebar activeItem="barangays" onSystemSettings={openSystemSettings} />

      <main className="main">
        <header className="header">
          <div className="header-left">
            <div className="header-title">Barangay Management</div>
            <div className="header-breadcrumb"><span>Super Admin</span> → Barangay Management</div>
          </div>
          <div className="header-right">
            <div className="scope-pill"><Globe2 size={14} strokeWidth={2} /> Nationwide Scope</div>
            <button type="button" className="header-notif" onClick={refreshPage} aria-label="Refresh barangay data">
              <Bell size={16} strokeWidth={2} />
              <span className="notif-dot"></span>
            </button>
            <button type="button" className="btn-primary header-create-btn" onClick={openCreateForm}>
              <UserCog size={16} strokeWidth={2} /> Create Barangay
            </button>
          </div>
        </header>

        <div className="content">
          <div className="stat-strip">
            <StatCard tone="blue" value={totalBarangays} label="Total Barangays" icon={Building2} />
            <StatCard tone="green" value={activeBarangays} label="Active" icon={CheckCircle2} />
            <StatCard tone="orange" value={noAdminBarangays} label="No Admin Assigned" icon={TriangleAlert} />
            <StatCard tone="red" value={inactiveBarangays} label="Inactive / Suspended" icon={XCircle} />
            <StatCard tone="gold" value={totalOfficers} label="Total Officers" icon={HardHat} />
          </div>

          <div className="create-panel" ref={panelRef}>
            <div className="create-panel-header">
              <div className="cp-title">🏛️ Register New Barangay</div>
              <div className="cp-sub">
                Only Super Admin can bootstrap a new barangay into the system
                {selectedBarangayCode ? ` · Selected card: ${selectedBarangayCode}` : ''}
              </div>
            </div>
            <div className="create-panel-body">
              <form onSubmit={submitBarangayAdmin}>
                <div className="form-grid">
                  <div className="section-divider">Barangay Information</div>
                  <div className="form-group">
                    <label className="form-label">Region <span style={{ color: 'var(--red)' }}>*</span></label>
                    <select
                      ref={firstFieldRef}
                      className="form-select"
                      value={form.regionCode}
                      onChange={handleRegionChange}
                      disabled={loadingLocations}
                    >
                      <option value="">{loadingLocations ? 'Loading regions...' : '— Select Region —'}</option>
                      {regions.map((entry) => (
                        <option key={entry.code} value={entry.code}>{entry.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Province</label>
                    <select
                      className="form-select"
                      value={form.provinceCode}
                      onChange={handleProvinceChange}
                      disabled={!form.regionCode || provinces.length === 0 || loadingLocations}
                    >
                      <option value="">{provinces.length === 0 ? '— N/A for selected region —' : '— Select Province —'}</option>
                      {provinces.map((entry) => (
                        <option key={entry.code} value={entry.code}>{entry.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City / Municipality <span style={{ color: 'var(--red)' }}>*</span></label>
                    <select
                      className="form-select"
                      value={form.cityMunCode}
                      onChange={handleCityChange}
                      disabled={(!form.provinceCode && provinces.length > 0) || !form.regionCode || loadingLocations}
                    >
                      <option value="">{loadingLocations ? 'Loading cities/municipalities...' : '— Select City/Municipality —'}</option>
                      {cities.map((entry) => (
                        <option key={entry.code} value={entry.code}>{entry.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Barangay Name <span style={{ color: 'var(--red)' }}>*</span></label>
                    <select
                      className="form-select"
                      value={form.barangayCode}
                      onChange={handleBarangayChange}
                      disabled={!form.cityMunCode || loadingLocations}
                    >
                      <option value="">{loadingLocations ? 'Loading barangays...' : '— Select Barangay —'}</option>
                      {barangayOptions.map((entry) => (
                        <option key={entry.code} value={entry.code}>{entry.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Zip Code</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. 1100"
                      value={form.zipCode}
                      onChange={(event) => setForm((current) => ({ ...current, zipCode: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Barangay Code (PSA)</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. 137601001"
                      value={form.barangayCode}
                      readOnly
                    />
                  </div>

                  <div className="section-divider">First Barangay Admin (Bootstrap)</div>
                  <div className="form-group">
                    <label className="form-label">First Name <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="First name"
                      value={form.adminFirstName}
                      onChange={(event) => setForm((current) => ({ ...current, adminFirstName: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Middle Name</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Middle name (optional)"
                      value={form.adminMiddleName}
                      onChange={(event) => setForm((current) => ({ ...current, adminMiddleName: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Last name"
                      value={form.adminLastName}
                      onChange={(event) => setForm((current) => ({ ...current, adminLastName: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admin Email <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="admin@brgy.gov.ph"
                      value={form.adminEmail}
                      onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admin Phone <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input
                      className="form-input"
                      type="tel"
                      placeholder="+63 9XX XXX XXXX"
                      value={form.adminPhone}
                      onChange={(event) => setForm((current) => ({ ...current, adminPhone: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temporary Password <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="System will force reset on first login"
                      value={form.temporaryPassword}
                      onChange={(event) => setForm((current) => ({ ...current, temporaryPassword: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Term Start</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.termStart}
                      onChange={(event) => setForm((current) => ({ ...current, termStart: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Term End</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.termEnd}
                      onChange={(event) => setForm((current) => ({ ...current, termEnd: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={clearForm}>Cancel</button>
                  <button type="submit" className="btn-create" disabled={actionLoadingId === 'create-barangay-admin'}>
                    {actionLoadingId === 'create-barangay-admin' ? 'Creating...' : '🏛️ Create Barangay & Assign Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <Search size={15} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search barangay, city, province, or admin name…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="filter-chips">
              <button type="button" className={`chip ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>All ({totalBarangays})</button>
              <button type="button" className={`chip ${filter === 'ACTIVE' ? 'active' : ''}`} onClick={() => setFilter('ACTIVE')}>Active ({activeBarangays})</button>
              <button type="button" className="chip chip-warn" onClick={() => setFilter('NO_ADMIN')}>No Admin ({noAdminBarangays})</button>
              <button type="button" className={`chip ${filter === 'INACTIVE' ? 'active' : ''}`} onClick={() => setFilter('INACTIVE')}>Inactive ({inactiveBarangays})</button>
            </div>
            <div className="toolbar-sep"></div>
            <select className="sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name">Sort: Name A–Z</option>
              <option value="requests">Sort: Most Requests</option>
              <option value="newest">Sort: Newest</option>
              <option value="region">Sort: Region</option>
            </select>
          </div>

          {error ? (
            <div className="dashboard-error">
              <AlertTriangle size={16} strokeWidth={2} />
              <span>{error}</span>
              <button type="button" onClick={loadData}>Retry</button>
            </div>
          ) : null}

          <div className="brgy-grid">
            {loading && (
              <div className="empty-state">Loading barangay records...</div>
            )}

            {!loading && currentBarangays.length === 0 && (
              <div className="empty-state">No barangays match the current search or filter.</div>
            )}

            {currentBarangays.map((barangay) => {
              const isActive = barangay.status === 'ACTIVE';
              const isNoAdmin = barangay.status === 'NO_ADMIN';
              const isInactive = barangay.status === 'INACTIVE';
              const cardClass = isNoAdmin || isInactive ? 'warn-card' : '';
              const adminName = barangay.approvedAdminName || barangay.pendingAdminName || (barangay.suspendedAdmin ? formatName(barangay.suspendedAdmin) : 'No Barangay Admin assigned');
              const adminStatusLabel = barangay.status === 'ACTIVE'
                ? 'Barangay Admin · Approved'
                : barangay.status === 'INACTIVE'
                  ? 'Barangay Admin · Suspended'
                  : barangay.pendingAdmin
                    ? 'Pending admin bootstrap'
                    : 'No Barangay Admin assigned';

              return (
                <div
                  key={barangay.barangayCode}
                  className={`brgy-card ${cardClass}`}
                  onClick={() => viewBarangay(barangay)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      viewBarangay(barangay);
                    }
                  }}
                >
                  <div className="brgy-card-header">
                    <div className="bc-name">{formatBadgeName(barangay.barangay)}</div>
                    <div className="bc-city">
                      <span className={isActive ? 'online-dot' : 'offline-dot'}></span>
                      {safeLabel(barangay.city)}, {safeLabel(barangay.province)}
                    </div>
                    <div className="bc-id">{barangay.barangayCode} · PSA: {barangay.barangayCode || 'N/A'}</div>
                  </div>
                  <div className="brgy-card-body">
                    {isNoAdmin ? (
                      <div className="bc-no-admin">
                        <span>⚠️</span>
                        <span>No Barangay Admin assigned — bootstrap required</span>
                      </div>
                    ) : isInactive ? (
                      <div className="bc-no-admin">
                        <span>🚫</span>
                        <span>Barangay Admin suspended — reinstate required</span>
                      </div>
                    ) : (
                      <div className="bc-admin-row">
                        <div className="bc-admin-avatar">{initialsForName(adminName)}</div>
                        <div>
                          <div className="bc-admin-name">{adminName}</div>
                          <div className="bc-admin-role">{adminStatusLabel}</div>
                        </div>
                      </div>
                    )}

                    <div className="bc-stats-row">
                      <div className="bc-stat">
                        <div className="bc-stat-val">{barangay.residentsCount}</div>
                        <div className="bc-stat-lbl">Residents</div>
                      </div>
                      <div className="bc-stat">
                        <div className="bc-stat-val">{barangay.requestsCount}</div>
                        <div className="bc-stat-lbl">Requests</div>
                      </div>
                      <div className="bc-stat">
                        <div className="bc-stat-val">{barangay.officersCount}</div>
                        <div className="bc-stat-lbl">Officers</div>
                      </div>
                    </div>

                    <div className="bc-actions" onClick={(event) => event.stopPropagation()}>
                      <button type="button" className="bc-btn bc-btn-view" onClick={() => viewBarangay(barangay)}>View</button>
                      {isNoAdmin ? (
                        <button type="button" className="bc-btn bc-btn-assign" onClick={() => selectBarangayForForm(barangay)}>Assign Admin</button>
                      ) : isInactive ? (
                        <button type="button" className="bc-btn bc-btn-assign" onClick={() => reinstateAdmin(barangay)} disabled={actionLoadingId && actionLoadingId === (barangay.suspendedAdmin?.id || barangay.approvedAdmin?.id)}>
                          Reinstate
                        </button>
                      ) : (
                        <button type="button" className="bc-btn bc-btn-danger" onClick={() => suspendAdmin(barangay)} disabled={actionLoadingId && actionLoadingId === barangay.approvedAdmin?.id}>
                          Suspend
                        </button>
                      )}
                      <button type="button" className="bc-btn bc-btn-edit" onClick={() => editBarangay(barangay)}>Edit</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pagination">
            <div className="page-info">
              Showing <strong>{Math.min(filteredBarangays.length, (currentPage - 1) * PAGE_SIZE + currentBarangays.length)}</strong> of <strong>{pageSummary}</strong> barangays
            </div>
            <div className="page-btns">
              <button type="button" className="page-btn" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              {pageItems.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`page-btn ${pageNumber === currentPage ? 'current' : ''}`}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button type="button" className="page-btn" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount}>
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}