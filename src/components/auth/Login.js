import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authAPI, handleAPIError } from '../../services/api';
import { setAuth } from '../../utils/auth';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost/city-pet-vaccination-api'
  : 'https://api.petunity-muntinlupacity.com';

// ── small reusable helpers (same style as Register) ──────
const WaveDots = ({ color = '#666' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '1.05rem' }}>
    {[0, 0.15, 0.3].map((d, i) => (
      <span key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: `${d}s` }} />
    ))}
  </span>
);

const FieldError = ({ msg }) =>
  msg ? <small style={{ color: '#ef4444', display: 'block', marginTop: '0.35rem', fontSize: '0.8rem' }}><i className="fas fa-times-circle me-1" />{msg}</small> : null;

const FieldOk = ({ msg }) =>
  <small style={{ color: '#10b981', display: 'block', marginTop: '0.35rem', fontSize: '0.8rem' }}><i className="fas fa-check-circle me-1" />{msg}</small>;

const EyeToggle = ({ show, onToggle, disabled }) => (
  <div onClick={onToggle} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
    <i className={`fas fa-eye${show ? '-slash' : ''}`} style={{ color: '#3a3a3aff', fontSize: '1.1rem', transition: 'color 0.3s' }}
      onMouseOver={e => !disabled && (e.target.style.color = '#ffc107')}
      onMouseOut={e => !disabled && (e.target.style.color = '#9ca3af')} />
  </div>
);

// ── Password requirement checker (same as Register) ──────
const PW_RULES = [
  { key: 'length',    label: 'At least 8 characters',    test: p => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter (A-Z)', test: p => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter (a-z)', test: p => /[a-z]/.test(p) },
  { key: 'number',    label: 'One number (0-9)',           test: p => /\d/.test(p) },
];
const pwErrors = p => PW_RULES.filter(r => !r.test(p));
const pwColor  = p => { const e = pwErrors(p).length; return !p ? '#6b7280' : e > 2 ? '#ef4444' : e > 0 ? '#f59e0b' : '#10b981'; };
const pwWidth  = p => !p ? '0%' : `${Math.max(25, 100 - pwErrors(p).length * 25)}%`;
const pwLabel  = p => !p ? 'No Password' : pwErrors(p).length > 2 ? 'Weak Password' : pwErrors(p).length > 0 ? 'Medium Password' : 'Strong Password';

