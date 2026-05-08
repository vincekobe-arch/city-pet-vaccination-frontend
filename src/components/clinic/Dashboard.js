import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import { clinicAPI, handleAPIError } from '../../services/api';
import { getUser } from '../../utils/auth';

const ClinicDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    vaccinations: [],
    dewormings: [],
    sterilizations: [],
    pets: [],
    recentRecords: [],
    clinicName: 'City Vet Muntinlupa'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = getUser();

  useEffect(() => {
    loadDashboardData();
  }, []);

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
      .mobile-title {
        font-size: 1.5rem !important;
      }
      .mobile-subtitle {
        font-size: 0.9rem !important;
      }
      .mobile-stat-number {
        font-size: 1.2rem !important;
      }
      .mobile-stat-label {
        font-size: 0.6rem !important;
        margin-bottom: 0.25rem !important;
      }
      .mobile-stat-icon {
        width: 30px !important;
        height: 30px !important;
        border-radius: 8px !important;
      }
      .mobile-stat-icon img {
        width: 18px !important;
        height: 18px !important;
      }
      .mobile-card-padding {
        padding: 0.5rem 0.3rem !important;
      }
      .mobile-card-header {
        padding: 1rem !important;
      }
      .mobile-card-header h5 {
        font-size: 0.95rem !important;
      }
      .mobile-card-body {
        padding: 1rem !important;
      }
      .mobile-stat-description {
        display: none !important;
      }
      .mobile-stat-card {
        margin-bottom: 0.5rem !important;
      }
      .mobile-record-item {
        padding: 0.6rem !important;
        margin-bottom: 0.5rem !important;
        border-radius: 8px !important;
      }
      .mobile-record-name {
        font-size: 0.85rem !important;
        margin-bottom: 0.25rem !important;
      }
      .mobile-record-info {
        font-size: 0.7rem !important;
        gap: 8px !important;
      }
      .vaccination-progress-bar {
        height: 10px !important;
        border-radius: 5px !important;
      }
      .vaccination-progress-bar > div {
        border-radius: 5px !important;
      }
      .mobile-species-icon {
        width: 28px !important;
        height: 28px !important;
        border-radius: 6px !important;
        margin-right: 8px !important;
      }
      .mobile-species-icon-img {
        width: 18px !important;
        height: 18px !important;
      }
      .mobile-vaccination-badge {
        font-size: 0.7rem !important;
        padding: 0.25rem 0.5rem !important;
        border-radius: 6px !important;
      }
      .mobile-vaccination-item {
        margin-bottom: 0.75rem !important;
      }
    }
  `;

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await clinicAPI.getDashboard();
      const data = res.data;

      const vaccinations = data.vaccination_records || [];
      const dewormings = data.deworming_records || [];
      const sterilizations = data.sterilization_records || [];
      const pets = data.pets || [];

      const recent = [
        ...vaccinations.map(v => ({
          ...v,
          recordType: 'vaccination',
          sortDate: new Date(v.vaccination_date),
          displayDate: v.vaccination_date
        })),
        ...dewormings.map(d => ({
          ...d,
          recordType: 'deworming',
          sortDate: new Date(d.deworming_date),
          displayDate: d.deworming_date
        })),
        ...sterilizations.map(s => ({
          ...s,
          recordType: 'sterilization',
          sortDate: new Date(s.sterilization_date),
          displayDate: s.sterilization_date
        }))
      ]
        .sort((a, b) => b.sortDate - a.sortDate)
        .slice(0, 6);

      setDashboardData({
        vaccinations,
        dewormings,
        sterilizations,
        pets,
        recentRecords: recent,
        clinicName: data.clinic_name || 'City Vet Muntinlupa'
      });
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Vaccination stats by species (mirroring AdminDashboard pattern)
  const getVaccinationStatsBySpecies = () => {
    const species = ['Dog', 'Cat', 'Rabbit'];
    const colors = {
      Dog: '#FF6B6B',
      Cat: '#4ECDC4',
      Rabbit: '#95E1D3'
    };

    return species
      .map(speciesName => {
        const speciesPets = dashboardData.pets.filter(
          p => p.species?.toLowerCase() === speciesName.toLowerCase()
        );
        const vaccinated = speciesPets.filter(
          p => p.vaccination_count && p.vaccination_count > 0
        ).length;
        const total = speciesPets.length;
        const percentage = total > 0 ? Math.round((vaccinated / total) * 100) : 0;

        return {
          species: speciesName,
          vaccinated,
          total,
          percentage,
          color: colors[speciesName],
          icon:
            speciesName === 'Dog'
              ? '/dog_face.png'
              : speciesName === 'Cat'
              ? '/cat_face.png'
              : '/rabbit_face.png'
        };
      })
      .filter(s => s.total > 0);
  };

  const VaccinationProgressBar = ({ species, vaccinated, total, percentage, icon, color }) => (
    <div className="mb-4 mobile-vaccination-item">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center">
          <div
            className="mobile-species-icon"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              border: `2px solid ${color}30`
            }}
          >
            <img
              src={icon}
              alt={species}
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              className="mobile-species-icon-img"
              onError={e => (e.target.style.display = 'none')}
            />
          </div>
          <span style={{ fontWeight: '600', fontSize: '1rem', color: '#333333' }}>{species}</span>
        </div>
        <div className="text-end">
          <Badge
            className="mobile-vaccination-badge"
            style={{
              background: color,
              fontSize: '0.85rem',
              fontWeight: '700',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px'
            }}
          >
            {percentage}%
          </Badge>
          <small className="text-muted ms-2" style={{ fontWeight: '600' }}>
            ({vaccinated}/{total})
          </small>
        </div>
      </div>
      <div
        className="vaccination-progress-bar"
        style={{
          width: '100%',
          height: '28px',
          backgroundColor: '#f0f0f0',
          borderRadius: '14px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
            transition: 'width 0.8s ease',
            borderRadius: '14px',
            boxShadow: `0 2px 8px ${color}40`
          }}
        />
      </div>
    </div>
  );

  const getPetImage = species => {
    if (species?.toLowerCase() === 'dog') return '/dog.png';
    if (species?.toLowerCase() === 'cat') return '/cat.png';
    if (species?.toLowerCase() === 'rabbit') return '/rabbit.png';
    return '/dog.png';
  };

  const getRecordTypeMeta = type => {
    const map = {
      vaccination: { label: 'Vaccination', color: '#ffc107', icon: 'fas fa-syringe' },
      deworming: { label: 'Deworming', color: '#17a2b8', icon: 'fas fa-pills' },
      sterilization: { label: 'Sterilization', color: '#28a745', icon: 'fas fa-cut' }
    };
    return map[type] || { label: type, color: '#6c757d', icon: 'fas fa-file-medical' };
  };

  const vaccinationStatsBySpecies = getVaccinationStatsBySpecies();
  const totalRecords =
    dashboardData.vaccinations.length +
    dashboardData.dewormings.length +
    dashboardData.sterilizations.length;

  // Unique pets served (from all records)
  const uniquePetIds = new Set([
    ...dashboardData.vaccinations.map(r => r.pet_id),
    ...dashboardData.dewormings.map(r => r.pet_id),
    ...dashboardData.sterilizations.map(r => r.pet_id)
  ]);
  const totalPetsServed = uniquePetIds.size;

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75' }}>

        {/* Page Header */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
              <i
                className="fas fa-home"
                style={{
                  fontSize: '1.5rem',
                  color: '#000000',
                  animation: 'float 3s ease-in-out infinite'
                }}
              />
              <h2
                className="mobile-title"
                style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}
              >
                Clinic Dashboard
              </h2>
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
                <i className="fas fa-exclamation-triangle me-2" />
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="warning" />
            <p className="mt-3 text-muted">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* ── Statistics Cards ── */}
            <Row className="mb-4">

              {/* Total Records */}
              <Col xs={6} md={3} className="mb-3 mobile-stat-card" style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
                <Card
                  className="border-0 h-100"
                  style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,193,7,0.12)'; e.currentTarget.style.borderColor = '#ffc107'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
                >
                  <div style={{ height: '3px', background: '#ffc107', borderRadius: '16px 16px 0 0' }} />
                  <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>Total Records</p>
                        <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{totalRecords}</h2>
                        <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffc107' }} />
                          <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>All Medical Records</span>
                        </div>
                      </div>
                      <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,193,7,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src="/vaccine.png" alt="Records" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-file-medical" style={{ fontSize: '1.4rem', color: '#ffc107', display: 'none' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Pets Served */}
              <Col xs={6} md={3} className="mb-3 mobile-stat-card" style={{ animation: 'dropDown 0.4s ease-out 0.2s backwards' }}>
                <Card
                  className="border-0 h-100"
                  style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,202,240,0.12)'; e.currentTarget.style.borderColor = '#0dcaf0'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
                >
                  <div style={{ height: '3px', background: '#0dcaf0', borderRadius: '16px 16px 0 0' }} />
                  <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>Pets Served</p>
                        <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{totalPetsServed}</h2>
                        <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0dcaf0' }} />
                          <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>Unique Pets</span>
                        </div>
                      </div>
                      <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(13,202,240,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src="/paw.png" alt="Pets Served" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-paw" style={{ fontSize: '1.4rem', color: '#0dcaf0', display: 'none' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Vaccinations */}
              <Col xs={6} md={3} className="mb-3 mobile-stat-card" style={{ animation: 'dropDown 0.4s ease-out 0.3s backwards' }}>
                <Card
                  className="border-0 h-100"
                  style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(220,53,69,0.12)'; e.currentTarget.style.borderColor = '#dc3545'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
                >
                  <div style={{ height: '3px', background: '#dc3545', borderRadius: '16px 16px 0 0' }} />
                  <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>Vaccinations</p>
                        <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{dashboardData.vaccinations.length}</h2>
                        <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc3545' }} />
                          <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>Vaccination Records</span>
                        </div>
                      </div>
                      <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(220,53,69,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src="/vaccine.png" alt="Vaccinations" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-syringe" style={{ fontSize: '1.4rem', color: '#dc3545', display: 'none' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Sterilizations */}
              <Col xs={6} md={3} className="mb-3 mobile-stat-card" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
                <Card
                  className="border-0 h-100"
                  style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(25,135,84,0.12)'; e.currentTarget.style.borderColor = '#198754'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
                >
                  <div style={{ height: '3px', background: '#198754', borderRadius: '16px 16px 0 0' }} />
                  <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>Sterilizations</p>
                        <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{dashboardData.sterilizations.length}</h2>
                        <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#198754' }} />
                          <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>Sterilization Records</span>
                        </div>
                      </div>
                      <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(25,135,84,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src="/sterilization.png" alt="Sterilizations" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-cut" style={{ fontSize: '1.4rem', color: '#198754', display: 'none' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* ── Bottom Row: Vaccination by Species + Recent Records ── */}
            <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>

              {/* Upcoming Appointments */}
              <Col lg={6} className="mb-4">
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
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-calendar-alt me-2" style={{ color: '#ffc107' }} />
                        Upcoming Appointments
                      </h5>
                      <Badge style={{ background: '#ffc107', color: '#000', fontWeight: '700', fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '20px' }}>
                        {(() => {
                          const today = new Date(); today.setHours(0,0,0,0);
                          const upcoming = [
                            ...dashboardData.vaccinations
                              .filter(v => v.next_due_date)
                              .map(v => ({ ...v, type: 'vaccination' })),
                            ...dashboardData.dewormings
                              .filter(d => d.next_due_date)
                              .map(d => ({ ...d, type: 'deworming' })),
                          ].filter(r => new Date(r.next_due_date) >= today);
                          return upcoming.length;
                        })()} upcoming
                      </Badge>
                    </div>
                  </Card.Header>
                  <Card.Body className="mobile-card-body" style={{ padding: '1.5rem', height: '420px', overflowY: 'auto' }}>
                    {(() => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const upcoming = [
                        ...dashboardData.vaccinations
                          .filter(v => v.next_due_date)
                          .map(v => ({ ...v, type: 'vaccination', dueDate: new Date(v.next_due_date) })),
                        ...dashboardData.dewormings
                          .filter(d => d.next_due_date)
                          .map(d => ({ ...d, type: 'deworming', dueDate: new Date(d.next_due_date) })),
                      ]
                        .filter(r => r.dueDate >= today)
                        .sort((a, b) => a.dueDate - b.dueDate)
                        .slice(0, 10);

                      if (upcoming.length === 0) {
                        return (
                          <div className="text-center py-5">
                            <i className="fas fa-calendar-check mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }} />
                            <h6 style={{ color: '#666666', fontWeight: '600' }}>No Upcoming Appointments</h6>
                            <p className="text-muted small mb-0">
                              Appointments will appear here when vaccination or deworming records have a future due date.
                            </p>
                          </div>
                        );
                      }

                      return upcoming.map((record, index) => {
                        const isVaccination = record.type === 'vaccination';
                        const daysUntil = Math.ceil((record.dueDate - today) / (1000 * 60 * 60 * 24));
                        const isOverdue  = daysUntil < 0;
                        const isToday    = daysUntil === 0;
                        const isUrgent   = daysUntil <= 7 && daysUntil >= 0;

                        const accentColor = isOverdue ? '#dc3545' : isToday ? '#fd7e14' : isUrgent ? '#ffc107' : '#198754';
                        const bgColor     = isOverdue ? 'rgba(220,53,69,0.05)' : isToday ? 'rgba(253,126,20,0.05)' : isUrgent ? 'rgba(255,193,7,0.05)' : 'rgba(25,135,84,0.04)';

                        const urgencyLabel = isOverdue
                          ? `${Math.abs(daysUntil)}d overdue`
                          : isToday ? 'Today'
                          : daysUntil === 1 ? 'Tomorrow'
                          : `${daysUntil}d left`;

                        return (
                          <div
                            key={`${record.type}-${record.id}`}
                            className="mobile-record-item"
                            style={{
                              padding: '1rem',
                              borderRadius: '12px',
                              background: bgColor,
                              border: `1.5px solid ${accentColor}25`,
                              marginBottom: '0.75rem',
                              borderLeft: `4px solid ${accentColor}`,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${accentColor}20`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center" style={{ gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                {/* Icon */}
                                <div style={{
                                  width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                                  background: isVaccination ? 'rgba(255,193,7,0.15)' : 'rgba(23,162,184,0.15)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: `2px solid ${isVaccination ? 'rgba(255,193,7,0.3)' : 'rgba(23,162,184,0.3)'}`,
                                }}>
                                  <img
                                    src={getPetImage(record.species)}
                                    alt={record.pet_name}
                                    style={{ width: '26px', height: '26px', objectFit: 'contain' }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                  />
                                </div>

                                {/* Info */}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: '700', color: '#333', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {record.pet_name}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <i className={`fas ${isVaccination ? 'fa-syringe' : 'fa-pills'} me-1`} style={{ color: isVaccination ? '#ffc107' : '#17a2b8' }} />
                                    {isVaccination ? (record.vaccine_name || 'Vaccination') : (record.deworming_name || 'Deworming')}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#999', marginTop: '2px' }}>
                                    <i className="fas fa-calendar me-1" style={{ color: accentColor }} />
                                    {new Date(record.next_due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </div>
                                </div>
                              </div>

                              {/* Urgency badge */}
                              <Badge style={{
                                background: accentColor, color: isOverdue || (!isToday && !isUrgent) ? '#fff' : '#000',
                                fontWeight: '700', fontSize: '0.72rem',
                                padding: '0.35rem 0.65rem', borderRadius: '20px',
                                flexShrink: 0, marginLeft: '0.5rem',
                              }}>
                                {urgencyLabel}
                              </Badge>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </Card.Body>
                </Card>
              </Col>

              {/* Recent Records */}
              <Col lg={6} className="mb-4">
                <Card
                  className="h-100 border-0"
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
                      <i className="fas fa-clipboard-list me-2" style={{ color: '#ffc107' }} />
                      Recent Records
                    </h5>
                  </Card.Header>
                  <Card.Body
                    className="mobile-card-body"
                    style={{ padding: '2rem', height: '380px', overflowY: 'auto' }}
                  >
                    {dashboardData.recentRecords.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="fas fa-clipboard-list text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }} />
                        <h6 style={{ color: '#666666', fontWeight: '600' }}>No records yet</h6>
                        <p className="text-muted small mb-0">
                          Recent medical records will appear here.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {dashboardData.recentRecords.map((record, index) => {
                          const meta = getRecordTypeMeta(record.recordType);
                          return (
                            <div
                              key={`${record.recordType}-${record.id}`}
                              className="mobile-record-item"
                              style={{
                                padding: '1.25rem',
                                borderRadius: '12px',
                                background: index % 2 === 0 ? 'rgba(255, 107, 107, 0.05)' : '#ffffff',
                                border: '1px solid #e9ecef',
                                marginBottom: '1rem',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
                                e.currentTarget.style.transform = 'translateX(5px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background =
                                  index % 2 === 0 ? 'rgba(255, 107, 107, 0.05)' : '#ffffff';
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div className="d-flex align-items-start">
                                {/* Pet icon */}
                                <div
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '12px',
                                    background: '#f8f9fa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '15px',
                                    border: '2px solid #e9ecef',
                                    flexShrink: 0
                                  }}
                                >
                                  <img
                                    src={getPetImage(record.species || record.pet_species)}
                                    alt={record.pet_name}
                                    style={{ width: '35px', height: '35px', objectFit: 'contain' }}
                                    onError={e => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <i className="fas fa-paw" style={{ fontSize: '1.5rem', color: '#FF6B6B', display: 'none' }} />
                                </div>

                                {/* Info */}
                                <div className="flex-grow-1">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <h6
                                      className="mb-1 mobile-record-name"
                                      style={{ fontWeight: '700', color: '#333333', fontSize: '1.05rem' }}
                                    >
                                      {record.pet_name}
                                    </h6>
                                    <Badge
                                      style={{
                                        background: meta.color,
                                        fontSize: '0.72rem',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '6px',
                                        color: record.recordType === 'vaccination' ? '#000' : '#fff',
                                        flexShrink: 0,
                                        marginLeft: '8px'
                                      }}
                                    >
                                      <i className={`${meta.icon} me-1`} />
                                      {meta.label}
                                    </Badge>
                                  </div>

                                  <div
                                    className="d-flex flex-wrap align-items-center mobile-record-info"
                                    style={{ gap: '10px', marginTop: '4px' }}
                                  >
                                    <small className="text-muted" style={{ fontWeight: '500' }}>
                                      <i className="fas fa-barcode me-1" style={{ color: '#4ECDC4' }} />
                                      {record.registration_number || 'N/A'}
                                    </small>
                                    <small className="text-muted" style={{ fontWeight: '500' }}>
                                      <i className="fas fa-calendar me-1" style={{ color: '#ffc107' }} />
                                      {new Date(record.displayDate).toLocaleDateString()}
                                    </small>
                                    {record.veterinarian_name && (
                                      <small className="text-muted" style={{ fontWeight: '500' }}>
                                        <i className="fas fa-user-md me-1" style={{ color: '#0dcaf0' }} />
                                        {record.veterinarian_name}
                                      </small>
                                    )}
                                  </div>

                                  {/* Record-specific detail */}
                                  <div style={{ marginTop: '6px' }}>
                                    <small style={{ color: '#555', fontWeight: '600' }}>
                                      {record.recordType === 'vaccination' && record.vaccine_name && (
                                        <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }} />{record.vaccine_name}</>
                                      )}
                                      {record.recordType === 'deworming' && record.deworming_name && (
                                        <><i className="fas fa-pills me-1" style={{ color: '#17a2b8' }} />{record.deworming_name}</>
                                      )}
                                      {record.recordType === 'sterilization' && record.procedure_type && (
                                        <><i className="fas fa-cut me-1" style={{ color: '#28a745' }} />{record.procedure_type}</>
                                      )}
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>
    </>
  );
};

export default ClinicDashboard;