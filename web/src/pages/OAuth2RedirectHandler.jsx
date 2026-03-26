import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

const OAuth2RedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthData } = useAuth();
  const { showModal } = useModal();

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

          // Show success modal and navigate to dashboard
          showModal({
            context: 'success',
            title: 'Google Sign In Successful! 🎉',
            message: `Welcome to PirmaPH, ${userData?.firstName || 'User'}! Your Google account has been successfully linked. You can now access all barangay digital services.`,
            confirmText: 'Go to Dashboard',
            showCancel: false,
            onConfirm: () => {
              navigate('/dashboard', { replace: true });
            }
          });
        } else if (error) {
          console.error('OAuth2 error:', error);
          showModal({
            context: 'error',
            title: 'Google Sign In Failed',
            message: 'We encountered an issue while signing you in with Google. Please try again or use the regular login form.',
            confirmText: 'Back to Login',
            showCancel: false,
            onConfirm: () => {
              navigate('/', { replace: true });
            }
          });
        } else {
          console.error('No token received from OAuth2 redirect');
          showModal({
            context: 'error',
            title: 'Sign In Error',
            message: 'We could not complete your sign-in. Please try again.',
            confirmText: 'Back to Login',
            showCancel: false,
            onConfirm: () => {
              navigate('/', { replace: true });
            }
          });
        }
      } catch (err) {
        console.error('OAuth redirect handler error:', err);
        if (isMounted) {
          showModal({
            context: 'error',
            title: 'Sign In Error',
            message: 'An unexpected error occurred. Please try again.',
            confirmText: 'Back to Login',
            showCancel: false,
            onConfirm: () => {
              navigate('/', { replace: true });
            }
          });
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
