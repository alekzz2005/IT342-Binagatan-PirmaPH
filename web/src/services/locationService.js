// Fetch Philippine locations from PSGC Cloud API
const PSGC_BASE_URL = 'https://psgc.cloud/api';

class LocationService {
  async fetchRegions() {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/regions`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching regions:', error);
      return [];
    }
  }

  async fetchProvinces() {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/provinces`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching provinces:', error);
      return [];
    }
  }

  async fetchCities() {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/cities`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching cities:', error);
      return [];
    }
  }

  async fetchMunicipalities() {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/municipalities`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching municipalities:', error);
      return [];
    }
  }

  async fetchBarangays() {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/barangays`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching barangays:', error);
      return [];
    }
  }
}

export default new LocationService();
