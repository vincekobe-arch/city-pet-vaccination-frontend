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
        let pinLat = clickLat;
        let pinLng = clickLng;
        if (!isInsideMuntinlupa(clickLat, clickLng)) {
          let minDist = Infinity;
          muntinlupaPolygonCoords.forEach(([pLat, pLng]) => {
            const dist = Math.pow(clickLat - pLat, 2) + Math.pow(clickLng - pLng, 2);
            if (dist < minDist) { minDist = dist; pinLat = pLat; pinLng = pLng; }
          });
        }
        if (markerRef.current) markerRef.current.setLatLng([pinLat, pinLng]);
        else markerRef.current = window.L.marker([pinLat, pinLng]).addTo(map);
        onLocationSelect && onLocationSelect(pinLat, pinLng);
        reverseGeocode(pinLat, pinLng, (addr) => onAddressResolve && onAddressResolve(addr));
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
                    let minDist = Infinity;
                    let pinLat = latitude, pinLng = longitude;
                    muntinlupaPolygonCoords.forEach(([pLat, pLng]) => {
                      const dist = Math.pow(latitude - pLat, 2) + Math.pow(longitude - pLng, 2);
                      if (dist < minDist) { minDist = dist; pinLat = pLat; pinLng = pLng; }
                    });
                    if (mapObj.current) {
                      mapObj.current.setView([pinLat, pinLng], 16);
                      if (markerRef.current) markerRef.current.setLatLng([pinLat, pinLng]);
                      else markerRef.current = window.L.marker([pinLat, pinLng]).addTo(mapObj.current);
                      onLocationSelect && onLocationSelect(pinLat, pinLng);
                      reverseGeocode(pinLat, pinLng, (addr) => onAddressResolve && onAddressResolve(addr));
                    }
                    return;
                  }                  if (mapObj.current) {
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

    // Floating notification helper (resets timer so older timeouts don't hide newer messages)
  const successTimerRef = useRef(null);
  const showSuccess = (msg, duration = 3000) => {
    clearTimeout(successTimerRef.current);
    setSuccess(msg);
    successTimerRef.current = setTimeout(() => setSuccess(''), duration);
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [displayCounts, setDisplayCounts] = useState({ active: 0, inactive: 0, specs: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);

  // Stats — must be declared before animation useEffect
  const activeClinics   = clinics.filter(c => c.is_active == 1);
  const inactiveClinics = clinics.filter(c => c.is_active == 0);
  const uniqueSpecs     = [...new Set(activeClinics.map(c => c.specialization).filter(Boolean))];

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterSpecialization, searchTerm]);

  useEffect(() => {
  if (showDropdown === null) return;
  const closeOnScroll = () => setShowDropdown(null);
  window.addEventListener('scroll', closeOnScroll, true);
  return () => window.removeEventListener('scroll', closeOnScroll, true);
}, [showDropdown]);

  useEffect(() => {
    if (loading || hasAnimated) return;
    const targets = {
      active:   activeClinics.length,
      inactive: inactiveClinics.length,
      specs:    uniqueSpecs.length,
    };
    if (Object.values(targets).every(v => v === 0)) return;
    setHasAnimated(true);
    const duration = 1200;
    const steps = 40;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const t = step >= steps ? 1 : step / steps;
      setDisplayCounts({
        active:   step >= steps ? targets.active   : Math.round(t * targets.active),
        inactive: step >= steps ? targets.inactive : Math.round(t * targets.inactive),
        specs:    step >= steps ? targets.specs    : Math.round(t * targets.specs),
      });
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [loading, activeClinics.length, inactiveClinics.length, uniqueSpecs.length]);

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
    const currentYear = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric' }));
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
    if (formLoading) return;               // block double submit
    if (!validateAddForm()) return;
    setFormLoading(true);
    setFormError('');
    setShowAddModal(false);                // close immediately
    try {
      const submitData = {
        ...formData,
        password: formData.password || 'clinic123',
        latitude:  formLat  || null,
        longitude: formLng || null,
      };
      const response = await clinicAPI.create(submitData);
      if (response.data && response.data.success) {
        showSuccess(`Clinic "${formData.clinic_name}" added successfully! Username: ${formData.username} | Default password: clinic123`, 6000);
        resetForm();
        loadData();
      } else {
        setFormError(response.data?.error || 'Failed to create clinic. Please try again.');
        setShowAddModal(true);             // reopen with data intact so user can fix it
      }
    } catch (err) {
      const { message } = handleAPIError(err);
      setFormError(message);
      setShowAddModal(true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (formLoading) return;
    if (!validateEditForm()) return;
    setFormLoading(true);
    setFormError('');
    setShowEditModal(false);               // close immediately
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
      showSuccess('Clinic updated successfully!');
      resetForm();
      setSelectedClinic(null);
      loadData();
    } catch (err) {
      const { message } = handleAPIError(err);
      setFormError(message);
      setShowEditModal(true);              // reopen so changes aren't lost
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (formLoading) return;
    setFormLoading(true);
    setShowDeleteModal(false);             // close immediately
    try {
      await clinicAPI.delete(selectedClinic.id);
      showSuccess('Clinic deactivated successfully!');
      setSelectedClinic(null);
      loadData();
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRestoreClinic = async (clinic) => {
    if (formLoading) return;
    setFormLoading(true);
    setShowRestoreModal(false);            // close immediately
    setShowDropdown(null);
    try {
      await clinicAPI.restore(clinic.id);
      showSuccess('Clinic restored successfully!');
      setSelectedClinic(null);
      loadData();
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
  

  // (stats already declared above)

  const styles = `
    @keyframes dropDown {
      0%   { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-10px); }
    }
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .clinic-page {
      zoom: 0.75;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    @media (min-width: 1600px) { .clinic-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .clinic-page { zoom: 1; } }
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

    /* ---------------- Clinic Management ---------------- */
    @keyframes ckIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ckRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ckMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes ckToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes ckGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .ck-anim { animation: ckIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .ck-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .ck-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .ck-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.86rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .ck-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .ck-btn.primary { background: #ffc107; color: #1f2328; }
    .ck-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }

    .ck-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: ckToast 0.35s ease-out; }
    .ck-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ck-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .ck-toast .d { color: #6b7280; font-size: 0.84rem; }
    .ck-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .ck-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .ck-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); overflow: hidden; }
    .ck-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; border-bottom: 1px solid #eef0f3; }
    .ck-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
    .ck-panel-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .ck-panel-sub { font-size: 0.76rem; color: #6b7280; }

    .ck-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem 0.75rem; }
    .ck-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: #1f2328; }
    .ck-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .ck-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f3f4f6; }
    .ck-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #5b6270; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .ck-seg button:hover { color: #1f2328; }
    .ck-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .ck-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0 1.25rem 1rem; border-bottom: 1px solid #eef0f3; }
    .ck-search, .ck-select { position: relative; }
    .ck-search { flex: 1 1 260px; }
    .ck-search > i, .ck-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.78rem; pointer-events: none; }
    .ck-input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .ck-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.ck-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
    .ck-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: #9ca3af; }
    .ck-clear:hover { background: #f3f4f6; color: #1f2328; }
    .ck-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
    .ck-link:hover { text-decoration: underline; }

    .ck-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .ck-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .ck-table td { padding: 0.8rem 0.65rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .ck-table tbody tr { animation: ckRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .ck-table tbody tr:hover { background: #fafbfc; }
    .ck-table tbody tr:last-child td { border-bottom: none; }
    .ck-table tbody tr.raised { position: relative; z-index: 5; }
    .ck-strong { font-weight: 600; color: #1f2328; }
    .ck-muted { font-size: 0.78rem; color: #6b7280; }
    .ck-ellipsis { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ck-date { width: 48px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.35rem 0; line-height: 1.1; }
    .ck-date .m { display: block; font-size: 0.62rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .ck-date .d { display: block; font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .ck-type-ic { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .ck-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 130px; }
    .ck-bar > div { height: 100%; border-radius: 3px; transform-origin: left; animation: ckGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
    .ck-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .ck-pill i { font-size: 0.4rem; }

    .ck-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .ck-icon-btn:hover, .ck-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .ck-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1050; animation: ckMenu 0.16s ease-out; transform-origin: top right; text-align: left; }
    .ck-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
    .ck-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .ck-menu-item:hover { background: #f6f7f9; }
    .ck-menu-item.danger, .ck-menu-item.danger i { color: #dc3545; }
    .ck-menu-item.danger:hover { background: #fff5f5; }
    .ck-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }

    .ck-empty { text-align: center; padding: 3rem 1rem; }
    .ck-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .ck-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .ck-empty p { color: #6b7280; font-size: 0.88rem; margin-bottom: 1rem; }
    .ck-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }

    .ck-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid #eef0f3; }
    .ck-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .ck-page:hover:not(:disabled) { background: #f3f4f6; }
    .ck-page.on { background: #ffc107; color: #1f2328; }
    .ck-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .ck-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .ck-btn:focus-visible, .ck-seg button:focus-visible, .ck-icon-btn:focus-visible, .ck-menu-item:focus-visible, .ck-page:focus-visible, .ck-link:focus-visible, .ck-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .ck-title { font-size: 1.45rem; }
      .ck-sub { font-size: 0.85rem; }
      .ck-filters select.ck-input { min-width: 0; width: 100%; }
      .ck-select { flex: 1 1 140px; }
      .ck-ellipsis { max-width: 160px; }
      .ck-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ck-anim, .ck-table tbody tr, .ck-menu, .ck-toast, .ck-bar > div, .ck-skel { animation: none !important; }
    }
    .ck-toolbar { border-bottom: 1px solid #eef0f3; padding-bottom: 1rem; }
    .ck-filters { padding-top: 1rem; }
    .ck-table { table-layout: fixed; }
    .ck-logo { width: 38px; height: 38px; border-radius: 10px; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800; flex-shrink: 0; }
    .ck-logo.off { background: #f3f4f6; color: #9ca3af; }
    .ck-ic { width: 14px; margin-right: 0.4rem; color: #9ca3af; font-size: 0.72rem; }
    .ck-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 6px; background: #f3f4f6; color: #4b5563; }
    .ck-spec { display: inline-block; max-width: 100%; font-size: 0.74rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; background: rgba(10,162,192,0.1); color: #0a8aa3; vertical-align: middle; }
    .ck-pill.on { background: rgba(25,135,84,0.12); color: #198754; }
    .ck-pill.off { background: #f3f4f6; color: #6b7280; }
    .ck-menu-item.success, .ck-menu-item.success i { color: #198754; }
    .ck-menu-item.success:hover { background: #f0fdf4; }
    @media (max-width: 768px) {
      .ck-table { table-layout: auto; }
      .ck-table th { width: auto !important; }
    }
  `;

  // ── Shared input style ─────────────────────────────────────────────────────
  const inputStyle = { borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' };
  const labelStyle = { fontWeight: '600', color: '#333333' };

  const ckPagerNumbers = (() => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();
  const hasClinicFilters = searchTerm || filterSpecialization;
  const clinicInitials = (name) => (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 clinic-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* Header */}
        <div className="mb-4 ck-anim">
          <h2 className="ck-title clinic-title">Private Clinic Management</h2>
          <p className="ck-sub">Private veterinary clinics with PetUnity accounts that can add pet records.</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>{error}
          </Alert>
        )}
        {success && (
          <div className="ck-toast" role="status">
            <div className="ic"><i className="fas fa-check" /></div>
            <div className="flex-grow-1">
              <div className="t">Success</div>
              <div className="d">{success}</div>
            </div>
            <button type="button" className="ck-toast-close" onClick={() => setSuccess('')} aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}
        {/* ── Stat Cards ── */}
        <Row className="mb-4" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px' }}>
          {[
                      {
            label: 'Active Clinics',
            count: displayCounts.active,
              img: '/active.png',
              accent: '#198754',
              accentAlpha: 'rgba(25,135,84,0.12)',
              fallbackIcon: 'fa-clinic-medical',
              description: 'Currently Active',
              delay: '0.1s'
            },
                      {
            label: 'Inactive Clinics',
            count: displayCounts.inactive,
              img: '/inactive.png',
              accent: '#dc3545',
              accentAlpha: 'rgba(220,53,69,0.12)',
              fallbackIcon: 'fa-ban',
              description: 'Deactivated',
              delay: '0.2s'
            },
                      {
            label: 'Specializations',
            count: displayCounts.specs,
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
                        marginBottom: '0.75rem',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: '3ch'
                      }}>
                        {loading ? (
                          <span style={{
                            display: 'inline-block', width: '3ch', height: '1em',
                            borderRadius: '6px',
                            background: '#f0f0f0',
                            animation: 'shimmer 1.4s ease-in-out infinite',
                            verticalAlign: 'middle'
                          }} />
                        ) : count}
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

        {/* Clinics table */}
        <div className="ck-panel ck-anim" style={{ '--d': '0.18s', overflow: 'visible' }}>
          {/* Header */}
          <div className="ck-toolbar">
            <div className="ck-toolbar-title">
              <span>Private clinics</span>
              <span className="ck-count">{filteredClinics.length}</span>
            </div>
            <div className="d-flex align-items-center flex-wrap gap-2">
              <div className="ck-seg" role="group" aria-label="Status">
                {[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([v, l]) => (
                  <button key={v} type="button" className={filterStatus === v ? 'on' : ''} onClick={() => { setFilterStatus(v); setShowDropdown(null); }} aria-pressed={filterStatus === v}>{l}</button>
                ))}
              </div>
              <button type="button" className="ck-btn primary clinic-add-btn" onClick={handleAddClinic}>
                <i className="fas fa-plus" />Add clinic
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="ck-filters">
            <div className="ck-search">
              <i className="fas fa-search" />
              <input
                className="ck-input"
                placeholder="Search by clinic name, owner, email, username..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                aria-label="Search clinics"
              />
              {searchTerm && (
                <button type="button" className="ck-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <div className="ck-select">
              <i className="fas fa-stethoscope" />
              <select className="ck-input" value={filterSpecialization} onChange={e => setFilterSpecialization(e.target.value)} aria-label="Specialization">
                <option value="">All specializations</option>
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {hasClinicFilters && (
              <button type="button" className="ck-link" onClick={() => { setSearchTerm(''); setFilterSpecialization(''); }}>
                <i className="fas fa-undo me-1" />Clear filters
              </button>
            )}
          </div>

          {/* Body */}
          <div className="clinic-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
            {loading ? (
              <div style={{ padding: '0.5rem 0 1rem' }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.12 }}>
                    <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10 }} />
                    <div className="flex-grow-1">
                      <div className="skeleton" style={{ width: '25%', height: 13, marginBottom: 8 }} />
                      <div className="skeleton" style={{ width: '15%', height: 10 }} />
                    </div>
                    <div className="skeleton" style={{ width: 160, height: 12 }} />
                    <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 999 }} />
                  </div>
                ))}
              </div>
            ) : filteredClinics.length === 0 ? (
              <div className="ck-empty">
                <div className="ic"><i className="fas fa-hospital" /></div>
                <h6>{hasClinicFilters || filterStatus !== 'active' ? 'No clinics found' : 'No clinics added yet'}</h6>
                <p>{hasClinicFilters || filterStatus !== 'active' ? 'Try changing or clearing the filters.' : 'Start by adding private clinics to the system.'}</p>
                {!hasClinicFilters && filterStatus === 'active' && (
                  <button type="button" className="ck-btn primary" onClick={handleAddClinic}>
                    <i className="fas fa-plus" />Add first clinic
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive" style={{ overflow: 'visible' }}>
                <table className="ck-table clinic-table">
                  <thead>
                    <tr>
                      <th style={{ width: '26%' }}>Clinic</th>
                      <th className="mobile-hide" style={{ width: '11%' }}>Code</th>
                      <th className="mobile-hide" style={{ width: '16%' }}>Owner</th>
                      <th style={{ width: '20%' }}>Contact</th>
                      <th className="mobile-hide" style={{ width: '13%' }}>Specialization</th>
                      <th style={{ width: '9%' }}>Status</th>
                      <th style={{ width: '5%' }} aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClinics.map((clinic, i) => {
                      const active = clinic.is_active == 1;
                      const menuOpen = showDropdown === clinic.id;
                      return (
                        <tr key={clinic.id} className={menuOpen ? 'raised' : ''} style={{ animationDelay: `${i * 0.04}s` }}>
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <div className={`ck-logo${active ? '' : ' off'}`}>{clinicInitials(clinic.clinic_name)}</div>
                              <div style={{ minWidth: 0 }}>
                                <div className="ck-strong ck-ellipsis" title={clinic.clinic_name}>{clinic.clinic_name}</div>
                                <div className="ck-muted ck-ellipsis"><i className="fas fa-user-circle ck-ic" />{clinic.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="mobile-hide">
                            <span className="ck-code">{clinic.clinic_code || '—'}</span>
                          </td>
                          <td className="mobile-hide">
                            <div className="ck-ellipsis" style={{ fontSize: '0.85rem' }} title={clinic.owner_name}>{clinic.owner_name || '—'}</div>
                          </td>
                          <td>
                            <div className="ck-ellipsis" style={{ fontSize: '0.84rem' }} title={clinic.email}><i className="fas fa-envelope ck-ic" />{clinic.email || '—'}</div>
                            {clinic.phone && <div className="ck-muted"><i className="fas fa-phone-alt ck-ic" />{clinic.phone}</div>}
                          </td>
                          <td className="mobile-hide">
                            {clinic.specialization
                              ? <span className="ck-spec ck-ellipsis" title={clinic.specialization}>{clinic.specialization}</span>
                              : <span className="ck-muted">—</span>}
                          </td>
                          <td>
                            <span className={`ck-pill ${active ? 'on' : 'off'}`}>
                              <i className="fas fa-circle" />{active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                type="button"
                                className={`ck-icon-btn${menuOpen ? ' on' : ''}`}
                                onClick={() => setShowDropdown(menuOpen ? null : clinic.id)}
                                aria-label={`Options for ${clinic.clinic_name}`}
                                aria-expanded={menuOpen}
                              >
                                <i className="fas fa-ellipsis-v" />
                              </button>
                              {menuOpen && (
                                <>
                                  <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
                                  <div className="ck-menu" role="menu">
                                    <button type="button" role="menuitem" className="ck-menu-item" onClick={() => { setShowDropdown(null); handleViewClinic(clinic); }}>
                                      <i className="fas fa-eye" />View details
                                    </button>
                                    {active ? (
                                      <>
                                        <button type="button" role="menuitem" className="ck-menu-item" onClick={() => { setShowDropdown(null); handleEditClinic(clinic); }}>
                                          <i className="fas fa-pen" />Edit clinic
                                        </button>
                                        <div className="ck-menu-sep" />
                                        <button type="button" role="menuitem" className="ck-menu-item danger" onClick={() => { setShowDropdown(null); handleDeleteClinic(clinic); }}>
                                          <i className="fas fa-ban" />Deactivate
                                        </button>
                                      </>
                                    ) : (
                                      <button type="button" role="menuitem" className="ck-menu-item success" onClick={() => { setShowDropdown(null); setSelectedClinic(clinic); setShowRestoreModal(true); }}>
                                        <i className="fas fa-undo" />Restore clinic
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredClinics.length > itemsPerPage && (
            <div className="ck-foot clinic-pagination">
              <span className="ck-muted page-info" style={{ fontSize: '0.84rem' }}>
                Showing <strong style={{ color: '#1f2328' }}>{startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredClinics.length)}</strong> of {filteredClinics.length}
              </span>
              <div className="d-flex align-items-center gap-1">
                <button type="button" className="ck-page nav page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                  <i className="fas fa-chevron-left" />
                </button>
                {ckPagerNumbers.map(n => (
                  <button key={n} type="button" className={`ck-page page-btn${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
                ))}
                <button type="button" className="ck-page nav page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>

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
              <Button type="submit" disabled={
                formLoading ||
                !formData.clinic_name.trim() ||
                !formData.owner_name.trim() ||
                !formData.email.trim() ||
                (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) ||
                (formData.phone && !/^\d{11}$/.test(formData.phone)) ||
                !formData.username.trim()
              } className="border-0"
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
              <Button type="submit" disabled={
                formLoading ||
                !formData.clinic_name.trim() ||
                !formData.owner_name.trim() ||
                (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) ||
                (formData.phone && !/^\d{11}$/.test(formData.phone))
              } className="border-0"
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

    </>
  );
};

export default ClinicManagement;