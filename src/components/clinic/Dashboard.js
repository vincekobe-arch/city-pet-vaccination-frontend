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
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes fadeInUp {
      0%   { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }
    .skeleton-dark {
      background: linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }

    .clinic-dashboard-page { zoom: 0.75; }
    @media (min-width: 1600px) { .clinic-dashboard-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .clinic-dashboard-page { zoom: 1; } }

    @media (max-width: 768px) {
      .clinic-dashboard-page { zoom: 1; }
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
      .appt-pet-icon {
        width: 32px !important;
        height: 32px !important;
        border-radius: 7px !important;
      }
      .appt-pet-icon img {
        width: 20px !important;
        height: 20px !important;
      }
      .appt-pet-name {
        font-size: 0.78rem !important;
      }
      .appt-pet-sub {
        font-size: 0.68rem !important;
      }
      .appt-pet-date {
        font-size: 0.64rem !important;
      }
      .appt-badge {
        font-size: 0.6rem !important;
        padding: 0.2rem 0.4rem !important;
      }
      .appt-item {
        padding: 0.6rem 0.75rem !important;
        margin-bottom: 0.5rem !important;
      }
      .recent-pet-icon {
        width: 36px !important;
        height: 36px !important;
        border-radius: 8px !important;
        margin-right: 10px !important;
      }
      .recent-pet-icon img {
        width: 24px !important;
        height: 24px !important;
      }
      .recent-pet-name {
        font-size: 0.82rem !important;
      }
      .recent-record-badge {
        font-size: 0.6rem !important;
        padding: 0.2rem 0.4rem !important;
      }
      .recent-record-item {
        padding: 0.75rem !important;
        margin-bottom: 0.6rem !important;
      }
      .recent-record-meta {
        font-size: 0.65rem !important;
        gap: 6px !important;
      }
      .recent-record-detail {
        font-size: 0.68rem !important;
      }
    }
    @keyframes cdIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cdRow { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes odGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .cd-anim { animation: cdIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .cd-row-anim { animation: cdRow 0.4s ease-out backwards; animation-delay: var(--d, 0s); }

    .cd-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .cd-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }
    .cd-date { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.9rem; border: 1px solid #e9ecef; border-radius: 10px; background: #fff; color: #4b5563; font-size: 0.85rem; font-weight: 600; }
    .cd-date i { color: #e0a800; }



    .cd-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .cd-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 1rem 1.2rem; border-bottom: 1px solid #eef0f3; }
    .cd-panel-title { display: flex; align-items: center; gap: 0.75rem; }
    .cd-panel-title .ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.95rem; }
    .cd-panel-title h5 { font-size: 1rem; font-weight: 700; color: #1f2328; margin: 0; }
    .cd-panel-title small { display: block; font-size: 0.78rem; color: #6b7280; }
    .cd-panel-body { padding: 0.75rem 1.2rem 1.1rem; flex: 1 1 auto; }
    .cd-link { display: inline-flex; align-items: center; gap: 0.35rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .cd-link:hover { text-decoration: underline; }

    .cd-event { display: flex; align-items: center; gap: 0.9rem; padding: 0.8rem 0; border-bottom: 1px solid #f1f3f5; }
    .cd-event:last-child { border-bottom: none; }
    .cd-date-block { width: 52px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.4rem 0; line-height: 1.1; }
    .cd-date-block .m { font-size: 0.65rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .cd-date-block .d { font-size: 1.3rem; font-weight: 800; color: #1f2328; }
    .cd-ev-main { flex: 1; min-width: 0; }
    .cd-ev-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cd-ev-meta { display: flex; flex-wrap: wrap; gap: 0.15rem 0.85rem; font-size: 0.78rem; color: #6b7280; margin-top: 0.15rem; }
    .cd-ev-meta i { margin-right: 0.3rem; color: #9ca3af; }
    .cd-tag { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 700; padding: 0.12rem 0.5rem; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 12%, #fff); }

    .cd-rem { display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem 0; border-bottom: 1px solid #f1f3f5; }
    .cd-rem:last-child { border-bottom: none; }
    .cd-pet { width: 42px; height: 42px; border-radius: 12px; background: #f6f7f9; border: 1px solid #eef0f3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cd-pet img { width: 28px; height: 28px; object-fit: contain; }
    .cd-pet i { color: #e0a800; }
    .cd-rem-name { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .cd-rem-vac { font-size: 0.8rem; color: #6b7280; }
    .cd-pill { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }
    .cd-rem-due { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; text-align: right; }

    .cd-more { margin-top: 0.5rem; text-align: center; font-size: 0.8rem; color: #6b7280; }
    .cd-empty { text-align: center; padding: 2.5rem 1rem; }
    .cd-empty .ic { width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 0.85rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #f3f4f6; color: #9ca3af; }
    .cd-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .cd-empty p { font-size: 0.85rem; color: #6b7280; margin: 0; }

    .cd-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: cdShimmer 1.3s ease infinite; }
    @keyframes cdShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    .cd-type-ic { width: 42px; height: 42px; border-radius: 12px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.95rem; }
    .cd-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .cd-body-scroll { max-height: 440px; overflow-y: auto; }
    @media (max-width: 768px) {
      .cd-title { font-size: 1.45rem; }
      .cd-sub { font-size: 0.85rem; }
      .cd-date { display: none !important; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cd-anim, .cd-row-anim, .cd-skel { animation: none !important; }
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

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const REC_TYPES = {
    vaccination:   { label: 'Vaccination',   color: '#e0a800', icon: 'fa-syringe' },
    deworming:     { label: 'Deworming',     color: '#0d6efd', icon: 'fa-pills' },
    sterilization: { label: 'Sterilization', color: '#198754', icon: 'fa-cut' },
  };
  const fmtDay = (v) => {
    const d = new Date(v);
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Next shots due today or tomorrow
  const apptToday = new Date(); apptToday.setHours(0, 0, 0, 0);
  const apptTomorrow = new Date(apptToday); apptTomorrow.setDate(apptTomorrow.getDate() + 1);
  const upcomingAppointments = [
    ...dashboardData.vaccinations.filter(v => v.next_due_date).map(v => ({ ...v, type: 'vaccination', dueDate: new Date(v.next_due_date) })),
    ...dashboardData.dewormings.filter(d => d.next_due_date).map(d => ({ ...d, type: 'deworming', dueDate: new Date(d.next_due_date) })),
  ]
    .filter(r => {
      const d = new Date(r.dueDate); d.setHours(0, 0, 0, 0);
      return d.getTime() === apptToday.getTime() || d.getTime() === apptTomorrow.getTime();
    })
    .sort((a, b) => a.dueDate - b.dueDate);

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 clinic-dashboard-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* Header */}
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 cd-anim">
          <div>
            <h2 className="cd-title mobile-title">Clinic Dashboard</h2>
            <p className="cd-sub">
              {dashboardData.clinicName && dashboardData.clinicName !== 'City Vet Muntinlupa'
                ? `${dashboardData.clinicName} · records and upcoming appointments`
                : 'Your clinic records and upcoming appointments.'}
            </p>
          </div>
          <div className="cd-date"><i className="fas fa-calendar-day" />{todayLabel}</div>
        </div>

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

        {/* ── Statistics Cards ── */}
        <Row className="mb-4">
          {[
            { label: 'Total Records',   value: totalRecords,                          accent: '#ffc107', accentAlpha: 'rgba(255,193,7,0.12)',  img: '/vaccine.png',       fallback: 'fa-file-medical', description: 'All Medical Records',    delay: '0.1s' },
            { label: 'Pets Served',     value: totalPetsServed,                       accent: '#0dcaf0', accentAlpha: 'rgba(13,202,240,0.12)', img: '/paw.png',           fallback: 'fa-paw',          description: 'Unique Pets',            delay: '0.2s' },
            { label: 'Vaccinations',    value: dashboardData.vaccinations.length,     accent: '#dc3545', accentAlpha: 'rgba(220,53,69,0.12)',  img: '/vaccine.png',       fallback: 'fa-syringe',      description: 'Vaccination Records',    delay: '0.3s' },
            { label: 'Sterilizations',  value: dashboardData.sterilizations.length,   accent: '#198754', accentAlpha: 'rgba(25,135,84,0.12)',  img: '/sterilization.png', fallback: 'fa-cut',          description: 'Sterilization Records',  delay: '0.4s' },
          ].map(({ label, value, accent, accentAlpha, img, fallback, description, delay }) => {
            const [displayCount, setDisplayCount] = React.useState(0);
            const [hasAnimated, setHasAnimated] = React.useState(false);
            React.useEffect(() => {
              if (loading || hasAnimated || value === 0) return;
              setHasAnimated(true);
              const steps = 40, duration = 1200;
              const increment = value / steps;
              let step = 0;
              const timer = setInterval(() => {
                step++;
                setDisplayCount(step >= steps ? value : Math.round(increment * step));
                if (step >= steps) clearInterval(timer);
              }, duration / steps);
              return () => clearInterval(timer);
            }, [loading, value]);

            return (
              <Col key={label} xs={12} sm={6} md={6} lg={3} className="mb-3 mobile-stat-card" style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
                <Card
                  className="border-0 h-100"
                  style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${accentAlpha}`; e.currentTarget.style.borderColor = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
                >
                  <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
                  <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="mobile-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>{label}</p>
                        <h2 className="mobile-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem', fontVariantNumeric: 'tabular-nums', minWidth: '3ch' }}>
                          {loading ? (
                            <span style={{ display: 'inline-block', width: '3ch', height: '1em', borderRadius: '6px', background: '#f0f0f0', animation: 'shimmer 1.4s ease-in-out infinite', verticalAlign: 'middle' }} />
                          ) : displayCount}
                        </h2>
                        <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                          <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>{description}</span>
                        </div>
                      </div>
                      <div className="mobile-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: accentAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src={img} alt={label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className={`fas ${fallback}`} style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Row className="g-3">
          {/* Upcoming appointments */}
          <Col xs={12} lg={6}>
            <div className="cd-panel cd-anim" style={{ '--d': '0.35s' }}>
              <div className="cd-panel-head">
                <div className="cd-panel-title" style={{ '--c': '#e0a800' }}>
                  <div className="ic"><i className="fas fa-calendar-alt" /></div>
                  <div>
                    <h5>Upcoming appointments</h5>
                    <small>Next shots due today or tomorrow</small>
                  </div>
                </div>
                {!loading && upcomingAppointments.length > 0 && (
                  <span className="cd-pill" style={{ color: '#b88a00', background: 'rgba(255,193,7,0.16)' }}>
                    {upcomingAppointments.length} due
                  </span>
                )}
              </div>
              <div className="cd-panel-body cd-body-scroll mobile-card-body">
                {loading ? (
                  Array.from({ length: 4 }, (_, j) => (
                    <div key={j} className="cd-rem" style={{ opacity: 1 - j * 0.15 }}>
                      <div className="cd-skel" style={{ width: 42, height: 42, borderRadius: 12 }} />
                      <div className="flex-grow-1">
                        <div className="cd-skel mb-2" style={{ width: '45%', height: 12 }} />
                        <div className="cd-skel" style={{ width: '30%', height: 10 }} />
                      </div>
                      <div className="cd-skel" style={{ width: 70, height: 20, borderRadius: 999 }} />
                    </div>
                  ))
                ) : upcomingAppointments.length === 0 ? (
                  <div className="cd-empty">
                    <div className="ic" style={{ background: 'rgba(25,135,84,0.1)', color: '#198754' }}><i className="fas fa-calendar-check" /></div>
                    <h6>No appointments today or tomorrow</h6>
                    <p>Pets due for their next shot today or tomorrow will show here.</p>
                  </div>
                ) : (
                  upcomingAppointments.map((record, index) => {
                    const meta = REC_TYPES[record.type];
                    const isToday = (() => { const d = new Date(record.dueDate); d.setHours(0, 0, 0, 0); return d.getTime() === apptToday.getTime(); })();
                    const due = isToday ? { label: 'Today', color: '#fd7e14' } : { label: 'Tomorrow', color: '#0d6efd' };
                    return (
                      <div key={`${record.type}-${record.id}`} className="cd-rem cd-row-anim appt-item" style={{ '--d': `${0.45 + index * 0.06}s` }}>
                        <div className="cd-pet appt-pet-icon">
                          <img src={getPetImage(record.species)} alt="" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                          <i className="fas fa-paw" style={{ display: 'none' }} />
                        </div>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="cd-rem-name appt-pet-name">{record.pet_name}</div>
                          <div className="cd-rem-vac appt-pet-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <i className={`fas ${meta.icon} me-1`} style={{ color: meta.color }} />
                            {record.type === 'vaccination' ? (record.vaccine_name || 'Vaccination') : (record.deworming_name || 'Deworming')}
                            {record.registration_number && <span className="cd-mono"> · {record.registration_number}</span>}
                          </div>
                        </div>
                        <div className="text-end">
                          <span className="cd-pill appt-badge" style={{ color: due.color, background: `color-mix(in srgb, ${due.color} 12%, #fff)` }}>
                            <i className="fas fa-clock" />{due.label}
                          </span>
                          <div className="cd-rem-due">{fmtDay(record.next_due_date)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Col>

          {/* Recent records */}
          <Col xs={12} lg={6}>
            <div className="cd-panel cd-anim" style={{ '--d': '0.42s' }}>
              <div className="cd-panel-head">
                <div className="cd-panel-title" style={{ '--c': '#0d6efd' }}>
                  <div className="ic"><i className="fas fa-clipboard-list" /></div>
                  <div>
                    <h5>Recent records</h5>
                    <small>Latest records added by your clinic</small>
                  </div>
                </div>
                {!loading && dashboardData.recentRecords.length > 0 && (
                  <a href="/clinic/records" className="cd-link">View all <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} /></a>
                )}
              </div>
              <div className="cd-panel-body cd-body-scroll mobile-card-body">
                {loading ? (
                  Array.from({ length: 4 }, (_, j) => (
                    <div key={j} className="cd-rem" style={{ opacity: 1 - j * 0.15 }}>
                      <div className="cd-skel" style={{ width: 42, height: 42, borderRadius: 12 }} />
                      <div className="flex-grow-1">
                        <div className="cd-skel mb-2" style={{ width: '45%', height: 12 }} />
                        <div className="cd-skel" style={{ width: '30%', height: 10 }} />
                      </div>
                      <div className="cd-skel" style={{ width: 90, height: 20, borderRadius: 999 }} />
                    </div>
                  ))
                ) : dashboardData.recentRecords.length === 0 ? (
                  <div className="cd-empty">
                    <div className="ic"><i className="fas fa-clipboard-list" /></div>
                    <h6>No records yet</h6>
                    <p>Records you add for pets will show here.</p>
                  </div>
                ) : (
                  dashboardData.recentRecords.map((record, index) => {
                    const meta = REC_TYPES[record.recordType] || { label: record.recordType, color: '#6b7280', icon: 'fa-file-medical' };
                    const detail = record.recordType === 'vaccination' ? record.vaccine_name
                      : record.recordType === 'deworming' ? record.deworming_name
                      : record.procedure_type;
                    return (
                      <div key={`${record.recordType}-${record.id}`} className="cd-rem cd-row-anim recent-record-item" style={{ '--d': `${0.5 + index * 0.06}s` }}>
                        <div className="cd-type-ic" style={{ '--c': meta.color }}><i className={`fas ${meta.icon}`} /></div>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                            <span className="cd-rem-name recent-pet-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.pet_name}</span>
                            <span className="cd-tag" style={{ '--c': meta.color }}>{meta.label}</span>
                          </div>
                          <div className="cd-rem-vac recent-record-meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {detail || meta.label}
                            {record.veterinarian_name && <> · <i className="fas fa-user-md me-1" style={{ color: '#9ca3af' }} />{record.veterinarian_name}</>}
                          </div>
                        </div>
                        <div className="text-end" style={{ flexShrink: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2328' }}>{fmtDay(record.displayDate)}</div>
                          <div className="cd-rem-due cd-mono">{record.registration_number || 'N/A'}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default ClinicDashboard;