import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { reportsAPI, clinicAPI, handleAPIError } from '../../services/api';

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
`;

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

const CITY_VET = {
  id: 'cityvet',
  clinic_name: 'City Veterinary Office',
  owner_name: 'City Veterinarian',
  phone: null,
  specialization: 'Government veterinary office',
  latitude: 14.395293,
  longitude: 121.044737,
};

const POSITIVE = '#dc3545';
const SUSPECTED = '#e0a800';
const CLINIC = '#0d6efd';
const CITYVET = '#ffc107';

const t = {
  panel: '#ffffff', border: '#e9ecef', subtle: '#f6f7f9', track: '#eef0f3',
  text: '#1f2328', muted: '#6b7280', faint: '#9ca3af',
};

const getDistMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Escape text from the database before putting it inside map popups
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const toDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);
const formatDate = (value) => {
  const d = toDate(value);
  return d && !isNaN(d) ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
};

/* ------------------------------------------------------------------ */
/* Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Pops a marker onto the map: it starts at size 0 and springs up past full size, then settles.
// Returns a function that cancels the animation.
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
      // easeOutBack: overshoots to about 110% then settles at 100%
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
const Panel = ({ icon, iconColor, title, subtitle, action, children, bodyStyle, style }) => (
  <div className="dash-panel side-panel" style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', ...style }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1.1rem 1.25rem 0.6rem' }}>
      <div className="panel-icon" style={{ width: '34px', height: '34px', borderRadius: '10px', background: `linear-gradient(135deg, ${iconColor}2e, ${iconColor}12)`, boxShadow: `inset 0 0 0 1px ${iconColor}33`, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fas ${icon}`} style={{ fontSize: '0.9rem' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>{title}</h5>
        {subtitle && <div style={{ fontSize: '0.8rem', color: t.muted, marginTop: '0.15rem' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
    <div style={{ padding: '0.4rem 1.25rem 1.2rem', flex: 1, ...bodyStyle }}>{children}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function OwnerMapStatus() {
  const mapRef           = useRef(null);
  const mapInstanceRef   = useRef(null);
  const markersRef       = useRef([]);
  const circlesRef       = useRef([]);
  const clinicMarkersRef = useRef({});
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [updatedAt,    setUpdatedAt]    = useState(null);
  const [clinicQuery,  setClinicQuery]  = useState('');
  const [activeClinic, setActiveClinic] = useState(null);

  // Load Google Maps
  useEffect(() => {
    if (window.google && window.google.maps) { setMapsLoaded(true); return; }
    let script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const onLoad = () => setMapsLoaded(true);
    script.addEventListener('load', onLoad);
    return () => script.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [reportsRes, clinicsRes] = await Promise.all([reportsAPI.getMapReports(), clinicAPI.getAll()]);
      const rabiesReports = (reportsRes.data.reports || []).filter(r => r.status === 'positive_rabies' || r.status === 'suspected_rabies');
      const activeClinics = (clinicsRes.data.clinics || []).filter(c => c.is_active == 1 && c.latitude && c.longitude);
      setReports(rabiesReports);
      setClinics(activeClinics);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const allClinics     = [CITY_VET, ...clinics];
  const positiveCount  = reports.filter(r => r.status === 'positive_rabies').length;
  const suspectedCount = reports.filter(r => r.status === 'suspected_rabies').length;
  const shownClinics   = allClinics.filter(c => {
    const q = clinicQuery.trim().toLowerCase();
    return !q || [c.clinic_name, c.specialization, c.owner_name].join(' ').toLowerCase().includes(q);
  });

  const alert = positiveCount > 0
    ? { color: POSITIVE, icon: 'fa-exclamation-triangle', title: 'High alert', text: `${positiveCount} active danger ${positiveCount === 1 ? 'zone' : 'zones'}${suspectedCount ? `, ${suspectedCount} alert ${suspectedCount === 1 ? 'zone' : 'zones'}` : ''}` }
    : suspectedCount > 0
      ? { color: SUSPECTED, icon: 'fa-eye', title: 'Stay watchful', text: `${suspectedCount} suspected ${suspectedCount === 1 ? 'case' : 'cases'} under review` }
      : { color: '#198754', icon: 'fa-check-circle', title: 'All clear', text: 'No active rabies zones right now' };

  // Stop zone animations when leaving the page
  useEffect(() => () => { animRef.current.forEach(stop => stop()); clinicAnimRef.current.forEach(stop => stop()); }, []);

  // Init map
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
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0d1424' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1424' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#7d8aa5' }] },
          { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a3550' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#a9b4cc' }] },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#10231f' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c2640' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1424' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7896' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2b3858' }] },
          { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1c2640' }] },
          { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#9aa6c2' }] },
          { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#15203a' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#060a14' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d4a6b' }] },
        ],
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

  // Report markers + 1 km zones
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    animRef.current.forEach(stop => stop());
    animRef.current = [];
    markersRef.current.forEach(m => m.setMap(null));
    circlesRef.current.forEach(c => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];
    const reduced = prefersReducedMotion();

    const filtered = reports.filter(r => (filterStatus === 'all' || r.status === filterStatus) && r.latitude && r.longitude);

    // Positive cases first, so a suspected case inside a danger zone does not draw a second circle
    const sorted = [...filtered].sort((a, b) => (b.status === 'positive_rabies') - (a.status === 'positive_rabies'));
    const circleOwners = [];
    sorted.forEach(report => {
      const lat = parseFloat(report.latitude), lng = parseFloat(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const covered = circleOwners.some(o =>
        (o.status === 'positive_rabies' || report.status === 'suspected_rabies') && getDistMeters(lat, lng, o.lat, o.lng) <= 1000
      );
      if (!covered) circleOwners.push({ lat, lng, status: report.status });
    });

    circleOwners.forEach(owner => {
      const isPos = owner.status === 'positive_rabies';
      const color = isPos ? POSITIVE : SUSPECTED;
      const center = { lat: owner.lat, lng: owner.lng };
      const circle = new google.maps.Circle({
        map, center, radius: reduced ? 1000 : 0,
        strokeColor: color, strokeOpacity: 0.85, strokeWeight: 2,
        fillColor: color, fillOpacity: isPos ? 0.12 : 0.1, clickable: false,
      });
      circlesRef.current.push(circle);

      if (!reduced) {
        // The zone grows out from the case, then a soft ripple keeps pulsing outward
        const ripple = new google.maps.Circle({
          map, center, radius: 1000, strokeColor: color, strokeOpacity: 0, strokeWeight: 2,
          fillOpacity: 0, clickable: false,
        });
        circlesRef.current.push(ripple);
        let raf; const start = performance.now();
        const period = isPos ? 2200 : 3200;
        const tick = (now) => {
          const e = now - start;
          const grow = Math.min(1, e / 900);
          circle.setRadius(1000 * (1 - Math.pow(1 - grow, 3)));
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
      const isPos = report.status === 'positive_rabies';
      const color = isPos ? POSITIVE : SUSPECTED;

      const popupHtml = `
        <div style="width:230px;font-family:inherit;">
          <div style="padding:0.8rem 0.95rem;border-bottom:1px solid #eef0f3;border-left:4px solid ${color};">
            <div style="font-weight:700;font-size:0.9rem;color:#1f2328;padding-right:22px;">${isPos ? 'Positive rabies' : 'Suspected rabies'}</div>
            <div style="font-size:0.75rem;color:#6b7280;margin-top:2px;">Reported ${esc(formatDate(report.created_at))}</div>
          </div>
          <div style="padding:0.75rem 0.95rem;">
            <div style="font-size:0.72rem;color:#6b7280;">Barangay</div>
            <div style="font-size:0.85rem;color:#1f2328;font-weight:600;margin-bottom:0.6rem;">${esc(report.barangay_name || 'Not specified')}</div>
            <div style="font-size:0.78rem;color:#1f2328;background:${color}14;border-radius:8px;padding:0.5rem 0.6rem;line-height:1.4;">
              ${isPos ? 'Keep pets indoors and avoid stray animals within 1 km.' : 'Watch your pets closely and avoid stray animals within 1 km.'}
            </div>
          </div>
        </div>`;

      const iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
              <path d="M16 1C8 1 2 7 2 15c0 10 14 25 14 25s14-15 14-25C30 7 24 1 16 1z" fill="${color}" stroke="white" stroke-width="2"/>
              <text x="16" y="21" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="15" fill="${isPos ? '#ffffff' : '#1f2328'}">${isPos ? '!' : '?'}</text>
            </svg>`)}`;
      const marker = new google.maps.Marker({
        position: { lat, lng },
        zIndex: isPos ? 800 : 700,
        title: isPos ? 'Positive rabies' : 'Suspected rabies',
      });
      // One by one, starting after the zones begin to grow
      animRef.current.push(popInMarker(marker, map, { url: iconUrl, w: 32, h: 42, ax: 16, ay: 41 }, 250 + index * 140));
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(popupHtml);
        infoWindowRef.current.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
    });
  }, [reports, filterStatus, mapReady]);

  // Clinic markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    clinicAnimRef.current.forEach(stop => stop());
    clinicAnimRef.current = [];
    Object.values(clinicMarkersRef.current).forEach(({ marker }) => marker.setMap(null));
    clinicMarkersRef.current = {};
    const reportDelay = 250 + reports.length * 140;

    allClinics.forEach((clinic, index) => {
      const lat = parseFloat(clinic.latitude), lng = parseFloat(clinic.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const isCityVet = clinic.id === 'cityvet';
      const color = isCityVet ? CITYVET : CLINIC;

      const popupHtml = `
        <div style="width:240px;font-family:inherit;">
          <div style="padding:0.8rem 0.95rem;border-bottom:1px solid #eef0f3;border-left:4px solid ${color};">
            <div style="font-weight:700;font-size:0.9rem;color:#1f2328;padding-right:22px;line-height:1.25;">${esc(clinic.clinic_name)}</div>
            <div style="font-size:0.75rem;color:#6b7280;margin-top:2px;">${isCityVet ? 'City government clinic' : 'Private veterinary clinic'}</div>
          </div>
          <div style="padding:0.75rem 0.95rem;display:flex;flex-direction:column;gap:0.5rem;">
            ${clinic.owner_name ? `<div><div style="font-size:0.72rem;color:#6b7280;">Veterinarian</div><div style="font-size:0.85rem;color:#1f2328;font-weight:600;">${esc(isCityVet ? clinic.owner_name : 'Dr. ' + clinic.owner_name)}</div></div>` : ''}
            ${clinic.phone ? `<div><div style="font-size:0.72rem;color:#6b7280;">Phone</div><a href="tel:${esc(clinic.phone)}" style="font-size:0.85rem;color:${CLINIC};font-weight:600;text-decoration:none;">${esc(clinic.phone)}</a></div>` : ''}
            ${clinic.specialization ? `<div><div style="font-size:0.72rem;color:#6b7280;">Specialization</div><div style="font-size:0.85rem;color:#1f2328;">${esc(clinic.specialization)}</div></div>` : ''}
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer"
               style="margin-top:0.2rem;text-align:center;font-size:0.8rem;font-weight:600;color:#ffffff;background:${CLINIC};border-radius:8px;padding:0.45rem;text-decoration:none;">Get directions</a>
          </div>
        </div>`;

      const size = isCityVet ? 40 : 32;
      const iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <rect x="2" y="2" width="36" height="36" rx="10" fill="${color}" stroke="white" stroke-width="2.5"/>
              <rect x="17" y="10" width="6" height="20" rx="1.5" fill="${isCityVet ? '#1f2328' : '#ffffff'}"/>
              <rect x="10" y="17" width="20" height="6" rx="1.5" fill="${isCityVet ? '#1f2328' : '#ffffff'}"/>
            </svg>`)}`;
      const marker = new google.maps.Marker({
        position: { lat, lng },
        zIndex: isCityVet ? 1000 : 500,
        title: clinic.clinic_name,
      });
      // Clinics pop in one by one after the case markers
      clinicAnimRef.current.push(popInMarker(marker, map, { url: iconUrl, w: size, h: size, ax: size / 2, ay: size / 2 }, reportDelay + 150 + index * 120));
      const open = () => {
        infoWindowRef.current.setContent(popupHtml);
        infoWindowRef.current.open({ map, anchor: marker });
      };
      marker.addListener('click', open);
      clinicMarkersRef.current[clinic.id] = { marker, open };
    });
  }, [clinics, reports, mapReady]);

  const focusClinic = (clinic) => {
    const map = mapInstanceRef.current;
    const entry = clinicMarkersRef.current[clinic.id];
    if (!map || !entry) return;
    map.panTo({ lat: parseFloat(clinic.latitude), lng: parseFloat(clinic.longitude) });
    map.setZoom(16);
    entry.open();
    setActiveClinic(clinic.id);
    if (!prefersReducedMotion()) {
      entry.marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => entry.marker.setAnimation(null), 1400);
    }
    if (window.innerWidth < 992 && mapRef.current) mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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

  const filteredCount = reports.filter(r => (filterStatus === 'all' || r.status === filterStatus) && r.latitude && r.longitude).length;

  const FILTERS = [
    { v: 'all',              label: 'All cases', color: '#ffffff' },
    { v: 'positive_rabies',  label: 'Positive',  color: POSITIVE },
    { v: 'suspected_rabies', label: 'Suspected', color: SUSPECTED },
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
        @keyframes shimmer  { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 800px 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 6px;
        }
        .dash-section .dash-panel { animation: panelIn 0.5s ease-out backwards; animation-delay: var(--d, 0.2s); }
        .dash-section > :nth-child(2) .dash-panel { animation-delay: calc(var(--d, 0.2s) + 0.08s); }
        .dash-section > :nth-child(3) .dash-panel { animation-delay: calc(var(--d, 0.2s) + 0.16s); }
        .side-stack .dash-panel:nth-child(2) { animation-delay: 0.5s; }
        .side-stack .dash-panel:nth-child(3) { animation-delay: 0.6s; }

        @keyframes pulseDot { 0% { box-shadow: 0 0 0 0 var(--c); } 70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        @keyframes radar    { to { transform: rotate(360deg); } }
        @keyframes ring     { 0% { transform: scale(0.4); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes rowIn    { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeUp   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); animation: pulseDot 1.8s ease-out infinite; flex-shrink: 0; }
        .status-chip { display: inline-flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0.95rem 0.55rem 0.75rem; border-radius: 12px; border: 1px solid; animation: fadeUp 0.5s ease-out 0.2s backwards; }

        .side-panel { transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease; }
        .side-panel:hover { box-shadow: 0 10px 28px rgba(16,24,40,0.08); transform: translateY(-2px); border-color: #dfe3e8 !important; }
        .stagger > * { animation: rowIn 0.4s ease-out backwards; }
        ${Array.from({ length: 12 }, (_, i) => `.stagger > *:nth-child(${i + 1}) { animation-delay: ${0.45 + i * 0.06}s; }`).join('\n        ')}

        .seg { position: relative; display: flex; padding: 4px; border-radius: 12px; background: rgba(13,20,36,0.78); backdrop-filter: blur(8px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
        .seg-indicator { position: absolute; top: 4px; bottom: 4px; left: 4px; width: 96px; border-radius: 9px; background: #ffffff; transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        .map-filter { position: relative; z-index: 1; width: 96px; border: none; background: transparent; color: #cfd6e4; font-size: 0.8rem; font-weight: 600; padding: 0.42rem 0; border-radius: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; transition: color 0.25s ease; }
        .map-filter:hover { color: #ffffff; }
        .map-filter.active { color: #1f2328; }

        .radar { position: relative; width: 120px; height: 120px; border-radius: 50%; border: 1px solid rgba(255,193,7,0.25); background: radial-gradient(circle, rgba(255,193,7,0.06) 0 30%, transparent 31%), radial-gradient(circle, transparent 0 60%, rgba(255,193,7,0.08) 61% 62%, transparent 63%); }
        .radar::before { content: ''; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, rgba(255,193,7,0.45), transparent 25%); animation: radar 1.6s linear infinite; }
        .radar::after { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(255,193,7,0.5); animation: ring 1.6s ease-out infinite; }

        .clinic-search { width: 100%; border: 1px solid ${t.border}; background: ${t.subtle}; border-radius: 10px; padding: 0.5rem 0.75rem 0.5rem 2.1rem; font-size: 0.84rem; color: ${t.text}; outline: none; transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease; }
        .clinic-search:focus { border-color: ${CLINIC}; background: #ffffff; box-shadow: 0 0 0 3px ${CLINIC}22; }
        .clinic-row .chev { transition: transform 0.2s ease, color 0.2s ease; }
        .clinic-row:hover .chev { transform: translateX(3px); color: ${CLINIC} !important; }
        .clinic-row.active { background: ${CLINIC}0f !important; box-shadow: inset 3px 0 0 ${CLINIC}; }
        .map-btn:hover { background: rgba(13,20,36,0.95) !important; }
        .clinic-row { transition: background 0.15s ease; }
        .clinic-row:hover { background: ${t.subtle}; }
        .map-filter:focus-visible, .map-btn:focus-visible, .clinic-row:focus-visible { outline: 2px solid #ffc107; outline-offset: 2px; }

        .map-col { display: flex; flex-direction: column; }
        .map-card { position: relative; flex: 1 1 auto; height: 100%; min-height: 560px; border-radius: 14px; overflow: hidden; border: 1px solid ${t.border}; box-shadow: 0 12px 32px rgba(16,24,40,0.10); }
        .map-fullscreen { position: fixed !important; top: 0; left: 0; width: 100vw; height: 100vh !important; z-index: 10002; border-radius: 0 !important; border: none !important; zoom: 1.3333; }

        .dashboard-page { zoom: 0.75; min-height: 100vh; display: flex; flex-direction: column; }
        @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } .map-fullscreen { zoom: 1.1111; } }
        @media (min-width: 1920px) { .dashboard-page { zoom: 1; } .map-fullscreen { zoom: 1; } }
        @media (max-width: 991px) { .map-card { flex: none; height: 520px; min-height: 0; } }
        @media (max-width: 768px) { .mobile-map-title { font-size: 1.5rem !important; } .map-card { height: 460px; } }
        @media (prefers-reduced-motion: reduce) { .dash-panel, .skeleton, .stagger > *, .pulse-dot, .status-chip, .radar::before, .radar::after { animation: none !important; } .seg-indicator, .side-panel { transition: none !important; } }
      `}</style>

      <Container fluid className="py-4 dashboard-page" style={{ background: '#ffffff' }}>

        {/* Header */}
        <Row className="mb-4 align-items-end" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <h2 className="mobile-map-title" style={{ fontWeight: 700, color: t.text, fontSize: '2rem', marginBottom: '0.25rem' }}>
              <i className="fas fa-map-marked-alt me-2" style={{ fontSize: '1.5rem' }} />Map Status
            </h2>
            <div style={{ fontSize: '0.95rem', color: t.muted, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#198754', background: 'rgba(25,135,84,0.1)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                <span className="pulse-dot" style={{ '--c': 'rgba(25,135,84,0.6)', width: '6px', height: '6px' }} />LIVE
              </span>
              Active rabies cases and veterinary clinics in Muntinlupa City
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

          {/* Map */}
          <Col lg={8} className="map-col">
            <div className={`dash-panel map-card ${isFullscreen ? 'map-fullscreen' : ''}`}>
              {/* Top bar */}
              <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', pointerEvents: 'none' }}>
                <div className="seg" style={{ pointerEvents: 'auto' }} role="group" aria-label="Filter cases">
                  <span className="seg-indicator" style={{ transform: `translateX(${FILTERS.findIndex(f => f.v === filterStatus) * 96}px)` }} />
                  {FILTERS.map(f => (
                    <button key={f.v} type="button" className={`map-filter ${filterStatus === f.v ? 'active' : ''}`} onClick={() => setFilterStatus(f.v)} aria-pressed={filterStatus === f.v}>
                      {f.v !== 'all' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.color }} />}
                      {f.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto' }}>
                  <span className="d-none d-sm-inline-flex" style={{ alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 600, color: '#ffffff', background: 'rgba(13,20,36,0.78)', backdropFilter: 'blur(8px)', padding: '0.5rem 0.8rem', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
                    <span className="pulse-dot" style={{ '--c': filteredCount ? 'rgba(220,53,69,0.7)' : 'rgba(25,135,84,0.7)', background: filteredCount ? POSITIVE : '#22a855' }} />
                    {loading ? 'Loading…' : `${filteredCount} active ${filteredCount === 1 ? 'case' : 'cases'}`}
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
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.02em' }}>Scanning for active cases…</span>
                </div>
              )}

              <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

              {/* Map controls */}
              <div style={{ position: 'absolute', right: 12, bottom: 24, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button type="button" className="map-btn" onClick={recenter} title="Recenter map" aria-label="Recenter map" style={{ ...glassBtn, borderRadius: '10px' }}>
                  <i className="fas fa-crosshairs" />
                </button>
                <div style={{ borderRadius: '10px', overflow: 'hidden' }}>
                  <button type="button" className="map-btn" onClick={() => zoomBy(1)} title="Zoom in" aria-label="Zoom in" style={glassBtn}><i className="fas fa-plus" /></button>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                  <button type="button" className="map-btn" onClick={() => zoomBy(-1)} title="Zoom out" aria-label="Zoom out" style={glassBtn}><i className="fas fa-minus" /></button>
                </div>
              </div>
            </div>
          </Col>

          {/* Side panels */}
          <Col lg={4} className="side-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <Panel icon="fa-info-circle" iconColor="#ffc107" title="Reading the map">
              <div className="stagger">
              {[
                { swatch: <div style={{ width: '28px', height: '14px', borderRadius: '4px', border: `2px solid ${POSITIVE}`, background: `${POSITIVE}1f` }} />, label: '1 km danger zone', desc: 'A positive rabies case was confirmed here. Keep pets indoors.' },
                { swatch: <div style={{ width: '28px', height: '14px', borderRadius: '4px', border: `2px solid ${SUSPECTED}`, background: `${SUSPECTED}1f` }} />, label: '1 km alert zone', desc: 'A suspected case is being checked. Watch your pets closely.' },
                { swatch: <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: CITYVET, margin: '0 4px' }} />, label: 'City Veterinary Office', desc: 'Free government vaccination and checkups.' },
                { swatch: <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: CLINIC, margin: '0 4px' }} />, label: 'Private clinic', desc: 'Registered veterinary clinics in the city.' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.55rem 0', borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ width: '28px', display: 'flex', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>{item.swatch}</div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 600, color: t.text }}>{item.label}</div>
                    <div style={{ fontSize: '0.78rem', color: t.muted, lineHeight: 1.45 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
              </div>
            </Panel>

            <Panel icon="fa-clinic-medical" iconColor={CLINIC} title="Vet clinics" subtitle="Select a clinic to see it on the map" bodyStyle={{ padding: '0.2rem 0.75rem 0.75rem' }}
              action={!loading && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: CLINIC, background: `${CLINIC}14`, padding: '0.2rem 0.55rem', borderRadius: '20px' }}>{allClinics.length}</span>}>
              <div style={{ position: 'relative', margin: '0 0.5rem 0.5rem' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: t.faint }} />
                <input className="clinic-search" type="search" placeholder="Search clinics" value={clinicQuery} onChange={e => setClinicQuery(e.target.value)} aria-label="Search clinics" />
              </div>
              <div className="stagger" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {loading ? (
                  [0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: '42px', margin: '0 0.5rem 0.5rem' }} />)
                ) : shownClinics.length === 0 ? (
                  <div style={{ padding: '1rem 0.5rem', textAlign: 'center', fontSize: '0.82rem', color: t.faint }}>No clinics match "{clinicQuery}"</div>
                ) : shownClinics.map(clinic => {
                  const isCityVet = clinic.id === 'cityvet';
                  return (
                    <button key={clinic.id} type="button" className={`clinic-row ${activeClinic === clinic.id ? 'active' : ''}`} onClick={() => focusClinic(clinic)}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0.5rem', borderRadius: '10px', cursor: 'pointer' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${isCityVet ? CITYVET : CLINIC}1f`, color: isCityVet ? '#b38600' : CLINIC, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fas fa-clinic-medical" style={{ fontSize: '0.8rem' }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clinic.clinic_name}</div>
                        <div style={{ fontSize: '0.75rem', color: t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isCityVet ? 'City government clinic' : (clinic.specialization || 'Private clinic')}
                        </div>
                      </div>
                      <i className="fas fa-chevron-right chev" style={{ fontSize: '0.7rem', color: t.faint }} />
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel icon="fa-shield-alt" iconColor="#198754" title="Keep your pets safe">
              <div className="stagger">
              {[
                { icon: 'fa-syringe',  tip: "Keep your pet's anti-rabies vaccination up to date." },
                { icon: 'fa-home',     tip: 'Keep pets indoors when a danger zone is nearby.' },
                { icon: 'fa-hospital', tip: 'Bring your pet to the nearest clinic right away if it is bitten.' },
                { icon: 'fa-flag',     tip: 'Report animal bites and stray animals through the Reports page.' },
              ].map(item => (
                <div key={item.tip} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.7rem' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(25,135,84,0.12)', color: '#198754', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${item.icon}`} style={{ fontSize: '0.7rem' }} />
                  </div>
                  <span style={{ fontSize: '0.84rem', color: t.text, lineHeight: 1.5 }}>{item.tip}</span>
                </div>
              ))}
              </div>
            </Panel>
          </Col>
        </Row>
      </Container>
    </>
  );
}