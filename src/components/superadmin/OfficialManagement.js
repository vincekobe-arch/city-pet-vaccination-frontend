import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table, InputGroup } from 'react-bootstrap';
import { officialAPI, barangayAPI, handleAPIError } from '../../services/api';

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
  const [barangays, setBarangays] = useState([]);
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
    age: '',
    gender: '',
    phone: '',
    assigned_barangay_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Selected official
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [filterBarangay, setFilterBarangay] = useState('');
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
}, [filterBarangay, filterStatus, searchTerm]);

  useEffect(() => {
    if (showDropdown === null) return;
    const closeOnScroll = () => setShowDropdown(null);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [showDropdown]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [officialsRes, barangaysRes] = await Promise.all([
        officialAPI.getAll(),
        barangayAPI.getAll()
      ]);
      
      setOfficials(officialsRes.data.officials || []);
      setBarangays(barangaysRes.data.barangays || []);
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
      loadData();
      
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
      loadData();
      
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
      loadData();
      
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
      loadData();
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
    const matchesBarangay = filterBarangay 
      ? official.assigned_barangay_id === parseInt(filterBarangay)
      : true;
    
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
    
    return matchesBarangay && matchesStatus && matchesSearch;
  });

  // Pagination calculations
const totalPages = Math.max(1, Math.ceil(filteredOfficials.length / itemsPerPage));
const startIdx = (currentPage - 1) * itemsPerPage;
const endIdx = startIdx + itemsPerPage;
const paginatedOfficials = filteredOfficials.slice(startIdx, endIdx);

