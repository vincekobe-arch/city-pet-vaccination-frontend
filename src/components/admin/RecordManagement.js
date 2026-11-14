import React, { useState, useEffect, useRef } from 'react';
  import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Modal, Form, InputGroup, Tabs, Tab } from 'react-bootstrap';
  import { vaccinationAPI, dewormingAPI, sterilizationAPI, microchipAPI, petAPI, handleAPIError } from '../../services/api';
  import { getUser } from '../../utils/auth';
  import QRCode from 'qrcode';
import api from '../../services/api';
import { todayPH, freshTodayPH } from '../../utils/serverTime';

  const RecordManagement = () => {
    const [vaccinations, setVaccinations] = useState([]);
  const [dewormings, setDewormings] = useState([]);
  const [sterilizations, setSterilizations] = useState([]);
  const [microchips, setMicrochips] = useState([]);
    const [pets, setPets] = useState([]);
    const [vaccinationTypes, setVaccinationTypes] = useState([]);
    const [dewormingTypes, setDewormingTypes] = useState([]);
    const [inventoryVaccines, setInventoryVaccines] = useState([]);
    const [vaccineBatches, setVaccineBatches] = useState({}); // { inventoryId: [batches] }
    const [selectedVaccineBatch, setSelectedVaccineBatch] = useState(null); // batch id
    const [microchipBatches, setMicrochipBatches] = useState([]);
    const [selectedMicrochipBatch, setSelectedMicrochipBatch] = useState(null);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [inventoryItems, setInventoryItems] = useState([]); // full inventory
    const inventoryItemsRef = useRef([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [floatingSuccess, setFloatingSuccess] = useState('');

    const [showPetSearchModal, setShowPetSearchModal] = useState(false);
const [petSearchTerm, setPetSearchTerm] = useState('');

const [showConfirmRecordModal, setShowConfirmRecordModal] = useState(false);
const [pendingSubmitEvent, setPendingSubmitEvent] = useState(null);
const [showAgeConfirmModal, setShowAgeConfirmModal] = useState(false);
    
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [modalMode, setModalMode] = useState('create');
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showDropdown, setShowDropdown] = useState(null);

  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
const [showRestoreModal, setShowRestoreModal] = useState(false);
const [recordToRestore, setRecordToRestore] = useState(null);
const [restoreLoading, setRestoreLoading] = useState(false);
const [restoreDueDate, setRestoreDueDate] = useState('');
const [restoreReason, setRestoreReason] = useState('');
const [restoreError, setRestoreError] = useState('');
    // QR code
    const [qrDataURL, setQrDataURL] = useState('');
    const [qrLoading, setQrLoading] = useState(false);

    // Filters
    const [filterRecordType, setFilterRecordType] = useState('all');
    const [filterSpecies, setFilterSpecies] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('active'); // 'active' | 'trash'
const [filterClinic, setFilterClinic] = useState('city_vet');    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [displayCounts, setDisplayCounts] = useState({ vaccinations: 0, sterilizations: 0, microchips: 0 });
    const [hasAnimated, setHasAnimated] = useState(false);
    
    const styles = `
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
      .record-management-page {
  zoom: 0.75;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
@media (min-width: 1600px) { .record-management-page { zoom: 0.9; } }
@media (min-width: 1920px) { .record-management-page { zoom: 1; } }

@media (max-width: 768px) {
  .mobile-title { font-size: 1.5rem !important; }
  .mobile-stat-label { font-size: 0.6rem !important; margin-bottom: 0.25rem !important; }
  .mobile-stat-number { font-size: 1.2rem !important; }
  .mobile-stat-description { display: none !important; }
  .mobile-card-padding { padding: 0.5rem 0.3rem !important; }
  .mobile-card-header { padding: 1rem !important; }
  .mobile-card-header h5 { font-size: 0.95rem !important; }
  .mobile-card-body { padding: 1rem !important; }
  .mobile-table-wrap th, .mobile-table-wrap td { font-size: 0.7rem !important; padding: 0.5rem 0.3rem !important; }
  .mobile-table-wrap .mobile-hide { display: none !important; }
  .mobile-pagination { font-size: 0.75rem !important; }
  .mobile-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
  .mobile-pagination .page-info { font-size: 0.75rem !important; }
  .mobile-stat-icon { width: 30px !important; height: 30px !important; border-radius: 8px !important; }
  .mobile-stat-icon img { width: 18px !important; height: 18px !important; }
  .mobile-add-btn span { display: inline !important; }
  .record-type-scroll { gap: 0.5rem !important; }
  .record-type-scroll > div { min-width: 120px !important; padding: 0.75rem !important; }
  .record-type-scroll > div div { font-size: 0.8rem !important; }
  .record-type-scroll img { width: 30px !important; height: 30px !important; }
  .record-view-modal .modal-body { padding: 0 !important; }
  .record-view-modal .record-banner { padding: 1.25rem !important; }
  .record-view-modal .record-banner > div { flex-direction: column !important; gap: 0.5rem !important; align-items: flex-start !important; }
  .record-view-modal .record-banner > div > div { text-align: left !important; }
  .record-view-modal .record-body { padding: 1.25rem !important; }
  .record-view-modal .pet-info-card { padding: 1rem 1.25rem !important; margin-bottom: 1rem !important; }
  .record-view-modal .detail-grid { grid-template-columns: 1fr !important; gap: 0.85rem !important; margin-bottom: 1rem !important; }
  .record-view-modal .detail-label { font-size: 0.78rem !important; }
  .record-view-modal .detail-value { font-size: 0.95rem !important; }
  .record-view-modal .microchip-number { font-size: 1rem !important; padding: 0.4rem 0.75rem !important; }
  .record-view-modal .qr-section { padding-top: 1rem !important; margin-top: 0.25rem !important; }
  .record-view-modal .qr-inner { flex-direction: column !important; align-items: center !important; gap: 1rem !important; padding: 1rem !important; }
  .record-view-modal .qr-inner img { width: 160px !important; height: 160px !important; }
  .record-view-modal .qr-text { text-align: center !important; }
}

    /* ---------------- Record Management ---------------- */
    @keyframes rmIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes rmRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes rmMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes rmToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes rmGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .rm-anim { animation: rmIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .rm-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .rm-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .rm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.86rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .rm-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .rm-btn.primary { background: #ffc107; color: #1f2328; }
    .rm-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }

    .rm-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: rmToast 0.35s ease-out; }
    .rm-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rm-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .rm-toast .d { color: #6b7280; font-size: 0.84rem; }
    .rm-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .rm-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .rm-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); overflow: hidden; }
    .rm-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; border-bottom: 1px solid #eef0f3; }
    .rm-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
    .rm-panel-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .rm-panel-sub { font-size: 0.76rem; color: #6b7280; }

    .rm-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem 0.75rem; }
    .rm-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: #1f2328; }
    .rm-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .rm-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f3f4f6; }
    .rm-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #5b6270; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .rm-seg button:hover { color: #1f2328; }
    .rm-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .rm-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0 1.25rem 1rem; border-bottom: 1px solid #eef0f3; }
    .rm-search, .rm-select { position: relative; }
    .rm-search { flex: 1 1 260px; }
    .rm-search > i, .rm-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.78rem; pointer-events: none; }
    .rm-input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .rm-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.rm-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
    .rm-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: #9ca3af; }
    .rm-clear:hover { background: #f3f4f6; color: #1f2328; }
    .rm-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
    .rm-link:hover { text-decoration: underline; }

    .rm-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .rm-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .rm-table td { padding: 0.8rem 0.65rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .rm-table tbody tr { animation: rmRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .rm-table tbody tr:hover { background: #fafbfc; }
    .rm-table tbody tr:last-child td { border-bottom: none; }
    .rm-table tbody tr.raised { position: relative; z-index: 5; }
    .rm-strong { font-weight: 600; color: #1f2328; }
    .rm-muted { font-size: 0.78rem; color: #6b7280; }
    .rm-ellipsis { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rm-date { width: 48px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.35rem 0; line-height: 1.1; }
    .rm-date .m { display: block; font-size: 0.62rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .rm-date .d { display: block; font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .rm-type-ic { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .rm-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 130px; }
    .rm-bar > div { height: 100%; border-radius: 3px; transform-origin: left; animation: rmGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
    .rm-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .rm-pill i { font-size: 0.4rem; }

    .rm-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .rm-icon-btn:hover, .rm-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .rm-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1050; animation: rmMenu 0.16s ease-out; transform-origin: top right; text-align: left; }
    .rm-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
    .rm-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .rm-menu-item:hover { background: #f6f7f9; }
    .rm-menu-item.danger, .rm-menu-item.danger i { color: #dc3545; }
    .rm-menu-item.danger:hover { background: #fff5f5; }
    .rm-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }

    .rm-empty { text-align: center; padding: 3rem 1rem; }
    .rm-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .rm-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .rm-empty p { color: #6b7280; font-size: 0.88rem; margin-bottom: 1rem; }
    .rm-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }

    .rm-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid #eef0f3; }
    .rm-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .rm-page:hover:not(:disabled) { background: #f3f4f6; }
    .rm-page.on { background: #ffc107; color: #1f2328; }
    .rm-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .rm-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .rm-btn:focus-visible, .rm-seg button:focus-visible, .rm-icon-btn:focus-visible, .rm-menu-item:focus-visible, .rm-page:focus-visible, .rm-link:focus-visible, .rm-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .rm-title { font-size: 1.45rem; }
      .rm-sub { font-size: 0.85rem; }
      .rm-filters select.rm-input { min-width: 0; width: 100%; }
      .rm-select { flex: 1 1 140px; }
      .rm-ellipsis { max-width: 160px; }
      .rm-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .rm-anim, .rm-table tbody tr, .rm-menu, .rm-toast, .rm-bar > div, .rm-skel { animation: none !important; }
    }
    .rm-table { table-layout: fixed; }
    .rm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.01em; }
    .rm-toolbar { border-bottom: 1px solid #eef0f3; padding-bottom: 1rem; }
    .rm-filters { border-bottom: 1px solid #eef0f3; padding-top: 1rem; }
    .rm-tabs { display: inline-flex; gap: 0.25rem; padding: 4px; border-radius: 12px; background: #f3f4f6; max-width: 100%; overflow-x: auto; }
    .rm-tab { display: inline-flex; align-items: center; gap: 0.45rem; border: none; background: transparent; padding: 0.45rem 0.85rem; border-radius: 9px; font-size: 0.85rem; font-weight: 600; color: #5b6270; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .rm-tab i { font-size: 0.78rem; }
    .rm-tab .count { font-size: 0.72rem; padding: 0.02rem 0.45rem; border-radius: 999px; background: rgba(0,0,0,0.06); color: #6b7280; }
    .rm-tab:hover { color: #1f2328; }
    .rm-tab.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .rm-tab.on .count { background: #1f2328; color: #fff; }
    .rm-tab:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }
    .rm-seg button.inactive.on { color: #dc3545; }
    .rm-chip { display: inline-flex; align-items: center; gap: 0.35rem; max-width: 100%; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .rm-chip i { font-size: 0.68rem; }
    .rm-chip.city { background: rgba(255,193,7,0.14); color: #8a6700; }
    .rm-chip.clinic { background: rgba(25,135,84,0.1); color: #198754; }
    .rm-chip.missed { background: rgba(220,53,69,0.1); color: #dc3545; }
    .rm-chip.archived { background: #f3f4f6; color: #6b7280; }
    .rm-menu-item.success, .rm-menu-item.success i { color: #198754; }
    .rm-menu-item.success:hover { background: #f0fdf4; }
    @media (max-width: 768px) {
      .rm-table { table-layout: auto; }
      .rm-table th { width: auto !important; }
      .rm-toolbar .rm-btn span { display: none; }
    }
    `;
    
    const [formData, setFormData] = useState({
      record_type: '',
      pet_id: '',
      pet_registration_input: '',
      vaccination_type_id: '',
      _inventory_vaccine_id: '',
      vaccination_date: todayPH(),
      vaccination_next_due_date: '',
      deworming_type_id: '',
      deworming_date: todayPH(),
      deworming_next_due_date: '',
      dosage: '',
      procedure_type: '',
      sterilization_date: todayPH(),
      microchip_subtype: 'microchip',
      microchip_number: '',
      implant_date: todayPH(),
      implant_site: '',
      microchip_brand: '',
      veterinarian_name: '',
      weight: '',
      notes: ''
    });

    const user = getUser();

    useEffect(() => {
  loadVaccinationTypes();
  loadDewormingTypes();
  loadInventoryVaccines();
}, []); // runs once on mount only

useEffect(() => {
  loadData();
}, [filterStatus]); // only records re-fetch on filter change
    useEffect(() => {
  setCurrentPage(1);
}, [activeTab, filterSpecies, searchTerm, filterStatus, filterClinic]);

// Force batch display to sync when batches load for edit mode
useEffect(() => {
  if (modalMode === 'edit' && formData.vaccination_type_id && !loadingBatches) {
    const key = formData._inventory_vaccine_id || formData.vaccination_type_id;
    const batches = vaccineBatches[key] || vaccineBatches[parseInt(key)];
    if (batches && batches.length > 0 && selectedVaccineBatch === null) {
      // Batches loaded but none pre-selected (record had no batch_id) — leave unselected
      // This just forces a re-render to show the batches
    }
  }
}, [vaccineBatches, formData.vaccination_type_id, loadingBatches]);


    useEffect(() => {
      if (loading || hasAnimated) return;
      const targets = {
        vaccinations: vaccinations.filter(r => !isInactive(r)).length,
        sterilizations: sterilizations.length,
        microchips: microchips.length,
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
          vaccinations:   step >= steps ? targets.vaccinations   : Math.round(t * targets.vaccinations),
          sterilizations: step >= steps ? targets.sterilizations : Math.round(t * targets.sterilizations),
          microchips:     step >= steps ? targets.microchips     : Math.round(t * targets.microchips),
        });
        if (step >= steps) clearInterval(timer);
      }, duration / steps);
      return () => clearInterval(timer);
    }, [loading, vaccinations.length, sterilizations.length, microchips.length]);

    // After
const CACHE_TTL = 60_000;

