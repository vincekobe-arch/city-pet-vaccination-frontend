import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/city-pet-vaccination-api';

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    birthdate: '',
    gender: '',
    phone: '',
  });

  const [verificationCode, setVerificationCode]   = useState('');
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState('');
  const [success, setSuccess]                     = useState('');
  const [passwordErrors, setPasswordErrors]       = useState([]);
  const [resendCooldown, setResendCooldown]       = useState(0);
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameError, setUsernameError]         = useState('');
  const [usernameChecking, setUsernameChecking]   = useState(false);
  const [emailError, setEmailError]               = useState('');
  const [emailChecking, setEmailChecking]         = useState(false);
  const [fieldErrors, setFieldErrors]             = useState({});
  const [focusedField, setFocusedField]           = useState(null);
  const [mousePosition, setMousePosition]         = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ── Email availability check ──────────────────────────────
  useEffect(() => {
    const checkEmail = async () => {
      const emailLower = formData.email.toLowerCase().trim();
      if (!emailLower) { setEmailError(''); return; }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailLower)) { setEmailError('Invalid email format'); return; }
      if (!emailLower.split('@')[1]?.endsWith('.com')) { setEmailError('Email domain must end with .com'); return; }

      setEmailChecking(true);
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/check-email.php`, { email: emailLower }, { headers: { 'Content-Type': 'application/json' } });
        setEmailError(res.data.exists ? 'This email is already registered' : '');
      } catch { setEmailError(''); }
      finally { setEmailChecking(false); }
    };

    if (formData.email) {
      const t = setTimeout(checkEmail, 300);
      return () => clearTimeout(t);
    } else { setEmailError(''); }
  }, [formData.email]);

  // ── Username availability check ───────────────────────────
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 8) { setUsernameError(''); return; }
      if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) { setUsernameError('invalid'); return; }

      setUsernameChecking(true);
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/check-username.php`, { username: formData.username }, { headers: { 'Content-Type': 'application/json' } });
        setUsernameError(res.data.exists ? 'taken' : '');
      } catch { }
      finally { setUsernameChecking(false); }
    };

    if (formData.username) {
      const t = setTimeout(checkUsername, 500);
      return () => clearTimeout(t);
    } else { setUsernameError(''); }
  }, [formData.username]);

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8)       errors.push('length');
    if (!/[A-Z]/.test(pwd))   errors.push('uppercase');
    if (!/[a-z]/.test(pwd))   errors.push('lowercase');
    if (!/\d/.test(pwd))      errors.push('number');
    setPasswordErrors(errors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name] && !['first_name', 'middle_name', 'last_name'].includes(name)) setFieldErrors(prev => ({ ...prev, [name]: '' }));
    if (error) setError('');
    if (success) setSuccess('');

    if (name === 'password') {
      validatePassword(value);
      if (value && /\s/.test(value)) setFieldErrors(prev => ({ ...prev, password: 'Password cannot contain spaces' }));
      else if (fieldErrors.password === 'Password cannot contain spaces') setFieldErrors(prev => ({ ...prev, password: '' }));
      if (formData.confirmPassword) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: value !== formData.confirmPassword ? 'Passwords do not match' : '' }));
      }
    }

    if (name === 'confirmPassword') {
      setFieldErrors(prev => ({ ...prev, confirmPassword: value !== formData.password ? 'Passwords do not match' : '' }));
    }

    if (name === 'phone') {
      setFieldErrors(prev => ({ ...prev, phone: value && !/^09\d{9}$/.test(value) ? 'Phone must be 11 digits starting with 09' : '' }));
    }

    if (['first_name', 'middle_name', 'last_name'].includes(name)) {
      if (value && !/^[a-zA-Z.\s-]*$/.test(value)) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Only letters, dots, spaces, and hyphens allowed' }));
      } else if (value && value.startsWith(' ')) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Cannot start with a space' }));
      } else if (value && value.startsWith('-')) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Cannot start with a hyphen' }));
      } else if (value && /\s{2,}/.test(value)) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Cannot contain multiple consecutive spaces' }));
      } else if (value && /--/.test(value)) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Cannot contain consecutive hyphens' }));
      } else {
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const isFormValid = () => {
    const filled =
      formData.username.trim() && formData.email.trim() &&
      formData.password.trim() && formData.confirmPassword.trim() &&
      formData.first_name.trim() && formData.last_name.trim() &&
      formData.birthdate.trim() && formData.gender.trim() &&
      formData.phone.trim();

    const noErrors =
      !usernameError && !emailError &&
      passwordErrors.length === 0 &&
      !fieldErrors.confirmPassword && !fieldErrors.phone &&
      !fieldErrors.password && !fieldErrors.first_name &&
      !fieldErrors.middle_name && !fieldErrors.last_name;

    return filled && formData.password === formData.confirmPassword && noErrors && !usernameChecking && !emailChecking;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailLower = formData.email.toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailLower) || !emailLower.split('@')[1]?.endsWith('.com')) {
      setEmailError('Email domain must end with .com');
      return;
    }
    setEmailError('');
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/register.php`, {
        username: formData.username, email: formData.email,
        password: formData.password, first_name: formData.first_name,
        middle_name: formData.middle_name, last_name: formData.last_name,
        birthdate: formData.birthdate, gender: formData.gender,
        phone: formData.phone,
      }, { headers: { 'Content-Type': 'application/json' } });

      if (res.data.success && res.data.requires_verification) {
        setSuccess('Verification code sent to your email! Please check your inbox.');
        setStep(2);
      } else { throw new Error('Unexpected response from server'); }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to initiate registration';
      setError(msg);
      if (msg.toLowerCase().includes('email already registered')) setEmailError('This email is already registered');
    } finally { setLoading(false); }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/verify-email.php`, {
        email: formData.email, verification_code: verificationCode,
        username: formData.username, password: formData.password,
        first_name: formData.first_name, middle_name: formData.middle_name,
        last_name: formData.last_name, birthdate: formData.birthdate,
        gender: formData.gender, phone: formData.phone,
      }, { headers: { 'Content-Type': 'application/json' } });

      if (res.data.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else { throw new Error(res.data.error || 'Registration failed'); }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally { setLoading(false); }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true); setError(''); setSuccess('');

    try {
      await axios.post(`${API_BASE_URL}/auth/register.php`, {
        username: formData.username, email: formData.email,
        password: formData.password, first_name: formData.first_name,
        middle_name: formData.middle_name, last_name: formData.last_name,
        birthdate: formData.birthdate, gender: formData.gender,
        phone: formData.phone,
      }, { headers: { 'Content-Type': 'application/json' } });

      setSuccess('Verification code resent! Please check your email.');
      setResendCooldown(60);
      const iv = setInterval(() => {
        setResendCooldown(prev => { if (prev <= 1) { clearInterval(iv); return 0; } return prev - 1; });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally { setLoading(false); }
  };

  const pwStrengthColor = () => {
    if (!formData.password) return '#6b7280';
    if (passwordErrors.length > 2) return '#ef4444';
    if (passwordErrors.length > 0) return '#f59e0b';
    return '#10b981';
  };
  const pwStrengthWidth = () => {
    if (!formData.password) return '0%';
    return `${Math.max(25, 100 - passwordErrors.length * 25)}%`;
  };
  const pwStrengthLabel = () => {
    if (!formData.password) return 'No Password';
    if (passwordErrors.length > 2) return 'Weak Password';
    if (passwordErrors.length > 0) return 'Medium Password';
    return 'Strong Password';
  };

  // ── Shared styles ─────────────────────────────────────────
  const inputStyle = (fieldName, extra = {}) => ({
    paddingLeft: '20px', paddingRight: '20px', height: '52px',
    borderRadius: '14px',
    border: fieldErrors[fieldName]
      ? '2px solid #ef4444'
      : focusedField === fieldName
        ? '2px solid #ffc107'
        : '2px solid rgba(0,0,0,0.1)',
    fontSize: '0.95rem',
    background: '#f8f9fa',
    transition: 'all 0.3s',
    fontWeight: '500',
    color: '#1a1a1a',
    ...extra,
  });

  const labelStyle = {
    fontWeight: '600', color: '#1a1a1a',
    fontSize: '0.875rem', marginBottom: '0.5rem',
    display: 'flex', alignItems: 'center',
  };

  const sharedCard = {
    borderRadius: '24px', background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    animation: 'dropDown 0.8s ease-out',
  };

  const sharedPageBg = {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    minHeight: '100vh', position: 'relative', overflow: 'hidden',
  };

  const globalStyles = `
    @keyframes dropDown { 0%{opacity:0;transform:translateY(-40px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes pulse    { 0%,100%{opacity:0.5} 50%{opacity:1} }
    @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    input::placeholder, textarea::placeholder, select::placeholder { color:rgba(0,0,0,0.3)!important; }
    input:-webkit-autofill,input:-webkit-autofill:focus {
      -webkit-box-shadow:0 0 0 1000px #f8f9fa inset!important;
    }
    input[type="password"]::-ms-reveal,input[type="password"]::-ms-clear { display:none; }
    select option { background:#ffffff!important; color:#1a1a1a!important; }
    .req-item { transition:all 0.3s ease; }
  `;

  // ═══════════════════════════════════════════════════════════
  //  STEP 1 – Registration form
  // ═══════════════════════════════════════════════════════════
  if (step === 1) {
    return (
      <div style={{ ...sharedPageBg, padding: '2.5rem 0' }}>
        <style>{globalStyles}</style>

        {/* Ambient blobs */}
        <div style={{ position:'absolute', width:'500px', height:'500px', background:'#ffc107', borderRadius:'50%', opacity:0.08, filter:'blur(100px)', top:'-250px', right:'-250px', animation:'pulse 4s ease-in-out infinite' }} />
        <div style={{ position:'absolute', width:'400px', height:'400px', background:'#3b82f6', borderRadius:'50%', opacity:0.07, filter:'blur(100px)', bottom:'-200px', left:'-200px', animation:'pulse 4s ease-in-out infinite', animationDelay:'2s' }} />

        {/* Mouse glow */}
        <div style={{ position:'absolute', width:'300px', height:'300px', background:'radial-gradient(circle,rgba(255,193,7,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', left:mousePosition.x-150, top:mousePosition.y-150, transition:'left 0.3s,top 0.3s', zIndex:1 }} />

        <Container style={{ position:'relative', zIndex:2, zoom:'0.75' }}>
          <Row className="justify-content-center">
            <Col lg={9} xl={8}>

              <Card className="shadow-lg border-0" style={sharedCard}>
                <Card.Body className="p-5">

                  {/* Back */}
                  <Button variant="link" onClick={() => navigate('/')} className="p-0 mb-4 text-decoration-none"
                    style={{ color:'#555', fontSize:'0.9rem', fontWeight:'600', display:'inline-flex', alignItems:'center', transition:'all 0.3s' }}
                    onMouseOver={e => { e.currentTarget.style.color='#ffc107'; e.currentTarget.style.transform='translateX(-4px)'; }}
                    onMouseOut={e  => { e.currentTarget.style.color='#555';    e.currentTarget.style.transform='translateX(0)'; }}>
                    <i className="fas fa-arrow-left me-2" />Back to Home
                  </Button>

                  {/* Header */}
                  <div className="text-center mb-4">
                    <img src="/logo.png" alt="Logo" style={{ width:'72px', height:'72px', objectFit:'contain', marginBottom:'1rem', filter:'drop-shadow(0 0 20px rgba(255,193,7,0.4))', animation:'float 3s ease-in-out infinite' }}
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                    <div style={{ display:'none' }}><i className="fas fa-paw" style={{ fontSize:'3rem', color:'#ffc107', marginBottom:'1rem' }} /></div>
                    <h3 style={{ fontWeight:'800', fontSize:'1.9rem', color:'#1a1a1a', marginBottom:'0.35rem' }}>
                      Create Account
                    </h3>
                    <p style={{ color:'#9ca3af', fontSize:'0.9rem', marginBottom:0 }}>Join PetUnity – it only takes a minute</p>
                  </div>

                  {error && (
                    <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4"
                      style={{ borderRadius:'14px', border:'2px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.08)', color:'#1a1a1a', animation:'dropDown 0.3s ease-out' }}>
                      <div className="d-flex align-items-start">
                        <i className="fas fa-exclamation-circle me-2 mt-1" style={{ color:'#ef4444' }} />
                        <div>
                          <div style={{ fontWeight:'700', marginBottom:'0.15rem' }}>Registration Error</div>
                          <div style={{ fontSize:'0.875rem', color:'#555' }}>{error}</div>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {success && (
                    <Alert variant="success" className="mb-4"
                      style={{ borderRadius:'14px', border:'2px solid rgba(16,185,129,0.25)', background:'rgba(16,185,129,0.08)', color:'#1a1a1a' }}>
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle me-2 mt-1" style={{ color:'#10b981' }} />
                        <div>
                          <div style={{ fontWeight:'700', marginBottom:'0.15rem' }}>Success</div>
                          <div style={{ fontSize:'0.875rem', color:'#555' }}>{success}</div>
                        </div>
                      </div>
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit}>

                    {/* ── Section: Personal Info ── */}
                    <SectionHeading icon="fa-address-card" label="Personal Information" />

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-user me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />First Name <Req /></Form.Label>
                          <Form.Control type="text" name="first_name" value={formData.first_name} onChange={handleChange}
                            onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onFocus={() => setFocusedField('first_name')} onBlur={(e) => { setFocusedField(null); if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, first_name: 'Cannot end with a hyphen' })); }}
                            placeholder="First name" required disabled={loading}
                            style={inputStyle('first_name')} />
                          <FieldError msg={fieldErrors.first_name} />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-user me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Middle Name</Form.Label>
                          <Form.Control type="text" name="middle_name" value={formData.middle_name} onChange={handleChange}
                            onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onFocus={() => setFocusedField('middle_name')}onBlur={(e) => { setFocusedField(null); if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, middle_name: 'Cannot end with a hyphen' })); }}
                            placeholder="Optional" disabled={loading}
                            style={inputStyle('middle_name')} />
                          <FieldError msg={fieldErrors.middle_name} />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-user me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Last Name <Req /></Form.Label>
                          <Form.Control type="text" name="last_name" value={formData.last_name} onChange={handleChange}
                            onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onFocus={() => setFocusedField('last_name')} onBlur={(e) => { setFocusedField(null); if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, last_name: 'Cannot end with a hyphen' })); }}
                            placeholder="Last name" required disabled={loading}
                            style={inputStyle('last_name')} />
                          <FieldError msg={fieldErrors.last_name} />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-calendar me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Birthdate <Req /></Form.Label>
                          <Form.Control type="date" name="birthdate" value={formData.birthdate} onChange={handleChange}
                            onFocus={() => setFocusedField('birthdate')} onBlur={() => setFocusedField(null)}
                            required disabled={loading} max={new Date().toISOString().split('T')[0]}
                            style={{ ...inputStyle('birthdate'), colorScheme:'light' }} />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-venus-mars me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Gender <Req /></Form.Label>
                          <Form.Select name="gender" value={formData.gender} onChange={handleChange}
                            onFocus={() => setFocusedField('gender')} onBlur={() => setFocusedField(null)}
                            required disabled={loading} style={inputStyle('gender')}>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-0">
                          <Form.Label style={labelStyle}><i className="fas fa-phone me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Phone Number <Req /></Form.Label>
                          <Form.Control type="tel" name="phone" value={formData.phone} onChange={handleChange}
                            onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
            onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
            placeholder="09123456789" required disabled={loading}
                            style={{
                              ...inputStyle('phone'),
                              border: fieldErrors.phone
                                ? '2px solid #ef4444'
                                : (formData.phone && !fieldErrors.phone && /^09\d{9}$/.test(formData.phone))
                                  ? '2px solid #10b981'
                                  : focusedField === 'phone' ? '2px solid #ffc107' : '2px solid rgba(0,0,0,0.1)',
                            }} />
                          <FieldError msg={fieldErrors.phone} />
                        </Form.Group>
                      </Col>
                    </Row>

                    
                    {/* ── Section: Account Info ── */}
                    <SectionHeading icon="fa-user-circle" label="Account Information" />

                    <Row>
                      {/* Username */}
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-user-tag me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Username <Req /></Form.Label>
                          <div style={{ position:'relative' }}>
                            <Form.Control type="text" name="username" value={formData.username} onChange={handleChange}
                              onFocus={() => setFocusedField('username')} onBlur={() => setFocusedField(null)}
                              placeholder="Min. 8 characters" required disabled={loading}
                              style={{
                                ...inputStyle('username'), paddingRight:'3rem',
                                border: usernameError === 'taken'   ? '2px solid #ef4444'
                                      : usernameError === 'invalid' ? '2px solid #f59e0b'
                                      : (formData.username.length >= 8 && !usernameError && !usernameChecking) ? '2px solid #10b981'
                                      : focusedField === 'username' ? '2px solid #ffc107'
                                      : '2px solid rgba(0,0,0,0.1)',
                              }} />
                            <div style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)' }}>
                              {usernameChecking && <Spinner animation="border" size="sm" style={{ color:'#ffc107' }} />}
                              {!usernameChecking && formData.username.length >= 8 && (
                                usernameError === 'taken'            ? <i className="fas fa-times-circle" style={{ color:'#ef4444' }} /> :
                                usernameError === 'invalid' || usernameError === 'letters_required' ? <i className="fas fa-exclamation-circle" style={{ color:'#f59e0b' }} /> :
                                !usernameError                       ? <i className="fas fa-check-circle" style={{ color:'#10b981' }} /> : null
                              )}
                            </div>
                          </div>
                          {usernameError === 'taken'          && <FieldError msg="Username is already taken" />}
                          {usernameError === 'invalid'        && <FieldError msg="Only letters, numbers, and underscores" color="#f59e0b" />}
                          {usernameError === 'letters_required' && <FieldError msg="Username must contain at least one letter" color="#f59e0b" />}
                          {!usernameError && formData.username.length >= 8 && !usernameChecking && <FieldOk msg="Username is available!" />}
                          {!usernameError && formData.username.length > 0 && formData.username.length < 8 && <FieldHint msg="Must be at least 8 characters" />}
                        </Form.Group>
                      </Col>

                      {/* Email */}
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-envelope me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Email Address <Req /></Form.Label>
                          <div style={{ position:'relative' }}>
                            <Form.Control type="email" name="email" value={formData.email} onChange={handleChange}
                              onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                              placeholder="yourname@gmail.com" required disabled={loading}
                              style={{
                                ...inputStyle('email'), paddingRight:'3rem',
                                border: emailError ? '2px solid #ef4444'
                                    : (formData.email && !emailError && !emailChecking && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/.test(formData.email.toLowerCase())) ? '2px solid #10b981'
                                      : focusedField === 'email' ? '2px solid #ffc107'
                                      : '2px solid rgba(0,0,0,0.1)',
                              }} />
                            <div style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)' }}>
                              {emailChecking && <Spinner animation="border" size="sm" style={{ color:'#ffc107' }} />}
                              {!emailChecking && formData.email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/.test(formData.email.toLowerCase()) && (
                                emailError
                                  ? <i className="fas fa-times-circle" style={{ color:'#ef4444' }} />
                                  : <i className="fas fa-check-circle" style={{ color:'#10b981' }} />
                              )}
                            </div>
                          </div>
                          {emailError                           && <FieldError msg={emailError} />}
                          {!emailError && formData.email && !emailChecking && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/.test(formData.email.toLowerCase()) && <FieldOk msg="Email is available!" />}
                          
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      {/* Password */}
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-lock me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Password <Req /></Form.Label>
                          <div style={{ position:'relative' }}>
                            <Form.Control
                              type={showPassword ? 'text' : 'password'}
                              name="password" value={formData.password} onChange={handleChange}
                              onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                              placeholder="Create a strong password" required disabled={loading}
                              style={{ ...inputStyle('password'), paddingRight:'3rem' }} />
                            <EyeToggle show={showPassword} onToggle={() => !loading && setShowPassword(p => !p)} disabled={loading} />
                          </div>
                          <FieldError msg={fieldErrors.password} />

                          {/* Requirements */}
                          <div style={{ marginTop:'0.85rem', padding:'0.9rem 1rem', background:'#f8f9fa', borderRadius:'12px', border:'1.5px solid rgba(0,0,0,0.07)' }}>
                            <small style={{ fontWeight:'700', color:'#ffc107', fontSize:'0.8rem', display:'block', marginBottom:'0.6rem' }}>
                              <i className="fas fa-shield-alt me-1" /> Password Requirements
                            </small>
                            {[
                              { key:'length',    label:'At least 8 characters',   pass: formData.password.length >= 8 },
                              { key:'uppercase', label:'One uppercase letter (A-Z)', pass: /[A-Z]/.test(formData.password) },
                              { key:'lowercase', label:'One lowercase letter (a-z)', pass: /[a-z]/.test(formData.password) },
                              { key:'number',    label:'One number (0-9)',           pass: /\d/.test(formData.password) },
                            ].map(r => (
                              <div key={r.key} className="req-item" style={{ display:'flex', alignItems:'center', color: r.pass ? '#10b981' : '#9ca3af', fontSize:'0.82rem', marginBottom:'0.3rem' }}>
                                <i className={`fas fa-${r.pass ? 'check-circle' : 'circle'} me-2`} style={{ fontSize:'0.85rem' }} />
                                {r.label}
                              </div>
                            ))}
                            {/* Strength bar */}
                            <div style={{ marginTop:'0.7rem', height:'5px', borderRadius:'10px', background:'rgba(0,0,0,0.08)', overflow:'hidden' }}>
                              <div style={{ width: pwStrengthWidth(), height:'100%', background: pwStrengthColor(), borderRadius:'10px', transition:'all 0.4s ease' }} />
                            </div>
                            <small style={{ display:'block', marginTop:'0.4rem', color: pwStrengthColor(), fontWeight:'700', fontSize:'0.78rem', textAlign:'center' }}>
                              {pwStrengthLabel()}
                            </small>
                          </div>
                        </Form.Group>
                      </Col>

                      {/* Confirm Password */}
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label style={labelStyle}><i className="fas fa-lock me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Confirm Password <Req /></Form.Label>
                          <div style={{ position:'relative' }}>
                            <Form.Control
                              type={showConfirmPassword ? 'text' : 'password'}
                              name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                              onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)}
                              placeholder="Repeat your password" required disabled={loading}
                              style={{
                                ...inputStyle('confirmPassword'), paddingRight:'3rem',
                                border: fieldErrors.confirmPassword ? '2px solid #ef4444'
                                      : (formData.confirmPassword && formData.confirmPassword === formData.password) ? '2px solid #10b981'
                                      : focusedField === 'confirmPassword' ? '2px solid #ffc107'
                                      : '2px solid rgba(0,0,0,0.1)',
                              }} />
                            <EyeToggle show={showConfirmPassword} onToggle={() => !loading && setShowConfirmPassword(p => !p)} disabled={loading} />
                          </div>
                          <FieldError msg={fieldErrors.confirmPassword} />
                          {formData.confirmPassword && formData.confirmPassword === formData.password && <FieldOk msg="Passwords match!" />}
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Submit */}
                    <div className="text-center mt-3">
                      <Button type="submit" disabled={loading || !isFormValid()} size="lg" className="border-0"
                        style={{
                          height:'54px', minWidth:'240px', borderRadius:'16px',
                          background: loading || !isFormValid() ? '#d1d5db' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)',
                          color:'#000', fontWeight:'700', fontSize:'1rem',
                          boxShadow: loading || !isFormValid() ? 'none' : '0 8px 24px rgba(255,193,7,0.4)',
                          transition:'all 0.3s',
                        }}
                        onMouseOver={e => { if (!loading && isFormValid()) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(255,193,7,0.6)'; } }}
                        onMouseOut={e  => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(255,193,7,0.4)'; }}>
                        {loading
                          ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Sending Code...</>
                          : <><i className="fas fa-envelope me-2" />Send Verification Code</>}
                      </Button>
                    </div>

                    <hr style={{ margin:'1.75rem 0', opacity:0.12 }} />

                    <div className="text-center">
                      <p style={{ color:'#9ca3af', fontSize:'0.9rem', marginBottom:0 }}>
                        Already have an account?{' '}
                        <Link to="/login" className="text-decoration-none" style={{ color:'#ffc107', fontWeight:'700', transition:'all 0.3s' }}
                          onMouseOver={e => { e.target.style.color='#ffb300'; }}
                          onMouseOut={e  => { e.target.style.color='#ffc107'; }}>
                          Sign In <i className="fas fa-arrow-right ms-1" />
                        </Link>
                      </p>
                    </div>

                  </Form>
                </Card.Body>
              </Card>

              <div className="text-center mt-3">
                <p style={{ color:'#aaa', fontSize:'0.82rem' }}>
                  <i className="fas fa-shield-alt me-2" />Secure and encrypted connection
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 2 – Email verification
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ ...sharedPageBg, display:'flex', alignItems:'center' }}>
      <style>{globalStyles}</style>

      <div style={{ position:'absolute', width:'500px', height:'500px', background:'#ffc107', borderRadius:'50%', opacity:0.08, filter:'blur(100px)', top:'-250px', right:'-250px', animation:'pulse 4s ease-in-out infinite' }} />
      <div style={{ position:'absolute', width:'400px', height:'400px', background:'#3b82f6', borderRadius:'50%', opacity:0.07, filter:'blur(100px)', bottom:'-200px', left:'-200px', animation:'pulse 4s ease-in-out infinite', animationDelay:'2s' }} />
      <div style={{ position:'absolute', width:'300px', height:'300px', background:'radial-gradient(circle,rgba(255,193,7,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', left:mousePosition.x-150, top:mousePosition.y-150, transition:'left 0.3s,top 0.3s', zIndex:1 }} />

      <Container style={{ position:'relative', zIndex:2, zoom:'0.75' }}>
        <Row className="justify-content-center">
          <Col lg={5} md={7}>

            <Card className="shadow-lg border-0" style={sharedCard}>
              <Card.Body className="p-5">

                <div className="text-center mb-4">
                  <i className="fas fa-envelope-open-text" style={{ fontSize:'3rem', color:'#ffc107', filter:'drop-shadow(0 0 16px rgba(255,193,7,0.4))', display:'block', marginBottom:'0.75rem' }} />
                  <h3 style={{ fontWeight:'800', fontSize:'1.85rem', color:'#1a1a1a', marginBottom:'0.4rem' }}>Verify Your Email</h3>
                  <p style={{ color:'#9ca3af', fontSize:'0.9rem', marginBottom:'0.25rem' }}>We sent a 6-digit code to</p>
                  <p style={{ color:'#ffc107', fontWeight:'700', fontSize:'1rem', marginBottom:0 }}>{formData.email}</p>
                </div>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3"
                    style={{ borderRadius:'14px', border:'2px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'#1a1a1a' }}>
                    <div className="d-flex"><i className="fas fa-exclamation-circle me-2 mt-1" style={{ color:'#ef4444' }} /><div><b>Error</b><div style={{ fontSize:'0.875rem', color:'#555' }}>{error}</div></div></div>
                  </Alert>
                )}
                {success && (
                  <Alert variant="success" className="mb-3"
                    style={{ borderRadius:'14px', border:'2px solid rgba(16,185,129,0.2)', background:'rgba(16,185,129,0.07)', color:'#1a1a1a' }}>
                    <div className="d-flex"><i className="fas fa-check-circle me-2 mt-1" style={{ color:'#10b981' }} /><div><b>Success</b><div style={{ fontSize:'0.875rem', color:'#555' }}>{success}</div></div></div>
                  </Alert>
                )}

                <Form onSubmit={handleVerification}>
                  <Form.Group className="mb-4">
                    <Form.Label className="d-block text-center mb-3" style={{ fontWeight:'600', color:'#1a1a1a', fontSize:'0.95rem' }}>
                      <i className="fas fa-key me-2" style={{ color:'#ffc107' }} />Enter 6-Digit Code
                    </Form.Label>
                    <Form.Control type="text"
                      value={verificationCode}
                      onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,6); setVerificationCode(v); if (error) setError(''); }}
                      placeholder="000000" maxLength={6} required disabled={loading}
                      style={{
                        borderRadius:'16px', padding:'1rem',
                        border:'2.5px dashed #ffc107',
                        fontSize:'2.2rem', textAlign:'center',
                        letterSpacing:'1rem', fontWeight:'bold',
                        background:'rgba(255,193,7,0.04)', color:'#ffc107',
                        transition:'all 0.3s',
                      }} />
                    <div className="text-center mt-2">
                      <small style={{ color:'#9ca3af', fontSize:'0.85rem' }}>
                        <i className="fas fa-clock me-1" />Code expires in 15 minutes
                      </small>
                    </div>
                  </Form.Group>

                  <Button type="submit" disabled={loading || verificationCode.length !== 6} className="w-100 border-0 mb-3"
                    style={{
                      height:'52px', borderRadius:'14px',
                      background: loading || verificationCode.length !== 6 ? '#d1d5db' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)',
                      color:'#000', fontWeight:'700', fontSize:'1rem',
                      boxShadow: loading || verificationCode.length !== 6 ? 'none' : '0 8px 24px rgba(255,193,7,0.4)',
                      transition:'all 0.3s',
                    }}
                    onMouseOver={e => { if (!loading && verificationCode.length === 6) e.currentTarget.style.transform='translateY(-2px)'; }}
                    onMouseOut={e  => { e.currentTarget.style.transform='translateY(0)'; }}>
                    {loading
                      ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Verifying...</>
                      : <><i className="fas fa-check-circle me-2" />Verify & Complete Registration</>}
                  </Button>

                  <hr style={{ opacity:0.1 }} />

                  <div className="text-center mb-2">
                    <p style={{ color:'#9ca3af', fontSize:'0.85rem', marginBottom:'0.75rem' }}>Didn't receive the code?</p>
                    <Button variant="link" onClick={handleResendCode} disabled={loading || resendCooldown > 0}
                      className="text-decoration-none"
                      style={{ color: resendCooldown > 0 ? '#9ca3af' : '#ffc107', fontWeight:'600', fontSize:'0.9rem', border:'none', transition:'all 0.3s' }}>
                      {resendCooldown > 0
                        ? <><i className="fas fa-clock me-1" />Resend in {resendCooldown}s</>
                        : <><i className="fas fa-redo me-1" />Resend Verification Code</>}
                    </Button>
                  </div>

                  <div className="text-center">
                    <Button variant="link" onClick={() => { setStep(1); setVerificationCode(''); setError(''); setSuccess(''); }}
                      className="text-decoration-none" style={{ color:'#9ca3af', fontSize:'0.85rem', border:'none', transition:'all 0.3s' }}
                      onMouseOver={e => e.currentTarget.style.color='#ffc107'}
                      onMouseOut={e  => e.currentTarget.style.color='#9ca3af'}>
                      <i className="fas fa-arrow-left me-1" />Back to Registration
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>

            <Card className="mt-3 border-0" style={{ borderRadius:'14px', background:'rgba(255,193,7,0.05)', border:'1px solid rgba(255,193,7,0.15)' }}>
              <Card.Body className="p-3 text-center">
                <small style={{ color:'#9ca3af', fontSize:'0.85rem' }}>
                  <i className="fas fa-info-circle me-1" style={{ color:'#ffc107' }} />Check your spam folder if you don't see the email
                </small>
              </Card.Body>
            </Card>

            <div className="text-center mt-3">
              <p style={{ color:'#aaa', fontSize:'0.82rem' }}><i className="fas fa-shield-alt me-2" />Secure and encrypted connection</p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

