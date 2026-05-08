import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, handleAPIError } from '../../services/api';
import { setAuth } from '../../utils/auth';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);
      
      const { token, user, user_details } = response.data;
console.log('LOGIN RESPONSE:', JSON.stringify(response.data, null, 2));
console.log('USER DETAILS:', JSON.stringify(response.data.user_details, null, 2));

if (!token || !user) {
  setError('Invalid response from server');
  setFormData(prev => ({ ...prev, password: '' }));
  return;
}


const mergedUser = {
  ...user,
  first_name: user_details?.first_name || user?.first_name || '',
  last_name: user_details?.last_name || user?.last_name || '',
  office_role: user_details?.office_role || null,
  clinic_name: user_details?.clinic_name || user?.clinic_name || null,
  clinic_owner_name: user_details?.owner_name || user?.clinic_owner_name || null,
  verification_status: user_details?.verification_status || null,
};

setAuth(token, mergedUser);

if (onLogin) {
  onLogin(mergedUser);
}
      
    } catch (err) {
      console.error('Login error:', err);
      const { message } = handleAPIError(err);
      
      if (err.response?.status === 401) {
        setError('Invalid username or password. Please try again.');
      } else if (err.response?.status === 403) {
        setError('Your account has been deactivated. Please contact support.');
      } else {
        setError(message || 'Login failed. Please check your credentials and try again.');
      }
      
      setFormData(prev => ({ 
        username: prev.username,
        password: ''
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="login-container"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '2rem 0',
      }}
    >
      <style>{`
        @keyframes dropDown {
          0% {
            opacity: 0;
            transform: translateY(-50px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @media (max-width: 991px) {
          .login-container {
            padding: 1.5rem 1rem !important;
            align-items: center !important;
          }
        }
        @media (max-width: 576px) {
          .login-card-body {
            padding: 1.5rem !important;
          }
        }
        input::placeholder {
          color: rgba(0, 0, 0, 0.4) !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          -webkit-text-fill-color: #1a1a1a !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .glow-effect {
          box-shadow: 0 0 20px rgba(255, 193, 7, 0.3), 0 0 40px rgba(255, 193, 7, 0.2);
        }
        
        /* Hide browser's default password reveal button */
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-clear-button,
        input[type="password"]::-webkit-inner-spin-button {
          display: none !important;
        }
        /* Hide Edge's password reveal button */
        input[type="password"]::-ms-reveal {
          display: none !important;
        }
        /* Ensure text type also hides these when toggled */
        input[type="text"]::-ms-reveal,
        input[type="text"]::-ms-clear {
          display: none;
        }
      `}</style>

      {/* Animated Background Elements */}
      <div 
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: '#ffc107',
          borderRadius: '50%',
          opacity: 0.1,
          filter: 'blur(100px)',
          top: '-250px',
          right: '-250px',
          animation: 'pulse 4s ease-in-out infinite'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: '#3b82f6',
          borderRadius: '50%',
          opacity: 0.1,
          filter: 'blur(100px)',
          bottom: '-200px',
          left: '-200px',
          animation: 'pulse 4s ease-in-out infinite',
          animationDelay: '2s'
        }}
      />

      {/* Mouse-following gradient effect */}
      <div 
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255, 193, 7, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          left: mousePosition.x - 150,
          top: mousePosition.y - 150,
          transition: 'left 0.3s, top 0.3s',
          zIndex: 1
        }}
      />

      <Container style={{ position: 'relative', zIndex: 2, zoom: '0.75' }}>
        <Row className="justify-content-center align-items-center">
          {/* Left Side - Branding */}
          <Col lg={6} className="d-none d-lg-block pe-5">
            <div style={{ animation: 'dropDown 0.8s ease-out' }}>
              <div className="text-center">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    objectFit: 'contain',
                    marginBottom: '2rem',
                    filter: 'drop-shadow(0 0 30px rgba(255, 193, 7, 0.5))',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }}>
                  <i 
                    className="fas fa-paw" 
                    style={{ 
                      fontSize: '5rem',
                      color: '#ffc107',
                      marginBottom: '2rem',
                      filter: 'drop-shadow(0 0 30px rgba(255, 193, 7, 0.5))',
                      animation: 'float 3s ease-in-out infinite'
                    }}
                  />
                </div>
              </div>
                            <div className="text-center">

              <h1 
                style={{
                  fontSize: '3rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  marginBottom: '1.5rem',
                  animation: 'dropDown 0.8s ease-out 0.2s backwards'
                }}
              >
                 <span style={{ color: '#ffc107' }}>Pet</span><span style={{ color: '#1a1a1a' }}>Unity</span>
                 

              </h1>
              </div>
              

              <div style={{ animation: 'dropDown 0.8s ease-out 0.6s backwards', position: 'relative', display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                {/* Paint spill blob */}
                <div style={{
                  position: 'absolute',
                  width: '120%',
                  height: '120%',
                  background: 'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(255, 193, 7, 0.22) 0%, rgba(255, 193, 7, 0.1) 45%, transparent 75%)',
                  filter: 'blur(18px)',
                  borderRadius: '60% 40% 55% 45% / 45% 55% 45% 55%',
                  transform: 'rotate(-4deg) scale(1.1)',
                  zIndex: 0
                }} />
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  background: 'radial-gradient(ellipse 70% 60% at 55% 50%, rgba(255, 193, 7, 0.15) 0%, transparent 70%)',
                  filter: 'blur(22px)',
                  borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%',
                  transform: 'rotate(6deg)',
                  zIndex: 0
                }} />
                <img
                  src="/ads2.png"
                  alt="PetUnity"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    maxWidth: '420px',
                    height: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 16px 32px rgba(255, 193, 7, 0.18)) drop-shadow(0 6px 12px rgba(0,0,0,0.06))'
                    
                  }}
                />
              </div>
            </div>
          </Col>

          {/* Right Side - Login Form */}
          <Col lg={6} xl={5}>
            <Card 
              className="shadow-lg border-0"
              style={{
                borderRadius: '24px',
                background: '#ffffff',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                animation: 'dropDown 0.8s ease-out 0.3s backwards'
              }}
            >
              <Card.Body className="p-4 p-sm-5">
                {/* Back Button */}
                <Button
                  variant="link"
                  onClick={() => navigate('/')}
                  className="p-0 mb-4 text-decoration-none"
                  style={{
                    color: '#555555',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#ffc107';
                    e.currentTarget.style.transform = 'translateX(-5px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '#555555';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  Back to Home
                </Button>

                {/* Mobile Logo */}
                <div className="text-center mb-4 d-lg-none">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      objectFit: 'contain',
                      marginBottom: '1rem',
                      filter: 'drop-shadow(0 0 20px rgba(255, 193, 7, 0.4))'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div style={{ display: 'none' }}>
                    <i 
                      className="fas fa-paw" 
                      style={{ 
                        fontSize: '3.5rem',
                        color: '#ffc107',
                        marginBottom: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div className="text-center mb-4">
                  <h3 
                    style={{ 
                      fontWeight: '800',
                      fontSize: '2rem',
                      color: '#1a1a1a',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Sign In
                  </h3>
                  <p style={{ fontSize: '0.95rem', color: '#9ca3af' }}>
                    Enter your credentials to continue
                  </p>
                </div>

                {error && (
                  <Alert 
                    variant="danger" 
                    dismissible
                    onClose={() => setError('')}
                    className="mb-4"
                    style={{
                      borderRadius: '16px',
                      border: '2px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      backdropFilter: 'blur(10px)',
                      color: '#000000',
                      animation: 'dropDown 0.3s ease-out'
                    }}
                  >
                    <div className="d-flex align-items-start">
                      <i className="fas fa-exclamation-circle me-3 mt-1" style={{ fontSize: '1.2rem', color: '#ef4444' }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Login Failed</div>
                        <div style={{ fontSize: '0.9rem', color: '#fca5a5' }}>
                          {error}
                        </div>
                      </div>
                    </div>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit} autoComplete="off">
                  <Form.Group className="mb-4">
                    <Form.Label 
                      style={{ 
                        fontWeight: '600',
                        color: '#1a1a1a',
                        fontSize: '0.9rem',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <i className="fas fa-user me-2" style={{ color: '#ffc107' }}></i>
                      Username or Email
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
  type="text"
  name="username"
  value={formData.username}
  onChange={handleChange}
  onFocus={() => setFocusedField('username')}
  onBlur={() => setFocusedField(null)}
  placeholder="Enter your username"
  required
  disabled={loading}
  autoComplete="username"
  style={{
    paddingLeft: '20px',
    paddingRight: '20px',
    height: '56px',
    borderRadius: '16px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    fontSize: '1rem',
    background: 'rgba(128, 128, 128, 0.3)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s',
    fontWeight: '500',
    color: '#1a1a1a',
    background: '#ffffff',
  }}
/>
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label 
                      style={{ 
                        fontWeight: '600',
                        color: '#1a1a1a',
                        fontSize: '0.9rem',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <i className="fas fa-lock me-2" style={{ color: '#ffc107' }}></i>
                      Password
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
  type={showPassword ? "text" : "password"}
  name="password"
  value={formData.password}
  onChange={handleChange}
  onFocus={() => setFocusedField('password')}
  onBlur={() => setFocusedField(null)}
  placeholder="Enter your password"
  required
  disabled={loading}
  autoComplete="current-password"
  style={{
    paddingLeft: '20px',
    paddingRight: '50px',
    height: '56px',
    borderRadius: '16px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    fontSize: '1rem',
    background: 'rgba(128, 128, 128, 0.3)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s',
    fontWeight: '500',
    color: '#1a1a1a',
    background: '#ffffff',
  }}
/>
                      <div
                        onClick={() => !loading && setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '20px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.5 : 1,
                          transition: 'all 0.3s'
                        }}
                      >
                        <i 
                          className={`fas fa-eye${showPassword ? '-slash' : ''}`}
                          style={{
                            color: '#3a3a3aff',
                            fontSize: '1.1rem',
                            transition: 'color 0.3s'
                          }}
                          onMouseOver={(e) => !loading && (e.target.style.color = '#ffc107')}
                          onMouseOut={(e) => !loading && (e.target.style.color = '#9ca3af')}
                        />
                      </div>
                    </div>
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100 mb-4 border-0"
                    size="lg"
                    disabled={loading}
                    style={{
                      height: '56px',
                      borderRadius: '16px',
                      background: loading ? '#6b7280' : 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)',
                      color: '#000000',
                      fontWeight: '700',
                      fontSize: '1.05rem',
                      transition: 'all 0.3s',
                      boxShadow: loading ? 'none' : '0 8px 24px rgba(255, 193, 7, 0.4)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseOver={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 12px 32px rgba(255, 193, 7, 0.6)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 8px 24px rgba(255, 193, 7, 0.4)';
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          className="me-2"
                          style={{ color: '#ffffff' }}
                        />
                        <span style={{ color: '#ffffff' }}>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Sign In to Continue
                      </>
                    )}
                  </Button>
                </Form>

                <div 
                  style={{
                    width: '100%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)',
                    marginBottom: '1.5rem'
                  }}
                />

                <div className="text-center">
                  <p className="mb-0" style={{ color: '#555555', fontSize: '0.95rem' }}>
                    Don't have an account?{' '}
                    <Link 
                      to="/register" 
                      className="text-decoration-none"
                      style={{
                        color: '#ffc107',
                        fontWeight: '700',
                        transition: 'all 0.3s',
                        position: 'relative'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.color = '#ffb300';
                        e.target.style.textShadow = '0 0 20px rgba(255, 193, 7, 0.5)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.color = '#ffc107';
                        e.target.style.textShadow = 'none';
                      }}
                    >
                      Create Account
                      <i className="fas fa-arrow-right ms-2"></i>
                    </Link>
                  </p>
                </div>
              </Card.Body>
            </Card>

            <div className="text-center mt-4">
              <p style={{ color: '#888888', fontSize: '0.85rem' }}>
                <i className="fas fa-shield-alt me-2"></i>
                Secure and encrypted connection
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;