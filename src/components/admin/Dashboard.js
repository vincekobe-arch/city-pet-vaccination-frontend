import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Table, Button } from 'react-bootstrap';
import { dashboardAPI, handleAPIError } from '../../services/api';

const CACHE_KEY = '__dash_v2__';
const CACHE_TTL = 60_000;
const getCached = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    return Date.now() - ts > CACHE_TTL ? null : data;
  } catch { return null; }
};
const setCache = (data) => {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
};

// "2026-11-10 07:04:07" -> Date (works in every browser)
const toDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);

const REPORT_TYPES = {
  rabies_case:   { label: 'Rabies case',   color: '#dc3545', icon: 'fa-virus' },
  animal_bite:   { label: 'Animal bite',   color: '#fd7e14', icon: 'fa-tooth' },
  animal_rescue: { label: 'Animal rescue', color: '#0d6efd', icon: 'fa-hand-holding-heart' },
  others:        { label: 'Others',        color: '#6c757d', icon: 'fa-clipboard' },
};

// Same colors as the map markers, so the dashboard and map read the same way
const REPORT_STATUS = {
  pending:          { label: 'Pending',          color: '#9aa0a6' },
  suspected_rabies: { label: 'Suspected rabies', color: '#e0a800' },
  positive_rabies:  { label: 'Positive rabies',  color: '#dc3545' },
  ongoing:          { label: 'Ongoing',          color: '#22a855' },
  resolved:         { label: 'Resolved',         color: '#0d6efd' },
  declined:         { label: 'Declined',         color: '#6c757d' },
};

const SPECIES = {
  dog:    { label: 'Dog',    color: '#FF6B6B', icon: '/dog.png' },
  cat:    { label: 'Cat',    color: '#4ECDC4', icon: '/cat.png' },
  rabbit: { label: 'Rabbit', color: '#95E1D3', icon: '/rabbit.png' },
};

const theme = (darkMode) => ({
  page:     darkMode ? '#0f0f0f' : '#ffffff',
  panel:    darkMode ? '#141414' : '#ffffff',
  border:   darkMode ? '#242424' : '#e9ecef',
  subtle:   darkMode ? '#1c1c1c' : '#f6f7f9',
  track:    darkMode ? '#262626' : '#eef0f3',
  text:     darkMode ? '#f0f0f0' : '#1f2328',
  muted:    darkMode ? '#8a8a8a' : '#6b7280',
  faint:    darkMode ? '#5c5c5c' : '#9ca3af',
  grid:     darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
});

