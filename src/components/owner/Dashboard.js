import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import { petAPI, vaccinationAPI, scheduleAPI, vetCardAPI, handleAPIError } from '../../services/api';

const OwnerDashboard = () => {
  
  const [dashboardData, setDashboardData] = useState({
    pets: [],
    dueVaccinations: [],
    upcomingSchedules: [],
    vetCards: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
    loadOwnerVerification();
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
      .mobile-table-text {
        font-size: 0.75rem !important;
      }
      .mobile-event-title {
        font-size: 0.8rem !important;
      }
      .mobile-event-type {
        font-size: 0.7rem !important;
      }
      .mobile-btn {
        padding: 0.25rem 0.5rem !important;
        font-size: 0.7rem !important;
      }
      .mobile-stat-description {
        display: none !important;
      }
      .mobile-stat-card {
        margin-bottom: 0.5rem !important;
      }
      .mobile-reminder-pet-name {
        font-size: 0.9rem !important;
      }
      .mobile-reminder-vaccine {
        font-size: 0.75rem !important;
      }
      .mobile-reminder-date {
        font-size: 0.7rem !important;
      }
      .mobile-reminder-icon {
        width: 35px !important;
        height: 35px !important;
      }
      .mobile-reminder-icon img {
        width: 24px !important;
        height: 24px !important;
      }
      .mobile-table th {
        padding: 0.5rem !important;
        font-size: 0.75rem !important;
      }
      .mobile-table td {
        padding: 0.5rem !important;
        font-size: 0.75rem !important;
      }
    }
  `;
  

  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState(null);

  const isVerified = () => {
    return ['fully_verified', 'semi_verified'].includes(ownerVerificationStatus);
  };

  const loadOwnerVerification = async () => {
    try {
      const { getUser } = await import('../../utils/auth');
      const user = getUser();
      if (!user?.id) return;
      const api = (await import('../../services/api')).default;
      const res = await api.get(`/owners/user/${user.id}`);
      setOwnerVerificationStatus(res.data.owner?.verification_status || 'not_verified');
    } catch (err) {
      console.warn('Could not load verification status:', err);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [petsRes, vacSchedulesRes, dewormSchedulesRes, seminarSchedulesRes, sterilSchedulesRes, microchipSchedulesRes, vetCardsRes] = await Promise.all([
  petAPI.getAll(),
  scheduleAPI.getVaccinationSchedules(),
  scheduleAPI.getDewormingSchedules(),
  scheduleAPI.getSeminarSchedules(),
  scheduleAPI.getSterilizationSchedules(),
  scheduleAPI.getMicrochipSchedules().catch(() => ({ data: { schedules: [] } })),
  vetCardAPI.getAll()
]);

      let dueVaccinations = [];
      try {
        if (vaccinationAPI.getDue) {
          const dueVacRes = await vaccinationAPI.getDue();
          dueVaccinations = dueVacRes.data.due_vaccinations || [];
        }
      } catch (err) {
        console.warn('Could not load due vaccinations:', err);
      }

      const upcomingVaccinations = (vacSchedulesRes.data.schedules?.filter(s => 
  s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date()
) || []).map(s => ({ ...s, type: 'vaccination' }));

const upcomingDewormings = (dewormSchedulesRes.data.schedules?.filter(s => 
  s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date()
) || []).map(s => ({ ...s, type: 'deworming' }));

const upcomingSeminars = (seminarSchedulesRes.data.schedules?.filter(s => 
  s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date()
) || []).map(s => ({ ...s, type: 'seminar' }));

const upcomingSterilizations = (sterilSchedulesRes.data.schedules?.filter(s => 
  s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date()
) || []).map(s => ({ ...s, type: 'sterilization' }));

const upcomingMicrochips = (microchipSchedulesRes.data.schedules?.filter(s =>
  s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date()
) || []).map(s => ({ ...s, type: 'microchip' }));

setDashboardData({
  pets: petsRes.data.pets || [],
  dueVaccinations: dueVaccinations,
  upcomingSchedules: [
    ...upcomingVaccinations, 
    ...upcomingDewormings,
    ...upcomingSeminars, 
    ...upcomingSterilizations,
    ...upcomingMicrochips
  ].sort((a, b) =>
    new Date(a.scheduled_date) - new Date(b.scheduled_date)
  ).slice(0, 5),
  vetCards: vetCardsRes.data.vet_cards || []
});

    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getVaccinationStatusBadge = (daysUntilDue) => {
    if (daysUntilDue < 0) {
      return <Badge bg="danger">Overdue</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge bg="warning">Due Soon</Badge>;
    } else if (daysUntilDue <= 30) {
      return <Badge bg="info">Upcoming</Badge>;
    }
    return <Badge bg="success">Current</Badge>;
  };

  const getVaccinationStats = () => {
    const vaccinated = dashboardData.pets.filter(pet => 
      pet.vaccination_count && pet.vaccination_count > 0
    ).length;
    const notVaccinated = dashboardData.pets.length - vaccinated;
    
    return { vaccinated, notVaccinated };
  };

  const getSterilizationStats = () => {
    const withVetCard = dashboardData.vetCards.length;
    const withoutVetCard = dashboardData.pets.length - withVetCard;
    
    return { withVetCard, withoutVetCard };
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

  const SimplePieChart = ({ data, colors, total, labels }) => {
    if (total === 0) {
      return (
        <div style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
        }}>
          <span style={{ color: '#999999', fontSize: '0.9rem', fontWeight: '500' }}>No data</span>
        </div>
      );
    }

    const value1 = data[0];
    const value2 = data[1];
    const percentage1 = (value1 / total) * 100;
    
    return (
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `conic-gradient(${colors[0]} 0% ${percentage1}%, ${colors[1]} ${percentage1}% 100%)`,
          margin: '0 auto',
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05) rotate(5deg)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.25)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
        }}
        >
          
        </div>
      </div>
    );
  };
  const getTotalVaccineShots = (schedule) => {
  if (!schedule.vaccine_shot_limits) return 0;
  
  try {
    const limits = typeof schedule.vaccine_shot_limits === 'string' 
      ? JSON.parse(schedule.vaccine_shot_limits) 
      : schedule.vaccine_shot_limits;
    
    return Object.values(limits).reduce((sum, limit) => sum + parseInt(limit || 0), 0);
  } catch (e) {
    return 0;
  }
};

  const vaccinationStats = getVaccinationStats();
  const sterilizationStats = getSterilizationStats();
  const totalPets = dashboardData.pets.length;


  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', zoom: '0.75' }}>

      <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
        <Col>
          <div>
            <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
              <i 
                className="fas fa-home" 
                style={{ 
                  fontSize: '1.5rem', 
                  color: '#000000',
                  animation: 'float 3s ease-in-out infinite'
                }}
              ></i>
<h2 className="mobile-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Dashboard</h2>              
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

      {/* Quick Stats */}
      <Row className="mb-4">
<Col xs={3} md={6} lg={3} className="mb-3 mb-lg-0 mobile-stat-card" style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
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
          <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>My Pets</p>
          <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{dashboardData.pets.length}</h2>
          <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffc107' }} />
            <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>Registered Pets</span>
          </div>
        </div>
        <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,193,7,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/paw.png" alt="My Pets" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <i className="fas fa-paw" style={{ fontSize: '1.4rem', color: '#ffc107', display: 'none' }} />
        </div>
      </div>
    </Card.Body>
  </Card>
</Col>

<Col xs={3} md={6} lg={3} className="mb-3 mb-lg-0 mobile-stat-card" style={{ animation: 'dropDown 0.4s ease-out 0.2s backwards' }}>
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
          <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>Due Soon</p>
          <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{dashboardData.dueVaccinations.length}</h2>
          <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc3545' }} />
            <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>Vaccinations Due</span>
          </div>
        </div>
        <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(220,53,69,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/due.png" alt="Due Vaccinations" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <i className="fas fa-syringe" style={{ fontSize: '1.4rem', color: '#dc3545', display: 'none' }} />
        </div>
      </div>
    </Card.Body>
  </Card>
</Col>

<Col xs={3} md={6} lg={3} className="mb-3 mb-md-0 mobile-stat-card" style={{ animation: 'dropDown 0.4s ease-out 0.3s backwards' }}>
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
          <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>Events</p>
          <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{dashboardData.upcomingSchedules.length}</h2>
          <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0dcaf0' }} />
            <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>Upcoming Schedules</span>
          </div>
        </div>
        <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(13,202,240,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/events.png" alt="Events" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <i className="fas fa-calendar-alt" style={{ fontSize: '1.4rem', color: '#0dcaf0', display: 'none' }} />
        </div>
      </div>
    </Card.Body>
  </Card>
</Col>

<Col xs={3} md={6} lg={3} className="mobile-stat-card" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
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
          <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>Vet Cards</p>
          <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{dashboardData.vetCards.length}</h2>
          <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#198754' }} />
            <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>Health Records</span>
          </div>
        </div>
        <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(25,135,84,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/vetcard.png" alt="Vet Cards" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <i className="fas fa-id-card" style={{ fontSize: '1.4rem', color: '#198754', display: 'none' }} />
        </div>
      </div>
    </Card.Body>
  </Card>
</Col>
      </Row>

      <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
        {/* Upcoming Events Table */}
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
                <i className="fas fa-calendar me-2" style={{ color: '#ffc107' }}></i>
                Upcoming Events
              </h5>
            </Card.Header>
            <Card.Body className="mobile-card-body" style={{ padding: '1.5rem' }}>
              {dashboardData.upcomingSchedules.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                  <h6 style={{ color: '#666666', fontWeight: '600' }}>No upcoming events</h6>
                  <p className="text-muted small mb-0">
                    Check back later for scheduled events.
                  </p>
                </div>
              ) : !dashboardData.upcomingSchedules.some(() => true) || (dashboardData.upcomingSchedules.length === 0) ? (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                  <h6 style={{ color: '#666666', fontWeight: '600' }}>No upcoming events</h6>
                  <p className="text-muted small mb-0">
                    Check back later for scheduled events.
                  </p>
                </div>
              ) : !isVerified() ? (
                <div className="text-center py-5">
                  <div style={{ width:'70px', height:'70px', borderRadius:'50%', background:'rgba(255,193,7,0.1)', border:'2px solid #ffc107', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                    <i className="fas fa-lock" style={{ fontSize:'1.75rem', color:'#ffc107' }} />
                  </div>
                  <h6 style={{ color:'#333', fontWeight:'700' }}>Verification Required</h6>
                  <p className="text-muted small mb-0">
                    Verify your account to view upcoming events.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="mobile-table" style={{
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem'
}}>
                    <thead>
  <tr style={{ 
    borderBottom: '2px solid #e0e0e0',
    background: '#f8f9fa'
  }}>
    <th style={{ 
      padding: '0.75rem', 
      textAlign: 'left', 
      fontWeight: '700', 
      color: '#333333' 
    }}>Event</th>
    <th style={{ 
      padding: '0.75rem', 
      textAlign: 'left', 
      fontWeight: '700', 
      color: '#333333' 
    }}>Date</th>
    <th style={{ 
      padding: '0.75rem', 
      textAlign: 'center', 
      fontWeight: '700', 
      color: '#333333' 
    }}>Slots</th>
    <th style={{ 
      padding: '0.75rem', 
      textAlign: 'center', 
      fontWeight: '700', 
      color: '#333333' 
    }}>Action</th>
  </tr>
</thead>
                    <tbody>
                      {dashboardData.upcomingSchedules.slice(0, 5).map((event, index) => (
                        <tr 
                          key={`${event.type}-${event.id}`}
                          style={{ 
                            borderBottom: '1px solid #f0f0f0',
                            background: index % 2 === 0 ? '#ffffff' : '#f9f9f9',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.05)'}
                          onMouseOut={(e) => e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#f9f9f9'}
                        >
                          <td style={{ padding: '0.75rem', color: '#333333' }}>
                            <div>
                              <div className="mobile-event-title" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
  {event.title}
</div>
                              <small className="mobile-event-type" style={{ color: '#999999' }}>
  {event.type === 'vaccination' && '💉 Vaccination'}
{event.type === 'deworming' && '💊 Deworming'}
{event.type === 'seminar' && '🎓 Seminar'}
{event.type === 'sterilization' && '✂️ Sterilization'}
{event.type === 'microchip' && '📡 Microchip'}
</small>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', color: '#666666' }}>
  {new Date(event.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
</td>
<td style={{ padding: '0.75rem', textAlign: 'center' }}>
  {event.type === 'vaccination' ? (
    <span style={{ 
      fontWeight: '600', 
      color: event.current_registrations >= getTotalVaccineShots(event) ? '#dc3545' : '#198754' 
    }}>
      {event.current_registrations || 0}/{getTotalVaccineShots(event)}
    </span>
  ) : event.max_capacity ? (
    <span style={{ 
      fontWeight: '600', 
      color: event.current_registrations >= event.max_capacity ? '#dc3545' : '#198754' 
    }}>
      {event.current_registrations || 0}/{event.max_capacity}
    </span>
  ) : (
    <span style={{ color: '#999999' }}>—</span>
  )}
</td>
<td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <a 
  href={`/owner/schedule?view=${event.type}-${event.id}`}
  className="mobile-btn"
  style={{
    display: 'inline-block',
    padding: '0.4rem 0.8rem',
                                borderRadius: '6px',
                                background: '#ffc107',
                                color: '#000000',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#ffb300';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.3)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = '#ffc107';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {dashboardData.upcomingSchedules.length > 5 && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '0.75rem', 
                      background: '#f8f9fa', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <small style={{ color: '#999999', fontWeight: '500' }}>
                        +{dashboardData.upcomingSchedules.length - 5} more event(s)
                      </small>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Vaccination Reminders */}
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
                <i className="fas fa-bell me-2" style={{ color: '#ffc107' }}></i>
                Vaccination Reminders
              </h5>
            </Card.Header>
<Card.Body className="mobile-card-body" style={{ padding: '2rem', maxHeight: '500px', overflowY: 'auto' }}>
                {dashboardData.dueVaccinations.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-check-circle mb-3" style={{ fontSize: '4rem', color: '#28a745' }}></i>
                  <h6 style={{ color: '#28a745', fontWeight: '700', fontSize: '1.1rem' }}>All vaccinations up to date!</h6>
                  <p className="text-muted small mb-0">
                    Great job keeping your pets healthy and protected.
                  </p>
                </div>
              ) : (
                <div>
                  {dashboardData.dueVaccinations.slice(0, 5).map((vaccination, index) => (
                    <div 
                      key={vaccination.id} 
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        background: index % 2 === 0 ? 'rgba(255, 193, 7, 0.05)' : '#ffffff',
                        border: '1px solid #e9ecef',
                        marginBottom: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 193, 7, 0.1)';
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255, 193, 7, 0.05)' : '#ffffff';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <div className="mobile-reminder-icon" style={{
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  background: '#f8f9fa',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '12px',
  border: '2px solid #e9ecef'
}}>
  <img 
    src={getPetImage(vaccination.pet_species || vaccination.species || 'dog')}
    alt={vaccination.pet_name}
    style={{ width: '28px', height: '28px', objectFit: 'contain' }}
    onError={(e) => {
      e.target.style.display = 'none';
      e.target.nextSibling.style.display = 'flex';
    }}
  />
  <i 
    className="fas fa-paw" 
    style={{ fontSize: '1.2rem', color: '#ffc107', display: 'none' }}
  ></i>
</div>
                            <div>
                              <h6 className="mb-0 mobile-reminder-pet-name" style={{ fontWeight: '700', color: '#333333' }}>
  {vaccination.pet_name}
</h6>
                              <small className="text-muted mobile-reminder-vaccine" style={{ fontSize: '0.85rem' }}>
  {vaccination.vaccination_name}
</small>
                            </div>
                          </div>
                          <div style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(220, 53, 69, 0.1)',
                            display: 'inline-block'
                          }}>
                            <small className="mobile-reminder-date" style={{ color: '#dc3545', fontWeight: '600' }}>
  <i className="fas fa-calendar-alt me-1"></i>
  Due: {new Date(vaccination.next_due_date).toLocaleDateString()}
</small>
                          </div>
                        </div>
                        <div>
                          {getVaccinationStatusBadge(vaccination.days_until_due)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dashboardData.dueVaccinations.length > 5 && (
                    <div className="text-center mt-3">
                      <small className="text-muted">
                        ... and {dashboardData.dueVaccinations.length - 5} more vaccination(s) due
                      </small>
                    </div>
                  )}
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

export default OwnerDashboard;