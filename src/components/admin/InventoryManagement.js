import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Spinner, Badge, InputGroup } from 'react-bootstrap';
import { inventoryAPI, handleAPIError } from '../../services/api';

const TYPE_CONFIG = {
  vaccination: { label: 'Vaccination', color: '#ffc107', bg: 'rgba(255,193,7,0.1)',   icon: 'fa-syringe',   unit: 'doses' },
  medicine:    { label: 'Medicine',    color: '#e83e8c', bg: 'rgba(232,62,140,0.1)',  icon: 'fa-pills',     unit: 'pcs'   },
  microchip:   { label: 'Microchip',   color: '#6c757d', bg: 'rgba(108,117,125,0.1)', icon: 'fa-microchip', unit: 'pcs'   },
  equipment:   { label: 'Equipment',   color: '#0d6efd', bg: 'rgba(13,110,253,0.1)',  icon: 'fa-toolbox',   unit: 'pcs'   },
};

const SPECIES_COLORS = {
  dog:  { bg: '#fff3cd', color: '#856404' },
  cat:  { bg: '#d1ecf1', color: '#0c5460' },
  both: { bg: '#e2d9f3', color: '#6f42c1' },
  all:  { bg: '#fde8e8', color: '#842029' },
};

export default function InventoryManagement() {
  const [inventory, setInventory]       = useState([]);
const [vaccinationTypes, setVaccinationTypes] = useState([]);
const [loading, setLoading]           = useState(true);
const [error, setError]               = useState('');

const [filterType, setFilterType]     = useState('all');
const [searchTerm, setSearchTerm]     = useState('');

// Restock modal
const [showRestockModal, setShowRestockModal] = useState(false);
const [restockItem, setRestockItem]           = useState(null);
const [restockQty, setRestockQty]             = useState('');
const [restockBatchNo, setRestockBatchNo]     = useState('');
const [restockExpDate, setRestockExpDate]     = useState('');
const [restockNotes, setRestockNotes]         = useState('');
const [restockLoading, setRestockLoading]     = useState(false);
const [batchNoError, setBatchNoError]         = useState('');

// Batches modal (view/edit)
const [showBatchModal, setShowBatchModal]   = useState(false);
const [batchItem, setBatchItem]             = useState(null);
const [batches, setBatches]                 = useState([]);
const [batchesLoading, setBatchesLoading]   = useState(false);
const [editingBatch, setEditingBatch]       = useState(null); // { id, batch_no, quantity, expiration_date, notes }
const [editBatchSaving, setEditBatchSaving] = useState(false);
const [deletingBatchId, setDeletingBatchId] = useState(null);

// Add item modal
const [showAddModal, setShowAddModal]   = useState(false);
const [addForm, setAddForm] = useState({ item_type: 'vaccination', item_name: '', species: 'dog', minimum_stock: '10', unit: 'doses', notes: '' });
const [addLoading, setAddLoading]       = useState(false);

// Edit item modal
const [showEditItemModal, setShowEditItemModal] = useState(false);
const [editItemForm, setEditItemForm] = useState(null);
const [editItemLoading, setEditItemLoading] = useState(false);

// Edit threshold modal
const [showEditModal, setShowEditModal] = useState(false);
const [editItem, setEditItem]           = useState(null);
const [editMinStock, setEditMinStock]   = useState('');
const [editLoading, setEditLoading]     = useState(false);

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

const [displayCounts, setDisplayCounts] = useState({ totalItems: 0, totalStock: 0, lowStock: 0, outOfStock: 0 });
const [hasAnimated, setHasAnimated] = useState(false);

// View details modal
const [showViewModal, setShowViewModal] = useState(false);
const [viewItem, setViewItem]           = useState(null);

// Ellipsis dropdown
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [itemToDelete, setItemToDelete]       = useState(null);
const [deleteLoading, setDeleteLoading]     = useState(false);
const [showDropdown, setShowDropdown]       = useState(null);
const [dropdownPos, setDropdownPos]         = useState({ top: 0, left: 0 });
const dropdownButtonRef = useRef(null);
const ZOOM = 0.75;

useEffect(() => {
  if (showDropdown === null) return;
  const closeOnScroll = () => setShowDropdown(null);
  window.addEventListener('scroll', closeOnScroll, true);
  return () => window.removeEventListener('scroll', closeOnScroll, true);
}, [showDropdown]);
  const [expiredBatchMap, setExpiredBatchMap] = useState({}); // { inventoryId: expiredCount }

  const styles = `
  @keyframes dropDown { 0%{opacity:0;transform:translateY(-20px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
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
  .inv-page {
    zoom: 0.75;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  @media (min-width: 1600px) { .inv-page { zoom: 0.9; } }
  @media (min-width: 1920px) { .inv-page { zoom: 1; } }
  .inv-row:hover { background: rgba(255,193,7,0.04) !important; }
  tr[key^="empty-"]:hover td { background: transparent !important; }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(60px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes fadeOutRight {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(60px); }
  }
  .inv-toast {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 99999;
    min-width: 300px;
    max-width: 420px;
    background: linear-gradient(135deg, rgba(25,135,84,0.97), rgba(20,110,68,0.97));
    color: #fff;
    border-radius: 14px;
    border: 2px solid #198754;
    box-shadow: 0 8px 32px rgba(25,135,84,0.35);
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 600;
    animation: slideInRight 0.3s ease;
    pointer-events: auto;
  }
  .inv-toast.hiding {
    animation: fadeOutRight 0.3s ease forwards;
  }
  @media (max-width: 768px) {
    .inv-title { font-size: 1.5rem !important; }
    .inv-stat-row { flex-wrap: nowrap !important; }
    .inv-card-header { padding: 0.75rem 1rem !important; }
    .inv-card-header h5 { font-size: 0.85rem !important; }
    .inv-card-body { padding: 1rem !important; }
    .inv-table th, .inv-table td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
    .inv-table .mobile-hide { display: none !important; }
.inv-table .mobile-hide-status { display: none !important; }
.inv-table .mobile-hide-restock { display: none !important; }
.inv-table .mobile-hide-type { display: none !important; }
    .inv-stat-col { flex: 1 1 0 !important; min-width: 0 !important; }
    .inv-stat-label { font-size: 0.55rem !important; margin-bottom: 0.15rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
    .inv-stat-number { font-size: 1.1rem !important; margin-bottom: 0.25rem !important; }
    .inv-stat-icon { width: 32px !important; height: 32px !important; border-radius: 8px !important; flex-shrink: 0 !important; }
    .inv-stat-icon i { font-size: 1rem !important; }
    .inv-stat-card-body { padding: 0.6rem 0.5rem !important; }
    .inv-filters-row > div { margin-bottom: 0.5rem; }
    .inv-card-header { padding: 0.75rem 1rem !important; }
    .inv-card-header h5 { font-size: 0.85rem !important; }
    .inv-card-body { padding: 1rem !important; }
    .inv-table th, .inv-table td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
    .inv-table .mobile-hide { display: none !important; }
    .inv-pagination { font-size: 0.75rem !important; }
  }

    /* ---------------- Inventory Management ---------------- */
    @keyframes ivIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ivRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ivMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes ivToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes ivGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .iv-anim { animation: ivIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .iv-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .iv-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .iv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.86rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .iv-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .iv-btn.primary { background: #ffc107; color: #1f2328; }
    .iv-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }

    .iv-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: ivToast 0.35s ease-out; }
    .iv-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .iv-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .iv-toast .d { color: #6b7280; font-size: 0.84rem; }
    .iv-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .iv-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .iv-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); overflow: hidden; }
    .iv-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; border-bottom: 1px solid #eef0f3; }
    .iv-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
    .iv-panel-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .iv-panel-sub { font-size: 0.76rem; color: #6b7280; }

    .iv-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem 0.75rem; }
    .iv-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: #1f2328; }
    .iv-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .iv-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f3f4f6; }
    .iv-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #5b6270; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .iv-seg button:hover { color: #1f2328; }
    .iv-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .iv-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0 1.25rem 1rem; border-bottom: 1px solid #eef0f3; }
    .iv-search, .iv-select { position: relative; }
    .iv-search { flex: 1 1 260px; }
    .iv-search > i, .iv-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.78rem; pointer-events: none; }
    .iv-input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .iv-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.iv-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
    .iv-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: #9ca3af; }
    .iv-clear:hover { background: #f3f4f6; color: #1f2328; }
    .iv-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
    .iv-link:hover { text-decoration: underline; }

    .iv-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .iv-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .iv-table td { padding: 0.8rem 0.65rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .iv-table tbody tr { animation: ivRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .iv-table tbody tr:hover { background: #fafbfc; }
    .iv-table tbody tr:last-child td { border-bottom: none; }
    .iv-table tbody tr.raised { position: relative; z-index: 5; }
    .iv-strong { font-weight: 600; color: #1f2328; }
    .iv-muted { font-size: 0.78rem; color: #6b7280; }
    .iv-ellipsis { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .iv-date { width: 48px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.35rem 0; line-height: 1.1; }
    .iv-date .m { display: block; font-size: 0.62rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .iv-date .d { display: block; font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .iv-type-ic { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .iv-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 130px; }
    .iv-bar > div { height: 100%; border-radius: 3px; transfoiv-origin: left; animation: ivGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
    .iv-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .iv-pill i { font-size: 0.4rem; }

    .iv-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .iv-icon-btn:hover, .iv-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .iv-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1050; animation: ivMenu 0.16s ease-out; transfoiv-origin: top right; text-align: left; }
    .iv-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
    .iv-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .iv-menu-item:hover { background: #f6f7f9; }
    .iv-menu-item.danger, .iv-menu-item.danger i { color: #dc3545; }
    .iv-menu-item.danger:hover { background: #fff5f5; }
    .iv-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }

    .iv-empty { text-align: center; padding: 3rem 1rem; }
    .iv-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .iv-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .iv-empty p { color: #6b7280; font-size: 0.88rem; margin-bottom: 1rem; }
    .iv-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }

    .iv-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid #eef0f3; }
    .iv-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .iv-page:hover:not(:disabled) { background: #f3f4f6; }
    .iv-page.on { background: #ffc107; color: #1f2328; }
    .iv-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .iv-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .iv-btn:focus-visible, .iv-seg button:focus-visible, .iv-icon-btn:focus-visible, .iv-menu-item:focus-visible, .iv-page:focus-visible, .iv-link:focus-visible, .iv-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .iv-title { font-size: 1.45rem; }
      .iv-sub { font-size: 0.85rem; }
      .iv-filters select.iv-input { min-width: 0; width: 100%; }
      .iv-select { flex: 1 1 140px; }
      .iv-ellipsis { max-width: 160px; }
      .iv-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .iv-anim, .iv-table tbody tr, .iv-menu, .iv-toast, .iv-bar > div, .iv-skel { animation: none !important; }
    }
    .iv-table { table-layout: fixed; }
    .iv-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.01em; }
    .iv-toolbar { border-bottom: 1px solid #eef0f3; padding-bottom: 1rem; }
    .iv-filters { border-bottom: 1px solid #eef0f3; padding-top: 1rem; }
    .iv-tabs { display: inline-flex; gap: 0.25rem; padding: 4px; border-radius: 12px; background: #f3f4f6; max-width: 100%; overflow-x: auto; }
    .iv-tab { display: inline-flex; align-items: center; gap: 0.45rem; border: none; background: transparent; padding: 0.45rem 0.85rem; border-radius: 9px; font-size: 0.85rem; font-weight: 600; color: #5b6270; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .iv-tab i { font-size: 0.78rem; }
    .iv-tab .count { font-size: 0.72rem; padding: 0.02rem 0.45rem; border-radius: 999px; background: rgba(0,0,0,0.06); color: #6b7280; }
    .iv-tab:hover { color: #1f2328; }
    .iv-tab.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .iv-tab.on .count { background: #1f2328; color: #fff; }
    .iv-tab:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }
    .iv-seg button.inactive.on { color: #dc3545; }
    .iv-chip { display: inline-flex; align-items: center; gap: 0.35rem; max-width: 100%; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .iv-chip i { font-size: 0.68rem; }
    .iv-chip.city { background: rgba(255,193,7,0.14); color: #8a6700; }
    .iv-chip.clinic { background: rgba(25,135,84,0.1); color: #198754; }
    .iv-chip.missed { background: rgba(220,53,69,0.1); color: #dc3545; }
    .iv-chip.archived { background: #f3f4f6; color: #6b7280; }
    .iv-menu-item.success, .iv-menu-item.success i { color: #198754; }
    .iv-menu-item.success:hover { background: #f0fdf4; }
    @media (max-width: 768px) {
      .iv-table { table-layout: auto; }
      .iv-table th { width: auto !important; }
      .iv-toolbar .iv-btn span { display: none; }
    }
  .iv-legend { display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; font-size: 0.76rem; color: #6b7280; margin-left: auto; }
  .iv-legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .iv-legend i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .iv-row td:first-child { box-shadow: inset 3px 0 0 transparent; }
  .iv-row.low td:first-child { box-shadow: inset 3px 0 0 #ffc107; }
  .iv-row.out td:first-child { box-shadow: inset 3px 0 0 #dc3545; }
  .iv-species { display: inline-flex; align-items: center; font-size: 0.66rem; font-weight: 700; padding: 0.05rem 0.45rem; border-radius: 999px; text-transform: capitalize; }
  .iv-stock { font-size: 0.84rem; color: #9ca3af; white-space: nowrap; }
  .iv-stock strong { font-size: 1rem; color: #1f2328; }
  .iv-stock strong.low { color: #b88a00; }
  .iv-stock strong.out { color: #dc3545; }
  .iv-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 120px; }
  .iv-bar > div { height: 100%; border-radius: 3px; background: #198754; transform-origin: left; animation: ivGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
  .iv-bar > div.low { background: #ffc107; }
  .iv-bar > div.out { background: #dc3545; }
  @keyframes ivGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .iv-pill i { font-size: 0.68rem; }
  .iv-dot { position: absolute; top: -3px; right: -3px; background: #dc3545; color: #fff; border-radius: 999px; font-size: 0.55rem; font-weight: 700; min-width: 16px; padding: 0.05rem 0.3rem; text-align: center; line-height: 1.5; border: 2px solid #fff; pointer-events: none; }
  .iv-count-badge { background: #dc3545; color: #fff; border-radius: 999px; font-size: 0.62rem; font-weight: 700; padding: 0.05rem 0.42rem; }
  .iv-menu { min-width: 210px; }
  .iv-menu-item.info, .iv-menu-item.info i { color: #0d6efd; }
  .iv-menu-item.info:hover { background: #f0f4ff; }
  @media (max-width: 768px) {
    .iv-legend { display: none; }
  }
`;

  // Stats — must be declared before animation useEffect
  const totalItems    = inventory.length;
  const lowStockItems = inventory.filter(i => parseInt(i.current_stock) > 0 && parseInt(i.current_stock) < 10).length;
  const outOfStock    = inventory.filter(i => parseInt(i.current_stock) === 0).length;
  const totalStock    = inventory.reduce((sum, i) => sum + parseInt(i.current_stock || 0), 0);

  useEffect(() => { loadInventory(); loadVaccinationTypes(); }, []);

  useEffect(() => {
    if (inventory.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    Promise.all(
      inventory.map(item =>
        inventoryAPI.getBatches(item.id)
          .then(r => ({ id: item.id, batches: r.data.batches || [] }))
          .catch(() => ({ id: item.id, batches: [] }))
      )
    ).then(results => {
      const map = {};
      results.forEach(({ id, batches }) => {
        map[id] = batches.filter(b => b.expiration_date && new Date(b.expiration_date) < today && parseInt(b.quantity) > 0).length;
      });
      setExpiredBatchMap(map);
    });
  }, [inventory]);

  useEffect(() => {
    if (loading || hasAnimated) return;
    const targets = {
      totalItems:  totalItems,
      totalStock:  totalStock,
      lowStock:    lowStockItems,
      outOfStock:  outOfStock,
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
        totalItems:  step >= steps ? targets.totalItems  : Math.round(t * targets.totalItems),
        totalStock:  step >= steps ? targets.totalStock  : Math.round(t * targets.totalStock),
        lowStock:    step >= steps ? targets.lowStock    : Math.round(t * targets.lowStock),
        outOfStock:  step >= steps ? targets.outOfStock  : Math.round(t * targets.outOfStock),
      });
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [loading, totalItems, totalStock, lowStockItems, outOfStock]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await inventoryAPI.getAll();
      setInventory(res.data.inventory || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  const loadVaccinationTypes = async () => {
  try {
    const { vaccinationAPI } = await import('../../services/api');
    const res = await vaccinationAPI.getTypes();
    setVaccinationTypes(res.data.vaccination_types || []);
  } catch (err) {
    console.error('Failed to load vaccination types:', err);
  }
};

  const [toast, setToast] = useState({ visible: false, hiding: false, msg: '' });
  const toastTimer = useRef(null);

  const showSuccess = (msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, hiding: false, msg });
    toastTimer.current = setTimeout(() => {
      setToast(t => ({ ...t, hiding: true }));
      setTimeout(() => setToast({ visible: false, hiding: false, msg: '' }), 300);
    }, 3500);
  };

  // ── Stats (already declared above) ───────────────────────────────────────

  // ── Filter ────────────────────────────────────────────────────────────────
const TYPE_ORDER = { microchip: 0, vaccination: 1, medicine: 2, equipment: 3 };

// Max quantity allowed in ONE batch (one delivery / lot). Adjust if your office receives bigger deliveries.
const MAX_BATCH_QTY = { vaccination: 1000, medicine: 1000, microchip: 500, equipment: 200 };
const getMaxBatchQty = (type) => MAX_BATCH_QTY[type] || 1000;

  const filtered = inventory
    .filter(item => {
      const matchType   = filterType === 'all' || item.item_type === filterType;
      const matchSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    })
    .sort((a, b) => {
      const orderDiff = (TYPE_ORDER[a.item_type] ?? 9) - (TYPE_ORDER[b.item_type] ?? 9);
      if (orderDiff !== 0) return orderDiff;
      return a.item_name.localeCompare(b.item_name);
    });

  // ── Stock status helper ──────────────────────────────────────────────────
  const getStockStatus = (item) => {
    const stock = parseInt(item.current_stock);
    if (stock === 0)   return { label: 'Out of Stock', color: '#dc3545', bg: 'rgba(220,53,69,0.1)',  icon: 'fa-times-circle' };
    if (stock < 10)    return { label: 'Low Stock',    color: '#ffc107', bg: 'rgba(255,193,7,0.12)', icon: 'fa-exclamation-triangle' };
    return                    { label: 'In Stock',     color: '#28a745', bg: 'rgba(40,167,69,0.1)',  icon: 'fa-check-circle' };
  };

  // ── Restock ───────────────────────────────────────────────────────────────
  const handleOpenRestock = (item) => {
  setRestockItem(item);
  setRestockQty('');
  setRestockBatchNo('');
  setRestockExpDate('');
  setRestockNotes('');
  setBatchNoError('');
  setShowRestockModal(true);
};

  const handleRestock = async () => {
  if (!restockQty || parseInt(restockQty) <= 0) {
    setError('Please enter a valid quantity greater than 0.');
    return;
  }
  const maxQty = getMaxBatchQty(restockItem?.item_type);
  if (parseInt(restockQty) > maxQty) {
    setError(`A single batch can only have up to ${maxQty.toLocaleString()} ${restockItem?.unit || ''}. Split larger deliveries into separate batches.`);
    return;
  }
  if (!restockBatchNo.trim()) {
    setBatchNoError('Batch number is required.');
    return;
  }
  setBatchNoError('');
  setRestockLoading(true);
  setShowRestockModal(false);
  try {
    await inventoryAPI.restock(restockItem.id, {
      quantity:        parseInt(restockQty),
      batch_no:        restockBatchNo.trim(),
      expiration_date: restockExpDate || null,
      notes:           restockNotes,
    });
    showSuccess(`Batch "${restockBatchNo}" added to ${restockItem.item_name}.`);
    loadInventory();
  } catch (err) {
    const { message } = handleAPIError(err);
    setShowRestockModal(true);
    if (message?.toLowerCase().includes('batch number')) {
      setBatchNoError(message);
    } else {
      setError(message);
    }
  } finally {
    setRestockLoading(false);
  }
};

  // ── Edit threshold ────────────────────────────────────────────────────────
  const handleOpenEditItem = (item) => {
    setEditItemForm({
      id: item.id,
      item_type: item.item_type,
      item_name: item.item_name,
      species: item.species || 'dog',
      minimum_stock: item.minimum_stock,
      unit: item.unit,
      notes: item.notes || '',
    });
    setShowEditItemModal(true);
  };

  const handleEditItemSave = async () => {
    if (!editItemForm.item_name.trim()) { setError('Item name is required.'); return; }
    setEditItemLoading(true);
    setShowEditItemModal(false);
    try {
      await inventoryAPI.update(editItemForm.id, {
        item_name: editItemForm.item_name.trim(),
        species: editItemForm.species,
        minimum_stock: parseInt(editItemForm.minimum_stock),
        unit: editItemForm.unit,
        notes: editItemForm.notes,
      });
      showSuccess(`"${editItemForm.item_name}" updated successfully.`);
      loadInventory();
    } catch (err) {
      setShowEditItemModal(true);
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setEditItemLoading(false);
    }
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setEditMinStock(item.minimum_stock);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editMinStock || parseInt(editMinStock) < 0) {
      setError('Please enter a valid minimum stock value.');
      return;
    }
    setEditLoading(true);
    setShowEditModal(false);
    try {
      await inventoryAPI.update(editItem.id, { minimum_stock: parseInt(editMinStock) });
      showSuccess(`Minimum stock threshold updated for ${editItem.item_name}.`);
      loadInventory();
    } catch (err) {
      setShowEditModal(true);
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setEditLoading(false);
    }
  };
  // ── Batch modal ───────────────────────────────────────────────────────────
const handleOpenBatches = async (item) => {
  setBatchItem(item);
  setEditingBatch(null);
  setShowBatchModal(true);
  setBatchesLoading(true);
  try {
    const res = await inventoryAPI.getBatches(item.id);
    setBatches(res.data.batches || []);
  } catch (err) {
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setBatchesLoading(false);
  }
};

const handleSaveBatch = async () => {
  if (!editingBatch) return;
  if (!editingBatch.batch_no?.trim()) { setError('Batch number cannot be empty.'); return; }
  if (parseInt(editingBatch.quantity) < 0) { setError('Quantity cannot be negative.'); return; }
  if (parseInt(editingBatch.quantity) > getMaxBatchQty(batchItem?.item_type)) {
    setError(`A single batch can only have up to ${getMaxBatchQty(batchItem?.item_type).toLocaleString()} ${batchItem?.unit || ''}.`);
    return;
  }
  setEditBatchSaving(true);
  try {
    await inventoryAPI.updateBatch(editingBatch.id, {
      batch_no:        editingBatch.batch_no.trim(),
      quantity:        parseInt(editingBatch.quantity),
      expiration_date: editingBatch.expiration_date || null,
      notes:           editingBatch.notes || null,
    });
    showSuccess('Batch updated.');
    setEditingBatch(null);
    const res = await inventoryAPI.getBatches(batchItem.id);
    setBatches(res.data.batches || []);
    loadInventory();
  } catch (err) {
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setEditBatchSaving(false);
  }
};

const [showDeleteBatchModal, setShowDeleteBatchModal] = useState(false);
const [batchToDelete, setBatchToDelete] = useState(null);
const [deleteBatchLoading, setDeleteBatchLoading] = useState(false);

const handleDeleteBatch = (batchId) => {
  const batch = batches.find(b => b.id === batchId);
  setBatchToDelete(batch);
  setShowDeleteBatchModal(true);
};

const handleDeleteBatchConfirm = async () => {
  if (!batchToDelete) return;
  setDeleteBatchLoading(true);
  setShowDeleteBatchModal(false);
  try {
    await inventoryAPI.deleteBatch(batchToDelete.id);
    showSuccess('Batch deleted.');
    const res = await inventoryAPI.getBatches(batchItem.id);
    setBatches(res.data.batches || []);
    setBatchToDelete(null);
    loadInventory();
  } catch (err) {
    setShowDeleteBatchModal(true);
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setDeleteBatchLoading(false);
    setDeletingBatchId(null);
  }
};

const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
    setShowDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    setShowDeleteModal(false);
    try {
      await inventoryAPI.delete(itemToDelete.id);
      showSuccess(`"${itemToDelete.item_name}" removed from inventory.`);
      setItemToDelete(null);
      loadInventory();
    } catch (err) {
      setShowDeleteModal(true);
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };
  // ── Manual set stock ──────────────────────────────────────────────────────
  const handleSetStock = async (item, newStock) => {
    try {
      await inventoryAPI.update(item.id, { current_stock: parseInt(newStock) });
      showSuccess(`Stock updated for ${item.item_name}.`);
      loadInventory();
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    }
  };

  const invTotalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const invStart = (currentPage - 1) * itemsPerPage;
  const invPageItems = filtered.slice(invStart, invStart + itemsPerPage);
  const invPagerNumbers = (() => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(invTotalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();
  const typeCounts = inventory.reduce((acc, i) => { acc[i.item_type] = (acc[i.item_type] || 0) + 1; return acc; }, {});
  const invTabs = [
    { key: 'all', label: 'All', count: inventory.length },
    ...Object.keys(TYPE_CONFIG).map(k => ({ key: k, label: TYPE_CONFIG[k].label, count: typeCounts[k] || 0, icon: TYPE_CONFIG[k].icon, color: TYPE_CONFIG[k].color })),
  ];
  return (
    <>
      {toast.visible && (
        <div className="iv-toast" role="status">
          <div className="ic"><i className="fas fa-check" /></div>
          <div className="flex-grow-1">
            <div className="t">Success</div>
            <div className="d">{toast.msg}</div>
          </div>
          <button type="button" className="iv-toast-close" onClick={() => setToast({ visible: false, hiding: false, msg: '' })} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
      )}
      <style>{styles}</style>
      <Container fluid className="py-4 inv-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* Header */}
        <div className="mb-4 iv-anim">
          <h2 className="iv-title inv-title">Inventory Management</h2>
          <p className="iv-sub">Track vaccination, sterilization and microchip supplies and their batches.</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2" />{error}
          </Alert>
        )}
        {/* Stat Cards */}
        <Row className="mb-4 inv-stat-row" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px', animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          {[
            { label: 'Total Items',    value: displayCounts.totalItems,  color: '#0d6efd', bg: 'rgba(13,110,253,0.1)',  icon: 'fa-boxes' },
            { label: 'Total Stock',    value: displayCounts.totalStock,  color: '#28a745', bg: 'rgba(40,167,69,0.1)',   icon: 'fa-cubes' },
            { label: 'Low Stock',      value: displayCounts.lowStock,    color: '#ffc107', bg: 'rgba(255,193,7,0.1)',   icon: 'fa-exclamation-triangle' },
            { label: 'Out of Stock',   value: displayCounts.outOfStock,  color: '#dc3545', bg: 'rgba(220,53,69,0.1)',   icon: 'fa-times-circle' },
          ].map(s => (
            <div key={s.label} className="inv-stat-col" style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0 }}>
              <Card className="border-0 h-100" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${s.bg}`; e.currentTarget.style.borderColor = s.color; }}
  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
>
                <div style={{ height: '3px', background: s.color }} />
                <Card.Body className="inv-stat-card-body" style={{ padding: '1.5rem' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="inv-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '0.5rem' }}>{s.label}</p>
                      <h2 className="inv-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111', lineHeight: 1, marginBottom: 0, fontVariantNumeric: 'tabular-nums', minWidth: '3ch' }}>
                        {loading ? (
                          <span style={{
                            display: 'inline-block', width: '3ch', height: '1em',
                            borderRadius: '6px',
                            background: '#f0f0f0',
                            animation: 'shimmer 1.4s ease-in-out infinite',
                            verticalAlign: 'middle'
                          }} />
                        ) : s.value}
                      </h2>
                    </div>
                    <div className="inv-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fas ${s.icon}`} style={{ fontSize: '1.4rem', color: s.color }} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </Row>

        {/* Stock table */}
        <div className="iv-panel iv-anim" style={{ '--d': '0.18s', overflow: 'visible' }}>
          {/* Header */}
          <div className="iv-toolbar">
            <div className="iv-tabs" role="tablist">
              {invTabs.map(t => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={filterType === t.key}
                  className={`iv-tab${filterType === t.key ? ' on' : ''}`}
                  onClick={() => { setFilterType(t.key); setCurrentPage(1); setShowDropdown(null); }}
                >
                  {t.icon && <i className={`fas ${t.icon}`} style={{ color: filterType === t.key ? t.color : undefined }} />}
                  {t.label}
                  <span className="count">{t.count}</span>
                </button>
              ))}
            </div>
            <button type="button" className="iv-btn primary" onClick={() => setShowAddModal(true)}>
              <i className="fas fa-plus" />Add item
            </button>
          </div>

          {/* Filters */}
          <div className="iv-filters inv-filters-row">
            <div className="iv-search">
              <i className="fas fa-search" />
              <input
                className="iv-input"
                placeholder="Search items..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                aria-label="Search items"
              />
              {searchTerm && (
                <button type="button" className="iv-clear" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} aria-label="Clear search">
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <div className="iv-legend">
              <span><i style={{ background: '#198754' }} />In stock</span>
              <span><i style={{ background: '#e0a800' }} />Low stock</span>
              <span><i style={{ background: '#dc3545' }} />Out of stock</span>
            </div>
          </div>

          {/* Body */}
          <div className="inv-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
            {loading ? (
              <div style={{ padding: '0.5rem 0 1rem' }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.12 }}>
                    <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10 }} />
                    <div className="flex-grow-1">
                      <div className="skeleton" style={{ width: '30%', height: 13, marginBottom: 8 }} />
                      <div className="skeleton" style={{ width: '15%', height: 10 }} />
                    </div>
                    <div className="skeleton" style={{ width: 140, height: 12 }} />
                    <div className="skeleton" style={{ width: 90, height: 22, borderRadius: 999 }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="iv-empty">
                <div className="ic"><i className="fas fa-box-open" /></div>
                <h6>No items found</h6>
                <p>{searchTerm || filterType !== 'all' ? 'Try changing or clearing the filters.' : 'Add your first supply item to start tracking stock.'}</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflow: 'visible' }}>
                <table className="iv-table inv-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Item</th>
                      <th style={{ width: '18%' }}>Current stock</th>
                      <th style={{ width: '16%' }}>Min. threshold</th>
                      <th className="mobile-hide-status" style={{ width: '14%' }}>Status</th>
                      <th className="mobile-hide-restock" style={{ width: '16%' }}>Last restocked</th>
                      <th style={{ width: '6%' }} aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {invPageItems.map((item, i) => {
                      const typeCfg = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.microchip;
                      const status = getStockStatus(item);
                      const stock = parseInt(item.current_stock) || 0;
                      const min = parseInt(item.minimum_stock) || 0;
                      const level = stock === 0 ? 'out' : stock < 10 ? 'low' : 'ok';
                      const barPct = Math.min(100, (stock / Math.max(min * 2, 20)) * 100);
                      const speciesCfg = item.species ? (SPECIES_COLORS[item.species] || null) : null;
                      const expired = expiredBatchMap[item.id] || 0;
                      const menuOpen = showDropdown === item.id;
                      return (
                        <tr key={item.id} className={`iv-row ${level}${menuOpen ? ' raised' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <div className="iv-type-ic" style={{ '--c': typeCfg.color }}><i className={`fas ${typeCfg.icon}`} /></div>
                              <div style={{ minWidth: 0 }}>
                                <div className="iv-strong iv-ellipsis" title={item.item_name}>{item.item_name}</div>
                                <div className="d-flex align-items-center gap-1 flex-wrap">
                                  <span className="iv-muted" style={{ color: typeCfg.color, fontWeight: 700 }}>{typeCfg.label}</span>
                                  {speciesCfg && (
                                    <span className="iv-species" style={{ background: speciesCfg.bg, color: speciesCfg.color }}>{item.species === 'both' || item.species === 'all' ? 'Dogs & cats' : item.species}</span>
                                  )}
                                  {expired > 0 && (
                                    <span className="iv-species" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}>
                                      <i className="fas fa-exclamation-circle me-1" />{expired} expired
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="iv-stock">
                              <strong className={level}>{stock}</strong> <span>{item.unit}</span>
                            </div>
                            <div className="iv-bar"><div className={level} style={{ width: `${barPct}%` }} /></div>
                          </td>
                          <td>
                            <InlineMinStockInput item={item} onSave={async (itm, val) => {
                              try {
                                await inventoryAPI.update(itm.id, { minimum_stock: val });
                                showSuccess(`Min. threshold updated for ${itm.item_name}.`);
                                loadInventory();
                              } catch (err) {
                                const { message } = handleAPIError(err);
                                setError(message);
                              }
                            }} />
                          </td>
                          <td className="mobile-hide-status">
                            <span className="iv-pill" style={{ color: level === 'low' ? '#b88a00' : status.color, background: status.bg }}>
                              <i className={`fas ${status.icon}`} />{status.label}
                            </span>
                          </td>
                          <td className="mobile-hide-restock">
                            {item.last_restocked_at
                              ? <span style={{ fontSize: '0.85rem' }}>{new Date(item.last_restocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              : <span className="iv-muted">Never</span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                type="button"
                                className={`iv-icon-btn${menuOpen ? ' on' : ''}`}
                                onClick={() => setShowDropdown(menuOpen ? null : item.id)}
                                aria-label={`Options for ${item.item_name}`}
                                aria-expanded={menuOpen}
                              >
                                <i className="fas fa-ellipsis-v" />
                              </button>
                              {expired > 0 && <span className="iv-dot">{expired}</span>}
                              {menuOpen && (
                                <>
                                  <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
                                  <div className="iv-menu" role="menu">
                                    <button type="button" role="menuitem" className="iv-menu-item success" onClick={() => { handleOpenRestock(item); setShowDropdown(null); }}>
                                      <i className="fas fa-plus" />Add stock
                                    </button>
                                    <button type="button" role="menuitem" className="iv-menu-item info" onClick={() => { handleOpenBatches(item); setShowDropdown(null); }}>
                                      <i className="fas fa-layer-group" /><span style={{ flex: 1 }}>View batches</span>
                                      {expired > 0 && <span className="iv-count-badge">{expired}</span>}
                                    </button>
                                    <button type="button" role="menuitem" className="iv-menu-item" onClick={() => { setViewItem(item); setShowViewModal(true); setShowDropdown(null); }}>
                                      <i className="fas fa-eye" />View details
                                    </button>
                                    {item.item_type !== 'microchip' && (
                                      <>
                                        <button type="button" role="menuitem" className="iv-menu-item" onClick={() => { handleOpenEditItem(item); setShowDropdown(null); }}>
                                          <i className="fas fa-pen" />Edit item
                                        </button>
                                        <div className="iv-menu-sep" />
                                        <button type="button" role="menuitem" className="iv-menu-item danger" onClick={() => { setShowDropdown(null); handleDeleteClick(item); }}>
                                          <i className="fas fa-trash-alt" />Delete item
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
          {filtered.length > itemsPerPage && (
            <div className="iv-foot">
              <span className="iv-muted" style={{ fontSize: '0.84rem' }}>
                Showing <strong style={{ color: '#1f2328' }}>{invStart + 1}–{Math.min(invStart + itemsPerPage, filtered.length)}</strong> of {filtered.length}
              </span>
              <div className="d-flex align-items-center gap-1">
                <button type="button" className="iv-page nav" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                  <i className="fas fa-chevron-left" />
                </button>
                {invPagerNumbers.map(n => (
                  <button key={n} type="button" className={`iv-page${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
                ))}
                <button type="button" className="iv-page nav" onClick={() => setCurrentPage(p => Math.min(p + 1, invTotalPages))} disabled={currentPage === invTotalPages} aria-label="Next page">
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>

      </Container>

      {/* ── Add Item Modal ── */}
      <Modal show={showAddModal} onHide={() => !addLoading && setShowAddModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107', borderRadius: '12px 12px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-plus-circle me-2" style={{ color: '#ffc107' }} />
            Add Inventory Item
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.75rem' }}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Type <span style={{ color: '#dc3545' }}>*</span></Form.Label>
            <Form.Select value={addForm.item_type} onChange={e => {
  const typeUnitMap = { vaccination: 'doses', medicine: 'mg', equipment: 'pcs' };
  setAddForm(f => ({ ...f, item_type: e.target.value, unit: typeUnitMap[e.target.value] || 'pcs', vaccination_type_id: '', item_name: '' }));
}}
              style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }}>
              <option value="vaccination">Vaccination</option>
              <option value="medicine">Medicine</option>
              <option value="equipment">Equipment</option>
            </Form.Select>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Item Name <span style={{ color: '#dc3545' }}>*</span></Form.Label>
            <Form.Control value={addForm.item_name} onChange={e => setAddForm(f => ({ ...f, item_name: e.target.value }))}
              placeholder="e.g. Rabies Vaccine" style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }} />
          </Form.Group>
          <Row className="mb-3 g-2">
            <Col xs={6}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Species</Form.Label>
              <Form.Select value={addForm.species} onChange={e => setAddForm(f => ({ ...f, species: e.target.value }))}
                style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }}>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="all">All</option>
              </Form.Select>
            </Col>
            <Col xs={6}>
  <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Unit</Form.Label>
  <Form.Select value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
    style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }}>
    <option value="doses">doses</option>
    <option value="pcs">pcs</option>
    <option value="mg">mg</option>
    <option value="ml">ml</option>
    <option value="tablets">tablets</option>
    <option value="capsules">capsules</option>
    <option value="vials">vials</option>
    <option value="sachets">sachets</option>
    <option value="bottles">bottles</option>
    <option value="boxes">boxes</option>
  </Form.Select>
</Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Min. Threshold</Form.Label>
            <Form.Control type="number" min="0" value={addForm.minimum_stock}
              onChange={e => setAddForm(f => ({ ...f, minimum_stock: e.target.value }))}
              style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }} />
          </Form.Group>
          <Form.Group>
            <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Notes (Optional)</Form.Label>
            <Form.Control as="textarea" rows={2} value={addForm.notes}
              onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any remarks..."
              style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem', resize: 'none' }} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ padding: '1rem 1.75rem' }}>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={addLoading}
            style={{ borderRadius: '8px', fontWeight: '600' }}>Cancel</Button>
          <Button onClick={async () => {
            if (!addForm.item_name.trim()) { setError('Item name is required.'); return; }
            setShowAddModal(false);
            setAddLoading(true);
            try {
              await inventoryAPI.create({
                item_type: addForm.item_type,
                item_name: addForm.item_name.trim(),
                species: addForm.species,
                current_stock: 0,
                minimum_stock: parseInt(addForm.minimum_stock),
                unit: addForm.unit || 'pcs',
                notes: addForm.notes,
                
              });
              showSuccess(`"${addForm.item_name}" added to inventory.`);
              setAddForm({ item_type: 'vaccination', item_name: '', species: 'dog', minimum_stock: '10', unit: 'doses', notes: '' });
              loadInventory();
            } catch (err) {
              setShowAddModal(true);
              const { message } = handleAPIError(err);
              setError(message);
            } finally {
              setAddLoading(false);
            }
          }} disabled={addLoading || !addForm.item_name.trim()}
            style={{ background: '#ffc107', border: 'none', color: '#000', borderRadius: '8px', fontWeight: '700', padding: '0.6rem 1.5rem' }}>
            {addLoading ? <><Spinner size="sm" animation="border" className="me-2" />Adding...</> : <><i className="fas fa-plus me-2" />Add Item</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Restock Modal ── */}
