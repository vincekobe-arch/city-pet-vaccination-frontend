import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Modal, Button } from 'react-bootstrap';
import VerifyAccountModal from './VerifyAccountModal'; // adjust the path to where your VerifyAccountModal.jsx lives
import { petAPI, vaccinationAPI, scheduleAPI, vetCardAPI, handleAPIError } from '../../services/api';

// Event type colors and icons (same as the Event Calendar page)
const TYPE_META = {
  vaccination:   { label: 'Vaccination',   color: '#e0a800', icon: 'fa-syringe' },
  deworming:     { label: 'Deworming',     color: '#0d6efd', icon: 'fa-pills' },
  seminar:       { label: 'Seminar',       color: '#0aa2c0', icon: 'fa-graduation-cap' },
  sterilization: { label: 'Sterilization', color: '#198754', icon: 'fa-cut' },
  microchip:     { label: 'Microchip',     color: '#d63384', icon: 'fa-microchip' },
};
const typeMeta = (t) => TYPE_META[t] || { label: 'Event', color: '#6f42c1', icon: 'fa-calendar-check' };

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const parseDate = (s) => {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return y ? new Date(y, m - 1, d) : null;
};
const formatClock = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return '';
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const daysFromToday = (date) => Math.round((date - startOfToday()) / 86400000);

