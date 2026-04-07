import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

export default function AdminVerificationPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState('residents');
  const [pendingResidents, setPendingResidents] = useState([]);
  const [pendingOfficers, setPendingOfficers] = useState([]);
  const [managedOfficers, setManagedOfficers] = useState([]);
  const [monitoredRequests, setMonitoredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState('SUBMITTED');
  const [overrideStatus, setOverrideStatus] = useState('UNDER_REVIEW');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [verificationFiles, setVerificationFiles] = useState([]);
  const [adminCreateForm, setAdminCreateForm] = useState({
    username: '',
    email: '',
    temporaryPassword: '',
    firstName: '',
    lastName: '',
    barangayCode: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPendingResidents = async () => {
    try {
      const residents = await apiService.getPendingResidents();
      setPendingResidents(residents);
    } catch (e) {
      setError(e.message || 'Unable to load pending residents');
    }
  };

  const loadPendingOfficers = async () => {
    try {
      const officers = await apiService.getPendingOfficers();
      setPendingOfficers(officers);
    } catch (e) {
      setError(e.message || 'Unable to load pending officers');
    }
  };

  const loadManagedOfficers = async () => {
    try {
      const officers = await apiService.getOfficers();
      setManagedOfficers(officers);
    } catch (e) {
      setError(e.message || 'Unable to load officer management list');
    }
  };

  const loadMonitoredRequests = async (status = requestStatusFilter) => {
    try {
      const requests = await apiService.getAdminRequestQueue(status);
      setMonitoredRequests(requests);
      if (requests.length > 0) {
        setSelectedRequest(requests[0]);
      } else {
        setSelectedRequest(null);
      }
    } catch (e) {
      setError(e.message || 'Unable to load request monitoring queue');
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    await Promise.all([loadPendingResidents(), loadPendingOfficers(), loadManagedOfficers(), loadMonitoredRequests()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const selectedQueue = activeTab === 'officers' ? pendingOfficers : pendingResidents;

  useEffect(() => {
    if (!selectedQueue.length) {
      setSelectedAccount(null);
      return;
    }

    if (!selectedAccount) {
      setSelectedAccount(selectedQueue[0]);
      return;
    }

    const exists = selectedQueue.some((entry) => entry.id === selectedAccount.id);
    if (!exists) {
      setSelectedAccount(selectedQueue[0]);
    }
  }, [activeTab, pendingResidents, pendingOfficers]);

  const loadVerificationFiles = async (account) => {
    if (!account?.id) {
      setVerificationFiles([]);
      return;
    }

    try {
      const files = await apiService.getResidentFilesForReview(account.id);
      setVerificationFiles(files);
    } catch (e) {
      setError(e.message || 'Unable to load verification files');
    }
  };

  useEffect(() => {
    loadVerificationFiles(selectedAccount);
  }, [selectedAccount?.id]);

  useEffect(() => {
    if (activeTab === 'request-monitor') {
      loadMonitoredRequests(requestStatusFilter);
    }
  }, [activeTab, requestStatusFilter]);

  const decideAccount = async (accountId, action) => {
    try {
      if (activeTab === 'officers') {
        if (action === 'approve') {
          await apiService.approveOfficer(accountId);
          setSuccess('Officer approved successfully.');
        } else {
          await apiService.rejectOfficer(accountId);
          setSuccess('Officer rejected successfully.');
        }
      } else {
        if (action === 'approve') {
          await apiService.approveResident(accountId);
          setSuccess('Resident approved successfully.');
        } else {
          await apiService.rejectResident(accountId);
          setSuccess('Resident rejected successfully.');
        }
      }

      await refreshAll();
      setVerificationFiles([]);
    } catch (e) {
      setError(e.message || `Unable to ${action} account`);
    }
  };

  const updateOfficerRole = async (officerId, role) => {
    try {
      await apiService.updateUserRole(officerId, role);
      setSuccess(`Officer role updated to ${role}.`);
      await refreshAll();
    } catch (e) {
      setError(e.message || 'Unable to update officer role');
    }
  };

  const toggleSuspension = async (entry) => {
    try {
      if (entry.status === 'SUSPENDED') {
        await apiService.reinstateUser(entry.id);
        setSuccess('User reinstated successfully.');
      } else {
        await apiService.suspendUser(entry.id);
        setSuccess('User suspended successfully.');
      }
      await refreshAll();
    } catch (e) {
      setError(e.message || 'Unable to update suspension status');
    }
  };

  const createBarangayAdmin = async (event) => {
    event.preventDefault();
    try {
      await apiService.createBarangayAdmin(adminCreateForm);
      setSuccess('Initial barangay admin account created and notified.');
      setAdminCreateForm({
        username: '',
        email: '',
        temporaryPassword: '',
        firstName: '',
        lastName: '',
        barangayCode: '',
        barangay: '',
        city: '',
        province: '',
        region: '',
      });
    } catch (e) {
      setError(e.message || 'Unable to create barangay admin account');
    }
  };

  const applyRequestOverride = async () => {
    if (!selectedRequest?.id) {
      return;
    }

    try {
      await apiService.overrideAdminRequestStatus(selectedRequest.id, {
        status: overrideStatus,
        remarks: overrideRemarks,
      });
      setSuccess(`Request ${selectedRequest.id.slice(0, 8)} status overridden to ${overrideStatus}.`);
      setOverrideRemarks('');
      await loadMonitoredRequests(requestStatusFilter);
    } catch (e) {
      setError(e.message || 'Unable to override request status');
    }
  };

  const stats = useMemo(() => {
    const officersPendingCount = pendingOfficers.length;
    const residentsPendingCount = pendingResidents.length;
    const activeOfficersCount = managedOfficers.filter((officer) => officer.status !== 'SUSPENDED').length;
    const suspendedOfficersCount = managedOfficers.filter((officer) => officer.status === 'SUSPENDED').length;

    return {
      officersPendingCount,
      residentsPendingCount,
      activeOfficersCount,
      suspendedOfficersCount,
    };
  }, [pendingResidents, pendingOfficers, managedOfficers]);

  return (
    <div style={{ padding: '24px', fontFamily: 'Source Sans 3, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ color: '#0038A8', marginBottom: '6px' }}>Admin Verification and Officer Control Console</h1>
      <p style={{ color: '#475569', marginBottom: '16px' }}>
        Signed in as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.role})
      </p>

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', marginBottom: '16px' }}>
        <div style={{ background: '#fff', border: '1px solid #dbe4f6', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Pending Residents</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0038A8' }}>{stats.residentsPendingCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #dbe4f6', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Pending Officers</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#CE1126' }}>{stats.officersPendingCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #dbe4f6', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active Officers</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#15803d' }}>{stats.activeOfficersCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #dbe4f6', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Suspended Officers</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#991b1b' }}>{stats.suspendedOfficersCount}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <button
          onClick={() => setActiveTab('residents')}
          style={{
            background: activeTab === 'residents' ? '#0038A8' : '#fff',
            color: activeTab === 'residents' ? '#fff' : '#1e293b',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          Resident Queue
        </button>
        <button
          onClick={() => setActiveTab('officers')}
          style={{
            background: activeTab === 'officers' ? '#0038A8' : '#fff',
            color: activeTab === 'officers' ? '#fff' : '#1e293b',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          Officer Queue
        </button>
        <button
          onClick={() => setActiveTab('management')}
          style={{
            background: activeTab === 'management' ? '#0038A8' : '#fff',
            color: activeTab === 'management' ? '#fff' : '#1e293b',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          Officer Role and Suspension
        </button>
        <button
          onClick={() => setActiveTab('request-monitor')}
          style={{
            background: activeTab === 'request-monitor' ? '#0038A8' : '#fff',
            color: activeTab === 'request-monitor' ? '#fff' : '#1e293b',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          Request Monitor
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('super-admin')}
            style={{
              background: activeTab === 'super-admin' ? '#CE1126' : '#fff',
              color: activeTab === 'super-admin' ? '#fff' : '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            Super Admin Controls
          </button>
        )}
      </div>

      {error && <div style={{ marginBottom: '12px', color: '#b91c1c' }}>{error}</div>}
      {success && <div style={{ marginBottom: '12px', color: '#15803d' }}>{success}</div>}

      {activeTab === 'management' && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0 }}>Officer Role Assignment and Suspension</h3>
          {loading && <div>Loading...</div>}
          {!loading && managedOfficers.length === 0 && <div>No officers found.</div>}
          <div style={{ display: 'grid', gap: '8px' }}>
            {managedOfficers.map((officer) => (
              <div key={officer.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'grid', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{officer.firstName} {officer.lastName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{officer.email}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Status: {officer.status}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => updateOfficerRole(officer.id, 'OFFICER')}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer', padding: '7px 10px' }}
                  >
                    Set Officer
                  </button>
                  <button
                    onClick={() => updateOfficerRole(officer.id, 'BARANGAY_ADMIN')}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer', padding: '7px 10px' }}
                  >
                    Promote to Barangay Admin
                  </button>
                  <button
                    onClick={() => toggleSuspension(officer)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      background: officer.status === 'SUSPENDED' ? '#ecfccb' : '#fee2e2',
                      cursor: 'pointer',
                      padding: '7px 10px',
                    }}
                  >
                    {officer.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'super-admin' && isSuperAdmin && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0 }}>Create Initial Barangay Admin</h3>
          <form onSubmit={createBarangayAdmin} style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))' }}>
            <input required placeholder="Username" value={adminCreateForm.username} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, username: e.target.value })} style={inputStyle} />
            <input required type="email" placeholder="Email" value={adminCreateForm.email} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, email: e.target.value })} style={inputStyle} />
            <input required placeholder="Temporary Password" value={adminCreateForm.temporaryPassword} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, temporaryPassword: e.target.value })} style={inputStyle} />
            <input required placeholder="First Name" value={adminCreateForm.firstName} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, firstName: e.target.value })} style={inputStyle} />
            <input required placeholder="Last Name" value={adminCreateForm.lastName} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, lastName: e.target.value })} style={inputStyle} />
            <input required placeholder="Barangay Code" value={adminCreateForm.barangayCode} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, barangayCode: e.target.value })} style={inputStyle} />
            <input required placeholder="Barangay Name" value={adminCreateForm.barangay} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, barangay: e.target.value })} style={inputStyle} />
            <input required placeholder="City" value={adminCreateForm.city} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, city: e.target.value })} style={inputStyle} />
            <input required placeholder="Province" value={adminCreateForm.province} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, province: e.target.value })} style={inputStyle} />
            <input required placeholder="Region" value={adminCreateForm.region} onChange={(e) => setAdminCreateForm({ ...adminCreateForm, region: e.target.value })} style={inputStyle} />
            <button type="submit" style={{ gridColumn: '1 / -1', background: '#CE1126', color: '#fff', border: 0, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}>
              Create Barangay Admin Account
            </button>
          </form>
        </div>
      )}

      {activeTab === 'request-monitor' && (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 2fr' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0 }}>Document Requests</h3>
            <div style={{ marginBottom: '10px' }}>
              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px' }}
              >
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="APPROVED">APPROVED</option>
                <option value="DECLINED">DECLINED</option>
                <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                <option value="READY_FOR_RELEASE">READY_FOR_RELEASE</option>
              </select>
            </div>

            {loading && <div>Loading...</div>}
            {!loading && monitoredRequests.length === 0 && <div>No requests found in this status.</div>}

            <div style={{ display: 'grid', gap: '8px' }}>
              {monitoredRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  style={{
                    textAlign: 'left',
                    border: request.id === selectedRequest?.id ? '2px solid #0038A8' : '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '10px',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{request.documentType}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{request.purpose}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Status: {request.status}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0 }}>Request Monitoring and Intervention</h3>
            {!selectedRequest && <div>Select a request to review and intervene.</div>}

            {selectedRequest && (
              <>
                <div style={{ marginBottom: '10px' }}>
                  <strong>{selectedRequest.documentType}</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Request ID: {selectedRequest.id}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Status: {selectedRequest.status}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Purpose: {selectedRequest.purpose}</div>
                </div>

                <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
                  {(selectedRequest.files || []).map((file) => (
                    <div key={file.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontWeight: 600 }}>{file.originalFileName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{file.fileType} · {(file.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                      {file.signedUrl && (
                        <a href={file.signedUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontSize: '13px' }}>
                          Open signed file URL
                        </a>
                      )}
                    </div>
                  ))}
                  {(selectedRequest.files || []).length === 0 && <div>No attachments for this request.</div>}
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px' }}
                  >
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="DECLINED">DECLINED</option>
                    <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                    <option value="READY_FOR_RELEASE">READY_FOR_RELEASE</option>
                  </select>
                  <textarea
                    value={overrideRemarks}
                    onChange={(e) => setOverrideRemarks(e.target.value)}
                    placeholder="Intervention remarks"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', minHeight: '70px' }}
                  />
                  <button
                    onClick={applyRequestOverride}
                    style={{ background: '#0038A8', color: '#fff', border: 0, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}
                  >
                    Apply Status Override
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(activeTab === 'residents' || activeTab === 'officers') && (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 2fr' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0 }}>{activeTab === 'officers' ? 'Pending Officers' : 'Pending Residents'}</h3>
            {loading && <div>Loading...</div>}
            {!loading && selectedQueue.length === 0 && <div>No pending accounts.</div>}
            <div style={{ display: 'grid', gap: '8px' }}>
              {selectedQueue.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedAccount(entry)}
                  style={{
                    textAlign: 'left',
                    border: entry.id === selectedAccount?.id ? '2px solid #0038A8' : '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '10px',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{entry.firstName} {entry.lastName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{entry.email}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Barangay: {entry.barangayCode || entry.barangay || 'N/A'}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0 }}>{activeTab === 'officers' ? 'Officer Proof Review' : 'Resident File Review'}</h3>
            {!selectedAccount && <div>Select an account to review files.</div>}

            {selectedAccount && (
              <>
                <div style={{ marginBottom: '10px' }}>
                  <strong>{selectedAccount.firstName} {selectedAccount.lastName}</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedAccount.email}</div>
                </div>

                <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
                  {verificationFiles.map((file) => (
                    <div key={file.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontWeight: 600 }}>{file.originalFileName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{file.category} · {(file.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                      {file.signedUrl && (
                        <a href={file.signedUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontSize: '13px' }}>
                          Open signed file URL
                        </a>
                      )}
                    </div>
                  ))}
                  {verificationFiles.length === 0 && <div>No uploaded files yet.</div>}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => decideAccount(selectedAccount.id, 'approve')}
                    style={{ background: '#16a34a', color: '#fff', border: 0, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}
                  >
                    Approve {activeTab === 'officers' ? 'Officer' : 'Resident'}
                  </button>
                  <button
                    onClick={() => decideAccount(selectedAccount.id, 'reject')}
                    style={{ background: '#dc2626', color: '#fff', border: 0, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}
                  >
                    Reject {activeTab === 'officers' ? 'Officer' : 'Resident'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '9px 10px',
  fontSize: '14px',
};