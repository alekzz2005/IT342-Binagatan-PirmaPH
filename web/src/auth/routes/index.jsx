import OAuth2RedirectHandler from '../pages/OAuth2RedirectHandler/OAuth2RedirectHandler';

export const authRoutes = [
  {
    path: '/oauth2/redirect',
    element: <OAuth2RedirectHandler />,
  },
];

export default authRoutes;
