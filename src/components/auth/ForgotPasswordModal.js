// components/auth/ForgotPasswordModal.jsx
import React, { useState, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { authAPI } from '../../services/api';

/* ── tiny helpers (same style as Register page) ── */
const WaveDots = ({ color = '#000' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: '1.05rem' }}>
    {[0, 0.15, 0.3].map((delay, i) => (
      <span key={i} style={{
        width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block',
        animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: `${delay}s`
      }} />
    ))}
  </span>
);

const FieldError = ({ msg }) => msg
  ? <small style={{ color: '#ef4444', display: 'block', marginTop: '0.35rem', fontSize: '0.8rem' }}>
      <i className="fas fa-times-circle me-1" />{msg}
    </small>
  : null;

const FieldOk = ({ msg }) => msg
  ? <small style={{ color: '#10b981', display: 'block', marginTop: '0.35rem', fontSize: '0.8rem' }}>
      <i className="fas fa-check-circle me-1" />{msg}
    </small>
  : null;

/* ── password strength (mirrors Register) ── */
const checkPassword = (pwd) => {
  const errors = [];
  if (pwd.length < 8)            errors.push('length');
  if (!/[A-Z]/.test(pwd))        errors.push('uppercase');
  if (!/[a-z]/.test(pwd))        errors.push('lowercase');
  if (!/\d/.test(pwd))           errors.push('number');
  return errors;
};
const strengthColor = (errs, pwd) => {
  if (!pwd) return '#6b7280';
  if (errs.length > 2) return '#ef4444';
  if (errs.length > 0) return '#f59e0b';
  return '#10b981';
};
const strengthLabel = (errs, pwd) => {
  if (!pwd) return '';
  if (errs.length > 2) return 'Weak Password';
  if (errs.length > 0) return 'Medium Password';
  return 'Strong Password';
};

