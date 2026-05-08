import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge, Table } from 'react-bootstrap';
import { petAPI, ownerAPI, scheduleAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';
import { getUser } from '../../utils/auth';


const MiniMapEmbed = ({ reports = [], darkMode }) => {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (window.L) { initMap(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!instanceRef.current || !window.L) return;
    renderMarkers();
  }, [reports]);

  const initMap = () => {
    if (!mapRef.current || instanceRef.current) return;
    if (!mapRef.current.offsetWidth || !mapRef.current.offsetHeight) {
      setTimeout(initMap, 100);
      return;
    }
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [14.4081, 121.0415],
      zoom: 13,
      minZoom: 12,
      maxZoom: 16,
      maxBounds: [[14.34, 120.97], [14.50, 121.12]],
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: true,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    // Block scroll wheel zoom but allow page scrolling
    mapRef.current.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const boundary = [
      [14.4700,121.0200],[14.4650,121.0500],[14.4550,121.0700],[14.4400,121.0800],
      [14.4200,121.0750],[14.4000,121.0700],[14.3800,121.0600],[14.3600,121.0450],
      [14.3550,121.0250],[14.3650,121.0050],[14.3850,120.9980],[14.4050,120.9950],
      [14.4300,121.0000],[14.4550,121.0050],[14.4700,121.0200],
    ];
    L.polygon(boundary, { color: '#ffc107', weight: 2, opacity: 0.8, fillOpacity: 0, dashArray: '6,4' }).addTo(map);

    // City Vet marker
    const cvIcon = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:36px;display:flex;flex-direction:column;align-items:center;">
        <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#ffc107,#ff8c00);border:2.5px solid white;box-shadow:0 3px 10px rgba(255,193,7,0.5);display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-hospital" style="transform:rotate(45deg);font-size:10px;color:#fff;"></i>
        </div>
        <div style="width:3px;height:8px;background:rgba(255,140,0,0.4);margin-top:-1px;border-radius:0 0 3px 3px;"></div>
      </div>`,
      iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -38],
    });
    L.marker([14.395293, 121.044737], { icon: cvIcon })
      .addTo(map)
      .bindPopup('<b>City Veterinary Office</b>');

    instanceRef.current = map;

    map.scrollWheelZoom.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();

    setTimeout(() => {
      map.invalidateSize();
      renderMarkers();
    }, 50);
  };

  const renderMarkers = () => {
    const L = window.L;
    const map = instanceRef.current;
    if (!map || !map.getPane('mapPane')) return;
    try { map.invalidateSize(); } catch(e) {}
    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch(e) {} });
    markersRef.current = [];

    const STATUS_COLOR = {
      positive_rabies:  '#e00000',
      suspected_rabies: '#f0c800',
      ongoing:          '#22bb55',
      pending:          '#888888',
      resolved:         '#0088ff',
    };

    reports
      .filter(r => r.latitude && r.longitude && r.status !== 'resolved')
      .forEach(r => {
        const color = STATUS_COLOR[r.status] || '#888';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:26px;display:flex;flex-direction:column;align-items:center;">
            <div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
            <div style="width:2px;height:6px;background:rgba(0,0,0,0.2);margin-top:-1px;"></div>
          </div>`,
          iconSize: [20, 26], iconAnchor: [10, 26], popupAnchor: [0, -28],
        });
        const m = L.marker([parseFloat(r.latitude), parseFloat(r.longitude)], { icon })
          .addTo(map)
          .bindPopup(`<b>${r.barangay_name || 'Unknown'}</b><br/>${r.report_type?.replace('_', ' ')}`);
        markersRef.current.push(m);

        // Danger/alert circles for rabies
        if (r.status === 'positive_rabies' || r.status === 'suspected_rabies') {
          try {
            const circle = L.circle([parseFloat(r.latitude), parseFloat(r.longitude)], {
              radius: 1000,
              color,
              weight: r.status === 'positive_rabies' ? 2 : 1.5,
              dashArray: r.status === 'suspected_rabies' ? '6,4' : null,
              fillColor: color,
              fillOpacity: r.status === 'positive_rabies' ? 0.12 : 0.08,
              renderer: L.svg(),
            });
            circle.addTo(map);
            markersRef.current.push(circle);
          } catch(e) {
            console.warn('Circle render skipped:', e.message);
          }
        }
      });
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
      />
      
    </div>
  );
};

