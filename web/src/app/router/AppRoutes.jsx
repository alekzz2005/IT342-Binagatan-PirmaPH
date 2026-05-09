import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../shared/components/ProtectedRoute';
import { useAuth } from '../../shared/context/AuthContext';
import { getLandingPathForUser } from '../../shared/utils/rbac';
import AuthPage from '../../auth/pages/AuthPage/AuthPage';
import authRoutes from '../../auth/routes';
import usersRoutes from '../../users/routes';
import verificationRoutes from '../../verification/routes';
import documentRequestsRoutes from '../../documentrequests/routes';
import adminRoutes from '../../admin/routes';
import superAdminRoutes from '../../superadmin/routes';

const featureRoutes = [
  ...authRoutes,
  ...usersRoutes,
  ...verificationRoutes,
  ...documentRequestsRoutes,
  ...adminRoutes,
  ...superAdminRoutes,
];

const wrapProtectedRoute = (route) => {
  const needsProtection = Boolean(route.allowedRoles?.length || route.allowedStatuses?.length);

  if (!needsProtection) {
    return route.element;
  }

  return (
    <ProtectedRoute allowedRoles={route.allowedRoles} allowedStatuses={route.allowedStatuses}>
      {route.element}
    </ProtectedRoute>
  );
};

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const defaultDashboardPath = getLandingPathForUser(user);

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to={defaultDashboardPath} replace /> : <AuthPage />}
      />
      <Route
        path="/dashboard"
        element={<Navigate to={defaultDashboardPath} replace />}
      />
      {featureRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={wrapProtectedRoute(route)}
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
