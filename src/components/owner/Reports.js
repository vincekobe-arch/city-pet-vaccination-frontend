import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Alert, Spinner, Modal, Form } from 'react-bootstrap';
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
  const [floatingMsg, setFloatingMsg] = useState('');

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
  const [statusFilter, setStatusFilter] = useState('all');

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
    .dashboard-page {
      zoom: 0.75;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .dashboard-page { zoom: 1; } }

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

    /* ---------------- My Reports ---------------- */
    @keyframes rpIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes rpMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes rpShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    @keyframes rpToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    .rp-anim { animation: rpIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }

    .rp-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .rp-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .rp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.85rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .rp-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .rp-btn.sm { padding: 0.42rem 0.8rem; font-size: 0.8rem; }
    .rp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .rp-btn.primary { background: #ffc107; color: #1f2328; }
    .rp-btn.primary:hover:not(:disabled) { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .rp-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; }
    .rp-btn.ghost:hover:not(:disabled) { background: #fff8e1; border-color: #ffc107; }
    .rp-btn.amber { background: rgba(255,193,7,0.16); color: #8a6700; }
    .rp-btn.amber:hover:not(:disabled) { background: rgba(255,193,7,0.28); }
    .rp-btn.success { background: #198754; color: #fff; }
    .rp-btn.success:hover:not(:disabled) { background: #157347; }
    .rp-btn.danger-outline { background: #fff; color: #dc3545; border-color: rgba(220,53,69,0.35); }
    .rp-btn.danger-outline:hover:not(:disabled) { background: rgba(220,53,69,0.06); }

    .rp-tabs { display: inline-flex; gap: 0.25rem; padding: 4px; border-radius: 12px; background: #f3f4f6; align-self: flex-start; max-width: 100%; overflow-x: auto; }
    .rp-tab { display: inline-flex; align-items: center; gap: 0.5rem; border: none; background: transparent; padding: 0.5rem 0.95rem; border-radius: 9px; font-size: 0.86rem; font-weight: 600; color: #5b6270; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .rp-tab i { font-size: 0.8rem; }
    .rp-tab .count { font-size: 0.72rem; padding: 0.05rem 0.45rem; border-radius: 999px; background: rgba(0,0,0,0.06); color: #6b7280; }
    .rp-tab:hover { color: #1f2328; }
    .rp-tab.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .rp-tab.active.on i { color: #e0a800; }
    .rp-tab.archived.on i { color: #b88a00; }
    .rp-tab.trash.on i { color: #dc3545; }
    .rp-tab.on .count { background: #1f2328; color: #fff; }

    .rp-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: rpToast 0.35s ease-out; }
    .rp-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rp-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .rp-toast .d { color: #6b7280; font-size: 0.84rem; }
    .rp-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .rp-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .rp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 1.1rem; }
    .rp-card { position: relative; display: flex; flex-direction: column; background: #fff; border: 1px solid #e9ecef; border-radius: 16px; padding: 1.15rem; transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease; }
    .rp-card:hover { box-shadow: 0 12px 28px rgba(16,24,40,0.08); transform: translateY(-3px); border-color: #e2e5ea; }
    .rp-card.raised { z-index: 5; }
    .rp-card.muted { background: #fcfcfd; }
    .rp-card.muted:hover { transform: none; }

    .rp-top { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 0.85rem; }
    .rp-photo { position: relative; width: 64px; height: 64px; border-radius: 14px; overflow: hidden; flex-shrink: 0; background: #f6f7f9; border: 1px solid #eef0f3; cursor: pointer; }
    .rp-photo.static { cursor: default; }
    .rp-photo img { width: 100%; height: 100%; object-fit: cover; }
    .rp-photo-hover { position: absolute; inset: 0; background: rgba(0,0,0,0.4); color: #fff; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; }
    .rp-photo:hover .rp-photo-hover, .rp-photo:focus-visible .rp-photo-hover { opacity: 1; }
    .rp-photo-cam { position: absolute; right: 4px; bottom: 4px; width: 20px; height: 20px; border-radius: 50%; background: #ffc107; color: #1f2328; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; box-shadow: 0 1px 4px rgba(0,0,0,0.25); }
    .rp-photo-busy { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; }
    .rp-name { font-weight: 700; font-size: 1.08rem; color: #1f2328; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rp-reg { font-size: 0.78rem; color: #6b7280; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .rp-reg i { font-size: 0.65rem; margin-right: 0.3rem; color: #9ca3af; }
    .rp-breed { font-size: 0.8rem; color: #6b7280; margin-top: 0.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rp-breed .dot { margin: 0 0.35rem; color: #c4c9d0; }

    .rp-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .rp-icon-btn:hover, .rp-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .rp-menu { position: absolute; top: calc(100% + 6px); right: 0; min-width: 210px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1000; animation: rpMenu 0.16s ease-out; transform-origin: top right; }
    .rp-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; }
    .rp-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .rp-menu-item:hover:not(:disabled) { background: #f6f7f9; }
    .rp-menu-item:disabled { opacity: 0.5; }
    .rp-menu-item.warn, .rp-menu-item.warn i { color: #8a6700; }
    .rp-menu-item.warn:hover { background: #fff8e1; }
    .rp-menu-item.danger, .rp-menu-item.danger i { color: #dc3545; }
    .rp-menu-item.danger:hover { background: #fff5f5; }
    .rp-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }
    .rp-menu-note { display: flex; gap: 0.5rem; padding: 0.55rem 0.7rem; margin-top: 0.15rem; border-radius: 8px; background: #fafbfc; color: #6b7280; font-size: 0.75rem; line-height: 1.45; }
    .rp-menu-note i { margin-top: 2px; color: #9ca3af; }

    .rp-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.85rem; }
    .rp-chip { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }
    .rp-chip i { font-size: 0.65rem; }
    .rp-chip.green { background: rgba(25,135,84,0.1); color: #198754; }
    .rp-chip.grey { background: #f3f4f6; color: #6b7280; }
    .rp-chip.teal { background: rgba(10,162,192,0.1); color: #0a8aa3; }
    .rp-chip.pink { background: rgba(214,51,132,0.1); color: #c02a74; }
    .rp-chip.amber { background: rgba(255,193,7,0.16); color: #8a6700; }
    .rp-chip.red { background: rgba(220,53,69,0.1); color: #dc3545; }

    .rp-info { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; padding: 0.85rem 0.95rem; border-radius: 12px; background: #fafbfc; border: 1px solid #f0f1f3; }
    .rp-info .k { font-size: 0.68rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.1rem; }
    .rp-info .v { font-size: 0.88rem; font-weight: 600; color: #1f2328; }
    .rp-last { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.7rem; font-size: 0.8rem; color: #6b7280; }
    .rp-last i { color: #e0a800; font-size: 0.75rem; }
    .rp-last strong { color: #1f2328; font-weight: 600; }
    .rp-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: auto; padding-top: 0.9rem; }
    .rp-card .rp-info + .rp-foot, .rp-card .rp-last + .rp-foot { margin-top: auto; }
    .rp-card > .rp-foot { border-top: 1px solid #f0f1f3; margin-top: 0.9rem; }
    .rp-muted { font-size: 0.78rem; color: #6b7280; }

    .rp-note { display: flex; align-items: center; gap: 0.55rem; padding: 0.65rem 0.9rem; border-radius: 10px; font-size: 0.84rem; font-weight: 500; margin-bottom: 1rem; }
    .rp-note.warn { background: rgba(255,193,7,0.1); color: #8a6700; }
    .rp-note.danger { background: rgba(220,53,69,0.07); color: #b02a37; }

    .rp-empty { text-align: center; padding: 3.5rem 1.5rem; border: 1px dashed #e2e5ea; border-radius: 16px; background: #fcfcfd; }
    .rp-empty .ic { width: 68px; height: 68px; border-radius: 18px; margin: 0 auto 1rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.7rem; }
    .rp-empty h5 { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; }
    .rp-empty p { color: #6b7280; font-size: 0.9rem; max-width: 420px; margin: 0 auto 1.25rem; }
    .rp-empty p:last-child { margin-bottom: 0; }

    .rp-skel-card { min-height: 220px; }
    .rp-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: rpShimmer 1.3s ease infinite; }

    .rp-pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.5rem; }
    .rp-pager-text { font-size: 0.85rem; color: #6b7280; }
    .rp-pager-text strong { color: #1f2328; }
    .rp-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .rp-page:hover:not(:disabled) { background: #f3f4f6; }
    .rp-page.on { background: #ffc107; color: #1f2328; }
    .rp-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .rp-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .rp-btn:focus-visible, .rp-tab:focus-visible, .rp-icon-btn:focus-visible, .rp-menu-item:focus-visible, .rp-page:focus-visible, .rp-photo:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .rp-title { font-size: 1.45rem; }
      .rp-sub { font-size: 0.85rem; }
      .rp-grid { gap: 0.85rem; }
      .rp-card { padding: 0.95rem; }
      .rp-photo { width: 56px; height: 56px; }
      .rp-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
      .rp-tab { padding: 0.45rem 0.7rem; font-size: 0.8rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      .rp-anim, .rp-menu, .rp-toast, .rp-skel { animation: none !important; }
      .rp-card, .rp-btn { transition: none !important; }
    }
    .rp-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .rp-chip i { font-size: 0.68rem; }
    .rp-card { border-top: 3px solid var(--t, #e9ecef); }
    .rp-type-ic { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rp-type-ic img { width: 32px; height: 32px; object-fit: contain; }
    .rp-type { font-weight: 700; font-size: 1.05rem; color: #1f2328; }
    .rp-num { font-size: 0.78rem; color: #6b7280; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .rp-num i { font-size: 0.65rem; margin-right: 0.3rem; color: #9ca3af; }
    .rp-info { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.8rem 0.95rem; border-radius: 12px; background: #fafbfc; border: 1px solid #f0f1f3; }
    .rp-info .row-i { display: flex; align-items: flex-start; gap: 0.65rem; }
    .rp-info .row-i > i { width: 16px; text-align: center; color: #9ca3af; font-size: 0.8rem; margin-top: 3px; }
    .rp-info .v { font-size: 0.88rem; font-weight: 600; color: #1f2328; }
    .rp-info .s { font-size: 0.78rem; color: #6b7280; }
    .rp-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .rp-desc { margin: 0.75rem 0 0; font-size: 0.85rem; color: #4b5563; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .rp-filters { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.25rem; scrollbar-width: thin; }
    .rp-filter { flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.42rem 0.85rem; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; color: #4b5563; font-size: 0.82rem; font-weight: 600; transition: all 0.15s ease; }
    .rp-filter .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); display: inline-block; }
    .rp-filter .count { font-size: 0.72rem; background: #f3f4f6; color: #6b7280; border-radius: 999px; padding: 0.02rem 0.45rem; }
    .rp-filter:hover { border-color: #c4c9d0; color: #1f2328; }
    .rp-filter.on { background: #1f2328; border-color: #1f2328; color: #fff; }
    .rp-filter.on .count { background: rgba(255,255,255,0.2); color: #fff; }
    .rp-filter:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    /* ---------------- Responsive: every screen size ---------------- */
    /* Small laptops (992–1199px): 3 cards per row */
    @media (min-width: 992px) and (max-width: 1199.98px) {
      .rp-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    /* Tablets (577–991px): 2 cards per row */
    @media (min-width: 577px) and (max-width: 991.98px) {
      .rp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    /* Phones (≤ 576px): 1 card per row, full-width button, compact cards */
    @media (max-width: 576px) {
      .rp-grid { grid-template-columns: minmax(0, 1fr); }
      .dashboard-page .mobile-register-btn { width: 100%; justify-content: center; }
      .dashboard-page .rp-filters { margin-left: -0.75rem; margin-right: -0.75rem; padding-left: 0.75rem; padding-right: 0.75rem; scrollbar-width: none; }
      .dashboard-page .rp-filters::-webkit-scrollbar { display: none; }
      .rp-type-ic { width: 46px !important; height: 46px !important; }
      .rp-info { padding: 0.7rem 0.8rem !important; }
      .rp-foot { gap: 0.5rem; }
    }
    /* Small phones (≤ 400px) */
    @media (max-width: 400px) {
      .rp-title { font-size: 1.3rem !important; }
      .rp-card { padding: 0.85rem !important; }
      .rp-foot { flex-wrap: wrap; }
      .rp-foot .rp-btn { flex: 1 1 auto; justify-content: center; }
      .rp-desc { font-size: 0.85rem; }
    }

    /* Page: normal size on phones */
    @media (max-width: 768px) { .dashboard-page { zoom: 1; padding-left: 0.75rem !important; padding-right: 0.75rem !important; } }

    /* Modals: same zoom as the page; normal size and centered on phones */
    .rp-zoom-modal { zoom: 0.75; }
    @media (min-width: 1600px) { .rp-zoom-modal { zoom: 0.9; } }
    @media (min-width: 1920px) { .rp-zoom-modal { zoom: 1; } }
    @media (max-width: 768px) {
      .rp-zoom-modal { zoom: 1; }
      .rp-zoom-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
      .rp-zoom-modal .modal-dialog-scrollable { height: calc(100% - 1.5rem); }
    }

    /* Big modals (submit / view) */
    .rm-modal { max-width: 680px; }
    .rm-modal.lg { max-width: 940px; }
    .rm-modal .modal-content, .cm-modal .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    .rm-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: 1px solid #eef0f3 !important; background: linear-gradient(180deg, color-mix(in srgb, var(--c, #ffc107) 8%, #fff) 0%, #fff 100%); }
    .rm-head-main { display: flex; gap: 0.9rem; align-items: center; min-width: 0; flex: 1; }
    .rm-head-ic { width: 48px; height: 48px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #b88a00; background: rgba(255,193,7,0.18); }
    .rm-head-ic img { width: 30px; height: 30px; object-fit: contain; }
    .rm-kicker { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #b88a00; }
    .rm-title { font-size: 1.2rem; font-weight: 700; color: #1f2328; margin: 0; line-height: 1.3; word-break: break-word; }
    .rm-head-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .rm-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.3rem; }
    .rm-num { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; font-weight: 600; color: #6b7280; margin-top: 0.15rem; }
    .rm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .rm-req { color: #dc3545; }
    .rm-body { padding: 1.4rem 1.5rem !important; }
    .rm-section { margin-bottom: 1.4rem; }
    .rm-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.75rem; }
    .rm-section-title > i { color: #e0a800; font-size: 0.8rem; }
    .rm-count { margin-left: auto; font-size: 0.7rem; background: #f3f4f6; color: #4b5563; padding: 0.1rem 0.55rem; border-radius: 999px; letter-spacing: 0; }
    .rm-label { font-size: 0.84rem; font-weight: 600; color: #374151; margin-bottom: 0.35rem; }
    .rm-input { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .rm-input:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .rm-input.good { border-color: #10b981 !important; }
    .rm-input.bad { border-color: #ef4444 !important; }
    .rm-hint { font-size: 0.78rem; color: #6b7280; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem; }
    .rm-hint.bad { color: #dc3545; }
    .rm-readonly { display: flex; align-items: center; gap: 0.55rem; min-height: 44px; padding: 0.6rem 0.8rem; border-radius: 10px; border: 1.5px dashed #e5e7eb; background: #f8f9fa; font-size: 0.92rem; font-weight: 600; color: #1f2328; }
    .rm-readonly i { color: #9ca3af; }
    .rm-readonly.empty { font-weight: 500; font-style: italic; color: #9ca3af; }
    .rm-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
    .rm-type { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.9rem 0.5rem; border: 1.5px solid #e5e7eb; border-radius: 14px; background: #fff; transition: all 0.15s ease; }
    .rm-type:hover:not(:disabled) { border-color: color-mix(in srgb, var(--c) 50%, #fff); }
    .rm-type.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 6%, #fff); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 15%, transparent); }
    .rm-type-ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .rm-type-ic img { width: 30px; height: 30px; object-fit: contain; }
    .rm-type-label { font-weight: 700; font-size: 0.86rem; color: #374151; text-align: center; line-height: 1.2; }
    .rm-type.on .rm-type-label { color: var(--c); }
    .rm-type-check { position: absolute; top: 7px; right: 8px; color: var(--c); font-size: 0.85rem; }
    .rm-map { border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .rm-pin { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.55rem; padding: 0.55rem 0.75rem; border-radius: 10px; background: #f8f9fa; color: #6b7280; font-size: 0.8rem; }
    .rm-pin.ok { background: rgba(25,135,84,0.07); color: #146c43; border: 1px solid rgba(25,135,84,0.2); }
    .rm-pin .rm-mono { margin-left: 0.3rem; opacity: 0.85; }
    .rm-pin button { margin-left: auto; border: none; background: none; color: #dc3545; font-size: 0.78rem; font-weight: 600; padding: 0; display: inline-flex; align-items: center; gap: 0.3rem; }
    .rm-photos { display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .rm-thumb { position: relative; width: 96px; height: 96px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; background: #f8f9fa; padding: 0; flex-shrink: 0; }
    .rm-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .rm-thumb > button { position: absolute; top: 5px; right: 5px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(17,24,39,0.7); color: #fff; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; }
    .rm-thumb.view { cursor: zoom-in; transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .rm-thumb.view:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
    .rm-thumb-zoom { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0); color: transparent; transition: all 0.15s ease; }
    .rm-thumb.view:hover .rm-thumb-zoom { background: rgba(0,0,0,0.3); color: #fff; }
    .rm-thumb.broken::after { content: 'No preview'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #9ca3af; }
    .rm-thumb.sm { width: 64px; height: 64px; border-radius: 10px; }
    .rm-drop { width: 96px; height: 96px; border-radius: 12px; border: 1.5px dashed #d1d5db; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; color: #6b7280; font-size: 0.78rem; font-weight: 600; cursor: pointer; margin: 0; transition: all 0.15s ease; }
    .rm-drop i { font-size: 1rem; color: #e0a800; }
    .rm-drop:hover { border-color: #ffc107; background: #fffaeb; color: #1f2328; }
    .rm-drop.disabled { opacity: 0.5; pointer-events: none; }
    .rm-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .rm-info { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.7rem 0.8rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .rm-info.wide { grid-column: 1 / -1; }
    .rm-info-ic { width: 30px; height: 30px; border-radius: 9px; background: #fff; border: 1px solid #eef0f3; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .rm-info-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .rm-info-value { font-size: 0.9rem; font-weight: 600; color: #1f2328; word-break: break-word; }
    .rm-desc { font-size: 0.92rem; color: #374151; line-height: 1.6; margin: 0; white-space: pre-line; word-break: break-word; }
    .rm-desc.sm { font-size: 0.86rem; padding: 0.65rem 0.8rem; border: 1px solid #eef0f3; border-radius: 10px; background: #fafbfc; }
    .rm-desc.muted { color: #9ca3af; font-style: italic; }
    .rm-admin { margin-top: 1rem; padding: 0.85rem 1rem; border-radius: 12px; background: rgba(13,110,253,0.05); border: 1px solid rgba(13,110,253,0.18); }
    .rm-admin-head { font-size: 0.78rem; font-weight: 700; color: #0a58ca; display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.3rem; }
    .rm-admin p { margin: 0; font-size: 0.88rem; color: #374151; white-space: pre-line; }
    .rm-map.view { min-height: 260px; }
    .rm-empty { padding: 1.25rem; border: 1px dashed #e5e7eb; border-radius: 12px; color: #9ca3af; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
    .rm-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.86rem; margin-bottom: 1rem; }
    .rm-alert i { margin-top: 3px; }
    .rm-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #b02a37; }
    .rm-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; align-items: center; gap: 0.6rem; }
    .rm-lightbox { position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .rm-lightbox img { max-width: 92vw; max-height: 86vh; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); transition: transform 0.1s ease; }
    .rm-lb-btn { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: #fff; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .rm-lb-btn.close { top: 1.25rem; right: 1.25rem; }
    .rm-lb-btn.prev { left: 1rem; top: 50%; transform: translateY(-50%); }
    .rm-lb-btn.next { right: 1rem; top: 50%; transform: translateY(-50%); }
    .rm-lb-count { position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.75); font-size: 0.8rem; font-weight: 600; }

    /* Small confirmation modals (withdraw / verify / review) */
    .cm-modal { max-width: 430px; }
    .cm-modal.wide { max-width: 520px; }
    @keyframes cmPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    .cm-body { padding: 1.75rem 1.6rem 1.25rem !important; text-align: center; position: relative; }
    .cm-x { position: absolute; top: 1rem; right: 1rem; }
    .cm-icon { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); animation: cmPop 0.4s ease-out; }
    .cm-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; }
    .cm-text { font-size: 0.88rem; color: #6b7280; margin-bottom: 1.1rem; line-height: 1.55; }
    .cm-item { display: flex; align-items: center; gap: 0.7rem; text-align: left; padding: 0.7rem 0.85rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .cm-item-av { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-item-av img { width: 26px; height: 26px; object-fit: contain; }
    .cm-item-name { font-weight: 700; color: #1f2328; font-size: 0.94rem; }
    .cm-item-meta { font-size: 0.76rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cm-note { display: flex; gap: 0.5rem; align-items: flex-start; text-align: left; margin-top: 0.8rem; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.8rem; line-height: 1.5; color: color-mix(in srgb, var(--c) 80%, #000); background: color-mix(in srgb, var(--c) 7%, #fff); border: 1px solid color-mix(in srgb, var(--c) 22%, #fff); }
    .cm-note i { margin-top: 3px; }
    .cm-steps { text-align: left; display: flex; flex-direction: column; gap: 0.45rem; }
    .cm-step { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; border: 1px solid #eef0f3; border-radius: 10px; background: #fafbfc; font-size: 0.86rem; color: #374151; font-weight: 500; }
    .cm-step span { width: 22px; height: 22px; border-radius: 50%; background: #ffc107; color: #1f2328; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-step i { color: #b88a00; width: 16px; text-align: center; }
    .cm-foot { border-top: 1px solid #eef0f3 !important; padding: 0.9rem 1.4rem !important; gap: 0.6rem; flex-wrap: nowrap !important; }
    .cm-foot .rp-btn { flex: 1; margin: 0; padding: 0.62rem; }
    .cm-confirm { background: var(--c); color: #fff; }
    .cm-confirm:hover:not(:disabled) { background: color-mix(in srgb, var(--c) 85%, #000); color: #fff; }

    @media (max-width: 991.98px) {
      .rm-types { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .rm-head { padding: 1rem !important; }
      .rm-head-ic { width: 42px; height: 42px; }
      .rm-title { font-size: 1.08rem; }
      .rm-body { padding: 1rem !important; }
      .rm-type { flex-direction: row; justify-content: flex-start; padding: 0.65rem 0.7rem; gap: 0.55rem; }
      .rm-type-ic { width: 36px; height: 36px; border-radius: 10px; }
      .rm-type-ic img { width: 22px; height: 22px; }
      .rm-type-label { text-align: left; font-size: 0.82rem; }
      .rm-thumb, .rm-drop { width: 84px; height: 84px; }
      .rm-info { padding: 0.6rem 0.65rem; gap: 0.5rem; }
      .rm-info-ic { display: none; }
      .rm-info-value { font-size: 0.86rem; }
      .rm-foot { padding: 0.75rem 1rem !important; }
      .rm-foot .rp-btn { flex: 1; }
      .rm-foot .me-auto { margin-right: 0 !important; }
      .cm-body { padding: 1.5rem 1.1rem 1rem !important; }
      .cm-foot { padding: 0.8rem 1rem !important; }
    }
    @media (max-width: 380px) {
      .rm-info-grid { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) { .cm-icon { animation: none; } }
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

  // Only the first load shows the skeleton; later reloads (after submit / withdraw)
  // update the list in place so the page keeps its scroll position.
  const hasLoadedRef = useRef(false);
  const loadReports = async () => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      const response = await reportsAPI.getMyReports();
      setReports(response.data.reports || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      hasLoadedRef.current = true;
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
      setFloatingMsg('Report submitted successfully! The admin will review it shortly.');
      await loadReports();
      setShowSubmitModal(false);
      setTimeout(() => setFloatingMsg(''), 4000);
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
      setFloatingMsg('Report has been withdrawn successfully.');
      setTimeout(() => setFloatingMsg(''), 4000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Full URL for a report photo stored on the API server
  const API_BASE = (window.location.hostname === 'localhost'
    ? 'http://localhost/city-pet-vaccination-api'
    : 'https://city-pet-vaccination-api.onrender.com').replace(/\/+$/, '');
  const getImgUrl = (img) => {
    if (!img) return '';
    if (img.startsWith('http')) return img;
    return `${API_BASE}/${img.replace(/^\/+/, '')}`;
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

  
  
  const STATUS_META = {
    pending:          { label: 'Pending',          color: '#b88a00', icon: 'fa-clock' },
    suspected_rabies: { label: 'Suspected Rabies', color: '#dc3545', icon: 'fa-exclamation-triangle' },
    positive_rabies:  { label: 'Positive Rabies',  color: '#8b0000', icon: 'fa-biohazard' },
    ongoing:          { label: 'Ongoing',          color: '#0a8aa3', icon: 'fa-spinner' },
    resolved:         { label: 'Resolved',         color: '#198754', icon: 'fa-check-circle' },
    declined:         { label: 'Declined',         color: '#6b7280', icon: 'fa-ban' },
  };
  const statusMeta = (s) => STATUS_META[s] || { label: s || 'Unknown', color: '#6b7280', icon: 'fa-question-circle' };

  const formatShort = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(String(dateStr).replace(' ', 'T'));
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Status filter (only statuses the user actually has)
  const statusCounts = reports.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const filterOptions = [
    { key: 'all', label: 'All', count: reports.length },
    ...Object.keys(STATUS_META).filter(k => statusCounts[k]).map(k => ({ key: k, label: STATUS_META[k].label, count: statusCounts[k] })),
  ];
  const visibleReports = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter);
  const pagedReports = visibleReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageCount = Math.ceil(visibleReports.length / itemsPerPage);

  const canSubmit = !verifLoading && isVerified();
  const verification = ownerProfile ? (VERIFICATION_CONFIG[ownerProfile.verification_status] || VERIFICATION_CONFIG.not_verified) : null;

  const renderPager = () => {
    if (pageCount <= 1) return null;
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(pageCount, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <div className="rp-pager report-pagination">
        <span className="rp-pager-text page-info">
          Showing <strong>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, visibleReports.length)}</strong> of {visibleReports.length}
        </span>
        <div className="d-flex align-items-center gap-1">
          <button type="button" className="rp-page nav" onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
            <i className="fas fa-chevron-left" />
          </button>
          {pages.map(n => (
            <button key={n} type="button" className={`rp-page${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
          ))}
          <button type="button" className="rp-page nav" onClick={() => setCurrentPage(Math.min(currentPage + 1, pageCount))} disabled={currentPage === pageCount} aria-label="Next page">
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 rp-anim">
          <div>
            <div className="d-flex align-items-center flex-wrap gap-2">
              <h2 className="rp-title mobile-page-title">My Reports</h2>
              {!verifLoading && verification && (
                <span className="rp-chip" style={{ color: verification.color, background: verification.color + '18' }}>
                  <i className={`fas ${verification.icon}`} />{verification.label}
                </span>
              )}
            </div>
            <p className="rp-sub">Report rabies cases, animal bites and animals that need rescue in your barangay.</p>
          </div>
          {canSubmit && reports.length > 0 && (
            <button type="button" className="rp-btn primary lg mobile-register-btn" onClick={handleOpenSubmitModal}>
              <i className="fas fa-plus" />Submit report
            </button>
          )}
        </div>

        {/* Pending ID notice */}
        {!verifLoading && ownerProfile?.verification_status === 'pending' && reports.length > 0 && (
          <div className="rp-note warn mb-3 rp-anim" style={{ '--d': '0.05s' }}>
            <i className="fas fa-hourglass-half" />
            Your ID is under review. We'll let you know once your account is verified.
          </div>
        )}

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>{error}
          </Alert>
        )}

        {floatingMsg && (
          <div className="rp-toast" role="status">
            <div className="ic"><i className="fas fa-check" /></div>
            <div className="flex-grow-1">
              <div className="t">Success</div>
              <div className="d">{floatingMsg}</div>
            </div>
            <button type="button" className="rp-toast-close" onClick={() => setFloatingMsg('')} aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* Content */}
        {!verifLoading && !isVerified() && ownerProfile ? (
          <div className="rp-empty rp-anim" style={{ '--d': '0.1s' }}>
            <div className="ic"><i className="fas fa-lock" /></div>
            <h5>Verify your account to use reports</h5>
            <p>To keep reports reliable, only verified accounts can submit and view them. It only takes a few minutes with a valid ID.</p>
            {ownerProfile.verification_status === 'pending' ? (
              <div className="rp-note warn d-inline-flex mb-0">
                <i className="fas fa-hourglass-half" />
                Your ID is under review. Please wait for admin approval.
              </div>
            ) : (
              <button type="button" className="rp-btn primary lg" onClick={handleOpenVerifyModal}>
                <i className="fas fa-id-card" />Verify my account
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="rp-grid">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="rp-card" style={{ opacity: 1 - i * 0.2, minHeight: 230 }}>
                <div className="d-flex gap-3 align-items-center mb-3">
                  <div className="rp-skel" style={{ width: 56, height: 56, borderRadius: 14 }} />
                  <div className="flex-grow-1">
                    <div className="rp-skel mb-2" style={{ width: '55%', height: 14 }} />
                    <div className="rp-skel" style={{ width: '35%', height: 10 }} />
                  </div>
                </div>
                <div className="rp-skel mb-2" style={{ height: 64 }} />
                <div className="rp-skel" style={{ width: '45%', height: 10 }} />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="rp-empty rp-anim" style={{ '--d': '0.1s' }}>
            <div className="ic"><i className="fas fa-flag" /></div>
            <h5>No reports yet</h5>
            <p>Help keep your community safe. Report rabies cases, animal bites, or animals that need rescue.</p>
            {isVerified() ? (
              <button type="button" className="rp-btn primary lg" onClick={handleOpenSubmitModal}>
                <i className="fas fa-plus" />Submit your first report
              </button>
            ) : ownerProfile?.verification_status === 'pending' ? (
              <div className="rp-note warn d-inline-flex mb-0">
                <i className="fas fa-hourglass-half" />
                Your ID is under review. Please wait for admin approval.
              </div>
            ) : (
              <button type="button" className="rp-btn primary lg" onClick={handleOpenVerifyModal}>
                <i className="fas fa-id-card" />Verify account to submit reports
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Status filter */}
            {filterOptions.length > 2 && (
              <div className="rp-filters mb-3 rp-anim" style={{ '--d': '0.05s' }}>
                {filterOptions.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    className={`rp-filter${statusFilter === f.key ? ' on' : ''}`}
                    style={f.key !== 'all' ? { '--c': STATUS_META[f.key].color } : undefined}
                    onClick={() => { setStatusFilter(f.key); setCurrentPage(1); setShowDropdown(null); }}
                    aria-pressed={statusFilter === f.key}
                  >
                    {f.key !== 'all' && <i className="dot" />}
                    {f.label}
                    <span className="count">{f.count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="rp-grid" style={{ flex: '1 1 auto', alignContent: 'flex-start' }}>
              {pagedReports.map((report, index) => {
                const typeInfo = getReportType(report.report_type);
                const st = statusMeta(report.status);
                const canWithdraw = report.status === 'pending' || report.status === 'declined';
                const menuOpen = showDropdown === report.id;
                const openDetails = () => {
                  if (!isVerified()) { setShowDropdown(null); setShowVerifyGate(true); return; }
                  handleViewDetails(report);
                };
                return (
                  <div key={report.id} className={`rp-card rp-anim${menuOpen ? ' raised' : ''}`} style={{ '--d': `${0.08 + index * 0.06}s`, '--t': typeInfo.color }}>
                    {/* Top */}
                    <div className="rp-top">
                      <div className="rp-type-ic" style={{ background: typeInfo.bg }}>
                        <img src={typeInfo.img} alt="" onError={e => { e.target.style.display = 'none'; }} />
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="rp-type">{typeInfo.label}</div>
                        <div className="rp-num">
                          <i className="fas fa-hashtag" />{report.report_number || `RPT-${String(report.id).padStart(6, '0')}`}
                        </div>
                      </div>

                      {/* Menu */}
                      <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
                        <button
                          type="button"
                          className={`rp-icon-btn${menuOpen ? ' on' : ''}`}
                          onClick={() => setShowDropdown(menuOpen ? null : report.id)}
                          aria-label="More options"
                          aria-expanded={menuOpen}
                        >
                          <i className="fas fa-ellipsis-v" />
                        </button>
                        {menuOpen && (
                          <>
                            <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                            <div className="rp-menu" role="menu">
                              <button type="button" role="menuitem" className="rp-menu-item" onClick={openDetails}>
                                <i className="fas fa-eye" />View details
                              </button>
                              {canWithdraw ? (
                                <button type="button" role="menuitem" className="rp-menu-item danger" onClick={() => handleDeleteReport(report)}>
                                  <i className="fas fa-undo-alt" />Withdraw report
                                </button>
                              ) : (
                                <div className="rp-menu-note">
                                  <i className="fas fa-lock" />
                                  This report is already {st.label.toLowerCase()}, so it can't be withdrawn.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mb-3">
                      <span className="rp-chip" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 12%, #fff)` }}>
                        <i className={`fas ${st.icon}`} />{st.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="rp-info">
                      <div className="row-i">
                        <i className="fas fa-map-marker-alt" />
                        <div style={{ minWidth: 0 }}>
                          <div className="v">{getBarangayName(report.barangay_id)}</div>
                          <div className="s rp-ellipsis" title={report.address}>{report.address || 'No address given'}</div>
                        </div>
                      </div>
                      <div className="row-i">
                        <i className="fas fa-phone-alt" />
                        <div className="v">{report.phone_number || 'N/A'}</div>
                      </div>
                    </div>

                    {report.description && (
                      <p className="rp-desc">{report.description}</p>
                    )}

                    {/* Footer */}
                    <div className="rp-foot">
                      <span className="rp-muted"><i className="far fa-calendar me-1" />Submitted {formatShort(report.created_at)}</span>
                      <button type="button" className="rp-btn ghost sm" onClick={openDetails}>
                        View details<i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {renderPager()}
          </>
        )}

        {/* ======================== SUBMIT REPORT MODAL ======================== */}
        <Modal show={showSubmitModal} onHide={() => !submitLoading && setShowSubmitModal(false)} backdrop="static" dialogClassName="rm-modal" className="rp-zoom-modal" scrollable>
          <Modal.Header closeButton className="rm-head">
            <div className="rm-head-main">
              <div className="rm-head-ic"><i className="fas fa-flag" /></div>
              <div>
                <div className="rm-kicker">New report</div>
                <Modal.Title as="h5" className="rm-title">Submit a report</Modal.Title>
                <div className="rm-head-sub">Fields marked <span className="rm-req">*</span> are required.</div>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="rm-body">
            {submitError && <div className="rm-alert danger"><i className="fas fa-exclamation-triangle" />{submitError}</div>}

            {/* Report type */}
            <div className="rm-section">
              <div className="rm-section-title"><i className="fas fa-tag" />What are you reporting? <span className="rm-req">*</span></div>
              <div className="rm-types">
                {REPORT_TYPES.map(type => {
                  const on = formData.report_type === type.value;
                  return (
                    <button key={type.value} type="button" disabled={submitLoading}
                      className={`rm-type${on ? ' on' : ''}`} style={{ '--c': type.color }}
                      onClick={() => { setFormData(prev => ({ ...prev, report_type: type.value })); if (submitError) setSubmitError(''); }}
                      aria-pressed={on}>
                      {on && <i className="fas fa-check-circle rm-type-check" />}
                      <span className="rm-type-ic" style={{ background: type.bg }}>
                        <img src={type.img} alt="" onError={e => { e.target.style.display = 'none'; }} />
                      </span>
                      <span className="rm-type-label">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div className="rm-section">
              <div className="rm-section-title"><i className="fas fa-map-marker-alt" />Location</div>
              <Form.Group className="mb-3">
                <Form.Label className="rm-label">Pin the exact location <span className="rm-req">*</span></Form.Label>
                <div className="rm-map">
                  <LeafletMap
                    lat={formLat}
                    lng={formLng}
                    onLocationSelect={(lat, lng) => { setFormLat(lat); setFormLng(lng); }}
                    onAddressResolve={(address) => { setFormData(prev => ({ ...prev, address })); }}
                    onBarangayDetect={(addrStr) => {
                      const match = barangays.find(b =>
                        addrStr.includes(b.name.toLowerCase()) ||
                        b.name.toLowerCase().split(' ').some(word => word.length > 3 && addrStr.includes(word))
                      );
                      if (match) setFormData(prev => ({ ...prev, barangay_id: String(match.id) }));
                    }}
                    onError={null}
                  />
                </div>
                {formLat && formLng ? (
                  <div className="rm-pin ok">
                    <i className="fas fa-check-circle" />
                    <span>Location pinned <span className="rm-mono">{formLat.toFixed(5)}, {formLng.toFixed(5)}</span></span>
                    <button type="button" onClick={() => { setFormLat(null); setFormLng(null); }} disabled={submitLoading}>
                      <i className="fas fa-times" />Clear
                    </button>
                  </div>
                ) : (
                  <div className="rm-pin"><i className="fas fa-hand-pointer" />Tap the map to drop a pin. The barangay and address fill in automatically.</div>
                )}
              </Form.Group>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="rm-label">Barangay <span className="rm-req">*</span></Form.Label>
                  <div className={`rm-readonly${formData.barangay_id ? '' : ' empty'}`}>
                    <i className="fas fa-map" />
                    {formData.barangay_id ? (barangays.find(b => b.id === parseInt(formData.barangay_id))?.name || '') : 'Detected from the map pin'}
                  </div>
                </Col>
                <Col md={6}>
                  <Form.Label className="rm-label">Contact number <span className="rm-req">*</span></Form.Label>
                  <Form.Control
                    className={`rm-input${formFieldErrors.phone_number ? ' bad' : (formData.phone_number && /^09\d{9}$/.test(formData.phone_number)) ? ' good' : ''}`}
                    type="tel" inputMode="numeric" maxLength={11} name="phone_number" value={formData.phone_number}
                    onChange={handleFormChange}
                    onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                    placeholder="09XXXXXXXXX" required disabled={submitLoading}
                  />
                  {formFieldErrors.phone_number && <div className="rm-hint bad"><i className="fas fa-times-circle" />{formFieldErrors.phone_number}</div>}
                </Col>
                <Col md={12}>
                  <Form.Label className="rm-label">Address <span className="rm-req">*</span></Form.Label>
                  <Form.Control className="rm-input" type="text" name="address" value={formData.address}
                    onChange={handleFormChange} placeholder="House no., street, purok / sitio…" required disabled={submitLoading} />
                </Col>
              </Row>
            </div>

            {/* Details */}
            <div className="rm-section">
              <div className="rm-section-title"><i className="fas fa-align-left" />Details</div>
              <Form.Control className="rm-input" as="textarea" rows={3} name="description" value={formData.description}
                onChange={handleFormChange} placeholder="What happened? Describe the animal, the incident, and anything else that can help." disabled={submitLoading} />
            </div>

            {/* Photos */}
            <div className="rm-section mb-0">
              <div className="rm-section-title"><i className="fas fa-camera" />Photos <span className="rm-req">*</span><span className="rm-count">{imageFiles.length}/3</span></div>
              <div className="rm-photos">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="rm-thumb">
                    <img src={src} alt={`Attachment ${i + 1}`} />
                    <button type="button" onClick={() => handleRemoveImage(i)} disabled={submitLoading} aria-label="Remove photo"><i className="fas fa-times" /></button>
                  </div>
                ))}
                {imageFiles.length < 3 && (
                  <label className={`rm-drop${submitLoading ? ' disabled' : ''}`}>
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} disabled={submitLoading} hidden />
                    <i className="fas fa-plus" />
                    <span>Add photo</span>
                  </label>
                )}
              </div>
              <div className="rm-hint">Up to 3 photos of the animal or the incident.</div>
            </div>
          </Modal.Body>
          <Modal.Footer className="rm-foot">
            <button type="button" className="rp-btn ghost lg" onClick={() => setShowSubmitModal(false)} disabled={submitLoading}>Cancel</button>
            <button type="button" className="rp-btn primary lg" disabled={submitLoading}
              onClick={() => {
                if (!formData.report_type)         { setSubmitError('Please select a report type.');    return; }
                if (!formLat || !formLng)          { setSubmitError('Please pin a location on the map before submitting.'); return; }
                if (!formData.barangay_id)         { setSubmitError('Please pin a location inside Muntinlupa so the barangay can be detected.'); return; }
                if (!formData.phone_number.trim()) { setSubmitError('Please enter a contact number.');   return; }
                if (!/^09\d{9}$/.test(formData.phone_number)) { setSubmitError('Contact number must be 11 digits starting with 09.'); return; }
                if (!formData.address.trim())      { setSubmitError('Please enter your address.');       return; }
                if (imageFiles.length === 0)       { setSubmitError('Please attach at least one photo.'); return; }
                setSubmitError('');
                setShowConfirmModal(true);
              }}>
              {submitLoading ? <WaveDots /> : <><i className="fas fa-arrow-right" />Review report</>}
            </button>
          </Modal.Footer>
        </Modal>

        {/* ======================== VIEW DETAILS MODAL ======================== */}
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} dialogClassName="rm-modal lg" className="rp-zoom-modal" scrollable>
          {selectedReport && (() => {
            const r = selectedReport;
            const t = getReportType(r.report_type);
            const st = statusMeta(r.status);
            const images = r.images || [];
            const info = [
              { icon: 'fa-map', label: 'Barangay', value: getBarangayName(r.barangay_id) },
              { icon: 'fa-phone-alt', label: 'Contact no.', value: r.phone_number || 'N/A' },
              { icon: 'fa-home', label: 'Address', value: r.address || 'N/A', wide: true },
              { icon: 'fa-calendar-plus', label: 'Submitted', value: formatDate(r.created_at) },
              r.updated_at && r.updated_at !== r.created_at && { icon: 'fa-history', label: 'Last updated', value: formatDate(r.updated_at) },
            ].filter(Boolean);
            return (
              <>
                <Modal.Header closeButton className="rm-head" style={{ '--c': t.color }}>
                  <div className="rm-head-main">
                    <div className="rm-head-ic tinted" style={{ background: t.bg }}>
                      <img src={t.img} alt="" onError={e => { e.target.style.display = 'none'; }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="rm-chips">
                        <span className="rp-chip" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 12%, #fff)` }}>
                          <i className={`fas ${st.icon}`} />{st.label}
                        </span>
                      </div>
                      <Modal.Title as="h5" className="rm-title">{t.label}</Modal.Title>
                      <div className="rm-num">#{r.report_number || `RPT-${String(r.id).padStart(6, '0')}`}</div>
                    </div>
                  </div>
                </Modal.Header>
                <Modal.Body className="rm-body">
                  <Row className="g-4">
                    <Col lg={7}>
                      <div className="rm-section-title"><i className="fas fa-info-circle" />Report information</div>
                      <div className="rm-info-grid">
                        {info.map(it => (
                          <div key={it.label} className={`rm-info${it.wide ? ' wide' : ''}`}>
                            <div className="rm-info-ic"><i className={`fas ${it.icon}`} /></div>
                            <div style={{ minWidth: 0 }}>
                              <div className="rm-info-label">{it.label}</div>
                              <div className="rm-info-value">{it.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rm-section-title mt-4"><i className="fas fa-align-left" />Description</div>
                      <p className={`rm-desc${r.description ? '' : ' muted'}`}>{r.description || 'No additional description provided.'}</p>

                      {r.admin_notes && (
                        <div className="rm-admin">
                          <div className="rm-admin-head"><i className="fas fa-user-shield" />Note from the City Vet</div>
                          <p>{r.admin_notes}</p>
                        </div>
                      )}

                      {images.length > 0 && (
                        <>
                          <div className="rm-section-title mt-4"><i className="fas fa-images" />Attached photos <span className="rm-count">{images.length}</span></div>
                          <div className="rm-photos">
                            {images.map((img, i) => {
                              const src = getImgUrl(img);
                              return (
                                <button key={i} type="button" className="rm-thumb view" onClick={() => { setLightboxImg(src); setLightboxZoom(1); }} aria-label={`Open photo ${i + 1}`}>
                                  <img src={src} alt={`Report photo ${i + 1}`}
                                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.classList.add('broken'); }} />
                                  <span className="rm-thumb-zoom"><i className="fas fa-search-plus" /></span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </Col>
                    <Col lg={5}>
                      <div className="rm-section-title"><i className="fas fa-map-marker-alt" />Pinned location</div>
                      {r.latitude && r.longitude ? (
                        <div className="rm-map view">
                          <LeafletMap lat={parseFloat(r.latitude)} lng={parseFloat(r.longitude)} readOnly={true} />
                        </div>
                      ) : (
                        <div className="rm-empty"><i className="fas fa-map-marker-alt" />No location was pinned for this report.</div>
                      )}
                    </Col>
                  </Row>
                </Modal.Body>
                <Modal.Footer className="rm-foot">
                  {(r.status === 'pending' || r.status === 'declined') && (
                    <button type="button" className="rp-btn danger-outline lg me-auto" onClick={() => { setShowDetailsModal(false); handleDeleteReport(r); }}>
                      <i className="fas fa-undo-alt" />Withdraw
                    </button>
                  )}
                  <button type="button" className="rp-btn ghost lg" onClick={() => setShowDetailsModal(false)}>Close</button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>

        {/* Photo lightbox (outside the modal so it covers the whole screen) */}
        {lightboxImg && selectedReport && (() => {
          const imgs = (selectedReport.images || []).map(getImgUrl);
          const idx = imgs.indexOf(lightboxImg);
          const go = (d) => { setLightboxImg(imgs[(idx + d + imgs.length) % imgs.length]); setLightboxZoom(1); };
          return (
            <div className="rm-lightbox" onClick={() => { setLightboxImg(null); setLightboxZoom(1); }}
              onWheel={e => setLightboxZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 0.5), 5))}>
              <img src={lightboxImg} alt="Full view" onClick={e => e.stopPropagation()} style={{ transform: `scale(${lightboxZoom})` }} />
              <button type="button" className="rm-lb-btn close" onClick={() => { setLightboxImg(null); setLightboxZoom(1); }} aria-label="Close"><i className="fas fa-times" /></button>
              {imgs.length > 1 && (
                <>
                  <button type="button" className="rm-lb-btn prev" onClick={e => { e.stopPropagation(); go(-1); }} aria-label="Previous"><i className="fas fa-chevron-left" /></button>
                  <button type="button" className="rm-lb-btn next" onClick={e => { e.stopPropagation(); go(1); }} aria-label="Next"><i className="fas fa-chevron-right" /></button>
                  <div className="rm-lb-count">{idx + 1} / {imgs.length}</div>
                </>
              )}
            </div>
          );
        })()}

        {/* ======================== WITHDRAW MODAL ======================== */}
        <Modal show={showDeleteModal} onHide={() => !deleteLoading && setShowDeleteModal(false)} centered dialogClassName="cm-modal" className="rp-zoom-modal">
          {selectedReport && (() => {
            const t = getReportType(selectedReport.report_type);
            return (
              <>
                <Modal.Body className="cm-body">
                  <div className="cm-icon" style={{ '--c': '#dc3545' }}><i className="fas fa-undo-alt" /></div>
                  <h5 className="cm-title">Withdraw this report?</h5>
                  <p className="cm-text">The City Vet will no longer see or act on this report. This cannot be undone.</p>
                  <div className="cm-item">
                    <div className="cm-item-av" style={{ background: t.bg }}><img src={t.img} alt="" onError={e => { e.target.style.display = 'none'; }} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cm-item-name">{t.label}</div>
                      <div className="cm-item-meta">
                        #{selectedReport.report_number || `RPT-${String(selectedReport.id).padStart(6, '0')}`} · Brgy. {getBarangayName(selectedReport.barangay_id)}
                      </div>
                    </div>
                  </div>
                  <div className="cm-note" style={{ '--c': '#dc3545' }}>
                    <i className="fas fa-info-circle" /><span>Only pending or declined reports can be withdrawn.</span>
                  </div>
                </Modal.Body>
                <Modal.Footer className="cm-foot">
                  <button type="button" className="rp-btn ghost" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Keep report</button>
                  <button type="button" className="rp-btn cm-confirm" style={{ '--c': '#dc3545' }} onClick={confirmDeleteReport} disabled={deleteLoading}>
                    {deleteLoading ? <WaveDots color="#ffffff" /> : <><i className="fas fa-undo-alt" />Withdraw</>}
                  </button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>

        {/* ══════════ VERIFICATION GATE MODAL ══════════ */}
        <Modal show={showVerifyGate} onHide={() => setShowVerifyGate(false)} centered dialogClassName="cm-modal" className="rp-zoom-modal">
          <Modal.Body className="cm-body">
            <button type="button" className="btn-close cm-x" aria-label="Close" onClick={() => setShowVerifyGate(false)} />
            <div className="cm-icon" style={{ '--c': '#e0a800' }}><i className="fas fa-shield-alt" /></div>
            <h5 className="cm-title">Verify your account first</h5>
            <p className="cm-text">To submit or view reports, verify your identity with a valid government ID. This keeps every report reliable.</p>
            <div className="cm-steps">
              {[
                { icon: 'fa-user-check', text: 'Complete your profile information' },
                { icon: 'fa-id-card', text: 'Upload a valid government ID' },
                { icon: 'fa-map-marker-alt', text: 'Provide your complete address' },
              ].map((item, i) => (
                <div key={i} className="cm-step"><span>{i + 1}</span><i className={`fas ${item.icon}`} />{item.text}</div>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer className="cm-foot">
            <button type="button" className="rp-btn ghost" onClick={() => setShowVerifyGate(false)}>Not now</button>
            <button type="button" className="rp-btn primary" onClick={() => { setShowVerifyGate(false); handleOpenVerifyModal(); }}>
              <i className="fas fa-id-card" />Verify now
            </button>
          </Modal.Footer>
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

        {/* ======================== REVIEW & CONFIRM MODAL ======================== */}
        <Modal show={showConfirmModal} onHide={() => !submitLoading && setShowConfirmModal(false)} centered dialogClassName="cm-modal wide" className="rp-zoom-modal" scrollable>
          {(() => {
            const t = formData.report_type ? getReportType(formData.report_type) : null;
            const rows = [
              { icon: 'fa-map', label: 'Barangay', value: barangays.find(b => b.id === parseInt(formData.barangay_id))?.name || '—' },
              { icon: 'fa-phone-alt', label: 'Contact no.', value: formData.phone_number || '—' },
              { icon: 'fa-home', label: 'Address', value: formData.address || '—', wide: true },
              { icon: 'fa-map-pin', label: 'Pinned location', value: formLat && formLng ? `${formLat.toFixed(5)}, ${formLng.toFixed(5)}` : 'Not pinned', mono: true, wide: true },
            ];
            return (
              <>
                <Modal.Body className="cm-body">
                  <div className="cm-icon" style={{ '--c': '#e0a800' }}><i className="fas fa-clipboard-check" /></div>
                  <h5 className="cm-title">Review your report</h5>
                  <p className="cm-text">Please check the details before sending them to the City Vet.</p>

                  {t && (
                    <div className="cm-item" style={{ borderColor: `${t.color}40`, background: t.bg }}>
                      <div className="cm-item-av" style={{ background: '#fff' }}><img src={t.img} alt="" onError={e => { e.target.style.display = 'none'; }} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cm-item-meta" style={{ color: t.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem' }}>Report type</div>
                        <div className="cm-item-name">{t.label}</div>
                      </div>
                    </div>
                  )}

                  <div className="rm-info-grid mt-2 text-start">
                    {rows.map(it => (
                      <div key={it.label} className={`rm-info${it.wide ? ' wide' : ''}`}>
                        <div className="rm-info-ic"><i className={`fas ${it.icon}`} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="rm-info-label">{it.label}</div>
                          <div className={`rm-info-value${it.mono ? ' rm-mono' : ''}`}>{it.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-start mt-3">
                    <div className="rm-info-label mb-1">Description</div>
                    <p className={`rm-desc sm${formData.description ? '' : ' muted'}`}>{formData.description || 'No description provided.'}</p>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="text-start mt-3">
                      <div className="rm-info-label mb-2">Photos ({imagePreviews.length})</div>
                      <div className="rm-photos sm">
                        {imagePreviews.map((src, i) => <div key={i} className="rm-thumb sm"><img src={src} alt={`Attachment ${i + 1}`} /></div>)}
                      </div>
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer className="cm-foot">
                  <button type="button" className="rp-btn ghost" onClick={() => setShowConfirmModal(false)} disabled={submitLoading}>
                    <i className="fas fa-arrow-left" />Edit
                  </button>
                  <button type="button" className="rp-btn primary" disabled={submitLoading}
                    onClick={async (e) => { setShowConfirmModal(false); await handleSubmitReport(e); }}>
                    {submitLoading ? <WaveDots /> : <><i className="fas fa-paper-plane" />Submit report</>}
                  </button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>
      </Container>
    </>
  );
};

export default Reports;