<Modal show={showRestockModal} onHide={() => !restockLoading && setShowRestockModal(false)} centered style={{ zoom: '0.75' }}>
  <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #28a745', borderRadius: '12px 12px 0 0' }}>
    <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
      <i className="fas fa-plus-circle me-2" style={{ color: '#28a745' }} />
      Add Stock — {restockItem?.item_name}
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '1.75rem' }}>
    {restockItem && (
      <>
        {/* Current info */}
        <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: '700', textTransform: 'uppercase' }}>Current Stock</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: parseInt(restockItem.current_stock) === 0 ? '#dc3545' : '#333' }}>
              {restockItem.current_stock} <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{restockItem.unit}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: '700', textTransform: 'uppercase' }}>After Restock</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#28a745' }}>
              {parseInt(restockItem.current_stock || 0) + parseInt(restockQty || 0)} <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{restockItem.unit}</span>
            </div>
          </div>
        </div>

        <Row className="mb-3 g-2">
          <Col xs={6}>
            <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>
              Batch No. <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              value={restockBatchNo}
              onChange={e => { setRestockBatchNo(e.target.value); setBatchNoError(''); }}
              placeholder="e.g. BCH-2025-001"
              isInvalid={!!batchNoError}
              style={{ borderRadius: '8px', border: `2px solid ${batchNoError ? '#dc3545' : '#dee2e6'}`, padding: '0.7rem' }}
            />
            {batchNoError && <div style={{ color: '#dc3545', fontSize: '0.78rem', marginTop: '0.3rem' }}>{batchNoError}</div>}
          </Col>
          <Col xs={6}>
            <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>
              Quantity <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="number"
              min="1"
              max={getMaxBatchQty(restockItem.item_type)}
              value={restockQty}
              onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
              onChange={e => setRestockQty(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder={`Enter qty in ${restockItem.unit}`}
              isInvalid={parseInt(restockQty) > getMaxBatchQty(restockItem.item_type)}
              style={{ borderRadius: '8px', border: `2px solid ${parseInt(restockQty) > getMaxBatchQty(restockItem.item_type) ? '#dc3545' : '#dee2e6'}`, padding: '0.7rem' }}
            />
            <div style={{ fontSize: '0.75rem', marginTop: '0.3rem', color: parseInt(restockQty) > getMaxBatchQty(restockItem.item_type) ? '#dc3545' : '#888' }}>
              {parseInt(restockQty) > getMaxBatchQty(restockItem.item_type)
                ? `Max ${getMaxBatchQty(restockItem.item_type).toLocaleString()} ${restockItem.unit} per batch`
                : `Up to ${getMaxBatchQty(restockItem.item_type).toLocaleString()} ${restockItem.unit} per batch`}
            </div>
          </Col>
        </Row>

        {!['microchip', 'equipment'].includes(restockItem?.item_type) && (
  <Form.Group className="mb-3">
    <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Expiration Date</Form.Label>
    <Form.Control
      type="date"
      value={restockExpDate}
      onChange={e => setRestockExpDate(e.target.value)}
      style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.7rem' }}
    />
  </Form.Group>
)}

        <Form.Group>
          <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Notes (Optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={restockNotes}
            onChange={e => setRestockNotes(e.target.value)}
            placeholder="e.g. Delivery from DOH..."
            style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.7rem', resize: 'none' }}
          />
        </Form.Group>
      </>
    )}
  </Modal.Body>
  <Modal.Footer style={{ padding: '1rem 1.75rem' }}>
    <Button variant="secondary" onClick={() => setShowRestockModal(false)} disabled={restockLoading}
      style={{ borderRadius: '8px', fontWeight: '600' }}>Cancel</Button>
    <Button onClick={handleRestock}
      disabled={
        restockLoading ||
        !restockQty ||
        parseInt(restockQty) <= 0 ||
        parseInt(restockQty) > getMaxBatchQty(restockItem?.item_type) ||
        !restockBatchNo.trim() ||
        (!['microchip', 'equipment'].includes(restockItem?.item_type) && !restockExpDate)
      }
      style={{ background: '#28a745', border: 'none', borderRadius: '8px', fontWeight: '700', padding: '0.6rem 1.5rem' }}>
      {restockLoading ? <><Spinner size="sm" animation="border" className="me-2" />Adding...</> : <><i className="fas fa-plus me-2" />Add Stock</>}
    </Button>
  </Modal.Footer>
</Modal>
{/* ── Batches Modal ── */}
<Modal show={showBatchModal} onHide={() => { if (!editBatchSaving) { setShowBatchModal(false); setEditingBatch(null); } }} size="lg" centered style={{ zoom: '0.75' }}>
  <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #0d6efd', borderRadius: '12px 12px 0 0' }}>
    <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
      <i className="fas fa-layer-group me-2" style={{ color: '#0d6efd' }} />
      Batches — {batchItem?.item_name}
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '1.5rem' }}>
    {(() => {
      const today = new Date(); today.setHours(0,0,0,0);
      const expiredBatches = batches.filter(b => b.expiration_date && new Date(b.expiration_date) < today && parseInt(b.quantity) > 0);
      return expiredBatches.length > 0 && !batchesLoading ? (
        <div style={{ background: 'rgba(220,53,69,0.07)', border: '1.5px solid rgba(220,53,69,0.3)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.83rem', color: '#dc3545', fontWeight: '600' }}>
          <i className="fas fa-exclamation-triangle" />
          {expiredBatches.length} expired batch{expiredBatches.length !== 1 ? 'es' : ''} detected — please review and remove expired stock.
        </div>
      ) : null;
    })()}
    {batchesLoading ? (
      <div className="text-center py-4"><Spinner animation="border" style={{ color: '#0d6efd' }} /></div>
    ) : batches.length === 0 ? (
      <div className="text-center py-4" style={{ color: '#aaa' }}>
        <i className="fas fa-box-open" style={{ fontSize: '2.5rem' }} />
        <p className="mt-2">No batches yet. Use "Add Stock" to add the first batch.</p>
      </div>
    ) : (
      <div className="table-responsive">
        <Table hover style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Batch No.', 'Quantity', 'Expiration Date', 'Notes', 'Actions'].map(h => (
                <th key={h} style={{ fontWeight: '700', color: '#555', padding: '0.75rem 0.9rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batches.map(batch => {
              const isEditing = editingBatch?.id === batch.id;
              const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
              return (
                <tr key={batch.id} style={{ background: isEditing ? 'rgba(13,110,253,0.04)' : 'transparent' }}>
                  {/* Batch No */}
                  <td style={{ padding: '0.7rem 0.9rem', verticalAlign: 'middle' }}>
                    {isEditing ? (
                      <Form.Control size="sm" value={editingBatch.batch_no}
                        onChange={e => setEditingBatch(b => ({ ...b, batch_no: e.target.value }))}
                        style={{ border: '2px solid #0d6efd', borderRadius: '6px', fontWeight: '700', minWidth: '120px' }} />
                    ) : (
                      <span style={{ fontWeight: '700', color: '#333' }}>{batch.batch_no}</span>
                    )}
                  </td>
                  {/* Qty */}
                  <td style={{ padding: '0.7rem 0.9rem', verticalAlign: 'middle' }}>
                    {isEditing ? (
                      <Form.Control size="sm" type="number" min="0" max={getMaxBatchQty(batchItem?.item_type)} value={editingBatch.quantity}
                        onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                        onChange={e => setEditingBatch(b => ({ ...b, quantity: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                        title={`Max ${getMaxBatchQty(batchItem?.item_type)} per batch`}
                        style={{ border: `2px solid ${parseInt(editingBatch.quantity) > getMaxBatchQty(batchItem?.item_type) ? '#dc3545' : '#0d6efd'}`, borderRadius: '6px', width: '90px', fontWeight: '700' }} />
                    ) : (
                      <span style={{ fontWeight: '700' }}>{batch.quantity} <span style={{ color: '#aaa', fontWeight: '400' }}>{batch.unit}</span></span>
                    )}
                  </td>
                  {/* Exp Date */}
                  <td style={{ padding: '0.7rem 0.9rem', verticalAlign: 'middle' }}>
                    {isEditing ? (
                      <Form.Control size="sm" type="date" value={editingBatch.expiration_date || ''}
                        onChange={e => setEditingBatch(b => ({ ...b, expiration_date: e.target.value }))}
                        style={{ border: '2px solid #0d6efd', borderRadius: '6px' }} />
                    ) : batch.expiration_date ? (
                      <span style={{ color: isExpired ? '#dc3545' : '#333', fontWeight: isExpired ? '700' : '400' }}>
                        {isExpired && <i className="fas fa-exclamation-triangle me-1" style={{ color: '#dc3545' }} />}
                        {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  {/* Notes */}
                  <td style={{ padding: '0.7rem 0.9rem', verticalAlign: 'middle', maxWidth: '160px' }}>
                    {isEditing ? (
                      <Form.Control size="sm" value={editingBatch.notes || ''}
                        onChange={e => setEditingBatch(b => ({ ...b, notes: e.target.value }))}
                        style={{ border: '2px solid #0d6efd', borderRadius: '6px' }} />
                    ) : (
                      <span style={{ color: '#666', fontSize: '0.82rem' }}>{batch.notes || <span style={{ color: '#ccc' }}>—</span>}</span>
                    )}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '0.7rem 0.9rem', verticalAlign: 'middle' }}>
                    <div className="d-flex gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={handleSaveBatch} disabled={editBatchSaving}
                            style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: 'none', background: '#0d6efd', color: '#fff', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
                            {editBatchSaving ? <Spinner size="sm" animation="border" style={{ width: '10px', height: '10px' }} /> : <><i className="fas fa-save me-1" />Save</>}
                          </button>
                          <button onClick={() => setEditingBatch(null)}
                            style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: '2px solid #dee2e6', background: '#fff', color: '#555', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingBatch({ ...batch })}
                            style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: '2px solid #0d6efd', background: '#fff', color: '#0d6efd', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
                            <i className="fas fa-edit" />
                          </button>
                          <button onClick={() => handleDeleteBatch(batch.id)} disabled={deletingBatchId === batch.id}
                            style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: '2px solid #dc3545', background: '#fff', color: '#dc3545', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
                            {deletingBatchId === batch.id ? <Spinner size="sm" animation="border" style={{ width: '10px', height: '10px' }} /> : <i className="fas fa-trash" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    )}
  </Modal.Body>
  <Modal.Footer style={{ padding: '1rem 1.5rem', justifyContent: 'space-between' }}>
    <small style={{ color: '#aaa' }}>{batches.length} batch{batches.length !== 1 ? 'es' : ''} · Total: {batches.reduce((s, b) => s + parseInt(b.quantity || 0), 0)} {batchItem?.unit}</small>
    <Button variant="secondary" onClick={() => { setShowBatchModal(false); setEditingBatch(null); }}
      style={{ borderRadius: '8px', fontWeight: '600' }}>Close</Button>
  </Modal.Footer>
</Modal>

      {/* ── View Details Modal ── */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="md" style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #0d6efd', borderRadius: '12px 12px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#0d6efd' }} />
            Item Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.75rem' }}>
          {viewItem && (() => {
            const typeCfg    = TYPE_CONFIG[viewItem.item_type] || TYPE_CONFIG.microchip;
            const status     = getStockStatus(viewItem);
            const speciesCfg = viewItem.species ? (SPECIES_COLORS[viewItem.species] || {}) : null;

            /* ── static details per type ── */
            const STATIC_DETAILS = {
  vaccination: {
    purpose:   'Stimulates the immune system to provide protection against specific infectious diseases in pets.',
    usage:     'Administered via subcutaneous or intramuscular injection by a licensed veterinarian.',
    storage:   'Store at 2–8 °C. Keep away from direct sunlight and do not freeze.',
    frequency: 'Varies by vaccine: annually, every 3 years, or as directed by the attending vet.',
  },
  medicine: {
    purpose:   'Pharmaceutical products used to treat, prevent, or manage diseases and health conditions in pets.',
    usage:     'Administered orally, topically, or via injection as prescribed by a licensed veterinarian.',
    storage:   'Store at room temperature (15–25 °C) unless otherwise specified. Keep away from moisture and direct sunlight.',
    frequency: 'As prescribed by the attending veterinarian. Complete the full course even if symptoms improve.',
  },
  microchip: {
                purpose:   'A permanent radio-frequency identification (RFID) implant used to uniquely identify pets and reunite them with their owners.',
                usage:     'Implanted subcutaneously (usually between the shoulder blades) using a hypodermic needle by a licensed veterinarian. No anesthesia required for most pets.',
                storage:   'Sterile single-use implants. Store in a cool, dry place at room temperature. Do not expose to electromagnetic fields.',
                frequency: 'One-time permanent implant. No replacement needed under normal circumstances.',
                standard:  'ISO 11784/11785 compliant 15-digit RFID chip operating at 134.2 kHz.',
                readRange: 'Readable by standard ISO-compliant scanners at a range of approximately 10–15 cm.',
              },
            };

            const details = STATIC_DETAILS[viewItem.item_type] || STATIC_DETAILS.microchip;

            const rowStyle = { padding: '0.6rem 0', borderBottom: '1px solid #f0f0f0' };
            const labelStyle = { fontWeight: '600', color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '130px', flexShrink: 0 };
            const valueStyle = { color: '#333', fontSize: '0.88rem', fontWeight: '500' };

            return (
              <>
                {/* Header badge strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.9rem 1rem', background: typeCfg.bg, borderRadius: '10px' }}>
                  <i className={`fas ${typeCfg.icon}`} style={{ fontSize: '1.4rem', color: typeCfg.color }} />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: typeCfg.color }}>{viewItem.item_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>{typeCfg.label}</div>
                  </div>
                  {viewItem.species && (
                    <span style={{ marginLeft: 'auto', padding: '0.2rem 0.7rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', background: speciesCfg?.bg || '#f0f0f0', color: speciesCfg?.color || '#555' }}>
                      {viewItem.species}
                    </span>
                  )}
                </div>

                {/* Stock snapshot */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Current Stock', value: `${viewItem.current_stock} ${viewItem.unit}`, color: parseInt(viewItem.current_stock) === 0 ? '#dc3545' : '#333' },
                    { label: 'Min. Threshold', value: `${viewItem.minimum_stock} ${viewItem.unit}`, color: '#333' },
                    { label: 'Status', value: status.label, color: status.color },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, background: '#f8f9fa', borderRadius: '8px', padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: '#aaa', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{s.label}</div>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem', color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Details rows */}
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #f0f0f0', overflow: 'hidden', marginBottom: '1rem' }}>
                  {[
                    { label: 'Purpose',   value: details.purpose },
                    { label: 'Usage',     value: details.usage },
                    { label: 'Storage',   value: details.storage },
                    { label: 'Frequency', value: details.frequency },
                    ...(viewItem.item_type === 'microchip' ? [
                      { label: 'Standard',  value: details.standard },
                      { label: 'Read Range',value: details.readRange },
                    ] : []),
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: i < arr.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <span style={labelStyle}>{row.label}</span>
                      <span style={valueStyle}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Notes from DB if any */}
                {viewItem.notes && (
                  <div style={{ background: 'rgba(13,110,253,0.05)', borderRadius: '8px', padding: '0.75rem 1rem', borderLeft: '3px solid #0d6efd' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0d6efd', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Notes</div>
                    <div style={{ fontSize: '0.85rem', color: '#555' }}>{viewItem.notes}</div>
                  </div>
                )}

                {/* Expired batch warning */}
                {expiredBatchMap[viewItem?.id] > 0 && (
                  <div style={{ background: 'rgba(220,53,69,0.07)', border: '1.5px solid rgba(220,53,69,0.3)', borderRadius: '8px', padding: '0.6rem 0.9rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#dc3545', fontWeight: '600' }}>
                    <i className="fas fa-exclamation-triangle" />
                    {expiredBatchMap[viewItem.id]} expired batch{expiredBatchMap[viewItem.id] !== 1 ? 'es' : ''} — open Batches to review.
                  </div>
                )}
                {/* Last restocked */}
                <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: '#aaa', textAlign: 'right' }}>
                  Last restocked: {viewItem.last_restocked_at
                    ? new Date(viewItem.last_restocked_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'Never'}
                </div>
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1rem 1.75rem' }}>
          <Button
            onClick={() => { setShowViewModal(false); handleOpenRestock(viewItem); }}
            style={{ background: '#28a745', border: 'none', borderRadius: '8px', fontWeight: '700', padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
            <i className="fas fa-plus me-2" />Add Stock
          </Button>
          <Button
            onClick={() => { setShowViewModal(false); handleOpenBatches(viewItem); }}
            style={{ background: '#0d6efd', border: 'none', borderRadius: '8px', fontWeight: '700', padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
            <i className="fas fa-layer-group me-2" />Batches
          </Button>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}
            style={{ borderRadius: '8px', fontWeight: '600' }}>Close</Button>
        </Modal.Footer>
      </Modal>


      {/* ── Edit Item Modal ── */}
      <Modal show={showEditItemModal} onHide={() => !editItemLoading && setShowEditItemModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #6f42c1', borderRadius: '12px 12px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-edit me-2" style={{ color: '#6f42c1' }} />
            Edit Item — {editItemForm?.item_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.75rem' }}>
          {editItemForm && (
            <>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Type</Form.Label>
                <Form.Select value={editItemForm.item_type} disabled
                  style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem', background: '#f8f9fa', color: '#999' }}>
                  <option value="vaccination">Vaccination</option>
                  <option value="medicine">Medicine</option>
                  <option value="microchip">Microchip</option>
                  <option value="equipment">Equipment</option>
                </Form.Select>
                <Form.Text className="text-muted">Type cannot be changed after creation.</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Item Name <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                <Form.Control value={editItemForm.item_name}
                  onChange={e => setEditItemForm(f => ({ ...f, item_name: e.target.value }))}
                  style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }} />
              </Form.Group>
              <Row className="mb-3 g-2">
                <Col xs={6}>
                  <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Species</Form.Label>
                  <Form.Select value={editItemForm.species}
                    onChange={e => setEditItemForm(f => ({ ...f, species: e.target.value }))}
                    style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }}>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="all">All</option>
                  </Form.Select>
                </Col>
                <Col xs={6}>
                  <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Unit</Form.Label>
                  <Form.Select value={editItemForm.unit}
                    onChange={e => setEditItemForm(f => ({ ...f, unit: e.target.value }))}
                    style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }}>
                    <option value="doses">doses</option>
                    <option value="pcs">pcs</option>
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="tablets">tablets</option>
                    <option value="capsules">capsules</option>
                    <option value="vials">vials</option>
                    <option value="sachets">sachets</option>
                    <option value="bottles">bottles</option>
                    <option value="boxes">boxes</option>
                  </Form.Select>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Min. Threshold</Form.Label>
                <Form.Control type="number" min="0" value={editItemForm.minimum_stock}
                  onChange={e => setEditItemForm(f => ({ ...f, minimum_stock: e.target.value }))}
                  style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }} />
              </Form.Group>
              <Form.Group>
                <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Notes (Optional)</Form.Label>
                <Form.Control as="textarea" rows={2} value={editItemForm.notes}
                  onChange={e => setEditItemForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem', resize: 'none' }} />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1rem 1.75rem' }}>
          <Button variant="secondary" onClick={() => setShowEditItemModal(false)} disabled={editItemLoading}
            style={{ borderRadius: '8px', fontWeight: '600' }}>Cancel</Button>
          <Button onClick={handleEditItemSave} disabled={editItemLoading || !editItemForm?.item_name?.trim()}
            style={{ background: '#6f42c1', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', padding: '0.6rem 1.5rem' }}>
            {editItemLoading ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</> : <><i className="fas fa-save me-2" />Save Changes</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Edit Threshold Modal ── */}
      <Modal show={showEditModal} onHide={() => !editLoading && setShowEditModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107', borderRadius: '12px 12px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-sliders-h me-2" style={{ color: '#ffc107' }} />
            Edit Threshold — {editItem?.item_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.75rem' }}>
          <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '1.25rem' }}>
            Set the minimum stock level. You'll see a <strong style={{ color: '#ffc107' }}>Low Stock</strong> warning when stock falls at or below this number.
          </p>
          <Form.Group>
            <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>
              Minimum Stock Threshold <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={editMinStock}
              onChange={e => setEditMinStock(e.target.value)}
              style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.7rem' }}
              autoFocus
            />
            <Form.Text className="text-muted">Current: {editItem?.minimum_stock} {editItem?.unit}</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ padding: '1rem 1.75rem' }}>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={editLoading}
            style={{ borderRadius: '8px', fontWeight: '600' }}>
            Cancel
          </Button>
          <Button onClick={handleEditSave} disabled={editLoading}
            style={{ background: '#ffc107', border: 'none', color: '#000', borderRadius: '8px', fontWeight: '700', padding: '0.6rem 1.5rem' }}>
            {editLoading ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</> : <><i className="fas fa-save me-2" />Save Threshold</>}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* ── Delete Batch Confirm Modal ── */}
      <Modal show={showDeleteBatchModal} onHide={() => !deleteBatchLoading && setShowDeleteBatchModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6', borderRadius: '12px 12px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-exclamation-triangle text-danger me-2" />
            Confirm Delete Batch
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {batchToDelete && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to delete this batch?
              </p>
              <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
                <strong style={{ fontSize: '1.1rem' }}>{batchToDelete.batch_no}</strong>
                <br />
                <small className="text-muted">
                  Quantity: {batchToDelete.quantity} {batchItem?.unit}
                  {batchToDelete.expiration_date && (
                    <> · Expires: {new Date(batchToDelete.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                  )}
                </small>
              </div>
              <Alert variant="warning" className="mt-3 mb-0">
                <i className="fas fa-info-circle me-2" />
                <strong>Warning:</strong> Stock will be deducted automatically. This action cannot be undone.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowDeleteBatchModal(false)} disabled={deleteBatchLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteBatchConfirm} disabled={deleteBatchLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            {deleteBatchLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Deleting...</>
              : <><i className="fas fa-trash me-2" />Delete Batch</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal show={showDeleteModal} onHide={() => !deleteLoading && setShowDeleteModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6', borderRadius: '12px 12px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-exclamation-triangle text-danger me-2" />
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {itemToDelete && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to delete this inventory item?
              </p>
              <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
                <div className="mb-2">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: '20px', background: (TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.microchip).bg, color: (TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.microchip).color, fontWeight: '700', fontSize: '0.75rem' }}>
                    <i className={`fas ${(TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.microchip).icon}`} />
                    {(TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.microchip).label}
                  </span>
                </div>
                <strong style={{ fontSize: '1.1rem' }}>{itemToDelete.item_name}</strong>
                <br />
                <small className="text-muted">
                  Current stock: {itemToDelete.current_stock} {itemToDelete.unit}
                </small>
              </div>
              <Alert variant="warning" className="mt-3 mb-0">
                <i className="fas fa-info-circle me-2" />
                <strong>Warning:</strong> This will permanently remove the item and all its batches. This action cannot be undone.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleteLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            {deleteLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Deleting...</>
              : <><i className="fas fa-trash me-2" />Delete Item</>}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// ── Inline stock editor ────────────────────────────────────────────────────
// ── Inline minimum stock threshold editor ────────────────────────────────
function InlineMinStockInput({ item, onSave }) {
  const [value, setValue]   = useState(parseInt(item.minimum_stock));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);

  useEffect(() => { setValue(parseInt(item.minimum_stock)); setDirty(false); }, [item.minimum_stock]);

  const change = (val) => {
    if (val === '') { setValue(''); setDirty(true); return; }
    const n = Math.max(0, parseInt(val) || 0);
    setValue(n);
    setDirty(n !== parseInt(item.minimum_stock));
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    await onSave(item, value === '' ? 0 : value);
    setSaving(false);
    setDirty(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => change(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
        onFocus={e => { if (value === 0) { setValue(''); setDirty(true); } }}
        onBlur={() => { if (value === '') { setValue(0); setDirty(0 !== parseInt(item.minimum_stock)); } }}
        style={{ width: '52px', textAlign: 'center', padding: '0.2rem 0.25rem', borderRadius: '6px', border: `2px solid ${dirty ? '#0d6efd' : '#dee2e6'}`, fontSize: '0.82rem', fontWeight: '600', color: '#555', outline: 'none', flexShrink: 0 }}
      />
      <span style={{ fontSize: '0.7rem', color: '#aaa', flexShrink: 0 }}>{item.unit}</span>
      {dirty && (
        <button onClick={handleSave} disabled={saving}
          style={{ width: '20px', height: '20px', borderRadius: '5px', border: 'none', background: '#0d6efd', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', padding: 0, flexShrink: 0 }}>
          {saving ? <Spinner size="sm" animation="border" style={{ width: '10px', height: '10px' }} /> : <i className="fas fa-check" />}
        </button>
      )}
    </div>
  );
}