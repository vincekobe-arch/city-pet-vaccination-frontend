import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Modal, Form } from 'react-bootstrap';
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

const API_BASE = (window.location.hostname === 'localhost'
  ? 'http://localhost/city-pet-vaccination-api'
  : 'https://city-pet-vaccination-api.onrender.com').replace(/\/+$/, '');
const getImgUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('blob:')) return img;
  return `${API_BASE}/${img.replace(/^\/+/, '')}`;
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

  // silent = true after status updates / new reports: no skeleton, no jump to the top
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
      await loadData(true);
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
      await loadData(true);
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
          <div role="alert" className="mm-alert danger page">
            <i className="fas fa-exclamation-triangle" /><span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss"><i className="fas fa-times" /></button>
          </div>
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
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} dialogClassName="mm-modal lg" className="mm-zoom-modal" scrollable>
          {selectedReport && (() => {
            const r = selectedReport;
            const t = getReportType(r.report_type);
            const st = raStatus(r.status);
            const images = r.images || [];
            const actions = getActionButtons(r);
            const info = [
              { icon: 'fa-map', label: 'Barangay', value: r.barangay_name || getBarangayName(r.barangay_id) },
              { icon: 'fa-phone-alt', label: 'Contact no.', value: r.phone_number || 'N/A' },
              { icon: 'fa-home', label: 'Address', value: r.address || 'N/A', wide: true },
              { icon: 'fa-user', label: 'Reporter', value: r.reporter_name || 'N/A' },
              { icon: 'fa-calendar-plus', label: 'Submitted', value: formatDate(r.created_at) },
            ];
            return (
              <>
                <Modal.Header closeButton className="mm-head" style={{ '--c': t.color }}>
                  <div className="mm-head-main">
                    <div className="mm-head-ic" style={{ background: `color-mix(in srgb, ${t.color} 12%, #fff)` }}>
                      <img src={t.img} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mm-chips">
                        <span className="mm-chip" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 12%, #fff)` }}><i className={`fas ${st.icon}`} />{st.label}</span>
                        {parseInt(r.reported_by_clinic) ? <span className="mm-chip grey"><i className="fas fa-clinic-medical" />Clinic report</span> : null}
                      </div>
                      <Modal.Title as="h5" className="mm-title">{t.label}</Modal.Title>
                      <div className="mm-num">#{r.report_number || `RPT-${String(r.id).padStart(6, '0')}`}</div>
                    </div>
                  </div>
                </Modal.Header>
                <Modal.Body className="mm-body">
                  <Row className="g-4">
                    <Col lg={7}>
                      <div className="mm-section-title"><i className="fas fa-info-circle" />Report information</div>
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

                      <div className="mm-section-title mt-4"><i className="fas fa-align-left" />Description</div>
                      <p className={`mm-desc${r.description ? '' : ' muted'}`}>{r.description || 'No description provided.'}</p>

                      {r.admin_notes && (
                        <div className="mm-admin">
                          <div className="mm-admin-head"><i className="fas fa-user-shield" />Admin notes</div>
                          <p>{r.admin_notes}</p>
                        </div>
                      )}
                    </Col>
                    <Col lg={5}>
                      <div className="mm-section-title"><i className="fas fa-images" />Attached photos {images.length > 0 && <span className="mm-count">{images.length}</span>}</div>
                      {images.length > 0 ? (
                        <div className="mm-photos">
                          {images.map((img, i) => {
                            const src = getImgUrl(img);
                            return (
                              <button key={i} type="button" className="mm-thumb" onClick={() => { setLightboxImg(src); setLightboxZoom(1); }} aria-label={`Open photo ${i + 1}`}>
                                <img src={src} alt={`Report photo ${i + 1}`}
                                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.classList.add('broken'); }} />
                                <span className="mm-thumb-zoom"><i className="fas fa-search-plus" /></span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mm-empty"><i className="fas fa-image" />No photos attached.</div>
                      )}

                      {actions.length > 0 && (
                        <>
                          <div className="mm-section-title mt-4"><i className="fas fa-bolt" />Update status</div>
                          <div className="mm-actions">
                            {actions.map(a => {
                              const ns = raStatus(a.next);
                              return (
                                <button key={a.next} type="button" className="mm-action" style={{ '--c': ns.color }}
                                  onClick={() => { setShowViewModal(false); handleActionClick(r, a.next); }}>
                                  <span className="mm-action-ic"><i className={`fas ${ns.icon}`} /></span>
                                  <span className="flex-grow-1 text-start">{a.label}</span>
                                  <i className="fas fa-chevron-right mm-action-arrow" />
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </Col>
                  </Row>
                </Modal.Body>
                <Modal.Footer className="mm-foot">
                  <button type="button" className="mm-btn primary" onClick={() => setShowViewModal(false)}>Close</button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>

        {/* ══════════ CONFIRM UPDATE MODAL (small, always centered) ══════════ */}
        <Modal show={showUpdateModal} onHide={() => { if (!updateLoading) { setShowUpdateModal(false); setActionTarget(null); } }} centered dialogClassName="mm-small" className="mm-zoom-modal">
          {actionTarget && (() => {
            const ns = raStatus(actionTarget.next);
            const cur = raStatus(actionTarget.report.status);
            const t = getReportType(actionTarget.report.report_type);
            return (
              <>
                <Modal.Body className="mm-small-body">
                  <div className="mm-small-icon" style={{ '--c': ns.color }}><i className={`fas ${ns.icon}`} /></div>
                  <h5 className="mm-small-title">Mark as {ns.label.toLowerCase()}?</h5>
                  <p className="mm-small-text">The reporter will see the new status of this report.</p>
                  <div className="mm-item">
                    <div className="mm-item-av" style={{ background: `color-mix(in srgb, ${t.color} 12%, #fff)` }}>
                      <img src={t.img} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="mm-item-name">{t.label}</div>
                      <div className="mm-item-meta">#{actionTarget.report.report_number}</div>
                    </div>
                  </div>
                  <div className="mm-flow">
                    <span className="mm-chip" style={{ color: cur.color, background: `color-mix(in srgb, ${cur.color} 12%, #fff)` }}>{cur.label}</span>
                    <i className="fas fa-arrow-right" />
                    <span className="mm-chip" style={{ color: ns.color, background: `color-mix(in srgb, ${ns.color} 12%, #fff)` }}>{ns.label}</span>
                  </div>
                  <Form.Group className="text-start">
                    <Form.Label className="mm-label">Admin notes <span className="mm-opt">optional</span></Form.Label>
                    <Form.Control className="mm-input" as="textarea" rows={3} value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)} placeholder="Add any notes about this status change…" />
                  </Form.Group>
                </Modal.Body>
                <Modal.Footer className="mm-foot even">
                  <button type="button" className="mm-btn ghost" onClick={() => { setShowUpdateModal(false); setActionTarget(null); }} disabled={updateLoading}>Cancel</button>
                  <button type="button" className="mm-btn solid" style={{ '--c': ns.color }} onClick={() => { if (!updateLoading) confirmUpdate(); }} disabled={updateLoading}>
                    {updateLoading ? <><i className="fas fa-circle-notch fa-spin" />Updating…</> : <><i className="fas fa-check" />Confirm</>}
                  </button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>

      </Container>

      {/* Photo lightbox (outside the modal so it covers the whole screen) */}
      {lightboxImg && selectedReport && (() => {
        const imgs = (selectedReport.images || []).map(getImgUrl);
        const idx = imgs.indexOf(lightboxImg);
        const go = (d) => { setLightboxImg(imgs[(idx + d + imgs.length) % imgs.length]); setLightboxZoom(1); };
        return (
          <div className="mm-lightbox" onClick={() => { setLightboxImg(null); setLightboxZoom(1); }}
            onWheel={e => setLightboxZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 0.5), 5))}>
            <img src={lightboxImg} alt="Full view" onClick={e => e.stopPropagation()} style={{ transform: `scale(${lightboxZoom})` }} />
            <button type="button" className="mm-lb-btn close" onClick={() => { setLightboxImg(null); setLightboxZoom(1); }} aria-label="Close"><i className="fas fa-times" /></button>
            {imgs.length > 1 && (
              <>
                <button type="button" className="mm-lb-btn prev" onClick={e => { e.stopPropagation(); go(-1); }} aria-label="Previous"><i className="fas fa-chevron-left" /></button>
                <button type="button" className="mm-lb-btn next" onClick={e => { e.stopPropagation(); go(1); }} aria-label="Next"><i className="fas fa-chevron-right" /></button>
                <div className="mm-lb-count">{idx + 1} / {imgs.length}</div>
              </>
            )}
          </div>
        );
      })()}

      {/* ══════════ GENERATE REPORT MODAL ══════════ */}
      <Modal show={showGenerateModal} onHide={() => !generateLoading && setShowGenerateModal(false)} backdrop="static" dialogClassName="mm-modal" className="mm-zoom-modal" scrollable>
        <Modal.Header closeButton={!generateLoading} className="mm-head" style={{ '--c': '#dc3545' }}>
          <div className="mm-head-main">
            <div className="mm-head-ic" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}><i className="fas fa-biohazard" /></div>
            <div style={{ minWidth: 0 }}>
              <div className="mm-kicker" style={{ color: '#dc3545' }}>Admin report</div>
              <Modal.Title as="h5" className="mm-title">Generate rabies report</Modal.Title>
              <div className="mm-sub">It shows on the map as soon as it's created.</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="mm-body">
          {generateError && <div className="mm-alert danger"><i className="fas fa-exclamation-circle" /><span>{generateError}</span></div>}

          <div className="mm-section">
            <div className="mm-section-title"><i className="fas fa-flag" />Initial status <span className="mm-req">*</span></div>
            <div className="mm-types">
              {[
                { value: 'suspected_rabies', label: 'Suspected rabies', img: '/suspected_rabies.png', color: '#dc3545', icon: 'fa-exclamation-triangle' },
                { value: 'positive_rabies',  label: 'Positive rabies',  img: '/rabies.png',           color: '#8b0000', icon: 'fa-biohazard' },
              ].map(s => {
                const on = generateForm.auto_status === s.value;
                return (
                  <button key={s.value} type="button" className={`mm-type${on ? ' on' : ''}`} style={{ '--c': s.color }} aria-pressed={on}
                    onClick={() => setGenerateForm(f => ({ ...f, auto_status: s.value }))} disabled={generateLoading}>
                    {on && <i className="fas fa-check-circle mm-type-check" />}
                    <span className="mm-type-ic">
                      <img src={s.img} alt="" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline'; }} />
                      <i className={`fas ${s.icon}`} style={{ display: 'none' }} />
                    </span>
                    <span className="mm-type-label">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mm-section">
            <div className="mm-section-title"><i className="fas fa-map-marker-alt" />Location</div>
            <Form.Label className="mm-label">Pin the exact location <span className="mm-req">*</span></Form.Label>
            <div className="mm-map">
              {!leafletLoaded && <div className="mm-map-loading skeleton"><i className="fas fa-map-marked-alt me-2" />Loading map…</div>}
              <div ref={generateMapRef} style={{ height: '300px', width: '100%' }} />
            </div>
            {generateLat && generateLng ? (
              <div className="mm-pin ok">
                <i className="fas fa-check-circle" />
                <span>Location pinned <span className="mm-mono">{generateLat.toFixed(5)}, {generateLng.toFixed(5)}</span></span>
                <button type="button" disabled={generateLoading}
                  onClick={() => { setGenerateLat(null); setGenerateLng(null); if (generateMarkerRef.current && generateMapObj.current) { generateMapObj.current.removeLayer(generateMarkerRef.current); generateMarkerRef.current = null; } }}>
                  <i className="fas fa-times" />Clear
                </button>
              </div>
            ) : (
              <div className="mm-pin"><i className="fas fa-hand-pointer" />Click inside Muntinlupa City to drop a pin. The barangay and address fill in automatically.</div>
            )}

            <Row className="g-3 mt-1">
              <Col md={6}>
                <Form.Label className="mm-label">Barangay</Form.Label>
                <div className={`mm-readonly${generateForm.barangay_id ? '' : ' empty'}`}>
                  <i className="fas fa-map" />
                  {generateForm.barangay_id ? (barangays.find(b => b.id === parseInt(generateForm.barangay_id))?.name || '') : 'Detected from the map pin'}
                </div>
              </Col>
              <Col md={6}>
                <Form.Label className="mm-label">Contact number <span className="mm-req">*</span></Form.Label>
                <Form.Control className={`mm-input${generatePhoneError ? ' bad' : (generateForm.phone_number && /^09\d{9}$/.test(generateForm.phone_number)) ? ' good' : ''}`}
                  type="tel" inputMode="numeric" placeholder="09XXXXXXXXX" value={generateForm.phone_number} maxLength={11} disabled={generateLoading}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setGenerateForm(f => ({ ...f, phone_number: val }));
                    setGeneratePhoneError(val && !/^09\d{9}$/.test(val) ? 'Must be 11 digits starting with 09' : '');
                  }} />
                {generatePhoneError && <div className="mm-hint bad"><i className="fas fa-times-circle" />{generatePhoneError}</div>}
              </Col>
              <Col md={12}>
                <Form.Label className="mm-label">Address <span className="mm-req">*</span></Form.Label>
                <Form.Control className="mm-input" type="text" placeholder="House no., street, purok / sitio…" value={generateForm.address} disabled={generateLoading}
                  onChange={e => setGenerateForm(f => ({ ...f, address: e.target.value }))} />
              </Col>
            </Row>
          </div>

          <div className="mm-section mb-0">
            <div className="mm-section-title"><i className="fas fa-user" />Reporter & details</div>
            <Row className="g-3">
              <Col md={12}>
                <Form.Label className="mm-label">Reporter name <span className="mm-req">*</span></Form.Label>
                <Form.Control className="mm-input" type="text" placeholder="Full name of the reporter…" value={generateForm.reporter_name} disabled={generateLoading}
                  onChange={e => setGenerateForm(f => ({ ...f, reporter_name: e.target.value }))} />
              </Col>
              <Col md={12}>
                <Form.Label className="mm-label">Description <span className="mm-opt">optional</span></Form.Label>
                <Form.Control className="mm-input" as="textarea" rows={3} placeholder="Describe the case…" value={generateForm.description} disabled={generateLoading}
                  onChange={e => setGenerateForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'none' }} />
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer className="mm-foot">
          <button type="button" className="mm-btn ghost" onClick={() => setShowGenerateModal(false)} disabled={generateLoading}>Cancel</button>
          <button type="button" className="mm-btn solid" style={{ '--c': '#dc3545' }} onClick={() => { if (!generateLoading) handleGenerateSubmit(); }} disabled={generateLoading}>
            {generateLoading ? <><i className="fas fa-circle-notch fa-spin" />Generating…</> : <><i className="fas fa-biohazard" />Generate report</>}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ReportManagement;