import { USER_ROLES } from '../../shared/utils/rbac';
import AdminVerificationPage from '../pages/AdminVerificationPage/AdminVerificationPage';

export const verificationRoutes = [
  {
    path: '/dashboard/barangay-admin/verification',
    element: <AdminVerificationPage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN, USER_ROLES.SUPER_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
];

export default verificationRoutes;
