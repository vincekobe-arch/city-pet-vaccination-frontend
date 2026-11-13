import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Button } from 'react-bootstrap';
import { officialAPI, ownerAPI, petAPI, activityLogAPI, handleAPIError } from '../../services/api';
import ActivityLogsModal from './ActivityLogsModal';

/* ------------------------------------------------------------------ */
/* Stat value animation (unchanged)                                   */
/* ------------------------------------------------------------------ */
const AnimatedStatValue = ({ value, loading }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  const hasAnimatedRef = React.useRef(false);

  React.useEffect(() => {
    if (loading || hasAnimatedRef.current || value === 0) return;
    hasAnimatedRef.current = true;
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const current = step >= steps ? value : Math.round(increment * step);
      setDisplayValue(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [loading, value]);

  if (loading) {
    return (
      <span style={{
        display: 'inline-block', width: '3ch', height: '1em',
        borderRadius: '6px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        verticalAlign: 'middle'
      }} />
    );
  }
  return displayValue;
};

/* ------------------------------------------------------------------ */
/* Helpers and config                                                 */
/* ------------------------------------------------------------------ */
const toDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);

const formatShortDate = (value) => {
  const d = toDate(value);
  return d && !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
};

const formatDateTime = (value) => {
  const d = toDate(value);
  return d && !isNaN(d)
    ? `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : '';
};

const SPECIES = {
  dog:    { label: 'Dog',    color: '#FF6B6B', icon: '/dog.png' },
  cat:    { label: 'Cat',    color: '#4ECDC4', icon: '/cat.png' },
  rabbit: { label: 'Rabbit', color: '#95E1D3', icon: '/rabbit.png' },
};

const RECORD_TYPES = {
  vaccination:   { label: 'Vaccination',   color: '#198754', icon: 'fa-syringe' },
  deworming:     { label: 'Deworming',     color: '#fd7e14', icon: 'fa-pills' },
  sterilization: { label: 'Sterilization', color: '#6f42c1', icon: 'fa-cut' },
  microchip:     { label: 'Microchip',     color: '#0d6efd', icon: 'fa-microchip' },
};

const theme = (darkMode) => ({
  page:   darkMode ? '#0f0f0f' : '#ffffff',
  panel:  darkMode ? '#141414' : '#ffffff',
  border: darkMode ? '#242424' : '#e9ecef',
  subtle: darkMode ? '#1c1c1c' : '#f6f7f9',
  track:  darkMode ? '#262626' : '#eef0f3',
  text:   darkMode ? '#f0f0f0' : '#1f2328',
  muted:  darkMode ? '#8a8a8a' : '#6b7280',
  faint:  darkMode ? '#5c5c5c' : '#9ca3af',
  grid:   darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
});

/* ------------------------------------------------------------------ */
/* Building blocks                                                    */
/* ------------------------------------------------------------------ */
const Panel = ({ t, icon, iconColor, title, subtitle, action, children, bodyStyle }) => (
  <div className="h-100 dash-panel" style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div className="dash-panel-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1.1rem 1.25rem 0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', minWidth: 0 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${iconColor}1f`, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`fas ${icon}`} style={{ fontSize: '0.9rem' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: t.text }}>{title}</h5>
          {subtitle && <div style={{ fontSize: '0.8rem', color: t.muted, marginTop: '0.15rem' }}>{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
    <div style={{ padding: '0.5rem 1.25rem 1.25rem', flex: 1, ...bodyStyle }}>{children}</div>
  </div>
);

const Skeleton = ({ style }) => <div className="skeleton" style={style} />;

const EmptyState = ({ t, icon, text }) => (
  <div style={{ height: '100%', minHeight: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.faint, gap: '0.5rem', textAlign: 'center' }}>
    <i className={`fas ${icon}`} style={{ fontSize: '1.6rem' }} />
    <span style={{ fontSize: '0.85rem' }}>{text}</span>
  </div>
);

const LegendDot = ({ color, label, t }) => (
  <span style={{ fontSize: '0.78rem', color: t.muted, whiteSpace: 'nowrap' }}>
    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: color, marginRight: '6px' }} />{label}
  </span>
);