const loadData = async (bustCache = false) => {
  const cacheKey = `__records_${filterStatus}__`;
  if (!bustCache) {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) {
          setVaccinations(data.vaccinations);
          setDewormings(data.dewormings);
          setSterilizations(data.sterilizations);
          setMicrochips(data.microchips);
          setPets(data.pets);
          setLoading(false);
          return;
        }
      }
    } catch {}
  }

  try {
    setLoading(true);
    const trashParam = filterStatus === 'inactive' ? '?trash=1' : '';
    const [vaccinationsRes, dewormingsRes, sterilizationsRes, microchipsRes, petsRes] = await Promise.all([
      vaccinationAPI.getAll('?with_inactive=1'),
      dewormingAPI.getAll('?with_inactive=1'),
      sterilizationAPI.getAll(trashParam),
      microchipAPI.getAll(trashParam),
      petAPI.getAll()
    ]);
    const result = {
      vaccinations: vaccinationsRes.data.vaccination_records || [],
      dewormings:   dewormingsRes.data.deworming_records     || [],
      sterilizations: sterilizationsRes.data.sterilization_records || [],
      microchips:   microchipsRes.data.microchip_records     || [],
      pets:         petsRes.data.pets                        || [],
    };
    setVaccinations(result.vaccinations);
    setDewormings(result.dewormings);
    setSterilizations(result.sterilizations);
    setMicrochips(result.microchips);
    setPets(result.pets);
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: result })); } catch {}
  } catch (err) {
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setLoading(false);
  }
};

const loadVaccinationTypes = async () => {
  try {
    const raw = sessionStorage.getItem('__vac_types__');
    if (raw) { const { ts, d } = JSON.parse(raw); if (Date.now() - ts < CACHE_TTL) { setVaccinationTypes(d); return; } }
    const response = await vaccinationAPI.getTypes();
    const d = response.data.vaccination_types || [];
    setVaccinationTypes(d);
    try { sessionStorage.setItem('__vac_types__', JSON.stringify({ ts: Date.now(), d })); } catch {}
  } catch (err) { console.error('Error loading vaccination types:', err); }
};

const loadDewormingTypes = async () => {
  try {
    const raw = sessionStorage.getItem('__dew_types__');
    if (raw) { const { ts, d } = JSON.parse(raw); if (Date.now() - ts < CACHE_TTL) { setDewormingTypes(d); return; } }
    const response = await dewormingAPI.getTypes();
    const d = response.data.deworming_types || [];
    setDewormingTypes(d);
    try { sessionStorage.setItem('__dew_types__', JSON.stringify({ ts: Date.now(), d })); } catch {}
  } catch (err) { console.error('Error loading deworming types:', err); }
};

