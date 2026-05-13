import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ClipboardList,
  Eye,
  Gauge,
  LogOut,
  Search,
  ShieldCheck,
  ShieldX,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import apiService from '../../../shared/services/api';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import './BarangayAdminOfficerMonitoringPage.css';

const DOCUMENT_LABELS = {
  BARANGAY_CLEARANCE: 'Barangay Clearance',
  CERTIFICATE_OF_RESIDENCY: 'Cert. of Residency',
  CERTIFICATE_OF_INDIGENCY: 'Cert. of Indigency',
  BUSINESS_CLEARANCE: 'Business Clearance',
  CERTIFICATE_OF_GOOD_MORAL: 'Cert. of Good Moral',
  BARANGAY_ID: 'Barangay ID',
};

const formatTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatRelativeTime = (value) => {
  if (!value) {
    return 'just now';
  }

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.round(hours / 24);
  return `${days}d`;
};

const formatRoleLabel = (role) => {
  if (role === 'OFFICER') return 'Officer';
  if (role === 'BARANGAY_ADMIN') return 'Barangay Admin';
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  return 'Resident';
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

const formatName = (entry) => {
  if (!entry) {
    return 'Unknown Officer';
  }

  const fullName = [entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(' ').trim();
  return fullName || entry.fullName || entry.username || 'Unknown Officer';
};

const formatDocumentLabel = (documentType) => DOCUMENT_LABELS[documentType] || documentType?.replace(/_/g, ' ') || 'Unknown Document';

const formatRequestNumber = (requestId) => {
  if (!requestId) {
    return 'REQ-000';
  }

  const compact = String(requestId).replace(/-/g, '').toUpperCase();
  return `REQ-${compact.slice(-3)}`;
};

const formatOfficerStatus = (status) => {
  if (!status) {
    return 'Unknown';
  }

  return status.replace(/_/g, ' ').toLowerCase();
};

const formatRequestAction = (status) => {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'DECLINED') return 'Rejected';
  if (status === 'READY_FOR_RELEASE') return 'For Release';
  if (status === 'PENDING_PAYMENT') return 'Pending Payment';
  if (status === 'UNDER_REVIEW') return 'Under Review';
  return 'Submitted';
};

const actionClassForStatus = (status) => {
  if (status === 'APPROVED') return 'at-approve';
  if (status === 'DECLINED') return 'at-reject';
  return 'at-release';
};

const recentActionTone = (request) => {
  if (request.status === 'APPROVED') return 'green';
  if (request.status === 'DECLINED') return 'red';
  return 'blue';
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

export default function BarangayAdminOfficerMonitoringPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [dashboard, setDashboard] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [dashboardData, officerData, residentData] = await Promise.all([
        apiService.getBarangayAdminDashboard(),
        apiService.getOfficers(),
        apiService.getResidents(),
      ]);

      setDashboard(dashboardData || null);
      setOfficers(Array.isArray(officerData) ? officerData : []);
      setResidents(Array.isArray(residentData) ? residentData : []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load officer monitoring data');
      setDashboard(null);
      setOfficers([]);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const scope = dashboard?.scope || {};
  const requests = dashboard?.requests || [];
  const officerMaps = useMemo(() => {
    const residentMap = new Map(residents.map((entry) => [entry.id, entry]));
    const requestMap = new Map();

    requests.forEach((request) => {
      const officerId = request.assignedOfficerUserId;
      if (!officerId) {
        return;
      }

      if (!requestMap.has(officerId)) {
        requestMap.set(officerId, []);
      }

      requestMap.get(officerId).push(request);
    });

    requestMap.forEach((list) => {
      list.sort((left, right) => new Date(right.updatedAt || right.requestTimestamp || 0) - new Date(left.updatedAt || left.requestTimestamp || 0));
    });

    return { residentMap, requestMap };
  }, [requests, residents]);

  const officerCards = useMemo(() => {
    const now = Date.now();

    return officers
      .map((officer) => {
        const assignedRequests = officerMaps.requestMap.get(officer.id) || [];
        const processedRequests = assignedRequests.filter((request) => ['APPROVED', 'DECLINED', 'READY_FOR_RELEASE'].includes(request.status));
        const pendingRequests = assignedRequests.filter((request) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'].includes(request.status));
        const rejectedRequests = assignedRequests.filter((request) => request.status === 'DECLINED');
        const recentRequests = assignedRequests.slice(0, 3);
        const lastActionAt = recentRequests[0]?.updatedAt || recentRequests[0]?.requestTimestamp || officer.updatedAt || officer.createdAt;
        const latestActivityMs = lastActionAt ? now - new Date(lastActionAt).getTime() : Number.POSITIVE_INFINITY;
        const online = latestActivityMs <= 2 * 60 * 60 * 1000;
        const issueFlagged = processedRequests.length >= 25 || (processedRequests.length >= 20 && pendingRequests.length === 0) || rejectedRequests.length >= 3;

        return {
          ...officer,
          assignedRequests,
          processedCount: processedRequests.length,
          pendingCount: pendingRequests.length,
          rejectedCount: rejectedRequests.length,
          recentRequests,
          lastActionAt,
          online,
          issueFlagged,
        };
      })
      .sort((left, right) => {
        if (left.issueFlagged !== right.issueFlagged) {
          return left.issueFlagged ? -1 : 1;
        }

        if (left.online !== right.online) {
          return left.online ? -1 : 1;
        }

        return new Date(right.lastActionAt || 0) - new Date(left.lastActionAt || 0);
      });
  }, [officers, officerMaps.requestMap]);

  const actionRows = useMemo(() => {
    return [...requests]
      .sort((left, right) => new Date(right.updatedAt || right.requestTimestamp || 0) - new Date(left.updatedAt || left.requestTimestamp || 0))
      .map((request) => {
        const officer = officerMaps.residentMap.get(request.assignedOfficerUserId) || officers.find((entry) => entry.id === request.assignedOfficerUserId) || null;
        const resident = officerMaps.residentMap.get(request.residentUserId) || null;

        return {
          id: request.id,
          officerName: officer ? formatName(officer) : 'Unassigned',
          requestNumber: formatRequestNumber(request.id),
          documentType: formatDocumentLabel(request.documentType),
          actionLabel: formatRequestAction(request.status),
          actionClass: actionClassForStatus(request.status),
          residentName: resident ? formatName(resident) : 'Unknown Resident',
          time: formatTime(request.updatedAt || request.requestTimestamp),
          timestamp: request.updatedAt || request.requestTimestamp,
        };
      })
      .slice(0, 6)
      .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0));
  }, [officers, officerMaps.residentMap, requests]);

  const stats = useMemo(() => {
    const activeOfficers = officerCards.filter((officer) => officer.status !== 'SUSPENDED').length;
    const flaggedOfficers = officerCards.filter((officer) => officer.issueFlagged).length;
    const onlineOfficers = officerCards.filter((officer) => officer.online).length;
    const totalProcessed = officerCards.reduce((sum, officer) => sum + officer.processedCount, 0);

    return {
      activeOfficers,
      flaggedOfficers,
      onlineOfficers,
      totalProcessed,
    };
  }, [officerCards]);

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

  const openUsers = () => {
    navigate('/dashboard/barangay-admin/users');
  };

  const openRequests = () => {
    navigate('/dashboard/barangay-admin/requests');
  };

  const openVerification = () => {
    navigate('/dashboard/barangay-admin/verification');
  };

  const openProfilePage = () => {
    navigate('/dashboard/barangay-admin/profile');
  };

  const viewOfficerLog = (officer) => {
    const recentLines = officer.recentRequests.map((request) => `${formatRequestNumber(request.id)} · ${formatDocumentLabel(request.documentType)} · ${formatRequestAction(request.status)} · ${formatRelativeTime(request.updatedAt || request.requestTimestamp)} ago`);

    showModal({
      context: 'info',
      title: `${formatName(officer)} Log`,
      message: `${officer.processedCount} processed, ${officer.pendingCount} pending, ${officer.rejectedCount} rejected.`,
      detail: recentLines.length ? recentLines.join('\n') : 'No recent request activity was found for this officer.',
      confirmText: 'Close',
      showCancel: false,
    });
  };

  const interveneOfficer = (officer) => {
    showModal({
      context: 'confirmation',
      title: officer.issueFlagged ? 'Escalate Officer?' : 'Open User Management?',
      message: officer.issueFlagged
        ? `${formatName(officer)} has been marked for review based on activity volume.`
        : `${formatName(officer)} will be opened in User Management for follow-up.`,
      detail: [
        `Role: ${formatRoleLabel(officer.role)}`,
        `Status: ${formatOfficerStatus(officer.status)}`,
        `Processed: ${officer.processedCount}`,
        `Pending: ${officer.pendingCount}`,
      ].join('\n'),
      confirmText: officer.issueFlagged ? 'Escalate' : 'Open User Management',
      cancelText: 'Cancel',
      onConfirm: () => {
        navigate('/dashboard/barangay-admin/users');
      },
    });
  };

  const revokeOfficerRole = (officer) => {
    showModal({
      context: 'confirmation',
      title: 'Revoke Officer Role?',
      message: `${formatName(officer)} will be demoted to resident level.`,
      detail: `Current role: ${formatRoleLabel(officer.role)}\nStatus: ${formatOfficerStatus(officer.status)}`,
      confirmText: 'Revoke Role',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoadingId(`${officer.id}:revoke`);
          await apiService.updateUserRole(officer.id, 'RESIDENT');
          await loadData();
          showModal({
            context: 'success',
            title: 'Role Revoked',
            message: `${formatName(officer)} is now a resident account.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (requestError) {
          showModal({
            context: 'error',
            title: 'Unable to Revoke Role',
            message: requestError.message || 'The officer role could not be revoked.',
            confirmText: 'Close',
            showCancel: false,
          });
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const toggleSuspension = (officer) => {
    const isSuspended = officer.status === 'SUSPENDED';

    showModal({
      context: 'confirmation',
      title: isSuspended ? 'Reinstate Officer?' : 'Suspend Officer?',
      message: isSuspended
        ? `${formatName(officer)} will be reinstated.`
        : `${formatName(officer)} will be suspended from officer duties.`,
      detail: [
        `Role: ${formatRoleLabel(officer.role)}`,
        `Status: ${formatOfficerStatus(officer.status)}`,
        `Barangay: ${officer.barangay || scope.barangay || 'N/A'}`,
      ].join('\n'),
      confirmText: isSuspended ? 'Reinstate' : 'Suspend',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoadingId(`${officer.id}:${isSuspended ? 'reinstate' : 'suspend'}`);
          if (isSuspended) {
            await apiService.reinstateUser(officer.id);
          } else {
            await apiService.suspendUser(officer.id);
          }
          await loadData();
          showModal({
            context: 'success',
            title: isSuspended ? 'Officer Reinstated' : 'Officer Suspended',
            message: `${formatName(officer)} status was updated successfully.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (requestError) {
          showModal({
            context: 'error',
            title: 'Unable to Update Officer',
            message: requestError.message || 'The officer status could not be changed.',
            confirmText: 'Close',
            showCancel: false,
          });
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const dashboardSections = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: Gauge, action: openDashboard },
        { label: 'User Management', icon: Users, action: openUsers },
        { label: 'Document Requests', icon: ClipboardList, action: openRequests },
      ],
    },
    {
      label: 'Verification',
      items: [
        { label: 'Verification Queue', icon: Search, action: openVerification },
        { label: 'Officer Monitoring', icon: ShieldCheck, active: true, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
      ],
    },
    {
      label: 'Logs and Reports',
      items: [
        { label: 'Audit Log', icon: ShieldX, action: () => navigate('/dashboard/barangay-admin/audit-log') },
        { label: 'Profile', icon: User, action: openProfilePage },
      ],
    },
  ];

  return (
    <div className="barangay-admin-officer-monitoring">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="role-badge">🏛️ Barangay Admin</div>
          <div className="scope-note"><span className="scope-dot"></span> {scope.barangay || user?.barangay || 'Barangay Admin'}</div>
        </div>
        <span className="nav-section">Overview</span>
        {dashboardSections.map((section) => (
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
            <div className="user-av">{initialsForName(`${user?.firstName || ''} ${user?.lastName || ''}`)}</div>
            <div className="user-info">
              <h4>{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Barangay Admin'}</h4>
              <p>{formatRoleLabel(user?.role)}</p>
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
            <div className="header-title">Officer Monitoring</div>
            <div className="header-crumb">
              {scope.barangay || 'Barangay Scope'} · <span>Performance &amp; Activity</span>
            </div>
          </div>
          <div className="header-right">
            <div className="hdr-flag" aria-hidden="true">
              <div className="hf-b"></div>
              <div className="hf-r"></div>
            </div>
            {/* Notifications removed for Barangay Admin role */}
          </div>
        </header>

        <div className="content">
          {error ? (
            <div className="dashboard-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button type="button" onClick={loadData}>Retry</button>
            </div>
          ) : null}

          <div className="section-label">👮 Active Officers ({officerCards.filter((officer) => officer.status !== 'SUSPENDED').length})</div>
          <div className="officers-grid">
            {loading ? (
              <div className="table-empty">Loading officer monitoring data...</div>
            ) : officerCards.length ? (
              officerCards.slice(0, 6).map((officer) => {
                const recentActions = officer.recentRequests;
                        const onlineLabel = officer.issueFlagged ? 'Issue Flagged' : officer.online ? 'Online' : 'Offline';
                        const onlineClass = officer.issueFlagged ? 'ob-flagged' : officer.online ? 'ob-online' : 'ob-offline';
                        const latestActionText = recentActions[0]
                          ? `${formatRequestNumber(recentActions[0].id)} (${formatDocumentLabel(recentActions[0].documentType)})`
                          : 'No recent request activity';

                const actionButtonLabel = officer.status === 'SUSPENDED'
                  ? 'Reinstate'
                  : officer.issueFlagged
                    ? 'Suspend'
                    : officer.online
                      ? 'Revoke Role'
                      : 'Suspend';

                return (
                  <div key={officer.id} className={`oc ${officer.issueFlagged ? 'oc-flagged' : ''}`}>
                    <div className={`oc-header ${officer.issueFlagged ? 'oc-header-flagged' : ''}`}>
                      <div className="oc-av">{initialsForName(formatName(officer))}</div>
                      <div>
                        <div className="oc-name">{formatName(officer)}</div>
                        <div className="oc-pos">{officer.position || (officer.role === 'BARANGAY_ADMIN' ? 'Officer Monitoring Lead' : 'Officer Duty')}</div>
                      </div>
                      <div className={`online-badge ${onlineClass}`}>
                        <span className={`ob-dot ${onlineClass}`}></span>
                        {onlineLabel}
                      </div>
                    </div>
                    <div className="oc-body">
                      {officer.issueFlagged ? (
                        <div className="flag-warning">
                          ⚠️ <strong>Unusual activity detected:</strong> High request volume or repeated escalations were observed for this officer.
                        </div>
                      ) : null}
                      <div className="oc-stats">
                        <div className="ocs">
                          <div className="ocs-val">{officer.processedCount}</div>
                          <div className="ocs-lbl">Processed</div>
                        </div>
                        <div className="ocs">
                          <div className="ocs-val">{officer.pendingCount}</div>
                          <div className="ocs-lbl">Pending</div>
                        </div>
                        <div className="ocs">
                          <div className="ocs-val">{officer.rejectedCount}</div>
                          <div className="ocs-lbl">Rejected</div>
                        </div>
                      </div>
                      <div className="activity-mini">
                        <div className="am-label">Recent Actions</div>
                        {recentActions.length ? recentActions.map((request, index) => (
                          <div key={request.id} className="am-item">
                            <span className="am-dot" style={{ background: index === 0 ? 'var(--green)' : index === 1 ? 'var(--red)' : 'var(--blue)' }}></span>
                            <span>{formatRequestNumber(request.id)} {formatRequestAction(request.status)} ({formatDocumentLabel(request.documentType)})</span>
                            <span className="am-time">{formatRelativeTime(request.updatedAt || request.requestTimestamp)}</span>
                          </div>
                        )) : (
                          <div className="am-item">
                            <span className="am-dot" style={{ background: 'var(--blue)' }}></span>
                            <span>{latestActionText}</span>
                            <span className="am-time">N/A</span>
                          </div>
                        )}
                      </div>
                      <div className="oc-actions">
                        <button type="button" className="ocbtn ocb-view" onClick={() => viewOfficerLog(officer)}>
                          <Eye size={12} /> View Log
                        </button>
                        <button type="button" className="ocbtn ocb-intervene" onClick={() => interveneOfficer(officer)}>
                          <UserCog size={12} /> {officer.issueFlagged ? 'Escalate' : 'Intervene'}
                        </button>
                        <button
                          type="button"
                          className="ocbtn ocb-revoke"
                          disabled={actionLoadingId === `${officer.id}:revoke` || actionLoadingId === `${officer.id}:suspend` || actionLoadingId === `${officer.id}:reinstate`}
                          onClick={() => {
                            if (actionButtonLabel === 'Revoke Role') {
                              revokeOfficerRole(officer);
                            } else {
                              toggleSuspension(officer);
                            }
                          }}
                        >
                          {actionButtonLabel === 'Revoke Role' ? 'Revoke Role' : officer.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="table-empty">No active officers were found in this barangay scope.</div>
            )}
          </div>

          <div className="section-label">📋 Officer Action Log (Today)</div>
          <div className="table-card">
            <div className="table-head">
              <div className="th">Officer</div>
              <div className="th">Request ID</div>
              <div className="th">Document Type</div>
              <div className="th">Action</div>
              <div className="th">Resident</div>
              <div className="th">Time</div>
            </div>
            {actionRows.length ? actionRows.map((row) => (
              <div className="table-row" key={row.id}>
                <div className="table-name-cell">
                  <div className="table-name">{row.officerName}</div>
                  <div className="table-subtle">Today</div>
                </div>
                <div className="table-subtle request-id-cell">{row.requestNumber}</div>
                <div className="table-subtle">{row.documentType}</div>
                <div><span className={`action-type ${row.actionClass}`}>{row.actionLabel}</span></div>
                <div className="table-subtle">{row.residentName}</div>
                <div className="table-subtle">{row.time}</div>
              </div>
            )) : (
              <div className="table-empty">No officer action logs are available right now.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
