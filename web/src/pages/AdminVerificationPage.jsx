import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  Eye,
  Flag,
  Gauge,
  LogOut,
  Search,
  ShieldCheck,
  ShieldX,
  User,
  Users,
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import './BarangayAdminVerificationPage.css';

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

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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

const formatName = (user) => {
  if (!user) {
    return 'Unknown Resident';
  }

  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.fullName || user.username || 'Unknown Resident';
};

const formatAddress = (user, fallbackBarangay = '') => {
  if (!user) {
    return 'N/A';
  }

  const line1 = [user.street, user.barangay].filter(Boolean).join(', ').trim();
  const line2 = [user.city, user.province].filter(Boolean).join(', ').trim();
  const line3 = user.region || fallbackBarangay;

  return [line1, line2, line3].filter(Boolean).join(' · ') || 'N/A';
};

const formatRoleLabel = (role) => {
  if (role === 'OFFICER') return 'Officer';
  if (role === 'BARANGAY_ADMIN') return 'Barangay Admin';
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  return 'Resident';
};

const formatAccountTypeLabel = (type) => {
  if (type === 'officer') return 'Officer Registration';
  return 'Resident Registration';
};

const outcomeForStatus = (status) => {
  if (status === 'APPROVED') {
    return { label: 'Verified', className: 'sp-verified' };
  }

  if (status === 'REJECTED') {
    return { label: 'Rejected', className: 'sp-rejected' };
  }

  return { label: 'Flagged', className: 'sp-flagged' };
};

const priorityForCard = (entry, files, scopeBarangay) => {
  const hasAddressMatch = Boolean(scopeBarangay)
    ? String(entry.barangayCode || '').toLowerCase() === String(scopeBarangay.barangayCode || '').toLowerCase()
      || String(entry.barangay || '').toLowerCase() === String(scopeBarangay.barangay || '').toLowerCase()
    : true;

  const hasOfficerProof = files.some((file) => file.category === 'OFFICER_APPOINTMENT_PROOF');
  const hasAnyFile = files.length > 0;

  if (entry.accountType === 'officer') {
    if (!hasOfficerProof || !hasAddressMatch) {
      return { label: 'High Priority', className: 'pri-high' };
    }

    return { label: 'Medium', className: 'pri-med' };
  }

  if (hasAnyFile && hasAddressMatch) {
    return { label: 'Low', className: 'pri-low' };
  }

  if (!hasAddressMatch) {
    return { label: 'High Priority', className: 'pri-high' };
  }

  return { label: 'Medium', className: 'pri-med' };
};

const buildChecklist = (entry, files, scopeBarangay) => {
  const hasAddressMatch = Boolean(scopeBarangay)
    ? String(entry.barangayCode || '').toLowerCase() === String(scopeBarangay.barangayCode || '').toLowerCase()
      || String(entry.barangay || '').toLowerCase() === String(scopeBarangay.barangay || '').toLowerCase()
    : true;

  const hasIdentityDocument = files.some((file) => file.category !== 'OFFICER_APPOINTMENT_PROOF');
  const hasOfficerProof = files.some((file) => file.category === 'OFFICER_APPOINTMENT_PROOF');

  if (entry.accountType === 'officer') {
    return [
      { label: 'Valid government-issued ID uploaded', state: hasIdentityDocument ? 'checked' : 'pending' },
      { label: 'Name matches registration', state: formatName(entry) !== 'Unknown Resident' ? 'checked' : 'pending' },
      { label: hasAddressMatch ? 'Address matches barangay record' : 'Address not on barangay record', state: hasAddressMatch ? 'checked' : 'flagged' },
      { label: 'Officer credentials validated', state: hasOfficerProof ? 'checked' : 'pending' },
    ];
  }

  return [
    { label: 'Valid government-issued ID uploaded', state: hasIdentityDocument ? 'checked' : 'pending' },
    { label: 'Name matches registration', state: formatName(entry) !== 'Unknown Resident' ? 'checked' : 'pending' },
    { label: hasAddressMatch ? 'Address matches barangay record' : 'Address not on barangay record', state: hasAddressMatch ? 'checked' : 'flagged' },
    { label: 'Residency supporting doc reviewed', state: hasIdentityDocument ? 'checked' : 'pending' },
  ];
};

