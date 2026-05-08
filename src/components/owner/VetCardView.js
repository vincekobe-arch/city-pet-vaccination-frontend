import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import { petAPI, vaccinationAPI, vetCardAPI, handleAPIError } from '../../services/api';
import { getUser } from '../../utils/auth';

const VetCardView = () => {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [dewormings, setDewormings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = getUser();

  useEffect(() => {
    if (petId) {
      loadPetData();
    }
  }, [petId]);

 const loadPetData = async () => {
    try {
      setLoading(true);
      const [petRes, vetCardRes] = await Promise.all([
  petAPI.getById(petId),
  vetCardAPI.getByPetId(petId)
]);

setPet(petRes.data.pet);
setVaccinations(vetCardRes.data.vet_card?.vaccination_records || []);
setDewormings(vetCardRes.data.vet_card?.deworming_records || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner animation="border" style={{ color: '#6c757d' }} />
          <p style={{ marginTop: '1rem', color: '#6c757d' }}>Loading veterinary card...</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: '2rem'
      }}>
        <Alert variant="danger" style={{ maxWidth: '600px' }}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error || 'Pet not found'}
        </Alert>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      padding: '2rem 0'
    }}>
      <Container style={{zoom: '0.75'}}>
        {/* Print Button */}
        <Row className="mb-4 no-print">
          <Col>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#ffffff',
              padding: '1.5rem',
              borderRadius: '15px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: '700', color: '#2d2d2d' }}>
                  Veterinary Health Card - {pet.name}
                </h4>
                <p style={{ margin: '0.5rem 0 0 0', color: '#6c757d', fontSize: '0.95rem' }}>
                  Official vaccination record and health documentation
                </p>
              </div>
              
            </div>
          </Col>
        </Row>

        {/* Vet Card */}
        <Row>
          <Col>
            <Card className="vet-card-main" style={{ 
              border: 'none',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}>
              <Card.Header style={{
                background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
                color: '#ffffff',
                padding: '2.5rem',
                border: 'none'
              }}>
                <Row className="align-items-center">
                  <Col md={8}>
                    <h3 style={{ 
                      margin: '0 0 0.5rem 0', 
                      fontWeight: '700',
                      letterSpacing: '0.5px'
                    }}>
                      <i className="fas fa-paw me-3"></i>
                      PET VETERINARY HEALTH CARD
                    </h3>
                    <div style={{ fontSize: '0.95rem', opacity: '0.9' }}>
                        Official Vaccination Record & Health Documentation
                    </div>
                  </Col>
                  <Col md={4} className="text-end">
                    <div style={{ 
                      backgroundColor: '#ffffff',
                      color: '#2d2d2d',
                      padding: '1rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: '600' }}>
                        REGISTRATION NO.
                      </div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        letterSpacing: '1px'
                      }}>
                        {pet.registration_number}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Header>
              
              <Card.Body style={{ padding: '3rem' }}>
                {/* Pet Information Section */}
                <Row className="mb-5 pb-4" style={{ borderBottom: '2px solid #e9ecef' }}>
                  <Col md={6}>
                    <h5 style={{ 
                      fontWeight: '700',
                      marginBottom: '1.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '1rem',
                      color: '#2d2d2d'
                    }}>
                      <i className="fas fa-paw me-2"></i>
                      Pet Information
                    </h5>
                    <Table borderless size="sm" style={{ fontSize: '0.95rem' }}>
                      <tbody>
                        <tr>
                          <td width="40%" style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Pet Name:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', color: '#212529' }}>{pet.name}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Species:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', textTransform: 'capitalize', color: '#212529' }}>
                            {pet.species}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Breed:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', color: '#212529' }}>
                            {pet.breed || 'Not specified'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Gender:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', textTransform: 'capitalize', color: '#212529' }}>
                            {pet.gender}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Birth Date:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', color: '#212529' }}>
                            {pet.birth_date 
                              ? new Date(pet.birth_date).toLocaleDateString()
                              : 'Not specified'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Weight:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', color: '#212529' }}>
                            {pet.weight ? `${pet.weight} kg` : 'Not recorded'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Microchip No.:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', color: '#212529', fontFamily: 'monospace' }}>
                            {pet.microchip_number || 'Not microchipped'}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <h5 style={{ 
                      fontWeight: '700',
                      marginBottom: '1.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '1rem',
                      color: '#2d2d2d'
                    }}>
                      <i className="fas fa-user me-2"></i>
                      Owner Information
                    </h5>
                    <Table borderless size="sm" style={{ fontSize: '0.95rem' }}>
                      <tbody>
                        <tr>
                          <td width="40%" style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Owner Name:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', color: '#212529' }}>
                            {pet.owner_first_name} {pet.owner_last_name}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Contact Number:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', color: '#212529' }}>
                            {pet.owner_phone || 'Not provided'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', paddingBottom: '0.75rem', color: '#495057' }}>
                            Email Address:
                          </td>
                          <td style={{ paddingBottom: '0.75rem', color: '#212529' }}>
                            {pet.owner_email}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                    
                    <div style={{ 
                      marginTop: '2rem',
                      padding: '1.5rem',
                      backgroundColor: '#f8f9fa',
                      borderLeft: '4px solid #6c757d',
                      borderRadius: '5px'
                    }}>
                      <h6 style={{ 
                        fontWeight: '700',
                        marginBottom: '1rem',
                        textTransform: 'uppercase',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px',
                        color: '#2d2d2d'
                      }}>
                        <i className="fas fa-calendar-check me-2"></i>
                        Card Status
                      </h6>
                      <div style={{ 
                        display: 'inline-block',
                        backgroundColor: '#28a745',
                        color: '#ffffff',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        marginBottom: '1rem'
                      }}>
                        ACTIVE
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#495057' }}>Issued:</strong> {new Date().toLocaleDateString()}
                        </div>
                        <div>
                          <strong style={{ color: '#495057' }}>Total Vaccinations:</strong> {vaccinations.length}
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong style={{ color: '#495057' }}>Total Dewormings:</strong> {dewormings.length}
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* Vaccination Records Section */}
                <Row className="mb-5">
                  <Col>
                    <h5 style={{ 
                      fontWeight: '700',
                      marginBottom: '1.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '1rem',
                      color: '#2d2d2d'
                    }}>
                      <i className="fas fa-syringe me-2"></i>
                      Vaccination History
                    </h5>
                    
                    {vaccinations.length === 0 ? (
                      <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        backgroundColor: '#f8f9fa',
                        border: '2px dashed #dee2e6',
                        borderRadius: '10px'
                      }}>
                        <i className="fas fa-info-circle" style={{ 
                          fontSize: '3rem', 
                          color: '#6c757d',
                          marginBottom: '1rem'
                        }}></i>
                        <p style={{ margin: 0, fontSize: '1rem', color: '#6c757d' }}>
                          No vaccination records available. Please visit your barangay office for vaccination services.
                        </p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <Table bordered className="vaccination-table" style={{ 
                          fontSize: '0.9rem',
                          backgroundColor: '#ffffff',
                          marginBottom: 0
                        }}>
                          <thead>
                            <tr style={{ background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)', color: '#ffffff' }}>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Date</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Weight (kg)</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Type of Vaccine</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Next Vaccination Due</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Veterinarian</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268', width: '150px' }}>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vaccinations.map((vaccination, index) => (
                              <tr key={vaccination.id} style={{ 
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                              }}>
                                <td style={{ padding: '1rem', fontWeight: '600', color: '#212529', border: '1px solid #dee2e6' }}>
                                  {new Date(vaccination.vaccination_date).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center', color: '#495057', border: '1px solid #dee2e6' }}>
                                  {vaccination.weight ? `${vaccination.weight}` : 'N/A'}
                                </td>
                                <td style={{ padding: '1rem', border: '1px solid #dee2e6' }}>
                                  <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#212529' }}>
                                    {vaccination.vaccine_name}
                                  </div>
                                  {vaccination.vaccine_description && (
                                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                                      {vaccination.vaccine_description}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', border: '1px solid #dee2e6' }}>
                                  {vaccination.next_due_date ? (
                                    <span style={{
                                      display: 'inline-block',
                                      backgroundColor: new Date(vaccination.next_due_date) < new Date() 
                                        ? '#dc3545' 
                                        : '#28a745',
                                      color: '#ffffff',
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '8px',
                                      fontSize: '0.85rem',
                                      fontWeight: '600'
                                    }}>
                                      {new Date(vaccination.next_due_date).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#6c757d' }}>N/A</span>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', color: '#495057', border: '1px solid #dee2e6' }}>
                                  {vaccination.veterinarian_name || 'Not specified'}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#6c757d', border: '1px solid #dee2e6', width: '150px', wordWrap: 'break-word' }}>
                                  {vaccination.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                        
                        <div style={{
                          marginTop: '1.5rem',
                          padding: '1.5rem',
                          backgroundColor: '#f8f9fa',
                          borderLeft: '4px solid #6c757d',
                          borderRadius: '5px'
                        }}>
                          <Row>
                            <Col md={6}>
                              <div style={{ fontSize: '0.95rem', color: '#495057' }}>
                                <strong style={{ color: '#212529' }}>Total Vaccinations:</strong> {vaccinations.length}
                              </div>
                            </Col>
                            <Col md={6} className="text-end">
                              {vaccinations.length > 0 && (
                                <div style={{ fontSize: '0.95rem', color: '#495057' }}>
                                  <strong style={{ color: '#212529' }}>Last Vaccination:</strong>{' '}
                                  {new Date(vaccinations[0].vaccination_date).toLocaleDateString()}
                                </div>
                              )}
                            </Col>
                          </Row>
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>

                {/* Deworming Records Section */}
                <Row className="mb-4">
                  <Col>
                    <h5 style={{ 
                      fontWeight: '700',
                      marginBottom: '1.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '1rem',
                      color: '#2d2d2d'
                    }}>
                      <i className="fas fa-pills me-2"></i>
                      Deworming History
                    </h5>
                    
                    {dewormings.length === 0 ? (
                      <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        backgroundColor: '#f8f9fa',
                        border: '2px dashed #dee2e6',
                        borderRadius: '10px'
                      }}>
                        <i className="fas fa-info-circle" style={{ 
                          fontSize: '3rem', 
                          color: '#6c757d',
                          marginBottom: '1rem'
                        }}></i>
                        <p style={{ margin: 0, fontSize: '1rem', color: '#6c757d' }}>
                          No deworming records available. Please consult your veterinarian for deworming schedule.
                        </p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <Table bordered className="deworming-table" style={{ 
                          fontSize: '0.9rem',
                          backgroundColor: '#ffffff',
                          marginBottom: 0
                        }}>
                          <thead>
                            <tr style={{ background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)', color: '#ffffff' }}>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Date</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Weight (kg)</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Type of Deworming</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Dosage</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Next Deworming Due</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268' }}>Veterinarian</th>
                              <th style={{ fontWeight: '700', padding: '1rem', border: '1px solid #5a6268', width: '150px' }}>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dewormings.map((deworming, index) => (
                              <tr key={deworming.id} style={{ 
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                              }}>
                                <td style={{ padding: '1rem', fontWeight: '600', color: '#212529', border: '1px solid #dee2e6' }}>
                                  {new Date(deworming.deworming_date).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center', color: '#495057', border: '1px solid #dee2e6' }}>
                                  {deworming.weight ? `${deworming.weight}` : 'N/A'}
                                </td>
                                <td style={{ padding: '1rem', border: '1px solid #dee2e6' }}>
                                  <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#212529' }}>
                                    {deworming.deworming_type_name}
                                  </div>
                                  {deworming.deworming_type_description && (
                                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                                      {deworming.deworming_type_description}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', color: '#495057', border: '1px solid #dee2e6' }}>
                                  {deworming.dosage || 'N/A'}
                                </td>
                                <td style={{ padding: '1rem', border: '1px solid #dee2e6' }}>
                                  {deworming.next_due_date ? (
                                    <span style={{
                                      display: 'inline-block',
                                      backgroundColor: new Date(deworming.next_due_date) < new Date() 
                                        ? '#dc3545' 
                                        : '#28a745',
                                      color: '#ffffff',
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '8px',
                                      fontSize: '0.85rem',
                                      fontWeight: '600'
                                    }}>
                                      {new Date(deworming.next_due_date).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#6c757d' }}>N/A</span>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', color: '#495057', border: '1px solid #dee2e6' }}>
                                  {deworming.veterinarian_name || 'Not specified'}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#6c757d', border: '1px solid #dee2e6', width: '150px', wordWrap: 'break-word' }}>
                                  {deworming.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                        
                        <div style={{
                          marginTop: '1.5rem',
                          padding: '1.5rem',
                          backgroundColor: '#f8f9fa',
                          borderLeft: '4px solid #6c757d',
                          borderRadius: '5px'
                        }}>
                          <Row>
                            <Col md={6}>
                              <div style={{ fontSize: '0.95rem', color: '#495057' }}>
                                <strong style={{ color: '#212529' }}>Total Dewormings:</strong> {dewormings.length}
                              </div>
                            </Col>
                            <Col md={6} className="text-end">
                              {dewormings.length > 0 && (
                                <div style={{ fontSize: '0.95rem', color: '#495057' }}>
                                  <strong style={{ color: '#212529' }}>Last Deworming:</strong>{' '}
                                  {new Date(dewormings[0].deworming_date).toLocaleDateString()}
                                </div>
                              )}
                            </Col>
                          </Row>
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>

                {/* Footer */}
                <Row className="mt-5 pt-4" style={{ borderTop: '2px solid #e9ecef' }}>
                  <Col className="text-center">
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#6c757d',
                      lineHeight: '1.8'
                    }}>
                      <div style={{ fontWeight: '700', color: '#2d2d2d', marginBottom: '0.5rem' }}>
                        PetUnity
                      </div>
                      <div>
                        This is an official veterinary health card. Keep this record for future reference.
                      </div>
                      <div>
                        For questions or concerns, please contact your local barangay office.
                      </div>
                      <div style={{ marginTop: '0.75rem', fontStyle: 'italic' }}>
                        Generated on: {new Date().toLocaleString()}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Print Styles */}
        <style>{`
          @media print {
            .no-print {
              display: none !important;
            }
            
            body {
              background-color: #ffffff !important;
              margin: 0;
              padding: 0;
            }
            
            .vet-card-main {
              border: 2px solid #6c757d !important;
              page-break-inside: avoid;
              box-shadow: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }
            
            .vaccination-table,
            .deworming-table {
              font-size: 9px;
              page-break-inside: auto;
            }
            
            .vaccination-table tr,
            .deworming-table tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            .vaccination-table th,
            .vaccination-table td,
            .deworming-table th,
            .deworming-table td {
              padding: 8px 6px !important;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
          
          .vaccination-table,
          .deworming-table {
            border-collapse: collapse;
          }
          
          .vaccination-table th,
          .vaccination-table td,
          .deworming-table th,
          .deworming-table td {
            border: 1px solid #dee2e6;
          }
          
          .vaccination-table td,
          .deworming-table td {
            vertical-align: top;
          }
        `}</style>
      </Container>
    </div>
  );
};

export default VetCardView;