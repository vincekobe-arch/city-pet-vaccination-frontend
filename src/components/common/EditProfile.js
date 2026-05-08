import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [focusedField, setFocusedField] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const isClinic = user?.role === 'private_clinic';
  const isAdmin = user?.role === 'barangay_official' || user?.role === 'super_admin';

  const verificationStatus = user?.verification_status;
  const isVerificationLocked =
    user?.role === 'pet_owner' &&
    ['pending', 'semi_verified', 'fully_verified'].includes(verificationStatus);

  const profileFieldsDisabled = isAdmin || isClinic || isVerificationLocked;

  const lockedHint =
    isAdmin || isClinic
      ? 'Profile info cannot be changed for this account type.'
      : isVerificationLocked
      ? `Your account is ${verificationStatus.replace(/_/g, ' ')} — only your password can be changed.`
      : null;

  const from = location.state?.from || (
    user?.role === 'barangay_official' ? '/admin/dashboard' :
    user?.role === 'pet_owner' ? '/owner/dashboard' :
    '/clinic/dashboard'
  );

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
    setSuccess('');
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
  };

  const toggleShow = (field) => setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validate
    if (!isClinic && !isAdmin && !isVerificationLocked) {
  if (!formData.first_name.trim()) { setFieldErrors(p => ({ ...p, first_name: 'First name is required' })); return; }
  if (!formData.last_name.trim()) { setFieldErrors(p => ({ ...p, last_name: 'Last name is required' })); return; }
  if (formData.phone && !/^09\d{9}$/.test(formData.phone)) { setFieldErrors(p => ({ ...p, phone: 'Phone must be 11 digits starting with 09' })); return; }
}

    const changingPassword = formData.new_password || formData.current_password;
    if (changingPassword) {
      if (!formData.current_password) { setFieldErrors(p => ({ ...p, current_password: 'Current password is required' })); return; }
      if (!formData.new_password) { setFieldErrors(p => ({ ...p, new_password: 'New password is required' })); return; }
      const errs = validatePassword(formData.new_password);
      if (errs.length > 0) { setError('New password does not meet requirements.'); return; }
      if (formData.new_password !== formData.confirm_password) { setFieldErrors(p => ({ ...p, confirm_password: 'Passwords do not match' })); return; }
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {};
      if (changingPassword) {
        payload.current_password = formData.current_password;
        payload.password = formData.new_password;
      }

      const endpoint = isClinic
        ? `/users/${user.id}/change-password`
        : `/owners/${user.id}`;

      await api.put(endpoint, payload);

      setSuccess('Profile updated successfully!');
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
      setPasswordErrors([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const bg = darkMode ? '#0d0d0d' : '#f5f5f5';
  const cardBg = darkMode ? '#111111' : '#ffffff';
  const textColor = darkMode ? '#e0e0e0' : '#1a1a1a';
  const subText = darkMode ? '#888' : '#9ca3af';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const inputBg = darkMode ? '#1a1a1a' : '#f8f9fa';

  const inputStyle = (fieldName) => ({
    height: '50px',
    borderRadius: '12px',
    border: fieldErrors[fieldName]
      ? '2px solid #ef4444'
      : focusedField === fieldName
      ? '2px solid #ffc107'
      : `1.5px solid ${border}`,
    fontSize: '0.9rem',
    background: inputBg,
    color: textColor,
    fontWeight: '500',
    transition: 'all 0.2s',
    paddingLeft: '14px',
    paddingRight: '14px',
  });

  const labelStyle = {
    fontWeight: '600',
    color: textColor,
    fontSize: '0.82rem',
    marginBottom: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const pwStrengthColor = () => {
    if (!formData.new_password) return subText;
    if (passwordErrors.length > 2) return '#ef4444';
    if (passwordErrors.length > 0) return '#f59e0b';
    return '#10b981';
  };
  const pwStrengthWidth = () => {
    if (!formData.new_password) return '0%';
    return `${Math.max(25, 100 - passwordErrors.length * 25)}%`;
  };
  const pwStrengthLabel = () => {
    if (!formData.new_password) return '';
    if (passwordErrors.length > 2) return 'Weak';
    if (passwordErrors.length > 0) return 'Medium';
    return 'Strong';
  };

  const SectionLabel = ({ icon, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', marginTop: '1.5rem' }}>
      <i className={`fas ${icon}`} style={{ color: '#ffc107', fontSize: '0.85rem' }} />
      <span style={{ fontWeight: '700', fontSize: '0.8rem', color: subText, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: border }} />
    </div>
  );

  const FieldError = ({ msg }) => msg
    ? <small style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
        <i className="fas fa-times-circle me-1" />{msg}
      </small>
    : null;

  const EyeBtn = ({ field }) => (
    <button type="button" onClick={() => toggleShow(field)} tabIndex={-1}
      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: subText, padding: 0 }}>
      <i className={`fas fa-eye${showPasswords[field] ? '-slash' : ''}`} style={{ fontSize: '0.9rem' }} />
    </button>
  );

  const handleBack = () => {
    const el = document.getElementById('edit-profile-page');
    if (el) {
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(40px)';
      setTimeout(() => navigate(from), 300);
    } else {
      navigate(from);
    }
  };

  return (
    <div id="edit-profile-page" className="edit-profile-page" style={{ minHeight: '100vh', background: bg, paddingTop: '64px', transition: 'background 0.3s', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes dropDown {
          0% { opacity: 0; transform: translateY(-40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInFromRight {
          0% { opacity: 0; transform: translateX(40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .edit-profile-page {
          animation: slideInFromRight 0.45s cubic-bezier(0.4,0,0.2,1);
        }
        .edit-profile-card {
          animation: dropDown 0.6s cubic-bezier(0.4,0,0.2,1) 0.1s both;
        }
        .edit-profile-back {
          animation: fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.05s both;
        }
        @media (max-width: 768px) {
          .edit-profile-container {
            padding-top: 1rem !important;
            padding-bottom: 2rem !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          .edit-profile-card-inner {
            padding: 1.25rem !important;
            border-radius: 16px !important;
          }
          .edit-profile-header-name {
            font-size: 0.95rem !important;
          }
          .edit-profile-section-label span {
            font-size: 0.7rem !important;
          }
          .edit-profile-submit {
            height: 46px !important;
            font-size: 0.88rem !important;
          }
        }
      `}</style>

      

      <Container className="edit-profile-container" style={{ maxWidth: '640px', paddingTop: '2rem', paddingBottom: '3rem', position: 'relative', zIndex: 1 }}>

        {/* Back button */}
        <button
          className="edit-profile-back"
          onClick={handleBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: subText, fontSize: '0.88rem', fontWeight: '600',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginBottom: '1.25rem', padding: 0, transition: 'color 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.color = '#ffc107'}
          onMouseOut={e => e.currentTarget.style.color = subText}
        >
          <i className="fas fa-arrow-left" style={{ fontSize: '0.8rem' }} />
          Back
        </button>

        <div className="edit-profile-card edit-profile-card-inner" style={{ background: cardBg, borderRadius: '20px', border: `1px solid ${border}`, padding: '2rem', boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.06)' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: `1px solid ${border}` }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: darkMode ? '#222' : '#f0f0f0', border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'float 3s ease-in-out infinite' }}>
              <i className={`fas ${isClinic ? 'fa-hospital' : 'fa-user'}`} style={{ fontSize: '1.2rem', color: darkMode ? '#bbb' : '#555' }} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: textColor }}>
                {isClinic ? (user?.clinic_name || user?.first_name) : `${user?.first_name} ${user?.last_name}`}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#ffc107', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                {isClinic ? 'Private Clinic' : user?.role === 'barangay_official' ? 'Admin' : 'Community'}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-exclamation-circle" />{error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-check-circle" />{success}
            </div>
          )}

          <Form onSubmit={handleSubmit}>

            {/* Profile info — hidden for clinic */}
            {!isClinic && (
  <>
    <SectionLabel icon="fa-address-card" label="Profile Information" />
    {lockedHint && (
      <div style={{ background: 'rgba(255,193,7,0.08)', border: '1.5px solid rgba(255,193,7,0.25)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#ffc107', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fas fa-lock" />{lockedHint}
      </div>
    )}

                {/* Read-only email */}
                <Form.Group className="mb-3">
                  <Form.Label style={labelStyle}>
                    <i className="fas fa-envelope" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                    Email
                  </Form.Label>
                  <Form.Control
                    type="email" value={user?.email || ''} readOnly
                    style={{ ...inputStyle('email'), background: darkMode ? '#1a1a1a' : '#e9ecef', color: subText, cursor: 'not-allowed' }}
                  />
                  <small style={{ color: subText, fontSize: '0.75rem', marginTop: '3px', display: 'block' }}>
                    <i className="fas fa-lock me-1" />Email cannot be changed
                  </small>
                </Form.Group>

                <Row>
                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={labelStyle}>
                        <i className="fas fa-user" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                        First Name <span style={{ color: '#ef4444' }}>*</span>
                      </Form.Label>
                      <Form.Control
                        type="text" name="first_name" value={formData.first_name}
                        onChange={handleChange} onFocus={() => setFocusedField('first_name')} onBlur={() => setFocusedField(null)}
placeholder="First name" disabled={loading || profileFieldsDisabled} style={inputStyle('first_name')}
                      />
                      <FieldError msg={fieldErrors.first_name} />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={labelStyle}>
                        <i className="fas fa-user" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                        Middle Name
                      </Form.Label>
                      <Form.Control
                        type="text" name="middle_name" value={formData.middle_name}
                        onChange={handleChange} onFocus={() => setFocusedField('middle_name')} onBlur={() => setFocusedField(null)}
placeholder="Optional" disabled={loading || profileFieldsDisabled} style={inputStyle('middle_name')}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={labelStyle}>
                        <i className="fas fa-user" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                        Last Name <span style={{ color: '#ef4444' }}>*</span>
                      </Form.Label>
                      <Form.Control
                        type="text" name="last_name" value={formData.last_name}
                        onChange={handleChange} onFocus={() => setFocusedField('last_name')} onBlur={() => setFocusedField(null)}
placeholder="Last name" disabled={loading || profileFieldsDisabled} style={inputStyle('last_name')}
                      />
                      <FieldError msg={fieldErrors.last_name} />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-1">
                  <Form.Label style={labelStyle}>
                    <i className="fas fa-phone" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                    Phone Number
                  </Form.Label>
                  <Form.Control
                    type="tel" name="phone" value={formData.phone}
                    onChange={handleChange} onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
placeholder="09123456789" disabled={loading || profileFieldsDisabled}
                    style={{
                      ...inputStyle('phone'),
                      border: fieldErrors.phone
                        ? '2px solid #ef4444'
                        : (formData.phone && !fieldErrors.phone && /^09\d{9}$/.test(formData.phone))
                        ? '2px solid #10b981'
                        : focusedField === 'phone' ? '2px solid #ffc107' : `1.5px solid ${border}`,
                    }}
                  />
                  <FieldError msg={fieldErrors.phone} />
                </Form.Group>
              </>
            )}

            {/* Read-only email for clinic */}
            {isClinic && (
              <>
                <SectionLabel icon="fa-user-circle" label="Account" />
                <Form.Group className="mb-3">
                  <Form.Label style={labelStyle}>
                    <i className="fas fa-envelope" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                    Email
                  </Form.Label>
                  <Form.Control
                    type="email" value={user?.email || ''} readOnly
                    style={{ ...inputStyle('email'), background: darkMode ? '#1a1a1a' : '#e9ecef', color: subText, cursor: 'not-allowed' }}
                  />
                  <small style={{ color: subText, fontSize: '0.75rem', marginTop: '3px', display: 'block' }}>
                    <i className="fas fa-lock me-1" />Email cannot be changed
                  </small>
                </Form.Group>
              </>
            )}

            {/* Password section */}
            <SectionLabel icon="fa-lock" label="Change Password" />
            <div style={{ background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${border}`, borderRadius: '12px', padding: '1rem 1.1rem', marginBottom: '1rem', fontSize: '0.82rem', color: subText }}>
              <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }} />
              Leave the password fields empty if you don't want to change it.
            </div>

            <Form.Group className="mb-3">
              <Form.Label style={labelStyle}>
                <i className="fas fa-key" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                Current Password
              </Form.Label>
              <div style={{ position: 'relative' }}>
                <Form.Control
                  type={showPasswords.current ? 'text' : 'password'}
                  name="current_password" value={formData.current_password}
                  onChange={handleChange} onFocus={() => setFocusedField('current_password')} onBlur={() => setFocusedField(null)}
                  placeholder="Enter current password" disabled={loading}
                  style={{ ...inputStyle('current_password'), paddingRight: '44px' }}
                />
                <EyeBtn field="current" />
              </div>
              <FieldError msg={fieldErrors.current_password} />
            </Form.Group>

            <Row>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={labelStyle}>
                    <i className="fas fa-lock" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                    New Password
                  </Form.Label>
                  <div style={{ position: 'relative' }}>
                    <Form.Control
                      type={showPasswords.new ? 'text' : 'password'}
                      name="new_password" value={formData.new_password}
                      onChange={handleChange} onFocus={() => setFocusedField('new_password')} onBlur={() => setFocusedField(null)}
                      placeholder="New password" disabled={loading}
                      style={{ ...inputStyle('new_password'), paddingRight: '44px' }}
                    />
                    <EyeBtn field="new" />
                  </div>
                  <FieldError msg={fieldErrors.new_password} />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={labelStyle}>
                    <i className="fas fa-lock" style={{ color: '#ffc107', fontSize: '0.75rem' }} />
                    Confirm New Password
                  </Form.Label>
                  <div style={{ position: 'relative' }}>
                    <Form.Control
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirm_password" value={formData.confirm_password}
                      onChange={handleChange} onFocus={() => setFocusedField('confirm_password')} onBlur={() => setFocusedField(null)}
                      placeholder="Repeat new password" disabled={loading}
                      style={{
                        ...inputStyle('confirm_password'),
                        paddingRight: '44px',
                        border: fieldErrors.confirm_password
                          ? '2px solid #ef4444'
                          : (formData.confirm_password && formData.confirm_password === formData.new_password)
                          ? '2px solid #10b981'
                          : focusedField === 'confirm_password' ? '2px solid #ffc107' : `1.5px solid ${border}`,
                      }}
                    />
                    <EyeBtn field="confirm" />
                  </div>
                  <FieldError msg={fieldErrors.confirm_password} />
                  {formData.confirm_password && formData.confirm_password === formData.new_password && (
                    <small style={{ color: '#10b981', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                      <i className="fas fa-check-circle me-1" />Passwords match
                    </small>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {/* Password requirements */}
            {formData.new_password && (
              <div style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : '#f8f9fa', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: `1px solid ${border}` }}>
                <div style={{ fontWeight: '700', fontSize: '0.78rem', color: '#ffc107', marginBottom: '8px' }}>
                  <i className="fas fa-shield-alt me-1" /> Password Requirements
                </div>
                {[
                  { key: 'length', label: 'At least 8 characters', pass: formData.new_password.length >= 8 },
                  { key: 'uppercase', label: 'One uppercase letter (A–Z)', pass: /[A-Z]/.test(formData.new_password) },
                  { key: 'lowercase', label: 'One lowercase letter (a–z)', pass: /[a-z]/.test(formData.new_password) },
                  { key: 'number', label: 'One number (0–9)', pass: /\d/.test(formData.new_password) },
                ].map(r => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.82rem', color: r.pass ? '#10b981' : subText, marginBottom: '4px', transition: 'color 0.25s' }}>
                    <i className={`fas fa-${r.pass ? 'check-circle' : 'circle'}`} style={{ fontSize: '0.8rem' }} />
                    {r.label}
                  </div>
                ))}
                <div style={{ marginTop: '10px', height: '5px', borderRadius: '10px', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: pwStrengthWidth(), height: '100%', background: pwStrengthColor(), borderRadius: '10px', transition: 'all 0.4s ease' }} />
                </div>
                {pwStrengthLabel() && (
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: pwStrengthColor(), marginTop: '5px' }}>
                    {pwStrengthLabel()} Password
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" disabled={loading} className="w-100 border-0 edit-profile-submit"
              style={{
                height: '50px', borderRadius: '14px',
                background: loading ? '#6b7280' : 'linear-gradient(135deg, #ffc107, #ffb300)',
                color: '#000', fontWeight: '700', fontSize: '0.95rem',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(255,193,7,0.35)',
                transition: 'all 0.3s',
              }}
              onMouseOver={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,193,7,0.5)'; } }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,193,7,0.35)'; }}
            >
              {loading
                ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Saving…</>
                : <><i className="fas fa-save me-2" />Save Changes</>}
            </Button>

          </Form>
        </div>
      </Container>
    </div>
  );
};

export default EditProfile;