/* ------------------------------------------------------------------ */
/* Map (unchanged behavior, now receives all active reports)          */
/* ------------------------------------------------------------------ */
const MiniMapEmbed = ({ reports = [] }) => {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const markersRef  = useRef([]);

  const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

  const MAP_STYLES = [
    { elementType: 'geometry',            stylers: [{ color: '#0d1424' }] },
    { elementType: 'labels.text.stroke',  stylers: [{ color: '#0d1424' }] },
    { elementType: 'labels.text.fill',    stylers: [{ color: '#7d8aa5' }] },
    { featureType: 'poi',                 elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road',                elementType: 'geometry', stylers: [{ color: '#1c2640' }] },
    { featureType: 'road.highway',        elementType: 'geometry', stylers: [{ color: '#2b3858' }] },
    { featureType: 'water',               elementType: 'geometry', stylers: [{ color: '#060a14' }] },
    { featureType: 'administrative',      elementType: 'geometry.stroke', stylers: [{ color: '#2a3550' }] },
  ];

  const STATUS_COLOR = {
    positive_rabies:  '#e00000',
    suspected_rabies: '#f0c800',
    ongoing:          '#22bb55',
    pending:          '#888888',
    resolved:         '#0088ff',
  };

  useEffect(() => {
    const init = () => {
      if (!mapRef.current || instanceRef.current) return;
      if (!mapRef.current.offsetWidth || !mapRef.current.offsetHeight) {
        setTimeout(init, 150); return;
      }
      const google = window.google;
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 14.4081, lng: 121.0415 },
        zoom: 13,
        disableDefaultUI: true,
        gestureHandling: 'none',
        keyboardShortcuts: false,
        clickableIcons: false,
        backgroundColor: '#0d1424',
        styles: MAP_STYLES,
      });

      new google.maps.Polygon({
        paths: [
          [14.380313,121.058092],[14.382328,121.054788],[14.384199,121.054552],[14.384323,121.055496],
          [14.385904,121.055142],[14.386914,121.054015],[14.386963,121.0532],[14.388148,121.052942],
          [14.390019,121.052556],[14.390164,121.053114],[14.391713,121.053221],[14.392669,121.052889],
          [14.393433,121.052068],[14.396368,121.051472],[14.399425,121.051301],[14.40065,121.051215],
          [14.402261,121.052181],[14.404149,121.051397],[14.404939,121.051784],[14.405295,121.051719],
          [14.405552,121.051365],[14.407331,121.051258],[14.409898,121.051612],[14.409971,121.052374],
          [14.410335,121.052427],[14.411358,121.052417],[14.41181,121.052502],[14.413089,121.0532],
          [14.413837,121.053307],[14.415685,121.052191],[14.416704,121.052084],[14.41792,121.052792],
          [14.418154,121.052797],[14.418237,121.052674],[14.418263,121.052256],[14.419276,121.052191],
          [14.419632,121.052328],[14.419593,121.052489],[14.424831,121.052706],[14.42535,121.0535],
          [14.426306,121.053672],[14.427841,121.052384],[14.429733,121.051912],[14.430959,121.052127],
          [14.432842,121.052191],[14.433038,121.052095],[14.436177,121.052599],[14.436655,121.052513],
          [14.437153,121.052427],[14.437465,121.051805],[14.437839,121.051826],[14.439959,121.051655],
          [14.441912,121.051998],[14.442823,121.053843],[14.45118,121.054358],[14.453132,121.053071],
          [14.456874,121.055131],[14.457661,121.053886],[14.468591,121.05895],[14.467293,121.047878],
          [14.447434,121.037707],[14.443904,121.041012],[14.440206,121.036892],[14.442535,121.033287],
          [14.440374,121.028159],[14.437195,121.024296],[14.428103,121.02229],[14.423583,121.022387],
          [14.422648,121.022601],[14.42136,121.021936],[14.41897,121.02037],[14.407165,121.012387],
          [14.399018,121.011915],[14.392202,121.009727],[14.38713,121.006594],[14.382058,121.008224],
          [14.378973,121.011314],[14.372579,121.009598],[14.370087,121.00728],[14.364267,121.006594],
          [14.358777,121.007538],[14.35495,121.007366],[14.350629,121.005049],[14.346857,121.011486],
          [14.355202,121.021614],[14.363516,121.028309],[14.365846,121.029639],[14.365721,121.032643],
          [14.36651,121.036162],[14.371751,121.043329],[14.367504,121.048565],[14.380313,121.058092],
        ].map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#ffc107', strokeOpacity: 0.8, strokeWeight: 2,
        fillOpacity: 0, map,
      });

      new google.maps.Marker({
        position: { lat: 14.395293, lng: 121.044737 },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ffc107', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        },
        title: 'City Veterinary Office',
      });

      instanceRef.current = map;
      renderMarkers(map);
    };

    if (window.google && window.google.maps) { init(); return; }
    let script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
      script.async = true; script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', init);
    return () => script.removeEventListener('load', init);
  }, []);

  useEffect(() => {
    if (instanceRef.current) renderMarkers(instanceRef.current);
  }, [reports]);

  const renderMarkers = (map) => {
    const google = window.google;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    reports
      .filter(r => r.latitude && r.longitude && r.status !== 'resolved' && r.status !== 'declined')
      .forEach(r => {
        const color = STATUS_COLOR[r.status] || '#888';
        const marker = new google.maps.Marker({
          position: { lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: color, fillOpacity: 0.9,
            strokeColor: '#fff', strokeWeight: 1.5,
          },
          title: r.barangay_name || '',
        });
        markersRef.current.push(marker);

        if (r.status === 'positive_rabies' || r.status === 'suspected_rabies') {
          const circle = new google.maps.Circle({
            map,
            center: { lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) },
            radius: 1000,
            strokeColor: color, strokeOpacity: 0.7, strokeWeight: 1.5,
            fillColor: color, fillOpacity: r.status === 'positive_rabies' ? 0.1 : 0.07,
            clickable: false,
          });
          markersRef.current.push(circle);
        }
      });
  };

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
};

