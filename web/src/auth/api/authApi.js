import apiService from '../../shared/services/api';

/**
 * Auth API - Feature-scoped wrapper for auth-specific API calls
 */
class AuthApi {
  /**
   * Register a new user
   */
  async register(userData) {
    return apiService.register(userData);
  }

  /**
   * Complete profile for OAuth users
   */
  async completeProfile(profileData) {
    return apiService.completeProfile(profileData);
  }

  /**
   * Login with email and password
   */
  async login(credentials) {
    return apiService.login(credentials);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    return apiService.getCurrentUser();
  }

  /**
   * Logout current user
   */
  async logout() {
    return apiService.logout();
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    return apiService.forgotPassword(email);
  }

  /**
   * Reset password with reset token
   */
  async resetPassword(token, newPassword, confirmPassword) {
    return apiService.resetPassword(token, newPassword, confirmPassword);
  }

  /**
   * Send a one-time password to the given email (LOCAL accounts only)
   */
  async sendOtp(email) {
    return apiService.sendOtp(email);
  }

  /**
   * Verify the OTP code entered by the user
   */
  async verifyOtp(email, code) {
    return apiService.verifyOtp(email, code);
  }
}

const authApi = new AuthApi();

export default authApi;