// Statistics
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
    .ad-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #ffe08a, #ffc107); color: #1f2328; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800; flex-shrink: 0; }
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
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2" />{error}
          </Alert>
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
              <h6>{searchTerm || filterBarangay || filterStatus !== 'active' ? 'No admins found' : 'No admins added yet'}</h6>
              <p>{searchTerm || filterBarangay || filterStatus !== 'active' ? 'Try changing or clearing the search and filters.' : 'Add an admin account to start managing the system.'}</p>
              {!searchTerm && !filterBarangay && filterStatus === 'active' && (
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
                    <th className="m-hide" style={{ width: '12%' }}>Birthdate</th>
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
                            <div className="ad-avatar" style={isActive ? undefined : { background: '#e5e7eb', color: '#6b7280' }}>{initials}</div>
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
                        <td className="m-hide">
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


      {/* Add Official Modal */}
<Modal 
  show={showAddModal} 
  onHide={() => setShowAddModal(false)} 
  size="lg"
  backdrop="static"
  style={{zoom: '0.75'}}
>
  <Modal.Header 
    closeButton
    style={{
      background: '#f8f9fa',
      borderBottom: '2px solid #ffc107',
      borderRadius: '20px 20px 0 0'
    }}
  >
    <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
      <i className="fas fa-plus-circle me-2"></i>
      Add Admin
    </Modal.Title>
  </Modal.Header>
  <Form onSubmit={handleSubmitAdd}>
    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
      {formError && (
        <Alert variant="danger" className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {formError}
        </Alert>
      )}

      <Alert 
        variant="info"
        style={{
          borderRadius: '12px',
          border: '2px solid #0dcaf0',
          background: 'rgba(13, 202, 240, 0.1)'
        }}
      >
        <i className="fas fa-info-circle me-2"></i>
        <strong>Auto-generated credentials:</strong>
        <ul className="mb-0 mt-2">
          <li>Email format: <code>lastname.YYYY###@muntinlupa.gov.ph</code></li>
          <li>Username format: <code>lastname.YYYY###</code></li>
          <li>Default password: <code>admin123</code></li>
        </ul>
      </Alert>

      {/* Basic Information */}
      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              First Name <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleFormChange}
              onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
              onBlur={(e) => { const v = e.target.value; if (v.endsWith('-')) setFieldErrors(prev => ({ ...prev, first_name: 'Cannot end with a hyphen' })); else if (v.endsWith(' ')) setFieldErrors(prev => ({ ...prev, first_name: 'Cannot end with a space' })); }}
              required
              disabled={formLoading}
              placeholder="Enter first name"
              maxLength={30}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.first_name ? '2px solid #dc3545' : '2px solid #dee2e6'
              }}
            />
            {fieldErrors.first_name && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.first_name}
              </small>
            )}
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Middle Name
            </Form.Label>
            <Form.Control
              type="text"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleFormChange}
              onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
              onBlur={(e) => { const v = e.target.value; if (v.endsWith('-')) setFieldErrors(prev => ({ ...prev, middle_name: 'Cannot end with a hyphen' })); else if (v.endsWith(' ')) setFieldErrors(prev => ({ ...prev, middle_name: 'Cannot end with a space' })); }}
              disabled={formLoading}
              placeholder="Enter middle name"
              maxLength={30}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.middle_name ? '2px solid #dc3545' : '2px solid #dee2e6'
              }}
            />
            {fieldErrors.middle_name && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.middle_name}
              </small>
            )}
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Last Name <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleFormChange}
              onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
              onBlur={(e) => { const v = e.target.value; if (v.endsWith('-')) setFieldErrors(prev => ({ ...prev, last_name: 'Cannot end with a hyphen' })); else if (v.endsWith(' ')) setFieldErrors(prev => ({ ...prev, last_name: 'Cannot end with a space' })); }}
              required
              disabled={formLoading}
              placeholder="Enter last name"
              maxLength={30}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.last_name ? '2px solid #dc3545' : '2px solid #dee2e6'
              }}
            />
            {fieldErrors.last_name && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.last_name}
              </small>
            )}
          </Form.Group>
        </Col>
      </Row>

      <Row>
       <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Birthdate <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="date"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleFormChange}
              required
              disabled={formLoading}
              max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })()}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.birthdate ? '2px solid #dc3545' : '2px solid #dee2e6',
                colorScheme: 'light'
              }}
            />
            {fieldErrors.birthdate && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.birthdate}
              </small>
            )}
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Gender <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Select
              name="gender"
              value={formData.gender}
              onChange={handleFormChange}
              required
              disabled={formLoading}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Phone Number
            </Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              disabled={formLoading}
              placeholder="09XXXXXXXXX"
              onKeyDown={(e) => {
                if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault();
              }}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.phone && formData.phone
                  ? '2px solid #dc3545'
                  : formData.phone && /^09\d{9}$/.test(formData.phone)
                    ? '2px solid #198754'
                    : '2px solid #dee2e6'
              }}
            />
            {fieldErrors.phone && formData.phone && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.phone}
              </small>
            )}
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              City Vet Office Role <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Select
              name="office_role"
              value={formData.office_role}
              onChange={handleFormChange}
              disabled={formLoading}
              style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
            >
              <option value="">Select role...</option>
              {OFFICE_ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      {formData.office_role === 'Other' && (
        <Row>
          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                Specify Role <span style={{ color: '#dc3545' }}>*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="office_role_custom"
                value={formData.office_role_custom || ''}
                onChange={handleFormChange}
                placeholder="Enter specific role title..."
                disabled={formLoading}
                style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
              />
            </Form.Group>
          </Col>
        </Row>
      )}
    </Modal.Body>
    <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
      <Button 
        variant="secondary" 
        onClick={() => setShowAddModal(false)}
        disabled={formLoading}
        style={{
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontWeight: '600'
        }}
      >
        Cancel
      </Button>
      <Button 
        type="submit"
        disabled={
          formLoading ||
          !formData.first_name.trim() ||
          !formData.last_name.trim() ||
          !formData.birthdate ||
          !formData.gender ||
          !formData.office_role ||
          (formData.office_role === 'Other' && !formData.office_role_custom?.trim()) ||
          (formData.phone && !/^09\d{9}$/.test(formData.phone)) ||
          Object.values(fieldErrors).some(e => !!e)
        }
        className="border-0"
        style={{
          background: formLoading ? '#6c757d' : '#ffc107',
          color: '#000000',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontWeight: '700',
          boxShadow: formLoading ? 'none' : '0 4px 15px rgba(255, 193, 7, 0.4)',
          transition: 'all 0.3s'
        }}
        onMouseOver={(e) => {
          if (!formLoading) {
            e.target.style.background = '#ffb300';
            e.target.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)';
          }
        }}
        onMouseOut={(e) => {
          if (!formLoading) {
            e.target.style.background = '#ffc107';
            e.target.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
          }
        }}
      >
        {formLoading ? (
          <>
            <Spinner size="sm" animation="border" className="me-2" />
            Adding Admin...
          </>
        ) : (
          <>
            <i className="fas fa-plus-circle me-2"></i>
            Add Admin
          </>
        )}
      </Button>
    </Modal.Footer>
  </Form>
