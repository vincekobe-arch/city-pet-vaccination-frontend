import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { reportsAPI, clinicAPI, handleAPIError } from '../../services/api';

const LEAFLET_CSS = `
  .leaflet-container { font-family: 'Segoe UI', sans-serif; }
  .custom-report-icon { background: none !important; border: none !important; }
  .report-marker {
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: 3px solid white;
    box-shadow: 0 4px 14px rgba(0,0,0,0.38), 0 0 0 2px rgba(0,0,0,0.08);
    cursor: pointer; transition: transform 0.2s;
    width: 40px; height: 40px; overflow: hidden;
  }
  .report-marker:hover { transform: scale(1.22); }
  .marker-rabies    { background: linear-gradient(135deg,#ff4444,#cc0000); }
  .marker-suspected { background: linear-gradient(135deg,#ffcc00,#e6a800); }
  .leaflet-popup-content-wrapper {
    border-radius: 16px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
    border: none !important; padding: 0 !important; overflow: hidden;
  }
  .leaflet-popup-content { margin: 0 !important; }
  .leaflet-popup-tip-container { display: none; }
  .radius-label {
    background: transparent !important; border: none !important;
    box-shadow: none !important; font-weight: 700; font-size: 0.72rem;
    color: #333; text-align: center;
  }
`;

