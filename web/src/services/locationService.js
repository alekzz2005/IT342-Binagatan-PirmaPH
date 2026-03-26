// Fetch Philippine locations from PSGC Cloud API
const PSGC_BASE_URL = 'https://psgc.cloud/api';

class LocationService {
  /**
   * Fetch all regions
   * Used to populate the Region dropdown
   */
  async fetchRegions() {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/regions`);
      if (!response.ok) throw new Error('Failed to fetch regions');
      return await response.json();
    } catch (error) {
      console.error('Error fetching regions:', error);
      return [];
    }
  }

  /**
   * Fetch provinces by region code
   * Used when a user selects a Region
   */
  async fetchProvincesByRegion(regionCode) {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/regions/${regionCode}/provinces`);
      if (!response.ok) throw new Error('Failed to fetch provinces');
      return await response.json();
    } catch (error) {
      console.error('Error fetching provinces:', error);
      return [];
    }
  }

  /**
   * Fetch cities/municipalities by province code
   * Used when a user selects a Province
   */
  async fetchCitiesByProvince(provinceCode) {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/provinces/${provinceCode}/cities-municipalities`);
      if (!response.ok) throw new Error('Failed to fetch cities/municipalities');
      return await response.json();
    } catch (error) {
      console.error('Error fetching cities/municipalities:', error);
      return [];
    }
  }

  /**
   * Fetch cities/municipalities by region code
   * Used for regions without provinces (e.g., NCR)
   */
  async fetchCitiesByRegion(regionCode) {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/regions/${regionCode}/cities-municipalities`);
      if (!response.ok) throw new Error('Failed to fetch cities/municipalities');
      return await response.json();
    } catch (error) {
      console.error('Error fetching cities/municipalities:', error);
      return [];
    }
  }

  /**
   * Fetch barangays by city/municipality code
   * Used when a user selects a City or Municipality
   */
  async fetchBarangaysByCity(cityMunCode) {
    try {
      const response = await fetch(`${PSGC_BASE_URL}/cities-municipalities/${cityMunCode}/barangays`);
      if (!response.ok) throw new Error('Failed to fetch barangays');
      return await response.json();
    } catch (error) {
      console.error('Error fetching barangays:', error);
      return [];
    }
  }
}

export default new LocationService();
