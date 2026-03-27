import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import { getDashboardPathByRole } from '../utils/rbac';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user and token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const data = await apiService.login({ email, password });
      
      // Extract token and user data
      const { token: authToken, ...userData } = data;
      
      // Save to state
      setToken(authToken);
      setUser(userData);
      
      // Save to localStorage
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return {
        success: true,
        user: userData,
        redirectPath: getDashboardPathByRole(userData.role),
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const data = await apiService.register(userData);
      
      // Extract token and user data
      const { token: authToken, ...userInfo } = data;

      if (authToken) {
        setToken(authToken);
        setUser(userInfo);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userInfo));
      }
      
      return {
        success: true,
        user: userInfo,
        requiresApproval: !authToken,
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Registration failed',
        errors: error.errors 
      };
    }
  };

  const completeOAuthLogin = async (authToken) => {
    try {
      localStorage.setItem('token', authToken);
      setToken(authToken);

      const userData = await apiService.getCurrentUser();

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      return { success: true };
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);

      return {
        success: false,
        message: error.message || 'OAuth login failed',
      };
    }
  };

  const logout = () => {
    apiService.logout().catch(() => {
      // Stateless JWT logout is best-effort; client state is still cleared below.
    });
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const forgotPassword = async (email) => {
    try {
      const data = await apiService.forgotPassword(email);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message || 'Unable to process password reset request' };
    }
  };

  const setAuthData = useCallback((authToken, userData) => {
    setToken(authToken);
    if (userData) {
      setUser(userData);
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    completeOAuthLogin,
    setAuthData,
    forgotPassword,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
