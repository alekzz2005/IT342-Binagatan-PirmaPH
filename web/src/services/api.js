// API Base URL - Use environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const OAUTH2_URL = import.meta.env.VITE_OAUTH2_URL || 'http://localhost:8080/oauth2/authorization/google';

// API Service for making HTTP requests
class ApiService {
  // Helper method to make requests
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'An error occurred',
          errors: data,
        };
      }

      return data;
    } catch (error) {
      if (error.status) throw error;
      throw {
        status: 500,
        message: 'Network error. Please check your connection.',
      };
    }
  }

  // Register new user
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Login user
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Get current user profile (example for future use)
  async getCurrentUser() {
    return this.request('/users/me');
  }
}

const apiService = new ApiService();

export default apiService;
export { API_BASE_URL, OAUTH2_URL };