const buildPreviewIcon = (entry) => {
  if (entry.accountType === 'officer') {
    return '🪪';
  }

  return '📄';
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

export default function AdminVerificationPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  const [verificationCards, setVerificationCards] = useState([]);
  const [recentResolvedRows, setRecentResolvedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [flaggedIds, setFlaggedIds] = useState(() => new Set());

  const scopeBarangay = useMemo(() => ({
    barangay: user?.barangay || user?.scope?.barangay || 'Barangay Admin',
    barangayCode: user?.barangayCode || user?.scope?.barangayCode || '',
  }), [user]);

  const reviewerLabel = useMemo(() => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (fullName) {
      return `${initialsForName(fullName).slice(0, 1)}. ${user?.lastName || user?.username || 'Barangay Admin'}`;
    }

    return user?.username || 'Barangay Admin';
  }, [user]);

  const loadVerificationData = async () => {
    setLoading(true);
    setError('');

    try {
      const [pendingResidents, pendingOfficers, residents, officers] = await Promise.all([
        apiService.getPendingResidents(),
        apiService.getPendingOfficers(),
        apiService.getResidents(),
        apiService.getOfficers(),
      ]);

      const normalizedPending = [
        ...(Array.isArray(pendingResidents) ? pendingResidents : []).map((entry) => ({ ...entry, accountType: 'resident' })),
        ...(Array.isArray(pendingOfficers) ? pendingOfficers : []).map((entry) => ({ ...entry, accountType: 'officer' })),
      ];

      const filePairs = await Promise.all(normalizedPending.map(async (entry) => {
        try {
          const files = await apiService.getResidentFilesForReview(entry.id);
          return [entry.id, Array.isArray(files) ? files : []];
        } catch {
          return [entry.id, []];
        }
      }));

      const filesByUserId = new Map(filePairs);

      const cards = normalizedPending.map((entry) => {
        const files = filesByUserId.get(entry.id) || [];
        const priority = priorityForCard(entry, files, scopeBarangay);
        const checklist = buildChecklist(entry, files, scopeBarangay);
        const previewFile = files[0] || null;

        return {
          ...entry,
          files,
          priority,
          checklist,
          previewFile,
          isFlagged: flaggedIds.has(entry.id),
        };
      }).sort((left, right) => {
        const priorityWeight = { 'pri-high': 3, 'pri-med': 2, 'pri-low': 1 };
        const leftWeight = priorityWeight[left.priority.className] || 0;
        const rightWeight = priorityWeight[right.priority.className] || 0;

        if (leftWeight !== rightWeight) {
          return rightWeight - leftWeight;
        }

        return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      });

      const now = Date.now();
      const recentRows = [
        ...(Array.isArray(residents) ? residents : []).map((entry) => ({ ...entry, accountType: 'resident' })),
        ...(Array.isArray(officers) ? officers : []).map((entry) => ({ ...entry, accountType: 'officer' })),
      ]
        .filter((entry) => ['APPROVED', 'REJECTED', 'SUSPENDED'].includes(entry.status))
        .filter((entry) => {
          const updatedAt = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
          return updatedAt && (now - updatedAt) <= 7 * 24 * 60 * 60 * 1000;
        })
        .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))
        .slice(0, 6)
        .map((entry) => {
          const outcome = outcomeForStatus(entry.status);

          return {
            id: entry.id,
            name: formatName(entry),
            accountType: formatAccountTypeLabel(entry.accountType),
            submittedAt: formatDate(entry.createdAt),
            resolvedAt: formatDate(entry.updatedAt),
            outcomeLabel: outcome.label,
            outcomeClass: outcome.className,
            reviewedBy: reviewerLabel,
          };
        });

      setVerificationCards(cards);
      setRecentResolvedRows(recentRows);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load verification queue');
      setVerificationCards([]);
      setRecentResolvedRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationData();
  }, []);

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

  const openDocumentPreview = (card) => {
    const previewFile = card.previewFile;

    if (previewFile?.signedUrl) {
      window.open(previewFile.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    showModal({
      context: 'info',
      title: 'Document Preview',
      message: 'No signed preview link is available for this record.',
      detail: (card.files || []).map((file) => `${file.originalFileName || 'Unnamed file'} · ${file.category || 'N/A'}`).join('\n') || 'No uploaded files were found.',
      confirmText: 'Close',
      showCancel: false,
    });
  };

  const toggleFlag = (card) => {
    const isCurrentlyFlagged = flaggedIds.has(card.id);

    showModal({
      context: 'confirmation',
      title: isCurrentlyFlagged ? 'Remove flag?' : 'Flag this account?',
      message: isCurrentlyFlagged
        ? `${formatName(card)} will be removed from the local follow-up list.`
        : `${formatName(card)} will be marked for follow-up review in this session.`,
      confirmText: isCurrentlyFlagged ? 'Remove Flag' : 'Flag',
      cancelText: 'Cancel',
      onConfirm: () => {
        const nextFlaggedIds = new Set(flaggedIds);

        if (isCurrentlyFlagged) {
          nextFlaggedIds.delete(card.id);
        } else {
          nextFlaggedIds.add(card.id);
        }

        setFlaggedIds(nextFlaggedIds);
        setVerificationCards((currentCards) => currentCards.map((entry) => (
          entry.id === card.id
            ? {
              ...entry,
              isFlagged: !isCurrentlyFlagged,
              priority: !isCurrentlyFlagged
                ? { label: 'Flagged', className: 'pri-high' }
                : entry.priority,
            }
            : entry
        )));

        showModal({
          context: 'success',
          title: isCurrentlyFlagged ? 'Flag Removed' : 'Flag Added',
          message: isCurrentlyFlagged ? 'The local flag marker was removed.' : 'The local flag marker was added.',
          confirmText: 'OK',
          showCancel: false,
        });
      },
    });
  };

  const handleDecision = (card, decision) => {
    const isOfficer = card.accountType === 'officer';
    const actionLabel = decision === 'APPROVED' ? 'Verify' : 'Reject';
    const nextLabel = decision === 'APPROVED' ? 'verified' : 'rejected';

    showModal({
      context: 'confirmation',
      title: `${actionLabel} account?`,
      message: `${formatName(card)} will be marked as ${nextLabel}.`,
      detail: `${formatAccountTypeLabel(card.accountType)}\nSubmitted: ${formatDate(card.createdAt)}\nAddress: ${formatAddress(card, scopeBarangay.barangay)}`,
      confirmText: actionLabel,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoadingId(`${card.id}:${decision}`);

          if (isOfficer) {
            if (decision === 'APPROVED') {
              await apiService.approveOfficer(card.id);
            } else {
              await apiService.rejectOfficer(card.id);
            }
          } else if (decision === 'APPROVED') {
            await apiService.approveResident(card.id);
          } else {
            await apiService.rejectResident(card.id);
          }

          await loadVerificationData();
          showModal({
            context: 'success',
            title: 'Decision Saved',
            message: `${formatName(card)} was ${nextLabel} successfully.`,
            confirmText: 'OK',
            showCancel: false,
          });
        } catch (requestError) {
          showModal({
            context: 'error',
            title: 'Unable to Update Account',
            message: requestError.message || 'The verification decision could not be completed.',
            confirmText: 'Close',
            showCancel: false,
          });
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

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
        { label: 'Verification Queue', icon: Search, active: true, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
        { label: 'Officer Monitoring', icon: ShieldCheck, action: () => navigate('/dashboard/barangay-admin/officer-monitoring') },
      ],
    },
    {
      label: 'Logs and Reports',
      items: [
        { label: 'Audit Log', icon: ShieldX, action: () => navigate('/dashboard/barangay-admin/audit-log') },
        {
          label: 'Profile',
          icon: User,
          action: () => {
            if (user?.role === 'BARANGAY_ADMIN') {
              navigate('/dashboard/barangay-admin/profile');
              return;
            }

            showModal({
              context: 'info',
              title: 'Profile Panel',
              message: 'The Barangay Admin profile panel is only available for barangay admin accounts.',
              confirmText: 'OK',
              showCancel: false,
            });
          },
        },
      ],
    },
  ];

  return (
    <div className="barangay-admin-verification">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">Pirma<span>PH</span></div>
          <div className="brand-sub">Barangay Digital Services</div>
          <div className="role-badge">🏛️ Barangay Admin</div>
          <div className="scope-note"><span className="scope-dot"></span> {scopeBarangay.barangay}</div>
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
            <div className="header-title">Verification Queue</div>
            <div className="header-crumb">
              {scopeBarangay.barangay} · <span>Identity &amp; Document Verification</span>
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
          {error ? (
            <div className="dashboard-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button type="button" onClick={loadVerificationData}>Retry</button>
            </div>
          ) : null}

          <div className="section-label">🔎 Pending Verification ({verificationCards.length})</div>
          <div className="verif-grid">
            {loading ? (
              <div className="table-empty">Loading verification queue...</div>
            ) : verificationCards.length ? (
              verificationCards.map((card) => {
                const flagged = flaggedIds.has(card.id) || card.isFlagged;
                const previewFile = card.previewFile;

                return (
                  <div key={card.id} className="verif-card">
                    <div className="vc-top">
                      <div className={`vc-priority ${flagged ? 'pri-high' : card.priority.className}`}>{flagged ? 'Flagged' : card.priority.label}</div>
                      <div className="vc-name">{formatName(card)}</div>
                      <div className="vc-type">{formatAccountTypeLabel(card.accountType)} · Applied {formatDate(card.createdAt)}</div>
                    </div>
                    <div className="vc-body">
                      <div className="vc-field">
                        <div className="vc-key">Submitted ID</div>
                        <div className="vc-val">{previewFile?.originalFileName || `${card.accountType === 'officer' ? 'Officer' : 'Resident'} verification file`}</div>
                      </div>
                      <div className="vc-field">
                        <div className="vc-key">Claimed Address</div>
                        <div className="vc-val">{formatAddress(card, scopeBarangay.barangay)}</div>
                      </div>
                      <div className="doc-preview">
                        <span className="dp-icon">{buildPreviewIcon(card)}</span>
                        <div>
                          <div className="dp-name">{previewFile?.originalFileName || 'No uploaded file'}</div>
                          <div className="dp-sub">Uploaded {formatDate(previewFile?.uploadedAt || card.createdAt)}</div>
                        </div>
                        <button type="button" className="dp-view" style={{ marginLeft: 'auto' }} onClick={() => openDocumentPreview(card)}>
                          View ↗
                        </button>
                      </div>
                      <div className="vc-checklist">
                        {card.checklist.map((item) => (
                          <div key={item.label} className="check-item">
                            <div className={`ci-box ${item.state === 'checked' ? 'checked' : item.state === 'flagged' ? 'flagged' : ''}`}>
                              {item.state === 'checked' ? '✓' : item.state === 'flagged' ? '!' : '·'}
                            </div>
                            <span className="ci-label">{item.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="vc-actions">
                        <button type="button" className={`vbtn vbtn-flag ${flagged ? 'is-flagged' : ''}`} onClick={() => toggleFlag(card)}>
                          <Flag size={12} /> {flagged ? 'Flagged' : 'Flag'}
                        </button>
                        <button
                          type="button"
                          className="vbtn vbtn-reject"
                          disabled={actionLoadingId === `${card.id}:REJECTED`}
                          onClick={() => handleDecision(card, 'REJECTED')}
                        >
                          ✗ Reject
                        </button>
                        <button
                          type="button"
                          className="vbtn vbtn-approve"
                          disabled={actionLoadingId === `${card.id}:APPROVED`}
                          onClick={() => handleDecision(card, 'APPROVED')}
                        >
                          ✓ Verify
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="table-empty">No pending verifications found.</div>
            )}
          </div>

          <div className="section-label">✅ Recently Resolved (Last 7 Days)</div>
          <div className="table-card">
            <div className="table-head">
              <div className="th">Name</div>
              <div className="th">Registration Type</div>
              <div className="th">Submitted</div>
              <div className="th">Resolved</div>
              <div className="th">Outcome</div>
              <div className="th">Reviewed By</div>
            </div>
            {recentResolvedRows.length ? recentResolvedRows.map((row) => (
              <div className="table-row" key={row.id}>
                <div className="table-name-cell">
                  <div className="table-name">{row.name}</div>
                  <div className="table-subtle">{row.accountType}</div>
                </div>
                <div className="table-subtle">{row.accountType}</div>
                <div className="table-subtle">{row.submittedAt}</div>
                <div className="table-subtle">{row.resolvedAt}</div>
                <div><span className={`status-pill ${row.outcomeClass}`}><span className="sp-dot"></span>{row.outcomeLabel}</span></div>
                <div className="table-subtle">{row.reviewedBy}</div>
              </div>
            )) : (
              <div className="table-empty">No resolved verification actions in the last 7 days.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}