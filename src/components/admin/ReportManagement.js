import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner,
  Badge, Table, Modal, Form, InputGroup
} from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { barangayAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';

const reportsAPI = {
  getAll:  ()         => api.get('/reports'),
  getById: (id)       => api.get(`/reports/show/${id}`),
  update:  (id, data) => api.put(`/reports/update/${id}`, data),
  delete:  (id)       => api.delete(`/reports/delete/${id}`),
  create:  (data)     => api.post('/reports/admin-create', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:          { label: 'Pending',          color: '#ffffff', bg: '#ffc107', border: '#e0a800' },
  suspected_rabies: { label: 'Suspected Rabies', color: '#ffffff', bg: '#dc3545', border: '#b02a37' },
  positive_rabies:  { label: 'Positive Rabies',  color: '#ffffff', bg: '#6f0000', border: '#4a0000' },
  ongoing:          { label: 'Ongoing',           color: '#ffffff', bg: '#0dcaf0', border: '#0aaabf' },
  resolved:         { label: 'Resolved',          color: '#ffffff', bg: '#198754', border: '#146c43' },
  declined:         { label: 'Declined',          color: '#ffffff', bg: '#6c757d', border: '#565e64' },
};

const REPORT_TYPES = [
  { value: 'rabies_case',   label: 'Rabies Case',   img: '/rabies.png',          color: '#dc3545' },
  { value: 'animal_bite',   label: 'Animal Bite',   img: '/animal_bite.png',     color: '#fd7e14' },
  { value: 'animal_rescue', label: 'Animal Rescue', img: '/animal_rescue.png',   color: '#0d6efd' },
  { value: 'others',        label: 'Others',        img: '/others.png',          color: '#6c757d' },
];

const getActionButtons = (report) => {
  const { report_type, status } = report;
  const isRabiesType = report_type === 'rabies_case' || report_type === 'animal_bite';
  if (isRabiesType) {
    if (status === 'pending')          return [{ label: 'Mark as Suspected Rabies', next: 'suspected_rabies', variant: 'warning' }, { label: 'Mark as Positive Rabies', next: 'positive_rabies', variant: 'danger' }, { label: 'Decline Report', next: 'declined', variant: 'secondary' }];
    if (status === 'suspected_rabies') return [{ label: 'Mark as Positive Rabies', next: 'positive_rabies', variant: 'danger' }, { label: 'Mark as Resolved', next: 'resolved', variant: 'success' }];
    if (status === 'positive_rabies')  return [{ label: 'Mark as Resolved', next: 'resolved', variant: 'success' }];
  } else {
    if (status === 'pending') return [{ label: 'Mark as Ongoing', next: 'ongoing', variant: 'info' }, { label: 'Mark as Resolved', next: 'resolved', variant: 'success' }, { label: 'Decline Report', next: 'declined', variant: 'secondary' }];
    if (status === 'ongoing') return [{ label: 'Mark as Resolved', next: 'resolved', variant: 'success' }];
  }
  return [];
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#fff', bg: '#6c757d', border: '#6c757d' };
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

const ReportTypeImg = ({ type, size = 28 }) => (
  <img
    src={type?.img || '/others.png'}
    alt={type?.label || ''}
    style={{ width: size, height: size, objectFit: 'contain' }}
    onError={e => { e.target.style.display = 'none'; }}
  />
);

const getAvgRabiesPerMonth = (reports) => {
  const rabiesReports = reports.filter(r => r.report_type === 'rabies_case' || r.report_type === 'animal_bite');
  if (!rabiesReports.length) return '0.0';
  const months = new Set(rabiesReports.map(r => {
    const d = new Date(r.created_at);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }));
  return (rabiesReports.length / months.size).toFixed(1);
};

const ReportManagement = () => {
  const [reports,   setReports]   = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const [showViewModal,   setShowViewModal]   = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedReport,  setSelectedReport]  = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);
const dropdownButtonRef = useRef(null);
const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
const ZOOM = 0.75;
  const [actionTarget,    setActionTarget]    = useState(null);

  const [adminNotes,    setAdminNotes]    = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Generate report modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateLoading,   setGenerateLoading]   = useState(false);
  const [generateError,     setGenerateError]     = useState('');
  const [generateForm,      setGenerateForm]       = useState({
    report_type: 'rabies_case',
    barangay_id: '',
    address: '',
    phone_number: '',
    description: '',
    auto_status: 'suspected_rabies',
  });
  const [generatePhoneError, setGeneratePhoneError] = useState('');
  const [generateLat, setGenerateLat] = useState(null);
  const [generateLng, setGenerateLng] = useState(null);
  const [leafletLoaded, setLeafletLoaded] = useState(!!window.L);
  const generateMapRef      = useRef(null);
  const generateMapObj      = useRef(null);
  const generateMarkerRef   = useRef(null);

  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterType,     setFilterType]     = useState('all');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterBarangay, setFilterBarangay] = useState('all');