const AdminDashboard = ({ darkMode }) => {
  const [dashboardData, setDashboardData] = useState({
  statistics: {
    total_pets: 0,
    total_owners: 0,
    upcoming_schedules: 0
  },
  recentPets: [],
  upcomingSchedules: [],
  pets: [],
  recentReports: []
});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = getUser();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
  try {
    setLoading(true);

    const results = await Promise.all([
    petAPI.getAll(),
    ownerAPI.getAll(),
    scheduleAPI.getVaccinationSchedules().catch(() => ({ data: { schedules: [] } })),
    scheduleAPI.getSeminarSchedules().catch(() => ({ data: { schedules: [] } })),
    scheduleAPI.getSterilizationSchedules().catch(() => ({ data: { schedules: [] } })),
    scheduleAPI.getMicrochipSchedules().catch(() => ({ data: { schedules: [] } })),
    api.get('/reports').catch(() => ({ data: { reports: [] } }))
  ]);

  const [petsRes, ownersRes, vaccinationSchedulesRes, seminarSchedulesRes, sterilizationSchedulesRes, microchipSchedulesRes, reportsRes] = results;

    const pets = petsRes.data.pets || [];
    const owners = ownersRes.data.owners || [];
    const vaccinationSchedules = vaccinationSchedulesRes.data.schedules || [];
    const seminarSchedules = seminarSchedulesRes.data.schedules || [];
    const sterilizationSchedules = sterilizationSchedulesRes.data.schedules || [];
    const microchipSchedules = microchipSchedulesRes.data.schedules || [];
    const allReports = reportsRes.data.reports || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingVaccinations = vaccinationSchedules.filter(s =>
      new Date(s.scheduled_date) >= today && s.status !== 'cancelled'
    );
    const upcomingSeminars = seminarSchedules.filter(s =>
      new Date(s.scheduled_date) >= today && s.status !== 'cancelled'
    );
    const upcomingSterilizations = sterilizationSchedules.filter(s =>
      new Date(s.scheduled_date) >= today && s.status !== 'cancelled'
    );
    const upcomingMicrochips = microchipSchedules.filter(s =>
      new Date(s.scheduled_date) >= today && s.status !== 'cancelled'
    );

    const allUpcoming = [
      ...upcomingVaccinations.map(s => ({ ...s, type: 'Vaccination' })),
      ...upcomingSeminars.map(s => ({ ...s, type: 'Seminar' })),
      ...upcomingSterilizations.map(s => ({ ...s, type: 'Sterilization' })),
      ...upcomingMicrochips.map(s => ({ ...s, type: 'Microchip' }))
    ].sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    setDashboardData({
      statistics: {
        total_pets: pets.length,
        total_owners: owners.length,
        upcoming_schedules: allUpcoming.length
      },
      recentPets: pets.slice(0, 5),
      upcomingSchedules: allUpcoming.slice(0, 5),
      pets: pets,
      recentReports: [...allReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
    });

  } catch (err) {
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setLoading(false);
  }
};

  // Calculate vaccination statistics by species
  const getVaccinationStatsBySpecies = () => {
    const species = ['Dog', 'Cat', 'Rabbit'];
    const colors = {
      'Dog': '#FF6B6B',
      'Cat': '#4ECDC4',
      'Rabbit': '#95E1D3'
    };
    
    return species.map(speciesName => {
      const speciesPets = dashboardData.pets.filter(pet => 
        pet.species?.toLowerCase() === speciesName.toLowerCase()
      );
      const vaccinated = speciesPets.filter(pet => 
        pet.vaccination_count && pet.vaccination_count > 0
      ).length;
      const total = speciesPets.length;
      const percentage = total > 0 ? Math.round((vaccinated / total) * 100) : 0;
      
      return {
        species: speciesName,
        vaccinated,
        total,
        percentage,
        color: colors[speciesName],
        icon: speciesName === 'Dog' ? '/dog_face.png' : 
              speciesName === 'Cat' ? '/cat_face.png' : '/rabbit_face.png'
      };
    }).filter(stat => stat.total > 0);
  };

  // Progress Bar Component for Vaccination by Species
  const VaccinationProgressBar = ({ species, vaccinated, total, percentage, icon, color, darkMode }) => {
    return (
      <div className="mb-4 mobile-vaccination-item">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center">
            <div className="mobile-species-icon" style={{
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  background: `${color}15`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '12px',
  border: `2px solid ${color}30`
}}>
  <img 
    src={icon} 
    alt={species}
    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
    className="mobile-species-icon-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <span style={{ fontWeight: '600', fontSize: '1rem', color: darkMode ? '#f0f0f0' : '#333333' }}>{species}</span>
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
            <small className="text-muted ms-2" style={{ fontWeight: '600' }}>({vaccinated}/{total})</small>
          </div>
        </div>
        <div className="vaccination-progress-bar" style={{
  width: '100%',
  height: '28px',
  backgroundColor: darkMode ? '#2a2a2a' : '#f0f0f0',
  borderRadius: '14px',
  overflow: 'hidden',
  position: 'relative',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
}}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
            transition: 'width 0.8s ease',
            borderRadius: '14px',
            boxShadow: `0 2px 8px ${color}40`
          }}></div>
        </div>
      </div>
    );
  };

  const vaccinationStatsBySpecies = getVaccinationStatsBySpecies();

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
      .mobile-pet-name {
        font-size: 0.9rem !important;
      }
      .mobile-pet-info {
        font-size: 0.7rem !important;
      }
      .mobile-pet-icon {
        width: 35px !important;
        height: 35px !important;
      }
      .mobile-pet-icon img {
        width: 24px !important;
        height: 24px !important;
      }.mobile-pet-item {
  padding: 0.6rem !important;
  margin-bottom: 0.5rem !important;
  border-radius: 8px !important;
}
.mobile-recent-pet-icon {
  width: 32px !important;
  height: 32px !important;
  border-radius: 8px !important;
  margin-right: 10px !important;
}
.mobile-recent-pet-img {
  width: 22px !important;
  height: 22px !important;
}
.mobile-pet-name {
  font-size: 0.85rem !important;
  margin-bottom: 0.25rem !important;
}
.mobile-pet-info {
  font-size: 0.7rem !important;
  gap: 8px !important;
}
.mobile-pet-info i {
  font-size: 0.65rem !important;
}.mobile-vaccination-item {
  margin-bottom: 0.75rem !important;
}
.mobile-vaccination-item .d-flex {
  margin-bottom: 0.5rem !important;
}.mobile-vaccination-badge {
  font-size: 0.7rem !important;
  padding: 0.25rem 0.5rem !important;
  border-radius: 6px !important;
}
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: darkMode ? '#0f0f0f' : '#ffffff', minHeight: '100vh', zoom: '0.75', transition: 'all 0.3s ease' }}>
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div>
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i 
                  className="fas fa-home" 
                  style={{ 
                    fontSize: '1.5rem', 
                    color: darkMode ? '#ffffff' : '#000000',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                ></i>
                <h2 className="mobile-title" style={{ fontWeight: '700', color: darkMode ? '#f0f0f0' : '#333333', fontSize: '2rem', marginBottom: '0' }}>Admin Dashboard</h2>
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

      {/* Statistics Cards */}
      <Row className="mb-4">
        {[
          {
            label: 'Total Pets',
            count: dashboardData.statistics.total_pets,
            img: '/paw.png',
            accent: '#ffc107',
            accentAlpha: 'rgba(255,193,7,0.12)',
            fallbackIcon: 'fa-paw',
            description: 'Registered Pets',
            delay: '0.1s'
          },
          {
            label: 'Pet Owners',
            count: dashboardData.statistics.total_owners,
            img: '/users.png',
            accent: '#0dcaf0',
            accentAlpha: 'rgba(13,202,240,0.12)',
            fallbackIcon: 'fa-users',
            description: 'Total Owners',
            delay: '0.2s'
          },
          {
            label: 'Events',
            count: dashboardData.statistics.upcoming_schedules,
            img: '/events.png',
            accent: '#dc3545',
            accentAlpha: 'rgba(220,53,69,0.12)',
            fallbackIcon: 'fa-calendar-alt',
            description: 'Upcoming Events',
            delay: '0.3s'
          }
        ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
          <Col xs={4} md={4} lg={4} className="mb-3 mobile-stat-card" key={label} style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
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
                      style={{ width: '32px', height: '32px', objectFit: 'contain', filter: darkMode ? 'brightness(0) invert(1)' : 'none' }}
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

      <Row style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
  {/* Pet Vaccination Status - Cat & Dog Donut Cards */}
  <Col lg={6} className="mb-4">
    <Card
      className="border-0 h-100"
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
          <i className="fas fa-syringe me-2" style={{ color: '#ffc107' }}></i>
          Vaccination Status
        </h5>
      </Card.Header>
      <Card.Body
        className="mobile-card-body"
        style={{
          padding: '1.5rem',
          background: darkMode ? '#141414' : '#ffffff',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        {['Dog', 'Cat'].map((speciesName) => {
          const colors = { Dog: { main: '#FF6B6B', light: 'rgba(255,107,107,0.12)', icon: '/dog.png' }, Cat: { main: '#4ECDC4', light: 'rgba(78,205,196,0.12)', icon: '/cat.png' } };
          const cfg = colors[speciesName];
          const speciesPets = dashboardData.pets.filter(p => p.species?.toLowerCase() === speciesName.toLowerCase());
          const vaccinated = speciesPets.filter(p => p.vaccination_count && p.vaccination_count > 0).length;
          const total = speciesPets.length;
          const pct = total > 0 ? Math.round((vaccinated / total) * 100) : 0;
          const radius = 38;
          const circ = 2 * Math.PI * radius;
          const offset = circ - (pct / 100) * circ;

          return (
            <div key={speciesName} style={{
              padding: '1.25rem',
              borderRadius: '16px',
              background: darkMode ? '#1e1e1e' : cfg.light,
              border: `1.5px solid ${cfg.main}30`,
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              {/* Donut */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <svg width="90" height="90" viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r={radius} fill="none" stroke={darkMode ? '#2a2a2a' : '#e9ecef'} strokeWidth="10" />
                  <circle
                    cx="45" cy="45" r={radius} fill="none"
                    stroke={cfg.main} strokeWidth="10"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 45 45)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <img src={cfg.icon} alt={speciesName} style={{ width: '22px', height: '22px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                </div>
              </div>
              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: darkMode ? '#f0f0f0' : '#333', marginBottom: '0.25rem' }}>{speciesName}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: cfg.main, lineHeight: 1, marginBottom: '0.25rem' }}>{pct}%</div>
                <div style={{ fontSize: '0.72rem', color: darkMode ? '#666' : '#999', fontWeight: '600' }}>
                  {vaccinated} / {total} vaccinated
                </div>
                <div style={{ marginTop: '0.5rem', height: '4px', borderRadius: '4px', background: darkMode ? '#2a2a2a' : '#e9ecef', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: cfg.main, borderRadius: '4px', transition: 'width 1s ease' }} />
                </div>
              </div>
            </div>
          );
        })}
      </Card.Body>
    </Card>
  </Col>

  {/* Recently Registered Pets */}
  <Col lg={6} className="mb-4">
    <Card
      className="h-100 border-0"
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
          Recently Registered Pets
        </h5>
      </Card.Header>
      <Card.Body
        className="mobile-card-body"
        style={{ padding: '1rem', height: '320px', overflowY: 'auto', background: darkMode ? '#141414' : '#ffffff', transition: 'all 0.3s ease' }}
      >
        {dashboardData.recentPets.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-paw" style={{ fontSize: '3rem', color: '#e0e0e0' }}></i>
            <h6 style={{ color: darkMode ? '#aaaaaa' : '#666', fontWeight: '600', marginTop: '1rem' }}>No pets yet</h6>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {dashboardData.recentPets.map((pet) => {
              const getPetImage = (species) => {
                if (species?.toLowerCase() === 'dog') return '/dog.png';
                if (species?.toLowerCase() === 'cat') return '/cat.png';
                if (species?.toLowerCase() === 'rabbit') return '/rabbit.png';
                return '/dog.png';
              };
              const speciesColors = { dog: '#FF6B6B', cat: '#4ECDC4', rabbit: '#95E1D3' };
              const sc = speciesColors[pet.species?.toLowerCase()] || '#ffc107';
              return (
                <div
                  key={pet.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '12px',
                    background: darkMode ? '#1e1e1e' : '#f9f9f9',
                    border: darkMode ? '1px solid #2a2a2a' : '1px solid #f0f0f0',
                    transition: 'all 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.borderColor = sc; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.borderColor = darkMode ? '#2a2a2a' : '#f0f0f0'; }}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${sc}20`, border: `1.5px solid ${sc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={getPetImage(pet.species)} alt={pet.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: darkMode ? '#f0f0f0' : '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pet.name}</div>
                    <div style={{ fontSize: '0.7rem', color: darkMode ? '#666' : '#aaa', fontWeight: '500', textTransform: 'capitalize' }}>{pet.species} · {pet.owner_name || 'N/A'}</div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: darkMode ? '#555' : '#bbb', fontWeight: '600', flexShrink: 0 }}>
                    {new Date(pet.registration_date || pet.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card.Body>
    </Card>
  </Col>

  {/* Recent Reports */}
  <Col lg={6} className="mb-4">
    <Card
      className="h-100 border-0"
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
          borderBottom: '2px solid #dc3545',
          padding: '1.5rem',
          borderRadius: '20px 20px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}
      >
        <h5 className="mb-0" style={{ fontWeight: '700', color: darkMode ? '#f0f0f0' : '#333333' }}>
          <i className="fas fa-flag me-2" style={{ color: '#dc3545' }}></i>
          Recent Reports
        </h5>
        <a href="/admin/reports" style={{ fontSize: '0.72rem', fontWeight: '700', color: '#dc3545', textDecoration: 'none', background: 'rgba(220,53,69,0.08)', padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid rgba(220,53,69,0.2)' }}>
          View All →
        </a>
      </Card.Header>
      <Card.Body
        className="mobile-card-body"
        style={{ padding: '1rem', height: '320px', overflowY: 'auto', background: darkMode ? '#141414' : '#ffffff', transition: 'all 0.3s ease' }}
      >
        {(() => {
          const storedReports = dashboardData.recentReports || [];
          if (storedReports.length === 0) {
            return (
              <div className="text-center py-5">
                <i className="fas fa-flag" style={{ fontSize: '3rem', color: '#e0e0e0' }}></i>
                <h6 style={{ color: darkMode ? '#aaa' : '#666', fontWeight: '600', marginTop: '1rem' }}>No reports yet</h6>
              </div>
            );
          }
          const TYPE_ICONS = { rabies_case: { icon: '🦠', color: '#dc3545' }, animal_bite: { icon: '🩹', color: '#fd7e14' }, animal_rescue: { icon: '🐾', color: '#0d6efd' }, others: { icon: '📋', color: '#6c757d' } };
          const STATUS_COLORS = { pending: '#ffc107', suspected_rabies: '#dc3545', positive_rabies: '#8b0000', ongoing: '#0dcaf0', resolved: '#198754' };
          const STATUS_LABELS = { pending: 'Pending', suspected_rabies: 'Suspected', positive_rabies: 'Positive', ongoing: 'Ongoing', resolved: 'Resolved' };
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {storedReports.slice(0, 5).map((report) => {
                const tc = TYPE_ICONS[report.report_type] || TYPE_ICONS.others;
                const sc = STATUS_COLORS[report.status] || '#888';
                const sl = STATUS_LABELS[report.status] || report.status;
                return (
                  
                  <a
                    key={report.id}
                    href="/admin/reports"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '12px',
                      background: darkMode ? '#1e1e1e' : '#f9f9f9',
                      border: darkMode ? '1px solid #2a2a2a' : '1px solid #f0f0f0',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.borderColor = tc.color; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.borderColor = darkMode ? '#2a2a2a' : '#f0f0f0'; }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${tc.color}15`, border: `1.5px solid ${tc.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                      {tc.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.82rem', color: darkMode ? '#f0f0f0' : '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.reporter_name || 'Anonymous'}</div>
                      <div style={{ fontSize: '0.68rem', color: darkMode ? '#666' : '#aaa', fontWeight: '500' }}>{report.barangay_name || 'Unknown'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#fff', background: sc, padding: '0.15rem 0.5rem', borderRadius: '20px' }}>{sl}</span>
                      <span style={{ fontSize: '0.62rem', color: darkMode ? '#555' : '#bbb', fontWeight: '600' }}>
                        {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          );
        })()}
      </Card.Body>
    </Card>
  </Col>

  {/* Map Status Card — with real embedded Leaflet map */}
<Col lg={6} className="mb-4">
  <Card
    className="h-100 border-0"
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
        borderBottom: '2px solid #198754',
        padding: '1.5rem',
        borderRadius: '20px 20px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}
    >
      <h5 className="mb-0" style={{ fontWeight: '700', color: darkMode ? '#f0f0f0' : '#333333' }}>
        <i className="fas fa-map-marked-alt me-2" style={{ color: '#198754' }}></i>
        Map Status
      </h5>
      <a href="/admin/map-status" style={{ fontSize: '0.72rem', fontWeight: '700', color: '#198754', textDecoration: 'none', background: 'rgba(25,135,84,0.08)', padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid rgba(25,135,84,0.2)' }}>
        Open Map →
      </a>
    </Card.Header>

    {/* Embedded mini-map */}
    <div style={{ position: 'relative', height: '320px' }}>
      <MiniMapEmbed reports={dashboardData.recentReports} darkMode={darkMode} />
    </div>
  </Card>
</Col>
</Row>
    </Container>
    </>
  );
};

export default AdminDashboard;