const MUNTINLUPA_CENTER = [14.4081, 121.0415];
const MUNTINLUPA_BOUNDS = [[14.34, 120.97], [14.50, 121.12]];

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

  const [reports,       setReports]       = useState([]);
  const [clinics,       setClinics]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [stats,         setStats]         = useState({ positive_rabies: 0, suspected_rabies: 0, clinics: 0 });

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
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
    const L   = window.L;
    const map = L.map(mapRef.current, {
      center: MUNTINLUPA_CENTER, zoom: 13,
      minZoom: 12, maxZoom: 22,
      maxBounds: MUNTINLUPA_BOUNDS, maxBoundsViscosity: 0.7,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 22, maxNativeZoom: 19,
    }).addTo(map);
    const style = document.createElement('style');
    style.innerHTML = `.leaflet-control-attribution { background: rgba(0,0,0,0.45) !important; color: #aaa !important; font-size: 0.62rem !important; padding: 2px 6px !important; border-radius: 4px 0 0 0 !important; } .leaflet-control-attribution a { color: #ccc !important; }`;
    document.head.appendChild(style);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const boundary = [
      [14.4700,121.0200],[14.4650,121.0500],[14.4550,121.0700],[14.4400,121.0800],
      [14.4200,121.0750],[14.4000,121.0700],[14.3800,121.0600],[14.3600,121.0450],
      [14.3550,121.0250],[14.3650,121.0050],[14.3850,120.9980],[14.4050,120.9950],
      [14.4300,121.0000],[14.4550,121.0050],[14.4700,121.0200],
    ];
    L.polygon(boundary, { color: '#ffc107', weight: 2.5, opacity: 0.8, fillColor: '#ffc107', fillOpacity: 0, dashArray: '6,4' }).addTo(map);
    mapInstanceRef.current = map;
  }, [leafletLoaded]);

  // Render report markers + danger circles
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(m => map.removeLayer(m));
    circlesRef.current.forEach(c => map.removeLayer(c));
    markersRef.current = [];
    circlesRef.current = [];

    const filtered = reports.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      return r.latitude && r.longitude;
    });

    // Draw danger/alert circles (same dedup logic as admin)
    const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const sortedRabies = [...filtered].sort((a,b) => {
      if (a.status==='positive_rabies' && b.status!=='positive_rabies') return -1;
      if (b.status==='positive_rabies' && a.status!=='positive_rabies') return 1;
      return 0;
    });

    const circleOwners = [];
    sortedRabies.forEach(report => {
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const isWithin = circleOwners.some(owner => {
        if (owner.status === 'positive_rabies') return getDistanceMeters(lat, lng, owner.lat, owner.lng) <= 1000;
        if (owner.status === 'suspected_rabies' && report.status === 'suspected_rabies') return getDistanceMeters(lat, lng, owner.lat, owner.lng) <= 1000;
        return false;
      });
      if (!isWithin) circleOwners.push({ lat, lng, status: report.status });
    });

    circleOwners.forEach(owner => {
      const isPos = owner.status === 'positive_rabies';
      const circle = L.circle([owner.lat, owner.lng], {
        radius: 1000,
        color: isPos ? '#e00000' : '#f0c800', weight: 2.5, opacity: 0.85,
        fillColor: isPos ? '#e00000' : '#f0c800',
        fillOpacity: isPos ? 0.12 : 0.10,
        dashArray: isPos ? null : '6,4',
      }).addTo(map);
      const labelIcon = L.divIcon({
        className: 'radius-label',
        html: `<div style="background:${isPos?'rgba(220,0,0,0.85)':'rgba(220,180,0,0.9)'};color:#fff;padding:3px 8px;border-radius:10px;font-size:0.7rem;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">1 km ${isPos?'⚠️ Danger Zone':'🔍 Alert Zone'}</div>`,
        iconAnchor: [40, 10],
      });
      const lm = L.marker([owner.lat + 0.0085, owner.lng], { icon: labelIcon, interactive: false }).addTo(map);
      circlesRef.current.push(circle, lm);
    });

    // Draw markers
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

      const icon = L.divIcon({
        className: 'custom-report-icon',
        html: `
          <div style="position:relative;width:28px;height:36px;display:flex;flex-direction:column;align-items:center;">
            <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <div style="transform:rotate(45deg);font-size:12px;">${emoji}</div>
            </div>
            <div style="width:3px;height:8px;background:rgba(0,0,0,0.25);border-radius:0 0 3px 3px;margin-top:-1px;"></div>
          </div>`,
        iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -38],
      });

      const popupHtml = `
        <div style="width:200px;font-family:'Segoe UI',sans-serif;overflow:hidden;">
          <div style="background:${bgColor};padding:0.65rem 0.85rem;">
            <div style="font-size:1.2rem;margin-bottom:0.3rem;">${emoji}</div>
            <div style="color:${txtColor};font-weight:700;font-size:0.78rem;">${label}</div>
            <div style="color:${isPos ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)'};font-size:0.62rem;margin-top:2px;">
              Reported ${new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <div style="padding:0.65rem 0.85rem;background:#fff;">
            <div style="margin-bottom:0.4rem;">
              <div style="font-size:0.58rem;color:#aaa;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Barangay</div>
              <div style="font-size:0.75rem;color:#222;font-weight:600;margin-top:2px;">${report.barangay_name || 'Not specified'}</div>
            </div>
            <div style="margin-top:0.5rem;padding:0.35rem 0.5rem;background:${isPos ? '#ffe6e6' : '#fffbe6'};border-radius:6px;border-left:3px solid ${color};font-size:0.65rem;font-weight:700;color:${isPos ? '#8b0000' : '#7a6000'};">
              ${isPos ? '⚠️ Stay alert — danger zone within 1km' : '🔍 Alert zone — monitor pets nearby'}
            </div>
          </div>
        </div>`;

      const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupHtml, { maxWidth: 220, minWidth: 200 });
      markersRef.current.push(marker);
    });
  }, [reports, filterStatus, leafletLoaded]);

  // Render clinic markers
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = mapInstanceRef.current;

    clinicMarkersRef.current.forEach(m => map.removeLayer(m));
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

    [...[cityVet], ...clinics].forEach(clinic => {
      const lat = parseFloat(clinic.latitude);
      const lng = parseFloat(clinic.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isCityVet = clinic.id === 'cityvet';

      const icon = L.divIcon({
        className: 'custom-report-icon',
        html: isCityVet ? `
          <div style="position:relative;width:48px;height:58px;display:flex;flex-direction:column;align-items:center;">
            <div style="position:absolute;top:-6px;left:-6px;width:60px;height:60px;border-radius:50%;border:3px solid rgba(255,193,7,0.5);animation:cityvet-pulse 2s ease-out infinite;"></div>
            <div style="width:44px;height:44px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#ffc107,#ff8c00);border:3px solid white;box-shadow:0 4px 16px rgba(255,193,7,0.7);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;z-index:1;">
              <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                <i class="fas fa-hospital" style="font-size:17px;color:#fff;"></i>
              </div>
            </div>
            <div style="width:4px;height:10px;background:rgba(255,140,0,0.6);border-radius:0 0 4px 4px;margin-top:-1px;position:relative;z-index:1;"></div>
          </div>
          <style>@keyframes cityvet-pulse{0%{transform:scale(0.9);opacity:0.8}70%{transform:scale(1.4);opacity:0}100%{transform:scale(0.9);opacity:0}}</style>` : `
          <div style="position:relative;width:32px;height:40px;display:flex;flex-direction:column;align-items:center;">
            <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#0d6efd,#0a58ca);border:2.5px solid white;box-shadow:0 3px 10px rgba(13,110,253,0.5);display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                <i class="fas fa-hospital" style="font-size:13px;color:#fff;"></i>
              </div>
            </div>
            <div style="width:3px;height:8px;background:rgba(13,110,253,0.4);border-radius:0 0 3px 3px;margin-top:-1px;"></div>
          </div>`,
        iconSize:    isCityVet ? [48, 58] : [32, 40],
        iconAnchor:  isCityVet ? [24, 58] : [16, 40],
        popupAnchor: [0, isCityVet ? -60 : -42],
      });

      const popupHtml = `
        <div style="width:210px;font-family:'Segoe UI',sans-serif;overflow:hidden;">
          <div style="background:${isCityVet ? 'linear-gradient(135deg,#ffc107,#ff8c00)' : 'linear-gradient(135deg,#0d6efd,#0a58ca)'};padding:0.65rem 0.85rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
              <div style="width:28px;height:28px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas fa-hospital" style="font-size:13px;color:#fff;"></i>
              </div>
              <div>
                <div style="color:${isCityVet ? '#1a1a1a' : '#fff'};font-weight:700;font-size:0.75rem;line-height:1.2;">${clinic.clinic_name}</div>
                <div style="color:${isCityVet ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)'};font-size:0.6rem;">${isCityVet ? 'Government Veterinary Office' : (clinic.clinic_code || '')}</div>
              </div>
            </div>
            <span style="display:inline-block;background:rgba(255,255,255,0.2);color:${isCityVet ? '#1a1a1a' : '#fff'};padding:1px 8px;border-radius:20px;font-size:0.6rem;font-weight:700;">
              🏥 ${isCityVet ? 'City Government Clinic' : 'Private Clinic'}
            </span>
          </div>
          <div style="padding:0.65rem 0.85rem;background:#fff;display:flex;flex-direction:column;gap:0.4rem;">
            ${clinic.owner_name ? `<div><div style="font-size:0.58rem;color:#aaa;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Veterinarian</div><div style="font-size:0.72rem;color:#222;font-weight:600;margin-top:1px;">${isCityVet ? clinic.owner_name : 'Dr. ' + clinic.owner_name}</div></div>` : ''}
            <div style="display:flex;gap:0.35rem;margin-top:0.2rem;">
              ${clinic.phone ? `<div style="flex:1;background:#f8f9fa;padding:0.28rem 0.4rem;border-radius:5px;border:1px solid #eee;"><div style="font-size:0.54rem;color:#aaa;font-weight:700;text-transform:uppercase;">Phone</div><div style="font-size:0.65rem;color:#333;font-weight:600;margin-top:1px;">${clinic.phone}</div></div>` : ''}
              ${clinic.specialization ? `<div style="flex:1;background:#e8f0fe;padding:0.28rem 0.4rem;border-radius:5px;border:1px solid #c5d8fc;"><div style="font-size:0.54rem;color:#5577aa;font-weight:700;text-transform:uppercase;">Specialty</div><div style="font-size:0.62rem;color:#0d6efd;font-weight:700;margin-top:1px;">${clinic.specialization}</div></div>` : ''}
            </div>
          </div>
        </div>`;

      const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupHtml, { maxWidth: 230, minWidth: 210 });
      clinicMarkersRef.current.push(marker);
    });
  }, [clinics, leafletLoaded]);

  const filteredCount = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return r.latitude && r.longitude;
  }).length;

  const btnStyle = (active, color) => ({
    padding: '0.4rem 1rem',
    borderRadius: '20px',
    border: `2px solid ${active ? color : 'rgba(0,0,0,0.12)'}`,
    background: active ? color : 'rgba(0,0,0,0.04)',
    color: active ? (color === '#ffc107' ? '#1a1a1a' : '#fff') : '#555555',
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
        .map-fullscreen { position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:10002 !important;border-radius:0 !important;margin:0 !important;zoom:1.333 !important; }
        @media (max-width: 768px) {
          .mobile-map-title { font-size: 1.5rem !important; }
        }
      `}</style>
      <Container fluid className="py-4" style={{ background: '#ffffff', minHeight: '100vh', zoom: '0.75' }}>

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
        <Row className="g-3" style={{ animation: 'dropDown 0.4s ease-out 0.2s backwards' }}>

          {/* Legend */}
          <Col lg={3} order={2} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', order: undefined }} className="order-2 order-lg-1">

            {/* Safety Info */}
            <Card className="border-0" style={{ borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden', background: '#fff' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '1rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-shield-alt" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
                  <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.88rem' }}>Safety Information</span>
                </div>
              </div>
              <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { color: '#e00000', border: 'solid', label: '1km Danger Zone', desc: 'Positive rabies confirmed nearby. Keep pets indoors.' },
                  { color: '#f0c800', border: 'dashed', label: '1km Alert Zone',  desc: 'Suspected rabies case nearby. Monitor pets closely.' },
                ].map(z => (
                  <div key={z.label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '12px', borderRadius: '4px', border: `2px ${z.border} ${z.color}`, background: z.color + '18', flexShrink: 0, marginTop: '3px' }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#333' }}>{z.label}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '1px', lineHeight: '1.4' }}>{z.desc}</div>
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
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#444' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tips */}
            <Card className="border-0" style={{ borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', background: '#fff', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '1rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-lightbulb" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
                  <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.88rem' }}>Pet Safety Tips</span>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                    <span style={{ fontSize: '0.75rem', color: '#555', lineHeight: '1.5', fontWeight: '500' }}>{t.tip}</span>
                  </div>
                ))}
              </div>
            </Card>

          </Col>

          {/* Map */}
          <Col lg={9} className="order-1 order-lg-2">
            <Card className={`border-0 ${isFullscreen ? 'map-fullscreen' : ''}`}
              style={{ borderRadius: isFullscreen ? '0' : '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', ...(isFullscreen && { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10002, zoom: '1.333' }) }}>

              {/* Map header */}
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: isFullscreen ? '0.5rem 1rem' : '0.9rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <i className="fas fa-map" style={{ color: '#ffc107', fontSize: '1rem' }}></i>
                    <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.95rem' }}>Rabies Activity Map</span>
                    <span style={{ background: 'rgba(255,193,7,0.15)', color: '#b38600', padding: '2px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700' }}>
                      {loading ? '...' : `${filteredCount} active cases`}
                    </span>
                  </div>
                  <button
                    onClick={() => { setIsFullscreen(f => !f); setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300); }}
                    style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                    onMouseOut={e  => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.82rem', color: '#333333' }}></i>
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
              <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                {loading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <Spinner animation="border" style={{ color: '#ffc107', width: '2.5rem', height: '2.5rem', borderWidth: '3px' }} />
                    <span style={{ fontWeight: '600', color: '#555' }}>Loading map data...</span>
                  </div>
                )}
                <div ref={mapRef} style={{ height: isFullscreen ? 'calc(100vh - 110px)' : '100%', minHeight: isFullscreen ? 'unset' : '530px', width: '100%' }} />
              </div>

            </Card>
          </Col>
        </Row>

      </Container>
    </>
  );
}