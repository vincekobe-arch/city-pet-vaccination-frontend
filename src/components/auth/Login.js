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
  const [banSecondsLeft, setBanSecondsLeft] = useState(0);

  // Countdown timer for login ban
  useEffect(() => {
    if (banSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setBanSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [banSecondsLeft]);

  const formatBanTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const [showForgotModal, setShowForgotModal] = useState(
    () => sessionStorage.getItem('fp_open') === 'true'
  );

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
      const resData = err.response?.data;

      if (err.response?.status === 429 || resData?.banned) {
        // Start or restore the countdown
        const secs = resData?.seconds_left ?? 600;
        setBanSecondsLeft(secs);
      } else if (err.response?.status === 401) {
        const left = resData?.attempts_left;
        const suffix = typeof left === 'number' && left > 0
          ? ` (${left} attempt${left === 1 ? '' : 's'} remaining)`
          : left === 0 ? ' — account is now temporarily locked.' : '';
        setError('Invalid username or password. Please try again.' + suffix);
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

    // Forgot password state lifted into Login
  const [fpStep, setFpStep]               = React.useState(
    () => sessionStorage.getItem('fp_step') || 'email'
  );
  const [fpEmail, setFpEmail]             = React.useState(
    () => sessionStorage.getItem('fp_email') || ''
  );
  const [fpMaskedEmail, setFpMaskedEmail] = React.useState(
    () => sessionStorage.getItem('fp_masked_email') || ''
  );
  const [fpRealEmail, setFpRealEmail] = React.useState(
    () => sessionStorage.getItem('fp_real_email') || ''
  );
  const [fpOtp, setFpOtp]                 = React.useState(
    () => sessionStorage.getItem('fp_otp') || ''
  );
  const [fpNewPw, setFpNewPw]             = React.useState('');
  const [fpConfirmPw, setFpConfirmPw]     = React.useState('');
  const [fpShowNewPw, setFpShowNewPw]     = React.useState(false);
  const [fpShowConfirmPw, setFpShowConfirmPw] = React.useState(false);
  const [fpLoading, setFpLoading]         = React.useState(false);
  const [fpError, setFpError]             = React.useState('');
  const [fpSuccess, setFpSuccess]         = React.useState('');
  const [fpResendCooldown, setFpResendCooldown] = React.useState(0);
  const [fpPwErrors, setFpPwErrors]       = React.useState([]);
  const [fpConfirmErr, setFpConfirmErr]   = React.useState('');
  const [fpFocused, setFpFocused]         = React.useState(null);
  const fpOtpRefs = React.useRef([]);

  // Persist forgot password session so reload restores state
  React.useEffect(() => {
    sessionStorage.setItem('fp_open', showForgotModal ? 'true' : 'false');
  }, [showForgotModal]);

  React.useEffect(() => {
    if (showForgotModal) {
      sessionStorage.setItem('fp_step', fpStep);
      sessionStorage.setItem('fp_email', fpEmail);
      sessionStorage.setItem('fp_masked_email', fpMaskedEmail);
      sessionStorage.setItem('fp_real_email', fpRealEmail);
      sessionStorage.setItem('fp_otp', fpOtp);
    }
  }, [fpStep, fpEmail, fpMaskedEmail, fpRealEmail, fpOtp, showForgotModal]);

  const isForgot = showForgotModal; // alias for readability

  const resetFp = () => {
    setFpStep('email'); setFpEmail(''); setFpMaskedEmail(''); setFpRealEmail(''); setFpOtp('');
    setFpNewPw(''); setFpConfirmPw(''); setFpError(''); setFpSuccess('');
    setFpLoading(false); setFpPwErrors([]); setFpConfirmErr('');
    setFpResendCooldown(0); setFpFocused(null);
    sessionStorage.removeItem('fp_open');
    sessionStorage.removeItem('fp_step');
    sessionStorage.removeItem('fp_email');
    sessionStorage.removeItem('fp_masked_email');
    sessionStorage.removeItem('fp_real_email');
    sessionStorage.removeItem('fp_otp');
  };

  const closeFp = () => { resetFp(); setShowForgotModal(false); };

  /* ── fp helpers ── */
  const fpCheckPassword = (pwd) => {
    const e = [];
    if (pwd.length < 8)      e.push('length');
    if (!/[A-Z]/.test(pwd))  e.push('uppercase');
    if (!/[a-z]/.test(pwd))  e.push('lowercase');
    if (!/\d/.test(pwd))     e.push('number');
    return e;
  };
  const fpStrengthColor = (errs, pwd) => {
    if (!pwd) return '#6b7280';
    if (errs.length > 2) return '#ef4444';
    if (errs.length > 0) return '#f59e0b';
    return '#10b981';
  };
  const fpStrengthLabel = (errs, pwd) => {
    if (!pwd) return '';
    if (errs.length > 2) return 'Weak Password';
    if (errs.length > 0) return 'Medium Password';
    return 'Strong Password';
  };

  /* ── fp otp handlers ── */
  const fpHandleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = fpOtp.split(''); arr[i] = digit || '';
    const next = arr.join('').slice(0, 6);
    setFpOtp(next); if (fpError) setFpError('');
    if (digit && i < 5) fpOtpRefs.current[i + 1]?.focus();
  };
  const fpHandleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !fpOtp[i] && i > 0) {
      fpOtpRefs.current[i - 1]?.focus();
      const arr = fpOtp.split(''); arr[i - 1] = '';
      setFpOtp(arr.join('')); e.preventDefault();
    } else if (e.key === 'ArrowLeft'  && i > 0) fpOtpRefs.current[i - 1]?.focus();
    else if   (e.key === 'ArrowRight' && i < 5) fpOtpRefs.current[i + 1]?.focus();
  };
  const fpHandleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { setFpOtp(pasted); if (fpError) setFpError(''); fpOtpRefs.current[Math.min(pasted.length, 5)]?.focus(); }
  };

  /* ── fp step handlers ── */
  const fpStartResendCooldown = () => {
    setFpResendCooldown(60);
    const iv = setInterval(() => {
      setFpResendCooldown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; });
    }, 1000);
  };
  const fpHandleSendCode = async () => {
    if (!fpEmail.trim()) { setFpError('Please enter your email or username.'); return; }
    setFpLoading(true); setFpError('');
    try {
      const res = await authAPI.forgotPasswordSend(fpEmail.trim().toLowerCase());
      setFpMaskedEmail(res.data.masked_email || fpEmail);
      setFpRealEmail(res.data.real_email || fpEmail.trim().toLowerCase());
      setFpSuccess('Verification code sent!'); setFpStep('otp'); fpStartResendCooldown();
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setFpError('No account found with that email or username.');
      } else if (status === 429) {
        setFpError('Too many attempts. Please try again later.');
      } else {
        setFpError(err.response?.data?.error || 'Failed to send code. Please try again.');
      }
    }
    finally { setFpLoading(false); }
  };
  const fpHandleVerifyOtp = async () => {
    if (fpOtp.length !== 6) { setFpError('Please enter the 6-digit code.'); return; }
    setFpLoading(true); setFpError('');
    try { await authAPI.forgotPasswordVerify(fpRealEmail, fpOtp); setFpSuccess(''); setFpStep('reset'); }
    catch (err) { setFpError(err.response?.data?.error || 'Invalid or expired code.'); }
    finally { setFpLoading(false); }
  };
  const fpHandleResend = async () => {
    if (fpResendCooldown > 0) return;
    setFpLoading(true); setFpError(''); setFpSuccess('');
    try { await authAPI.forgotPasswordSend(fpEmail.trim().toLowerCase()); setFpOtp(''); setFpSuccess('A new code has been sent!'); fpStartResendCooldown(); }
    catch (err) { setFpError(err.response?.data?.error || 'Failed to resend.'); }
    finally { setFpLoading(false); }
  };
  const fpHandleReset = async () => {
    const errs = fpCheckPassword(fpNewPw); setFpPwErrors(errs);
    if (errs.length > 0) { setFpError('Password does not meet the requirements.'); return; }
    if (fpNewPw !== fpConfirmPw) { setFpConfirmErr('Passwords do not match.'); return; }
    setFpLoading(true); setFpError(''); setFpConfirmErr('');
    try {
      await authAPI.forgotPasswordReset(fpRealEmail, fpOtp, fpNewPw);
      setFpStep('done');
      sessionStorage.removeItem('fp_open');
      sessionStorage.removeItem('fp_step');
      sessionStorage.removeItem('fp_email');
      sessionStorage.removeItem('fp_masked_email');
      sessionStorage.removeItem('fp_otp');
    }
    catch (err) {
      const d = err.response?.data;
      setFpError(d?.error === 'same_password' ? (d.message || 'This is your current password.') : (d?.error || 'Reset failed.'));
    } finally { setFpLoading(false); }
  };

  /* ── fp ui helpers ── */
  const fpInp = (field, extra = {}) => ({
    paddingLeft: 20, paddingRight: 20, height: 52, borderRadius: 14,
    border: fpFocused === field ? '2px solid #ffc107' : '2px solid rgba(0,0,0,0.1)',
    fontSize: '0.95rem', background: '#f8f9fa', fontWeight: 500,
    color: '#1a1a1a', transition: 'all 0.3s', width: '100%', ...extra,
  });
  const fpBtn = (disabled) => ({
    height: 52, borderRadius: 14, border: 'none', width: '100%',
    background: disabled ? '#d1d5db' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)',
    color: '#000', fontWeight: 700, fontSize: '1rem', cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 8px 24px rgba(255,193,7,0.35)', transition: 'all 0.3s',
  });

  const fpSteps = { email: 1, otp: 2, reset: 3, done: 4 };
  const fpCurrentStep = fpSteps[fpStep] || 1;

  const WaveDots = ({ color = '#000' }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: '1.05rem' }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: `${delay}s` }} />
      ))}
    </span>
  );

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
        @keyframes dropDown { 0%{opacity:0;transform:translateY(-50px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { 0%{opacity:0} 100%{opacity:1} }
        @keyframes pulse    { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes float    { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
        @keyframes waveDots { 0%,60%,100%{transform:translateY(0);opacity:0.5} 30%{transform:translateY(-6px);opacity:1} }
        @keyframes slideInRight { 0%{opacity:0;transform:translateX(32px) scale(0.98)} 100%{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes slideOutLeft { 0%{opacity:1;transform:translateX(0) scale(1)}        100%{opacity:0;transform:translateX(-32px) scale(0.98)} }
        @keyframes slideInLeft  { 0%{opacity:0;transform:translateX(-32px) scale(0.98)} 100%{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes fadeSlideUp  { 0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)} }
        @media (max-width:991px) { .login-container { padding:1.5rem 1rem !important; align-items:center !important; } }
        @media (max-width:576px) { .login-card-body { padding:1.5rem !important; } }
        input::placeholder { color:rgba(0,0,0,0.4) !important; }
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus {
          -webkit-box-shadow:0 0 0px 1000px #ffffff inset !important;
          -webkit-text-fill-color:#1a1a1a !important; transition:background-color 5000s ease-in-out 0s;
        }
        input[type="password"]::-ms-reveal,input[type="password"]::-ms-clear { display:none; }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-clear-button,
        input[type="password"]::-webkit-inner-spin-button { display:none !important; }
      `}</style>

      {/* Background blobs */}
      <div style={{ position:'absolute', width:'500px', height:'500px', background:'#ffc107', borderRadius:'50%', opacity:0.1, filter:'blur(100px)', top:'-250px', right:'-250px', animation:'pulse 4s ease-in-out infinite' }} />
      <div style={{ position:'absolute', width:'400px', height:'400px', background:'#3b82f6', borderRadius:'50%', opacity:0.1, filter:'blur(100px)', bottom:'-200px', left:'-200px', animation:'pulse 4s ease-in-out infinite', animationDelay:'2s' }} />
      <div style={{ position:'absolute', width:'300px', height:'300px', background:'radial-gradient(circle, rgba(255,193,7,0.15) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none', left:mousePosition.x - 150, top:mousePosition.y - 150, transition:'left 0.3s, top 0.3s', zIndex:1 }} />

      <Container style={{ position:'relative', zIndex:2, zoom:'0.75' }}>
        <Row className="justify-content-center align-items-center">

          {/* ── Left branding ── */}
          <Col
            lg={6}
            className="d-none d-lg-block pe-5"
            style={{
              transition: 'opacity 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s cubic-bezier(0.4,0,0.2,1), max-width 0.55s cubic-bezier(0.4,0,0.2,1), flex 0.55s cubic-bezier(0.4,0,0.2,1), padding 0.55s cubic-bezier(0.4,0,0.2,1)',
              overflow: 'hidden',
              maxWidth: isForgot ? '0%' : '50%',
              flex: isForgot ? '0 0 0%' : '0 0 50%',
              padding: isForgot ? '0' : undefined,
              opacity: isForgot ? 0 : 1,
              transform: isForgot ? 'translateX(-24px)' : 'translateX(0)',
              pointerEvents: isForgot ? 'none' : 'auto',
            }}
          >
            <div style={{ animation: 'dropDown 0.8s ease-out' }}>
              <div className="text-center">
                <img src="/logo.png" alt="Logo"
                  style={{ width:'120px', height:'120px', objectFit:'contain', marginBottom:'2rem', filter:'drop-shadow(0 0 30px rgba(255,193,7,0.5))', animation:'float 3s ease-in-out infinite' }}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                />
                <div style={{ display:'none' }}>
                  <i className="fas fa-paw" style={{ fontSize:'5rem', color:'#ffc107', marginBottom:'2rem', filter:'drop-shadow(0 0 30px rgba(255,193,7,0.5))', animation:'float 3s ease-in-out infinite' }} />
                </div>
              </div>
              <div className="text-center">
                <h1 style={{ fontSize:'3rem', fontWeight:'800', marginBottom:'1.5rem', animation:'dropDown 0.8s ease-out 0.2s backwards' }}>
                  <span style={{ color:'#ffc107' }}>Pet</span><span style={{ color:'#1a1a1a' }}>Unity</span>
                </h1>
              </div>
              <div style={{ animation:'dropDown 0.8s ease-out 0.6s backwards', position:'relative', display:'flex', justifyContent:'center', marginTop:'1rem' }}>
                <div style={{ position:'absolute', width:'160%', height:'160%', top:'-30%', left:'-30%', background:'radial-gradient(ellipse 55% 50% at 50% 52%, rgba(255,193,7,0.18) 0%, rgba(255,193,7,0.07) 50%, transparent 72%)', filter:'blur(38px)', zIndex:0 }} />
                <div style={{ position:'absolute', width:'140%', height:'140%', top:'-20%', left:'-20%', background:'radial-gradient(ellipse 50% 45% at 52% 50%, rgba(255,193,7,0.10) 0%, transparent 65%)', filter:'blur(48px)', zIndex:0 }} />
                <img src="/ads2.png" alt="PetUnity" style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'420px', height:'auto', objectFit:'contain', filter:'drop-shadow(0 16px 32px rgba(255,193,7,0.18)) drop-shadow(0 6px 12px rgba(0,0,0,0.06))' }} />
              </div>
            </div>
          </Col>

          {/* ── Right card (Login / Forgot) ── */}
          <Col
            lg={6}
            xl={5}
            style={{
              transition: 'margin 0.55s cubic-bezier(0.4,0,0.2,1), max-width 0.55s cubic-bezier(0.4,0,0.2,1)',
              margin: isForgot ? '0 auto' : undefined,
            }}
          >
            <Card className="shadow-lg border-0" style={{ borderRadius:'24px', background:'#ffffff', border:'1px solid rgba(0,0,0,0.08)', boxShadow:'0 20px 60px rgba(0,0,0,0.1)', animation:'dropDown 0.8s ease-out 0.3s backwards', overflow:'hidden' }}>
              <Card.Body className="p-4 p-sm-5" style={{ minHeight: 420, position: 'relative', overflow: 'hidden' }}>

                {/* ════ LOGIN PANEL ════ */}
                <div style={{
                  position: isForgot ? 'absolute' : 'relative',
                  top: 0, left: 0, right: 0,
                  opacity: isForgot ? 0 : 1,
                  transform: isForgot ? 'translateX(-28px) scale(0.97)' : 'translateX(0) scale(1)',
                  transition: 'opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1)',
                  pointerEvents: isForgot ? 'none' : 'auto',
                  padding: isForgot ? '2rem 0.5rem' : undefined,
                }}>
                  <Button variant="link" onClick={() => navigate('/')} className="p-0 mb-4 text-decoration-none"
                    style={{ color:'#555', fontSize:'0.9rem', fontWeight:'500', transition:'all 0.3s', display:'inline-flex', alignItems:'center' }}
                    onMouseOver={e => { e.currentTarget.style.color='#ffc107'; e.currentTarget.style.transform='translateX(-5px)'; }}
                    onMouseOut={e  => { e.currentTarget.style.color='#555';    e.currentTarget.style.transform='translateX(0)'; }}
                  >
                    <i className="fas fa-arrow-left me-2" />Back to Home
                  </Button>

                  <div className="text-center mb-4 d-lg-none">
                    <img src="/logo.png" alt="Logo" style={{ width:'80px', height:'80px', objectFit:'contain', marginBottom:'1rem', filter:'drop-shadow(0 0 20px rgba(255,193,7,0.4))' }} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                    <div style={{ display:'none' }}><i className="fas fa-paw" style={{ fontSize:'3.5rem', color:'#ffc107', marginBottom:'1rem' }} /></div>
                  </div>

                  <div className="text-center mb-4">
                    <h3 style={{ fontWeight:'800', fontSize:'2rem', color:'#1a1a1a', marginBottom:'0.5rem' }}>Sign In</h3>
                    <p style={{ fontSize:'0.95rem', color:'#9ca3af' }}>Enter your credentials to continue</p>
                  </div>

                  {banSecondsLeft > 0 && (
                    <Alert variant="warning" className="mb-4"
                      style={{ borderRadius:'16px', border:'2px solid rgba(245,158,11,0.4)', background:'rgba(245,158,11,0.1)', color:'#000', animation:'dropDown 0.3s ease-out' }}>
                      <div className="d-flex align-items-start">
                        <i className="fas fa-clock me-3 mt-1" style={{ fontSize:'1.2rem', color:'#f59e0b' }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:'700', marginBottom:'0.25rem', color:'#92400e' }}>Account Temporarily Locked</div>
                          <div style={{ fontSize:'0.9rem', color:'#78350f' }}>
                            Too many failed attempts. Try again in{' '}
                            <span style={{ fontWeight:'800', fontSize:'1rem', color:'#b45309' }}>{formatBanTime(banSecondsLeft)}</span>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  )}
                  {error && banSecondsLeft <= 0 && (
                    <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4"
                      style={{ borderRadius:'16px', border:'2px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.1)', color:'#000', animation:'dropDown 0.3s ease-out' }}>
                      <div className="d-flex align-items-start">
                        <i className="fas fa-exclamation-circle me-3 mt-1" style={{ fontSize:'1.2rem', color:'#ef4444' }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:'600', marginBottom:'0.25rem' }}>Login Failed</div>
                          <div style={{ fontSize:'0.9rem', color:'#1a1a1a' }}>{error}</div>
                        </div>
                      </div>
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit} autoComplete="off">
                    <Form.Group className="mb-4">
                      <Form.Label style={{ fontWeight:'600', color:'#1a1a1a', fontSize:'0.9rem', marginBottom:'0.75rem', display:'flex', alignItems:'center' }}>
                        <i className="fas fa-user me-2" style={{ color:'#ffc107' }} />Username or Email
                      </Form.Label>
                      <Form.Control type="text" name="username" value={formData.username} onChange={handleChange}
                        onFocus={() => setFocusedField('username')} onBlur={() => setFocusedField(null)}
                        placeholder="Enter your username" required disabled={loading} autoComplete="username"
                        style={{ paddingLeft:'20px', paddingRight:'20px', height:'56px', borderRadius:'16px', border:'2px solid rgba(255,255,255,0.2)', fontSize:'1rem', background:'#ffffff', transition:'all 0.3s', fontWeight:'500', color:'#1a1a1a' }}
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label style={{ fontWeight:'600', color:'#1a1a1a', fontSize:'0.9rem', marginBottom:'0.75rem', display:'flex', alignItems:'center' }}>
                        <i className="fas fa-lock me-2" style={{ color:'#ffc107' }} />Password
                      </Form.Label>
                      <div className="position-relative">
                        <Form.Control type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                          onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                          placeholder="Enter your password" required disabled={loading} autoComplete="current-password"
                          style={{ paddingLeft:'20px', paddingRight:'50px', height:'56px', borderRadius:'16px', border:'2px solid rgba(255,255,255,0.2)', fontSize:'1rem', background:'#ffffff', transition:'all 0.3s', fontWeight:'500', color:'#1a1a1a' }}
                        />
                        <div onClick={() => !loading && setShowPassword(!showPassword)}
                          style={{ position:'absolute', right:'20px', top:'50%', transform:'translateY(-50%)', cursor:loading ? 'not-allowed' : 'pointer', opacity:loading ? 0.5 : 1, transition:'all 0.3s' }}>
                          <i className={`fas fa-eye${showPassword ? '-slash' : ''}`} style={{ color:'#3a3a3a', fontSize:'1.1rem' }}
                            onMouseOver={e => !loading && (e.target.style.color='#ffc107')}
                            onMouseOut={e  => !loading && (e.target.style.color='#9ca3af')}
                          />
                        </div>
                      </div>
                    </Form.Group>

                    <div className="text-end mb-3" style={{ marginTop:'-0.5rem' }}>
                      <button type="button" onClick={() => setShowForgotModal(true)}
                        style={{ background:'none', border:'none', padding:0, color:'#ffc107', fontWeight:600, fontSize:'0.875rem', cursor:'pointer', transition:'all 0.3s' }}
                        onMouseOver={e => { e.currentTarget.style.color='#ffb300'; e.currentTarget.style.textDecoration='underline'; }}
                        onMouseOut={e  => { e.currentTarget.style.color='#ffc107'; e.currentTarget.style.textDecoration='none'; }}
                      >
                        <i className="fas fa-question-circle me-1" />Forgot Password?
                      </button>
                    </div>

                    <Button type="submit" className="w-100 mb-4 border-0" size="lg" disabled={loading || banSecondsLeft > 0}
                      style={{ height:'56px', borderRadius:'16px', background:loading ? '#6b7280' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)', color:'#000', fontWeight:'700', fontSize:'1.05rem', transition:'all 0.3s', boxShadow:loading ? 'none' : '0 8px 24px rgba(255,193,7,0.4)' }}
                      onMouseOver={e => { if (!loading) { e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 12px 32px rgba(255,193,7,0.6)'; } }}
                      onMouseOut={e  => { e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 8px 24px rgba(255,193,7,0.4)'; }}
                    >
                      {loading
                        ? <WaveDots color="#fff" />
                        : <><i className="fas fa-sign-in-alt me-2" />Sign In to Continue</>}
                    </Button>
                  </Form>

                  <div style={{ width:'100%', height:'1px', background:'linear-gradient(90deg,transparent,rgba(0,0,0,0.1),transparent)', marginBottom:'1.5rem' }} />
                  <div className="text-center">
                    <p className="mb-0" style={{ color:'#555', fontSize:'0.95rem' }}>
                      Don't have an account?{' '}
                      <Link to="/register" className="text-decoration-none"
                        style={{ color:'#ffc107', fontWeight:'700', transition:'all 0.3s' }}
                        onMouseOver={e => { e.target.style.color='#ffb300'; e.target.style.textShadow='0 0 20px rgba(255,193,7,0.5)'; }}
                        onMouseOut={e  => { e.target.style.color='#ffc107'; e.target.style.textShadow='none'; }}
                      >
                        Create Account<i className="fas fa-arrow-right ms-2" />
                      </Link>
                    </p>
                  </div>
                </div>

                {/* ════ FORGOT PASSWORD PANEL ════ */}
                <div style={{
                  position: isForgot ? 'relative' : 'absolute',
                  top: 0, left: 0, right: 0,
                  opacity: isForgot ? 1 : 0,
                  transform: isForgot ? 'translateX(0) scale(1)' : 'translateX(28px) scale(0.97)',
                  transition: 'opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1)',
                  pointerEvents: isForgot ? 'auto' : 'none',
                }}>

                  {/* Progress dots */}
                  {fpStep !== 'done' && (
                    <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:'1.5rem' }}>
                      {[1,2,3].map(n => (
                        <div key={n} style={{ width: n === fpCurrentStep ? 24 : 8, height:8, borderRadius:4, background: n <= fpCurrentStep ? '#ffc107' : '#e5e7eb', transition:'all 0.4s ease' }} />
                      ))}
                    </div>
                  )}

                  {/* ── fp: email ── */}
                  {fpStep === 'email' && (
                    <div>
                      <div className="text-center mb-4">
                        <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(255,193,7,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                          <i className="fas fa-lock-open" style={{ fontSize:'1.6rem', color:'#ffc107' }} />
                        </div>
                        <h5 style={{ fontWeight:800, color:'#1a1a1a', marginBottom:'0.3rem' }}>Forgot Password?</h5>
                        <p style={{ color:'#9ca3af', fontSize:'0.875rem', marginBottom:0 }}>Enter your registered email and we'll send a verification code.</p>
                      </div>
                      {fpError && <div style={{ background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.25)', borderRadius:12, padding:'0.7rem 1rem', marginBottom:'1rem', color:'#ef4444', fontSize:'0.85rem', display:'flex', gap:8, alignItems:'center' }}><i className="fas fa-exclamation-circle" />{fpError}</div>}
                      <div style={{ marginBottom:'1.25rem' }}>
                        <label style={{ fontWeight:600, fontSize:'0.875rem', color:'#1a1a1a', display:'flex', alignItems:'center', marginBottom:'0.5rem' }}>
                          <i className="fas fa-user me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Email or Username
                        </label>
                        <input type="text" value={fpEmail}
                          onChange={e => { setFpEmail(e.target.value); if (fpError) setFpError(''); }}
                          onFocus={() => setFpFocused('email')} onBlur={() => setFpFocused(null)}
                          onKeyDown={e => e.key === 'Enter' && fpHandleSendCode()}
                          placeholder="Enter your email or username" disabled={fpLoading}
                          style={fpInp('email')}
                        />
                      </div>
                      <button onClick={fpHandleSendCode} disabled={fpLoading || !fpEmail.trim()} style={fpBtn(fpLoading || !fpEmail.trim())}>
                        {fpLoading ? <WaveDots /> : <><i className="fas fa-paper-plane me-2" />Submit</>}
                      </button>
                      <div className="text-center mt-3">
                        <button onClick={closeFp} style={{ background:'none', border:'none', color:'#9ca3af', fontSize:'0.82rem', cursor:'pointer' }}>
                          <i className="fas fa-arrow-left me-1" />Back to Sign In
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── fp: otp ── */}
                  {fpStep === 'otp' && (
                    <div>
                      <div className="text-center mb-4">
                        <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(255,193,7,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                          <i className="fas fa-envelope-open-text" style={{ fontSize:'1.5rem', color:'#ffc107' }} />
                        </div>
                        <h5 style={{ fontWeight:800, color:'#1a1a1a', marginBottom:'0.3rem' }}>Check Your Email</h5>
                        <p style={{ color:'#9ca3af', fontSize:'0.875rem', marginBottom:'0.25rem' }}>We sent a 6-digit code to</p>
                        <p style={{ color:'#ffc107', fontWeight:700, fontSize:'0.95rem', marginBottom:0 }}>{fpMaskedEmail}</p>
                      </div>
                      {fpSuccess && <div style={{ background:'rgba(16,185,129,0.08)', border:'1.5px solid rgba(16,185,129,0.25)', borderRadius:12, padding:'0.7rem 1rem', marginBottom:'1rem', color:'#10b981', fontSize:'0.85rem', display:'flex', gap:8, alignItems:'center' }}><i className="fas fa-check-circle" />{fpSuccess}</div>}
                      {fpError   && <div style={{ background:'rgba(239,68,68,0.08)',  border:'1.5px solid rgba(239,68,68,0.25)',  borderRadius:12, padding:'0.7rem 1rem', marginBottom:'1rem', color:'#ef4444', fontSize:'0.85rem', display:'flex', gap:8, alignItems:'center' }}><i className="fas fa-exclamation-circle" />{fpError}</div>}
                      <div onPaste={fpHandleOtpPaste} style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:'1.25rem' }}>
                        {[0,1,2,3,4,5].map(i => (
                          <input key={i} ref={el => fpOtpRefs.current[i] = el}
                            type="text" inputMode="numeric" maxLength={1}
                            value={fpOtp[i] || ''} disabled={fpLoading}
                            onChange={e => fpHandleOtpChange(i, e.target.value)}
                            onKeyDown={e => fpHandleOtpKeyDown(i, e)}
                            style={{ width:44, height:52, borderRadius:12, textAlign:'center', fontSize:'1.5rem', fontWeight:'bold', color:'#1a1a1a', border: fpOtp[i] ? '2.5px solid #ffc107' : '2.5px dashed #d1d5db', background:'rgba(255,193,7,0.04)', outline:'none', transition:'all 0.25s' }}
                            onFocus={e => { e.target.style.border='2.5px solid #ffc107'; e.target.style.boxShadow='0 0 0 3px rgba(255,193,7,0.15)'; }}
                            onBlur={e  => { e.target.style.boxShadow='none'; if (!fpOtp[i]) e.target.style.border='2.5px dashed #d1d5db'; }}
                          />
                        ))}
                      </div>
                      <div className="text-center mb-3"><small style={{ color:'#9ca3af', fontSize:'0.82rem' }}><i className="fas fa-clock me-1" />Code expires in 15 minutes</small></div>
                      <button onClick={fpHandleVerifyOtp} disabled={fpLoading || fpOtp.length !== 6} style={fpBtn(fpLoading || fpOtp.length !== 6)}>
                        {fpLoading ? <WaveDots /> : <><i className="fas fa-check-circle me-2" />Verify Code</>}
                      </button>
                      <div className="text-center mt-3">
                        <p style={{ color:'#9ca3af', fontSize:'0.82rem', marginBottom:'0.4rem' }}>Didn't receive it?</p>
                        <button onClick={fpHandleResend} disabled={fpLoading || fpResendCooldown > 0}
                          style={{ background:'none', border:'none', color: fpResendCooldown > 0 ? '#9ca3af' : '#ffc107', fontWeight:600, fontSize:'0.875rem', cursor: fpResendCooldown > 0 ? 'default' : 'pointer' }}>
                          {fpResendCooldown > 0 ? <><i className="fas fa-clock me-1" />Resend in {fpResendCooldown}s</> : <><i className="fas fa-redo me-1" />Resend Code</>}
                        </button>
                      </div>
                      <div className="text-center mt-2">
                        <button onClick={() => { setFpStep('email'); setFpOtp(''); setFpError(''); setFpSuccess(''); }}
                          style={{ background:'none', border:'none', color:'#9ca3af', fontSize:'0.82rem', cursor:'pointer' }}>
                          <i className="fas fa-arrow-left me-1" />Change Email
                        </button>
                      </div>
                      <div className="text-center mt-2">
                        <button onClick={closeFp} style={{ background:'none', border:'none', color:'#9ca3af', fontSize:'0.82rem', cursor:'pointer' }}>
                          <i className="fas fa-times me-1" />Back to Sign In
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── fp: reset ── */}
                  {fpStep === 'reset' && (
                    <div>
                      <div className="text-center mb-4">
                        <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(255,193,7,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                          <i className="fas fa-key" style={{ fontSize:'1.5rem', color:'#ffc107' }} />
                        </div>
                        <h5 style={{ fontWeight:800, color:'#1a1a1a', marginBottom:'0.3rem' }}>New Password</h5>
                        <p style={{ color:'#9ca3af', fontSize:'0.875rem', marginBottom:0 }}>Create a strong password for your account.</p>
                      </div>
                      {fpError && <div style={{ background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.25)', borderRadius:12, padding:'0.7rem 1rem', marginBottom:'1rem', color:'#ef4444', fontSize:'0.85rem', display:'flex', gap:8, alignItems:'center' }}><i className="fas fa-exclamation-circle" />{fpError}</div>}
                      <div style={{ marginBottom:'1rem' }}>
                        <label style={{ fontWeight:600, fontSize:'0.875rem', color:'#1a1a1a', display:'flex', alignItems:'center', marginBottom:'0.5rem' }}>
                          <i className="fas fa-lock me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />New Password
                        </label>
                        <div style={{ position:'relative' }}>
                          <input type={fpShowNewPw ? 'text' : 'password'} value={fpNewPw}
                            onChange={e => { setFpNewPw(e.target.value); setFpPwErrors(fpCheckPassword(e.target.value)); if (fpError) setFpError(''); if (fpConfirmPw) setFpConfirmErr(e.target.value !== fpConfirmPw ? 'Passwords do not match.' : ''); }}
                            onFocus={() => setFpFocused('newPw')} onBlur={() => setFpFocused(null)}
                            placeholder="Create a strong password" disabled={fpLoading} maxLength={64}
                            style={fpInp('newPw', { paddingRight:44 })}
                          />
                          <span onClick={() => setFpShowNewPw(p => !p)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'#9ca3af', fontSize:'1rem' }}>
                            <i className={`fas fa-eye${fpShowNewPw ? '-slash' : ''}`} />
                          </span>
                        </div>
                        {fpNewPw && (
                          <div style={{ marginTop:'0.75rem', padding:'0.8rem 0.9rem', background:'#f8f9fa', borderRadius:12, border:'1.5px solid rgba(0,0,0,0.07)' }}>
                            <small style={{ fontWeight:700, color:'#ffc107', fontSize:'0.78rem', display:'block', marginBottom:'0.5rem' }}><i className="fas fa-shield-alt me-1" />Requirements</small>
                            {[
                              { key:'length',    label:'At least 8 characters',     pass: fpNewPw.length >= 8 },
                              { key:'uppercase', label:'One uppercase letter (A-Z)', pass: /[A-Z]/.test(fpNewPw) },
                              { key:'lowercase', label:'One lowercase letter (a-z)', pass: /[a-z]/.test(fpNewPw) },
                              { key:'number',    label:'One number (0-9)',           pass: /\d/.test(fpNewPw) },
                            ].map(r => (
                              <div key={r.key} style={{ display:'flex', alignItems:'center', color: r.pass ? '#10b981' : '#9ca3af', fontSize:'0.8rem', marginBottom:'0.25rem' }}>
                                <i className={`fas fa-${r.pass ? 'check-circle' : 'circle'} me-2`} style={{ fontSize:'0.8rem' }} />{r.label}
                              </div>
                            ))}
                            <div style={{ marginTop:'0.6rem', height:5, borderRadius:10, background:'rgba(0,0,0,0.08)', overflow:'hidden' }}>
                              <div style={{ width: !fpNewPw ? '0%' : `${Math.max(25, 100 - fpPwErrors.length * 25)}%`, height:'100%', borderRadius:10, transition:'all 0.4s', background: fpStrengthColor(fpPwErrors, fpNewPw) }} />
                            </div>
                            <small style={{ display:'block', marginTop:'0.3rem', color: fpStrengthColor(fpPwErrors, fpNewPw), fontWeight:700, fontSize:'0.76rem', textAlign:'center' }}>{fpStrengthLabel(fpPwErrors, fpNewPw)}</small>
                          </div>
                        )}
                      </div>
                      <div style={{ marginBottom:'1.25rem' }}>
                        <label style={{ fontWeight:600, fontSize:'0.875rem', color:'#1a1a1a', display:'flex', alignItems:'center', marginBottom:'0.5rem' }}>
                          <i className="fas fa-lock me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Confirm Password
                        </label>
                        <div style={{ position:'relative' }}>
                          <input type={fpShowConfirmPw ? 'text' : 'password'} value={fpConfirmPw}
                            onChange={e => { setFpConfirmPw(e.target.value); setFpConfirmErr(e.target.value !== fpNewPw ? 'Passwords do not match.' : ''); }}
                            onFocus={() => setFpFocused('confirmPw')} onBlur={() => setFpFocused(null)}
                            placeholder="Repeat your password" disabled={fpLoading} maxLength={64}
                            style={fpInp('confirmPw', { paddingRight:44, border: fpConfirmErr ? '2px solid #ef4444' : (fpConfirmPw && fpConfirmPw === fpNewPw) ? '2px solid #10b981' : fpFocused === 'confirmPw' ? '2px solid #ffc107' : '2px solid rgba(0,0,0,0.1)' })}
                          />
                          <span onClick={() => setFpShowConfirmPw(p => !p)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'#9ca3af', fontSize:'1rem' }}>
                            <i className={`fas fa-eye${fpShowConfirmPw ? '-slash' : ''}`} />
                          </span>
                        </div>
                        {fpConfirmErr && <small style={{ color:'#ef4444', display:'block', marginTop:'0.35rem', fontSize:'0.8rem' }}><i className="fas fa-times-circle me-1" />{fpConfirmErr}</small>}
                        {fpConfirmPw && fpConfirmPw === fpNewPw && <small style={{ color:'#10b981', display:'block', marginTop:'0.35rem', fontSize:'0.8rem' }}><i className="fas fa-check-circle me-1" />Passwords match!</small>}
                      </div>
                      <button onClick={fpHandleReset} disabled={fpLoading || fpPwErrors.length > 0 || !fpNewPw || !fpConfirmPw || !!fpConfirmErr} style={fpBtn(fpLoading || fpPwErrors.length > 0 || !fpNewPw || !fpConfirmPw || !!fpConfirmErr)}>
                        {fpLoading ? <WaveDots /> : <><i className="fas fa-save me-2" />Reset Password</>}
                      </button>
                      <div className="text-center mt-3">
                        <button onClick={closeFp} style={{ background:'none', border:'none', color:'#9ca3af', fontSize:'0.82rem', cursor:'pointer' }}>
                          <i className="fas fa-times me-1" />Back to Sign In
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── fp: done ── */}
                  {fpStep === 'done' && (
                    <div className="text-center" style={{ padding:'1rem 0' }}>
                      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(16,185,129,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
                        <i className="fas fa-check-circle" style={{ fontSize:'2rem', color:'#10b981' }} />
                      </div>
                      <h5 style={{ fontWeight:800, color:'#1a1a1a', marginBottom:'0.5rem' }}>Password Reset!</h5>
                      <p style={{ color:'#9ca3af', fontSize:'0.875rem', marginBottom:'1.5rem' }}>
                        Your password has been updated successfully.<br />You can now sign in with your new password.
                      </p>
                      <button onClick={closeFp} style={fpBtn(false)}>
                        <i className="fas fa-sign-in-alt me-2" />Go to Sign In
                      </button>
                    </div>
                  )}

                </div>
              </Card.Body>
            </Card>

            <div className="text-center mt-4">
              <p style={{ color:'#888', fontSize:'0.85rem' }}>
                <i className="fas fa-shield-alt me-2" />Secure and encrypted connection
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;