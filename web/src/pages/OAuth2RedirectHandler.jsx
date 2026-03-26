import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuth2RedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthData } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const handleOAuthRedirect = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const userDataJson = params.get('user');
        const error = params.get('error');

        if (token) {
          let userData = null;
          
          // Parse user data if provided
          if (userDataJson) {
            try {
              userData = JSON.parse(userDataJson);
            } catch (e) {
              console.error('Failed to parse user data:', e);
            }
          }

          if (!isMounted) {
            return;
          }

          // Store token and user data
          localStorage.setItem('token', token);
          if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
          }

          // Update auth context if setAuthData is available
          if (setAuthData) {
            setAuthData(token, userData);
          }

          // Navigate to dashboard
          navigate('/dashboard', { replace: true });
        } else if (error) {
          console.error('OAuth2 error:', error);
          navigate('/?error=oauth_failed', { replace: true });
        } else {
          console.error('No token received from OAuth2 redirect');
          navigate('/?error=no_token', { replace: true });
        }
      } catch (err) {
        console.error('OAuth redirect handler error:', err);
        if (isMounted) {
          navigate('/?error=redirect_failed', { replace: true });
        }
      }
    };

    handleOAuthRedirect();

    return () => {
      isMounted = false;
    };
  }, [location.search, navigate]);

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
