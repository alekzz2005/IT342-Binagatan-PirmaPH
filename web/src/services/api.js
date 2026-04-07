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
    return this.request('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, newPassword, confirmPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
  }

  async getResidentVerificationStatus() {
    return this.request('/resident/verification-status');
  }

  async getOfficerVerificationStatus() {
    return this.request('/officer/verification-status');
  }

  async getResidentFiles() {
    return this.request('/resident/files');
  }

  async uploadResidentFile(category, file) {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('category', category);
    form.append('file', file);

    const response = await fetch(`${API_BASE_URL}/resident/files/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Upload failed',
        errors: data,
      };
    }
    return data;
  }

  async uploadOfficerAppointmentProof(file) {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${API_BASE_URL}/officer/files/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Upload failed',
        errors: data,
      };
    }
    return data;
  }

  async getPendingResidents() {
    return this.request('/admin/residents/pending');
  }

  async approveResident(userId) {
    return this.request(`/admin/residents/${userId}/approve`, { method: 'PATCH' });
  }

  async rejectResident(userId) {
    return this.request(`/admin/residents/${userId}/reject`, { method: 'PATCH' });
  }

  async getPendingOfficers() {
    return this.request('/admin/officers/pending');
  }

  async approveOfficer(userId) {
    return this.request(`/admin/officers/${userId}/approve`, { method: 'PATCH' });
  }

  async rejectOfficer(userId) {
    return this.request(`/admin/officers/${userId}/reject`, { method: 'PATCH' });
  }

  async getOfficers() {
    return this.request('/admin/officers');
  }

  async updateUserRole(userId, role) {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async suspendUser(userId) {
    return this.request(`/admin/users/${userId}/suspend`, { method: 'PATCH' });
  }

  async reinstateUser(userId) {
    return this.request(`/admin/users/${userId}/reinstate`, { method: 'PATCH' });
  }

  async createBarangayAdmin(payload) {
    return this.request('/admin/barangay-admins', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getResidentFilesForReview(userId) {
    return this.request(`/resident/files/${userId}`);
  }

  async submitDocumentRequest(payload) {
    return this.request('/requests/resident', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMyDocumentRequests() {
    return this.request('/requests/resident/mine');
  }

  async getMyDocumentRequestById(requestId) {
    return this.request(`/requests/resident/${requestId}`);
  }

  async uploadRequestAttachment(requestId, file) {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${API_BASE_URL}/requests/resident/${requestId}/attachments`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Upload failed',
        errors: data,
      };
    }
    return data;
  }

  async getOfficerRequestQueue(status) {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/requests/officer/queue${suffix}`);
  }

  async getOfficerRequestById(requestId) {
    return this.request(`/requests/officer/${requestId}`);
  }

  async updateOfficerRequestStatus(requestId, payload) {
    return this.request(`/requests/officer/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async uploadGeneratedRequestDocument(requestId, file) {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${API_BASE_URL}/requests/officer/${requestId}/generated-documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Upload failed',
        errors: data,
      };
    }
    return data;
  }

  async getAdminRequestQueue(status) {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/requests/admin/queue${suffix}`);
  }

  async overrideAdminRequestStatus(requestId, payload) {
    return this.request(`/requests/admin/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

const apiService = new ApiService();

export default apiService;
export { API_BASE_URL, OAUTH2_URL };
