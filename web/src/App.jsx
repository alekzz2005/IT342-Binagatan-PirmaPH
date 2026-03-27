import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { useAuth } from './context/AuthContext';
import Modal from './components/Modal';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import OAuth2RedirectHandler from './pages/OAuth2RedirectHandler';
import ProtectedRoute from './components/ProtectedRoute';
import { getDashboardPathByRole, USER_ROLES } from './utils/rbac';
import './App.css';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const defaultDashboardPath = getDashboardPathByRole(user?.role);

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
          <ProtectedRoute allowedRoles={[USER_ROLES.RESIDENT]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/officer"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.OFFICER]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/barangay-admin"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.BARANGAY_ADMIN]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/super-admin"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]}>
            <Dashboard />
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
