import { USER_ROLES } from '../../shared/utils/rbac';
import PaymentSuccessPage from '../pages/PaymentResultPage/PaymentSuccessPage';
import PaymentFailedPage from '../pages/PaymentResultPage/PaymentFailedPage';

/**
 * Payment Feature Routes
 * These pages are shown after PayMongo redirects back to the frontend.
 */
const paymentRoutes = [
  {
    path: '/payment/success',
    element: <PaymentSuccessPage />,
    allowedRoles: [USER_ROLES.RESIDENT],
    allowedStatuses: ['APPROVED'],
  },
  {
    path: '/payment/failed',
    element: <PaymentFailedPage />,
    allowedRoles: [USER_ROLES.RESIDENT],
    allowedStatuses: ['APPROVED'],
  },
];

export default paymentRoutes;
