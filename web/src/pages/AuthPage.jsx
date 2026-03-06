import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, register } = useAuth();

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    middleName: '',
    lastName: '',
    birthDate: '',
    sex: '',
    phoneNumber: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zipCode: '',
    role: 'RESIDENT',
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(loginData.email, loginData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await register(registerData);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

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
            <div className="feature-icon">📋</div>
            <div className="feature-text">
              <h3>Request Documents Online</h3>
              <p>Apply for clearances and certificates digitally</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔍</div>
            <div className="feature-text">
              <h3>Track Your Submissions</h3>
              <p>Real-time status updates on your requests</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🏠</div>
            <div className="feature-text">
              <h3>Serve Your Barangay</h3>
              <p>Empowering communities through technology</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <div className="feature-text">
              <h3>Secure & Private</h3>
              <p>Your data is protected with enterprise security</p>
            </div>
          </div>
        </div>

        <div className="triangle-deco"></div>
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="right-scroll">
          {/* Tab Switcher */}
          <div className="tab-switcher">
            <button
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
            >
              Login
            </button>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setError('');
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Login Tab */}
          {activeTab === 'login' && (
            <div className="tab-panel active">
              <div className="form-heading">
                <h2>Welcome Back!</h2>
                <p>Sign in to access your barangay services account</p>
              </div>

              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    Email Address <span className="required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="juan@email.com"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Password <span className="required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                </div>

                <a href="#" className="forgot-link">
                  Forgot Password?
                </a>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login to Account'}
                </button>

                <div className="flag-strip">
                  <div className="flag-blue"></div>
                  <div className="flag-red"></div>
                  <div className="flag-gold"></div>
                </div>
                <p className="footer-note">
                  Republic of the Philippines · Barangay Digital Services Platform
                </p>
              </form>
            </div>
          )}

          {/* Register Tab */}
          {activeTab === 'register' && (
            <div className="tab-panel active">
              <div className="form-heading">
                <h2>Create Account</h2>
                <p>Fill in your details to register as a barangay resident</p>
              </div>

              <form onSubmit={handleRegisterSubmit}>
                {/* Section 1: Account Credentials */}
                <div className="form-section">Account Credentials</div>

                <div className="form-group">
                  <label className="form-label">
                    Username <span className="required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. juan123"
                    value={registerData.username}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, username: e.target.value })
                    }
                    required
                  />
                  <div className="field-note">
                    Letters, numbers, and underscores only. Min. 4 characters.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email Address <span className="required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="juan@email.com"
                    value={registerData.email}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Password <span className="required">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, password: e.target.value })
                      }
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Confirm Password <span className="required">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Re-enter password"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Section 2: Personal Information */}
                <div className="form-section">Personal Information</div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      First Name <span className="required">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Juan"
                      value={registerData.firstName}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, firstName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Middle Name</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Santos"
                      value={registerData.middleName}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, middleName: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Last Name <span className="required">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Dela Cruz"
                      value={registerData.lastName}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, lastName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Date of Birth <span className="required">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="date"
                      value={registerData.birthDate}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, birthDate: e.target.value })
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
                        value={registerData.sex}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, sex: e.target.value })
                        }
                        required
                      >
                        <option value="">— Select —</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
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
                    value={registerData.phoneNumber}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, phoneNumber: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Section 3: Residential Address */}
                <div className="form-section">Residential Address</div>

                <div className="form-group">
                  <label className="form-label">
                    House No. / Street / Subdivision <span className="required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. 123 Rizal Street, Poblacion"
                    value={registerData.street}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, street: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Barangay <span className="required">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. Poblacion"
                      value={registerData.barangay}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, barangay: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      City / Municipality <span className="required">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. Quezon City"
                      value={registerData.city}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, city: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Province <span className="required">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. Metro Manila"
                      value={registerData.province}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, province: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZIP Code</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. 1100"
                      value={registerData.zipCode}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, zipCode: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Section 4: Terms & Submit */}
                <div className="form-section">Confirmation</div>

                <div className="checkbox-row">
                  <input type="checkbox" id="terms" required />
                  <label htmlFor="terms">
                    I have read and agree to the <a href="#">Terms of Service</a> and{' '}
                    <a href="#">Privacy Policy</a> of PirmaPH and authorize the use of my
                    personal data for barangay service purposes.
                  </label>
                </div>

                <div className="checkbox-row" style={{ marginTop: '-6px' }}>
                  <input type="checkbox" id="accurate" required />
                  <label htmlFor="accurate">
                    I certify that all information provided is accurate and complete to the
                    best of my knowledge.
                  </label>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '4px' }} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="flag-strip" style={{ marginTop: '22px' }}>
                  <div className="flag-blue"></div>
                  <div className="flag-red"></div>
                  <div className="flag-gold"></div>
                </div>
                <p className="footer-note">
                  Republic of the Philippines · Barangay Digital Services Platform
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