/* ------------------------------------------------------------------ */
/* Stat card (unchanged)                                              */
/* ------------------------------------------------------------------ */
const StatCard = ({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay, darkMode, loading }) => {
  const [displayCount, setDisplayCount] = React.useState(0);
  const [hasAnimated, setHasAnimated] = React.useState(false);

  React.useEffect(() => {
    if (loading || hasAnimated || count === 0) return;
    setHasAnimated(true);
    const duration = 1200;
    const steps = 40;
    const increment = count / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const current = step >= steps ? count : Math.round(increment * step);
      setDisplayCount(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [loading, count]);

  return (
    <Col xs={4} md={4} lg={4} className="mb-3 mobile-stat-card" style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
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
        <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
        <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <p className="mobile-stat-label" style={{
                fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase',
                letterSpacing: '0.08em', color: darkMode ? '#666666' : '#999999', marginBottom: '0.5rem'
              }}>
                {label}
              </p>
              <h2 className="mobile-stat-number" style={{
                fontSize: '2.75rem', fontWeight: '700',
                color: darkMode ? '#f0f0f0' : '#111111',
                lineHeight: 1, marginBottom: '0.75rem',
                fontVariantNumeric: 'tabular-nums', minWidth: '3ch', transition: 'color 0.3s'
              }}>
                {loading ? (
                  <span style={{
                    display: 'inline-block', width: '3ch', height: '1em',
                    borderRadius: '6px',
                    background: darkMode ? '#2a2a2a' : '#f0f0f0',
                    animation: 'shimmer 1.4s ease-in-out infinite',
                    verticalAlign: 'middle'
                  }} />
                ) : displayCount}
              </h2>
              <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                <span style={{ fontSize: '0.75rem', color: darkMode ? '#555555' : '#aaaaaa', fontWeight: '500' }}>
                  {description}
                </span>
              </div>
            </div>
            <div className="mobile-stat-icon" style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: accentAlpha, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <img
                src={img} alt={label}
                style={{ width: '32px', height: '32px', objectFit: 'contain', filter: darkMode ? 'brightness(0) invert(1)' : 'none' }}
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
              />
              <i className={`fas ${fallbackIcon}`} style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
            </div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

/* ------------------------------------------------------------------ */
/* Building blocks                                                    */
/* ------------------------------------------------------------------ */
const Panel = ({ t, icon, iconColor, title, subtitle, action, children, bodyStyle, className = '' }) => (
  <div className={`dash-panel h-100 ${className}`} style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

const PanelLink = ({ href, color, children }) => (
  <a href={href} className="dash-link" style={{ fontSize: '0.78rem', fontWeight: 600, color, textDecoration: 'none', whiteSpace: 'nowrap', padding: '0.3rem 0.7rem', borderRadius: '8px', border: `1px solid ${color}40` }}>
    {children}
  </a>
);

const Skeleton = ({ darkMode, style }) => (
  <div className={darkMode ? 'skeleton-dark' : 'skeleton'} style={style} />
);

const EmptyState = ({ t, icon, text }) => (
  <div style={{ height: '100%', minHeight: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.faint, gap: '0.5rem', textAlign: 'center' }}>
    <i className={`fas ${icon}`} style={{ fontSize: '1.6rem' }} />
    <span style={{ fontSize: '0.85rem' }}>{text}</span>
  </div>
);

/* Monthly activity: pets registered vs reports submitted */
const ActivityChart = ({ months, t }) => {
  const peak = Math.max(1, ...months.map(m => Math.max(m.pets, m.reports)));
  const step = Math.max(1, Math.ceil(peak / 4));
  const max = step * 4;
  const n = months.length;
  const xAt = (i) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yAt = (v) => 100 - (v / max) * 100;
  const line = (key) => months.map((m, i) => `${i ? 'L' : 'M'}${xAt(i)},${yAt(m[key])}`).join(' ');
  const series = [
    { key: 'pets', label: 'Pets registered', color: '#ffc107', area: true },
    { key: 'reports', label: 'Reports submitted', color: '#dc3545', area: false },
  ];

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
            <linearGradient id="petsArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffc107" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ffc107" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line('pets')} L${xAt(n - 1)},100 L${xAt(0)},100 Z`} fill="url(#petsArea)" />
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

const Donut = ({ segments, total, t, size = 150, stroke = 18 }) => {
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
        <div style={{ fontSize: '0.72rem', color: t.muted, marginTop: '0.2rem' }}>reports</div>
      </div>
    </div>
  );
};

const BarRow = ({ t, label, value, max, color, right }) => (
  <div style={{ marginBottom: '0.8rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.84rem', color: t.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', color: t.muted, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{right ?? value}</span>
    </div>
    <div style={{ height: '8px', borderRadius: '4px', background: t.track, overflow: 'hidden' }}>
      <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: '100%', borderRadius: '4px', background: color, transition: 'width 0.6s ease' }} />
    </div>
  </div>
);

const formatShortDate = (value) => {
  const d = toDate(value);
  return d && !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */
const AdminDashboard = ({ darkMode }) => {
  const [dashboardData, setDashboardData] = useState({
    statistics: { total_pets: 0, total_owners: 0, upcoming_schedules: 0 },
    pets: [],
    reports: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const t = theme(darkMode);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (force = false) => {
    const cached = !force && getCached();
    if (cached) { setDashboardData(cached); setLoading(false); return; }

    try {
      setLoading(true);
      setError('');
      const { data } = await dashboardAPI.getBatch();
      const result = {
        statistics: {
          total_pets:         (data.pets || []).length,
          total_owners:       Number(data.owners?.total ?? data.owners ?? 0),
          upcoming_schedules: Number(data.upcoming_schedules ?? 0),
        },
        pets:    data.pets || [],
        reports: data.reports || [],
      };
      setDashboardData(result);
      setCache(result);
    } catch (err) {
      setError(handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const { pets, reports } = dashboardData;

  const analytics = useMemo(() => {
    // Last 6 months of activity
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), pets: 0, reports: 0 };
    });
    const byKey = Object.fromEntries(months.map(m => [m.key, m]));
    const bucket = (value) => {
      const d = toDate(value);
      return d && !isNaN(d) ? byKey[`${d.getFullYear()}-${d.getMonth()}`] : null;
    };
    pets.forEach(p => { const b = bucket(p.registration_date || p.created_at); if (b) b.pets++; });
    reports.forEach(r => { const b = bucket(r.created_at); if (b) b.reports++; });

    const thisMonth = months[5].pets;
    const lastMonth = months[4].pets;

    // Vaccination coverage
    const vaccinated = pets.filter(p => Number(p.vaccination_count) > 0).length;
    const species = Object.entries(SPECIES).map(([key, cfg]) => {
      const list = pets.filter(p => p.species?.toLowerCase() === key);
      const done = list.filter(p => Number(p.vaccination_count) > 0).length;
      return { key, ...cfg, total: list.length, vaccinated: done, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
    }).filter(s => s.total > 0);

    // Reports
    const byType = Object.entries(REPORT_TYPES).map(([key, cfg]) => ({ key, ...cfg, value: reports.filter(r => r.report_type === key).length }));
    const byStatus = Object.entries(REPORT_STATUS).map(([key, cfg]) => ({ key, ...cfg, value: reports.filter(r => r.status === key).length })).filter(s => s.value > 0);
    const positive = reports.filter(r => r.status === 'positive_rabies').length;
    const suspected = reports.filter(r => r.status === 'suspected_rabies').length;

    const barangayCounts = {};
    reports.forEach(r => { const name = r.barangay_name || 'Unknown'; barangayCounts[name] = (barangayCounts[name] || 0) + 1; });
    const topBarangays = Object.entries(barangayCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const recentReports = [...reports].sort((a, b) => toDate(b.created_at) - toDate(a.created_at)).slice(0, 6);
    const recentPets = [...pets].sort((a, b) => toDate(b.registration_date || b.created_at) - toDate(a.registration_date || a.created_at)).slice(0, 6);
    const activeReports = reports.filter(r => r.status !== 'resolved' && r.status !== 'declined');

    return {
      months, thisMonth, lastMonth,
      vaccinated, coverage: pets.length ? Math.round((vaccinated / pets.length) * 100) : 0, species,
      byType, byStatus, positive, suspected, topBarangays, recentReports, recentPets, activeReports,
    };
  }, [pets, reports]);

  const petTrendText = (() => {
    const diff = analytics.thisMonth - analytics.lastMonth;
    const base = `${analytics.thisMonth} pet${analytics.thisMonth === 1 ? '' : 's'} registered this month`;
    if (diff === 0) return `${base}, same as last month`;
    return `${base}, ${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} than last month`;
  })();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const styles = `
  @keyframes dropDown {
    0%   { opacity: 0; transform: translateY(-30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
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
  .dashboard-page {
    zoom: 0.75;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } }
  @media (min-width: 1920px) { .dashboard-page { zoom: 1; } }

  .dash-link:hover, .dash-link:focus-visible { background: rgba(0,0,0,0.04); }
  .dash-link:focus-visible, .dash-row:focus-visible { outline: 2px solid #ffc107; outline-offset: 2px; }
  .dash-row { transition: background 0.15s ease; }
  .dash-row:hover { background: ${t.subtle}; }
  .dash-table { --bs-table-bg: transparent; --bs-table-color: ${t.text}; --bs-table-hover-bg: ${t.subtle}; --bs-table-hover-color: ${t.text}; margin-bottom: 0; }
  .dash-table th { font-size: 0.78rem; font-weight: 600; color: ${t.muted}; border-bottom: 1px solid ${t.border} !important; padding: 0.6rem 0.75rem; white-space: nowrap; }
  .dash-table td { font-size: 0.86rem; border-bottom: 1px solid ${t.border} !important; padding: 0.65rem 0.75rem; vertical-align: middle; }
  .dash-table tr:last-child td { border-bottom: none !important; }

  @media (prefers-reduced-motion: reduce) {
    .mobile-stat-card, .skeleton, .skeleton-dark { animation: none !important; }
  }

  @media (max-width: 768px) {
    .mobile-title { font-size: 1.5rem !important; }
    .mobile-subtitle { font-size: 0.9rem !important; }
    .mobile-stat-number { font-size: 1.2rem !important; }
    .mobile-stat-label { font-size: 0.6rem !important; margin-bottom: 0.25rem !important; }
    .mobile-stat-icon { width: 30px !important; height: 30px !important; border-radius: 8px !important; }
    .mobile-stat-icon img { width: 18px !important; height: 18px !important; }
    .mobile-card-padding { padding: 0.5rem 0.3rem !important; }
    .mobile-stat-description { display: none !important; }
    .mobile-stat-card { margin-bottom: 0.5rem !important; }
    .dash-panel-header { padding: 0.9rem 1rem 0.5rem !important; }
    .activity-chart { height: 200px !important; }
    .donut-wrap { flex-direction: column; }
    .dash-hide-sm { display: none; }
  }
`;

  const muted = { color: t.muted };

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: t.page, minHeight: '100vh', transition: 'background 0.3s ease' }}>

        {/* Header */}
        <Row className="mb-4 align-items-end" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <h2 className="mobile-title" style={{ fontWeight: 700, color: t.text, fontSize: '2rem', marginBottom: '0.25rem' }}>
              <i className="fas fa-home me-2" style={{ fontSize: '1.5rem' }} />Admin Dashboard
            </h2>
            <div className="mobile-subtitle" style={{ fontSize: '0.95rem', ...muted }}>{today}</div>
          </Col>
          <Col xs="auto">
            <Button
              variant={darkMode ? 'outline-light' : 'outline-secondary'}
              size="sm"
              onClick={() => loadDashboardData(true)}
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
        <Row className="mb-4">
          {[
            { label: 'Total Pets',  count: dashboardData.statistics.total_pets,        img: '/paw.png',    accent: '#ffc107', accentAlpha: 'rgba(255,193,7,0.12)',  fallbackIcon: 'fa-paw',          description: 'Registered Pets',   delay: '0.1s' },
            { label: 'Communities', count: dashboardData.statistics.total_owners,       img: '/users.png',  accent: '#0dcaf0', accentAlpha: 'rgba(13,202,240,0.12)', fallbackIcon: 'fa-users',        description: 'Total Communities', delay: '0.2s' },
            { label: 'Events',      count: dashboardData.statistics.upcoming_schedules, img: '/events.png', accent: '#dc3545', accentAlpha: 'rgba(220,53,69,0.12)',  fallbackIcon: 'fa-calendar-alt', description: 'Upcoming Events',   delay: '0.3s' },
          ].map(props => (
            <StatCard key={props.label} {...props} darkMode={darkMode} loading={loading} />
          ))}
        </Row>

        {/* Activity + vaccination coverage */}
        <Row className="g-4 mb-4">
          <Col lg={8}>
            <Panel
              t={t} icon="fa-chart-line" iconColor="#ffc107"
              title="Monthly activity"
              subtitle={loading ? 'Loading activity…' : petTrendText}
              action={
                <div className="dash-hide-sm" style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', ...muted }}>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: '#ffc107', marginRight: '6px' }} />Pets registered</span>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: '#dc3545', marginRight: '6px' }} />Reports submitted</span>
                </div>
              }
            >
              {loading
                ? <Skeleton darkMode={darkMode} style={{ height: '240px', width: '100%' }} />
                : <ActivityChart months={analytics.months} t={t} />}
            </Panel>
          </Col>

          <Col lg={4}>
            <Panel
              t={t} icon="fa-syringe" iconColor="#198754"
              title="Vaccination coverage"
              subtitle="Pets with at least one vaccination"
            >
              {loading ? (
                <>
                  <Skeleton darkMode={darkMode} style={{ height: '56px', width: '50%', marginBottom: '1.25rem' }} />
                  {[0, 1, 2].map(i => <Skeleton key={i} darkMode={darkMode} style={{ height: '30px', width: '100%', marginBottom: '0.9rem' }} />)}
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
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '0.8rem' }}>
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

        {/* Report analytics */}
        <Row className="g-4 mb-4">
          <Col lg={4}>
            <Panel t={t} icon="fa-chart-pie" iconColor="#dc3545" title="Reports by type" subtitle="All reports received">
              {loading ? (
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <Skeleton darkMode={darkMode} style={{ width: '150px', height: '150px', borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} darkMode={darkMode} style={{ height: '14px', marginBottom: '0.8rem' }} />)}</div>
                </div>
              ) : reports.length === 0 ? (
                <EmptyState t={t} icon="fa-chart-pie" text="No reports received yet." />
              ) : (
                <div className="donut-wrap" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <Donut segments={analytics.byType} total={reports.length} t={t} />
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
            <Panel t={t} icon="fa-tasks" iconColor="#e0a800" title="Report status" subtitle="Where each report stands">
              {loading ? (
                [0, 1, 2, 3].map(i => <Skeleton key={i} darkMode={darkMode} style={{ height: '28px', marginBottom: '0.9rem' }} />)
              ) : (
                <>
                  {(analytics.positive + analytics.suspected) > 0 && (
                    <a href="/admin/map-status" className="dash-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.85rem', borderRadius: '10px', background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.25)', textDecoration: 'none', marginBottom: '1rem' }}>
                      <i className="fas fa-exclamation-circle" style={{ color: '#dc3545', fontSize: '1.1rem' }} />
                      <span style={{ fontSize: '0.84rem', color: t.text, lineHeight: 1.35 }}>
                        <strong>{analytics.positive + analytics.suspected} active rabies {analytics.positive + analytics.suspected === 1 ? 'case' : 'cases'}</strong>
                        <span style={{ display: 'block', ...muted }}>{analytics.positive} positive, {analytics.suspected} suspected. View them on the map.</span>
                      </span>
                    </a>
                  )}
                  {analytics.byStatus.length === 0
                    ? <EmptyState t={t} icon="fa-tasks" text="Report statuses appear once reports come in." />
                    : analytics.byStatus.map(s => (
                        <BarRow key={s.key} t={t} label={s.label} value={s.value} max={reports.length} color={s.color} />
                      ))}
                </>
              )}
            </Panel>
          </Col>

          <Col lg={4}>
            <Panel t={t} icon="fa-map-pin" iconColor="#0d6efd" title="Most reports by barangay" subtitle="Top 5 barangays">
              {loading ? (
                [0, 1, 2, 3, 4].map(i => <Skeleton key={i} darkMode={darkMode} style={{ height: '28px', marginBottom: '0.9rem' }} />)
              ) : analytics.topBarangays.length === 0 ? (
                <EmptyState t={t} icon="fa-map-pin" text="No reports received yet." />
              ) : (
                analytics.topBarangays.map(([name, count]) => (
                  <BarRow key={name} t={t} label={name} value={count} max={analytics.topBarangays[0][1]} color="#0d6efd"
                    right={`${count} ${count === 1 ? 'report' : 'reports'}`} />
                ))
              )}
            </Panel>
          </Col>
        </Row>

        {/* Map + recent reports */}
        <Row className="g-4 mb-4">
          <Col lg={8}>
            <Panel
              t={t} icon="fa-map-marked-alt" iconColor="#198754"
              title="Map status"
              subtitle={loading ? 'Loading map…' : `${analytics.activeReports.length} active ${analytics.activeReports.length === 1 ? 'report' : 'reports'} in Muntinlupa City`}
              action={<PanelLink href="/admin/map-status" color="#198754">Open map</PanelLink>}
              bodyStyle={{ padding: 0 }}
            >
              <div style={{ position: 'relative', height: '380px' }}>
                {loading
                  ? <Skeleton darkMode={darkMode} style={{ width: '100%', height: '100%', borderRadius: 0 }} />
                  : <MiniMapEmbed reports={analytics.activeReports} />}
              </div>
            </Panel>
          </Col>

          <Col lg={4}>
            <Panel
              t={t} icon="fa-flag" iconColor="#dc3545"
              title="Recent reports"
              action={<PanelLink href="/admin/reports" color="#dc3545">View all</PanelLink>}
              bodyStyle={{ padding: '0.25rem 0.75rem 0.75rem' }}
            >
              {loading ? (
                [0, 1, 2, 3, 4].map(i => <Skeleton key={i} darkMode={darkMode} style={{ height: '46px', margin: '0 0.5rem 0.6rem' }} />)
              ) : analytics.recentReports.length === 0 ? (
                <EmptyState t={t} icon="fa-flag" text="New community reports will show up here." />
              ) : (
                analytics.recentReports.map(report => {
                  const type = REPORT_TYPES[report.report_type] || REPORT_TYPES.others;
                  const status = REPORT_STATUS[report.status] || { label: report.status, color: '#888' };
                  return (
                    <a key={report.id} href="/admin/reports" className="dash-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.5rem', borderRadius: '10px', textDecoration: 'none' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${type.color}1a`, color: type.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`fas ${type.icon}`} style={{ fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type.label}</div>
                        <div style={{ fontSize: '0.75rem', ...muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {report.barangay_name || 'Unknown barangay'}, {formatShortDate(report.created_at)}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: status.color, background: `${status.color}1a`, padding: '0.2rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {status.label}
                      </span>
                    </a>
                  );
                })
              )}
            </Panel>
          </Col>
        </Row>

        {/* Recently registered pets */}
        <Row className="g-4">
          <Col>
            <Panel
              t={t} icon="fa-paw" iconColor="#ffc107"
              title="Recently registered pets"
              action={<PanelLink href="/admin/pets" color={darkMode ? '#ffc107' : '#b38600'}>View all pets</PanelLink>}
            >
              {loading ? (
                [0, 1, 2, 3, 4].map(i => <Skeleton key={i} darkMode={darkMode} style={{ height: '36px', marginBottom: '0.5rem' }} />)
              ) : analytics.recentPets.length === 0 ? (
                <EmptyState t={t} icon="fa-paw" text="Pets registered by the community will show up here." />
              ) : (
                <Table responsive hover className="dash-table">
                  <thead>
                    <tr>
                      <th>Pet</th>
                      <th>Species</th>
                      <th>Owner</th>
                      <th>Vaccinations</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentPets.map(pet => {
                      const sp = SPECIES[pet.species?.toLowerCase()] || { label: pet.species || 'Unknown', color: '#adb5bd', icon: '/paw.png' };
                      const count = Number(pet.vaccination_count) || 0;
                      return (
                        <tr key={pet.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${sp.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <img src={sp.icon} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                              </div>
                              <span style={{ fontWeight: 600 }}>{pet.name}</span>
                            </div>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{pet.species || 'Unknown'}</td>
                          <td>{pet.owner_name || 'N/A'}</td>
                          <td>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '20px', color: count > 0 ? '#198754' : t.muted, background: count > 0 ? 'rgba(25,135,84,0.12)' : t.subtle }}>
                              {count > 0 ? `${count} recorded` : 'None yet'}
                            </span>
                          </td>
                          <td style={muted}>{formatShortDate(pet.registration_date || pet.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Panel>
          </Col>
        </Row>

      </Container>
    </>
  );
};

export default AdminDashboard;