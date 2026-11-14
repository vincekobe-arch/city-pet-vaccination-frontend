import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table } from 'react-bootstrap';
import { barangayAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';

const clinicReportsAPI = {
  getMyReports: () => api.get('/reports/my-reports'),
  create:       (data) => api.post('/reports/create', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/reports/delete/${id}`),
};

const getStatusConfig = (status) => {
  const map = {
    pending:          { label: 'Pending',          bg: '#fff3cd', color: '#ffffff', border: '#ffc107' },
    suspected_rabies: { label: 'Suspected Rabies', bg: '#f8d7da', color: '#ffffff', border: '#dc3545' },
    positive_rabies:  { label: 'Positive Rabies',  bg: '#dc3545', color: '#ffffff', border: '#b02a37' },
    ongoing:          { label: 'Ongoing',           bg: '#cff4fc', color: '#ffffff', border: '#0dcaf0' },
    resolved:         { label: 'Resolved',          bg: '#d1e7dd', color: '#ffffff', border: '#198754' },
    declined:         { label: 'Declined',          color: '#ffffff', bg: '#6c757d', border: '#565e64' },
  };
  return map[status] || { label: status, bg: '#e9ecef', color: '#333', border: '#adb5bd' };
};

const StatusBadge = ({ status }) => {
  const cfg = getStatusConfig(status);
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

// ── Leaflet map (read-only + pin mode) ──────────────────────────
const LeafletMap = ({ lat, lng, onLocationSelect, onAddressResolve, onBarangayDetect, readOnly = false, onError }) => {
  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setReady(true);
    script.onerror = () => setMapError('Failed to load map.');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    const defLat = lat || 14.4081, defLng = lng || 121.0415;
    const bounds = window.L.latLngBounds([14.34, 120.97], [14.50, 121.12]);
    const map = window.L.map(mapRef.current, {
      minZoom: 12, maxZoom: 22, maxBounds: bounds, maxBoundsViscosity: 0.7
    }).setView([defLat, defLng], 13);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 22, maxNativeZoom: 19
    }).addTo(map);
    if (lat && lng) markerRef.current = window.L.marker([lat, lng]).addTo(map);

const poly = [
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
    ];    const inside = (lt, ln) => { let ins = false; for (let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>ln)!==(yj>ln))&&(lt<(xj-xi)*(ln-yi)/(yj-yi)+xi))ins=!ins;}return ins; };

    window.L.polygon(poly, { color:'#dc3545', weight:2, opacity:0.7, fillOpacity:0, dashArray:'6,4' }).addTo(map);

    if (!readOnly) {
      map.on('click', (e) => {
        const { lat: lt, lng: ln } = e.latlng;
        if (!inside(lt, ln)) return;
        if (markerRef.current) markerRef.current.setLatLng([lt, ln]);
        else markerRef.current = window.L.marker([lt, ln]).addTo(map);
        onLocationSelect && onLocationSelect(lt, ln);
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lt}&lon=${ln}&zoom=17&addressdetails=1`)
          .then(r => r.json())
          .then(data => {
            const display = data.display_name || '';
            onAddressResolve && onAddressResolve(display);
            const addrStr = `${data.address?.suburb||''} ${data.address?.village||''} ${data.address?.quarter||''} ${data.address?.neighbourhood||''}`.toLowerCase();
            onBarangayDetect && onBarangayDetect(addrStr);
          }).catch(() => {});
      });
    }
    mapObj.current = map;
    setTimeout(() => map.invalidateSize(), 300);
    return () => { map.remove(); mapObj.current = null; markerRef.current = null; };
  // eslint-disable-next-line
  }, [ready]);

  useEffect(() => {
    if (!mapObj.current || !lat || !lng) return;
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    else markerRef.current = window.L.marker([lat, lng]).addTo(mapObj.current);
  }, [lat, lng]);

  if (mapError) return <div style={{ background:'#fff3f3', borderRadius:'8px', padding:'1rem', color:'#dc3545' }}><i className="fas fa-exclamation-triangle me-2"></i>{mapError}</div>;

  return (
    <div style={{ position: isFullscreen ? 'fixed' : 'relative', inset: isFullscreen ? 0 : 'auto', zIndex: isFullscreen ? 9999 : 'auto', background: isFullscreen ? '#fff' : 'transparent', padding: isFullscreen ? '1rem' : 0, display: 'flex', flexDirection: 'column' }}>
      {!ready && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f9fa', borderRadius:'8px', zIndex:1 }}>
          <Spinner animation="border" size="sm" style={{ color:'#dc3545' }} /><span className="ms-2" style={{ fontSize:'0.9rem', color:'#666' }}>Loading map...</span>
        </div>
      )}
      <button type="button" onClick={() => { setIsFullscreen(p => !p); setTimeout(() => mapObj.current?.invalidateSize(), 300); }}
        style={{ position:'absolute', top: isFullscreen?'1.75rem':'10px', right: isFullscreen?'1.75rem':'10px', zIndex:1000, background:'#fff', border:'2px solid #dee2e6', borderRadius:'8px', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}
        onMouseOver={e => { e.currentTarget.style.borderColor='#dc3545'; e.currentTarget.style.background='#fff3f3'; }}
        onMouseOut={e => { e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.background='#fff'; }}>
        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize:'0.8rem', color:'#555' }}></i>
      </button>
      <div ref={mapRef} style={{ height: isFullscreen ? '100%' : (readOnly ? '250px' : '380px'), width:'100%', borderRadius:'8px', border:'2px solid #dee2e6', flex: isFullscreen ? 1 : 'auto' }} />
      {!readOnly && (
        <>
          <button type="button"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
            const poly = [
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
    ];                const inside = (lt, ln) => { let ins=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>ln)!==(yj>ln))&&(lt<(xj-xi)*(ln-yi)/(yj-yi)+xi))ins=!ins;}return ins; };
                if (!inside(latitude, longitude)) { onError && onError('Your location is outside Muntinlupa City.'); return; }
                if (mapObj.current) {
                  mapObj.current.setView([latitude, longitude], 16);
                  if (markerRef.current) markerRef.current.setLatLng([latitude, longitude]);
                  else markerRef.current = window.L.marker([latitude, longitude]).addTo(mapObj.current);
                  onLocationSelect && onLocationSelect(latitude, longitude);
                  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=17&addressdetails=1`)
                    .then(r => r.json())
                    .then(data => {
                      onAddressResolve && onAddressResolve(data.display_name || '');
                      const addrStr = `${data.address?.suburb||''} ${data.address?.village||''} ${data.address?.quarter||''} ${data.address?.neighbourhood||''}`.toLowerCase();
                      onBarangayDetect && onBarangayDetect(addrStr);
                    }).catch(() => {});
                }
              }, () => onError && onError('Unable to get your location.'));
            }}
            style={{ position:'absolute', bottom:'38px', right:'10px', zIndex:1000, background:'#fff', border:'2px solid #dee2e6', borderRadius:'8px', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}
            onMouseOver={e => { e.currentTarget.style.borderColor='#dc3545'; e.currentTarget.style.background='#fff3f3'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.background='#fff'; }}>
            <i className="fas fa-location-arrow" style={{ fontSize:'0.8rem', color:'#555' }}></i>
          </button>
          <small style={{ display:'block', marginTop:'0.4rem', color:'#888', fontSize:'0.78rem' }}>
            <i className="fas fa-mouse-pointer me-1"></i>Click on the map to pin the exact location
          </small>
        </>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────
const ClinicReports = () => {
  const [reports,       setReports]       = useState([]);
  const [barangays,     setBarangays]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [successMsg,    setSuccessMsg]    = useState('');
  const [showModal,     setShowModal]     = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDropdown,    setShowDropdown]    = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [reportToDelete,  setReportToDelete]  = useState(null);
  const [reportToEdit,    setReportToEdit]    = useState(null);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [editLoading,     setEditLoading]     = useState(false);
  const [editError,       setEditError]       = useState('');
  const [editData,        setEditData]        = useState({ address:'', phone_number:'', description:'' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError,   setSubmitError]   = useState('');
  const [locationError, setLocationError] = useState('');
  const [imageFiles,    setImageFiles]    = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [formLat, setFormLat] = useState(null);
  const [formLng, setFormLng] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    barangay_id: '',
    address: '',
    phone_number: '',
    description: '',
  });

  const styles = `
    @keyframes dropDown { 0%{opacity:0;transform:translateY(-30px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    .clinic-reports-page { zoom: 0.75; }
    @media (min-width: 1600px) { .clinic-reports-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .clinic-reports-page { zoom: 1; } }
    @media (max-width: 768px) {
      .clinic-reports-page { zoom: 1; }
      .rep-title { font-size: 1.3rem !important; }
      .rep-subtitle { font-size: 0.78rem !important; }
      .rep-header-btn { padding: 0.5rem 0.9rem !important; font-size: 0.8rem !important; border-radius: 8px !important; }
      .rep-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
      .rep-card-body { padding: 1rem !important; }
      .rep-card-header { padding: 0.85rem 1rem !important; }
      .rep-card-icon { width: 44px !important; height: 44px !important; font-size: 1.3rem !important; }
      .rep-modal-body { padding: 1.25rem !important; }
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
      .rp-grid { grid-template-columns: 1fr; gap: 0.85rem; }
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
  `;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, bRes] = await Promise.all([
        clinicReportsAPI.getMyReports(),
        barangayAPI.getAll(),
      ]);
      // Filter only rabies_case reports submitted by this clinic
      const all = rRes.data.reports || [];
      setReports(all.filter(r => r.report_type === 'rabies_case'));
      setBarangays(bRes.data.barangays || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getBarangayName = (id) => {
    const b = barangays.find(b => b.id === parseInt(id));
    return b ? b.name : 'Unknown';
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError('');
  };

  const handleOpenModal = () => {
    setFormData({ barangay_id:'', address:'', phone_number:'', description:'' });
    setSubmitError('');
    setImageFiles([]);
    setImagePreviews([]);
    setFormLat(null);
    setFormLng(null);
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const MAX = 3;
    if (files.length + imageFiles.length > MAX) { setSubmitError(`Max ${MAX} images allowed.`); return; }
    const newFiles = [...imageFiles, ...files].slice(0, MAX);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const handleDeleteReport = (report) => {
    setReportToDelete(report);
    setShowDeleteModal(true);
    setShowDropdown(null);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await clinicReportsAPI.delete(reportToDelete.id);
      setSuccessMsg('Report withdrawn successfully.');
      setShowDeleteModal(false);
      setReportToDelete(null);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditReport = (report) => {
    setReportToEdit(report);
    setEditData({
      address:      report.address      || '',
      phone_number: report.phone_number || '',
      description:  report.description  || '',
    });
    setEditError('');
    setShowEditModal(true);
    setShowDropdown(null);
  };

  const confirmEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    if (!editData.address.trim())      { setEditError('Address is required.');        setEditLoading(false); return; }
    if (!editData.phone_number.trim()) { setEditError('Contact number is required.'); setEditLoading(false); return; }
if (!/^09\d{9}$/.test(editData.phone_number)) { setEditError('Contact number must be 11 digits starting with 09.'); setEditLoading(false); return; }
    try {
      await api.put(`/reports/update/${reportToEdit.id}`, {
        address:      editData.address,
        phone_number: editData.phone_number,
        description:  editData.description,
      });
      setSuccessMsg('Report updated successfully.');
      setShowEditModal(false);
      setReportToEdit(null);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveImage = (i) => {
    const newFiles = imageFiles.filter((_, idx) => idx !== i);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError('');

    if (!formData.barangay_id)         { setSubmitError('Barangay is required. Pin a location on the map.'); setSubmitLoading(false); return; }
    if (!formData.address.trim())      { setSubmitError('Address is required.');        setSubmitLoading(false); return; }
if (!formData.phone_number.trim()) { setSubmitError('Contact number is required.'); setSubmitLoading(false); return; }
if (!/^09\d{9}$/.test(formData.phone_number)) { setSubmitError('Contact number must be 11 digits starting with 09.'); setSubmitLoading(false); return; }
    if (!formLat || !formLng)          { setSubmitError('Please pin a location on the map.'); setSubmitLoading(false); return; }

    try {
      const fd = new FormData();
      fd.append('report_type',  'rabies_case');
      fd.append('barangay_id',  formData.barangay_id);
      fd.append('address',      formData.address);
      fd.append('phone_number', formData.phone_number);
      fd.append('description',  formData.description);
      fd.append('latitude',     formLat);
      fd.append('longitude',    formLng);
      // Signal backend to auto-set positive_rabies
      
      imageFiles.forEach(f => fd.append('images[]', f));

      await clinicReportsAPI.create(fd);
      setSuccessMsg('Rabies case reported successfully and marked as Positive Rabies.');
      await loadData();
      setTimeout(() => { setShowModal(false); setSuccessMsg(''); }, 2500);
    } catch (err) {
      const { message } = handleAPIError(err);
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const paginatedReports = reports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(reports.length / itemsPerPage);

  // Stats
  const positiveCount  = reports.filter(r => r.status === 'positive_rabies').length;
  const suspectedCount = reports.filter(r => r.status === 'suspected_rabies').length;
  const resolvedCount  = reports.filter(r => r.status === 'resolved').length;

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
              <h2 className="rp-title rep-title">Rabies Case Reports</h2>
            </div>
            <p className="rp-sub rep-subtitle">Report confirmed or suspected rabies cases to alert the City Vet and the community.</p>
          </div>
          {reports.length > 0 && (
            <button type="button" className="rp-btn primary lg rep-header-btn" onClick={handleOpenModal}>
              <i className="fas fa-plus" />Report rabies case
            </button>
          )}
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>{error}
          </Alert>
        )}

        {successMsg && (
          <div className="rp-toast" role="status">
            <div className="ic"><i className="fas fa-check" /></div>
            <div className="flex-grow-1">
              <div className="t">Success</div>
              <div className="d">{successMsg}</div>
            </div>
            <button type="button" className="rp-toast-close" onClick={() => setSuccessMsg('')} aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
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
            <div className="ic"><i className="fas fa-biohazard" /></div>
            <h5>No rabies cases reported yet</h5>
            <p>Report confirmed or suspected rabies cases to alert the community and start an immediate response.</p>
            <button type="button" className="rp-btn primary lg" onClick={handleOpenModal}>
              <i className="fas fa-plus" />Report first rabies case
            </button>
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
                const typeInfo = { label: 'Rabies case', color: '#dc3545' };
                const st = statusMeta(report.status);
                const canWithdraw = report.status === 'pending' || report.status === 'positive_rabies';
                const menuOpen = showDropdown === report.id;
                const openDetails = () => { setSelectedReport(report); setShowViewModal(true); setShowDropdown(null); };
                return (
                  <div key={report.id} className={`rp-card rp-anim${menuOpen ? ' raised' : ''}`} style={{ '--d': `${0.08 + index * 0.06}s`, '--t': typeInfo.color }}>
                    {/* Top */}
                    <div className="rp-top">
                      <div className="rp-type-ic" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545', fontSize: '1.3rem' }}>
                        <i className="fas fa-biohazard" />
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
                                <>
                                  <button type="button" role="menuitem" className="rp-menu-item" onClick={() => { setShowDropdown(null); handleEditReport(report); }}>
                                    <i className="fas fa-pen" />Edit report
                                  </button>
                                  <div className="rp-menu-sep" />
                                  <button type="button" role="menuitem" className="rp-menu-item danger" onClick={() => { setShowDropdown(null); handleDeleteReport(report); }}>
                                    <i className="fas fa-undo-alt" />Withdraw report
                                  </button>
                                </>
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

        {/* ── SUBMIT MODAL ── */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" backdrop="static" style={{ zoom:'0.75' }}>
          <Modal.Header closeButton style={{ background:'linear-gradient(135deg,#fffdf0,#fff3cd)', borderBottom:'2px solid #ffc107', borderRadius:'20px 20px 0 0' }}>
    <Modal.Title style={{ fontWeight:'700', color:'#856404' }}>
      <i className="fas fa-biohazard me-2"></i>Report Rabies Case
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body className="rep-modal-body" style={{ maxHeight:'70vh', overflowY:'auto', padding:'2rem' }}>
              {submitError && <Alert variant="danger" className="mb-3"><i className="fas fa-exclamation-triangle me-2"></i>{submitError}</Alert>}

              <Alert variant="danger" className="mb-4" style={{ borderRadius:'12px', background:'rgba(255,193,7,0.08)', border:'2px solid rgba(255,193,7,0.3)', color:'#856404' }}>
  <i className="fas fa-biohazard me-2"></i>
                <i className="fas fa-biohazard me-2"></i>
                <strong>Clinic Report:</strong> This report will be submitted for <strong>admin verification</strong>. Once reviewed and confirmed, it will be marked as Positive Rabies and alert the community.
              </Alert>

              {/* Barangay (auto from map) */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>
                      Barangay <span style={{ color:'#dc3545' }}>*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.barangay_id ? (barangays.find(b => b.id === parseInt(formData.barangay_id))?.name || '') : 'Pin location on map to auto-detect'}
                      readOnly
                      style={{ borderRadius:'8px', padding:'0.75rem', border:'2px solid #dee2e6', background:'#f8f9fa', color: formData.barangay_id ? '#333' : '#aaa', fontStyle: formData.barangay_id ? 'normal' : 'italic' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>
                      Contact Number <span style={{ color:'#dc3545' }}>*</span>
                    </Form.Label>
                    <Form.Control type="text" name="phone_number" value={formData.phone_number} onChange={handleFormChange}
  onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
  placeholder="09XXXXXXXXX" required disabled={submitLoading}
  style={{ borderRadius:'8px', padding:'0.75rem', border: submitError && !formData.phone_number.trim() ? '2px solid #ef4444' : (formData.phone_number && /^09\d{9}$/.test(formData.phone_number)) ? '2px solid #10b981' : '2px solid #dee2e6' }} />
{formData.phone_number && !/^09\d{9}$/.test(formData.phone_number) && (
  <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}>
    <i className="fas fa-times-circle me-1"></i>Phone must be 11 digits starting with 09
  </small>
)}
                  </Form.Group>
                </Col>
              </Row>

              {/* Address */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>
                      Address / Location <span style={{ color:'#dc3545' }}>*</span>
                    </Form.Label>
                    <Form.Control type="text" name="address" value={formData.address} onChange={handleFormChange}
                      placeholder="House no., Street, Purok / Sitio..." required disabled={submitLoading}
                      style={{ borderRadius:'8px', padding:'0.75rem', border:'2px solid #dee2e6' }} />
                  </Form.Group>
                </Col>
              </Row>

              {/* Description */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>Case Details / Description</Form.Label>
                    <Form.Control as="textarea" rows={3} name="description" value={formData.description} onChange={handleFormChange}
                      placeholder="Describe the animal, symptoms observed, date of exposure, patient info (if any)..."
                      disabled={submitLoading} style={{ borderRadius:'8px', padding:'0.75rem', border:'2px solid #dee2e6' }} />
                  </Form.Group>
                </Col>
              </Row>

              {/* Map */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>
                      <i className="fas fa-map-marker-alt me-2" style={{ color:'#ffc107' }}></i>
                      Pin Case Location on Map <span style={{ color:'#dc3545' }}>*</span>
                    </Form.Label>
                    <LeafletMap
                      lat={formLat} lng={formLng}
                      onLocationSelect={(lt, ln) => { setFormLat(lt); setFormLng(ln); }}
                      onAddressResolve={(addr) => setFormData(prev => ({ ...prev, address: addr }))}
                      onBarangayDetect={(addrStr) => {
                        const match = barangays.find(b =>
                          addrStr.includes(b.name.toLowerCase()) ||
                          b.name.toLowerCase().split(' ').some(w => w.length > 3 && addrStr.includes(w))
                        );
                        if (match) setFormData(prev => ({ ...prev, barangay_id: String(match.id) }));
                      }}
                      onError={msg => setLocationError(msg)}
                    />
                    {formLat && formLng && (
                      <div style={{ marginTop:'0.5rem', padding:'0.5rem 0.75rem', background:'rgba(255,193,7,0.06)', borderRadius:'8px', border:'1px solid rgba(255,193,7,0.3)', fontSize:'0.82rem', color:'#856404' }}>
                        <i className="fas fa-map-pin me-1"></i>
                        Pinned: {formLat.toFixed(6)}, {formLng.toFixed(6)}
                        <button onClick={() => { setFormLat(null); setFormLng(null); setFormData(prev => ({ ...prev, barangay_id:'' })); }}
                          style={{ background:'none', border:'none', color:'#856404', fontSize:'0.78rem', marginLeft:'0.75rem', cursor:'pointer', padding:0 }}>
                        </button>
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {/* Images */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-2">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>
                      <i className="fas fa-camera me-2" style={{ color:'#ffc107' }}></i>
                      Attach Photos <span style={{ fontWeight:'400', color:'#888', fontSize:'0.8rem' }}>(optional, max 3)</span>
                    </Form.Label>
                    <Form.Control type="file" accept="image/*" multiple onChange={handleImageChange}
                      disabled={submitLoading || imageFiles.length >= 3}
                      style={{ borderRadius:'8px', border:'2px solid #dee2e6', padding:'0.6rem' }} />
                  </Form.Group>
                  {imagePreviews.length > 0 && (
                    <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginTop:'0.75rem' }}>
                      {imagePreviews.map((src, i) => (
                        <div key={i} style={{ position:'relative' }}>
                          <img src={src} alt={`prev-${i}`} style={{ width:'90px', height:'90px', objectFit:'cover', borderRadius:'10px', border:'2px solid #dee2e6' }} />
                          <button type="button" onClick={() => handleRemoveImage(i)}
                            style={{ position:'absolute', top:'-8px', right:'-8px', background:'#dc3545', border:'none', borderRadius:'50%', width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', fontSize:'0.7rem' }}>
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer style={{ padding:'1.25rem 2rem' }}>
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitLoading}
                style={{ borderRadius:'8px', padding:'0.75rem 1.5rem', fontWeight:'600' }}>Cancel</Button>
              <Button type="button" disabled={submitLoading} className="border-0"
  onClick={(e) => {
    e.preventDefault();
    if (!formData.barangay_id)         { setSubmitError('Barangay is required. Pin a location on the map.'); return; }
    if (!formData.address.trim())      { setSubmitError('Address is required.');        return; }
    if (!formData.phone_number.trim()) { setSubmitError('Contact number is required.'); return; }
    if (!/^09\d{9}$/.test(formData.phone_number)) { setSubmitError('Contact number must be 11 digits starting with 09.'); return; }
    if (!formLat || !formLng)          { setSubmitError('Please pin a location on the map.'); return; }
    setSubmitError('');
    setShowConfirmModal(true);
  }}
  style={{ background: submitLoading?'#6c757d':'#ffc107', color: submitLoading?'#fff':'#000', borderRadius:'8px', padding:'0.75rem 1.5rem', fontWeight:'700', boxShadow: submitLoading?'none':'0 4px 15px rgba(255,193,7,0.4)' }}>
  {submitLoading ? (<><Spinner size="sm" animation="border" className="me-2" />Submitting...</>) : (<><i className="fas fa-biohazard me-2"></i>Submit Rabies Report</>)}
</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* ── LOCATION ERROR MODAL ── */}
        <Modal show={!!locationError} onHide={() => setLocationError('')} centered style={{ zoom:'0.75' }}>
          <Modal.Header closeButton style={{ background:'#fffdf0', borderBottom:'2px solid #ffc107' }}>
    <Modal.Title style={{ fontWeight:'700', color:'#856404', fontSize:'1rem' }}><i className="fas fa-map-marker-alt me-2"></i>Location Outside Muntinlupa</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding:'2rem', textAlign:'center' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📍</div>
            <p style={{ color:'#333', fontWeight:'600' }}>Cannot Pin Location</p>
            <p style={{ color:'#666', fontSize:'0.9rem' }}>{locationError}</p>
          </Modal.Body>
          <Modal.Footer style={{ justifyContent:'center' }}>
            <Button onClick={() => setLocationError('')} className="border-0"
              style={{ background:'#ffc107', color:'#000', borderRadius:'8px', padding:'0.65rem 2rem', fontWeight:'700' }}>Got it</Button>
          </Modal.Footer>
        </Modal>

        {/* ── VIEW DETAILS MODAL ── */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" style={{ zoom:'0.75' }}>
          <Modal.Header closeButton style={{ background:'linear-gradient(135deg,#fffdf0,#fff3cd)', borderBottom:'2px solid #ffc107', borderRadius:'20px 20px 0 0' }}>
    <Modal.Title style={{ fontWeight:'700', color:'#856404' }}>🦠 Rabies Case Details</Modal.Title>
          </Modal.Header>
          <Modal.Body className="rep-modal-body" style={{ padding:'2rem' }}>
            {selectedReport && (
              <Row>
                <Col xs={12} md={6}>
                  <Card className="border-0 mb-3" style={{ borderRadius:'14px', boxShadow:'0 2px 10px rgba(0,0,0,0.07)' }}>
                    <Card.Header style={{ background:'rgba(255,193,7,0.1)', borderBottom:'2px solid rgba(255,193,7,0.3)', borderRadius:'14px 14px 0 0' }}>
      <h6 className="mb-0" style={{ fontWeight:'700', color:'#333' }}><i className="fas fa-info-circle me-2" style={{ color:'#ffc107' }}></i>Report Information</h6>
                    </Card.Header>
                    <Card.Body>
                      <Table borderless size="sm">
                        <tbody>
                          {[
                            ['Report No.',  <code style={{ background:'#f8f9fa', padding:'0.1rem 0.4rem', borderRadius:'4px' }}>{selectedReport.report_number}</code>],
                            ['Status',      <StatusBadge status={selectedReport.status} />],
                            ['Barangay',    getBarangayName(selectedReport.barangay_id)],
                            ['Address',     selectedReport.address || 'N/A'],
                            ['Contact',     selectedReport.phone_number || 'N/A'],
                            ['Submitted',   formatDate(selectedReport.created_at)],
                          ].map(([label, val]) => (
                            <tr key={label}>
                              <td style={{ fontWeight:'600', color:'#666', width:'110px', paddingBottom:'0.5rem' }}>{label}:</td>
                              <td style={{ fontWeight:'500', color:'#333' }}>{val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  {selectedReport.description && (
                    <Card className="border-0 mb-3" style={{ borderRadius:'14px', boxShadow:'0 2px 10px rgba(0,0,0,0.07)' }}>
                      <Card.Header style={{ background:'rgba(255,193,7,0.1)', borderBottom:'2px solid rgba(255,193,7,0.3)', borderRadius:'14px 14px 0 0' }}>
      <h6 className="mb-0" style={{ fontWeight:'700', color:'#333' }}><i className="fas fa-align-left me-2" style={{ color:'#ffc107' }}></i>Case Details</h6>
                      </Card.Header>
                      <Card.Body><p style={{ color:'#555', lineHeight:'1.7', marginBottom:0 }}>{selectedReport.description}</p></Card.Body>
                    </Card>
                  )}
                  {selectedReport.admin_notes && (
                    <Card className="border-0 mb-3" style={{ borderRadius:'14px', boxShadow:'0 2px 10px rgba(0,0,0,0.07)' }}>
                      <Card.Header style={{ background:'rgba(13,202,240,0.08)', borderBottom:'2px solid rgba(13,202,240,0.3)', borderRadius:'14px 14px 0 0' }}>
                        <h6 className="mb-0" style={{ fontWeight:'700', color:'#333' }}><i className="fas fa-user-shield me-2" style={{ color:'#0dcaf0' }}></i>Admin Notes</h6>
                      </Card.Header>
                      <Card.Body><p style={{ color:'#555', lineHeight:'1.7', marginBottom:0 }}>{selectedReport.admin_notes}</p></Card.Body>
                    </Card>
                  )}
                  {selectedReport.latitude && selectedReport.longitude && (
                    <Card className="border-0" style={{ borderRadius:'14px', boxShadow:'0 2px 10px rgba(0,0,0,0.07)' }}>
                      <Card.Header style={{ background:'rgba(255,193,7,0.1)', borderBottom:'2px solid rgba(255,193,7,0.3)', borderRadius:'14px 14px 0 0' }}>
      <h6 className="mb-0" style={{ fontWeight:'700', color:'#333' }}><i className="fas fa-map-marker-alt me-2" style={{ color:'#ffc107' }}></i>Pinned Location</h6>
                      </Card.Header>
                      <Card.Body style={{ padding:'1rem' }}>
                        <LeafletMap lat={parseFloat(selectedReport.latitude)} lng={parseFloat(selectedReport.longitude)} readOnly={true} />
                      </Card.Body>
                    </Card>
                  )}
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowViewModal(false)}
              style={{ borderRadius:'10px', padding:'0.65rem 1.5rem', fontWeight:'600' }}>Close</Button>
          </Modal.Footer>
        </Modal>

      {/* ── EDIT MODAL ── */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" backdrop="static" style={{ zoom:'0.75' }}>
          <Modal.Header closeButton style={{ background:'linear-gradient(135deg,#fffdf0,#fff3cd)', borderBottom:'2px solid #ffc107', borderRadius:'20px 20px 0 0' }}>
    <Modal.Title style={{ fontWeight:'700', color:'#856404' }}>
      <i className="fas fa-edit me-2"></i>Edit Rabies Report
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={confirmEdit}>
            <Modal.Body className="rep-modal-body" style={{ maxHeight:'70vh', overflowY:'auto', padding:'2rem' }}>
              {editError && <Alert variant="danger" className="mb-3"><i className="fas fa-exclamation-triangle me-2"></i>{editError}</Alert>}

              <Alert variant="danger" className="mb-4" style={{ borderRadius:'12px', background:'rgba(255,193,7,0.08)', border:'2px solid rgba(255,193,7,0.3)', color:'#856404' }}>
  <i className="fas fa-biohazard me-2"></i>
  <strong>Editing Clinic Report:</strong> This report is pending admin verification. Only address, contact, and description can be updated.
              </Alert>

              {/* Barangay (read-only) */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>Barangay</Form.Label>
                    <Form.Control
                      type="text"
                      value={reportToEdit ? (barangays.find(b => b.id === parseInt(reportToEdit.barangay_id))?.name || 'Unknown') : ''}
                      readOnly
                      style={{ borderRadius:'8px', padding:'0.75rem', border:'2px solid #dee2e6', background:'#f8f9fa', color:'#666' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>
                      Contact Number <span style={{ color:'#dc3545' }}>*</span>
                    </Form.Label>
                    <Form.Control type="text" value={editData.phone_number}
  onChange={e => setEditData(prev => ({ ...prev, phone_number: e.target.value }))}
  onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
  placeholder="09XXXXXXXXX" required disabled={editLoading}
  style={{ borderRadius:'8px', padding:'0.75rem', border: editData.phone_number && !/^09\d{9}$/.test(editData.phone_number) ? '2px solid #ef4444' : (editData.phone_number && /^09\d{9}$/.test(editData.phone_number)) ? '2px solid #10b981' : '2px solid #dee2e6' }} />
{editData.phone_number && !/^09\d{9}$/.test(editData.phone_number) && (
  <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}>
    <i className="fas fa-times-circle me-1"></i>Phone must be 11 digits starting with 09
  </small>
)}
                  </Form.Group>
                </Col>
              </Row>

              {/* Address */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>
                      Address / Location <span style={{ color:'#dc3545' }}>*</span>
                    </Form.Label>
                    <Form.Control type="text" value={editData.address}
                      onChange={e => setEditData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="House no., Street, Purok / Sitio..." required disabled={editLoading}
                      style={{ borderRadius:'8px', padding:'0.75rem', border:'2px solid #dee2e6' }} />
                  </Form.Group>
                </Col>
              </Row>

              {/* Description */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontWeight:'600', color:'#333' }}>Case Details / Description</Form.Label>
                    <Form.Control as="textarea" rows={3} value={editData.description}
                      onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the animal, symptoms observed, date of exposure, patient info (if any)..."
                      disabled={editLoading}
                      style={{ borderRadius:'8px', padding:'0.75rem', border:'2px solid #dee2e6' }} />
                  </Form.Group>
                </Col>
              </Row>

              {/* Pinned location (read-only map) */}
              {reportToEdit?.latitude && reportToEdit?.longitude && (
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight:'600', color:'#333' }}>
                        <i className="fas fa-map-marker-alt me-2" style={{ color:'#ffc107' }}></i>
        Pinned Location
                      </Form.Label>
                      <LeafletMap
                        lat={parseFloat(reportToEdit.latitude)}
                        lng={parseFloat(reportToEdit.longitude)}
                        readOnly={true}
                      />
                      <small style={{ color:'#888', fontSize:'0.78rem', marginTop:'0.4rem', display:'block' }}>
                        <i className="fas fa-info-circle me-1"></i>Location cannot be changed after submission.
                      </small>
                    </Form.Group>
                  </Col>
                </Row>
              )}
            </Modal.Body>
            <Modal.Footer style={{ padding:'1.25rem 2rem' }}>
              <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={editLoading}
                style={{ borderRadius:'8px', padding:'0.75rem 1.5rem', fontWeight:'600' }}>Cancel</Button>
              <Button type="submit" disabled={editLoading} className="border-0"
                style={{ background: editLoading?'#6c757d':'#ffc107', color: editLoading?'#fff':'#000', borderRadius:'8px', padding:'0.75rem 1.5rem', fontWeight:'700', boxShadow: editLoading?'none':'0 4px 15px rgba(255,193,7,0.4)' }}>
                {editLoading ? (<><Spinner size="sm" animation="border" className="me-2" />Saving...</>) : (<><i className="fas fa-save me-2"></i>Save Changes</>)}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* ── DELETE/WITHDRAW MODAL ── */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered style={{ zoom:'0.75' }}>
          <Modal.Header closeButton style={{ background:'#fffdf0', borderBottom:'2px solid #ffc107' }}>
    <Modal.Title style={{ fontWeight:'700', color:'#856404' }}><i className="fas fa-exclamation-triangle me-2"></i>Withdraw Report</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding:'2rem' }}>
            {reportToDelete && (
              <>
                <p style={{ fontSize:'1rem', marginBottom:'1.25rem' }}>Are you sure you want to withdraw this rabies case report?</p>
                <div style={{ background:'#f8f9fa', padding:'1.25rem', borderRadius:'8px', borderLeft:'4px solid #ffc107', marginBottom:'1rem' }}>
                  <strong>Barangay:</strong> {getBarangayName(reportToDelete.barangay_id)}<br />
                  <small className="text-muted"><i className="fas fa-map-marker-alt me-1"></i>{reportToDelete.address}</small>
                </div>
                <Alert variant="warning" className="mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Note:</strong> This action cannot be undone and will remove the danger zone from the map.
                </Alert>
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{ padding:'1.25rem 2rem' }}>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
              style={{ borderRadius:'8px', padding:'0.75rem 1.5rem', fontWeight:'600' }}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteLoading}
              style={{ borderRadius:'8px', padding:'0.75rem 1.5rem', fontWeight:'700' }}>
              {deleteLoading ? (<><Spinner size="sm" animation="border" className="me-2" />Withdrawing...</>) : (<><i className="fas fa-trash me-2"></i>Withdraw Report</>)}
            </Button>
          </Modal.Footer>
        </Modal>
{/* ── CONFIRM SUBMIT MODAL ── */}
<Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered style={{ zoom:'0.75' }}>
  <Modal.Header closeButton style={{ background:'linear-gradient(135deg,#fffdf0,#fff3cd)', borderBottom:'2px solid #ffc107' }}>
    <Modal.Title style={{ fontWeight:'700', color:'#856404' }}>
      <i className="fas fa-biohazard me-2"></i>Confirm Rabies Case Submission
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding:'2rem' }}>
    <p style={{ color:'#555', fontSize:'0.9rem', marginBottom:'1.25rem' }}>
      Please review the details before submitting this rabies case report.
    </p>

    <Alert variant="warning" className="mb-3" style={{ borderRadius:'10px', background:'rgba(255,193,7,0.08)', border:'2px solid rgba(255,193,7,0.3)', color:'#856404', fontSize:'0.85rem' }}>
      <i className="fas fa-biohazard me-2"></i>
      <strong>Clinic Report:</strong> This will be submitted for admin verification before being marked as Positive Rabies.
    </Alert>

    <div style={{ background:'#f8f9fa', borderRadius:'12px', padding:'1rem', border:'1px solid #e9ecef' }}>
      {[
        { icon:'fa-map-marker-alt', label:'Barangay',       value: barangays.find(b => b.id === parseInt(formData.barangay_id))?.name || '—' },
        { icon:'fa-home',           label:'Address',         value: formData.address || '—' },
        { icon:'fa-phone',          label:'Contact No.',     value: formData.phone_number || '—' },
        { icon:'fa-align-left',     label:'Description',     value: formData.description || 'No description provided' },
        { icon:'fa-map-pin',        label:'Pinned Location', value: formLat && formLng ? `${formLat.toFixed(5)}, ${formLng.toFixed(5)}` : 'Not pinned' },
        { icon:'fa-camera',         label:'Attached Photos', value: imageFiles.length > 0 ? `${imageFiles.length} photo(s)` : 'None' },
      ].map((item, i, arr) => (
        <div key={i} style={{ display:'flex', gap:'0.75rem', paddingBottom: i < arr.length-1 ? '0.75rem' : 0, marginBottom: i < arr.length-1 ? '0.75rem' : 0, borderBottom: i < arr.length-1 ? '1px solid #e9ecef' : 'none' }}>
          <div style={{ width:'28px', flexShrink:0, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'2px' }}>
            <i className={`fas ${item.icon}`} style={{ color:'#ffc107', fontSize:'0.8rem' }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', fontWeight:'700', color:'#999', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'2px' }}>{item.label}</div>
            <div style={{ fontWeight:'600', color:'#333', fontSize:'0.88rem', wordBreak:'break-word' }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  </Modal.Body>
  <Modal.Footer style={{ padding:'1.25rem 2rem', gap:'0.75rem' }}>
    <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={submitLoading}
      style={{ borderRadius:'10px', padding:'0.75rem 1.5rem', fontWeight:'600' }}>
      <i className="fas fa-arrow-left me-2" />Edit
    </Button>
    <Button disabled={submitLoading} className="border-0"
      onClick={async (e) => {
        setShowConfirmModal(false);
        await handleSubmit(e);
      }}
      style={{ background: submitLoading?'#6c757d':'#ffc107', color: submitLoading?'#fff':'#000', borderRadius:'10px', padding:'0.75rem 1.75rem', fontWeight:'700', boxShadow:'0 4px 14px rgba(255,193,7,0.4)', transition:'all 0.3s' }}
      onMouseOver={e => { if(!submitLoading) e.currentTarget.style.boxShadow='0 6px 20px rgba(255,193,7,0.6)'; }}
      onMouseOut={e  => e.currentTarget.style.boxShadow='0 4px 14px rgba(255,193,7,0.4)'}>
      {submitLoading
        ? <><Spinner size="sm" animation="border" className="me-2" />Submitting...</>
        : <><i className="fas fa-biohazard me-2" />Confirm & Submit</>}
    </Button>
  </Modal.Footer>
</Modal>
      </Container>
    </>
  );
};

export default ClinicReports;