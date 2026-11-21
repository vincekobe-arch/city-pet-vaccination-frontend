import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Modal, Form } from 'react-bootstrap';
import { officialAPI, handleAPIError } from '../../services/api';

const AnimatedStatValue = ({ value, loading }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  const hasAnimatedRef = React.useRef(false);

  React.useEffect(() => {
    if (loading || hasAnimatedRef.current || value === 0) return;
    hasAnimatedRef.current = true;
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const current = step >= steps ? value : Math.round(increment * step);
      setDisplayValue(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [loading, value]);

  if (loading) {
    return (
      <span style={{
        display: 'inline-block', width: '3ch', height: '1em',
        borderRadius: '6px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        verticalAlign: 'middle'
      }} />
    );
  }
  return displayValue;
};

const OfficialManagement = () => {
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    birthdate: '',
    gender: '',
    phone: '',
    office_role: '',
    office_role_custom: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Selected official
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(null);

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;


  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
  setCurrentPage(1);
}, [filterStatus, searchTerm]);

  useEffect(() => {
    if (showDropdown === null) return;
    const closeOnScroll = () => setShowDropdown(null);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [showDropdown]);

  // silent = refresh after an action without showing the skeleton again
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const officialsRes = await officialAPI.getAll();
      setOfficials(officialsRes.data.officials || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const OFFICE_ROLES = [
    'City Veterinarian',
    'Assistant City Veterinarian',
    'Veterinary Technician',
    'Animal Control Officer',
    'Administrative Staff',
    'Vaccination Officer',
    'Field Officer',
    'Microchipping Officer',
    'Sterilization Officer',
    'Records Officer',
    'Other',
  ];

  const resetForm = () => {
    setFormData({
      first_name: '',
      middle_name: '',
      last_name: '',
      birthdate: '',
      gender: '',
      phone: '',
      office_role: '',
      office_role_custom: ''
    });
    setFormError('');
    setFieldErrors({});
  };

  const [fieldErrors, setFieldErrors] = useState({});

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      const numericOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, phone: numericOnly }));
      setFieldErrors(prev => ({
        ...prev,
        phone: numericOnly && !/^09\d{9}$/.test(numericOnly)
          ? 'Phone must be 11 digits starting with 09'
          : ''
      }));
      if (formError) setFormError('');
      return;
    }

    if (['first_name', 'middle_name', 'last_name'].includes(name)) {
      if (value && !/^[a-zA-Z.\s-]*$/.test(value)) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Only letters, dots, spaces, and hyphens allowed' }));
      } else if (value && value.startsWith('-')) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Cannot start with a hyphen' }));
      } else if (value && value.startsWith(' ')) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Cannot start with a space' }));
      } else if (value && /\s{2,}/.test(value)) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Cannot contain multiple consecutive spaces' }));
      } else if (value && /--/.test(value)) {
        setFieldErrors(prev => ({ ...prev, [name]: 'Cannot contain consecutive hyphens' }));
      } else {
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
      }
    }

     if (name === 'birthdate') {
      if (value) {
        const birth = new Date(value);
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 18);
        setFieldErrors(prev => ({ ...prev, birthdate: birth > minAge ? 'Admin must be at least 18 years old' : '' }));
      } else {
        setFieldErrors(prev => ({ ...prev, birthdate: '' }));
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      setFormError('First name is required');
      return false;
    }
    if (!formData.last_name.trim()) {
      setFormError('Last name is required');
      return false;
    }
    if (!formData.birthdate) {
      setFormError('Birthdate is required');
      return false;
    }
    const birthDate = new Date(formData.birthdate);
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 18);
    if (birthDate > minAge) {
      setFormError('Admin must be at least 18 years old');
      return false;
    }
    
    return true;
  };

  // Generate next sequential ID for the official
  const generateNextOfficialId = () => {
    const currentYear = new Date().getFullYear();
    const currentYearOfficials = officials.filter(off => {
      const emailParts = off.email.split('.');
      if (emailParts.length >= 2) {
        const yearId = emailParts[1].split('@')[0];
        return yearId.startsWith(currentYear.toString());
      }
      return false;
    });
    
    const nextNumber = currentYearOfficials.length + 1;
    return `${currentYear}${String(nextNumber).padStart(3, '0')}`;
  };

  // Generate email and username
  const generateCredentials = (lastName) => {
    const officialId = generateNextOfficialId();
    const email = `${lastName.toLowerCase()}.${officialId}@muntinlupa.gov.ph`;
    const username = `${lastName.toLowerCase()}.${officialId}`;
    return { email, username, officialId };
  };

  const handleAddOfficial = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditOfficial = (official) => {
    setSelectedOfficial(official);
    const isCustomRole = official.office_role && !OFFICE_ROLES.slice(0, -1).includes(official.office_role);
    setFormData({
      first_name: official.first_name,
      middle_name: official.middle_name || '',
      last_name: official.last_name,
      birthdate: official.birthdate || '',
      gender: official.gender || '',
      phone: official.phone || '',
      office_role: isCustomRole ? 'Other' : (official.office_role || ''),
      office_role_custom: isCustomRole ? official.office_role : ''
    });
    setFormError('');
    setFieldErrors({});
    setShowEditModal(true);
  };

  const handleViewOfficial = (official) => {
    setSelectedOfficial(official);
    setShowViewModal(true);
  };

  const handleDeleteOfficial = (official) => {
    setSelectedOfficial(official);
    setShowDeleteModal(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormLoading(true);
    setFormError('');

    try {
      const { email, username } = generateCredentials(formData.last_name);
      
      const submitData = {
        ...formData,
        username: username,
        email: email,
        password: 'admin123',
        address: '',
        license_number: '',
        specialization: '',
        is_primary_contact: false,
        office_role: formData.office_role === 'Other' ? (formData.office_role_custom || 'Other') : formData.office_role,
        assigned_barangay_id: null
      };

      await officialAPI.create(submitData);
      setSuccess(`Barangay official added successfully! Email: ${email}`);
      setShowAddModal(false);
      resetForm();
      loadData(true);
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormLoading(true);
    setFormError('');

    try {
       const updateData = {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        birthdate: formData.birthdate,
        gender: formData.gender,
        phone: formData.phone,
        office_role: formData.office_role === 'Other' ? (formData.office_role_custom || 'Other') : formData.office_role
      };
      
      await officialAPI.update(selectedOfficial.id, updateData);
      setSuccess('Official updated successfully!');
      setShowEditModal(false);
      resetForm();
      setSelectedOfficial(null);
      loadData(true);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);

    try {
      await officialAPI.delete(selectedOfficial.id);
      setSuccess('Official deactivated successfully!');
      setShowDeleteModal(false);
      loadData(true);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setFormLoading(false);
    }
  };
  const handleRestoreOfficial = (official) => {
    setSelectedOfficial(official);
    setShowRestoreModal(true);
  };

  const handleConfirmRestore = async () => {
    setFormLoading(true);
    try {
      await officialAPI.restore(selectedOfficial.id);
      setSuccess('Official restored successfully!');
      setShowRestoreModal(false);
      loadData(true);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = (official) => {
    setSelectedOfficial(official);
    setShowResetPasswordModal(true);
  };

  const handleConfirmResetPassword = async () => {
    setFormLoading(true);
    try {
      await officialAPI.resetAdminPassword(selectedOfficial.id);
      setSuccess(`Password of ${selectedOfficial.first_name} reset to admin123 successfully!`);
      setShowResetPasswordModal(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setFormLoading(false);
    }
  };


  // Filtering logic
  const filteredOfficials = officials.filter(official => {
    const matchesStatus = filterStatus === 'all' 
      ? true 
      : filterStatus === 'active' 
        ? official.is_active === 1 
        : official.is_active === 0;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${official.first_name || ''} ${official.middle_name || ''} ${official.last_name || ''}`.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      fullName.includes(searchLower) ||
      (official.email || '').toLowerCase().includes(searchLower) ||
      (official.phone || '').includes(searchTerm) ||
      (official.username || '').toLowerCase().includes(searchLower) ||
      (official.barangay_name || '').toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });

  // Pagination calculations
const totalPages = Math.max(1, Math.ceil(filteredOfficials.length / itemsPerPage));
const startIdx = (currentPage - 1) * itemsPerPage;
const endIdx = startIdx + itemsPerPage;
const paginatedOfficials = filteredOfficials.slice(startIdx, endIdx);

// Statistics
  const maxBirthdate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })();
  const activeOfficials = officials.filter(o => o.is_active === 1);
  const inactiveOfficials = officials.filter(o => o.is_active === 0);
  const uniqueBarangays = [...new Set(activeOfficials.map(o => o.assigned_barangay_id))].filter(Boolean);
  const averagePerBarangay = uniqueBarangays.length > 0 ? (activeOfficials.length / uniqueBarangays.length).toFixed(1) : 0;

  const styles = `
    @keyframes dropDown { 0% { opacity: 0; transform: translateY(-30px); } 100% { opacity: 1; transform: translateY(0); } }
    @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .ad-wrap { zoom: 0.75; }
    @media (min-width: 1600px) { .ad-wrap { zoom: 0.9; } }
    @media (min-width: 1920px) { .ad-wrap { zoom: 1; } }
    @media (max-width: 768px) { .ad-wrap { zoom: 1; } }
    /* ---------------- Admin Management ---------------- */
    @keyframes adIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes adRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes adMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes adToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes adGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .ad-anim { animation: adIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .ad-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .ad-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .ad-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.86rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .ad-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .ad-btn.primary { background: #ffc107; color: #1f2328; }
    .ad-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }

    .ad-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: adToast 0.35s ease-out; }
    .ad-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ad-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .ad-toast .d { color: #6b7280; font-size: 0.84rem; }
    .ad-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .ad-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .ad-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); overflow: hidden; }
    .ad-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; border-bottom: 1px solid #eef0f3; }
    .ad-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
    .ad-panel-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .ad-panel-sub { font-size: 0.76rem; color: #6b7280; }

    .ad-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem 0.75rem; }
    .ad-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: #1f2328; }
    .ad-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .ad-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f3f4f6; }
    .ad-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #5b6270; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .ad-seg button:hover { color: #1f2328; }
    .ad-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .ad-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0 1.25rem 1rem; border-bottom: 1px solid #eef0f3; }
    .ad-search, .ad-select { position: relative; }
    .ad-search { flex: 1 1 260px; }
    .ad-search > i, .ad-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.78rem; pointer-events: none; }
    .ad-input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .ad-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.ad-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
    .ad-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: #9ca3af; }
    .ad-clear:hover { background: #f3f4f6; color: #1f2328; }
    .ad-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
    .ad-link:hover { text-decoration: underline; }

    .ad-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .ad-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .ad-table td { padding: 0.8rem 0.65rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .ad-table tbody tr { animation: adRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .ad-table tbody tr:hover { background: #fafbfc; }
    .ad-table tbody tr:last-child td { border-bottom: none; }
    .ad-table tbody tr.raised { position: relative; z-index: 5; }
    .ad-strong { font-weight: 600; color: #1f2328; }
    .ad-muted { font-size: 0.78rem; color: #6b7280; }
    .ad-ellipsis { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ad-date { width: 48px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.35rem 0; line-height: 1.1; }
    .ad-date .m { display: block; font-size: 0.62rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .ad-date .d { display: block; font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .ad-type-ic { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .ad-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 130px; }
    .ad-bar > div { height: 100%; border-radius: 3px; transform-origin: left; animation: adGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
    .ad-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .ad-pill i { font-size: 0.4rem; }

    .ad-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .ad-icon-btn:hover, .ad-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .ad-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1050; animation: adMenu 0.16s ease-out; transform-origin: top right; text-align: left; }
    .ad-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
    .ad-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .ad-menu-item:hover { background: #f6f7f9; }
    .ad-menu-item.danger, .ad-menu-item.danger i { color: #dc3545; }
    .ad-menu-item.danger:hover { background: #fff5f5; }
    .ad-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }

    .ad-empty { text-align: center; padding: 3rem 1rem; }
    .ad-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .ad-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .ad-empty p { color: #6b7280; font-size: 0.88rem; margin-bottom: 1rem; }
    .ad-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }

    .ad-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid #eef0f3; }
    .ad-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .ad-page:hover:not(:disabled) { background: #f3f4f6; }
    .ad-page.on { background: #ffc107; color: #1f2328; }
    .ad-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .ad-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .ad-btn:focus-visible, .ad-seg button:focus-visible, .ad-icon-btn:focus-visible, .ad-menu-item:focus-visible, .ad-page:focus-visible, .ad-link:focus-visible, .ad-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .ad-title { font-size: 1.45rem; }
      .ad-sub { font-size: 0.85rem; }
      .ad-filters select.ad-input { min-width: 0; width: 100%; }
      .ad-select { flex: 1 1 140px; }
      .ad-ellipsis { max-width: 160px; }
      .ad-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ad-anim, .ad-table tbody tr, .ad-menu, .ad-toast, .ad-bar > div, .ad-skel { animation: none !important; }
    }
    .ad-toolbar { border-bottom: 1px solid #eef0f3; padding-bottom: 1rem; }
    .ad-filters { padding-top: 1rem; }
    .ad-table { table-layout: fixed; }
    .ad-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,193,7,0.18); color: #8a6700; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 800; flex-shrink: 0; }
    .ad-ic { width: 14px; margin-right: 0.4rem; color: #9ca3af; font-size: 0.72rem; }
    .ad-pets { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; color: #9ca3af; }
    .ad-pets i { font-size: 0.72rem; }
    .ad-pets.has { color: #1f2328; }
    .ad-pets.has i { color: #e0a800; }
    .ad-pill i { font-size: 0.68rem; }
    .ad-active { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; font-weight: 600; }
    .ad-active i { font-size: 0.42rem; }
    .ad-active.on { color: #198754; }
    .ad-active.off { color: #6b7280; }
    .ad-menu { min-width: 230px; }
    .ad-menu-item.info, .ad-menu-item.info i { color: #0d6efd; }
    .ad-menu-item.info:hover { background: #f0f4ff; }
    .ad-menu-item.warn, .ad-menu-item.warn i { color: #b88a00; }
    .ad-menu-item.warn:hover { background: #fff8e1; }
    .ad-menu-note { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.55rem 0.7rem; margin-top: 0.2rem; border-radius: 8px; background: #fafbfc; color: #6b7280; font-size: 0.78rem; line-height: 1.45; white-space: normal; }
    .ad-menu-note i { margin-top: 2px; color: #9ca3af; }
    @media (max-width: 768px) {
      .ad-table { table-layout: auto; }
      .ad-table th { width: auto !important; }
    }
    .ad-menu-item.success, .ad-menu-item.success i { color: #198754; }
    .ad-menu-item.success:hover { background: #f0fff4; }
    .ad-role { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: rgba(255,193,7,0.14); color: #8a6500; border-radius: 999px; padding: 0.22rem 0.7rem; font-size: 0.74rem; font-weight: 700; }
    @media (max-width: 768px) {
      .ad-table .m-hide { display: none !important; }
    }

    /* laptops: hide birthdate so name, contact and role have room */
    @media (min-width: 769px) and (max-width: 1199px) {
      .ad-table .lt-hide { display: none !important; }
      .ad-ellipsis { max-width: 100%; }
    }
    /* ---------------- Modals ---------------- */
    /* ---------------- Modals ---------------- */
    .mm-zoom-modal { zoom: 0.75; }
    @media (min-width: 1600px) { .mm-zoom-modal { zoom: 0.9; } }
    @media (min-width: 1920px) { .mm-zoom-modal { zoom: 1; } }
    .mm-backdrop-top { z-index: 1060 !important; }
    .mm-modal { max-width: 720px; }
    .mm-small { max-width: 440px; }
    .mm-small.wide { max-width: 540px; }
    .mm-modal .modal-content, .mm-small .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    .mm-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: 1px solid #eef0f3 !important; background: linear-gradient(180deg, color-mix(in srgb, var(--c, #ffc107) 8%, #fff) 0%, #fff 100%) !important; }
    .mm-head-main { display: flex; gap: 0.9rem; align-items: center; min-width: 0; flex: 1; }
    .mm-head-ic { width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: var(--c, #e0a800); background: color-mix(in srgb, var(--c, #ffc107) 14%, #fff); }
    .mm-kicker { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: color-mix(in srgb, var(--c, #e0a800) 80%, #000); }
    .mm-title { font-size: 1.2rem; font-weight: 700; color: #1f2328; margin: 0; line-height: 1.3; }
    .mm-head-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .mm-body { padding: 1.4rem 1.5rem !important; }
    .mm-section { margin-bottom: 1.25rem; }
    .mm-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.7rem; }
    .mm-section-title > i { color: #e0a800; font-size: 0.8rem; }

    /* fields inside the modals */
    .mm-zoom-modal .form-label { font-size: 0.84rem !important; font-weight: 600 !important; color: #374151 !important; margin-bottom: 0.35rem; }
    .mm-zoom-modal .form-control, .mm-zoom-modal .form-select { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; box-shadow: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .mm-zoom-modal .form-control:focus, .mm-zoom-modal .form-select:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .mm-zoom-modal .form-control.is-invalid { border-color: #dc3545 !important; }
    .mm-zoom-modal .form-control:disabled, .mm-zoom-modal .form-select:disabled { background-color: #f8f9fa !important; }
    .mm-zoom-modal .form-text { font-size: 0.76rem; }
    .mm-zoom-modal .alert { border-radius: 10px; font-size: 0.86rem; border-width: 1px; }
    .mm-zoom-modal .form-check-input:checked { background-color: #ffc107; border-color: #ffc107; }

    .mm-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.86rem; margin-bottom: 1rem; }
    .mm-alert i { margin-top: 3px; }
    .mm-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #842029; }
    .mm-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; align-items: center; gap: 0.6rem; flex-wrap: nowrap !important; }
    .mm-foot > * { margin: 0 !important; }
    .mm-foot.even > * { flex: 1; }
    .mm-btn { display: inline-flex !important; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 10px !important; border: 1px solid transparent !important; font-weight: 700 !important; font-size: 0.9rem !important; padding: 0.65rem 1.2rem !important; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .mm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .mm-btn.primary { background: #ffc107 !important; color: #1f2328 !important; }
    .mm-btn.primary:hover:not(:disabled) { background: #f0b400 !important; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .mm-btn.ghost { background: #fff !important; color: #1f2328 !important; border-color: #e5e7eb !important; font-weight: 600 !important; }
    .mm-btn.ghost:hover:not(:disabled) { background: #f6f7f9 !important; }
    .mm-btn.solid { background: var(--c) !important; color: #fff !important; }
    .mm-btn.solid:hover:not(:disabled) { background: color-mix(in srgb, var(--c) 85%, #000) !important; }

    /* view details */
    .mm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .mm-info { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.7rem 0.8rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fff; }
    .mm-info.wide { grid-column: 1 / -1; }
    .mm-info-ic { width: 30px; height: 30px; border-radius: 9px; background: #f6f7f9; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .mm-info-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .mm-info-value { font-size: 0.92rem; font-weight: 600; color: #1f2328; word-break: break-word; }
    .mm-none { color: #b8bdc6; font-weight: 500; }

    /* small centered modals */
    @keyframes rxPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    .mm-small-body { padding: 1.75rem 1.6rem 1.25rem !important; text-align: center; }
    .mm-small-icon { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); animation: rxPop 0.4s ease-out; }
    .mm-small-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; }
    .mm-small-text { font-size: 0.88rem; color: #6b7280; margin-bottom: 1.1rem; line-height: 1.55; }
    .mm-item { display: flex; align-items: center; gap: 0.7rem; text-align: left; padding: 0.7rem 0.85rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .mm-item-av { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, #fff); }
    .mm-item-name { font-weight: 700; color: #1f2328; font-size: 0.94rem; }
    .mm-item-meta { font-size: 0.78rem; color: #6b7280; }
    .mm-item-flag { font-size: 0.76rem; font-weight: 600; color: #c2410c; margin-top: 0.2rem; }
    .mm-note { display: flex; gap: 0.5rem; align-items: flex-start; text-align: left; margin-top: 0.8rem; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.8rem; line-height: 1.5; color: color-mix(in srgb, var(--c) 80%, #000); background: color-mix(in srgb, var(--c) 6%, #fff); border: 1px solid color-mix(in srgb, var(--c) 20%, #fff); }
    .mm-note i { margin-top: 3px; }

    @media (max-width: 768px) {
      .mm-zoom-modal { zoom: 1; }
      .mm-zoom-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
      .mm-zoom-modal .modal-dialog-scrollable { height: calc(100% - 1.5rem); }
      .mm-head { padding: 1rem !important; }
      .mm-head-ic { width: 40px; height: 40px; }
      .mm-title { font-size: 1.05rem; }
      .mm-body { padding: 1rem !important; }
      .mm-info { padding: 0.6rem 0.65rem; gap: 0.5rem; }
      .mm-info-ic { display: none; }
      .mm-foot { padding: 0.75rem 1rem !important; }
      .mm-foot > * { flex: 1; }
      .mm-small-body { padding: 1.5rem 1.1rem 1rem !important; }
    }
    @media (max-width: 380px) { .mm-grid { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .mm-small-icon { animation: none; } }
    /* extras */
    .mm-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.3rem; }
    .mm-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; padding: 0.18rem 0.6rem; border-radius: 999px; white-space: nowrap; }
    .mm-chip i { font-size: 0.66rem; }
    .mm-chip.grey { background: #f3f4f6; color: #4b5563; }
    .mm-num, .mm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .mm-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .mm-req { color: #dc3545; }
    .mm-opt { font-size: 0.72rem; font-weight: 600; color: #9ca3af; text-transform: none; letter-spacing: 0; }
    .mm-label { font-size: 0.84rem; font-weight: 600; color: #374151; margin-bottom: 0.35rem; }
    .mm-input { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .mm-input:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .mm-input.good { border-color: #10b981 !important; }
    .mm-input.bad { border-color: #ef4444 !important; }
    .mm-hint { font-size: 0.78rem; color: #6b7280; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem; }
    .mm-hint.bad { color: #dc3545; }
    .mm-alert.page { margin-bottom: 1.25rem; align-items: center; }
    .mm-alert.page span { flex: 1; }
    .mm-alert.page button { border: none; background: transparent; color: inherit; width: 28px; height: 28px; border-radius: 7px; opacity: 0.7; }
    .mm-avatar { width: 54px; height: 54px; border-radius: 50%; flex-shrink: 0; background: rgba(255,193,7,0.18); color: #8a6700; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; }
    .mm-chip.green { background: rgba(25,135,84,0.12); color: #198754; }
    .mm-note-box { display: flex; gap: 0.7rem; align-items: flex-start; padding: 0.8rem 0.95rem; margin-bottom: 1.25rem; border-radius: 12px; background: rgba(13,202,240,0.07); border: 1px solid rgba(13,202,240,0.3); font-size: 0.86rem; color: #055160; line-height: 1.5; }
    .mm-note-box > i { margin-top: 3px; color: #0aa2c0; }
    .mm-note-box code { background: #fff; padding: 0.05rem 0.4rem; border-radius: 6px; color: #b02a37; }
    .mm-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .mm-kpi { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid #eef0f3; background: #fafbfc; }
    .mm-kpi .ic { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); flex-shrink: 0; }
    .mm-kpi .v { font-size: 1.5rem; font-weight: 800; color: #1f2328; line-height: 1.1; }
    .mm-kpi .v.sm { font-size: 0.98rem; }
    .mm-kpi .k { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .mm-item-av { color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); }
    .mm-cred { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin-top: 0.55rem; padding-top: 0.55rem; border-top: 1px dashed rgba(13,202,240,0.35); }
    .mm-cred > span { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 600; color: #1f2328; word-break: break-all; }
    .mm-cred i { color: #0aa2c0; font-size: 0.78rem; }
    .mm-kpi .v.sm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  `;

  return (
    <>
      <style>{styles}</style>
      {success && (
        <div className="ad-toast" role="status" aria-live="polite">
          <div className="ic"><i className="fas fa-check" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t">Success</div>
            <div className="d">{success}</div>
          </div>
          <button type="button" className="ad-toast-close" onClick={() => setSuccess('')} aria-label="Dismiss">
            <i className="fas fa-times" />
          </button>
        </div>
      )}
      <Container fluid className="py-4 ad-wrap" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* Header */}
        <div className="mb-4 ad-anim">
          <h2 className="ad-title">Admin Management</h2>
          <p className="ad-sub">Manage city veterinary office admin accounts, roles and access.</p>
        </div>

        {error && (
          <div className="mm-alert danger page" role="alert">
            <i className="fas fa-exclamation-circle" />
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss"><i className="fas fa-times" /></button>
          </div>
        )}

      {/* Statistics */}
      <Row className="mb-4" style={{ flexWrap: 'nowrap', margin: '0 -6px' }}>
        {[
          { label: 'Active Admin', count: activeOfficials.length, img: '/active.png', accent: '#198754', accentAlpha: 'rgba(25,135,84,0.12)', fallbackIcon: 'fa-user-check', description: 'Currently Active', delay: '0.1s' },
          { label: 'Inactive Admin', count: inactiveOfficials.length, img: '/inactive.png', accent: '#dc3545', accentAlpha: 'rgba(220,53,69,0.12)', fallbackIcon: 'fa-user-slash', description: 'Deactivated', delay: '0.2s' },
          { label: 'Average', count: averagePerBarangay, img: '/average.png', accent: '#0dcaf0', accentAlpha: 'rgba(13,202,240,0.12)', fallbackIcon: 'fa-calculator', description: 'Average admins', delay: '0.3s' },
        ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
          <div key={label} style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0, animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
            <Card
              className="border-0 h-100"
              style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${accentAlpha}`; e.currentTarget.style.borderColor = accent; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
            >
              <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
              <Card.Body style={{ padding: '1.5rem', background: 'transparent' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>{label}</p>
                    <h2 style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                      <AnimatedStatValue value={count} loading={loading} />
                    </h2>                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                      <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>{description}</span>
                    </div>
                  </div>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: accentAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={img} alt={label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                    <i className={`fas ${fallbackIcon}`} style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        ))}
      </Row>

      {/* Admins table */}
      <div className="ad-panel ad-anim" style={{ '--d': '0.15s', overflow: 'visible' }}>
        <div className="ad-toolbar">
          <div className="ad-seg" role="tablist">
            {[
              { key: 'active', label: 'Active', count: activeOfficials.length },
              { key: 'inactive', label: 'Inactive', count: inactiveOfficials.length },
              { key: 'all', label: 'All', count: officials.length },
            ].map(t => (
              <button key={t.key} type="button" role="tab" aria-selected={filterStatus === t.key}
                className={filterStatus === t.key ? 'on' : ''}
                onClick={() => { setFilterStatus(t.key); setShowDropdown(null); }}>
                {t.label} <span style={{ opacity: 0.6, marginLeft: 2 }}>{t.count}</span>
              </button>
            ))}
          </div>
          <button type="button" className="ad-btn primary" onClick={handleAddOfficial}>
            <i className="fas fa-plus" />Add admin
          </button>
        </div>

        <div className="ad-filters">
          <div className="ad-search">
            <i className="fas fa-search" />
            <input className="ad-input" placeholder="Search by name, email, phone or username..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} aria-label="Search admins" />
            {searchTerm && (
              <button type="button" className="ad-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '0 1.25rem 0.5rem' }}>
          {loading ? (
            <div style={{ padding: '0.5rem 0 1rem' }}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.12 }}>
                  <div className="ad-skel" style={{ width: 38, height: 38, borderRadius: '50%' }} />
                  <div className="flex-grow-1">
                    <div className="ad-skel" style={{ width: '28%', height: 13, marginBottom: 8 }} />
                    <div className="ad-skel" style={{ width: '14%', height: 10 }} />
                  </div>
                  <div className="ad-skel" style={{ width: 160, height: 12 }} />
                  <div className="ad-skel" style={{ width: 80, height: 22, borderRadius: 999 }} />
                </div>
              ))}
            </div>
          ) : filteredOfficials.length === 0 ? (
            <div className="ad-empty">
              <div className="ic"><i className="fas fa-user-shield" /></div>
              <h6>{searchTerm || filterStatus !== 'active' ? 'No admins found' : 'No admins added yet'}</h6>
              <p>{searchTerm || filterStatus !== 'active' ? 'Try changing or clearing the search and filters.' : 'Add an admin account to start managing the system.'}</p>
              {!searchTerm && filterStatus === 'active' && (
                <button type="button" className="ad-btn primary" onClick={handleAddOfficial}><i className="fas fa-plus" />Add first admin</button>
              )}
            </div>
          ) : (
            <div className="table-responsive" style={{ overflow: 'visible' }}>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th style={{ width: '27%' }}>Admin</th>
                    <th className="m-hide" style={{ width: '28%' }}>Contact</th>
                    <th style={{ width: '20%' }}>Office role</th>
                    <th className="m-hide lt-hide" style={{ width: '12%' }}>Birthdate</th>
                    <th style={{ width: '9%' }}>Status</th>
                    <th style={{ width: '4%' }} aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedOfficials.map((official, i) => {
                    const fullName = `${official.first_name || ''} ${official.middle_name ? official.middle_name + ' ' : ''}${official.last_name || ''}`.trim();
                    const initials = `${(official.first_name || '?')[0]}${(official.last_name || '')[0] || ''}`.toUpperCase();
                    const menuOpen = showDropdown === official.id;
                    const isActive = official.is_active === 1;
                    return (
                      <tr key={official.id} className={menuOpen ? 'raised' : ''} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td>
                          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                            <div className="ad-avatar" style={isActive ? undefined : { background: '#f3f4f6', color: '#6b7280' }}>{initials}</div>
                            <div style={{ minWidth: 0 }}>
                              <div className="ad-strong ad-ellipsis" title={fullName}>{fullName}</div>
                              <div className="ad-muted" style={{ textTransform: 'capitalize' }}>{official.gender || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="m-hide">
                          <div className="ad-ellipsis" title={official.email}><i className="fas fa-envelope ad-ic" />{official.email || '—'}</div>
                          <div className="ad-muted"><i className="fas fa-phone ad-ic" />{official.phone || '—'}</div>
                        </td>
                        <td>
                          {official.office_role ? <span className="ad-role" title={official.office_role}>{official.office_role}</span> : <span className="ad-muted">—</span>}
                        </td>
                        <td className="m-hide lt-hide">
                          {official.birthdate
                            ? <span style={{ fontSize: '0.85rem' }}>{new Date(official.birthdate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            : <span className="ad-muted">—</span>}
                        </td>
                        <td>
                          <span className={`ad-active ${isActive ? 'on' : 'off'}`}>
                            <i className="fas fa-circle" />{isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button type="button" className={`ad-icon-btn${menuOpen ? ' on' : ''}`}
                              onClick={() => setShowDropdown(menuOpen ? null : official.id)}
                              aria-label={`Options for ${fullName}`} aria-expanded={menuOpen}>
                              <i className="fas fa-ellipsis-v" />
                            </button>
                            {menuOpen && (
                              <>
                                <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
                                <div className="ad-menu" role="menu" style={{ minWidth: 200 }}>
                                  <button type="button" role="menuitem" className="ad-menu-item" onClick={() => { setShowDropdown(null); handleViewOfficial(official); }}>
                                    <i className="fas fa-eye" />View details
                                  </button>
                                  {isActive ? (
                                    <>
                                      <button type="button" role="menuitem" className="ad-menu-item" onClick={() => { setShowDropdown(null); handleEditOfficial(official); }}>
                                        <i className="fas fa-pen" />Edit admin
                                      </button>
                                      <button type="button" role="menuitem" className="ad-menu-item info" onClick={() => { setShowDropdown(null); handleResetPassword(official); }}>
                                        <i className="fas fa-key" />Reset password
                                      </button>
                                      <div className="ad-menu-sep" />
                                      <button type="button" role="menuitem" className="ad-menu-item danger" onClick={() => { setShowDropdown(null); handleDeleteOfficial(official); }}>
                                        <i className="fas fa-user-slash" />Deactivate
                                      </button>
                                    </>
                                  ) : (
                                    <button type="button" role="menuitem" className="ad-menu-item success" onClick={() => { setShowDropdown(null); handleRestoreOfficial(official); }}>
                                      <i className="fas fa-undo" />Restore admin
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredOfficials.length > itemsPerPage && (
          <div className="ad-foot">
            <span className="ad-muted" style={{ fontSize: '0.84rem' }}>
              Showing <strong style={{ color: '#1f2328' }}>{startIdx + 1}–{Math.min(endIdx, filteredOfficials.length)}</strong> of {filteredOfficials.length}
            </span>
            <div className="d-flex align-items-center gap-1">
              <button type="button" className="ad-page nav" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                <i className="fas fa-chevron-left" />
              </button>
              {(() => {
                let start = Math.max(1, currentPage - 1);
                const end = Math.min(totalPages, start + 2);
                if (end - start < 2) start = Math.max(1, end - 2);
                const pages = [];
                for (let n = start; n <= end; n++) pages.push(n);
                return pages.map(n => (
                  <button key={n} type="button" className={`ad-page${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
                ));
              })()}
              <button type="button" className="ad-page nav" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>


        {/* ════════════════════════════════════════════════════════════════
            ADD / EDIT ADMIN MODALS (same form, different header and button)
        ════════════════════════════════════════════════════════════════ */}
        {[
          { mode: 'add',  show: showAddModal,  close: () => setShowAddModal(false),  submit: handleSubmitAdd },
          { mode: 'edit', show: showEditModal, close: () => setShowEditModal(false), submit: handleSubmitEdit },
        ].map(({ mode, show, close, submit }) => {
          const isAdd = mode === 'add';
          const phoneBad = formData.phone && !/^09\d{9}$/.test(formData.phone);
          const phoneOk = formData.phone && /^09\d{9}$/.test(formData.phone);
          const invalid = formLoading || !formData.first_name.trim() || !formData.last_name.trim() || !formData.birthdate ||
            !formData.gender || !formData.office_role || (formData.office_role === 'Other' && !formData.office_role_custom?.trim()) ||
            phoneBad || Object.values(fieldErrors).some(e => !!e);
          const preview = isAdd && formData.last_name.trim() ? generateCredentials(formData.last_name.trim()) : null;
          const nameField = (name, label, required, placeholder) => (
            <>
              <Form.Label className="mm-label">{label} {required && <span className="mm-req">*</span>}</Form.Label>
              <Form.Control className={`mm-input${fieldErrors[name] ? ' bad' : ''}`} type="text" name={name} value={formData[name] || ''}
                onChange={handleFormChange}
                onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                onBlur={(e) => { const v = e.target.value; if (v.endsWith('-')) setFieldErrors(prev => ({ ...prev, [name]: 'Cannot end with a hyphen' })); else if (v.endsWith(' ')) setFieldErrors(prev => ({ ...prev, [name]: 'Cannot end with a space' })); }}
                required={required} disabled={formLoading} placeholder={placeholder} maxLength={30} />
              {fieldErrors[name] && <div className="mm-hint bad"><i className="fas fa-times-circle" />{fieldErrors[name]}</div>}
            </>
          );
          return (
            <Modal key={mode} show={show} onHide={() => !formLoading && close()} backdrop="static" dialogClassName="mm-modal" className="mm-zoom-modal" scrollable>
              <Modal.Header closeButton className="mm-head" style={{ '--c': '#e0a800' }}>
                <div className="mm-head-main">
                  <div className="mm-head-ic"><i className={`fas ${isAdd ? 'fa-user-plus' : 'fa-user-edit'}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="mm-kicker">{isAdd ? 'New admin account' : 'Edit admin'}</div>
                    <Modal.Title as="h5" className="mm-title">
                      {isAdd ? 'Add admin' : `${selectedOfficial?.first_name || ''} ${selectedOfficial?.last_name || ''}`.trim() || 'Edit admin'}
                    </Modal.Title>
                    <div className="mm-sub">Fields marked <span className="mm-req">*</span> are required.</div>
                  </div>
                </div>
              </Modal.Header>
              <Form onSubmit={submit} style={{ display: 'contents' }}>
                <Modal.Body className="mm-body">
                  {formError && <div className="mm-alert danger"><i className="fas fa-exclamation-circle" /><span>{formError}</span></div>}

                  {isAdd && (
                    <div className="mm-note-box">
                      <i className="fas fa-key" />
                      <div>
                        <strong>Login is created automatically.</strong> Email <code>lastname.YYYY###@muntinlupa.gov.ph</code>, username <code>lastname.YYYY###</code>, default password <code>admin123</code>.
                        {preview && (
                          <div className="mm-cred">
                            <span><i className="fas fa-envelope" /><span className="mm-mono">{preview.email}</span></span>
                            <span><i className="fas fa-at" /><span className="mm-mono">{preview.username}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mm-section">
                    <div className="mm-section-title"><i className="fas fa-user" />Personal details</div>
                    <Row className="g-3">
                      <Col md={4}>{nameField('first_name', 'First name', true, 'First name')}</Col>
                      <Col md={4}>{nameField('middle_name', 'Middle name', false, 'Middle name')}</Col>
                      <Col md={4}>{nameField('last_name', 'Last name', true, 'Last name')}</Col>
                      <Col md={4}>
                        <Form.Label className="mm-label">Birthdate <span className="mm-req">*</span></Form.Label>
                        <Form.Control className={`mm-input${fieldErrors.birthdate ? ' bad' : ''}`} type="date" name="birthdate" value={formData.birthdate || ''}
                          onChange={handleFormChange} required disabled={formLoading} max={maxBirthdate} style={{ colorScheme: 'light' }} />
                        {fieldErrors.birthdate && <div className="mm-hint bad"><i className="fas fa-times-circle" />{fieldErrors.birthdate}</div>}
                      </Col>
                      <Col md={4}>
                        <Form.Label className="mm-label">Gender <span className="mm-req">*</span></Form.Label>
                        <Form.Select className="mm-input" name="gender" value={formData.gender || ''} onChange={handleFormChange} required disabled={formLoading}>
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </Form.Select>
                      </Col>
                      <Col md={4}>
                        <Form.Label className="mm-label">Phone number</Form.Label>
                        <Form.Control className={`mm-input${phoneBad ? ' bad' : phoneOk ? ' good' : ''}`} type="tel" inputMode="numeric" maxLength={11} name="phone" value={formData.phone || ''}
                          onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                          onChange={handleFormChange} disabled={formLoading} placeholder="09XXXXXXXXX" />
                        {phoneBad && <div className="mm-hint bad"><i className="fas fa-times-circle" />{fieldErrors.phone || 'Phone must be 11 digits starting with 09'}</div>}
                      </Col>
                    </Row>
                  </div>

                  <div className="mm-section mb-0">
                    <div className="mm-section-title"><i className="fas fa-briefcase" />City Vet office role</div>
                    <Row className="g-3">
                      <Col md={formData.office_role === 'Other' ? 6 : 12}>
                        <Form.Label className="mm-label">Role <span className="mm-req">*</span></Form.Label>
                        <Form.Select className="mm-input" name="office_role" value={formData.office_role || ''} onChange={handleFormChange} disabled={formLoading}>
                          <option value="">Select role...</option>
                          {OFFICE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </Form.Select>
                      </Col>
                      {formData.office_role === 'Other' && (
                        <Col md={6}>
                          <Form.Label className="mm-label">Specify role <span className="mm-req">*</span></Form.Label>
                          <Form.Control className="mm-input" type="text" name="office_role_custom" value={formData.office_role_custom || ''}
                            onChange={handleFormChange} placeholder="Enter the role title" disabled={formLoading} />
                        </Col>
                      )}
                    </Row>
                  </div>
                </Modal.Body>
                <Modal.Footer className="mm-foot">
                  <button type="button" className="mm-btn ghost" onClick={close} disabled={formLoading}>Cancel</button>
                  <button type="submit" className="mm-btn primary" disabled={invalid}>
                    {formLoading
                      ? <><i className="fas fa-circle-notch fa-spin" />{isAdd ? 'Adding…' : 'Saving…'}</>
                      : isAdd ? <><i className="fas fa-plus" />Add admin</> : <><i className="fas fa-save" />Save changes</>}
                  </button>
                </Modal.Footer>
              </Form>
            </Modal>
          );
        })}

        {/* ════════════════════════════════════════════════════════════════
            VIEW ADMIN MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} dialogClassName="mm-modal" className="mm-zoom-modal" scrollable>
          {selectedOfficial && (() => {
            const o = selectedOfficial;
            const active = o.is_active === 1;
            const fullName = `${o.first_name || ''} ${o.middle_name ? o.middle_name + ' ' : ''}${o.last_name || ''}`.trim();
            const initials = `${(o.first_name || '?')[0]}${(o.last_name || '')[0] || ''}`.toUpperCase();
            const age = o.birthdate ? Math.floor((Date.now() - new Date(o.birthdate).getTime()) / 31557600000) : null;
            const info = [
              { icon: 'fa-at', label: 'Username', value: o.username ? <span className="mm-mono">{o.username}</span> : '—' },
              { icon: 'fa-phone-alt', label: 'Phone', value: o.phone || <span className="mm-none">Not provided</span> },
              { icon: 'fa-envelope', label: 'Email', value: o.email || '—', wide: true },
              { icon: 'fa-birthday-cake', label: 'Birthdate', value: o.birthdate ? new Date(o.birthdate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : <span className="mm-none">Not provided</span> },
              { icon: 'fa-venus-mars', label: 'Gender', value: o.gender || <span className="mm-none">Not specified</span> },
            ];
            return (
              <>
                <Modal.Header closeButton className="mm-head" style={{ '--c': '#e0a800' }}>
                  <div className="mm-head-main">
                    <div className="mm-avatar" style={active ? undefined : { background: '#f3f4f6', color: '#6b7280' }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>

                      <Modal.Title as="h5" className="mm-title">{fullName || 'Admin'}</Modal.Title>
                      <div className="mm-sub">City Veterinary Office admin</div>
                    </div>
                  </div>
                </Modal.Header>
                <Modal.Body className="mm-body">
                  <div className="mm-kpis">
                    <div className="mm-kpi">
                      <div className="ic" style={{ '--c': '#e0a800' }}><i className="fas fa-syringe" /></div>
                      <div>
                        <div className="v">{o.vaccinations_administered || 0}</div>
                        <div className="k">Vaccinations given</div>
                      </div>
                    </div>
                    <div className="mm-kpi">
                      <div className="ic" style={{ '--c': '#0d6efd' }}><i className="fas fa-briefcase" /></div>
                      <div style={{ minWidth: 0 }}>
                        <div className="v sm">{o.office_role || '—'}</div>
                        <div className="k">Office role</div>
                      </div>
                    </div>
                  </div>

                  <div className="mm-section-title mt-4"><i className="fas fa-info-circle" />Account and personal details</div>
                  <div className="mm-grid">
                    {info.map(it => (
                      <div key={it.label} className={`mm-info${it.wide ? ' wide' : ''}`}>
                        <div className="mm-info-ic"><i className={`fas ${it.icon}`} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="mm-info-label">{it.label}{it.label === 'Birthdate' && age !== null && age >= 0 ? <span className="mm-opt"> · {age} yrs old</span> : null}</div>
                          <div className="mm-info-value">{it.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Modal.Body>
                <Modal.Footer className="mm-foot">
                  {active && (
                    <button type="button" className="mm-btn ghost me-auto" onClick={() => { setShowViewModal(false); handleEditOfficial(o); }}>
                      <i className="fas fa-pen" />Edit
                    </button>
                  )}
                  <button type="button" className="mm-btn primary" onClick={() => setShowViewModal(false)}>Close</button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>

        {/* ════════════════════════════════════════════════════════════════
            DEACTIVATE / RESTORE / RESET PASSWORD (small, always centered)
        ════════════════════════════════════════════════════════════════ */}
        {[
          { key: 'deactivate', show: showDeleteModal, close: () => setShowDeleteModal(false), color: '#dc3545', icon: 'fa-user-slash',
            title: 'Deactivate this admin?', text: 'The admin will no longer be able to sign in.',
            note: 'Vaccination records and activity are kept for history.',
            label: 'Deactivate', busy: 'Deactivating…', onConfirm: handleConfirmDelete },
          { key: 'restore', show: showRestoreModal, close: () => setShowRestoreModal(false), color: '#198754', icon: 'fa-undo',
            title: 'Restore this admin?', text: 'The account will be reactivated and the admin can sign in again.',
            label: 'Restore', busy: 'Restoring…', onConfirm: handleConfirmRestore },
          { key: 'reset', show: showResetPasswordModal, close: () => setShowResetPasswordModal(false), color: '#0d6efd', icon: 'fa-key',
            title: 'Reset password?', text: 'The admin\'s current password will stop working.',
            note: <>The password will be reset to <strong>admin123</strong>. Ask the admin to change it after signing in.</>,
            label: 'Reset password', busy: 'Resetting…', onConfirm: handleConfirmResetPassword },
        ].map(m => (
          <Modal key={m.key} show={m.show} onHide={() => !formLoading && m.close()} centered dialogClassName="mm-small" className="mm-zoom-modal">
            {selectedOfficial && (
              <>
                <Modal.Body className="mm-small-body">
                  <div className="mm-small-icon" style={{ '--c': m.color }}><i className={`fas ${m.icon}`} /></div>
                  <h5 className="mm-small-title">{m.title}</h5>
                  <p className="mm-small-text">{m.text}</p>
                  <div className="mm-item">
                    <div className="mm-item-av" style={{ '--c': '#e0a800' }}><i className="fas fa-user-shield" /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mm-item-name">{`${selectedOfficial.first_name || ''} ${selectedOfficial.middle_name ? selectedOfficial.middle_name + ' ' : ''}${selectedOfficial.last_name || ''}`.trim()}</div>
                      <div className="mm-item-meta">{[selectedOfficial.username, selectedOfficial.office_role].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  {m.note && <div className="mm-note" style={{ '--c': m.color }}><i className="fas fa-info-circle" /><span>{m.note}</span></div>}
                </Modal.Body>
                <Modal.Footer className="mm-foot even">
                  <button type="button" className="mm-btn ghost" onClick={m.close} disabled={formLoading}>Cancel</button>
                  <button type="button" className="mm-btn solid" style={{ '--c': m.color }} onClick={m.onConfirm} disabled={formLoading}>
                    {formLoading ? <><i className="fas fa-circle-notch fa-spin" />{m.busy}</> : <><i className={`fas ${m.icon}`} />{m.label}</>}
                  </button>
                </Modal.Footer>
              </>
            )}
          </Modal>
        ))}

      </Container>
    </>
  );
};

export default OfficialManagement;