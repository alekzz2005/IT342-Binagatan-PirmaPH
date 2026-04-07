import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPathByRole, isApprovedUser } from '../utils/rbac';

const ProtectedRoute = ({ children, allowedRoles = [], allowedStatuses = ['APPROVED'] }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#0038A8'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const statusAllowed = allowedStatuses.includes(user?.status) || (allowedStatuses.includes('APPROVED') && isApprovedUser(user));
  if (!statusAllowed) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getDashboardPathByRole(user?.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
