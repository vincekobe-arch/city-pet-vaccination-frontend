import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { reportsAPI, clinicAPI, handleAPIError } from '../../services/api';

const LEAFLET_CSS = `
  .gm-style .gm-style-iw-c {
    padding: 0 !important;
    border-radius: 16px !important;
    background: #0d1424 !important;
    border: 1px solid rgba(255,255,255,0.12) !important;
    box-shadow: 0 12px 36px rgba(0,0,0,0.55) !important;
    overflow: hidden !important;
  }
  .gm-style .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; max-height: none !important; }
  .gm-style .gm-style-iw-tc { display: none !important; }
  .gm-style .gm-style-iw-ch { display: none !important; }
  .gm-style .gm-style-iw-chr {
    position: absolute !important; top: 6px !important; right: 6px !important;
    height: auto !important; z-index: 3;
  }
  .gm-style .gm-ui-hover-effect {
    top: 0 !important; right: 0 !important;
    width: 26px !important; height: 26px !important;
    background: rgba(255,255,255,0.14) !important;
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.25) !important;
    border-radius: 50% !important;
    opacity: 1 !important;
  }
  .gm-style .gm-ui-hover-effect > span {
    margin: 6px !important; width: 12px !important; height: 12px !important;
    background-color: #ffffff !important;
  }
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

const getDistMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const STATS_CONFIG = [
  { key: 'positive_rabies',  label: 'Positive Rabies',  color: '#e00000', icon: '☣️', bg: 'rgba(224,0,0,0.08)',   description: 'Active Danger Zones' },
  { key: 'suspected_rabies', label: 'Suspected Rabies', color: '#f0c800', icon: '⚠️', bg: 'rgba(240,200,0,0.10)', description: 'Active Alert Zones'  },
  { key: 'clinics',          label: 'Vet Clinics',      color: '#0d6efd', icon: '🏥', bg: 'rgba(13,110,253,0.08)', description: 'Nearby Vet Clinics'  },
];

export default function OwnerMapStatus() {
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markersRef      = useRef([]);
  const circlesRef      = useRef([]);
  const clinicMarkersRef = useRef([]);
const infoWindowRef    = useRef(null);

  const [reports,       setReports]       = useState([]);
  const [clinics,       setClinics]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
const [mapReady,      setMapReady]      = useState(false);
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [stats,         setStats]         = useState({ positive_rabies: 0, suspected_rabies: 0, clinics: 0 });

  // Load Google Maps
useEffect(() => {
  if (window.google && window.google.maps) { setLeafletLoaded(true); return; }
  let script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (!script) {
    script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB72rFhd2GZd0PKiWSI_duS5WXDWXQb0To';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  const onLoad = () => setLeafletLoaded(true);
  script.addEventListener('load', onLoad);
  return () => script.removeEventListener('load', onLoad);
}, []);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsRes, clinicsRes] = await Promise.all([
  reportsAPI.getMapReports(),
  clinicAPI.getAll(),
]);
      const allReports = reportsRes.data.reports || [];
      // Only keep active rabies-related reports
      const rabiesReports = allReports.filter(r =>
        (r.status === 'positive_rabies' || r.status === 'suspected_rabies') &&
        r.status !== 'resolved'
      );
      const activeClinics = (clinicsRes.data.clinics || []).filter(c => c.is_active == 1 && c.latitude && c.longitude);
      setReports(rabiesReports);
      setClinics(activeClinics);
      setStats({
        positive_rabies:  rabiesReports.filter(r => r.status === 'positive_rabies').length,
        suspected_rabies: rabiesReports.filter(r => r.status === 'suspected_rabies').length,
        clinics: activeClinics.length + 1, // +1 for city vet
      });
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Init map
useEffect(() => {
  if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

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
          north: MUNTINLUPA_BOUNDS[1][0],
          south: MUNTINLUPA_BOUNDS[0][0],
          west:  MUNTINLUPA_BOUNDS[0][1],
          east:  MUNTINLUPA_BOUNDS[1][1],
        },
        strictBounds: false,
      },
      backgroundColor: '#0d1424',
      styles: [
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
      ],
    });

    new google.maps.Polygon({
      paths: BOUNDARY.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: '#ffc107',
      strokeOpacity: 0.8,
      strokeWeight: 2.5,
      fillColor: '#ffc107',
      fillOpacity: 0,
      map,
    });

    infoWindowRef.current = new google.maps.InfoWindow();
    map.addListener('click', () => infoWindowRef.current && infoWindowRef.current.close());

    mapInstanceRef.current = map;
    setMapReady(true);
  };

  initMap();
}, [leafletLoaded]);

  // Render report markers + danger circles
useEffect(() => {
  if (!mapInstanceRef.current || !mapReady) return;
  const google = window.google;
  const map = mapInstanceRef.current;

  markersRef.current.forEach(m => m.setMap(null));
  circlesRef.current.forEach(c => c.setMap(null));
  markersRef.current = [];
  circlesRef.current = [];

  const filtered = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return r.latitude && r.longitude;
  });

  const sortedRabies = [...filtered].sort((a, b) => {
    if (a.status === 'positive_rabies' && b.status !== 'positive_rabies') return -1;
    if (b.status === 'positive_rabies' && a.status !== 'positive_rabies') return 1;
    return 0;
  });

  const circleOwners = [];
  sortedRabies.forEach(report => {
    const lat = parseFloat(report.latitude);
    const lng = parseFloat(report.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    const isWithin = circleOwners.some(owner => {
      if (owner.status === 'positive_rabies') return getDistMeters(lat, lng, owner.lat, owner.lng) <= 1000;
      if (owner.status === 'suspected_rabies' && report.status === 'suspected_rabies') return getDistMeters(lat, lng, owner.lat, owner.lng) <= 1000;
      return false;
    });
    if (!isWithin) circleOwners.push({ lat, lng, status: report.status });
  });

  circleOwners.forEach(owner => {
    const isPos = owner.status === 'positive_rabies';
    try {
      const circle = new google.maps.Circle({
        map,
        center: { lat: owner.lat, lng: owner.lng },
        radius: 1000,
        strokeColor:   isPos ? '#e00000' : '#f0c800',
        strokeOpacity: 0.85,
        strokeWeight:  2.5,
        fillColor:     isPos ? '#e00000' : '#f0c800',
        fillOpacity:   isPos ? 0.12 : 0.10,
        clickable: false,
      });
      const labelMarker = new google.maps.Marker({
        position: { lat: owner.lat + 0.0085, lng: owner.lng },
        map,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg"/>',
          scaledSize: new google.maps.Size(1, 1),
        },
        label: {
          text: `1 km ${isPos ? '⚠️ Danger Zone' : '🔍 Alert Zone'}`,
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 'bold',
        },
        clickable: false,
      });
      circlesRef.current.push(circle, labelMarker);
    } catch (e) {
      console.warn('Circle render skipped:', e.message);
    }
  });

  filtered.forEach(report => {
    const lat = parseFloat(report.latitude);
    const lng = parseFloat(report.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const isPos    = report.status === 'positive_rabies';
    const color    = isPos ? '#e00000' : '#f0c800';
    const emoji    = isPos ? '☣️' : '⚠️';
    const label    = isPos ? 'Positive Rabies' : 'Suspected Rabies';
    const bgColor  = isPos ? 'rgba(224,0,0,0.9)' : 'rgba(220,180,0,0.95)';
    const txtColor = isPos ? '#fff' : '#1a1a1a';

        const popupHtml = `
      <div style="width:210px;font-family:'Segoe UI',sans-serif;overflow:hidden;background:#0d1424;">
        <div style="background:${isPos ? 'linear-gradient(135deg,#b30000,#e00000)' : 'linear-gradient(135deg,#d4aa00,#f0c800)'};padding:0.75rem 0.9rem;">
          <div style="font-size:1.2rem;margin-bottom:0.3rem;">${emoji}</div>
          <div style="color:${txtColor};font-weight:700;font-size:0.8rem;">${label}</div>
          <div style="color:${isPos ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'};font-size:0.62rem;margin-top:2px;">
            Reported ${new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <div style="padding:0.7rem 0.9rem;background:#0d1424;">
          <div style="margin-bottom:0.4rem;">
            <div style="font-size:0.58rem;color:#7d8aa5;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Barangay</div>
            <div style="font-size:0.78rem;color:#e8ecf5;font-weight:600;margin-top:2px;">${report.barangay_name || 'Not specified'}</div>
          </div>
          <div style="margin-top:0.5rem;padding:0.4rem 0.55rem;background:${isPos ? 'rgba(224,0,0,0.15)' : 'rgba(240,200,0,0.12)'};border-radius:8px;border-left:3px solid ${color};font-size:0.65rem;font-weight:700;color:${isPos ? '#ff8a8a' : '#ffe066'};">
            ${isPos ? '⚠️ Stay alert — danger zone within 1km' : '🔍 Alert zone — monitor pets nearby'}
          </div>
        </div>
      </div>`;

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
            <rect x="6" y="2" width="20" height="14" rx="3" fill="${color}" stroke="white" stroke-width="1.5"/>
            <text x="16" y="13" text-anchor="middle" font-size="9">${emoji}</text>
            <rect x="5" y="2" width="2.5" height="40" rx="1.2" fill="white"/>
            <ellipse cx="6.25" cy="42" rx="4" ry="1.8" fill="rgba(0,0,0,0.18)"/>
          </svg>`)}`,
        scaledSize: new google.maps.Size(36, 48),
        anchor: new google.maps.Point(6, 48),
      },
    });
    marker.addListener('click', () => {
      infoWindowRef.current.setContent(popupHtml);
      infoWindowRef.current.open({ map, anchor: marker });
    });
    markersRef.current.push(marker);
  });
}, [reports, filterStatus, mapReady]);

  // Render clinic markers
useEffect(() => {
  if (!mapInstanceRef.current || !mapReady) return;
  const google = window.google;
  const map = mapInstanceRef.current;

  clinicMarkersRef.current.forEach(m => m.setMap(null));
  clinicMarkersRef.current = [];

  const cityVet = {
    id: 'cityvet',
    clinic_name: 'City Veterinary Office',
    clinic_code: 'CITYVET-MNL',
    owner_name: 'City Veterinarian',
    phone: null,
    specialization: 'Government Veterinary Office',
    latitude: 14.395293,
    longitude: 121.044737,
  };

  [cityVet, ...clinics].forEach(clinic => {
    const lat = parseFloat(clinic.latitude);
    const lng = parseFloat(clinic.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const isCityVet = clinic.id === 'cityvet';

        const popupHtml = `
      <div style="width:220px;font-family:'Segoe UI',sans-serif;overflow:hidden;background:#0d1424;">
        <div style="background:${isCityVet ? 'linear-gradient(135deg,#ffc107,#ff8c00)' : 'linear-gradient(135deg,#0d6efd,#0a58ca)'};padding:0.75rem 0.9rem;">
          <div style="margin-bottom:0.3rem;">
            <div style="color:${isCityVet ? '#1a1a1a' : '#fff'};font-weight:700;font-size:0.78rem;line-height:1.2;padding-right:22px;">${clinic.clinic_name}</div>
            <div style="color:${isCityVet ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)'};font-size:0.6rem;">${isCityVet ? 'Government Veterinary Office' : (clinic.clinic_code || '')}</div>
          </div>
          <span style="display:inline-block;background:rgba(255,255,255,0.22);color:${isCityVet ? '#1a1a1a' : '#fff'};padding:1px 8px;border-radius:20px;font-size:0.6rem;font-weight:700;">
            🏥 ${isCityVet ? 'City Government Clinic' : 'Private Clinic'}
          </span>
        </div>
        <div style="padding:0.7rem 0.9rem;background:#0d1424;display:flex;flex-direction:column;gap:0.4rem;">
          ${clinic.owner_name ? `<div><div style="font-size:0.58rem;color:#7d8aa5;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Veterinarian</div><div style="font-size:0.75rem;color:#e8ecf5;font-weight:600;margin-top:1px;">${isCityVet ? clinic.owner_name : 'Dr. ' + clinic.owner_name}</div></div>` : ''}
          <div style="display:flex;gap:0.35rem;margin-top:0.2rem;">
            ${clinic.phone ? `<div style="flex:1;background:rgba(255,255,255,0.06);padding:0.3rem 0.45rem;border-radius:6px;border:1px solid rgba(255,255,255,0.12);"><div style="font-size:0.54rem;color:#7d8aa5;font-weight:700;text-transform:uppercase;">Phone</div><div style="font-size:0.65rem;color:#e8ecf5;font-weight:600;margin-top:1px;">${clinic.phone}</div></div>` : ''}
            ${clinic.specialization ? `<div style="flex:1;background:rgba(13,110,253,0.15);padding:0.3rem 0.45rem;border-radius:6px;border:1px solid rgba(13,110,253,0.4);"><div style="font-size:0.54rem;color:#8fb4ff;font-weight:700;text-transform:uppercase;">Specialty</div><div style="font-size:0.62rem;color:#6ea8ff;font-weight:700;margin-top:1px;">${clinic.specialization}</div></div>` : ''}
          </div>
        </div>
      </div>`;

    const w = isCityVet ? 48 : 32;
    const h = isCityVet ? 58 : 40;

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      zIndex: isCityVet ? 1000 : 500,
      icon: isCityVet ? {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 52 64">
            <!-- shadow -->
            <ellipse cx="7" cy="62" rx="6" ry="2.2" fill="rgba(0,0,0,0.18)"/>
            <!-- pole -->
            <rect x="5" y="2" width="4" height="58" rx="2" fill="#d4d4d4"/>
            <rect x="5" y="2" width="2" height="58" rx="2" fill="#f0f0f0"/>
            <!-- flag body -->
            <rect x="9" y="2" width="40" height="28" rx="5" fill="#ffc107"/>
            <!-- top accent stripe -->
            <rect x="9" y="2" width="40" height="8" rx="5" fill="#ffd54f"/>
            <rect x="9" y="7" width="40" height="3" fill="#ffd54f"/>
            <!-- dark overlay for depth -->
            <rect x="9" y="2" width="40" height="28" rx="5" fill="url(#cvg)" opacity="0.3"/>
            <defs>
              <linearGradient id="cvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="white"/>
                <stop offset="100%" stop-color="black"/>
              </linearGradient>
            </defs>
            <!-- medical cross vertical -->
            <rect x="25" y="8" width="7" height="16" rx="2" fill="white"/>
            <!-- medical cross horizontal -->
            <rect x="19" y="13" width="19" height="6" rx="2" fill="white"/>
            <!-- center circle -->
            <circle cx="28.5" cy="16" r="3" fill="#ffc107"/>
            <!-- star badge -->
            <circle cx="44" cy="7" r="6" fill="#1a1a1a"/>
            <circle cx="44" cy="7" r="5" fill="none" stroke="#ffc107" stroke-width="1"/>
            <text x="44" y="10.5" text-anchor="middle" font-size="7" fill="#ffc107" font-family="Arial" font-weight="bold">★</text>
            <!-- flag right edge wave -->
            <path d="M49 2 Q52 8 49 15 Q52 22 49 30" stroke="rgba(0,0,0,0.1)" stroke-width="1" fill="none"/>
          </svg>`
        )}`,
        scaledSize: new google.maps.Size(52, 64),
        anchor: new google.maps.Point(7, 64),
      } : {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
            <!-- shadow -->
            <ellipse cx="6" cy="52" rx="5" ry="1.8" fill="rgba(0,0,0,0.18)"/>
            <!-- pole -->
            <rect x="4" y="2" width="3.5" height="49" rx="1.8" fill="#d4d4d4"/>
            <rect x="4" y="2" width="1.8" height="49" rx="1.8" fill="#f0f0f0"/>
            <!-- flag body -->
            <rect x="8" y="2" width="34" height="24" rx="4" fill="#0d6efd"/>
            <!-- top accent stripe -->
            <rect x="8" y="2" width="34" height="7" rx="4" fill="#4d94ff"/>
            <rect x="8" y="7" width="34" height="2" fill="#4d94ff"/>
            <!-- depth overlay -->
            <rect x="8" y="2" width="34" height="24" rx="4" fill="url(#pvg)" opacity="0.2"/>
            <defs>
              <linearGradient id="pvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="white"/>
                <stop offset="100%" stop-color="black"/>
              </linearGradient>
            </defs>
            <!-- medical cross vertical -->
            <rect x="22" y="7" width="5.5" height="13" rx="1.5" fill="white"/>
            <!-- medical cross horizontal -->
            <rect x="16.5" y="11" width="16" height="5" rx="1.5" fill="white"/>
            <!-- center circle -->
            <circle cx="24.5" cy="13.5" r="2.5" fill="#0d6efd"/>
            <!-- pulse ring -->
            <circle cx="24.5" cy="13.5" r="4.5" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
            <!-- Rx badge -->
            <circle cx="37" cy="6.5" r="5" fill="#0a3d91"/>
            <circle cx="37" cy="6.5" r="4" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
            <text x="37" y="9.5" text-anchor="middle" font-size="6" fill="white" font-family="Arial" font-weight="bold">Rx</text>
            <!-- flag right edge wave -->
            <path d="M42 2 Q45 7 42 13 Q45 19 42 26" stroke="rgba(0,0,0,0.1)" stroke-width="1" fill="none"/>
          </svg>`
        )}`,
        scaledSize: new google.maps.Size(44, 54),
        anchor: new google.maps.Point(5.5, 54),
      },
    });
    marker.addListener('click', () => {
      infoWindowRef.current.setContent(popupHtml);
      infoWindowRef.current.open({ map, anchor: marker });
    });
    clinicMarkersRef.current.push(marker);
  });
}, [clinics, mapReady]);

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
  const glassBtn = {
    width: '40px', height: '40px', border: 'none',
    background: 'rgba(255,255,255,0.12)', color: '#fff',
    backdropFilter: 'blur(6px)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.9rem',
  };

  const filteredCount = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return r.latitude && r.longitude;
  }).length;

  const btnStyle = (active, color) => ({
    padding: '0.4rem 1rem',
    borderRadius: '20px',
    border: `2px solid ${active ? color : 'rgba(255,255,255,0.3)'}`,
    background: active ? color : 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(6px)',
    color: active ? (color === '#ffc107' ? '#1a1a1a' : '#fff') : '#ffffff',
    fontWeight: '600',
    fontSize: '0.78rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  });

  return (
    <>
      <style>{LEAFLET_CSS}</style>
      <style>{`
        @keyframes dropDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .map-overlay-header { pointer-events: none; }
        .map-overlay-header button, .map-overlay-header span { pointer-events: auto; }
        .map-fullscreen { position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:10002 !important;border-radius:0 !important;margin:0 !important;zoom:1.333 !important; }
        .dashboard-page {
          zoom: 0.75;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } }
        @media (min-width: 1920px) { .dashboard-page { zoom: 1; } }

        @media (max-width: 768px) {
          .mobile-map-title { font-size: 1.5rem !important; }
        }
      `}</style>
      <Container fluid className="py-4 dashboard-page" style={{ background: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex align-items-center gap-3">
              <i className="fas fa-map-marked-alt" style={{ fontSize: '1.5rem', color: '#1a1a1a', animation: 'float 3s ease-in-out infinite' }}></i>
              <div>
                <h2 className="mobile-map-title" style={{ fontWeight: '700', color: '#333', fontSize: '1.9rem', marginBottom: 0 }}>Map Status</h2>
                <small style={{ color: '#888', fontWeight: '500' }}>Muntinlupa City — Active Rabies Cases & Vet Clinics</small>
              </div>
            </div>
          </Col>
          
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}
            style={{ borderRadius: '12px', border: '2px solid #dc3545', marginBottom: '1.5rem' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>{error}
          </Alert>
        )}

        

        {/* Map + Legend */}
        <Row className="g-3" style={{ animation: 'dropDown 0.4s ease-out 0.2s backwards', flex: '1 1 auto' }}>

          {/* Legend */}
          <Col lg={3} order={2} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', order: undefined, minHeight: '640px' }} className="order-2 order-lg-1">

            {/* Safety Info */}
            <Card className="border-0" style={{ borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden', background: '#fff', flex: '1 1 auto' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '1rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-shield-alt" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
                  <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.95rem' }}>Safety Information</span>
                </div>
              </div>
              <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { color: '#e00000', border: 'solid', label: '1km Danger Zone', desc: 'Positive rabies confirmed nearby. Keep pets indoors.' },
                  { color: '#f0c800', border: 'dashed', label: '1km Alert Zone', desc: 'Suspected rabies case nearby. Monitor pets closely.' },
                ].map(z => (
                  <div key={z.label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '12px', borderRadius: '4px', border: `2px ${z.border} ${z.color}`, background: z.color + '18', flexShrink: 0, marginTop: '3px' }} />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#333' }}>{z.label}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px', lineHeight: '1.5' }}>{z.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Legend */}
            <Card className="border-0" style={{ borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', background: '#fff', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '1rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-map-pin" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
                  <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.88rem' }}>Map Legend</span>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[
                  { color: '#e00000', emoji: '☣️', label: 'Positive Rabies' },
                  { color: '#f0c800', emoji: '⚠️', label: 'Suspected Rabies' },
                  { color: '#ffc107', icon: 'fa-hospital', label: 'City Vet Office' },
                  { color: '#0d6efd', icon: 'fa-hospital', label: 'Private Clinic' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 8px ${l.color}55`, fontSize: l.emoji ? '1rem' : undefined }}>
                      {l.emoji ? l.emoji : <i className={`fas ${l.icon}`} style={{ fontSize: '13px', color: '#fff' }}></i>}
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#444' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tips */}
            <Card className="border-0" style={{ borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', background: '#fff', overflow: 'hidden', flex: '1 1 auto' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '1rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-lightbulb" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
                  <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.95rem' }}>Pet Safety Tips</span>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { icon: 'fa-syringe',       tip: 'Keep your pet\'s rabies vaccination up to date.' },
                  { icon: 'fa-home',           tip: 'Keep pets indoors if a danger zone is nearby.' },
                  { icon: 'fa-hospital',       tip: 'Visit the nearest vet clinic if your pet is bitten.' },
                  { icon: 'fa-phone',          tip: 'Report animal bites to the City Vet immediately.' },
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(255,193,7,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <i className={`fas ${t.icon}`} style={{ fontSize: '0.7rem', color: '#ffc107' }}></i>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.6', fontWeight: '500' }}>{t.tip}</span>
                  </div>
                ))}
              </div>
            </Card>

          </Col>

          {/* Map */}
          <Col lg={9} className="order-1 order-lg-2" style={{ display: 'flex', flexDirection: 'column' }}>
            <Card className={`border-0 ${isFullscreen ? 'map-fullscreen' : ''}`}
              style={{ position: 'relative', minHeight: isFullscreen ? undefined : '640px', borderRadius: isFullscreen ? '0' : '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', overflow: 'hidden', flex: '1 1 auto', display: 'flex', flexDirection: 'column', ...(isFullscreen && { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10002, zoom: '1.333' }) }}>

              {/* Map header */}
              <div className="map-overlay-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, background: 'transparent', padding: isFullscreen ? '0.5rem 1rem' : '0.9rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <i className="fas fa-map" style={{ color: '#ffc107', fontSize: '1rem' }}></i>
                    <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.95rem', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>Rabies Activity Map</span>
                    <span style={{ background: 'rgba(255,193,7,0.2)', color: '#ffd54f', padding: '2px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700' }}>
                      {loading ? '...' : `${filteredCount} active cases`}
                    </span>
                  </div>
                  <button
                    onClick={() => {
  setIsFullscreen(f => !f);
  setTimeout(() => {
    if (mapInstanceRef.current && window.google) {
      window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
    }
  }, 300);
}}
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(6px)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseOut={e  => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.82rem', color: '#ffffff' }}></i>
                  </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { v: 'all',              label: 'All Cases',       color: '#ffc107', emoji: '🗺️' },
                    { v: 'positive_rabies',  label: 'Positive Rabies', color: '#e00000', emoji: '☣️' },
                    { v: 'suspected_rabies', label: 'Suspected Rabies',color: '#f0c800', emoji: '⚠️' },
                  ].map(f => (
                    <button key={f.v} onClick={() => setFilterStatus(f.v)} style={btnStyle(filterStatus === f.v, f.color)}>
                      <span>{f.emoji}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Map container */}
              <div style={{ position: 'absolute', inset: 0 }}>
                {loading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <Spinner animation="border" style={{ color: '#ffc107', width: '2.5rem', height: '2.5rem', borderWidth: '3px' }} />
                    <span style={{ fontWeight: '600', color: '#555' }}>Loading map data...</span>
                  </div>
                )}
                <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

                {/* Custom glass controls */}
                <div style={{ position: 'absolute', right: 14, bottom: 34, zIndex: 5, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <button onClick={recenter} title="Recenter map" style={glassBtn}><i className="fas fa-crosshairs"></i></button>
                  </div>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <button onClick={() => zoomBy(1)} title="Zoom in" style={glassBtn}><i className="fas fa-plus"></i></button>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.3)' }} />
                    <button onClick={() => zoomBy(-1)} title="Zoom out" style={glassBtn}><i className="fas fa-minus"></i></button>
                  </div>
                </div>
              </div>

            </Card>
          </Col>
        </Row>

      </Container>
    </>
  );
}