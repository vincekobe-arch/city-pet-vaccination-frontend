import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Modal, Table, Form, InputGroup } from 'react-bootstrap';
import { vetCardAPI, petAPI, handleAPIError } from '../../services/api';
import { getUser } from '../../utils/auth';

const VetCardManagement = () => {
  const [vetCards, setVetCards] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 5;

const [searchTerm, setSearchTerm] = useState('');
const [filterSpecies, setFilterSpecies] = useState('all');
  
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
      .vc-title { font-size: 1.5rem !important; }
      .vc-stat-label { font-size: 0.55rem !important; margin-bottom: 0.15rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      .vc-stat-number { font-size: 1.1rem !important; margin-bottom: 0.25rem !important; }
      .vc-stat-description { display: none !important; }
      .vc-stat-card-body { padding: 0.6rem 0.5rem !important; }
      .vc-stat-icon { width: 32px !important; height: 32px !important; border-radius: 8px !important; flex-shrink: 0 !important; }
      .vc-stat-icon img { width: 18px !important; height: 18px !important; }
      .vc-card-header { padding: 0.75rem 1rem !important; }
      .vc-card-header h5 { font-size: 0.85rem !important; }
      .vc-card-body { padding: 1rem !important; }
      .vc-table th, .vc-table td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
.vc-table tr.empty-row td { padding: 0 !important; }
      .vc-table .mobile-hide { display: none !important; }
      .vc-table .pet-img { width: 28px !important; height: 28px !important; }
      .vc-pagination { font-size: 0.75rem !important; }
      .vc-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .vc-pagination .page-info { font-size: 0.75rem !important; }
    }
  `;
  
  const user = getUser();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vetCardsRes, petsRes] = await Promise.all([
        vetCardAPI.getAll(),
        petAPI.getAll()
      ]);
      
      setVetCards(vetCardsRes.data.vet_cards || []);
      setPets(petsRes.data.pets || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVetCard = (petId) => {
    window.open(`/vet-card-view/${petId}`, '_blank');
  };

  const getPetDetails = (petId) => {
    return pets.find(p => p.id === petId);
  };

  const hasActiveVetCard = (petId) => {
    return vetCards.some(card => 
      card.pet_id === petId && 
      (card.is_active === 1 || card.is_active === '1' || card.is_active === true)
    );
  };

  const getPetFaceImage = (species) => {
    if (species?.toLowerCase() === 'dog') {
      return '/dog_face.png';
    } else if (species?.toLowerCase() === 'cat') {
      return '/cat_face.png';
    }
    return '/dog_face.png';
  };

  const petsWithCards = pets.filter(pet => {
  if (!hasActiveVetCard(pet.id)) return false;

  const matchesSearch =
    (pet.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pet.registration_number || '').toLowerCase().includes(searchTerm.toLowerCase());

  const matchesSpecies =
    filterSpecies === 'all' || pet.species === filterSpecies;

  return matchesSearch && matchesSpecies;
});
  const petsWithoutCards = pets.filter(pet => !hasActiveVetCard(pet.id) && (pet.is_active === 1 || pet.is_active === '1' || pet.is_active === true));

  const totalPets = pets.length;
  const totalVetCards = petsWithCards.length;
  const averagePercentage = totalPets > 0 ? ((totalVetCards / totalPets) * 100).toFixed(0) : 0;

  // Pagination calculations
const totalPages = Math.ceil(petsWithCards.length / itemsPerPage);
const startIdx = (currentPage - 1) * itemsPerPage;
const endIdx = startIdx + itemsPerPage;
const paginatedPetsWithCards = petsWithCards.slice(startIdx, endIdx);
const emptyRows = itemsPerPage - paginatedPetsWithCards.length;

  

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75' }}>
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div>
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i 
                  className="fas fa-id-card" 
                  style={{ 
                    fontSize: '1.5rem', 
                    color: '#000000',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                ></i>
                <h2 className="vc-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Vet Card Management</h2>
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
      <Row className="mb-4" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px' }}>
        {[
          {
            label: 'Total Vet Cards',
            count: totalVetCards,
            img: '/vetcard.png',
            accent: '#ffc107',
            accentAlpha: 'rgba(255,193,7,0.12)',
            fallbackIcon: 'fa-id-card',
            description: 'Issued Vet Cards',
            delay: '0.1s'
          },
          {
            label: 'Without Vet Cards',
            count: petsWithoutCards.length,
            img: '/without_vetcard.png',
            accent: '#0dcaf0',
            accentAlpha: 'rgba(13,202,240,0.12)',
            fallbackIcon: 'fa-times-circle',
            description: 'Pets Pending Cards',
            delay: '0.2s'
          },
          {
            label: 'Coverage',
            count: `${averagePercentage}%`,
            img: '/average.png',
            accent: '#198754',
            accentAlpha: 'rgba(25,135,84,0.12)',
            fallbackIcon: 'fa-chart-pie',
            description: 'Pets with Vet Cards',
            delay: '0.3s'
          }
        ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
          <div key={label} style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0, animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
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
              <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
              <Card.Body className="vc-stat-card-body" style={{ padding: '1.5rem', background: 'transparent' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="vc-stat-label" style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#999999',
                      marginBottom: '0.5rem'
                    }}>
                      {label}
                    </p>
                    <h2 className="vc-stat-number" style={{
                      fontSize: '2.75rem',
                      fontWeight: '700',
                      color: '#111111',
                      lineHeight: 1,
                      marginBottom: '0.75rem'
                    }}>
                      {count}
                    </h2>
                    <div className="vc-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <div className="vc-stat-icon" style={{
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
          </div>
        ))}
      </Row>

      {/* Filters */}
<Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
  <Col xs={12} md={6} className="mb-2 mb-md-0">
    <InputGroup style={{ borderRadius: '12px', overflow: 'hidden' }}>
      <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none', color: '#333333' }}>
        <i className="fas fa-search"></i>
      </InputGroup.Text>
      <Form.Control
        type="text"
        placeholder="Search by pet name or registration number..."
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        style={{
          border: '2px solid #e9ecef',
          borderLeft: 'none',
          borderRight: searchTerm ? 'none' : '2px solid #e9ecef',
          background: '#ffffff',
          color: '#333333'
        }}
      />
      {searchTerm && (
        <Button
          variant="outline-secondary"
          onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
          style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}
        >
          <i className="fas fa-times"></i>
        </Button>
      )}
    </InputGroup>
  </Col>
  <Col xs={6} md={3}>
    <Form.Select
      value={filterSpecies}
      onChange={(e) => { setFilterSpecies(e.target.value); setCurrentPage(1); }}
      style={{
        borderRadius: '12px',
        border: '2px solid #e9ecef',
        fontWeight: '500',
        background: '#ffffff',
        color: '#333333'
      }}
    >
      <option value="all">All Species</option>
      <option value="dog">Dogs</option>
      <option value="cat">Cats</option>
    </Form.Select>
  </Col>
</Row>

      {/* Pets WITH Vet Cards */}
      {petsWithCards.length > 0 && (
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
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
                className="vc-card-header"
                style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderBottom: '2px solid #ffc107',
                  padding: '1.5rem',
                  borderRadius: '20px 20px 0 0'
                }}
              >
                <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                  <i className="fas fa-check-circle me-2" style={{ color: '#ffc107' }}></i>
                  Pets with Vet Cards ({petsWithCards.length})
                </h5>
              </Card.Header>
              <Card.Body className="vc-card-body" style={{ padding: '2rem' }}>
                <div className="table-responsive">
                  <Table hover className="vc-table" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
                    <thead style={{ background: '#f8f9fa' }}>
                      <tr>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '18%' }}>Species/Breed</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '22%' }}>Pet Information</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Gender</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Vaccinations</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Dewormings</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
  {paginatedPetsWithCards.map((pet) => (
                        <tr 
                          key={pet.id}
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
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '18%' }}>
                            <div className="d-flex flex-column align-items-center">
                              <img 
                                src={getPetFaceImage(pet.species)}
                                alt={pet.species}
                                className="pet-img"
                                style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  objectFit: 'contain',
                                  marginBottom: '0.5rem'
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
                                <small className="text-muted" style={{ fontWeight: '500', marginTop: '0.25rem' }}>
                                  {pet.breed}
                                </small>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '22%' }}>
                            <div>
                              <strong style={{ fontSize: '1rem', color: '#333' }}>{pet.name}</strong>
                              <br />
                              <small className="text-muted" style={{ fontWeight: '500' }}>
                                <i className="fas fa-barcode me-1"></i>
                                {pet.registration_number || 'N/A'}
                              </small>
                            </div>
                          </td>
                          <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '15%' }}>
                            <span className="text-capitalize" style={{ fontWeight: '500' }}>
                              {pet.gender === 'male' ? (
                                <><i className="fas fa-mars text-primary me-1"></i>Male</>
                              ) : (
                                <><i className="fas fa-venus text-danger me-1"></i>Female</>
                              )}
                            </span>
                          </td>
                          <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '15%' }}>
  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: pet.vaccination_count > 0 ? '#007bff' : '#6c757d' }}>
    {pet.vaccination_count || 0}
  </span>
</td>
                          <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '15%' }}>
  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: pet.deworming_count > 0 ? '#007bff' : '#6c757d' }}>
    {pet.deworming_count || 0}
  </span>
</td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '15%' }}>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0"
                              style={{ textDecoration: 'none' }}
                              onClick={() => handleViewVetCard(pet.id)}
                              title="View Vet Card"
                            >
                              <img 
                                src="/view.png" 
                                alt="View" 
                                style={{ 
                                  width: '24px', 
                                  height: '24px',
                                  transition: 'transform 0.2s ease'
                                }} 
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                              />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {Array.from({ length: emptyRows }).map((_, index) => (
  <tr key={`empty-${index}`} className="empty-row" style={{ pointerEvents: 'none' }}>
    <td style={{ height: '73px', borderBottom: '1px solid #dee2e6', background: 'transparent', padding: 0 }}></td>
    <td style={{ height: '73px', borderBottom: '1px solid #dee2e6', background: 'transparent', padding: 0 }}></td>
    <td className="mobile-hide" style={{ height: '73px', borderBottom: '1px solid #dee2e6', background: 'transparent', padding: 0 }}></td>
    <td className="mobile-hide" style={{ height: '73px', borderBottom: '1px solid #dee2e6', background: 'transparent', padding: 0 }}></td>
    <td className="mobile-hide" style={{ height: '73px', borderBottom: '1px solid #dee2e6', background: 'transparent', padding: 0 }}></td>
    <td style={{ height: '73px', borderBottom: '1px solid #dee2e6', background: 'transparent', padding: 0 }}></td>
  </tr>
))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Pagination */}
      {petsWithCards.length > itemsPerPage && (
        <Row className="mt-4 vc-pagination" style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
          <Col className="d-flex justify-content-between align-items-center">
            <span className="page-info" style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
              Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{totalPages}</strong>
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

    </Container>
    </>
  );
};

export default VetCardManagement;