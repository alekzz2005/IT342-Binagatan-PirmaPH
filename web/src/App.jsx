import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { useAuth } from './context/AuthContext';
import Modal from './components/Modal';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import OAuth2RedirectHandler from './pages/OAuth2RedirectHandler';
import ProtectedRoute from './components/ProtectedRoute';
import { getLandingPathForUser, USER_ROLES } from './utils/rbac';
import AdminVerificationPage from './pages/AdminVerificationPage';
import BarangayAdminAuditLogPage from './pages/BarangayAdminAuditLogPage';
import BarangayAdminDashboardPage from './pages/BarangayAdminDashboardPage';
import BarangayAdminOfficerMonitoringPage from './pages/BarangayAdminOfficerMonitoringPage';
import BarangayAdminProfilePage from './pages/BarangayAdminProfilePage';
import BarangayAdminUserManagementPage from './pages/BarangayAdminUserManagementPage';
import BarangayAdminDocumentRequestsPage from './pages/BarangayAdminDocumentRequestsPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import SuperAdminBarangayManagementPage from './pages/SuperAdminBarangayManagementPage';
import SuperAdminGlobalUserControlPage from './pages/SuperAdminGlobalUserControlPage';
import SuperAdminSystemMonitoringPage from './pages/SuperAdminSystemMonitoringPage';
import SubmitRequestPage from './pages/SubmitRequestPage';
import RequestHistoryPage from './pages/RequestHistoryPage';
import OfficerRequestQueuePage from './pages/OfficerRequestQueuePage';
import ResidentProfilePage from './pages/ResidentProfilePage';
import OfficerProfilePage from './pages/OfficerProfilePage';
import './App.css';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const defaultDashboardPath = getLandingPathForUser(user);

  return (
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to={defaultDashboardPath} replace /> : <AuthPage />} 
      />
      <Route 
        path="/oauth2/redirect" 
        element={<OAuth2RedirectHandler />} 
      />
      <Route
        path="/dashboard"
        element={<Navigate to={defaultDashboardPath} replace />}
      />
      <Route
        path="/dashboard/resident"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.RESIDENT]} allowedStatuses={['APPROVED']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/pending"
        element={
          <ProtectedRoute
            allowedRoles={[USER_ROLES.RESIDENT]}
            allowedStatuses={['PENDING_VERIFICATION', 'REJECTED', 'APPROVED']}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/officer"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.OFFICER]} allowedStatuses={['PENDING_VERIFICATION', 'REJECTED', 'APPROVED']}>
            <OfficerRequestQueuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/submit"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.RESIDENT]} allowedStatuses={['APPROVED']}>
            <SubmitRequestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/mine"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.RESIDENT]} allowedStatuses={['APPROVED']}>
            <RequestHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute
            allowedRoles={[USER_ROLES.RESIDENT]}
            allowedStatuses={['PENDING_VERIFICATION', 'REJECTED', 'APPROVED']}
          >
            <ResidentProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/requests"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.OFFICER]} allowedStatuses={['APPROVED']}>
            <OfficerRequestQueuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/profile"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.OFFICER]} allowedStatuses={['PENDING_VERIFICATION', 'REJECTED', 'APPROVED']}>
            <OfficerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN]} allowedStatuses={['APPROVED']}>
            <BarangayAdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin/users"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN]} allowedStatuses={['APPROVED']}>
            <BarangayAdminUserManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin/requests"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN]} allowedStatuses={['APPROVED']}>
            <BarangayAdminDocumentRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin/manage"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN, USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <BarangayAdminOfficerMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin/audit-log"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN, USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <BarangayAdminAuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin/profile"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN]} allowedStatuses={['APPROVED']}>
            <BarangayAdminProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin/officer-monitoring"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN, USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <BarangayAdminOfficerMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin/verification"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN, USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <AdminVerificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/super-admin"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <SuperAdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/super-admin/manage"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <AdminVerificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/super-admin/barangays"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <SuperAdminBarangayManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/super-admin/users"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <SuperAdminGlobalUserControlPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/super-admin/monitoring"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]} allowedStatuses={['APPROVED']}>
            <SuperAdminSystemMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ModalProvider>
          <Modal />
          <AppRoutes />
        </ModalProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
