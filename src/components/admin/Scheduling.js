import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table, InputGroup } from 'react-bootstrap';
import api, { scheduleAPI, barangayAPI, vaccinationAPI, dewormingAPI, inventoryAPI, handleAPIError } from '../../services/api';
import { getUser } from '../../utils/auth';

const Schedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [vaccinationTypes, setVaccinationTypes] = useState([]);
  const [vaccinationInventory, setVaccinationInventory] = useState([]);
  const [loading, setLoading] = useState(true);
const [pageLoading, setPageLoading] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
const [totalSchedules, setTotalSchedules] = useState(0);
const [schedulePageCache, setSchedulePageCache] = useState({});
const [allSchedules, setAllSchedules] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [vaccineRegistrationCounts, setVaccineRegistrationCounts] = useState({});
  const [loadingVaccineCounts, setLoadingVaccineCounts] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [batchAllocations, setBatchAllocations] = useState({});
  const [scheduleAllocations, setScheduleAllocations] = useState({});
  const [loadingBatchAvailability, setLoadingBatchAvailability] = useState(false);


const [showConfirmScheduleModal, setShowConfirmScheduleModal] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [filterType, setFilterType] = useState('all');
  const [filterBarangay, setFilterBarangay] = useState('all');
const [filterStatus, setFilterStatus] = useState('upcoming');
  const [filterVaccineSpecies, setFilterVaccineSpecies] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [registrationsData, setRegistrationsData] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [registrationsSearchTerm, setRegistrationsSearchTerm] = useState('');
  const [expandedOwners, setExpandedOwners] = useState({});

  const [showDropdown, setShowDropdown] = useState(null);
  

const schedTypeChartRef    = useRef(null);
const schedTypeChartObj    = useRef(null);
const schedMonthlyChartRef = useRef(null);
const schedMonthlyChartObj = useRef(null);
const [chartJsLoaded, setChartJsLoaded] = useState(!!window.Chart);

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 5;
  
  const [formData, setFormData] = useState({
    schedule_type: '',
    barangay_id: '',
    title: '',
    description: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    venue: '',
    max_capacity: '',
    speaker: '',
    vaccination_types: {},
    deworming_types: {},
    pet_types_allowed: [],
    sterilization_species: [],
    other_pet_types: [],
    other_event_type: '',
    status: 'scheduled'
  });

  const user = getUser();
  
  const styles = `
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
    .schedule-page {
      zoom: 0.75;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    @media (min-width: 1600px) { .schedule-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .schedule-page { zoom: 1; } }

    @keyframes dropDown {
      0% {
        opacity: 0;
        transform: translateY(-30px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @media (max-width: 768px) {
      .sched-title { font-size: 1.5rem !important; }
      .sched-stat-row { flex-wrap: nowrap !important; }
      .sched-stat-col { flex: 1 1 0 !important; min-width: 0 !important; }
      .sched-stat-number { font-size: 1.1rem !important; margin-bottom: 0.25rem !important; }
      .sched-stat-label { font-size: 0.55rem !important; margin-bottom: 0.15rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      .sched-stat-card-body { padding: 0.6rem 0.5rem !important; }
      .sched-stat-icon { width: 32px !important; height: 32px !important; border-radius: 8px !important; flex-shrink: 0 !important; }
      .sched-stat-icon img { width: 18px !important; height: 18px !important; }
      .sched-filters-row > div { margin-bottom: 0.5rem; }
      .sched-card-header { padding: 0.75rem 1rem !important; }
      .sched-card-header h5 { font-size: 0.85rem !important; }
      .sched-add-btn { padding: 0.4rem 0.75rem !important; font-size: 0.8rem !important; }
      .sched-card-body { padding: 1rem !important; }
      .sched-table th, .sched-table td { font-size: 0.7rem !important; padding: 0.5rem 0.3rem !important; }
      .sched-table .mobile-hide { display: none !important; }
.sched-table .mobile-hide-datetime { display: none !important; }
      .sched-pagination { font-size: 0.75rem !important; }
      .sched-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .sched-pagination .page-info { font-size: 0.75rem !important; }
      .sched-view-modal .modal-body { padding: 1rem !important; }
      .sched-view-modal .modal-body strong { font-size: 0.78rem !important; }
      .sched-view-modal .modal-body p { font-size: 0.85rem !important; margin-bottom: 0.4rem !important; }
    }

    /* ---------------- Event Management ---------------- */
    @keyframes emIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes emRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes emMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes emToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes emGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .em-anim { animation: emIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .em-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .em-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .em-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.86rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .em-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .em-btn.primary { background: #ffc107; color: #1f2328; }
    .em-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }

    .em-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: emToast 0.35s ease-out; }
    .em-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .em-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .em-toast .d { color: #6b7280; font-size: 0.84rem; }
    .em-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .em-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .em-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); overflow: hidden; }
    .em-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; border-bottom: 1px solid #eef0f3; }
    .em-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
    .em-panel-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .em-panel-sub { font-size: 0.76rem; color: #6b7280; }

    .em-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem 0.75rem; }
    .em-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: #1f2328; }
    .em-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .em-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f3f4f6; }
    .em-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #5b6270; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .em-seg button:hover { color: #1f2328; }
    .em-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .em-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0 1.25rem 1rem; border-bottom: 1px solid #eef0f3; }
    .em-search, .em-select { position: relative; }
    .em-search { flex: 1 1 260px; }
    .em-search > i, .em-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.78rem; pointer-events: none; }
    .em-input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .em-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.em-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
    .em-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: #9ca3af; }
    .em-clear:hover { background: #f3f4f6; color: #1f2328; }
    .em-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
    .em-link:hover { text-decoration: underline; }

    .em-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .em-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .em-table td { padding: 0.8rem 0.65rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .em-table tbody tr { animation: emRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .em-table tbody tr:hover { background: #fafbfc; }
    .em-table tbody tr:last-child td { border-bottom: none; }
    .em-table tbody tr.raised { position: relative; z-index: 5; }
    .em-strong { font-weight: 600; color: #1f2328; }
    .em-muted { font-size: 0.78rem; color: #6b7280; }
    .em-ellipsis { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .em-date { width: 48px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.35rem 0; line-height: 1.1; }
    .em-date .m { display: block; font-size: 0.62rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .em-date .d { display: block; font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .em-type-ic { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .em-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 130px; }
    .em-bar > div { height: 100%; border-radius: 3px; transform-origin: left; animation: emGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
    .em-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .em-pill i { font-size: 0.4rem; }

    .em-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .em-icon-btn:hover, .em-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .em-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1050; animation: emMenu 0.16s ease-out; transform-origin: top right; text-align: left; }
    .em-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
    .em-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .em-menu-item:hover { background: #f6f7f9; }
    .em-menu-item.danger, .em-menu-item.danger i { color: #dc3545; }
    .em-menu-item.danger:hover { background: #fff5f5; }
    .em-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }

    .em-empty { text-align: center; padding: 3rem 1rem; }
    .em-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .em-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .em-empty p { color: #6b7280; font-size: 0.88rem; margin-bottom: 1rem; }
    .em-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }

    .em-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid #eef0f3; }
    .em-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .em-page:hover:not(:disabled) { background: #f3f4f6; }
    .em-page.on { background: #ffc107; color: #1f2328; }
    .em-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .em-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .em-btn:focus-visible, .em-seg button:focus-visible, .em-icon-btn:focus-visible, .em-menu-item:focus-visible, .em-page:focus-visible, .em-link:focus-visible, .em-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .em-title { font-size: 1.45rem; }
      .em-sub { font-size: 0.85rem; }
      .em-filters select.em-input { min-width: 0; width: 100%; }
      .em-select { flex: 1 1 140px; }
      .em-ellipsis { max-width: 160px; }
      .em-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .em-anim, .em-table tbody tr, .em-menu, .em-toast, .em-bar > div, .em-skel { animation: none !important; }
    }
  `;
  
  useEffect(() => {
    console.log('Current user:', user);
    console.log('Assigned barangay ID:', user?.assigned_barangay_id);
  }, []);

  useEffect(() => {
    loadBarangays();
    loadVaccinationTypes();
    loadInventory();
  }, []);

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    setSchedulePageCache({});
    if (currentPage === 1) {
      loadPage(1, true);
    } else {
      setCurrentPage(1);
    }
  }, [filterType, filterBarangay, filterStatus, searchTerm]);

  useEffect(() => {
  if (window.Chart) { setChartJsLoaded(true); return; }
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  script.onload = () => setChartJsLoaded(true);
  document.head.appendChild(script);
}, []);