</Modal>

      {/* Edit Official Modal */}
<Modal 
  show={showEditModal} 
  onHide={() => setShowEditModal(false)} 
  size="lg"
  backdrop="static"
  style={{zoom: '0.75'}}
>
  <Modal.Header 
    closeButton
    style={{
      background: '#f8f9fa',
      borderBottom: '2px solid #ffc107',
      borderRadius: '20px 20px 0 0'
    }}
  >
    <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
      {selectedOfficial?.gender && (
        <img 
          src={selectedOfficial.gender === 'Female' ? '/female.png' : '/male.png'}
          alt={selectedOfficial.gender}
          style={{
            width: '40px',
            height: '40px',
            objectFit: 'contain',
            marginRight: '0.75rem'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <i className="fas fa-edit me-2"></i>
      Edit Admin: {selectedOfficial?.first_name}
    </Modal.Title>
  </Modal.Header>
  <Form onSubmit={handleSubmitEdit}>
    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
      {formError && (
        <Alert variant="danger" className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {formError}
        </Alert>
      )}

      {/* Basic Information */}
      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              First Name <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleFormChange}
              onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
              onBlur={(e) => { const v = e.target.value; if (v.endsWith('-')) setFieldErrors(prev => ({ ...prev, first_name: 'Cannot end with a hyphen' })); else if (v.endsWith(' ')) setFieldErrors(prev => ({ ...prev, first_name: 'Cannot end with a space' })); }}
              required
              disabled={formLoading}
              placeholder="Enter first name"
              maxLength={30}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.first_name ? '2px solid #dc3545' : '2px solid #dee2e6'
              }}
            />
            {fieldErrors.first_name && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.first_name}
              </small>
            )}
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Middle Name
            </Form.Label>
            <Form.Control
              type="text"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleFormChange}
              onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
              onBlur={(e) => { const v = e.target.value; if (v.endsWith('-')) setFieldErrors(prev => ({ ...prev, middle_name: 'Cannot end with a hyphen' })); else if (v.endsWith(' ')) setFieldErrors(prev => ({ ...prev, middle_name: 'Cannot end with a space' })); }}
              disabled={formLoading}
              placeholder="Enter middle name"
              maxLength={30}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.middle_name ? '2px solid #dc3545' : '2px solid #dee2e6'
              }}
            />
            {fieldErrors.middle_name && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.middle_name}
              </small>
            )}
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Last Name <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleFormChange}
              onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
              onBlur={(e) => { const v = e.target.value; if (v.endsWith('-')) setFieldErrors(prev => ({ ...prev, last_name: 'Cannot end with a hyphen' })); else if (v.endsWith(' ')) setFieldErrors(prev => ({ ...prev, last_name: 'Cannot end with a space' })); }}
              required
              disabled={formLoading}
              placeholder="Enter last name"
              maxLength={30}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.last_name ? '2px solid #dc3545' : '2px solid #dee2e6'
              }}
            />
            {fieldErrors.last_name && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.last_name}
              </small>
            )}
          </Form.Group>
        </Col>
      </Row>

      <Row>
       <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Birthdate <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="date"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleFormChange}
              required
              disabled={formLoading}
              max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })()}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.birthdate ? '2px solid #dc3545' : '2px solid #dee2e6',
                colorScheme: 'light'
              }}
            />
            {fieldErrors.birthdate && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.birthdate}
              </small>
            )}
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Gender <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Select
              name="gender"
              value={formData.gender}
              onChange={handleFormChange}
              required
              disabled={formLoading}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Phone Number
            </Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              disabled={formLoading}
              placeholder="09XXXXXXXXX"
              onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: fieldErrors.phone && formData.phone
                  ? '2px solid #dc3545'
                  : formData.phone && /^09\d{9}$/.test(formData.phone)
                    ? '2px solid #198754'
                    : '2px solid #dee2e6'
              }}
            />
          {fieldErrors.phone && formData.phone && (
              <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                <i className="fas fa-times-circle me-1" />{fieldErrors.phone}
              </small>
            )}
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              City Vet Office Role <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Select
              name="office_role"
              value={formData.office_role}
              onChange={handleFormChange}
              disabled={formLoading}
              style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
            >
              <option value="">Select role...</option>
              {OFFICE_ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      {formData.office_role === 'Other' && (
        <Row>
          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                Specify Role <span style={{ color: '#dc3545' }}>*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="office_role_custom"
                value={formData.office_role_custom || ''}
                onChange={handleFormChange}
                placeholder="Enter specific role title..."
                disabled={formLoading}
                style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
              />
            </Form.Group>
          </Col>
        </Row>
      )}
    </Modal.Body>
    <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
      <Button 
        variant="secondary" 
        onClick={() => setShowEditModal(false)}
        disabled={formLoading}
        style={{
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontWeight: '600'
        }}
      >
        Cancel
      </Button>
      <Button 
        type="submit"
        disabled={
          formLoading ||
          !formData.first_name.trim() ||
          !formData.last_name.trim() ||
          !formData.birthdate ||
          !formData.gender ||
          !formData.office_role ||
          (formData.office_role === 'Other' && !formData.office_role_custom?.trim()) ||
          (formData.phone && !/^09\d{9}$/.test(formData.phone)) ||
          Object.values(fieldErrors).some(e => !!e)
        }
        className="border-0"
        style={{
          background: formLoading ? '#6c757d' : '#ffc107',
          color: '#000000',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontWeight: '700',
          boxShadow: formLoading ? 'none' : '0 4px 15px rgba(255, 193, 7, 0.4)',
          transition: 'all 0.3s'
        }}
        onMouseOver={(e) => {
          if (!formLoading) {
            e.target.style.background = '#ffb300';
            e.target.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)';
          }
        }}
        onMouseOut={(e) => {
          if (!formLoading) {
            e.target.style.background = '#ffc107';
            e.target.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
          }
        }}
      >
        {formLoading ? (
          <>
            <Spinner size="sm" animation="border" className="me-2" />
            Updating...
          </>
        ) : (
          <>
            <i className="fas fa-save me-2"></i>
            Update Admin
          </>
        )}
      </Button>
    </Modal.Footer>
  </Form>