const loadInventoryVaccines = async () => {
  try {
    const raw = sessionStorage.getItem('__inventory__');
    if (raw) {
      const { ts, d } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) {
        setInventoryItems(d); inventoryItemsRef.current = d;
        setInventoryVaccines(d.filter(i => i.item_type === 'vaccination' && parseInt(i.current_stock) > 0).map(i => parseInt(i.id)));
        return;
      }
    }
    const { inventoryAPI } = await import('../../services/api');
    const response = await inventoryAPI.getAll();
    const d = response.data.inventory || [];
    setInventoryItems(d); inventoryItemsRef.current = d;
    setInventoryVaccines(d.filter(i => i.item_type === 'vaccination' && parseInt(i.current_stock) > 0).map(i => parseInt(i.id)));
    try { sessionStorage.setItem('__inventory__', JSON.stringify({ ts: Date.now(), d })); } catch {}
  } catch (err) { console.error('Error loading inventory:', err); }
};

    const loadVaccineBatches = async (inventoryId, currentBatchId = null) => {
      const { inventoryAPI } = await import('../../services/api');
      setLoadingBatches(true);
      try {
        const params = currentBatchId ? `?current_batch_id=${currentBatchId}` : '';
        const res = await inventoryAPI.getRecordBatchAvailability(inventoryId, params);
        const batches = res.data.batches || [];
        // Store under both number and string keys to avoid lookup mismatches
        const key = String(inventoryId);
        setVaccineBatches(prev => ({ ...prev, [key]: batches }));
        if (currentBatchId) {
          const found = batches.find(b => parseInt(b.id) === parseInt(currentBatchId));
          if (found) setSelectedVaccineBatch(parseInt(found.id));
          else if (batches.length > 0) setSelectedVaccineBatch(parseInt(batches[0].id));
        }
        return batches;
      } catch (err) {
        console.error('Failed to load vaccine batches:', err);
        setVaccineBatches(prev => ({ ...prev, [String(inventoryId)]: [] }));
        return [];
      } finally {
        setLoadingBatches(false);
      }
    };

    const loadMicrochipBatches = async (currentBatchId = null) => {
      const { inventoryAPI } = await import('../../services/api');
      const invItem = inventoryItems.find(i => i.item_type === 'microchip');
      if (!invItem) return [];
      setLoadingBatches(true);
      try {
        const params = currentBatchId ? `?current_batch_id=${currentBatchId}` : '';
        const res = await inventoryAPI.getRecordBatchAvailability(invItem.id, params);
        const batches = res.data.batches || [];
        setMicrochipBatches(batches);
        if (currentBatchId) {
          const found = batches.find(b => parseInt(b.id) === parseInt(currentBatchId));
          if (found) setSelectedMicrochipBatch(parseInt(found.id));
          else if (batches.length > 0) setSelectedMicrochipBatch(parseInt(batches[0].id));
        }
        return batches;
      } catch (err) {
        console.error('Failed to load microchip batches:', err);
        return [];
      } finally {
        setLoadingBatches(false);
      }
    };

    // Re-check the server time when the form opens, then fix any default
    // dates that were filled in using the device clock
    const refreshFormDates = () => {
      const shownToday = todayPH();
      freshTodayPH().then(today => {
        if (today === shownToday) return;
        setFormData(prev => {
          const fix = (v) => (v === shownToday ? today : v);
          return {
            ...prev,
            vaccination_date:   fix(prev.vaccination_date),
            deworming_date:     fix(prev.deworming_date),
            sterilization_date: fix(prev.sterilization_date),
            implant_date:       fix(prev.implant_date),
          };
        });
      });
    };

    const handleOpenModal = () => {
      refreshFormDates();
      setModalMode('create');
      setEditingRecord(null);
      setFormData({
        record_type: '',
        pet_id: '',
        pet_registration_input: '',
        vaccination_type_id: '',
        vaccination_date: todayPH(),
        vaccination_next_due_date: '',
        deworming_type_id: '',
        deworming_date: todayPH(),
        deworming_next_due_date: '',
        dosage: '',
        procedure_type: '',
        sterilization_date: todayPH(),
        microchip_subtype: 'microchip',
        microchip_number: '',
        implant_date: todayPH(),
        implant_site: '',
        microchip_brand: '',
        veterinarian_name: '',
        weight: '',
        notes: ''
      });
      setShowModal(true);
      setError('');
    };

    const handleOpenEditModal = (record, type) => {
      setModalMode('edit');
      setEditingRecord({ ...record, recordType: type, _originalBatchId: record.batch_id ? parseInt(record.batch_id) : null });
      setShowDropdown(null);
      setSelectedVaccineBatch(null);
      setSelectedMicrochipBatch(null);
      setVaccineBatches({});
      setMicrochipBatches([]);

      const emptyBase = {
        record_type: type,
        pet_id: String(record.pet_id),
        pet_registration_input: (record.registration_number || '').replace('PET-', ''),
        vaccination_type_id: '',
        vaccination_date: todayPH(),
        vaccination_next_due_date: '',
        deworming_type_id: '',
        deworming_date: todayPH(),
        deworming_next_due_date: '',
        dosage: '',
        procedure_type: '',
        sterilization_date: todayPH(),
        microchip_subtype: 'microchip',
        microchip_number: '',
        implant_date: todayPH(),
        implant_site: '',
        microchip_brand: '',
        veterinarian_name: '',
        weight: '',
        notes: ''
      };

      if (type === 'vaccination') {
        const items = inventoryItemsRef.current.length > 0 ? inventoryItemsRef.current : inventoryItems;
        const preInvItem = record.inventory_id
          ? items.find(i => parseInt(i.id) === parseInt(record.inventory_id))
          : record.vaccination_type_id
            ? items.find(i => parseInt(i.item_type_id) === parseInt(record.vaccination_type_id))
            : null;
        const resolvedInvId = preInvItem ? String(preInvItem.id) : '';
        // Set formData with resolved ID immediately — do NOT set empty first
        setFormData({ ...emptyBase,
          vaccination_type_id: resolvedInvId,
          _inventory_vaccine_id: resolvedInvId,
          vaccination_date: record.vaccination_date?.split('T')[0] || '',
          vaccination_next_due_date: record.next_due_date?.split('T')[0] || '',
          veterinarian_name: record.veterinarian_name || '',
          weight: record.weight || '',
          notes: record.notes || ''
        });
        // Load batches immediately using the resolved ID — no async fetch needed
        if (preInvItem) {
          loadVaccineBatches(parseInt(preInvItem.id), record.batch_id ? parseInt(record.batch_id) : null);
        }
      } else if (type === 'deworming') {
        setFormData({ ...emptyBase,
          deworming_type_id: String(record.deworming_type_id || ''),
          deworming_date: record.deworming_date?.split('T')[0] || '',
          deworming_next_due_date: record.next_due_date?.split('T')[0] || '',
          dosage: record.dosage || '',
          veterinarian_name: record.veterinarian_name || '',
          weight: record.weight || '',
          notes: record.notes || ''
        });
      } else if (type === 'sterilization') {
        setFormData({ ...emptyBase,
          sterilization_date: record.sterilization_date?.split('T')[0] || '',
          veterinarian_name: record.veterinarian_name || '',
          weight: record.weight || ''
        });
      } else if (type === 'microchip') {
        setFormData({ ...emptyBase,
          microchip_subtype: 'microchip',
          microchip_number: record.microchip_number || '',
          implant_date: record.implant_date?.split('T')[0] || '',
          implant_site: record.implant_site || '',
          microchip_brand: record.microchip_brand || '',
          veterinarian_name: record.veterinarian_name || '',
          weight: record.weight || '',
          notes: record.notes || ''
        });
      }

      setShowModal(true);
      if (type === 'microchip' && record.microchip_number && !record.microchip_number.startsWith('QR-')) {
        loadMicrochipBatches(record.batch_id ? parseInt(record.batch_id) : null);
      }
      setError('');
    };

    const handleCloseModal = () => {
      setShowModal(false);
      setError('');
      setEditingRecord(null);
      setModalMode('create');
      setSelectedVaccineBatch(null);
      setSelectedMicrochipBatch(null);
      setVaccineBatches({});
      setMicrochipBatches([]);
    };

    const handleViewRecord = async (record, type) => {
      setSelectedRecord({ ...record, recordType: type });
      setShowViewModal(true);
      setShowDropdown(null);
      setQrDataURL('');

      if (type === 'microchip' && record.qr_code) {
        setQrLoading(true);
        try {
          // qr_code is base64-encoded JSON string from PHP
          const jsonStr = atob(record.qr_code);
          const parsed  = JSON.parse(jsonStr);
          const dataURL = await QRCode.toDataURL(JSON.stringify(parsed), {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setQrDataURL(dataURL);
        } catch {
          setQrDataURL('');
        } finally {
          setQrLoading(false);
        }
      }
    };

    const handleCloseViewModal = () => {
      setShowViewModal(false);
      setSelectedRecord(null);
      setQrDataURL('');
    };
    const handleDeleteClick = (record, type) => {
    setRecordToDelete({ ...record, recordType: type });
    setShowDeleteModal(true);
    setShowDropdown(null);
  };

    const handleDeleteConfirm = async () => {
    if (!recordToDelete || deleteLoading) return;
    setDeleteLoading(true);
    try {
      // Archive only — the record becomes inactive, nothing is deleted
      const apis = { vaccination: vaccinationAPI, deworming: dewormingAPI, sterilization: sterilizationAPI, microchip: microchipAPI };
      await apis[recordToDelete.recordType].delete(recordToDelete.id);
      setShowDeleteModal(false);
      setRecordToDelete(null);
      loadData(true);
      setFloatingSuccess('Record archived. You can find it under the "Inactive" filter.');
      setTimeout(() => setFloatingSuccess(''), 6000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

    const handleRegistrationNumberChange = (e) => {
      let value = e.target.value;
      value = value.replace(/[^0-9-]/g, '');
      const digitsOnly = value.replace(/-/g, '');
      const limitedDigits = digitsOnly.substring(0, 10);
      
      let formatted = '';
      if (limitedDigits.length <= 6) {
        formatted = limitedDigits;
      } else {
        formatted = limitedDigits.substring(0, 6) + '-' + limitedDigits.substring(6);
      }
      
      setFormData(prev => ({
        ...prev,
        pet_registration_input: formatted
      }));

      const fullRegistrationNumber = 'PET-' + formatted;
      
      if (formatted.length >= 7) {
        const matchingPet = pets.find(p => {
          const petRegNum = (p.registration_number || '').trim().toUpperCase();
          const searchRegNum = fullRegistrationNumber.trim().toUpperCase();
          return petRegNum === searchRegNum;
        });
        
        if (matchingPet) {
    // Check if pet is already sterilized for sterilization records
    if (formData.record_type === 'sterilization' && matchingPet.sterilized == 1) {
      setError(
        <div>
          <strong>Pet already sterilized</strong>
          <br />
          <small>
            This pet was sterilized on {new Date(matchingPet.sterilization_date).toLocaleDateString()}
            {matchingPet.sterilized_by && (
              <> by {matchingPet.sterilized_by}</>
            )}
          </small>
        </div>
      );
      setFormData(prev => ({
        ...prev,
        pet_id: '',
        weight: '',
        procedure_type: ''
      }));
      return; // Stop here, don't set the pet
    }
    
    // Get current pet to detect species change
const currentPet = pets.find(p => p.id === parseInt(formData.pet_id));
const speciesChanged = currentPet && currentPet.species !== matchingPet.species;

setFormData(prev => ({
  ...prev,
  pet_id: matchingPet.id.toString(),
  weight: matchingPet.weight || '',
  procedure_type: formData.record_type === 'sterilization' 
    ? (matchingPet.gender === 'female' ? 'spay' : 'neuter')
    : prev.procedure_type,
  // Reset vaccine/deworming selection if species changed
  ...(speciesChanged && {
    vaccination_type_id: '',
    _inventory_vaccine_id: '',
    deworming_type_id: '',
  })
}));

if (speciesChanged) {
  setSelectedVaccineBatch(null);
  setVaccineBatches({});
}

// Clear any previous error
setError('');
  } else {
    setFormData(prev => ({
      ...prev,
      pet_id: '',
      weight: '',
      procedure_type: formData.record_type === 'sterilization' ? '' : prev.procedure_type
    }));
  }
      } else {
        setFormData(prev => ({
          ...prev,
          pet_id: '',
          weight: ''
        }));
      }
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData({
        ...formData,
        [name]: value
      });
      
      if (error) setError('');
      if (success) setSuccess('');

      if (name === 'vaccination_type_id' && value) {
  setSelectedVaccineBatch(null);
  // value is always inventory.id now in both create and edit mode
  setFormData(prev => ({ ...prev, [name]: value, _inventory_vaccine_id: String(value) }));
  loadVaccineBatches(parseInt(value));
  return;
}
    };

    const handleRecordTypeSelect = (type) => {
      setFormData(prev => ({
        ...prev,
        record_type: type,
        microchip_subtype: 'microchip'
      }));
      setSelectedVaccineBatch(null);
      setSelectedMicrochipBatch(null);
      // QR codes are now generated automatically when a pet is registered,
      // so a microchip record is always a physical microchip
      if (type === 'microchip') loadMicrochipBatches();
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setFormLoading(true);
      setError('');

      // EDIT MODE
      if (modalMode === 'edit' && editingRecord) {
        try {
          const type = editingRecord.recordType;

          if (type === 'vaccination') {
            if (formData.vaccination_next_due_date) {
              const vd = new Date(formData.vaccination_date);
              const nd = new Date(formData.vaccination_next_due_date);
              const today = new Date(); today.setHours(0,0,0,0);
              if (vd.getTime() === nd.getTime()) { setError('Vaccination date and next due date cannot be the same'); setFormLoading(false); return; }
              if (nd < today) { setError('Next due date cannot be in the past'); setFormLoading(false); return; }
            }
            const editInvItem = inventoryItems.find(i => parseInt(i.id) === parseInt(formData.vaccination_type_id));
            await vaccinationAPI.update(editingRecord.id, {
              pet_id: parseInt(formData.pet_id),
              vaccination_type_id: editInvItem?.item_type_id || null,
              inventory_id: editInvItem?.id || null,
              batch_id: selectedVaccineBatch ? parseInt(selectedVaccineBatch) : null,
              vaccination_date: formData.vaccination_date,
              next_due_date: formData.vaccination_next_due_date || null,
              veterinarian_name: formData.veterinarian_name || null,
              weight: formData.weight ? parseFloat(formData.weight) : null,
              notes: formData.notes || null
            });
          } else if (type === 'deworming') {
            if (formData.deworming_next_due_date) {
              const dd = new Date(formData.deworming_date);
              const nd = new Date(formData.deworming_next_due_date);
              const today = new Date(); today.setHours(0,0,0,0);
              if (dd.getTime() === nd.getTime()) { setError('Deworming date and next due date cannot be the same'); setFormLoading(false); return; }
              if (nd < today) { setError('Next due date cannot be in the past'); setFormLoading(false); return; }
            }
            await dewormingAPI.update(editingRecord.id, {
              pet_id: parseInt(formData.pet_id),
              deworming_type_id: formData.deworming_type_id,
              deworming_date: formData.deworming_date,
              next_due_date: formData.deworming_next_due_date || null,
              dosage: formData.dosage || null,
              veterinarian_name: formData.veterinarian_name || null,
              weight: formData.weight ? parseFloat(formData.weight) : null,
              notes: formData.notes || null
            });
          } else if (type === 'sterilization') {
            await sterilizationAPI.update(editingRecord.id, {
              pet_id: parseInt(formData.pet_id),
              sterilization_date: formData.sterilization_date,
              veterinarian_name: formData.veterinarian_name || null,
              weight: formData.weight ? parseFloat(formData.weight) : null
            });
          } else if (type === 'microchip') {
            const oldMicBatchId = editingRecord._originalBatchId ?? (editingRecord.batch_id ? parseInt(editingRecord.batch_id) : null);
            const newMicBatchId = selectedMicrochipBatch ? parseInt(selectedMicrochipBatch) : null;
            const micBatchChanged = oldMicBatchId !== newMicBatchId;
            await microchipAPI.update(editingRecord.id, {
              pet_id: parseInt(formData.pet_id),
              batch_id: newMicBatchId,
              implant_date: formData.implant_date,
              implant_site: formData.implant_site || null,
              microchip_brand: formData.microchip_brand || null,
              veterinarian_name: formData.veterinarian_name || null,
              weight: formData.weight ? parseFloat(formData.weight) : null,
              notes: formData.notes || null
            });

            if (micBatchChanged) {
              const { inventoryAPI } = await import('../../services/api');
              if (oldMicBatchId) {
                try {
                  await inventoryAPI.restoreBatchStock(oldMicBatchId, { quantity: 1 });
                } catch (e) { console.error('Failed to restore old microchip batch stock:', e); }
              }
              if (newMicBatchId) {
                try {
                  await inventoryAPI.deductBatchStock(newMicBatchId, { quantity: 1 });
                } catch (e) { console.error('Failed to deduct new microchip batch stock:', e); }
              }
            }
          }

          handleCloseModal();
          loadData(true);
          setFloatingSuccess('Record updated successfully!');
          setTimeout(() => setFloatingSuccess(''), 5000);
        } catch (err) {
          const { message } = handleAPIError(err);
          setError(message);
        } finally {
          setFormLoading(false);
        }
        return;
      }

      // CREATE MODE
      if (!formData.pet_id) {
        setError('Pet registration number not found. Please enter a valid registration number.');
        setFormLoading(false);
        return;
      }

      try {
        if (formData.record_type === 'vaccination') {
          // Validate dates
          if (formData.vaccination_next_due_date) {
            const vacDate = new Date(formData.vaccination_date);
            const nextDueDate = new Date(formData.vaccination_next_due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (vacDate.getTime() === nextDueDate.getTime()) {
              setError('Vaccination date and next due date cannot be the same');
              setFormLoading(false);
              return;
            }
            
            if (nextDueDate < today) {
              setError('Next due date cannot be in the past');
              setFormLoading(false);
              return;
            }
          }
          
          // formData.vaccination_type_id holds inventory.id in create mode
          // Resolve to the actual vaccination_type_id via item_type_id
          const selectedInvItem = inventoryItems.find(i => parseInt(i.id) === parseInt(formData.vaccination_type_id));
          const dataToSubmit = {
            pet_id: parseInt(formData.pet_id),
            vaccination_type_id: selectedInvItem?.item_type_id || null,
            inventory_id: selectedInvItem?.id || null,
            batch_id: selectedVaccineBatch || null,
            vaccination_date: formData.vaccination_date,
            next_due_date: formData.vaccination_next_due_date || null,
            veterinarian_name: formData.veterinarian_name || null,
            weight: formData.weight ? parseFloat(formData.weight) : null,
            notes: formData.notes || null,
            administered_by: user.id
          };

          const response = await vaccinationAPI.create(dataToSubmit);
          // Deduct 1 from selected batch
          if (selectedVaccineBatch) {
            try {
              const { inventoryAPI } = await import('../../services/api');
              await inventoryAPI.deductBatchStock(selectedVaccineBatch, { quantity: 1 });
            } catch (batchErr) {
              console.error('Failed to deduct vaccine batch stock:', batchErr);
            }
          }
          setSuccess(response.data.message || 'Vaccination record added successfully!');
        }
        else if (formData.record_type === 'deworming') {
          // Validate dates
          if (formData.deworming_next_due_date) {
            const dewormDate = new Date(formData.deworming_date);
            const nextDueDate = new Date(formData.deworming_next_due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (dewormDate.getTime() === nextDueDate.getTime()) {
              setError('Deworming date and next due date cannot be the same');
              setFormLoading(false);
              return;
            }
            
            if (nextDueDate < today) {
              setError('Next due date cannot be in the past');
              setFormLoading(false);
              return;
            }
          }
          
          const dataToSubmit = {
            pet_id: parseInt(formData.pet_id),
            deworming_type_id: formData.deworming_type_id,
            deworming_date: formData.deworming_date,
            next_due_date: formData.deworming_next_due_date || null,
            veterinarian_name: formData.veterinarian_name || null,
            weight: formData.weight ? parseFloat(formData.weight) : null,
            dosage: formData.dosage || null,
            notes: formData.notes || null,
            administered_by: user.id
          };

          const response = await dewormingAPI.create(dataToSubmit);
          setSuccess(response.data.message || 'Deworming record added successfully!');
        }
        else if (formData.record_type === 'sterilization') {
    // Ensure procedure_type has the correct database value
    const selectedPet = getSelectedPet();
    const procedureType = selectedPet ? (selectedPet.gender === 'female' ? 'spay' : 'neuter') : '';
    
    if (!procedureType) {
      setError('Please select a valid pet first.');
      setFormLoading(false);
      return;
    }
    
    const dataToSubmit = {
      pet_id: parseInt(formData.pet_id),
      procedure_type: procedureType, // Use the correct value, not the display text
      sterilization_date: formData.sterilization_date,
      veterinarian_name: formData.veterinarian_name || null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      administered_by: user.id
    };

    const response = await sterilizationAPI.create(dataToSubmit);
        setSuccess(response.data.message || 'Sterilization record added successfully!');
  }
        else if (formData.record_type === 'microchip') {
          const dataToSubmit = {
            pet_id: parseInt(formData.pet_id),
            microchip_subtype: formData.microchip_subtype,
            microchip_number: formData.microchip_subtype === 'microchip' ? formData.microchip_number : ('QR-' + Date.now()),
            implant_date: formData.implant_date,
            implant_site: formData.implant_site || null,
            microchip_brand: formData.microchip_brand || null,
            veterinarian_name: formData.veterinarian_name || null,
            weight: formData.weight ? parseFloat(formData.weight) : null,
            notes: formData.notes || null,
            administered_by: user.id,
            batch_id: formData.microchip_subtype === 'microchip' ? (selectedMicrochipBatch || null) : null
          };
          const response = await microchipAPI.create(dataToSubmit);
          // Deduct 1 from selected microchip batch (only for physical microchip)
          if (formData.microchip_subtype === 'microchip' && selectedMicrochipBatch) {
            try {
              const { inventoryAPI } = await import('../../services/api');
              await inventoryAPI.deductBatchStock(selectedMicrochipBatch, { quantity: 1 });
            } catch (batchErr) {
              console.error('Failed to deduct microchip batch stock:', batchErr);
            }
          }
          setSuccess(response.data.message || 'Microchip record added successfully!');
        }
        
        handleCloseModal();
        loadData(true);
        setFloatingSuccess(
          formData.record_type === 'vaccination' ? 'Vaccination record added successfully!' :
          formData.record_type === 'deworming' ? 'Deworming record added successfully!' :
          formData.record_type === 'sterilization' ? 'Sterilization record added successfully!' :
          'Microchip record added successfully!'
        );
        setTimeout(() => setFloatingSuccess(''), 5000);
      } catch (err) {
        const { message, data } = handleAPIError(err);
        
        if (data && data.details) {
          setError(
            <div>
              <strong>{message}</strong>
              <br />
              <small>
                Last record: {new Date(data.details.last_vaccination_date || data.details.last_deworming_date || data.details.sterilization_date).toLocaleDateString()}
                {data.details.next_due_date && (
                  <>
                    <br />
                    Next due date: {new Date(data.details.next_due_date).toLocaleDateString()} 
                    ({data.details.days_until_due} days remaining)
                  </>
                )}
              </small>
            </div>
          );
        } else {
          setError(message);
        }
      } finally {
        setFormLoading(false);
      }
    };

    const handleRestoreClick = (record, type) => {
  setRestoreDueDate(''); setRestoreReason(''); setRestoreError('');
  setRecordToRestore({ ...record, recordType: type });
  setShowRestoreModal(true);
  setShowDropdown(null);
};

const handleRestoreConfirm = async () => {
  if (!recordToRestore || restoreLoading) return;
  const target = recordToRestore;
  if (target.record_status === 'missed' && !restoreDueDate) {
    setRestoreError('Please set a new next due date.');
    return;
  }
  setRestoreLoading(true);
  setRestoreError('');
  try {
    if (target.recordType === 'vaccination' || target.recordType === 'deworming') {
      const path = target.recordType === 'vaccination' ? 'vaccinations' : 'dewormings';
      await api.put(`/${path}/restore/${target.id}`, {
        next_due_date: restoreDueDate || null,
        reason: restoreReason || null,
      });
    } else if (target.recordType === 'sterilization') {
      await sterilizationAPI.restore(target.id);
    } else {
      await microchipAPI.restore(target.id);
    }
    setShowRestoreModal(false);
    setRecordToRestore(null);
    loadData(true);
    setFloatingSuccess('Record restored and active again.');
    setTimeout(() => setFloatingSuccess(''), 5000);
  } catch (err) {
    const { message } = handleAPIError(err);
    setRestoreError(message);
  } finally {
    setRestoreLoading(false);
  }
};

// ── Record status helpers ──
// Inactive = archived (mistake / human error) or missed (due date passed, not followed)
const isInactive = (r) => (r.record_status ? ['missed', 'archived'].includes(r.record_status) : !!r.deleted_at);

const getInactiveLabel = (r) => {
  if (!r) return null;
  if (r.record_status === 'missed') {
    return `Missed · was due ${new Date(r.next_due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (r.record_status === 'archived' || r.deleted_at) return 'Archived';
  return null;
};

const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

const RECORD_TYPE_META = {
  vaccination:   ['fa-syringe',   '#ffc107', 'Vaccination'],
  deworming:     ['fa-pills',     '#17a2b8', 'Deworming'],
  sterilization: ['fa-cut',       '#28a745', 'Sterilization'],
  microchip:     ['fa-microchip', '#4361ee', 'Microchip'],
};

// Finds an active record that blocks restoring an archived one
  // (same pet + same vaccine/dewormer + same date)
  const findRestoreConflict = (rec) => {
    if (!rec || !(rec.record_status === 'archived' || rec.deleted_at)) return null;
    const isVac = rec.recordType === 'vaccination';
    if (!isVac && rec.recordType !== 'deworming') return null;
    const list = isVac ? vaccinations : dewormings;
    const dateKey = isVac ? 'vaccination_date' : 'deworming_date';
    const itemKeys = isVac ? ['clinic_item_id', 'inventory_id', 'vaccination_type_id'] : ['clinic_item_id', 'deworming_type_id'];
    const itemKey = itemKeys.find(k => rec[k]);
    const day = (v) => String(v || '').slice(0, 10);
    return list.find(r =>
      r.id !== rec.id &&
      String(r.pet_id) === String(rec.pet_id) &&
      !r.deleted_at && r.record_status !== 'archived' &&
      day(r[dateKey]) === day(rec[dateKey]) &&
      (itemKey ? String(r[itemKey]) === String(rec[itemKey]) : true)
    ) || null;
  };

  // Which session this new record will be (archived records don't count)
const getSessionNumber = () => {
  if (modalMode !== 'create' || formData.record_type !== 'vaccination' || !formData.pet_id || !formData.vaccination_type_id) return 1;
  return vaccinations.filter(r =>
    String(r.pet_id) === String(formData.pet_id) &&
    String(r.inventory_id) === String(formData.vaccination_type_id) &&
    r.record_status !== 'archived' && !r.deleted_at
  ).length + 1;
};

const getSelectedPet = () => {
      return pets.find(p => p.id === parseInt(formData.pet_id));
    };

    const getFilteredTypes = () => {
      const selectedPet = getSelectedPet();
      if (!selectedPet) return [];

      if (formData.record_type === 'vaccination') {
  // Both create and edit: show inventory items with stock > 0, filtered by species
  // In edit mode, also include the currently selected inventory item even if stock is 0
  return inventoryItems.filter(i => {
  if (i.item_type !== 'vaccination') return false;
  const speciesMatch = !i.species || i.species === 'all' || i.species === 'both' || i.species === selectedPet.species;
  if (!speciesMatch) return false;
  if (modalMode === 'edit' && editingRecord) {
    const isCurrentByTypeId = editingRecord.vaccination_type_id && parseInt(i.item_type_id) === parseInt(editingRecord.vaccination_type_id);
    const isCurrentByInvId = editingRecord.inventory_id && parseInt(i.id) === parseInt(editingRecord.inventory_id);
    // Always include the currently selected item in the dropdown even if stock is 0
    const isCurrentlySelected = formData.vaccination_type_id && parseInt(i.id) === parseInt(formData.vaccination_type_id);
    if (isCurrentByTypeId || isCurrentByInvId || isCurrentlySelected) return true;
  }
  return parseInt(i.current_stock) > 0;
});
} else if (formData.record_type === 'deworming') {
        return dewormingTypes.filter(dt =>
          dt.species === 'all' || dt.species === selectedPet.species
        );
      }
      return [];
    };

    const getRecordTypeLabel = (type) => {
      const labels = {
        vaccination: 'Vaccination',
      deworming: 'Deworming',
      sterilization: 'Sterilization',
      microchip: 'Microchip'
      };
      return labels[type] || type;
    };

    // Filter functions
    const getFilteredRecords = (records) => {
  return records.filter(record => {
    const petSpecies = record.species || record.pet_species;
    const matchesSpecies = filterSpecies === 'all' || petSpecies === filterSpecies;
    const matchesSearch = 
      record.pet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.veterinarian_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'inactive' ? isInactive(record) : !isInactive(record);
    const recordedBy = record.recorded_by || record.clinic_name || 'City Vet Muntinlupa';
    const isCityVet = recordedBy === 'City Vet Muntinlupa';
    const matchesClinic = filterClinic === 'all' || (filterClinic === 'city_vet' ? isCityVet : !isCityVet);
    return matchesSpecies && matchesSearch && matchesStatus && matchesClinic;
  });
};

    const filteredVaccinations = getFilteredRecords(vaccinations);
    const filteredDewormings = getFilteredRecords(dewormings);
    const filteredSterilizations = getFilteredRecords(sterilizations);
    const filteredMicrochips = getFilteredRecords(microchips);
    
    // Combine all records for "all" tab
    const allRecords = [
      ...filteredVaccinations.map(v => ({ ...v, recordType: 'vaccination', sortDate: new Date(v.vaccination_date) })),
      ...filteredDewormings.map(d => ({ ...d, recordType: 'deworming', sortDate: new Date(d.deworming_date) })),
      ...filteredSterilizations.map(s => ({ ...s, recordType: 'sterilization', sortDate: new Date(s.sterilization_date) })),
      ...filteredMicrochips.map(m => ({ ...m, recordType: 'microchip', sortDate: new Date(m.implant_date) }))
    ].sort((a, b) => b.sortDate - a.sortDate);

    // Get current records based on active tab
    const getCurrentRecords = () => {
      if (activeTab === 'all') return allRecords;
      if (activeTab === 'vaccination') return filteredVaccinations;
      if (activeTab === 'deworming') return filteredDewormings;
      if (activeTab === 'sterilization') return filteredSterilizations;
      if (activeTab === 'microchip') return filteredMicrochips;
      return [];
    };

    const currentRecords = getCurrentRecords();
    const totalPages = Math.ceil(currentRecords.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedRecords = currentRecords.slice(startIdx, endIdx);

    

    const REC_META = {
      vaccination:   { label: 'Vaccination',   color: '#e0a800', icon: 'fa-syringe',   dateKey: 'vaccination_date' },
      deworming:     { label: 'Deworming',     color: '#0d6efd', icon: 'fa-pills',     dateKey: 'deworming_date' },
      sterilization: { label: 'Sterilization', color: '#198754', icon: 'fa-cut',       dateKey: 'sterilization_date' },
      microchip:     { label: 'Microchip',     color: '#d63384', icon: 'fa-microchip', dateKey: 'implant_date' },
    };
    const recDate = (value) => {
      if (!value) return null;
      const d = new Date(String(value).length <= 10 ? `${value}T00:00:00` : String(value).replace(' ', 'T'));
      return isNaN(d) ? null : d;
    };
    const fmtRecDate = (value) => {
      const d = recDate(value);
      return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    };
    const recordTabs = [
      { key: 'all',           label: 'All',           count: filteredVaccinations.length + filteredSterilizations.length + filteredMicrochips.length },
      { key: 'vaccination',   label: 'Vaccination',   count: filteredVaccinations.length },
      { key: 'sterilization', label: 'Sterilization', count: filteredSterilizations.length },
      { key: 'microchip',     label: 'Microchip',     count: filteredMicrochips.length },
    ];
    const activeTabInfo = recordTabs.find(t => t.key === activeTab) || recordTabs[0];
    const hasRecordFilters = searchTerm || filterSpecies !== 'all';
    const recPagerNumbers = (() => {
      const pages = [];
      let start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages, start + 2);
      if (end - start < 2) start = Math.max(1, end - 2);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    })();

    const renderRecordRow = (record, i) => {
      const type = record.recordType || activeTab;
      const meta = REC_META[type] || REC_META.vaccination;
      const date = recDate(record[meta.dateKey]);
      const menuKey = `${type.slice(0, 3)}-${record.id}`;
      const menuOpen = showDropdown === menuKey;
      const isCityVet = (record.recorded_by || 'City Vet Muntinlupa') === 'City Vet Muntinlupa';
      const ownRecord = record.recorded_by === 'City Vet Muntinlupa';
      const nextDue = recDate(record.next_due_date);
      const overdue = nextDue && nextDue < new Date();
      const inactiveLabel = filterStatus === 'inactive' ? getInactiveLabel(record) : null;

      let detail = null;
      if (type === 'vaccination') detail = record.vaccine_name;
      else if (type === 'deworming') detail = `${record.deworming_name || ''}${record.dosage ? ` · ${record.dosage}` : ''}`;
      else if (type === 'sterilization') detail = record.procedure_type;
      else if (type === 'microchip') detail = <span className="rm-mono">{record.microchip_number}</span>;

      return (
        <tr key={menuKey} className={menuOpen ? 'raised' : ''} style={{ animationDelay: `${i * 0.04}s` }}>
          <td className="mobile-hide">
            <div className="rm-strong">{fmtRecDate(record[meta.dateKey])}</div>
            <div className="rm-muted">{date ? date.toLocaleDateString('en-US', { weekday: 'long' }) : ''}</div>
          </td>
          <td>
            <div className="rm-strong rm-ellipsis" title={record.pet_name}>{record.pet_name}</div>
            <div className="rm-muted rm-mono rm-ellipsis">{record.registration_number}</div>
          </td>
          <td>
            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              <div className="rm-type-ic" style={{ '--c': meta.color }}><i className={`fas ${meta.icon}`} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="rm-strong rm-ellipsis">{detail || meta.label}</div>
                <div className="rm-muted rm-ellipsis">
                  <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                  {nextDue && (type === 'vaccination' || type === 'deworming') && (
                    <> · Next due <span style={{ color: overdue ? '#dc3545' : '#198754', fontWeight: 600 }}>{fmtRecDate(record.next_due_date)}</span></>
                  )}
                </div>
              </div>
            </div>
          </td>
          <td className="mobile-hide">
            <span className={`rm-chip ${isCityVet ? 'city' : 'clinic'}`} title={record.recorded_by || 'City Vet Muntinlupa'}>
              <i className={`fas ${isCityVet ? 'fa-landmark' : 'fa-hospital'}`} />
              <span className="rm-ellipsis" style={{ maxWidth: 150 }}>{record.recorded_by || 'City Vet Muntinlupa'}</span>
            </span>
          </td>
          {filterStatus === 'inactive' && (
            <td className="mobile-hide">
              {inactiveLabel && (
                <span className={`rm-chip ${record.record_status === 'missed' ? 'missed' : 'archived'}`}>
                  <i className={`fas ${record.record_status === 'missed' ? 'fa-clock' : 'fa-archive'}`} />{inactiveLabel}
                </span>
              )}
            </td>
          )}
          <td style={{ textAlign: 'right' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                type="button"
                className={`rm-icon-btn${menuOpen ? ' on' : ''}`}
                onClick={() => setShowDropdown(menuOpen ? null : menuKey)}
                aria-label={`Options for ${record.pet_name}`}
                aria-expanded={menuOpen}
              >
                <i className="fas fa-ellipsis-v" />
              </button>
              {menuOpen && (
                <>
                  <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
                  <div className="rm-menu" role="menu">
                    <button type="button" role="menuitem" className="rm-menu-item" onClick={() => { setShowDropdown(null); handleViewRecord(record, type); }}>
                      <i className="fas fa-eye" />View details
                    </button>
                    {ownRecord && filterStatus !== 'inactive' && (
                      <>
                        <button type="button" role="menuitem" className="rm-menu-item" onClick={() => { setShowDropdown(null); handleOpenEditModal(record, type); }}>
                          <i className="fas fa-pen" />Edit record
                        </button>
                        <div className="rm-menu-sep" />
                        <button type="button" role="menuitem" className="rm-menu-item danger" onClick={() => { setShowDropdown(null); handleDeleteClick(record, type); }}>
                          <i className="fas fa-archive" />Archive record
                        </button>
                      </>
                    )}
                    {ownRecord && filterStatus === 'inactive' && (
                      <button type="button" role="menuitem" className="rm-menu-item success" onClick={() => { setShowDropdown(null); handleRestoreClick(record, type); }}>
                        <i className="fas fa-undo" />Restore record
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      );
    };

    return (
      <>
        <style>{styles}</style>
        {floatingSuccess && (
          <div className="rm-toast" role="status">
            <div className="ic"><i className="fas fa-check" /></div>
            <div className="flex-grow-1">
              <div className="t">Success</div>
              <div className="d">{floatingSuccess}</div>
            </div>
            <button type="button" className="rm-toast-close" onClick={() => setFloatingSuccess('')} aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}
        <Container fluid className="py-4 record-management-page" style={{ backgroundColor: '#ffffff', transition: 'all 0.3s ease' }}>

          {/* Header */}
          <div className="mb-4 rm-anim">
            <h2 className="rm-title mobile-title">Record Management</h2>
            <p className="rm-sub">Vaccination, sterilization and microchip records of registered pets.</p>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess('')} style={{ borderRadius: '12px' }}>
              <i className="fas fa-check-circle me-2"></i>
              {success}
            </Alert>
          )}
        {/* Statistics Cards */}
      <Row className="mb-4" style={{ flexWrap: 'nowrap', margin: '0 -6px' }}>
  {[
              {
            label: 'Vaccination',
            count: displayCounts.vaccinations,
            img: '/vaccine.png',
            accent: '#ffc107',
            accentAlpha: 'rgba(255,193,7,0.12)',
            fallbackIcon: 'fa-syringe',
            description: 'Vaccination Records',
            delay: '0.1s'
          },
          
          {
            label: 'Sterilization',
            count: displayCounts.sterilizations,
            img: '/sterilization.png',
            accent: '#28a745',
            accentAlpha: 'rgba(40,167,69,0.12)',
            fallbackIcon: 'fa-cut',
            description: 'Sterilization Records',
            delay: '0.3s'
          },
          {
            label: 'Microchip',
            count: displayCounts.microchips,
            img: '/microchip.png',
            accent: '#4361ee',
            accentAlpha: 'rgba(67,97,238,0.12)',
            fallbackIcon: 'fa-microchip',
            description: 'Microchip Records',
            delay: '0.4s'
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
              <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="mobile-stat-label" style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#999999',
                      marginBottom: '0.5rem'
                    }}>
                      {label}
                    </p>
                    <h2 className="mobile-stat-number" style={{
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
                    <div className="mobile-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <div className="mobile-stat-icon" style={{
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

          {/* Records */}
          <div className="rm-panel rm-anim" style={{ '--d': '0.18s', overflow: 'visible' }}>
            {/* Header */}
            <div className="rm-toolbar">
              <div className="rm-tabs" role="tablist">
                {recordTabs.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.key}
                    className={`rm-tab${activeTab === t.key ? ' on' : ''}`}
                    onClick={() => { setActiveTab(t.key); setCurrentPage(1); setShowDropdown(null); }}
                  >
                    {t.key !== 'all' && <i className={`fas ${REC_META[t.key].icon}`} style={{ color: activeTab === t.key ? REC_META[t.key].color : undefined }} />}
                    {t.label}
                    <span className="count">{t.count}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="rm-btn primary mobile-add-btn" onClick={handleOpenModal}>
                <i className="fas fa-plus" /><span>Add record</span>
              </button>
            </div>

            {/* Filters */}
            <div className="rm-filters">
              <div className="rm-search">
                <i className="fas fa-search" />
                <input
                  className="rm-input"
                  placeholder="Search by pet name, reg. number, or veterinarian..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search records"
                />
                {searchTerm && (
                  <button type="button" className="rm-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              <div className="rm-select">
                <i className="fas fa-paw" />
                <select className="rm-input" value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)} aria-label="Species">
                  <option value="all">All species</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                </select>
              </div>
              <div className="rm-select">
                <i className="fas fa-landmark" />
                <select className="rm-input" value={filterClinic} onChange={(e) => { setFilterClinic(e.target.value); setCurrentPage(1); }} aria-label="Recorded by">
                  <option value="all">All sources</option>
                  <option value="city_vet">City Vet Muntinlupa</option>
                  <option value="private">Private clinics</option>
                </select>
              </div>
              <div className="rm-seg" role="group" aria-label="Record status">
                {[['active', 'Active'], ['inactive', 'Inactive']].map(([v, l]) => (
                  <button key={v} type="button" className={`${filterStatus === v ? 'on' : ''} ${v}`} onClick={() => { setFilterStatus(v); setCurrentPage(1); setShowDropdown(null); }} aria-pressed={filterStatus === v}>{l}</button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="mobile-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
              {loading ? (
                <div style={{ padding: '0.5rem 0 1rem' }}>
                  {Array.from({ length: itemsPerPage }, (_, i) => (
                    <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.12 }}>
                      <div className="skeleton" style={{ width: 90, height: 13 }} />
                      <div className="flex-grow-1">
                        <div className="skeleton mb-2" style={{ width: '30%', height: 13 }} />
                        <div className="skeleton" style={{ width: '20%', height: 10 }} />
                      </div>
                      <div className="skeleton" style={{ width: 160, height: 24, borderRadius: 999 }} />
                    </div>
                  ))}
                </div>
              ) : currentRecords.length === 0 ? (
                <div className="rm-empty">
                  <div className="ic"><i className={`fas ${filterStatus === 'inactive' ? 'fa-archive' : 'fa-clipboard-list'}`} /></div>
                  <h6>{filterStatus === 'inactive' ? 'No inactive records' : 'No records found'}</h6>
                  <p>{hasRecordFilters ? 'Try changing or clearing the filters.' : filterStatus === 'inactive' ? 'Archived and missed records will show here.' : 'Start by adding a record for a pet.'}</p>
                  {hasRecordFilters ? (
                    <button type="button" className="rm-btn ghost" onClick={() => { setSearchTerm(''); setFilterSpecies('all'); }}>
                      <i className="fas fa-undo" />Clear filters
                    </button>
                  ) : filterStatus !== 'inactive' && (
                    <button type="button" className="rm-btn primary" onClick={handleOpenModal}>
                      <i className="fas fa-plus" />Add record
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive" style={{ overflow: 'visible' }}>
                  <table className="rm-table mobile-table-wrap">
                    <thead>
                      <tr>
                        <th className="mobile-hide" style={{ width: '15%' }}>Date</th>
                        <th style={{ width: '20%' }}>Pet</th>
                        <th style={{ width: filterStatus === 'inactive' ? '27%' : '37%' }}>Record</th>
                        <th className="mobile-hide" style={{ width: '22%' }}>Recorded by</th>
                        {filterStatus === 'inactive' && <th className="mobile-hide" style={{ width: '16%' }}>Status</th>}
                        <th style={{ width: '6%' }} aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((record, i) => renderRecordRow(record, i))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {currentRecords.length > itemsPerPage && (
              <div className="rm-foot mobile-pagination">
                <span className="rm-muted page-info" style={{ fontSize: '0.84rem' }}>
                  Showing <strong style={{ color: '#1f2328' }}>{startIdx + 1}–{Math.min(endIdx, currentRecords.length)}</strong> of {currentRecords.length}
                </span>
                <div className="d-flex align-items-center gap-1">
                  <button type="button" className="rm-page nav page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                    <i className="fas fa-chevron-left" />
                  </button>
                  {recPagerNumbers.map(n => (
                    <button key={n} type="button" className={`rm-page page-btn${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
                  ))}
                  <button type="button" className="rm-page nav page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                    <i className="fas fa-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* Add Record Modal */}
        <Modal show={showModal} onHide={handleCloseModal} size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}>
          <Modal.Header 
            closeButton
            style={{
              background: '#f8f9fa',
              borderBottom: '2px solid #dee2e6'
            }}
          >
            <Modal.Title style={{ fontWeight: '700' }}>
              {modalMode === 'edit' ? (
                <>
                  <i className="fas fa-edit me-2"></i>
                  Edit {getRecordTypeLabel(formData.record_type)} Record
                </>
              ) : formData.record_type ? (
                <>
                  <i className="fas fa-plus me-2"></i>
                  Add {getRecordTypeLabel(formData.record_type)} Record
                </>
              ) : (
                <>
                  <i className="fas fa-plus me-2"></i>
                  Add Record
                </>
              )}
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
            {error && (
                <Alert variant="danger" className="mb-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </Alert>
              )}

              {/* Record Type Selection */}
              <Row className="mb-4" style={{ display: modalMode === 'edit' ? 'none' : '' }}>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                      Record Type <span style={{ color: '#dc3545' }}>*</span>
                    </Form.Label>
                    <div style={{ display: 'flex', gap: '1rem' }} className="record-type-scroll">
                      <div 
                        onClick={() => handleRecordTypeSelect('vaccination')}
                        style={{ flex: '1', padding: '1.5rem', border: formData.record_type === 'vaccination' ? '3px solid #ffc107' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.record_type === 'vaccination' ? '#fff9e6' : '#ffffff', transition: 'all 0.3s' }}>
                        <img src="/vaccine.png" alt="Vaccination" style={{ width: '50px', height: '50px', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-syringe" style={{ fontSize: '2.5rem', color: '#ffc107', marginBottom: '0.5rem', display: 'none' }}></i>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Vaccination</div>
                      </div>
                      <div 
                        onClick={() => handleRecordTypeSelect('sterilization')}
                        style={{ flex: '1', padding: '1.5rem', border: formData.record_type === 'sterilization' ? '3px solid #28a745' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.record_type === 'sterilization' ? '#e6f9e9' : '#ffffff', transition: 'all 0.3s' }}>
                        <img src="/sterilization.png" alt="Sterilization" style={{ width: '50px', height: '50px', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-cut" style={{ fontSize: '2.5rem', color: '#28a745', marginBottom: '0.5rem', display: 'none' }}></i>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Sterilization</div>
                      </div>
                      <div 
                        onClick={() => handleRecordTypeSelect('microchip')}
                        style={{ flex: '1', padding: '1.5rem', border: formData.record_type === 'microchip' ? '3px solid #4361ee' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.record_type === 'microchip' ? '#eef0ff' : '#ffffff', transition: 'all 0.3s' }}>
                        <img src="/microchip.png" alt="Microchip" style={{ width: '50px', height: '50px', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-microchip" style={{ fontSize: '2.5rem', color: '#4361ee', marginBottom: '0.5rem', display: 'none' }}></i>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Microchip</div>
                      </div>
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              {/* Show form fields only after record type is selected */}
              {formData.record_type && (
                <>
                  {/* Pet Registration Number */}
<Row>
  <Col md={12}>
    <Form.Group className="mb-3">
      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
        Pet Registration Number <span style={{ color: '#dc3545' }}>*</span>
      </Form.Label>
      <InputGroup>
        <InputGroup.Text
          style={{
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            backgroundColor: '#e9ecef',
            border: '2px solid #ced4da'
          }}
        >
          PET-
        </InputGroup.Text>
        <Form.Control
          type="text"
          value={formData.pet_registration_input}
          onChange={handleRegistrationNumberChange}
          placeholder="202510-0001"
          required
          maxLength={11}
          readOnly={false}
          style={{
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            letterSpacing: '0.5px',
            border: '2px solid #ced4da',
            borderLeft: 'none',
            borderRight: 'none',
            backgroundColor: '#ffffff',
            flex: 1
          }}
        />
        {(
          <Button
            type="button"
            onClick={() => setShowPetSearchModal(true)}
            style={{
              background: '#4361ee',
              border: '2px solid #4361ee',
              color: '#fff',
              fontWeight: '600',
              borderRadius: '0 8px 8px 0',
              padding: '0 1.1rem',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#3451d1'}
            onMouseOut={e => e.currentTarget.style.background = '#4361ee'}
          >
            <i className="fas fa-search"></i> Search Pet
          </Button>
        )}
      </InputGroup>
      <Form.Text className="text-muted d-block" style={{ fontFamily: 'monospace' }}>
        Format: YYYYMM-XXXX (Example: 202510-0001) — or use Search Pet
      </Form.Text>
      {formData.pet_registration_input && formData.pet_registration_input.length > 0 && (
        <>
          {getSelectedPet() ? (
            <Alert variant="success" className="mt-2 mb-0 py-2">
              <i className="fas fa-check-circle me-2"></i>
              <strong>Pet Found:</strong> {getSelectedPet().name}
              <br />
              <small>
                Species: <span className="text-capitalize">{getSelectedPet().species}</span> |
                Breed: {getSelectedPet().breed || 'Mixed'} |
                Owner: {getSelectedPet().owner_name}
              </small>
            </Alert>
          ) : (
            formData.pet_registration_input.length >= 7 && (
              <Alert variant="danger" className="mt-2 mb-0 py-2">
                <i className="fas fa-times-circle me-2"></i>
                Pet registration number not found.
              </Alert>
            )
          )}
        </>
      )}
    </Form.Group>
  </Col>
</Row>

{/* ── Pet Search Modal ── */}
<Modal
  show={showPetSearchModal}
  onHide={() => { setShowPetSearchModal(false); setPetSearchTerm(''); }}
  centered
  size="md"
  style={{ zoom: '0.75' }}
>
  <Modal.Header
    closeButton
    style={{ background: '#f0f4ff', borderBottom: '2px solid #4361ee' }}
  >
    <Modal.Title style={{ fontWeight: '700', fontSize: '1rem' }}>
      <i className="fas fa-search me-2" style={{ color: '#4361ee' }}></i>
      Search Pet
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '1.5rem' }}>
    <InputGroup className="mb-3">
      <InputGroup.Text style={{ background: '#f0f4ff', border: '2px solid #4361ee', borderRight: 'none' }}>
        <i className="fas fa-search" style={{ color: '#4361ee' }}></i>
      </InputGroup.Text>
      <Form.Control
        autoFocus
        type="text"
        placeholder="Search by pet name, owner name, or breed..."
        value={petSearchTerm}
        onChange={e => setPetSearchTerm(e.target.value)}
        style={{ border: '2px solid #4361ee', borderLeft: 'none', fontSize: '0.95rem' }}
      />
      {petSearchTerm && (
        <Button variant="outline-secondary" onClick={() => setPetSearchTerm('')}
          style={{ border: '2px solid #4361ee', borderLeft: 'none' }}>
          <i className="fas fa-times"></i>
        </Button>
      )}
    </InputGroup>

    <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
      {petSearchTerm.trim() === '' ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#bbb' }}>
          <i className="fas fa-paw" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}></i>
          <div style={{ fontSize: '0.9rem' }}>Start typing to search for a pet</div>
        </div>
      ) : (() => {
        const term = petSearchTerm.trim().toLowerCase();
        const matches = pets.filter(p =>
          (p.name && p.name.toLowerCase().includes(term)) ||
          (p.owner_name && p.owner_name.toLowerCase().includes(term)) ||
          (p.breed && p.breed.toLowerCase().includes(term)) ||
          (p.registration_number && p.registration_number.toLowerCase().includes(term))
        );
        if (matches.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#bbb' }}>
              <i className="fas fa-search" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '0.88rem' }}>No pets found matching your search</div>
            </div>
          );
        }
        return matches.map(p => (
          <div
            key={p.id}
            onClick={() => {
              // Strip "PET-" prefix and fill the input
              const raw = (p.registration_number || '').replace('PET-', '');
              // Reuse the existing handler by simulating an event
              handleRegistrationNumberChange({ target: { value: raw } });
              setShowPetSearchModal(false);
              setPetSearchTerm('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: '1.5px solid #e9ecef',
              marginBottom: '0.6rem',
              cursor: 'pointer',
              background: '#ffffff',
              transition: 'all 0.18s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#f0f4ff';
              e.currentTarget.style.borderColor = '#4361ee';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e9ecef';
            }}
          >
            {/* Avatar */}
<div style={{
  width: '44px', height: '44px', borderRadius: '10px',
  background: p.species === 'cat' ? 'rgba(255,193,7,0.15)' : 'rgba(67,97,238,0.08)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  overflow: 'hidden'
}}>
  <img
    src={p.photo_url || (p.species === 'cat' ? '/cat.png' : '/dog.png')}
    alt={p.species}
    style={{ width: '36px', height: '36px', objectFit: p.photo_url ? 'cover' : 'contain', borderRadius: p.photo_url ? '8px' : '0' }}
    onError={(e) => { e.target.src = p.species === 'cat' ? '/cat.png' : '/dog.png'; }}
  />
</div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '0.97rem', color: '#222', marginBottom: '0.1rem' }}>
                {p.name}
                <span style={{
                  marginLeft: '0.5rem', fontSize: '0.72rem', fontWeight: '600',
                  padding: '0.1rem 0.5rem', borderRadius: '20px',
                  background: p.species === 'cat' ? 'rgba(255,193,7,0.15)' : 'rgba(67,97,238,0.1)',
                  color: p.species === 'cat' ? '#b8860b' : '#4361ee',
                  textTransform: 'capitalize'
                }}>{p.species}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.1rem' }}>
                <i className="fas fa-user me-1"></i>{p.owner_name || 'Unknown owner'}
                {p.breed && <> &nbsp;·&nbsp; <i className="fas fa-paw me-1"></i>{p.breed}</>}
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#4361ee', fontWeight: '600' }}>
                {p.registration_number}
              </div>
            </div>
            {/* Arrow */}
            <i className="fas fa-chevron-right" style={{ color: '#ccc', fontSize: '0.8rem' }} />
          </div>
        ));
      })()}
    </div>
  </Modal.Body>
</Modal>

                  {/* Vaccination Fields */}
                  {formData.record_type === 'vaccination' && (
                    <>
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                              Vaccination Type <span style={{ color: '#dc3545' }}>*</span>
                            </Form.Label>
                            <Form.Select
                              name="vaccination_type_id"
                              value={formData.vaccination_type_id}
                              onChange={handleChange}
                              required
                              disabled={!formData.pet_id}
                              style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
                            >
                              <option value="">Choose vaccine type...</option>
                              {getFilteredTypes().map(invItem => (
  <option key={invItem.id} value={invItem.id}>
    {invItem.item_name} ({!invItem.species || invItem.species === 'all' || invItem.species === 'both' ? 'All pets' : invItem.species})
    {modalMode === 'edit' && parseInt(invItem.current_stock) === 0 ? ' (current)' : ''}
  </option>
))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Batch Selection for Vaccination */}
                      {formData.vaccination_type_id && (
  <Row>
    <Col md={12}>
      <Form.Group className="mb-3">
        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
          {modalMode === 'edit' ? 'Change Batch (Optional)' : <>Select Batch <span style={{ color: '#dc3545' }}>*</span></>}
        </Form.Label>
        {modalMode === 'edit' && !selectedVaccineBatch && (
          <div style={{ fontSize: '0.82rem', color: '#856404', padding: '0.6rem 0.75rem', background: '#fff9e6', borderRadius: '8px', border: '1px solid #ffc107', marginBottom: '0.6rem' }}>
            <i className="fas fa-info-circle me-1"></i>
            No batch currently selected — the original batch may have been deleted or expired. You may optionally select a new batch below, or leave unselected to keep no batch assigned.
          </div>
        )}
                              {loadingBatches ? (
                                <div style={{ fontSize: '0.82rem', color: '#aaa', padding: '0.5rem' }}>
                                  <i className="fas fa-spinner fa-spin me-1" /> Loading batches...
                                </div>
                              ) : (vaccineBatches[String(formData._inventory_vaccine_id || formData.vaccination_type_id)] || []).length === 0 ? (

                                <div style={{ fontSize: '0.82rem', color: '#dc3545', padding: '0.6rem 0.75rem', background: '#fff5f5', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
                                  <i className="fas fa-exclamation-triangle me-1" /> No available batches for this vaccine.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {(vaccineBatches[String(formData._inventory_vaccine_id || formData.vaccination_type_id)] || []).map(batch => {
                                    const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
                                    const isSelected = selectedVaccineBatch === batch.id;
                                    const noStock = batch.available_qty <= 0;
                                    return (
                                      <div
                                        key={batch.id}
                                        style={{
                                          padding: '0.6rem 0.75rem',
                                          borderRadius: '6px',
                                          border: isSelected ? '2px solid #ffc107' : '1px solid #dee2e6',
                                          background: isSelected ? 'rgba(255,193,7,0.06)' : isExpired ? 'rgba(220,53,69,0.04)' : '#fafafa',
                                          opacity: noStock && !isSelected ? 0.5 : 1,
                                        }}
                                      >
                                        <div className="d-flex align-items-center gap-2">
                                          <Form.Check
                                            type="radio"
                                            id={`vac-batch-${batch.id}`}
                                            name="vaccine_batch_select"
                                            checked={isSelected}
                                            disabled={noStock || isExpired}
                                            onChange={() => setSelectedVaccineBatch(batch.id)}
                                          />
                                          <label htmlFor={`vac-batch-${batch.id}`} style={{ cursor: (noStock || isExpired) ? 'not-allowed' : 'pointer', flex: 1, marginBottom: 0 }}>
                                            <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                            {isExpired && <span className="ms-1" style={{ fontSize: '0.68rem', background: '#dc3545', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>EXPIRED</span>}
                                            <span className="ms-2" style={{ fontSize: '0.75rem', color: noStock ? '#dc3545' : batch.available_qty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>
                                              {batch.available_qty} available
                                            </span>
                                            {batch.expiration_date && !isExpired && (
                                              <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>
                                                · exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                              </span>
                                            )}
                                          </label>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <Form.Text className="text-muted mt-1 d-block">
                                <i className="fas fa-info-circle me-1" />1 dose will be deducted from the selected batch upon saving.
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      )}

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                              Vaccination Date <span style={{ color: '#dc3545' }}>*</span>
                            </Form.Label>
                            <Form.Control
                              type="date"
                              name="vaccination_date"
                              value={formData.vaccination_date}
                              onChange={handleChange}
                              max={todayPH()}
                              required
                              style={{
                                borderRadius: '8px',
                                padding: '0.75rem',
                                border: '2px solid #dee2e6'
                              }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                              Next Due Date (Optional)
                            </Form.Label>
                            <Form.Control
                              type="date"
                              name="vaccination_next_due_date"
                              value={formData.vaccination_next_due_date}
                              onChange={handleChange}
                              min={(() => { const d = new Date(formData.vaccination_date); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                              style={{
                                borderRadius: '8px',
                                padding: '0.75rem',
                                border: '2px solid #dee2e6'
                              }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  {/* Deworming Fields */}
                  {formData.record_type === 'deworming' && (
                    <>
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                              Deworming Type <span style={{ color: '#dc3545' }}>*</span>
                            </Form.Label>
                            <Form.Select
                              name="deworming_type_id"
                              value={formData.deworming_type_id}
                              onChange={handleChange}
                              required
                              disabled={!formData.pet_id}
                              style={{
                                borderRadius: '8px',
                                padding: '0.75rem',
                                border: '2px solid #dee2e6'
                              }}
                            >
                              <option value="">Choose deworming type...</option>
                              {getFilteredTypes().map(dt => (
                                <option key={dt.id} value={dt.id}>
                                  {dt.name} ({dt.species === 'both' || dt.species === 'all' ? 'All pets' : dt.species})
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                              Deworming Date <span style={{ color: '#dc3545' }}>*</span>
                            </Form.Label>
                            <Form.Control
                              type="date"
                              name="deworming_date"
                              value={formData.deworming_date}
                              onChange={handleChange}
                              max={todayPH()}
                              required
                              style={{
                                borderRadius: '8px',
                                padding: '0.75rem',
                                border: '2px solid #dee2e6'
                              }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                              Next Due Date (Optional)
                            </Form.Label>
                            <Form.Control
                              type="date"
                              name="deworming_next_due_date"
                              value={formData.deworming_next_due_date}
                              onChange={handleChange}
                              min={(() => { const d = new Date(formData.deworming_date); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                              style={{
                                borderRadius: '8px',
                                padding: '0.75rem',
                                border: '2px solid #dee2e6'
                              }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                              Dosage
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="dosage"
                              value={formData.dosage}
                              onChange={handleChange}
                              placeholder="e.g., 10mg"
                              style={{
                                borderRadius: '8px',
                                padding: '0.75rem',
                                border: '2px solid #dee2e6'
                              }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  {/* Sterilization Fields */}
  {formData.record_type === 'sterilization' && (
    <>
      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Procedure Type <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="procedure_type"
              value={
                formData.pet_id && getSelectedPet() 
                  ? getSelectedPet().gender === 'female' 
                    ? 'Spay (Female)' 
                    : 'Neuter (Male)'
                  : 'Select a pet first'
              }
              disabled
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                fontWeight: '500'
              }}
            />
            <Form.Text className="text-muted d-block mt-2">
              <i className="fas fa-info-circle me-1"></i>
              Procedure type is automatically determined based on pet's gender
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Sterilization Date <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="date"
              name="sterilization_date"
              value={formData.sterilization_date}
              onChange={handleChange}
              max={todayPH()}
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
    </>
  )}

                  {/* Microchip Fields */}
                  {formData.record_type === 'microchip' && (
                    <>
                      {/* Microchip subtype: manual number input + batch */}
                      {formData.microchip_subtype === 'microchip' && (
                        <>
                          <Row>
                            <Col md={12}>
                              <Form.Group className="mb-3">
                                <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                                  Microchip Number <span style={{ color: '#dc3545' }}>*</span>
                                </Form.Label>
                                <Form.Control type="text" name="microchip_number" value={formData.microchip_number} onChange={handleChange} placeholder="e.g., 985112345678901" required maxLength={20} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6', fontFamily: 'monospace', letterSpacing: '0.5px' }} />
                                <Form.Text className="text-muted">15-digit ISO standard microchip number</Form.Text>
                              </Form.Group>
                            </Col>
                          </Row>
                          <Row>
                            <Col md={12}>
                              <Form.Group className="mb-3">
                                <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                                  Select Batch <span style={{ color: '#dc3545' }}>*</span>
                                </Form.Label>
                                {loadingBatches ? (
                                  <div style={{ fontSize: '0.82rem', color: '#aaa', padding: '0.5rem' }}>
                                    <i className="fas fa-spinner fa-spin me-1" /> Loading batches...
                                  </div>
                                ) : microchipBatches.length === 0 ? (
                                  <div style={{ fontSize: '0.82rem', color: '#dc3545', padding: '0.6rem 0.75rem', background: '#fff5f5', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
                                    <i className="fas fa-exclamation-triangle me-1" /> No available microchip batches.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {microchipBatches.map(batch => {
                                      const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
                                      const isSelected = selectedMicrochipBatch === batch.id;
                                      const noStock = batch.available_qty <= 0;
                                      return (
                                        <div
                                          key={batch.id}
                                          style={{
                                            padding: '0.6rem 0.75rem',
                                            borderRadius: '6px',
                                            border: isSelected ? '2px solid #6c757d' : '1px solid #dee2e6',
                                            background: isSelected ? 'rgba(108,117,125,0.06)' : isExpired ? 'rgba(220,53,69,0.04)' : '#fafafa',
                                            opacity: noStock && !isSelected ? 0.5 : 1,
                                          }}
                                        >
                                          <div className="d-flex align-items-center gap-2">
                                            <Form.Check
                                              type="radio"
                                              id={`mic-batch-${batch.id}`}
                                              name="microchip_batch_select"
                                              checked={isSelected}
                                              disabled={noStock}
                                              onChange={() => setSelectedMicrochipBatch(batch.id)}
                                            />
                                            <label htmlFor={`mic-batch-${batch.id}`} style={{ cursor: noStock ? 'not-allowed' : 'pointer', flex: 1, marginBottom: 0 }}>
                                              <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                              {/* expired batches are filtered server-side */}
                                              <span className="ms-2" style={{ fontSize: '0.75rem', color: noStock ? '#dc3545' : batch.available_qty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>
                                                {batch.available_qty} available
                                              </span>
                                              {batch.expiration_date && !isExpired && (
                                                <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>
                                                  · exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                              )}
                                            </label>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <Form.Text className="text-muted mt-1 d-block">
                                  <i className="fas fa-info-circle me-1" />1 microchip will be deducted from the selected batch upon saving.
                                </Form.Text>
                              </Form.Group>
                            </Col>
                          </Row>
                        </>
                      )}

                      {/* Common microchip fields */}
                      {formData.microchip_subtype && (
                        <>
                          <Row>
                            <Col md={formData.microchip_subtype === 'qr' ? 12 : 6}>
                              <Form.Group className="mb-3">
                                <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                                  Implant Date <span style={{ color: '#dc3545' }}>*</span>
                                </Form.Label>
                                <Form.Control type="date" name="implant_date" value={formData.implant_date} onChange={handleChange} max={todayPH()} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                              </Form.Group>
                            </Col>
                            {formData.microchip_subtype === 'microchip' && (
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Implant Site</Form.Label>
                                  <Form.Select name="implant_site" value={formData.implant_site} onChange={handleChange} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
                                    <option value="">Select site...</option>
                                    <option value="Left neck">Left neck</option>
                                    <option value="Right neck">Right neck</option>
                                    <option value="Left shoulder">Left shoulder</option>
                                    <option value="Right shoulder">Right shoulder</option>
                                    <option value="Between shoulder blades">Between shoulder blades</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            )}
                          </Row>
                          {formData.microchip_subtype === 'microchip' && (
                            <Row>
                              <Col md={12}>
                                <Form.Group className="mb-3">
                                  <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Microchip Brand</Form.Label>
                                  <Form.Control type="text" name="microchip_brand" value={formData.microchip_brand} onChange={handleChange} placeholder="e.g., Datamars, Trovan, HomeAgain" style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                                </Form.Group>
                              </Col>
                            </Row>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Common Fields */}
  <Row>
    <Col md={6}>
      <Form.Group className="mb-3">
        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
          Veterinarian Name <span style={{ color: '#ef4444' }}>*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="veterinarian_name"
          value={formData.veterinarian_name}
          onChange={handleChange}
          placeholder="Dr. Juan Dela Cruz"
          style={{
            borderRadius: '8px',
            padding: '0.75rem',
            border: '2px solid #dee2e6'
          }}
        />
      </Form.Group>
    </Col>
    <Col md={6}>
      <Form.Group className="mb-3">
        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
          Pet Weight (kg)
        </Form.Label>
        <Form.Control
          type="number"
          name="weight"
          value={formData.weight}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          max="200"
          disabled={!formData.pet_id}
          style={{
            borderRadius: '8px',
            padding: '0.75rem',
            border: '2px solid #dee2e6'
          }}
        />
      </Form.Group>
    </Col>
  </Row>

  {/* Notes field for vaccination and deworming only */}
  {(formData.record_type === 'vaccination' || formData.record_type === 'deworming' || formData.record_type === 'microchip') && (
    <Row>
      <Col md={12}>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
            Additional Notes
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional information..."
            maxLength={50}
            style={{
              borderRadius: '8px',
              padding: '0.75rem',
              border: '2px solid #dee2e6',
              resize: 'none'
            }}
          />
          <Form.Text className="text-muted">
            {formData.notes.length}/50 characters
          </Form.Text>
        </Form.Group>
      </Col>
    </Row>
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
                                  onClick={(e) => {
                  e.preventDefault();
                  if (!formData.record_type) return;
                  if (modalMode === 'create' && !getSelectedPet()) return;
                  if (formData.record_type === 'microchip' && !formData.microchip_subtype) return;
                  if (formData.record_type === 'microchip' && formData.microchip_subtype === 'microchip' && !formData.microchip_number) return;
                  if (modalMode === 'edit') {
                    handleSubmit({ preventDefault: () => {} });
                    return;
                  }
                  // Check age requirement for vaccination, sterilization, microchip
                  const needsAgeCheck = ['vaccination', 'sterilization', 'microchip'].includes(formData.record_type);
                  if (needsAgeCheck) {
                    const pet = getSelectedPet();
                    if (pet) {
                      const needsWarning = !pet.birth_date || (() => {
                        const birth = new Date(pet.birth_date);
                        const today = new Date();
                        const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
                        return months < 3;
                      })();
                      if (needsWarning) {
                        setShowAgeConfirmModal(true);
                        return;
                      }
                    }
                  }
                  setShowConfirmRecordModal(true);
                }}
                disabled={
                  formLoading ||
                  !formData.record_type ||
                  (modalMode === 'create' && !getSelectedPet()) ||
                  // Vaccination
                  (formData.record_type === 'vaccination' && !formData.vaccination_type_id) ||
                  (formData.record_type === 'vaccination' && modalMode === 'create' && !selectedVaccineBatch) ||
                  (formData.record_type === 'vaccination' && !formData.vaccination_date) ||
                  // Sterilization
                  (formData.record_type === 'sterilization' && !formData.sterilization_date) ||
                  // Microchip
                  (formData.record_type === 'microchip' && !formData.microchip_subtype) ||
                  (formData.record_type === 'microchip' && formData.microchip_subtype === 'microchip' && !formData.microchip_number?.trim()) ||
                  (formData.record_type === 'microchip' && formData.microchip_subtype === 'microchip' && modalMode === 'create' && !selectedMicrochipBatch) ||
                  (formData.record_type === 'microchip' && !formData.implant_date) ||
                  // Common required
                  !formData.veterinarian_name.trim()
                }
                className="border-0"
                style={{
                  background: formLoading ? '#6c757d' : '#000000',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontWeight: '600'
                }}
                onMouseOver={(e) => { if (!formLoading) e.currentTarget.style.background = '#333333'; }}
                onMouseOut={(e) => { if (!formLoading) e.currentTarget.style.background = '#000000'; }}
              >
                {formLoading ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className={`fas ${modalMode === 'edit' ? 'fa-save' : 'fa-eye'} me-2`}></i>
                    {modalMode === 'edit' ? 'Save Changes' : `Add ${formData.record_type ? getRecordTypeLabel(formData.record_type) : ''} Record`}
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* View Record Modal */}
        <Modal show={showViewModal} onHide={handleCloseViewModal} size="lg" centered={window.innerWidth <= 768} className="record-view-modal" style={{ zoom: '0.75' }}>
  <Modal.Header 
    closeButton
    style={{
      background: '#f8f9fa',
      borderBottom: '2px solid #dee2e6'
    }}
  >
    <Modal.Title style={{ fontWeight: '700', fontSize: '1rem' }}>
      <i className="fas fa-eye me-2"></i>
      Record Details
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '0' }}>
  {selectedRecord && (
    <>
      {/* Colored Header Banner */}
      <div className="record-banner" style={{
        background: selectedRecord.recordType === 'microchip'
          ? 'linear-gradient(135deg, #4361ee 0%, #3451d1 100%)'
          : selectedRecord.recordType === 'vaccination'
          ? 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
          : selectedRecord.recordType === 'deworming'
          ? 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
          : 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
        padding: '1.5rem 2rem',
        color: selectedRecord.recordType === 'vaccination' ? '#000' : '#fff'
      }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '0.5rem', width: '100%' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: '0.25rem' }}>
              Record Type
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedRecord.recordType === 'vaccination' && <><i className="fas fa-syringe"></i> Vaccination</>}
              {selectedRecord.recordType === 'deworming' && <><i className="fas fa-pills"></i> Deworming</>}
              {selectedRecord.recordType === 'sterilization' && <><i className="fas fa-cut"></i> Sterilization</>}
              {selectedRecord.recordType === 'microchip' && <><i className="fas fa-microchip"></i> Microchip</>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: '0.25rem' }}>
              Date
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '600' }}>
              {selectedRecord.recordType === 'vaccination' && new Date(selectedRecord.vaccination_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {selectedRecord.recordType === 'deworming' && new Date(selectedRecord.deworming_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {selectedRecord.recordType === 'sterilization' && new Date(selectedRecord.sterilization_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {selectedRecord.recordType === 'microchip' && new Date(selectedRecord.implant_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="record-body" style={{ padding: '1.75rem 2rem' }}>

        {/* Pet Info Card */}
        <div className="pet-info-card" style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '0.75rem' }}>
            Pet Information
          </div>
          <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111' }}>{selectedRecord.pet_name}</div>
              <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.2rem' }}>
                <i className="fas fa-barcode me-1"></i>{selectedRecord.registration_number}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                background: '#e9ecef',
                borderRadius: '20px',
                padding: '0.25rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#555',
                textTransform: 'capitalize'
              }}>
                {selectedRecord.species || selectedRecord.pet_species}
              </span>
            </div>
          </div>
        </div>

        {/* Record-specific details */}
        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

          {/* Vaccination */}
          {selectedRecord.recordType === 'vaccination' && (
            <>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Vaccine Type</div>
                <div className="detail-value" style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.vaccine_name}</div>
              </div>
              {selectedRecord.next_due_date && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Next Due Date</div>
                  <div style={{ fontWeight: '700', color: new Date(selectedRecord.next_due_date) < new Date() ? '#dc3545' : '#28a745', fontSize: '0.95rem' }}>
                    <i className={`fas ${new Date(selectedRecord.next_due_date) < new Date() ? 'fa-exclamation-circle' : 'fa-calendar-check'} me-1`}></i>
                    {new Date(selectedRecord.next_due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Deworming */}
          {selectedRecord.recordType === 'deworming' && (
            <>
              <div>
                <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Deworming Type</div>
                <div className="detail-value" style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.deworming_name}</div>
              </div>
              {selectedRecord.dosage && (
                <div>
                  <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Dosage</div>
                  <div className="detail-value" style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.dosage}</div>
                </div>
              )}
              {selectedRecord.next_due_date && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Next Due Date</div>
                  <div style={{ fontWeight: '700', color: new Date(selectedRecord.next_due_date) < new Date() ? '#dc3545' : '#28a745', fontSize: '0.95rem' }}>
                    <i className={`fas ${new Date(selectedRecord.next_due_date) < new Date() ? 'fa-exclamation-circle' : 'fa-calendar-check'} me-1`}></i>
                    {new Date(selectedRecord.next_due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sterilization */}
          {selectedRecord.recordType === 'sterilization' && (
            <>
              <div>
                <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Procedure Type</div>
                <div>
                  <Badge bg="success" style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', borderRadius: '20px', textTransform: 'capitalize' }}>
                    {selectedRecord.procedure_type}
                  </Badge>
                </div>
              </div>
              {selectedRecord.clinic_name && (
                <div>
                  <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Clinic</div>
                  <div className="detail-value" style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.clinic_name}</div>
                </div>
              )}
            </>
          )}

          {/* Microchip */}
          {selectedRecord.recordType === 'microchip' && (
            <>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Microchip Number</div>
                <div className="microchip-number" style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: '700', color: '#4361ee', background: '#eef0ff', borderRadius: '8px', padding: '0.5rem 0.85rem', display: 'inline-block', letterSpacing: '1px' }}>
                  {selectedRecord.microchip_number}
                </div>
              </div>
              <div>
                <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Microchip Brand</div>
                <div className="detail-value" style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.microchip_brand || <span style={{ color: '#bbb', fontWeight: '400' }}>Not specified</span>}</div>
              </div>
              <div>
                <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Implant Site</div>
                <div className="detail-value" style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.implant_site || <span style={{ color: '#bbb', fontWeight: '400' }}>Not specified</span>}</div>
              </div>
            </>
          )}

          {/* Common Fields */}
          <div>
            <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Veterinarian</div>
            <div className="detail-value" style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.veterinarian_name || <span style={{ color: '#bbb', fontWeight: '400' }}>Not specified</span>}</div>
          </div>
          <div>
            <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Weight</div>
            <div className="detail-value" style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.weight ? `${selectedRecord.weight} kg` : <span style={{ color: '#bbb', fontWeight: '400' }}>Not specified</span>}</div>
          </div>

          {/* Notes */}
          {(selectedRecord.recordType === 'vaccination' || selectedRecord.recordType === 'deworming' || selectedRecord.recordType === 'microchip') && selectedRecord.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="detail-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Additional Notes</div>
              <div style={{ fontWeight: '500', color: '#444', fontSize: '0.95rem', background: '#f8f9fa', borderRadius: '8px', padding: '0.6rem 0.85rem', border: '1px solid #e9ecef' }}>{selectedRecord.notes}</div>
            </div>
          )}
        </div>

        {/* QR Code Section — only for microchip, at the bottom */}
        {selectedRecord.recordType === 'microchip' && (
          <div className="qr-section" style={{ borderTop: '2px dashed #e0e4ff', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4361ee', marginBottom: '1rem', textAlign: 'center' }}>
              <i className="fas fa-qrcode me-2" />Pet Identity QR Code
            </div>
            {qrLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner animation="border" size="sm" style={{ color: '#4361ee' }} />
                <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.5rem' }}>Generating QR code...</div>
              </div>
            ) : qrDataURL ? (
              <div className="qr-inner" style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'linear-gradient(135deg, #f0f4ff 0%, #eef0ff 100%)', borderRadius: '14px', padding: '1.5rem', border: '1.5px solid rgba(67,97,238,0.15)' }}>
                <div style={{ flexShrink: 0 }}>
                  <img
                    src={qrDataURL}
                    alt="Pet QR Code"
                    style={{ width: '220px', height: '220px', borderRadius: '12px', border: '3px solid #4361ee', padding: '6px', background: '#fff', boxShadow: '0 6px 24px rgba(67,97,238,0.18)', display: 'block' }}
                  />
                </div>
                <div className="qr-text" style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', color: '#4361ee', fontSize: '1rem', marginBottom: '0.4rem' }}>
                    {selectedRecord.pet_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.3rem' }}>
                    <i className="fas fa-microchip me-1" style={{ color: '#4361ee' }}></i>
                    <span style={{ fontFamily: 'monospace' }}>{selectedRecord.microchip_number}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#999', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    Scan this QR code to instantly view full pet identity and medical information.
                  </div>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrDataURL;
                      link.download = `QR_${selectedRecord.pet_name}_${selectedRecord.microchip_number}.png`;
                      link.click();
                    }}
                    style={{ background: '#4361ee', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.55rem 1.25rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={e => e.currentTarget.style.background = '#3451d1'}
                    onMouseOut={e => e.currentTarget.style.background = '#4361ee'}
                  >
                    <i className="fas fa-download"></i> Download QR Code
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#bbb', background: '#f8f9fa', borderRadius: '12px', border: '1.5px dashed #e0e0e0' }}>
                <i className="fas fa-qrcode" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem', color: '#ddd' }} />
                <div style={{ fontSize: '0.82rem' }}>QR code not available for this record</div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )}
</Modal.Body>
          <Modal.Footer style={{ padding: '0.75rem 1.25rem' }}>
            {selectedRecord?.recorded_by === 'City Vet Muntinlupa' && (
  <Button
    onClick={() => { handleCloseViewModal(); handleOpenEditModal(selectedRecord, selectedRecord.recordType); }}
    className="border-0"
    style={{ background: '#000000', color: '#ffffff', borderRadius: '8px', padding: '0.5rem 1.25rem', fontWeight: '600', fontSize: '0.9rem' }}
    onMouseOver={(e) => e.target.style.background = '#333333'}
    onMouseOut={(e) => e.target.style.background = '#000000'}
  >
    <i className="fas fa-edit me-2"></i>Edit Record
  </Button>
)}
            <Button 
              variant="secondary" 
              onClick={handleCloseViewModal}
              style={{
                borderRadius: '8px',
                padding: '0.5rem 1.25rem',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
            {/* Restore Confirmation Modal */}
      <Modal show={showRestoreModal} onHide={() => !restoreLoading && setShowRestoreModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f0fff4', borderBottom: '2px solid #28a745' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-undo text-success me-2"></i>Restore Record
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {recordToRestore && (() => {
            const [icon, color, label] = RECORD_TYPE_META[recordToRestore.recordType] || RECORD_TYPE_META.vaccination;
            const isMissed = recordToRestore.record_status === 'missed';
            const hasDue = recordToRestore.recordType === 'vaccination' || recordToRestore.recordType === 'deworming';
            const oldDue = recordToRestore.next_due_date ? String(recordToRestore.next_due_date).slice(0, 10) : '';
            const conflict = findRestoreConflict(recordToRestore);
            const isVacRec = recordToRestore.recordType === 'vaccination';
            const fmtDate = (v) => v ? new Date(String(v).slice(0, 10)).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
            return (
              <>
                {conflict && (
                  <div style={{ background: 'rgba(220,53,69,0.06)', border: '2px solid #dc3545', borderRadius: '12px', padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
                    <div className="d-flex align-items-start" style={{ gap: '0.75rem' }}>
                      <i className="fas fa-ban" style={{ color: '#dc3545', fontSize: '1.3rem', marginTop: '2px', flexShrink: 0 }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', color: '#b02a37', marginBottom: '0.25rem' }}>Cannot restore this record</div>
                        <div style={{ fontSize: '0.88rem', color: '#6c2a30', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                          <strong>{recordToRestore.pet_name}</strong> already has an <strong>active</strong> {isVacRec ? 'vaccination' : 'deworming'} record
                          with the same {isVacRec ? 'vaccine' : 'dewormer'} on the same date.
                        </div>
                        <div style={{ background: '#ffffff', border: '1px solid #f1c2c7', borderRadius: '8px', padding: '0.75rem 0.9rem', fontSize: '0.85rem' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', marginBottom: '0.5rem' }}>
                            <i className="fas fa-check-circle me-1" style={{ color: '#28a745' }}></i>Active record
                          </div>
                          {[
                            [isVacRec ? 'Vaccine' : 'Dewormer', isVacRec ? conflict.vaccine_name : conflict.deworming_name],
                            ['Date', fmtDate(isVacRec ? conflict.vaccination_date : conflict.deworming_date)],
                            ['Next Due', conflict.next_due_date ? fmtDate(conflict.next_due_date) : 'Not set'],
                            ['Veterinarian', conflict.veterinarian_name || 'Not specified'],
                            ['Recorded By', conflict.recorded_by || 'City Vet Muntinlupa'],
                          ].map(([k, v]) => (
                            <div key={k} className="d-flex justify-content-between" style={{ padding: '0.2rem 0', gap: '1rem' }}>
                              <span style={{ color: '#888' }}>{k}</span>
                              <strong style={{ color: '#333', textAlign: 'right' }}>{v || '—'}</strong>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6c2a30', marginTop: '0.65rem' }}>
                          <i className="fas fa-lightbulb me-1" style={{ color: '#ffc107' }}></i>
                          Archive or edit the active record first if you want to keep this one instead.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {restoreError && !conflict && (
                  <Alert variant="danger" className="mb-3"><i className="fas fa-exclamation-triangle me-2"></i>{restoreError}</Alert>
                )}
                <p style={{ fontSize: '1rem', marginBottom: '1.25rem', color: '#444' }}>
                  {isMissed
                    ? 'This record was not followed up before its due date (e.g. typhoon, holiday, or clinic closed). Set a new next due date so the pet can continue its sessions.'
                    : 'This record will become active again and show on the vet card.'}
                </p>
                <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
                  <div className="mb-2" style={{ fontWeight: '500', color: '#555' }}>
                    <i className={`fas ${icon} me-1`} style={{ color }}></i>{label}
                  </div>
                  <strong style={{ fontSize: '1.1rem' }}>{recordToRestore.pet_name}</strong><br />
                  <small className="text-muted"><i className="fas fa-barcode me-1"></i>{recordToRestore.registration_number}</small>
                  {getInactiveLabel(recordToRestore) && (
                    <div className="mt-2" style={{ fontSize: '0.82rem', fontWeight: '600', color: '#fd7e14' }}>
                      <i className="fas fa-info-circle me-1"></i>{getInactiveLabel(recordToRestore)}
                    </div>
                  )}
                </div>
                {hasDue && !conflict && (
                  <div className="mt-3">
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333' }}>
                        New Next Due Date{' '}
                        {isMissed
                          ? <span style={{ color: '#dc3545' }}>*</span>
                          : <span style={{ fontWeight: '400', color: '#888', fontSize: '0.85rem' }}>(optional)</span>}
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={restoreDueDate}
                        min={todayPH()}
                        onChange={(e) => { setRestoreDueDate(e.target.value); setRestoreError(''); }}
                        style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
                      />
                      {oldDue && (
                        <Form.Text className="text-muted">
                          Original due date: {new Date(oldDue).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </Form.Text>
                      )}
                    </Form.Group>
                    <Form.Group>
                      <Form.Label style={{ fontWeight: '600', color: '#333' }}>
                        Reason <span style={{ fontWeight: '400', color: '#888', fontSize: '0.85rem' }}>(optional)</span>
                      </Form.Label>
                      <Form.Select
                        value={restoreReason}
                        onChange={(e) => setRestoreReason(e.target.value)}
                        style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
                      >
                        <option value="">Select a reason...</option>
                        {['Typhoon / bad weather', 'Holiday', 'Clinic was closed', 'Pet was sick', 'Owner could not attend', 'Archived by mistake', 'Other'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </div>
                )}
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)} disabled={restoreLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Cancel</Button>
          <Button variant="success" onClick={handleRestoreConfirm}
            disabled={restoreLoading || (recordToRestore?.record_status === 'missed' && !restoreDueDate) || !!findRestoreConflict(recordToRestore)}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            {restoreLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Restoring...</>
              : <><i className="fas fa-undo me-2"></i>Restore Record</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Archive Confirmation Modal (records are never deleted) */}
      <Modal show={showDeleteModal} onHide={() => !deleteLoading && setShowDeleteModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#fffbea', borderBottom: '2px solid #ffc107' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-archive me-2" style={{ color: '#ffc107' }}></i>Archive Record
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {recordToDelete && (() => {
            const [icon, color, label] = RECORD_TYPE_META[recordToDelete.recordType] || RECORD_TYPE_META.vaccination;
            return (
              <>
                <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#444' }}>
                  Archive this record? Use this for records added by mistake. Nothing will be deleted.
                </p>
                <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
                  <div className="mb-2" style={{ fontWeight: '500', color: '#555' }}>
                    <i className={`fas ${icon} me-1`} style={{ color }}></i>{label}
                  </div>
                  <strong style={{ fontSize: '1.1rem' }}>{recordToDelete.pet_name}</strong><br />
                  <small className="text-muted"><i className="fas fa-barcode me-1"></i>{recordToDelete.registration_number}</small>
                </div>
                <div className="mt-3 d-flex align-items-start gap-2 p-3" style={{ background: 'rgba(13,110,253,0.06)', borderRadius: '10px', border: '1px solid rgba(13,110,253,0.2)', fontSize: '0.88rem', color: '#555' }}>
                  <i className="fas fa-info-circle mt-1" style={{ color: '#0d6efd', flexShrink: 0 }}></i>
                  <div>
                    The record becomes <strong>inactive</strong>: it moves to the <strong>Inactive</strong> filter and no longer shows on the vet card. All its data is kept and you can restore it anytime.
                  </div>
                </div>
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} disabled={deleteLoading} className="border-0"
            style={{ background: '#ffc107', color: '#000', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700' }}>
            {deleteLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Archiving...</>
              : <><i className="fas fa-archive me-2"></i>Archive Record</>}
          </Button>
        </Modal.Footer>
      </Modal>

      </Container>

      {/* ── Age Confirmation Modal ── */}
      <Modal show={showAgeConfirmModal} onHide={() => setShowAgeConfirmModal(false)} centered size="md" style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #fff9e6, #fff3cd)', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
          <Modal.Title style={{ fontWeight: '800', color: '#7a5000', fontSize: '1.1rem' }}>
            <i className="fas fa-exclamation-triangle me-2" style={{ color: '#ffc107' }} />
            Age Requirement Notice
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,193,7,0.12)', border: '2px solid rgba(255,193,7,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <i className="fas fa-paw" style={{ fontSize: '2rem', color: '#ffc107' }} />
          </div>
          <p style={{ fontWeight: '700', color: '#333', fontSize: '1rem', marginBottom: '0.5rem' }}>
            {!getSelectedPet()?.birth_date
              ? <>This pet has <span style={{ color: '#ffc107' }}>no birth date on record</span>.</>
              : <>This pet appears to be <span style={{ color: '#ffc107' }}>under 3 months old</span>.</>
            }
          </p>
          <p style={{ fontSize: '0.88rem', color: '#777', marginBottom: '1rem', lineHeight: 1.65, maxWidth: '360px', margin: '0 auto 1.25rem' }}>
            The minimum age requirement for {getRecordTypeLabel(formData.record_type)} is <strong>3 months old</strong>.
            Are you sure this pet is 3 months old or above and <span style={{ color: '#198754', fontWeight: '700' }}>healthy</span>?
          </p>
          <div style={{ background: 'rgba(220,53,69,0.06)', border: '1.5px solid rgba(220,53,69,0.25)', borderRadius: '10px', padding: '0.75rem 1rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: '#dc3545', fontWeight: '600', lineHeight: 1.55 }}>
                Proceeding with an unqualified pet may result in complications. Please confirm the pet meets the age and health requirements before proceeding.
              </span>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #e0e0e0', padding: '1.25rem 2rem', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setShowAgeConfirmModal(false)}
            style={{ borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600', fontSize: '0.9rem', flex: 1 }}>
            <i className="fas fa-arrow-left me-2" />Back
          </Button>
          <Button className="border-0" onClick={() => { setShowAgeConfirmModal(false); setShowConfirmRecordModal(true); }}
            style={{ background: 'linear-gradient(135deg, #ffc107, #ffb300)', color: '#000', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '700', fontSize: '0.9rem', flex: 1, boxShadow: '0 4px 12px rgba(255,193,7,0.4)' }}>
            <i className="fas fa-check me-2" />Yes, Proceed
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Review & Confirm Record Modal ── */}
      <Modal show={showConfirmRecordModal} onHide={() => setShowConfirmRecordModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', borderBottom: '2px solid #ffc107' }}>
          <Modal.Title style={{ fontWeight: '700', color: '#333' }}>
            <i className="fas fa-clipboard-check me-2" style={{ color: '#ffc107' }} />
            Review Record Before Saving
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Please review the record details before adding.
          </p>

          {/* Record Type Banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: formData.record_type === 'vaccination' ? 'rgba(255,193,7,0.1)'
              : formData.record_type === 'deworming' ? 'rgba(23,162,184,0.1)'
              : formData.record_type === 'sterilization' ? 'rgba(40,167,69,0.1)'
              : 'rgba(67,97,238,0.1)',
            border: `1.5px solid ${
              formData.record_type === 'vaccination' ? 'rgba(255,193,7,0.3)'
              : formData.record_type === 'deworming' ? 'rgba(23,162,184,0.3)'
              : formData.record_type === 'sterilization' ? 'rgba(40,167,69,0.3)'
              : 'rgba(67,97,238,0.3)'}`,
            borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem'
          }}>
            <img
              src={formData.record_type === 'vaccination' ? '/vaccine.png' : formData.record_type === 'deworming' ? '/deworm.png' : formData.record_type === 'sterilization' ? '/sterilization.png' : '/microchip.png'}
              alt={formData.record_type}
              style={{ width: '36px', height: '36px', objectFit: 'contain' }}
              onError={e => e.target.style.display = 'none'}
            />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', marginBottom: '2px' }}>Record Type</div>
              <div style={{ fontWeight: '700', color: '#333' }}>{getRecordTypeLabel(formData.record_type)}</div>
            </div>
          </div>

          {(() => {
            const n = getSessionNumber();
            if (n < 2) return null;
            return (
              <div style={{ background: 'rgba(255,193,7,0.12)', border: '2px solid #ffc107', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#ffc107', fontSize: '1.2rem', marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: '800', color: '#7a5000' }}>This will be the {ordinal(n)} session</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b5300' }}>
                    {getSelectedPet()?.name || 'This pet'} already has {n - 1} record{n - 1 > 1 ? 's' : ''} of this {formData.record_type === 'deworming' ? 'dewormer' : 'vaccine'}. Are you sure this is the {ordinal(n)} session?
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Details */}
          <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem', border: '1px solid #e9ecef' }}>
            {[
              { icon: 'fa-paw', label: 'Pet', value: getSelectedPet() ? `${getSelectedPet().name} (${getSelectedPet().registration_number})` : '—' },
              ...(formData.record_type === 'vaccination' ? [
                { icon: 'fa-syringe', label: 'Vaccine', value: (() => { const f = inventoryItems.find(i => String(i.id) === String(formData.vaccination_type_id)); return f ? f.item_name : '—'; })() },
                { icon: 'fa-calendar', label: 'Vaccination Date', value: formData.vaccination_date || '—' },
                { icon: 'fa-calendar-check', label: 'Next Due Date', value: formData.vaccination_next_due_date || 'Not set' },
              ] : []),
              ...(formData.record_type === 'deworming' ? [
                { icon: 'fa-pills', label: 'Deworming Type', value: (() => { const f = dewormingTypes.find(d => String(d.id) === String(formData.deworming_type_id)); return f ? f.name : '—'; })() },
                { icon: 'fa-calendar', label: 'Deworming Date', value: formData.deworming_date || '—' },
                { icon: 'fa-calendar-check', label: 'Next Due Date', value: formData.deworming_next_due_date || 'Not set' },
                { icon: 'fa-prescription-bottle', label: 'Dosage', value: formData.dosage || 'Not specified' },
              ] : []),
              ...(formData.record_type === 'sterilization' ? [
                { icon: 'fa-cut', label: 'Procedure', value: getSelectedPet() ? (getSelectedPet().gender === 'female' ? 'Spay (Female)' : 'Neuter (Male)') : '—' },
                { icon: 'fa-calendar', label: 'Sterilization Date', value: formData.sterilization_date || '—' },
              ] : []),
              ...(formData.record_type === 'microchip' ? [
                { icon: 'fa-tag', label: 'Type', value: formData.microchip_subtype === 'qr' ? 'QR Code (Auto-generated)' : 'Physical Microchip' },
                ...(formData.microchip_subtype === 'microchip' ? [{ icon: 'fa-microchip', label: 'Microchip No.', value: formData.microchip_number || '—' }] : []),
                { icon: 'fa-calendar', label: 'Implant Date', value: formData.implant_date || '—' },
                ...(formData.microchip_subtype === 'microchip' ? [
                  { icon: 'fa-map-marker-alt', label: 'Implant Site', value: formData.implant_site || 'Not specified' },
                  { icon: 'fa-tag', label: 'Brand', value: formData.microchip_brand || 'Not specified' },
                ] : []),
              ] : []),
              { icon: 'fa-user-md', label: 'Veterinarian', value: formData.veterinarian_name || 'Not specified' },
              { icon: 'fa-weight', label: 'Weight', value: formData.weight ? `${formData.weight} kg` : 'Not specified' },
              ...(formData.notes ? [{ icon: 'fa-sticky-note', label: 'Notes', value: formData.notes }] : []),
            ].map((item, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: i < arr.length - 1 ? '0.75rem' : 0, marginBottom: i < arr.length - 1 ? '0.75rem' : 0, borderBottom: i < arr.length - 1 ? '1px solid #e9ecef' : 'none' }}>
                <div style={{ width: '28px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '2px' }}>
                  <i className={`fas ${item.icon}`} style={{ color: '#ffc107', fontSize: '0.8rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem', wordBreak: 'break-word', fontFamily: item.label === 'Microchip No.' ? 'monospace' : 'inherit' }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setShowConfirmRecordModal(false)} disabled={formLoading}
            style={{ borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            <i className="fas fa-arrow-left me-2" />Back to Edit
          </Button>
          <Button disabled={formLoading} className="border-0"
            onClick={() => {
              setShowConfirmRecordModal(false);
              handleSubmit({ preventDefault: () => {} });
            }}
            style={{ background: formLoading ? '#6c757d' : '#000000', color: '#ffffff', borderRadius: '10px', padding: '0.75rem 1.75rem', fontWeight: '700', transition: 'all 0.3s' }}
            onMouseOver={e => { if (!formLoading) e.currentTarget.style.background = '#333'; }}
            onMouseOut={e => { if (!formLoading) e.currentTarget.style.background = '#000'; }}
          >
            {formLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</>
              : <><i className="fas fa-save me-2" />{getSessionNumber() > 1 ? `Yes, Save as ${ordinal(getSessionNumber())} Session` : 'Confirm'}</>}
          </Button>
        </Modal.Footer>
      </Modal>

      
      </>
    );
  };

  export default RecordManagement;