const LineChart = ({ months, series, t }) => {
  const peak = Math.max(1, ...months.flatMap(m => series.map(s => m[s.key])));
  const step = Math.max(1, Math.ceil(peak / 4));
  const max = step * 4;
  const n = months.length;
  const xAt = (i) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yAt = (v) => 100 - (v / max) * 100;
  const line = (key) => months.map((m, i) => `${i ? 'L' : 'M'}${xAt(i)},${yAt(m[key])}`).join(' ');
  const first = series[0];

  return (
    <div className="activity-chart" style={{ position: 'relative', height: '240px' }}>
      <div style={{ position: 'absolute', left: '34px', right: '10px', top: '10px', bottom: '28px' }}>
        {[0, 1, 2, 3, 4].map(k => (
          <React.Fragment key={k}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${(k / 4) * 100}%`, borderTop: `1px ${k === 4 ? 'solid' : 'dashed'} ${t.grid}` }} />
            <div style={{ position: 'absolute', left: '-34px', width: '26px', textAlign: 'right', top: `${(k / 4) * 100}%`, transform: 'translateY(-50%)', fontSize: '0.7rem', color: t.faint }}>
              {max - k * step}
            </div>
          </React.Fragment>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="saArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={first.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={first.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line(first.key)} L${xAt(n - 1)},100 L${xAt(0)},100 Z`} fill="url(#saArea)" />
          {series.map(s => (
            <path key={s.key} d={line(s.key)} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {series.map(s => months.map((m, i) => (
          <div key={`${s.key}${i}`} title={`${m.label}: ${m[s.key]} ${s.label.toLowerCase()}`}
            style={{ position: 'absolute', left: `${xAt(i)}%`, top: `${yAt(m[s.key])}%`, width: '9px', height: '9px', borderRadius: '50%', background: t.panel, border: `2px solid ${s.color}`, transform: 'translate(-50%, -50%)' }} />
        )))}
        {months.map((m, i) => (
          <div key={m.label} style={{ position: 'absolute', top: '100%', marginTop: '8px', left: `${xAt(i)}%`, transform: 'translateX(-50%)', fontSize: '0.72rem', color: t.muted, whiteSpace: 'nowrap' }}>
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
};

const Donut = ({ segments, total, unit, t, size = 150, stroke = 18 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.track} strokeWidth={stroke} />
        {total > 0 && segments.filter(s => s.value > 0).map(s => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: t.text, lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: '0.72rem', color: t.muted, marginTop: '0.2rem' }}>{unit}</div>
      </div>
    </div>
  );
};

const BarRow = ({ t, label, sublabel, value, max, color, right }) => (
  <div style={{ marginBottom: '0.85rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem', gap: '0.5rem' }}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '0.84rem', color: t.text, fontWeight: 600 }}>{label}</span>
        {sublabel && <span style={{ fontSize: '0.76rem', color: t.muted, marginLeft: '0.4rem' }}>{sublabel}</span>}
      </span>
      <span style={{ fontSize: '0.8rem', color: t.muted, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{right ?? value}</span>
    </div>
    <div style={{ height: '8px', borderRadius: '4px', background: t.track, overflow: 'hidden' }}>
      <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: '100%', borderRadius: '4px', background: color, transition: 'width 0.6s ease' }} />
    </div>
  </div>
);

const ActivityItem = ({ t, icon, color, title, meta, time }) => (
  <div className="dash-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.5rem', borderRadius: '10px' }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${color}1a`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <i className={`fas ${icon}`} style={{ fontSize: '0.9rem' }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</div>
    </div>
    <span style={{ fontSize: '0.72rem', color: t.faint, whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */
const SuperAdminDashboard = ({ darkMode = false }) => {
  const [data, setData] = useState({ officials: [], owners: [], pets: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const t = theme(darkMode);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [officialsRes, ownersRes, petsRes, logsRes] = await Promise.all([
        officialAPI.getAll(),
        ownerAPI.getAllUnpaginated(),
        petAPI.getAllUnpaginated(),
        activityLogAPI.getAll().catch(() => ({ data: { logs: [] } })),
      ]);
      setData({
        officials: officialsRes.data.officials || [],
        owners:    ownersRes.data.owners || [],
        pets:      petsRes.data.pets || [],
        logs:      logsRes.data.logs || [],
      });
    } catch (err) {
      setError(handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const { officials, owners, pets, logs } = data;

  const analytics = useMemo(() => {
    // Last 6 months
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), pets: 0, owners: 0, records: 0 };
    });
    const byKey = Object.fromEntries(months.map(m => [m.key, m]));
    const bucket = (value) => {
      const d = toDate(value);
      return d && !isNaN(d) ? byKey[`${d.getFullYear()}-${d.getMonth()}`] : null;
    };
    pets.forEach(p => { const b = bucket(p.created_at || p.registration_date); if (b) b.pets++; });
    owners.forEach(o => { const b = bucket(o.created_at); if (b) b.owners++; });
    const recordLogs = logs.filter(l => l.category === 'record');
    recordLogs.forEach(l => { const b = bucket(l.created_at); if (b) b.records++; });

    // Vaccination coverage
    const vaccinated = pets.filter(p => Number(p.vaccination_count) > 0).length;
    const species = Object.entries(SPECIES).map(([key, cfg]) => {
      const list = pets.filter(p => p.species?.toLowerCase() === key);
      const done = list.filter(p => Number(p.vaccination_count) > 0).length;
      return { key, ...cfg, total: list.length, vaccinated: done, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
    }).filter(s => s.total > 0);

    // Records by type
    const byType = Object.entries(RECORD_TYPES).map(([key, cfg]) => ({ key, ...cfg, value: recordLogs.filter(l => l.activity_type === key).length }));

    // Activity by source
    const cityVetRecords = recordLogs.filter(l => l.performed_by_role !== 'private_clinic').length;
    const clinicRecords  = recordLogs.filter(l => l.performed_by_role === 'private_clinic').length;
    const eventsScheduled = logs.filter(l => l.category === 'event').length;

    // Most active accounts
    const accounts = {};
    logs.forEach(l => {
      const key = `${l.performed_by_name}|${l.organization}`;
      accounts[key] = accounts[key] || { name: l.performed_by_name, org: l.organization, clinic: l.performed_by_role === 'private_clinic', count: 0 };
      accounts[key].count++;
    });
    const topAccounts = Object.values(accounts).sort((a, b) => b.count - a.count).slice(0, 5);

    // Recent system activity (new pets and pet owners)
    const system = [
      ...pets.map(p => ({ kind: 'pet', date: p.created_at || p.registration_date, title: `${p.name} registered`, meta: `${(p.species || 'Pet').replace(/^./, c => c.toUpperCase())}, owned by ${p.owner_name || 'N/A'}` })),
      ...owners.map(o => ({ kind: 'owner', date: o.created_at, title: `${o.first_name} ${o.last_name} joined`, meta: 'New pet owner account' })),
    ].filter(a => toDate(a.date)).sort((a, b) => toDate(b.date) - toDate(a.date)).slice(0, 8);

    return {
      months, vaccinated, coverage: pets.length ? Math.round((vaccinated / pets.length) * 100) : 0, species,
      byType, totalRecords: recordLogs.length, cityVetRecords, clinicRecords, eventsScheduled,
      topAccounts, recentLogs: logs.slice(0, 8), system,
      petsThisMonth: months[5].pets, ownersThisMonth: months[5].owners,
    };
  }, [pets, owners, logs]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const muted = { color: t.muted };

  const styles = `
    @keyframes dropDown {
      0% { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    .skeleton {
      background: ${darkMode
        ? 'linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%)'
        : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'};
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }
    .dash-row { transition: background 0.15s ease; }
    .dash-row:hover { background: ${t.subtle}; }
    @keyframes panelIn {
      0%   { opacity: 0; transform: translateY(16px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .dash-section .dash-panel { animation: panelIn 0.5s ease-out backwards; animation-delay: var(--d, 0.4s); }
    .dash-section > :nth-child(2) .dash-panel { animation-delay: calc(var(--d, 0.4s) + 0.08s); }
    .dash-section > :nth-child(3) .dash-panel { animation-delay: calc(var(--d, 0.4s) + 0.16s); }

    @media (prefers-reduced-motion: reduce) {
      .skeleton, .sa-stat, .dash-panel { animation: none !important; }
    }
    @media (max-width: 768px) {
      .dash-panel-header { padding: 0.9rem 1rem 0.5rem !important; }
      .activity-chart { height: 200px !important; }
      .donut-wrap { flex-direction: column; }
      .dash-hide-sm { display: none !important; }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: t.page, minHeight: '100vh', zoom: '0.75' }}>

        {/* Header */}
        <Row className="mb-4 align-items-end" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <h2 style={{ fontWeight: 700, color: t.text, fontSize: '2rem', marginBottom: '0.25rem' }}>
              <i className="fas fa-crown me-2" style={{ fontSize: '1.5rem', color: '#dc3545' }} />Super Admin Dashboard
            </h2>
            <div style={{ fontSize: '0.95rem', ...muted }}>{today}</div>
          </Col>
          <Col xs="auto">
            <Button
              variant={darkMode ? 'outline-light' : 'outline-secondary'}
              size="sm"
              onClick={loadDashboardData}
              disabled={loading}
              style={{ borderRadius: '8px', fontWeight: 600 }}
            >
              <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`} /> Refresh data
            </Button>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2" />{error}
          </Alert>
        )}

        {/* Statistics Cards (unchanged) */}
        <Row className="mb-4" style={{ flexWrap: 'nowrap', margin: '0 -6px' }}>
          {[
            { label: 'Barangay Admins', count: officials.length, img: '/users.png', accent: '#198754', accentAlpha: 'rgba(25,135,84,0.12)', fallbackIcon: 'fa-user-tie', description: 'Total Administrators', delay: '0.1s' },
            { label: 'Pet Owners', count: owners.length, img: '/users.png', accent: '#0dcaf0', accentAlpha: 'rgba(13,202,240,0.12)', fallbackIcon: 'fa-users', description: 'Total Owners', delay: '0.2s' },
            { label: 'Total Pets', count: pets.length, img: '/paw.png', accent: '#ffc107', accentAlpha: 'rgba(255,193,7,0.12)', fallbackIcon: 'fa-paw', description: 'Registered Pets', delay: '0.3s' },
          ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
            <div key={label} className="sa-stat" style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0, animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
              <Card
                className="border-0 h-100"
                style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${accentAlpha}`; e.currentTarget.style.borderColor = accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
              >
                <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
                <Card.Body style={{ padding: '1.5rem', background: 'transparent' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>{label}</p>
                      <h2 style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                        <AnimatedStatValue value={count} loading={loading} />
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                        <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>{description}</span>
                      </div>
                    </div>
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: accentAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={img} alt={label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                      <i className={`fas ${fallbackIcon}`} style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </Row>

        {/* Growth + coverage */}
        <Row className="g-4 mb-4 dash-section" style={{ '--d': '0.4s' }}>
          <Col lg={8}>
            <Panel
              t={t} icon="fa-chart-line" iconColor="#ffc107"
              title="System growth"
              subtitle={loading ? 'Loading activity…' : `${analytics.petsThisMonth} new pets and ${analytics.ownersThisMonth} new pet owners this month`}
              action={
                <div className="dash-hide-sm" style={{ display: 'flex', gap: '1rem' }}>
                  <LegendDot t={t} color="#ffc107" label="Pets registered" />
                  <LegendDot t={t} color="#0dcaf0" label="Pet owners joined" />
                  <LegendDot t={t} color="#198754" label="Records added" />
                </div>
              }
            >
              {loading
                ? <Skeleton style={{ height: '240px', width: '100%' }} />
                : <LineChart t={t} months={analytics.months} series={[
                    { key: 'pets', label: 'Pets registered', color: '#ffc107' },
                    { key: 'owners', label: 'Pet owners joined', color: '#0dcaf0' },
                    { key: 'records', label: 'Records added', color: '#198754' },
                  ]} />}
            </Panel>
          </Col>

          <Col lg={4}>
            <Panel t={t} icon="fa-syringe" iconColor="#198754" title="Vaccination coverage" subtitle="Pets with at least one vaccination">
              {loading ? (
                <>
                  <Skeleton style={{ height: '56px', width: '50%', marginBottom: '1.25rem' }} />
                  {[0, 1, 2].map(i => <Skeleton key={i} style={{ height: '30px', width: '100%', marginBottom: '0.9rem' }} />)}
                </>
              ) : pets.length === 0 ? (
                <EmptyState t={t} icon="fa-syringe" text="Coverage appears once pets are registered." />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '2.6rem', fontWeight: 800, color: t.text, lineHeight: 1 }}>{analytics.coverage}%</span>
                    <span style={{ fontSize: '0.85rem', ...muted }}>{analytics.vaccinated} of {pets.length} pets</span>
                  </div>
                  <div style={{ height: '10px', borderRadius: '5px', background: t.track, overflow: 'hidden', marginBottom: '1.5rem' }}>
                    <div style={{ width: `${analytics.coverage}%`, height: '100%', background: '#198754', borderRadius: '5px', transition: 'width 0.6s ease' }} />
                  </div>
                  {analytics.species.map(s => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '0.85rem' }}>
                        <img src={s.icon} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <BarRow t={t} label={s.label} value={s.pct} max={100} color={s.color} right={`${s.pct}% (${s.vaccinated}/${s.total})`} />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Panel>
          </Col>
        </Row>

        {/* Admin and clinic analytics */}
        <Row className="g-4 mb-4">
          <Col lg={4}>
            <Panel t={t} icon="fa-chart-pie" iconColor="#6f42c1" title="Records by type" subtitle="Health records added by admins and clinics">
              {loading ? (
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <Skeleton style={{ width: '150px', height: '150px', borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} style={{ height: '14px', marginBottom: '0.8rem' }} />)}</div>
                </div>
              ) : analytics.totalRecords === 0 ? (
                <EmptyState t={t} icon="fa-chart-pie" text="No health records added yet." />
              ) : (
                <div className="donut-wrap" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <Donut t={t} segments={analytics.byType} total={analytics.totalRecords} unit="records" />
                  <div style={{ flex: 1, width: '100%' }}>
                    {analytics.byType.map(s => (
                      <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: `1px solid ${t.border}` }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', color: t.text }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color }} />{s.label}
                        </span>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: t.text, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          </Col>

          <Col lg={4}>
            <Panel t={t} icon="fa-building" iconColor="#0d6efd" title="Activity by source" subtitle="Who is adding records and events">
              {loading ? (
                [0, 1, 2].map(i => <Skeleton key={i} style={{ height: '30px', marginBottom: '1rem' }} />)
              ) : (
                <>
                  {(() => {
                    const max = Math.max(analytics.cityVetRecords, analytics.clinicRecords, analytics.eventsScheduled, 1);
                    return (
                      <>
                        <BarRow t={t} label="City Vet Muntinlupa" sublabel="records" value={analytics.cityVetRecords} max={max} color="#198754" />
                        <BarRow t={t} label="Private clinics" sublabel="records" value={analytics.clinicRecords} max={max} color="#0dcaf0" />
                        <BarRow t={t} label="Events scheduled" sublabel="by admins" value={analytics.eventsScheduled} max={max} color="#0d6efd" />
                      </>
                    );
                  })()}
                  {analytics.totalRecords > 0 && (
                    <div style={{ marginTop: '0.75rem', padding: '0.7rem 0.85rem', borderRadius: '10px', background: t.subtle, fontSize: '0.82rem', color: t.text }}>
                      Private clinics added <strong>{Math.round((analytics.clinicRecords / analytics.totalRecords) * 100)}%</strong> of all health records.
                    </div>
                  )}
                </>
              )}
            </Panel>
          </Col>

          <Col lg={4}>
            <Panel t={t} icon="fa-user-check" iconColor="#fd7e14" title="Most active accounts" subtitle="Records and events added">
              {loading ? (
                [0, 1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: '28px', marginBottom: '0.9rem' }} />)
              ) : analytics.topAccounts.length === 0 ? (
                <EmptyState t={t} icon="fa-user-check" text="Admin and clinic activity will show up here." />
              ) : (
                analytics.topAccounts.map(a => (
                  <BarRow key={`${a.name}${a.org}`} t={t} label={a.name} sublabel={a.org} value={a.count}
                    max={analytics.topAccounts[0].count} color={a.clinic ? '#0dcaf0' : '#198754'}
                    right={`${a.count} ${a.count === 1 ? 'action' : 'actions'}`} />
                ))
              )}
            </Panel>
          </Col>
        </Row>

        {/* Recent activity */}
        <Row className="g-4 dash-section" style={{ '--d': '0.7s' }}>
          <Col lg={6}>
            <Panel
              t={t} icon="fa-user-shield" iconColor="#ffc107"
              title="Recent admin/clinic activity"
              action={
                <Button size="sm" variant="warning" onClick={() => setShowLogs(true)} style={{ fontWeight: 600, borderRadius: '8px', whiteSpace: 'nowrap' }}>
                  <i className="fas fa-list me-1" /> View logs
                </Button>
              }
              bodyStyle={{ padding: '0.25rem 0.75rem 0.75rem' }}
            >
              {loading ? (
                [0, 1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: '46px', margin: '0 0.5rem 0.6rem' }} />)
              ) : analytics.recentLogs.length === 0 ? (
                <EmptyState t={t} icon="fa-user-shield" text="Records and events added by admins and clinics will show up here." />
              ) : (
                analytics.recentLogs.map(log => {
                  const base = (log.activity_type || '').replace('_event', '');
                  const cfg = log.category === 'event'
                    ? { icon: 'fa-calendar-alt', color: '#0d6efd' }
                    : (RECORD_TYPES[base] || { icon: 'fa-file-medical', color: '#198754' });
                  return (
                    <ActivityItem
                      key={log.log_id} t={t} icon={cfg.icon} color={cfg.color}
                      title={`${log.action}: ${log.item_name || 'N/A'}${log.pet_name ? ` for ${log.pet_name}` : ''}`}
                      meta={`By ${log.performed_by_name}, ${log.organization}`}
                      time={formatDateTime(log.created_at)}
                    />
                  );
                })
              )}
            </Panel>
          </Col>

          <Col lg={6}>
            <Panel t={t} icon="fa-history" iconColor="#0dcaf0" title="Recent system activity" subtitle="New pets and pet owner accounts" bodyStyle={{ padding: '0.25rem 0.75rem 0.75rem' }}>
              {loading ? (
                [0, 1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: '46px', margin: '0 0.5rem 0.6rem' }} />)
              ) : analytics.system.length === 0 ? (
                <EmptyState t={t} icon="fa-history" text="New pets and pet owners will show up here." />
              ) : (
                analytics.system.map((a, i) => (
                  <ActivityItem
                    key={i} t={t}
                    icon={a.kind === 'pet' ? 'fa-paw' : 'fa-user-plus'}
                    color={a.kind === 'pet' ? '#ffc107' : '#0dcaf0'}
                    title={a.title} meta={a.meta} time={formatShortDate(a.date)}
                  />
                ))
              )}
            </Panel>
          </Col>
        </Row>
      </Container>

      <ActivityLogsModal show={showLogs} onHide={() => setShowLogs(false)} />
    </>
  );
};

export default SuperAdminDashboard;