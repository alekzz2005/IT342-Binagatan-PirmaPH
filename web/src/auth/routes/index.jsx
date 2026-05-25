import OAuth2RedirectHandler from '../pages/OAuth2RedirectHandler/OAuth2RedirectHandler';
import CompleteProfilePage from '../pages/CompleteProfilePage/CompleteProfilePage';
import { USER_STATUS } from '../../shared/utils/rbac';

export const authRoutes = [
  {
    path: '/oauth2/redirect',
    element: <OAuth2RedirectHandler />,
  },
  {
    path: '/complete-profile',
    element: <CompleteProfilePage />,
    allowedStatuses: [USER_STATUS.INCOMPLETE_PROFILE],
  },
];

export default authRoutes;
