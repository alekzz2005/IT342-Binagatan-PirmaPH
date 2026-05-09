import apiService from '../../../shared/services/api';

export default {
  // Verification API methods - delegate to shared apiService
  getPendingResidents: () => apiService.getPendingResidents(),
  getPendingOfficers: () => apiService.getPendingOfficers(),
  getResidents: () => apiService.getResidents(),
  getOfficers: () => apiService.getOfficers(),
  getResidentFilesForReview: (id) => apiService.getResidentFilesForReview(id),
  approveResident: (id) => apiService.approveResident(id),
  rejectResident: (id) => apiService.rejectResident(id),
  approveOfficer: (id) => apiService.approveOfficer(id),
  rejectOfficer: (id) => apiService.rejectOfficer(id),
};
