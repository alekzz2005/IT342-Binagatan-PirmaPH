import apiService from '../../shared/services/api';

/**
 * Document Requests API - Feature-scoped wrapper for document request API calls
 */
class DocumentRequestsApi {
  /**
   * Submit a new document request
   */
  async submitDocumentRequest(requestData) {
    return apiService.submitDocumentRequest(requestData);
  }

  /**
   * Upload attachment for a document request
   */
  async uploadRequestAttachment(requestId, file) {
    return apiService.uploadRequestAttachment(requestId, file);
  }

  /**
   * Get resident's document requests (history)
   */
  async getMyDocumentRequests(params) {
    return apiService.getMyDocumentRequests(params);
  }

  /**
   * Get officer's request queue (pending requests for officer review)
   */
  async getOfficerRequestQueue(params) {
    return apiService.getOfficerRequestQueue(params);
  }

  /**
   * Update request status (approve/reject/etc)
   */
  async updateOfficerRequestStatus(requestId, status, remarks) {
    return apiService.updateOfficerRequestStatus(requestId, status, remarks);
  }

  /**
   * Get barangay admin's document request view
   */
  async getBarangayAdminRequests(params) {
    return apiService.getBarangayAdminRequests(params);
  }

  /**
   * Get request details
   */
  async getRequestDetails(requestId) {
    return apiService.getRequestDetails(requestId);
  }

  /**
   * Download request document
   */
  async downloadRequestDocument(requestId) {
    return apiService.downloadRequestDocument(requestId);
  }
}

const documentRequestsApi = new DocumentRequestsApi();

export default documentRequestsApi;