useEffect(() => {
  if (!chartJsLoaded || !schedTypeChartRef.current || loading) return;
  const Chart = window.Chart;
  if (schedTypeChartObj.current) schedTypeChartObj.current.destroy();

  const labels = ['Vaccination', 'Seminar', 'Sterilization', 'Microchip', 'Other'];
  const values = [
    allSchedules.filter(s => s.type === 'vaccination').length,
    allSchedules.filter(s => s.type === 'seminar').length,
    allSchedules.filter(s => s.type === 'sterilization').length,
    allSchedules.filter(s => s.type === 'microchip').length,
    allSchedules.filter(s => s.type === 'other').length,
  ];
  const colors = ['#e0a800', '#0aa2c0', '#198754', '#d63384', '#6f42c1'];

  schedTypeChartObj.current = new Chart(schedTypeChartRef.current, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 8, borderSkipped: false, barThickness: 28 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} events` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888', font: { size: 11, weight: '600' } } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#888', font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
      },
    },
  });

  return () => { if (schedTypeChartObj.current) { schedTypeChartObj.current.destroy(); schedTypeChartObj.current = null; } };
}, [chartJsLoaded, allSchedules, loading]);

useEffect(() => {
  if (!chartJsLoaded || !schedMonthlyChartRef.current || loading) return;
  const Chart = window.Chart;
  if (schedMonthlyChartObj.current) schedMonthlyChartObj.current.destroy();

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) });
  }

  const countByMonth = (types) => months.map(m =>
    allSchedules.filter(s => {
      const d = new Date(s.scheduled_date);
      return `${d.getFullYear()}-${d.getMonth()}` === m.key && (types === 'all' || types.includes(s.type));
    }).length
  );

  schedMonthlyChartObj.current = new Chart(schedMonthlyChartRef.current, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'All Events',   data: countByMonth('all'),                     borderColor: '#1f2328', backgroundColor: 'rgba(31,35,40,0.05)',  tension: 0.4, pointBackgroundColor: '#1f2328', pointRadius: 5, fill: true, borderWidth: 2.5 },
        { label: 'Vaccination',  data: countByMonth(['vaccination']),            borderColor: '#e0a800', backgroundColor: 'rgba(224,168,0,0.08)',    tension: 0.4, pointBackgroundColor: '#e0a800', pointRadius: 5, fill: true, borderWidth: 2.5 },
        { label: 'Sterilization',data: countByMonth(['sterilization']),          borderColor: '#198754', backgroundColor: 'rgba(25,135,84,0.06)',  tension: 0.4, pointBackgroundColor: '#198754', pointRadius: 5, fill: true, borderWidth: 2.5 },
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

  return () => { if (schedMonthlyChartObj.current) { schedMonthlyChartObj.current.destroy(); schedMonthlyChartObj.current = null; } };
}, [chartJsLoaded, allSchedules, loading]);

  useEffect(() => {
  if (allSchedules.length === 0) return;

  // Destroy previous charts if re-rendering
  const typeCtx = document.getElementById('schedTypeChart');
  const statusCtx = document.getElementById('schedStatusChart');
  if (!typeCtx || !statusCtx) return;

  // Clear existing Chart.js instances
  const existingType = window._schedTypeChart;
  const existingStatus = window._schedStatusChart;
  if (existingType) existingType.destroy();
  if (existingStatus) existingStatus.destroy();

  // ── Bar chart: Events by Type ──
  const typeData = {
    Vaccination: allSchedules.filter(s => s.type === 'vaccination').length,
    Seminar: allSchedules.filter(s => s.type === 'seminar').length,
    Sterilization: allSchedules.filter(s => s.type === 'sterilization').length,
    Microchip: allSchedules.filter(s => s.type === 'microchip').length,
    Other: allSchedules.filter(s => s.type === 'other').length,
  };

  // Load Chart.js dynamically if not already loaded
  const renderCharts = () => {
    window._schedTypeChart = new window.Chart(typeCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(typeData),
        datasets: [{
          label: 'Events',
          data: Object.values(typeData),
          backgroundColor: ['#ffc107cc', '#6f42c1cc', '#28a745cc', '#6c757dcc', '#343a40cc'],
          borderColor: ['#ffc107', '#6f42c1', '#28a745', '#6c757d', '#343a40'],
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#333',
            bodyColor: '#555',
            borderColor: '#e0e0e0',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#999', font: { size: 11, weight: '600' } },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f0f0f0', lineWidth: 1 },
            ticks: {
              color: '#bbb',
              font: { size: 10 },
              stepSize: 1,
              precision: 0,
            },
            border: { display: false }
          }
        }
      }
    });

    // ── Doughnut: Status Breakdown ──
    const upcoming = allSchedules.filter(s => s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date()).length;
    const ongoing = allSchedules.filter(s => s.status === 'ongoing').length;
    const completed = allSchedules.filter(s => s.status === 'completed').length;
    const cancelled = allSchedules.filter(s => s.status === 'cancelled').length;
    const pastDue = allSchedules.filter(s => s.status === 'scheduled' && new Date(s.scheduled_date) < new Date()).length;

    const statusLabels = ['Upcoming', 'Ongoing', 'Completed', 'Past Due', 'Cancelled'];
    const statusData = [upcoming, ongoing, completed, pastDue, cancelled];
    const statusColors = ['#007bff', '#28a745', '#6c757d', '#ffc107', '#dc3545'];

    window._schedStatusChart = new window.Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{
          data: statusData,
          backgroundColor: statusColors.map(c => c + 'cc'),
          borderColor: statusColors,
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              color: '#666',
              font: { size: 10, weight: '600' },
              boxWidth: 10,
              boxHeight: 10,
              borderRadius: 2,
              padding: 8,
              filter: (item, data) => data.datasets[0].data[item.index] > 0
            }
          },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#333',
            bodyColor: '#555',
            borderColor: '#e0e0e0',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
          }
        }
      }
    });
  };

  if (window.Chart) {
    renderCharts();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.onload = renderCharts;
    document.head.appendChild(script);
  }
}, [allSchedules]);
  



  const CACHE_TTL = 60_000;

const loadPage = async (page, force = false) => {
  const cacheKey = `${page}_${filterType}_${filterBarangay}_${filterStatus}_${searchTerm}`;

  page === 1 ? setLoading(true) : setPageLoading(true);
  setSchedules([]);

  const cached = schedulePageCache[cacheKey];
  if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
    await new Promise(r => requestAnimationFrame(r));
    setSchedules(cached.schedules);
    setTotalSchedules(cached.total);
    setLoading(false);
    setPageLoading(false);
    return;
  }

  try {
    const params = new URLSearchParams({
      page,
      limit: itemsPerPage,
      ...(filterType !== 'all'     && { type: filterType }),
      ...(filterBarangay !== 'all' && { barangay_id: filterBarangay }),
      ...(filterStatus !== 'all'   && { status: filterStatus }),
      ...(searchTerm               && { search: searchTerm }),
    });

    // Fetch page data alone — this await is what lets React paint the skeleton
    const pageRes = await scheduleAPI.getAll(params.toString());
    const newSchedules = pageRes.data.schedules || [];
    const total        = pageRes.data.total ?? newSchedules.length;

    setSchedulePageCache(prev => ({ ...prev, [cacheKey]: { schedules: newSchedules, total, ts: Date.now() } }));
    setSchedules(newSchedules);
    setTotalSchedules(total);

    // Chart data fetched separately so it never blocks the table
    if (page === 1 || force) {
      scheduleAPI.getAll(new URLSearchParams({ page: 1, limit: 999 }).toString())
        .then(chartRes => setAllSchedules(chartRes.data.schedules || []))
        .catch(() => {});
    }
  } catch (err) {
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setLoading(false);
    setPageLoading(false);
  }
};

const loadData = (force = false) => loadPage(currentPage, force);

  const loadBarangays = async () => {
    try {
      const response = await barangayAPI.getAll();
      setBarangays(response.data.barangays || []);
    } catch (err) {
      console.error('Error loading barangays:', err);
    }
  };

  const loadVaccinationTypes = async () => {
    try {
      const response = await vaccinationAPI.getTypes();
      setVaccinationTypes(response.data.vaccination_types || []);
    } catch (err) {
      console.error('Error loading vaccination types:', err);
    }
  };

  const loadInventory = async () => {
    try {
      setLoadingInventory(true);
      const response = await inventoryAPI.getAll();
      const all = response.data.inventory || [];
      setInventory(all);
      setVaccinationInventory(all.filter(i => i.item_type === 'vaccination' && parseInt(i.current_stock) > 0));
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Helper: get stock for a vaccination type from inventory
  const getVaccineStock = (inventoryId) => {
  const item = inventory.find(i => i.id === parseInt(inventoryId));
  return item ? parseInt(item.current_stock) : null;
};

const getInventoryItemForVaccine = (inventoryId) => {
  return inventory.find(i => i.id === parseInt(inventoryId)) || null;
};

const loadBatchAvailability = async (inventoryId, scheduleId = null) => {
  setLoadingBatchAvailability(true);
  try {
    const param = scheduleId ? `${inventoryId}?exclude_schedule=${scheduleId}` : `${inventoryId}`;
    const res = await inventoryAPI.getBatchAvailability(param);
    const batches = res.data.batches || [];
    setBatchAllocations(prev => ({ ...prev, [inventoryId]: batches }));
  } catch (err) {
    console.error('Failed to load batch availability', err);
  } finally {
    setLoadingBatchAvailability(false);
  }
};

  

  // Helper: get microchip stock
  const getMicrochipStock = () => {
    const item = inventory.find(i => i.item_type === 'microchip');
    return item ? parseInt(item.current_stock) : null;
  };

  const getMicrochipInventoryItem = () => {
    return inventory.find(i => i.item_type === 'microchip') || null;
  };

  const handleOpenModal = (mode = 'create', schedule = null) => {
    setModalMode(mode);
    setSelectedSchedule(schedule);
    setError('');
    
    const defaultBarangayId = user?.assigned_barangay_id ? String(user.assigned_barangay_id) : '';
    console.log('User assigned barangay ID:', defaultBarangayId);
    
    if (mode === 'edit' && schedule) {
  let vacTypes = {};
  let dewormTypes = {};
  let petTypes = [];
  let sterilSpecies = [];
  let otherPetTypes = [];

  if (schedule.type === 'vaccination' && schedule.vaccine_shot_limits) {
    try {
      vacTypes = typeof schedule.vaccine_shot_limits === 'string' 
        ? JSON.parse(schedule.vaccine_shot_limits) 
        : schedule.vaccine_shot_limits;
    } catch (e) {
      vacTypes = {};
    }
  }

  if (schedule.type === 'deworming' && schedule.deworming_limits) {
    try {
      dewormTypes = typeof schedule.deworming_limits === 'string' 
        ? JSON.parse(schedule.deworming_limits) 
        : schedule.deworming_limits;
    } catch (e) {
      dewormTypes = {};
    }
  }

  if (schedule.pet_types_allowed) {
    try {
      const parsed = Array.isArray(schedule.pet_types_allowed)
        ? schedule.pet_types_allowed
        : JSON.parse(schedule.pet_types_allowed);
      
      // For deworming, use pet_types_allowed
      if (schedule.type === 'deworming') {
        petTypes = parsed;
      } 
      // For other, use other_pet_types
      else if (schedule.type === 'other') {
        otherPetTypes = parsed;
      }
    } catch (e) {
      petTypes = [];
      otherPetTypes = [];
    }
  }

  if (schedule.type === 'sterilization' && schedule.sterilization_species) {
    try {
      sterilSpecies = Array.isArray(schedule.sterilization_species)
        ? schedule.sterilization_species
        : JSON.parse(schedule.sterilization_species);
    } catch (e) {
      sterilSpecies = [];
    }
  }
  
  setFormData({
    schedule_type: schedule.type,
    barangay_id: schedule.barangay_id ? String(schedule.barangay_id) : (schedule.custom_place ? 'other' : ''),
    title: schedule.title || '',
    description: schedule.description || '',
    scheduled_date: schedule.scheduled_date || '',
    start_time: schedule.start_time ? schedule.start_time.substring(0, 5) : '',
end_time: schedule.end_time ? schedule.end_time.substring(0, 5) : '',
    venue: schedule.venue || '',
    max_capacity: schedule.max_capacity || '',
    speaker: schedule.speaker || '',
    vaccination_types: vacTypes,
    deworming_types: dewormTypes,
    pet_types_allowed: petTypes,
    sterilization_species: sterilSpecies,
    other_pet_types: otherPetTypes,
    other_event_type: schedule.other_event_type || '',
    custom_place: schedule.custom_place || '',
    status: schedule.status || 'scheduled'
  });
    } else {
      setFormData({
        schedule_type: '',
        barangay_id: defaultBarangayId,
        title: '',
        description: '',
        scheduled_date: '',
        start_time: '',
        end_time: '',
        venue: '',
        max_capacity: '',
        speaker: '',
        vaccination_types: {},
        deworming_types: {},
        pet_types_allowed: [],
        sterilization_species: [],
        other_pet_types: [],
        other_event_type: '',
        custom_place: '',
        status: 'scheduled'
      });
    }
    
    if (mode === 'edit' && schedule?.type === 'microchip') {
      const microchipInvItem = inventory.find(i => i.item_type === 'microchip');
      if (microchipInvItem) loadBatchAvailability(microchipInvItem.id, schedule.id);
    }

    if (mode === 'edit' && schedule?.type === 'vaccination' && schedule.vaccine_shot_limits) {
      try {
        const limits = typeof schedule.vaccine_shot_limits === 'string'
          ? JSON.parse(schedule.vaccine_shot_limits)
          : schedule.vaccine_shot_limits;

        const batchPromises = Object.keys(limits).map(inventoryId =>
          api.get(`/inventory/batch-availability/${inventoryId}?exclude_schedule=${schedule.id}`)
            .then(res => ({ inventoryId: parseInt(inventoryId), batches: res.data.batches || [] }))
            .catch(() => ({ inventoryId: parseInt(inventoryId), batches: [] }))
        );

        const allocPromise = inventoryAPI.getScheduleAllocations(schedule.id)
          .then(res => res.data.allocations || [])
          .catch(() => []);

        Promise.all([Promise.all(batchPromises), allocPromise]).then(([batchResults, existing]) => {
          const newBatchAllocations = {};
          batchResults.forEach(({ inventoryId, batches }) => {
            newBatchAllocations[inventoryId] = batches;
          });
          setBatchAllocations(newBatchAllocations);

          const allocs = {};
          existing.forEach(a => { allocs[a.batch_id] = a.allocated_qty; });
          setScheduleAllocations(allocs);
        });
      } catch (e) {}
    }

    setShowModal(true);
  };

  const loadAllRegistrations = async (schedule) => {
    setLoadingRegistrations(true);
    setRegistrationsSearchTerm('');
    setExpandedOwners({});
    try {
      const response = await api.get(`/schedules/registrations/${schedule.id}/${schedule.type}`);
      setRegistrationsData(response.data.registrations || []);
    } catch (err) {
      console.error('Error loading registrations:', err);
      setRegistrationsData([]);
    } finally {
      setLoadingRegistrations(false);
    }
    setShowRegistrationsModal(true);
  };

  const handleOpenViewModal = async (schedule) => {
  setSelectedSchedule(schedule);
  setShowViewModal(true);

  if (schedule.type === 'vaccination') {
    setLoadingVaccineCounts(true);
    try {
      const response = await scheduleAPI.getVaccineRegistrationCounts(schedule.id);
      setVaccineRegistrationCounts(response.data.vaccine_counts || {});
    } catch (err) {
      setVaccineRegistrationCounts({});
    } finally {
      setLoadingVaccineCounts(false);
    }
  }
};

  const handleCloseModal = () => {
    setShowModal(false);
    setError('');
    setSelectedSchedule(null);
    setModalMode('create');
    setScheduleAllocations({});
    setBatchAllocations({});
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedSchedule(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleVaccinationTypeToggle = (typeId, shotLimit = '') => {
    setFormData(prev => {
      const newVaccinationTypes = { ...prev.vaccination_types };
      if (newVaccinationTypes[typeId] !== undefined && shotLimit === '') {
        delete newVaccinationTypes[typeId];
        setScheduleAllocations(sa => {
          const next = { ...sa };
          const batches = batchAllocations[parseInt(typeId)] || [];
          batches.forEach(b => delete next[b.id]);
          return next;
        });
      } else {
        newVaccinationTypes[typeId] = shotLimit || '';
        const invId = parseInt(typeId);
        if (!batchAllocations[invId] || batchAllocations[invId].length === 0) {
          loadBatchAvailability(invId, selectedSchedule?.id || null);
        }
      }
      return { ...prev, vaccination_types: newVaccinationTypes };
    });
  };

  const handleBatchAllocationChange = (batchId, value, typeId) => {
    const invItem = getInventoryItemForVaccine(typeId);
    if (!invItem) return;
    const batches = batchAllocations[invItem.id] || [];
    const batch = batches.find(b => b.id === parseInt(batchId));
    if (!batch) return;

    let parsed = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    if (parsed > batch.available_qty) parsed = batch.available_qty;

    setScheduleAllocations(prev => ({ ...prev, [batchId]: parsed }));

    // Auto-update the shot limit for this vaccine = sum of all batch allocations for it
    const updatedAllocations = { ...scheduleAllocations, [batchId]: parsed };
    const totalForVaccine = batches
      .filter(b => updatedAllocations[b.id] > 0)
      .reduce((sum, b) => sum + (updatedAllocations[b.id] || 0), 0);

    setFormData(prev => ({
      ...prev,
      vaccination_types: { ...prev.vaccination_types, [typeId]: totalForVaccine || '' }
    }));
  };

  const handleBatchToggle = (batchId, typeId) => {
    setScheduleAllocations(prev => {
      const next = { ...prev };
      if (next[batchId] !== undefined) {
        delete next[batchId];
        // Recompute shot limit
        const invItem = getInventoryItemForVaccine(typeId);
        const batches = batchAllocations[invItem?.id] || [];
        const total = batches.reduce((sum, b) => sum + (b.id === parseInt(batchId) ? 0 : (next[b.id] || 0)), 0);
        setFormData(f => ({ ...f, vaccination_types: { ...f.vaccination_types, [typeId]: total || '' } }));
      } else {
        next[batchId] = 0;
      }
      return next;
    });
  };

  const handleDewormingTypeToggle = (typeId, limit = '') => {
    setFormData(prev => {
      const newDewormingTypes = { ...prev.deworming_types };
      
      if (newDewormingTypes[typeId] !== undefined && limit === '') {
        delete newDewormingTypes[typeId];
      } else {
        newDewormingTypes[typeId] = limit || '';
      }
      
      return {
        ...prev,
        deworming_types: newDewormingTypes
      };
    });
  };

  const handleDewormingLimitChange = (typeId, value) => {
    setFormData(prev => ({
      ...prev,
      deworming_types: {
        ...prev.deworming_types,
        [typeId]: value === '' ? '' : parseInt(value) || ''
      }
    }));
  };

  const handlePetTypesToggle = (species) => {
    setFormData(prev => ({
      ...prev,
      pet_types_allowed: prev.pet_types_allowed.includes(species)
        ? prev.pet_types_allowed.filter(s => s !== species)
        : [...prev.pet_types_allowed, species]
    }));
  };

  const handleSterilizationSpeciesToggle = (species) => {
    setFormData(prev => ({
      ...prev,
      sterilization_species: prev.sterilization_species.includes(species)
        ? prev.sterilization_species.filter(s => s !== species)
        : [...prev.sterilization_species, species]
    }));
  };
  const handleOtherPetTypesToggle = (species) => {
  setFormData(prev => ({
    ...prev,
    other_pet_types: prev.other_pet_types.includes(species)
      ? prev.other_pet_types.filter(s => s !== species)
      : [...prev.other_pet_types, species]
  }));
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      if (modalMode === 'create') {
  const selectedDate = new Date(formData.scheduled_date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);
  
  if (selectedDate < tomorrow) {
    setError('Cannot schedule events for today or in the past. Please select tomorrow or a future date.');
    setFormLoading(false);
    return;
  }
}

      // Time validations
      if (formData.start_time && formData.end_time) {
        const [startH, startM] = formData.start_time.split(':').map(Number);
        const [endH, endM] = formData.end_time.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        if (startTotal < 8 * 60 || startTotal > 17 * 60) {
          setError('Start time must be between 8:00 AM and 5:00 PM.');
          setFormLoading(false);
          return;
        }
        if (endTotal < 8 * 60 || endTotal > 17 * 60) {
          setError('End time must be between 8:00 AM and 5:00 PM.');
          setFormLoading(false);
          return;
        }
        if (startTotal >= endTotal) {
          setError('End time must be later than start time.');
          setFormLoading(false);
          return;
        }
        if (endTotal - startTotal < 30) {
          setError('There must be at least a 30-minute gap between start and end time.');
          setFormLoading(false);
          return;
        }
      }
      if (formData.schedule_type === 'vaccination') {
        const hasInvalidLimits = Object.values(formData.vaccination_types).some(
          limit => !limit || parseInt(limit) <= 0
        );
        if (hasInvalidLimits || Object.keys(formData.vaccination_types).length === 0) {
          setError('Please select at least one vaccine and enter valid shot limits (greater than 0).');
          setFormLoading(false);
          return;
        }
        // Stock check
        for (const [typeId, limit] of Object.entries(formData.vaccination_types)) {
          const stock = getVaccineStock(typeId);
          if (stock !== null && parseInt(limit) > stock) {
            const vaccine = vaccinationTypes.find(v => v.id === parseInt(typeId));
            setError(`Shot limit for "${vaccine?.name || 'vaccine'}" exceeds available stock (${stock} available).`);
            setFormLoading(false);
            return;
          }
          if (stock !== null && stock === 0) {
            const vaccine = vaccinationTypes.find(v => v.id === parseInt(typeId));
            setError(`"${vaccine?.name || 'vaccine'}" is out of stock.`);
            setFormLoading(false);
            return;
          }
        }
      }

      if (formData.schedule_type === 'microchip' && modalMode === 'create') {
        const chipStock = getMicrochipStock();
        if (chipStock !== null && chipStock === 0) {
          setError('Microchips are out of stock.');
          setFormLoading(false);
          return;
        }
        if (chipStock !== null && formData.max_capacity && parseInt(formData.max_capacity) > chipStock) {
          setError(`Max capacity (${formData.max_capacity}) exceeds available microchip stock (${chipStock}).`);
          setFormLoading(false);
          return;
        }
      }

      const dataToSubmit = {
        barangay_id: (formData.barangay_id === 'other' || !formData.barangay_id) ? null : parseInt(formData.barangay_id),
        custom_place: formData.barangay_id === 'other' ? formData.custom_place : null,
        title: formData.title,
        description: formData.description,
        scheduled_date: formData.scheduled_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        venue: formData.venue,
        schedule_type: formData.schedule_type,
        status: formData.status
      };

      if (formData.schedule_type === 'vaccination') {
        dataToSubmit.vaccine_shot_limits = formData.vaccination_types;
        
        const selectedVaccineIds = Object.keys(formData.vaccination_types).map(id => parseInt(id));
        const selectedVaccines = vaccinationTypes.filter(vt => selectedVaccineIds.includes(vt.id));
        
        const petTypesSet = new Set();
        selectedVaccines.forEach(vaccine => {
          if (vaccine.species === 'dog') {
            petTypesSet.add('dog');
          } else if (vaccine.species === 'cat') {
            petTypesSet.add('cat');

            petTypesSet.add('dog');
            petTypesSet.add('cat');
          } else if (vaccine.species === 'all') {
            petTypesSet.add('dog');
            petTypesSet.add('cat');
          }
        });
        
        dataToSubmit.pet_types_allowed = Array.from(petTypesSet);
      } else if (formData.schedule_type === 'seminar') {
        dataToSubmit.speaker = formData.speaker || null;
        dataToSubmit.max_capacity = formData.max_capacity ? parseInt(formData.max_capacity) : null;
      } else if (formData.schedule_type === 'sterilization') {
        dataToSubmit.max_capacity = formData.max_capacity ? parseInt(formData.max_capacity) : null;
        dataToSubmit.sterilization_species = formData.sterilization_species;
        } else if (formData.schedule_type === 'other') {
        dataToSubmit.max_capacity = formData.max_capacity ? parseInt(formData.max_capacity) : null;
        dataToSubmit.other_event_type = formData.other_event_type;
        dataToSubmit.pet_types_allowed = formData.other_pet_types;
      } else if (formData.schedule_type === 'microchip') {
        dataToSubmit.max_capacity = formData.max_capacity ? parseInt(formData.max_capacity) : null;
        dataToSubmit.pet_types_allowed = formData.pet_types_allowed;
      }

      console.log('Submitting data:', dataToSubmit);

      let savedScheduleId;
      if (modalMode === 'edit' && selectedSchedule) {
        await scheduleAPI.update(selectedSchedule.id, dataToSubmit);
        savedScheduleId = selectedSchedule.id;
        setSuccess(`${getScheduleTypeLabel(formData.schedule_type)} schedule updated successfully!`);
      } else {
        dataToSubmit.created_by = user.id;
        const res = await scheduleAPI.create(dataToSubmit);
        // Try both res.data.id and res.data.schedule_id as fallback
                savedScheduleId = res.data.id || res.data.schedule_id || null;

        console.log('📅 Created schedule ID:', savedScheduleId, '| Full response:', res.data);
        setSuccess(`${getScheduleTypeLabel(formData.schedule_type)} schedule created successfully!`);
      }

      // Save batch allocations for vaccination schedules
      if ((formData.schedule_type === 'vaccination' || formData.schedule_type === 'microchip') && savedScheduleId) {
        const allocations = Object.entries(scheduleAllocations)
          .filter(([, qty]) => qty > 0)
          .map(([batchId, qty]) => {
            let inventoryId = null;
            for (const [invId, batches] of Object.entries(batchAllocations)) {
              if (batches.find(b => b.id === parseInt(batchId))) {
                inventoryId = parseInt(invId);
                break;
              }
            }
            return { inventory_id: inventoryId, batch_id: parseInt(batchId), allocated_qty: qty };
          })
          .filter(a => a.inventory_id !== null);

        console.log('💉 Saving allocations:', allocations, 'for schedule:', savedScheduleId);
        if (allocations.length > 0) {
          try {
            await inventoryAPI.saveScheduleAllocations(savedScheduleId, { allocations });
            console.log('✅ Allocations saved successfully');
          } catch (allocErr) {
            console.error('❌ Failed to save allocations:', allocErr.response?.data || allocErr);
          }
        } else {
          console.warn('⚠️ No allocations to save — scheduleAllocations:', scheduleAllocations, 'batchAllocations:', batchAllocations);
        }
      }

      handleCloseModal();
      loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (schedule) => {
    setScheduleToDelete(schedule);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;
    
    setDeleteLoading(true);
    try {
      await scheduleAPI.delete(scheduleToDelete.id);
      setShowDeleteModal(false);
      setScheduleToDelete(null);
      // Remove from local state immediately
      setSchedules(prev => prev.filter(s => !(s.id === scheduleToDelete.id && s.type === scheduleToDelete.type)));
      setSuccess(`${getScheduleTypeLabel(scheduleToDelete.type)} schedule deleted successfully!`);
      setTimeout(() => setSuccess(''), 5000);
      // Also refresh from server in background
      loadData();
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };  

  const getScheduleTypeLabel = (type) => {
    const labels = {
      vaccination: 'Vaccination',
      seminar: 'Seminar',
      sterilization: 'Sterilization',
      other: 'Other',
      microchip: 'Microchip'
    };
    return labels[type] || type;
  };

  const getBarangayName = (barangayId, customPlace) => {
    if (barangayId === null && customPlace) return customPlace;
    const barangay = barangays.find(b => b.id === barangayId);
    return barangay ? barangay.name : 'Unknown';
  };

  const getStatusBadge = (schedule) => {
  // Always trust the status from the database first
  if (schedule.status === 'cancelled') {
    return <Badge bg="danger">Cancelled</Badge>;
  } else if (schedule.status === 'completed') {
    return <Badge bg="secondary">Completed</Badge>;
  } else if (schedule.status === 'ongoing') {
    return <Badge bg="success">Ongoing</Badge>;
  } else if (schedule.status === 'scheduled') {
    // Only check if it's past due if status is still "scheduled"
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(schedule.scheduled_date);
    scheduleDate.setHours(0, 0, 0, 0);
    
    if (scheduleDate < today) {
      return <Badge bg="warning">Past Due</Badge>;
    }
    return <Badge bg="primary">Scheduled</Badge>;
  } else {
    return <Badge bg="primary">Scheduled</Badge>;
  }
};

  const getTypeBadge = (type) => {
  const badges = {
    vaccination: <Badge bg="warning" style={{ fontSize: '0.85rem' }}><i className="fas fa-syringe me-1"></i>Vaccination</Badge>,
    seminar: <Badge bg="info" style={{ fontSize: '0.85rem' }}><i className="fas fa-chalkboard-teacher me-1"></i>Seminar</Badge>,
    sterilization: <Badge bg="success" style={{ fontSize: '0.85rem' }}><i className="fas fa-cut me-1"></i>Sterilization</Badge>,
    other: <Badge bg="dark" style={{ fontSize: '0.85rem' }}><i className="fas fa-calendar me-1"></i>Other</Badge> // Add this line
  };
  return badges[type] || <Badge bg="secondary">{type}</Badge>;
};

// Server handles all filtering — schedules array IS the current page
const displaySchedules = schedules;
const paginatedSchedules = schedules;

// Pagination calculations
const totalPages = Math.ceil(totalSchedules / itemsPerPage);

  const filteredVaccinationTypes = vaccinationInventory.filter(item => {
  const matchesSpecies = filterVaccineSpecies === 'all' || item.species === filterVaccineSpecies || item.species === 'all';
  return matchesSpecies;
});


  const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

  const getTotalVaccineShots = (schedule) => {
    if (!schedule.vaccine_shot_limits) return 0;
    
    try {
      const limits = typeof schedule.vaccine_shot_limits === 'string' 
        ? JSON.parse(schedule.vaccine_shot_limits) 
        : schedule.vaccine_shot_limits;
      
      return Object.values(limits).reduce((sum, limit) => sum + parseInt(limit || 0), 0);
    } catch (e) {
      return 0;
    }
  };

  

  const getVaccineDetails = (schedule) => {
  if (!schedule.vaccine_shot_limits) return [];
  try {
    const limits = typeof schedule.vaccine_shot_limits === 'string'
      ? JSON.parse(schedule.vaccine_shot_limits)
      : schedule.vaccine_shot_limits;
    return Object.entries(limits).map(([vaccineId, limit]) => {
      // Look up by inventory id first
      const invItem = inventory.find(i => i.id === parseInt(vaccineId));
      const registered = vaccineRegistrationCounts[vaccineId] || 0;
      return {
        id: vaccineId,
        name: invItem?.item_name || invItem?.name || `Vaccine #${vaccineId}`,
        species: invItem?.species || 'all',
        limit: parseInt(limit || 0),
        registered: registered
      };
    });
  } catch (e) {
    return [];
  }
};
 

  const EV_TYPE_META = {
    vaccination:   { label: 'Vaccination',   color: '#e0a800', icon: 'fa-syringe' },
    seminar:       { label: 'Seminar',       color: '#0aa2c0', icon: 'fa-chalkboard-teacher' },
    sterilization: { label: 'Sterilization', color: '#198754', icon: 'fa-cut' },
    microchip:     { label: 'Microchip',     color: '#d63384', icon: 'fa-microchip' },
    deworming:     { label: 'Deworming',     color: '#0d6efd', icon: 'fa-pills' },
    other:         { label: 'Other',         color: '#6f42c1', icon: 'fa-calendar' },
  };
  const evTypeMeta = (s) => {
    const m = EV_TYPE_META[s.type] || EV_TYPE_META.other;
    return s.type === 'other' && s.other_event_type ? { ...m, label: s.other_event_type } : m;
  };

  const fmtClock = (t) => {
    if (!t) return '';
    const [h, m] = String(t).split(':').map(Number);
    if (Number.isNaN(h)) return t;
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  const parseDay = (s) => {
    const [y, mo, d] = String(s || '').slice(0, 10).split('-').map(Number);
    return y ? new Date(y, mo - 1, d) : null;
  };

  const getEvStatus = (schedule) => {
    if (schedule.status === 'cancelled') return { label: 'Cancelled', color: '#dc3545' };
    if (schedule.status === 'completed') return { label: 'Completed', color: '#6b7280' };
    if (schedule.status === 'ongoing')   return { label: 'Ongoing',   color: '#198754' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = parseDay(schedule.scheduled_date);
    if (d && d < today) return { label: 'Past due', color: '#b88a00' };
    return { label: 'Upcoming', color: '#0d6efd' };
  };

  const getCapacity = (schedule) => {
    const total = schedule.type === 'vaccination' ? getTotalVaccineShots(schedule) : Number(schedule.max_capacity) || 0;
    if (!total) return null;
    const used = Number(schedule.current_registrations) || 0;
    return { used, total, pct: Math.min(100, (used / total) * 100) };
  };

  const canManage = user?.role === 'super_admin' || user?.role === 'barangay_official';
  const hasFilters = searchTerm || filterType !== 'all' || filterBarangay !== 'all';
  const statusTitle = { all: 'All events', upcoming: 'Upcoming events', ongoing: 'Ongoing events', completed: 'Completed events' }[filterStatus] || 'Events';

  const pagerNumbers = (() => {
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
      <Container fluid className="py-4 schedule-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* Header */}
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 em-anim">
          <div>
            <h2 className="em-title sched-title">Event Management</h2>
            <p className="em-sub">Schedule and manage vaccination drives, seminars and other City Vet events.</p>
          </div>
          <button type="button" className="em-btn primary lg sched-add-btn" onClick={() => handleOpenModal('create')}>
            <i className="fas fa-plus" />Add event
          </button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {success && (
          <div className="em-toast" role="status">
            <div className="ic"><i className="fas fa-check" /></div>
            <div className="flex-grow-1">
              <div className="t">Success</div>
              <div className="d">{success}</div>
            </div>
            <button type="button" className="em-toast-close" onClick={() => setSuccess('')} aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* Charts */}
        <Row className="mb-4 g-3">
          <Col md={5}>
            <div className="em-panel h-100 em-anim" style={{ '--d': '0.06s' }}>
              <div className="em-panel-head">
                <div className="em-head-ic" style={{ '--c': '#e0a800' }}><i className="fas fa-chart-bar" /></div>
                <div>
                  <div className="em-panel-title">Events by type</div>
                  <div className="em-panel-sub">All events in the system</div>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1.1rem 1rem', height: '210px' }}>
                {loading
                  ? <div className="em-skel" style={{ height: '100%' }} />
                  : <canvas ref={schedTypeChartRef} />}
              </div>
            </div>
          </Col>
          <Col md={7}>
            <div className="em-panel h-100 em-anim" style={{ '--d': '0.12s' }}>
              <div className="em-panel-head">
                <div className="em-head-ic" style={{ '--c': '#0d6efd' }}><i className="fas fa-chart-line" /></div>
                <div>
                  <div className="em-panel-title">Monthly event trend</div>
                  <div className="em-panel-sub">Last 6 months</div>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1.1rem 1rem', height: '210px' }}>
                {loading
                  ? <div className="em-skel" style={{ height: '100%' }} />
                  : <canvas ref={schedMonthlyChartRef} />}
              </div>
            </div>
          </Col>
        </Row>

        {/* Events table */}
        <div className="em-panel em-anim" style={{ '--d': '0.18s', overflow: 'visible' }}>
          {/* Toolbar */}
          <div className="em-toolbar sched-filters-row">
            <div className="em-toolbar-title">
              <span>{statusTitle}</span>
              <span className="em-count">{totalSchedules}</span>
            </div>
            <div className="em-seg" role="group" aria-label="Status">
              {[['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['completed', 'Completed'], ['all', 'All']].map(([v, l]) => (
                <button key={v} type="button" className={filterStatus === v ? 'on' : ''} onClick={() => setFilterStatus(v)} aria-pressed={filterStatus === v}>{l}</button>
              ))}
            </div>
          </div>
          <div className="em-filters">
            <div className="em-search">
              <i className="fas fa-search" />
              <input
                className="em-input"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search events"
              />
              {searchTerm && (
                <button type="button" className="em-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <div className="em-select">
              <i className="fas fa-tag" />
              <select className="em-input" value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Event type">
                <option value="all">All types</option>
                <option value="vaccination">Vaccination</option>
                <option value="seminar">Seminar</option>
                <option value="sterilization">Sterilization</option>
                <option value="microchip">Microchip</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="em-select">
              <i className="fas fa-map-marker-alt" />
              <select className="em-input" value={filterBarangay} onChange={(e) => setFilterBarangay(e.target.value)} aria-label="Barangay">
                <option value="all">All barangays</option>
                {barangays.map(barangay => (
                  <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button type="button" className="em-link" onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterBarangay('all'); }}>
                <i className="fas fa-undo me-1" />Clear filters
              </button>
            )}
          </div>

          {/* Body */}
          <div className="sched-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
            {loading || pageLoading ? (
              <div style={{ padding: '0.5rem 0 1rem' }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.12 }}>
                    <div className="em-skel" style={{ width: 52, height: 52, borderRadius: 12 }} />
                    <div className="flex-grow-1">
                      <div className="em-skel mb-2" style={{ width: '40%', height: 13 }} />
                      <div className="em-skel" style={{ width: '25%', height: 10 }} />
                    </div>
                    <div className="em-skel" style={{ width: 110, height: 12 }} />
                    <div className="em-skel" style={{ width: 80, height: 22, borderRadius: 999 }} />
                  </div>
                ))}
              </div>
            ) : displaySchedules.length === 0 ? (
              <div className="em-empty">
                <div className="ic"><i className="fas fa-calendar-times" /></div>
                <h6>No events found</h6>
                <p>{hasFilters ? 'Try changing or clearing the filters.' : 'Start by adding an event for a barangay.'}</p>
                {!hasFilters && (
                  <button type="button" className="em-btn primary" onClick={() => handleOpenModal('create')}>
                    <i className="fas fa-plus" />Add event
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive" style={{ overflow: 'visible' }}>
                <table className="em-table sched-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th className="mobile-hide">Location</th>
                      <th className="mobile-hide">Slots</th>
                      <th>Status</th>
                      <th style={{ width: 56 }} aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSchedules.map((schedule, i) => {
                      const meta = evTypeMeta(schedule);
                      const st = getEvStatus(schedule);
                      const cap = getCapacity(schedule);
                      const day = parseDay(schedule.scheduled_date);
                      const menuKey = `sched-${schedule.id}`;
                      const menuOpen = showDropdown === menuKey;
                      const editable = schedule.status !== 'ongoing' && schedule.status !== 'completed' && canManage;
                      return (
                        <tr key={`${schedule.type}-${schedule.id}`} className={menuOpen ? 'raised' : ''} style={{ animationDelay: `${i * 0.04}s` }}>
                          <td style={{ width: 150 }}>
                            <div className="d-flex align-items-center gap-2">
                              <div className="em-date" style={{ '--c': meta.color }}>
                                <span className="m">{day ? day.toLocaleDateString('en-US', { month: 'short' }) : '—'}</span>
                                <span className="d">{day ? day.getDate() : ''}</span>
                              </div>
                              <div className="mobile-hide-datetime">
                                <div className="em-strong" style={{ fontSize: '0.8rem' }}>{day ? day.toLocaleDateString('en-US', { weekday: 'short' }) : ''}</div>
                                <div className="em-muted" style={{ whiteSpace: 'nowrap' }}>{fmtClock(schedule.start_time)} – {fmtClock(schedule.end_time)}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <div className="em-type-ic" style={{ '--c': meta.color }}><i className={`fas ${meta.icon}`} /></div>
                              <div style={{ minWidth: 0 }}>
                                <div className="em-strong em-ellipsis" title={schedule.title}>{schedule.title}</div>
                                <div className="em-muted em-ellipsis" title={schedule.description || ''}>
                                  <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                                  {schedule.description ? ` · ${schedule.description}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="mobile-hide">
                            <div className="em-strong" style={{ fontSize: '0.85rem' }}>{getBarangayName(schedule.barangay_id)}</div>
                            <div className="em-muted em-ellipsis" style={{ maxWidth: 200 }} title={schedule.venue}>{schedule.venue || '—'}</div>
                          </td>
                          <td className="mobile-hide" style={{ width: 150 }}>
                            {cap ? (
                              <>
                                <div className="em-muted"><strong style={{ color: '#1f2328' }}>{cap.used}</strong> / {cap.total} registered</div>
                                <div className="em-bar"><div style={{ width: `${cap.pct}%`, background: cap.pct >= 100 ? '#dc3545' : meta.color }} /></div>
                              </>
                            ) : <span className="em-muted">—</span>}
                          </td>
                          <td>
                            <span className="em-pill" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 12%, #fff)` }}>
                              <i className="fas fa-circle" />{st.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                type="button"
                                className={`em-icon-btn${menuOpen ? ' on' : ''}`}
                                onClick={() => setShowDropdown(menuOpen ? null : menuKey)}
                                aria-label={`Options for ${schedule.title}`}
                                aria-expanded={menuOpen}
                              >
                                <i className="fas fa-ellipsis-v" />
                              </button>
                              {menuOpen && (
                                <>
                                  <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
                                  <div className="em-menu" role="menu">
                                    <button type="button" role="menuitem" className="em-menu-item" onClick={() => { setShowDropdown(null); handleOpenViewModal(schedule); }}>
                                      <i className="fas fa-eye" />View details
                                    </button>
                                    {canManage && (
                                      <button type="button" role="menuitem" className="em-menu-item" onClick={() => { setShowDropdown(null); loadAllRegistrations(schedule); }}>
                                        <i className="fas fa-users" />View registrations
                                      </button>
                                    )}
                                    {editable && (
                                      <>
                                        <button type="button" role="menuitem" className="em-menu-item" onClick={() => { setShowDropdown(null); handleOpenModal('edit', schedule); }}>
                                          <i className="fas fa-pen" />Edit event
                                        </button>
                                        <div className="em-menu-sep" />
                                        <button type="button" role="menuitem" className="em-menu-item danger" onClick={() => { setShowDropdown(null); handleDeleteClick(schedule); }}>
                                          <i className="fas fa-trash-alt" />Delete event
                                        </button>
                                      </>
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
          {totalSchedules > itemsPerPage && (
            <div className="em-foot sched-pagination">
              <span className="em-muted page-info" style={{ fontSize: '0.84rem' }}>
                Showing <strong style={{ color: '#1f2328' }}>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalSchedules)}</strong> of {totalSchedules}
              </span>
              <div className="d-flex align-items-center gap-1">
                <button type="button" className="em-page nav page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                  <i className="fas fa-chevron-left" />
                </button>
                {pagerNumbers.map(n => (
                  <button key={n} type="button" className={`em-page page-btn${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
                ))}
                <button type="button" className="em-page nav page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* View Schedule Modal */}
      <Modal show={showViewModal} onHide={handleCloseViewModal} size="lg" className="sched-view-modal" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-eye me-2"></i>
            Schedule Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedSchedule && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <div className="mb-3">
                    <strong className="d-block mb-1" style={{ fontSize: '0.9rem', color: '#666' }}>Type</strong>
                    <span style={{ fontWeight: '500', color: '#555' }}>
  {selectedSchedule.type === 'vaccination' && <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</>}
  {selectedSchedule.type === 'seminar' && <><i className="fas fa-chalkboard-teacher me-1" style={{ color: '#6f42c1' }}></i>Seminar</>}
  {selectedSchedule.type === 'sterilization' && <><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</>}
  {selectedSchedule.type === 'microchip' && (
    <><i className="fas fa-microchip me-1" style={{ color: '#6c757d' }}></i>Microchip</>
  )}
  {selectedSchedule.type === 'other' && (
    <>
      <i className="fas fa-calendar me-1" style={{ color: '#343a40' }}></i>
      {selectedSchedule.other_event_type || 'Other'}
    </>
  )}
</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong className="d-block mb-1" style={{ fontSize: '0.9rem', color: '#666' }}>Status</strong>
                    {selectedSchedule.status === 'cancelled' && (
                      <span style={{ fontWeight: '600', color: '#dc3545' }}>Cancelled</span>
                    )}
                    {selectedSchedule.status === 'completed' && (
                      <span style={{ fontWeight: '600', color: '#6c757d' }}>Completed</span>
                    )}
                    {selectedSchedule.status === 'ongoing' && (
                      <span style={{ fontWeight: '600', color: '#28a745' }}>Ongoing</span>
                    )}
                    {selectedSchedule.status === 'scheduled' && (() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const scheduleDate = new Date(selectedSchedule.scheduled_date);
                      scheduleDate.setHours(0, 0, 0, 0);
                      
                      if (scheduleDate < today) {
                        return <span style={{ fontWeight: '600', color: '#ffc107' }}>Past Due</span>;
                      }
                      return <span style={{ fontWeight: '600', color: '#007bff' }}>Upcoming</span>;
                    })()}
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Title</strong>
                  <p className="mb-0">{selectedSchedule.title}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Description</strong>
                  <p className="mb-0">{selectedSchedule.description || 'No description provided'}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Date</strong>
                  <p className="mb-0">{new Date(selectedSchedule.scheduled_date).toLocaleDateString()}</p>
                </Col>
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Time</strong>
                  <p className="mb-0">{selectedSchedule.start_time} - {selectedSchedule.end_time}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Place</strong>
                  <p className="mb-0">{getBarangayName(selectedSchedule.barangay_id, selectedSchedule.custom_place)}</p>
                </Col>
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Venue</strong>
                  <p className="mb-0">{selectedSchedule.venue}</p>
                </Col>
              </Row>
              
              {/* Vaccination specific details */}
              {selectedSchedule.type === 'vaccination' && (
                <>
                  <Row className="mb-3">
  <Col md={12}>
    <strong style={{ fontSize: '0.9rem', color: '#666' }}>Total Capacity</strong>
    <p className="mb-0">
      <strong>{selectedSchedule.current_registrations || 0}</strong> / {getTotalVaccineShots(selectedSchedule)} total vaccine shots available
    </p>
  </Col>
</Row>
                  <Row className="mb-3">
  <Col md={12}>
    <strong style={{ fontSize: '0.9rem', color: '#666' }} className="d-block mb-2">Available Vaccines</strong>
    <div style={{ border: '2px solid #dee2e6', borderRadius: '8px', padding: '1rem', background: '#f8f9fa' }}>
      {loadingVaccineCounts ? (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" variant="primary" />
          <p className="text-muted mt-2 mb-0">Loading vaccine registration counts...</p>
        </div>
      ) : (
        getVaccineDetails(selectedSchedule).map((vaccine, idx) => (
          <div key={idx} style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '6px', marginBottom: idx !== getVaccineDetails(selectedSchedule).length - 1 ? '0.75rem' : '0', border: '1px solid #e0e0e0' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>{vaccine.name}</strong>
                <span className="ms-2" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#6c757d', color: '#fff', borderRadius: '4px' }}>
                  {vaccine.species.toUpperCase()}
                </span>
              </div>
              <div className="text-end">
                <strong>{vaccine.registered}</strong>
                <small className="text-muted"> / {vaccine.limit} shots</small>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </Col>
</Row>
                </>
              )}

              {/* Microchip specific details */}
              {selectedSchedule.type === 'microchip' && (
                <>
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong style={{ fontSize: '0.9rem', color: '#666' }}>Capacity</strong>
                      <p className="mb-0">
                        <strong>{selectedSchedule.current_registrations || 0}</strong> / {selectedSchedule.max_capacity} pets
                      </p>
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong style={{ fontSize: '0.9rem', color: '#666' }}>Allowed Pet Types</strong>
                      <div className="d-flex gap-2 mt-2">
                        {selectedSchedule.pet_types_allowed && selectedSchedule.pet_types_allowed.length > 0 ? (
                          selectedSchedule.pet_types_allowed.map(type => (
                            <span key={type} style={{ fontSize: '0.85rem', textTransform: 'capitalize', padding: '0.4rem 0.8rem', background: '#6c757d', color: '#fff', borderRadius: '4px' }}>
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">All pet types</span>
                        )}
                      </div>
                    </Col>
                  </Row>
                </>
              )}
              
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          {selectedSchedule && (user?.role === 'super_admin' || user?.role === 'barangay_official') && (
            <Button
              onClick={() => { handleCloseViewModal(); loadAllRegistrations(selectedSchedule); }}
              className="border-0"
              style={{ background: '#ffc107', color: '#000', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700' }}
            >
              <i className="fas fa-users me-2"></i>View All Registrations
            </Button>
          )}
          <Button variant="secondary" onClick={handleCloseViewModal} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Schedule Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            {modalMode === 'edit' ? (
              <>
                <i className="fas fa-edit me-2"></i>
                Edit {getScheduleTypeLabel(formData.schedule_type)} Schedule
              </>
            ) : (
              <>
                <i className="fas fa-plus me-2"></i>
                Add New Event
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <Alert variant="danger" className="mb-3">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </Alert>
            )}

            {/* Event Type Selection - Only show in create mode */}
{modalMode === 'create' && (
  <Row className="mb-4">
    <Col md={12}>
      <Form.Group>
        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
          Event Type <span style={{ color: '#dc3545' }}>*</span>
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
          <div 
            onClick={() => setFormData({...formData, schedule_type: 'vaccination', barangay_id: ''})}
            style={{ 
              minWidth: '200px',
              flex: '0 0 auto',
              padding: '1.5rem', 
              border: formData.schedule_type === 'vaccination' ? '3px solid #ffc107' : '2px solid #dee2e6', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              background: formData.schedule_type === 'vaccination' ? '#fff9e6' : '#ffffff', 
              transition: 'all 0.3s' 
            }}
          >
            <img 
              src="/vaccine.png" 
              alt="Vaccination"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <i className="fas fa-syringe" style={{ fontSize: '2.5rem', color: '#ffc107', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Vaccination</div>
          </div>
          
          <div 
            onClick={() => setFormData({...formData, schedule_type: 'seminar', barangay_id: ''})}
            style={{ 
              minWidth: '200px',
              flex: '0 0 auto',
              padding: '1.5rem', 
              border: formData.schedule_type === 'seminar' ? '3px solid #6f42c1' : '2px solid #dee2e6', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              background: formData.schedule_type === 'seminar' ? '#f5f0ff' : '#ffffff', 
              transition: 'all 0.3s' 
            }}
          >
            <img 
              src="/seminar.png" 
              alt="Seminar"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <i className="fas fa-chalkboard-teacher" style={{ fontSize: '2.5rem', color: '#6f42c1', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Seminar</div>
          </div>
          
          <div 
            onClick={() => setFormData({...formData, schedule_type: 'sterilization', barangay_id: ''})}
            style={{ 
              minWidth: '200px',
              flex: '0 0 auto',
              padding: '1.5rem', 
              border: formData.schedule_type === 'sterilization' ? '3px solid #28a745' : '2px solid #dee2e6', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              background: formData.schedule_type === 'sterilization' ? '#e6f9e9' : '#ffffff', 
              transition: 'all 0.3s' 
            }}
          >
            <img 
              src="/sterilization.png" 
              alt="Sterilization"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <i className="fas fa-cut" style={{ fontSize: '2.5rem', color: '#28a745', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Sterilization</div>
          </div>
          <div
            onClick={() => {
              setFormData({...formData, schedule_type: 'microchip', barangay_id: ''});
              // Load microchip batch availability
              const microchipInvItem = inventory.find(i => i.item_type === 'microchip');
              if (microchipInvItem) loadBatchAvailability(microchipInvItem.id, selectedSchedule?.id || null);
            }}
            style={{
              minWidth: '200px', flex: '0 0 auto', padding: '1.5rem',
              border: formData.schedule_type === 'microchip' ? '3px solid #6c757d' : '2px solid #dee2e6',
              borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
              background: formData.schedule_type === 'microchip' ? '#f0f0f0' : '#ffffff',
              transition: 'all 0.3s'
            }}
          >
            <img src="/microchip.png" alt="Microchip"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <i className="fas fa-microchip" style={{ fontSize: '2.5rem', color: '#6c757d', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Microchip</div>
          </div>
          <div 
            onClick={() => setFormData({...formData, schedule_type: 'other', barangay_id: ''})}
            style={{ 
              minWidth: '200px',
              flex: '0 0 auto',
              padding: '1.5rem', 
              border: formData.schedule_type === 'other' ? '3px solid #343a40' : '2px solid #dee2e6', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              background: formData.schedule_type === 'other' ? '#e9ecef' : '#ffffff', 
              transition: 'all 0.3s' 
            }}
          >
            <img 
              src="/other.png" 
              alt="Other"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <i className="fas fa-calendar" style={{ fontSize: '2.5rem', color: '#343a40', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Other</div>
          </div>
        </div>
        
        <style>{`
          .event-type-scroll::-webkit-scrollbar {
            height: 8px;
          }
          .event-type-scroll::-webkit-scrollbar-track {
            background: #f8f9fa;
            border-radius: 10px;
          }
          .event-type-scroll::-webkit-scrollbar-thumb {
            background: #dee2e6;
            border-radius: 10px;
          }
          .event-type-scroll::-webkit-scrollbar-thumb:hover {
            background: #adb5bd;
          }
          @media (max-width: 768px) {
            .event-type-scroll > div {
              min-width: 110px !important;
              padding: 0.75rem 0.5rem !important;
            }
            .event-type-scroll > div img {
              width: 32px !important;
              height: 32px !important;
            }
            .event-type-scroll > div .fas {
              font-size: 1.8rem !important;
            }
            .event-type-scroll > div div {
              font-size: 0.8rem !important;
            }
          }
        `}</style>
      </Form.Group>
    </Col>
  </Row>
)}

            {/* Show form fields only if event type is selected (or in edit mode) */}
{(formData.schedule_type || modalMode === 'edit') && (
  <>
    <Row>
      <Col md={12}>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
            Location <span style={{ color: '#dc3545' }}>*</span>
          </Form.Label>
<Form.Select name="barangay_id" value={formData.barangay_id === 'other' ? 'other' : formData.barangay_id} onChange={(e) => { if (e.target.value === 'other') { setFormData({...formData, barangay_id: 'other', custom_place: ''}); } else { handleChange(e); } }} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
  <option value="" disabled>Select place</option>
  {barangays.map(barangay => (
    <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
  ))}
  <option value="other">Other</option>
</Form.Select>
{formData.barangay_id === 'other' && (
  <Form.Control type="text" name="custom_place" value={formData.custom_place || ''} onChange={handleChange} placeholder="Enter specific place..." required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6', marginTop: '0.5rem' }} />
)}
        </Form.Group>
      </Col>
    </Row>

    {/* Type of Event field for "other" schedule type */}
    {formData.schedule_type === 'other' && (
      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Type of Event <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="other_event_type"
              value={formData.other_event_type}
              onChange={handleChange}
              placeholder="e.g., Pet Adoption Drive, Pet Grooming Workshop, etc."
              required
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            />
            
          </Form.Group>
        </Col>
      </Row>
    )}

    <Row>
      <Col md={12}>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
            Event Title <span style={{ color: '#dc3545' }}>*</span>
          </Form.Label>
          <Form.Control type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Enter event title..." required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
        </Form.Group>
      </Col>
    </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Description</Form.Label>
                      <Form.Control 
  as="textarea" 
  rows={3} 
  name="description" 
  value={formData.description} 
  onChange={handleChange} 
  placeholder="Brief description of the event..." 
  maxLength={50}
  style={{ 
    borderRadius: '8px', 
    padding: '0.75rem', 
    border: '2px solid #dee2e6',
    resize: 'none'
  }} 
/>
<Form.Text className="text-muted">
  {formData.description.length}/50 characters
</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                        Date <span style={{ color: '#dc3545' }}>*</span>
                      </Form.Label>
                      <Form.Control type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleChange} min={getTomorrowDate()} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                        Start Time <span style={{ color: '#dc3545' }}>*</span>
                      </Form.Label>
                      <Form.Select name="start_time" value={formData.start_time} onChange={handleChange} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
                        <option value="">Select start time</option>
                        {Array.from({ length: 18 }, (_, i) => {
                          const totalMins = 8 * 60 + i * 30;
                          if (totalMins >= 16 * 60) return null;
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          const label = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                          return <option key={value} value={value}>{label}</option>;
                        })}
                      </Form.Select>
                      <Form.Text className="text-muted">8:00 AM – 5:00 PM only</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                        End Time <span style={{ color: '#dc3545' }}>*</span>
                      </Form.Label>
                      <Form.Select name="end_time" value={formData.end_time} onChange={handleChange} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
                        <option value="">Select end time</option>
                        {Array.from({ length: 19 }, (_, i) => {
                          const totalMins = 8 * 60 + (i + 1) * 30;
                          if (totalMins > 17 * 60) return null;
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          const label = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                          const [startH, startM] = (formData.start_time || '00:00').split(':').map(Number);
                          const startTotal = startH * 60 + startM;
                          if (totalMins <= startTotal + 30) return null;
                          return <option key={value} value={value}>{label}</option>;
                        }).filter(Boolean)}
                      </Form.Select>
                      <Form.Text className="text-muted">Min. 30 mins after start</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                                    <Col md={(formData.schedule_type === 'vaccination' || formData.schedule_type === 'microchip') ? 12 : 8}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                        Venue <span style={{ color: '#dc3545' }}>*</span>
                      </Form.Label>
                      <Form.Control type="text" name="venue" value={formData.venue} onChange={handleChange} placeholder="e.g., Barangay Hall" required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                    </Form.Group>
                  </Col>
                  {formData.schedule_type !== 'vaccination' && formData.schedule_type !== 'microchip' && (
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Max Capacity <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="max_capacity"
                          value={formData.max_capacity}
                          onChange={handleChange}
                          placeholder="Required"
                          min="1"
                          required
                          style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
                        />
                      </Form.Group>
                    </Col>
                  )}
                </Row>

                

                {/* Vaccination Pet Types Filter */}
                {formData.schedule_type === 'vaccination' && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Filter Vaccines by Pet Type</Form.Label>
                        <Form.Select value={filterVaccineSpecies} onChange={(e) => setFilterVaccineSpecies(e.target.value)} style={{borderRadius: '8px',
                            padding: '0.75rem',
                            border: '2px solid #dee2e6',
                            fontWeight: '500'
                          }}
                        >
                          <option value="all">All (Dog & Cat)</option>
                          <option value="dog">Dog</option>
                          <option value="cat">Cat</option>
                          </Form.Select>
        <Form.Text className="text-muted d-block mt-2">
          <i className="fas fa-info-circle me-1"></i>
          This filters which vaccines are shown below
        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Vaccination Vaccines */}
                {formData.schedule_type === 'vaccination' && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Available Vaccines & Shot Limits <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <div 
                          style={{
                            border: '2px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '1rem',
                            background: '#f8f9fa',
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}
                        >
                          {filteredVaccinationTypes.length === 0 ? (
                            <p className="text-muted mb-0">No vaccination items available in inventory</p>
                          ) : (
                            filteredVaccinationTypes.map(type => {
                            const invItem = type;
                            const stock = parseInt(type.current_stock);
                            const isChecked = formData.vaccination_types[type.id] !== undefined;
                            const batches = batchAllocations[type.id] || [];
                            const totalAllocated = batches.reduce((sum, b) => sum + (scheduleAllocations[b.id] || 0), 0);

                            return (
                              <div
                                key={type.id}
                                style={{
                                  marginBottom: '1rem',
                                  padding: '1rem',
                                  background: '#ffffff',
                                  borderRadius: '8px',
                                  border: isChecked ? '2px solid #ffc107' : '1px solid #dee2e6'
                                }}
                              >
                                <div className="d-flex align-items-start gap-3">
                                  <Form.Check
                                    type="checkbox"
                                    id={`vac-type-${type.id}`}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handleVaccinationTypeToggle(type.id, '');
                                      } else {
                                        handleVaccinationTypeToggle(type.id);
                                      }
                                    }}
                                    style={{ marginTop: '0.25rem' }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <label htmlFor={`vac-type-${type.id}`} style={{ cursor: 'pointer', marginBottom: '0.5rem', display: 'block' }}>
                                      <strong>{type.item_name || type.name || '—'}</strong>
                                      <span className="ms-2" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#6c757d', color: '#fff', borderRadius: '4px' }}>
                                        {(type.species || 'all').toUpperCase()}
                                      </span>
                                      {stock !== null && (
                                        <span className="ms-2" style={{
                                          fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px',
                                          background: stock === 0 ? '#dc3545' : stock <= 10 ? '#ffc107' : '#28a745',
                                          color: stock <= 10 && stock > 0 ? '#000' : '#fff'
                                        }}>
                                          {stock === 0 ? '⚠️ Out of Stock' : `📦 ${stock} total in stock`}
                                        </span>
                                      )}
                                      {type.description && (
                                        <small className="text-muted d-block mt-1">{type.description}</small>
                                      )}
                                    </label>

                                    {/* Batch selection — shown when vaccine is checked */}
                                    {isChecked && (
                                      <div style={{ marginTop: '0.75rem' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#555', marginBottom: '0.5rem' }}>
                                          <i className="fas fa-layer-group me-1" style={{ color: '#0d6efd' }} />
                                          Select Batches &amp; Quantities
                                          {totalAllocated > 0 && (
                                            <span className="ms-2" style={{ color: '#28a745', fontWeight: '700' }}>
                                              — {totalAllocated} shots allocated
                                            </span>
                                          )}
                                        </div>

                                        {loadingBatchAvailability && batches.length === 0 ? (
                                          <div style={{ fontSize: '0.8rem', color: '#aaa', padding: '0.5rem' }}>
                                            <i className="fas fa-spinner fa-spin me-1" /> Loading batches...
                                          </div>
                                        ) : batches.length === 0 ? (
                                          <div style={{ fontSize: '0.8rem', color: '#dc3545', padding: '0.5rem', background: '#fff5f5', borderRadius: '6px' }}>
                                            <i className="fas fa-exclamation-triangle me-1" /> No batches available for this vaccine.
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {batches.map(batch => {
                                              const isBatchSelected = scheduleAllocations[batch.id] !== undefined;
                                              const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
if (isExpired) return null;
const availableQty = batch.available_qty;

return (
  <div
    key={batch.id}
    style={{
      padding: '0.6rem 0.75rem',
      borderRadius: '6px',
      border: isBatchSelected ? '2px solid #0d6efd' : '1px solid #dee2e6',
      background: isBatchSelected ? 'rgba(13,110,253,0.04)' : '#fafafa',
      opacity: availableQty === 0 && !isBatchSelected ? 0.5 : 1,
    }}
  >
                                                  <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                                                    <Form.Check
                                                      type="checkbox"
                                                      id={`batch-${batch.id}-vac-${type.id}`}
                                                      checked={isBatchSelected}
                                                      disabled={availableQty === 0 && !isBatchSelected}
                                                      onChange={() => handleBatchToggle(batch.id, type.id)}
                                                    />
                                                    <label htmlFor={`batch-${batch.id}-vac-${type.id}`} style={{ cursor: 'pointer', flex: 1, marginBottom: 0 }}>
                                                      <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                                      {/* expired batches are filtered server-side */}
                                                      <span className="ms-2" style={{ fontSize: '0.75rem', color: availableQty === 0 ? '#dc3545' : availableQty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>
                                                        {availableQty} available
                                                      </span>
                                                      {batch.expiration_date && !isExpired && (
                                                        <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>
                                                          · exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                      )}
                                                    </label>

                                                    {isBatchSelected && (
                                                      <div className="d-flex align-items-center gap-1">
                                                        <Form.Control
                                                          type="number"
                                                          min="1"
                                                          max={availableQty}
                                                          value={scheduleAllocations[batch.id] || ''}
                                                          onChange={(e) => handleBatchAllocationChange(batch.id, e.target.value, type.id)}
                                                          placeholder={`Max ${availableQty}`}
                                                          style={{ width: '90px', padding: '0.25rem 0.4rem', fontSize: '0.82rem', borderRadius: '5px', border: '2px solid #0d6efd' }}
                                                        />
                                                        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>shots</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                          )}
                        </div>
                        <Form.Text className="text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Check vaccines and enter available shot quantities
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Seminar Fields */}
                {formData.schedule_type === 'seminar' && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Speaker/Resource Person
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="speaker"
                          value={formData.speaker}
                          onChange={handleChange}
                          placeholder="e.g., Dr. Juan Dela Cruz, DVM"
                          style={{
                            borderRadius: '8px',
                            padding: '0.75rem',
                            border: '2px solid #dee2e6'
                          }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Sterilization Fields */}
                {formData.schedule_type === 'sterilization' && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Available for Pet Types <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <div 
                          style={{
                            border: '2px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '1rem',
                            background: '#f8f9fa'
                          }}
                        >
                          <Form.Check
                            type="checkbox"
                            id="sterilization-dog"
                            label={
                              <span>
                                <strong>Dog</strong>
                                <small className="text-muted d-block">
                                  Spay/Neuter services for dogs
                                </small>
                              </span>
                            }
                            checked={formData.sterilization_species.includes('dog')}
                            onChange={() =>handleSterilizationSpeciesToggle('dog')}
                            className="mb-2"
                          />
                          <Form.Check
                            type="checkbox"
                            id="sterilization-cat"
                            label={
                              <span>
                                <strong>Cat</strong>
                                <small className="text-muted d-block">
                                  Spay/Neuter services for cats
                                </small>
                              </span>
                            }
                            checked={formData.sterilization_species.includes('cat')}
                            onChange={() => handleSterilizationSpeciesToggle('cat')}
                            className="mb-2"
                          />
                          
                        </div>
                        <Form.Text className="text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Select all pet types that can avail sterilization
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
                {/* Microchip Fields */}
                {formData.schedule_type === 'microchip' && (
                  <Row>
                    <Col md={12}>
                      {/* Pet Types */}
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Available for Pet Types <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <div style={{ border: '2px solid #dee2e6', borderRadius: '8px', padding: '1rem', background: '#f8f9fa' }}>
                          {['dog', 'cat'].map(species => (
                            <Form.Check
                              key={species}
                              type="checkbox"
                              id={`microchip-${species}`}
                              className="mb-2"
                              label={
                                <span>
                                  <strong style={{ textTransform: 'capitalize' }}>{species}</strong>
                                  <small className="text-muted d-block">Microchipping for {species}s</small>
                                </span>
                              }
                              checked={formData.pet_types_allowed.includes(species)}
                              onChange={() => handlePetTypesToggle(species)}
                            />
                          ))}
                        </div>
                      </Form.Group>

                      {/* Batch Selection */}
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Select Batch & Quantity <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        {(() => {
                          const microchipItem = getMicrochipInventoryItem();
                          if (!microchipItem) return (
                            <div style={{ fontSize: '0.85rem', color: '#dc3545', padding: '0.75rem', background: '#fff5f5', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
                              <i className="fas fa-exclamation-triangle me-1" /> No microchip inventory found.
                            </div>
                          );
                          const batches = batchAllocations[microchipItem.id] || [];
                          const totalMicrochipAllocated = batches.reduce((sum, b) => sum + (scheduleAllocations[b.id] || 0), 0);
                          return (
                            <div style={{ border: '2px solid #dee2e6', borderRadius: '8px', padding: '1rem', background: '#f8f9fa' }}>
                              <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.6rem', fontWeight: '600' }}>
                                <i className="fas fa-layer-group me-1" style={{ color: '#6c757d' }} />
                                Available Batches
                                {totalMicrochipAllocated > 0 && (
                                  <span className="ms-2" style={{ color: '#28a745' }}>— {totalMicrochipAllocated} units allocated</span>
                                )}
                              </div>
                              {loadingBatchAvailability && batches.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                  <i className="fas fa-spinner fa-spin me-1" /> Loading batches...
                                </div>
                              ) : batches.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: '#dc3545', padding: '0.5rem', background: '#fff5f5', borderRadius: '6px' }}>
                                  <i className="fas fa-exclamation-triangle me-1" /> No batches available for microchips.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {batches.map(batch => {
                                    const isBatchSelected = scheduleAllocations[batch.id] !== undefined;
                                    const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
if (isExpired) return null;
const availableQty = batch.available_qty;
return (
  <div
    key={batch.id}
    style={{
      padding: '0.6rem 0.75rem',
      borderRadius: '6px',
      border: isBatchSelected ? '2px solid #6c757d' : '1px solid #dee2e6',
      background: isBatchSelected ? 'rgba(108,117,125,0.06)' : '#fafafa',
      opacity: availableQty === 0 && !isBatchSelected ? 0.5 : 1,
    }}
  >
                                        <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                                          <Form.Check
                                            type="checkbox"
                                            id={`microchip-batch-${batch.id}`}
                                            checked={isBatchSelected}
                                            disabled={availableQty === 0 && !isBatchSelected}
                                            onChange={() => {
                                              setScheduleAllocations(prev => {
                                                const next = { ...prev };
                                                if (next[batch.id] !== undefined) {
                                                  delete next[batch.id];
                                                } else {
                                                  next[batch.id] = 0;
                                                }
                                                // Update max_capacity to total allocated
                                                const total = Object.entries(next)
                                                  .filter(([bid]) => batches.find(b => b.id === parseInt(bid)))
                                                  .reduce((sum, [, qty]) => sum + (qty || 0), 0);
                                                setFormData(f => ({ ...f, max_capacity: total > 0 ? String(total) : '' }));
                                                return next;
                                              });
                                            }}
                                          />
                                          <label htmlFor={`microchip-batch-${batch.id}`} style={{ cursor: 'pointer', flex: 1, marginBottom: 0 }}>
                                            <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                            {/* expired batches are filtered server-side */}
                                            <span className="ms-2" style={{ fontSize: '0.75rem', color: availableQty === 0 ? '#dc3545' : availableQty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>
                                              {availableQty} available
                                            </span>
                                            {batch.expiration_date && !isExpired && (
                                              <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>
                                                · exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                              </span>
                                            )}
                                          </label>
                                          {isBatchSelected && (
                                            <div className="d-flex align-items-center gap-1">
                                              <Form.Control
                                                type="number"
                                                min="1"
                                                max={availableQty}
                                                value={scheduleAllocations[batch.id] || ''}
                                                onChange={(e) => {
                                                  let val = e.target.value === '' ? 0 : Math.max(0, Math.min(parseInt(e.target.value) || 0, availableQty));
                                                  setScheduleAllocations(prev => {
                                                    const next = { ...prev, [batch.id]: val };
                                                    // Auto-update max_capacity = sum of all microchip batch allocations
                                                    const total = Object.entries(next)
                                                      .filter(([bid]) => batches.find(b => b.id === parseInt(bid)))
                                                      .reduce((sum, [, qty]) => sum + (qty || 0), 0);
                                                    setFormData(f => ({ ...f, max_capacity: total > 0 ? String(total) : '' }));
                                                    return next;
                                                  });
                                                }}
                                                placeholder={`Max ${availableQty}`}
                                                style={{ width: '90px', padding: '0.25rem 0.4rem', fontSize: '0.82rem', borderRadius: '5px', border: '2px solid #6c757d' }}
                                              />
                                              <span style={{ fontSize: '0.72rem', color: '#aaa' }}>pcs</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {totalMicrochipAllocated > 0 && (
                                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(108,117,125,0.08)', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', color: '#495057' }}>
                                  <i className="fas fa-microchip me-1" /> Total capacity set to: <strong>{totalMicrochipAllocated} pcs</strong>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <Form.Text className="text-muted mt-1 d-block">
                          <i className="fas fa-info-circle me-1" />
                          Max capacity is auto-set from your batch selections
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
                {/* Other Event Fields */}
{formData.schedule_type === 'other' && (
  <>
    
    <Row>
      <Col md={12}>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
            Available for Pet Types (Optional)
          </Form.Label>
          <div 
            style={{
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              padding: '1rem',
              background: '#f8f9fa'
            }}
          >
            <Form.Check
              type="checkbox"
              id="other-dog"
              label={
                <span>
                  <strong>Dog</strong>
                  <small className="text-muted d-block">
                    This event accepts dogs
                  </small>
                </span>
              }
              checked={formData.other_pet_types.includes('dog')}
              onChange={() => handleOtherPetTypesToggle('dog')}
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              id="other-cat"
              label={
                <span>
                  <strong>Cat</strong>
                  <small className="text-muted d-block">
                    This event accepts cats
                  </small>
                </span>
              }
              checked={formData.other_pet_types.includes('cat')}
              onChange={() => handleOtherPetTypesToggle('cat')}
              className="mb-2"
            />
            
          </div>
          <Form.Text className="text-muted">
            <i className="fas fa-info-circle me-1"></i>
            Leave unchecked if this event is not pet-specific
          </Form.Text>
        </Form.Group>
      </Col>
    </Row>
  </>
)}
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
            <Button 
              variant="secondary" 
              onClick={handleCloseModal} 
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
  type="button"
  className="border-0"
  disabled={
    formLoading ||
    (modalMode === 'create' && !formData.schedule_type) ||
    !formData.barangay_id ||
    (formData.barangay_id === 'other' && !formData.custom_place?.trim()) ||
    !formData.title?.trim() ||
    !formData.scheduled_date ||
    !formData.start_time ||
    !formData.end_time ||
    !formData.venue?.trim() ||
    (formData.schedule_type === 'vaccination' && (
      Object.keys(formData.vaccination_types).length === 0 ||
      Object.values(formData.vaccination_types).some(limit => !limit || parseInt(limit) <= 0)
    )) ||
    (formData.schedule_type === 'sterilization' && (
      formData.sterilization_species.length === 0 ||
      !formData.max_capacity
    )) ||
    (formData.schedule_type === 'seminar' && !formData.max_capacity) ||
    (formData.schedule_type === 'microchip' && (
      formData.pet_types_allowed.length === 0 ||
      !formData.max_capacity
    )) ||
    (formData.schedule_type === 'other' && !formData.other_event_type?.trim())
  }
  onClick={(e) => {
    e.preventDefault();
    if (modalMode === 'edit') {
      setFormLoading(true);
      handleSubmit({ preventDefault: () => {} });
      return;
    }
    setShowModal(false);
    setShowConfirmScheduleModal(true);
  }}
  style={{
    background: formLoading ? '#6c757d' : '#000000',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontWeight: '600'
  }}
  onMouseOver={(e) => {
    if (!formLoading) e.currentTarget.style.background = '#333333';
  }}
  onMouseOut={(e) => {
    if (!formLoading) e.currentTarget.style.background = '#000000';
  }}
>
  {formLoading ? (
    <>
      <Spinner size="sm" animation="border" className="me-2" />
      {modalMode === 'edit' ? 'Updating...' : 'Creating...'}
    </>
  ) : (
    <>
      <i className={`fas fa-${modalMode === 'edit' ? 'save' : 'eye'} me-2`}></i>
      {modalMode === 'edit' ? 'Update Schedule' : 'Review & Confirm'}
    </>
  )}
</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header 
          closeButton
          style={{
            background: '#f8f9fa',
            borderBottom: '2px solid #dee2e6'
          }}
        >
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-exclamation-triangle text-danger me-2"></i>
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {scheduleToDelete && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to delete this schedule?
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
                    {scheduleToDelete.type === 'vaccination' && <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</>}
                    {scheduleToDelete.type === 'seminar' && <><i className="fas fa-chalkboard-teacher me-1" style={{ color: '#6f42c1' }}></i>Seminar</>}
                    {scheduleToDelete.type === 'sterilization' && <><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</>}
                    {scheduleToDelete.type === 'microchip' && <><i className="fas fa-microchip me-1" style={{ color: '#6c757d' }}></i>Microchip</>}
                  </span>
                </div>
                <strong style={{ fontSize: '1.1rem' }}>{scheduleToDelete.title}</strong>
                <br />
                <small className="text-muted">
                  <i className="fas fa-map-marker-alt me-1"></i>
                  {getBarangayName(scheduleToDelete.barangay_id)} • {new Date(scheduleToDelete.scheduled_date).toLocaleDateString()}
                </small>
              </div>
              <Alert variant="warning" className="mt-3 mb-0">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Warning:</strong> This action cannot be undone.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteLoading}
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
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
            style={{
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontWeight: '600'
            }}
          >
            {deleteLoading ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <i className="fas fa-trash me-2"></i>
                Delete Schedule
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>


    {/* ── Review & Confirm Schedule Modal ── */}
<Modal show={showConfirmScheduleModal} onHide={() => setShowConfirmScheduleModal(false)} centered style={{ zoom: '0.75' }}>
  <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', borderBottom: '2px solid #ffc107' }}>
    <Modal.Title style={{ fontWeight: '700', color: '#333' }}>
      <i className="fas fa-clipboard-check me-2" style={{ color: '#ffc107' }} />
      Review Event Before Saving
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '2rem' }}>
    <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
      Please review the event details before creating.
    </p>

    {/* Event Type Banner */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      background: formData.schedule_type === 'vaccination' ? 'rgba(255,193,7,0.1)'
        : formData.schedule_type === 'seminar' ? 'rgba(111,66,193,0.1)'
        : formData.schedule_type === 'sterilization' ? 'rgba(40,167,69,0.1)'
        : formData.schedule_type === 'microchip' ? 'rgba(108,117,125,0.1)'
        : 'rgba(52,58,64,0.1)',
      border: `1.5px solid ${
        formData.schedule_type === 'vaccination' ? 'rgba(255,193,7,0.3)'
        : formData.schedule_type === 'seminar' ? 'rgba(111,66,193,0.3)'
        : formData.schedule_type === 'sterilization' ? 'rgba(40,167,69,0.3)'
        : formData.schedule_type === 'microchip' ? 'rgba(108,117,125,0.3)'
        : 'rgba(52,58,64,0.3)'}`,
      borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem'
    }}>
      <img
        src={
          formData.schedule_type === 'vaccination' ? '/vaccine.png'
          : formData.schedule_type === 'seminar' ? '/seminar.png'
          : formData.schedule_type === 'sterilization' ? '/sterilization.png'
          : formData.schedule_type === 'microchip' ? '/microchip.png'
          : '/other.png'
        }
        alt={formData.schedule_type}
        style={{ width: '36px', height: '36px', objectFit: 'contain' }}
        onError={e => e.target.style.display = 'none'}
      />
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', marginBottom: '2px' }}>Event Type</div>
        <div style={{ fontWeight: '700', color: '#333' }}>
          {formData.schedule_type === 'other' ? (formData.other_event_type || 'Other') : getScheduleTypeLabel(formData.schedule_type)}
        </div>
      </div>
    </div>

    {/* Details */}
    <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem', border: '1px solid #e9ecef' }}>
      {[
        { icon: 'fa-map-marker-alt', label: 'Place', value: formData.barangay_id === 'other' ? (formData.custom_place || '—') : (barangays.find(b => String(b.id) === String(formData.barangay_id))?.name || '—') },
        { icon: 'fa-tag', label: 'Title', value: formData.title || '—' },
        { icon: 'fa-align-left', label: 'Description', value: formData.description || 'Not specified' },
        { icon: 'fa-calendar', label: 'Date', value: formData.scheduled_date ? new Date(formData.scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
        { icon: 'fa-clock', label: 'Time', value: formData.start_time && formData.end_time ? `${formData.start_time} – ${formData.end_time}` : '—' },
        { icon: 'fa-building', label: 'Venue', value: formData.venue || '—' },
        ...(formData.schedule_type === 'seminar' ? [
          { icon: 'fa-user-tie', label: 'Speaker', value: formData.speaker || 'Not specified' },
          { icon: 'fa-users', label: 'Max Capacity', value: formData.max_capacity || '—' },
        ] : []),
        ...(formData.schedule_type === 'sterilization' ? [
          { icon: 'fa-paw', label: 'Pet Types', value: formData.sterilization_species.length > 0 ? formData.sterilization_species.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : '—' },
          { icon: 'fa-users', label: 'Max Capacity', value: formData.max_capacity || '—' },
        ] : []),
        ...(formData.schedule_type === 'microchip' ? [
          { icon: 'fa-paw', label: 'Pet Types', value: formData.pet_types_allowed.length > 0 ? formData.pet_types_allowed.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : '—' },
          { icon: 'fa-users', label: 'Max Capacity (from batches)', value: formData.max_capacity || '—' },
        ] : []),
        ...(formData.schedule_type === 'other' ? [
          { icon: 'fa-paw', label: 'Pet Types', value: formData.other_pet_types.length > 0 ? formData.other_pet_types.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : 'Not pet-specific' },
          { icon: 'fa-users', label: 'Max Capacity', value: formData.max_capacity || '—' },
        ] : []),
        ...(formData.schedule_type === 'vaccination' ? [
          { icon: 'fa-syringe', label: 'Vaccines & Shots', value: Object.keys(formData.vaccination_types).length > 0
            ? Object.entries(formData.vaccination_types).map(([id, limit]) => {
                const inv = inventory.find(i => String(i.id) === String(id));
                return `${inv?.item_name || `Vaccine #${id}`}: ${limit} shots`;
              }).join(' | ')
            : '—'
          },
        ] : []),
      ].map((item, i, arr) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: i < arr.length - 1 ? '0.75rem' : 0, marginBottom: i < arr.length - 1 ? '0.75rem' : 0, borderBottom: i < arr.length - 1 ? '1px solid #e9ecef' : 'none' }}>
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
    <Button variant="secondary" onClick={() => setShowConfirmScheduleModal(false)} disabled={formLoading}
      style={{ borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
      <i className="fas fa-arrow-left me-2" />Back to Edit
    </Button>
    <Button disabled={formLoading} className="border-0"
      onClick={async () => {
        if (formLoading) return;
        setFormLoading(true);
        setShowConfirmScheduleModal(false);
        await handleSubmit({ preventDefault: () => {} });
      }}
      style={{ background: formLoading ? '#6c757d' : '#000000', color: '#ffffff', borderRadius: '10px', padding: '0.75rem 1.75rem', fontWeight: '700', transition: 'all 0.3s' }}
      onMouseOver={e => { if (!formLoading) e.currentTarget.style.background = '#333'; }}
      onMouseOut={e => { if (!formLoading) e.currentTarget.style.background = '#000'; }}
    >
      {formLoading
        ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</>
        : <><i className="fas fa-save me-2" />Confirm & Create</>}
    </Button>
  </Modal.Footer>
</Modal>
      {/* All Registrations Modal */}
      <Modal show={showRegistrationsModal} onHide={() => setShowRegistrationsModal(false)} size="lg" centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-users me-2" style={{ color: '#ffc107' }}></i>
            All Registrations
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.5rem' }}>
          <InputGroup className="mb-3">
            <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by owner or pet name..."
              value={registrationsSearchTerm}
              onChange={(e) => setRegistrationsSearchTerm(e.target.value)}
              style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}
            />
          </InputGroup>

          {loadingRegistrations ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="warning" />
              <p className="mt-3 text-muted">Loading registrations...</p>
            </div>
          ) : registrationsData.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-users text-muted mb-3" style={{ fontSize: '3rem', color: '#e0e0e0' }}></i>
              <p className="text-muted">No registrations found.</p>
            </div>
          ) : (() => {
            const term = registrationsSearchTerm.toLowerCase();
            // Determine type from first item
            const isPetBased = registrationsData.length > 0 && registrationsData[0].pets !== undefined;

            if (!isPetBased) {
              // Flat list for seminar / other
              const filtered = registrationsData.filter(r =>
                !term || r.owner_name?.toLowerCase().includes(term)
              );
              return (
                <Table hover size="sm" style={{ marginBottom: 0 }}>
                  <thead style={{ background: '#f8f9fa' }}>
                    <tr>
                      <th style={{ fontWeight: '600', padding: '0.75rem' }}>#</th>
                      <th style={{ fontWeight: '600', padding: '0.75rem' }}>Owner Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="2" className="text-center text-muted py-3">No results found.</td></tr>
                    ) : filtered.map((r, idx) => (
                      <tr key={r.registration_id || idx}>
                        <td style={{ padding: '0.75rem', color: '#888' }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.first_name || r.last_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              );
            }

            // Grouped list for vaccination / microchip / sterilization
            const filtered = registrationsData.filter(r =>
              !term ||
              r.owner_name?.toLowerCase().includes(term) ||
              r.pets?.some(p => p.pet_name?.toLowerCase().includes(term))
            );
            return (
              <div>
                {filtered.length === 0 ? (
                  <p className="text-center text-muted py-3">No results found.</p>
                ) : filtered.map((owner, idx) => {
                  const isExpanded = !!expandedOwners[owner.user_id];
                  return (
                    <div key={owner.user_id || idx} style={{ border: '1px solid #dee2e6', borderRadius: '10px', marginBottom: '0.75rem', overflow: 'hidden' }}>
                      <div style={{ padding: '0.85rem 1rem', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{owner.first_name && owner.last_name ? `${owner.first_name} ${owner.last_name}` : owner.first_name || owner.last_name || `Owner #${owner.user_id}`}</strong>
                          <span className="ms-2" style={{ fontSize: '0.8rem', color: '#888' }}>{owner.pets?.length || 0} pet(s)</span>
                        </div>
                        <button
                          onClick={() => setExpandedOwners(prev => ({ ...prev, [owner.user_id]: !prev[owner.user_id] }))}
                          style={{ background: isExpanded ? '#6c757d' : '#ffc107', color: isExpanded ? '#fff' : '#000', border: 'none', borderRadius: '6px', padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <i className={`fas fa-${isExpanded ? 'eye-slash' : 'eye'} me-1`}></i>
                          {isExpanded ? 'Hide Pets' : 'View Pets'}
                        </button>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '0.5rem 1rem 0.75rem' }}>
                          {owner.pets?.map((pet, pIdx) => (
                            <div key={pet.pet_id || pIdx} style={{ padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '6px', marginTop: '0.4rem', border: '1px solid #e9ecef', fontSize: '0.88rem' }}>
                              <i className="fas fa-paw me-2" style={{ color: '#ffc107' }}></i>
                              <strong>{pet.pet_name}</strong>
                              {pet.species && <span className="ms-2" style={{ fontSize: '0.75rem', background: '#6c757d', color: '#fff', borderRadius: '4px', padding: '0.15rem 0.4rem' }}>{pet.species.toUpperCase()}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1rem 1.5rem' }}>
          <small className="text-muted me-auto">{registrationsData.length} registered</small>
          <Button variant="secondary" onClick={() => setShowRegistrationsModal(false)} style={{ borderRadius: '8px', fontWeight: '600' }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

    </>
  );
};

export default Schedule;