const [filterSource, setFilterSource] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
      .rpt-title { font-size: 1.5rem !important; }
      .rpt-stat-row { flex-wrap: nowrap !important; }
      .rpt-stat-col { flex: 1 1 0 !important; min-width: 0 !important; }
      .rpt-stat-label { font-size: 0.55rem !important; margin-bottom: 0.15rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      .rpt-stat-number { font-size: 1.1rem !important; margin-bottom: 0.25rem !important; }
      .rpt-stat-description { display: none !important; }
      .rpt-stat-card-body { padding: 0.6rem 0.5rem !important; }
      .rpt-stat-card-body .mb-3 { margin-bottom: 0 !important; }
      .rpt-stat-icon { width: 32px !important; height: 32px !important; border-radius: 8px !important; flex-shrink: 0 !important; }
      .rpt-stat-icon img { width: 18px !important; height: 18px !important; }
      .rpt-filters-row > div { margin-bottom: 0.5rem; }
      .rpt-card-header { padding: 0.75rem 1rem !important; }
      .rpt-card-header h5 { font-size: 0.85rem !important; }
      .rpt-card-body { padding: 1rem !important; }
      .rpt-table th, .rpt-table td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
      .rpt-table .mobile-hide { display: none !important; }
.rpt-table .mobile-hide-reporter { display: none !important; }
      .rpt-pagination { font-size: 0.75rem !important; }
      .rpt-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .rpt-pagination .page-info { font-size: 0.75rem !important; }
      .rpt-view-modal .modal-body { padding: 1rem !important; }
      .rpt-view-modal .modal-body td { font-size: 0.78rem !important; padding-bottom: 0.4rem !important; }
      .rpt-view-modal .modal-body p { font-size: 0.85rem !important; }
      .rpt-view-modal .card-header h6 { font-size: 0.8rem !important; }
    }
  `;

const location = useLocation();

  useEffect(() => { loadData(); }, []);

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

  useEffect(() => {
    if (location.state?.openReportId && reports.length > 0) {
      const report = reports.find(r => r.id === location.state.openReportId);
      if (report) {
        setSelectedReport(report);
        setShowViewModal(true);
        window.history.replaceState({}, '');
      }
    }
  }, [reports, location.state]);

  useEffect(() => {
  if (showDropdown === null) return;
  const updatePos = () => {
    if (!dropdownButtonRef.current) return;
    const rect = dropdownButtonRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 215 });
  };
  window.addEventListener('scroll', updatePos, true);
  return () => window.removeEventListener('scroll', updatePos, true);
}, [showDropdown]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, bRes] = await Promise.all([reportsAPI.getAll(), barangayAPI.getAll()]);
      setReports(rRes.data.reports   || []);
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
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleActionClick = (report, nextStatus) => {
    setActionTarget({ report, next: nextStatus });
    setAdminNotes(report.admin_notes || '');
    setShowUpdateModal(true);
  };

  const confirmUpdate = async () => {
    if (!actionTarget) return;
    setUpdateLoading(true);
    try {
      await reportsAPI.update(actionTarget.report.id, { status: actionTarget.next, admin_notes: adminNotes });
      const label = STATUS_CONFIG[actionTarget.next]?.label || actionTarget.next;
      setSuccess(`Report marked as "${label}" successfully.`);
      await loadData();
      setShowUpdateModal(false);
      setActionTarget(null);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Init generate map
  useEffect(() => {
    if (!showGenerateModal || !leafletLoaded || !generateMapRef.current || generateMapObj.current) return;
    const L = window.L;
    const map = L.map(generateMapRef.current, {
      center: [14.4081, 121.0415], zoom: 13,
      minZoom: 12, maxZoom: 22,
      maxBounds: [[14.34, 120.97], [14.50, 121.12]],
      maxBoundsViscosity: 0.7,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 22, maxNativeZoom: 19,
    }).addTo(map);
    const poly = [
      [14.4700,121.0200],[14.4650,121.0500],[14.4550,121.0700],[14.4400,121.0800],
      [14.4200,121.0750],[14.4000,121.0700],[14.3800,121.0600],[14.3600,121.0450],
      [14.3550,121.0250],[14.3650,121.0050],[14.3850,120.9980],[14.4050,120.9950],
      [14.4300,121.0000],[14.4550,121.0050],[14.4700,121.0200],
    ];
    const isInside = (lat, lng) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
        if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    };
    L.polygon(poly, { color: '#ffc107', weight: 2.5, opacity: 0.8, fillOpacity: 0, dashArray: '6,4' }).addTo(map);
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (!isInside(lat, lng)) return;
      if (generateMarkerRef.current) generateMarkerRef.current.setLatLng([lat, lng]);
      else generateMarkerRef.current = L.marker([lat, lng]).addTo(map);
      setGenerateLat(lat); setGenerateLng(lng);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`)
        .then(r => r.json())
        .then(data => {
          const addr = data.display_name || '';
          setGenerateForm(f => ({ ...f, address: addr }));
          const addrStr = `${data.address?.suburb||''} ${data.address?.village||''} ${data.address?.quarter||''} ${data.address?.neighbourhood||''}`.toLowerCase();
          const match = barangays.find(b =>
            addrStr.includes(b.name.toLowerCase()) ||
            b.name.toLowerCase().split(' ').some(w => w.length > 3 && addrStr.includes(w))
          );
          if (match) setGenerateForm(f => ({ ...f, barangay_id: String(match.id) }));
        }).catch(() => {});
    });
    generateMapObj.current = map;
    setTimeout(() => map.invalidateSize(), 300);
    return () => { map.remove(); generateMapObj.current = null; generateMarkerRef.current = null; };
  }, [showGenerateModal, leafletLoaded, barangays]);

  const handleOpenGenerateModal = () => {
    setGenerateForm({ report_type: 'rabies_case', barangay_id: '', address: '', phone_number: '', description: '', auto_status: 'suspected_rabies' });
    setGenerateLat(null); setGenerateLng(null);
    setGenerateError('');
    setGeneratePhoneError('');
    setShowGenerateModal(true);
  };

  const handleGenerateSubmit = async () => {
    if (!generateForm.barangay_id)         { setGenerateError('Please select a barangay by pinning a location on the map.'); return; }
    if (!generateForm.address.trim())      { setGenerateError('Address is required.');        return; }
    if (!generateForm.phone_number.trim()) { setGenerateError('Contact number is required.'); return; }
    if (!/^09\d{9}$/.test(generateForm.phone_number)) { setGenerateError('Contact number must be 11 digits starting with 09.'); return; }
    if (!generateLat || !generateLng)      { setGenerateError('Please pin a location on the map.'); return; }
    setGenerateLoading(true);
    try {
      const fd = new FormData();
      fd.append('report_type',  generateForm.report_type);
      fd.append('barangay_id',  generateForm.barangay_id);
      fd.append('address',      generateForm.address);
      fd.append('phone_number', generateForm.phone_number);
      fd.append('description',  generateForm.description);
      fd.append('auto_status',  generateForm.auto_status);
      fd.append('latitude',     generateLat);
      fd.append('longitude',    generateLng);
      await reportsAPI.create(fd);
      setSuccess('Report generated successfully and is now visible on the map.');
      setShowGenerateModal(false);
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setGenerateError(message);
    } finally {
      setGenerateLoading(false);
    }
  };

  const filtered = reports.filter(r => {
  const q = searchTerm.toLowerCase();
  const matchSearch   = !q || (r.reporter_name || '').toLowerCase().includes(q) || (r.report_number || '').toLowerCase().includes(q) || (r.address || '').toLowerCase().includes(q);
  const matchType     = filterType     === 'all' || r.report_type === filterType;
  const matchStatus   = filterStatus   === 'all' || r.status      === filterStatus;
  const matchBarangay = filterBarangay === 'all' || String(r.barangay_id) === filterBarangay;
  const matchSource   = filterSource   === 'all' || (filterSource === 'community' ? !parseInt(r.reported_by_clinic) : parseInt(r.reported_by_clinic));
  const matchArchive  = filterStatus === 'declined' || r.status !== 'declined';
  return matchSearch && matchType && matchStatus && matchBarangay && matchSource && matchArchive;
});

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated  = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const emptyRows  = itemsPerPage - paginated.length;

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const ongoingCount = reports.filter(r => ['ongoing', 'suspected_rabies', 'positive_rabies'].includes(r.status)).length;
  const avgRabies    = getAvgRabiesPerMonth(reports);

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffff', minHeight: '100vh', zoom: '0.75' }}>

        {/* ── Header ── */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
              <i className="fas fa-flag" style={{ fontSize: '1.5rem', color: '#000000', animation: 'float 3s ease-in-out infinite' }} />
              <h2 className="rpt-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: 0 }}>
                Report Management
              </h2>
            </div>
          </Col>
        </Row>

        {/* ── Alerts ── */}
        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger" dismissible onClose={() => setError('')}
                style={{ borderRadius: '12px', border: '2px solid #dc3545', background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}>
                <i className="fas fa-exclamation-triangle me-2" />{error}
              </Alert>
            </Col>
          </Row>
        )}
        {success && (
          <Row className="mb-4">
            <Col>
              <Alert variant="success" dismissible onClose={() => setSuccess('')}
                style={{ borderRadius: '12px', border: '2px solid #28a745', background: 'rgba(40,167,69,0.1)', color: '#28a745' }}>
                <i className="fas fa-check-circle me-2" />{success}
              </Alert>
            </Col>
          </Row>
        )}

        {/* ── Stat Cards ── */}
        <Row className="mb-4 rpt-stat-row" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px' }}>
          {[
            {
              label: 'Pending Reports',
              count: pendingCount,
              img: '/pending.png',
              accent: '#ffc107',
              accentAlpha: 'rgba(255,193,7,0.12)',
              fallbackIcon: 'fa-clock',
              description: 'Awaiting Action',
              delay: '0.1s'
            },
            {
              label: 'Ongoing',
              count: ongoingCount,
              img: '/ongoing.png',
              accent: '#0dcaf0',
              accentAlpha: 'rgba(13,202,240,0.12)',
              fallbackIcon: 'fa-rotate',
              description: 'In Progress',
              delay: '0.2s'
            },
            {
              label: 'Avg Rabies / Month',
              count: avgRabies,
              img: '/average.png',
              accent: '#dc3545',
              accentAlpha: 'rgba(220,53,69,0.12)',
              fallbackIcon: 'fa-chart-line',
              description: 'Rabies Case Average',
              delay: '0.3s'
            }
          ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
            <div key={label} className="rpt-stat-col" style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0, animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
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
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${accentAlpha}`;
                  e.currentTarget.style.borderColor = accent;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = '#f0f0f0';
                }}
              >
                <div style={{ height: '3px', background: accent, borderRadius: '14px 14px 0 0' }} />
                <Card.Body className="rpt-stat-card-body" style={{ padding: '1.5rem', background: 'transparent' }}>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <p className="rpt-stat-label" style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#999999',
                        marginBottom: '0.5rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {label}
                      </p>
                      <h2 className="rpt-stat-number" style={{
                        fontSize: '2.75rem',
                        fontWeight: '700',
                        color: '#111111',
                        lineHeight: 1,
                        marginBottom: '0.75rem'
                      }}>
                        {count}
                      </h2>
                      <div className="rpt-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                        <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>
                          {description}
                        </span>
                      </div>
                    </div>
                    <div className="rpt-stat-icon" style={{
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

        {/* ── Filters ── */}
        <Row className="mb-4 g-2" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
          {/* Search — full width on all screens */}
          <Col xs={12}>
            <InputGroup>
              <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
                <i className="fas fa-search" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search by reporter, report no., address..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ border: '2px solid #e9ecef', borderLeft: 'none', borderRight: searchTerm ? 'none' : '2px solid #e9ecef' }}
              />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}
                  style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}>
                  <i className="fas fa-times" />
                </Button>
              )}
            </InputGroup>
          </Col>
          {/* Filters — 2 per row on mobile, all in one row on desktop */}
          <Col xs={6} md>
            <Form.Select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500' }}>
              <option value="all">All Types</option>
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Form.Select>
          </Col>
          <Col xs={6} md>
            <Form.Select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500' }}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={6} md>
            <Form.Select value={filterBarangay} onChange={e => { setFilterBarangay(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500' }}>
              <option value="all">All Barangays</option>
              {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Form.Select>
          </Col>
          <Col xs={6} md>
            <Form.Select value={filterSource} onChange={e => { setFilterSource(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500' }}>
              <option value="all">All Sources</option>
              <option value="community">Community</option>
              <option value="clinic">Private Clinic</option>
            </Form.Select>
          </Col>
        </Row>

        {/* ── Table Card ── */}
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
          <Col>
            <Card className="border-0" style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <Card.Header className="rpt-card-header" style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #ffc107',
                padding: '1.5rem',
                borderRadius: '20px 20px 0 0'
              }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                    <i className="fas fa-flag me-2" style={{ color: '#ffc107' }} />
                    All Reports ({filtered.length})
                  </h5>
                  <button onClick={handleOpenGenerateModal}
                    style={{ background: '#ffc107', border: 'none', color: '#000', borderRadius: '10px', padding: '0.55rem 1.2rem', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(255,193,7,0.35)', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.background = '#ffb300'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={e  => { e.currentTarget.style.background = '#ffc107'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <i className="fas fa-plus" /> Generate Rabies Report
                  </button>
                </div>
              </Card.Header>

              <Card.Body className="rpt-card-body" style={{ padding: '2rem' }}>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" style={{ color: '#ffc107', width: '3rem', height: '3rem' }} />
                    <p className="mt-3 text-muted">Loading reports...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-flag text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }} />
                    <h5 style={{ color: '#666', fontWeight: '600' }}>No Reports Found</h5>
                    <p className="text-muted">Try adjusting your filters or search term.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="rpt-table" style={{ marginBottom: 0 }}>
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Type</th>
                          <th className="mobile-hide-reporter" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Reporter</th>
                          <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Barangay</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Status</th>
                          <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((report) => {
                          const typeInfo = getReportType(report.report_type);
                          const actions  = getActionButtons(report);
                          return (
                            <tr key={report.id}
                              style={{ transition: 'all 0.2s ease', cursor: 'default' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,193,7,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {/* Type */}
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <ReportTypeImg type={typeInfo} size={20} />
                                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: typeInfo.color }}>{typeInfo.label}</span>
                                </span>
                              </td>

                              {/* Reporter */}
<td className="mobile-hide-reporter" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ fontSize: '0.95rem', color: '#333', display: 'block' }}>{report.reporter_name || 'N/A'}</strong>
  <small className="text-muted" style={{ fontWeight: '500' }}>{report.phone_number || ''}</small>
</td>

                              {/* Barangay */}
                              <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span style={{ fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>
                                  {report.barangay_name || getBarangayName(report.barangay_id)}
                                </span>
                              </td>

                              

                              {/* Status */}
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <StatusBadge status={report.status} />
                              </td>

                              {/* Date */}
                              <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <small style={{ color: '#666', fontSize: '0.85rem' }}>{formatDate(report.created_at)}</small>
                              </td>

                              {/* Actions */}
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === report.id ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === report.id) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 215 });
      setShowDropdown(report.id);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
                            </tr>
                          );
                        })}

                        {/* Empty rows to maintain fixed height */}
                        {Array.from({ length: emptyRows }).map((_, i) => (
                          <tr key={`empty-${i}`} style={{ height: '73px', pointerEvents: 'none' }}>
                            <td colSpan="6" style={{ padding: '1rem', borderBottom: '1px solid #dee2e6', background: 'transparent' }}>
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
        {totalPages > 1 && (
          <Row className="mt-4 rpt-pagination">
            <Col className="d-flex justify-content-between align-items-center">
              <span className="page-info" style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
                Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{totalPages}</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="page-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  style={{ background: currentPage === 1 ? '#e9ecef' : '#fff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === 1 ? '#adb5bd' : '#333', transition: 'all 0.2s' }}
                  onMouseOver={e => { if (currentPage !== 1) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                  onMouseOut={e  => { if (currentPage !== 1) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                >
                  <i className="fas fa-chevron-left" />
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
                    <span key={`ellipsis-${idx}`} style={{ padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: '600' }}>...</span>
                  ) : (
                    <button className="page-btn" key={page} onClick={() => setCurrentPage(page)}
                      style={{ background: currentPage === page ? '#ffc107' : '#fff', border: '2px solid', borderColor: currentPage === page ? '#ffc107' : '#dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '40px', cursor: 'pointer', fontWeight: '700', color: currentPage === page ? '#000' : '#333', boxShadow: currentPage === page ? '0 2px 8px rgba(255,193,7,0.3)' : 'none', transition: 'all 0.2s' }}
                      onMouseOver={e => { if (currentPage !== page) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                      onMouseOut={e  => { if (currentPage !== page) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                    >
                      {page}
                    </button>
                  ));
                })()}

                <button className="page-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  style={{ background: currentPage === totalPages ? '#e9ecef' : '#fff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === totalPages ? '#adb5bd' : '#333', transition: 'all 0.2s' }}
                  onMouseOver={e => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                  onMouseOut={e  => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                >
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </Col>
          </Row>
        )}

        {/* ══════════ VIEW DETAILS MODAL ══════════ */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" className="rpt-view-modal" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg,#f8f9fa,#e9ecef)', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
            <Modal.Title style={{ fontWeight: '700', color: '#333' }}>
              {selectedReport && (
                <span style={{ marginRight: '0.6rem' }}>
                  <ReportTypeImg type={getReportType(selectedReport.report_type)} size={28} />
                </span>
              )}
              Report Details
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem' }}>
            {selectedReport && (
              <Row>
                <Col md={6}>
                  <Card className="border-0 mb-3" style={{ borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                    <Card.Header style={{ background: 'rgba(255,193,7,0.1)', borderBottom: '2px solid rgba(255,193,7,0.3)', borderRadius: '14px 14px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333' }}>
                        <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }} />Report Information
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <Table borderless size="sm">
                        <tbody>
                          {[
                            ['Report No.',  <code style={{ background: '#f8f9fa', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{selectedReport.report_number}</code>],
                            ['Type',        getReportType(selectedReport.report_type).label],
                            ['Status',      <StatusBadge status={selectedReport.status} />],
                            ['Barangay',    selectedReport.barangay_name || getBarangayName(selectedReport.barangay_id)],
                            ['Address',     selectedReport.address || 'N/A'],
                            ['Contact No.', selectedReport.phone_number || 'N/A'],
                            ['Reporter',    selectedReport.reporter_name || 'N/A'],
                            ['Email',       selectedReport.reporter_email || 'N/A'],
                            ['Submitted',   formatDate(selectedReport.created_at)],
                          ].map(([label, val]) => (
                            <tr key={label}>
                              <td style={{ fontWeight: '600', color: '#666', width: '130px', paddingBottom: '0.5rem' }}>{label}:</td>
                              <td style={{ fontWeight: '500', color: '#333' }}>{val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="border-0 mb-3" style={{ borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                    <Card.Header style={{ background: 'rgba(255,193,7,0.1)', borderBottom: '2px solid rgba(255,193,7,0.3)', borderRadius: '14px 14px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333' }}>
                        <i className="fas fa-align-left me-2" style={{ color: '#ffc107' }} />Description
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      {selectedReport.description
                        ? <p style={{ color: '#555', lineHeight: '1.7', marginBottom: 0 }}>{selectedReport.description}</p>
                        : <p className="text-muted text-center py-3 mb-0">No description provided.</p>
                      }
                    </Card.Body>
                  </Card>

                  {selectedReport.admin_notes && (
                    <Card className="border-0 mb-3" style={{ borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                      <Card.Header style={{ background: 'rgba(13,202,240,0.1)', borderBottom: '2px solid rgba(13,202,240,0.3)', borderRadius: '14px 14px 0 0' }}>
                        <h6 className="mb-0" style={{ fontWeight: '700', color: '#333' }}>
                          <i className="fas fa-user-shield me-2" style={{ color: '#0dcaf0' }} />Admin Notes
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <p style={{ color: '#555', lineHeight: '1.7', marginBottom: 0 }}>{selectedReport.admin_notes}</p>
                      </Card.Body>
                    </Card>
                  )}

                  {getActionButtons(selectedReport).length > 0 && (
                    <Card className="border-0" style={{ borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                      <Card.Header style={{ background: 'rgba(255,193,7,0.1)', borderBottom: '2px solid rgba(255,193,7,0.3)', borderRadius: '14px 14px 0 0' }}>
                        <h6 className="mb-0" style={{ fontWeight: '700', color: '#333' }}>
                          <i className="fas fa-bolt me-2" style={{ color: '#ffc107' }} />Quick Actions
                        </h6>
                      </Card.Header>
                      <Card.Body style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {getActionButtons(selectedReport).map(a => (
                          <Button key={a.next} size="sm" variant={a.variant}
                            style={{ fontWeight: '600', borderRadius: '8px', fontSize: '0.82rem' }}
                            onClick={() => { setShowViewModal(false); handleActionClick(selectedReport, a.next); }}>
                            {a.label}
                          </Button>
                        ))}
                      </Card.Body>
                    </Card>
                  )}
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowViewModal(false)}
              style={{ borderRadius: '10px', padding: '0.65rem 1.5rem', fontWeight: '600' }}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ══════════ CONFIRM UPDATE MODAL ══════════ */}
        <Modal show={showUpdateModal} onHide={() => { setShowUpdateModal(false); setActionTarget(null); }} centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <Modal.Title style={{ fontWeight: '700' }}>
              <i className="fas fa-edit me-2" style={{ color: '#ffc107' }} />Confirm Status Update
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem' }}>
            {actionTarget && (
              <>
                <p style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>
                  Update report <strong>{actionTarget.report.report_number}</strong> to:
                </p>
                <div style={{ marginBottom: '1.5rem' }}>
                  <StatusBadge status={actionTarget.next} />
                </div>
                <Form.Group>
                  <Form.Label style={{ fontWeight: '600', color: '#333' }}>
                    Admin Notes <span style={{ fontWeight: '400', color: '#888', fontSize: '0.85rem' }}>(optional)</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea" rows={3}
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Add any notes about this status change..."
                    style={{ borderRadius: '8px', border: '2px solid #dee2e6' }}
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
            <Button variant="secondary"
              onClick={() => { setShowUpdateModal(false); setActionTarget(null); }}
              disabled={updateLoading}
              style={{ borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600' }}>
              Cancel
            </Button>
            <Button onClick={confirmUpdate} disabled={updateLoading} className="border-0"
              style={{ background: '#ffc107', color: '#000', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '700', boxShadow: '0 4px 12px rgba(255,193,7,0.4)' }}>
              {updateLoading
                ? <><Spinner size="sm" animation="border" className="me-2" />Updating...</>
                : <><i className="fas fa-check me-2" />Confirm Update</>
              }
            </Button>
          </Modal.Footer>
        </Modal>

      </Container>

      {/* ══════════ GENERATE REPORT MODAL ══════════ */}
      <Modal show={showGenerateModal} onHide={() => !generateLoading && setShowGenerateModal(false)} size="lg" backdrop="static" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}>
        <Modal.Header closeButton={!generateLoading} style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', color: '#333' }}>
            <i className="fas fa-biohazard me-2" style={{ color: '#ffc107' }} />Generate Rabies Report
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem', maxHeight: '72vh', overflowY: 'auto' }}>
          {generateError && (
            <Alert variant="danger" className="mb-3" style={{ borderRadius: '10px', border: '2px solid rgba(220,53,69,0.3)' }}>
              <i className="fas fa-exclamation-triangle me-2" />{generateError}
            </Alert>
          )}

          {/* Status */}
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>Initial Status <span style={{ color: '#dc3545' }}>*</span></Form.Label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { value: 'suspected_rabies', label: 'Suspected Rabies', img: '/suspected_rabies.png', color: '#f0c800', bg: 'rgba(240,200,0,0.08)' },
                { value: 'positive_rabies',  label: 'Positive Rabies',  img: '/rabies.png',           color: '#dc3545', bg: 'rgba(220,53,69,0.08)' },
              ].map(s => (
                <div key={s.value} onClick={() => setGenerateForm(f => ({ ...f, auto_status: s.value }))}
                  style={{ flex: 1, border: `2px solid ${generateForm.auto_status === s.value ? s.color : '#dee2e6'}`, borderRadius: '12px', padding: '0.85rem', textAlign: 'center', cursor: 'pointer', background: generateForm.auto_status === s.value ? s.bg : '#fff', transition: 'all 0.2s' }}>
                  <div style={{ marginBottom: '0.35rem', display: 'flex', justifyContent: 'center' }}>
                    <img src={s.img} alt={s.label} style={{ width: '36px', height: '36px', objectFit: 'contain', filter: generateForm.auto_status === s.value ? 'none' : 'grayscale(60%) opacity(0.6)' }} onError={e => e.target.style.display='none'} />
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: generateForm.auto_status === s.value ? s.color : '#555' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Form.Group>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>Barangay</Form.Label>
              <Form.Control readOnly value={generateForm.barangay_id ? (barangays.find(b => b.id === parseInt(generateForm.barangay_id))?.name || '') : 'Pin a location to auto-detect'}
                style={{ borderRadius: '8px', border: '2px solid #dee2e6', background: '#f8f9fa', color: generateForm.barangay_id ? '#333' : '#aaa', fontStyle: generateForm.barangay_id ? 'normal' : 'italic', padding: '0.7rem' }} />
            </Col>
            <Col md={6}>
              <Form.Label style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>Contact Number <span style={{ color: '#dc3545' }}>*</span></Form.Label>
              <Form.Control type="text" placeholder="09XXXXXXXXX" value={generateForm.phone_number}
                onChange={e => {
                  const val = e.target.value;
                  setGenerateForm(f => ({ ...f, phone_number: val }));
                  setGeneratePhoneError(val && !/^09\d{9}$/.test(val) ? 'Phone must be 11 digits starting with 09' : '');
                }}
                style={{
                  borderRadius: '8px', padding: '0.7rem',
                  border: generatePhoneError
                    ? '2px solid #ef4444'
                    : (generateForm.phone_number && /^09\d{9}$/.test(generateForm.phone_number))
                      ? '2px solid #10b981'
                      : '2px solid #dee2e6'
                }} />
              {generatePhoneError && (
                <small style={{ color: '#ef4444', display: 'block', marginTop: '0.3rem', fontSize: '0.78rem' }}>
                  <i className="fas fa-times-circle me-1" />{generatePhoneError}
                </small>
              )}
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>Address <span style={{ color: '#dc3545' }}>*</span></Form.Label>
            <Form.Control type="text" placeholder="House no., Street, Purok / Sitio..." value={generateForm.address}
              onChange={e => setGenerateForm(f => ({ ...f, address: e.target.value }))}
              style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.7rem' }} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>Description / Notes</Form.Label>
            <Form.Control as="textarea" rows={2} placeholder="Describe the case..." value={generateForm.description}
              onChange={e => setGenerateForm(f => ({ ...f, description: e.target.value }))}
              style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.7rem', resize: 'none' }} />
          </Form.Group>

          {/* Map */}
          <Form.Group>
            <Form.Label style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>
              <i className="fas fa-map-marker-alt me-2" style={{ color: '#ffc107' }} />Pin Location on Map <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '2px solid #dee2e6' }}>
              {!leafletLoaded && (
                <div style={{ position: 'absolute', inset: 0, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <Spinner animation="border" size="sm" style={{ color: '#ffc107' }} />
                  <span className="ms-2" style={{ fontSize: '0.9rem', color: '#666' }}>Loading map...</span>
                </div>
              )}
              <div ref={generateMapRef} style={{ height: '320px', width: '100%' }} />
            </div>
            <small style={{ color: '#888', fontSize: '0.78rem', marginTop: '0.35rem', display: 'block' }}>
              <i className="fas fa-mouse-pointer me-1" />Click inside Muntinlupa City to pin the exact location
            </small>
            {generateLat && generateLng && (
              <div style={{ marginTop: '0.5rem', padding: '0.45rem 0.75rem', background: 'rgba(25,135,84,0.08)', borderRadius: '8px', border: '1px solid rgba(25,135,84,0.2)', fontSize: '0.82rem', color: '#198754', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span><i className="fas fa-check-circle me-1" />Pinned: {generateLat.toFixed(6)}, {generateLng.toFixed(6)}</span>
                <button onClick={() => { setGenerateLat(null); setGenerateLng(null); if (generateMarkerRef.current && generateMapObj.current) { generateMapObj.current.removeLayer(generateMarkerRef.current); generateMarkerRef.current = null; } }}
                  style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                  <i className="fas fa-times me-1" />Clear
                </button>
              </div>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowGenerateModal(false)} disabled={generateLoading}
            style={{ borderRadius: '8px', fontWeight: '600', padding: '0.65rem 1.5rem' }}>
            Cancel
          </Button>
          <Button onClick={handleGenerateSubmit} disabled={generateLoading}
            style={{ background: '#ffc107', border: 'none', color: '#000', borderRadius: '8px', fontWeight: '700', padding: '0.65rem 1.75rem', boxShadow: '0 4px 14px rgba(255,193,7,0.35)', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = '#ffb300'}
            onMouseOut={e  => e.currentTarget.style.background = '#ffc107'}>
            {generateLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Generating...</>
              : <><i className="fas fa-biohazard me-2" />Generate Report</>}
          </Button>
        </Modal.Footer>
      </Modal>
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
            minWidth: '200px',
            zIndex: 1050,
            overflow: 'hidden',
            zoom: '0.75',
          }}>
            {(() => {
              const report = reports.find(r => r.id === showDropdown);
              if (!report) return null;
              const actions = getActionButtons(report);
              return (
                <>
                  <button
                    onClick={() => { setSelectedReport(report); setShowViewModal(true); setShowDropdown(null); }}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseOut={e  => e.currentTarget.style.background = '#ffffff'}
                  >
                    <img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                    <span>View Details</span>
                  </button>
                  {actions.map(a => (
                    <button key={a.next}
                      onClick={() => { setShowDropdown(null); handleActionClick(report, a.next); }}
                      style={{
                        width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff',
                        textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: '0.75rem', fontSize: '0.9rem', fontWeight: '500',
                        borderTop: '1px solid #f0f0f0', transition: 'background 0.2s',
                        color: a.variant === 'danger' ? '#dc3545' : a.variant === 'success' ? '#198754' : a.variant === 'warning' ? '#856404' : '#055160'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseOut={e  => e.currentTarget.style.background = '#ffffff'}
                    >
                      <i className={`fas ${
                        a.variant === 'danger'  ? 'fa-circle-exclamation' :
                        a.variant === 'success' ? 'fa-check-circle' :
                        a.variant === 'warning' ? 'fa-triangle-exclamation' : 'fa-rotate'
                      }`} style={{ width: '18px', textAlign: 'center' }} />
                      <span>{a.label}</span>
                    </button>
                  ))}
                  {actions.length === 0 && (
                    <div style={{ width: '100%', padding: '0.75rem 1rem', borderTop: '1px solid #f0f0f0', background: '#f0fff5', fontSize: '0.8rem', color: '#0f5132' }}>
                      <i className="fas fa-check-circle me-1" />Already Resolved
                    </div>
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

export default ReportManagement;