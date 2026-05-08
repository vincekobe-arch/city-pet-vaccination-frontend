import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table, InputGroup } from 'react-bootstrap';
import { clinicAPI, handleAPIError } from '../../services/api';

// ─── Leaflet Map (reused from Reports) ───────────────────────────────────────
const LeafletMap = ({ lat, lng, onLocationSelect, onAddressResolve, readOnly = false, onError }) => {
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

  const muntinlupaPolygonCoords = [
    [14.4700,121.0200],[14.4650,121.0500],[14.4550,121.0700],[14.4400,121.0800],
    [14.4200,121.0750],[14.4000,121.0700],[14.3800,121.0600],[14.3600,121.0450],
    [14.3550,121.0250],[14.3650,121.0050],[14.3850,120.9980],[14.4050,120.9950],
    [14.4300,121.0000],[14.4550,121.0050],[14.4700,121.0200],
  ];
  const isInsideMuntinlupa = (lat, lng) => {
    let inside = false;
    for (let i = 0, j = muntinlupaPolygonCoords.length - 1; i < muntinlupaPolygonCoords.length; j = i++) {
      const xi = muntinlupaPolygonCoords[i][0], yi = muntinlupaPolygonCoords[i][1];
      const xj = muntinlupaPolygonCoords[j][0], yj = muntinlupaPolygonCoords[j][1];
      const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const reverseGeocode = (lat, lng, cb) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`)
      .then(r => r.json())
      .then(data => {
        const plusCode = data.extratags?.['ref:Global'] || data.extratags?.plus_code || null;
        const display  = plusCode
          ? `${plusCode} ${data.address?.city || 'Muntinlupa'}, ${data.address?.state || 'Metro Manila'}`
          : (data.display_name || '');
        cb && cb(display);
      })
      .catch(() => {});
  };

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
    const defaultLat = lat || 14.4081;
    const defaultLng = lng || 121.0415;

    const muntinlupaBounds = window.L.latLngBounds([14.3400, 120.9700], [14.5000, 121.1200]);
    const map = window.L.map(mapRef.current, {
      minZoom: 12, maxZoom: 18,
      maxBounds: muntinlupaBounds, maxBoundsViscosity: 0.7
    }).setView([defaultLat, defaultLng], 13);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    if (lat && lng) {
      map.whenReady(() => {
        setTimeout(() => {
          if (mapObj.current) {
            markerRef.current = window.L.marker([lat, lng]).addTo(map);
          }
        }, 100);
      });
    }

    window.L.polygon(muntinlupaPolygonCoords, {
      color: '#ffc107', weight: 2.5, opacity: 0.8,
      fillColor: '#ffc107', fillOpacity: 0, dashArray: '6,4',
    }).addTo(map);

    if (!readOnly) {
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (!isInsideMuntinlupa(clickLat, clickLng)) {
          onError && onError('Selected location is outside Muntinlupa City. Only locations within Muntinlupa can be pinned.');
          return;
        }
        if (markerRef.current) markerRef.current.setLatLng([clickLat, clickLng]);
        else markerRef.current = window.L.marker([clickLat, clickLng]).addTo(map);
        onLocationSelect && onLocationSelect(clickLat, clickLng);
        reverseGeocode(clickLat, clickLng, (addr) => onAddressResolve && onAddressResolve(addr));
      });
    }

    mapObj.current = map;
    setTimeout(() => map.invalidateSize(), 300);
    return () => { map.remove(); mapObj.current = null; markerRef.current = null; };
  // eslint-disable-next-line
  }, [ready]);

  React.useEffect(() => {
    if (!mapObj.current || !lat || !lng) return;
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    else markerRef.current = window.L.marker([lat, lng]).addTo(mapObj.current);
    mapObj.current.setView([lat, lng], mapObj.current.getZoom());
  }, [lat, lng]);

  if (mapError) return (
    <div style={{ background:'#fff3f3', borderRadius:'8px', padding:'1rem', color:'#dc3545', fontSize:'0.9rem' }}>
      <i className="fas fa-exclamation-triangle me-2"></i>{mapError}
    </div>
  );

  return (
    <div style={{ position: isFullscreen ? 'fixed' : 'relative', inset: isFullscreen ? 0 : 'auto', zIndex: isFullscreen ? 9999 : 'auto', background: isFullscreen ? '#fff' : 'transparent', padding: isFullscreen ? '1rem' : 0, display: 'flex', flexDirection: 'column' }}>
      {!ready && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f9fa', borderRadius:'8px', zIndex:1 }}>
          <Spinner animation="border" size="sm" style={{ color:'#ffc107' }} />
          <span className="ms-2" style={{ fontSize:'0.9rem', color:'#666' }}>Loading map...</span>
        </div>
      )}
      <button type="button" onClick={toggleFullscreen}
        style={{ position:'absolute', top: isFullscreen ? '1.75rem' : '10px', right: isFullscreen ? '1.75rem' : '10px', zIndex:1000, background:'#ffffff', border:'2px solid #dee2e6', borderRadius:'8px', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', transition:'all 0.2s' }}
        onMouseOver={e => { e.currentTarget.style.borderColor='#ffc107'; e.currentTarget.style.background='#fff9e6'; }}
        onMouseOut={e => { e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.background='#ffffff'; }}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize:'0.8rem', color:'#555' }}></i>
      </button>
      <div ref={mapRef} style={{ height: isFullscreen ? '100%' : (readOnly ? '220px' : '320px'), width:'100%', borderRadius:'8px', border:'2px solid #dee2e6', flex: isFullscreen ? 1 : 'auto' }} />
      {!readOnly && (
        <>
          <button type="button"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords;
                  if (!isInsideMuntinlupa(latitude, longitude)) {
                    onError && onError('Your current location is outside Muntinlupa City.');
                    return;
                  }
                  if (mapObj.current) {
                    mapObj.current.setView([latitude, longitude], 16);
                    if (markerRef.current) markerRef.current.setLatLng([latitude, longitude]);
                    else markerRef.current = window.L.marker([latitude, longitude]).addTo(mapObj.current);
                    onLocationSelect && onLocationSelect(latitude, longitude);
                    reverseGeocode(latitude, longitude, (addr) => onAddressResolve && onAddressResolve(addr));
                  }
                },
                () => onError && onError('Unable to retrieve your location. Please allow location access.')
              );
            }}
            style={{ position:'absolute', bottom:'38px', right:'10px', zIndex:1000, background:'#ffffff', border:'2px solid #dee2e6', borderRadius:'8px', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', transition:'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.borderColor='#ffc107'; e.currentTarget.style.background='#fff9e6'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.background='#ffffff'; }}
            title="Use my current location">
            <i className="fas fa-location-arrow" style={{ fontSize:'0.8rem', color:'#555' }}></i>
          </button>
          <small style={{ display:'block', marginTop:'0.4rem', color:'#888', fontSize:'0.78rem' }}>
            <i className="fas fa-mouse-pointer me-1"></i>Click on the map to pin the exact location (Muntinlupa only)
          </small>
        </>
      )}
    </div>
  );
};

const ClinicManagement = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clinic_name: '',
    owner_name: '',
    address: '',
    phone: '',
    email: '',
    license_number: '',
    specialization: '',
    username: '',
    password: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLat, setFormLat] = useState(null);
  const [formLng, setFormLng] = useState(null);
  const [locationError, setLocationError] = useState('');

  // Selected clinic
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterSpecialization, setFilterSpecialization] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(null);
  const dropdownButtonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ZOOM = 0.75;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterSpecialization, searchTerm]);

  useEffect(() => {
    if (showDropdown === null) return;
    const updatePos = () => {
      if (!dropdownButtonRef.current) return;
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
    };
    window.addEventListener('scroll', updatePos, true);
    return () => window.removeEventListener('scroll', updatePos, true);
  }, [showDropdown]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await clinicAPI.getAll();
      setClinics(res.data.clinics || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clinic_name: '',
      owner_name: '',
      address: '',
      phone: '',
      email: '',
      license_number: '',
      specialization: '',
      username: '',
      password: ''
    });
    setFormError('');
    setFormLat(null);
    setFormLng(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // Phone: numbers only
    if (name === 'phone') {
      const numericOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, phone: numericOnly }));
      if (formError) setFormError('');
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
    // Typing in address field → move map pin (debounced)
    if (name === 'address' && value.trim().length > 5) {
      clearTimeout(window._clinicAddrGeoTimer);
      window._clinicAddrGeoTimer = setTimeout(() => {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value + ', Muntinlupa, Metro Manila')}&limit=1&addressdetails=1`)
          .then(r => r.json())
          .then(results => {
            if (results && results.length > 0) {
              setFormLat(parseFloat(results[0].lat));
              setFormLng(parseFloat(results[0].lon));
            }
          })
          .catch(() => {});
      }, 800);
    }
  };

  // Auto-generate username from clinic name
  const generateUsername = (clinicName) => {
    const currentYear = new Date().getFullYear();
    const currentYearClinics = clinics.filter(c => {
      return c.username && c.username.includes(currentYear.toString());
    });
    const nextNumber = currentYearClinics.length + 1;
    const slug = clinicName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
    return `${slug}.${currentYear}${String(nextNumber).padStart(3, '0')}`;
  };

  // When clinic_name changes in Add form, auto-fill username
  const handleClinicNameChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      clinic_name: value,
      username: value ? generateUsername(value) : ''
    }));
    if (formError) setFormError('');
  };

  const validateAddForm = () => {
    if (!formData.clinic_name.trim()) { setFormError('Clinic name is required'); return false; }
    if (!formData.owner_name.trim()) { setFormError('Owner name is required'); return false; }
    if (!formData.email.trim()) { setFormError('Email is required'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { setFormError('Please enter a valid email address (e.g. clinic@example.com)'); return false; }
    if (formData.phone && formData.phone.trim()) {
      const phoneClean = formData.phone.trim();
      if (!/^\d{11}$/.test(phoneClean)) { setFormError('Phone number must be exactly 11 digits (numbers only)'); return false; }
    }
    if (!formData.username.trim()) { setFormError('Username is required'); return false; }
    return true;
  };

  const validateEditForm = () => {
    if (!formData.clinic_name.trim()) { setFormError('Clinic name is required'); return false; }
    if (!formData.owner_name.trim()) { setFormError('Owner name is required'); return false; }
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) { setFormError('Please enter a valid email address (e.g. clinic@example.com)'); return false; }
    }
    if (formData.phone && formData.phone.trim()) {
      const phoneClean = formData.phone.trim();
      if (!/^\d{11}$/.test(phoneClean)) { setFormError('Phone number must be exactly 11 digits (numbers only)'); return false; }
    }
    return true;
  };

  const handleAddClinic = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditClinic = (clinic) => {
    setSelectedClinic(clinic);
    setFormData({
      clinic_name: clinic.clinic_name || '',
      owner_name: clinic.owner_name || '',
      address: clinic.address || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      license_number: clinic.license_number || '',
      specialization: clinic.specialization || '',
      username: clinic.username || '',
      password: ''
    });
    setFormLat(clinic.latitude ? parseFloat(clinic.latitude) : null);
    setFormLng(clinic.longitude ? parseFloat(clinic.longitude) : null);
    setFormError('');
    setShowEditModal(true);
  };

  const handleViewClinic = (clinic) => {
    setSelectedClinic(clinic);
    setShowViewModal(true);
  };

  const handleDeleteClinic = (clinic) => {
    setSelectedClinic(clinic);
    setShowDeleteModal(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!validateAddForm()) return;
    setFormLoading(true);
    setFormError('');
    try {
      const submitData = {
        ...formData,
        password: formData.password || 'clinic123',
        latitude:  formLat  || null,
        longitude: formLng || null,
      };
      const response = await clinicAPI.create(submitData);
      if (response.data && response.data.success) {
        setSuccess(`Clinic "${formData.clinic_name}" added successfully! Username: ${formData.username} | Default password: clinic123`);
        setShowAddModal(false);
        resetForm();
        loadData();
        setTimeout(() => setSuccess(''), 6000);
      } else {
        setFormError(response.data?.error || 'Failed to create clinic. Please try again.');
      }
    } catch (err) {
      const { message } = handleAPIError(err);
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;
    setFormLoading(true);
    setFormError('');
    try {
      const updateData = {
        clinic_name: formData.clinic_name,
        owner_name: formData.owner_name,
        address: formData.address,
        latitude:  formLat  || null,
        longitude: formLng || null,
        phone: formData.phone,
        email: formData.email,
        license_number: formData.license_number,
        specialization: formData.specialization
      };
      await clinicAPI.update(selectedClinic.id, updateData);
      setSuccess('Clinic updated successfully!');
      setShowEditModal(false);
      resetForm();
      setSelectedClinic(null);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);
    try {
      await clinicAPI.delete(selectedClinic.id);
      setSuccess('Clinic deactivated successfully!');
      setShowDeleteModal(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRestoreClinic = async (clinic) => {
  setFormLoading(true);

  try {
    await clinicAPI.restore(clinic.id);

    setSuccess('Clinic restored successfully!');

    setShowRestoreModal(false);
setSelectedClinic(null);
setShowDropdown(null); // ← closes ellipsis dropdown

    loadData();

    setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setFormLoading(false);
  }
};

  // Unique specializations for filter dropdown
  const specializations = [...new Set(clinics.map(c => c.specialization).filter(Boolean))];

  // Filtering
  const filteredClinics = clinics.filter(clinic => {
    const matchesStatus =
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? clinic.is_active == 1 :
      clinic.is_active == 0;

    const matchesSpec = filterSpecialization
      ? clinic.specialization === filterSpecialization
      : true;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      (clinic.clinic_name || '').toLowerCase().includes(searchLower) ||
      (clinic.owner_name || '').toLowerCase().includes(searchLower) ||
      (clinic.email || '').toLowerCase().includes(searchLower) ||
      (clinic.username || '').toLowerCase().includes(searchLower) ||
      (clinic.phone || '').includes(searchTerm) ||
      (clinic.clinic_code || '').toLowerCase().includes(searchLower) ||
      (clinic.specialization || '').toLowerCase().includes(searchLower);

    return matchesStatus && matchesSpec && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClinics.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedClinics = filteredClinics.slice(startIdx, startIdx + itemsPerPage);
  const emptyRows = itemsPerPage - paginatedClinics.length;

  // Stats
  const activeClinics = clinics.filter(c => c.is_active == 1);
  const inactiveClinics = clinics.filter(c => c.is_active == 0);
  const uniqueSpecs = [...new Set(activeClinics.map(c => c.specialization).filter(Boolean))];

  const styles = `
    @keyframes dropDown {
      0%   { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-10px); }
    }
    @media (max-width: 768px) {
      .clinic-title { font-size: 1.5rem !important; }
      .clinic-stat-label { font-size: 0.55rem !important; margin-bottom: 0.15rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      .clinic-stat-number { font-size: 1.1rem !important; margin-bottom: 0.25rem !important; }
      .clinic-stat-description { display: none !important; }
      .clinic-stat-card-body { padding: 0.6rem 0.5rem !important; }
      .clinic-stat-icon { width: 32px !important; height: 32px !important; border-radius: 8px !important; flex-shrink: 0 !important; }
      .clinic-stat-icon img { width: 18px !important; height: 18px !important; }
      .clinic-card-header { padding: 0.75rem 1rem !important; }
      .clinic-card-header h5 { font-size: 0.85rem !important; }
      .clinic-card-body { padding: 1rem !important; }
      .clinic-table th, .clinic-table td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
      .clinic-table .mobile-hide { display: none !important; }
      .clinic-pagination { font-size: 0.75rem !important; }
      .clinic-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .clinic-pagination .page-info { font-size: 0.75rem !important; }
      .clinic-add-btn { padding: 0.4rem 0.75rem !important; font-size: 0.8rem !important; }
      .clinic-filter-row { flex-wrap: wrap !important; }
      .clinic-filter-search { flex: 0 0 100% !important; max-width: 100% !important; }
      .clinic-filter-select { flex: 0 0 50% !important; max-width: 50% !important; }
    }
  `;

  // ── Shared input style ─────────────────────────────────────────────────────
  const inputStyle = { borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' };
  const labelStyle = { fontWeight: '600', color: '#333333' };

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffff', minHeight: '100vh', zoom: '0.75' }}>

        {/* ── Page Title ── */}
        <Row style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="mb-4">
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i className="fas fa-hospital"
                  style={{ fontSize: '1.5rem', color: '#000000', animation: 'float 3s ease-in-out infinite' }}
                ></i>
                <h2 className="clinic-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>
                  Private Clinic Management
                </h2>
              </div>
            </div>
          </Col>
        </Row>

        {/* ── Alerts ── */}
        {error && (
          <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
            <Col>
              <Alert variant="danger" dismissible onClose={() => setError('')}
                style={{ borderRadius: '12px', border: '2px solid #dc3545', background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}>
                <i className="fas fa-exclamation-triangle me-2"></i>{error}
              </Alert>
            </Col>
          </Row>
        )}
        {success && (
          <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
            <Col>
              <Alert variant="success" dismissible onClose={() => setSuccess('')}
                style={{ borderRadius: '12px', border: '2px solid #198754', background: 'rgba(25,135,84,0.1)', color: '#198754' }}>
                <i className="fas fa-check-circle me-2"></i>{success}
              </Alert>
            </Col>
          </Row>
        )}

        {/* ── Stat Cards ── */}
        <Row className="mb-4" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px' }}>
          {[
            {
              label: 'Active Clinics',
              count: activeClinics.length,
              img: '/active.png',
              accent: '#198754',
              accentAlpha: 'rgba(25,135,84,0.12)',
              fallbackIcon: 'fa-clinic-medical',
              description: 'Currently Active',
              delay: '0.1s'
            },
            {
              label: 'Inactive Clinics',
              count: inactiveClinics.length,
              img: '/inactive.png',
              accent: '#dc3545',
              accentAlpha: 'rgba(220,53,69,0.12)',
              fallbackIcon: 'fa-ban',
              description: 'Deactivated',
              delay: '0.2s'
            },
            {
              label: 'Specializations',
              count: uniqueSpecs.length,
              img: '/average.png',
              accent: '#0dcaf0',
              accentAlpha: 'rgba(13,202,240,0.12)',
              fallbackIcon: 'fa-stethoscope',
              description: 'Unique Specializations',
              delay: '0.3s'
            }
          ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
            <div key={label} style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0, animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
              <Card
                className="border-0 h-100"
                style={{
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
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
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = '#f0f0f0';
                }}
              >
                <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
                <Card.Body className="clinic-stat-card-body" style={{ padding: '1.5rem', background: 'transparent' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="clinic-stat-label" style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#999999',
                        marginBottom: '0.5rem'
                      }}>
                        {label}
                      </p>
                      <h2 className="clinic-stat-number" style={{
                        fontSize: '2.75rem',
                        fontWeight: '700',
                        color: '#111111',
                        lineHeight: 1,
                        marginBottom: '0.75rem'
                      }}>
                        {count}
                      </h2>
                      <div className="clinic-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: accent
                        }} />
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#aaaaaa',
                          fontWeight: '500'
                        }}>
                          {description}
                        </span>
                      </div>
                    </div>
                    <div className="clinic-stat-icon" style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: accentAlpha,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <img
                        src={img}
                        alt={label}
                        style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                        onError={e => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <i className={`fas ${fallbackIcon}`} style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </Row>

        {/* ── Search & Filters ── */}
        <Row className="mb-4 g-2 align-items-center clinic-filter-row" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
          <Col className="clinic-filter-search">
            <InputGroup style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none', color: '#333333' }}>
                <i className="fas fa-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by clinic name, owner, email, username..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: '2px solid #e9ecef',
                  borderLeft: 'none',
                  borderRight: searchTerm ? 'none' : '2px solid #e9ecef',
                  background: '#ffffff',
                  color: '#333333'
                }}
              />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}
                  style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}>
                  <i className="fas fa-times"></i>
                </Button>
              )}
            </InputGroup>
          </Col>
          <Col xs={6} md={3} className="clinic-filter-select">
            <Form.Select value={filterSpecialization} onChange={e => setFilterSpecialization(e.target.value)}
              style={{
                borderRadius: '12px',
                border: '2px solid #e9ecef',
                fontWeight: '500',
                background: '#ffffff',
                color: '#333333'
              }}>
              <option value="">All Specializations</option>
              {specializations.map(s => <option key={s} value={s}>{s}</option>)}
            </Form.Select>
          </Col>
          <Col xs={6} md={3} className="clinic-filter-select">
            <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{
                borderRadius: '12px',
                border: '2px solid #e9ecef',
                fontWeight: '500',
                background: '#ffffff',
                color: '#333333'
              }}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Status</option>
            </Form.Select>
          </Col>
        </Row>

        {/* ── Clinics Table ── */}
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
          <Col>
            <Card className="border-0" style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'visible' }}>
              <Card.Header className="clinic-card-header" style={{ background: 'linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%)', borderBottom: '2px solid #ffc107', padding: '1.5rem', borderRadius: '20px 20px 0 0' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                    <i className="fas fa-hospital me-2" style={{ color: '#ffc107' }}></i>
                    Private Clinics ({filteredClinics.length})
                  </h5>
                  <Button onClick={handleAddClinic} className="border-0 clinic-add-btn"
                    style={{ background: '#ffc107', color: '#000000', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: '700', boxShadow: '0 4px 15px rgba(255,193,7,0.4)', transition: 'all 0.3s' }}
                    onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.background = '#ffb300'; }}
                    onMouseOut={e => { e.target.style.transform = 'translateY(0)'; e.target.style.background = '#ffc107'; }}>
                    <i className="fas fa-plus me-2"></i>Add New Clinic
                  </Button>
                </div>
              </Card.Header>

              <Card.Body className="clinic-card-body" style={{ padding: '2rem' }}>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="warning" />
                    <p className="mt-3 text-muted">Loading clinics...</p>
                  </div>
                ) : filteredClinics.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-hospital text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                    <h5 style={{ color: '#666666', fontWeight: '600' }}>
                      {searchTerm || filterSpecialization || filterStatus !== 'active' ? 'No Clinics Found' : 'No Clinics Added Yet'}
                    </h5>
                    <p className="text-muted">
                      {searchTerm || filterSpecialization || filterStatus !== 'active'
                        ? 'Try adjusting your search or filters.'
                        : 'Start by adding private clinics to the system.'}
                    </p>
                    {!searchTerm && !filterSpecialization && filterStatus === 'active' && (
                      <Button onClick={handleAddClinic} className="border-0"
                        style={{ background: '#ffc107', color: '#000000', padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: '600', boxShadow: '0 4px 15px rgba(255,193,7,0.3)' }}>
                        <i className="fas fa-plus me-2"></i>Add First Clinic
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="table-responsive" style={{ overflow: 'visible' }}>
                    <Table hover className="clinic-table" style={{ marginBottom: 0 }}>
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                          {[
                            { label: 'Clinic',         hide: false },
                            { label: 'Code',           hide: true  },
                            { label: 'Owner',          hide: true  },
                            { label: 'Contact',        hide: false },
                            { label: 'Specialization', hide: true  },
                            { label: 'Status',         hide: false },
                            { label: 'Actions',        hide: false },
                          ].map(h => (
                            <th key={h.label} className={h.hide ? 'mobile-hide' : ''} style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>{h.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedClinics.map(clinic => (
                          <tr key={clinic.id}
                            style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,193,7,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                            {/* Clinic Name */}
                            <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <strong style={{ fontSize: '1rem', color: '#333' }}>{clinic.clinic_name}</strong>
                              <br />
                              <small className="text-muted"><i className="fas fa-user me-1"></i>{clinic.username}</small>
                            </td>

                            {/* Code */}
                            <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <Badge bg="secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', borderRadius: '6px' }}>
                                {clinic.clinic_code || '—'}
                              </Badge>
                            </td>

                            {/* Owner */}
                            <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <span style={{ fontWeight: '500', color: '#555' }}>{clinic.owner_name}</span>
                            </td>

                            {/* Contact */}
                            <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <small style={{ fontWeight: '500', color: '#555' }}>
                                <i className="fas fa-envelope me-1"></i>{clinic.email}
                              </small>
                              {clinic.phone && (
                                <><br /><small style={{ fontWeight: '500', color: '#555' }}>
                                  <i className="fas fa-phone me-1"></i>{clinic.phone}
                                </small></>
                              )}
                            </td>

                            {/* Specialization */}
                            <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              {clinic.specialization
                                ? <Badge bg="info" style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', borderRadius: '6px' }}>{clinic.specialization}</Badge>
                                : <span className="text-muted">—</span>}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <Badge bg={clinic.is_active == 1 ? 'success' : 'secondary'}
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                                {clinic.is_active == 1 ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>

                            {/* Actions dropdown */}
                            <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <button
                                ref={showDropdown === clinic.id ? dropdownButtonRef : null}
                                onClick={(e) => {
                                  if (showDropdown === clinic.id) { setShowDropdown(null); return; }
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  dropdownButtonRef.current = e.currentTarget;
                                  setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
                                  setShowDropdown(clinic.id);
                                }}
                                style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {Array.from({ length: emptyRows }).map((_, i) => (
                          <tr key={`empty-${i}`} style={{ height: '73px', pointerEvents: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'transparent'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td colSpan="7" style={{ padding: '1rem', borderBottom: '1px solid #dee2e6', background: 'transparent' }}>
                              <div style={{ visibility: 'hidden' }}>Empty</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ── Pagination ── */}
        {filteredClinics.length > itemsPerPage && (
          <Row className="mt-4 clinic-pagination" style={{ animation: 'dropDown 0.4s ease-out 0.6s backwards' }}>
            <Col className="d-flex justify-content-between align-items-center">
              <span className="page-info" style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
                Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{totalPages}</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="page-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  style={{ background: currentPage === 1 ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === 1 ? '#adb5bd' : '#333333', transition: 'all 0.2s' }}
                  onMouseOver={e => { if (currentPage !== 1) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                  onMouseOut={e => { if (currentPage !== 1) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}>
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
                    if (start > 1) pages.push('...');
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (end < totalPages) pages.push('...');
                  }
                  return pages.map((page, idx) =>
                    page === '...' ? (
                      <span key={`e-${idx}`} style={{ padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: '600' }}>...</span>
                    ) : (
                      <button className="page-btn" key={page} onClick={() => setCurrentPage(page)}
                        style={{ background: currentPage === page ? '#ffc107' : '#ffffff', border: '2px solid', borderColor: currentPage === page ? '#ffc107' : '#dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '40px', cursor: 'pointer', fontWeight: '700', color: currentPage === page ? '#000000' : '#333333', boxShadow: currentPage === page ? '0 2px 8px rgba(255,193,7,0.3)' : 'none', transition: 'all 0.2s' }}
                        onMouseOver={e => { if (currentPage !== page) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                        onMouseOut={e => { if (currentPage !== page) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}>
                        {page}
                      </button>
                    )
                  );
                })()}
                <button className="page-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  style={{ background: currentPage === totalPages ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === totalPages ? '#adb5bd' : '#333333', transition: 'all 0.2s' }}
                  onMouseOver={e => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                  onMouseOut={e => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </Col>
          </Row>
        )}


        {/* ════════════════════════════════════════════════════════════════
            ADD CLINIC MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg" backdrop="static" style={{zoom: '0.75'}}>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
            <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
              <i className="fas fa-plus-circle me-2"></i>Add New Private Clinic
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitAdd}>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
              {formError && (
                <Alert variant="danger" className="mb-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>{formError}
                </Alert>
              )}

              <Alert variant="info" style={{ borderRadius: '12px', border: '2px solid #0dcaf0', background: 'rgba(13,202,240,0.1)' }}>
                <i className="fas fa-info-circle me-2"></i>
                <strong>Auto-generated credentials:</strong>
                <ul className="mb-0 mt-2">
                  <li>Username: auto-filled from clinic name (editable)</li>
                  <li>Default password: <code>clinic123</code></li>
                </ul>
              </Alert>

              {/* Row 1 – Clinic name + Owner */}
              <Row>
                <Col md={7}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Clinic Name <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                    <Form.Control type="text" name="clinic_name" value={formData.clinic_name}
                      onChange={handleClinicNameChange} required disabled={formLoading}
                      placeholder="e.g. Pawsome Veterinary Clinic" style={inputStyle} />
                  </Form.Group>
                </Col>
                <Col md={5}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Owner / Veterinarian Name <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                    <Form.Control type="text" name="owner_name" value={formData.owner_name}
                      onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onChange={handleFormChange} required disabled={formLoading}
                      placeholder="Full name" style={inputStyle} />
                  </Form.Group>
                </Col>
              </Row>

              {/* Row 2 – Email + Phone */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Email Address <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                    <Form.Control type="email" name="email" value={formData.email}
                      onChange={handleFormChange} required disabled={formLoading}
                      placeholder="clinic@example.com"
                      style={{ ...inputStyle, border: formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? '2px solid #dc3545' : formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? '2px solid #198754' : inputStyle.border }} />
                    {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                      <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}><i className="fas fa-times-circle me-1" />Enter a valid email (e.g. clinic@example.com)</small>
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Phone Number</Form.Label>
                    <Form.Control type="tel" name="phone" value={formData.phone}
                      onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                      onChange={handleFormChange} disabled={formLoading}
                      placeholder="09XXXXXXXXX"
                      style={{ ...inputStyle, border: formData.phone && !/^\d{11}$/.test(formData.phone) ? '2px solid #dc3545' : formData.phone && /^\d{11}$/.test(formData.phone) ? '2px solid #198754' : inputStyle.border }} />
                    {formData.phone && !/^\d{11}$/.test(formData.phone) && (
                      <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}><i className="fas fa-times-circle me-1" />Must be exactly 11 digits</small>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {/* Row 3 – Address */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Address</Form.Label>
                    <Form.Control type="text" name="address" value={formData.address}
                      onChange={handleFormChange} disabled={formLoading}
                      placeholder="Street, Barangay, City" style={inputStyle} />
                  </Form.Group>
                </Col>
              </Row>

              {/* Map */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>
                      <i className="fas fa-map-marker-alt me-2" style={{ color: '#ffc107' }}></i>
                      Pin Location on Map
                      <span style={{ fontWeight: '400', color: '#888', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(optional)</span>
                    </Form.Label>
                    <LeafletMap
                      lat={formLat}
                      lng={formLng}
                      onLocationSelect={(lat, lng) => { setFormLat(lat); setFormLng(lng); }}
                      onAddressResolve={(addr) => setFormData(prev => ({ ...prev, address: addr }))}
                      onError={(msg) => setLocationError(msg)}
                    />
                    {formLat && formLng && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(25,135,84,0.08)', borderRadius: '8px', border: '1px solid rgba(25,135,84,0.2)', fontSize: '0.82rem', color: '#198754' }}>
                        <i className="fas fa-check-circle me-1"></i>
                        Location pinned: {formLat.toFixed(6)}, {formLng.toFixed(6)}
                        <button type="button" onClick={() => { setFormLat(null); setFormLng(null); }}
                          style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '0.78rem', marginLeft: '0.75rem', cursor: 'pointer', padding: 0 }}>
                          <i className="fas fa-times me-1"></i>Clear
                        </button>
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {/* Row 4 – License + Specialization */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>License Number</Form.Label>
                    <Form.Control type="text" name="license_number" value={formData.license_number}
                      onChange={handleFormChange} disabled={formLoading}
                      placeholder="e.g. PRC-VET-12345" style={inputStyle} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Specialization</Form.Label>
                    <Form.Select name="specialization" value={formData.specialization}
                      onChange={handleFormChange} disabled={formLoading} style={inputStyle}>
                      <option value="">General / None</option>
                      <option value="General Veterinary">General Veterinary</option>
                      <option value="Small Animals">Small Animals</option>
                      <option value="Large Animals">Large Animals</option>
                      <option value="Exotic Animals">Exotic Animals</option>
                      <option value="Surgery">Surgery</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Dentistry">Dentistry</option>
                      <option value="Cardiology">Cardiology</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Row 5 – Username (auto-filled) */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Username <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                    <Form.Control type="text" name="username" value={formData.username}
                      onChange={handleFormChange} required disabled={formLoading}
                      placeholder="Auto-generated from clinic name" style={inputStyle} />
                    <Form.Text className="text-muted">Auto-generated — you may edit it if needed.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
              <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={formLoading}
                style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="border-0"
                style={{ background: formLoading ? '#6c757d' : '#ffc107', color: '#000000', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700', boxShadow: '0 4px 15px rgba(255,193,7,0.4)' }}>
                {formLoading ? <><Spinner size="sm" animation="border" className="me-2" />Adding Clinic...</> : <><i className="fas fa-plus-circle me-2"></i>Add Clinic</>}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>


        {/* ════════════════════════════════════════════════════════════════
            EDIT CLINIC MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" backdrop="static" style={{zoom: '0.75'}}>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
            <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
              <i className="fas fa-edit me-2"></i>Edit Clinic: {selectedClinic?.clinic_name}
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitEdit}>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
              {formError && (
                <Alert variant="danger" className="mb-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>{formError}
                </Alert>
              )}
              <Row>
                <Col md={7}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Clinic Name <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                    <Form.Control type="text" name="clinic_name" value={formData.clinic_name}
                      onChange={handleFormChange} required disabled={formLoading} style={inputStyle} />
                  </Form.Group>
                </Col>
                <Col md={5}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Owner / Veterinarian Name <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                    <Form.Control type="text" name="owner_name" value={formData.owner_name}
                      onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onChange={handleFormChange} required disabled={formLoading} style={inputStyle} />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Email Address</Form.Label>
                    <Form.Control type="email" name="email" value={formData.email}
                      onChange={handleFormChange} disabled={formLoading}
                      style={{ ...inputStyle, border: formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? '2px solid #dc3545' : formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? '2px solid #198754' : inputStyle.border }} />
                    {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                      <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}><i className="fas fa-times-circle me-1" />Enter a valid email (e.g. clinic@example.com)</small>
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Phone Number</Form.Label>
                    <Form.Control type="tel" name="phone" value={formData.phone}
                      onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                      onChange={handleFormChange} disabled={formLoading}
                      style={{ ...inputStyle, border: formData.phone && !/^\d{11}$/.test(formData.phone) ? '2px solid #dc3545' : formData.phone && /^\d{11}$/.test(formData.phone) ? '2px solid #198754' : inputStyle.border }} />
                    {formData.phone && !/^\d{11}$/.test(formData.phone) && (
                      <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}><i className="fas fa-times-circle me-1" />Must be exactly 11 digits</small>
                    )}
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Address</Form.Label>
                    <Form.Control type="text" name="address" value={formData.address}
                      onChange={handleFormChange} disabled={formLoading} style={inputStyle} />
                  </Form.Group>
                </Col>
              </Row>
              {/* Map */}
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>
                      <i className="fas fa-map-marker-alt me-2" style={{ color: '#ffc107' }}></i>
                      Pin Location on Map
                      <span style={{ fontWeight: '400', color: '#888', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(optional)</span>
                    </Form.Label>
                    <LeafletMap
                      lat={formLat}
                      lng={formLng}
                      onLocationSelect={(lat, lng) => { setFormLat(lat); setFormLng(lng); }}
                      onAddressResolve={(addr) => setFormData(prev => ({ ...prev, address: addr }))}
                      onError={(msg) => setLocationError(msg)}
                    />
                    {formLat && formLng && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(25,135,84,0.08)', borderRadius: '8px', border: '1px solid rgba(25,135,84,0.2)', fontSize: '0.82rem', color: '#198754' }}>
                        <i className="fas fa-check-circle me-1"></i>
                        Location pinned: {formLat.toFixed(6)}, {formLng.toFixed(6)}
                        <button type="button" onClick={() => { setFormLat(null); setFormLng(null); }}
                          style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '0.78rem', marginLeft: '0.75rem', cursor: 'pointer', padding: 0 }}>
                          <i className="fas fa-times me-1"></i>Clear
                        </button>
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>License Number</Form.Label>
                    <Form.Control type="text" name="license_number" value={formData.license_number}
                      onChange={handleFormChange} disabled={formLoading} style={inputStyle} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Specialization</Form.Label>
                    <Form.Select name="specialization" value={formData.specialization}
                      onChange={handleFormChange} disabled={formLoading} style={inputStyle}>
                      <option value="">General / None</option>
                      <option value="General Veterinary">General Veterinary</option>
                      <option value="Small Animals">Small Animals</option>
                      <option value="Large Animals">Large Animals</option>
                      <option value="Exotic Animals">Exotic Animals</option>
                      <option value="Surgery">Surgery</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Dentistry">Dentistry</option>
                      <option value="Cardiology">Cardiology</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
              <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={formLoading}
                style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="border-0"
                style={{ background: formLoading ? '#6c757d' : '#0d6efd', color: '#ffffff', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700', boxShadow: '0 4px 15px rgba(13,110,253,0.4)' }}>
                {formLoading ? <><Spinner size="sm" animation="border" className="me-2" />Updating...</> : <><i className="fas fa-save me-2"></i>Update Clinic</>}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>


        {/* ════════════════════════════════════════════════════════════════
            VIEW CLINIC MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" style={{zoom: '0.75'}}>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%)', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
            <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
              <i className="fas fa-hospital me-2" style={{ color: '#ffc107' }}></i>
              {selectedClinic?.clinic_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem' }}>
            {selectedClinic && (
              <Row>
                <Col md={6}>
                  <Card className="mb-3 border-0" style={{ borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                    <Card.Header style={{ background: 'rgba(255,193,7,0.1)', borderBottom: '2px solid rgba(255,193,7,0.3)', borderRadius: '15px 15px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }}></i>Clinic Information
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <Table borderless size="sm">
                        <tbody>
                          {[
                            ['Clinic Name', selectedClinic.clinic_name],
                            ['Clinic Code', selectedClinic.clinic_code || '—'],
                            ['Owner', selectedClinic.owner_name],
                            ['Username', selectedClinic.username],
                            ['Email', selectedClinic.email],
                            ['Phone', selectedClinic.phone || 'Not provided'],
                            ['Address', selectedClinic.address || 'Not provided'],
                          ].map(([label, value]) => (
                            <tr key={label}>
                              <td style={{ fontWeight: '600', color: '#666666', width: '120px', whiteSpace: 'nowrap' }}>{label}:</td>
                              <td style={{ fontWeight: '500', color: '#333333', wordBreak: 'break-all' }}>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="mb-3 border-0" style={{ borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                    <Card.Header style={{ background: 'rgba(255,193,7,0.1)', borderBottom: '2px solid rgba(255,193,7,0.3)', borderRadius: '15px 15px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-stethoscope me-2" style={{ color: '#ffc107' }}></i>Professional Details
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <Table borderless size="sm">
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666', width: '130px' }}>License:</td>
                            <td style={{ fontWeight: '500', color: '#333333' }}>{selectedClinic.license_number || 'Not provided'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Specialization:</td>
                            <td>
                              {selectedClinic.specialization
                                ? <Badge bg="info" style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem', borderRadius: '6px' }}>{selectedClinic.specialization}</Badge>
                                : <span className="text-muted">General / None</span>}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Status:</td>
                            <td>
                              <Badge bg={selectedClinic.is_active == 1 ? 'success' : 'secondary'}
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                                {selectedClinic.is_active == 1 ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>

                  <Card className="border-0" style={{ borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                    <Card.Header style={{ background: 'rgba(255,193,7,0.1)', borderBottom: '2px solid rgba(255,193,7,0.3)', borderRadius: '15px 15px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-chart-line me-2" style={{ color: '#ffc107' }}></i>Activity Summary
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <Table borderless size="sm">
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Vaccinations:</td>
                            <td>
                              <Badge bg="info" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                                {selectedClinic.vaccinations_administered || 0}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '600', color: '#666666' }}>Member Since:</td>
                            <td style={{ fontWeight: '500', color: '#333333' }}>
                              {selectedClinic.created_at ? new Date(selectedClinic.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid #e0e0e0' }}>
            <Button variant="secondary" onClick={() => setShowViewModal(false)}
              style={{ borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Close</Button>
          </Modal.Footer>
        </Modal>


        {/* ════════════════════════════════════════════════════════════════
    DEACTIVATE CONFIRMATION MODAL
════════════════════════════════════════════════════════════════ */}
<Modal
  show={showDeleteModal}
  onHide={() => setShowDeleteModal(false)}
  centered
  style={{ zoom: '0.75' }}
>
  <Modal.Header
    closeButton
    style={{
      background: '#f8f9fa',
      borderBottom: '2px solid #dee2e6'
    }}
  >
    <Modal.Title style={{ fontWeight: '700' }}>
      <i className="fas fa-exclamation-triangle text-danger me-2"></i>
      Confirm Deactivation
    </Modal.Title>
  </Modal.Header>

  <Modal.Body style={{ padding: '2rem' }}>
    {selectedClinic && (
      <>
        <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
          Are you sure you want to deactivate this private clinic?
        </p>

        <div
          style={{
            background: '#f8f9fa',
            padding: '1.25rem',
            borderRadius: '8px',
            borderLeft: '4px solid #dc3545'
          }}
        >
          <div className="mb-2">
            <span style={{ fontWeight: '500', color: '#555' }}>
              <i
                className="fas fa-hospital me-1"
                style={{ color: '#ffc107' }}
              ></i>
              Private Clinic
            </span>
          </div>

          <strong style={{ fontSize: '1.1rem' }}>
            {selectedClinic.clinic_name}
          </strong>

          <br />

          <small className="text-muted">
            <i className="fas fa-envelope me-1"></i>
            {selectedClinic.email}
          </small>

          <div className="mt-2" style={{ fontSize: '0.9rem' }}>
            <div>
              <strong>Code:</strong> {selectedClinic.clinic_code}
            </div>
            <div>
              <strong>Owner:</strong> {selectedClinic.owner_name}
            </div>
          </div>
        </div>

        <Alert variant="warning" className="mt-3 mb-0">
          <i className="fas fa-info-circle me-2"></i>
          <strong>Warning:</strong> All vaccination records and clinic
          activities will be preserved for historical purposes.
        </Alert>
      </>
    )}
  </Modal.Body>

  <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
    <Button
      variant="secondary"
      onClick={() => setShowDeleteModal(false)}
      disabled={formLoading}
      style={{
        borderRadius: '8px',
        padding: '0.75rem 1.5rem',
        fontWeight: '600'
      }}
    >
      Cancel
    </Button>

    <Button
      variant="danger"
      onClick={handleConfirmDelete}
      disabled={formLoading}
      style={{
        borderRadius: '8px',
        padding: '0.75rem 1.5rem',
        fontWeight: '600'
      }}
    >
      {formLoading ? (
        <>
          <Spinner size="sm" animation="border" className="me-2" />
          Deactivating...
        </>
      ) : (
        <>
          <i className="fas fa-ban me-2"></i>
          Deactivate Clinic
        </>
      )}
    </Button>
  </Modal.Footer>
</Modal>

{/* ════════════════════════════════════════════════════════════════
    RESTORE CONFIRMATION MODAL
════════════════════════════════════════════════════════════════ */}
<Modal
  show={showRestoreModal}
  onHide={() => setShowRestoreModal(false)}
  centered
  style={{ zoom: '0.75' }}
>
  <Modal.Header
    closeButton
    style={{
      background: '#f8f9fa',
      borderBottom: '2px solid #dee2e6'
    }}
  >
    <Modal.Title style={{ fontWeight: '700' }}>
      <i className="fas fa-undo text-success me-2"></i>
      Confirm Restoration
    </Modal.Title>
  </Modal.Header>

  <Modal.Body style={{ padding: '2rem' }}>
    {selectedClinic && (
      <>
        <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
          Are you sure you want to restore this private clinic?
        </p>

        <div
          style={{
            background: '#f8f9fa',
            padding: '1.25rem',
            borderRadius: '8px',
            borderLeft: '4px solid #198754'
          }}
        >
          <div className="mb-2">
            <span style={{ fontWeight: '500', color: '#555' }}>
              <i
                className="fas fa-hospital me-1"
                style={{ color: '#ffc107' }}
              ></i>
              Private Clinic
            </span>
          </div>

          <strong style={{ fontSize: '1.1rem' }}>
            {selectedClinic.clinic_name}
          </strong>

          <br />

          <small className="text-muted">
            <i className="fas fa-envelope me-1"></i>
            {selectedClinic.email}
          </small>

          <div className="mt-2" style={{ fontSize: '0.9rem' }}>
            <div>
              <strong>Code:</strong> {selectedClinic.clinic_code}
            </div>
            <div>
              <strong>Owner:</strong> {selectedClinic.owner_name}
            </div>
          </div>
        </div>

        <Alert variant="success" className="mt-3 mb-0">
          <i className="fas fa-info-circle me-2"></i>
          <strong>Notice:</strong> The clinic account will be reactivated and can access the system again.
        </Alert>
      </>
    )}
  </Modal.Body>

  <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
    <Button
      variant="secondary"
      onClick={() => setShowRestoreModal(false)}
      disabled={formLoading}
      style={{
        borderRadius: '8px',
        padding: '0.75rem 1.5rem',
        fontWeight: '600'
      }}
    >
      Cancel
    </Button>

    <Button
      variant="success"
      onClick={() => handleRestoreClinic(selectedClinic)}
      disabled={formLoading}
      style={{
        borderRadius: '8px',
        padding: '0.75rem 1.5rem',
        fontWeight: '600'
      }}
    >
      {formLoading ? (
        <>
          <Spinner size="sm" animation="border" className="me-2" />
          Restoring...
        </>
      ) : (
        <>
          <i className="fas fa-undo me-2"></i>
          Restore Clinic
        </>
      )}
    </Button>
  </Modal.Footer>
</Modal>

      {/* ── Location Error Modal ── */}
        <Modal show={!!locationError} onHide={() => setLocationError('')} centered style={{ zoom: '0.75' }}>
          <Modal.Header closeButton style={{ background: '#fff3f3', borderBottom: '2px solid #dc3545' }}>
            <Modal.Title style={{ fontWeight: '700', color: '#dc3545', fontSize: '1rem' }}>
              <i className="fas fa-map-marker-alt me-2"></i>Location Outside Muntinlupa
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
            <p style={{ color: '#333', fontWeight: '600', fontSize: '1rem', marginBottom: '0.5rem' }}>Cannot Pin Location</p>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 0 }}>{locationError}</p>
          </Modal.Body>
          <Modal.Footer style={{ justifyContent: 'center' }}>
            <Button onClick={() => setLocationError('')} className="border-0"
              style={{ background: '#dc3545', color: '#fff', borderRadius: '8px', padding: '0.65rem 2rem', fontWeight: '700' }}>
              Got it
            </Button>
          </Modal.Footer>
        </Modal>

      </Container>

      {/* ── Ellipsis Dropdown Portal ── */}
      {showDropdown !== null && (
        <>
          <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
          <div style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            transform: 'translateY(-50%)',
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '170px',
            zIndex: 1050,
            overflow: 'hidden',
            zoom: '0.75',
          }}>
            {(() => {
              const clinic = clinics.find(c => c.id === showDropdown);
              if (!clinic) return null;
              return (
                <>
                  <button onClick={() => { setShowDropdown(null); handleViewClinic(clinic); }}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }}
                    onMouseOver={e => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseOut={e => e.currentTarget.style.background = '#ffffff'}>
                    <img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                    <span>View Details</span>
                  </button>
                  {clinic.is_active == 1 ? (
                    <>
                      <button onClick={() => { setShowDropdown(null); handleEditClinic(clinic); }}
                        style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8f9fa'}
                        onMouseOut={e => e.currentTarget.style.background = '#ffffff'}>
                        <img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                        <span>Edit Clinic</span>
                      </button>
                      <button onClick={() => { setShowDropdown(null); handleDeleteClinic(clinic); }}
                        style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }}
                        onMouseOver={e => e.currentTarget.style.background = '#fff5f5'}
                        onMouseOut={e => e.currentTarget.style.background = '#ffffff'}>
                        <img src="/remove.png" alt="Deactivate" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                        <span>Deactivate</span>
                      </button>
                    </>
                  ) : (
                    <button onClick={() => {
  setSelectedClinic(clinic);
  setShowRestoreModal(true);
}}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#28a745', fontWeight: '500', borderTop: '1px solid #f0f0f0' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f0fff4'}
                      onMouseOut={e => e.currentTarget.style.background = '#ffffff'}>
                      <img src="/restore.png" alt="Restore" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                      <span>Restore Clinic</span>
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </>
  );
};

export default ClinicManagement;