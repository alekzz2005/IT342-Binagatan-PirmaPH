import { USER_ROLES } from '../../shared/utils/rbac';
import SubmitRequestPage from '../pages/SubmitRequestPage/SubmitRequestPage';
import RequestHistoryPage from '../pages/RequestHistoryPage/RequestHistoryPage';
import OfficerRequestQueuePage from '../pages/OfficerRequestQueuePage/OfficerRequestQueuePage';
import BarangayAdminDocumentRequestsPage from '../pages/BarangayAdminDocumentRequestsPage/BarangayAdminDocumentRequestsPage';

/**
 * Document Requests Feature Routes
 * Routes for submitting, tracking, and managing document requests
 */
export const documentRequestsRoutes = [
  {
    path: '/requests/submit',
    element: <SubmitRequestPage />,
    allowedRoles: [USER_ROLES.RESIDENT],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/requests/mine',
    element: <RequestHistoryPage />,
    allowedRoles: [USER_ROLES.RESIDENT],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/officer/requests',
    element: <OfficerRequestQueuePage />,
    allowedRoles: [USER_ROLES.OFFICER],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/dashboard/barangay-admin/requests',
    element: <BarangayAdminDocumentRequestsPage />,
    allowedRoles: [USER_ROLES.BARANGAY_ADMIN],
    allowedStatuses: ['APPROVED'],
  },
];

export default documentRequestsRoutes;
