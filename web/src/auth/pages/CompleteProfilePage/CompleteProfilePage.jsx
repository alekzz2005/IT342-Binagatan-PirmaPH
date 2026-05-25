import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Home, Lock, Search } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import locationService from '../../../shared/services/locationService';
import authApi from '../../api/authApi';
import { USER_STATUS } from '../../../shared/utils/rbac';
import '../AuthPage/AuthPage.css'; // Reuse AuthPage styles

const CompleteProfilePage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showModal } = useModal();

  // Redirect if not incomplete
  useEffect(() => {
    if (user && user.status !== USER_STATUS.INCOMPLETE_PROFILE) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState({
    birthDate: '',
    sex: '',
    phoneNumber: '',
    street: '',
    regionCode: '',
    region: '',
    provinceCode: '',
    province: '',
    cityMunCode: '',
    city: '',
    barangayCode: '',
    barangay: '',
    zipCode: '',
  });

  // Location dropdown data
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Load regions on component mount
  useEffect(() => {
    const loadRegions = async () => {
      setLoadingLocations(true);
      const data = await locationService.fetchRegions();
      setRegions(data);
      setLoadingLocations(false);
    };
    loadRegions();
  }, []);

  // Handle region selection
  const handleRegionChange = async (e) => {
    const selectedRegion = regions.find(r => r.code === e.target.value);
    
    setFormData({
      ...formData,
      regionCode: e.target.value,
      region: selectedRegion?.name || '',
      provinceCode: '',
      province: '',
      cityMunCode: '',
      city: '',
      barangayCode: '',
      barangay: '',
    });

    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (e.target.value) {
      setLoadingLocations(true);
      const provincesData = await locationService.fetchProvincesByRegion(e.target.value);
      
      if (provincesData && provincesData.length > 0) {
        setProvinces(provincesData);
      } else {
        const citiesData = await locationService.fetchCitiesByRegion(e.target.value);
        setCities(citiesData);
      }
      setLoadingLocations(false);
    }
  };

  const handleProvinceChange = async (e) => {
    const selectedProvince = provinces.find(p => p.code === e.target.value);
    
    setFormData({
      ...formData,
      provinceCode: e.target.value,
      province: selectedProvince?.name || '',
      cityMunCode: '',
      city: '',
      barangayCode: '',
      barangay: '',
    });

    setCities([]);
    setBarangays([]);

    if (e.target.value) {
      setLoadingLocations(true);
      const citiesData = await locationService.fetchCitiesByProvince(e.target.value);
      setCities(citiesData);
      setLoadingLocations(false);
    }
  };

  const handleCityChange = async (e) => {
    const selectedCity = cities.find(c => c.code === e.target.value);
    
    setFormData({
      ...formData,
      cityMunCode: e.target.value,
      city: selectedCity?.name || '',
      barangayCode: '',
      barangay: '',
    });

    setBarangays([]);

    if (e.target.value) {
      setLoadingLocations(true);
      const barangaysData = await locationService.fetchBarangaysByCity(e.target.value);
      setBarangays(barangaysData);
      setLoadingLocations(false);
    }
  };

  const handleBarangayChange = (e) => {
    const selectedBarangay = barangays.find(b => b.code === e.target.value);
    
    setFormData({
      ...formData,
      barangayCode: e.target.value,
      barangay: selectedBarangay?.name || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use authApi to complete profile (need to add this to authApi)
      await authApi.completeProfile(formData);
      
      showModal({
        context: 'success',
        title: 'Profile Completed!',
        message: 'Your profile has been successfully updated and is now pending verification from your barangay administrator.',
        confirmText: 'Go to Dashboard',
        showCancel: false,
        onConfirm: () => {
          // After completing, their status will be PENDING_VERIFICATION.
          // Forcing a hard reload or logout so they can get the new status from the server
          // or just redirect to /dashboard/pending since auth context will refresh.
          window.location.href = '/';
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user || user.status !== USER_STATUS.INCOMPLETE_PROFILE) {
    return null;
  }

  return (
    <div className="auth-container">
      {/* Left Panel */}
      <div className="left-panel">
        <div className="sun-deco">
          <div className="sun-circle"></div>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="sun-ray"
              style={{
                transform: `translate(-50%,-100%) rotate(${deg}deg) translateY(-20px)`,
              }}
            ></div>
          ))}
        </div>

        <div className="star" style={{ bottom: '80px', right: '50px' }}></div>
        <div className="star" style={{ bottom: '100px', right: '90px', width: '6px', height: '6px', opacity: 0.4 }}></div>
        <div className="star" style={{ top: '160px', right: '60px', width: '8px', height: '8px', opacity: 0.5 }}></div>

        <div className="left-logo">
          <h1>
            Pirma<span className="accent">PH</span>
          </h1>
          <p>Barangay Digital Services</p>
        </div>

        <div className="left-features">
          <div className="feature-item">
            <div className="feature-icon"><ClipboardList size={20} strokeWidth={2} /></div>
            <div className="feature-text">
              <h3>Almost There!</h3>
              <p>Complete your registration to access services</p>
            </div>
          </div>
        </div>

        <div className="triangle-deco"></div>
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="right-scroll">
          <div className="form-heading" style={{ marginTop: '40px' }}>
            <h2>Complete Your Profile</h2>
            <p>Welcome, {user.firstName}! We just need a few more details to set up your account.</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Section: Personal Information */}
            <div className="form-section">Additional Information</div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Date of Birth <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData({ ...formData, birthDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Sex <span className="required">*</span>
                </label>
                <div className="select-wrap">
                  <select
                    className="form-select"
                    value={formData.sex}
                    onChange={(e) =>
                      setFormData({ ...formData, sex: e.target.value })
                    }
                    required
                  >
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Phone Number <span className="required">*</span>
              </label>
              <input
                className="form-input"
                type="tel"
                placeholder="+63 9XX XXX XXXX"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                required
              />
            </div>

            {/* Section: Address Information */}
            <div className="form-section">Address Information</div>

            <div className="form-group">
              <label className="form-label">
                Street Address <span className="required">*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="123 Main Street, Apt 4B"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Region <span className="required">*</span>
              </label>
              <div className="select-wrap">
                <select
                  className="form-select"
                  value={formData.regionCode}
                  onChange={handleRegionChange}
                  disabled={loadingLocations}
                  required
                >
                  <option value="">Select Region...</option>
                  {regions.map((region) => (
                    <option key={region.code} value={region.code}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.regionCode && provinces.length > 0 && (
              <div className="form-group">
                <label className="form-label">
                  Province <span className="required">*</span>
                </label>
                <div className="select-wrap">
                  <select
                    className="form-select"
                    value={formData.provinceCode}
                    onChange={handleProvinceChange}
                    disabled={loadingLocations}
                    required
                  >
                    <option value="">Select Province...</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {formData.regionCode && cities.length > 0 && (
              <div className="form-group">
                <label className="form-label">
                  City/Municipality <span className="required">*</span>
                </label>
                <div className="select-wrap">
                  <select
                    className="form-select"
                    value={formData.cityMunCode}
                    onChange={handleCityChange}
                    disabled={loadingLocations}
                    required
                  >
                    <option value="">Select City/Municipality...</option>
                    {cities.map((city) => (
                      <option key={city.code} value={city.code}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {formData.cityMunCode && barangays.length > 0 && (
              <div className="form-group">
                <label className="form-label">
                  Barangay <span className="required">*</span>
                </label>
                <div className="select-wrap">
                  <select
                    className="form-select"
                    value={formData.barangayCode}
                    onChange={handleBarangayChange}
                    required
                  >
                    <option value="">Select Barangay...</option>
                    {barangays.map((barangay) => (
                      <option key={barangay.code} value={barangay.code}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                ZIP Code <span className="required">*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="1234"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-outline" 
                onClick={handleLogout}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Cancel & Logout
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? 'Submitting...' : 'Complete Profile'}
              </button>
            </div>
            
            <p className="footer-note" style={{ marginTop: '20px' }}>
              Republic of the Philippines · Barangay Digital Services Platform
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
