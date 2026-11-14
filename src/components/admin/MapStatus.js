import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, clinicAPI, handleAPIError } from '../../services/api';

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */
const INFO_WINDOW_CSS = `
  .gm-style .gm-style-iw-c {
    padding: 0 !important;
    border-radius: 14px !important;
    background: #ffffff !important;
    box-shadow: 0 12px 32px rgba(0,0,0,0.35) !important;
    overflow: hidden !important;
  }
  .gm-style .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; max-height: none !important; }
  .gm-style .gm-style-iw-tc { display: none !important; }
  .gm-style .gm-style-iw-ch { display: none !important; }
  .gm-style .gm-style-iw-chr { position: absolute !important; top: 6px !important; right: 6px !important; height: auto !important; z-index: 3; }
  .gm-style .gm-ui-hover-effect {
    top: 0 !important; right: 0 !important; width: 24px !important; height: 24px !important;
    background: rgba(255,255,255,0.85) !important; border-radius: 50% !important; opacity: 1 !important;
  }
  .gm-style .gm-ui-hover-effect > span { margin: 6px !important; width: 12px !important; height: 12px !important; background-color: #1f2328 !important; }
  .pu-popup-btn { display: block; width: 100%; border: none; border-radius: 8px; padding: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: filter 0.15s ease; }
  .pu-popup-btn:hover { filter: brightness(0.93); }
`;

// Status colors match the dashboards
const STATUS_CONFIG = {
  pending:          { color: '#9aa0a6', label: 'Pending' },
  suspected_rabies: { color: '#e0a800', label: 'Suspected rabies' },
  positive_rabies:  { color: '#dc3545', label: 'Positive rabies' },
  ongoing:          { color: '#22a855', label: 'Ongoing' },
  resolved:         { color: '#0d6efd', label: 'Resolved' },
};

const TYPE_CONFIG = {
  rabies_case:   { label: 'Rabies case',   color: '#dc3545', icon: 'fa-virus' },
  animal_bite:   { label: 'Animal bite',   color: '#fd7e14', icon: 'fa-tooth' },
  animal_rescue: { label: 'Animal rescue', color: '#198754', icon: 'fa-hand-holding-heart' },
  others:        { label: 'Others',        color: '#6f7cf0', icon: 'fa-clipboard' },
};

const CLINIC = '#0d6efd';
const CITYVET = '#ffc107';

const t = {
  panel: '#ffffff', border: '#e9ecef', subtle: '#f6f7f9', track: '#eef0f3',
  text: '#1f2328', muted: '#6b7280', faint: '#9ca3af',
};

const withRetry = async (fn, retries = 3, delay = 800) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;
      // only retry server errors / network errors, not 4xx
      if (i === retries || (status && status < 500)) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
};

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

const MUNTINLUPA_CENTER = [14.4081, 121.0415];
const MUNTINLUPA_BOUNDS = [[14.34, 120.97], [14.50, 121.12]];

const BOUNDARY = [
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
];

const MAP_STYLES = [
  { elementType:'geometry', stylers:[{ color:'#0d1424' }] },
  { elementType:'labels.text.stroke', stylers:[{ color:'#0d1424' }] },
  { elementType:'labels.text.fill', stylers:[{ color:'#7d8aa5' }] },
  { featureType:'administrative', elementType:'geometry.stroke', stylers:[{ color:'#2a3550' }] },
  { featureType:'administrative.locality', elementType:'labels.text.fill', stylers:[{ color:'#a9b4cc' }] },
  { featureType:'poi', elementType:'labels', stylers:[{ visibility:'off' }] },
  { featureType:'poi.park', elementType:'geometry', stylers:[{ color:'#10231f' }] },
  { featureType:'road', elementType:'geometry', stylers:[{ color:'#1c2640' }] },
  { featureType:'road', elementType:'geometry.stroke', stylers:[{ color:'#0d1424' }] },
  { featureType:'road', elementType:'labels.text.fill', stylers:[{ color:'#6b7896' }] },
  { featureType:'road.highway', elementType:'geometry', stylers:[{ color:'#2b3858' }] },
  { featureType:'road.highway', elementType:'geometry.stroke', stylers:[{ color:'#1c2640' }] },
  { featureType:'road.highway', elementType:'labels.text.fill', stylers:[{ color:'#9aa6c2' }] },
  { featureType:'transit', elementType:'geometry', stylers:[{ color:'#15203a' }] },
  { featureType:'water', elementType:'geometry', stylers:[{ color:'#060a14' }] },
  { featureType:'water', elementType:'labels.text.fill', stylers:[{ color:'#3d4a6b' }] },
];

const CITY_VET = {
  id: 'cityvet',
  clinic_name: 'City Veterinary Office',
  clinic_code: 'CITYVET-MNL',
  owner_name: 'City Veterinarian',
  phone: null,
  specialization: 'Government veterinary office',
  vaccinations_administered: null,
  latitude: 14.395293,
  longitude: 121.044737,
};

const getDistMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Pin color + symbol per report
const getPinMeta = (report) => {
  if (report.status === 'positive_rabies')  return { color: STATUS_CONFIG.positive_rabies.color,  symbol: '!', dark: false };
  if (report.status === 'suspected_rabies') return { color: STATUS_CONFIG.suspected_rabies.color, symbol: '?', dark: true };
  if (report.status === 'pending')          return { color: STATUS_CONFIG.pending.color,          symbol: '', dark: false };
  return { color: (TYPE_CONFIG[report.report_type] || TYPE_CONFIG.others).color, symbol: '', dark: false };
};

const pinSvg = (color, symbol, dark) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 1C8 1 2 7 2 15c0 10 14 25 14 25s14-15 14-25C30 7 24 1 16 1z" fill="${color}" stroke="white" stroke-width="2"/>
    ${symbol
      ? `<text x="16" y="21" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="15" fill="${dark ? '#1f2328' : '#ffffff'}">${symbol}</text>`
      : '<circle cx="16" cy="15" r="5" fill="white"/>'}
  </svg>`)}`;

