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
const [lightboxImg, setLightboxImg] = useState(null);
const [lightboxZoom, setLightboxZoom] = useState(1);
const statusChartRef  = useRef(null);
const statusChartObj  = useRef(null);
const monthlyChartRef = useRef(null);
const monthlyChartObj = useRef(null);
const [chartJsLoaded, setChartJsLoaded] = useState(!!window.Chart);

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
  const itemsPerPage = 10;

  const styles = `
    .reports-page {
      zoom: 0.75;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    @media (min-width: 1600px) { .reports-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .reports-page { zoom: 1; } }

    @keyframes dropDown {
      0%   { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-10px); }
    }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
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

    /* ---------------- Report Management ---------------- */
    @keyframes raIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes raRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes raMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes raToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes raGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .ra-anim { animation: raIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .ra-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .ra-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .ra-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.86rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .ra-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .ra-btn.primary { background: #ffc107; color: #1f2328; }
    .ra-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }

    .ra-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: raToast 0.35s ease-out; }
    .ra-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ra-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .ra-toast .d { color: #6b7280; font-size: 0.84rem; }
    .ra-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .ra-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .ra-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); overflow: hidden; }
    .ra-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; border-bottom: 1px solid #eef0f3; }
    .ra-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
    .ra-panel-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .ra-panel-sub { font-size: 0.76rem; color: #6b7280; }

    .ra-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem 0.75rem; }
    .ra-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: #1f2328; }
    .ra-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .ra-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f3f4f6; }
    .ra-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #5b6270; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .ra-seg button:hover { color: #1f2328; }
    .ra-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .ra-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0 1.25rem 1rem; border-bottom: 1px solid #eef0f3; }
    .ra-search, .ra-select { position: relative; }
    .ra-search { flex: 1 1 260px; }
    .ra-search > i, .ra-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.78rem; pointer-events: none; }
    .ra-input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .ra-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.ra-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
    .ra-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: #9ca3af; }
    .ra-clear:hover { background: #f3f4f6; color: #1f2328; }
    .ra-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
    .ra-link:hover { text-decoration: underline; }

    .ra-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .ra-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .ra-table td { padding: 0.8rem 0.65rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .ra-table tbody tr { animation: raRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .ra-table tbody tr:hover { background: #fafbfc; }
    .ra-table tbody tr:last-child td { border-bottom: none; }
    .ra-table tbody tr.raised { position: relative; z-index: 5; }
    .ra-strong { font-weight: 600; color: #1f2328; }
    .ra-muted { font-size: 0.78rem; color: #6b7280; }
    .ra-ellipsis { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ra-date { width: 48px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.35rem 0; line-height: 1.1; }
    .ra-date .m { display: block; font-size: 0.62rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .ra-date .d { display: block; font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .ra-type-ic { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .ra-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 130px; }
    .ra-bar > div { height: 100%; border-radius: 3px; transfora-origin: left; animation: raGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
    .ra-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .ra-pill i { font-size: 0.4rem; }

    .ra-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .ra-icon-btn:hover, .ra-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .ra-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1050; animation: raMenu 0.16s ease-out; transfora-origin: top right; text-align: left; }
    .ra-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
    .ra-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .ra-menu-item:hover { background: #f6f7f9; }
    .ra-menu-item.danger, .ra-menu-item.danger i { color: #dc3545; }
    .ra-menu-item.danger:hover { background: #fff5f5; }
    .ra-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }

    .ra-empty { text-align: center; padding: 3rem 1rem; }
    .ra-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .ra-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .ra-empty p { color: #6b7280; font-size: 0.88rem; margin-bottom: 1rem; }
    .ra-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }

    .ra-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid #eef0f3; }
    .ra-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .ra-page:hover:not(:disabled) { background: #f3f4f6; }
    .ra-page.on { background: #ffc107; color: #1f2328; }
    .ra-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .ra-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .ra-btn:focus-visible, .ra-seg button:focus-visible, .ra-icon-btn:focus-visible, .ra-menu-item:focus-visible, .ra-page:focus-visible, .ra-link:focus-visible, .ra-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .ra-title { font-size: 1.45rem; }
      .ra-sub { font-size: 0.85rem; }
      .ra-filters select.ra-input { min-width: 0; width: 100%; }
      .ra-select { flex: 1 1 140px; }
      .ra-ellipsis { max-width: 160px; }
      .ra-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ra-anim, .ra-table tbody tr, .ra-menu, .ra-toast, .ra-bar > div, .ra-skel { animation: none !important; }
    }
    .ra-table { table-layout: fixed; }
    .ra-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.01em; }
    .ra-toolbar { border-bottom: 1px solid #eef0f3; padding-bottom: 1rem; }
    .ra-filters { border-bottom: 1px solid #eef0f3; padding-top: 1rem; }
    .ra-tabs { display: inline-flex; gap: 0.25rem; padding: 4px; border-radius: 12px; background: #f3f4f6; max-width: 100%; overflow-x: auto; }
    .ra-tab { display: inline-flex; align-items: center; gap: 0.45rem; border: none; background: transparent; padding: 0.45rem 0.85rem; border-radius: 9px; font-size: 0.85rem; font-weight: 600; color: #5b6270; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .ra-tab i { font-size: 0.78rem; }
    .ra-tab .count { font-size: 0.72rem; padding: 0.02rem 0.45rem; border-radius: 999px; background: rgba(0,0,0,0.06); color: #6b7280; }
    .ra-tab:hover { color: #1f2328; }
    .ra-tab.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .ra-tab.on .count { background: #1f2328; color: #fff; }
    .ra-tab:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }
    .ra-seg button.inactive.on { color: #dc3545; }
    .ra-chip { display: inline-flex; align-items: center; gap: 0.35rem; max-width: 100%; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .ra-chip i { font-size: 0.68rem; }
    .ra-chip.city { background: rgba(255,193,7,0.14); color: #8a6700; }
    .ra-chip.clinic { background: rgba(25,135,84,0.1); color: #198754; }
    .ra-chip.missed { background: rgba(220,53,69,0.1); color: #dc3545; }
    .ra-chip.archived { background: #f3f4f6; color: #6b7280; }
    .ra-menu-item.success, .ra-menu-item.success i { color: #198754; }
    .ra-menu-item.success:hover { background: #f0fdf4; }
    @media (max-width: 768px) {
      .ra-table { table-layout: auto; }
      .ra-table th { width: auto !important; }
      .ra-toolbar .ra-btn span { display: none; }
    }
    .ra-tab .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .ra-type-ic { width: 38px; height: 38px; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ra-tag { flex-shrink: 0; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.05rem 0.4rem; border-radius: 5px; background: rgba(25,135,84,0.1); color: #198754; }
    .ra-menu { min-width: 230px; }
    .ra-menu-item.warn, .ra-menu-item.warn i { color: #b88a00; }
    .ra-menu-item.warn:hover { background: #fff8e1; }
    .ra-menu-item.info, .ra-menu-item.info i { color: #0a8aa3; }
    .ra-menu-item.info:hover { background: #ecfbfe; }
    .ra-menu-note { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.55rem 0.7rem; margin-top: 0.3rem; border-radius: 8px; background: #fafbfc; color: #6b7280; font-size: 0.78rem; line-height: 1.45; white-space: normal; }
    .ra-menu-note i { margin-top: 2px; }
    .ra-pill i { font-size: 0.68rem; }

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
    if (window.Chart) { setChartJsLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.onload = () => setChartJsLoaded(true);
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
  const closeOnScroll = () => setShowDropdown(null);
  window.addEventListener('scroll', closeOnScroll, true);
  return () => window.removeEventListener('scroll', closeOnScroll, true);
}, [showDropdown]);

  // Status bar chart
  useEffect(() => {
    if (!chartJsLoaded || !statusChartRef.current || loading) return;
    const Chart = window.Chart;
    if (statusChartObj.current) statusChartObj.current.destroy();
    const labels = ['Pending', 'Suspected', 'Positive', 'Ongoing', 'Resolved', 'Declined'];
    const values = [
      reports.filter(r => r.status === 'pending').length,
      reports.filter(r => r.status === 'suspected_rabies').length,
      reports.filter(r => r.status === 'positive_rabies').length,
      reports.filter(r => r.status === 'ongoing').length,
      reports.filter(r => r.status === 'resolved').length,
      reports.filter(r => r.status === 'declined').length,
    ];
    const colors = ['#e0a800','#dc3545','#8b0000','#0aa2c0','#198754','#9ca3af'];
    statusChartObj.current = new Chart(statusChartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderRadius: 8, borderSkipped: false, barThickness: 28 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} reports` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#888', font: { size: 11, weight: '600' } } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#888', font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
        },
      },
    });
    return () => { if (statusChartObj.current) { statusChartObj.current.destroy(); statusChartObj.current = null; } };
  }, [chartJsLoaded, reports, loading]);

  // Monthly trend chart
  useEffect(() => {
    if (!chartJsLoaded || !monthlyChartRef.current || loading) return;
    const Chart = window.Chart;
    if (monthlyChartObj.current) monthlyChartObj.current.destroy();
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) });
    }
    const countByMonth = (statusArr) => months.map(m => reports.filter(r => {
      const d = new Date(r.created_at);
      return `${d.getFullYear()}-${d.getMonth()}` === m.key && statusArr.includes(r.status);
    }).length);
    monthlyChartObj.current = new Chart(monthlyChartRef.current, {
      type: 'line',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          { label: 'Total Reports', data: countByMonth(['pending','suspected_rabies','positive_rabies','ongoing','resolved','declined']), borderColor: '#1f2328', backgroundColor: 'rgba(31,35,40,0.05)', tension: 0.4, pointBackgroundColor: '#1f2328', pointRadius: 5, fill: true, borderWidth: 2.5 },
          { label: 'Rabies Cases',  data: countByMonth(['suspected_rabies','positive_rabies']), borderColor: '#dc3545', backgroundColor: 'rgba(220,53,69,0.06)', tension: 0.4, pointBackgroundColor: '#dc3545', pointRadius: 5, fill: true, borderWidth: 2.5 },
          { label: 'Resolved',      data: countByMonth(['resolved']), borderColor: '#198754', backgroundColor: 'rgba(25,135,84,0.06)', tension: 0.4, pointBackgroundColor: '#198754', pointRadius: 5, fill: true, borderWidth: 2.5 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', color: '#555', font: { size: 11, weight: '600' }, padding: 18 } },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#888', font: { size: 11 } } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#888', font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
      },
    });
    return () => { if (monthlyChartObj.current) { monthlyChartObj.current.destroy(); monthlyChartObj.current = null; } };
  }, [chartJsLoaded, reports, loading]);

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
    if (!actionTarget || updateLoading) return;
    setUpdateLoading(true);
    setShowUpdateModal(false);
    try {
      await reportsAPI.update(actionTarget.report.id, { status: actionTarget.next, admin_notes: adminNotes });
      const label = STATUS_CONFIG[actionTarget.next]?.label || actionTarget.next;
      setSuccess(`Report marked as "${label}" successfully.`);
      setActionTarget(null);
      await loadData();
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
      setShowUpdateModal(true);
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
    setGenerateForm({ report_type: 'rabies_case', barangay_id: '', address: '', phone_number: '', reporter_name: '', description: '', auto_status: 'suspected_rabies' });
    setGenerateLat(null); setGenerateLng(null);
    setGenerateError('');
    setGeneratePhoneError('');
    setShowGenerateModal(true);
  };

  const handleGenerateSubmit = async () => {
    if (generateLoading) return;
    if (!generateForm.barangay_id)         { setGenerateError('Please select a barangay by pinning a location on the map.'); return; }
    if (!generateForm.address.trim())      { setGenerateError('Address is required.');        return; }
    if (!generateForm.reporter_name?.trim()) { setGenerateError('Reporter name is required.'); return; }
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
      fd.append('reporter_name', generateForm.reporter_name);
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
const matchStatus   = filterStatus === 'all' ||
  (filterStatus === 'ongoing'
    ? ['ongoing', 'suspected_rabies', 'positive_rabies'].includes(r.status)
    : r.status === filterStatus);
const matchBarangay = filterBarangay === 'all' || String(r.barangay_id) === filterBarangay;
const matchSource   = filterSource   === 'all' || (filterSource === 'community' ? !parseInt(r.reported_by_clinic) : parseInt(r.reported_by_clinic));
const matchArchive = true;
  return matchSearch && matchType && matchStatus && matchBarangay && matchSource && matchArchive;
});

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated  = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const ongoingCount = reports.filter(r => ['ongoing', 'suspected_rabies', 'positive_rabies'].includes(r.status)).length;
  const avgRabies    = getAvgRabiesPerMonth(reports);

  const RA_STATUS = {
    pending:          { label: 'Pending',          color: '#b88a00', icon: 'fa-clock' },
    suspected_rabies: { label: 'Suspected Rabies', color: '#dc3545', icon: 'fa-exclamation-triangle' },
    positive_rabies:  { label: 'Positive Rabies',  color: '#8b0000', icon: 'fa-biohazard' },
    ongoing:          { label: 'Ongoing',          color: '#0a8aa3', icon: 'fa-spinner' },
    resolved:         { label: 'Resolved',         color: '#198754', icon: 'fa-check-circle' },
    declined:         { label: 'Declined',         color: '#6b7280', icon: 'fa-ban' },
  };
  const raStatus = (s) => RA_STATUS[s] || { label: s || 'Unknown', color: '#6b7280', icon: 'fa-question-circle' };
  const ACTION_STYLE = {
    danger:    { cls: 'danger',  icon: 'fa-biohazard' },
    warning:   { cls: 'warn',    icon: 'fa-exclamation-triangle' },
    success:   { cls: 'success', icon: 'fa-check-circle' },
    info:      { cls: 'info',    icon: 'fa-spinner' },
    secondary: { cls: '',        icon: 'fa-ban' },
  };
  const hasReportFilters = searchTerm || filterType !== 'all' || filterBarangay !== 'all' || filterSource !== 'all';
  const statusCounts = {
    all: reports.length,
    pending: pendingCount,
    ongoing: ongoingCount,
    resolved: reports.filter(r => r.status === 'resolved').length,
    declined: reports.filter(r => r.status === 'declined').length,
  };
  const raPagerNumbers = (() => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 reports-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* Header */}
        <div className="mb-4 ra-anim">
          <h2 className="ra-title rpt-title">Report Management</h2>
          <p className="ra-sub">Review community and clinic reports of rabies cases, animal bites and rescues.</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2" />{error}
          </Alert>
        )}
        {success && (
          <div className="ra-toast" role="status">
            <div className="ic"><i className="fas fa-check" /></div>
            <div className="flex-grow-1">
              <div className="t">Success</div>
              <div className="d">{success}</div>
            </div>
            <button type="button" className="ra-toast-close" onClick={() => setSuccess('')} aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* Charts */}
        <Row className="mb-4 g-3">
          <Col md={5}>
            <div className="ra-panel h-100 ra-anim" style={{ '--d': '0.06s' }}>
              <div className="ra-panel-head">
                <div className="ra-head-ic" style={{ '--c': '#e0a800' }}><i className="fas fa-chart-bar" /></div>
                <div>
                  <div className="ra-panel-title">Reports by status</div>
                  <div className="ra-panel-sub">All reports in the system</div>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1.1rem 1rem', height: '210px' }}>
                {loading ? <div className="ra-skel" style={{ height: '100%' }} /> : <canvas ref={statusChartRef} />}
              </div>
            </div>
          </Col>
          <Col md={7}>
            <div className="ra-panel h-100 ra-anim" style={{ '--d': '0.12s' }}>
              <div className="ra-panel-head">
                <div className="ra-head-ic" style={{ '--c': '#dc3545' }}><i className="fas fa-chart-line" /></div>
                <div>
                  <div className="ra-panel-title">Monthly report trend</div>
                  <div className="ra-panel-sub">Last 6 months</div>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1.1rem 1rem', height: '210px' }}>
                {loading ? <div className="ra-skel" style={{ height: '100%' }} /> : <canvas ref={monthlyChartRef} />}
              </div>
            </div>
          </Col>
        </Row>

        {/* Reports table */}
        <div className="ra-panel ra-anim" style={{ '--d': '0.18s', overflow: 'visible' }}>
          {/* Header */}
          <div className="ra-toolbar">
            <div className="ra-tabs" role="tablist">
              {[['all', 'All'], ['pending', 'Pending'], ['ongoing', 'Ongoing'], ['resolved', 'Resolved'], ['declined', 'Declined']].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === v}
                  className={`ra-tab${filterStatus === v ? ' on' : ''}`}
                  onClick={() => { setFilterStatus(v); setCurrentPage(1); setShowDropdown(null); }}
                >
                  {v !== 'all' && <i className="dot" style={{ background: raStatus(v).color }} />}
                  {l}
                  <span className="count">{statusCounts[v]}</span>
                </button>
              ))}
            </div>
            <button type="button" className="ra-btn primary" onClick={handleOpenGenerateModal}>
              <i className="fas fa-plus" /><span>Generate rabies report</span>
            </button>
          </div>

          {/* Filters */}
          <div className="ra-filters rpt-filters-row">
            <div className="ra-search">
              <i className="fas fa-search" />
              <input
                className="ra-input"
                placeholder="Search by reporter, report no., address..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                aria-label="Search reports"
              />
              {searchTerm && (
                <button type="button" className="ra-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <div className="ra-select">
              <i className="fas fa-tag" />
              <select className="ra-input" value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} aria-label="Report type">
                <option value="all">All types</option>
                {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ra-select">
              <i className="fas fa-map-marker-alt" />
              <select className="ra-input" value={filterBarangay} onChange={e => { setFilterBarangay(e.target.value); setCurrentPage(1); }} aria-label="Barangay">
                <option value="all">All barangays</option>
                {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="ra-select">
              <i className="fas fa-user" />
              <select className="ra-input" value={filterSource} onChange={e => { setFilterSource(e.target.value); setCurrentPage(1); }} aria-label="Reported by">
                <option value="all">All sources</option>
                <option value="community">Community</option>
                <option value="clinic">Private clinic</option>
              </select>
            </div>
            {hasReportFilters && (
              <button type="button" className="ra-link" onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterBarangay('all'); setFilterSource('all'); setCurrentPage(1); }}>
                <i className="fas fa-undo me-1" />Clear filters
              </button>
            )}
          </div>

          {/* Body */}
          <div className="rpt-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
            {loading ? (
              <div style={{ padding: '0.5rem 0 1rem' }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.12 }}>
                    <div className="ra-skel" style={{ width: 40, height: 40, borderRadius: 10 }} />
                    <div className="flex-grow-1">
                      <div className="ra-skel mb-2" style={{ width: '30%', height: 13 }} />
                      <div className="ra-skel" style={{ width: '18%', height: 10 }} />
                    </div>
                    <div className="ra-skel" style={{ width: 120, height: 22, borderRadius: 999 }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="ra-empty">
                <div className="ic"><i className="fas fa-flag" /></div>
                <h6>No reports found</h6>
                <p>{hasReportFilters || filterStatus !== 'all' ? 'Try changing or clearing the filters.' : 'Reports from the community and clinics will show here.'}</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflow: 'visible' }}>
                <table className="ra-table rpt-table">
                  <thead>
                    <tr>
                      <th style={{ width: '26%' }}>Report</th>
                      <th className="mobile-hide-reporter" style={{ width: '19%' }}>Reporter</th>
                      <th className="mobile-hide" style={{ width: '20%' }}>Location</th>
                      <th style={{ width: '16%' }}>Status</th>
                      <th className="mobile-hide" style={{ width: '13%' }}>Submitted</th>
                      <th style={{ width: '6%' }} aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((report, i) => {
                      const typeInfo = getReportType(report.report_type);
                      const st = raStatus(report.status);
                      const actions = getActionButtons(report);
                      const fromClinic = !!parseInt(report.reported_by_clinic);
                      const menuOpen = showDropdown === report.id;
                      return (
                        <tr key={report.id} className={menuOpen ? 'raised' : ''} style={{ animationDelay: `${i * 0.04}s` }}>
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <div className="ra-type-ic" style={{ '--c': typeInfo.color }}>
                                <ReportTypeImg type={typeInfo} size={22} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="ra-strong ra-ellipsis" style={{ color: typeInfo.color }}>{typeInfo.label}</div>
                                <div className="ra-muted ra-mono ra-ellipsis">{report.report_number || `RPT-${String(report.id).padStart(6, '0')}`}</div>
                              </div>
                            </div>
                          </td>
                          <td className="mobile-hide-reporter">
                            <div className="d-flex align-items-center gap-1" style={{ minWidth: 0 }}>
                              <span className="ra-strong ra-ellipsis" title={report.reporter_name}>{report.reporter_name || 'N/A'}</span>
                              {fromClinic && <span className="ra-tag">Clinic</span>}
                            </div>
                            <div className="ra-muted">{report.phone_number || ''}</div>
                          </td>
                          <td className="mobile-hide">
                            <div className="ra-strong" style={{ fontSize: '0.85rem' }}>{report.barangay_name || getBarangayName(report.barangay_id)}</div>
                            <div className="ra-muted ra-ellipsis" title={report.address}>{report.address || '—'}</div>
                          </td>
                          <td>
                            <span className="ra-pill" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 12%, #fff)` }}>
                              <i className={`fas ${st.icon}`} />{st.label}
                            </span>
                          </td>
                          <td className="mobile-hide">
                            <div style={{ fontSize: '0.85rem' }}>{formatDate(report.created_at)}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                type="button"
                                className={`ra-icon-btn${menuOpen ? ' on' : ''}`}
                                onClick={() => setShowDropdown(menuOpen ? null : report.id)}
                                aria-label="Report options"
                                aria-expanded={menuOpen}
                              >
                                <i className="fas fa-ellipsis-v" />
                              </button>
                              {menuOpen && (
                                <>
                                  <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
                                  <div className="ra-menu" role="menu">
                                    <button type="button" role="menuitem" className="ra-menu-item" onClick={() => { setSelectedReport(report); setShowViewModal(true); setShowDropdown(null); }}>
                                      <i className="fas fa-eye" />View details
                                    </button>
                                    {actions.length > 0 && <div className="ra-menu-sep" />}
                                    {actions.map(a => {
                                      const s = ACTION_STYLE[a.variant] || ACTION_STYLE.secondary;
                                      return (
                                        <button key={a.next} type="button" role="menuitem" className={`ra-menu-item ${s.cls}`} onClick={() => { setShowDropdown(null); handleActionClick(report, a.next); }}>
                                          <i className={`fas ${s.icon}`} />{a.label}
                                        </button>
                                      );
                                    })}
                                    {actions.length === 0 && (
                                      <div className="ra-menu-note">
                                        <i className={`fas ${st.icon}`} style={{ color: st.color }} />
                                        This report is {st.label.toLowerCase()}. No further action needed.
                                      </div>
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
          {totalPages > 1 && (
            <div className="ra-foot rpt-pagination">
              <span className="ra-muted page-info" style={{ fontSize: '0.84rem' }}>
                Showing <strong style={{ color: '#1f2328' }}>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> of {filtered.length}
              </span>
              <div className="d-flex align-items-center gap-1">
                <button type="button" className="ra-page nav page-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                  <i className="fas fa-chevron-left" />
                </button>
                {raPagerNumbers.map(n => (
                  <button key={n} type="button" className={`ra-page page-btn${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
                ))}
                <button type="button" className="ra-page nav page-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>

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
      {lightboxImg && (
  <div
    onClick={() => setLightboxImg(null)}
    onWheel={e => {
      e.preventDefault();
      setLightboxZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 0.5), 5));
    }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zoom: `${1 / 0.75}`, cursor: 'zoom-in' }}
  >
    <img
      src={lightboxImg}
      alt="Full view"
      style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', transform: `scale(${lightboxZoom})`, transformOrigin: 'center center', transition: 'transform 0.1s ease' }}
      onClick={e => e.stopPropagation()}
    />
          <button
            onClick={() => setLightboxImg(null)}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '1.2rem', backdropFilter: 'blur(4px)' }}
          >
            <i className="fas fa-times" />
          </button>
          {selectedReport.images.length > 1 && (() => {
            const currentIdx = selectedReport.images.findIndex(img => getImgUrl(img) === lightboxImg);
            const prev = selectedReport.images[(currentIdx - 1 + selectedReport.images.length) % selectedReport.images.length];
            const next = selectedReport.images[(currentIdx + 1) % selectedReport.images.length];
            return (
              <>
                <button onClick={e => { e.stopPropagation(); setLightboxImg(getImgUrl(prev)); }}
                  style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '1rem', backdropFilter: 'blur(4px)' }}>
                  <i className="fas fa-chevron-left" />
                </button>
                <button onClick={e => { e.stopPropagation(); setLightboxImg(getImgUrl(next)); }}
                  style={{ position: 'absolute', right: '4rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '1rem', backdropFilter: 'blur(4px)' }}>
                  <i className="fas fa-chevron-right" />
                </button>
                <div style={{ position: 'absolute', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: '600' }}>
                  {currentIdx + 1} / {selectedReport.images.length}
                </div>
              </>
            );
          })()}
        </div>
      )}
      <Card className="border-0 mb-3" style={{ borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
        <Card.Header style={{ background: 'rgba(255,193,7,0.1)', borderBottom: '2px solid rgba(255,193,7,0.3)', borderRadius: '14px 14px 0 0' }}>
          <h6 className="mb-0" style={{ fontWeight: '700', color: '#333' }}>
            <i className="fas fa-images me-2" style={{ color: '#ffc107' }} />Attached Photos ({selectedReport.images.length})
          </h6>
        </Card.Header>
        <Card.Body>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {selectedReport.images.map((img, i) => {
              const src = getImgUrl(img);
              return (
                <div
                  key={i}
                  onClick={() => setLightboxImg(src)}
                  style={{ position: 'relative', cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', width: '85px', height: '85px', border: '2px solid #dee2e6', transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#ffc107'; e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <img
                    src={src}
                    alt={`report-img-${i}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.background = '#f8f9fa';
                      e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px"><i class="fas fa-image" style="color:#ccc;font-size:1.4rem"></i><small style="color:#aaa;font-size:0.6rem">No preview</small></div>';
                    }}
                  />
                  <div
                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                    onMouseOut={e  => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                  >
                    <i className="fas fa-search-plus" style={{ color: 'rgba(255,255,255,0)', fontSize: '1.2rem', transition: 'color 0.2s', pointerEvents: 'none' }} />
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
            <Button onClick={() => { if (!updateLoading) confirmUpdate(); }} disabled={updateLoading} className="border-0"
              style={{ background: updateLoading ? '#6c757d' : '#ffc107', color: updateLoading ? '#fff' : '#000', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '700', boxShadow: '0 4px 12px rgba(255,193,7,0.4)', transition: 'all 0.2s' }}>
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
  maxLength={11}
  onChange={e => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
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
  <Form.Label style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>Reporter Name <span style={{ color: '#dc3545' }}>*</span></Form.Label>
  <Form.Control type="text" placeholder="Full name of the reporter..." value={generateForm.reporter_name}
    onChange={e => setGenerateForm(f => ({ ...f, reporter_name: e.target.value }))}
    style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.7rem' }} />
</Form.Group>

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
          <Button onClick={() => { if (!generateLoading) handleGenerateSubmit(); }} disabled={generateLoading}
            style={{ background: '#ffc107', border: 'none', color: '#000', borderRadius: '8px', fontWeight: '700', padding: '0.65rem 1.75rem', boxShadow: '0 4px 14px rgba(255,193,7,0.35)', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = '#ffb300'}
            onMouseOut={e  => e.currentTarget.style.background = '#ffc107'}>
            {generateLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Generating...</>
              : <><i className="fas fa-biohazard me-2" />Generate Report</>}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ReportManagement;