const OwnerDashboard = () => {

  const [dashboardData, setDashboardData] = useState({
    pets: [],
    dueVaccinations: [],
    upcomingSchedules: [],
    upcomingTotal: 0,
    vetCards: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ownerName, setOwnerName] = useState('');

  useEffect(() => {
    loadDashboardData();
    loadOwnerVerification();
  }, []);

  const styles = `
    .dashboard-page {
      zoom: 0.75;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .dashboard-page { zoom: 1; } }

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

    @keyframes odIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes odRow { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes odGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .od-anim { animation: odIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .od-row-anim { animation: odRow 0.4s ease-out backwards; animation-delay: var(--d, 0s); }

    .od-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .od-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }
    .od-date { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.9rem; border: 1px solid #e9ecef; border-radius: 10px; background: #fff; color: #4b5563; font-size: 0.85rem; font-weight: 600; }
    .od-date i { color: #e0a800; }

    .od-banner { display: flex; align-items: center; gap: 1rem; padding: 0.9rem 1.1rem; border-radius: 14px; border: 1px solid rgba(224,168,0,0.3); background: rgba(255,193,7,0.07); }
    .od-banner.pending { border-color: rgba(13,110,253,0.25); background: rgba(13,110,253,0.05); }
    .od-banner .ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,193,7,0.18); color: #b88a00; flex-shrink: 0; font-size: 1.05rem; }
    .od-banner.pending .ic { background: rgba(13,110,253,0.12); color: #0d6efd; }
    .od-banner .t { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .od-banner .d { color: #6b7280; font-size: 0.85rem; }


    .od-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .od-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 1rem 1.2rem; border-bottom: 1px solid #eef0f3; }
    .od-panel-title { display: flex; align-items: center; gap: 0.75rem; }
    .od-panel-title .ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.95rem; }
    .od-panel-title h5 { font-size: 1rem; font-weight: 700; color: #1f2328; margin: 0; }
    .od-panel-title small { display: block; font-size: 0.78rem; color: #6b7280; }
    .od-panel-body { padding: 0.75rem 1.2rem 1.1rem; flex: 1 1 auto; }
    .od-link { display: inline-flex; align-items: center; gap: 0.35rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .od-link:hover { text-decoration: underline; }

    .od-event { display: flex; align-items: center; gap: 0.9rem; padding: 0.8rem 0; border-bottom: 1px solid #f1f3f5; }
    .od-event:last-child { border-bottom: none; }
    .od-date-block { width: 52px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.4rem 0; line-height: 1.1; }
    .od-date-block .m { font-size: 0.65rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .od-date-block .d { font-size: 1.3rem; font-weight: 800; color: #1f2328; }
    .od-ev-main { flex: 1; min-width: 0; }
    .od-ev-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .od-ev-meta { display: flex; flex-wrap: wrap; gap: 0.15rem 0.85rem; font-size: 0.78rem; color: #6b7280; margin-top: 0.15rem; }
    .od-ev-meta i { margin-right: 0.3rem; color: #9ca3af; }
    .od-tag { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 700; padding: 0.12rem 0.5rem; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 12%, #fff); }
    .od-slots { width: 92px; flex-shrink: 0; text-align: right; font-size: 0.75rem; color: #6b7280; }
    .od-slots strong { color: #1f2328; }
    .od-slots .bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.3rem; overflow: hidden; }
    .od-slots .bar > div { height: 100%; border-radius: 3px; transform-origin: left; animation: odGrow 1s cubic-bezier(0.22,1,0.36,1) backwards; animation-delay: calc(var(--d, 0s) + 0.2s); }
    .od-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.8rem; border-radius: 9px; background: #fff; border: 1px solid #e5e7eb; color: #1f2328; font-size: 0.8rem; font-weight: 600; text-decoration: none; white-space: nowrap; transition: background 0.15s ease, border-color 0.15s ease; }
    .od-btn:hover { background: #fff8e1; border-color: #ffc107; color: #1f2328; }

    .od-rem { display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem 0; border-bottom: 1px solid #f1f3f5; }
    .od-rem:last-child { border-bottom: none; }
    .od-pet { width: 42px; height: 42px; border-radius: 12px; background: #f6f7f9; border: 1px solid #eef0f3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .od-pet img { width: 28px; height: 28px; object-fit: contain; }
    .od-pet i { color: #e0a800; }
    .od-rem-name { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .od-rem-vac { font-size: 0.8rem; color: #6b7280; }
    .od-pill { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }
    .od-rem-due { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; text-align: right; }

    .od-more { margin-top: 0.5rem; text-align: center; font-size: 0.8rem; color: #6b7280; }
    .od-empty { text-align: center; padding: 2.5rem 1rem; }
    .od-empty .ic { width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 0.85rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #f3f4f6; color: #9ca3af; }
    .od-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .od-empty p { font-size: 0.85rem; color: #6b7280; margin: 0; }

    .od-btn:focus-visible, .od-link:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .od-title { font-size: 1.45rem; }
      .od-slots { display: none; }
      .od-banner { flex-wrap: wrap; }
    }
    @media (prefers-reduced-motion: reduce) {
      .od-anim, .od-row-anim, .od-slots .bar > div { animation: none !important; }
    }
  `;

  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState(null);
  const [ownerProfile, setOwnerProfile]                     = useState(null);
  const [verifyProfileForm, setVerifyProfileForm]           = useState(null);
  const [showVerifyPrompt, setShowVerifyPrompt]             = useState(false);
  const [showVerifyModal, setShowVerifyModal]               = useState(false);

  const isVerified = () => {
    return ['fully_verified', 'semi_verified'].includes(ownerVerificationStatus);
  };

  const loadOwnerVerification = async () => {
    try {
      const { getUser } = await import('../../utils/auth');
      const user = getUser();
      if (!user?.id) return;
      setOwnerName(user.first_name || '');
      const api = (await import('../../services/api')).default;
      const res = await api.get(`/owners/user/${user.id}`);
      const owner  = res.data.owner;
      const status = owner?.verification_status || 'not_verified';
      setOwnerVerificationStatus(status);
      setOwnerProfile(owner || null);
      if (owner?.first_name) setOwnerName(owner.first_name);
      // Built once and kept in state so the modal doesn't reset the form on every render
      setVerifyProfileForm({
        first_name:  owner?.first_name  || '',
        middle_name: owner?.middle_name || '',
        last_name:   owner?.last_name   || '',
        birthdate:   (owner?.birthdate || '').toString().slice(0, 10),
        gender:      owner?.gender      || '',
        phone:       owner?.phone       || '',
      });

      // Only right after registration, and only if still unverified
      if (sessionStorage.getItem('showVerifyPrompt') === '1') {
        sessionStorage.removeItem('showVerifyPrompt');
        if (status === 'not_verified') setShowVerifyPrompt(true);
      }
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

      // Events from today onwards (today's events are included)
      const today = startOfToday();
      const upcoming = (res, type) => (res.data.schedules || [])
        .filter(s => s.status === 'scheduled' && parseDate(s.scheduled_date) >= today)
        .map(s => ({ ...s, type }));

      const allUpcoming = [
        ...upcoming(vacSchedulesRes, 'vaccination'),
        ...upcoming(dewormSchedulesRes, 'deworming'),
        ...upcoming(seminarSchedulesRes, 'seminar'),
        ...upcoming(sterilSchedulesRes, 'sterilization'),
        ...upcoming(microchipSchedulesRes, 'microchip'),
      ].sort((a, b) =>
        parseDate(a.scheduled_date) - parseDate(b.scheduled_date) ||
        String(a.start_time || '').localeCompare(String(b.start_time || ''))
      );

      // Closest due date first
      dueVaccinations = [...dueVaccinations].sort((a, b) =>
        (a.days_until_due ?? 0) - (b.days_until_due ?? 0)
      );

      setDashboardData({
        pets: petsRes.data.pets || [],
        dueVaccinations,
        upcomingSchedules: allUpcoming.slice(0, 5),
        upcomingTotal: allUpcoming.length,
        vetCards: vetCardsRes.data.vet_cards || []
      });

    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getDueMeta = (days) => {
    if (days < 0)   return { label: 'Overdue',  color: '#dc3545', icon: 'fa-exclamation-circle' };
    if (days <= 7)  return { label: 'Due soon', color: '#b88a00', icon: 'fa-clock' };
    if (days <= 30) return { label: 'Upcoming', color: '#0d6efd', icon: 'fa-calendar' };
    return { label: 'Current', color: '#198754', icon: 'fa-check-circle' };
  };

  const getDueText = (days) => {
    if (days === undefined || days === null || Number.isNaN(Number(days))) return '';
    const n = Number(days);
    if (n < 0)   return `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} overdue`;
    if (n === 0) return 'Due today';
    if (n === 1) return 'Due tomorrow';
    return `In ${n} days`;
  };

  const getPetImage = (species) => {
    if (species === 'cat') return '/cat.png';
    if (species === 'rabbit') return '/rabbit.png';
    return '/dog.png';
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

  const getSlots = (event) => {
    const total = event.type === 'vaccination' ? getTotalVaccineShots(event) : Number(event.max_capacity) || 0;
    if (!total) return null;
    const used = Math.min(total, Number(event.current_registrations) || 0);
    return { used, total, full: used >= total };
  };

  const getEventWhen = (event) => {
    const d = daysFromToday(parseDate(event.scheduled_date));
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    return parseDate(event.scheduled_date).toLocaleDateString('en-US', { weekday: 'long' });
  };

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center">
            <Spinner animation="border" style={{ width: '2.75rem', height: '2.75rem', color: '#ffc107', borderWidth: '4px' }} />
            <p style={{ marginTop: '1rem', fontWeight: '600', color: '#6b7280', fontSize: '0.95rem' }}>Loading your dashboard...</p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffff' }}>

        {/* Header */}
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 od-anim">
          <div>
            <h2 className="od-title">{greeting}{ownerName ? `, ${ownerName}` : ''}</h2>
            <p className="od-sub">Here is what is happening with your pets.</p>
          </div>
          <div className="od-date"><i className="fas fa-calendar-day" />{todayLabel}</div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {/* Verification notice */}
        {ownerVerificationStatus === 'not_verified' && (
          <div className="od-banner mb-4 od-anim" style={{ '--d': '0.05s' }}>
            <div className="ic"><i className="fas fa-shield-alt" /></div>
            <div className="flex-grow-1">
              <div className="t">Verify your account</div>
              <div className="d">Verify your identity to view and register for vaccination and other City Vet events.</div>
            </div>
            <button type="button" className="od-btn" style={{ background: '#ffc107', borderColor: '#ffc107' }} onClick={() => setShowVerifyModal(true)}>
              <i className="fas fa-check-circle" /> Verify now
            </button>
          </div>
        )}
        {ownerVerificationStatus === 'pending' && (
          <div className="od-banner pending mb-4 od-anim" style={{ '--d': '0.05s' }}>
            <div className="ic"><i className="fas fa-hourglass-half" /></div>
            <div className="flex-grow-1">
              <div className="t">Verification under review</div>
              <div className="d">We are checking your details. Events will open for you once your account is verified.</div>
            </div>
          </div>
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

        <Row className="g-3" style={{ flex: '1 1 auto' }}>
          {/* Upcoming events */}
          <Col lg={7}>
            <div className="od-panel od-anim" style={{ '--d': '0.35s' }}>
              <div className="od-panel-head">
                <div className="od-panel-title" style={{ '--c': '#0aa2c0' }}>
                  <div className="ic"><i className="fas fa-calendar-alt" /></div>
                  <div>
                    <h5>Upcoming events</h5>
                    <small>The next events you can join</small>
                  </div>
                </div>
                {isVerified() && dashboardData.upcomingTotal > 0 && (
                  <a href="/owner/schedule" className="od-link">View calendar <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} /></a>
                )}
              </div>
              <div className="od-panel-body">
                {!isVerified() ? (
                  <div className="od-empty">
                    <div className="ic" style={{ background: 'rgba(255,193,7,0.12)', color: '#e0a800' }}><i className="fas fa-lock" /></div>
                    <h6>Verification required</h6>
                    <p>Verify your account to view upcoming events.</p>
                  </div>
                ) : dashboardData.upcomingSchedules.length === 0 ? (
                  <div className="od-empty">
                    <div className="ic"><i className="fas fa-calendar-times" /></div>
                    <h6>No upcoming events</h6>
                    <p>Check back later for new events.</p>
                  </div>
                ) : (
                  <>
                    {dashboardData.upcomingSchedules.map((event, index) => {
                      const meta = typeMeta(event.type);
                      const date = parseDate(event.scheduled_date);
                      const slots = getSlots(event);
                      const when = getEventWhen(event);
                      const time = [formatClock(event.start_time), formatClock(event.end_time)].filter(Boolean).join(' – ');
                      const place = event.custom_place || event.barangay_name;
                      return (
                        <div key={`${event.type}-${event.id}`} className="od-event od-row-anim" style={{ '--c': meta.color, '--d': `${0.45 + index * 0.06}s` }}>
                          <div className="od-date-block">
                            <div className="m">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                            <div className="d">{date.getDate()}</div>
                          </div>
                          <div className="od-ev-main">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="od-tag"><i className={`fas ${meta.icon}`} />{meta.label}</span>
                              {(when === 'Today' || when === 'Tomorrow') && (
                                <span className="od-tag" style={{ '--c': '#198754' }}>{when}</span>
                              )}
                            </div>
                            <div className="od-ev-title" title={event.title}>{event.title}</div>
                            <div className="od-ev-meta">
                              {time && <span><i className="far fa-clock" />{time}</span>}
                              {place && <span><i className="fas fa-map-marker-alt" />{place}</span>}
                            </div>
                          </div>
                          {slots && (
                            <div className="od-slots">
                              {slots.full ? (
                                <strong style={{ color: '#dc3545' }}>Full</strong>
                              ) : (
                                <><strong>{slots.total - slots.used}</strong> slots left</>
                              )}
                              <div className="bar">
                                <div style={{ width: `${(slots.used / slots.total) * 100}%`, background: slots.full ? '#dc3545' : meta.color }} />
                              </div>
                            </div>
                          )}
                          <a href={`/owner/schedule?view=${event.type}-${event.id}`} className="od-btn">View</a>
                        </div>
                      );
                    })}
                    {dashboardData.upcomingTotal > dashboardData.upcomingSchedules.length && (
                      <div className="od-more">
                        +{dashboardData.upcomingTotal - dashboardData.upcomingSchedules.length} more event{dashboardData.upcomingTotal - dashboardData.upcomingSchedules.length === 1 ? '' : 's'} in the calendar
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Col>

          {/* Vaccination reminders */}
          <Col lg={5}>
            <div className="od-panel od-anim" style={{ '--d': '0.42s' }}>
              <div className="od-panel-head">
                <div className="od-panel-title" style={{ '--c': '#dc3545' }}>
                  <div className="ic"><i className="fas fa-bell" /></div>
                  <div>
                    <h5>Vaccination reminders</h5>
                    <small>Shots your pets need next</small>
                  </div>
                </div>
                {dashboardData.dueVaccinations.length > 0 && (
                  <span className="od-pill" style={{ color: '#dc3545', background: 'rgba(220,53,69,0.1)' }}>
                    {dashboardData.dueVaccinations.length} due
                  </span>
                )}
              </div>
              <div className="od-panel-body">
                {dashboardData.dueVaccinations.length === 0 ? (
                  <div className="od-empty">
                    <div className="ic" style={{ background: 'rgba(25,135,84,0.1)', color: '#198754' }}><i className="fas fa-check" /></div>
                    <h6>All vaccinations are up to date</h6>
                    <p>Great job keeping your pets healthy and protected.</p>
                  </div>
                ) : (
                  <>
                    {dashboardData.dueVaccinations.slice(0, 5).map((vaccination, index) => {
                      const due = getDueMeta(Number(vaccination.days_until_due));
                      const dueDate = parseDate(vaccination.next_due_date);
                      return (
                        <div key={vaccination.id ?? index} className="od-rem od-row-anim" style={{ '--d': `${0.5 + index * 0.06}s` }}>
                          <div className="od-pet">
                            <img
                              src={getPetImage(vaccination.pet_species || vaccination.species || 'dog')}
                              alt=""
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                            />
                            <i className="fas fa-paw" style={{ display: 'none' }} />
                          </div>
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="od-rem-name">{vaccination.pet_name}</div>
                            <div className="od-rem-vac">
                              {vaccination.vaccination_name}
                              {dueDate && <> · {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                            </div>
                          </div>
                          <div className="text-end">
                            <span className="od-pill" style={{ color: due.color, background: `color-mix(in srgb, ${due.color} 12%, #fff)` }}>
                              <i className={`fas ${due.icon}`} />{due.label}
                            </span>
                            <div className="od-rem-due">{getDueText(vaccination.days_until_due)}</div>
                          </div>
                        </div>
                      );
                    })}
                    {dashboardData.dueVaccinations.length > 5 && (
                      <div className="od-more">
                        +{dashboardData.dueVaccinations.length - 5} more vaccination{dashboardData.dueVaccinations.length - 5 === 1 ? '' : 's'} due
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* ── Verify prompt (shown once after registration) ── */}
      <Modal show={showVerifyPrompt && !loading} onHide={() => setShowVerifyPrompt(false)} centered backdrop="static" style={{ zoom:'0.75', zIndex:99998 }}>
        <Modal.Body style={{ padding:'2.5rem 2.25rem 2rem', textAlign:'center', borderRadius:'20px', background:'linear-gradient(180deg,#fffdf5 0%,#ffffff 45%)', border:'1px solid rgba(255,193,7,0.25)' }}>
          <div style={{ width:'84px', height:'84px', borderRadius:'50%', background:'rgba(255,193,7,0.14)', border:'3px solid rgba(255,193,7,0.35)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.4rem', boxShadow:'0 8px 24px rgba(255,193,7,0.22)' }}>
            <i className="fas fa-shield-alt" style={{ fontSize:'2.1rem', color:'#ffc107' }} />
          </div>

          <h4 style={{ fontWeight:'800', color:'#1a1a1a', marginBottom:'0.5rem' }}>Welcome! Verify Your Account</h4>
          <p style={{ color:'#6c757d', fontSize:'0.92rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
            Your account was created successfully. Verify your identity now to unlock all features.
          </p>

          <div style={{ textAlign:'left', background:'#f8f9fa', border:'1px solid #e9ecef', borderRadius:'14px', padding:'1rem 1.15rem', marginBottom:'1.75rem' }}>
            {[
              { icon:'fa-calendar-check', text:'View and register for vaccination and other events' },
              { icon:'fa-paw',            text:'Manage your pets and their health records' },
              { icon:'fa-id-card',        text:'Takes only a few minutes with a valid government ID' },
            ].map(item => (
              <div key={item.text} style={{ display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.86rem', color:'#333', padding:'0.35rem 0' }}>
                <i className={`fas ${item.icon}`} style={{ color:'#ffc107', width:'18px', textAlign:'center' }} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => { setShowVerifyPrompt(false); setShowVerifyModal(true); }}
            className="border-0 w-100"
            style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', color:'#000', borderRadius:'12px', padding:'0.85rem 1.5rem', fontWeight:'700', fontSize:'1rem', boxShadow:'0 6px 20px rgba(255,193,7,0.4)' }}>
            <i className="fas fa-check-circle me-2" />Verify Now
          </Button>

          {/* Highlighted clickable label, not a button */}
          <div style={{ marginTop:'1.25rem' }}>
            <span
              role="button"
              tabIndex={0}
              onClick={() => setShowVerifyPrompt(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowVerifyPrompt(false); }}
              style={{ background:'rgba(255,193,7,0.22)', color:'#7a5800', fontWeight:'700', fontSize:'0.88rem', padding:'0.2rem 0.6rem', borderRadius:'6px', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:'3px' }}>
              Skip for now
            </span>
          </div>
        </Modal.Body>
      </Modal>

      {/* ── Verification modal (opens immediately from "Verify Now") ── */}
      <VerifyAccountModal
        show={showVerifyModal}
        onHide={() => setShowVerifyModal(false)}
        ownerProfile={ownerProfile}
        profileForm={verifyProfileForm}
        onVerified={(owner) => setOwnerVerificationStatus(owner?.verification_status || 'pending')}
      />
    </>
  );
};

export default OwnerDashboard;