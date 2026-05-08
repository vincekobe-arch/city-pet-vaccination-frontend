import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Modal, Table } from 'react-bootstrap';
import { barangayAPI, officialAPI, scheduleAPI, handleAPIError } from '../../services/api';

const BarangayManagement = () => {
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState(null);

  useEffect(() => {
    loadBarangays();
  }, []);

  const loadBarangays = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching barangays...');
      
      // Use API methods that include authentication automatically
      const [barangaysRes, officialsRes, vaccRes, dewormRes, seminarRes, sterilRes] = await Promise.all([
        barangayAPI.getAll(),
        officialAPI.getAll(),
        scheduleAPI.getVaccinationSchedules(),
        scheduleAPI.getDewormingSchedules(),
        scheduleAPI.getSeminarSchedules(),
        scheduleAPI.getSterilizationSchedules()
      ]);
      
      const allOfficials = officialsRes.data.officials || [];
      console.log('All officials:', allOfficials);
      
      // Combine all schedules
      const allSchedules = [
        ...(vaccRes.data.schedules || []),
        ...(dewormRes.data.schedules || []),
        ...(seminarRes.data.schedules || []),
        ...(sterilRes.data.schedules || [])
      ];
      
      console.log('All schedules:', allSchedules.length);
      
      // Map barangays with counts
const barangaysWithData = (barangaysRes.data.barangays || []).map((barangay) => {
  // Count officials for this barangay
  const officials_count = allOfficials.filter(
    official => official.assigned_barangay_id === barangay.id
  ).length;
  
  // Count events for this barangay
  const total_events = allSchedules.filter(
    schedule => schedule.barangay_id === barangay.id
  ).length;
  
  console.log(`Barangay ${barangay.name}: ${officials_count} officials, ${total_events} events`);
  
  // Mark barangay as inactive if no officials assigned
  const isEffectivelyActive = barangay.is_active && officials_count > 0;
  
  return {
    ...barangay,
    officials_count,
    total_events,
    is_active: isEffectivelyActive, // Override with effective active status
    originalStatus: barangay.is_active // Keep original status for reference
  };
});
      
      console.log('Final barangays with data:', barangaysWithData);
      setBarangays(barangaysWithData);
      
    } catch (err) {
      console.error('Error in loadBarangays:', err);
      const { message } = handleAPIError(err);
      setError(message || 'Failed to load barangay data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBarangay = async (barangay) => {
    try {
      const response = await barangayAPI.getById(barangay.id);
      setSelectedBarangay(response.data.barangay);
      setShowViewModal(true);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    }
  };

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
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
        <Col>
<div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
  <i 
    className="fas fa-building" 
    style={{ 
      fontSize: '1.5rem', 
      color: '#000000',
      animation: 'float 3s ease-in-out infinite'
    }}
  ></i>
  <h2 style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Barangay Management</h2>
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

      {/* Barangays List */}
      <Row style={{ animation: 'dropDown 0.4s ease-out 0.2s backwards' }}>
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
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #ffc107',
                padding: '1.5rem',
                borderRadius: '20px 20px 0 0'
              }}
            >
              <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                <i className="fas fa-building me-2" style={{ color: '#ffc107' }}></i>
                All Barangays ({barangays.length})
              </h5>
            </Card.Header>
            <Card.Body style={{ padding: '2rem' }}>
              {barangays.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-building text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                  <h5 className="text-muted">No Barangays Found</h5>
                  <p className="text-muted">
                    There are no barangays in the system yet.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
                    <thead style={{ background: '#f8f9fa' }}>
                      <tr>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '30%' }}>
                          Barangay
                        </th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '25%' }}>
                          Contact Information
                        </th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>
                          Admins
                        </th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>
                          Events
                        </th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {barangays.map((barangay) => (
                        <tr 
                          key={barangay.id}
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
                              <strong style={{ fontSize: '1rem', color: '#333' }}>{barangay.name}</strong>
                              <br />
                              <small className="text-muted" style={{ fontWeight: '500' }}>
                                <i className="fas fa-barcode me-1"></i>
                                {barangay.code}
                              </small>
                              {barangay.address && (
                                <>
                                  <br />
                                  <small className="text-muted" style={{ fontWeight: '500' }}>
                                    <i className="fas fa-map-marker-alt me-1"></i>
                                    {barangay.address.substring(0, 50)}
                                    {barangay.address.length > 50 && '...'}
                                  </small>
                                </>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            {barangay.contact_person ? (
                              <div>
                                <strong style={{ fontSize: '0.95rem', color: '#333' }}>
                                  {barangay.contact_person}
                                </strong>
                                {barangay.contact_number && (
                                  <>
                                    <br />
                                    <small className="text-muted" style={{ fontWeight: '500' }}>
                                      <i className="fas fa-phone me-1"></i>
                                      {barangay.contact_number}
                                    </small>
                                  </>
                                )}
                                {barangay.email && (
                                  <>
                                    <br />
                                    <small className="text-muted" style={{ fontWeight: '500' }}>
                                      <i className="fas fa-envelope me-1"></i>
                                      {barangay.email}
                                    </small>
                                  </>
                                )}
                              </div>
                            ) : (
                              <small className="text-muted" style={{ fontWeight: '500' }}>Not assigned</small>
                            )}
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#555' }}>
                              <i className="fas fa-user-shield me-1"></i>
                              {barangay.officials_count || 0}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#555' }}>
                              <i className="fas fa-calendar-alt me-1"></i>
                              {barangay.total_events || 0}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ 
                              fontSize: '0.95rem', 
                              fontWeight: '600',
                              color: barangay.is_active ? '#28a745' : '#dc3545'
                            }}>
                              {barangay.is_active ? 'Active' : 'Inactive'}
                            </span>
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

      </Container>

    </>
  );
};

export default BarangayManagement;