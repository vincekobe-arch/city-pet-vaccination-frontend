import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { scheduleAPI, petAPI, vaccinationAPI, inventoryAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import VerifyAccountModal from '../owner/VerifyAccountModal';

const ownerAPI = {
  getByUserId: (userId) => api.get(`/owners/user/${userId}`),
};




const VERIFICATION_CONFIG = {
  not_verified:  { label: 'Not Verified',   color: '#dc3545', icon: 'fa-times-circle' },
  pending:       { label: 'Pending Review', color: '#fd7e14', icon: 'fa-hourglass-half' },
  semi_verified: { label: 'Semi Verified',  color: '#0d6efd', icon: 'fa-shield-alt' },
  fully_verified:{ label: 'Fully Verified', color: '#198754', icon: 'fa-check-circle' },
};

const WaveDots = ({ color = '#000000' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '1rem' }}>
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
  </span>
);

const OwnerSchedule = () => {
  const [vaccinationSchedules, setVaccinationSchedules] = useState([]);
const [seminarSchedules, setSeminarSchedules] = useState([]);
const [sterilizationSchedules, setSterilizationSchedules] = useState([]);
const [otherSchedules, setOtherSchedules] = useState([]);
const [myPets, setMyPets] = useState([]);
const [vaccinationTypes, setVaccinationTypes] = useState([]);
const [dewormingSchedules, setDewormingSchedules] = useState([]);
const [microchipSchedules, setMicrochipSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBarangay, setSelectedBarangay] = useState('all');
  const [barangays, setBarangays] = useState([]);
  const [filterRegistration, setFilterRegistration] = useState('all');
  const [showConfirmRegistrationModal, setShowConfirmRegistrationModal] = useState(false);
  const [lastRegistrationData, setLastRegistrationData] = useState(null);
const [showDropdown, setShowDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState(null);
  const [vaccineRegistrationCounts, setVaccineRegistrationCounts] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  
  
  
  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleType, setScheduleType] = useState('');
  const [registrationData, setRegistrationData] = useState({
    pets_registered: [],
    special_requests: '',
    notes: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
const [floatingSuccess, setFloatingSuccess] = useState('');
  const [compatiblePets, setCompatiblePets] = useState([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [petToCancel, setPetToCancel] = useState(null);
  const [currentRegistrations, setCurrentRegistrations] = useState([]);
  const [vaccineToCancel, setVaccineToCancel] = useState(null);
  const [selectedVaccinesToCancel, setSelectedVaccinesToCancel] = useState({});
  const [showVaccinationConfirmModal, setShowVaccinationConfirmModal] = useState(false);
  const [pendingVaccinationSubmit, setPendingVaccinationSubmit] = useState(null);
  const [showRequirementsReminderModal, setShowRequirementsReminderModal] = useState(false);

  // Verification states
  const [ownerProfile, setOwnerProfile]       = useState(null);
  const [verifLoading, setVerifLoading]       = useState(true);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  

  useEffect(() => {
    loadOwnerProfile();
    loadData();
  }, []);

  const loadOwnerProfile = async () => {
    try {
      setVerifLoading(true);
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

  const isVerified = () =>
    ownerProfile?.verification_status === 'fully_verified' ||
    ownerProfile?.verification_status === 'semi_verified';

  const handleOpenVerifyModal = () => {
    setShowVerifyModal(true);
  };

  const styles = `
    .dashboard-page {
      zoom: 0.75;
    }
    @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .dashboard-page { zoom: 1; } }

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
    @media (max-width: 768px) {
      .sched-page-title { font-size: 1.5rem !important; }
      .sched-tab-btn {
        padding: 0.5rem 0.6rem !important;
        font-size: 0.72rem !important;
        min-width: unset !important;
        border-radius: 8px !important;
        gap: 0.25rem !important;
      }
      .sched-tab-btn span:first-of-type { display: none !important; }
      .sched-tab-count { font-size: 0.68rem !important; }
      .sched-card-header { padding: 0.75rem 3rem 0.75rem 0.75rem !important; }
      .sched-card-header h5 { font-size: 0.9rem !important; }
      .sched-card-body { padding: 0.85rem !important; }
      .sched-card-body > div { margin-bottom: 0.75rem !important; padding-bottom: 0.75rem !important; }
      .sched-card-label { font-size: 0.65rem !important; }
      .sched-card-value { font-size: 0.85rem !important; }
      .sched-pagination span,
      .sched-pagination button {
        font-size: 0.75rem !important;
        padding: 0.35rem 0.55rem !important;
        min-width: 32px !important;
      }
      /* Tab row wraps on mobile */
      .sched-tab-row {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 0.4rem !important;
      }
      /* Filter row stacks on mobile */
      .sched-filter-row .col-md-4,
      .sched-filter-row .col-md-8 {
        width: 100% !important;
        max-width: 100% !important;
        flex: 0 0 100% !important;
      }
      .sched-filter-row .col-md-8 {
        margin-top: 0.5rem !important;
        text-align: left !important;
      }
      /* Modal responsiveness */
      .modal-body { padding: 1rem !important; }
      .modal-footer { padding: 0.75rem 1rem !important; }
      /* Card grid full width on mobile */
      .sched-card-col {
        width: 100% !important;
        max-width: 100% !important;
        flex: 0 0 100% !important;
      }
    }
    /* ---------------- Calendar page ---------------- */
    @keyframes evIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes evPop { 0% { transform: scale(0.85); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }
    @keyframes evFade { from { opacity: 0; } to { opacity: 1; } }
    .ev-anim { animation: evIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .ev-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; padding: 1.1rem; box-shadow: 0 1px 3px rgba(16,24,40,0.04); }

    .ev-req-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.55rem 1rem; border-radius: 10px; border: 1px solid rgba(224,168,0,0.35); background: rgba(255,193,7,0.08); color: #8a6700; font-weight: 600; font-size: 0.85rem; transition: background 0.2s ease, transform 0.2s ease; }
    .ev-req-btn:hover { background: rgba(255,193,7,0.16); transform: translateY(-1px); }

    .ev-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.9rem; }
    .ev-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid #e9ecef; background: #fff; color: #1f2328; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; transition: background 0.15s ease, border-color 0.15s ease; }
    .ev-icon-btn:hover { background: #f6f7f9; border-color: #dfe3e8; }
    .ev-link { border: none; background: none; padding: 0; color: #0d6efd; font-size: 0.78rem; font-weight: 600; }
    .ev-link:hover { text-decoration: underline; }

    .ev-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .ev-cal-week { margin-bottom: 4px; }
    .ev-cal-week > div { text-align: center; font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.25rem 0; }
    .ev-cal-grid:not(.ev-cal-week) { animation: evFade 0.3s ease-out; }
    .ev-day { position: relative; aspect-ratio: 1 / 1; border: none; border-radius: 10px; background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: #1f2328; font-size: 0.85rem; font-weight: 500; transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease; }
    .ev-day:hover { background: #f3f4f6; }
    .ev-day.out { color: #c4c9d0; }
    .ev-day.has { font-weight: 700; background: #fafbfc; }
    .ev-day.has:hover { background: #f1f3f5; transform: translateY(-1px); }
    .ev-day.today .num { box-shadow: inset 0 0 0 1.5px #e0a800; border-radius: 50%; width: 1.7em; height: 1.7em; display: inline-flex; align-items: center; justify-content: center; }
    .ev-day.selected { background: #1f2328 !important; color: #fff !important; animation: evPop 0.3s ease-out; }
    .ev-day.selected.today .num { box-shadow: inset 0 0 0 1.5px #ffc107; }
    .ev-day .dots { display: flex; gap: 2px; height: 5px; }
    .ev-day .dots i { width: 5px; height: 5px; border-radius: 50%; display: block; }
    .ev-cal-foot { border-top: 1px solid #eef0f3; margin-top: 0.85rem; padding-top: 0.75rem; min-height: 2.2rem; }
    .ev-legend { display: flex; flex-wrap: wrap; gap: 0.35rem 0.85rem; margin-top: 0.65rem; }
    .ev-legend span { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; color: #6b7280; }
    .ev-legend i { width: 8px; height: 8px; border-radius: 50%; display: block; }

    .ev-chips { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.4rem; scrollbar-width: thin; }
    .ev-chip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.45rem 0.8rem; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; color: #4b5563; font-size: 0.82rem; font-weight: 600; transition: all 0.2s ease; }
    .ev-chip i { color: var(--c); font-size: 0.75rem; transition: color 0.2s ease; }
    .ev-chip .count { font-size: 0.72rem; background: #f3f4f6; color: #6b7280; border-radius: 999px; padding: 0.05rem 0.45rem; transition: all 0.2s ease; }
    .ev-chip:hover { border-color: var(--c); color: #1f2328; }
    .ev-chip.active { background: var(--c); border-color: var(--c); color: #fff; box-shadow: 0 4px 12px rgba(16,24,40,0.12); }
    .ev-chip.active i { color: #fff; }
    .ev-chip.active .count { background: rgba(255,255,255,0.25); color: #fff; }
    .ev-select { position: relative; }
    .ev-select > i { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.75rem; pointer-events: none; z-index: 1; }
    .ev-select .form-select { padding: 0.5rem 2rem 0.5rem 2rem; border-radius: 10px; border: 1px solid #e5e7eb; font-size: 0.85rem; }
    .ev-select .form-select:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }

    .ev-group { margin-bottom: 1rem; }
    .ev-group-head { font-size: 0.78rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0.25rem 0 0.5rem 0.25rem; display: flex; align-items: center; gap: 0.5rem; }
    .ev-today-tag { text-transform: none; letter-spacing: 0; font-size: 0.7rem; color: #198754; background: rgba(25,135,84,0.1); padding: 0.1rem 0.5rem; border-radius: 999px; }

    .ev-card { display: flex; align-items: stretch; gap: 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid var(--c); border-radius: 12px; padding: 1rem; margin-bottom: 0.65rem; transition: box-shadow 0.25s ease, transform 0.25s ease; }
    .ev-card:hover { box-shadow: 0 10px 26px rgba(16,24,40,0.08); transform: translateY(-2px); }
    .ev-date { flex-shrink: 0; width: 64px; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.5rem 0; line-height: 1.1; }
    .ev-date .m { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--c); letter-spacing: 0.06em; }
    .ev-date .d { font-size: 1.55rem; font-weight: 800; color: #1f2328; }
    .ev-date .w { font-size: 0.68rem; color: #6b7280; }
    .ev-main { flex: 1; min-width: 0; }
    .ev-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.35rem; }
    .ev-tag { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.55rem; border-radius: 999px; }
    .ev-title { font-weight: 700; font-size: 1.02rem; color: #1f2328; margin-bottom: 0.3rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ev-meta { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; font-size: 0.82rem; color: #6b7280; }
    .ev-meta i { margin-right: 0.35rem; color: #9ca3af; }
    .ev-slots { display: flex; align-items: center; gap: 0.65rem; margin-top: 0.6rem; font-size: 0.76rem; color: #6b7280; }
    .ev-slots-bar { flex: 0 1 180px; height: 6px; background: #eef0f3; border-radius: 3px; overflow: hidden; }
    .ev-slots-bar > div { height: 100%; border-radius: 3px; transform-origin: left; animation: evGrow 1s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: calc(var(--d, 0s) + 0.2s); }
    @keyframes evGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .ev-actions { display: flex; flex-direction: column; justify-content: center; gap: 0.4rem; flex-shrink: 0; }

    .ev-btn { display: inline-flex; align-items: center; gap: 0.4rem; border-radius: 9px; padding: 0.45rem 0.85rem; font-size: 0.82rem; font-weight: 600; border: 1px solid transparent; white-space: nowrap; transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; }
    .ev-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ev-btn.primary { background: #ffc107; color: #1f2328; }
    .ev-btn.primary:hover:not(:disabled) { background: #f0b400; box-shadow: 0 4px 12px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .ev-btn.neutral { background: #1f2328; color: #fff; }
    .ev-btn.neutral:hover:not(:disabled) { background: #000; }
    .ev-btn.danger { background: #fff; color: #dc3545; border-color: rgba(220,53,69,0.35); }
    .ev-btn.danger:hover:not(:disabled) { background: rgba(220,53,69,0.06); }
    .ev-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; }
    .ev-btn.ghost:hover:not(:disabled) { background: #f6f7f9; }
    .ev-empty-icon { width: 64px; height: 64px; margin: 0 auto; border-radius: 16px; background: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; }

    .ev-day:focus-visible, .ev-chip:focus-visible, .ev-btn:focus-visible, .ev-icon-btn:focus-visible, .ev-link:focus-visible, .ev-req-btn:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    /* ---------------- Modals ---------------- */
    .ev-modal { max-width: 540px; }
    .ev-modal.sm { max-width: 440px; }
    .ev-modal .modal-content { border: none; border-radius: 16px; box-shadow: 0 24px 60px rgba(16,24,40,0.2); overflow: hidden; }
    .ev-modal-head { border-bottom: 1px solid #eef0f3 !important; padding: 1.1rem 1.5rem !important; }
    .ev-modal-icon { width: 42px; height: 42px; border-radius: 12px; background: color-mix(in srgb, var(--c) 14%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 1.05rem; flex-shrink: 0; }
    .ev-modal-icon.lg { width: 58px; height: 58px; border-radius: 16px; font-size: 1.5rem; animation: evPop 0.4s ease-out; }
    .ev-modal-label { font-size: 0.72rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
    .ev-age-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .ev-age { display: flex; align-items: center; gap: 0.6rem; padding: 0.65rem 0.7rem; border-radius: 10px; border: 1px solid #eef0f3; background: #fafbfc; }
    .ev-age > i { width: 30px; height: 30px; border-radius: 8px; background: color-mix(in srgb, var(--c) 14%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0; }
    .ev-age .t { font-size: 0.78rem; font-weight: 700; color: #1f2328; }
    .ev-age .a { font-size: 0.72rem; color: #6b7280; }
    .ev-checklist { border: 1px solid #eef0f3; border-radius: 12px; overflow: hidden; }
    .ev-check { display: flex; align-items: flex-start; gap: 0.7rem; padding: 0.65rem 0.85rem; font-size: 0.85rem; color: #1f2328; line-height: 1.45; animation: evIn 0.35s ease-out backwards; }
    .ev-check + .ev-check { border-top: 1px solid #eef0f3; }
    ${Array.from({ length: 6 }, (_, i) => `.ev-check:nth-child(${i + 1}) { animation-delay: ${0.08 + i * 0.05}s; }`).join('\n    ')}
    .ev-check .ic { width: 24px; height: 24px; border-radius: 7px; background: #f3f4f6; color: #4b5563; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; flex-shrink: 0; }
    .ev-check .ic.ok { background: rgba(25,135,84,0.12); color: #198754; }
    .ev-tips { margin: 0; padding-left: 1.1rem; font-size: 0.84rem; color: #4b5563; line-height: 1.55; }
    .ev-tips li { margin-bottom: 0.25rem; }
    .ev-tips li::marker { color: #0d6efd; }
    .ev-warning { display: flex; gap: 0.6rem; align-items: flex-start; margin-top: 1rem; padding: 0.75rem 0.9rem; border-radius: 10px; background: rgba(220,53,69,0.06); border: 1px solid rgba(220,53,69,0.2); color: #b02a37; font-size: 0.82rem; line-height: 1.5; }
    .ev-warning i { margin-top: 3px; }

    @media (max-width: 768px) {
      .ev-card { flex-wrap: wrap; }
      .ev-date { width: 54px; }
      .ev-actions { flex-direction: row; width: 100%; }
      .ev-actions .ev-btn { flex: 1; justify-content: center; }
      .ev-title { white-space: normal; }
      .ev-age-grid { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ev-anim, .ev-day.selected, .ev-check, .ev-modal-icon.lg, .ev-slots-bar > div, .ev-cal-grid { animation: none !important; }
      .ev-card, .ev-chip, .ev-btn, .ev-day { transition: none !important; }
    }
  `;

  // Check URL for view parameter and open modal AFTER data is loaded
  useEffect(() => {
    if (loading) return; // Don't run until loading is complete
    
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    
    if (!viewParam) return; // No view parameter, exit early
    
    const [type, id] = viewParam.split('-');
    let schedule;
    
    if (type === 'vaccination') {
  schedule = vaccinationSchedules.find(s => s.id === parseInt(id));
} else if (type === 'deworming') {
  schedule = dewormingSchedules.find(s => s.id === parseInt(id));
} else if (type === 'seminar') {
  schedule = seminarSchedules.find(s => s.id === parseInt(id));
} else if (type === 'sterilization') {
  schedule = sterilizationSchedules.find(s => s.id === parseInt(id));
} else if (type === 'other') {
  schedule = otherSchedules.find(s => s.id === parseInt(id));
} else if (type === 'microchip') {
  schedule = microchipSchedules.find(s => s.id === parseInt(id));
}
    
    if (schedule) {
      // Use setTimeout to ensure the component is fully rendered
      setTimeout(() => {
        handleViewClick({ ...schedule, type });
        // Clear the URL parameter
        window.history.replaceState({}, '', '/owner/schedule');
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loading, vaccinationSchedules, dewormingSchedules, seminarSchedules, sterilizationSchedules, otherSchedules, microchipSchedules]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [
  vacSchedulesRes, 
  dewormSchedulesRes,
  semSchedulesRes, 
  sterilSchedulesRes,
  otherSchedulesRes,
  microchipSchedulesRes,
  petsRes, 
  vacTypesRes,
  inventoryRes
] = await Promise.all([
  scheduleAPI.getVaccinationSchedules(),
  scheduleAPI.getDewormingSchedules(),
  scheduleAPI.getSeminarSchedules(),
  scheduleAPI.getSterilizationSchedules(),
  scheduleAPI.getOtherSchedules(),
  scheduleAPI.getMicrochipSchedules().catch(() => ({ data: { schedules: [] } })),
  petAPI.getAll(),
  vaccinationAPI.getTypes(),
  inventoryAPI.getAll().catch((err) => { console.error('Inventory load failed:', err); return { data: { inventory: [] } }; })
]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingVaccinations = (vacSchedulesRes.data.schedules || [])
        .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
        .map(s => ({ ...s, type: 'vaccination' }));

      const upcomingDewormings = (dewormSchedulesRes.data.schedules || [])
        .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
        .map(s => ({ ...s, type: 'deworming' }));

      const upcomingSeminars = (semSchedulesRes.data.schedules || [])
        .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
        .map(s => ({ ...s, type: 'seminar' }));

      const upcomingSterilizations = (sterilSchedulesRes.data.schedules || [])
  .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
  .map(s => ({ ...s, type: 'sterilization' }));

const upcomingOthers = (otherSchedulesRes.data.schedules || [])
  .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
  .map(s => ({ ...s, type: 'other' }));

const upcomingMicrochips = (microchipSchedulesRes.data.schedules || [])
  .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
  .map(s => ({ ...s, type: 'microchip' }));

setVaccinationSchedules(upcomingVaccinations);
setDewormingSchedules(upcomingDewormings);
setSeminarSchedules(upcomingSeminars);
setSterilizationSchedules(upcomingSterilizations);
setOtherSchedules(upcomingOthers);
setMicrochipSchedules(upcomingMicrochips);
      setMyPets(petsRes.data.pets || []);
      setVaccinationTypes(vacTypesRes.data.vaccination_types || []);
      setInventoryItems(inventoryRes.data.inventory || []);

      const allSchedules = [
  ...upcomingVaccinations, 
  ...upcomingDewormings,
  ...upcomingSeminars, 
  ...upcomingSterilizations,
  ...upcomingOthers,
  ...upcomingMicrochips
];
      // Load user's current registrations for all schedules
      const allScheduleIds = [
  ...upcomingVaccinations.map(s => ({ id: s.id, type: 'vaccination' })),
  ...upcomingDewormings.map(s => ({ id: s.id, type: 'deworming' })),
  ...upcomingSeminars.map(s => ({ id: s.id, type: 'seminar' })),
  ...upcomingSterilizations.map(s => ({ id: s.id, type: 'sterilization' })),
  ...upcomingOthers.map(s => ({ id: s.id, type: 'other' })),
  ...upcomingMicrochips.map(s => ({ id: s.id, type: 'microchip' }))
];
      
      const allRegistrations = [];
      
      for (const schedule of allScheduleIds) {
        try {
          const response = await scheduleAPI.getRegisteredPets(schedule.id, schedule.type);
          const registrations = response.data.registrations || [];
          
          // Add schedule_id and schedule_type to each registration
          registrations.forEach(reg => {
            allRegistrations.push({
              ...reg,
              schedule_id: schedule.id,
              schedule_type: schedule.type
            });
          });
        } catch (err) {
          console.error(`Error loading registrations for ${schedule.type} ${schedule.id}:`, err);
        }
      }
      
      setCurrentRegistrations(allRegistrations);
      console.log('All registrations loaded:', allRegistrations);
      
      const uniqueBarangays = [...new Set(allSchedules.map(s => s.custom_place || s.barangay_name))].filter(Boolean);
      setBarangays(uniqueBarangays.sort());
      
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePetAge = (birthDate) => {
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInDays = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
    const ageInWeeks = Math.floor(ageInDays / 7);
    const ageInMonths = Math.floor(ageInDays / 30);
    
    return {
      days: ageInDays,
      weeks: ageInWeeks,
      months: ageInMonths
    };
  };

  const meetsAgeRequirement = (pet, scheduleType) => {
    const age = calculatePetAge(pet.birth_date);
    if (!age) {
      return { 
        meets: false, 
        reason: 'Birth date is required to verify age eligibility' 
      };
    }
    
    if (scheduleType === 'vaccination') {
      if (age.months < 3) {
        return { 
          meets: false, 
          reason: `Must be at least 3 months old (currently ${age.months} months old)` 
        };
      }
    } else if (scheduleType === 'deworming') {
      if (age.weeks < 2) {
        return { 
          meets: false, 
          reason: `Must be at least 2 weeks old (currently ${age.weeks} weeks old)` 
        };
      }
    } else if (scheduleType === 'sterilization') {
      if (age.months < 6) {
        return { 
          meets: false, 
          reason: `Must be at least 6 months old (currently ${age.months} months old)` 
        };
      }
    }
    
    return { meets: true, reason: null };
  }; 

  const getAllSchedules = () => {
  return [
    ...vaccinationSchedules, 
    ...dewormingSchedules,
    ...seminarSchedules, 
    ...sterilizationSchedules,
    ...otherSchedules,
    ...microchipSchedules
  ].sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
};
  const isScheduleRegistered = (schedule) => {
  return currentRegistrations.some(r => 
    r.schedule_id === schedule.id && 
    r.schedule_type === schedule.type &&
    r.status !== 'cancelled'
  );
};

const getFilteredSchedules = () => {
  let schedules;
  
  switch (activeTab) {
    case 'vaccination':
      schedules = vaccinationSchedules;
      break;
    case 'deworming':
      schedules = dewormingSchedules;
      break;
    case 'seminar':
      schedules = seminarSchedules;
      break;
    case 'sterilization':
      schedules = sterilizationSchedules;
      break;
    case 'other':
      schedules = otherSchedules;
      break;
    case 'microchip':
      schedules = microchipSchedules;
      break;
    default:  
      schedules = getAllSchedules();
  }

  if (selectedBarangay !== 'all') {
    schedules = schedules.filter(s => (s.custom_place || s.barangay_name) === selectedBarangay);
  }

  if (filterRegistration === 'registered') {
    schedules = schedules.filter(s => isScheduleRegistered(s));
  } else if (filterRegistration === 'unregistered') {
    schedules = schedules.filter(s => !isScheduleRegistered(s));
  }

  return schedules;
};

  const getScheduleStatusBadge = (schedule) => {
    const now = new Date();
    const scheduleDate = new Date(schedule.scheduled_date);
    const [startHour, startMinute] = schedule.start_time.split(':');
    const [endHour, endMinute] = schedule.end_time.split(':');
    
    const startDateTime = new Date(scheduleDate);
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const endDateTime = new Date(scheduleDate);
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
    
    // Check time-based status first
    if (now > endDateTime) {
      return <span style={{ color: '#6c757d', fontWeight: '600' }}>Past</span>;
    }
    
    if (now >= startDateTime && now <= endDateTime) {
      return <span style={{ color: '#198754', fontWeight: '600' }}>Ongoing</span>;
    }
    
    // Then check database status for cancelled/completed
    if (schedule.status === 'completed') {
      return <span style={{ color: '#6c757d', fontWeight: '600' }}>Completed</span>;
    }
    if (schedule.status === 'cancelled') {
      return <span style={{ color: '#dc3545', fontWeight: '600' }}>Cancelled</span>;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const schedDateOnly = new Date(scheduleDate);
    schedDateOnly.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((schedDateOnly - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return <span style={{ color: '#198754', fontWeight: '600' }}>Today</span>;
    if (diffDays <= 3) return <span style={{ color: '#ffc107', fontWeight: '600' }}>Soon</span>;
    if (diffDays <= 7) return <span style={{ color: '#0dcaf0', fontWeight: '600' }}>This Week</span>;
    return <span style={{ color: '#0d6efd', fontWeight: '600' }}>Upcoming</span>;
  };

  const getScheduleTypeBadge = (type) => {
  const badges = {
    vaccination: <span style={{ color: '#ffc107', fontWeight: '600', fontSize: '0.85rem' }}>Vaccination</span>,
    deworming: <span style={{ color: '#0d6efd', fontWeight: '600', fontSize: '0.85rem' }}>Deworming</span>,  
    seminar: <span style={{ color: '#0dcaf0', fontWeight: '600', fontSize: '0.85rem' }}>Seminar</span>,
    sterilization: <span style={{ color: '#198754', fontWeight: '600', fontSize: '0.85rem' }}>Sterilization</span>,
    other: <span style={{ color: '#6f42c1', fontWeight: '600', fontSize: '0.85rem' }}>Other Event</span>
  };
  return badges[type] || <span style={{ color: '#6c757d', fontWeight: '600', fontSize: '0.85rem' }}>{type}</span>;
};

  const getAvailableSpots = (schedule) => {
    if (!schedule.max_capacity) return null;
    return Math.max(0, schedule.max_capacity - (schedule.current_registrations || 0));
  };

  const getCompatiblePetsForVaccination = (schedule) => {
    try {
      const limits = typeof schedule.vaccine_shot_limits === 'string'
        ? JSON.parse(schedule.vaccine_shot_limits)
        : schedule.vaccine_shot_limits || {};

      const allowedSpecies = new Set();
      Object.keys(limits).forEach(inventoryId => {
        const invItem = inventoryItems.find(i => i.id === parseInt(inventoryId));
        if (!invItem) return;
        const sp = invItem.species || 'all';
        if (sp === 'all' || sp === 'both') {
          allowedSpecies.add('dog');
          allowedSpecies.add('cat');
        } else {
          allowedSpecies.add(sp);
        }
      });

      if (allowedSpecies.size === 0) return myPets;
      return myPets.filter(pet => allowedSpecies.has(pet.species));
    } catch (e) {
      return myPets;
    }
  };

  const getCompatiblePetsForDeworming = (schedule) => {
    if (!schedule.pet_types_allowed) return myPets;
    
    try {
      const allowedTypes = Array.isArray(schedule.pet_types_allowed)
        ? schedule.pet_types_allowed
        : JSON.parse(schedule.pet_types_allowed || '[]');
      
      if (allowedTypes.length === 0) return myPets;
      
      return myPets.filter(pet => allowedTypes.includes(pet.species));
    } catch (e) {
      return myPets;
    }
  };

  const getCompatiblePetsForSterilization = (schedule) => {
    if (!schedule.sterilization_species) return myPets;
    
    try {
      const allowedSpecies = Array.isArray(schedule.sterilization_species)
        ? schedule.sterilization_species
        : JSON.parse(schedule.sterilization_species || '[]');
      
      if (allowedSpecies.length === 0) return myPets;
      
      return myPets.filter(pet => allowedSpecies.includes(pet.species));
    } catch (e) {
      return myPets;
    }
  };

  const getCompatiblePetsForOther = (schedule) => {
  if (!schedule.pet_types_allowed) return myPets;
  
  try {
    const allowedTypes = Array.isArray(schedule.pet_types_allowed)
      ? schedule.pet_types_allowed
      : JSON.parse(schedule.pet_types_allowed || '[]');
    
    if (allowedTypes.length === 0) return myPets;
    
    return myPets.filter(pet => allowedTypes.includes(pet.species));
  } catch (e) {
    return myPets;
  }
};

  const getAvailableVaccinesForPet = (petSpecies, vaccineShotLimits) => {
    try {
      const limits = typeof vaccineShotLimits === 'string'
        ? JSON.parse(vaccineShotLimits)
        : vaccineShotLimits || {};

      return Object.entries(limits)
        .filter(([, shotsRemaining]) => shotsRemaining > 0)
        .map(([inventoryId, shotsRemaining]) => {
          // vaccine_shot_limits keys are inventory IDs
          const invItem = inventoryItems.find(i => i.id === parseInt(inventoryId));
          if (!invItem) return null;

          const itemSpecies = invItem.species || 'all';
          if (itemSpecies !== 'both' && itemSpecies !== 'all' && itemSpecies !== petSpecies) {
            return null;
          }

          return {
            id: parseInt(inventoryId),
            name: invItem.item_name || invItem.name || `Vaccine #${inventoryId}`,
            description: invItem.description || '',
            shotsRemaining: shotsRemaining,
            species: itemSpecies
          };
        })
        .filter(Boolean);
    } catch (e) {
      console.error('Error getting available vaccines:', e);
      return [];
    }
  };

  const handleVaccineSelection = (petId, vaccineId, isChecked) => {
    setCompatiblePets(prevPets => 
      prevPets.map(pet => {
        if (pet.id === petId) {
          const currentVaccines = pet.selectedVaccines || [];
          
          let updatedVaccines;
          if (isChecked) {
            updatedVaccines = currentVaccines.includes(vaccineId)
              ? currentVaccines
              : [...currentVaccines, vaccineId];
          } else {
            updatedVaccines = currentVaccines.filter(id => id !== vaccineId);
          }
          
          return {
            ...pet,
            selectedVaccines: updatedVaccines
          };
        }
        return pet;
      })
    );
  };

  const handlePetSelectionToggle = (petId) => {
    setCompatiblePets(prevPets =>
      prevPets.map(pet => {
        if (pet.id === petId) {
          if (pet.selectedVaccines !== undefined) {
            const { selectedVaccines, ...petWithoutVaccines } = pet;
            return petWithoutVaccines;
          } else {
            return {
              ...pet,
              selectedVaccines: []
            };
          }
        }
        return pet;
      })
    );
  };

  const handleViewClick = async (schedule) => {
    if (schedule.type === 'vaccination') {
      try {
        const response = await scheduleAPI.getVaccineRegistrationCounts(schedule.id);
        setVaccineRegistrationCounts(response.data.vaccine_counts || {});
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error('Error fetching vaccine counts:', err);
        setVaccineRegistrationCounts({});
      }
    }
    
    setSelectedSchedule(schedule);
    setScheduleType(schedule.type);
    setShowDetailsModal(true);
    setShowDropdown(null);
  };


  const handleRegisterClick = async (schedule) => {
    setSelectedSchedule(schedule);
    setScheduleType(schedule.type);
    setShowDropdown(null);
    
    try {
  let registeredRes;
  
  // Use getRegisteredPets for all schedule types including vaccination
  registeredRes = await scheduleAPI.getRegisteredPets(schedule.id, schedule.type);

      const registrations = registeredRes.data.registrations || [];
      const registeredPetIds = registrations.map(r => r.pet_id);
      
      // Check if user is already registered for seminar
      if (schedule.type === 'seminar' && registrations.length > 0) {
        // User is already registered, show the registration modal with cancel option
        const registration = registrations[0];
        setPetToCancel({ petId: null, registrationId: registration.id });
      }
      
      let compatible = [];
if (schedule.type === 'vaccination') {
  compatible = getCompatiblePetsForVaccination(schedule);
} else if (schedule.type === 'deworming') {
  compatible = getCompatiblePetsForDeworming(schedule);
} else if (schedule.type === 'sterilization') {
  compatible = getCompatiblePetsForSterilization(schedule);
} else if (schedule.type === 'seminar') {
  compatible = myPets;
} else if (schedule.type === 'microchip') {
  compatible = getCompatiblePetsForDeworming(schedule); // reuses pet_types_allowed logic
} else if (schedule.type === 'other') {
  // Check if pet selection is required for "other" events
  const petTypesAllowed = schedule.pet_types_allowed;
  const hasPetTypes = petTypesAllowed && (
    (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
    (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
  );
  
  if (hasPetTypes) {
    compatible = getCompatiblePetsForOther(schedule);
  } else {
    compatible = myPets; // For seminar-like registration
  }
}
      
      const petsWithStatus = compatible.map(pet => {
  const registration = registrations.find(r => r.pet_id === pet.id);
  return {
    ...pet,
    isRegistered: registeredPetIds.includes(pet.id),
    registration_id: registration ? registration.id : null
  };
});

setCompatiblePets(petsWithStatus);
// Don't overwrite global currentRegistrations — update only for this schedule
setRegistrationData({
  pets_registered: [],
  special_requests: '',
  notes: ''
});
      setRegisterError('');
      setRegisterSuccess('');
      setShowRegisterModal(true);
      
    } catch (err) {
      const { message } = handleAPIError(err);
      setRegisterError(message || 'Failed to load available pets');
      
      setCompatiblePets([]);
      setRegistrationData({
        pets_registered: [],
        special_requests: '',
        notes: ''
      });
      setRegisterSuccess('');
      setShowRegisterModal(true);
    }
  };

  const handleCancelRegistration = (petId, registrationId) => {
    setPetToCancel({ petId, registrationId });
    setShowCancelConfirm(true);
  };
  const handleCancelVaccine = (petId, registrationId, vaccineId) => {
  setVaccineToCancel({ petId, registrationId, vaccineId });
  setShowCancelConfirm(true);
};

const handleVaccineCancelSelection = (petId, vaccineId, isChecked) => {
  setSelectedVaccinesToCancel(prev => {
    const petSelections = prev[petId] || [];
    const updated = isChecked 
      ? [...petSelections, vaccineId]
      : petSelections.filter(id => id !== vaccineId);
    
    return {
      ...prev,
      [petId]: updated
    };
  });
};

const handleCancelSelectedOrAll = (petId, registrationId) => {
  const petSelectedVaccines = selectedVaccinesToCancel[petId] || [];
  
  if (petSelectedVaccines.length > 0) {
    // Cancel only selected vaccines
    setVaccineToCancel({ petId, registrationId, vaccineIds: petSelectedVaccines });
  } else {
    // Cancel all vaccines (entire registration)
    setPetToCancel({ petId, registrationId });
  }
  setShowCancelConfirm(true);
};

  const confirmCancelRegistration = async () => {
  // Check if canceling individual vaccine or entire registration
  if (vaccineToCancel) {
    await confirmCancelVaccine();
    return;
  }
  
  if (!petToCancel) return;

  setRegisterLoading(true);
  setRegisterError('');

  try {
    await scheduleAPI.cancelRegistration(petToCancel.registrationId);
    
    setCompatiblePets(prevPets => 
      prevPets.map(pet => 
        pet.id === petToCancel.petId 
          ? { ...pet, isRegistered: false, registration_id: null }
          : pet
      )
    );
    
    setFloatingSuccess('Registration cancelled successfully!');
    await loadData();
    setTimeout(() => setFloatingSuccess(''), 4000);
    
  } catch (err) {
    const { message } = handleAPIError(err);
    setRegisterError(message);
    console.error('Cancel registration error:', err);
  } finally {
    setRegisterLoading(false);
    setPetToCancel(null);
    setShowCancelConfirm(false);
  }
};

const confirmCancelVaccine = async () => {
  if (!vaccineToCancel) return;

  setRegisterLoading(true);
  setRegisterError('');

  try {
    const registration = currentRegistrations.find(r => r.id === vaccineToCancel.registrationId);
    const currentVaccines = registration?.selected_vaccines || [];
    
    // Handle multiple vaccine cancellations
    const vaccinesToRemove = vaccineToCancel.vaccineIds || [vaccineToCancel.vaccineId];
    const updatedVaccines = currentVaccines.filter(id => !vaccinesToRemove.includes(id));
    
    if (updatedVaccines.length === 0) {
      // If no vaccines left, cancel entire registration
      await scheduleAPI.cancelRegistration(vaccineToCancel.registrationId);
      
      setCompatiblePets(prevPets => 
        prevPets.map(pet => 
          pet.id === vaccineToCancel.petId 
            ? { ...pet, isRegistered: false, registration_id: null }
            : pet
        )
      );
      
      setRegisterSuccess('All vaccines cancelled. Registration removed.');
    } else {
      // Update registration with remaining vaccines
      await scheduleAPI.updateRegistration(vaccineToCancel.registrationId, {
        selected_vaccines: updatedVaccines
      });
      
      // Update local state
      setCurrentRegistrations(prev => 
        prev.map(reg => 
          reg.id === vaccineToCancel.registrationId 
            ? { ...reg, selected_vaccines: updatedVaccines }
            : reg
        )
      );
      
      setFloatingSuccess(vaccinesToRemove.length > 1 ? 'Selected vaccines cancelled successfully!' : 'Vaccine cancelled successfully!');
    }
    
    // Reload all data to refresh counts and registrations
    await loadData();
    
    // If the registration modal is still open, refresh the pet list
    if (selectedSchedule && showRegisterModal) {
      try {
        const registeredRes = await scheduleAPI.getRegisteredPets(selectedSchedule.id, selectedSchedule.type);
        const registrations = registeredRes.data.registrations || [];
        
        // Update compatible pets with fresh registration data
        setCompatiblePets(prevPets => 
          prevPets.map(pet => {
            const registration = registrations.find(r => r.pet_id === pet.id);
            return {
              ...pet,
              isRegistered: registrations.some(r => r.pet_id === pet.id),
              registration_id: registration ? registration.id : null
            };
          })
        );
        
        setCurrentRegistrations(registrations);
      } catch (err) {
        console.error('Error refreshing registrations:', err);
      }
    }
    
    setTimeout(() => setFloatingSuccess(''), 4000);
    
  } catch (err) {
    const { message } = handleAPIError(err);
    setRegisterError(message);
    console.error('Cancel vaccine error:', err);
  } finally {
    setRegisterLoading(false);
    setVaccineToCancel(null);
    // Clear selections for this specific pet
    if (vaccineToCancel?.petId) {
      setSelectedVaccinesToCancel(prev => {
        const updated = { ...prev };
        delete updated[vaccineToCancel.petId];
        return updated;
      });
    }
    setShowCancelConfirm(false);
  }
};

  const handlePetSelection = (petId, isChecked) => {
    setRegistrationData(prev => ({
      ...prev,
      pets_registered: isChecked 
        ? [...prev.pets_registered, parseInt(petId)]
        : prev.pets_registered.filter(id => id !== parseInt(petId))
    }));
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    
    if (scheduleType === 'vaccination') {
      const petsWithVaccines = compatiblePets.filter(p => 
        p.selectedVaccines && p.selectedVaccines.length > 0
      );
      
      if (petsWithVaccines.length === 0) {
        setRegisterError('Please select at least one pet and their vaccines');
        return;
      }
      
      for (const pet of petsWithVaccines) {
        if (!pet.selectedVaccines || pet.selectedVaccines.length === 0) {
          setRegisterError(`Please select at least one vaccine for ${pet.name}`);
          return;
        }
      }

      // Show requirements confirmation modal before proceeding
      setPendingVaccinationSubmit(true);
      setShowVaccinationConfirmModal(true);
      return;
    } else if (scheduleType === 'deworming') {
      if (registrationData.pets_registered.length === 0) {
        setRegisterError('Please select at least one pet to register');
        return;
      }
      // Show requirements confirmation modal for sterilization and microchip
      if (scheduleType === 'sterilization' || scheduleType === 'microchip') {
        setPendingVaccinationSubmit(true);
        setShowVaccinationConfirmModal(true);
        return;
      }
    } else if (scheduleType === 'other') {
      // Check if pet selection is required
      const petTypesAllowed = selectedSchedule?.pet_types_allowed;
      const hasPetTypes = petTypesAllowed && (
        (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
        (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
      );
      
      if (hasPetTypes && registrationData.pets_registered.length === 0) {
        setRegisterError('Please select at least one pet to register');
        return;
      }
    }

    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');

    try {
      const submitData = {
        schedule_id: selectedSchedule.id,
        schedule_type: scheduleType,
        special_requests: registrationData.special_requests,
        notes: registrationData.notes
      };

      if (scheduleType === 'vaccination') {
        submitData.pets_with_vaccines = compatiblePets
          .filter(p => p.selectedVaccines && p.selectedVaccines.length > 0)
          .map(pet => ({
            pet_id: pet.id,
            selected_vaccines: pet.selectedVaccines
          }));
      } else if (scheduleType === 'deworming' || scheduleType === 'sterilization' || scheduleType === 'microchip' || scheduleType === 'other') {
        // Check if pet selection is required for 'other' type
        if (scheduleType === 'other') {
          const petTypesAllowed = selectedSchedule?.pet_types_allowed;
          const hasPetTypes = petTypesAllowed && (
            (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
            (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
          );
          
          if (hasPetTypes) {
            submitData.pets_registered = registrationData.pets_registered;
          }
        } else {
          submitData.pets_registered = registrationData.pets_registered;
        }
      }

      await scheduleAPI.register(submitData);

      // Build registered pets summary for confirm modal
      let registeredPetsSummary = [];
      if (scheduleType === 'vaccination') {
        registeredPetsSummary = compatiblePets
          .filter(p => p.selectedVaccines && p.selectedVaccines.length > 0)
          .map(pet => ({
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            vaccines: pet.selectedVaccines.map(vid => {
              const inv = inventoryItems.find(i => i.id === parseInt(vid));
              return inv?.item_name || inv?.name || `Vaccine #${vid}`;
            })
          }));
      } else if (['deworming', 'sterilization', 'microchip', 'other'].includes(scheduleType)) {
        registeredPetsSummary = myPets
          .filter(p => registrationData.pets_registered.includes(p.id))
          .map(pet => ({ name: pet.name, species: pet.species, breed: pet.breed, vaccines: [] }));
      } else if (scheduleType === 'seminar') {
        registeredPetsSummary = [];
      }

      setLastRegistrationData({
        schedule: selectedSchedule,
        scheduleType,
        pets: registeredPetsSummary
      });

      setFloatingSuccess(`Successfully registered for ${scheduleType}!`);
      await loadData();
      setShowRegisterModal(false);
      setRegisterSuccess('');
      setShowConfirmRegistrationModal(true);
      setTimeout(() => setFloatingSuccess(''), 4000);
      
    } catch (err) {
      const { message } = handleAPIError(err);
      setRegisterError(message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVaccinationConfirmProceed = async () => {
    setShowVaccinationConfirmModal(false);
    setPendingVaccinationSubmit(null);
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');

    try {
      let submitData = {
        schedule_id: selectedSchedule.id,
        schedule_type: scheduleType,
        special_requests: registrationData.special_requests,
        notes: registrationData.notes,
      };

      let registeredPetsSummary = [];

      if (scheduleType === 'vaccination') {
        submitData.pets_with_vaccines = compatiblePets
          .filter(p => p.selectedVaccines && p.selectedVaccines.length > 0)
          .map(pet => ({
            pet_id: pet.id,
            selected_vaccines: pet.selectedVaccines
          }));

        registeredPetsSummary = compatiblePets
          .filter(p => p.selectedVaccines && p.selectedVaccines.length > 0)
          .map(pet => ({
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            vaccines: pet.selectedVaccines.map(vid => {
              const inv = inventoryItems.find(i => i.id === parseInt(vid));
              return inv?.item_name || inv?.name || `Vaccine #${vid}`;
            })
          }));
      } else {
        // sterilization or microchip
        submitData.pets_registered = registrationData.pets_registered;
        registeredPetsSummary = myPets
          .filter(p => registrationData.pets_registered.includes(p.id))
          .map(pet => ({ name: pet.name, species: pet.species, breed: pet.breed, vaccines: [] }));
      }

      await scheduleAPI.register(submitData);

      setLastRegistrationData({
        schedule: selectedSchedule,
        scheduleType,
        pets: registeredPetsSummary
      });

      setFloatingSuccess(`Successfully registered for ${scheduleType}!`);
      await loadData();
      setShowRegisterModal(false);
      setRegisterSuccess('');
      setShowConfirmRegistrationModal(true);
      setTimeout(() => setFloatingSuccess(''), 4000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setRegisterError(message);
      setShowRegisterModal(true);
    } finally {
      setRegisterLoading(false);
    }
  };

  const getBarangayCount = (placeName) => {
    const allSchedules = getAllSchedules();
    return allSchedules.filter(s => (s.custom_place || s.barangay_name) === placeName).length;
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
    
    return Object.entries(limits).map(([inventoryId, limit]) => {
      const invItem = inventoryItems.find(i => i.id === parseInt(inventoryId));
      const registered = vaccineRegistrationCounts[inventoryId] || 0;
      
      return {
        id: inventoryId,
        name: invItem?.item_name || invItem?.name || 'Unknown',
        species: invItem?.species || 'unknown',
        limit: parseInt(limit || 0),
        registered: registered,
        description: invItem?.description || ''
      };
    });
  } catch (e) {
    console.error('Error in getVaccineDetails:', e);
    return [];
  }
};

  /* ---------------- Calendar + list helpers ---------------- */
  const TYPE_META = {
    vaccination:   { label: 'Vaccination',   color: '#e0a800', icon: 'fa-syringe' },
    deworming:     { label: 'Deworming',     color: '#0d6efd', icon: 'fa-pills' },
    seminar:       { label: 'Seminar',       color: '#0aa2c0', icon: 'fa-graduation-cap' },
    sterilization: { label: 'Sterilization', color: '#198754', icon: 'fa-cut' },
    microchip:     { label: 'Microchip',     color: '#d63384', icon: 'fa-microchip' },
    other:         { label: 'Other event',   color: '#6f42c1', icon: 'fa-calendar-check' },
  };
  const typeMeta = (type) => TYPE_META[type] || { label: type, color: '#6c757d', icon: 'fa-calendar' };

  const pad2 = (n) => String(n).padStart(2, '0');
  const toKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const dateKey = (schedule) => String(schedule.scheduled_date || '').slice(0, 10);
  const keyToDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayKey = toKey(new Date());

  // "13:30:00" -> "1:30 PM"
  const formatClock = (value) => {
    if (!value) return '';
    const [h, m] = String(value).split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  // Status pill: Today / Ongoing / Soon / This week / Upcoming
  const getStatusMeta = (schedule) => {
    const now = new Date();
    const day = keyToDate(dateKey(schedule));
    const [sh, sm] = (schedule.start_time || '0:0').split(':');
    const [eh, em] = (schedule.end_time || '23:59').split(':');
    const start = new Date(day); start.setHours(+sh, +sm, 0, 0);
    const end = new Date(day);   end.setHours(+eh, +em, 0, 0);
    if (schedule.status === 'cancelled') return { label: 'Cancelled', color: '#dc3545' };
    if (schedule.status === 'completed' || now > end) return { label: 'Ended', color: '#6c757d' };
    if (now >= start) return { label: 'Ongoing', color: '#198754' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((day - today) / 86400000);
    if (diff === 0) return { label: 'Today', color: '#198754' };
    if (diff <= 3) return { label: 'Soon', color: '#e0a800' };
    if (diff <= 7) return { label: 'This week', color: '#0aa2c0' };
    return { label: 'Upcoming', color: '#0d6efd' };
  };

  // Slots taken / total for the capacity bar
  const getSlots = (schedule) => {
    const taken = Number(schedule.current_registrations || 0);
    const total = schedule.type === 'vaccination' ? getTotalVaccineShots(schedule) : Number(schedule.max_capacity || 0);
    return total > 0 ? { taken, total, left: Math.max(0, total - taken) } : null;
  };

  // Same rules as the old card menu: what the owner can do with this event
  const getEventAction = (schedule) => {
    if (['ongoing', 'completed', 'cancelled'].includes(schedule.status)) return null;
    const start = keyToDate(dateKey(schedule));
    const [sh, sm] = (schedule.start_time || '0:0').split(':');
    start.setHours(+sh, +sm, 0, 0);
    if (new Date() >= start) return null;

    if (schedule.type === 'seminar') {
      const regs = currentRegistrations.filter(r => r.schedule_id === schedule.id && r.schedule_type === 'seminar' && r.status !== 'cancelled');
      if (regs.length > 0) {
        return {
          label: 'Cancel registration', icon: 'fa-times', tone: 'danger',
          onClick: () => { setPetToCancel({ petId: null, registrationId: regs[0].id }); setShowCancelConfirm(true); },
        };
      }
    }
    if (isScheduleRegistered(schedule)) {
      return { label: 'Manage registration', icon: 'fa-user-edit', tone: 'neutral', onClick: () => handleRegisterClick(schedule) };
    }
    return { label: 'Register', icon: 'fa-plus', tone: 'primary', onClick: () => handleRegisterClick(schedule) };
  };
  const typeFiltered = [...getFilteredSchedules()].sort((a, b) =>
    dateKey(a).localeCompare(dateKey(b)) || String(a.start_time).localeCompare(String(b.start_time)));
  const filteredSchedules = selectedDate ? typeFiltered.filter(s => dateKey(s) === selectedDate) : typeFiltered;

  // Events per day for the calendar dots (respects the type, place and registration filters)
  const eventsByDate = typeFiltered.reduce((acc, s) => { (acc[dateKey(s)] = acc[dateKey(s)] || []).push(s); return acc; }, {});

  // 6-week grid for the visible month
  const calendarDays = (() => {
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start); date.setDate(start.getDate() + i);
      return { date, key: toKey(date), inMonth: date.getMonth() === calMonth.getMonth() };
    });
  })();

  // Current page of events, grouped by date
  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / itemsPerPage));
  const pagedGroups = Object.entries(
    filteredSchedules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      .reduce((acc, s) => { (acc[dateKey(s)] = acc[dateKey(s)] || []).push(s); return acc; }, {})
  );

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center">
            <Spinner animation="border" style={{ width: '3rem', height: '3rem', color: '#ffc107', borderWidth: '4px' }} />
            <p style={{ marginTop: '1rem', fontWeight: '600', color: '#666666', fontSize: '1rem' }}>Loading schedules...</p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffffff', minHeight: '100vh' }}>
      {floatingSuccess && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          minWidth: '320px',
          maxWidth: '480px',
          animation: 'dropDown 0.4s ease-out',
          pointerEvents: 'auto'
        }}>
          <Alert
            variant="success"
            dismissible
            onClose={() => setFloatingSuccess('')}
            style={{
              borderRadius: '14px',
              border: '2px solid #198754',
              background: 'linear-gradient(135deg, rgba(25,135,84,0.97), rgba(20,110,68,0.97))',
              color: '#fff',
              fontWeight: '600',
              boxShadow: '0 8px 32px rgba(25,135,84,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              marginBottom: 0
            }}
          >
            <i className="fas fa-check-circle" style={{ fontSize: '1.6rem', flexShrink: 0 }}></i>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>Registered!</div>
              <div style={{ fontSize: '0.88rem', opacity: 0.9 }}>{floatingSuccess}</div>
            </div>
          </Alert>
        </div>
      )}

      <Row className="mb-4 align-items-end" style={{ animation: 'dropDown 0.4s ease-out' }}>
        <Col>
          <h2 className="sched-page-title" style={{ fontWeight: 700, color: '#1f2328', fontSize: '2rem', marginBottom: '0.25rem' }}>
            <i className="fas fa-calendar-alt me-2" style={{ fontSize: '1.5rem' }} />Event Calendar
          </h2>
          <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>
            Free vaccination, deworming, sterilization and other City Vet events near you
          </div>
          {!verifLoading && ownerProfile?.verification_status === 'pending' && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#856404', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fas fa-hourglass-half" />
              Your ID is under review. We'll notify you once verified.
            </div>
          )}
        </Col>
        <Col xs={12} md="auto" className="mt-3 mt-md-0">
          <button type="button" className="ev-req-btn" onClick={() => setShowRequirementsReminderModal(true)}>
            <i className="fas fa-clipboard-check" />
            Event requirements
          </button>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert 
              variant="danger" 
              dismissible 
              onClose={() => setError('')}
              style={{
                borderRadius: '12px',
                border: '2px solid #dc3545',
                background: 'rgba(220, 53, 69, 0.1)',
                color: '#dc3545'
              }}
            >
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {verifLoading ? (
        <Row>
          <Col>
            <div className="text-center py-5">
              <Spinner animation="border" style={{ width: '3rem', height: '3rem', color: '#ffc107', borderWidth: '4px' }} />
              <p style={{ marginTop: '1rem', fontWeight: '600', color: '#666666', fontSize: '1rem' }}>Checking verification...</p>
            </div>
          </Col>
        </Row>
      ) : !isVerified() && ownerProfile ? (
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          <Col>
            <Card className="text-center py-5 border-0"
              style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: '#ffffff' }}>
              <Card.Body className="py-5">
                <div style={{ width:'90px', height:'90px', borderRadius:'50%', background:'rgba(255,193,7,0.1)', border:'2px solid #ffc107', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
                  <i className="fas fa-lock" style={{ fontSize:'2.5rem', color:'#ffc107' }} />
                </div>
                <h4 style={{ fontWeight:'800', color:'#1a1a1a', marginBottom:'0.5rem' }}>Account Verification Required</h4>
                <p className="text-muted mb-4" style={{ maxWidth:'420px', margin:'0 auto 1.5rem', lineHeight:'1.65' }}>
                  You need to verify your identity before you can view and register for events. This ensures the safety and credibility of the system.
                </p>
                {ownerProfile.verification_status === 'pending' ? (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.75rem 1.5rem', borderRadius:'12px', background:'rgba(253,126,20,0.08)', border:'1.5px solid rgba(253,126,20,0.3)', color:'#fd7e14', fontWeight:'600', fontSize:'0.9rem' }}>
                    <i className="fas fa-hourglass-half" />
                    Your ID is currently under review. Please wait for admin approval.
                  </div>
                ) : (
                  <Button
                    onClick={handleOpenVerifyModal}
                    className="border-0"
                    size="lg"
                    style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', color:'#000', borderRadius:'14px', fontWeight:'700', padding:'0.875rem 2.5rem', boxShadow:'0 6px 20px rgba(255,193,7,0.4)', transition:'all 0.3s' }}
                    onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(255,193,7,0.6)'; }}
                    onMouseOut={e  => { e.currentTarget.style.transform='translateY(0)';   e.currentTarget.style.boxShadow='0 6px 20px rgba(255,193,7,0.4)'; }}>
                    <i className="fas fa-id-card me-2" />Verify My Account Now
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : isVerified() && (
        <Row className="g-4" style={{ flex: '1 1 auto' }}>

          {/* ---------------- Calendar ---------------- */}
          <Col lg={4} xl={3}>
            <div className="ev-panel ev-anim" style={{ '--d': '0.1s' }}>
              <div className="ev-cal-head">
                <button type="button" className="ev-icon-btn" aria-label="Previous month"
                  onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
                  <i className="fas fa-chevron-left" />
                </button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1f2328' }}>
                    {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <button type="button" className="ev-link" onClick={() => { const n = new Date(); setCalMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelectedDate(todayKey); setCurrentPage(1); }}>
                    Jump to today
                  </button>
                </div>
                <button type="button" className="ev-icon-btn" aria-label="Next month"
                  onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
                  <i className="fas fa-chevron-right" />
                </button>
              </div>

              <div className="ev-cal-grid ev-cal-week">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d.slice(0, 2)}</div>)}
              </div>
              <div className="ev-cal-grid" key={calMonth.toISOString()}>
                {calendarDays.map(({ date, key, inMonth }) => {
                  const dayEvents = eventsByDate[key] || [];
                  const types = [...new Set(dayEvents.map(e => e.type))].slice(0, 3);
                  const isSelected = selectedDate === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`ev-day${inMonth ? '' : ' out'}${key === todayKey ? ' today' : ''}${isSelected ? ' selected' : ''}${dayEvents.length ? ' has' : ''}`}
                      onClick={() => { setSelectedDate(isSelected ? null : key); setCurrentPage(1); if (!inMonth) setCalMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }}
                      aria-pressed={isSelected}
                      aria-label={`${date.toDateString()}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : ''}`}
                    >
                      <span className="num">{date.getDate()}</span>
                      <span className="dots">
                        {types.map(tp => <i key={tp} style={{ background: isSelected ? '#fff' : typeMeta(tp).color }} />)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="ev-cal-foot">
                {selectedDate ? (
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span style={{ fontSize: '0.82rem', color: '#1f2328', fontWeight: 600 }}>
                      {keyToDate(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      <span style={{ color: '#6b7280', fontWeight: 500 }}> · {(eventsByDate[selectedDate] || []).length} event{(eventsByDate[selectedDate] || []).length === 1 ? '' : 's'}</span>
                    </span>
                    <button type="button" className="ev-link" onClick={() => { setSelectedDate(null); setCurrentPage(1); }}>Show all dates</button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Select a date to see its events.</span>
                )}
              </div>

              <div className="ev-legend">
                {Object.entries(TYPE_META).map(([key, m]) => (
                  <span key={key}><i style={{ background: m.color }} />{m.label}</span>
                ))}
              </div>
            </div>
          </Col>

          {/* ---------------- Events ---------------- */}
          <Col lg={8} xl={9}>
            <div className="ev-panel ev-anim" style={{ '--d': '0.18s', padding: '1rem 1.25rem' }}>
              <div className="ev-chips" role="tablist" aria-label="Event type">
                {[{ key: 'all', label: 'All events', icon: 'fa-th-large', count: getAllSchedules().length },
                  ...['vaccination', 'deworming', 'seminar', 'sterilization', 'microchip', 'other'].map(k => ({
                    key: k, label: typeMeta(k).label, icon: typeMeta(k).icon,
                    count: { vaccination: vaccinationSchedules, deworming: dewormingSchedules, seminar: seminarSchedules, sterilization: sterilizationSchedules, microchip: microchipSchedules, other: otherSchedules }[k].length,
                  }))].map(tab => (
                  <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key}
                    className={`ev-chip${activeTab === tab.key ? ' active' : ''}`}
                    style={{ '--c': tab.key === 'all' ? '#1f2328' : typeMeta(tab.key).color }}
                    onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}>
                    <i className={`fas ${tab.icon}`} />
                    {tab.label}
                    <span className="count">{tab.count}</span>
                  </button>
                ))}
              </div>
              <Row className="g-2 align-items-center mt-1">
                <Col xs={12} md={4}>
                  <div className="ev-select">
                    <i className="fas fa-map-marker-alt" />
                    <Form.Select size="sm" value={selectedBarangay} onChange={(e) => { setSelectedBarangay(e.target.value); setCurrentPage(1); }} aria-label="Filter by place">
                      <option value="all">All places ({getAllSchedules().length})</option>
                      {barangays.map(b => <option key={b} value={b}>{b} ({getBarangayCount(b)})</option>)}
                    </Form.Select>
                  </div>
                </Col>
                <Col xs={12} md={4}>
                  <div className="ev-select">
                    <i className="fas fa-filter" />
                    <Form.Select size="sm" value={filterRegistration} onChange={(e) => { setFilterRegistration(e.target.value); setCurrentPage(1); }} aria-label="Filter by registration">
                      <option value="all">Registered and not registered</option>
                      <option value="registered">Registered only</option>
                      <option value="unregistered">Not registered</option>
                    </Form.Select>
                  </div>
                </Col>
                <Col xs={12} md={4} className="text-md-end">
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    <strong style={{ color: '#1f2328' }}>{filteredSchedules.length}</strong> event{filteredSchedules.length !== 1 ? 's' : ''}
                    {selectedDate ? ` on ${keyToDate(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' upcoming'}
                  </span>
                </Col>
              </Row>
            </div>

            <div className="mt-3">
              {filteredSchedules.length === 0 ? (
                <div className="ev-panel ev-anim text-center" style={{ '--d': '0.25s', padding: '3rem 1.5rem' }}>
                  <div className="ev-empty-icon"><i className="fas fa-calendar-times" /></div>
                  <h5 style={{ fontWeight: 700, color: '#1f2328', marginTop: '1rem' }}>No events found</h5>
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                    {selectedDate
                      ? 'There are no events on this date. Pick another highlighted date on the calendar.'
                      : selectedBarangay !== 'all'
                        ? `No upcoming events in ${selectedBarangay}. Try another place.`
                        : 'Check back later for scheduled events in your area.'}
                  </p>
                  {(selectedDate || selectedBarangay !== 'all' || filterRegistration !== 'all' || activeTab !== 'all') && (
                    <button type="button" className="ev-btn ghost" onClick={() => { setSelectedDate(null); setSelectedBarangay('all'); setFilterRegistration('all'); setActiveTab('all'); setCurrentPage(1); }}>
                      <i className="fas fa-undo" /> Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {pagedGroups.map(([key, items], gi) => (
                    <div key={key} className="ev-group">
                      <div className="ev-group-head ev-anim" style={{ '--d': `${0.2 + gi * 0.05}s` }}>
                        {keyToDate(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        {key === todayKey && <span className="ev-today-tag">Today</span>}
                      </div>
                      {items.map((schedule, i) => {
                        const meta = typeMeta(schedule.type);
                        const status = getStatusMeta(schedule);
                        const slots = getSlots(schedule);
                        const action = getEventAction(schedule);
                        const registered = isScheduleRegistered(schedule);
                        const d = keyToDate(dateKey(schedule));
                        const pct = slots ? Math.min(100, Math.round((slots.taken / slots.total) * 100)) : 0;
                        return (
                          <div key={`${schedule.type}-${schedule.id}`} className="ev-card ev-anim" style={{ '--d': `${0.25 + gi * 0.05 + i * 0.06}s`, '--c': meta.color }}>
                            <div className="ev-date">
                              <span className="m">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                              <span className="d">{d.getDate()}</span>
                              <span className="w">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            </div>

                            <div className="ev-main">
                              <div className="ev-tags">
                                <span className="ev-tag" style={{ color: meta.color, background: `${meta.color}14` }}>
                                  <i className={`fas ${meta.icon}`} />{meta.label}
                                </span>
                                <span className="ev-tag" style={{ color: status.color, background: `${status.color}14` }}>{status.label}</span>
                                {registered && (
                                  <span className="ev-tag" style={{ color: '#198754', background: 'rgba(25,135,84,0.1)' }}>
                                    <i className="fas fa-check-circle" />Registered
                                  </span>
                                )}
                              </div>
                              <div className="ev-title">{schedule.title}</div>
                              <div className="ev-meta">
                                <span><i className="far fa-clock" />{formatClock(schedule.start_time)} – {formatClock(schedule.end_time)}</span>
                                {schedule.venue && <span><i className="fas fa-building" />{schedule.venue}</span>}
                                {(schedule.custom_place || schedule.barangay_name) && <span><i className="fas fa-map-marker-alt" />{schedule.custom_place || schedule.barangay_name}</span>}
                              </div>
                              {slots && (
                                <div className="ev-slots">
                                  <div className="ev-slots-bar"><div style={{ width: `${pct}%`, background: slots.left === 0 ? '#dc3545' : slots.left <= 10 ? '#e0a800' : '#198754' }} /></div>
                                  <span>
                                    {slots.left === 0 ? 'Fully booked' : `${slots.left} of ${slots.total} ${schedule.type === 'vaccination' ? 'vaccine slots' : 'slots'} left`}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="ev-actions">
                              <button type="button" className="ev-btn ghost" onClick={() => handleViewClick(schedule)}>
                                <i className="fas fa-eye" /> Details
                              </button>
                              {action && (
                                <button type="button" className={`ev-btn ${action.tone}`} onClick={action.onClick}
                                  disabled={action.tone === 'primary' && slots && slots.left === 0}>
                                  <i className={`fas ${action.icon}`} /> {action.tone === 'primary' && slots && slots.left === 0 ? 'Full' : action.label}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3 sched-pagination">
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Page <strong style={{ color: '#1f2328' }}>{currentPage}</strong> of {totalPages}</span>
                      <div className="d-flex gap-2">
                        <button type="button" className="ev-btn ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                          <i className="fas fa-chevron-left" /> Previous
                        </button>
                        <button type="button" className="ev-btn ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                          Next <i className="fas fa-chevron-right" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Col>
        </Row>
      )}

      {/* Requirements Reminder Modal — opened by the header button, read-only */}
      <Modal show={showRequirementsReminderModal} onHide={() => setShowRequirementsReminderModal(false)} centered scrollable dialogClassName="ev-modal" style={{ zoom: '0.75' }}>
        <Modal.Header closeButton className="ev-modal-head">
          <div className="d-flex align-items-center gap-3">
            <div className="ev-modal-icon" style={{ '--c': '#e0a800' }}><i className="fas fa-clipboard-check" /></div>
            <div>
              <Modal.Title as="h5" style={{ fontWeight: 700, color: '#1f2328', margin: 0 }}>Event requirements</Modal.Title>
              <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Please check these before bringing your pet</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.25rem 1.5rem' }}>
          <div className="ev-modal-label">Minimum age per event</div>
          <div className="ev-age-grid">
            {[
              { type: 'vaccination', age: '3 months' },
              { type: 'deworming', age: '2 weeks' },
              { type: 'sterilization', age: '6 months' },
            ].map(r => (
              <div key={r.type} className="ev-age" style={{ '--c': typeMeta(r.type).color }}>
                <i className={`fas ${typeMeta(r.type).icon}`} />
                <div>
                  <div className="t">{typeMeta(r.type).label}</div>
                  <div className="a">{r.age} old and above</div>
                </div>
              </div>
            ))}
          </div>

          <div className="ev-modal-label mt-3">Checklist</div>
          <div className="ev-checklist">
            {[
              { icon: 'fa-heartbeat', text: 'Your pet is visibly healthy, with no fever, vomiting, diarrhea, or weakness.' },
              { icon: 'fa-utensils', text: 'Your pet is fed and has had water before the event.' },
              { icon: 'fa-bath', text: 'Your pet is bathed or clean to prevent spreading illness.' },
              { icon: 'fa-paw', text: 'Dogs are on a leash and cats are inside a carrier.' },
              { icon: 'fa-notes-medical', text: 'Bring your pet\'s vet card or past health records, if any.' },
            ].map((item, i) => (
              <div key={i} className="ev-check">
                <span className="ic"><i className={`fas ${item.icon}`} /></span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="ev-modal-label mt-3">Helpful tips</div>
          <ul className="ev-tips">
            <li>For adopted pets with no birth date, count their age from the day you adopted them.</li>
            <li>Not sure of your pet's age? A vet can estimate it from the teeth and size.</li>
            <li>A pet that looks sick on the event day may be turned away, so register for a later event instead.</li>
            <li>Come early to avoid long lines.</li>
          </ul>

          <div className="ev-warning">
            <i className="fas fa-exclamation-triangle" />
            <span>If your pet does not meet the requirements on the event day, <strong>your reserved slot will be forfeited</strong> and cannot be transferred.</span>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #eef0f3', padding: '0.9rem 1.5rem' }}>
          <button type="button" className="ev-btn primary w-100 justify-content-center" style={{ padding: '0.65rem' }} onClick={() => setShowRequirementsReminderModal(false)}>
            <i className="fas fa-check" /> I understand
          </button>
        </Modal.Footer>
      </Modal>

      {/* Pre-Submit Confirmation Modal — short summary shown before submitting */}
      <Modal show={showVaccinationConfirmModal} onHide={() => { setShowVaccinationConfirmModal(false); setPendingVaccinationSubmit(null); }} centered dialogClassName="ev-modal sm" style={{ zoom: '0.75' }}>
        <Modal.Body style={{ padding: '1.75rem 1.75rem 1.25rem' }}>
          <div className="text-center">
            <div className="ev-modal-icon lg" style={{ '--c': '#e0a800', margin: '0 auto 1rem' }}><i className="fas fa-paw" /></div>
            <h5 style={{ fontWeight: 700, color: '#1f2328', marginBottom: '0.35rem' }}>Before you register</h5>
            <p style={{ fontSize: '0.88rem', color: '#6b7280', marginBottom: '1.1rem' }}>
              Please confirm that every pet you selected meets these requirements.
            </p>
          </div>
          <div className="ev-checklist">
            {[
              { icon: 'fa-birthday-cake', text: `${{ vaccination: '3 months', deworming: '2 weeks', sterilization: '6 months' }[scheduleType] || 'The required age'} old or above` },
              { icon: 'fa-heartbeat', text: 'Healthy, with no signs of illness' },
              { icon: 'fa-paw', text: 'On a leash or in a carrier on the event day' },
            ].map((item, i) => (
              <div key={i} className="ev-check">
                <span className="ic ok"><i className="fas fa-check" /></span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <div className="ev-warning mt-3" style={{ marginBottom: 0 }}>
            <i className="fas fa-info-circle" />
            <span>Pets that do not qualify on the event day will lose their reserved slot.</span>
          </div>
          <div className="text-center mt-3">
            <button type="button" className="ev-link" onClick={() => { setShowVaccinationConfirmModal(false); setPendingVaccinationSubmit(null); setShowRequirementsReminderModal(true); }}>
              <i className="fas fa-clipboard-list me-1" />View all requirements
            </button>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #eef0f3', padding: '0.9rem 1.5rem', gap: '0.6rem', flexWrap: 'nowrap' }}>
          <button type="button" className="ev-btn ghost flex-fill justify-content-center" style={{ padding: '0.6rem' }} onClick={() => { setShowVaccinationConfirmModal(false); setPendingVaccinationSubmit(null); }}>
            <i className="fas fa-arrow-left" /> Back
          </button>
          <button type="button" className="ev-btn primary flex-fill justify-content-center" style={{ padding: '0.6rem' }} onClick={handleVaccinationConfirmProceed}>
            <i className="fas fa-check" /> Yes, register
          </button>
        </Modal.Footer>
      </Modal>



      {/* Registration Confirmation Modal */}
      <Modal show={showConfirmRegistrationModal} onHide={() => setShowConfirmRegistrationModal(false)} size="md" centered style={{zoom: '0.75'}}>
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #f0fff4, #e6f9ee)', borderBottom: '2px solid #198754', borderRadius: '20px 20px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', color: '#198754' }}>
            <i className="fas fa-check-circle me-2"></i>
            Registration Confirmed!
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {lastRegistrationData && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(25,135,84,0.1)', border: '2px solid #198754', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <i className="fas fa-calendar-check" style={{ fontSize: '2rem', color: '#198754' }} />
                </div>
                <h5 style={{ fontWeight: '800', color: '#1a1a1a', marginBottom: '0.25rem' }}>
                  {lastRegistrationData.schedule?.title}
                </h5>
                <span style={{ fontSize: '0.82rem', color: '#888' }}>
                  {lastRegistrationData.scheduleType?.charAt(0).toUpperCase() + lastRegistrationData.scheduleType?.slice(1)} Event
                </span>
              </div>

              <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid #e9ecef' }}>
                {[
                  { icon: 'fa-calendar', label: 'Date', value: lastRegistrationData.schedule?.scheduled_date ? new Date(lastRegistrationData.schedule.scheduled_date).toLocaleDateString() : 'N/A' },
                  { icon: 'fa-clock', label: 'Time', value: `${lastRegistrationData.schedule?.start_time} - ${lastRegistrationData.schedule?.end_time}` },
                  { icon: 'fa-map-marker-alt', label: 'Place', value: lastRegistrationData.schedule?.custom_place || lastRegistrationData.schedule?.barangay_name },
                  { icon: 'fa-building', label: 'Venue', value: lastRegistrationData.schedule?.venue },
                ].map((item, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: i < arr.length - 1 ? '0.75rem' : 0, marginBottom: i < arr.length - 1 ? '0.75rem' : 0, borderBottom: i < arr.length - 1 ? '1px solid #e9ecef' : 'none' }}>
                    <i className={`fas ${item.icon}`} style={{ color: '#ffc107', fontSize: '0.85rem', marginTop: '3px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                      <div style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {lastRegistrationData.scheduleType === 'seminar' ? (
                <div style={{ background: 'rgba(25,135,84,0.06)', borderRadius: '10px', padding: '0.85rem 1rem', border: '1px solid rgba(25,135,84,0.2)', fontSize: '0.85rem', color: '#198754', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-user-check"></i>
                  <span>You are registered as an attendee for this seminar.</span>
                </div>
              ) : lastRegistrationData.pets?.length > 0 ? (
                <>
                  <div style={{ fontWeight: '700', color: '#333', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    <i className="fas fa-paw me-2" style={{ color: '#ffc107' }}></i>
                    Registered Pets ({lastRegistrationData.pets.length})
                  </div>
                  {lastRegistrationData.pets.map((pet, i) => (
                    <div key={i} style={{ background: 'rgba(25,135,84,0.05)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '0.5rem', border: '1px solid rgba(25,135,84,0.15)' }}>
                      <div style={{ fontWeight: '700', color: '#1a1a1a', fontSize: '0.95rem' }}>{pet.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#777', marginBottom: pet.vaccines?.length > 0 ? '0.5rem' : 0 }}>
                        <span className="text-capitalize">{pet.species}</span> • {pet.breed || 'Mixed'}
                      </div>
                      {pet.vaccines?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {pet.vaccines.map((v, vi) => (
                            <span key={vi} style={{ background: '#fff', border: '1px solid #198754', borderRadius: '20px', padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: '600', color: '#198754' }}>
                              <i className="fas fa-syringe me-1" style={{ fontSize: '0.65rem' }}></i>{v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : null}
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #e0e0e0', padding: '1rem 2rem' }}>
          <Button className="border-0 w-100" onClick={() => setShowConfirmRegistrationModal(false)}
            style={{ background: '#198754', color: '#fff', borderRadius: '10px', padding: '0.75rem', fontWeight: '700' }}>
            <i className="fas fa-check me-2"></i>Done
          </Button>
        </Modal.Footer>
      </Modal>

    {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" style={{zoom: '0.75'}} centered={window.innerWidth <= 768}>
        <Modal.Header 
          closeButton
          style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderBottom: '2px solid #ffc107',
            borderRadius: '20px 20px 0 0'
          }}
        >
          <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }}></i>
            Event Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedSchedule && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Type</strong>
                  </div>
                  {getScheduleTypeBadge(selectedSchedule.type)}
                </Col>
                <Col md={6}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Status</strong>
                  </div>
                  {getScheduleStatusBadge(selectedSchedule)}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Title</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.title}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Description</strong>
                  <p className="mb-0" style={{ color: '#333333' }}>{selectedSchedule.description || 'No description provided'}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Date</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{new Date(selectedSchedule.scheduled_date).toLocaleDateString()}</p>
                </Col>
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Time</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.start_time} - {selectedSchedule.end_time}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Place</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.custom_place || selectedSchedule.barangay_name}</p>
                </Col>
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Venue</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.venue}</p>
                </Col>
              </Row>

              {selectedSchedule.speaker && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Speaker</strong>
                    <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.speaker}</p>
                  </Col>
                </Row>
              )}
              {selectedSchedule && selectedSchedule.type === 'other' && selectedSchedule.other_event_type && (
  <Row className="mb-3">
    <Col md={12}>
      <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Event Type</strong>
      <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>
        {selectedSchedule.other_event_type}
      </p>
    </Col>
  </Row>
)}

              {/* Capacity based on type */}
              {selectedSchedule.type === 'vaccination' ? (
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
                        {getVaccineDetails(selectedSchedule).length === 0 ? (
                          <p className="text-muted mb-0">No vaccines available for this schedule</p>
                        ) : (
                          getVaccineDetails(selectedSchedule).map((vaccine, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                padding: '1rem', 
                                background: '#ffffff', 
                                borderRadius: '8px', 
                                marginBottom: idx !== getVaccineDetails(selectedSchedule).length - 1 ? '0.75rem' : '0', 
                                border: '1px solid #e0e0e0',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <div style={{ flex: 1 }}>
                                  <div className="d-flex align-items-center gap-2 mb-1">
                                    <strong style={{ fontSize: '1rem', color: '#333' }}>{vaccine.name}</strong>
                                    <span style={{ 
                                      fontSize: '0.7rem', 
                                      padding: '0.25rem 0.6rem', 
                                      background: '#6c757d', 
                                      color: '#fff', 
                                      borderRadius: '4px',
                                      fontWeight: '600',
                                      textTransform: 'uppercase'
                                    }}>
                                      {vaccine.species}
                                    </span>
                                  </div>
                                  {vaccine.description && (
                                    <small className="text-muted d-block mt-1">
                                      {vaccine.description}
                                    </small>
                                  )}
                                </div>
                                <div className="text-end">
  <div style={{ fontSize: '1.1rem' }}>
    <strong style={{ color: vaccine.registered >= vaccine.limit ? '#dc3545' : '#28a745' }}>
      {vaccine.registered}
    </strong>
    <span className="text-muted"> / {vaccine.limit}</span>
  </div>
  <small className="text-muted" style={{ fontSize: '0.75rem' }}>shots</small>
</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Col>
                  </Row>
                </>
              ) : selectedSchedule.max_capacity ? (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong style={{ fontSize: '0.9rem', color: '#666' }}>Capacity</strong>
                    <p className="mb-0">
                      <strong>{selectedSchedule.current_registrations || 0}</strong> / {selectedSchedule.max_capacity} registered
                    </p>
                  </Col>
                </Row>
              ) : null}

              {selectedSchedule.pet_types_allowed && selectedSchedule.type === 'deworming' && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Available for Pet Types</strong>
                    <div className="mt-2">
                      {(Array.isArray(selectedSchedule.pet_types_allowed)
                        ? selectedSchedule.pet_types_allowed
                        : JSON.parse(selectedSchedule.pet_types_allowed || '[]')
                      ).map((type, idx) => (
                        <Badge key={idx} bg="primary" className="me-2 mb-2">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}

              {selectedSchedule.sterilization_species && selectedSchedule.type === 'sterilization' && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Available for Pet Types</strong>
                    <div className="mt-2">
                      {(Array.isArray(selectedSchedule.sterilization_species)
                        ? selectedSchedule.sterilization_species
                        : JSON.parse(selectedSchedule.sterilization_species || '[]')
                      ).map((type, idx) => (
                        <Badge key={idx} bg="success" className="me-2 mb-2">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}
              {selectedSchedule && selectedSchedule.pet_types_allowed && selectedSchedule.type === 'other' && (() => {
  const allowedTypes = Array.isArray(selectedSchedule.pet_types_allowed)
    ? selectedSchedule.pet_types_allowed
    : JSON.parse(selectedSchedule.pet_types_allowed || '[]');
  
  if (allowedTypes.length === 0) return null;
  
  return (
    <Row className="mb-3">
      <Col md={12}>
        <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Available for Pet Types</strong>
        <div className="mt-2">
          {allowedTypes.map((type, idx) => (
            <Badge key={idx} bg="secondary" className="me-2 mb-2">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
          ))}
        </div>
      </Col>
    </Row>
  );
})()}
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
  <Button 
    variant="secondary" 
    onClick={() => setShowDetailsModal(false)}
    style={{
      borderRadius: '10px',
      padding: '0.75rem 1.5rem',
      fontWeight: '600'
    }}
  >
    Close
  </Button>
  
  {selectedSchedule && selectedSchedule.status !== 'completed' && selectedSchedule.status !== 'cancelled' && (() => {
    const now = new Date();
    const scheduleDate = new Date(selectedSchedule.scheduled_date);
    const [startHour, startMinute] = selectedSchedule.start_time.split(':');
    scheduleDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    return now < scheduleDate;
  })() && (
    <Button 
      onClick={() => {
        setShowDetailsModal(false);
        handleRegisterClick(selectedSchedule);
      }}
      className="border-0"
      style={{
        background: '#ffc107',
        color: '#000000',
        padding: '0.75rem 1.5rem',
        borderRadius: '12px',
        fontWeight: '700',
        boxShadow: '0 4px 15px rgba(255, 193, 7, 0.4)',
        transition: 'all 0.3s'
      }}
      onMouseOver={(e) => {
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)';
        e.target.style.background = '#ffb300';
      }}
      onMouseOut={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
        e.target.style.background = '#ffc107';
      }}
    >
      <i className="fas fa-user-plus me-2"></i>
      Register for Event
    </Button>
  )}
</Modal.Footer>
      </Modal>

      {/* Registration Modal */}
      <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} size="lg" backdrop="static" style={{zoom: '0.75'}} centered={window.innerWidth <= 768}>
        <Modal.Header 
  closeButton
  style={{
    background: '#f8f9fa',
    borderBottom: '2px solid #ffc107',
    borderRadius: '20px 20px 0 0'
  }}
        >
          <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
  <i className="fas fa-user-plus me-2"></i>
  Register for {
    scheduleType === 'vaccination' ? 'Vaccination' : 
    scheduleType === 'deworming' ? 'Deworming' :
    scheduleType === 'sterilization' ? 'Sterilization' :
    scheduleType === 'microchip' ? 'Microchip' :
    scheduleType === 'other' ? 'Other Event' :
    'Seminar'
  }
</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRegistrationSubmit}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
            {registerError && (
              <Alert 
                variant="danger"
                style={{
                  borderRadius: '12px',
                  border: '2px solid #dc3545',
                  background: 'rgba(220, 53, 69, 0.1)',
                  color: '#dc3545'
                }}
              >
                <i className="fas fa-exclamation-triangle me-2"></i>
                {registerError}
              </Alert>
            )}

            {registerSuccess && (
              <Alert 
                variant="success"
                style={{
                  borderRadius: '12px',
                  border: '2px solid #198754',
                  background: 'rgba(25, 135, 84, 0.1)',
                  color: '#198754'
                }}
              >
                <i className="fas fa-check-circle me-2"></i>
                {registerSuccess}
              </Alert>
            )}

            {selectedSchedule && (
              <div 
                className="mb-4"
                style={{
                  background: 'rgba(255, 193, 7, 0.05)',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  borderLeft: '4px solid #ffc107'
                }}
              >
                <h6 style={{ fontWeight: '700', color: '#333333' }}>{selectedSchedule.title}</h6>
                <p className="text-muted mb-0">
                  <i className="fas fa-calendar me-2"></i>
                  {new Date(selectedSchedule.scheduled_date).toLocaleDateString()} at {selectedSchedule.start_time}
                  <br />
                  <i className="fas fa-map-marker-alt me-2"></i>
                  {selectedSchedule.custom_place || selectedSchedule.barangay_name} — {selectedSchedule.venue}
                </p>
              </div>
            )}

            {scheduleType === 'vaccination' && (
              <>
                <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>Select pets and their vaccines:</h6>
                {compatiblePets.length === 0 ? (
                  <Alert 
                    variant="warning"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      background: 'rgba(255, 193, 7, 0.1)'
                    }}
                  >
                    {myPets.length === 0 
                      ? 'You don\'t have any registered pets yet. Please register your pets first.'
                      : 'No eligible pets for this vaccination event.'
                    }
                  </Alert>
                ) : (
                  <div className="mb-4">
                    {compatiblePets
                      .sort((a, b) => {
                        if (a.isRegistered && !b.isRegistered) return -1;
                        if (!a.isRegistered && b.isRegistered) return 1;
                        return 0;
                      })
                      .map(pet => {
                        const availableVaccines = getAvailableVaccinesForPet(
                          pet.species, 
                          selectedSchedule?.vaccine_shot_limits
                        );
                        
                        return (
                          <div 
                            key={pet.id} 
                            className="mb-4" 
                            style={{ 
                              background: pet.isRegistered ? '#e8f5e9' : '#ffffff',
                              padding: '1.25rem',
                              borderRadius: '12px',
                              border: pet.isRegistered ? '2px solid #4caf50' : '2px solid #e0e0e0',
                              position: 'relative'
                            }}
                          >
                            {pet.isRegistered ? (
  <div>
    <div className="d-flex justify-content-between align-items-start mb-3">
      <div className="flex-grow-1">
        <div className="d-flex align-items-center mb-2">
          <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem' }}></i>
          <div>
            <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
            <Badge bg="success" className="ms-2">Registered</Badge>
          </div>
        </div>
        <small className="text-muted d-block">
          <i className="fas fa-paw me-1"></i>
          {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
        </small>
      </div>
      <button
  type="button"
  onClick={() => handleCancelSelectedOrAll(pet.id, pet.registration_id)}
  disabled={registerLoading}
  style={{
    background: '#dc3545',
    color: '#ffffff',
    border: 'none',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: registerLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    opacity: registerLoading ? 0.6 : 1
  }}
  onMouseOver={(e) => !registerLoading && (e.target.style.background = '#c82333')}
  onMouseOut={(e) => !registerLoading && (e.target.style.background = '#dc3545')}
>
  <i className="fas fa-times"></i>
{(selectedVaccinesToCancel[pet.id] || []).length > 0 ? 'Cancel Selected' : 'Cancel All'}
</button>
    </div>
    
    {/* Show registered vaccines */}
    <div 
      style={{
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #dee2e6'
      }}
    >
      <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.75rem' }}>
        Registered vaccines for {pet.name}:
      </strong>
      
      {(() => {
const registration = currentRegistrations.find(r => r.pet_id === pet.id);
        const registeredVaccineIds = registration?.selected_vaccines || [];
        
        if (registeredVaccineIds.length === 0) {
          return (
            <Alert 
              variant="info" 
              className="mb-0 py-2"
              style={{
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            >
              <small>No vaccines registered yet</small>
            </Alert>
          );
        }
        
        return registeredVaccineIds.map(vaccineId => {
  const vaccineType = inventoryItems.find(i => i.id === parseInt(vaccineId));
const isSelected = (selectedVaccinesToCancel[pet.id] || []).includes(vaccineId);  
  return (
    <div 
      key={vaccineId}
      style={{
        background: isSelected ? '#fff3cd' : '#e8f5e9',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        marginBottom: '0.5rem',
        border: isSelected ? '2px solid #ffc107' : '2px solid #4caf50',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Form.Check
  type="checkbox"
  checked={isSelected}
  onChange={(e) => handleVaccineCancelSelection(pet.id, vaccineId, e.target.checked)}
  disabled={registerLoading}
  style={{ marginTop: '0' }}
/>
        <div style={{ flex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-1">
            <strong style={{ fontSize: '0.95rem' }}>{vaccineType?.item_name || vaccineType?.name || 'Unknown Vaccine'}</strong>
            <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
              {vaccineType?.species?.toUpperCase() || 'N/A'}
            </Badge>
          </div>
          {vaccineType?.description && (
            <small className="text-muted d-block">
              {vaccineType.description}
            </small>
          )}
        </div>
      </div>
    </div>
  );
});
      })()}
    </div>
  </div>
) : (
                              <div>
                                <div className="d-flex align-items-start mb-3">
                                  <Form.Check
                                    type="checkbox"
                                    id={`pet_${pet.id}`}
                                    onChange={() => handlePetSelectionToggle(pet.id)}
                                    disabled={registerLoading}
                                    checked={pet.selectedVaccines !== undefined}
                                    style={{ marginTop: '0.4rem' }}
                                  />
                                  <label 
                                    className="w-100 ms-2" 
                                    htmlFor={`pet_${pet.id}`}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: '1.1rem' }}>{pet.name}</strong>
                                      <br />
                                      <small className="text-muted">
                                        <i className="fas fa-paw me-1"></i>
                                        {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                      </small>
                                    </div>
                                  </label>
                                </div>
                                
                                {pet.selectedVaccines !== undefined && (
                                  <div 
                                    style={{
                                      marginTop: '1rem',
                                      paddingTop: '1rem',
                                      borderTop: '1px solid #dee2e6'
                                    }}
                                  >
                                    <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.75rem' }}>
                                      Select vaccines for {pet.name}:
                                    </strong>
                                    
                                    {availableVaccines.length === 0 ? (
                                      <Alert 
                                        variant="info" 
                                        className="mb-0 py-2"
                                        style={{
                                          borderRadius: '8px',
                                          fontSize: '0.875rem'
                                        }}
                                      >
                                        <small>No vaccines available for this pet type</small>
                                      </Alert>
                                    ) : (
                                      <div>
                                        {availableVaccines.map(vaccine => (
                                          <div 
                                            key={vaccine.id}
                                            style={{
                                              background: pet.selectedVaccines?.includes(vaccine.id) ? '#fff9e6' : '#f8f9fa',
                                              padding: '0.75rem',
                                              borderRadius: '8px',
                                              marginBottom: '0.5rem',
                                              border: pet.selectedVaccines?.includes(vaccine.id) ? '2px solid #ffc107' : '1px solid #e0e0e0'
                                            }}
                                          >
                                            <Form.Check
                                              type="checkbox"
                                              id={`vaccine_${pet.id}_${vaccine.id}`}
                                              checked={pet.selectedVaccines?.includes(vaccine.id) || false}
                                              onChange={(e) => handleVaccineSelection(pet.id, vaccine.id, e.target.checked)}
                                              disabled={registerLoading}
                                              label={
                                                <div>
                                                  <strong>{vaccine.name}</strong>
                                                  <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>
                                                    {vaccine.species.toUpperCase()}
                                                  </Badge>
                                                  <Badge bg="info" className="ms-1" style={{ fontSize: '0.7rem' }}>
                                                    {vaccine.shotsRemaining} shots left
                                                  </Badge>
                                                  {vaccine.description && (
                                                    <small className="text-muted d-block mt-1">
                                                      {vaccine.description}
                                                    </small>
                                                  )}
                                                </div>
                                              }
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}

            {scheduleType === 'deworming' && (
              <>
                <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>Select pets for deworming:</h6>
                {compatiblePets.length === 0 ? (
                  <Alert 
                    variant="warning"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      background: 'rgba(255, 193, 7, 0.1)'
                    }}
                  >
                    {myPets.length === 0 
                      ? 'You don\'t have any registered pets yet. Please register your pets first.'
                      : 'No compatible pets for this deworming event.'
                    }
                  </Alert>
                ) : (
                  <div className="mb-4">
                    {compatiblePets
                      .sort((a, b) => {
                        const ageCheckA = meetsAgeRequirement(a, 'deworming');
                        const ageCheckB = meetsAgeRequirement(b, 'deworming');
                        if (a.isRegistered && !b.isRegistered) return -1;
                        if (!a.isRegistered && b.isRegistered) return 1;
                        if (ageCheckA.meets && !ageCheckB.meets) return -1;
                        if (!ageCheckA.meets && ageCheckB.meets) return 1;
                        return 0;
                      })
                      .map(pet => {
                        const ageCheck = meetsAgeRequirement(pet, 'deworming');
                        
                        return (
                          <div 
                            key={pet.id} 
                            className="mb-3" 
                            style={{ 
                              background: pet.isRegistered ? '#e8f5e9' : (ageCheck.meets ? '#ffffff' : '#f5f5f5'),
                              padding: '1rem',
                              borderRadius: '12px',
                              border: pet.isRegistered ? '2px solid #4caf50' : (ageCheck.meets ? '2px solid #e0e0e0' : '2px solid #ffc107'),
                              position: 'relative',
                              opacity: ageCheck.meets ? 1 : 0.7
                            }}
                          >
                            {pet.isRegistered ? (
                              <div className="d-flex justify-content-between align-items-center" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem', flexShrink: 0 }}></i>
                                    <div style={{ minWidth: 0 }}>
                                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                      <Badge bg="success" className="ms-2">Registered</Badge>
                                    </div>
                                  </div>
                                  <small className="text-muted d-block">
                                    <i className="fas fa-paw me-1"></i>
                                    {pet.species} • {pet.breed ||'Mixed'} • {pet.gender}
                                  </small>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCancelRegistration(pet.id, pet.registration_id)}
                                  disabled={registerLoading}
                                  style={{
                                    background: '#dc3545',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    cursor: registerLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    opacity: registerLoading ? 0.6 : 1,
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseOver={(e) => !registerLoading && (e.currentTarget.style.background = '#c82333')}
                                  onMouseOut={(e) => !registerLoading && (e.currentTarget.style.background = '#dc3545')}
                                >
                                  <i className="fas fa-times"></i>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`pet_deworm_${pet.id}`}
                                    onChange={(e) => handlePetSelection(pet.id, e.target.checked)}
                                    disabled={registerLoading || !ageCheck.meets}
                                    checked={registrationData.pets_registered.includes(pet.id)}
                                    style={{ marginTop: '0.4rem' }}
                                  />
                                  <label 
                                    className="form-check-label w-100" 
                                    htmlFor={`pet_deworm_${pet.id}`}
                                    style={{ cursor: ageCheck.meets ? 'pointer' : 'not-allowed' }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                      {!ageCheck.meets && (
                                        <Badge bg="warning" className="ms-2">Age Restriction</Badge>
                                      )}
                                      <br />
                                      <small className="text-muted">
                                        <i className="fas fa-paw me-1"></i>
                                        {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                      </small>
                                    </div>
                                  </label>
                                </div>
                                {!ageCheck.meets && (
                                  <Alert variant="warning" className="mt-2 mb-0 py-2" style={{ borderRadius: '8px', fontSize: '0.875rem' }}>
                                    <small>
                                      <i className="fas fa-exclamation-triangle me-2"></i>
                                      {ageCheck.reason}
                                    </small>
                                  </Alert>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}

            {scheduleType === 'sterilization' && (
              <>
                <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>Select pets for sterilization:</h6>
                {compatiblePets.length === 0 ? (
                  <Alert 
                    variant="warning"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      background: 'rgba(255, 193, 7, 0.1)'
                    }}
                  >
                    {myPets.length === 0 
                      ? 'You don\'t have any registered pets yet. Please register your pets first.'
                      : 'No compatible pets for this sterilization event.'
                    }
                  </Alert>
                ) : (
                  <div className="mb-4">
                    {compatiblePets
                      .sort((a, b) => {
                        const ageCheckA = meetsAgeRequirement(a, 'sterilization');
                        const ageCheckB = meetsAgeRequirement(b, 'sterilization');
                        if (a.isRegistered && !b.isRegistered) return -1;
                        if (!a.isRegistered && b.isRegistered) return 1;
                        if (ageCheckA.meets && !ageCheckB.meets) return -1;
                        if (!ageCheckA.meets && ageCheckB.meets) return 1;
                        return 0;
                      })
                      .map(pet => {
                        const ageCheck = meetsAgeRequirement(pet, 'sterilization');
                        
                        return (
                          <div 
                            key={pet.id} 
                            className="mb-3" 
                            style={{ 
                              background: pet.isRegistered ? '#e8f5e9' : (ageCheck.meets ? '#ffffff' : '#f5f5f5'),
                              padding: '1rem',
                              borderRadius: '12px',
                              border: pet.isRegistered ? '2px solid #4caf50' : (ageCheck.meets ? '2px solid #e0e0e0' : '2px solid #ffc107'),
                              position: 'relative',
                              opacity: ageCheck.meets ? 1 : 0.7
                            }}
                          >
                            {pet.isRegistered ? (
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem' }}></i>
                                    <div>
                                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                      <Badge bg="success" className="ms-2">Registered</Badge>
                                    </div>
                                  </div>
                                  <small className="text-muted d-block">
                                    <i className="fas fa-paw me-1"></i>
                                    {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                  </small>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCancelRegistration(pet.id, pet.registration_id)}
                                  disabled={registerLoading}
                                  style={{
                                    background: '#dc3545',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    cursor: registerLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    opacity: registerLoading ? 0.6 : 1
                                  }}
                                  onMouseOver={(e) => !registerLoading && (e.target.style.background = '#c82333')}
                                  onMouseOut={(e) => !registerLoading && (e.target.style.background = '#dc3545')}
                                >
                                  <i className="fas fa-times"></i>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`pet_steril_${pet.id}`}
                                    onChange={(e) => handlePetSelection(pet.id, e.target.checked)}
                                    disabled={registerLoading || !ageCheck.meets}
                                    checked={registrationData.pets_registered.includes(pet.id)}
                                    style={{ marginTop: '0.4rem' }}
                                  />
                                  <label 
                                    className="form-check-label w-100" 
                                    htmlFor={`pet_steril_${pet.id}`}
                                    style={{ cursor: ageCheck.meets ? 'pointer' : 'not-allowed' }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                      {!ageCheck.meets && (
                                        <Badge bg="warning" className="ms-2">Age Restriction</Badge>
                                      )}
                                      <br />
                                      <small className="text-muted">
                                        <i className="fas fa-paw me-1"></i>
                                        {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                      </small>
                                    </div>
                                  </label>
                                </div>
                                {!ageCheck.meets && (
                                  <Alert variant="warning" className="mt-2 mb-0 py-2" style={{ borderRadius: '8px', fontSize: '0.875rem' }}>
                                    <small>
                                      <i className="fas fa-exclamation-triangle me-2"></i>
                                      {ageCheck.reason}
                                    </small>
                                  </Alert>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
            {scheduleType === 'microchip' && (
              <>
                <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>Select pets for microchipping:</h6>
                {compatiblePets.length === 0 ? (
                  <Alert 
                    variant="warning"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      background: 'rgba(255, 193, 7, 0.1)'
                    }}
                  >
                    {myPets.length === 0 
                      ? 'You don\'t have any registered pets yet. Please register your pets first.'
                      : 'No compatible pets for this microchipping event.'
                    }
                  </Alert>
                ) : (
                  <div className="mb-4">
                    {compatiblePets
                      .sort((a, b) => {
                        if (a.isRegistered && !b.isRegistered) return -1;
                        if (!a.isRegistered && b.isRegistered) return 1;
                        return 0;
                      })
                      .map(pet => (
                        <div 
                          key={pet.id} 
                          className="mb-3" 
                          style={{ 
                            background: pet.isRegistered ? '#e8f5e9' : '#ffffff',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: pet.isRegistered ? '2px solid #4caf50' : '2px solid #e0e0e0'
                          }}
                        >
                          {pet.isRegistered ? (
                            <div className="d-flex justify-content-between align-items-center" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
                              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem', flexShrink: 0 }}></i>
                                  <div style={{ minWidth: 0 }}>
                                    <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                    <Badge bg="success" className="ms-2">Registered</Badge>
                                  </div>
                                </div>
                                <small className="text-muted d-block">
                                  <i className="fas fa-paw me-1"></i>
                                  {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                </small>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelRegistration(pet.id, pet.registration_id)}
                                disabled={registerLoading}
                                style={{
                                  background: '#dc3545',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  cursor: registerLoading ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  opacity: registerLoading ? 0.6 : 1,
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseOver={(e) => !registerLoading && (e.currentTarget.style.background = '#c82333')}
                                onMouseOut={(e) => !registerLoading && (e.currentTarget.style.background = '#dc3545')}
                              >
                                <i className="fas fa-times"></i>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`pet_microchip_${pet.id}`}
                                onChange={(e) => handlePetSelection(pet.id, e.target.checked)}
                                disabled={registerLoading}
                                checked={registrationData.pets_registered.includes(pet.id)}
                                style={{ marginTop: '0.4rem' }}
                              />
                              <label 
                                className="form-check-label w-100" 
                                htmlFor={`pet_microchip_${pet.id}`}
                                style={{ cursor: 'pointer' }}
                              >
                                <div>
                                  <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                  <br />
                                  <small className="text-muted">
                                    <i className="fas fa-paw me-1"></i>
                                    {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                  </small>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

            {scheduleType === 'other' && (() => {
  // Check if pet selection is required
  const petTypesAllowed = selectedSchedule?.pet_types_allowed;
  const hasPetTypes = petTypesAllowed && (
    (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
    (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
  );

  if (!hasPetTypes) {
    // Seminar-like registration (no pet selection required)
    const isAlreadyRegistered = currentRegistrations.some(r => 
      r.schedule_id === selectedSchedule?.id && 
      r.schedule_type === 'other' &&
      r.status !== 'cancelled'
    );

    if (isAlreadyRegistered) {
      const registration = currentRegistrations.find(r => 
        r.schedule_id === selectedSchedule?.id && 
        r.schedule_type === 'other' &&
        r.status !== 'cancelled'
      );

      return (
        <Alert variant="success" style={{ borderRadius: '12px' }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <i className="fas fa-check-circle me-2"></i>
              <strong>You are already registered for this event</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setPetToCancel({ petId: null, registrationId: registration.id });
                setShowCancelConfirm(true);
              }}
              disabled={registerLoading}
              style={{
                background: '#dc3545',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: registerLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-times me-2"></i>
              Cancel Registration
            </button>
          </div>
        </Alert>
      );
    }

    return (
      <Alert variant="info" style={{ borderRadius: '12px' }}>
        <i className="fas fa-info-circle me-2"></i>
        Click "Confirm Registration" below to register for this event.
      </Alert>
    );
  }

  // Pet selection required
  return (
    <>
      <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>
        Select pets for {selectedSchedule?.other_event_type || 'this event'}:
      </h6>
      {compatiblePets.length === 0 ? (
        <Alert 
          variant="warning"
          style={{
            borderRadius: '12px',
            border: '2px solid #ffc107',
            background: 'rgba(255, 193, 7, 0.1)'
          }}
        >
          {myPets.length === 0 
            ? 'You don\'t have any registered pets yet. Please register your pets first.'
            : 'No compatible pets for this event.'
          }
        </Alert>
      ) : (
        <div className="mb-4">
          {compatiblePets.map(pet => (
            <div 
              key={pet.id} 
              className="mb-3" 
              style={{ 
                background: pet.isRegistered ? '#e8f5e9' : '#ffffff',
                padding: '1rem',
                borderRadius: '12px',
                border: pet.isRegistered ? '2px solid #4caf50' : '2px solid #e0e0e0'
              }}
            >
              {pet.isRegistered ? (
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem' }}></i>
                      <div>
                        <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                        <Badge bg="success" className="ms-2">Registered</Badge>
                      </div>
                    </div>
                    <small className="text-muted d-block">
                      <i className="fas fa-paw me-1"></i>
                      {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelRegistration(pet.id, pet.registration_id)}
                    disabled={registerLoading}
                    style={{
                      background: '#dc3545',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: registerLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      opacity: registerLoading ? 0.6 : 1
                    }}
                    onMouseOver={(e) => !registerLoading && (e.target.style.background = '#c82333')}
                    onMouseOut={(e) => !registerLoading && (e.target.style.background = '#dc3545')}
                  >
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`pet_other_${pet.id}`}
                    onChange={(e) => handlePetSelection(pet.id, e.target.checked)}
                    disabled={registerLoading}
                    checked={registrationData.pets_registered.includes(pet.id)}
                    style={{ marginTop: '0.4rem' }}
                  />
                  <label 
                    className="form-check-label w-100" 
                    htmlFor={`pet_other_${pet.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                      <br />
                      <small className="text-muted">
                        <i className="fas fa-paw me-1"></i>
                        {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                      </small>
                    </div>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
})()}
            
          </Modal.Body>
          <Modal.Footer style={{ padding: '1.5rem', borderTop: '1px solid #e0e0e0' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowRegisterModal(false)}
              disabled={registerLoading}
              style={{
                borderRadius: '10px',
                padding: '0.75rem 1.5rem',
                fontWeight: '600'
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={registerLoading || (
  scheduleType === 'vaccination' 
    ? compatiblePets.filter(p => p.selectedVaccines && p.selectedVaccines.length > 0).length === 0
    : (scheduleType === 'deworming' || scheduleType === 'sterilization' || scheduleType === 'microchip')
      ? registrationData.pets_registered.length === 0 && compatiblePets.filter(p => !p.isRegistered).length > 0
      : scheduleType === 'other'
        ? (() => {
            const petTypesAllowed = selectedSchedule?.pet_types_allowed;
            const hasPetTypes = petTypesAllowed && (
              (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
              (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
            );
            return hasPetTypes ? registrationData.pets_registered.length === 0 : false;
          })()
        : false
)}
              className="border-0"
              style={{
                background: registerLoading ? '#6c757d' : '#ffc107',
                color: '#000000',
                borderRadius: '10px',
                padding: '0.75rem 1.5rem',
                fontWeight: '700',
                boxShadow: registerLoading ? 'none' : '0 4px 15px rgba(255, 193, 7, 0.4)',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                if (!registerLoading) {
                  e.target.style.background = '#ffb300';
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)';
                }
              }}
              onMouseOut={(e) => {
                if (!registerLoading) {
                  e.target.style.background = '#ffc107';
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
                }
              }}
            >
              {registerLoading ? (
                <WaveDots />
              ) : (
                <>
                  <i className="fas fa-check me-2"></i>
                  Confirm Registration
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal 
  show={showCancelConfirm} 
  onHide={() => setShowCancelConfirm(false)}
  centered
  style={{ zoom: '0.75', ...(window.innerWidth <= 768 ? {} : { top: '0', alignItems: 'flex-start' }) }}
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
      Confirm Cancel Registration
    </Modal.Title>
  </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
    <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
      {vaccineToCancel?.vaccineIds?.length > 0
        ? `Are you sure you want to cancel ${vaccineToCancel.vaccineIds.length} selected vaccine${vaccineToCancel.vaccineIds.length > 1 ? 's' : ''}?`
        : vaccineToCancel 
          ? 'Are you sure you want to cancel this vaccine? The pet will remain registered for other vaccines.'
          : 'Are you sure you want to cancel the entire registration for this pet?'
      }
    </p>
    <Alert variant="warning" className="mt-3 mb-0">
      <i className="fas fa-info-circle me-2"></i>
      <strong>Warning:</strong> This action cannot be undone. You will need to register again if you change your mind.
    </Alert>
  </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
    <Button 
      variant="secondary" 
      onClick={() => {
        setShowCancelConfirm(false);
        setPetToCancel(null);
        setVaccineToCancel(null);
        // Clear selections for the specific pet
        if (vaccineToCancel?.petId) {
          setSelectedVaccinesToCancel(prev => {
            const updated = { ...prev };
            delete updated[vaccineToCancel.petId];
            return updated;
          });
        }
      }}
      disabled={registerLoading}
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
      onClick={confirmCancelRegistration}
      disabled={registerLoading}
      style={{
        borderRadius: '8px',
        padding: '0.75rem 1.5rem',
        fontWeight: '600'
      }}
    >
      {registerLoading ? (
        <WaveDots color="#ffffff" />
      ) : (
        <>
          <i className="fas fa-times me-2"></i>
          Cancel Registration
        </>
      )}
    </Button>
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

    </Container>
    </>
  );
};
export default OwnerSchedule;