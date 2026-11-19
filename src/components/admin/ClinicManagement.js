import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Modal, Form } from 'react-bootstrap';
import { clinicAPI, handleAPIError } from '../../services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIALIZATIONS = ['General Veterinary', 'Small Animals', 'Large Animals', 'Exotic Animals', 'Surgery', 'Dermatology', 'Dentistry', 'Cardiology'];

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
        <div className="skeleton" style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'8px', zIndex:1 }}>
          <span style={{ fontSize:'0.85rem', color:'#9ca3af', fontWeight:600 }}><i className="fas fa-map-marked-alt me-2" />Loading map…</span>
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

  // First load shows the skeleton; reloads after an action are silent (no jump to the top)
  const hasLoadedRef = useRef(false);
  const loadData = async () => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      const res = await clinicAPI.getAll();
      setClinics(res.data.clinics || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      hasLoadedRef.current = true;
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
    .ck-logo { width: 32px; height: 32px; border-radius: 50%; background: rgba(34,197,94,0.12); color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 800; flex-shrink: 0; }
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
    /* ---------------- Modals ---------------- */
    .mm-zoom-modal { zoom: 0.75; }
    @media (min-width: 1600px) { .mm-zoom-modal { zoom: 0.9; } }
    @media (min-width: 1920px) { .mm-zoom-modal { zoom: 1; } }
    .mm-backdrop-top { z-index: 1060 !important; }
    .mm-modal { max-width: 720px; }
    .mm-small { max-width: 440px; }
    .mm-small.wide { max-width: 540px; }
    .mm-modal .modal-content, .mm-small .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    .mm-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: 1px solid #eef0f3 !important; background: linear-gradient(180deg, color-mix(in srgb, var(--c, #ffc107) 8%, #fff) 0%, #fff 100%) !important; }
    .mm-head-main { display: flex; gap: 0.9rem; align-items: center; min-width: 0; flex: 1; }
    .mm-head-ic { width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: var(--c, #e0a800); background: color-mix(in srgb, var(--c, #ffc107) 14%, #fff); }
    .mm-kicker { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: color-mix(in srgb, var(--c, #e0a800) 80%, #000); }
    .mm-title { font-size: 1.2rem; font-weight: 700; color: #1f2328; margin: 0; line-height: 1.3; }
    .mm-head-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .mm-body { padding: 1.4rem 1.5rem !important; }
    .mm-section { margin-bottom: 1.25rem; }
    .mm-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.7rem; }
    .mm-section-title > i { color: #e0a800; font-size: 0.8rem; }
    .mm-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
    .mm-type { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.9rem 0.5rem; border: 1.5px solid #e5e7eb; border-radius: 14px; background: #fff; transition: all 0.15s ease; }
    .mm-type:hover { border-color: color-mix(in srgb, var(--c) 50%, #fff); }
    .mm-type.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 7%, #fff); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 16%, transparent); }
    .mm-type-ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); font-size: 1.1rem; }
    .mm-type-ic img { width: 30px; height: 30px; object-fit: contain; }
    .mm-type-label { font-weight: 700; font-size: 0.86rem; color: #374151; }
    .mm-type.on .mm-type-label { color: color-mix(in srgb, var(--c) 80%, #000); }
    .mm-type-check { position: absolute; top: 7px; right: 8px; color: var(--c); font-size: 0.85rem; }

    /* fields inside the modals */
    .mm-zoom-modal .form-label { font-size: 0.84rem !important; font-weight: 600 !important; color: #374151 !important; margin-bottom: 0.35rem; }
    .mm-zoom-modal .form-control, .mm-zoom-modal .form-select { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; box-shadow: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .mm-zoom-modal .form-control:focus, .mm-zoom-modal .form-select:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .mm-zoom-modal .form-control.is-invalid { border-color: #dc3545 !important; }
    .mm-zoom-modal .form-control:disabled, .mm-zoom-modal .form-select:disabled { background-color: #f8f9fa !important; }
    .mm-zoom-modal .input-group > .form-control { border-radius: 0 !important; }
    .mm-zoom-modal .input-group-text { border: 1.5px solid #e5e7eb !important; border-right: none !important; background: #f8f9fa !important; border-radius: 10px 0 0 10px !important; font-size: 0.95rem !important; }
    .mm-zoom-modal .input-group > .btn:last-child { border-radius: 0 10px 10px 0 !important; }
    .mm-zoom-modal .form-text { font-size: 0.76rem; }
    .mm-zoom-modal .alert { border-radius: 10px; font-size: 0.86rem; border-width: 1px; }
    .mm-zoom-modal .form-check-input:checked { background-color: #ffc107; border-color: #ffc107; }

    .mm-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.86rem; margin-bottom: 1rem; }
    .mm-alert i { margin-top: 3px; }
    .mm-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #842029; }
    .mm-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; align-items: center; gap: 0.6rem; flex-wrap: nowrap !important; }
    .mm-foot > * { margin: 0 !important; }
    .mm-foot.even > * { flex: 1; }
    .mm-btn { display: inline-flex !important; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 10px !important; border: 1px solid transparent !important; font-weight: 700 !important; font-size: 0.9rem !important; padding: 0.65rem 1.2rem !important; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .mm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .mm-btn.primary { background: #ffc107 !important; color: #1f2328 !important; }
    .mm-btn.primary:hover:not(:disabled) { background: #f0b400 !important; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .mm-btn.ghost { background: #fff !important; color: #1f2328 !important; border-color: #e5e7eb !important; font-weight: 600 !important; }
    .mm-btn.ghost:hover:not(:disabled) { background: #f6f7f9 !important; }
    .mm-btn.solid { background: var(--c) !important; color: #fff !important; }
    .mm-btn.solid:hover:not(:disabled) { background: color-mix(in srgb, var(--c) 85%, #000) !important; }

    /* view details */
    .mm-pet { display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem 1rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .mm-pet-av { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,193,7,0.16); color: #b88a00; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mm-pet-name { font-weight: 700; color: #1f2328; font-size: 1rem; }
    .mm-pet-meta { font-size: 0.8rem; color: #6b7280; }
    .mm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .mm-info { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.7rem 0.8rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fff; }
    .mm-info.wide { grid-column: 1 / -1; }
    .mm-info-ic { width: 30px; height: 30px; border-radius: 9px; background: #f6f7f9; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .mm-info-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .mm-info-value { font-size: 0.92rem; font-weight: 600; color: #1f2328; word-break: break-word; }
    .mm-none { color: #b8bdc6; font-weight: 500; }
    .mm-notes { margin-top: 0.9rem; padding: 0.8rem 0.95rem; border-radius: 12px; background: #fffaeb; border: 1px solid rgba(255,193,7,0.3); }
    .mm-notes p { margin: 0; font-size: 0.88rem; color: #374151; white-space: pre-line; }

    /* small centered modals */
    @keyframes rxPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    .mm-small-body { padding: 1.75rem 1.6rem 1.25rem !important; text-align: center; }
    .mm-small-icon { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); animation: rxPop 0.4s ease-out; }
    .mm-small-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; }
    .mm-small-text { font-size: 0.88rem; color: #6b7280; margin-bottom: 1.1rem; line-height: 1.55; }
    .mm-item { display: flex; align-items: center; gap: 0.7rem; text-align: left; padding: 0.7rem 0.85rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .mm-item-av { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, #fff); }
    .mm-item-name { font-weight: 700; color: #1f2328; font-size: 0.94rem; }
    .mm-item-meta { font-size: 0.78rem; color: #6b7280; }
    .mm-item-flag { font-size: 0.76rem; font-weight: 600; color: #c2410c; margin-top: 0.2rem; }
    .mm-note { display: flex; gap: 0.5rem; align-items: flex-start; text-align: left; margin-top: 0.8rem; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.8rem; line-height: 1.5; color: color-mix(in srgb, var(--c) 80%, #000); background: color-mix(in srgb, var(--c) 6%, #fff); border: 1px solid color-mix(in srgb, var(--c) 20%, #fff); }
    .mm-note i { margin-top: 3px; }
    .mm-review { background: #fafbfc; border: 1px solid #eef0f3; border-radius: 12px; padding: 0.9rem 1rem; }

    @media (max-width: 768px) {
      .mm-zoom-modal { zoom: 1; }
      .mm-zoom-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
      .mm-zoom-modal .modal-dialog-scrollable { height: calc(100% - 1.5rem); }
      .mm-head { padding: 1rem !important; }
      .mm-head-ic { width: 40px; height: 40px; }
      .mm-title { font-size: 1.05rem; }
      .mm-body { padding: 1rem !important; }
      .mm-types { grid-template-columns: repeat(2, 1fr); }
      .mm-zoom-modal .input-group .form-control { font-size: 0.92rem !important; letter-spacing: 0 !important; min-width: 0; }
      .mm-zoom-modal .input-group > .btn { padding: 0 0.75rem !important; font-size: 0.82rem !important; }
      .mm-zoom-modal .input-group-text { padding: 0 0.6rem !important; font-size: 0.85rem !important; }
      .mm-type { flex-direction: row; justify-content: flex-start; padding: 0.6rem 0.7rem; gap: 0.55rem; }
      .mm-type-ic { width: 36px; height: 36px; border-radius: 10px; }
      .mm-type-ic img { width: 22px; height: 22px; }
      .mm-type-label { font-size: 0.82rem; }
      .mm-info { padding: 0.6rem 0.65rem; gap: 0.5rem; }
      .mm-info-ic { display: none; }
      .mm-foot { padding: 0.75rem 1rem !important; }
      .mm-foot > * { flex: 1; }
      .mm-small-body { padding: 1.5rem 1.1rem 1rem !important; }
    }
    @media (max-width: 380px) { .mm-grid { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .mm-small-icon { animation: none; } }

    /* Report management extras */
    .mm-modal.lg { max-width: 940px; }
    .mm-head-ic img { width: 30px; height: 30px; object-fit: contain; }
    .mm-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.3rem; }
    .mm-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; padding: 0.18rem 0.6rem; border-radius: 999px; white-space: nowrap; }
    .mm-chip i { font-size: 0.66rem; }
    .mm-chip.grey { background: #f3f4f6; color: #4b5563; }
    .mm-num, .mm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .mm-num { font-size: 0.8rem; font-weight: 600; color: #6b7280; margin-top: 0.15rem; }
    .mm-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .mm-count { margin-left: auto; font-size: 0.7rem; background: #f3f4f6; color: #4b5563; padding: 0.1rem 0.55rem; border-radius: 999px; letter-spacing: 0; }
    .mm-req { color: #dc3545; }
    .mm-opt { font-size: 0.72rem; font-weight: 600; color: #9ca3af; text-transform: none; letter-spacing: 0; }
    .mm-label { font-size: 0.84rem; font-weight: 600; color: #374151; margin-bottom: 0.35rem; }
    .mm-input { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .mm-input:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .mm-input.good { border-color: #10b981 !important; }
    .mm-input.bad { border-color: #ef4444 !important; }
    .mm-hint { font-size: 0.78rem; color: #6b7280; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem; }
    .mm-hint.bad { color: #dc3545; }
    .mm-readonly { display: flex; align-items: center; gap: 0.55rem; min-height: 44px; padding: 0.6rem 0.8rem; border-radius: 10px; border: 1.5px dashed #e5e7eb; background: #f8f9fa; font-size: 0.92rem; font-weight: 600; color: #1f2328; }
    .mm-readonly i { color: #9ca3af; }
    .mm-readonly.empty { font-weight: 500; font-style: italic; color: #9ca3af; }
    .mm-map { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .mm-map-loading { position: absolute; inset: 0; z-index: 1; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 0.85rem; font-weight: 600; border-radius: 0; }
    .mm-pin { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.55rem; padding: 0.55rem 0.75rem; border-radius: 10px; background: #f8f9fa; color: #6b7280; font-size: 0.8rem; }
    .mm-pin.ok { background: rgba(25,135,84,0.07); color: #146c43; border: 1px solid rgba(25,135,84,0.2); }
    .mm-pin .mm-mono { margin-left: 0.3rem; opacity: 0.85; }
    .mm-pin button { margin-left: auto; border: none; background: none; color: #dc3545; font-size: 0.78rem; font-weight: 600; padding: 0; display: inline-flex; align-items: center; gap: 0.3rem; }
    .mm-desc { font-size: 0.92rem; color: #374151; line-height: 1.6; margin: 0; white-space: pre-line; word-break: break-word; }
    .mm-desc.muted { color: #9ca3af; font-style: italic; }
    .mm-admin { margin-top: 1rem; padding: 0.85rem 1rem; border-radius: 12px; background: rgba(13,110,253,0.05); border: 1px solid rgba(13,110,253,0.18); }
    .mm-admin-head { font-size: 0.78rem; font-weight: 700; color: #0a58ca; display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.3rem; }
    .mm-admin p { margin: 0; font-size: 0.88rem; color: #374151; white-space: pre-line; }
    .mm-empty { padding: 1.1rem; border: 1px dashed #e5e7eb; border-radius: 12px; color: #9ca3af; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
    .mm-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem; }
    .mm-thumb { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; background: #f8f9fa; padding: 0; cursor: zoom-in; }
    .mm-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.25s ease; }
    .mm-thumb:hover img { transform: scale(1.05); }
    .mm-thumb-zoom { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0); color: transparent; transition: all 0.15s ease; }
    .mm-thumb:hover .mm-thumb-zoom, .mm-thumb:focus-visible .mm-thumb-zoom { background: rgba(0,0,0,0.3); color: #fff; }
    .mm-thumb.broken::after { content: 'No preview'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #9ca3af; }
    .mm-actions { display: flex; flex-direction: column; gap: 0.45rem; }
    .mm-action { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.6rem 0.75rem; border-radius: 11px; border: 1px solid color-mix(in srgb, var(--c) 25%, #fff); background: color-mix(in srgb, var(--c) 5%, #fff); color: #1f2328; font-weight: 600; font-size: 0.88rem; transition: all 0.15s ease; }
    .mm-action:hover { background: color-mix(in srgb, var(--c) 10%, #fff); border-color: var(--c); transform: translateX(2px); }
    .mm-action-ic { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--c) 14%, #fff); color: var(--c); font-size: 0.8rem; flex-shrink: 0; }
    .mm-action-arrow { color: #c4c9d0; font-size: 0.72rem; }
    .mm-flow { display: flex; align-items: center; justify-content: center; gap: 0.6rem; margin: 0.9rem 0 1rem; color: #9ca3af; font-size: 0.8rem; }
    .mm-item-av img { width: 26px; height: 26px; object-fit: contain; }
    .mm-types { grid-template-columns: repeat(2, 1fr); }
    .mm-lightbox { position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .mm-lightbox img { max-width: 92vw; max-height: 86vh; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); transition: transform 0.1s ease; }
    .mm-lb-btn { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: #fff; display: flex; align-items: center; justify-content: center; }
    .mm-lb-btn:hover { background: rgba(255,255,255,0.3); }
    .mm-lb-btn.close { top: 1.25rem; right: 1.25rem; }
    .mm-lb-btn.prev { left: 1rem; top: 50%; transform: translateY(-50%); }
    .mm-lb-btn.next { right: 1rem; top: 50%; transform: translateY(-50%); }
    .mm-lb-count { position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.75); font-size: 0.8rem; font-weight: 600; }
    .mm-alert.page { margin-bottom: 1.25rem; align-items: center; }
    .mm-alert.page span { flex: 1; }
    .mm-alert.page button { border: none; background: transparent; color: inherit; width: 28px; height: 28px; border-radius: 7px; opacity: 0.7; }

    /* Clinic management extras */
    .mm-backdrop-top { z-index: 1060 !important; }
    .mm-avatar { width: 54px; height: 54px; border-radius: 15px; flex-shrink: 0; background: linear-gradient(135deg, #ffc107, #ffb000); color: #1f2328; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(255,193,7,0.3); }
    .mm-chip.green { background: rgba(25,135,84,0.12); color: #198754; }
    .mm-note-box { display: flex; gap: 0.7rem; align-items: flex-start; padding: 0.8rem 0.95rem; margin-bottom: 1.25rem; border-radius: 12px; background: rgba(13,202,240,0.07); border: 1px solid rgba(13,202,240,0.3); font-size: 0.86rem; color: #055160; line-height: 1.5; }
    .mm-note-box > i { margin-top: 3px; color: #0aa2c0; }
    .mm-note-box code { background: #fff; padding: 0.05rem 0.4rem; border-radius: 6px; color: #b02a37; }
    .mm-map > div { border-radius: 0 !important; }
    .mm-map small { display: none !important; }
    .mm-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .mm-kpi { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid #eef0f3; background: #fafbfc; }
    .mm-kpi .ic { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); flex-shrink: 0; }
    .mm-kpi .v { font-size: 1.5rem; font-weight: 800; color: #1f2328; line-height: 1.1; }
    .mm-kpi .v.sm { font-size: 0.98rem; }
    .mm-kpi .k { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .mm-item-av { color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); }
  `;

  // ── Shared input style ─────────────────────────────────────────────────────

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
          <div role="alert" className="mm-alert danger page">
            <i className="fas fa-exclamation-triangle" /><span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss"><i className="fas fa-times" /></button>
          </div>
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
            ADD / EDIT CLINIC MODALS (same form, different header and button)
        ════════════════════════════════════════════════════════════════ */}
        {[
          { mode: 'add',  show: showAddModal,  close: () => setShowAddModal(false),  submit: handleSubmitAdd },
          { mode: 'edit', show: showEditModal, close: () => setShowEditModal(false), submit: handleSubmitEdit },
        ].map(({ mode, show, close, submit }) => {
          const isAdd = mode === 'add';
          const emailBad = formData.email && !EMAIL_RE.test(formData.email);
          const emailOk  = formData.email && EMAIL_RE.test(formData.email);
          const phoneBad = formData.phone && !/^\d{11}$/.test(formData.phone);
          const phoneOk  = formData.phone && /^\d{11}$/.test(formData.phone);
          const invalid = formLoading || !formData.clinic_name.trim() || !formData.owner_name.trim() || emailBad || phoneBad ||
            (isAdd && (!formData.email.trim() || !formData.username.trim()));
          return (
            <Modal key={mode} show={show} onHide={() => !formLoading && close()} backdrop="static" dialogClassName="mm-modal" className="mm-zoom-modal" scrollable>
              <Modal.Header closeButton className="mm-head" style={{ '--c': '#e0a800' }}>
                <div className="mm-head-main">
                  <div className="mm-head-ic"><i className={`fas ${isAdd ? 'fa-clinic-medical' : 'fa-pen'}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="mm-kicker">{isAdd ? 'New private clinic' : 'Edit clinic'}</div>
                    <Modal.Title as="h5" className="mm-title">{isAdd ? 'Add private clinic' : (selectedClinic?.clinic_name || 'Edit clinic')}</Modal.Title>
                    <div className="mm-sub">Fields marked <span className="mm-req">*</span> are required.</div>
                  </div>
                </div>
              </Modal.Header>
              <Form onSubmit={submit} style={{ display: 'contents' }}>
                <Modal.Body className="mm-body">
                  {formError && <div className="mm-alert danger"><i className="fas fa-exclamation-circle" /><span>{formError}</span></div>}

                  {isAdd && (
                    <div className="mm-note-box">
                      <i className="fas fa-key" />
                      <div>
                        <strong>Login is created automatically.</strong> The username fills in from the clinic name (you can edit it). Default password: <code>clinic123</code>
                      </div>
                    </div>
                  )}

                  <div className="mm-section">
                    <div className="mm-section-title"><i className="fas fa-hospital" />Clinic details</div>
                    <Row className="g-3">
                      <Col md={7}>
                        <Form.Label className="mm-label">Clinic name <span className="mm-req">*</span></Form.Label>
                        <Form.Control className="mm-input" type="text" name="clinic_name" value={formData.clinic_name}
                          onChange={isAdd ? handleClinicNameChange : handleFormChange} required disabled={formLoading}
                          placeholder="e.g. Pawsome Veterinary Clinic" />
                      </Col>
                      <Col md={5}>
                        <Form.Label className="mm-label">Owner / veterinarian <span className="mm-req">*</span></Form.Label>
                        <Form.Control className="mm-input" type="text" name="owner_name" value={formData.owner_name}
                          onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onChange={handleFormChange} required disabled={formLoading}
                          placeholder="Full name" />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="mm-label">License number</Form.Label>
                        <Form.Control className="mm-input" type="text" name="license_number" value={formData.license_number}
                          onChange={handleFormChange} disabled={formLoading} placeholder="e.g. PRC-VET-12345" />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="mm-label">Specialization</Form.Label>
                        <Form.Select className="mm-input" name="specialization" value={formData.specialization} onChange={handleFormChange} disabled={formLoading}>
                          <option value="">General / None</option>
                          {SPECIALIZATIONS.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                        </Form.Select>
                      </Col>
                    </Row>
                  </div>

                  <div className="mm-section">
                    <div className="mm-section-title"><i className="fas fa-address-book" />Contact</div>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Label className="mm-label">Email address {isAdd && <span className="mm-req">*</span>}</Form.Label>
                        <Form.Control className={`mm-input${emailBad ? ' bad' : emailOk ? ' good' : ''}`} type="email" name="email" value={formData.email}
                          onChange={handleFormChange} required={isAdd} disabled={formLoading} placeholder="clinic@example.com" />
                        {emailBad && <div className="mm-hint bad"><i className="fas fa-times-circle" />Enter a valid email (e.g. clinic@example.com)</div>}
                      </Col>
                      <Col md={6}>
                        <Form.Label className="mm-label">Phone number</Form.Label>
                        <Form.Control className={`mm-input${phoneBad ? ' bad' : phoneOk ? ' good' : ''}`} type="tel" inputMode="numeric" maxLength={11} name="phone" value={formData.phone}
                          onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                          onChange={handleFormChange} disabled={formLoading} placeholder="09XXXXXXXXX" />
                        {phoneBad && <div className="mm-hint bad"><i className="fas fa-times-circle" />Must be exactly 11 digits</div>}
                      </Col>
                    </Row>
                  </div>

                  <div className="mm-section">
                    <div className="mm-section-title"><i className="fas fa-map-marker-alt" />Location <span className="mm-opt">optional</span></div>
                    <div className="mm-map">
                      <LeafletMap
                        lat={formLat}
                        lng={formLng}
                        onLocationSelect={(lat, lng) => { setFormLat(lat); setFormLng(lng); }}
                        onAddressResolve={(addr) => setFormData(prev => ({ ...prev, address: addr }))}
                        onError={(msg) => setLocationError(msg)}
                      />
                    </div>
                    {formLat && formLng ? (
                      <div className="mm-pin ok">
                        <i className="fas fa-check-circle" />
                        <span>Location pinned <span className="mm-mono">{formLat.toFixed(5)}, {formLng.toFixed(5)}</span></span>
                        <button type="button" onClick={() => { setFormLat(null); setFormLng(null); }} disabled={formLoading}><i className="fas fa-times" />Clear</button>
                      </div>
                    ) : (
                      <div className="mm-pin"><i className="fas fa-hand-pointer" />Click the map to pin the clinic. The address fills in automatically.</div>
                    )}
                    <Form.Label className="mm-label mt-3">Address</Form.Label>
                    <Form.Control className="mm-input" type="text" name="address" value={formData.address}
                      onChange={handleFormChange} disabled={formLoading} placeholder="Street, barangay, city" />
                  </div>

                  {isAdd && (
                    <div className="mm-section mb-0">
                      <div className="mm-section-title"><i className="fas fa-user-lock" />Account</div>
                      <Form.Label className="mm-label">Username <span className="mm-req">*</span></Form.Label>
                      <Form.Control className="mm-input mm-mono" type="text" name="username" value={formData.username}
                        onChange={handleFormChange} required disabled={formLoading} placeholder="Auto-generated from clinic name" />
                      <div className="mm-hint"><i className="fas fa-magic" />Auto-generated — you may edit it if needed.</div>
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer className="mm-foot">
                  <button type="button" className="mm-btn ghost" onClick={close} disabled={formLoading}>Cancel</button>
                  <button type="submit" className="mm-btn primary" disabled={invalid}>
                    {formLoading
                      ? <><i className="fas fa-circle-notch fa-spin" />{isAdd ? 'Adding…' : 'Saving…'}</>
                      : isAdd ? <><i className="fas fa-plus" />Add clinic</> : <><i className="fas fa-save" />Save changes</>}
                  </button>
                </Modal.Footer>
              </Form>
            </Modal>
          );
        })}

        {/* ════════════════════════════════════════════════════════════════
            VIEW CLINIC MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} dialogClassName="mm-modal" className="mm-zoom-modal" scrollable>
          {selectedClinic && (() => {
            const c = selectedClinic;
            const active = c.is_active == 1; // eslint-disable-line eqeqeq
            const initials = (c.clinic_name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
            const info = [
              { icon: 'fa-user-md', label: 'Owner', value: c.owner_name || '—' },
              { icon: 'fa-at', label: 'Username', value: <span className="mm-mono">{c.username || '—'}</span> },
              { icon: 'fa-envelope', label: 'Email', value: c.email || '—' },
              { icon: 'fa-phone-alt', label: 'Phone', value: c.phone || 'Not provided' },
              { icon: 'fa-home', label: 'Address', value: c.address || 'Not provided', wide: true },
              { icon: 'fa-id-badge', label: 'License', value: c.license_number || 'Not provided' },
              { icon: 'fa-stethoscope', label: 'Specialization', value: c.specialization || 'General / None' },
            ];
            return (
              <>
                <Modal.Header closeButton className="mm-head" style={{ '--c': '#e0a800' }}>
                  <div className="mm-head-main">
                    <div className="mm-avatar">{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mm-chips">
                        <span className={`mm-chip ${active ? 'green' : 'grey'}`}><i className="fas fa-circle" style={{ fontSize: '0.45rem' }} />{active ? 'Active' : 'Inactive'}</span>
                        {c.clinic_code && <span className="mm-chip grey mm-mono">{c.clinic_code}</span>}
                      </div>
                      <Modal.Title as="h5" className="mm-title">{c.clinic_name}</Modal.Title>
                      <div className="mm-sub">Private clinic</div>
                    </div>
                  </div>
                </Modal.Header>
                <Modal.Body className="mm-body">
                  <div className="mm-kpis">
                    <div className="mm-kpi">
                      <div className="ic" style={{ '--c': '#e0a800' }}><i className="fas fa-syringe" /></div>
                      <div>
                        <div className="v">{c.vaccinations_administered || 0}</div>
                        <div className="k">Vaccinations given</div>
                      </div>
                    </div>
                    <div className="mm-kpi">
                      <div className="ic" style={{ '--c': '#0d6efd' }}><i className="fas fa-calendar-check" /></div>
                      <div>
                        <div className="v sm">{c.created_at ? new Date(String(c.created_at).replace(' ', 'T')).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
                        <div className="k">Member since</div>
                      </div>
                    </div>
                  </div>

                  <div className="mm-section-title mt-4"><i className="fas fa-info-circle" />Clinic information</div>
                  <div className="mm-grid">
                    {info.map(it => (
                      <div key={it.label} className={`mm-info${it.wide ? ' wide' : ''}`}>
                        <div className="mm-info-ic"><i className={`fas ${it.icon}`} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="mm-info-label">{it.label}</div>
                          <div className="mm-info-value">{it.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Modal.Body>
                <Modal.Footer className="mm-foot">
                  {active && (
                    <button type="button" className="mm-btn ghost me-auto" onClick={() => { setShowViewModal(false); handleEditClinic(c); }}>
                      <i className="fas fa-pen" />Edit
                    </button>
                  )}
                  <button type="button" className="mm-btn primary" onClick={() => setShowViewModal(false)}>Close</button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>

        {/* ════════════════════════════════════════════════════════════════
            DEACTIVATE / RESTORE CONFIRMATION (small, always centered)
        ════════════════════════════════════════════════════════════════ */}
        {[
          { key: 'deactivate', show: showDeleteModal, close: () => setShowDeleteModal(false), color: '#dc3545', icon: 'fa-ban',
            title: 'Deactivate this clinic?', text: 'The clinic will no longer be able to sign in. Its vaccination records and activity are kept.',
            label: 'Deactivate', busy: 'Deactivating…', onConfirm: handleConfirmDelete },
          { key: 'restore', show: showRestoreModal, close: () => setShowRestoreModal(false), color: '#198754', icon: 'fa-undo',
            title: 'Restore this clinic?', text: 'The clinic account will be reactivated and can sign in again.',
            label: 'Restore', busy: 'Restoring…', onConfirm: () => handleRestoreClinic(selectedClinic) },
        ].map(m => (
          <Modal key={m.key} show={m.show} onHide={() => !formLoading && m.close()} centered dialogClassName="mm-small" className="mm-zoom-modal">
            {selectedClinic && (
              <>
                <Modal.Body className="mm-small-body">
                  <div className="mm-small-icon" style={{ '--c': m.color }}><i className={`fas ${m.icon}`} /></div>
                  <h5 className="mm-small-title">{m.title}</h5>
                  <p className="mm-small-text">{m.text}</p>
                  <div className="mm-item">
                    <div className="mm-item-av" style={{ '--c': '#e0a800' }}><i className="fas fa-clinic-medical" /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mm-item-name">{selectedClinic.clinic_name}</div>
                      <div className="mm-item-meta">{[selectedClinic.clinic_code, selectedClinic.owner_name, selectedClinic.email].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer className="mm-foot even">
                  <button type="button" className="mm-btn ghost" onClick={m.close} disabled={formLoading}>Cancel</button>
                  <button type="button" className="mm-btn solid" style={{ '--c': m.color }} onClick={m.onConfirm} disabled={formLoading}>
                    {formLoading ? <><i className="fas fa-circle-notch fa-spin" />{m.busy}</> : <><i className={`fas ${m.icon}`} />{m.label}</>}
                  </button>
                </Modal.Footer>
              </>
            )}
          </Modal>
        ))}

        {/* ── Location Error Modal (small, centered, above the form) ── */}
        <Modal show={!!locationError} onHide={() => setLocationError('')} centered dialogClassName="mm-small" className="mm-zoom-modal" style={{ zIndex: 1065 }} backdropClassName="mm-backdrop-top">
          <Modal.Body className="mm-small-body">
            <div className="mm-small-icon" style={{ '--c': '#dc3545' }}><i className="fas fa-map-marker-alt" /></div>
            <h5 className="mm-small-title">Can't pin this location</h5>
            <p className="mm-small-text mb-0">{locationError}</p>
          </Modal.Body>
          <Modal.Footer className="mm-foot even">
            <button type="button" className="mm-btn primary" onClick={() => setLocationError('')}>Got it</button>
          </Modal.Footer>
        </Modal>

      </Container>

    </>
  );
};

export default ClinicManagement;