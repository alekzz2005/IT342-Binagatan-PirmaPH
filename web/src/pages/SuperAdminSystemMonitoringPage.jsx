import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Building2,
  ClipboardList,
  Clock3,
  Globe2,
  LayoutDashboard,
  LogOut,
  RadioTower,
  RefreshCcw,
  Settings,
  ShieldAlert,
  TriangleAlert,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import './SuperAdminSystemMonitoringPage.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'N/A';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);

  if (days > 0) {
    return `${days}.${Math.floor(hours / 2.4)}d`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${Math.max(1, minutes)}m`;
};

const formatPercent = (value, fractionDigits = 1) => {
  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  return `${(value * 100).toFixed(fractionDigits)}%`;
};

const safeLabel = (value, fallback = 'Unassigned') => {
  if (!value || !String(value).trim()) {
    return fallback;
  }

  return String(value).trim();
};

const initialsForName = (value) => {
  if (!value) {
    return 'SA';
  }

  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SA';
};

const formatName = (entry) => {
  const parts = [entry?.firstName, entry?.middleName, entry?.lastName]
    .filter(Boolean)
    .map((piece) => String(piece).trim())
    .filter(Boolean);

  return parts.length ? parts.join(' ') : entry?.username || 'System Administrator';
};

const getLastSevenDays = () => {
  const days = [];
  const today = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }

  return days;
};

const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const countByDay = (items, getter) => {
  const days = getLastSevenDays();
  const keys = days.map((day) => day.toISOString().slice(0, 10));
  const labels = days.map((day) => DAY_LABELS[day.getDay()]);
  const counts = keys.map(() => 0);

  items.forEach((item) => {
    const key = dateKey(getter(item));
    const index = keys.indexOf(key);
    if (index >= 0) {
      counts[index] += 1;
    }
  });

  return labels.map((label, index) => ({
    label,
    value: counts[index],
  }));
};

const metricValue = (metric, name) => {
  if (!metric || metric.name !== name || !Array.isArray(metric.measurements)) {
    return null;
  }

  return metric.measurements[0]?.value ?? null;
};

const metricCount = (metric) => {
  if (!metric || !Array.isArray(metric.measurements)) {
    return null;
  }

  const count = metric.measurements.find((entry) => entry.statistic === 'COUNT' || entry.statistic === 'count')?.value;
  return Number.isFinite(count) ? count : null;
};

const metricMax = (metric) => {
  if (!metric || !Array.isArray(metric.measurements)) {
    return null;
  }

  const max = metric.measurements.find((entry) => entry.statistic === 'MAX' || entry.statistic === 'max')?.value;
  return Number.isFinite(max) ? max : null;
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

function StatCard({ tone, value, label, status, icon }) {
  return (
    <div className={`health-card hc-${tone}`}>
      <div className="hc-label">{label}</div>
      <div className="hc-val">{value}</div>
      <div className={`hc-status hc-${tone}-text`}>{status}</div>
      <span className="hc-icon">{icon}</span>
    </div>
  );
}

function MetricRow({ label, value, tone = 'blue' }) {
  return (
    <div className="metric-row">
      <span className="metric-name">{label}</span>
      <span className={`metric-val ${tone}`}>{value}</span>
    </div>
  );
}

export default function SuperAdminSystemMonitoringPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [dashboard, setDashboard] = useState({ scope: {}, stats: {}, users: [], requests: [], activity: [] });
  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [responseMs, setResponseMs] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');

    const startedAt = performance.now();

    try {
      const [dashboardData, healthData, infoData, cpuMetric, uptimeMetric, threadsMetric, heapMetric, httpMetric] = await Promise.allSettled([
        apiService.getSuperAdminDashboard(),
        apiService.getActuatorHealth(),
        apiService.getActuatorInfo(),
        apiService.getActuatorMetric('system.cpu.usage'),
        apiService.getActuatorMetric('process.uptime'),
        apiService.getActuatorMetric('jvm.threads.live'),
        apiService.getActuatorMetric('jvm.memory.used'),
        apiService.getActuatorMetric('http.server.requests'),
      ]);

      if (dashboardData.status === 'fulfilled') {
        setDashboard({
          scope: dashboardData.value?.scope || {},
          stats: dashboardData.value?.stats || {},
          users: Array.isArray(dashboardData.value?.users) ? dashboardData.value.users : [],
          requests: Array.isArray(dashboardData.value?.requests) ? dashboardData.value.requests : [],
          activity: Array.isArray(dashboardData.value?.activity) ? dashboardData.value.activity : [],
        });
      } else {
        throw dashboardData.reason;
      }

      setHealth(healthData.status === 'fulfilled' ? healthData.value : null);
      setInfo(infoData.status === 'fulfilled' ? infoData.value : null);
      setMetrics({
        cpu: cpuMetric.status === 'fulfilled' ? cpuMetric.value : null,
        uptime: uptimeMetric.status === 'fulfilled' ? uptimeMetric.value : null,
        threads: threadsMetric.status === 'fulfilled' ? threadsMetric.value : null,
        heap: heapMetric.status === 'fulfilled' ? heapMetric.value : null,
        http: httpMetric.status === 'fulfilled' ? httpMetric.value : null,
      });
      setLastUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load monitoring data');
      setDashboard({ scope: {}, stats: {}, users: [], requests: [], activity: [] });
      setHealth(null);
      setInfo(null);
      setMetrics({});
      setLastUpdatedAt(new Date().toISOString());
    } finally {
      setResponseMs(Math.max(1, Math.round(performance.now() - startedAt)));
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const users = dashboard.users;
  const requests = dashboard.requests;
  const stats = dashboard.stats;

  const healthStatus = String(health?.status || 'UNKNOWN').toUpperCase();
  const dbStatus = String(health?.components?.db?.status || health?.components?.database?.status || healthStatus).toUpperCase();
  const diskStatus = String(health?.components?.diskSpace?.status || healthStatus).toUpperCase();

  const httpCount = metricCount(metrics.http);
  const httpMax = metricMax(metrics.http);
  const httpAvg = httpCount && Number.isFinite(metricValue(metrics.http, 'http.server.requests') || 0)
    ? metricValue(metrics.http, 'http.server.requests') / Math.max(1, httpCount)
    : null;

  const uptimeSeconds = metricValue(metrics.uptime, 'process.uptime');
  const uptimeDays = Number.isFinite(uptimeSeconds) ? uptimeSeconds / 86400 : null;
  const cpuUsage = metricValue(metrics.cpu, 'system.cpu.usage');
  const liveThreads = metricValue(metrics.threads, 'jvm.threads.live');
  const heapUsed = metricValue(metrics.heap, 'jvm.memory.used');

  const registrationSeries = useMemo(() => countByDay(users, (entry) => entry.createdAt || entry.updatedAt), [users]);
  const requestSeries = useMemo(() => countByDay(requests, (entry) => entry.requestTimestamp || entry.updatedAt || entry.createdAt), [requests]);

  const topBarangays = useMemo(() => {
    const groups = new Map();

    requests.forEach((request) => {
      const barangayCode = safeLabel(request.barangayCode, 'UNASSIGNED');
      if (!groups.has(barangayCode)) {
        groups.set(barangayCode, {
          barangayCode,
          barangay: safeLabel(request.barangay, barangayCode),
          city: safeLabel(request.city, ''),
          count: 0,
        });
      }

      const current = groups.get(barangayCode);
      current.count += 1;
      current.barangay = current.barangay || safeLabel(request.barangay, barangayCode);
      current.city = current.city || safeLabel(request.city, '');
    });

    return [...groups.values()]
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }, [requests]);

  const documentTypes = useMemo(() => {
    const groups = new Map();

    requests.forEach((request) => {
      const key = safeLabel(request.documentType, 'UNKNOWN');
      groups.set(key, (groups.get(key) || 0) + 1);
    });

    const total = requests.length || 1;
    return [...groups.entries()]
      .map(([documentType, count]) => ({
        documentType,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }, [requests]);

  const processingMetrics = useMemo(() => {
    const completed = requests.filter((request) => ['APPROVED', 'DECLINED', 'READY_FOR_RELEASE'].includes(request.status));
    const open = requests.filter((request) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'].includes(request.status));
    const completedDurations = completed
      .map((request) => {
        const start = new Date(request.requestTimestamp || request.createdAt || request.updatedAt || 0).getTime();
        const end = new Date(request.updatedAt || request.requestTimestamp || request.createdAt || 0).getTime();
        return start && end && end >= start ? end - start : null;
      })
      .filter((value) => Number.isFinite(value));

    const averageCompletionMs = completedDurations.length
      ? completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length
      : null;

    const onTime = completed.filter((request) => {
      const start = new Date(request.requestTimestamp || request.createdAt || request.updatedAt || 0).getTime();
      const end = new Date(request.updatedAt || request.requestTimestamp || request.createdAt || 0).getTime();
      return start && end && (end - start) <= (5 * 24 * 60 * 60 * 1000);
    }).length;

    const approvals = requests.filter((request) => request.status === 'APPROVED').length;
    const declines = requests.filter((request) => request.status === 'DECLINED').length;
    const totalReviewed = approvals + declines;

    return {
      averageCompletionMs,
      slaCompliance: completed.length ? (onTime / completed.length) * 100 : null,
      slaBreaches: Math.max(0, completed.length - onTime),
      pendingOverFiveDays: open.filter((request) => {
        const start = new Date(request.requestTimestamp || request.createdAt || request.updatedAt || 0).getTime();
        return start && (Date.now() - start) > (5 * 24 * 60 * 60 * 1000);
      }).length,
      rejectionRate: totalReviewed ? (declines / totalReviewed) * 100 : null,
      approvalRate: totalReviewed ? (approvals / totalReviewed) * 100 : null,
    };
  }, [requests]);

  const serviceRows = useMemo(() => {
    const approxHttpAvgMs = httpAvg ? Math.round(httpAvg * 1000) : null;

    return [
      {
        service: 'Super Admin API',
        status: healthStatus,
        uptime: uptimeDays != null ? `${uptimeDays.toFixed(1)} days` : 'N/A',
        response: responseMs != null ? `${responseMs}ms` : 'N/A',
        incident: healthStatus === 'UP' ? 'None' : 'Needs review',
        ok: healthStatus === 'UP',
      },
      {
        service: 'Database',
        status: dbStatus,
        uptime: uptimeDays != null ? `${uptimeDays.toFixed(1)} days` : 'N/A',
        response: approxHttpAvgMs != null ? `${approxHttpAvgMs}ms` : 'N/A',
        incident: dbStatus === 'UP' ? 'None' : 'Check DB health',
        ok: dbStatus === 'UP',
      },
      {
        service: 'Disk Space',
        status: diskStatus,
        uptime: uptimeDays != null ? `${uptimeDays.toFixed(1)} days` : 'N/A',
        response: heapUsed != null ? `${Math.round(heapUsed / (1024 * 1024))} MB` : 'N/A',
        incident: diskStatus === 'UP' ? 'None' : 'Disk pressure',
        ok: diskStatus === 'UP',
      },
      {
        service: 'HTTP Requests',
        status: httpCount != null ? 'UP' : 'UNKNOWN',
        uptime: httpCount != null ? formatNumber(httpCount) : 'N/A',
        response: httpAvg != null ? `${Math.round(httpAvg * 1000)}ms` : 'N/A',
        incident: httpMax != null ? `Peak ${Math.round(httpMax * 1000)}ms` : 'None',
        ok: httpCount != null,
      },
      {
        service: 'JVM Threads',
        status: liveThreads != null ? 'UP' : 'UNKNOWN',
        uptime: liveThreads != null ? `${formatNumber(liveThreads)} live` : 'N/A',
        response: cpuUsage != null ? formatPercent(cpuUsage, 2) : 'N/A',
        incident: liveThreads != null ? 'None' : 'Unavailable',
        ok: liveThreads != null,
      },
      {
        service: 'Heap Memory',
        status: heapUsed != null ? 'UP' : 'UNKNOWN',
        uptime: heapUsed != null ? `${Math.round(heapUsed / (1024 * 1024))} MB` : 'N/A',
        response: cpuUsage != null ? formatPercent(cpuUsage, 2) : 'N/A',
        incident: heapUsed != null ? 'None' : 'Unavailable',
        ok: heapUsed != null,
      },
      {
        service: 'Backend Sync',
        status: info ? 'UP' : 'UNKNOWN',
        uptime: info?.build?.time ? formatDate(info.build.time) : 'N/A',
        response: responseMs != null ? `${responseMs}ms` : 'N/A',
        incident: info?.app?.name || info?.build?.version || 'No info payload',
        ok: Boolean(info),
      },
    ];
  }, [dbStatus, diskStatus, healthStatus, heapUsed, httpAvg, httpCount, httpMax, info, responseMs, uptimeDays, liveThreads, cpuUsage]);

  const totalActiveBarangays = Number(stats.activeBarangays || topBarangays.length);
  const activeResidents = Number(stats.registeredResidents || users.filter((entry) => entry.role === 'RESIDENT').length);
  const totalRequests = Number(stats.totalRequests || requests.length);
  const overridePending = Number(stats.overridePending || requests.filter((request) => request.status === 'DECLINED').length);
  const activeConcurrentUsers = Number(stats.pendingVerifications || users.filter((entry) => entry.status === 'APPROVED').length);
  const serviceHealthText = healthStatus === 'UP' ? 'All core checks are healthy' : 'One or more health checks need attention';

  const openDashboard = () => navigate('/dashboard/super-admin');
  const openBarangayManagement = () => navigate('/dashboard/super-admin/barangays');
  const openGlobalUsers = () => navigate('/dashboard/super-admin/users');
  const openMonitoring = () => navigate('/dashboard/super-admin/monitoring');

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

  const openSystemSettings = () => {
    showModal({
      context: 'info',
      title: 'System settings',
      message: 'System-wide settings remain behind the management console for now.',
      confirmText: 'Close',
      showCancel: false,
    });
  };

  return (
    <div className="super-admin-system-monitoring">
      <SuperAdminSidebar activeItem="monitoring" onSystemSettings={openSystemSettings} />

      <div className="main">
        <header className="header">
          <div className="header-left">
            <div className="header-title">System Monitoring</div>
            <div className="header-breadcrumb"><span>Super Admin</span> → System Monitoring</div>
          </div>
          <div className="header-right">
            <div className="scope-pill"><Globe2 size={14} strokeWidth={2} /> Live · Updated {lastUpdatedAt ? formatRelativeTime(lastUpdatedAt) : 'just now'}</div>
            <button type="button" className="header-notif" onClick={loadData} aria-label="Refresh monitoring data">
              <Bell size={16} strokeWidth={2} />
              <span className="notif-dot"></span>
            </button>
          </div>
        </header>

        <div className="content">
          <div className="health-strip">
            <StatCard
              tone="ok"
              value={responseMs != null ? `${(responseMs / 1000).toFixed(1)}s` : 'N/A'}
              label="API Response Time"
              status={loading ? 'Refreshing live data...' : 'Within target'}
              icon="⚡"
            />
            <StatCard
              tone="ok"
              value={uptimeDays != null ? `${uptimeDays.toFixed(1)}d` : 'N/A'}
              label="System Uptime"
              status={healthStatus === 'UP' ? 'Operational' : 'Needs attention'}
              icon="📡"
            />
            <StatCard
              tone={dbStatus === 'UP' ? 'ok' : 'err'}
              value={dbStatus}
              label="Database Health"
              status={dbStatus === 'UP' ? 'Database accessible' : 'Database issue detected'}
              icon="🗄️"
            />
            <StatCard
              tone={healthStatus === 'UP' ? 'warn' : 'err'}
              value={formatNumber(activeConcurrentUsers)}
              label="Active Concurrent Users"
              status={healthStatus === 'UP' ? 'System load normal' : 'Review system status'}
              icon="👥"
            />
          </div>

          <div className="charts-row">
            <div className="chart-card">
              <div className="chart-header ch-blue">
                <span className="chart-title">📈 Registrations - Last 7 Days</span>
                <span className="chart-badge">+{formatNumber(registrationSeries.reduce((sum, item) => sum + item.value, 0))} total</span>
              </div>
              <div className="chart-body">
                <div className="bar-chart">
                  {registrationSeries.map((item) => (
                    <div className="bar-wrap" key={item.label}>
                      <div className="bar-val">{item.value}</div>
                      <div className="bar" style={{ height: `${Math.max(6, item.value * 2)}px`, background: item.value === Math.max(...registrationSeries.map((entry) => entry.value)) && item.value > 0 ? 'var(--blue)' : 'var(--blue-light)' }}></div>
                      <div className="bar-lbl">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header ch-gold">
                <span className="chart-title">📋 Document Requests - Last 7 Days</span>
                <span className="chart-badge">+{formatNumber(requestSeries[requestSeries.length - 1]?.value || 0)} today</span>
              </div>
              <div className="chart-body">
                <div className="bar-chart">
                  {requestSeries.map((item) => (
                    <div className="bar-wrap" key={item.label}>
                      <div className="bar-val">{item.value}</div>
                      <div className="bar" style={{ height: `${Math.max(6, item.value * 1.8)}px`, background: item.value === Math.max(...requestSeries.map((entry) => entry.value)) && item.value > 0 ? 'var(--gold)' : 'rgba(252,209,22,0.4)' }}></div>
                      <div className="bar-lbl">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="charts-row-3">
            <div className="chart-card">
              <div className="chart-header ch-blue">
                <span className="chart-title">🏛️ Top Barangays by Volume</span>
                <span className="chart-badge">Nationwide</span>
              </div>
              <div className="chart-body">
                {topBarangays.length === 0 ? (
                  <div className="empty-state">No request volume data yet.</div>
                ) : topBarangays.map((barangay, index) => (
                  <div className="prog-item" key={`${barangay.barangayCode}-${index}`}>
                    <div className="prog-header">
                      <span className="prog-name">{barangay.barangay}{barangay.city ? `, ${barangay.city}` : ''}</span>
                      <span className="prog-count">{barangay.count}</span>
                    </div>
                    <div className="prog-track">
                      <div
                        className="prog-fill"
                        style={{ width: `${Math.max(6, (barangay.count / Math.max(1, topBarangays[0].count)) * 100)}%`, background: index === 0 ? 'var(--blue)' : 'var(--blue-light)' }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header ch-green">
                <span className="chart-title">📄 Document Types Requested</span>
                <span className="chart-badge">{formatNumber(totalRequests)}</span>
              </div>
              <div className="chart-body">
                {documentTypes.length === 0 ? (
                  <div className="empty-state">No document request data yet.</div>
                ) : documentTypes.map((item) => (
                  <div className="prog-item" key={item.documentType}>
                    <div className="prog-header">
                      <span className="prog-name">{item.documentType.replace(/_/g, ' ')}</span>
                      <span className="prog-count">{formatNumber(item.count)} ({item.percent}%)</span>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${Math.max(4, item.percent)}%`, background: 'var(--green)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header ch-purple">
                <span className="chart-title">⏱ Processing Metrics</span>
                <span className="chart-badge">Live</span>
              </div>
              <div className="chart-body">
                <MetricRow label="Avg. Approval Time" value={processingMetrics.averageCompletionMs != null ? `${(processingMetrics.averageCompletionMs / 86400000).toFixed(1)} days` : 'N/A'} tone="green" />
                <MetricRow label="SLA Compliance Rate" value={processingMetrics.slaCompliance != null ? `${processingMetrics.slaCompliance.toFixed(1)}%` : 'N/A'} tone="green" />
                <MetricRow label="SLA Breaches (5d+)" value={processingMetrics.slaBreaches != null ? `${processingMetrics.slaBreaches} requests` : 'N/A'} tone="red" />
                <MetricRow label="Pending > 5 Days" value={processingMetrics.pendingOverFiveDays != null ? `${processingMetrics.pendingOverFiveDays} requests` : 'N/A'} tone="gold" />
                <MetricRow label="Rejection Rate" value={processingMetrics.rejectionRate != null ? `${processingMetrics.rejectionRate.toFixed(1)}%` : 'N/A'} tone="red" />
                <MetricRow label="Approval Rate" value={processingMetrics.approvalRate != null ? `${processingMetrics.approvalRate.toFixed(1)}%` : 'N/A'} tone="green" />
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header ch-blue">
              <span className="chart-title">🔧 Service Health Status</span>
              <button type="button" className="chart-action" onClick={loadData}>Refresh</button>
            </div>
            <div className="chart-body table-shell">
              <table className="status-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Uptime (30d)</th>
                    <th>Avg. Response</th>
                    <th>Last Incident</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRows.map((row) => (
                    <tr key={row.service}>
                      <td>{row.service}</td>
                      <td>
                        <span className={row.ok ? 'ok-badge' : 'warn-badge'}>{row.ok ? '● Online' : '⚠ Degraded'}</span>
                      </td>
                      <td>{row.uptime}</td>
                      <td>{row.response}</td>
                      <td>{row.incident}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error ? <div className="dashboard-error">{error}</div> : null}

          <div className="footer-summary">
            <div className="summary-item"><strong>{formatNumber(totalActiveBarangays)}</strong><span>Active Barangays</span></div>
            <div className="summary-item"><strong>{formatNumber(activeResidents)}</strong><span>Residents</span></div>
            <div className="summary-item"><strong>{formatNumber(totalRequests)}</strong><span>Total Requests</span></div>
            <div className="summary-item"><strong>{formatNumber(overridePending)}</strong><span>Override Pending</span></div>
            <div className="summary-item"><strong>{serviceHealthText}</strong><span>System Health</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
