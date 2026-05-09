import { USER_ROLES } from '../../shared/utils/rbac';
import BarangayAdminDashboardPage from '../pages/BarangayAdminDashboardPage/BarangayAdminDashboardPage';
import BarangayAdminUserManagementPage from '../pages/BarangayAdminUserManagementPage/BarangayAdminUserManagementPage';
import BarangayAdminDocumentRequestsPage from '../../documentrequests/pages/BarangayAdminDocumentRequestsPage/BarangayAdminDocumentRequestsPage';
import BarangayAdminOfficerMonitoringPage from '../pages/BarangayAdminOfficerMonitoringPage/BarangayAdminOfficerMonitoringPage';
import BarangayAdminAuditLogPage from '../pages/BarangayAdminAuditLogPage/BarangayAdminAuditLogPage';
import BarangayAdminProfilePage from '../pages/BarangayAdminProfilePage/BarangayAdminProfilePage';

export const adminRoutes = [
  {
    path: '/dashboard/barangay-admin',
    element: <BarangayAdminDashboardPage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/barangay-admin/users',
    element: <BarangayAdminUserManagementPage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/barangay-admin/requests',
    element: <BarangayAdminDocumentRequestsPage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/barangay-admin/manage',
    element: <BarangayAdminOfficerMonitoringPage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN, USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/barangay-admin/officer-monitoring',
    element: <BarangayAdminOfficerMonitoringPage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN, USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/barangay-admin/audit-log',
    element: <BarangayAdminAuditLogPage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN, USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/barangay-admin/profile',
    element: <BarangayAdminProfilePage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
];

export default adminRoutes;