/* ═══════════════════════════════════════════════ MODAL ═══ */
const ForgotPasswordModal = ({ show, onHide }) => {
  /* step: 'email' | 'otp' | 'reset' | 'done' */
  const [step, setStep]               = useState('email');
  const [email, setEmail]             = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp]                 = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showNewPw, setShowNewPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pwErrors, setPwErrors]       = useState([]);
  const [confirmErr, setConfirmErr]   = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const otpRefs = useRef([]);

  const resetAll = () => {
    setStep('email'); setEmail(''); setMaskedEmail(''); setOtp('');
    setNewPw(''); setConfirmPw(''); setError(''); setSuccess('');
    setLoading(false); setPwErrors([]); setConfirmErr('');
    setResendCooldown(0);
  };

  const handleClose = () => { resetAll(); onHide(); };

  /* ── shared input style ── */
  const inp = (field, extra = {}) => ({
    paddingLeft: 20, paddingRight: 20, height: 52,
    borderRadius: 14,
    border: focusedField === field ? '2px solid #ffc107' : '2px solid rgba(0,0,0,0.1)',
    fontSize: '0.95rem', background: '#f8f9fa', fontWeight: 500,
    color: '#1a1a1a', transition: 'all 0.3s', ...extra,
  });

  const btn = (disabled) => ({
    height: 52, borderRadius: 14, border: 'none', width: '100%',
    background: disabled ? '#d1d5db' : 'linear-gradient(135deg,#ffc107 0%,#ffb300 100%)',
    color: '#000', fontWeight: 700, fontSize: '1rem', cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 8px 24px rgba(255,193,7,0.35)',
    transition: 'all 0.3s',
  });

  /* ── OTP input handlers (same pattern as Register) ── */
  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = otp.split('');
    arr[i] = digit || '';
    const next = arr.join('').slice(0, 6);
    setOtp(next);
    if (error) setError('');
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
      const arr = otp.split(''); arr[i - 1] = '';
      setOtp(arr.join('')); e.preventDefault();
    } else if (e.key === 'ArrowLeft'  && i > 0) otpRefs.current[i - 1]?.focus();
    else if   (e.key === 'ArrowRight' && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setOtp(pasted); if (error) setError('');
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  /* ── STEP HANDLERS ── */
  const handleSendCode = async () => {
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format.'); return; }
    setLoading(true); setError('');
    try {
      const res = await authAPI.forgotPasswordSend(email.trim().toLowerCase());
      setMaskedEmail(res.data.masked_email || email);
      setSuccess('Verification code sent!');
      setStep('otp');
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.forgotPasswordVerify(email, otp);
      setSuccess('');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await authAPI.forgotPasswordSend(email.trim().toLowerCase());
      setOtp('');
      setSuccess('A new code has been sent!');
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend.');
    } finally { setLoading(false); }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => {
      setResendCooldown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; });
    }, 1000);
  };

  const handleReset = async () => {
    const errs = checkPassword(newPw);
    setPwErrors(errs);
    if (errs.length > 0) { setError('Password does not meet the requirements.'); return; }
    if (newPw !== confirmPw) { setConfirmErr('Passwords do not match.'); return; }
    setLoading(true); setError(''); setConfirmErr('');
    try {
      await authAPI.forgotPasswordReset(email, otp, newPw);
      setStep('done');
    } catch (err) {
      const d = err.response?.data;
      if (d?.error === 'same_password') {
        setError(d.message || 'This is your current password. Try a different one.');
      } else {
        setError(d?.error || 'Reset failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  /* ── RENDER ── */
  const steps = { email: 1, otp: 2, reset: 3, done: 4 };
  const currentStep = steps[step] || 1;

  return (
    <Modal show={show} onHide={handleClose} centered size="sm"
      contentClassName="border-0"
      style={{ zIndex: 1055 }}
    >
      <style>{`
        @keyframes waveDots { 0%,60%,100%{transform:translateY(0);opacity:0.5} 30%{transform:translateY(-6px);opacity:1} }
        @keyframes slideUp  { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
        .fp-modal .modal-content { border-radius: 24px !important; box-shadow: 0 24px 64px rgba(0,0,0,0.15) !important; overflow: hidden; }
      `}</style>

      <div className="fp-modal">
        <Modal.Body style={{ padding: '2rem 1.75rem', borderRadius: 24, background: '#fff', animation: 'slideUp 0.35s ease-out' }}>

          {/* ── Close ── */}
          <button onClick={handleClose} style={{
            position: 'absolute', top: 16, right: 18,
            background: 'none', border: 'none', fontSize: '1.1rem',
            color: '#9ca3af', cursor: 'pointer', lineHeight: 1,
          }}>
            <i className="fas fa-times" />
          </button>

          {/* ── Progress dots ── */}
          {step !== 'done' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '1.5rem' }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{
                  width: n === currentStep ? 24 : 8, height: 8, borderRadius: 4,
                  background: n <= currentStep ? '#ffc107' : '#e5e7eb',
                  transition: 'all 0.4s ease',
                }} />
              ))}
            </div>
          )}

          {/* ════════ STEP: email ════════ */}
          {step === 'email' && (
            <div>
              <div className="text-center mb-4">
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,193,7,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <i className="fas fa-lock-open" style={{ fontSize: '1.6rem', color: '#ffc107' }} />
                </div>
                <h5 style={{ fontWeight: 800, color: '#1a1a1a', marginBottom: '0.3rem' }}>Forgot Password?</h5>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: 0 }}>Enter your registered email and we'll send a verification code.</p>
              </div>

              {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '0.7rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="fas fa-exclamation-circle" />{error}
              </div>}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <i className="fas fa-envelope me-2" style={{ color: '#ffc107', fontSize: '0.8rem' }} />Email Address
                </label>
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                  onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                  placeholder="yourname@gmail.com"
                  disabled={loading}
                  style={{ ...inp('email'), width: '100%' }}
                />
              </div>

              <button onClick={handleSendCode} disabled={loading || !email.trim()} style={btn(loading || !email.trim())}>
                {loading ? <WaveDots /> : <><i className="fas fa-paper-plane me-2" />Send Verification Code</>}
              </button>
            </div>
          )}

          {/* ════════ STEP: otp ════════ */}
          {step === 'otp' && (
            <div>
              <div className="text-center mb-4">
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,193,7,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <i className="fas fa-envelope-open-text" style={{ fontSize: '1.5rem', color: '#ffc107' }} />
                </div>
                <h5 style={{ fontWeight: 800, color: '#1a1a1a', marginBottom: '0.3rem' }}>Check Your Email</h5>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.25rem' }}>We sent a 6-digit code to</p>
                <p style={{ color: '#ffc107', fontWeight: 700, fontSize: '0.95rem', marginBottom: 0 }}>{maskedEmail}</p>
              </div>

              {success && <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '0.7rem 1rem', marginBottom: '1rem', color: '#10b981', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="fas fa-check-circle" />{success}
              </div>}
              {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '0.7rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="fas fa-exclamation-circle" />{error}
              </div>}

              {/* OTP boxes */}
              <div onPaste={handleOtpPaste} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '1.25rem' }}>
                {[0,1,2,3,4,5].map(i => (
                  <input key={i} ref={el => otpRefs.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1}
                    value={otp[i] || ''} disabled={loading}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{
                      width: 44, height: 52, borderRadius: 12, textAlign: 'center',
                      fontSize: '1.5rem', fontWeight: 'bold', color: '#1a1a1a',
                      border: otp[i] ? '2.5px solid #ffc107' : '2.5px dashed #d1d5db',
                      background: 'rgba(255,193,7,0.04)', outline: 'none', transition: 'all 0.25s',
                    }}
                    onFocus={e => { e.target.style.border = '2.5px solid #ffc107'; e.target.style.boxShadow = '0 0 0 3px rgba(255,193,7,0.15)'; }}
                    onBlur={e  => { e.target.style.boxShadow = 'none'; if (!otp[i]) e.target.style.border = '2.5px dashed #d1d5db'; }}
                  />
                ))}
              </div>
              <div className="text-center mb-3">
                <small style={{ color: '#9ca3af', fontSize: '0.82rem' }}><i className="fas fa-clock me-1" />Code expires in 15 minutes</small>
              </div>

              <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} style={btn(loading || otp.length !== 6)}>
                {loading ? <WaveDots /> : <><i className="fas fa-check-circle me-2" />Verify Code</>}
              </button>

              <div className="text-center mt-3">
                <p style={{ color: '#9ca3af', fontSize: '0.82rem', marginBottom: '0.4rem' }}>Didn't receive it?</p>
                <button onClick={handleResend} disabled={loading || resendCooldown > 0}
                  style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? '#9ca3af' : '#ffc107', fontWeight: 600, fontSize: '0.875rem', cursor: resendCooldown > 0 ? 'default' : 'pointer' }}>
                  {resendCooldown > 0
                    ? <><i className="fas fa-clock me-1" />Resend in {resendCooldown}s</>
                    : <><i className="fas fa-redo me-1" />Resend Code</>}
                </button>
              </div>

              <div className="text-center mt-2">
                <button onClick={() => { setStep('email'); setOtp(''); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <i className="fas fa-arrow-left me-1" />Change Email
                </button>
              </div>
            </div>
          )}

          {/* ════════ STEP: reset ════════ */}
          {step === 'reset' && (
            <div>
              <div className="text-center mb-4">
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,193,7,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <i className="fas fa-key" style={{ fontSize: '1.5rem', color: '#ffc107' }} />
                </div>
                <h5 style={{ fontWeight: 800, color: '#1a1a1a', marginBottom: '0.3rem' }}>New Password</h5>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: 0 }}>Create a strong password for your account.</p>
              </div>

              {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '0.7rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="fas fa-exclamation-circle" />{error}
              </div>}

              {/* New Password */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <i className="fas fa-lock me-2" style={{ color: '#ffc107', fontSize: '0.8rem' }} />New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPw ? 'text' : 'password'} value={newPw}
                    onChange={e => { setNewPw(e.target.value); setPwErrors(checkPassword(e.target.value)); if (error) setError(''); if (confirmPw) setConfirmErr(e.target.value !== confirmPw ? 'Passwords do not match.' : ''); }}
                    onFocus={() => setFocusedField('newPw')} onBlur={() => setFocusedField(null)}
                    placeholder="Create a strong password" disabled={loading} maxLength={64}
                    style={{ ...inp('newPw'), width: '100%', paddingRight: 44 }}
                  />
                  <span onClick={() => setShowNewPw(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem' }}>
                    <i className={`fas fa-eye${showNewPw ? '-slash' : ''}`} />
                  </span>
                </div>

                {/* Strength bar + requirements */}
                {newPw && (
                  <div style={{ marginTop: '0.75rem', padding: '0.8rem 0.9rem', background: '#f8f9fa', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.07)' }}>
                    <small style={{ fontWeight: 700, color: '#ffc107', fontSize: '0.78rem', display: 'block', marginBottom: '0.5rem' }}>
                      <i className="fas fa-shield-alt me-1" />Requirements
                    </small>
                    {[
                      { key: 'length',    label: 'At least 8 characters',     pass: newPw.length >= 8 },
                      { key: 'uppercase', label: 'One uppercase letter (A-Z)', pass: /[A-Z]/.test(newPw) },
                      { key: 'lowercase', label: 'One lowercase letter (a-z)', pass: /[a-z]/.test(newPw) },
                      { key: 'number',    label: 'One number (0-9)',           pass: /\d/.test(newPw) },
                    ].map(r => (
                      <div key={r.key} style={{ display: 'flex', alignItems: 'center', color: r.pass ? '#10b981' : '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <i className={`fas fa-${r.pass ? 'check-circle' : 'circle'} me-2`} style={{ fontSize: '0.8rem' }} />{r.label}
                      </div>
                    ))}
                    <div style={{ marginTop: '0.6rem', height: 5, borderRadius: 10, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                      <div style={{
                        width: !newPw ? '0%' : `${Math.max(25, 100 - pwErrors.length * 25)}%`,
                        height: '100%', borderRadius: 10, transition: 'all 0.4s',
                        background: strengthColor(pwErrors, newPw),
                      }} />
                    </div>
                    <small style={{ display: 'block', marginTop: '0.3rem', color: strengthColor(pwErrors, newPw), fontWeight: 700, fontSize: '0.76rem', textAlign: 'center' }}>
                      {strengthLabel(pwErrors, newPw)}
                    </small>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <i className="fas fa-lock me-2" style={{ color: '#ffc107', fontSize: '0.8rem' }} />Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPw ? 'text' : 'password'} value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); setConfirmErr(e.target.value !== newPw ? 'Passwords do not match.' : ''); }}
                    onFocus={() => setFocusedField('confirmPw')} onBlur={() => setFocusedField(null)}
                    placeholder="Repeat your password" disabled={loading} maxLength={64}
                    style={{
                      ...inp('confirmPw'), width: '100%', paddingRight: 44,
                      border: confirmErr ? '2px solid #ef4444'
                            : (confirmPw && confirmPw === newPw) ? '2px solid #10b981'
                            : focusedField === 'confirmPw' ? '2px solid #ffc107'
                            : '2px solid rgba(0,0,0,0.1)',
                    }}
                  />
                  <span onClick={() => setShowConfirmPw(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem' }}>
                    <i className={`fas fa-eye${showConfirmPw ? '-slash' : ''}`} />
                  </span>
                </div>
                <FieldError msg={confirmErr} />
                {confirmPw && confirmPw === newPw && <FieldOk msg="Passwords match!" />}
              </div>

              <button
                onClick={handleReset}
                disabled={loading || pwErrors.length > 0 || !newPw || !confirmPw || !!confirmErr}
                style={btn(loading || pwErrors.length > 0 || !newPw || !confirmPw || !!confirmErr)}
              >
                {loading ? <WaveDots /> : <><i className="fas fa-save me-2" />Reset Password</>}
              </button>
            </div>
          )}

          {/* ════════ STEP: done ════════ */}
          {step === 'done' && (
            <div className="text-center" style={{ padding: '1rem 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#10b981' }} />
              </div>
              <h5 style={{ fontWeight: 800, color: '#1a1a1a', marginBottom: '0.5rem' }}>Password Reset!</h5>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Your password has been updated successfully.<br />You can now sign in with your new password.
              </p>
              <button onClick={handleClose} style={btn(false)}>
                <i className="fas fa-sign-in-alt me-2" />Go to Sign In
              </button>
            </div>
          )}

        </Modal.Body>
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal;