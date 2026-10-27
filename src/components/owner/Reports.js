import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table } from 'react-bootstrap';
import { barangayAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import VerifyAccountModal from '../owner/VerifyAccountModal';


// ─── Owner API ────────────────────────────────────────────────────────────────
const ownerAPI = {
  getByUserId: (userId) => api.get(`/owners/user/${userId}`),
};

const VERIFICATION_CONFIG = {
  not_verified:  { label: 'Not Verified',   color: '#dc3545', icon: 'fa-times-circle' },
  pending:       { label: 'Pending Review', color: '#fd7e14', icon: 'fa-hourglass-half' },
  semi_verified: { label: 'Semi Verified',  color: '#0d6efd', icon: 'fa-shield-alt' },
  fully_verified:{ label: 'Fully Verified', color: '#198754', icon: 'fa-check-circle' },
};

// Reports API (add this to your api.js as well - see reportsAPI export below)
const reportsAPI = {
  getAll:       ()     => api.get('/reports'),
  getMyReports: ()     => api.get('/reports/my-reports'),
  getById:      (id)   => api.get(`/reports/show/${id}`),
  create:       (data) => api.post('/reports/create', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete:       (id)   => api.delete(`/reports/delete/${id}`),
};

const REPORT_TYPES = [
  { value: 'rabies_case',   label: 'Rabies Case',   img: '/rabies.png',        color: '#dc3545', bg: 'rgba(220,53,69,0.08)',    activeBg: '#fff0f0' },
  { value: 'animal_bite',   label: 'Animal Bite',   img: '/animal_bite.png',   color: '#fd7e14', bg: 'rgba(253,126,20,0.08)',   activeBg: '#fff5ee' },
  { value: 'animal_rescue', label: 'Animal Rescue', img: '/animal_rescue.png', color: '#0d6efd', bg: 'rgba(13,110,253,0.08)',   activeBg: '#eef3ff' },
  { value: 'others',        label: 'Others',        img: '/others.png',        color: '#6c757d', bg: 'rgba(108,117,125,0.08)',  activeBg: '#f5f5f5' },
];

const getStatusBadge = (status) => {
  const config = {
    pending:          { label: 'Pending',          color: '#ffffff', bg: '#ffc107', border: '#e0a800' },
    suspected_rabies: { label: 'Suspected Rabies', color: '#ffffff', bg: '#dc3545', border: '#b02a37' },
    positive_rabies:  { label: 'Positive Rabies',  color: '#ffffff', bg: '#6f0000', border: '#4a0000' },
    ongoing:          { label: 'Ongoing',           color: '#ffffff', bg: '#0dcaf0', border: '#0aaabf' },
    resolved:         { label: 'Resolved',          color: '#ffffff', bg: '#198754', border: '#146c43' },
    declined:         { label: 'Declined',          color: '#ffffff', bg: '#6c757d', border: '#565e64' },
  };
  const cfg = config[status] || { label: status || 'Unknown', color: '#fff', bg: '#6c757d', border: '#565e64' };
  return (
    <Badge style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontWeight: '600', fontSize: '0.75rem',
      padding: '0.35rem 0.65rem', borderRadius: '20px'
    }}>
      {cfg.label}
    </Badge>
  );
};

const getReportType = (value) => REPORT_TYPES.find(t => t.value === value) || REPORT_TYPES[3];
// ─── Load Leaflet from CDN (no npm install needed) ───
const LeafletMap = ({ lat, lng, onLocationSelect, onAddressResolve, onBarangayDetect, readOnly = false, onError }) => {
  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    setTimeout(() => mapObj.current && mapObj.current.invalidateSize(), 300);
  };

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link  = document.createElement('link');
    link.rel    = 'stylesheet';
    link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script    = document.createElement('script');
    script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload   = () => setReady(true);
    script.onerror  = () => setMapError('Failed to load map.');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    const defaultLat = lat || 14.4081;
    const defaultLng = lng || 121.0415;

    const muntinlupaBounds = window.L.latLngBounds(
      [14.3400, 120.9700],
      [14.5000, 121.1200]
    );

    const map = window.L.map(mapRef.current, {
      minZoom: 12,
      maxZoom: 22,
      maxBounds: muntinlupaBounds,
      maxBoundsViscosity: 0.7
    }).setView([defaultLat, defaultLng], 13);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 22,
      maxNativeZoom: 19
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = window.L.marker([lat, lng]).addTo(map);
    }

    const muntinlupaPolygonCoords = [
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
    const isInsideMuntinlupa = (lat, lng) => {
      if (lat < 14.351 || lat > 14.469 || lng < 120.989 || lng > 121.056) return false;
      let inside = false;
      for (let i = 0, j = muntinlupaPolygonCoords.length - 1; i < muntinlupaPolygonCoords.length; j = i++) {
        const xi = muntinlupaPolygonCoords[i][0], yi = muntinlupaPolygonCoords[i][1];
        const xj = muntinlupaPolygonCoords[j][0], yj = muntinlupaPolygonCoords[j][1];
        const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    if (!readOnly) {
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        let pinLat = clickLat;
        let pinLng = clickLng;
        if (!isInsideMuntinlupa(clickLat, clickLng)) {
          // Snap to nearest polygon point
          let minDist = Infinity;
          muntinlupaPolygonCoords.forEach(([pLat, pLng]) => {
            const dist = Math.pow(clickLat - pLat, 2) + Math.pow(clickLng - pLng, 2);
            if (dist < minDist) { minDist = dist; pinLat = pLat; pinLng = pLng; }
          });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([pinLat, pinLng]);
        } else {
          markerRef.current = window.L.marker([pinLat, pinLng]).addTo(map);
        }
        onLocationSelect && onLocationSelect(pinLat, pinLng);
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pinLat}&lon=${pinLng}&zoom=17&addressdetails=1`)
          .then(r => r.json())
          .then(data => {
            const plusCode = data.extratags?.['ref:Global'] || data.extratags?.plus_code || null;
            const display  = plusCode ? `${plusCode} ${data.address?.city || 'Muntinlupa'}, ${data.address?.state || 'Metro Manila'}` : (data.display_name || '');
            onAddressResolve && onAddressResolve(display, plusCode, pinLat, pinLng);
            const suburb   = (data.address?.suburb   || '').toLowerCase();
            const village  = (data.address?.village  || '').toLowerCase();
            const quarter  = (data.address?.quarter  || '').toLowerCase();
            const neighbourhood = (data.address?.neighbourhood || '').toLowerCase();
            const addrStr  = `${suburb} ${village} ${quarter} ${neighbourhood}`;
            onBarangayDetect && onBarangayDetect(addrStr);
          })
          .catch(() => {});
        
      });
    }

    const boundary = [
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
    window.L.polygon(boundary, {
      color: '#ffc107', weight: 2.5, opacity: 0.8,
      fillColor: '#ffc107', fillOpacity: 0, dashArray: '6,4',
    }).addTo(map);

    mapObj.current = map;
    setTimeout(() => map.invalidateSize(), 300);
    return () => { map.remove(); mapObj.current = null; markerRef.current = null; };
  // eslint-disable-next-line
  }, [ready]);

  useEffect(() => {
    if (!mapObj.current || !lat || !lng) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = window.L.marker([lat, lng]).addTo(mapObj.current);
    }
  }, [lat, lng]);

  if (mapError) return (
    <div style={{ background:'#fff3f3', borderRadius:'8px', padding:'1rem', color:'#dc3545', fontSize:'0.9rem' }}>
      <i className="fas fa-exclamation-triangle me-2"></i>{mapError}
    </div>
  );

  

  return (
    <div style={{
      position: isFullscreen ? 'fixed' : 'relative',
      inset: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto',
      background: isFullscreen ? '#fff' : 'transparent',
      padding: isFullscreen ? '1rem' : 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {!ready && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f9fa', borderRadius:'8px', zIndex:1 }}>
          <Spinner animation="border" size="sm" style={{ color:'#ffc107' }} />
          <span className="ms-2" style={{ fontSize:'0.9rem', color:'#666' }}>Loading map...</span>
        </div>
      )}

      {/* Maximize / Minimize Button */}
      <button
        type="button"
        onClick={toggleFullscreen}
        style={{
          position: 'absolute', top: isFullscreen ? '1.75rem' : '10px', right: isFullscreen ? '1.75rem' : '10px',
          zIndex: 1000, background: '#ffffff', border: '2px solid #dee2e6',
          borderRadius: '8px', width: '34px', height: '34px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#ffc107'; e.currentTarget.style.background = '#fff9e6'; }}
        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.background = '#ffffff'; }}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.8rem', color: '#555' }}></i>
      </button>

      <div ref={mapRef} style={{
        height: isFullscreen ? '100%' : (readOnly ? '250px' : '400px'),
        width: '100%',
        aspectRatio: isFullscreen ? 'auto' : (readOnly ? 'auto' : '1 / 1'),
        borderRadius: '8px',
        border: '2px solid #dee2e6',
        flex: isFullscreen ? 1 : 'auto',
      }} />

      {!readOnly && (
        <>
          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords;
                  const muntinlupaPolygonCoords = [
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
                  const isInsideMuntinlupa = (lat, lng) => {
                    if (lat < 14.351 || lat > 14.469 || lng < 120.989 || lng > 121.056) return false;
                    let inside = false;
                    for (let i = 0, j = muntinlupaPolygonCoords.length - 1; i < muntinlupaPolygonCoords.length; j = i++) {
                      const xi = muntinlupaPolygonCoords[i][0], yi = muntinlupaPolygonCoords[i][1];
                      const xj = muntinlupaPolygonCoords[j][0], yj = muntinlupaPolygonCoords[j][1];
                      const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
                      if (intersect) inside = !inside;
                    }
                    return inside;
                  };
                  if (!isInsideMuntinlupa(latitude, longitude)) {
                    onError && onError('Your current location is outside Muntinlupa City. Only locations within Muntinlupa can be pinned.');
                    return;
                  }
                  if (mapObj.current) {
                    mapObj.current.setView([latitude, longitude], 16);
                    if (markerRef.current) {
                      markerRef.current.setLatLng([latitude, longitude]);
                    } else {
                      markerRef.current = window.L.marker([latitude, longitude]).addTo(mapObj.current);
                    }
                    onLocationSelect && onLocationSelect(latitude, longitude);
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=17&addressdetails=1`)
                      .then(r => r.json())
                      .then(data => {
                        const plusCode = data.extratags?.['ref:Global'] || data.extratags?.plus_code || null;
                        const display  = plusCode ? `${plusCode} ${data.address?.city || 'Muntinlupa'}, ${data.address?.state || 'Metro Manila'}` : (data.display_name || '');
                        onAddressResolve && onAddressResolve(display, plusCode);
                        const suburb   = (data.address?.suburb   || '').toLowerCase();
                        const village  = (data.address?.village  || '').toLowerCase();
                        const quarter  = (data.address?.quarter  || '').toLowerCase();
                        const neighbourhood = (data.address?.neighbourhood || '').toLowerCase();
                        const addrStr  = `${suburb} ${village} ${quarter} ${neighbourhood}`;
                        onBarangayDetect && onBarangayDetect(addrStr);
                      })
                      .catch(() => {});
                  }
                },
                () => onError && onError('Unable to retrieve your location. Please allow location access and try again.')
              );
            }}
            style={{
              position: 'absolute', bottom: '38px', right: '10px', zIndex: 1000,
              background: '#ffffff', border: '2px solid #dee2e6',
              borderRadius: '8px', width: '34px', height: '34px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#ffc107'; e.currentTarget.style.background = '#fff9e6'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.background = '#ffffff'; }}
            title="Use my current location"
          >
            <i className="fas fa-location-arrow" style={{ fontSize: '0.8rem', color: '#555' }}></i>
          </button>
          <small style={{ display:'block', marginTop:'0.4rem', color:'#888', fontSize:'0.78rem' }}>
            <i className="fas fa-mouse-pointer me-1"></i>Click on the map to pin the exact location
          </small>
        </>
      )}
    </div>
  );
};

const WaveDots = ({ color = '#000000' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '1rem' }}>
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
  </span>
);

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Image upload states
  const [imageFiles, setImageFiles]     = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Map / location states
  const [formLat, setFormLat] = useState(null);
  const [formLng, setFormLng] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    report_type: '',
    barangay_id: '',
    address: '',
    phone_number: '',
    description: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
