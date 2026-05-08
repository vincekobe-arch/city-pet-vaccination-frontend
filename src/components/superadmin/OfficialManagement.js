import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table, InputGroup } from 'react-bootstrap';
import { officialAPI, barangayAPI, handleAPIError } from '../../services/api';

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
const itemsPerPage = 5;


  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
  setCurrentPage(1);
}, [filterBarangay, filterStatus, searchTerm]);

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
      age: '',
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
    if (!formData.age || formData.age < 18 || formData.age > 100) {
      setFormError('Please enter a valid age (18-100)');
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
      age: official.age || '',
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
        appointment_date: new Date().toISOString().split('T')[0],
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
        age: formData.age,
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
  const handleRestoreOfficial = async (official) => {
    setFormLoading(true);
    try {
      await officialAPI.restore(official.id);
      setSuccess('Official restored successfully!');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
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
const totalPages = Math.ceil(filteredOfficials.length / itemsPerPage);
const startIdx = (currentPage - 1) * itemsPerPage;
const endIdx = startIdx + itemsPerPage;
const paginatedOfficials = filteredOfficials.slice(startIdx, endIdx);
const emptyRows = itemsPerPage - paginatedOfficials.length;

// Statistics
  const activeOfficials = officials.filter(o => o.is_active === 1);
  const inactiveOfficials = officials.filter(o => o.is_active === 0);
  const uniqueBarangays = [...new Set(activeOfficials.map(o => o.assigned_barangay_id))].filter(Boolean);
  const averagePerBarangay = uniqueBarangays.length > 0 ? (activeOfficials.length / uniqueBarangays.length).toFixed(1) : 0;

  const styles = `
    @keyframes dropDown {
      0% {
        opacity: 0;
        transform: translateY(-30px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75' }}>
        <Row style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="mb-4">
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i 
                  className="fas fa-user-shield" 
                  style={{ 
                    fontSize: '1.5rem', 
                    color: '#000000',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                ></i>
                <h2 style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Admin Management</h2>
              </div>
              
            </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <Alert 
              variant="danger" 
              dismissible 
              onClose={() => setError('')}
              style={{
                borderRadius: '12px',
                border: '2px solid #dc3545',
                background: 'rgba(220, 53, 69, 0.1)',
                color: '#dc3545'
              }}
            >
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {success && (
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <Alert 
              variant="success" 
              dismissible 
              onClose={() => setSuccess('')}
              style={{
                borderRadius: '12px',
                border: '2px solid #198754',
                background: 'rgba(25, 135, 84, 0.1)',
                color: '#198754'
              }}
            >
              <i className="fas fa-check-circle me-2"></i>
              {success}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Statistics */}
      <Row className="mb-4">
        <Col md={6} lg={4} className="mb-3" style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          <Card 
            className="text-center h-100 border-0" 
            style={{ 
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fff4 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(25, 135, 84, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
          >
            <Card.Body style={{ padding: '2rem 1.5rem' }}>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div style={{ textAlign: 'left' }}>
                  <p className="text-muted mb-1" style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Active Admin</p>
                  <h2 className="mb-0" style={{ fontWeight: '700', color: '#333333', fontSize: '2.5rem' }}>
                    {activeOfficials.length}
                  </h2>
                </div>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '15px',
                  background: 'rgba(25, 135, 84, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src="/active.png" 
                    alt="Active Officials"
                    style={{ width: '35px', height: '35px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <i 
                    className="fas fa-user-check" 
                    style={{ fontSize: '1.8rem', color: '#198754', display: 'none' }}
                  ></i>
                </div>
              </div>
              <div style={{
                padding: '0.5rem',
                borderRadius: '8px',
                background: 'rgba(25, 135, 84, 0.08)'
              }}>
                <small style={{ color: '#198754', fontWeight: '500' }}>
                  <i className="fas fa-user-check me-1"></i>
                  Currently Active
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={4} className="mb-3" style={{ animation: 'dropDown 0.4s ease-out 0.2s backwards' }}>
          <Card 
            className="text-center h-100 border-0" 
            style={{ 
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(220, 53, 69, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
          >
            <Card.Body style={{ padding: '2rem 1.5rem' }}>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div style={{ textAlign: 'left' }}>
                  <p className="text-muted mb-1" style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Inactive Admin</p>
                  <h2 className="mb-0" style={{ fontWeight: '700', color: '#333333', fontSize: '2.5rem' }}>
                    {inactiveOfficials.length}
                  </h2>
                </div>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '15px',
                  background: 'rgba(220, 53, 69, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src="/inactive.png" 
                    alt="Inactive Officials"
                    style={{ width: '35px', height: '35px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <i 
                    className="fas fa-user-slash" 
                    style={{ fontSize: '1.8rem', color: '#dc3545', display: 'none' }}
                  ></i>
                </div>
              </div>
              <div style={{
                padding: '0.5rem',
                borderRadius: '8px',
                background: 'rgba(220, 53, 69, 0.08)'
              }}>
                <small style={{ color: '#dc3545', fontWeight: '500' }}>
                  <i className="fas fa-user-slash me-1"></i>
                  Deactivated
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={4} className="mb-3" style={{ animation: 'dropDown 0.4s ease-out 0.3s backwards' }}>
          <Card 
            className="text-center h-100 border-0" 
            style={{ 
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(13, 202, 240, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
          >
            <Card.Body style={{ padding: '2rem 1.5rem' }}>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div style={{ textAlign: 'left' }}>
                  <p className="text-muted mb-1" style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Average</p>
                  <h2 className="mb-0" style={{ fontWeight: '700', color: '#333333', fontSize: '2.5rem' }}>
                    {averagePerBarangay}
                  </h2>
                </div>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '15px',
                  background: 'rgba(13, 202, 240, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src="/average.png" 
                    alt="Average"
                    style={{ width: '35px', height: '35px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <i 
                    className="fas fa-calculator" 
                    style={{ fontSize: '1.8rem', color: '#0dcaf0', display: 'none' }}
                  ></i>
                </div>
              </div>
              <div style={{
                padding: '0.5rem',
                borderRadius: '8px',
                background: 'rgba(13, 202, 240, 0.08)'
              }}>
                <small style={{ color: '#0dcaf0', fontWeight: '500' }}>
                  <i className="fas fa-calculator me-1"></i>
                  Average admins
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
        <Col md={6} className="mb-3">
          <InputGroup>
            <InputGroup.Text style={{ background: '#ffffff', borderRadius: '10px 0 0 10px' }}>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, email, phone, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ borderRadius: '0 10px 10px 0' }}
            />
            {searchTerm && (
              <Button 
                variant="outline-secondary" 
                onClick={() => setSearchTerm('')}
                style={{ borderRadius: '0 10px 10px 0', marginLeft: '-1px' }}
              >
                <i className="fas fa-times"></i>
              </Button>
            )}
          </InputGroup>
        </Col>
        <Col md={3} className="mb-3">
          <Form.Select
            value={filterBarangay}
            onChange={(e) => setFilterBarangay(e.target.value)}
            style={{ borderRadius: '10px', padding: '0.6rem' }}
          >
            <option value="">All Barangays</option>
            {barangays.map(barangay => (
              <option key={barangay.id} value={barangay.id}>
                {barangay.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3} className="mb-3">
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ borderRadius: '10px', padding: '0.6rem' }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All Status</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Officials Table */}
      <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
        <Col>
          <Card
  className="border-0"
  style={{
    borderRadius: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'visible'
  }}
>
            <Card.Header
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #ffc107',
                padding: '1.5rem',
                borderRadius: '20px 20px 0 0'
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                  <i className="fas fa-users me-2" style={{ color: '#ffc107' }}></i>
                  Admins ({filteredOfficials.length})
                </h5>
                <Button 
                  onClick={handleAddOfficial}
                  className="border-0"
                  style={{
                    background: '#ffc107',
                    color: '#000000',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: '700',
                    boxShadow: '0 4px 15px rgba(255, 193, 7, 0.4)',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)';
                    e.target.style.background = '#ffb300';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
                    e.target.style.background = '#ffc107';
                  }}
                >
                  <i className="fas fa-plus me-2"></i>
                  Add New Admin
                </Button>
              </div>
            </Card.Header>
            <Card.Body style={{ padding: '2rem' }}>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="warning" />
                  <p className="mt-3 text-muted">Loading officials...</p>
                </div>
              ) : filteredOfficials.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-user-tie text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                  <h5 style={{ color: '#666666', fontWeight: '600' }}>
                    {searchTerm || filterBarangay || filterStatus !== 'active' 
                      ? 'No Officials Found' 
                      : 'No Officials Added Yet'
                    }
                  </h5>
                  <p className="text-muted">
                    {searchTerm || filterBarangay || filterStatus !== 'active'
                      ? 'Try adjusting your search or filters.'
                      : 'Start by adding barangay officials to manage pet vaccination services.'
                    }
                  </p>
                  {!searchTerm && !filterBarangay && filterStatus === 'active' && (
                    <Button 
                      onClick={handleAddOfficial}
                      className="border-0"
                      style={{
                        background: '#ffc107',
                        color: '#000000',
                        padding: '0.6rem 1.5rem',
                        borderRadius: '12px',
                        fontWeight: '600',
                        boxShadow: '0 4px 15px rgba(255, 193, 7, 0.3)'
                      }}
                    >
                      <i className="fas fa-plus me-2"></i>
                      Add First Admin
                    </Button>
                  )}
                </div>
              ) : (
                <div className="table-responsive" style={{ overflow: 'visible' }}>
  <Table hover style={{ marginBottom: 0 }}>
                    <thead style={{ background: '#f8f9fa' }}>
                      <tr>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Name</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Age</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Office Role</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Contact</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Status</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
  {paginatedOfficials.map(official => (
                        <tr 
                          key={official.id}
                          style={{
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 193, 7, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '1rem', color: '#333' }}>
                                {official.first_name} {official.middle_name && official.middle_name[0] + '.'} {official.last_name}
                              </strong>
                              <br />
                              <small className="text-muted" style={{ fontWeight: '500' }}>
                                <i className="fas fa-user me-1"></i>
                                {official.username}
                              </small>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ fontWeight: '500', color: '#555' }}>
                              {official.age ? `${official.age} years` : 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{
                              background: 'rgba(255,193,7,0.12)',
                              color: '#856404',
                              borderRadius: '20px',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.82rem',
                              fontWeight: '600'
                            }}>
                              {official.office_role || <span className="text-muted">—</span>}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <div>
                              <small style={{ fontWeight: '500', color: '#555' }}>
                                <i className="fas fa-envelope me-1"></i>
                                {official.email}
                              </small>
                              {official.phone && (
                                <>
                                  <br />
                                  <small style={{ fontWeight: '500', color: '#555' }}>
                                    <i className="fas fa-phone me-1"></i>
                                    {official.phone}
                                  </small>
                                </>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <Badge 
                              bg={official.is_active ? 'success' : 'secondary'}
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                            >
                              {official.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <div style={{ position: 'relative' }}>
    <button
      onClick={() => setShowDropdown(showDropdown === official.id ? null : official.id)}
      style={{
        background: 'transparent',
        border: 'none',
        borderRadius: '50%',
        padding: '0.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto'
      }}
      onMouseOver={(e) => e.target.style.background = 'rgba(0,0,0,0.05)'}
      onMouseOut={(e) => e.target.style.background = 'transparent'}
    >
      <img 
        src="/ellipsis.png" 
        alt="Menu"
        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
      />
    </button>
    
    {showDropdown === official.id && (
      <>
        <div
          onClick={() => setShowDropdown(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
        
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '100%',
            transform: 'translateY(-50%)',
            marginRight: '0.25rem',
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '170px',
            zIndex: 1050,
            overflow: 'hidden'
          }}
        >
          <button
            onClick={() => {
              setShowDropdown(null);
              handleViewOfficial(official);
            }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: 'none',
              background: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9rem',
              color: '#333333',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
            onMouseOut={(e) => e.target.style.background = '#ffffff'}
          >
            <img 
              src="/view.png" 
              alt="View"
              style={{ width: '18px', height: '18px', objectFit: 'contain' }}
            />
            <span>View Details</span>
          </button>
          
          {official.is_active === 1 ? (
            <>
              <button
                onClick={() => {
                  setShowDropdown(null);
                  handleEditOfficial(official);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.9rem',
                  color: '#333333',
                  fontWeight: '500',
                  borderTop: '1px solid #f0f0f0',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                onMouseOut={(e) => e.target.style.background = '#ffffff'}
              >
                <img 
                  src="/edit(1).png" 
                  alt="Edit"
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
                <span>Edit Admin</span>
              </button>
              
              <button
                onClick={() => {
                  setShowDropdown(null);
                  handleDeleteOfficial(official);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.9rem',
                  color: '#dc3545',
                  fontWeight: '500',
                  borderTop: '1px solid #f0f0f0',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#fff5f5'}
                onMouseOut={(e) => e.target.style.background = '#ffffff'}
              >
                <img 
                  src="/remove.png" 
                  alt="Deactivate"
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
                <span>Deactivate</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setShowDropdown(null);
                handleRestoreOfficial(official);
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: 'none',
                background: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9rem',
                color: '#28a745',
                fontWeight: '500',
                borderTop: '1px solid #f0f0f0',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#f0fff4'}
              onMouseOut={(e) => e.target.style.background = '#ffffff'}
            >
              <img 
                src="/restore.png" 
                alt="Restore"
                style={{ width: '18px', height: '18px', objectFit: 'contain' }}
              />
              <span>Restore Admin</span>
            </button>
          )}
        </div>
      </>
    )}
  </div>
</td>
                        </tr>
                      ))}
                      {/* Empty rows to maintain fixed height */}
                      {Array.from({ length: emptyRows }).map((_, index) => (
                        <tr key={`empty-${index}`} style={{ height: '73px' }}>
                          <td colSpan="6" style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                            <div style={{ visibility: 'hidden' }}>Empty</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pagination */}
      {filteredOfficials.length > itemsPerPage && (
        <Row className="mt-4" style={{ animation: 'dropDown 0.4s ease-out 0.6s backwards' }}>
          <Col className="d-flex justify-content-center">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? '#e9ecef' : '#ffffff',
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  color: currentPage === 1 ? '#adb5bd' : '#333333',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#ffc107';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#dee2e6';
                  }
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              {(() => {
                const pages = [];
                
                if (totalPages <= 3) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  pages.push(1);
                  
                  if (currentPage > 2 && currentPage < totalPages) {
                    pages.push(currentPage);
                  } else if (currentPage === 1) {
                    pages.push(2);
                  }
                  
                  pages.push('...');
                  pages.push(totalPages);
                }

                return pages.map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: '#6c757d',
                          fontWeight: '600'
                        }}
                      >
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        background: currentPage === page ? '#ffc107' : '#ffffff',
                        border: '2px solid',
                        borderColor: currentPage === page ? '#ffc107' : '#dee2e6',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        minWidth: '40px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        color: currentPage === page ? '#000000' : '#333333',
                        transition: 'all 0.2s',
                        boxShadow: currentPage === page ? '0 2px 8px rgba(255, 193, 7, 0.3)' : 'none'
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== page) {
                          e.target.style.background = '#f8f9fa';
                          e.target.style.borderColor = '#ffc107';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== page) {
                          e.target.style.background = '#ffffff';
                          e.target.style.borderColor = '#dee2e6';
                        }
                      }}
                    >
                      {page}
                    </button>
                  );
                });
              })()}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? '#e9ecef' : '#ffffff',
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  color: currentPage === totalPages ? '#adb5bd' : '#333333',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#ffc107';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#dee2e6';
                  }
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </Col>
        </Row>
      )}

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
      Add New Admin
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
              onBlur={(e) => { if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, first_name: 'Cannot end with a hyphen' })); }}
              required
              disabled={formLoading}
              placeholder="Enter first name"
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
              onBlur={(e) => { if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, middle_name: 'Cannot end with a hyphen' })); }}
              disabled={formLoading}
              placeholder="Enter middle name"
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
              onBlur={(e) => { if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, last_name: 'Cannot end with a hyphen' })); }}
              required
              disabled={formLoading}
              placeholder="Enter last name"
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
              Age <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="number"
              name="age"
              value={formData.age}
              onChange={handleFormChange}
              required
              min="18"
              max="100"
              disabled={formLoading}
              placeholder="Enter age"
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            />
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
        disabled={formLoading}
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
              onBlur={(e) => { if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, first_name: 'Cannot end with a hyphen' })); }}
              required
              disabled={formLoading}
              placeholder="Enter first name"
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
              onBlur={(e) => { if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, middle_name: 'Cannot end with a hyphen' })); }}
              disabled={formLoading}
              placeholder="Enter middle name"
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
              onBlur={(e) => { if (e.target.value.endsWith('-')) setFieldErrors(prev => ({ ...prev, last_name: 'Cannot end with a hyphen' })); }}
              required
              disabled={formLoading}
              placeholder="Enter last name"
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
              Age <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="number"
              name="age"
              value={formData.age}
              onChange={handleFormChange}
              required
              min="18"
              max="100"
              disabled={formLoading}
              placeholder="Enter age"
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            />
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
              placeholder="09XX XXX XXXX"
              pattern="[0-9]{11}"
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            />
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
        disabled={formLoading}
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
                    <td style={{ fontWeight: '600', color: '#666666' }}>Age:</td>
                    <td style={{ fontWeight: '600', color: '#333333' }}>
                      {selectedOfficial.age ? `${selectedOfficial.age} years old` : 'Not provided'}
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
      </Container>
    </>
  );
};

export default OfficialManagement;