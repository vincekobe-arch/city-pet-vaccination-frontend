import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Modal, Form, InputGroup } from 'react-bootstrap';
import { petAPI, ownerAPI, microchipAPI, handleAPIError } from '../../services/api';

const SuperPetManagement = ({ darkMode }) => {
  const [pets, setPets] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [qrDataURL, setQrDataURL] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  
  // Pagination states
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
      .mobile-stat-number { font-size: 1.4rem !important; }
      .mobile-stat-description { display: none !important; }
      .mobile-card-padding { padding: 0.5rem 0.3rem !important; }
      .mobile-card-header { padding: 0.75rem 1rem !important; }
      .mobile-card-header h5 { font-size: 0.85rem !important; }
      .mobile-card-body { padding: 1rem !important; }
      .mobile-table-wrap th, .mobile-table-wrap td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
      .mobile-table-wrap .mobile-hide { display: none !important; }
      .mobile-table-img { width: 28px !important; height: 28px !important; }
      .mobile-table-badge { font-size: 0.65rem !important; padding: 0.25rem 0.4rem !important; }
      .mobile-pagination { font-size: 0.75rem !important; }
      .mobile-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .mobile-pagination .page-info { font-size: 0.75rem !important; }
      .mobile-filter-stack { flex-direction: column !important; gap: 0.5rem !important; }
      .mobile-filter-stack > div { width: 100% !important; }
      .mobile-stat-icon { width: 36px !important; height: 36px !important; border-radius: 8px !important; }
      .mobile-stat-icon img { width: 20px !important; height: 20px !important; }
      .pet-modal .modal-body { padding: 0.75rem !important; }
      .pet-modal .card { margin-bottom: 0.75rem !important; }
      .pet-modal .card-header { padding: 0.6rem 0.75rem !important; }
      .pet-modal .card-header h6 { font-size: 0.82rem !important; }
      .pet-modal .card-body { padding: 0.6rem 0.75rem !important; }
      .pet-modal .card-body td { font-size: 0.75rem !important; padding: 0.3rem 0.25rem !important; word-break: break-word; }
      .pet-modal .card-body td:first-child { width: 100px !important; min-width: 100px !important; }
      .pet-modal .modal-footer { padding: 0.6rem 0.75rem !important; }
      .pet-modal .modal-title { font-size: 0.9rem !important; }
      .pet-modal code { font-size: 0.7rem !important; padding: 0.15rem 0.35rem !important; word-break: break-all; }
      .pet-modal .badge { font-size: 0.7rem !important; padding: 0.25rem 0.5rem !important; }
    }
    ${darkMode ? `
      .pet-table td,
      .pet-table tr,
      .pet-table tbody {
        background-color: #141414 !important;
        color: #f0f0f0;
        border-color: #2a2a2a !important;
      }
      .pet-table thead th {
        background-color: #1e1e1e !important;
        border-color: #2a2a2a !important;
      }
      .pet-modal-table td,
      .pet-modal-table tr,
      .pet-modal-table tbody {
        background-color: #1e1e1e !important;
        color: #f0f0f0 !important;
        border-color: #2a2a2a !important;
      }
      .pet-modal .modal-content {
        background-color: #141414 !important;
        border-color: #333333 !important;
      }
      .pet-modal .modal-header {
        background-color: #1a1a1a !important;
        border-color: #333333 !important;
      }
      .pet-modal .modal-body {
        background-color: #141414 !important;
      }
      .pet-modal .modal-footer {
        background-color: #1a1a1a !important;
        border-color: #333333 !important;
      }
      .pet-modal .card {
        background-color: #1e1e1e !important;
        border-color: #333333 !important;
      }
      .pet-modal .card-header {
        background-color: #2a2a2a !important;
        border-color: #333333 !important;
      }
      .pet-modal .card-body {
        background-color: #1e1e1e !important;
      }
      .pet-modal .btn-close {
        filter: invert(1);
      }
    ` : `
      .pet-table td,
      .pet-table tr,
      .pet-table tbody {
        background-color: #ffffff !important;
        border-color: #dee2e6 !important;
      }
      .pet-table thead th {
        background-color: #f8f9fa !important;
      }
    `}
  `;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [petsRes, ownersRes] = await Promise.all([
        petAPI.getAll(),
        ownerAPI.getAll()
      ]);
      
      setPets(petsRes.data.pets || []);
      setOwners(ownersRes.data.owners || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPet = async (pet) => {
    setSelectedPet(pet);
    setQrDataURL('');
    setShowViewModal(true);

    if (pet.microchip_number) {
      setQrLoading(true);
      try {
        const microchipRes = await microchipAPI.getByPetId(pet.id);
        const microchipRecord = microchipRes.data.microchip_record;
        if (microchipRecord && microchipRecord.qr_code) {
          const jsonStr = atob(microchipRecord.qr_code);
          const parsed = JSON.parse(jsonStr);
          const QRCode = (await import('qrcode')).default;
          const dataURL = await QRCode.toDataURL(JSON.stringify(parsed), {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setQrDataURL(dataURL);
        }
      } catch {
        setQrDataURL('');
      } finally {
        setQrLoading(false);
      }
    }
  };

  const getOwnerName = (pet) => {
    if (pet.owner_name) {
      return pet.owner_name;
    }
    const owner = owners.find(o => o.id === pet.owner_id);
    return owner ? `${owner.first_name} ${owner.last_name}` : 'Unknown';
  };

  const calculateAge = (birthDate) => {
    if (!birthDate || birthDate === '0000-00-00') return 'Not specified';
    
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
  };

  const filteredPets = pets.filter(pet => {
    const matchesSearch = 
      (pet.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pet.registration_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOwnerName(pet).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecies = 
      filterSpecies === 'all' || pet.species === filterSpecies;
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && pet.is_active) ||
      (filterStatus === 'inactive' && !pet.is_active);
    
    return matchesSearch && matchesSpecies && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPets.length / itemsPerPage);
  const activePets = pets.filter(p => p.is_active);

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: darkMode ? '#0f0f0f' : '#ffffff', minHeight: '100vh', zoom: '0.75', transition: 'all 0.3s ease' }}>
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div>
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i 
                  className="fas fa-paw" 
                  style={{ 
                    fontSize: '1.5rem', 
                    color: darkMode ? '#ffffff' : '#000000',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                ></i>
<h2 className="mobile-title" style={{ fontWeight: '700', color: darkMode ? '#f0f0f0' : '#333333', fontSize: '2rem', marginBottom: '0' }}>Pet Management</h2>              
</div>
              
            </div>
          </Col>
        </Row>

        {error && (
        <Row className="mb-4">
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
        <Row className="mb-4">
          <Col>
            <Alert 
              variant="success" 
              dismissible 
              onClose={() => setSuccess('')}
              style={{
                borderRadius: '12px',
                border: '2px solid #28a745',
                background: 'rgba(40, 167, 69, 0.1)',
                color: '#28a745'
              }}
            >
              <i className="fas fa-check-circle me-2"></i>
              {success}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Statistics Cards */}
<Row className="mb-4">
  {[
    {
      label: 'Total Pets',
      count: activePets.length,
      img: '/paw.png',
      accent: '#ffc107',
      accentAlpha: 'rgba(255,193,7,0.12)',
      delay: '0.1s'
    },
    {
      label: 'Dogs',
      count: activePets.filter(p => p.species === 'dog').length,
      img: '/dog_face.png',
      accent: '#FF6B6B',
      accentAlpha: 'rgba(255,107,107,0.12)',
      delay: '0.2s'
    },
    {
      label: 'Cats',
      count: activePets.filter(p => p.species === 'cat').length,
      img: '/cat_face.png',
      accent: '#4ECDC4',
      accentAlpha: 'rgba(78,205,196,0.12)',
      delay: '0.3s'
    }
  ].map(({ label, count, img, accent, accentAlpha, delay }) => (
    <Col xs={4} md={6} lg={4} className="mb-3" key={label} style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
      <Card
        className="border-0 h-100"
        style={{
          borderRadius: '16px',
          background: darkMode ? '#141414' : '#ffffff',
          border: darkMode ? '1px solid #222222' : '1px solid #f0f0f0',
          boxShadow: darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
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
          e.currentTarget.style.boxShadow = darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.06)';
          e.currentTarget.style.borderColor = darkMode ? '#222222' : '#f0f0f0';
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
                color: darkMode ? '#666666' : '#999999',
                marginBottom: '0.5rem'
              }}>
                {label}
              </p>
              <h2 className="mobile-stat-number" style={{
                fontSize: '2.75rem',
                fontWeight: '700',
                color: darkMode ? '#f0f0f0' : '#111111',
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
                  color: darkMode ? '#555555' : '#aaaaaa',
                  fontWeight: '500'
                }}>
                  Active registrations
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
              <i className="fas fa-paw" style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
            </div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  ))}
</Row>

      {/* Filters */}
      <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
        <Col xs={12} md={6} className="mb-2 mb-md-0">
          <InputGroup style={{ borderRadius: '12px', overflow: 'hidden' }}>
<InputGroup.Text style={{ background: darkMode ? '#1e1e1e' : '#f8f9fa', border: darkMode ? '2px solid #333333' : '2px solid #e9ecef', borderRight: 'none', color: darkMode ? '#aaaaaa' : '#333333' }}>              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by pet name, registration number, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                border: darkMode ? '2px solid #333333' : '2px solid #e9ecef',
                borderLeft: 'none',
                borderRight: searchTerm ? 'none' : darkMode ? '2px solid #333333' : '2px solid #e9ecef',
                background: darkMode ? '#1e1e1e' : '#ffffff',
                color: darkMode ? '#f0f0f0' : '#333333'
              }}
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
        <Col xs={6} md={3} className="mb-2 mb-md-0">
          <Form.Select
            value={filterSpecies}
            onChange={(e) => setFilterSpecies(e.target.value)}
            style={{ 
              borderRadius: '12px', 
              border: darkMode ? '2px solid #333333' : '2px solid #e9ecef',
              fontWeight: '500',
              background: darkMode ? '#1e1e1e' : '#ffffff',
              color: darkMode ? '#f0f0f0' : '#333333'
            }}
          >
            <option value="all">All Species</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            
          </Form.Select>
        </Col>
        <Col xs={6} md={3}>
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ 
              borderRadius: '12px', 
              border: darkMode ? '2px solid #333333' : '2px solid #e9ecef',
              fontWeight: '500',
              background: darkMode ? '#1e1e1e' : '#ffffff',
              color: darkMode ? '#f0f0f0' : '#333333'
            }}
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Status</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Pets Table */}
      <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
        <Col>
          <Card 
            className="border-0"
            style={{
              borderRadius: '20px',
              boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              background: darkMode ? '#141414' : '#ffffff',
              transition: 'all 0.3s ease'
            }}
          >
            <Card.Header
              className="mobile-card-header"
              style={{
                background: darkMode ? 'linear-gradient(135deg, #1a1a1a 0%, #222222 100%)' : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #ffc107',
                padding: '1.5rem',
                borderRadius: '20px 20px 0 0'
              }}
            >
              <h5 className="mb-0" style={{ fontWeight: '700', color: darkMode ? '#f0f0f0' : '#333333' }}>
                <i className="fas fa-paw me-2" style={{ color: '#ffc107' }}></i>
                Registered Pets ({filteredPets.length})
              </h5>
            </Card.Header>
            <Card.Body className="mobile-card-body" style={{ padding: '2rem', background: darkMode ? '#141414' : '#ffffff', transition: 'all 0.3s ease' }}>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading pets...</p>
                </div>
              ) : filteredPets.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-paw text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                  <h5 style={{ color: '#666666', fontWeight: '600' }}>No Pets Found</h5>
                  <p className="text-muted">
                    {searchTerm || filterSpecies !== 'all' || filterStatus !== 'active'
                      ? 'Try adjusting your filters'
                      : 'No pets have been registered by owners yet'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="pet-table mobile-table-wrap" style={{ marginBottom: 0, width: '100%' }}>
                    <thead style={{ background: darkMode ? '#1e1e1e' : '#f8f9fa' }}>
                      <tr>
                        <th style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Species/Breed</th>
                        <th style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#333', padding: '1rem', textAlign: 'center', width: '18%' }}>Pet Information</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#333', padding: '1rem', textAlign: 'center', width: '12%' }}>Gender</th>
                        <th style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Owner</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Registration Date</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#333', padding: '1rem', textAlign: 'center', width: '12%' }}>Status</th>
                        <th style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#333', padding: '1rem', textAlign: 'center', width: '13%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const startIdx = (currentPage - 1) * itemsPerPage;
                        const endIdx = currentPage * itemsPerPage;
                        const currentPagePets = filteredPets.slice(startIdx, endIdx);
                        const emptyRows = itemsPerPage - currentPagePets.length;
                        
                        return (
                          <>
                            {currentPagePets.map((pet, index) => {
                        const getPetFaceImage = (species) => {
                          if (species?.toLowerCase() === 'dog') {
                            return '/dog_face.png';
                          } else if (species?.toLowerCase() === 'cat') {
                            return '/cat_face.png';
                          } else if (species?.toLowerCase() === 'rabbit') {
                            return '/rabbit_face.png';
                          }
                          return '/dog_face.png';
                        };

                        return (
                          <tr 
                            key={pet.id}
                            style={{
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                              background: darkMode ? '#141414' : '#ffffff'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = darkMode ? 'rgba(255, 193, 7, 0.08)' : 'rgba(255, 193, 7, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = darkMode ? '#141414' : '#ffffff';
                            }}
                          >
                            <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '15%' }}>
                              <div className="d-flex flex-column align-items-center">
                                <img 
                                  src={getPetFaceImage(pet.species)}
                                  alt={pet.species}
                                  className="mobile-table-img"
                                  style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    objectFit: 'contain',
                                    marginBottom: '0.5rem',
                                    filter: 'none'
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <i 
                                  className="fas fa-paw" 
                                  style={{ fontSize: '2rem', color: '#ffc107', display: 'none', marginBottom: '0.5rem' }}
                                ></i>
                                {pet.breed && (
                                  <small style={{ fontWeight: '500', marginTop: '0.25rem', color: darkMode ? '#888888' : '#6c757d' }}>
                                    {pet.breed}
                                  </small>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '18%' }}>
                              <div>
                                <strong style={{ fontSize: '1rem', color: darkMode ? '#f0f0f0' : '#333' }}>{pet.name}</strong>
                                <br />
                                <small style={{ fontWeight: '500', color: darkMode ? '#888888' : '#6c757d' }}>
                                  <i className="fas fa-barcode me-1"></i>
                                  {pet.registration_number || 'N/A'}
                                </small>
                              </div>
                            </td>
                            <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '12%' }}>
                              <span className="text-capitalize" style={{ fontWeight: '500' }}>
                                {pet.gender === 'male' ? (
                                  <><i className="fas fa-mars text-primary me-1"></i>Male</>
                                ) : (
                                  <><i className="fas fa-venus text-danger me-1"></i>Female</>
                                )}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '15%' }}>
                              <small style={{ fontWeight: '500', color: darkMode ? '#aaaaaa' : '#555' }}>{getOwnerName(pet)}</small>
                            </td>
                            <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '15%' }}>
                              <small style={{ fontWeight: '500', color: darkMode ? '#aaaaaa' : '#555' }}>
                                {pet.registration_date
                                  ? new Date(pet.registration_date).toLocaleDateString()
                                  : new Date(pet.created_at).toLocaleDateString()}
                              </small>
                            </td>
                            <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '12%' }}>
                              <Badge 
                                bg={pet.is_active ? 'success' : 'secondary'}
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                              >
                                {pet.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '13%' }}>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0"
                                style={{ textDecoration: 'none' }}
                                onClick={() => handleViewPet(pet)}
                                title="View Details"
                              >
                                <img 
                                  src="/view.png" 
                                  alt="View" 
                                  style={{ 
                                    width: '24px', 
                                    height: '24px',
                                    transition: 'transform 0.2s ease',
                                    filter: darkMode ? 'brightness(0) invert(1)' : 'none'
                                  }}
                                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Empty rows to maintain fixed height */}
                      {Array.from({ length: emptyRows }).map((_, index) => (
                        <tr key={`empty-${index}`} style={{ pointerEvents: 'none', height: '73px' }}>
                          <td colSpan="7" style={{ height: '73px', borderBottom: darkMode ? '1px solid #2a2a2a' : '1px solid #dee2e6', background: darkMode ? '#141414' : '#ffffff', boxSizing: 'border-box' }}></td>
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
      {filteredPets.length > itemsPerPage && (
  <Row className="mt-4 mobile-pagination" style={{ animation: 'dropDown 0.4s ease-out 0.6s backwards' }}>
    <Col className="d-flex justify-content-between align-items-center">
      {/* Left: Page X of Y */}
      <span className="page-info" style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
        Page <strong style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{currentPage}</strong> of <strong style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{totalPages}</strong>
      </span>

      {/* Right: Pagination buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          className="page-btn"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          style={{
            background: currentPage === 1 ? (darkMode ? '#1a1a1a' : '#e9ecef') : (darkMode ? '#2a2a2a' : '#ffffff'),
            border: darkMode ? '2px solid #333333' : '2px solid #dee2e6',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            color: currentPage === 1 ? '#adb5bd' : (darkMode ? '#f0f0f0' : '#333333'),
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { if (currentPage !== 1) { e.currentTarget.style.background = darkMode ? '#333' : '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
          onMouseOut={(e) => { if (currentPage !== 1) { e.currentTarget.style.background = darkMode ? '#2a2a2a' : '#ffffff'; e.currentTarget.style.borderColor = darkMode ? '#333333' : '#dee2e6'; } }}
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        {(() => {
          const pages = [];
          if (totalPages <= 3) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
          } else {
            let start = Math.max(1, currentPage - 1);
            let end = Math.min(totalPages, start + 2);
            if (end - start < 2) start = Math.max(1, end - 2);
            for (let i = start; i <= end; i++) pages.push(i);
          }

          return pages.map((page, idx) => (
            <button
              className="page-btn"
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                background: currentPage === page ? '#ffc107' : (darkMode ? '#2a2a2a' : '#ffffff'),
                border: '2px solid',
                borderColor: currentPage === page ? '#ffc107' : (darkMode ? '#333333' : '#dee2e6'),
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                minWidth: '40px',
                cursor: 'pointer',
                fontWeight: '700',
                color: currentPage === page ? '#000000' : (darkMode ? '#f0f0f0' : '#333333'),
                transition: 'all 0.2s',
                boxShadow: currentPage === page ? '0 2px 8px rgba(255, 193, 7, 0.3)' : 'none'
              }}
              onMouseOver={(e) => { if (currentPage !== page) { e.currentTarget.style.background = darkMode ? '#333' : '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
              onMouseOut={(e) => { if (currentPage !== page) { e.currentTarget.style.background = darkMode ? '#2a2a2a' : '#ffffff'; e.currentTarget.style.borderColor = darkMode ? '#333333' : '#dee2e6'; } }}
            >
              {page}
            </button>
          ));
        })()}

        <button
          className="page-btn"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          style={{
            background: currentPage === totalPages ? (darkMode ? '#1a1a1a' : '#e9ecef') : (darkMode ? '#2a2a2a' : '#ffffff'),
            border: darkMode ? '2px solid #333333' : '2px solid #dee2e6',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            color: currentPage === totalPages ? '#adb5bd' : (darkMode ? '#f0f0f0' : '#333333'),
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { if (currentPage !== totalPages) { e.currentTarget.style.background = darkMode ? '#333' : '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
          onMouseOut={(e) => { if (currentPage !== totalPages) { e.currentTarget.style.background = darkMode ? '#2a2a2a' : '#ffffff'; e.currentTarget.style.borderColor = darkMode ? '#333333' : '#dee2e6'; } }}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </Col>
  </Row>
)}

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => { setShowViewModal(false); setQrDataURL(''); }} size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }} className="pet-modal">
        <Modal.Header closeButton style={{ borderBottom: '2px solid #ffc107', background: darkMode ? '#1a1a1a' : '#ffffff' }}>
          <Modal.Title style={{ fontWeight: '700', color: darkMode ? '#f0f0f0' : '#333' }}>
            <i className="fas fa-paw me-2" style={{ color: '#ffc107' }}></i>
            Pet Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.5rem', background: darkMode ? '#141414' : '#ffffff' }}>
          {selectedPet && (
            <Row>
              <Col xs={12} md={6}>
                <Card 
                  className="mb-3 border-0" 
                  style={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    background: darkMode ? '#1e1e1e' : '#ffffff'
                  }}
                >
                  <Card.Header style={{ background: darkMode ? '#2a2a2a' : '#f8f9fa', borderBottom: darkMode ? '2px solid #333333' : '2px solid #e9ecef' }}>
                    <h6 className="mb-0" style={{ fontWeight: '600', color: darkMode ? '#f0f0f0' : '#333' }}>
                      <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }}></i>
                      Basic Information
                    </h6>
                  </Card.Header>
                  <Card.Body style={{ background: darkMode ? '#1e1e1e' : '#ffffff' }}>
                    <Table borderless size="sm" className="pet-modal-table">
                      <tbody>
                        <tr>
                          <td style={{ width: '140px', fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Pet Name:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.name}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Registration No:</td>
                          <td>
                            <code style={{ 
                              background: darkMode ? '#2a2a2a' : '#f8f9fa', 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '4px',
                              color: darkMode ? '#f0f0f0' : '#333'
                            }}>
                              {selectedPet.registration_number || 'N/A'}
                            </code>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Species:</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Breed:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.breed || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Gender:</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Birth Date:</td>
                          <td>
                            {selectedPet.birth_date && selectedPet.birth_date !== '0000-00-00' ? (
                              <>
                                <span style={{ color: darkMode ? '#f0f0f0' : '#333' }}>
                                  {new Date(selectedPet.birth_date).toLocaleDateString()}
                                </span>
                                <br />
                                <small className="text-muted" style={{ fontWeight: '500' }}>
                                  Age: {calculateAge(selectedPet.birth_date)}
                                </small>
                              </>
                            ) : (
                              <span style={{ color: '#666' }}>Not specified</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Sterilized:</td>
                          <td>
                            {selectedPet.sterilized ? (
                              <>
                                <Badge 
                                  bg="success"
                                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                                >
                                  {selectedPet.gender === 'male' ? 'Neutered' : 'Spayed'}
                                </Badge>
                                {selectedPet.sterilization_date && (
                                  <div className="mt-1">
                                    <small className="text-muted" style={{ fontWeight: '500' }}>
                                      Date: {new Date(selectedPet.sterilization_date).toLocaleDateString()}
                                    </small>
                                  </div>
                                )}
                                {selectedPet.sterilized_by && (
                                  <div>
                                    <small className="text-muted" style={{ fontWeight: '500' }}>
                                      By: {selectedPet.sterilized_by}
                                    </small>
                                  </div>
                                )}
                              </>
                            ) : (
                              <Badge 
                                bg="secondary"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                              >
                                Not Sterilized
                              </Badge>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
                </Col>
              
              <Col xs={12} md={6}>
                <Card 
                  className="mb-3 border-0" 
                  style={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    background: darkMode ? '#1e1e1e' : '#ffffff'
                  }}
                >
                  <Card.Header style={{ background: darkMode ? '#2a2a2a' : '#f8f9fa', borderBottom: darkMode ? '2px solid #333333' : '2px solid #e9ecef' }}>
                    <h6 className="mb-0" style={{ fontWeight: '600', color: darkMode ? '#f0f0f0' : '#333' }}>
                      <i className="fas fa-clipboard-list me-2" style={{ color: '#ffc107' }}></i>
                      Additional Details
                    </h6>
                  </Card.Header>
                  <Card.Body style={{ background: darkMode ? '#1e1e1e' : '#ffffff' }}>
                    <Table borderless size="sm" className="pet-modal-table">
                      <tbody>
                        <tr>
                          <td style={{ width: '140px', fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Owner:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{getOwnerName(selectedPet)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Color:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.color || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Weight:</td>
                          <td>
                            {selectedPet.weight ? (
                              <>
                                <span style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.weight} kg</span>
                                <br />
                                <small className="text-muted" style={{ fontWeight: '500' }}>
                                  {(selectedPet.weight * 2.20462).toFixed(2)} lbs
                                </small>
                              </>
                            ) : (
                              <span style={{ color: '#666' }}>Not specified</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Registration Date:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>
                            {selectedPet.registration_date 
                              ? new Date(selectedPet.registration_date).toLocaleDateString()
                              : new Date(selectedPet.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#555' }}>Status:</td>
                          <td>
                            <Badge 
                              bg={selectedPet.is_active ? 'success' : 'secondary'}
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                            >
                              {selectedPet.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                        {selectedPet.special_notes && (
                          <tr>
                            <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Special Notes:</td>
                            <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.special_notes}</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              {selectedPet?.microchip_number && (
                <Card
                  className="mb-3 border-0"
                  style={{
                    borderRadius: '12px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    background: darkMode ? '#1e1e1e' : '#ffffff'
                  }}
                >
                  <Card.Header style={{
                    background: darkMode ? 'rgba(67,97,238,0.15)' : 'rgba(67,97,238,0.08)',
                    borderBottom: '2px solid rgba(67,97,238,0.2)'
                  }}>
                    <h6 className="mb-0" style={{ fontWeight: '600', color: darkMode ? '#f0f0f0' : '#333' }}>
                      <i className="fas fa-qrcode me-2" style={{ color: '#4361ee' }}></i>
                      Microchip QR Code
                    </h6>
                  </Card.Header>
                  <Card.Body className="text-center" style={{ background: darkMode ? '#1e1e1e' : '#ffffff' }}>
                    {qrLoading ? (
                      <div className="py-3">
                        <Spinner animation="border" size="sm" style={{ color: '#4361ee' }} />
                        <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.5rem' }}>Generating QR code...</div>
                      </div>
                    ) : qrDataURL ? (
                      <>
                        <img
                          src={qrDataURL}
                          alt="Pet QR Code"
                          style={{
                            width: '160px',
                            height: '160px',
                            borderRadius: '10px',
                            border: '3px solid #4361ee',
                            padding: '4px',
                            background: '#fff',
                            boxShadow: '0 4px 16px rgba(67,97,238,0.15)'
                          }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                          {selectedPet.microchip_number}
                        </div>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = qrDataURL;
                            link.download = `QR_${selectedPet.name}_${selectedPet.microchip_number}.png`;
                            link.click();
                          }}
                          style={{
                            marginTop: '0.75rem',
                            background: '#4361ee',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '0.4rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#3451d1'}
                          onMouseOut={e => e.currentTarget.style.background = '#4361ee'}
                        >
                          <i className="fas fa-download me-1"></i> Download
                        </button>
                      </>
                    ) : (
                      <div style={{ color: '#bbb', fontSize: '0.82rem', padding: '1rem' }}>
                        <i className="fas fa-qrcode" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', color: '#ddd' }} />
                        QR code not available
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: darkMode ? '2px solid #333333' : '2px solid #e9ecef', background: darkMode ? '#1a1a1a' : '#ffffff' }}>
          <Button 
            variant="secondary" 
            onClick={() => setShowViewModal(false)}
            style={{ 
              borderRadius: '8px',
              padding: '0.5rem 1.5rem',
              fontWeight: '600'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
    </>
  );
};

export default SuperPetManagement;