const [lightboxZoom, setLightboxZoom] = useState(1);

  // Verification states
  const [ownerProfile, setOwnerProfile]           = useState(null);
  const [verifLoading, setVerifLoading]           = useState(true);
  const [showVerifyModal, setShowVerifyModal]     = useState(false);
  const [showVerifyGate, setShowVerifyGate]       = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const styles = `
    @keyframes dropDown {
      0% { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes waveDots {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    @media (max-width: 768px) {
      .mobile-page-title { font-size: 1.5rem !important; }
      .report-pagination span,
      .report-pagination button {
        font-size: 0.75rem !important;
        padding: 0.35rem 0.55rem !important;
        min-width: 32px !important;
      }
      .report-pagination .page-info {
        font-size: 0.75rem !important;
      }
      .mobile-register-btn {
        padding: 0.5rem 1rem !important;
        font-size: 0.78rem !important;
        border-radius: 8px !important;
      }
      .mobile-register-btn i {
        margin-right: 0 !important;
      }

      /* Report type cards matching Schedule event type cards in mobile */
      .event-type-scroll > div {
        min-width: 110px !important;
        padding: 0.75rem 0.5rem !important;
      }
      .event-type-scroll > div img {
        width: 32px !important;
        height: 32px !important;
      }
      .event-type-scroll > div div {
        font-size: 0.8rem !important;
      }
    }
  `;

  useEffect(() => {
    loadReports();
    loadBarangays();
    loadOwnerProfile();
    
  }, []);

  const loadOwnerProfile = async () => {
    try {
      setVerifLoading(true);
      // Get user_id from localStorage/auth
      const user = getUser();
      const res  = await ownerAPI.getByUserId(user.id);
      const owner = res.data.owner;
      setOwnerProfile(owner);
    } catch (err) {
      console.error('Failed to load owner profile:', err);
    } finally {
      setVerifLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getMyReports();
      setReports(response.data.reports || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadBarangays = async () => {
    try {
      const response = await barangayAPI.getAll();
      setBarangays(response.data.barangays || []);
    } catch (err) {
      console.error('Failed to load barangays:', err);
    }
  };

  const [formFieldErrors, setFormFieldErrors] = useState({});

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError('');

    if (name === 'phone_number') {
      setFormFieldErrors(prev => ({ ...prev, phone_number: value && !/^09\d{9}$/.test(value) ? 'Phone must be 11 digits starting with 09' : '' }));
    }
    // When address is typed manually, geocode it to move the map pin
    if (name === 'address' && value.trim().length > 5) {
      clearTimeout(window._addrGeoTimer);
      window._addrGeoTimer = setTimeout(() => {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value + ', Muntinlupa, Metro Manila')}&limit=1&addressdetails=1`)
          .then(r => r.json())
          .then(results => {
            if (results && results.length > 0) {
              const { lat, lon } = results[0];
              setFormLat(parseFloat(lat));
              setFormLng(parseFloat(lon));
            }
          })
          .catch(() => {});
      }, 800);
    }
  };

  const handleOpenSubmitModal = () => {
    setFormData({ report_type: '', barangay_id: '', address: '', phone_number: '', description: '' });
    setSubmitError('');
    setFormFieldErrors({});
    setImageFiles([]);
    setImagePreviews([]);
    setFormLat(null);
    setFormLng(null);
    setShowSubmitModal(true);
  };
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const MAX_IMAGES = 3;
    if (files.length + imageFiles.length > MAX_IMAGES) {
      setSubmitError(`You can only upload up to ${MAX_IMAGES} images.`);
      return;
    }
    const newFiles    = [...imageFiles, ...files].slice(0, MAX_IMAGES);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (index) => {
    const newFiles    = imageFiles.filter((_, i) => i !== index);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

 const handleSubmitReport = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError('');

    if (!formData.report_type)       { setSubmitError('Please select a report type.');    setSubmitLoading(false); return; }
    if (!formData.barangay_id)       { setSubmitError('Please select a barangay.');        setSubmitLoading(false); return; }
    if (!formData.address.trim())    { setSubmitError('Please enter your address.');       setSubmitLoading(false); return; }
    if (!formData.phone_number.trim()) { setSubmitError('Please enter a contact number.'); setSubmitLoading(false); return; }
    if (!/^09\d{9}$/.test(formData.phone_number)) { setSubmitError('Contact number must be 11 digits starting with 09.'); setSubmitLoading(false); return; }
    if (!formLat || !formLng) { setSubmitError('Please pin a location on the map before submitting.'); setSubmitLoading(false); return; }
    if (imageFiles.length === 0) { setSubmitError('Please attach at least one photo.'); setSubmitLoading(false); return; }

    try {
      const fd = new FormData();
      fd.append('report_type',  formData.report_type);
      fd.append('barangay_id',  formData.barangay_id);
      fd.append('address',      formData.address);
      fd.append('phone_number', formData.phone_number);
      fd.append('description',  formData.description);
      if (formLat) fd.append('latitude',  formLat);
      if (formLng) fd.append('longitude', formLng);
      imageFiles.forEach((file) => fd.append('images[]', file));

      await reportsAPI.create(fd);
      setSuccessMsg('Report submitted successfully! The admin will review it shortly.');
      await loadReports();
      setTimeout(() => { setShowSubmitModal(false); setSuccessMsg(''); }, 2500);
    } catch (err) {
      const { message } = handleAPIError(err);
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetails = async (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
    setShowDropdown(null);
  };

  const handleDeleteReport = (report) => {
    setSelectedReport(report);
    setShowDeleteModal(true);
    setShowDropdown(null);
  };

  const confirmDeleteReport = async () => {
    setDeleteLoading(true);
    try {
      await reportsAPI.delete(selectedReport.id);
      await loadReports();
      setShowDeleteModal(false);
      setSuccessMsg('Report has been withdrawn successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const isVerified = () => ownerProfile?.verification_status === 'fully_verified';
  const handleOpenSubmitModalGated = () => {
    if (!isVerified()) { setShowVerifyGate(true); return; }
    handleOpenSubmitModal();
  };

  const handleOpenVerifyModal = () => {
    setShowVerifyModal(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return 'Invalid date'; }
  };

  const getBarangayName = (id) => {
    const b = barangays.find(b => b.id === parseInt(id));
    return b ? b.name : 'Unknown';
  };

  const paginatedReports = reports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(reports.length / itemsPerPage);

  
  
  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="d-flex align-items-center" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                  <i className="fas fa-flag" style={{ fontSize: '1.5rem', color: '#000000', animation: 'float 3s ease-in-out infinite' }} />
                  <h2 className="mobile-page-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>My Reports</h2>
                  {/* Verification Status Badge */}
                  {!verifLoading && ownerProfile && (() => {
                    const cfg = VERIFICATION_CONFIG[ownerProfile.verification_status] || VERIFICATION_CONFIG.not_verified;
                    return (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.3rem 0.85rem', borderRadius:'999px', background: cfg.color + '18', border:`1.5px solid ${cfg.color}40`, fontSize:'0.78rem', fontWeight:'700', color: cfg.color }}>
                        <i className={`fas ${cfg.icon}`} style={{ fontSize:'0.75rem' }} />
                        {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                {/* Verify Account button — hidden when fully verified */}
                
                {/* Pending notice */}
                {!verifLoading && ownerProfile?.verification_status === 'pending' && (
                  <div style={{ marginTop:'0.5rem', fontSize:'0.8rem', color:'#856404', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                    <i className="fas fa-hourglass-half" />
                    Your ID is under review. We'll notify you once verified.
                  </div>
                )}
              </div>
              {!verifLoading && isVerified() && reports.length > 0 && (
                <Button
                  onClick={handleOpenSubmitModal}
                  className="border-0 mobile-register-btn"
                  style={{
                    background: '#ffc107', color: '#000000',
                    padding: '0.75rem 1.5rem', borderRadius: '12px',
                    fontWeight: '700', boxShadow: '0 4px 15px rgba(255, 193, 7, 0.4)',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)'; e.currentTarget.style.background = '#ffb300'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)'; e.currentTarget.style.background = '#ffc107'; }}
                >
                  <i className="fas fa-plus me-2"></i>
                  Submit Report
                </Button>
              )}
            </div>
          </Col>
        </Row>

        {/* Alerts */}
        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger" dismissible onClose={() => setError('')}
                style={{ borderRadius: '12px', border: '2px solid #dc3545', background: 'rgba(220, 53, 69, 0.1)', color: '#dc3545' }}>
                <i className="fas fa-exclamation-triangle me-2"></i>{error}
              </Alert>
            </Col>
          </Row>
        )}

        {successMsg && (
          <Row className="mb-4">
            <Col>
              <Alert variant="success" dismissible onClose={() => setSuccessMsg('')}
                style={{ borderRadius: '12px', border: '2px solid #198754', background: 'rgba(25, 135, 84, 0.1)', color: '#198754' }}>
                <i className="fas fa-check-circle me-2"></i>{successMsg}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Content */}
        {!verifLoading && !isVerified() && ownerProfile ? (
          <Row style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
            <Col>
              <Card className="text-center py-5 border-0"
                style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: '#ffffff' }}>
                <Card.Body className="py-5">
                  <div style={{ width:'90px', height:'90px', borderRadius:'50%', background:'rgba(255,193,7,0.1)', border:'2px solid #ffc107', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
                    <i className="fas fa-lock" style={{ fontSize:'2.5rem', color:'#ffc107' }} />
                  </div>
                  <h4 style={{ fontWeight:'800', color:'#1a1a1a', marginBottom:'0.5rem' }}>Account Verification Required</h4>
                  <p className="text-muted mb-4" style={{ maxWidth:'420px', margin:'0 auto 1.5rem', lineHeight:'1.65' }}>
                    You need to verify your identity before you can submit or view reports. This ensures the safety and credibility of all reports in the system.
                  </p>
                  {ownerProfile.verification_status === 'pending' ? (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.75rem 1.5rem', borderRadius:'12px', background:'rgba(253,126,20,0.08)', border:'1.5px solid rgba(253,126,20,0.3)', color:'#fd7e14', fontWeight:'600', fontSize:'0.9rem' }}>
                      <i className="fas fa-hourglass-half" />
                      Your ID is currently under review. Please wait for admin approval.
                    </div>
                  ) : (
                    <Button onClick={handleOpenVerifyModal} className="border-0"
                      size="lg"
                      style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', color:'#000', borderRadius:'14px', fontWeight:'700', padding:'0.875rem 2.5rem', boxShadow:'0 6px 20px rgba(255,193,7,0.4)', transition:'all 0.3s' }}
                      onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(255,193,7,0.6)'; }}
                      onMouseOut={e  => { e.currentTarget.style.transform='translateY(0)';   e.currentTarget.style.boxShadow='0 6px 20px rgba(255,193,7,0.4)'; }}>
                      <i className="fas fa-id-card me-2" />Verify My Account Now
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : loading ? (
          <Row style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards', flex: '1 1 auto' }}>
            <Col className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
              <Spinner animation="border" style={{ color: '#ffc107', width: '3rem', height: '3rem' }} />
            </Col>
          </Row>
        ) : reports.length === 0 ? (
          <Row style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
            <Col>
              <Card className="text-center py-5 border-0"
                style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: '#ffffff' }}>
                <Card.Body>
                  <i className="fas fa-flag text-muted mb-4" style={{ fontSize: '4rem' }}></i>
                  <h4 className="text-muted mb-3">No Reports Submitted Yet</h4>
                  <p className="text-muted mb-4">
                    Help keep your community safe. Report rabies cases, animal bites, or animals in need of rescue.
                  </p>
                  {isVerified() ? (
                    <Button
                      onClick={handleOpenSubmitModal}
                      size="lg"
                      className="border-0"
                      style={{
                        background: '#ffc107', color: '#000000',
                        padding: '0.875rem 2rem', borderRadius: '12px',
                        fontWeight: '700', boxShadow: '0 4px 15px rgba(255, 193, 7, 0.4)', transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)'; e.currentTarget.style.background = '#ffb300'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)'; e.currentTarget.style.background = '#ffc107'; }}
                    >
                      <i className="fas fa-plus me-2"></i>
                      Submit Your First Report
                    </Button>
                  ) : ownerProfile?.verification_status === 'pending' ? (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.75rem 1.75rem', borderRadius:'12px', background:'rgba(253,126,20,0.08)', border:'1.5px solid rgba(253,126,20,0.3)', color:'#fd7e14', fontWeight:'700', fontSize:'0.95rem' }}>
                      <i className="fas fa-hourglass-half" />
                      Your ID is under review — please wait for admin approval
                    </div>
                  ) : (
                    <Button
                      onClick={handleOpenVerifyModal}
                      size="lg"
                      className="border-0"
                      style={{
                        background: 'linear-gradient(135deg,#ffc107,#ffb300)', color: '#000000',
                        padding: '0.875rem 2rem', borderRadius: '12px',
                        fontWeight: '700', boxShadow: '0 4px 15px rgba(255, 193, 7, 0.4)', transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)'; }}
                    >
                      <i className="fas fa-id-card me-2"></i>
                      Verify Account to Submit Reports
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : (
          <>
            <Row style={{ flex: '1 1 auto', alignContent: 'flex-start' }}>
              {paginatedReports.map((report, index) => {
                const typeInfo = getReportType(report.report_type);
                return (
                  <Col key={report.id} lg={6} xl={4} className="mb-4"
                    style={{ animation: `dropDown 0.4s ease-out ${0.1 + index * 0.1}s backwards` }}>
                    <Card
                      className="h-100 border-0"
                      style={{
                        position: 'relative', borderRadius: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s', overflow: 'hidden'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; }}
                    >
                      {/* Dropdown Menu */}
                      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
                        <button
                          onClick={() => setShowDropdown(showDropdown === report.id ? null : report.id)}
                          style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseOver={(e) => e.target.style.background = 'rgba(0,0,0,0.05)'}
                          onMouseOut={(e) => e.target.style.background = 'transparent'}
                        >
                          <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                        </button>

                        {showDropdown === report.id && (
                          <>
                            <div onClick={() => setShowDropdown(null)}
                              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                            <div style={{
                              position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                              background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '12px',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '160px', zIndex: 1000, overflow: 'hidden'
                            }}>
                              <button
                onClick={() => { if (!isVerified()) { setShowDropdown(null); setShowVerifyGate(true); return; } handleViewDetails(report); }}
                                style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                              >
                                <img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                <span>View Details</span>
                              </button>

                              {(report.status === 'pending' || report.status === 'declined') && (
                                <button
                                  onClick={() => handleDeleteReport(report)}
                                  style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'}
                                  onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                                >
                                  <img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                  <span>Withdraw Report</span>
                                </button>
                              )}

                              {report.status !== 'pending' && report.status !== 'declined' && (
  <div style={{ width: '100%', padding: '0.75rem 1rem', borderTop: '1px solid #f0f0f0', background: '#fff9e6', fontSize: '0.8rem', color: '#856404', lineHeight: '1.4' }}>
    <i className="fas fa-info-circle me-1"></i>
    <span>Cannot withdraw: Already {report.status}</span>
  </div>
)}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Card Header */}
                      <Card.Header
                        className="d-flex align-items-center justify-content-between"
                        style={{
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                          borderBottom: '2px solid #ffc107',
                          paddingRight: '3.5rem',
                          borderRadius: '20px 20px 0 0'
                        }}
                      >
                        <div className="d-flex align-items-center flex-grow-1">
                          <div style={{
                            width: '70px', height: '70px', borderRadius: '15px',
                            background: typeInfo.bg,
                            border: `2px solid ${typeInfo.color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginRight: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                          }}>
                            <img src={typeInfo.img} alt={typeInfo.label}
                              style={{ width: '38px', height: '38px', objectFit: 'contain' }}
                              onError={e => e.target.style.display = 'none'} />
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="mb-1" style={{ fontWeight: '700', color: '#333333' }}>{typeInfo.label}</h5>
                            <small className="text-muted" style={{ fontSize: '0.85rem' }}>
                              <i className="fas fa-id-card me-1"></i>
                              {report.report_number || `RPT-${String(report.id).padStart(6, '0')}`}
                            </small>
                          </div>
                        </div>
                        <div>{getStatusBadge(report.status)}</div>
                      </Card.Header>

                      {/* Card Body */}
                      <Card.Body style={{ padding: '1.5rem' }}>
                        <Row className="mb-3">
                          <Col xs={6}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Barangay</small>
                            </div>
                            <span style={{ fontWeight: '600', color: '#333333' }}>{getBarangayName(report.barangay_id)}</span>
                          </Col>
                          <Col xs={6}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Contact No.</small>
                            </div>
                            <span style={{ fontWeight: '600', color: '#333333' }}>{report.phone_number || 'N/A'}</span>
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Address</small>
                            </div>
                            <span style={{ fontWeight: '600', color: '#333333', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {report.address || 'N/A'}
                            </span>
                          </Col>
                        </Row>

                        {report.description && (
                          <Row className="mb-3">
                            <Col>
                              <div style={{ marginBottom: '0.5rem' }}>
                                <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Description</small>
                              </div>
                              <span style={{ fontWeight: '500', color: '#555555', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {report.description}
                              </span>
                            </Col>
                          </Row>
                        )}

                        <Row>
                          <Col>
                            <small className="text-muted">
                              <i className="fas fa-calendar me-1"></i>
                              Submitted: {formatDate(report.created_at)}
                            </small>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* Pagination */}
            {reports.length > itemsPerPage && (
              <Row className="report-pagination" style={{ marginTop: 'auto' }}>
                <Col className="d-flex justify-content-between align-items-center">
                  <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
                    Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{totalPages}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ background: currentPage === 1 ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === 1 ? '#adb5bd' : '#333333', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { if (currentPage !== 1) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                      onMouseOut={(e) => { if (currentPage !== 1) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>

                    {(() => {
                      const pages = [];
                      if (totalPages <= 3) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        let start = Math.max(1, currentPage - 1);
                        let end = Math.min(totalPages, start + 2);
                        if (end - start < 2) start = Math.max(1, end - 2);
                      
                        for (let i = start; i <= end; i++) pages.push(i);
                        
                      }
                      return pages.map((page, idx) => page === '...' ? (
                        <span key={`e-${idx}`} style={{ padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: '600' }}>...</span>
                      ) : (
                        <button key={page} onClick={() => setCurrentPage(page)}
                          style={{ background: currentPage === page ? '#ffc107' : '#ffffff', border: '2px solid', borderColor: currentPage === page ? '#ffc107' : '#dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '40px', cursor: 'pointer', fontWeight: '700', color: currentPage === page ? '#000000' : '#333333', transition: 'all 0.2s', boxShadow: currentPage === page ? '0 2px 8px rgba(255,193,7,0.3)' : 'none' }}
                          onMouseOver={(e) => { if (currentPage !== page) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                          onMouseOut={(e) => { if (currentPage !== page) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                        >
                          {page}
                        </button>
                      ));
                    })()}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ background: currentPage === totalPages ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === totalPages ? '#adb5bd' : '#333333', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                      onMouseOut={(e) => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </Col>
              </Row>
            )}
          </>
        )}

        {/* ======================== SUBMIT REPORT MODAL ======================== */}
        <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)} size="lg" backdrop="static" centered={window.innerWidth <= 768} style={{ zoom: window.innerWidth <= 768 ? '1' : '0.75' }}>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
            <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
              <i className="fas fa-flag me-2" style={{ color: '#ffc107' }}></i>
              Submit a Report
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitReport}>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
              {submitError && (
                <Alert variant="danger" className="mb-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>{submitError}
                </Alert>
              )}

              {/* Report Type */}
              <Row className="mb-4">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                      Report Type <span style={{ color: '#dc3545' }}>*</span>
                    </Form.Label>
                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        overflowX: 'auto',
                        paddingBottom: '1rem',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#dee2e6 #f8f9fa'
                      }}
                      className="event-type-scroll"
                    >
                      {REPORT_TYPES.map(type => (
                        <div
                          key={type.value}
                          onClick={() => setFormData(prev => ({ ...prev, report_type: type.value }))}
                          style={{
                            minWidth: '200px',
                            flex: '0 0 auto',
                            padding: '1.5rem',
                            border: formData.report_type === type.value ? `3px solid ${type.color}` : '2px solid #dee2e6',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: formData.report_type === type.value ? type.activeBg : '#ffffff',
                            transition: 'all 0.3s',
                            userSelect: 'none',
                          }}
                        >
                          <img
                            src={type.img}
                            alt={type.label}
                            style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
                            onError={e => e.target.style.display = 'none'}
                          />
                          <div style={{ fontWeight: '600', fontSize: '1.1rem', color: formData.report_type === type.value ? type.color : '#333333' }}>
                            {type.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <style>{`
                      .event-type-scroll::-webkit-scrollbar { height: 8px; }
                      .event-type-scroll::-webkit-scrollbar-track { background: #f8f9fa; border-radius: 10px; }
                      .event-type-scroll::-webkit-scrollbar-thumb { background: #dee2e6; border-radius: 10px; }
                      .event-type-scroll::-webkit-scrollbar-thumb:hover { background: #adb5bd; }
                    `}</style>
                  </Form.Group>
                </Col>
              </Row>
              {/* Barangay */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                      Barangay <span style={{ color: '#dc3545' }}>*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.barangay_id ? (barangays.find(b => b.id === parseInt(formData.barangay_id))?.name || '') : 'Pin a location on the map to auto-detect'}
                      readOnly
                      style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6', background: '#f8f9fa', color: formData.barangay_id ? '#333' : '#aaa', fontStyle: formData.barangay_id ? 'normal' : 'italic' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                      Contact Number <span style={{ color: '#dc3545' }}>*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleFormChange}
                      onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                      placeholder="09XXXXXXXXX"
                      required
                      disabled={submitLoading}
                      style={{
                        borderRadius: '8px', padding: '0.75rem',
                        border: formFieldErrors.phone_number
                          ? '2px solid #ef4444'
                          : (formData.phone_number && /^09\d{9}$/.test(formData.phone_number))
                            ? '2px solid #10b981'
                            : '2px solid #dee2e6'
                      }}
                    />
                    {formFieldErrors.phone_number && (
                      <small style={{ color: '#ef4444', display: 'block', marginTop: '0.3rem', fontSize: '0.8rem' }}>
                        <i className="fas fa-times-circle me-1" />{formFieldErrors.phone_number}
                      </small>
                    )}
                  </Form.Group>
                </Col>
              </Row>
              {/* Description */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                      Description / Details
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      placeholder="Describe the incident or situation in detail..."
                      disabled={submitLoading}
                      style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Address */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                      Address / Location <span style={{ color: '#dc3545' }}>*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleFormChange}
                      placeholder="House no., Street, Purok / Sitio..."
                      required
                      disabled={submitLoading}
                      style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              
              {/* Map */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333333' }}>
                      <i className="fas fa-map-marker-alt me-2" style={{ color:'#ffc107' }}></i>
                      Pin Location on Map
                      <span style={{ fontWeight:'400', color:'#888', fontSize:'0.8rem', marginLeft:'0.5rem' }}>(optional)</span>
                    </Form.Label>
                    <LeafletMap
                      lat={formLat}
                      lng={formLng}
                      onLocationSelect={(lat, lng) => { setFormLat(lat); setFormLng(lng); }}
                      onAddressResolve={(address) => {
                        setFormData(prev => ({ ...prev, address }));
                      }}
                      onBarangayDetect={(addrStr) => {
                        const match = barangays.find(b =>
                          addrStr.includes(b.name.toLowerCase()) ||
                          b.name.toLowerCase().split(' ').some(word => word.length > 3 && addrStr.includes(word))
                        );
                        if (match) {
                          setFormData(prev => ({ ...prev, barangay_id: String(match.id) }));
                        }
                      }}
                      onError={null}
                    />
                    {formLat && formLng && (
                      <div style={{ marginTop:'0.5rem', padding:'0.5rem 0.75rem', background:'rgba(25,135,84,0.08)', borderRadius:'8px', border:'1px solid rgba(25,135,84,0.2)', fontSize:'0.82rem', color:'#198754' }}>
                        <i className="fas fa-check-circle me-1"></i>
                        Location pinned: {formLat.toFixed(6)}, {formLng.toFixed(6)}
                        <button onClick={() => { setFormLat(null); setFormLng(null); }}
                          style={{ background:'none', border:'none', color:'#dc3545', fontSize:'0.78rem', marginLeft:'0.75rem', cursor:'pointer', padding:0 }}>
                          <i className="fas fa-times me-1"></i>Clear
                        </button>
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {/* Image Upload */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-2">
                    <Form.Label style={{ fontWeight:'600', color:'#333333' }}>
                      Attach Photos <span style={{ color: '#dc3545' }}>*</span>
                      <span style={{ fontWeight:'400', color:'#888', fontSize:'0.8rem', marginLeft:'0.5rem' }}>(max 3)</span>
                    </Form.Label>
                    <Form.Control
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      disabled={submitLoading || imageFiles.length >= 3}
                      style={{ borderRadius:'8px', border:'2px solid #dee2e6', padding:'0.6rem' }}
                    />
                  </Form.Group>
                  {imagePreviews.length > 0 && (
                    <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginTop:'0.75rem' }}>
                      {imagePreviews.map((src, i) => (
                        <div key={i} style={{ position:'relative' }}>
                          <img src={src} alt={`preview-${i}`}
                            style={{ width:'90px', height:'90px', objectFit:'cover', borderRadius:'10px', border:'2px solid #dee2e6' }} />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(i)}
                            style={{ position:'absolute', top:'-8px', right:'-8px', background:'#dc3545', border:'none', borderRadius:'50%', width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', fontSize:'0.7rem', boxShadow:'0 2px 6px rgba(0,0,0,0.2)' }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
              <Button variant="secondary" onClick={() => setShowSubmitModal(false)} disabled={submitLoading}
                style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
                Cancel
              </Button>
<Button type="button" disabled={submitLoading} className="border-0"
                onClick={(e) => {
                  e.preventDefault();
                  if (!formData.report_type)         { setSubmitError('Please select a report type.');    return; }
                  if (!formData.barangay_id)         { setSubmitError('Please select a barangay.');        return; }
                  if (!formData.address.trim())      { setSubmitError('Please enter your address.');       return; }
                  if (!formData.phone_number.trim()) { setSubmitError('Please enter a contact number.');   return; }
                  if (!/^09\d{9}$/.test(formData.phone_number)) { setSubmitError('Contact number must be 11 digits starting with 09.'); return; }
                  if (!formLat || !formLng)          { setSubmitError('Please pin a location on the map before submitting.'); return; }
                  if (imageFiles.length === 0)        { setSubmitError('Please attach at least one photo.'); return; }
                  setSubmitError('');
                  setShowConfirmModal(true);
                }}                style={{ background: submitLoading ? '#6c757d' : '#ffc107', color: '#000000', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700', boxShadow: submitLoading ? 'none' : '0 4px 15px rgba(255, 193, 7, 0.4)', transition: 'all 0.3s' }}
                onMouseOver={(e) => { if (!submitLoading) { e.target.style.background = '#ffb300'; e.target.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)'; } }}
                onMouseOut={(e) => { if (!submitLoading) { e.target.style.background = '#ffc107'; e.target.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)'; } }}
              >
                {submitLoading ? (<WaveDots />) : (<><i className="fas fa-paper-plane me-2"></i>Submit Report</>)}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        

        {/* ======================== VIEW DETAILS MODAL ======================== */}
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered={window.innerWidth <= 768} style={{ zoom: window.innerWidth <= 768 ? '1' : '0.75' }}>
          <Modal.Header closeButton
            style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
            <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
              {selectedReport && (
                <span style={{ marginRight: '0.75rem' }}>
                  <img src={getReportType(selectedReport.report_type).img} alt=""
                    style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                    onError={e => e.target.style.display = 'none'} />
                </span>
              )}
              Report Details
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem' }}>
            {selectedReport && (
              <Row>
                <Col md={6}>
                  <Card className="mb-3 border-0" style={{ borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                    <Card.Header style={{ background: 'rgba(255, 193, 7, 0.1)', borderBottom: '2px solid rgba(255, 193, 7, 0.3)', borderRadius: '15px 15px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }}></i>
                        Report Information
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <Table borderless size="sm">
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Report No.:</td>
                            <td style={{ fontWeight: '600', color: '#333333' }}>{selectedReport.report_number || `RPT-${String(selectedReport.id).padStart(6, '0')}`}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Type:</td>
                            <td style={{ fontWeight: '600', color: '#333333' }}>{getReportType(selectedReport.report_type).label}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Status:</td>
                            <td>{getStatusBadge(selectedReport.status)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Barangay:</td>
                            <td style={{ fontWeight: '600', color: '#333333' }}>{getBarangayName(selectedReport.barangay_id)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Address:</td>
                            <td style={{ fontWeight: '600', color: '#333333' }}>{selectedReport.address || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Contact No.:</td>
                            <td style={{ fontWeight: '600', color: '#333333' }}>{selectedReport.phone_number || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Submitted:</td>
                            <td style={{ fontWeight: '600', color: '#333333' }}>{formatDate(selectedReport.created_at)}</td>
                          </tr>
                          {selectedReport.updated_at && selectedReport.updated_at !== selectedReport.created_at && (
                            <tr>
                              <td style={{ fontWeight: '600', color: '#666666' }}>Last Updated:</td>
                              <td style={{ fontWeight: '600', color: '#333333' }}>{formatDate(selectedReport.updated_at)}</td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="border-0" style={{ borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                    <Card.Header style={{ background: 'rgba(255, 193, 7, 0.1)', borderBottom: '2px solid rgba(255, 193, 7, 0.3)', borderRadius: '15px 15px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-align-left me-2" style={{ color: '#ffc107' }}></i>
                        Description
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      {selectedReport.description ? (
                        <p style={{ color: '#555555', lineHeight: '1.7', marginBottom: 0 }}>{selectedReport.description}</p>
                      ) : (
                        <div className="text-center text-muted py-3">
                          <i className="fas fa-comment-slash mb-2" style={{ fontSize: '2rem', color: '#e0e0e0' }}></i>
                          <p>No additional description provided.</p>
                        </div>
                      )}
                    </Card.Body>
                  </Card>

                  {selectedReport.admin_notes && (
                    <Card className="border-0 mt-3" style={{ borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                      <Card.Header style={{ background: 'rgba(13, 202, 240, 0.1)', borderBottom: '2px solid rgba(13, 202, 240, 0.3)', borderRadius: '15px 15px 0 0' }}>
                        <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                          <i className="fas fa-user-shield me-2" style={{ color: '#0dcaf0' }}></i>
                          Admin Notes
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <p style={{ color: '#555555', lineHeight: '1.7', marginBottom: 0 }}>{selectedReport.admin_notes}</p>
                      </Card.Body>
                    </Card>
                  )}
                  {/* Images */}
                  {selectedReport.images && selectedReport.images.length > 0 && (() => {
                    const API_BASE = (window.location.hostname === 'localhost'
                      ? 'http://localhost/city-pet-vaccination-api'
                      : 'https://city-pet-vaccination-api.onrender.com').replace(/\/+$/, '');
                    const getImgUrl = (img) => {
                      if (!img) return '';
                      if (img.startsWith('http')) return img;
                      return `${API_BASE}/${img.replace(/^\/+/, '')}`;
                    };
                    return (
                      <>
                        {/* Lightbox overlay — uses React state so it actually renders */}
                        {lightboxImg && (
  <div
    onClick={() => setLightboxImg(null)}
    onWheel={e => {
      e.preventDefault();
      setLightboxZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 0.5), 5));
    }}
    style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', cursor:'zoom-in' }}
  >
    <img
      src={lightboxImg}
      alt="Full view"
      style={{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:'12px', boxShadow:'0 8px 40px rgba(0,0,0,0.6)', transform:`scale(${lightboxZoom})`, transformOrigin:'center center', transition:'transform 0.1s ease' }}
      onClick={e => e.stopPropagation()}
    />
    <button
      onClick={() => { setLightboxImg(null); setLightboxZoom(1); }}
      style={{ position:'absolute', top:'1.5rem', right:'1.5rem', background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.3)', borderRadius:'50%', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', fontSize:'1.2rem', backdropFilter:'blur(4px)' }}
    >
      <i className="fas fa-times" />
    </button>
    {/* Arrow navigation */}
    {selectedReport.images.length > 1 && (() => {
      const currentIdx = selectedReport.images.findIndex(img => getImgUrl(img) === lightboxImg);
      const prev = selectedReport.images[(currentIdx - 1 + selectedReport.images.length) % selectedReport.images.length];
      const next = selectedReport.images[(currentIdx + 1) % selectedReport.images.length];
      return (
        <>
          <button onClick={e => { e.stopPropagation(); setLightboxImg(getImgUrl(prev)); setLightboxZoom(1); }}
            style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.3)', borderRadius:'50%', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', fontSize:'1rem', backdropFilter:'blur(4px)' }}>
            <i className="fas fa-chevron-left" />
          </button>
          <button onClick={e => { e.stopPropagation(); setLightboxImg(getImgUrl(next)); setLightboxZoom(1); }}
            style={{ position:'absolute', right:'4rem', top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.3)', borderRadius:'50%', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', fontSize:'1rem', backdropFilter:'blur(4px)' }}>
            <i className="fas fa-chevron-right" />
          </button>
          <div style={{ position:'absolute', bottom:'1.25rem', left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.7)', fontSize:'0.8rem', fontWeight:'600' }}>
            {currentIdx + 1} / {selectedReport.images.length}
          </div>
        </>
      );
    })()}
  </div>
)}
                        <Card className="border-0 mt-3" style={{ borderRadius:'15px', boxShadow:'0 2px 10px rgba(0,0,0,0.08)' }}>
                          <Card.Header style={{ background:'rgba(255,193,7,0.1)', borderBottom:'2px solid rgba(255,193,7,0.3)', borderRadius:'15px 15px 0 0' }}>
                            <h6 className="mb-0" style={{ fontWeight:'700', color:'#333333' }}>
                              <i className="fas fa-images me-2" style={{ color:'#ffc107' }}></i>
                              Attached Photos ({selectedReport.images.length})
                            </h6>
                          </Card.Header>
                          <Card.Body>
                            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
                              {selectedReport.images.map((img, i) => {
                                const src = getImgUrl(img);
                                return (
                                  <div
                                    key={i}
                                    onClick={() => setLightboxImg(src)}
                                    style={{ position:'relative', cursor:'pointer', borderRadius:'10px', overflow:'hidden', width:'90px', height:'90px', border:'2px solid #dee2e6', transition:'all 0.2s', flexShrink:0 }}
                                    onMouseOver={e => { e.currentTarget.style.borderColor='#ffc107'; e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'; }}
                                    onMouseOut={e  => { e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none'; }}
                                  >
                                    <img
                                      src={src}
                                      alt={`report-img-${i}`}
                                      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                                      onError={e => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.style.background = '#f8f9fa';
                                        e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px"><i class="fas fa-image" style="color:#ccc;font-size:1.4rem"></i><small style="color:#aaa;font-size:0.6rem">No preview</small></div>';
                                      }}
                                    />
                                    {/* Zoom overlay */}
                                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}
                                      onMouseOver={e => e.currentTarget.style.background='rgba(0,0,0,0.3)'}
                                      onMouseOut={e  => e.currentTarget.style.background='rgba(0,0,0,0)'}>
                                      <i className="fas fa-search-plus" style={{ color:'rgba(255,255,255,0)', fontSize:'1.2rem', transition:'color 0.2s', pointerEvents:'none' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </Card.Body>
                        </Card>
                      </>
                    );
                  })()}

                  {/* Map pin in view mode */}
                  {selectedReport.latitude && selectedReport.longitude && (
                    <Card className="border-0 mt-3" style={{ borderRadius:'15px', boxShadow:'0 2px 10px rgba(0,0,0,0.08)' }}>
                      <Card.Header style={{ background:'rgba(255,193,7,0.1)', borderBottom:'2px solid rgba(255,193,7,0.3)', borderRadius:'15px 15px 0 0' }}>
                        <h6 className="mb-0" style={{ fontWeight:'700', color:'#333333' }}>
                          <i className="fas fa-map-marker-alt me-2" style={{ color:'#ffc107' }}></i>
                          Pinned Location
                        </h6>
                      </Card.Header>
                      <Card.Body style={{ padding:'1rem' }}>
                        <div style={{ position: 'relative' }}>
                          {!window.L && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: '8px', zIndex: 1 }}>
                              <Spinner animation="border" size="sm" style={{ color: '#ffc107' }} />
                              <span className="ms-2" style={{ fontSize: '0.9rem', color: '#666' }}>Loading map...</span>
                            </div>
                          )}
                          <LeafletMap
                            lat={parseFloat(selectedReport.latitude)}
                            lng={parseFloat(selectedReport.longitude)}
                            readOnly={true}
                          />
                        </div>
                      </Card.Body>
                    </Card>
                  )}
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid #e0e0e0' }}>
            <Button variant="secondary" onClick={() => setShowDetailsModal(false)}
              style={{ borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ======================== DELETE / WITHDRAW MODAL ======================== */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered style={{ zoom: window.innerWidth <= 768 ? '1' : '0.75' }}>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <Modal.Title style={{ fontWeight: '700' }}>
              <i className="fas fa-exclamation-triangle text-danger me-2"></i>
              Confirm Withdraw Report
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem' }}>
            {selectedReport && (
              <>
                <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                  Are you sure you want to withdraw this <strong style={{ color: '#dc3545' }}>{getReportType(selectedReport.report_type).label}</strong> report?
                </p>
                <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
                  <div className="mb-2">
                    <span style={{ fontWeight: '500', color: '#555' }}>
                      <i className="fas fa-flag me-1" style={{ color: '#ffc107' }}></i>Report Information
                    </span>
                  </div>
                  <strong style={{ fontSize: '1.1rem' }}>{getReportType(selectedReport.report_type).label}</strong>
                  <br />
                  <small className="text-muted">
                    <i className="fas fa-map-marker-alt me-1"></i>{selectedReport.address} &bull; Brgy. {getBarangayName(selectedReport.barangay_id)}
                  </small>
                </div>
                <Alert variant="warning" className="mt-3 mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Note:</strong> Only pending reports can be withdrawn. This action cannot be undone.
                </Alert>
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
              style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteReport} disabled={deleteLoading}
              style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
              {deleteLoading ? (<WaveDots color="#ffffff" />) : (<><i className="fas fa-trash me-2"></i>Withdraw Report</>)}
            </Button>
          </Modal.Footer>
        </Modal>

      {/* ══════════ VERIFICATION GATE MODAL ══════════ */}
        <Modal show={showVerifyGate} onHide={() => setShowVerifyGate(false)} centered style={{ zoom: window.innerWidth <= 768 ? '1' : '0.75' }}>
          <Modal.Header closeButton style={{ background:'linear-gradient(135deg,#fff9e6,#fff3cd)', borderBottom:'2px solid #ffc107' }}>
            <Modal.Title style={{ fontWeight:'800', color:'#333', fontSize:'1.1rem' }}>
              <i className="fas fa-shield-alt me-2" style={{ color:'#ffc107' }} />Account Verification Required
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding:'2rem', textAlign:'center' }}>
            <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'rgba(255,193,7,0.12)', border:'2px solid #ffc107', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
              <i className="fas fa-lock" style={{ fontSize:'2rem', color:'#ffc107' }} />
            </div>
            <h5 style={{ fontWeight:'800', color:'#1a1a1a', marginBottom:'0.5rem' }}>Verify Your Account First</h5>
            <p style={{ color:'#666', fontSize:'0.9rem', lineHeight:'1.6', marginBottom:'1.5rem' }}>
              To submit or view reports, you need to verify your identity by providing a valid government ID. This helps us ensure the safety and authenticity of all reports in the system.
            </p>
            <div style={{ background:'#f8f9fa', borderRadius:'12px', padding:'1rem', marginBottom:'1.5rem', textAlign:'left' }}>
              {[
                { icon:'fa-user-check', text:'Complete your profile information' },
                { icon:'fa-id-card',    text:'Upload a valid government ID' },
                { icon:'fa-map-marker-alt', text:'Provide your complete address' },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom: i < 2 ? '0.75rem' : 0 }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,193,7,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className={`fas ${item.icon}`} style={{ fontSize:'0.8rem', color:'#ffc107' }} />
                  </div>
                  <span style={{ fontSize:'0.875rem', color:'#555', fontWeight:'500' }}>{item.text}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => { setShowVerifyGate(false); handleOpenVerifyModal(); }} className="border-0 w-100"
              style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', color:'#000', borderRadius:'12px', fontWeight:'700', padding:'0.875rem', fontSize:'1rem', boxShadow:'0 6px 20px rgba(255,193,7,0.4)', transition:'all 0.3s' }}
              onMouseOver={e => e.currentTarget.style.boxShadow='0 8px 28px rgba(255,193,7,0.6)'}
              onMouseOut={e  => e.currentTarget.style.boxShadow='0 6px 20px rgba(255,193,7,0.4)'}>
              <i className="fas fa-id-card me-2" />Verify My Account Now
            </Button>
          </Modal.Body>
        </Modal>

        <VerifyAccountModal
        show={showVerifyModal}
        onHide={() => setShowVerifyModal(false)}
        ownerProfile={ownerProfile}
        profileForm={{
          first_name:  ownerProfile?.first_name  || '',
          middle_name: ownerProfile?.middle_name || '',
          last_name:   ownerProfile?.last_name   || '',
          birthdate:   ownerProfile?.birthdate   || '',
          gender:      ownerProfile?.gender      || '',
          phone:       ownerProfile?.phone       || '',
        }}
        onVerified={(updatedOwner) => setOwnerProfile(updatedOwner)}
      />

{/* ======================== CONFIRM SUBMIT MODAL ======================== */}
<Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered style={{ zoom: window.innerWidth <= 768 ? '1' : '0.75' }}>
  <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', borderBottom: '2px solid #ffc107' }}>
    <Modal.Title style={{ fontWeight: '700', color: '#333' }}>
      <i className="fas fa-paper-plane me-2" style={{ color: '#ffc107' }} />
      Confirm Report Submission
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '2rem' }}>
    <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
      Please review your report details before submitting.
    </p>

    {/* Report Type */}
    {formData.report_type && (() => {
      const t = getReportType(formData.report_type);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: t.bg, border: `1.5px solid ${t.color}30`, borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <img src={t.img} alt={t.label} style={{ width: '36px', height: '36px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: t.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Report Type</div>
            <div style={{ fontWeight: '700', color: '#333' }}>{t.label}</div>
          </div>
        </div>
      );
    })()}

    {/* Details */}
    <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem', border: '1px solid #e9ecef' }}>
      {[
        { icon: 'fa-map-marker-alt', label: 'Barangay', value: barangays.find(b => b.id === parseInt(formData.barangay_id))?.name || '—' },
        { icon: 'fa-home', label: 'Address', value: formData.address || '—' },
        { icon: 'fa-phone', label: 'Contact No.', value: formData.phone_number || '—' },
        { icon: 'fa-align-left', label: 'Description', value: formData.description || 'No description provided' },
        { icon: 'fa-map-pin', label: 'Pinned Location', value: formLat && formLng ? `${formLat.toFixed(5)}, ${formLng.toFixed(5)}` : 'Not pinned' },
        { icon: 'fa-camera', label: 'Attached Photos', value: imageFiles.length > 0 ? `${imageFiles.length} photo(s)` : 'None' },
      ].map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: i < 5 ? '0.75rem' : 0, marginBottom: i < 5 ? '0.75rem' : 0, borderBottom: i < 5 ? '1px solid #e9ecef' : 'none' }}>
          <div style={{ width: '28px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '2px' }}>
            <i className={`fas ${item.icon}`} style={{ color: '#ffc107', fontSize: '0.8rem' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{item.label}</div>
            <div style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem', wordBreak: 'break-word' }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  </Modal.Body>
  <Modal.Footer style={{ padding: '1.25rem 2rem', gap: '0.75rem' }}>
    <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={submitLoading}
      style={{ borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
      <i className="fas fa-arrow-left me-2" />Edit
    </Button>
    <Button disabled={submitLoading} className="border-0"
      onClick={async (e) => {
        setShowConfirmModal(false);
        await handleSubmitReport(e);
      }}
      style={{ background: submitLoading ? '#6c757d' : '#ffc107', color: '#000', borderRadius: '10px', padding: '0.75rem 1.75rem', fontWeight: '700', boxShadow: '0 4px 14px rgba(255,193,7,0.4)', transition: 'all 0.3s' }}
      onMouseOver={e => { if (!submitLoading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,193,7,0.6)'; }}
      onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(255,193,7,0.4)'}
    >
      {submitLoading
        ? <WaveDots />
        : <><i className="fas fa-paper-plane me-2" />Confirm & Submit</>}
    </Button>
  </Modal.Footer>
</Modal>
      </Container>
    </>
  );
};

export default Reports;