// ── FORGOT PASSWORD MODAL (3 steps inline) ───────────────
const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep]               = useState(1); // 1=email, 2=otp, 3=newpw
  const [email, setEmail]             = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp]                 = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showCPw, setShowCPw]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [cooldown, setCooldown]       = useState(0);
  const otpRefs = React.useRef([]);

  // cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const inputBase = (err) => ({
    paddingLeft: '20px', paddingRight: '20px', height: '52px',
    borderRadius: '14px',
    border: err ? '2px solid #ef4444' : '2px solid rgba(0,0,0,0.1)',
    fontSize: '0.95rem', background: '#f8f9fa', color: '#1a1a1a',
    fontWeight: '500', transition: 'all 0.3s', width: '100%',
    outline: 'none', boxSizing: 'border-box',
  });

  // STEP 1 — send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/forgot-password.php`, { email });
      setMaskedEmail(res.data.masked_email || email.replace(/(?<=.).(?=[^@]*@)/g, '*'));
      setSuccess('Verification code sent to your email!');
      setStep(2);
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Try again.');
    } finally { setLoading(false); }
  };

  // OTP box handlers
  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = otp.split('');
    arr[i] = digit || '';
    const next = arr.join('').slice(0, 6);
    setOtp(next);
    if (error) setError('');
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const arr = otp.split(''); arr[i - 1] = '';
      setOtp(arr.join(''));
      otpRefs.current[i - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft'  && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p) { setOtp(p); otpRefs.current[Math.min(p.length, 5)]?.focus(); }
  };

  // STEP 2 — verify OTP (just go to step 3; actual verify on submit)
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError(''); setStep(3);
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password.php`, { email });
      setSuccess('New code sent!');
      setCooldown(60);
    } catch { setError('Failed to resend. Try again.'); }
    finally { setLoading(false); }
  };

  // STEP 3 — reset password
  const handleReset = async (e) => {
    e.preventDefault();
    if (pwErrors(newPw).length > 0) { setError('Password does not meet requirements.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password.php`, {
        email, verification_code: otp, new_password: newPw,
      });
      setSuccess('Password reset successfully! You can now sign in.');
      setTimeout(onClose, 2500);
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (msg === 'same_password') setError('That's your current password. Try a different one.');
      else setError(msg || 'Reset failed. Please try again.');
    } finally { setLoading(false); }
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.2s ease-out',
    padding: '1rem',
  };

  const cardStyle = {
    background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '440px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
    animation: 'modalSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    overflow: 'hidden',
  };

  const headerBar = {
    background: 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)',
    padding: '1.25rem 1.5rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };

  const body = { padding: '1.75rem 1.75rem 2rem' };

  const stepIcons = ['fa-envelope', 'fa-key', 'fa-lock'];
  const stepTitles = ['Forgot Password', 'Enter OTP Code', 'New Password'];

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {step > 1 && (
              <button onClick={() => { setStep(s => s - 1); setError(''); setSuccess(''); }}
                style={{ background: 'rgba(0,0,0,0.12)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: '#000', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background='rgba(0,0,0,0.22)'}
                onMouseOut={e => e.currentTarget.style.background='rgba(0,0,0,0.12)'}>
                <i className="fas fa-arrow-left" />
              </button>
            )}
            <i className={`fas ${stepIcons[step - 1]}`} style={{ fontSize: '1.1rem', color: '#000' }} />
            <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#000' }}>{stepTitles[step - 1]}</span>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.12)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: '#000', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background='rgba(0,0,0,0.22)'}
            onMouseOut={e => e.currentTarget.style.background='rgba(0,0,0,0.12)'}>
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', padding: '0 1.75rem', paddingTop: '1.25rem', gap: '0.4rem' }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: '4px', borderRadius: '4px', background: s <= step ? 'linear-gradient(90deg,#ffc107,#ffb300)' : 'rgba(0,0,0,0.08)', transition: 'background 0.4s ease' }} />
          ))}
        </div>

        <div style={body}>
          {/* Alerts */}
          {error && (
            <div style={{ borderRadius: '12px', border: '2px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', animation: 'dropDown 0.3s ease-out' }}>
              <i className="fas fa-exclamation-circle" style={{ color: '#ef4444', marginTop: '2px' }} />
              <span style={{ fontSize: '0.875rem', color: '#1a1a1a' }}>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ borderRadius: '12px', border: '2px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.07)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <i className="fas fa-check-circle" style={{ color: '#10b981', marginTop: '2px' }} />
              <span style={{ fontSize: '0.875rem', color: '#1a1a1a' }}>{success}</span>
            </div>
          )}

          {/* ── STEP 1: Email ── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp}>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Enter your registered email address and we'll send you a 6-digit verification code.
              </p>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <i className="fas fa-envelope" style={{ color: '#ffc107', fontSize: '0.8rem' }} /> Email Address
              </label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="yourname@gmail.com" required disabled={loading}
                style={inputBase(false)}
                onFocus={e => e.target.style.border = '2px solid #ffc107'}
                onBlur={e => e.target.style.border = '2px solid rgba(0,0,0,0.1)'}
              />
              <button type="submit" disabled={loading || !email.trim()} style={{
                marginTop: '1.25rem', width: '100%', height: '50px', borderRadius: '14px', border: 'none',
                background: loading || !email.trim() ? '#d1d5db' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)',
                color: '#000', fontWeight: '700', fontSize: '1rem', cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                boxShadow: loading || !email.trim() ? 'none' : '0 8px 24px rgba(255,193,7,0.35)', transition: 'all 0.3s',
              }}>
                {loading ? <WaveDots /> : <><i className="fas fa-paper-plane me-2" />Send Verification Code</>}
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem', textAlign: 'center' }}>
                We sent a code to
              </p>
              <p style={{ color: '#ffc107', fontWeight: '700', fontSize: '1rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                {maskedEmail}
              </p>
              <div onPaste={handleOtpPaste} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[0,1,2,3,4,5].map(i => (
                  <input key={i} ref={el => otpRefs.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1}
                    value={otp[i] || ''} disabled={loading}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    style={{ width: '46px', height: '54px', borderRadius: '12px', border: otp[i] ? '2.5px solid #ffc107' : '2.5px dashed #d1d5db', fontSize: '1.6rem', fontWeight: '700', textAlign: 'center', background: 'rgba(255,193,7,0.04)', color: '#1a1a1a', outline: 'none', transition: 'all 0.3s' }}
                    onFocus={e => { e.target.style.border = '2.5px solid #ffc107'; e.target.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.15)'; }}
                    onBlur={e => { e.target.style.boxShadow = 'none'; if (!otp[i]) e.target.style.border = '2.5px dashed #d1d5db'; }}
                  />
                ))}
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.82rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                <i className="fas fa-clock me-1" />Code expires in 15 minutes
              </p>
              <button type="submit" disabled={loading || otp.length !== 6} style={{
                width: '100%', height: '50px', borderRadius: '14px', border: 'none',
                background: otp.length !== 6 ? '#d1d5db' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)',
                color: '#000', fontWeight: '700', fontSize: '1rem', cursor: otp.length !== 6 ? 'not-allowed' : 'pointer',
                boxShadow: otp.length !== 6 ? 'none' : '0 8px 24px rgba(255,193,7,0.35)', transition: 'all 0.3s',
              }}>
                {loading ? <WaveDots /> : <><i className="fas fa-check me-2" />Verify Code</>}
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button type="button" onClick={handleResend} disabled={cooldown > 0 || loading}
                  style={{ background: 'none', border: 'none', color: cooldown > 0 ? '#9ca3af' : '#ffc107', fontWeight: '600', fontSize: '0.875rem', cursor: cooldown > 0 ? 'not-allowed' : 'pointer', transition: 'color 0.3s' }}>
                  {cooldown > 0 ? <><i className="fas fa-clock me-1" />Resend in {cooldown}s</> : <><i className="fas fa-redo me-1" />Resend Code</>}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 3 && (
            <form onSubmit={handleReset}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                Create a strong new password for your account.
              </p>

              {/* New Password */}
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <i className="fas fa-lock" style={{ color: '#ffc107', fontSize: '0.8rem' }} /> New Password
              </label>
              <div style={{ position: 'relative', marginBottom: '0.25rem' }}>
                <input type={showPw ? 'text' : 'password'} value={newPw}
                  onChange={e => { setNewPw(e.target.value); setError(''); }}
                  placeholder="Create a strong password" required disabled={loading}
                  style={{ ...inputBase(false), paddingRight: '48px' }}
                  onFocus={e => e.target.style.border = '2px solid #ffc107'}
                  onBlur={e => e.target.style.border = '2px solid rgba(0,0,0,0.1)'}
                />
                <EyeToggle show={showPw} onToggle={() => setShowPw(p => !p)} disabled={loading} />
              </div>

              {/* Requirements */}
              <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', background: '#f8f9fa', borderRadius: '12px', border: '1.5px solid rgba(0,0,0,0.07)' }}>
                <small style={{ fontWeight: '700', color: '#ffc107', fontSize: '0.78rem', display: 'block', marginBottom: '0.5rem' }}>
                  <i className="fas fa-shield-alt me-1" /> Requirements
                </small>
                {PW_RULES.map(r => {
                  const pass = r.test(newPw);
                  return (
                    <div key={r.key} style={{ display: 'flex', alignItems: 'center', color: pass ? '#10b981' : '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <i className={`fas fa-${pass ? 'check-circle' : 'circle'} me-2`} style={{ fontSize: '0.8rem' }} />{r.label}
                    </div>
                  );
                })}
                <div style={{ marginTop: '0.6rem', height: '4px', borderRadius: '10px', background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: pwWidth(newPw), height: '100%', background: pwColor(newPw), borderRadius: '10px', transition: 'all 0.4s ease' }} />
                </div>
                <small style={{ display: 'block', marginTop: '0.35rem', color: pwColor(newPw), fontWeight: '700', fontSize: '0.76rem', textAlign: 'center' }}>
                  {pwLabel(newPw)}
                </small>
              </div>

              {/* Confirm Password */}
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <i className="fas fa-lock" style={{ color: '#ffc107', fontSize: '0.8rem' }} /> Confirm Password
              </label>
              <div style={{ position: 'relative', marginBottom: '0.25rem' }}>
                <input type={showCPw ? 'text' : 'password'} value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                  placeholder="Repeat your password" required disabled={loading}
                  style={{
                    ...inputBase(false), paddingRight: '48px',
                    border: confirmPw && confirmPw !== newPw ? '2px solid #ef4444'
                          : confirmPw && confirmPw === newPw ? '2px solid #10b981'
                          : '2px solid rgba(0,0,0,0.1)',
                  }}
                />
                <EyeToggle show={showCPw} onToggle={() => setShowCPw(p => !p)} disabled={loading} />
              </div>
              {confirmPw && confirmPw !== newPw && <FieldError msg="Passwords do not match" />}
              {confirmPw && confirmPw === newPw && <FieldOk msg="Passwords match!" />}

              <button type="submit"
                disabled={loading || pwErrors(newPw).length > 0 || newPw !== confirmPw}
                style={{
                  marginTop: '1.25rem', width: '100%', height: '50px', borderRadius: '14px', border: 'none',
                  background: loading || pwErrors(newPw).length > 0 || newPw !== confirmPw ? '#d1d5db' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)',
                  color: '#000', fontWeight: '700', fontSize: '1rem',
                  cursor: loading || pwErrors(newPw).length > 0 || newPw !== confirmPw ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(255,193,7,0.35)', transition: 'all 0.3s',
                }}>
                {loading ? <WaveDots /> : <><i className="fas fa-check-circle me-2" />Reset Password</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ── MAIN LOGIN COMPONENT ─────────────────────────────────
const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showForgot, setShowForgot] = useState(false);
  // true = card slid right to make room for forgot panel feel
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    const h = e => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  // Animate card shift when forgot opens/closes
  useEffect(() => {
    if (showForgot) {
      // slight delay so modal mount triggers after state
      const t = setTimeout(() => setForgotOpen(true), 10);
      return () => clearTimeout(t);
    } else {
      setForgotOpen(false);
    }
  }, [showForgot]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async e => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (loading) return;
    setLoading(true); setError('');
    try {
      const response = await authAPI.login(formData);
      const { token, user, user_details } = response.data;
      if (!token || !user) { setError('Invalid response from server'); setFormData(p => ({ ...p, password: '' })); return; }
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
      if (onLogin) onLogin(mergedUser);
    } catch (err) {
      const { message } = handleAPIError(err);
      if (err.response?.status === 401) setError('Invalid username or password. Please try again.');
      else if (err.response?.status === 403) setError('Your account has been deactivated. Please contact support.');
      else setError(message || 'Login failed. Please check your credentials and try again.');
      setFormData(p => ({ username: p.username, password: '' }));
    } finally { setLoading(false); }
  };

  const inputStyle = {
    paddingLeft: '20px', paddingRight: '20px', height: '56px',
    borderRadius: '16px', border: '2px solid rgba(255,255,255,0.2)',
    fontSize: '1rem', transition: 'all 0.3s', fontWeight: '500',
    color: '#1a1a1a', background: '#ffffff',
  };

  return (
    <div className="login-container" style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      position: 'relative', overflow: 'hidden', padding: '2rem 0',
    }}>
      <style>{`
        @keyframes dropDown { 0%{opacity:0;transform:translateY(-50px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { 0%{opacity:0} 100%{opacity:1} }
        @keyframes pulse    { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes waveDots { 0%,60%,100%{transform:translateY(0);opacity:0.5} 30%{transform:translateY(-6px);opacity:1} }
        @keyframes modalSlideIn { 0%{opacity:0;transform:translateY(-32px) scale(0.96)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes cardShiftRight { 0%{transform:translateX(0)} 100%{transform:translateX(32px)} }
        @keyframes cardShiftBack  { 0%{transform:translateX(32px)} 100%{transform:translateX(0)} }
        @media (max-width:991px) { .login-container { padding:1.5rem 1rem !important; align-items:center !important; } }
        @media (max-width:576px) { .login-card-body { padding:1.5rem !important; } }
        input::placeholder { color:rgba(0,0,0,0.4)!important; }
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus {
          -webkit-box-shadow:0 0 0 1000px #ffffff inset!important;
          -webkit-text-fill-color:#1a1a1a!important;
          transition:background-color 5000s ease-in-out 0s;
        }
        input[type="password"]::-ms-reveal,input[type="password"]::-ms-clear { display:none; }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-clear-button,
        input[type="password"]::-webkit-inner-spin-button { display:none!important; }
      `}</style>

      {/* Forgot Password Modal */}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      {/* Ambient blobs */}
      <div style={{ position:'absolute', width:'500px', height:'500px', background:'#ffc107', borderRadius:'50%', opacity:0.1, filter:'blur(100px)', top:'-250px', right:'-250px', animation:'pulse 4s ease-in-out infinite' }} />
      <div style={{ position:'absolute', width:'400px', height:'400px', background:'#3b82f6', borderRadius:'50%', opacity:0.1, filter:'blur(100px)', bottom:'-200px', left:'-200px', animation:'pulse 4s ease-in-out infinite', animationDelay:'2s' }} />
      <div style={{ position:'absolute', width:'300px', height:'300px', background:'radial-gradient(circle,rgba(255,193,7,0.15) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', left:mousePosition.x-150, top:mousePosition.y-150, transition:'left 0.3s,top 0.3s', zIndex:1 }} />

      <Container style={{ position:'relative', zIndex:2, zoom:'0.75' }}>
        <Row className="justify-content-center align-items-center">
          {/* Left branding */}
          <Col lg={6} className="d-none d-lg-block pe-5">
            <div style={{ animation:'dropDown 0.8s ease-out', transition:'transform 0.45s cubic-bezier(0.34,1.2,0.64,1)', transform: forgotOpen ? 'translateX(-24px)' : 'translateX(0)' }}>
              <div className="text-center">
                <img src="/logo.png" alt="Logo" style={{ width:'120px', height:'120px', objectFit:'contain', marginBottom:'2rem', filter:'drop-shadow(0 0 30px rgba(255,193,7,0.5))', animation:'float 3s ease-in-out infinite' }}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                <div style={{ display:'none' }}>
                  <i className="fas fa-paw" style={{ fontSize:'5rem', color:'#ffc107', marginBottom:'2rem', filter:'drop-shadow(0 0 30px rgba(255,193,7,0.5))', animation:'float 3s ease-in-out infinite' }} />
                </div>
              </div>
              <div className="text-center">
                <h1 style={{ fontSize:'3rem', fontWeight:'800', color:'#ffffff', marginBottom:'1.5rem', animation:'dropDown 0.8s ease-out 0.2s backwards' }}>
                  <span style={{ color:'#ffc107' }}>Pet</span><span style={{ color:'#1a1a1a' }}>Unity</span>
                </h1>
              </div>
              <div style={{ animation:'dropDown 0.8s ease-out 0.6s backwards', position:'relative', display:'flex', justifyContent:'center', marginTop:'1rem' }}>
                <div style={{ position:'absolute', width:'120%', height:'120%', background:'radial-gradient(ellipse 80% 70% at 50% 55%,rgba(255,193,7,0.22) 0%,rgba(255,193,7,0.1) 45%,transparent 75%)', filter:'blur(18px)', borderRadius:'60% 40% 55% 45% / 45% 55% 45% 55%', transform:'rotate(-4deg) scale(1.1)', zIndex:0 }} />
                <div style={{ position:'absolute', width:'100%', height:'100%', background:'radial-gradient(ellipse 70% 60% at 55% 50%,rgba(255,193,7,0.15) 0%,transparent 70%)', filter:'blur(22px)', borderRadius:'45% 55% 40% 60% / 55% 45% 60% 40%', transform:'rotate(6deg)', zIndex:0 }} />
                <img src="/ads2.png" alt="PetUnity" style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'420px', height:'auto', objectFit:'contain', filter:'drop-shadow(0 16px 32px rgba(255,193,7,0.18)) drop-shadow(0 6px 12px rgba(0,0,0,0.06))' }} />
              </div>
            </div>
          </Col>

          {/* Right — login card */}
          <Col lg={6} xl={5}>
            <Card className="shadow-lg border-0" style={{
              borderRadius:'24px', background:'#ffffff', backdropFilter:'blur(20px)',
              border:'1px solid rgba(0,0,0,0.08)', boxShadow:'0 20px 60px rgba(0,0,0,0.1)',
              animation:'dropDown 0.8s ease-out 0.3s backwards',
              transition: 'transform 0.45s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.45s ease',
              transform: forgotOpen ? 'translateX(28px)' : 'translateX(0)',
              boxShadow: forgotOpen ? '0 24px 80px rgba(0,0,0,0.18)' : '0 20px 60px rgba(0,0,0,0.1)',
            }}>
              <Card.Body className="p-4 p-sm-5">
                {/* Back */}
                <Button variant="link" onClick={() => navigate('/')} className="p-0 mb-4 text-decoration-none"
                  style={{ color:'#555555', fontSize:'0.9rem', fontWeight:'500', transition:'all 0.3s', display:'inline-flex', alignItems:'center' }}
                  onMouseOver={e => { e.currentTarget.style.color='#ffc107'; e.currentTarget.style.transform='translateX(-5px)'; }}
                  onMouseOut={e  => { e.currentTarget.style.color='#555555'; e.currentTarget.style.transform='translateX(0)'; }}>
                  <i className="fas fa-arrow-left me-2" />Back to Home
                </Button>

                {/* Mobile logo */}
                <div className="text-center mb-4 d-lg-none">
                  <img src="/logo.png" alt="Logo" style={{ width:'80px', height:'80px', objectFit:'contain', marginBottom:'1rem', filter:'drop-shadow(0 0 20px rgba(255,193,7,0.4))' }}
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                  <div style={{ display:'none' }}><i className="fas fa-paw" style={{ fontSize:'3.5rem', color:'#ffc107', marginBottom:'1rem' }} /></div>
                </div>

                <div className="text-center mb-4">
                  <h3 style={{ fontWeight:'800', fontSize:'2rem', color:'#1a1a1a', marginBottom:'0.5rem' }}>Sign In</h3>
                  <p style={{ fontSize:'0.95rem', color:'#9ca3af' }}>Enter your credentials to continue</p>
                </div>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4"
                    style={{ borderRadius:'16px', border:'2px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.1)', backdropFilter:'blur(10px)', color:'#000000', animation:'dropDown 0.3s ease-out' }}>
                    <div className="d-flex align-items-start">
                      <i className="fas fa-exclamation-circle me-3 mt-1" style={{ fontSize:'1.2rem', color:'#ef4444' }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:'600', marginBottom:'0.25rem' }}>Login Failed</div>
                        <div style={{ fontSize:'0.9rem', color:'#fca5a5' }}>{error}</div>
                      </div>
                    </div>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit} autoComplete="off">
                  {/* Username */}
                  <Form.Group className="mb-4">
                    <Form.Label style={{ fontWeight:'600', color:'#1a1a1a', fontSize:'0.9rem', marginBottom:'0.75rem', display:'flex', alignItems:'center' }}>
                      <i className="fas fa-user me-2" style={{ color:'#ffc107' }} />Username or Email
                    </Form.Label>
                    <Form.Control type="text" name="username" value={formData.username} onChange={handleChange}
                      placeholder="Enter your username" required disabled={loading} autoComplete="username"
                      style={inputStyle} />
                  </Form.Group>

                  {/* Password */}
                  <Form.Group className="mb-2">
                    <Form.Label style={{ fontWeight:'600', color:'#1a1a1a', fontSize:'0.9rem', marginBottom:'0.75rem', display:'flex', alignItems:'center' }}>
                      <i className="fas fa-lock me-2" style={{ color:'#ffc107' }} />Password
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                        onChange={handleChange} placeholder="Enter your password" required disabled={loading}
                        autoComplete="current-password" style={{ ...inputStyle, paddingRight:'50px' }} />
                      <EyeToggle show={showPassword} onToggle={() => !loading && setShowPassword(p => !p)} disabled={loading} />
                    </div>
                  </Form.Group>

                  {/* Forgot password link */}
                  <div style={{ textAlign:'right', marginBottom:'1.5rem' }}>
                    <button type="button" onClick={() => setShowForgot(true)}
                      style={{ background:'none', border:'none', color:'#ffc107', fontWeight:'600', fontSize:'0.875rem', cursor:'pointer', padding:0, transition:'color 0.3s' }}
                      onMouseOver={e => e.target.style.color='#ffb300'}
                      onMouseOut={e => e.target.style.color='#ffc107'}>
                      Forgot password?
                    </button>
                  </div>

                  <Button type="submit" className="w-100 mb-4 border-0" size="lg" disabled={loading}
                    style={{
                      height:'56px', borderRadius:'16px',
                      background: loading ? '#6b7280' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)',
                      color:'#000000', fontWeight:'700', fontSize:'1.05rem', transition:'all 0.3s',
                      boxShadow: loading ? 'none' : '0 8px 24px rgba(255,193,7,0.4)', position:'relative', overflow:'hidden',
                    }}
                    onMouseOver={e => { if (!loading) { e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 12px 32px rgba(255,193,7,0.6)'; } }}
                    onMouseOut={e => { e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 8px 24px rgba(255,193,7,0.4)'; }}>
                    {loading ? <WaveDots color="#fff" /> : <><i className="fas fa-sign-in-alt me-2" />Sign In to Continue</>}
                  </Button>
                </Form>

                <div style={{ width:'100%', height:'1px', background:'linear-gradient(90deg,transparent,rgba(0,0,0,0.1),transparent)', marginBottom:'1.5rem' }} />

                <div className="text-center">
                  <p className="mb-0" style={{ color:'#555555', fontSize:'0.95rem' }}>
                    Don't have an account?{' '}
                    <Link to="/register" className="text-decoration-none"
                      style={{ color:'#ffc107', fontWeight:'700', transition:'all 0.3s', position:'relative' }}
                      onMouseOver={e => { e.target.style.color='#ffb300'; e.target.style.textShadow='0 0 20px rgba(255,193,7,0.5)'; }}
                      onMouseOut={e => { e.target.style.color='#ffc107'; e.target.style.textShadow='none'; }}>
                      Create Account <i className="fas fa-arrow-right ms-2" />
                    </Link>
                  </p>
                </div>
              </Card.Body>
            </Card>

            <div className="text-center mt-4">
              <p style={{ color:'#888888', fontSize:'0.85rem' }}>
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