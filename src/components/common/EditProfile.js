import React, { useState } from 'react';
import { Container, Form, Row, Col } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { getUser, setAuth, getToken } from '../../utils/auth';

const EditProfile = ({ darkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    middle_name: user?.middle_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const isClinic = user?.role === 'private_clinic';
  const isAdmin = user?.role === 'barangay_official';
  const isSuperAdmin = user?.role === 'super_admin';
  const isOwner = user?.role === 'pet_owner';

  const verificationStatus = user?.verification_status;
  const isVerificationLocked =
    isOwner && ['pending', 'semi_verified', 'fully_verified'].includes(verificationStatus);

  const profileFieldsDisabled = isAdmin || isClinic || isSuperAdmin || isVerificationLocked;
  const canEditProfile = !isClinic && !isAdmin && !isSuperAdmin && !isVerificationLocked;

  const lockedHint =
    isAdmin || isClinic || isSuperAdmin
      ? 'Profile details for this account are managed by the City Veterinary Office.'
      : isVerificationLocked
      ? `Your account is ${verificationStatus.replace(/_/g, ' ')}, so only your password can be changed.`
      : null;

  const from = location.state?.from || (
    isSuperAdmin ? '/super-admin/dashboard' :
    isAdmin ? '/admin/dashboard' :
    isOwner ? '/owner/dashboard' :
    '/clinic/dashboard'
  );

  const roleLabel = isClinic ? 'Private Clinic' : isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Community';
  const displayName = isClinic
    ? (user?.clinic_name || user?.first_name || 'Clinic')
    : `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User';
  const initials = isClinic
    ? (displayName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') || 'C').toUpperCase()
    : `${(user?.first_name || '?')[0]}${(user?.last_name || '')[0] || ''}`.toUpperCase();

  const VERIF = {
    not_verified:   { label: 'Not verified',   color: '#dc3545', icon: 'fa-times-circle' },
    pending:        { label: 'Pending review', color: '#fd7e14', icon: 'fa-hourglass-half' },
    semi_verified:  { label: 'Semi verified',  color: '#0d6efd', icon: 'fa-shield-alt' },
    fully_verified: { label: 'Fully verified', color: '#198754', icon: 'fa-check-circle' },
  };
  const verif = isOwner ? (VERIF[verificationStatus] || VERIF.not_verified) : null;

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push('length');
    if (!/[A-Z]/.test(pwd)) errors.push('uppercase');
    if (!/[a-z]/.test(pwd)) errors.push('lowercase');
    if (!/\d/.test(pwd)) errors.push('number');
    setPasswordErrors(errors);
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'new_password') {
      validatePassword(value);
      if (formData.confirm_password) {
        setFieldErrors(prev => ({ ...prev, confirm_password: value !== formData.confirm_password ? 'Passwords do not match' : '' }));
      }
    }
    if (name === 'confirm_password') {
      setFieldErrors(prev => ({ ...prev, confirm_password: value !== formData.new_password ? 'Passwords do not match' : '' }));
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

  const handleNameBlur = (name) => (e) => {
    const v = e.target.value;
    if (v.endsWith('-')) setFieldErrors(prev => ({ ...prev, [name]: 'Cannot end with a hyphen' }));
    else if (v.endsWith(' ')) setFieldErrors(prev => ({ ...prev, [name]: 'Cannot end with a space' }));
  };

  const blockDigits = (e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); };

  const toggleShow = (field) => setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));

  const showToast = (msg) => {
    setSuccess(msg);
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => setSuccess(''), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (canEditProfile) {
      if (!formData.first_name.trim()) { setFieldErrors(p => ({ ...p, first_name: 'First name is required' })); return; }
      if (!formData.last_name.trim()) { setFieldErrors(p => ({ ...p, last_name: 'Last name is required' })); return; }
      if (formData.phone && !/^09\d{9}$/.test(formData.phone)) { setFieldErrors(p => ({ ...p, phone: 'Phone must be 11 digits starting with 09' })); return; }
      if (['first_name', 'middle_name', 'last_name', 'phone'].some(k => fieldErrors[k])) { setError('Please fix the highlighted fields.'); return; }
    }

    const changingPassword = !!(formData.new_password || formData.current_password);
    if (changingPassword) {
      if (!formData.current_password) { setFieldErrors(p => ({ ...p, current_password: 'Current password is required' })); return; }
      if (!formData.new_password) { setFieldErrors(p => ({ ...p, new_password: 'New password is required' })); return; }
      const errs = validatePassword(formData.new_password);
      if (errs.length > 0) { setError('New password does not meet the requirements.'); return; }
      if (formData.new_password !== formData.confirm_password) { setFieldErrors(p => ({ ...p, confirm_password: 'Passwords do not match' })); return; }
    }

    if (!canEditProfile && !changingPassword) {
      setError('Fill in the password fields to save changes.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {};
      if (canEditProfile) {
        payload.first_name  = formData.first_name;
        payload.middle_name = formData.middle_name;
        payload.last_name   = formData.last_name;
        payload.phone       = formData.phone;
      }
      if (changingPassword) {
        payload.current_password = formData.current_password;
        payload.password         = formData.new_password;
      }

      let endpoint;
      if (isClinic) endpoint = '/clinics/change-password';
      else if (isAdmin || isSuperAdmin) endpoint = '/officials/change-password';
      else endpoint = `/owners/${user.id}`;

      await api.put(endpoint, payload);

      // Keep the saved login data in sync so the header and navbar show the new name right away
      if (canEditProfile) {
        const token = getToken();
        if (token) {
          setAuth(token, {
            ...user,
            first_name: formData.first_name.trim(),
            middle_name: formData.middle_name.trim(),
            last_name: formData.last_name.trim(),
            phone: formData.phone,
          });
        }
      }

      showToast(changingPassword ? 'Your changes and new password were saved.' : 'Your profile changes were saved.');
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
      setPasswordErrors([]);
      setShowPasswords({ current: false, new: false, confirm: false });
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefault = async () => {
    setResetting(true);
    setError('');
    try {
      await api.put('/officials/reset-password', { password: 'password' });
      showToast('Password reset to "password". Log in again with the new password.');
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
      setConfirmReset(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const handleBack = () => {
    const el = document.getElementById('edit-profile-page');
    if (el) {
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(24px)';
      setTimeout(() => navigate(from), 250);
    } else {
      navigate(from);
    }
  };

  // Password strength
  const pw = formData.new_password;
  const reqs = [
    { key: 'length', label: 'At least 8 characters', pass: pw.length >= 8 },
    { key: 'uppercase', label: 'One uppercase letter', pass: /[A-Z]/.test(pw) },
    { key: 'lowercase', label: 'One lowercase letter', pass: /[a-z]/.test(pw) },
    { key: 'number', label: 'One number', pass: /\d/.test(pw) },
  ];
  const passed = reqs.filter(r => r.pass).length;
  const strength = !pw ? null
    : passed <= 1 ? { label: 'Weak', color: '#dc3545' }
    : passed < 4 ? { label: 'Medium', color: '#e0a800' }
    : { label: 'Strong', color: '#198754' };

  const phoneValid = formData.phone && /^09\d{9}$/.test(formData.phone);
  const confirmMatches = formData.confirm_password && formData.confirm_password === formData.new_password;

  const fieldClass = (name, extra = '') => `ep-input${fieldErrors[name] ? ' err' : ''}${extra}`;

  const FieldError = ({ msg }) => msg
    ? <div className="ep-field-msg err"><i className="fas fa-exclamation-circle" />{msg}</div>
    : null;

  const PasswordInput = (field, name, placeholder, extraClass = '') => (
    <div className="ep-pw">
      <input
        className={fieldClass(name, extraClass)}
        type={showPasswords[field] ? 'text' : 'password'}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={loading}
        maxLength={64}
        autoComplete={name === 'current_password' ? 'current-password' : 'new-password'}
      />
      <button type="button" className="ep-eye" onClick={() => toggleShow(field)} tabIndex={-1} aria-label={showPasswords[field] ? 'Hide password' : 'Show password'}>
        <i className={`fas fa-eye${showPasswords[field] ? '-slash' : ''}`} />
      </button>
    </div>
  );

  const styles = `
    .ep-page {
      ${darkMode ? `
      --ep-bg: #0d0d0d; --ep-panel: #141414; --ep-line: #262626; --ep-text: #f0f0f0; --ep-muted: #9a9a9a; --ep-faint: #6b6b6b;
      --ep-input: #1a1a1a; --ep-disabled: #171717; --ep-soft: #1e1e1e;` : `
      --ep-bg: #ffffff; --ep-panel: #ffffff; --ep-line: #e9ecef; --ep-text: #1f2328; --ep-muted: #6b7280; --ep-faint: #9ca3af;
      --ep-input: #ffffff; --ep-disabled: #f6f7f9; --ep-soft: #f3f4f6;`}
      min-height: 100vh; background: var(--ep-bg); padding-top: 64px;
      animation: epSlide 0.4s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes epSlide { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes epIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes epToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes epDots { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }

    .ep-wrap { max-width: 760px; padding-top: 1.5rem; padding-bottom: 3rem; }
    .ep-anim { animation: epIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }

    .ep-back { display: inline-flex; align-items: center; gap: 0.45rem; border: none; background: none; padding: 0.3rem 0.5rem 0.3rem 0; color: var(--ep-muted); font-size: 0.86rem; font-weight: 600; margin-bottom: 0.75rem; transition: color 0.15s ease; }
    .ep-back:hover { color: var(--ep-text); }
    .ep-back i { font-size: 0.78rem; transition: transform 0.15s ease; }
    .ep-back:hover i { transform: translateX(-3px); }
    .ep-title { font-weight: 700; color: var(--ep-text); font-size: 1.75rem; margin: 0; }
    .ep-sub { color: var(--ep-muted); font-size: 0.93rem; margin: 0.15rem 0 1.5rem; }

    .ep-panel { background: var(--ep-panel); border: 1px solid var(--ep-line); border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); margin-bottom: 1rem; }
    .ep-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--ep-line); }
    .ep-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 14%, transparent); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.88rem; flex-shrink: 0; }
    .ep-panel-title { font-weight: 700; color: var(--ep-text); font-size: 0.98rem; }
    .ep-panel-sub { font-size: 0.8rem; color: var(--ep-muted); }
    .ep-panel-body { padding: 1.15rem 1.25rem 1.25rem; }

    .ep-profile { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; }
    .ep-avatar { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #ffe08a, #ffc107); color: #1f2328; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.15rem; flex-shrink: 0; }
    .ep-name { font-weight: 700; font-size: 1.15rem; color: var(--ep-text); line-height: 1.25; }
    .ep-email { font-size: 0.85rem; color: var(--ep-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ep-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.4rem; }
    .ep-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); }
    .ep-chip i { font-size: 0.66rem; }

    .ep-note { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.7rem 0.85rem; border-radius: 10px; font-size: 0.84rem; line-height: 1.45; margin-bottom: 1rem; }
    .ep-note i { margin-top: 3px; }
    .ep-note.info { background: var(--ep-soft); color: var(--ep-muted); }
    .ep-note.info i { color: var(--ep-faint); }
    .ep-note.lock { background: rgba(255,193,7,0.12); color: ${darkMode ? '#ffd24d' : '#8a6500'}; }
    .ep-note.error { background: rgba(220,53,69,0.08); color: #dc3545; border: 1px solid rgba(220,53,69,0.2); }

    .ep-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--ep-text); margin-bottom: 0.35rem; }
    .ep-label .req { color: #dc3545; margin-left: 2px; }
    .ep-label .opt { color: var(--ep-faint); font-weight: 500; margin-left: 4px; }
    .ep-input { width: 100%; height: 42px; border: 1px solid ${darkMode ? '#2f2f2f' : '#dfe2e6'}; border-radius: 10px; background: var(--ep-input); padding: 0 0.85rem; font-size: 0.9rem; color: var(--ep-text); outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .ep-input::placeholder { color: var(--ep-faint); }
    .ep-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    .ep-input.err, .ep-input.err:focus { border-color: #dc3545; box-shadow: 0 0 0 3px rgba(220,53,69,0.12); }
    .ep-input.ok { border-color: #198754; }
    .ep-input:disabled, .ep-input[readonly] { background: var(--ep-disabled); color: var(--ep-muted); cursor: not-allowed; }
    .ep-input[readonly]:focus { border-color: ${darkMode ? '#2f2f2f' : '#dfe2e6'}; box-shadow: none; }
    .ep-field { margin-bottom: 1rem; }
    .ep-field-msg { display: flex; align-items: center; gap: 0.35rem; font-size: 0.77rem; margin-top: 0.3rem; color: var(--ep-faint); }
    .ep-field-msg.err { color: #dc3545; }
    .ep-field-msg.ok { color: #198754; }
    .ep-pw { position: relative; }
    .ep-pw .ep-input { padding-right: 2.6rem; }
    .ep-eye { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border: none; border-radius: 8px; background: transparent; color: var(--ep-faint); }
    .ep-eye:hover { background: var(--ep-soft); color: var(--ep-text); }

    .ep-reqs { border: 1px solid var(--ep-line); border-radius: 10px; padding: 0.8rem 0.9rem; margin-bottom: 0.25rem; }
    .ep-reqs-head { display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: var(--ep-muted); margin-bottom: 0.5rem; }
    .ep-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 0.65rem; }
    .ep-bar span { height: 4px; border-radius: 2px; background: var(--ep-soft); transition: background 0.25s ease; }
    .ep-req-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem 1rem; }
    .ep-req { display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; color: var(--ep-faint); transition: color 0.2s ease; }
    .ep-req.pass { color: #198754; }
    .ep-req i { font-size: 0.75rem; width: 14px; text-align: center; }

    .ep-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.25rem; margin-bottom: 1.5rem; }
    .ep-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; height: 42px; padding: 0 1.15rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.9rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .ep-btn.primary { background: #ffc107; color: #1f2328; min-width: 150px; }
    .ep-btn.primary:hover:not(:disabled) { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .ep-btn.ghost { background: var(--ep-panel); border-color: var(--ep-line); color: var(--ep-text); }
    .ep-btn.ghost:hover:not(:disabled) { background: var(--ep-soft); }
    .ep-btn.danger { background: transparent; border-color: rgba(220,53,69,0.35); color: #dc3545; }
    .ep-btn.danger:hover:not(:disabled) { background: rgba(220,53,69,0.08); }
    .ep-btn.danger-solid { background: #dc3545; color: #fff; }
    .ep-btn.danger-solid:hover:not(:disabled) { background: #bb2d3b; }
    .ep-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .ep-dots { display: inline-flex; gap: 5px; }
    .ep-dots span { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: epDots 1.2s ease-in-out infinite; }
    .ep-dots span:nth-child(2) { animation-delay: 0.15s; }
    .ep-dots span:nth-child(3) { animation-delay: 0.3s; }

    .ep-danger { border-color: rgba(220,53,69,0.3); }
    .ep-danger-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .ep-danger-text { font-size: 0.85rem; color: var(--ep-muted); max-width: 440px; }
    .ep-danger-text strong { color: var(--ep-text); }
    .ep-confirm { margin-top: 0.9rem; padding: 0.85rem 0.95rem; border-radius: 10px; background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.2); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; font-size: 0.85rem; color: #dc3545; font-weight: 600; }

    .ep-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: epToast 0.35s ease-out; }
    .ep-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ep-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .ep-toast .d { color: #6b7280; font-size: 0.84rem; }
    .ep-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .ep-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .ep-back:focus-visible, .ep-btn:focus-visible, .ep-eye:focus-visible, .ep-toast-close:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .ep-wrap { padding: 1rem 1rem 6rem; }
      .ep-title { font-size: 1.4rem; }
      .ep-sub { font-size: 0.85rem; margin-bottom: 1rem; }
      .ep-panel-head, .ep-panel-body, .ep-profile { padding-left: 1rem; padding-right: 1rem; }
      .ep-avatar { width: 50px; height: 50px; font-size: 1rem; }
      .ep-req-grid { grid-template-columns: 1fr; }
      .ep-actions { flex-direction: column-reverse; }
      .ep-actions .ep-btn { width: 100%; }
      .ep-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ep-page, .ep-anim, .ep-toast, .ep-dots span { animation: none !important; }
    }
  `;

  return (
    <div id="edit-profile-page" className="ep-page">
      <style>{styles}</style>

      {success && (
        <div className="ep-toast" role="status" aria-live="polite">
          <div className="ic"><i className="fas fa-check" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t">Success</div>
            <div className="d">{success}</div>
          </div>
          <button type="button" className="ep-toast-close" onClick={() => setSuccess('')} aria-label="Dismiss">
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      <Container className="ep-wrap">
        <button type="button" className="ep-back ep-anim" onClick={handleBack}>
          <i className="fas fa-arrow-left" />Back
        </button>

        <div className="ep-anim" style={{ '--d': '0.04s' }}>
          <h2 className="ep-title">Account settings</h2>
          <p className="ep-sub">
            {canEditProfile ? 'Update your personal details and password.' : 'View your account details and change your password.'}
          </p>
        </div>

        {/* Profile summary */}
        <div className="ep-panel ep-anim" style={{ '--d': '0.08s' }}>
          <div className="ep-profile">
            <div className="ep-avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className="ep-name">{displayName}</div>
              <div className="ep-email">{user?.email || '—'}</div>
              <div className="ep-chips">
                <span className="ep-chip" style={{ '--c': darkMode ? '#ffd24d' : '#b88a00' }}>
                  <i className={`fas ${isClinic ? 'fa-hospital' : isSuperAdmin ? 'fa-crown' : isAdmin ? 'fa-user-shield' : 'fa-user'}`} />{roleLabel}
                </span>
                {verif && (
                  <span className="ep-chip" style={{ '--c': verif.color }}>
                    <i className={`fas ${verif.icon}`} />{verif.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="ep-note error ep-anim" role="alert">
            <i className="fas fa-exclamation-circle" />
            <span style={{ flex: 1 }}>{error}</span>
            <button type="button" className="ep-eye" style={{ position: 'static', transform: 'none', width: 24, height: 24, color: '#dc3545' }} onClick={() => setError('')} aria-label="Dismiss error">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        <Form onSubmit={handleSubmit} noValidate>

          {/* Profile information — community, admin (read only) */}
          {!isClinic && !isSuperAdmin && (
            <div className="ep-panel ep-anim" style={{ '--d': '0.12s' }}>
              <div className="ep-panel-head">
                <div className="ep-head-ic" style={{ '--c': '#e0a800' }}><i className="fas fa-address-card" /></div>
                <div>
                  <div className="ep-panel-title">Profile information</div>
                  <div className="ep-panel-sub">Your name and contact number.</div>
                </div>
              </div>
              <div className="ep-panel-body">
                {lockedHint && (
                  <div className="ep-note lock"><i className="fas fa-lock" /><span>{lockedHint}</span></div>
                )}

                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-email">Email</label>
                  <input id="ep-email" className="ep-input" type="email" value={user?.email || ''} readOnly />
                  <div className="ep-field-msg"><i className="fas fa-lock" />Email can't be changed</div>
                </div>

                <Row className="g-3 mb-3">
                  <Col xs={12} md={4}>
                    <label className="ep-label" htmlFor="ep-first">First name{canEditProfile && <span className="req">*</span>}</label>
                    <input id="ep-first" className={fieldClass('first_name')} type="text" name="first_name" value={formData.first_name}
                      onChange={handleChange} onKeyDown={blockDigits} onBlur={handleNameBlur('first_name')}
                      placeholder="First name" disabled={loading || profileFieldsDisabled} maxLength={30} />
                    <FieldError msg={fieldErrors.first_name} />
                  </Col>
                  <Col xs={12} md={4}>
                    <label className="ep-label" htmlFor="ep-middle">Middle name{canEditProfile && <span className="opt">(optional)</span>}</label>
                    <input id="ep-middle" className={fieldClass('middle_name')} type="text" name="middle_name" value={formData.middle_name}
                      onChange={handleChange} onKeyDown={blockDigits} onBlur={handleNameBlur('middle_name')}
                      placeholder={profileFieldsDisabled ? '—' : 'Middle name'} disabled={loading || profileFieldsDisabled} maxLength={30} />
                    <FieldError msg={fieldErrors.middle_name} />
                  </Col>
                  <Col xs={12} md={4}>
                    <label className="ep-label" htmlFor="ep-last">Last name{canEditProfile && <span className="req">*</span>}</label>
                    <input id="ep-last" className={fieldClass('last_name')} type="text" name="last_name" value={formData.last_name}
                      onChange={handleChange} onKeyDown={blockDigits} onBlur={handleNameBlur('last_name')}
                      placeholder="Last name" disabled={loading || profileFieldsDisabled} maxLength={30} />
                    <FieldError msg={fieldErrors.last_name} />
                  </Col>
                </Row>

                <div style={{ maxWidth: 340 }}>
                  <label className="ep-label" htmlFor="ep-phone">Phone number</label>
                  <input id="ep-phone" className={fieldClass('phone', phoneValid && !profileFieldsDisabled ? ' ok' : '')} type="tel" name="phone" value={formData.phone}
                    onChange={handleChange} placeholder="09123456789" disabled={loading || profileFieldsDisabled} maxLength={11} inputMode="numeric"
                    onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }} />
                  {fieldErrors.phone
                    ? <FieldError msg={fieldErrors.phone} />
                    : canEditProfile && <div className="ep-field-msg">11 digits, starting with 09</div>}
                </div>
              </div>
            </div>
          )}

          {/* Account — clinic */}
          {isClinic && (
            <div className="ep-panel ep-anim" style={{ '--d': '0.12s' }}>
              <div className="ep-panel-head">
                <div className="ep-head-ic" style={{ '--c': '#0d6efd' }}><i className="fas fa-hospital" /></div>
                <div>
                  <div className="ep-panel-title">Clinic account</div>
                  <div className="ep-panel-sub">The email you use to sign in.</div>
                </div>
              </div>
              <div className="ep-panel-body">
                <label className="ep-label" htmlFor="ep-email">Email</label>
                <input id="ep-email" className="ep-input" type="email" value={user?.email || ''} readOnly />
                <div className="ep-field-msg"><i className="fas fa-lock" />Email can't be changed</div>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="ep-panel ep-anim" style={{ '--d': '0.16s' }}>
            <div className="ep-panel-head">
              <div className="ep-head-ic" style={{ '--c': '#198754' }}><i className="fas fa-key" /></div>
              <div>
                <div className="ep-panel-title">Change password</div>
                <div className="ep-panel-sub">
                  {canEditProfile ? "Leave these empty if you don't want to change your password." : 'Enter your current password, then choose a new one.'}
                </div>
              </div>
            </div>
            <div className="ep-panel-body">
              <div className="ep-field" style={{ maxWidth: 340 }}>
                <label className="ep-label">Current password</label>
                {PasswordInput('current', 'current_password', 'Enter current password')}
                <FieldError msg={fieldErrors.current_password} />
              </div>

              <Row className="g-3 mb-3">
                <Col xs={12} md={6}>
                  <label className="ep-label">New password</label>
                  {PasswordInput('new', 'new_password', 'New password')}
                  <FieldError msg={fieldErrors.new_password} />
                </Col>
                <Col xs={12} md={6}>
                  <label className="ep-label">Confirm new password</label>
                  {PasswordInput('confirm', 'confirm_password', 'Repeat new password', confirmMatches ? ' ok' : '')}
                  {fieldErrors.confirm_password
                    ? <FieldError msg={fieldErrors.confirm_password} />
                    : confirmMatches && <div className="ep-field-msg ok"><i className="fas fa-check-circle" />Passwords match</div>}
                </Col>
              </Row>

              {pw && (
                <div className="ep-reqs">
                  <div className="ep-reqs-head">
                    <span>Password strength</span>
                    <span style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                  <div className="ep-bar">
                    {[0, 1, 2, 3].map(i => <span key={i} style={i < passed ? { background: strength.color } : undefined} />)}
                  </div>
                  <div className="ep-req-grid">
                    {reqs.map(r => (
                      <div key={r.key} className={`ep-req${r.pass ? ' pass' : ''}`}>
                        <i className={`fas ${r.pass ? 'fa-check-circle' : 'fa-circle'}`} style={r.pass ? undefined : { fontSize: '0.45rem' }} />{r.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ep-actions ep-anim" style={{ '--d': '0.2s' }}>
            <button type="button" className="ep-btn ghost" onClick={handleBack} disabled={loading}>Cancel</button>
            <button type="submit" className="ep-btn primary" disabled={loading || resetting}>
              {loading
                ? <span className="ep-dots" aria-label="Saving"><span /><span /><span /></span>
                : <><i className="fas fa-check" />Save changes</>}
            </button>
          </div>
        </Form>

        {/* Super admin — reset to default */}
        {isSuperAdmin && (
          <div className="ep-panel ep-danger ep-anim" style={{ '--d': '0.24s' }}>
            <div className="ep-panel-head" style={{ borderColor: 'rgba(220,53,69,0.18)' }}>
              <div className="ep-head-ic" style={{ '--c': '#dc3545' }}><i className="fas fa-exclamation-triangle" /></div>
              <div>
                <div className="ep-panel-title">Reset to default password</div>
                <div className="ep-panel-sub">Only use this if you're locked out.</div>
              </div>
            </div>
            <div className="ep-panel-body">
              <div className="ep-danger-row">
                <div className="ep-danger-text">
                  Your password will be reset to <strong>"password"</strong>. Change it again right after you log back in.
                </div>
                {!confirmReset && (
                  <button type="button" className="ep-btn danger" onClick={() => setConfirmReset(true)} disabled={loading || resetting}>
                    <i className="fas fa-undo" />Reset password
                  </button>
                )}
              </div>
              {confirmReset && (
                <div className="ep-confirm">
                  <span><i className="fas fa-exclamation-circle me-2" />Reset your password to "password"?</span>
                  <div className="d-flex gap-2">
                    <button type="button" className="ep-btn ghost" style={{ height: 36 }} onClick={() => setConfirmReset(false)} disabled={resetting}>Cancel</button>
                    <button type="button" className="ep-btn danger-solid" style={{ height: 36 }} onClick={handleResetDefault} disabled={resetting}>
                      {resetting ? <span className="ep-dots"><span /><span /><span /></span> : 'Yes, reset'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

export default EditProfile;