</Modal>

      {/* View Official Modal */}
<Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" style={{zoom: '0.75'}}>
  <Modal.Header 
    closeButton
    style={{
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      borderBottom: '2px solid #ffc107',
      borderRadius: '20px 20px 0 0'
    }}
  >
    <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
      {selectedOfficial?.gender && (
        <img 
          src={selectedOfficial.gender === 'Female' ? '/female.png' : '/male.png'}
          alt={selectedOfficial.gender}
          style={{
            width: '40px',
            height: '40px',
            objectFit: 'contain',
            marginRight: '0.75rem'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      Admin: {selectedOfficial?.first_name}
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '2rem' }}>
    {selectedOfficial && (
      <Row>
        <Col md={6}>
          <Card 
            className="mb-3 border-0" 
            style={{ 
              borderRadius: '15px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
            }}
          >
            <Card.Header style={{ 
              background: 'rgba(255, 193, 7, 0.1)', 
              borderBottom: '2px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '15px 15px 0 0'
            }}>
              <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }}></i>
                Personal Information
              </h6>
            </Card.Header>
            <Card.Body>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#666666', width: '120px' }}>Name:</td>
                    <td style={{ fontWeight: '600', color: '#333333' }}>
                      {selectedOfficial.first_name} {selectedOfficial.middle_name && selectedOfficial.middle_name + ' '}{selectedOfficial.last_name}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#666666' }}>Birthdate:</td>
                    <td style={{ fontWeight: '600', color: '#333333' }}>
                      {selectedOfficial.birthdate ? new Date(selectedOfficial.birthdate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#666666' }}>Gender:</td>
                    <td style={{ fontWeight: '600', color: '#333333' }}>
                      {selectedOfficial.gender || 'Not specified'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#666666' }}>Username:</td>
                    <td style={{ fontWeight: '600', color: '#333333' }}>
                      {selectedOfficial.username}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#666666' }}>Email:</td>
                    <td style={{ fontWeight: '600', color: '#333333', wordBreak: 'break-all' }}>
                      {selectedOfficial.email}
                    </td>
                  </tr>
                  {selectedOfficial.phone && (
                    <tr>
                      <td style={{ fontWeight: '600', color: '#666666' }}>Phone:</td>
                      <td style={{ fontWeight: '600', color: '#333333' }}>
                        {selectedOfficial.phone}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card 
            className="mb-3 border-0" 
            style={{ 
              borderRadius: '15px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
            }}
          >
            <Card.Header style={{ 
              background: 'rgba(255, 193, 7, 0.1)', 
              borderBottom: '2px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '15px 15px 0 0'
            }}>
              <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                <i className="fas fa-map-marker-alt me-2" style={{ color: '#ffc107' }}></i>
                Assignment Information
              </h6>
            </Card.Header>
            <Card.Body>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#666666', width: '120px' }}>Office Role:</td>
                    <td style={{ fontWeight: '600', color: '#333333' }}>
                      {selectedOfficial.office_role || <span className="text-muted">Not specified</span>}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#666666' }}>Status:</td>
                    <td>
                      <Badge 
                        bg={selectedOfficial.is_active ? 'success' : 'secondary'}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                      >
                        {selectedOfficial.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Activity Summary */}
          <Card 
            className="border-0" 
            style={{ 
              borderRadius: '15px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
            }}
          >
            <Card.Header style={{ 
              background: 'rgba(255, 193, 7, 0.1)', 
              borderBottom: '2px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '15px 15px 0 0'
            }}>
              <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                <i className="fas fa-chart-line me-2" style={{ color: '#ffc107' }}></i>
                Activity Summary
              </h6>
            </Card.Header>
            <Card.Body>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#666666' }}>Vaccinations:</td>
                    <td>
                      <Badge 
                        bg="info" 
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                      >
                        {selectedOfficial.vaccinations_administered || 0}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    )}
  </Modal.Body>
  <Modal.Footer style={{ borderTop: '1px solid #e0e0e0' }}>
    <Button 
      variant="secondary" 
      onClick={() => setShowViewModal(false)}
      style={{
        borderRadius: '10px',
        padding: '0.75rem 1.5rem',
        fontWeight: '600'
      }}
    >
      Close
    </Button>
  </Modal.Footer>
</Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
        style={{ zoom: '0.75' }}
      >
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-exclamation-triangle text-danger me-2"></i>
            Confirm Deactivation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedOfficial && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to deactivate this admin?
              </p>
              <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
                <div className="mb-2">
                  <span style={{ fontWeight: '500', color: '#555' }}>
                    <i className="fas fa-user-tie me-1" style={{ color: '#ffc107' }}></i>
                    Admin
                  </span>
                </div>
                <strong style={{ fontSize: '1.1rem' }}>
                  {selectedOfficial.first_name} {selectedOfficial.middle_name && selectedOfficial.middle_name + ' '}{selectedOfficial.last_name}
                </strong>
                <br />
                <small className="text-muted">
                  <i className="fas fa-at me-1"></i>
                  {selectedOfficial.username}
                  {selectedOfficial.barangay_name && <> • {selectedOfficial.barangay_name}</>}
                </small>
              </div>
              <Alert variant="warning" className="mt-3 mb-0">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Warning:</strong> All vaccination records and activities will be preserved for historical purposes.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={formLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={formLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}
          >
            {formLoading ? (
              <><Spinner size="sm" animation="border" className="me-2" />Deactivating...</>
            ) : (
              <><i className="fas fa-user-times me-2"></i>Deactivate Admin</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        show={showRestoreModal}
        onHide={() => setShowRestoreModal(false)}
        centered
        style={{ zoom: '0.75' }}
      >
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #198754' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-undo text-success me-2"></i>
            Confirm Restore
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedOfficial && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to restore this admin?
              </p>
              <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #198754' }}>
                <div className="mb-2">
                  <span style={{ fontWeight: '500', color: '#555' }}>
                    <i className="fas fa-user-tie me-1" style={{ color: '#198754' }}></i>
                    Admin
                  </span>
                </div>
                <strong style={{ fontSize: '1.1rem' }}>
                  {selectedOfficial.first_name} {selectedOfficial.middle_name && selectedOfficial.middle_name + ' '}{selectedOfficial.last_name}
                </strong>
                <br />
                <small className="text-muted">
                  <i className="fas fa-at me-1"></i>
                  {selectedOfficial.username}
                </small>
              </div>
              <Alert variant="success" className="mt-3 mb-0" style={{ background: 'rgba(25,135,84,0.1)', border: '1px solid rgba(25,135,84,0.3)', color: '#198754' }}>
                <i className="fas fa-info-circle me-2"></i>
                This admin will be reactivated and can log in again.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button
            variant="secondary"
            onClick={() => setShowRestoreModal(false)}
            disabled={formLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRestore}
            disabled={formLoading}
            className="border-0"
            style={{ background: '#198754', color: '#ffffff', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600', boxShadow: '0 4px 15px rgba(25,135,84,0.3)' }}
          >
            {formLoading ? (
              <><Spinner size="sm" animation="border" className="me-2" />Restoring...</>
            ) : (
              <><i className="fas fa-undo me-2"></i>Restore Admin</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reset Password Confirmation Modal */}
      <Modal
        show={showResetPasswordModal}
        onHide={() => setShowResetPasswordModal(false)}
        centered
        style={{ zoom: '0.75' }}
      >
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #0d6efd' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-key text-primary me-2"></i>
            Confirm Password Reset
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedOfficial && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to reset this admin's password?
              </p>
              <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #0d6efd' }}>
                <div className="mb-2">
                  <span style={{ fontWeight: '500', color: '#555' }}>
                    <i className="fas fa-user-tie me-1" style={{ color: '#0d6efd' }}></i>
                    Admin
                  </span>
                </div>
                <strong style={{ fontSize: '1.1rem' }}>
                  {selectedOfficial.first_name} {selectedOfficial.middle_name && selectedOfficial.middle_name + ' '}{selectedOfficial.last_name}
                </strong>
                <br />
                <small className="text-muted">
                  <i className="fas fa-at me-1"></i>
                  {selectedOfficial.username}
                </small>
              </div>
              <Alert variant="primary" className="mt-3 mb-0" style={{ background: 'rgba(13,110,253,0.1)', border: '1px solid rgba(13,110,253,0.3)', color: '#0d6efd' }}>
                <i className="fas fa-info-circle me-2"></i>
                Password will be reset to <strong>admin123</strong>. The admin should change it after logging in.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button
            variant="secondary"
            onClick={() => setShowResetPasswordModal(false)}
            disabled={formLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmResetPassword}
            disabled={formLoading}
            className="border-0"
            style={{ background: '#0d6efd', color: '#ffffff', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600', boxShadow: '0 4px 15px rgba(13,110,253,0.3)' }}
          >
            {formLoading ? (
              <><Spinner size="sm" animation="border" className="me-2" />Resetting...</>
            ) : (
              <><i className="fas fa-key me-2"></i>Reset Password</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      </Container>
    </>
  );
};

export default OfficialManagement;