const clinicSvg = (isCityVet) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="2" y="2" width="36" height="36" rx="10" fill="${isCityVet ? CITYVET : CLINIC}" stroke="white" stroke-width="2.5"/>
    <rect x="17" y="10" width="6" height="20" rx="1.5" fill="${isCityVet ? '#1f2328' : '#ffffff'}"/>
    <rect x="10" y="17" width="20" height="6" rx="1.5" fill="${isCityVet ? '#1f2328' : '#ffffff'}"/>
  </svg>`)}`;

// Escape text from the database before putting it inside map popups or the print page
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const toDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);
const formatDate = (value) => {
  const d = toDate(value);
  return d && !isNaN(d) ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
};
const reportNo = (report) => report.report_number || `#RPT-${String(report.id).padStart(4, '0')}`;

/* ------------------------------------------------------------------ */
/* Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const GROW_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const useGrow = (delay = 350) => {
  const [on, setOn] = useState(prefersReducedMotion());
  useEffect(() => {
    if (prefersReducedMotion()) { setOn(true); return; }
    const timer = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(timer);
  }, []);
  return on;
};

const CountUp = ({ value = 0, duration = 1200, delay = 350 }) => {
  const target = Number(value) || 0;
  const [n, setN] = useState(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    if (prefersReducedMotion()) { setN(target); return; }
    let raf, start;
    const timer = setTimeout(() => {
      const tick = (ts) => {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / duration);
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target]);
  return n;
};

// Pops a marker onto the map: it starts at size 0, springs past full size, then settles.
const popInMarker = (marker, map, { url, w, h, ax, ay }, delay) => {
  const google = window.google;
  const iconAt = (k) => ({
    url,
    scaledSize: new google.maps.Size(Math.max(1, w * k), Math.max(1, h * k)),
    anchor: new google.maps.Point(ax * k, ay * k),
  });
  if (prefersReducedMotion()) { marker.setIcon(iconAt(1)); marker.setMap(map); return () => {}; }
  let raf;
  const timer = setTimeout(() => {
    marker.setIcon(iconAt(0.01));
    marker.setMap(map);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 450);
      const c = 1.9;
      const k = 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
      marker.setIcon(iconAt(Math.max(0.01, k)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }, delay);
  return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
};

/* ------------------------------------------------------------------ */
/* Building blocks                                                    */
/* ------------------------------------------------------------------ */
const Panel = ({ icon, iconColor, title, subtitle, action, children }) => (
  <div className="dash-panel side-panel" style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1.1rem 1.25rem 0.6rem' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `linear-gradient(135deg, ${iconColor}2e, ${iconColor}12)`, boxShadow: `inset 0 0 0 1px ${iconColor}33`, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fas ${icon}`} style={{ fontSize: '0.9rem' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>{title}</h5>
        {subtitle && <div style={{ fontSize: '0.8rem', color: t.muted, marginTop: '0.15rem' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
    <div style={{ padding: '0.4rem 1.25rem 1.2rem', flex: 1 }}>{children}</div>
  </div>
);

const BarRow = ({ label, dot, value, total, color }) => {
  const on = useGrow();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', gap: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', fontWeight: 600, color: t.text }}>
          {dot}{label}
        </span>
        <span style={{ fontSize: '0.8rem', color: t.muted, fontVariantNumeric: 'tabular-nums' }}>
          <strong style={{ color: t.text }}><CountUp value={value} /></strong> · <CountUp value={pct} />%
        </span>
      </div>
      <div style={{ height: '8px', borderRadius: '4px', background: t.track, overflow: 'hidden' }}>
        <div style={{ width: `${on ? pct : 0}%`, height: '100%', borderRadius: '4px', background: color, transition: `width 1.2s ${GROW_EASE}` }} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function MapStatus() {
  const mapRef           = useRef(null);
  const mapInstanceRef   = useRef(null);
  const markersRef       = useRef([]);
  const circlesRef       = useRef([]);
  const clinicMarkersRef = useRef([]);
  const infoWindowRef    = useRef(null);
  const animRef          = useRef([]);
  const clinicAnimRef    = useRef([]);

  const [reports,      setReports]      = useState([]);
  const [clinics,      setClinics]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [mapsLoaded,   setMapsLoaded]   = useState(false);
  const [mapReady,     setMapReady]     = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType,   setFilterType]   = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrinting,   setIsPrinting]   = useState(false);
  const [updatedAt,    setUpdatedAt]    = useState(null);

  const navigate = useNavigate();

  /* ---------------------------- Print ----------------------------- */
  const handlePrintReport = (report) => {
    if (isPrinting) return; // block multiple clicks
    const lat = parseFloat(report.latitude);
    const lng = parseFloat(report.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    setIsPrinting(true);
    window.__setPrinting = setIsPrinting;

    const isPos = report.status === 'positive_rabies';
    const zoneColor = isPos ? '#cc0000' : '#c8a000';
    const zoneName  = isPos ? '1 km Danger Zone' : '1 km Alert Zone';
    const statusLabel = (STATUS_CONFIG[report.status] || STATUS_CONFIG.pending).label;
    const typeLabel   = (TYPE_CONFIG[report.report_type] || { label: report.report_type || 'Report' }).label;
    const generated   = new Date().toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

    const old = document.getElementById('rabies-print-area');
    if (old) old.remove();
    window._printMapInst = null;

    let printStyleEl = document.getElementById('rabies-print-style');
    if (!printStyleEl) {
      printStyleEl = document.createElement('style');
      printStyleEl.id = 'rabies-print-style';
      document.head.appendChild(printStyleEl);
    }
    printStyleEl.innerHTML = `
      @media print {
        @page { margin: 0; size: A4 landscape; }
        html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body > *:not(#rabies-print-area) { display: none !important; visibility: hidden !important; }
        #rabies-print-area {
          display: flex !important; flex-direction: column !important;
          position: fixed !important; inset: 0 !important;
          width: 100vw !important; height: 100vh !important;
          z-index: 99999 !important; background: #fff !important;
        }
        .no-print { display: none !important; }
        #print-map-inner svg { overflow: visible !important; }
      }
    `;

    // Page and map size are unchanged, so the printed map keeps the same zoom and coverage
    const PRINT_W = 1122; // A4 landscape px at 96dpi
    const PRINT_H = 793;
    const HEADER_H = 46, INFO_H = 28, FOOTER_H = 16; // = 90, same as before
    const MAP_H   = PRINT_H - (HEADER_H + INFO_H + FOOTER_H);

    const container = document.createElement('div');
    container.id = 'rabies-print-area';
    container.style.cssText = `
      position: fixed; left: 0; top: 0;
      width: ${PRINT_W}px; height: ${PRINT_H}px;
      background: #fff; z-index: 99999;
      display: flex; flex-direction: column;
      font-family: "Segoe UI", Arial, sans-serif; color: #1f2328;
      overflow: hidden; visibility: hidden;
    `;

    // Header: system + report title on the left, status and report number on the right
    const header = document.createElement('div');
    header.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:0 28px;height:${HEADER_H}px;box-sizing:border-box;flex-shrink:0;border-bottom:3px solid ${zoneColor};`;
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:30px;height:30px;border-radius:8px;background:${zoneColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;">${isPos ? '!' : '?'}</div>
        <div style="line-height:1.2;">
          <div style="font-size:15px;font-weight:700;letter-spacing:-0.01em;">${zoneName} Report</div>
          <div style="font-size:9.5px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">PetUnity · Muntinlupa City Veterinary Office · Animal Rabies Control</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:10px;font-weight:700;color:${zoneColor};background:${zoneColor}14;border:1px solid ${zoneColor}55;padding:3px 10px;border-radius:20px;">${esc(statusLabel)}</span>
        <div style="text-align:right;line-height:1.2;">
          <div style="font-size:12px;font-weight:700;">${esc(reportNo(report))}</div>
          <div style="font-size:9px;color:#6b7280;">${esc(typeLabel)}</div>
        </div>
      </div>`;

    // Info bar
    const field = (label, value, grow) => `
      <div style="${grow ? 'flex:1;min-width:0;' : ''}display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;">
        <span style="font-size:8.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">${label}</span>
        <span style="font-size:10.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;">${value}</span>
      </div>`;
    const infoBar = document.createElement('div');
    infoBar.style.cssText = `display:flex;gap:26px;align-items:center;padding:0 28px;height:${INFO_H}px;box-sizing:border-box;flex-shrink:0;background:#f6f7f9;border-bottom:1px solid #e5e7eb;`;
    infoBar.innerHTML =
      field('Barangay', esc(report.barangay_name || '—')) +
      field('Address', esc(report.address || '—'), true) +
      field('Reported', esc(formatDate(report.created_at) || '—')) +
      field('Coordinates', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);

    // Map area: the map itself plus floating cards that do not change its size
    const mapWrapper = document.createElement('div');
    mapWrapper.style.cssText = `position:relative;width:${PRINT_W}px;height:${MAP_H}px;flex-shrink:0;overflow:hidden;`;

    const mapDiv = document.createElement('div');
    mapDiv.id = 'print-map-inner';
    mapDiv.style.cssText = `width:${PRINT_W}px;height:${MAP_H}px;`;
    mapWrapper.appendChild(mapDiv);

    const card = 'position:absolute;background:rgba(255,255,255,0.96);border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,0.12);z-index:5;';

    const zoneCard = document.createElement('div');
    zoneCard.style.cssText = `${card}top:14px;left:14px;width:230px;padding:12px 14px;border-left:4px solid ${zoneColor};`;
    zoneCard.innerHTML = `
      <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Zone details</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">${zoneName}</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:10px;">
        <span style="color:#6b7280;">Radius</span><span style="font-weight:600;">1,000 meters</span>
        <span style="color:#6b7280;">Coverage</span><span style="font-weight:600;">≈ 3.14 km²</span>
        <span style="color:#6b7280;">Center</span><span style="font-weight:600;">${esc(report.barangay_name || 'Reported location')}</span>
      </div>
      <div style="margin-top:9px;padding:7px 8px;border-radius:7px;background:${zoneColor}12;font-size:9.5px;line-height:1.4;">
        ${isPos
          ? 'Inspect households and stray animals within the zone. Advise residents to keep pets indoors.'
          : 'Monitor animals within the zone while the case is being confirmed.'}
      </div>`;

    const legend = document.createElement('div');
    legend.style.cssText = `${card}bottom:14px;left:14px;padding:9px 12px;display:flex;gap:16px;align-items:center;font-size:9.5px;font-weight:600;`;
    legend.innerHTML = `
      <span style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:${zoneColor};border:2px solid #fff;box-shadow:0 0 0 1px ${zoneColor};"></span>Reported case</span>
      <span style="display:flex;align-items:center;gap:6px;"><span style="width:20px;height:10px;border-radius:3px;border:2px solid ${zoneColor};background:${zoneColor}1a;"></span>${zoneName}</span>`;

    const north = document.createElement('div');
    north.style.cssText = `${card}top:14px;right:14px;width:38px;height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;`;
    north.innerHTML = `
      <svg width="14" height="18" viewBox="0 0 14 18"><path d="M7 0 L13 16 L7 12 L1 16 Z" fill="#1f2328"/></svg>
      <span style="font-size:9px;font-weight:800;margin-top:1px;">N</span>`;

    mapWrapper.appendChild(zoneCard);
    mapWrapper.appendChild(legend);
    mapWrapper.appendChild(north);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:0 28px;height:${FOOTER_H}px;box-sizing:border-box;flex-shrink:0;font-size:8.5px;color:#9ca3af;border-top:1px solid #e5e7eb;`;
    footer.innerHTML = `<span>Generated ${esc(generated)} via PetUnity</span><span>For official use of the City Veterinary Office</span>`;

    // Close button (screen only)
    const btnBar = document.createElement('div');
    btnBar.className = 'no-print';
    btnBar.style.cssText = 'position:absolute;bottom:26px;right:14px;z-index:100000;';
    btnBar.innerHTML = `<button onclick="document.getElementById('rabies-print-area').remove();window._printMapInst=null;window.__setPrinting&&window.__setPrinting(false);" style="background:#fff;color:#1f2328;border:1px solid #d1d5db;border-radius:8px;padding:7px 16px;font-weight:600;font-size:12px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.12);">Close</button>`;

    container.appendChild(header);
    container.appendChild(infoBar);
    container.appendChild(mapWrapper);
    container.appendChild(footer);
    container.appendChild(btnBar);
    document.body.appendChild(container);

    setTimeout(() => {
      const google = window.google;
      const zoom = 15.65; // unchanged
      const pMap = new google.maps.Map(document.getElementById('print-map-inner'), {
        center: { lat, lng },
        zoom,
        disableDefaultUI: true,
        gestureHandling: 'none',
        keyboardShortcuts: false,
        clickableIcons: false,
        styles: [{ featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }],
      });
      window._printMapInst = pMap;

      // 1 km zone
      new google.maps.Circle({
        map: pMap, center: { lat, lng }, radius: 1000,
        strokeColor: zoneColor, strokeOpacity: 0.95, strokeWeight: 2.5,
        fillColor: zoneColor, fillOpacity: 0.08, clickable: false,
      });

      // Reported case marker
      new google.maps.Marker({
        position: { lat, lng }, map: pMap, clickable: false,
        icon: {
          path: google.maps.SymbolPath.CIRCLE, scale: 7,
          fillColor: zoneColor, fillOpacity: 1,
          strokeColor: '#ffffff', strokeWeight: 2.5,
        },
      });

      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        setTimeout(() => {
          container.style.visibility = 'visible';
          setTimeout(() => {
            window.print();
            setTimeout(() => {
              container.remove();
              window._printMapInst = null;
              if (printStyleEl) { printStyleEl.innerHTML = ''; }
              setIsPrinting(false);
            }, 1000);
          }, 400);
        }, 300);
      };

      google.maps.event.addListenerOnce(pMap, 'tilesloaded', doPrint);
      setTimeout(doPrint, 10000); // safety fallback
    }, 50);
  };

  /* --------------------------- Loading ---------------------------- */
  useEffect(() => {
    if (window.google && window.google.maps) { setMapsLoaded(true); return; }
    let script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const onLoad = () => setMapsLoaded(true);
    script.addEventListener('load', onLoad);
    return () => script.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    (async () => {
      await loadReports();
      await loadClinics();
    })();
  }, []);

  useEffect(() => {
    const handler = (e) => navigate('/admin/reports', { state: { openReportId: e.detail.id } });
    const printHandler = (e) => {
      const report = reports.find(r => r.id === e.detail.id);
      if (report) handlePrintReport(report);
    };
    window.addEventListener('viewReport', handler);
    window.addEventListener('printReport', printHandler);
    return () => {
      window.removeEventListener('viewReport', handler);
      window.removeEventListener('printReport', printHandler);
    };
  }, [navigate, reports, isPrinting]);

  useEffect(() => () => {
    animRef.current.forEach(stop => stop());
    clinicAnimRef.current.forEach(stop => stop());
  }, []);

  const loadClinics = async () => {
    try {
      const res = await withRetry(() => clinicAPI.getAll());
      setClinics((res.data.clinics || []).filter(c => c.is_active == 1 && c.latitude && c.longitude));
    } catch (err) {
      console.error('Failed to load clinics:', err);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await withRetry(() => reportsAPI.getAll());
      setReports(res.data.reports || []);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- Derived ---------------------------- */
  const stats = useMemo(() => {
    const s = { total: reports.length };
    Object.keys(STATUS_CONFIG).forEach(k => { s[k] = reports.filter(r => r.status === k).length; });
    Object.keys(TYPE_CONFIG).forEach(k => { s[`type_${k}`] = reports.filter(r => r.report_type === k).length; });
    return s;
  }, [reports]);

  const filtered = useMemo(() => reports.filter(r => {
    if (r.status === 'resolved') return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType   !== 'all' && r.report_type !== filterType) return false;
    return r.latitude && r.longitude;
  }), [reports, filterStatus, filterType]);

  const alert = stats.positive_rabies > 0
    ? { color: STATUS_CONFIG.positive_rabies.color, icon: 'fa-exclamation-triangle', title: 'High alert', text: `${stats.positive_rabies} positive, ${stats.suspected_rabies} suspected rabies ${stats.suspected_rabies === 1 ? 'case' : 'cases'}` }
    : stats.suspected_rabies > 0
      ? { color: STATUS_CONFIG.suspected_rabies.color, icon: 'fa-eye', title: 'Monitoring', text: `${stats.suspected_rabies} suspected rabies ${stats.suspected_rabies === 1 ? 'case' : 'cases'} under review` }
      : { color: '#198754', icon: 'fa-check-circle', title: 'All clear', text: 'No active rabies zones right now' };

  /* --------------------------- Map init --------------------------- */
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initMap = () => {
      if (!mapRef.current) return;
      const el = mapRef.current;
      if (!el.offsetWidth || !el.offsetHeight) { setTimeout(initMap, 150); return; }

      const google = window.google;
      const map = new google.maps.Map(el, {
        center: { lat: MUNTINLUPA_CENTER[0], lng: MUNTINLUPA_CENTER[1] },
        zoom: 13,
        minZoom: 8,
        maxZoom: 22,
        gestureHandling: 'greedy',
        zoomControl: false,
        cameraControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        restriction: {
          latLngBounds: {
            north: MUNTINLUPA_BOUNDS[1][0], south: MUNTINLUPA_BOUNDS[0][0],
            west:  MUNTINLUPA_BOUNDS[0][1], east:  MUNTINLUPA_BOUNDS[1][1],
          },
          strictBounds: false,
        },
        backgroundColor: '#0d1424',
        styles: MAP_STYLES,
      });

      new google.maps.Polygon({
        paths: BOUNDARY.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#ffc107', strokeOpacity: 0.8, strokeWeight: 2.5,
        fillColor: '#ffc107', fillOpacity: 0, map,
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      map.addListener('click', () => infoWindowRef.current && infoWindowRef.current.close());

      mapInstanceRef.current = map;
      setMapReady(true);
    };

    initMap();
  }, [mapsLoaded]);

  /* ----------------------- Report markers ------------------------- */
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const google = window.google;
    const map = mapInstanceRef.current;
    const reduced = prefersReducedMotion();

    animRef.current.forEach(stop => stop());
    animRef.current = [];
    markersRef.current.forEach(m => m.setMap(null));
    circlesRef.current.forEach(c => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];

    // Positive cases first, so a suspected case inside a danger zone does not draw a second circle
    const sortedRabies = filtered
      .filter(r => r.status === 'suspected_rabies' || r.status === 'positive_rabies')
      .sort((a, b) => (b.status === 'positive_rabies') - (a.status === 'positive_rabies'));

    const circleOwners = [];
    sortedRabies.forEach(report => {
      const lat = parseFloat(report.latitude), lng = parseFloat(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const covered = circleOwners.some(o =>
        (o.status === 'positive_rabies' || report.status === 'suspected_rabies') && getDistMeters(lat, lng, o.lat, o.lng) <= 1000
      );
      if (!covered) circleOwners.push({ lat, lng, status: report.status });
    });

    circleOwners.forEach(owner => {
      const isPos = owner.status === 'positive_rabies';
      const color = isPos ? STATUS_CONFIG.positive_rabies.color : STATUS_CONFIG.suspected_rabies.color;
      const center = { lat: owner.lat, lng: owner.lng };
      const circle = new google.maps.Circle({
        map, center, radius: reduced ? 1000 : 0,
        strokeColor: color, strokeOpacity: 0.85, strokeWeight: 2,
        fillColor: color, fillOpacity: isPos ? 0.12 : 0.1, clickable: false,
      });
      circlesRef.current.push(circle);

      if (!reduced) {
        // Zone grows out from the case, then a soft ripple keeps pulsing outward
        const ripple = new google.maps.Circle({
          map, center, radius: 1000, strokeColor: color, strokeOpacity: 0, strokeWeight: 2,
          fillOpacity: 0, clickable: false,
        });
        circlesRef.current.push(ripple);
        let raf; const start = performance.now();
        const period = isPos ? 2200 : 3200;
        const tick = (now) => {
          const e = now - start;
          circle.setRadius(1000 * (1 - Math.pow(1 - Math.min(1, e / 900), 3)));
          if (e > 900) {
            const p = ((e - 900) % period) / period;
            ripple.setOptions({ radius: 1000 + 450 * p, strokeOpacity: 0.6 * (1 - p) });
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        animRef.current.push(() => cancelAnimationFrame(raf));
      }

      const label = new google.maps.Marker({
        position: { lat: owner.lat + 0.0085, lng: owner.lng }, map, clickable: false,
        icon: { url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg"/>', scaledSize: new google.maps.Size(1, 1) },
        label: { text: isPos ? '1 km danger zone' : '1 km alert zone', color: '#ffffff', fontSize: '11px', fontWeight: '700' },
      });
      circlesRef.current.push(label);
    });

    filtered.forEach((report, index) => {
      const lat = parseFloat(report.latitude), lng = parseFloat(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const { color, symbol, dark } = getPinMeta(report);
      const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
      const typeCfg   = TYPE_CONFIG[report.report_type] || { label: report.report_type || 'Report' };
      const isRabies  = report.status === 'suspected_rabies' || report.status === 'positive_rabies';
      const isPos     = report.status === 'positive_rabies';
      const id        = Number(report.id);

      const popupHtml = `
        <div style="width:250px;font-family:inherit;">
          <div style="padding:0.8rem 0.95rem;border-bottom:1px solid #eef0f3;border-left:4px solid ${color};">
            <div style="font-weight:700;font-size:0.9rem;color:#1f2328;padding-right:22px;">${esc(typeCfg.label)}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
              <span style="font-size:0.72rem;color:#6b7280;">${esc(reportNo(report))}</span>
              <span style="font-size:0.68rem;font-weight:700;color:${statusCfg.color};background:${statusCfg.color}1a;padding:1px 8px;border-radius:20px;">${statusCfg.label}</span>
            </div>
          </div>
          <div style="padding:0.75rem 0.95rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.6rem;">
              <div><div style="font-size:0.7rem;color:#6b7280;">Barangay</div><div style="font-size:0.82rem;color:#1f2328;font-weight:600;">${esc(report.barangay_name || 'Not specified')}</div></div>
              <div><div style="font-size:0.7rem;color:#6b7280;">Reported</div><div style="font-size:0.82rem;color:#1f2328;font-weight:600;">${esc(formatDate(report.created_at))}</div></div>
              ${report.phone_number ? `<div style="grid-column:1 / -1;"><div style="font-size:0.7rem;color:#6b7280;">Contact</div><a href="tel:${esc(report.phone_number)}" style="font-size:0.82rem;color:${CLINIC};font-weight:600;text-decoration:none;">${esc(report.phone_number)}</a></div>` : ''}
            </div>
            ${isRabies ? `<div style="font-size:0.76rem;color:#1f2328;background:${color}14;border-radius:8px;padding:0.45rem 0.6rem;margin-bottom:0.6rem;">${isPos ? 'Danger zone, 1 km radius' : 'Alert zone, 1 km radius'}</div>` : ''}
            <button class="pu-popup-btn" style="background:#f1f3f5;color:#1f2328;"
              onclick="window.dispatchEvent(new CustomEvent('viewReport', { detail: { id: ${id} } }))">View full details</button>
            ${isRabies ? `<button class="pu-popup-btn" style="margin-top:0.4rem;background:${color};color:${dark ? '#1f2328' : '#ffffff'};"
              onclick="window.dispatchEvent(new CustomEvent('printReport', { detail: { id: ${id} } }))">Print 1 km zone report</button>` : ''}
          </div>
        </div>`;

      const marker = new google.maps.Marker({ position: { lat, lng }, zIndex: isPos ? 800 : isRabies ? 700 : 600, title: typeCfg.label });
      animRef.current.push(popInMarker(marker, map, { url: pinSvg(color, symbol, dark), w: 32, h: 42, ax: 16, ay: 41 }, 250 + index * 110));
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(popupHtml);
        infoWindowRef.current.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
    });
  }, [filtered, mapReady]);

  /* ----------------------- Clinic markers ------------------------- */
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    clinicAnimRef.current.forEach(stop => stop());
    clinicAnimRef.current = [];
    clinicMarkersRef.current.forEach(m => m.setMap(null));
    clinicMarkersRef.current = [];
    const startDelay = 400 + filtered.length * 110;

    [CITY_VET, ...clinics].forEach((clinic, index) => {
      const lat = parseFloat(clinic.latitude), lng = parseFloat(clinic.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const isCityVet = clinic.id === 'cityvet';
      const color = isCityVet ? CITYVET : CLINIC;

      const popupHtml = `
        <div style="width:240px;font-family:inherit;">
          <div style="padding:0.8rem 0.95rem;border-bottom:1px solid #eef0f3;border-left:4px solid ${color};">
            <div style="font-weight:700;font-size:0.9rem;color:#1f2328;padding-right:22px;line-height:1.25;">${esc(clinic.clinic_name)}</div>
            <div style="font-size:0.75rem;color:#6b7280;margin-top:2px;">${isCityVet ? 'City government clinic' : `Private clinic${clinic.clinic_code ? ` · ${esc(clinic.clinic_code)}` : ''}`}</div>
          </div>
          <div style="padding:0.75rem 0.95rem;display:flex;flex-direction:column;gap:0.5rem;">
            ${clinic.owner_name ? `<div><div style="font-size:0.72rem;color:#6b7280;">Veterinarian</div><div style="font-size:0.85rem;color:#1f2328;font-weight:600;">${esc(isCityVet ? clinic.owner_name : 'Dr. ' + clinic.owner_name)}</div></div>` : ''}
            ${clinic.phone ? `<div><div style="font-size:0.72rem;color:#6b7280;">Phone</div><a href="tel:${esc(clinic.phone)}" style="font-size:0.85rem;color:${CLINIC};font-weight:600;text-decoration:none;">${esc(clinic.phone)}</a></div>` : ''}
            ${clinic.specialization ? `<div><div style="font-size:0.72rem;color:#6b7280;">Specialization</div><div style="font-size:0.85rem;color:#1f2328;">${esc(clinic.specialization)}</div></div>` : ''}
            ${clinic.vaccinations_administered ? `<div style="font-size:0.78rem;background:${CLINIC}12;border-radius:8px;padding:0.45rem 0.6rem;color:#1f2328;"><strong>${esc(clinic.vaccinations_administered)}</strong> vaccinations administered</div>` : ''}
          </div>
        </div>`;

      const size = isCityVet ? 40 : 32;
      const marker = new google.maps.Marker({ position: { lat, lng }, zIndex: isCityVet ? 1000 : 500, title: clinic.clinic_name });
      clinicAnimRef.current.push(popInMarker(marker, map, { url: clinicSvg(isCityVet), w: size, h: size, ax: size / 2, ay: size / 2 }, startDelay + index * 100));
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(popupHtml);
        infoWindowRef.current.open({ map, anchor: marker });
      });
      clinicMarkersRef.current.push(marker);
    });
  }, [clinics, mapReady, loading]);

  /* --------------------------- Controls --------------------------- */
  const zoomBy = (d) => {
    const m = mapInstanceRef.current;
    if (m) m.setZoom((m.getZoom() || 13) + d);
  };
  const recenter = () => {
    const m = mapInstanceRef.current;
    if (!m) return;
    m.panTo({ lat: MUNTINLUPA_CENTER[0], lng: MUNTINLUPA_CENTER[1] });
    m.setZoom(13);
  };
  const toggleFullscreen = () => {
    setIsFullscreen(f => !f);
    setTimeout(() => {
      if (mapInstanceRef.current && window.google) window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
    }, 300);
  };

  const STATUS_FILTERS = [
    { v: 'all',              label: 'All' },
    { v: 'pending',          label: 'Pending' },
    { v: 'suspected_rabies', label: 'Suspected' },
    { v: 'positive_rabies',  label: 'Positive' },
    { v: 'ongoing',          label: 'Ongoing' },
  ];

  const glassBtn = {
    width: '38px', height: '38px', border: 'none', background: 'rgba(13,20,36,0.75)', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
  };

  return (
    <>
      <style>{INFO_WINDOW_CSS}</style>
      <style>{`
        @keyframes dropDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes panelIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0% { box-shadow: 0 0 0 0 var(--c); } 70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        @keyframes radar    { to { transform: rotate(360deg); } }
        @keyframes ring     { 0% { transform: scale(0.4); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes rowIn    { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeUp   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        .dash-section .dash-panel { animation: panelIn 0.5s ease-out backwards; animation-delay: var(--d, 0.15s); }
        .side-stack .dash-panel:nth-child(1) { animation-delay: 0.3s; }
        .side-stack .dash-panel:nth-child(2) { animation-delay: 0.4s; }
        .side-stack .dash-panel:nth-child(3) { animation-delay: 0.5s; }
        .stagger > * { animation: rowIn 0.4s ease-out backwards; }
        ${Array.from({ length: 10 }, (_, i) => `.stagger > *:nth-child(${i + 1}) { animation-delay: ${0.5 + i * 0.06}s; }`).join('\n        ')}

        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); animation: pulseDot 1.8s ease-out infinite; flex-shrink: 0; }
        .status-chip { display: inline-flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0.95rem 0.55rem 0.75rem; border-radius: 12px; border: 1px solid; animation: fadeUp 0.5s ease-out 0.2s backwards; }

        .side-panel { transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease; }
        .side-panel:hover { box-shadow: 0 10px 28px rgba(16,24,40,0.08); transform: translateY(-2px); border-color: #dfe3e8 !important; }

        .glass { background: rgba(13,20,36,0.78); backdrop-filter: blur(8px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); border-radius: 12px; }
        .seg { position: relative; display: flex; padding: 4px; }
        .seg-indicator { position: absolute; top: 4px; bottom: 4px; left: 4px; width: 84px; border-radius: 9px; background: #ffffff; transition: transform 0.35s ${GROW_EASE}; }
        .map-filter { position: relative; z-index: 1; width: 84px; border: none; background: transparent; color: #cfd6e4; font-size: 0.78rem; font-weight: 600; padding: 0.42rem 0; border-radius: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.35rem; transition: color 0.25s ease; }
        .map-filter:hover { color: #ffffff; }
        .map-filter.active { color: #1f2328; }
        .type-select { appearance: none; border: none; background: transparent; color: #ffffff; font-size: 0.78rem; font-weight: 600; padding: 0.55rem 2rem 0.55rem 0.85rem; cursor: pointer; outline: none; }
        .type-select option { color: #1f2328; }
        .map-btn:hover { background: rgba(13,20,36,0.95) !important; }
        .map-filter:focus-visible, .map-btn:focus-visible, .type-select:focus-visible { outline: 2px solid #ffc107; outline-offset: 2px; }

        .radar { position: relative; width: 120px; height: 120px; border-radius: 50%; border: 1px solid rgba(255,193,7,0.25); background: radial-gradient(circle, rgba(255,193,7,0.06) 0 30%, transparent 31%), radial-gradient(circle, transparent 0 60%, rgba(255,193,7,0.08) 61% 62%, transparent 63%); }
        .radar::before { content: ''; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, rgba(255,193,7,0.45), transparent 25%); animation: radar 1.6s linear infinite; }
        .radar::after { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(255,193,7,0.5); animation: ring 1.6s ease-out infinite; }

        .map-col { display: flex; flex-direction: column; }
        .map-card { position: relative; flex: 1 1 auto; height: 100%; min-height: 600px; border-radius: 14px; overflow: hidden; border: 1px solid ${t.border}; box-shadow: 0 12px 32px rgba(16,24,40,0.10); }
        .map-fullscreen { position: fixed !important; top: 0; left: 0; width: 100vw; height: 100vh !important; z-index: 10005; border-radius: 0 !important; border: none !important; zoom: 1.3333; }

        .dashboard-page { zoom: 0.75; min-height: 100vh; display: flex; flex-direction: column; }
        @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } .map-fullscreen { zoom: 1.1111; } }
        @media (min-width: 1920px) { .dashboard-page { zoom: 1; } .map-fullscreen { zoom: 1; } }
        @media (max-width: 991px) { .map-card { flex: none; height: 540px; min-height: 0; } }
        @media (max-width: 768px) { .mobile-title { font-size: 1.5rem !important; } .map-card { height: 480px; } .map-filter, .seg-indicator { width: 70px; } }
        @media (prefers-reduced-motion: reduce) {
          .dash-panel, .stagger > *, .pulse-dot, .status-chip, .radar::before, .radar::after { animation: none !important; }
          .seg-indicator, .side-panel { transition: none !important; }
        }
        @media print {
          body * { visibility: hidden !important; }
          #rabies-print-area, #rabies-print-area * { visibility: visible !important; }
          #rabies-print-area { position: fixed !important; left: 0; top: 0; width: 100vw; height: 100vh; z-index: 99999; background: #fff; }
        }
      `}</style>

      {isPrinting && (
        <div role="status" style={{
          position: 'fixed', bottom: '28px', left: 0, right: 0, margin: '0 auto', width: 'fit-content',
          background: '#ffffff', color: t.text, padding: '0.75rem 1.1rem', border: `1px solid ${t.border}`,
          borderRadius: '12px', zIndex: 999999, display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 12px 32px rgba(16,24,40,0.18)', fontSize: '0.85rem', fontWeight: 600,
          animation: 'fadeUp 0.3s ease-out', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid #e5e7eb', borderTopColor: '#dc3545', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          Preparing the zone report for printing…
        </div>
      )}

      <Container fluid className="py-4 dashboard-page" style={{ background: '#ffffff' }}>

        {/* Header */}
        <Row className="mb-4 align-items-end" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <h2 className="mobile-title" style={{ fontWeight: 700, color: t.text, fontSize: '2rem', marginBottom: '0.25rem' }}>
              <i className="fas fa-map-marked-alt me-2" style={{ fontSize: '1.5rem' }} />Map Status
            </h2>
            <div style={{ fontSize: '0.95rem', color: t.muted, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#198754', background: 'rgba(25,135,84,0.1)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                <span className="pulse-dot" style={{ '--c': 'rgba(25,135,84,0.6)', width: '6px', height: '6px' }} />LIVE
              </span>
              Report monitoring across Muntinlupa City
            </div>
          </Col>
          <Col xs={12} md="auto" className="mt-3 mt-md-0">
            {!loading && (
              <div className="status-chip" role="status" style={{ background: `${alert.color}0d`, borderColor: `${alert.color}33` }}>
                <span className="pulse-dot" style={{ '--c': `${alert.color}88` }} />
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: alert.color }}>
                    <i className={`fas ${alert.icon} me-1`} />{alert.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: t.muted }}>
                    {alert.text}
                    {updatedAt && <> · Updated {updatedAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</>}
                  </div>
                </div>
              </div>
            )}
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2" />{error}
          </Alert>
        )}

        <Row className="g-4 dash-section" style={{ '--d': '0.15s', flex: '1 1 auto' }}>

          {/* Side panels */}
          <Col lg={4} xl={3} className="side-stack order-2 order-lg-1" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <Panel icon="fa-chart-bar" iconColor="#ffc107" title="Report status"
              subtitle={loading ? 'Loading…' : `${stats.total} total ${stats.total === 1 ? 'report' : 'reports'} · ${clinics.length + 1} clinics`}>
              {loading
                ? [0, 1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '26px', marginBottom: '0.8rem', borderRadius: '6px', background: t.track }} />)
                : Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <BarRow key={key} label={cfg.label} value={stats[key]} total={stats.total} color={cfg.color}
                      dot={<span style={{ width: '9px', height: '9px', borderRadius: '50%', background: cfg.color }} />} />
                  ))}
            </Panel>

            <Panel icon="fa-layer-group" iconColor="#6f7cf0" title="By report type">
              {loading
                ? [0, 1, 2, 3].map(i => <div key={i} style={{ height: '26px', marginBottom: '0.8rem', borderRadius: '6px', background: t.track }} />)
                : Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <BarRow key={key} label={cfg.label} value={stats[`type_${key}`]} total={stats.total} color={cfg.color}
                      dot={<span style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${cfg.color}1a`, color: cfg.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><i className={`fas ${cfg.icon}`} style={{ fontSize: '0.65rem' }} /></span>} />
                  ))}
            </Panel>

            <Panel icon="fa-map-pin" iconColor="#198754" title="Map legend">
              <div className="stagger">
                {[
                  { color: STATUS_CONFIG.positive_rabies.color,  label: 'Positive rabies',  shape: 'pin', symbol: '!' },
                  { color: STATUS_CONFIG.suspected_rabies.color, label: 'Suspected rabies', shape: 'pin', symbol: '?', dark: true },
                  { color: STATUS_CONFIG.pending.color,          label: 'Pending report',   shape: 'pin' },
                  { color: TYPE_CONFIG.animal_bite.color,        label: 'Animal bite',      shape: 'pin' },
                  { color: TYPE_CONFIG.animal_rescue.color,      label: 'Animal rescue',    shape: 'pin' },
                  { color: TYPE_CONFIG.others.color,             label: 'Others',           shape: 'pin' },
                  { color: CITYVET,                              label: 'City Veterinary Office', shape: 'clinic' },
                  { color: CLINIC,                               label: 'Private clinic',   shape: 'clinic' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.35rem 0' }}>
                    {l.shape === 'pin' ? (
                      <svg width="18" height="24" viewBox="0 0 32 42" aria-hidden="true">
                        <path d="M16 1C8 1 2 7 2 15c0 10 14 25 14 25s14-15 14-25C30 7 24 1 16 1z" fill={l.color} stroke="#fff" strokeWidth="2" />
                        {l.symbol
                          ? <text x="16" y="21" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="15" fill={l.dark ? '#1f2328' : '#fff'}>{l.symbol}</text>
                          : <circle cx="16" cy="15" r="5" fill="#fff" />}
                      </svg>
                    ) : (
                      <span style={{ width: '18px', height: '18px', borderRadius: '5px', background: l.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-plus" style={{ fontSize: '0.55rem', color: l.color === CITYVET ? '#1f2328' : '#fff' }} />
                      </span>
                    )}
                    <span style={{ fontSize: '0.84rem', fontWeight: 500, color: t.text }}>{l.label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.35rem 0' }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${STATUS_CONFIG.positive_rabies.color}`, background: `${STATUS_CONFIG.positive_rabies.color}1f` }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 500, color: t.text }}>1 km danger / alert zone</span>
                </div>
              </div>
            </Panel>
          </Col>

          {/* Map */}
          <Col lg={8} xl={9} className="map-col order-1 order-lg-2">
            <div className={`dash-panel map-card ${isFullscreen ? 'map-fullscreen' : ''}`}>
              {/* Top bar */}
              <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', pointerEvents: 'none', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', pointerEvents: 'auto' }}>
                  <div className="glass seg" role="group" aria-label="Filter by status">
                    <span className="seg-indicator" style={{ transform: `translateX(calc(${STATUS_FILTERS.findIndex(f => f.v === filterStatus)} * 100%))` }} />
                    {STATUS_FILTERS.map(f => (
                      <button key={f.v} type="button" className={`map-filter ${filterStatus === f.v ? 'active' : ''}`} onClick={() => setFilterStatus(f.v)} aria-pressed={filterStatus === f.v}>
                        {f.v !== 'all' && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_CONFIG[f.v].color }} />}
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="glass" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <i className="fas fa-filter" style={{ position: 'absolute', left: '0.8rem', fontSize: '0.7rem', color: '#cfd6e4', pointerEvents: 'none' }} />
                    <select className="type-select" style={{ paddingLeft: '2rem' }} value={filterType} onChange={e => setFilterType(e.target.value)} aria-label="Filter by report type">
                      <option value="all">All report types</option>
                      {Object.entries(TYPE_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                    </select>
                    <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '0.8rem', fontSize: '0.65rem', color: '#cfd6e4', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto' }}>
                  <span className="glass d-none d-sm-inline-flex" style={{ alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 600, color: '#ffffff', padding: '0.55rem 0.85rem' }}>
                    <span className="pulse-dot" style={{ '--c': 'rgba(255,193,7,0.7)', background: '#ffc107' }} />
                    {loading ? 'Loading…' : `${filtered.length} active ${filtered.length === 1 ? 'report' : 'reports'}`}
                  </span>
                  <button type="button" className="map-btn" onClick={toggleFullscreen} style={{ ...glassBtn, borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}
                    title={isFullscreen ? 'Exit full screen' : 'Full screen'} aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}>
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
                  </button>
                </div>
              </div>

              {loading && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'radial-gradient(circle at center, #15203a 0%, #0d1424 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.1rem', color: '#a9b4cc' }}>
                  <div className="radar" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.02em' }}>Loading reports…</span>
                </div>
              )}

              <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

              {/* Map controls */}
              <div style={{ position: 'absolute', right: 12, bottom: 24, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button type="button" className="map-btn" onClick={recenter} title="Recenter map" aria-label="Recenter map" style={{ ...glassBtn, borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
                  <i className="fas fa-crosshairs" />
                </button>
                <div style={{ borderRadius: '10px', overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
                  <button type="button" className="map-btn" onClick={() => zoomBy(1)} title="Zoom in" aria-label="Zoom in" style={glassBtn}><i className="fas fa-plus" /></button>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                  <button type="button" className="map-btn" onClick={() => zoomBy(-1)} title="Zoom out" aria-label="Zoom out" style={glassBtn}><i className="fas fa-minus" /></button>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}