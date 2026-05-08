import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, InputGroup, Form, Modal, ListGroup } from 'react-bootstrap';
import api, { ownerAPI, petAPI, handleAPIError } from '../../services/api';

const SuperAdminOwnerManagement = () => {
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerif, setFilterVerif] = useState('all');
  const [filterActive, setFilterActive] = useState('1');
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerPets, setOwnerPets] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownButtonRef = useRef(null);
  const ZOOM = 0.75;

  useEffect(() => {
    if (showDropdown === null) return;
    const updatePos = () => {
      if (!dropdownButtonRef.current) return;
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
    };
    window.addEventListener('scroll', updatePos, true);
    return () => window.removeEventListener('scroll', updatePos, true);
  }, [showDropdown]);

  // Verification modal state
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [verifOwner, setVerifOwner] = useState(null);
  const [verifLoading, setVerifLoading] = useState(false);
  const [verifSuccess, setVerifSuccess] = useState('');
  const [verifError, setVerifError] = useState('');

  const VERIF_CONFIG = {
    not_verified:   { label: 'Not Verified',   color: '#dc3545', icon: 'fa-times-circle' },
    pending:        { label: 'Pending Review', color: '#fd7e14', icon: 'fa-hourglass-half' },
    semi_verified:  { label: 'Semi Verified',  color: '#0d6efd', icon: 'fa-shield-alt' },
    fully_verified: { label: 'Fully Verified', color: '#198754', icon: 'fa-check-circle' },
  };

  const ownerAPI_verify = (ownerId, status, notes = '') => {
    return api.put(`/owners/${ownerId}/verify`, {
      verification_status: status,
      ...(notes ? { verification_notes: notes } : {}),
    });
  };
  
  // Pagination state for pets in modal
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const petsPerPage = 5;
  
  // Pagination state for main table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    @media (max-width: 768px) {
      .mobile-title { font-size: 1.5rem !important; }
      .mobile-stat-label { font-size: 0.6rem !important; margin-bottom: 0.25rem !important; }
      .mobile-stat-number { font-size: 1.2rem !important; }
      .mobile-stat-description { display: none !important; }
      .mobile-card-padding { padding: 0.5rem 0.3rem !important; }
      .mobile-card-header { padding: 1rem !important; }
      .mobile-card-header h5 { font-size: 0.95rem !important; }
      .mobile-card-body { padding: 1rem !important; }
      .mobile-table-wrap th, .mobile-table-wrap td { font-size: 0.7rem !important; padding: 0.5rem 0.3rem !important; }
      .mobile-table-wrap .mobile-hide { display: none !important; }
      .mobile-pagination { font-size: 0.75rem !important; }
      .mobile-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .mobile-pagination .page-info { font-size: 0.75rem !important; }
      .mobile-stat-icon { width: 30px !important; height: 30px !important; border-radius: 8px !important; }
      .mobile-stat-icon img { width: 18px !important; height: 18px !important; }
      .mobile-modal-title { font-size: 0.95rem !important; }
      .mobile-modal-body { font-size: 0.8rem !important; }
      .mobile-modal-body td, .mobile-modal-body th { font-size: 0.78rem !important; padding: 0.35rem 0.5rem !important; }
      .mobile-modal-body h6 { font-size: 0.85rem !important; }
      .mobile-modal-body .badge { font-size: 0.7rem !important; padding: 0.25rem 0.5rem !important; }
      .mobile-verif-title { font-size: 0.8rem !important; }
      .mobile-verif-title span { display: none !important; }
      .mobile-verif-body { font-size: 0.78rem !important; }
      .mobile-verif-body small { font-size: 0.7rem !important; }
      .mobile-verif-body p { font-size: 0.78rem !important; }
      .mobile-verif-body img { max-height: 110px !important; }
      .mobile-verif-actions { flex-direction: column !important; }
      .mobile-verif-actions button { width: 100% !important; font-size: 0.78rem !important; padding: 0.5rem 1rem !important; }
    }
  `;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ownersRes, petsRes] = await Promise.all([
        ownerAPI.getAll(),
        petAPI.getAll()
      ]);
      
      console.log('Owners Response:', ownersRes.data);
      console.log('Pets Response:', petsRes.data);
      
      setOwners(ownersRes.data.owners || []);
      setPets(petsRes.data.pets || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOwner = async (owner) => {
    setSelectedOwner(owner);
    setViewLoading(true);
    setShowViewModal(true);
    setShowDropdown(null);
    setModalCurrentPage(1); // Reset to first page
    
    try {
      const userPets = owner.pet_owner_id 
        ? pets.filter(pet => parseInt(pet.owner_id) === parseInt(owner.pet_owner_id))
        : [];
      
      console.log('Owner:', owner);
      console.log('Filtered Pets:', userPets);
      
      setOwnerPets(userPets);
    } catch (err) {
      console.error('Error filtering pets:', err);
      setOwnerPets([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleOpenVerifModal = async (owner) => {
    setVerifOwner(owner);
    setVerifError('');
    setVerifSuccess('');
    setShowVerifModal(true);
    setShowDropdown(null);
    // Fetch single owner to get full image fields
    try {
      const res = await ownerAPI.getByUserId(owner.user_id);
      const fresh = res.data.owner;
      console.log('RAW valid_id_front (first 100 chars):', fresh?.valid_id_front?.substring(0, 100));
      console.log('valid_id_front length:', fresh?.valid_id_front?.length);
      if (fresh) setVerifOwner(prev => ({ ...prev, ...fresh }));
    } catch {
      // keep the original owner data already set above
    }
  };

  const handleVerifyAction = async (status) => {
    setVerifLoading(true);
    setVerifError('');
    try {
      await ownerAPI_verify(verifOwner.user_id, status);
      setVerifSuccess(`Status updated to: ${VERIF_CONFIG[status]?.label}`);
      const [ownersRes, petsRes] = await Promise.all([
        ownerAPI.getAll(),
        petAPI.getAll()
      ]);
      const freshOwners = ownersRes.data.owners || [];
      const freshPets   = petsRes.data.pets   || [];
      setOwners(freshOwners);
      setPets(freshPets);
      // Sync verifOwner with the fresh data so images reflect immediately
      try {
        const singleRes = await ownerAPI.getByUserId(verifOwner.user_id);
        if (singleRes.data.owner) setVerifOwner(prev => ({ ...prev, ...singleRes.data.owner }));
      } catch {
        setVerifOwner(prev => ({ ...prev, verification_status: status }));
      }
      if (status === 'not_verified') {
        setTimeout(() => setShowVerifModal(false), 1500);
      }
    } catch (err) {
      setVerifError('Failed to update verification status. Please try again.');
    } finally {
      setVerifLoading(false);
    }
  };

  const getOwnerPetCount = (owner) => {
    if (owner.total_pets !== undefined) {
      return parseInt(owner.total_pets);
    }
    if (!owner.pet_owner_id) return 0;
    return pets.filter(pet => parseInt(pet.owner_id) === parseInt(owner.pet_owner_id)).length;
  };

  const calculateAge = (birthDate) => {
    if (!birthDate || birthDate === '0000-00-00') return 'N/A';
    const years = Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
    return `${years} yr${years !== 1 ? 's' : ''}`;
  };

  // Pagination logic for modal
  const indexOfLastPet = modalCurrentPage * petsPerPage;
  const indexOfFirstPet = indexOfLastPet - petsPerPage;
  const currentPets = ownerPets.slice(indexOfFirstPet, indexOfLastPet);
  const totalPages = Math.ceil(ownerPets.length / petsPerPage);

  const handleModalNextPage = () => {
    if (modalCurrentPage < totalPages) {
      setModalCurrentPage(modalCurrentPage + 1);
    }
  };

  const handleModalPrevPage = () => {
    if (modalCurrentPage > 1) {
      setModalCurrentPage(modalCurrentPage - 1);
    }
  };

  const filteredOwners = owners.filter(owner => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${owner.first_name || ''} ${owner.last_name || ''}`.toLowerCase();
    const poFullName = `${owner.po_first_name || ''} ${owner.po_last_name || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchLower) ||
      poFullName.includes(searchLower) ||
      (owner.email || '').toLowerCase().includes(searchLower) ||
      (owner.phone || '').includes(searchTerm) ||
      (owner.po_phone || '').includes(searchTerm) ||
      (owner.username || '').toLowerCase().includes(searchLower);
    const matchesVerif  = filterVerif  === 'all' || owner.verification_status === filterVerif;
    const matchesActive = filterActive === 'all' || String(owner.is_active) === filterActive;
    return matchesSearch && matchesVerif && matchesActive;
  });

  const activeOwners = owners.filter(o => o.is_active);
  const totalPets = pets.length;

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75' }}>
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div>
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i 
                  className="fas fa-users" 
                  style={{ 
                    fontSize: '1.5rem', 
                    color: '#000000',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                ></i>
                <h2 className="mobile-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Community Management</h2>
              </div>
              
            </div>
          </Col>
        </Row>

        {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Statistics */}
      <Row className="mb-4">
        {[
          {
            label: 'Active Owners',
            count: activeOwners.length,
            img: '/users.png',
            accent: '#0dcaf0',
            accentAlpha: 'rgba(13,202,240,0.12)',
            fallbackIcon: 'fa-users',
            description: 'Active Communities',
            delay: '0.1s'
          },
          {
            label: 'Total Pets',
            count: totalPets,
            img: '/paw.png',
            accent: '#ffc107',
            accentAlpha: 'rgba(255,193,7,0.12)',
            fallbackIcon: 'fa-paw',
            description: 'Registered Pets',
            delay: '0.2s'
          },
          {
            label: 'Average',
            count: activeOwners.length > 0 ? (totalPets / activeOwners.length).toFixed(1) : 0,
            img: '/average.png',
            accent: '#198754',
            accentAlpha: 'rgba(25,135,84,0.12)',
            fallbackIcon: 'fa-calculator',
            description: 'Average Pets per Owner',
            delay: '0.3s'
          }
        ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
          <Col xs={4} md={6} lg={4} className="mb-3" key={label} style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
            <Card
              className="border-0 h-100"
              style={{
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid #f0f0f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.25s ease',
                cursor: 'default',
                overflow: 'hidden'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${accentAlpha}`;
                e.currentTarget.style.borderColor = accent;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#f0f0f0';
              }}
            >
              {/* Accent top bar */}
              <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
              <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="mobile-stat-label" style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#999999',
                      marginBottom: '0.5rem'
                    }}>
                      {label}
                    </p>
                    <h2 className="mobile-stat-number" style={{
                      fontSize: '2.75rem',
                      fontWeight: '700',
                      color: '#111111',
                      lineHeight: 1,
                      marginBottom: '0.75rem'
                    }}>
                      {count}
                    </h2>
                    <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: accent
                      }} />
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#aaaaaa',
                        fontWeight: '500'
                      }}>
                        {description}
                      </span>
                    </div>
                  </div>
                  <div className="mobile-stat-icon" style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: accentAlpha,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img
                      src={img}
                      alt={label}
                      style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <i className={`fas ${fallbackIcon}`} style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Search + Filters */}
      <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
        <Col xs={12} md={5} className="mb-2 mb-md-0">
          <InputGroup>
            <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, email, phone, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: '2px solid #e9ecef', borderLeft: 'none', borderRight: searchTerm ? 'none' : '2px solid #e9ecef' }}
            />
            {searchTerm && (
              <Button
                variant="outline-secondary"
                onClick={() => setSearchTerm('')}
                style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}
              >
                <i className="fas fa-times"></i>
              </Button>
            )}
          </InputGroup>
        </Col>
        <Col xs={6} md={4} className="mb-2 mb-md-0">
          <Form.Select
            value={filterVerif}
            onChange={(e) => { setFilterVerif(e.target.value); setCurrentPage(1); }}
            style={{ border: '2px solid #e9ecef', borderRadius: '8px', fontWeight: '500', height: '100%' }}
          >
            <option value="all">All Verification Statuses</option>
            <option value="not_verified">Not Verified</option>
            <option value="pending">Pending Review</option>
            <option value="semi_verified">Semi Verified</option>
            <option value="fully_verified">Fully Verified</option>
          </Form.Select>
        </Col>
        <Col xs={6} md={3}>
          <Form.Select
            value={filterActive}
            onChange={(e) => { setFilterActive(e.target.value); setCurrentPage(1); }}
            style={{ border: '2px solid #e9ecef', borderRadius: '8px', fontWeight: '500', height: '100%' }}
          >
            <option value="all">All Account Statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Owners Table */}
      <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
        <Col>
          <Card 
            className="border-0"
            style={{
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <Card.Header
              className="mobile-card-header"
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #ffc107',
                padding: '1.5rem',
                borderRadius: '20px 20px 0 0'
              }}
            >
              <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                <i className="fas fa-users me-2" style={{ color: '#ffc107' }}></i>
                Communities ({filteredOwners.length})
              </h5>
            </Card.Header>
            <Card.Body className="mobile-card-body" style={{ padding: '2rem' }}>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading owners...</p>
                </div>
              ) : filteredOwners.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-users text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                  <h5 style={{ color: '#666666', fontWeight: '600' }}>No Communities Found</h5>
                  <p className="text-muted">
                    {searchTerm ? 'Try adjusting your search' : 'No Communities registered yet'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mobile-table-wrap" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
                    <thead style={{ background: '#f8f9fa' }}>
                      <tr>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '20%' }}>Owner Information</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '20%' }}>Contact Details</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '20%' }}>Address</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Total Pets</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '12%' }}>Status</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '13%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const startIdx = (currentPage - 1) * itemsPerPage;
                        const endIdx = currentPage * itemsPerPage;
                        const currentPageOwners = filteredOwners.slice(startIdx, endIdx);
                        const emptyRows = itemsPerPage - currentPageOwners.length;
                        
                        return (
                          <>
                            {currentPageOwners.map(owner => {
                              const petCount = getOwnerPetCount(owner);
                              const displayFirstName = owner.po_first_name || owner.first_name;
                              const displayLastName = owner.po_last_name || owner.last_name;
                              const displayPhone = owner.po_phone || owner.phone;
                              
                              return (
                                <tr 
                                  key={owner.user_id || owner.id}
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
                                  <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '20%' }}>
                                    <div>
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <strong style={{ fontSize: '1rem', color: '#333' }}>{displayFirstName} {displayLastName}</strong>
                                        {(() => {
                                          const vs = owner.verification_status;
                                          if (!vs || vs === 'not_verified') return null;
                                          const cfg = {
                                            pending:        { icon: 'fa-hourglass-half', color: '#fd7e14' },
                                            semi_verified:  { icon: 'fa-shield-alt',     color: '#0d6efd' },
                                            fully_verified: { icon: 'fa-check-circle',   color: '#198754' },
                                          }[vs];
                                          if (!cfg) return null;
                                          return (
                                            <i
                                              className={`fas ${cfg.icon}`}
                                              title={vs.replace('_', ' ')}
                                              style={{ fontSize: '0.75rem', color: cfg.color, flexShrink: 0 }}
                                            />
                                          );
                                        })()}
                                      </div>
                                      <br />
                                      <small className="text-muted" style={{ fontWeight: '500' }}>
                                        <i className="fas fa-user me-1"></i>
                                        {owner.username}
                                      </small>
                                    </div>
                                  </td>
                                  <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '20%' }}>
                                    <div>
                                      <small style={{ fontWeight: '500', color: '#555' }}>
                                        <i className="fas fa-envelope me-1"></i>
                                        {owner.email}
                                      </small>
                                      <br />
                                      <small style={{ fontWeight: '500', color: '#555' }}>
                                        <i className="fas fa-phone me-1"></i>
                                        {displayPhone || 'N/A'}
                                      </small>
                                    </div>
                                  </td>
                                  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '20%' }}>
                                    <small style={{ fontWeight: '500', color: '#555' }}>{owner.address || 'Not provided'}</small>
                                  </td>
                                  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '15%' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '600', color: petCount > 0 ? '#007bff' : '#6c757d' }}>
                                      {petCount}
                                    </span>
                                  </td>
                                  <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '12%' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                                      {null}
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: '999px', background: owner.is_active ? 'rgba(25,135,84,0.1)' : 'rgba(108,117,125,0.1)', border: `1px solid ${owner.is_active ? 'rgba(25,135,84,0.3)' : 'rgba(108,117,125,0.3)'}`, fontSize: '0.7rem', fontWeight: '700', color: owner.is_active ? '#198754' : '#6c757d', whiteSpace: 'nowrap' }}>
                                        <i className="fas fa-circle" style={{ fontSize: '0.45rem' }} />
                                        {owner.is_active ? 'Active' : 'Inactive'}
                                      </span>
                                      {(() => {
                                        const ll = owner.last_login;
                                        if (!ll) return (
                                          <span style={{ fontSize: '0.65rem', color: '#bbb', fontStyle: 'italic', marginTop: '0.1rem' }}>Never signed in</span>
                                        );
                                        const diffMs  = Date.now() - new Date(ll).getTime();
                                        const diffDay = Math.floor(diffMs / 86400000);
                                        const diffWk  = Math.floor(diffDay / 7);
                                        const diffMo  = Math.floor(diffDay / 30);
                                        let label, color;
                                        if (diffDay === 0)      { label = 'Today';           color = '#198754'; }
                                        else if (diffDay === 1) { label = 'Yesterday';        color = '#198754'; }
                                        else if (diffDay < 7)   { label = `${diffDay}d ago`;  color = '#198754'; }
                                        else if (diffDay < 30)  { label = `${diffWk}w ago`;   color = '#e6a817'; }
                                        else if (diffMo < 3)    { label = `${diffMo}mo ago`;  color = '#fd7e14'; }
                                        else                    { label = `${diffMo}mo ago`;  color = '#dc3545'; }
                                        return (
                                          <span style={{ fontSize: '0.65rem', color, fontWeight: '600', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                                            <i className="fas fa-clock me-1" style={{ fontSize: '0.58rem' }} />{label}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                  <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '13%' }}>
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                      <button
                                        ref={showDropdown === owner.user_id ? dropdownButtonRef : null}
                                        onClick={(e) => {
                                          if (showDropdown === owner.user_id) {
                                            setShowDropdown(null);
                                          } else {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                              dropdownButtonRef.current = e.currentTarget;
                                              setDropdownPos({
                                                top: rect.top / ZOOM + (rect.height / ZOOM) / 2,
                                                left: (rect.left / ZOOM) - 185,
                                              });
                                            setShowDropdown(owner.user_id);
                                          }
                                        }}
                                        style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Empty rows to maintain fixed height */}
                            {Array.from({ length: emptyRows }).map((_, index) => (
                              <tr key={`empty-${index}`} style={{ pointerEvents: 'none' }}>
                                <td style={{ height: '73px', borderBottom: '1px solid #dee2e6' }}></td>
                                <td style={{ height: '73px', borderBottom: '1px solid #dee2e6' }}></td>
                                <td className="mobile-hide" style={{ height: '73px', borderBottom: '1px solid #dee2e6' }}></td>
                                <td className="mobile-hide" style={{ height: '73px', borderBottom: '1px solid #dee2e6' }}></td>
                                <td style={{ height: '73px', borderBottom: '1px solid #dee2e6' }}></td>
                                <td style={{ height: '73px', borderBottom: '1px solid #dee2e6' }}></td>
                              </tr>
                            ))}
                          </>
                        );
                      })()}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {/* Pagination */}
      {filteredOwners.length > itemsPerPage && (
        <Row className="mt-4 mobile-pagination" style={{ animation: 'dropDown 0.4s ease-out 0.6s backwards' }}>
          <Col className="d-flex justify-content-between align-items-center">
            <span className="page-info" style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
              Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{Math.ceil(filteredOwners.length / itemsPerPage)}</strong>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="page-btn"
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
                const totalPages = Math.ceil(filteredOwners.length / itemsPerPage);
                const pages = [];
                
                if (totalPages <= 3) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    let start = Math.max(1, currentPage - 1);
                    let end = Math.min(totalPages, start + 2);
                    if (end - start < 2) start = Math.max(1, end - 2);
                    
                    for (let i = start; i <= end; i++) pages.push(i);
                    
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
                      className="page-btn"
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
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredOwners.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredOwners.length / itemsPerPage)}
                style={{
                  background: currentPage === Math.ceil(filteredOwners.length / itemsPerPage) ? '#e9ecef' : '#ffffff',
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  cursor: currentPage === Math.ceil(filteredOwners.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  color: currentPage === Math.ceil(filteredOwners.length / itemsPerPage) ? '#adb5bd' : '#333333',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (currentPage !== Math.ceil(filteredOwners.length / itemsPerPage)) {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#ffc107';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage !== Math.ceil(filteredOwners.length / itemsPerPage)) {
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

      {/* View Owner Details Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)} 
        size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}
      >
        <Modal.Header closeButton>
          <Modal.Title className="mobile-modal-title">
            <i className="fas fa-user me-2"></i>
            Owner Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="mobile-modal-body" style={{ padding: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {selectedOwner && (
            <>
              {/* Owner Information */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">
                    <i className="fas fa-user-circle me-2"></i>
                    Personal Information
                  </h6>
                </Card.Header>
                <Card.Body style={{ padding: '0.75rem' }}>
                  <Row className="g-0">
                    <Col xs={12} md={6}>
                      <Table borderless size="sm">
                        <tbody>
                          <tr>
                            <td style={{ width: '120px' }}><strong>Name:</strong></td>
                            <td>{selectedOwner.po_first_name || selectedOwner.first_name} {selectedOwner.po_last_name || selectedOwner.last_name}</td>
                          </tr>
                          <tr>
                            <td><strong>Username:</strong></td>
                            <td>{selectedOwner.username}</td>
                          </tr>
                          <tr>
                            <td><strong>Address:</strong></td>
                            <td>{selectedOwner.address || 'Not provided'}</td>
                          </tr>
                          <tr>
                            <td><strong>Status:</strong></td>
                            <td>
                              <Badge bg={selectedOwner.is_active ? 'success' : 'secondary'}>
                                {selectedOwner.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col xs={12} md={6}>
                      <Table borderless size="sm">
                        <tbody>
                          <tr>
                            <td style={{ width: '120px' }}><strong>Email:</strong></td>
                            <td>{selectedOwner.email}</td>
                          </tr>
                          <tr>
                            <td><strong>Phone:</strong></td>
                            <td>{selectedOwner.po_phone || selectedOwner.phone || 'Not provided'}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Pets List */}
              <h6 className="text-muted mb-3">
                <i className="fas fa-paw me-2"></i>
                Registered Pets ({ownerPets.length})
              </h6>

              {viewLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : ownerPets.length === 0 ? (
                <Alert variant="info">
                  <i className="fas fa-info-circle me-2"></i>
                  This owner hasn't registered any pets yet.
                </Alert>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table bordered hover size="sm">
                      <thead className="table-light">
                        <tr>
                          <th>Pet Name</th>
                          <th>Species/Breed</th>
                          <th>Gender</th>
                          <th>Age</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPets.map(pet => (
                          <tr key={pet.id}>
                            <td>
                              <div>
                                <strong>{pet.name}</strong>
                                <br />
                                <small className="text-muted">
                                  <i className="fas fa-barcode me-1"></i>
                                  {pet.registration_number || 'N/A'}
                                </small>
                              </div>
                            </td>
                            <td>
                              <span className="text-capitalize" style={{ fontWeight: '500' }}>
                                {pet.species}
                              </span>
                              {pet.breed && (
                                <div className="mt-1">
                                  <small className="text-muted">{pet.breed}</small>
                                </div>
                              )}
                            </td>
                            <td className="text-capitalize">
                              {pet.gender === 'male' ? (
                                <><i className="fas fa-mars text-primary me-1"></i>Male</>
                              ) : (
                                <><i className="fas fa-venus text-danger me-1"></i>Female</>
                              )}
                            </td>
                            <td>{calculateAge(pet.birth_date)}</td>
                            <td>
                              <Badge bg={pet.is_active ? 'success' : 'secondary'}>
                                {pet.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={handleModalPrevPage}
                        disabled={modalCurrentPage === 1}
                      >
                        <i className="fas fa-chevron-left me-1"></i>
                        Previous
                      </Button>
                      
                      <span className="text-muted">
                        Page {modalCurrentPage} / {totalPages}
                      </span>
                      
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={handleModalNextPage}
                        disabled={modalCurrentPage === totalPages}
                      >
                        Next
                        <i className="fas fa-chevron-right ms-1"></i>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>

    {/* ── Ellipsis Dropdown Portal ── */}
      {showDropdown !== null && (
        <>
          <div
            onClick={() => setShowDropdown(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1049 }}
          />
          <div style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            transform: 'translateY(-50%)',
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '185px',
            zIndex: 1050,
            overflow: 'hidden',
            zoom: '0.75',
          }}>
            {(() => {
              const owner = owners.find(o => o.user_id === showDropdown);
              if (!owner) return null;
              return (
                <>
                  <button
                    onClick={() => handleViewOwner(owner)}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                    <span>View Details</span>
                  </button>
                  {owner.verification_status !== 'not_verified' && (
                    <button
                      onClick={() => handleOpenVerifModal(owner)}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#0d6efd', fontWeight: '500', borderTop: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f0f4ff'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      <i className="fas fa-id-card" style={{ fontSize: '1rem', width: '18px', textAlign: 'center', color: '#0d6efd' }} />
                      <span>View Verification</span>
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}

    {/* ══════════ VERIFICATION MODAL ══════════ */}
    {verifOwner && (
      <Modal show={showVerifModal} onHide={() => !verifLoading && setShowVerifModal(false)} size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }} backdrop="static">
        <Modal.Header closeButton={!verifLoading} style={{ background: 'linear-gradient(135deg,#f8f9fa,#e9ecef)', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
          <Modal.Title className="mobile-verif-title" style={{ fontWeight: '800', color: '#333', fontSize: '1.05rem' }}>
            <i className="fas fa-id-card me-2" style={{ color: '#ffc107' }} />
            Verification Request — {verifOwner.po_first_name || verifOwner.first_name} {verifOwner.po_last_name || verifOwner.last_name}
            <span style={{ marginLeft: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.75rem', borderRadius: '999px', background: (VERIF_CONFIG[verifOwner.verification_status]?.color || '#999') + '18', border: `1.5px solid ${(VERIF_CONFIG[verifOwner.verification_status]?.color || '#999')}40`, fontSize: '0.75rem', fontWeight: '700', color: VERIF_CONFIG[verifOwner.verification_status]?.color || '#999' }}>
              <i className={`fas ${VERIF_CONFIG[verifOwner.verification_status]?.icon || 'fa-circle'}`} style={{ fontSize: '0.7rem' }} />
              {VERIF_CONFIG[verifOwner.verification_status]?.label}
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="mobile-verif-body" style={{ padding: '2rem', maxHeight: '72vh', overflowY: 'auto' }}>
          {verifError && (
            <Alert variant="danger" className="mb-3" style={{ borderRadius: '10px', border: '2px solid rgba(220,53,69,0.25)', background: 'rgba(220,53,69,0.07)', fontSize: '0.875rem' }}>
              <i className="fas fa-exclamation-circle me-2" style={{ color: '#dc3545' }} />{verifError}
            </Alert>
          )}
          {verifSuccess && (
            <Alert variant="success" className="mb-3" style={{ borderRadius: '10px', border: '2px solid rgba(25,135,84,0.25)', background: 'rgba(25,135,84,0.07)', fontSize: '0.875rem' }}>
              <i className="fas fa-check-circle me-2" style={{ color: '#198754' }} />{verifSuccess}
            </Alert>
          )}

          {/* Submitted info */}
          <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1.5px solid #e9ecef' }}>
            <Row>
              <Col md={6} className="mb-2">
                <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>ID Type</small>
                <p className="mb-0" style={{ fontWeight: '600', color: '#333' }}>{verifOwner.valid_id_type || <span className="text-muted">Not provided</span>}</p>
              </Col>
              <Col md={6} className="mb-2">
                <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Submitted On</small>
                <p className="mb-0" style={{ fontWeight: '600', color: '#333' }}>
                  {verifOwner.id_submitted_at ? new Date(verifOwner.id_submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : <span className="text-muted">—</span>}
                </p>
              </Col>
              <Col md={12} className="mb-2">
                <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Declared Address</small>
                <p className="mb-0" style={{ fontWeight: '600', color: '#333' }}>{verifOwner.po_address || verifOwner.address || <span className="text-muted">Not provided</span>}</p>
              </Col>
              {verifOwner.verified_at && (
                <Col md={6}>
                  <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Verified On</small>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333' }}>
                    {new Date(verifOwner.verified_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </Col>
              )}
            </Row>
          </div>

          {/* ID Images */}
          <Row className="mb-3">
            {[
              { label: 'ID Front', src: verifOwner.valid_id_front },
              { label: 'ID Back', src: verifOwner.valid_id_back },
              { label: 'Selfie with ID', src: verifOwner.selfie_with_id },
            ].map(({ label, src }) => {
              // Normalize the src: if it's a raw base64 string without a data URL
              // prefix, add one. If it already has the prefix, use as-is.
              const imgSrc = (() => {
                if (!src) return null;
                const s = typeof src === 'string' ? src.trim() : '';
                if (!s) return null;
                // Already a full data URL
                if (s.startsWith('data:')) return s;
                // Raw base64 — detect type by magic bytes
                if (s.startsWith('/9j/')) return `data:image/jpeg;base64,${s}`;
                if (s.startsWith('iVBOR')) return `data:image/png;base64,${s}`;
                if (s.startsWith('UklGR')) return `data:image/webp;base64,${s}`;
                // Fallback
                return `data:image/jpeg;base64,${s}`;
              })();
              return (
                <Col md={4} key={label} className="mb-3">
                  <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>{label}</small>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={label}
                      style={{ width: '100%', borderRadius: '10px', border: '2px solid #dee2e6', objectFit: 'cover', maxHeight: '160px', cursor: 'zoom-in', transition: 'all 0.2s', display: 'block' }}
                      onMouseOver={(e) => {
                        e.target.style.filter = 'brightness(0.6)';
                        const parent = e.target.parentElement;
                        let icon = parent.querySelector('.zoom-icon');
                        if (!icon) {
                          icon = document.createElement('div');
                          icon.className = 'zoom-icon';
                          icon.innerHTML = '<i class="fas fa-expand" style="font-size:1.5rem;color:#fff;"></i>';
                          icon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:2;';
                          parent.style.position = 'relative';
                          parent.appendChild(icon);
                        }
                        icon.style.display = 'flex';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.filter = 'brightness(1)';
                        const icon = e.target.parentElement.querySelector('.zoom-icon');
                        if (icon) icon.style.display = 'none';
                      }}
                      onClick={() => {
                        const overlay = document.createElement('div');
                        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;overflow:hidden;';

                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.5);user-select:none;cursor:grab;transform-origin:center center;';

                        let scale = 1, tx = 0, ty = 0;
                        let dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0;

                        const applyTransform = (animated) => {
                          img.style.transition = animated ? 'transform 0.2s ease' : 'none';
                          img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
                        };

                        // scroll wheel zoom
                        overlay.addEventListener('wheel', (e) => {
                          e.preventDefault();
                          scale = Math.min(Math.max(scale + (e.deltaY < 0 ? 0.15 : -0.15), 1), 5);
                          if (scale === 1) { tx = 0; ty = 0; }
                          img.style.cursor = scale > 1 ? 'grab' : 'grab';
                          applyTransform(false);
                        }, { passive: false });

                        // drag to pan
                        img.addEventListener('mousedown', (e) => {
                          if (scale <= 1) return;
                          e.preventDefault();
                          dragging = true;
                          startX = e.clientX;
                          startY = e.clientY;
                          baseX = tx;
                          baseY = ty;
                          img.style.cursor = 'grabbing';
                          img.style.transition = 'none';
                        });

                        const onMove = (e) => {
                          if (!dragging) return;
                          tx = baseX + (e.clientX - startX);
                          ty = baseY + (e.clientY - startY);
                          img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
                        };

                        const onUp = () => {
                          if (!dragging) return;
                          dragging = false;
                          img.style.cursor = scale > 1 ? 'grab' : 'grab';
                        };

                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);

                        // bottom controls
                        const controls = document.createElement('div');
                        controls.style.cssText = 'position:absolute;bottom:1.25rem;left:50%;transform:translateX(-50%);display:flex;gap:0.5rem;align-items:center;';

                        const btnStyle = 'background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:#fff;font-size:0.9rem;width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';

                        const mkBtn = (icon, action) => {
                          const b = document.createElement('button');
                          b.innerHTML = `<i class="fas ${icon}"></i>`;
                          b.style.cssText = btnStyle;
                          b.onmouseover = () => b.style.background = 'rgba(255,255,255,0.3)';
                          b.onmouseout  = () => b.style.background = 'rgba(255,255,255,0.15)';
                          b.onclick = (e) => { e.stopPropagation(); action(); };
                          return b;
                        };

                        controls.appendChild(mkBtn('fa-search-minus', () => {
                          scale = Math.max(scale - 0.3, 1);
                          if (scale === 1) { tx = 0; ty = 0; }
                          applyTransform(true);
                        }));
                        controls.appendChild(mkBtn('fa-compress', () => {
                          scale = 1; tx = 0; ty = 0;
                          applyTransform(true);
                        }));
                        controls.appendChild(mkBtn('fa-search-plus', () => {
                          scale = Math.min(scale + 0.3, 5);
                          applyTransform(true);
                        }));

                        // hint label
                        const hint = document.createElement('div');
                        hint.innerHTML = 'Scroll to zoom &nbsp;·&nbsp; Drag to pan';
                        hint.style.cssText = 'position:absolute;top:1.25rem;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.45);font-size:0.75rem;pointer-events:none;white-space:nowrap;';

                        const closeBtn = document.createElement('button');
                        closeBtn.innerHTML = '✕';
                        closeBtn.style.cssText = 'position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:#fff;font-size:1.2rem;width:42px;height:42px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;z-index:10;';
                        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
                        closeBtn.onmouseout  = () => closeBtn.style.background = 'rgba(255,255,255,0.15)';
                        closeBtn.onclick = () => {
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                          document.body.removeChild(overlay);
                        };

                        overlay.appendChild(img);
                        overlay.appendChild(closeBtn);
                        overlay.appendChild(controls);
                        overlay.appendChild(hint);
                        document.body.appendChild(overlay);
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div style="width:100%;height:120px;border-radius:10px;border:2px dashed #dee2e6;background:#f8f9fa;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:0.8rem"><i class="fas fa-image"></i>&nbsp;Failed to load</div>';
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '120px', borderRadius: '10px', border: '2px dashed #dee2e6', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '0.8rem' }}>
                      <i className="fas fa-image me-1" />Not uploaded
                    </div>
                  )}
                </Col>
              );
            })}
          </Row>

          {/* Action buttons for pending status */}
          {verifOwner.verification_status === 'pending' && (
            <div style={{ background: 'rgba(255,193,7,0.06)', border: '1.5px dashed #ffc107', borderRadius: '12px', padding: '1.25rem', marginTop: '0.5rem' }}>
              <p style={{ fontWeight: '700', color: '#333', marginBottom: '1rem', fontSize: '0.95rem' }}>
                <i className="fas fa-gavel me-2" style={{ color: '#ffc107' }} />
                Review Action
              </p>
              <div className="mobile-verif-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button onClick={() => handleVerifyAction('semi_verified')} disabled={verifLoading} className="border-0"
                  style={{ background: 'linear-gradient(135deg,#0d6efd,#0a58ca)', color: '#fff', borderRadius: '10px', fontWeight: '700', padding: '0.65rem 1.25rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(13,110,253,0.35)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 18px rgba(13,110,253,0.5)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,110,253,0.35)'}>
                  {verifLoading ? <Spinner as="span" animation="border" size="sm" className="me-2" /> : <i className="fas fa-shield-alt me-2" />}
                  Semi Verified
                </Button>
                <Button onClick={() => handleVerifyAction('fully_verified')} disabled={verifLoading} className="border-0"
                  style={{ background: 'linear-gradient(135deg,#198754,#146c43)', color: '#fff', borderRadius: '10px', fontWeight: '700', padding: '0.65rem 1.25rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(25,135,84,0.35)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 18px rgba(25,135,84,0.5)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(25,135,84,0.35)'}>
                  {verifLoading ? <Spinner as="span" animation="border" size="sm" className="me-2" /> : <i className="fas fa-check-circle me-2" />}
                  Fully Verified
                </Button>
                <Button onClick={() => handleVerifyAction('not_verified')} disabled={verifLoading} className="border-0"
                  style={{ background: 'linear-gradient(135deg,#dc3545,#b02a37)', color: '#fff', borderRadius: '10px', fontWeight: '700', padding: '0.65rem 1.25rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(220,53,69,0.35)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 18px rgba(220,53,69,0.5)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,53,69,0.35)'}>
                  {verifLoading ? <Spinner as="span" animation="border" size="sm" className="me-2" /> : <i className="fas fa-times-circle me-2" />}
                  Decline
                </Button>
              </div>
              <small style={{ color: '#888', marginTop: '0.75rem', display: 'block', fontSize: '0.78rem' }}>
                <i className="fas fa-info-circle me-1" />Declining will reset the owner's verification status and erase their submitted request.
              </small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e9ecef' }}>
          <Button variant="secondary" onClick={() => setShowVerifModal(false)} disabled={verifLoading}
            style={{ borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    )}
    </>
  );
};

export default SuperAdminOwnerManagement;