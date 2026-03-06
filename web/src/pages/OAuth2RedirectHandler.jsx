import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuth2RedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeOAuthLogin } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const handleOAuthRedirect = async () => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      const result = await completeOAuthLogin(token);

      if (!isMounted) {
        return;
      }

      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        console.error('OAuth2 login failed:', result.message);
        navigate('/', { replace: true });
      }
    } else if (error) {
      console.error('OAuth2 error:', error);
      navigate('/', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
    };

    handleOAuthRedirect();

    return () => {
      isMounted = false;
    };
  }, [location.search, navigate, completeOAuthLogin]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Source Sans 3, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Completing Google Sign In...</h2>
        <p style={{ marginTop: '10px', color: '#666' }}>Please wait while we redirect you.</p>
      </div>
    </div>
  );
};

export default OAuth2RedirectHandler;