// ── Small helper components ────────────────────────────────
const Req = () => <span style={{ color:'#ef4444', marginLeft:'2px' }}>*</span>;

const FieldError = ({ msg, color = '#ef4444' }) =>
  msg ? <small style={{ color, display:'block', marginTop:'0.35rem', fontSize:'0.8rem' }}><i className="fas fa-times-circle me-1" />{msg}</small> : null;

const FieldOk = ({ msg }) =>
  <small style={{ color:'#10b981', display:'block', marginTop:'0.35rem', fontSize:'0.8rem' }}><i className="fas fa-check-circle me-1" />{msg}</small>;

const FieldHint = ({ msg }) =>
  <small style={{ color:'#9ca3af', display:'block', marginTop:'0.35rem', fontSize:'0.8rem' }}><i className="fas fa-info-circle me-1" />{msg}</small>;

const SectionHeading = ({ icon, label }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem', marginTop:'0.5rem' }}>
    <i className={`fas ${icon}`} style={{ color:'#ffc107', fontSize:'0.95rem' }} />
    <span style={{ fontWeight:'700', fontSize:'0.95rem', color:'#1a1a1a' }}>{label}</span>
    <div style={{ flex:1, height:'1px', background:'rgba(0,0,0,0.08)', marginLeft:'0.5rem' }} />
  </div>
);

const EyeToggle = ({ show, onToggle, disabled }) => (
  <div onClick={onToggle} style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
    <i className={`fas fa-eye${show ? '-slash' : ''}`} style={{ color:'#9ca3af', fontSize:'1rem', transition:'color 0.3s' }}
      onMouseOver={e => !disabled && (e.target.style.color='#ffc107')}
      onMouseOut={e  => !disabled && (e.target.style.color='#9ca3af')} />
  </div>
);

export default Register;