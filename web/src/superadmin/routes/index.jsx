import { USER_ROLES } from '../../shared/utils/rbac';
import SuperAdminDashboardPage from '../pages/SuperAdminDashboardPage/SuperAdminDashboardPage';
import SuperAdminBarangayManagementPage from '../pages/SuperAdminBarangayManagementPage/SuperAdminBarangayManagementPage';
import SuperAdminGlobalUserControlPage from '../pages/SuperAdminGlobalUserControlPage/SuperAdminGlobalUserControlPage';
import SuperAdminSystemMonitoringPage from '../pages/SuperAdminSystemMonitoringPage/SuperAdminSystemMonitoringPage';
import AdminVerificationPage from '../../verification/pages/AdminVerificationPage/AdminVerificationPage';

export const superAdminRoutes = [
  {
    path: '/dashboard/super-admin',
    element: <SuperAdminDashboardPage />,
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/super-admin/manage',
    element: <AdminVerificationPage />,
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/super-admin/barangays',
    element: <SuperAdminBarangayManagementPage />,
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/super-admin/users',
    element: <SuperAdminGlobalUserControlPage />,
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/super-admin/monitoring',
    element: <SuperAdminSystemMonitoringPage />,
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
];

export default superAdminRoutes;