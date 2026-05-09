import { USER_ROLES } from '../../shared/utils/rbac';
import Dashboard from '../pages/Dashboard/Dashboard';
import ResidentProfilePage from '../pages/ResidentProfilePage/ResidentProfilePage';
import OfficerProfilePage from '../pages/OfficerProfilePage/OfficerProfilePage';
import OfficerRequestQueuePage from '../../documentrequests/pages/OfficerRequestQueuePage/OfficerRequestQueuePage';

export const usersRoutes = [
  {
    path: '/dashboard/resident',
    element: <Dashboard />,
    allowedRoles: [USER_ROLES.RESIDENT],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/pending',
    element: <Dashboard />,
    allowedRoles: [USER_ROLES.RESIDENT],
    allowedStatuses: ['PENDING_VERIFICATION', 'REJECTED', 'APPROVED'],
  },
  {
    path: '/dashboard/officer',
    element: <OfficerRequestQueuePage />,
    allowedRoles: [USER_ROLES.OFFICER],
    allowedStatuses: ['PENDING_VERIFICATION', 'REJECTED', 'APPROVED'],
  },
  {
    path: '/profile',
    element: <ResidentProfilePage />,
    allowedRoles: [USER_ROLES.RESIDENT],
    allowedStatuses: ['PENDING_VERIFICATION', 'REJECTED', 'APPROVED'],
  },
  {
    path: '/officer/profile',
    element: <OfficerProfilePage />,
    allowedRoles: [USER_ROLES.OFFICER],
    allowedStatuses: ['PENDING_VERIFICATION', 'REJECTED', 'APPROVED'],
  },
];

export default usersRoutes;