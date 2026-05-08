import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import { petAPI, vetCardAPI, handleAPIError } from '../../services/api';
import { getUser } from '../../utils/auth';

const VetCard = () => {
  const [pets, setPets] = useState([]);
  const [vetCards, setVetCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = getUser();

  const styles = `
    @keyframes dropDown {
      0% { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @media (max-width: 768px) {
      .vc-title { font-size: 1.5rem !important; }
      .vc-card-header { padding: 0.75rem 1rem !important; }
      .vc-card-header h5 { font-size: 0.85rem !important; }
      .vc-card-body { padding: 1rem !important; }
      .vc-table th, .vc-table td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
      .vc-table .mobile-hide { display: none !important; }
      .vc-table .pet-img { width: 28px !important; height: 28px !important; }
      .vc-pagination { font-size: 0.75rem !important; }
      .vc-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .vc-pagination .page-info { font-size: 0.75rem !important; }
    }
  `;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // ✅ FIXED: Load pets and vet cards correctly
      const [petsResponse, vetCardsResponse] = await Promise.all([
        petAPI.getAll(),  // Changed from getByOwner
        vetCardAPI.getAll()
      ]);
      
      const userPets = petsResponse.data.pets || [];
      const allVetCards = vetCardsResponse.data.vet_cards || [];
      
      setPets(userPets);
      setVetCards(allVetCards);
      
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const hasVetCard = (petId) => {
    return vetCards.some(card => 
      card.pet_id === petId && 
      (card.is_active === 1 || card.is_active === '1' || card.is_active === true)
    );
  };

  const handleViewVetCard = (petId) => {
    const width = 900;
    const height = 800;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      `/vet-card-view/${petId}`,
      `VetCard_${petId}`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  };

  const getPetImage = (species) => {
    const timestamp = new Date().getTime();
    if (species === 'dog') {
      return `/dog.png?v=${timestamp}`;
    } else if (species === 'cat') {
      return `/cat.png?v=${timestamp}`;
    } else if (species === 'rabbit') {
      return `/rabbit.png?v=${timestamp}`;
    }
    return `/dog.png?v=${timestamp}`;
  };

  const petsWithCards = pets.filter(pet => hasVetCard(pet.id));
  const petsWithoutCards = pets.filter(pet => !hasVetCard(pet.id));

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(petsWithCards.length / itemsPerPage);
  const paginatedPetsWithCards = petsWithCards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const emptyRows = itemsPerPage - paginatedPetsWithCards.length;

  if (loading) {
    return null;
  }

  if (pets.length === 0) {
    return (
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh',zoom: '0.75' }}>
        <Card 
          className="text-center py-5 border-0"
          style={{
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            background: '#ffffff'
          }}
        >
          <Card.Body>
            <i className="fas fa-id-card text-muted mb-4" style={{ fontSize: '4rem' }}></i>
            <h4 className="text-muted mb-3">No Pets Registered</h4>
            <p className="text-muted mb-0">
              Register your pet first to view their vet card.
            </p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

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
              <h2 className="vc-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>My Pet Vet Cards</h2>
              
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

      {/* Pets WITH Vet Cards */}
{petsWithCards.length > 0 && (
  <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
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
            Available Vet Cards ({petsWithCards.length})
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
                {paginatedPetsWithCards.map((pet, index) => {
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
                  );
                })}
              {Array.from({ length: emptyRows }).map((_, i) => (
  <tr key={`empty-${i}`} style={{ pointerEvents: 'none' }}>
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

{petsWithCards.length > itemsPerPage && (
  <Row className="mt-4 vc-pagination" style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
    <Col className="d-flex justify-content-between align-items-center">
      <span className="page-info" style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
        Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{totalPages}</strong>
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          className="page-btn"
          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          style={{ background: currentPage === 1 ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === 1 ? '#adb5bd' : '#333333', transition: 'all 0.2s' }}
          onMouseOver={e => { if (currentPage !== 1) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
          onMouseOut={e => { if (currentPage !== 1) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
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
            if (start > 1) pages.push('...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages) pages.push('...');
          }
          return pages.map((page, idx) => page === '...' ? (
            <span key={`e-${idx}`} style={{ padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: '600' }}>...</span>
          ) : (
            <button className="page-btn" key={page} onClick={() => setCurrentPage(page)}
              style={{ background: currentPage === page ? '#ffc107' : '#ffffff', border: '2px solid', borderColor: currentPage === page ? '#ffc107' : '#dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '40px', cursor: 'pointer', fontWeight: '700', color: currentPage === page ? '#000000' : '#333333', boxShadow: currentPage === page ? '0 2px 8px rgba(255,193,7,0.3)' : 'none', transition: 'all 0.2s' }}
              onMouseOver={e => { if (currentPage !== page) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
              onMouseOut={e => { if (currentPage !== page) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
            >
              {page}
            </button>
          ));
        })()}

        <button
          className="page-btn"
          onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          style={{ background: currentPage === totalPages ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === totalPages ? '#adb5bd' : '#333333', transition: 'all 0.2s' }}
          onMouseOver={e => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
          onMouseOut={e => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
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

export default VetCard;