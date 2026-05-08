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

    const poly = [[14.4700,121.0200],[14.4650,121.0500],[14.4550,121.0700],[14.4400,121.0800],[14.4200,121.0750],[14.4000,121.0700],[14.3800,121.0600],[14.3600,121.0450],[14.3550,121.0250],[14.3650,121.0050],[14.3850,120.9980],[14.4050,120.9950],[14.4300,121.0000],[14.4550,121.0050],[14.4700,121.0200]];
    const inside = (lt, ln) => { let ins = false; for (let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>ln)!==(yj>ln))&&(lt<(xj-xi)*(ln-yi)/(yj-yi)+xi))ins=!ins;}return ins; };

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
                const poly = [[14.4700,121.0200],[14.4650,121.0500],[14.4550,121.0700],[14.4400,121.0800],[14.4200,121.0750],[14.4000,121.0700],[14.3800,121.0600],[14.3600,121.0450],[14.3550,121.0250],[14.3650,121.0050],[14.3850,120.9980],[14.4050,120.9950],[14.4300,121.0000],[14.4550,121.0050],[14.4700,121.0200]];
                const inside = (lt, ln) => { let ins=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>ln)!==(yj>ln))&&(lt<(xj-xi)*(ln-yi)/(yj-yi)+xi))ins=!ins;}return ins; };
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

  const [formData, setFormData] = useState({
    barangay_id: '',
    address: '',
    phone_number: '',
    description: '',
  });

  const styles = `
    @keyframes dropDown { 0%{opacity:0;transform:translateY(-30px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
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

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#fff', minHeight: '100vh', zoom: '0.75' }}>

        {/* Header */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i className="fas fa-biohazard" style={{ fontSize: '1.5rem', color: '#ffc107', animation: 'float 3s ease-in-out infinite' }}></i>
                <div>
                  <h2 style={{ fontWeight: '700', color: '#333', fontSize: '2rem', marginBottom: 0 }}>Rabies Case Reports</h2>
                  <small style={{ color: '#888', fontWeight: '500' }}>Report confirmed or suspected rabies cases</small>
                </div>
              </div>
              {reports.length > 0 && (
                <Button onClick={handleOpenModal} className="border-0"
                  style={{ background: '#ffc107', color: '#000', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '700', boxShadow: '0 4px 15px rgba(255,193,7,0.4)', transition: 'all 0.3s' }}
  onMouseOver={e => { e.currentTarget.style.background = '#ffb300'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
  onMouseOut={e  => { e.currentTarget.style.background = '#ffc107'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <i className="fas fa-plus me-2"></i>Report Rabies Case
                </Button>
              )}
            </div>
          </Col>
        </Row>

        {/* Alerts */}
        {error && <Row className="mb-3"><Col><Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius:'12px', border:'2px solid #ffc107', background:'rgba(255,193,7,0.08)', color:'#856404' }}>
          <i className="fas fa-exclamation-triangle me-2"></i>{error}</Alert></Col></Row>}
        {successMsg && <Row className="mb-3"><Col><Alert variant="success" dismissible onClose={() => setSuccessMsg('')} style={{ borderRadius:'12px', border:'2px solid #198754', background:'rgba(25,135,84,0.08)', color:'#198754' }}><i className="fas fa-check-circle me-2"></i>{successMsg}</Alert></Col></Row>}

        

        {/* Content */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color:'#dc3545', width:'3rem', height:'3rem' }} />
            <p className="mt-3 text-muted">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <Card className="border-0 text-center py-5" style={{ borderRadius:'20px', boxShadow:'0 4px 20px rgba(0,0,0,0.07)' }}>
            <Card.Body>
              <i className="fas fa-biohazard text-muted mb-4" style={{ fontSize:'4rem', color:'#e0e0e0' }}></i>
              <h4 className="text-muted mb-3">No Rabies Cases Reported Yet</h4>
              <p className="text-muted mb-4">Report confirmed rabies cases to alert the community and trigger immediate response.</p>
              <Button onClick={handleOpenModal} className="border-0"
                style={{ background:'#ffc107', color:'#000', padding:'0.875rem 2rem', borderRadius:'12px', fontWeight:'700', boxShadow:'0 4px 15px rgba(255,193,7,0.4)' }}>
                <i className="fas fa-plus me-2"></i>Report First Rabies Case
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <>
            <Row>
              {paginatedReports.map((report, idx) => (
                <Col key={report.id} lg={6} xl={4} className="mb-4" style={{ animation: `dropDown 0.4s ease-out ${0.1 + idx * 0.08}s backwards` }}>
                  <Card className="h-100 border-0" style={{ borderRadius:'20px', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', transition:'all 0.3s', overflow:'hidden', position:'relative' }}
                    onMouseOver={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow='0 10px 30px rgba(255,193,7,0.2)'; }}
onMouseOut={e  => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)'; }}>

                    {/* Dropdown */}
                    <div style={{ position:'absolute', top:'12px', right:'12px', zIndex:10 }}>
                      <button onClick={() => setShowDropdown(showDropdown === report.id ? null : report.id)}
                        style={{ background:'transparent', border:'none', borderRadius:'50%', padding:'0.4rem', cursor:'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background='rgba(0,0,0,0.06)'}
                        onMouseOut={e  => e.currentTarget.style.background='transparent'}>
                        <img src="/ellipsis.png" alt="menu" style={{ width:'20px', height:'20px', objectFit:'contain' }} />
                      </button>
                      {showDropdown === report.id && (
                        <>
                          <div onClick={() => setShowDropdown(null)} style={{ position:'fixed', inset:0, zIndex:999 }} />
                          <div style={{ position:'absolute', top:'100%', right:0, marginTop:'0.4rem', background:'#fff', border:'1px solid #e0e0e0', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', minWidth:'160px', zIndex:1000, overflow:'hidden' }}>
                            <button onClick={() => { setSelectedReport(report); setShowViewModal(true); setShowDropdown(null); }}
                              style={{ width:'100%', padding:'0.75rem 1rem', border:'none', background:'#fff', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.9rem', color:'#333', fontWeight:'500' }}
                              onMouseOver={e => e.currentTarget.style.background='#f8f9fa'}
                              onMouseOut={e  => e.currentTarget.style.background='#fff'}>
                              <img src="/view.png" alt="view" style={{ width:'18px', height:'18px', objectFit:'contain' }} />
                              <span>View Details</span>
                            </button>
                            {report.status === 'positive_rabies' || report.status === 'pending' ? (
                              <button onClick={() => handleEditReport(report)}
                                style={{ width:'100%', padding:'0.75rem 1rem', border:'none', background:'#fff', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.9rem', color:'#333', fontWeight:'500', borderTop:'1px solid #f0f0f0' }}
                                onMouseOver={e => e.currentTarget.style.background='#f8f9fa'}
                                onMouseOut={e  => e.currentTarget.style.background='#fff'}>
                                <img src="/edit(1).png" alt="edit" style={{ width:'18px', height:'18px', objectFit:'contain' }} />
                                <span>Edit Report</span>
                              </button>
                            ) : null}
                            {report.status === 'pending' || report.status === 'positive_rabies' ? (
                              <button onClick={() => handleDeleteReport(report)}
                                style={{ width:'100%', padding:'0.75rem 1rem', border:'none', background:'#fff', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.9rem', color:'#dc3545', fontWeight:'500', borderTop:'1px solid #f0f0f0' }}
                                onMouseOver={e => e.currentTarget.style.background='#fff5f5'}
                                onMouseOut={e  => e.currentTarget.style.background='#fff'}>
                                <img src="/remove.png" alt="withdraw" style={{ width:'18px', height:'18px', objectFit:'contain' }} />
                                <span>Withdraw Report</span>
                              </button>
                            ) : (
                              <div style={{ width:'100%', padding:'0.75rem 1rem', borderTop:'1px solid #f0f0f0', background:'#f0fff5', fontSize:'0.8rem', color:'#0f5132' }}>
                                <i className="fas fa-check-circle me-1"></i>Already Resolved
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <Card.Header style={{ background:'linear-gradient(135deg,#fffdf0,#fff3cd)', borderBottom:'2px solid #ffc107', paddingRight:'3.5rem', borderRadius:'20px 20px 0 0' }}>
                      <div className="d-flex align-items-center gap-3">
                        <div style={{ width:'60px', height:'60px', borderRadius:'14px', background:'rgba(220,53,69,0.1)', border:'2px solid rgba(220,53,69,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem' }}>
                          🦠
                        </div>
                        <div>
                          <h6 style={{ fontWeight:'700', color:'#333', marginBottom:'2px' }}>Rabies Case</h6>
                          <small className="text-muted">{report.report_number || `RPT-${String(report.id).padStart(6,'0')}`}</small>
                        </div>
                      </div>
                    </Card.Header>

                    <Card.Body style={{ padding:'1.25rem' }}>
                      <div className="mb-3">
                        <StatusBadge status={report.status} />
                      </div>
                      <Row className="mb-2">
                        <Col xs={6}>
                          <small style={{ color:'#999', fontWeight:'600', fontSize:'0.72rem', textTransform:'uppercase' }}>Barangay</small>
                          <div style={{ fontWeight:'600', color:'#333', fontSize:'0.9rem' }}>{getBarangayName(report.barangay_id)}</div>
                        </Col>
                        <Col xs={6}>
                          <small style={{ color:'#999', fontWeight:'600', fontSize:'0.72rem', textTransform:'uppercase' }}>Contact</small>
                          <div style={{ fontWeight:'600', color:'#333', fontSize:'0.9rem' }}>{report.phone_number || 'N/A'}</div>
                        </Col>
                      </Row>
                      <div className="mb-2">
                        <small style={{ color:'#999', fontWeight:'600', fontSize:'0.72rem', textTransform:'uppercase' }}>Address</small>
                        <div style={{ fontWeight:'500', color:'#555', fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{report.address || 'N/A'}</div>
                      </div>
                      <small className="text-muted"><i className="fas fa-calendar me-1"></i>{formatDate(report.created_at)}</small>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Pagination */}
            {totalPages > 1 && (
              <Row className="mt-3">
                <Col className="d-flex justify-content-center">
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage===1}
                      style={{ background: currentPage===1?'#e9ecef':'#fff', border:'2px solid #dee2e6', borderRadius:'8px', padding:'0.5rem 0.75rem', cursor: currentPage===1?'not-allowed':'pointer', fontWeight:'600', color: currentPage===1?'#adb5bd':'#333' }}
                      onMouseOver={e => { if(currentPage!==1){e.currentTarget.style.borderColor='#ffc107';} }}
                      onMouseOut={e  => { e.currentTarget.style.borderColor='#dee2e6'; }}>
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i+1).map(page => (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        style={{ background: currentPage===page?'#ffc107':'#fff', border:'2px solid', borderColor: currentPage===page?'#ffc107':'#dee2e6', borderRadius:'8px', padding:'0.5rem 0.75rem', minWidth:'40px', cursor:'pointer', fontWeight:'700', color: currentPage===page?'#000':'#333' }}
onMouseOver={e => { if(currentPage!==page)e.currentTarget.style.borderColor='#ffc107'; }}
onMouseOut={e  => { if(currentPage!==page)e.currentTarget.style.borderColor='#dee2e6'; }}>
                        {page}
                      </button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))} disabled={currentPage===totalPages}
                      style={{ background: currentPage===totalPages?'#e9ecef':'#fff', border:'2px solid #dee2e6', borderRadius:'8px', padding:'0.5rem 0.75rem', cursor: currentPage===totalPages?'not-allowed':'pointer', fontWeight:'600', color: currentPage===totalPages?'#adb5bd':'#333' }}
                      onMouseOver={e => { if(currentPage!==totalPages)e.currentTarget.style.borderColor='#ffc107'; }}
                      onMouseOut={e  => { e.currentTarget.style.borderColor='#dee2e6'; }}>
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </Col>
              </Row>
            )}
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
            <Modal.Body style={{ maxHeight:'70vh', overflowY:'auto', padding:'2rem' }}>
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
          <Modal.Body style={{ padding:'2rem' }}>
            {selectedReport && (
              <Row>
                <Col md={6}>
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
                <Col md={6}>
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
            <Modal.Body style={{ maxHeight:'70vh', overflowY:'auto', padding:'2rem' }}>
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