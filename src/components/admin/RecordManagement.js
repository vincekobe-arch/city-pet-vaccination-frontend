import React, { useState, useEffect, useRef } from 'react';
  import { Container, Row, Col, Card, Button, Modal, Form, InputGroup } from 'react-bootstrap';
  import { vaccinationAPI, dewormingAPI, sterilizationAPI, microchipAPI, petAPI, handleAPIError } from '../../services/api';
  import { getUser } from '../../utils/auth';
  import QRCode from 'qrcode';
import api from '../../services/api';
import { todayPH, freshTodayPH } from '../../utils/serverTime';

// Sterilization checks
// - a real sterilization record exists → can't add another
// - owner only marked the pet as neutered when registering → ask before recording
const hasSterilizationRecord = (pet) => Number(pet?.sterilization_count) > 0;
const ownerMarkedSterilized = (pet) =>
  !!pet && !hasSterilizationRecord(pet) && (pet.sterilized === true || String(pet.sterilized) === '1');

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
    const itemsPerPage = 10;

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
    /* ---------------- Modals ---------------- */
    .rx-zoom-modal { zoom: 0.75; }
    @media (min-width: 1600px) { .rx-zoom-modal { zoom: 0.9; } }
    @media (min-width: 1920px) { .rx-zoom-modal { zoom: 1; } }
    .rx-backdrop-top { z-index: 1060 !important; }
    .rx-modal { max-width: 720px; }
    .rx-small { max-width: 440px; }
    .rx-small.wide { max-width: 540px; }
    .rx-modal .modal-content, .rx-small .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    .rx-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: 1px solid #eef0f3 !important; background: linear-gradient(180deg, color-mix(in srgb, var(--c, #ffc107) 8%, #fff) 0%, #fff 100%) !important; }
    .rx-head-main { display: flex; gap: 0.9rem; align-items: center; min-width: 0; flex: 1; }
    .rx-head-ic { width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: var(--c, #e0a800); background: color-mix(in srgb, var(--c, #ffc107) 14%, #fff); }
    .rx-kicker { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: color-mix(in srgb, var(--c, #e0a800) 80%, #000); }
    .rx-title { font-size: 1.2rem; font-weight: 700; color: #1f2328; margin: 0; line-height: 1.3; }
    .rx-head-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .rx-body { padding: 1.4rem 1.5rem !important; }
    .rx-section { margin-bottom: 1.25rem; }
    .rx-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.7rem; }
    .rx-section-title > i { color: #e0a800; font-size: 0.8rem; }
    .rx-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
    .rx-type { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.9rem 0.5rem; border: 1.5px solid #e5e7eb; border-radius: 14px; background: #fff; transition: all 0.15s ease; }
    .rx-type:hover { border-color: color-mix(in srgb, var(--c) 50%, #fff); }
    .rx-type.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 7%, #fff); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 16%, transparent); }
    .rx-type-ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); font-size: 1.1rem; }
    .rx-type-ic img { width: 30px; height: 30px; object-fit: contain; }
    .rx-type-label { font-weight: 700; font-size: 0.86rem; color: #374151; }
    .rx-type.on .rx-type-label { color: color-mix(in srgb, var(--c) 80%, #000); }
    .rx-type-check { position: absolute; top: 7px; right: 8px; color: var(--c); font-size: 0.85rem; }

    /* fields inside the modals */
    .rx-zoom-modal .form-label { font-size: 0.84rem !important; font-weight: 600 !important; color: #374151 !important; margin-bottom: 0.35rem; }
    .rx-zoom-modal .form-control, .rx-zoom-modal .form-select { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; box-shadow: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .rx-zoom-modal .form-control:focus, .rx-zoom-modal .form-select:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .rx-zoom-modal .form-control.is-invalid { border-color: #dc3545 !important; }
    .rx-zoom-modal .form-control:disabled, .rx-zoom-modal .form-select:disabled { background-color: #f8f9fa !important; }
    .rx-zoom-modal .input-group > .form-control { border-radius: 0 !important; }
    .rx-zoom-modal .input-group-text { border: 1.5px solid #e5e7eb !important; border-right: none !important; background: #f8f9fa !important; border-radius: 10px 0 0 10px !important; font-size: 0.95rem !important; }
    .rx-zoom-modal .input-group > .btn:last-child { border-radius: 0 10px 10px 0 !important; }
    .rx-zoom-modal .form-text { font-size: 0.76rem; }
    .rx-zoom-modal .alert { border-radius: 10px; font-size: 0.86rem; border-width: 1px; }
    .rx-zoom-modal .form-check-input:checked { background-color: #ffc107; border-color: #ffc107; }

    .rx-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.86rem; margin-bottom: 1rem; }
    .rx-alert i { margin-top: 3px; }
    .rx-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #842029; }
    .rx-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; align-items: center; gap: 0.6rem; flex-wrap: nowrap !important; }
    .rx-foot > * { margin: 0 !important; }
    .rx-foot.even > * { flex: 1; }
    .rx-btn { display: inline-flex !important; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 10px !important; border: 1px solid transparent !important; font-weight: 700 !important; font-size: 0.9rem !important; padding: 0.65rem 1.2rem !important; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .rx-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .rx-btn.primary { background: #ffc107 !important; color: #1f2328 !important; }
    .rx-btn.primary:hover:not(:disabled) { background: #f0b400 !important; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .rx-btn.ghost { background: #fff !important; color: #1f2328 !important; border-color: #e5e7eb !important; font-weight: 600 !important; }
    .rx-btn.ghost:hover:not(:disabled) { background: #f6f7f9 !important; }
    .rx-btn.solid { background: var(--c) !important; color: #fff !important; }
    .rx-btn.solid:hover:not(:disabled) { background: color-mix(in srgb, var(--c) 85%, #000) !important; }

    /* view details */
    .rx-pet { display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem 1rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .rx-pet-av { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,193,7,0.16); color: #b88a00; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rx-pet-name { font-weight: 700; color: #1f2328; font-size: 1rem; }
    .rx-pet-meta { font-size: 0.8rem; color: #6b7280; }
    .rx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .rx-info { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.7rem 0.8rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fff; }
    .rx-info.wide { grid-column: 1 / -1; }
    .rx-info-ic { width: 30px; height: 30px; border-radius: 9px; background: #f6f7f9; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .rx-info-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .rx-info-value { font-size: 0.92rem; font-weight: 600; color: #1f2328; word-break: break-word; }
    .rx-none { color: #b8bdc6; font-weight: 500; }
    .rx-notes { margin-top: 0.9rem; padding: 0.8rem 0.95rem; border-radius: 12px; background: #fffaeb; border: 1px solid rgba(255,193,7,0.3); }
    .rx-notes p { margin: 0; font-size: 0.88rem; color: #374151; white-space: pre-line; }

    /* small centered modals */
    @keyframes rxPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    .rx-small-body { padding: 1.75rem 1.6rem 1.25rem !important; text-align: center; }
    .rx-small-icon { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); animation: rxPop 0.4s ease-out; }
    .rx-small-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; }
    .rx-small-text { font-size: 0.88rem; color: #6b7280; margin-bottom: 1.1rem; line-height: 1.55; }
    .rx-item { display: flex; align-items: center; gap: 0.7rem; text-align: left; padding: 0.7rem 0.85rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .rx-item-av { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, #fff); }
    .rx-item-name { font-weight: 700; color: #1f2328; font-size: 0.94rem; }
    .rx-item-meta { font-size: 0.78rem; color: #6b7280; }
    .rx-item-flag { font-size: 0.76rem; font-weight: 600; color: #c2410c; margin-top: 0.2rem; }
    .rx-note { display: flex; gap: 0.5rem; align-items: flex-start; text-align: left; margin-top: 0.8rem; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.8rem; line-height: 1.5; color: color-mix(in srgb, var(--c) 80%, #000); background: color-mix(in srgb, var(--c) 6%, #fff); border: 1px solid color-mix(in srgb, var(--c) 20%, #fff); }
    .rx-note i { margin-top: 3px; }
    .rx-review { background: #fafbfc; border: 1px solid #eef0f3; border-radius: 12px; padding: 0.9rem 1rem; }

    @media (max-width: 768px) {
      .rx-zoom-modal { zoom: 1; }
      .rx-zoom-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
      .rx-zoom-modal .modal-dialog-scrollable { height: calc(100% - 1.5rem); }
      .rx-head { padding: 1rem !important; }
      .rx-head-ic { width: 40px; height: 40px; }
      .rx-title { font-size: 1.05rem; }
      .rx-body { padding: 1rem !important; }
      .rx-types { grid-template-columns: repeat(2, 1fr); }
      .rx-zoom-modal .input-group .form-control { font-size: 0.92rem !important; letter-spacing: 0 !important; min-width: 0; }
      .rx-zoom-modal .input-group > .btn { padding: 0 0.75rem !important; font-size: 0.82rem !important; }
      .rx-zoom-modal .input-group-text { padding: 0 0.6rem !important; font-size: 0.85rem !important; }
      .rx-type { flex-direction: row; justify-content: flex-start; padding: 0.6rem 0.7rem; gap: 0.55rem; }
      .rx-type-ic { width: 36px; height: 36px; border-radius: 10px; }
      .rx-type-ic img { width: 22px; height: 22px; }
      .rx-type-label { font-size: 0.82rem; }
      .rx-info { padding: 0.6rem 0.65rem; gap: 0.5rem; }
      .rx-info-ic { display: none; }
      .rx-foot { padding: 0.75rem 1rem !important; }
      .rx-foot > * { flex: 1; }
      .rx-small-body { padding: 1.5rem 1.1rem 1rem !important; }
    }
    @media (max-width: 380px) { .rx-grid { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .rx-small-icon { animation: none; } }

    /* Admin extras */
    .rx-types.three { grid-template-columns: repeat(3, 1fr); }
    .rx-pet.found { border-color: rgba(25,135,84,0.3); background: rgba(25,135,84,0.05); }
    .rx-alert.success { background: rgba(25,135,84,0.07); border: 1px solid rgba(25,135,84,0.25); color: #146c43; }
    .rx-alert.page { margin-bottom: 1.25rem; align-items: center; }
    .rx-alert.page span { flex: 1; }
    .rx-alert.page button { border: none; background: transparent; color: inherit; width: 28px; height: 28px; border-radius: 7px; opacity: 0.7; }
    .rx-alert.page button:hover { opacity: 1; background: rgba(0,0,0,0.05); }
    .rx-qr { display: flex; align-items: center; gap: 1.25rem; margin-top: 1.25rem; padding: 1.1rem; border-radius: 14px; border: 1px solid rgba(67,97,238,0.2); background: linear-gradient(135deg, #f5f7ff 0%, #eef1ff 100%); }
    .rx-qr-img { width: 170px; height: 170px; border-radius: 12px; border: 1px solid rgba(67,97,238,0.25); padding: 6px; background: #fff; flex-shrink: 0; }
    .rx-qr-skel { width: 170px; height: 170px; border-radius: 12px; flex-shrink: 0; background: linear-gradient(90deg, #e8ebf7 25%, #dde1f2 50%, #e8ebf7 75%); background-size: 800px 100%; animation: shimmer 1.4s ease-in-out infinite; }
    .rx-qr-text { flex: 1; min-width: 0; }
    .rx-qr-text p { font-size: 0.8rem; color: #6b7280; margin: 0.4rem 0 0.8rem; line-height: 1.5; }
    .rx-qr-none { width: 100%; text-align: center; color: #9ca3af; font-size: 0.85rem; padding: 0.75rem 0; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    @media (max-width: 576px) { .rx-qr { flex-direction: column; text-align: center; } }
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
    // loadData(true) is called after saving / archiving / restoring:
    // refresh quietly so the table doesn't flash and the page doesn't jump to the top
    if (!bustCache) setLoading(true);
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
    if (formData.record_type === 'sterilization' && hasSterilizationRecord(matchingPet)) {
      setError(
        <div>
          <strong>Sterilization already recorded</strong>
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
      {
        const w = parseFloat(formData.weight);
        if (!formData.weight || isNaN(w) || w <= 0 || w > 200) {
          setError('Please enter the pet\'s weight (0.01–200 kg).');
          setFormLoading(false);
          return;
        }
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

    if (hasSterilizationRecord(selectedPet)) {
      setError('This pet already has a sterilization record.');
      setFormLoading(false);
      return;
    }
    
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
            <div role="alert" className="rx-alert danger page">
              <i className="fas fa-exclamation-triangle" /><span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss"><i className="fas fa-times" /></button>
            </div>
          )}

          {success && (
            <div role="status" className="rx-alert success page">
              <i className="fas fa-check-circle" /><span>{success}</span>
              <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss"><i className="fas fa-times" /></button>
            </div>
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
                          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                          backgroundSize: '800px 100%',
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
        <Modal show={showModal} onHide={handleCloseModal} dialogClassName="rx-modal" className="rx-zoom-modal" scrollable>
          {(() => {
            const [hIcon, hColor] = RECORD_TYPE_META[formData.record_type] || ['fa-notes-medical', '#e0a800'];
            return (
              <Modal.Header closeButton className="rx-head" style={{ '--c': hColor }}>
                <div className="rx-head-main">
                  <div className="rx-head-ic"><i className={`fas ${modalMode === 'edit' ? 'fa-pen' : hIcon}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="rx-kicker">{modalMode === 'edit' ? 'Edit record' : 'New record'}</div>
                    <Modal.Title as="h5" className="rx-title">
                      {modalMode === 'edit' ? `Edit ${getRecordTypeLabel(formData.record_type)} record` : (formData.record_type ? `Add ${getRecordTypeLabel(formData.record_type).toLowerCase()} record` : 'Add a record')}
                    </Modal.Title>
                    <div className="rx-head-sub">Fields marked <span className="text-danger">*</span> are required.</div>
                  </div>
                </div>
              </Modal.Header>
            );
          })()}
          <Form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <Modal.Body className="rx-body">
              {error && <div className="rx-alert danger"><i className="fas fa-exclamation-triangle" /><span>{error}</span></div>}

              {/* Record Type Selection — hidden in edit mode */}
              {modalMode !== 'edit' && (
                <div className="rx-section">
                  <div className="rx-section-title"><i className="fas fa-tag" />Record type <span className="text-danger">*</span></div>
                  <div className="rx-types three">
                    {[
                      { v: 'vaccination', img: '/vaccine.png' },
                      { v: 'sterilization', img: '/sterilization.png' },
                      { v: 'microchip', img: '/microchip.png' },
                    ].map(t => {
                      const [ic, color, label] = RECORD_TYPE_META[t.v];
                      const on = formData.record_type === t.v;
                      return (
                        <button key={t.v} type="button" className={`rx-type${on ? ' on' : ''}`} style={{ '--c': color }}
                          onClick={() => handleRecordTypeSelect(t.v)} aria-pressed={on}>
                          {on && <i className="fas fa-check-circle rx-type-check" />}
                          <span className="rx-type-ic">
                            <img src={t.img} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline'; }} />
                            <i className={`fas ${ic}`} style={{ display: 'none' }} />
                          </span>
                          <span className="rx-type-label">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
            <div className="rx-pet found mt-2">
              <div className="rx-pet-av"><i className={`fas ${getSelectedPet().species === 'cat' ? 'fa-cat' : 'fa-dog'}`} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="rx-pet-name">{getSelectedPet().name} <i className="fas fa-check-circle" style={{ color: '#198754', fontSize: '0.8rem' }} /></div>
                <div className="rx-pet-meta">
                  <span className="text-capitalize">{getSelectedPet().species}</span> · {getSelectedPet().breed || 'Mixed'} · Owner: {getSelectedPet().owner_name}
                </div>
              </div>
            </div>
          ) : (
            formData.pet_registration_input.length >= 7 && (
              <div className="rx-alert danger mt-2 mb-0"><i className="fas fa-times-circle" /><span>Pet registration number not found.</span></div>
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
  dialogClassName="rx-small wide"
  className="rx-zoom-modal"
  style={{ zIndex: 1065 }}
  backdropClassName="rx-backdrop-top"
>
  <Modal.Header closeButton className="rx-head" style={{ '--c': '#4361ee' }}>
    <div className="rx-head-main">
      <div className="rx-head-ic"><i className="fas fa-search" /></div>
      <div>
        <Modal.Title as="h5" className="rx-title">Search pet</Modal.Title>
        <div className="rx-head-sub">Find a pet by name, owner, breed or registration no.</div>
      </div>
    </div>
  </Modal.Header>
  <Modal.Body className="rx-body">
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
          Pet Weight (kg) {modalMode === 'create' && <span style={{ color: '#dc3545' }}>*</span>}
        </Form.Label>
        <Form.Control
          type="number"
          name="weight"
          value={formData.weight}
          onChange={handleChange}
          onKeyDown={e => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
          placeholder="0.00"
          step="0.01"
          min="0.01"
          max="200"
          disabled={!formData.pet_id}
          isInvalid={modalMode === 'create' && formData.weight !== '' && (parseFloat(formData.weight) <= 0 || parseFloat(formData.weight) > 200)}
          style={{
            borderRadius: '8px',
            padding: '0.75rem',
            border: `2px solid ${modalMode === 'create' && formData.weight !== '' && (parseFloat(formData.weight) <= 0 || parseFloat(formData.weight) > 200) ? '#dc3545' : '#dee2e6'}`
          }}
        />
        {modalMode === 'create' && formData.pet_id && (
          formData.weight !== '' && (parseFloat(formData.weight) <= 0 || parseFloat(formData.weight) > 200)
            ? <small style={{ color: '#dc3545', fontSize: '0.78rem' }}><i className="fas fa-exclamation-circle me-1" />Enter a weight between 0.01 and 200 kg.</small>
            : !formData.weight && <small style={{ color: '#888', fontSize: '0.78rem' }}>Weight is required for every new record.</small>
        )}
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
            <Modal.Footer className="rx-foot">
              <button type="button" className="rx-btn ghost" onClick={handleCloseModal} disabled={formLoading}>Cancel</button>
              <button
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
                  if (!formData.weight || parseFloat(formData.weight) <= 0 || parseFloat(formData.weight) > 200) return;
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
                  !formData.veterinarian_name.trim() ||
                  (modalMode === 'create' && (!formData.weight || parseFloat(formData.weight) <= 0 || parseFloat(formData.weight) > 200))
                }
                className="rx-btn primary"
              >
                {formLoading
                  ? <><i className="fas fa-circle-notch fa-spin" />Saving…</>
                  : modalMode === 'edit'
                    ? <><i className="fas fa-save" />Save changes</>
                    : <><i className="fas fa-arrow-right" />Review record</>}
              </button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* View Record Modal */}
        <Modal show={showViewModal} onHide={handleCloseViewModal} dialogClassName="rx-modal" className="rx-zoom-modal" scrollable>
          {selectedRecord && (() => {
            const r = selectedRecord;
            const [icon, color, label] = RECORD_TYPE_META[r.recordType] || RECORD_TYPE_META.vaccination;
            const rawDate = r.recordType === 'vaccination' ? r.vaccination_date : r.recordType === 'deworming' ? r.deworming_date : r.recordType === 'sterilization' ? r.sterilization_date : r.implant_date;
            const fmt = (v) => v ? new Date(String(v).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
            const overdue = r.next_due_date && new Date(r.next_due_date) < new Date();
            const none = <span className="rx-none">Not specified</span>;
            const info = [
              r.recordType === 'vaccination' && { icon: 'fa-syringe', label: 'Vaccine', value: r.vaccine_name, wide: true },
              r.recordType === 'deworming' && { icon: 'fa-pills', label: 'Dewormer', value: r.deworming_name },
              r.recordType === 'deworming' && r.dosage && { icon: 'fa-prescription-bottle', label: 'Dosage', value: r.dosage },
              r.recordType === 'sterilization' && { icon: 'fa-cut', label: 'Procedure', value: <span className="text-capitalize">{r.procedure_type}</span> },
              r.recordType === 'sterilization' && r.clinic_name && { icon: 'fa-clinic-medical', label: 'Clinic', value: r.clinic_name },
              r.recordType === 'microchip' && { icon: 'fa-microchip', label: 'Microchip no.', value: <span className="rm-mono" style={{ color: '#4361ee' }}>{r.microchip_number}</span>, wide: true },
              r.recordType === 'microchip' && { icon: 'fa-tag', label: 'Brand', value: r.microchip_brand || none },
              r.recordType === 'microchip' && { icon: 'fa-map-marker-alt', label: 'Implant site', value: r.implant_site || none },
              (r.recordType === 'vaccination' || r.recordType === 'deworming') && r.next_due_date && {
                icon: overdue ? 'fa-exclamation-circle' : 'fa-calendar-check', label: 'Next due date', wide: true,
                value: <span style={{ color: overdue ? '#dc3545' : '#198754' }}>{fmt(r.next_due_date)}{overdue ? ' · overdue' : ''}</span>,
              },
              { icon: 'fa-user-md', label: 'Veterinarian', value: r.veterinarian_name || none },
              { icon: 'fa-weight', label: 'Weight', value: r.weight ? `${r.weight} kg` : none },
              { icon: 'fa-landmark', label: 'Recorded by', value: r.recorded_by || 'City Vet Muntinlupa', wide: true },
            ].filter(Boolean);
            return (
              <>
                <Modal.Header closeButton className="rx-head" style={{ '--c': color }}>
                  <div className="rx-head-main">
                    <div className="rx-head-ic"><i className={`fas ${icon}`} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="rx-kicker">{label} record</div>
                      <Modal.Title as="h5" className="rx-title">{fmt(rawDate)}</Modal.Title>
                    </div>
                  </div>
                </Modal.Header>
                <Modal.Body className="rx-body">
                  <div className="rx-pet">
                    <div className="rx-pet-av"><i className={`fas ${(r.species || r.pet_species) === 'cat' ? 'fa-cat' : 'fa-dog'}`} /></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="rx-pet-name">{r.pet_name}</div>
                      <div className="rx-pet-meta"><span className="rm-mono">{r.registration_number}</span> · <span className="text-capitalize">{r.species || r.pet_species}</span></div>
                    </div>
                  </div>
                  <div className="rx-grid mt-3">
                    {info.map(it => (
                      <div key={it.label} className={`rx-info${it.wide ? ' wide' : ''}`}>
                        <div className="rx-info-ic"><i className={`fas ${it.icon}`} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="rx-info-label">{it.label}</div>
                          <div className="rx-info-value">{it.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(r.recordType === 'vaccination' || r.recordType === 'deworming' || r.recordType === 'microchip') && r.notes && (
                    <div className="rx-notes">
                      <div className="rx-info-label mb-1"><i className="fas fa-sticky-note me-1" />Notes</div>
                      <p>{r.notes}</p>
                    </div>
                  )}

                  {/* Pet identity QR (microchip records) */}
                  {r.recordType === 'microchip' && (
                    <div className="rx-qr">
                      {qrLoading ? (
                        <>
                          <div className="rx-qr-skel" />
                          <div className="rx-qr-text"><div className="rx-info-label">Pet identity QR code</div><p>Generating QR code…</p></div>
                        </>
                      ) : qrDataURL ? (
                        <>
                          <img src={qrDataURL} alt={`QR code for ${r.pet_name}`} className="rx-qr-img" />
                          <div className="rx-qr-text">
                            <div className="rx-info-label">Pet identity QR code</div>
                            <div className="rx-pet-name mt-1">{r.pet_name}</div>
                            <div className="rm-mono" style={{ fontSize: '0.82rem', color: '#4361ee', fontWeight: 600 }}>{r.microchip_number}</div>
                            <p>Scan to view the pet's identity and medical information.</p>
                            <button type="button" className="rx-btn solid" style={{ '--c': '#4361ee' }}
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = qrDataURL;
                                link.download = `QR_${r.pet_name}_${r.microchip_number}.png`;
                                link.click();
                              }}>
                              <i className="fas fa-download" />Download QR
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="rx-qr-none"><i className="fas fa-qrcode" />QR code not available for this record</div>
                      )}
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer className="rx-foot">
                  <button type="button" className="rx-btn ghost" onClick={handleCloseViewModal}>Close</button>
                  {r.recorded_by === 'City Vet Muntinlupa' && (
                    <button type="button" className="rx-btn primary" onClick={() => { handleCloseViewModal(); handleOpenEditModal(r, r.recordType); }}>
                      <i className="fas fa-pen" />Edit record
                    </button>
                  )}
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>
            {/* Restore Confirmation Modal */}
      <Modal show={showRestoreModal} onHide={() => !restoreLoading && setShowRestoreModal(false)} centered dialogClassName="rx-small" className="rx-zoom-modal" scrollable>
        <Modal.Body className="rx-small-body">
          <div className="rx-small-icon" style={{ '--c': '#198754' }}><i className="fas fa-undo" /></div>
          <h5 className="rx-small-title">Restore this record?</h5>
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
                  <div className="text-start" style={{ background: 'rgba(220,53,69,0.06)', border: '1px solid rgba(220,53,69,0.35)', borderRadius: '12px', padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
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
                  <div className="rx-alert danger text-start"><i className="fas fa-exclamation-triangle" /><span>{restoreError}</span></div>
                )}
                <p className="rx-small-text">
                  {isMissed
                    ? 'This record was not followed up before its due date (e.g. typhoon, holiday, or clinic closed). Set a new next due date so the pet can continue its sessions.'
                    : 'This record will become active again and show on the vet card.'}
                </p>
                <div className="rx-item">
                  <div className="rx-item-av" style={{ '--c': color }}><i className={`fas ${icon}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="rx-item-name">{recordToRestore.pet_name}</div>
                    <div className="rx-item-meta">{label} · <span className="rm-mono">{recordToRestore.registration_number}</span></div>
                    {getInactiveLabel(recordToRestore) && (
                      <div className="rx-item-flag"><i className="fas fa-info-circle me-1" />{getInactiveLabel(recordToRestore)}</div>
                    )}
                  </div>
                </div>
                {hasDue && !conflict && (
                  <div className="mt-3 text-start">
                    <Form.Group className="mb-3">
                      <Form.Label>
                        New next due date{' '}
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
                      <Form.Label>
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
        <Modal.Footer className="rx-foot even">
          <button type="button" className="rx-btn ghost" onClick={() => setShowRestoreModal(false)} disabled={restoreLoading}>Cancel</button>
          <button type="button" className="rx-btn solid" style={{ '--c': '#198754' }} onClick={handleRestoreConfirm}
            disabled={restoreLoading || (recordToRestore?.record_status === 'missed' && !restoreDueDate) || !!findRestoreConflict(recordToRestore)}>
            {restoreLoading
              ? <><i className="fas fa-circle-notch fa-spin" />Restoring...</>
              : <><i className="fas fa-undo" />Restore record</>}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Archive Confirmation Modal (records are never deleted) */}
      <Modal show={showDeleteModal} onHide={() => !deleteLoading && setShowDeleteModal(false)} centered dialogClassName="rx-small" className="rx-zoom-modal">
        {recordToDelete && (() => {
          const [icon, color, label] = RECORD_TYPE_META[recordToDelete.recordType] || RECORD_TYPE_META.vaccination;
          return (
            <>
              <Modal.Body className="rx-small-body">
                <div className="rx-small-icon" style={{ '--c': '#b07d05' }}><i className="fas fa-archive" /></div>
                <h5 className="rx-small-title">Archive this record?</h5>
                <p className="rx-small-text">Use this for records added by mistake. Nothing will be deleted.</p>
                <div className="rx-item">
                  <div className="rx-item-av" style={{ '--c': color }}><i className={`fas ${icon}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="rx-item-name">{recordToDelete.pet_name}</div>
                    <div className="rx-item-meta">{label} · <span className="rm-mono">{recordToDelete.registration_number}</span></div>
                  </div>
                </div>
                <div className="rx-note" style={{ '--c': '#0d6efd' }}>
                  <i className="fas fa-info-circle" />
                  <span>The record moves to the <strong>Inactive</strong> filter and no longer shows on the vet card. You can restore it anytime.</span>
                </div>
              </Modal.Body>
              <Modal.Footer className="rx-foot even">
                <button type="button" className="rx-btn ghost" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Cancel</button>
                <button type="button" className="rx-btn solid" style={{ '--c': '#b07d05' }} onClick={handleDeleteConfirm} disabled={deleteLoading}>
                  {deleteLoading ? <><i className="fas fa-circle-notch fa-spin" />Archiving...</> : <><i className="fas fa-archive" />Archive record</>}
                </button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      </Container>

      {/* ── Age Confirmation Modal (small, centered, above the add form) ── */}
      <Modal show={showAgeConfirmModal} onHide={() => setShowAgeConfirmModal(false)} centered dialogClassName="rx-small" className="rx-zoom-modal" style={{ zIndex: 1065 }} backdropClassName="rx-backdrop-top">
        <Modal.Body className="rx-small-body">
          <div className="rx-small-icon" style={{ '--c': '#e0a800' }}><i className="fas fa-paw" /></div>
          <h5 className="rx-small-title">
            {!getSelectedPet()?.birth_date ? 'No birth date on record' : 'Pet may be under 3 months'}
          </h5>
          <p className="rx-small-text">
            The minimum age for {getRecordTypeLabel(formData.record_type).toLowerCase()} is <strong>3 months</strong>.
            Are you sure {getSelectedPet()?.name || 'this pet'} is at least 3 months old and <strong style={{ color: '#198754' }}>healthy</strong>?
          </p>
          <div className="rx-note" style={{ '--c': '#dc3545' }}>
            <i className="fas fa-exclamation-triangle" />
            <span>Proceeding with an unqualified pet may result in complications. Confirm the pet meets the age and health requirements first.</span>
          </div>
        </Modal.Body>
        <Modal.Footer className="rx-foot even">
          <button type="button" className="rx-btn ghost" onClick={() => setShowAgeConfirmModal(false)}>
            <i className="fas fa-arrow-left" />Back
          </button>
          <button type="button" className="rx-btn primary" onClick={() => { setShowAgeConfirmModal(false); setShowConfirmRecordModal(true); }}>
            <i className="fas fa-check" />Yes, proceed
          </button>
        </Modal.Footer>
      </Modal>

      {/* ── Review & Confirm Record Modal (small, centered, above the add form) ── */}
      <Modal show={showConfirmRecordModal} onHide={() => !formLoading && setShowConfirmRecordModal(false)} centered dialogClassName="rx-small wide" className="rx-zoom-modal" style={{ zIndex: 1065 }} backdropClassName="rx-backdrop-top" scrollable>
        {(() => {
          const [tIcon, tColor] = RECORD_TYPE_META[formData.record_type] || RECORD_TYPE_META.vaccination;
          const n = getSessionNumber();
          const pet = getSelectedPet();
          const rows = [
            { icon: 'fa-paw', label: 'Pet', value: pet ? `${pet.name} (${pet.registration_number})` : '—' },
            ...(formData.record_type === 'vaccination' ? [
              { icon: 'fa-syringe', label: 'Vaccine', value: (() => { const f = inventoryItems.find(i => String(i.id) === String(formData.vaccination_type_id)); return f ? f.item_name : '—'; })() },
              { icon: 'fa-calendar', label: 'Vaccination date', value: formData.vaccination_date || '—' },
              { icon: 'fa-calendar-check', label: 'Next due date', value: formData.vaccination_next_due_date || 'Not set' },
            ] : []),
            ...(formData.record_type === 'deworming' ? [
              { icon: 'fa-pills', label: 'Deworming type', value: (() => { const f = dewormingTypes.find(d => String(d.id) === String(formData.deworming_type_id)); return f ? f.name : '—'; })() },
              { icon: 'fa-calendar', label: 'Deworming date', value: formData.deworming_date || '—' },
              { icon: 'fa-calendar-check', label: 'Next due date', value: formData.deworming_next_due_date || 'Not set' },
              { icon: 'fa-prescription-bottle', label: 'Dosage', value: formData.dosage || 'Not specified' },
            ] : []),
            ...(formData.record_type === 'sterilization' ? [
              { icon: 'fa-cut', label: 'Procedure', value: pet ? (pet.gender === 'female' ? 'Spay (Female)' : 'Neuter (Male)') : '—' },
              { icon: 'fa-calendar', label: 'Sterilization date', value: formData.sterilization_date || '—' },
            ] : []),
            ...(formData.record_type === 'microchip' ? [
              { icon: 'fa-tag', label: 'Type', value: formData.microchip_subtype === 'qr' ? 'QR Code (auto-generated)' : 'Physical microchip' },
              ...(formData.microchip_subtype === 'microchip' ? [{ icon: 'fa-microchip', label: 'Microchip no.', value: formData.microchip_number || '—', mono: true }] : []),
              { icon: 'fa-calendar', label: 'Implant date', value: formData.implant_date || '—' },
              ...(formData.microchip_subtype === 'microchip' ? [
                { icon: 'fa-map-marker-alt', label: 'Implant site', value: formData.implant_site || 'Not specified' },
                { icon: 'fa-tag', label: 'Brand', value: formData.microchip_brand || 'Not specified' },
              ] : []),
            ] : []),
            { icon: 'fa-user-md', label: 'Veterinarian', value: formData.veterinarian_name || 'Not specified' },
            { icon: 'fa-weight', label: 'Weight', value: formData.weight ? `${formData.weight} kg` : 'Not specified' },
            ...(formData.notes ? [{ icon: 'fa-sticky-note', label: 'Notes', value: formData.notes }] : []),
          ];
          return (
            <>
              <Modal.Body className="rx-small-body">
                <div className="rx-small-icon" style={{ '--c': '#e0a800' }}><i className="fas fa-clipboard-check" /></div>
                <h5 className="rx-small-title">{modalMode === 'edit' ? 'Review your changes' : 'Review the record'}</h5>
                <p className="rx-small-text">{modalMode === 'edit' ? 'Please check the changes before saving.' : 'Please check the details before adding this record.'}</p>

                <div className="rx-item text-start mb-3" style={{ borderColor: `color-mix(in srgb, ${tColor} 35%, #fff)`, background: `color-mix(in srgb, ${tColor} 7%, #fff)` }}>
                  <div className="rx-item-av" style={{ '--c': tColor }}><i className={`fas ${tIcon}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="rx-info-label">Record type</div>
                    <div className="rx-item-name">{getRecordTypeLabel(formData.record_type)}</div>
                  </div>
                </div>

                {modalMode !== 'edit' && formData.record_type === 'sterilization' && ownerMarkedSterilized(pet) && (
                  <div className="rx-note mb-3" style={{ '--c': '#dc3545', marginTop: 0 }}>
                    <i className="fas fa-exclamation-triangle" />
                    <span>
                      <strong>Registered as already {pet.gender === 'female' ? 'spayed' : 'neutered'}.</strong>{' '}
                      The owner marked {pet.name} as already {pet.gender === 'female' ? 'spayed' : 'neutered'} when registering.
                      Are you sure the pet is not already {pet.gender === 'female' ? 'spayed' : 'neutered'}? Saving will still add this sterilization record.
                    </span>
                  </div>
                )}
                {n >= 2 && (
                  <div className="rx-note mb-3" style={{ '--c': '#b07d05', marginTop: 0 }}>
                    <i className="fas fa-exclamation-triangle" />
                    <span>
                      <strong>This will be the {ordinal(n)} session.</strong>{' '}
                      {pet?.name || 'This pet'} already has {n - 1} record{n - 1 > 1 ? 's' : ''} of this {formData.record_type === 'deworming' ? 'dewormer' : 'vaccine'}.
                    </span>
                  </div>
                )}

                <div className="rx-grid text-start">
                  {rows.map(it => (
                    <div key={it.label} className={`rx-info${['Pet', 'Vaccine', 'Notes', 'Microchip no.'].includes(it.label) ? ' wide' : ''}`}>
                      <div className="rx-info-ic"><i className={`fas ${it.icon}`} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div className="rx-info-label">{it.label}</div>
                        <div className={`rx-info-value${it.mono ? ' rm-mono' : ''}`}>{it.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Modal.Body>
              <Modal.Footer className="rx-foot even">
                <button type="button" className="rx-btn ghost" onClick={() => setShowConfirmRecordModal(false)} disabled={formLoading}>
                  <i className="fas fa-arrow-left" />Back to edit
                </button>
                <button type="button" className="rx-btn primary" disabled={formLoading}
                  onClick={() => { setShowConfirmRecordModal(false); handleSubmit({ preventDefault: () => {} }); }}>
                  {formLoading
                    ? <><i className="fas fa-circle-notch fa-spin" />Saving…</>
                    : <><i className="fas fa-save" />{modalMode !== 'edit' && formData.record_type === 'sterilization' && ownerMarkedSterilized(pet) ? 'Yes, record anyway' : n > 1 ? `Save as ${ordinal(n)} session` : 'Save record'}</>}
                </button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>
      
      </>
    );
  };

  export default RecordManagement;