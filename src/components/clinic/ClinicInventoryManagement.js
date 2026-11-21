import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Container, Row, Col, Card, Modal, Form } from 'react-bootstrap';

// ─── API helper ──────────────────────────────────────────────────────────────
// Mirrors the pattern of your existing inventoryAPI / handleAPIError.
// Swap BASE_URL to match your actual API base path.
const BASE_URL = '/city-pet-vaccination-api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};



const clinicInventoryAPI = {
  getAll:      ()         => api.get('/clinic/inventory').then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  getByType:   (type)     => api.get(`/clinic/inventory/type/${type}`).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  getLowStock: ()         => api.get('/clinic/inventory/low-stock').then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  show:        (id)       => api.get(`/clinic/inventory/show/${id}`).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  getBatches:  (id)       => api.get(`/clinic/inventory/batches/${id}`).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  create:      (data)     => api.post('/clinic/inventory/create', data).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  update:      (id, data) => api.put(`/clinic/inventory/update/${id}`, data).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  restock:     (id, data) => api.put(`/clinic/inventory/restock/${id}`, data).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  updateBatch: (id, data) => api.put(`/clinic/inventory/batch/update/${id}`, data).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  deleteBatch: (id)       => api.delete(`/clinic/inventory/batch/delete/${id}`).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
  deleteItem:  (id)       => api.delete(`/clinic/inventory/delete/${id}`).then(r => r.data).catch(e => ({ success: false, error: e?.response?.data?.error || e.message })),
};

const handleAPIError = (res) => ({ message: res?.error || res?.message || res?.data?.error || 'An error occurred.' });

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  vaccination: { label: 'Vaccination', color: '#ffc107', bg: 'rgba(255,193,7,0.12)',   icon: 'fa-syringe'   },
  deworming:   { label: 'Deworming',   color: '#20c997', bg: 'rgba(32,201,151,0.12)',  icon: 'fa-tablets'   },
  medicine:    { label: 'Medicine',    color: '#e83e8c', bg: 'rgba(232,62,140,0.12)',  icon: 'fa-pills'     },
  microchip:   { label: 'Microchip',   color: '#6c757d', bg: 'rgba(108,117,125,0.12)', icon: 'fa-microchip' },
  equipment:   { label: 'Equipment',   color: '#0d6efd', bg: 'rgba(13,110,253,0.12)',  icon: 'fa-toolbox'   },
};

const SPECIES_COLORS = {
  dog:    { bg: '#fff3cd', color: '#856404' },
  cat:    { bg: '#d1ecf1', color: '#0c5460' },
  rabbit: { bg: '#f8d7da', color: '#842029' },
  both:   { bg: '#e2d9f3', color: '#6f42c1' },
  all:    { bg: '#fde8e8', color: '#842029' },
};

const getStockStatus = (item) => {
  const s = parseInt(item.current_stock);
  const m = parseInt(item.minimum_stock);
  if (s === 0)   return { label: 'Out of Stock', color: '#dc3545', bg: 'rgba(220,53,69,0.1)',  icon: 'fa-times-circle'        };
  if (s <= m)    return { label: 'Low Stock',    color: '#ffc107', bg: 'rgba(255,193,7,0.12)', icon: 'fa-exclamation-triangle' };
  return               { label: 'In Stock',     color: '#28a745', bg: 'rgba(40,167,69,0.1)',  icon: 'fa-check-circle'        };
};

const TYPE_ORDER = { vaccination: 3, deworming: 1, medicine: 2, microchip: 0, equipment: 4 };

// Max quantity allowed in ONE batch (one delivery / lot). Based on the item's unit,
// with fixed limits for microchips and equipment. Adjust if your clinic receives bigger deliveries.
const MAX_BATCH_BY_UNIT = { doses: 500, pcs: 1000, tablets: 1000, capsules: 1000, sachets: 1000, vials: 200, bottles: 200, boxes: 100, ml: 20000, mg: 100000 };
const MAX_BATCH_BY_TYPE = { microchip: 200, equipment: 100 };
const getMaxBatchQty = (item) => MAX_BATCH_BY_TYPE[item?.item_type] ?? MAX_BATCH_BY_UNIT[item?.unit] ?? 1000;

const ITEMS_PER_PAGE = 10;

// ─── Animated count-up for stat cards ───────────────────────────────────────
function AnimatedStatValue({ value, loading }) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (loading || hasAnimatedRef.current || value === 0) return;
    hasAnimatedRef.current = true;
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const current = step >= steps ? value : Math.round(increment * step);
      setDisplayValue(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [loading, value]);

  if (loading) {
    return (
      <span style={{
        display: 'inline-block', width: '2.2ch', height: '1em',
        borderRadius: '6px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        verticalAlign: 'middle'
      }} />
    );
  }
  return displayValue;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClinicInventoryManagement() {
  const [inventory, setInventory]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // expired batch map { inventoryId: count }
  const [expiredBatchMap, setExpiredBatchMap] = useState({});

  // ellipsis dropdown
  const [showDropdown, setShowDropdown]   = useState(null);

  // ── Add modal
  const [showAddModal, setShowAddModal] = useState(false);
const [addForm, setAddForm] = useState({ item_type: 'vaccination', item_name: '', species: 'all', minimum_stock: '10', unit: 'doses', notes: '' });
  const [addLoading, setAddLoading]     = useState(false);

  // ── Restock modal
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem]           = useState(null);
  const [restockQty, setRestockQty]             = useState('');
  const [restockBatchNo, setRestockBatchNo]     = useState('');
  const [restockExpDate, setRestockExpDate]     = useState('');
  const [restockNotes, setRestockNotes]         = useState('');
  const [restockLoading, setRestockLoading]     = useState(false);
  const [batchNoError, setBatchNoError]         = useState('');

  // ── Batch modal
  const [showBatchModal, setShowBatchModal]   = useState(false);
  const [batchItem, setBatchItem]             = useState(null);
  const [batches, setBatches]                 = useState([]);
  const [batchesLoading, setBatchesLoading]   = useState(false);
  const [editingBatch, setEditingBatch]       = useState(null);
  const [editBatchSaving, setEditBatchSaving] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState(null);

  // ── View details modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem]           = useState(null);

  // ── Delete confirm
  const [deletingItemId, setDeletingItemId] = useState(null);

  // ─── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadInventory(); }, []);

  useEffect(() => {
    if (!inventory.length) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    Promise.all(
      inventory.map(item =>
        clinicInventoryAPI.getBatches(item.id)
          .then(r => ({ id: item.id, batches: r.batches || [] }))
          .catch(() => ({ id: item.id, batches: [] }))
      )
    ).then(results => {
      const map = {};
      results.forEach(({ id, batches }) => {
        map[id] = batches.filter(b =>
          b.expiration_date && new Date(b.expiration_date) < today && parseInt(b.quantity) > 0
        ).length;
      });
      setExpiredBatchMap(map);
    });
  }, [inventory]);


  // First load shows the skeleton; reloads after an action are silent (no jump to the top)
  const hasLoadedRef = useRef(false);
  const loadInventory = async () => {
  try {
    if (!hasLoadedRef.current) setLoading(true);
    const res = await clinicInventoryAPI.getAll();
    if (res.success) setInventory(res.inventory || []);
    else setError(res.message || 'Failed to load inventory.');
  } catch (e) {
    setError('Failed to load inventory.');
  } finally {
    hasLoadedRef.current = true;
    setLoading(false);
  }
};

  // Resets the timer so an older timeout can't hide a newer message
  const successTimerRef = useRef(null);
  const showSuccess = (msg, duration = 3000) => {
    clearTimeout(successTimerRef.current);
    setSuccess(msg);
    successTimerRef.current = setTimeout(() => setSuccess(''), duration);
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const totalItems    = inventory.length;
  const totalStock    = inventory.reduce((s, i) => s + parseInt(i.current_stock || 0), 0);
  const lowStockItems = inventory.filter(i => {
    const s = parseInt(i.current_stock), m = parseInt(i.minimum_stock);
    return s > 0 && s <= m;
  }).length;
  const outOfStock = inventory.filter(i => parseInt(i.current_stock) === 0).length;

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filtered = inventory
    .filter(item => {
      const matchType   = filterType === 'all' || item.item_type === filterType;
      const matchSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    })
    .sort((a, b) => {
      const d = (TYPE_ORDER[a.item_type] ?? 9) - (TYPE_ORDER[b.item_type] ?? 9);
      return d !== 0 ? d : a.item_name.localeCompare(b.item_name);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageStart  = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems  = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const pagerNumbers = (() => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();
  const typeCounts = inventory.reduce((acc, i) => { acc[i.item_type] = (acc[i.item_type] || 0) + 1; return acc; }, {});
  const invTabs = [
    { key: 'all', label: 'All', count: inventory.length },
    ...Object.keys(TYPE_CONFIG).map(k => ({ key: k, label: TYPE_CONFIG[k].label, count: typeCounts[k] || 0, icon: TYPE_CONFIG[k].icon, color: TYPE_CONFIG[k].color })),
  ];

  // ─── Restock ──────────────────────────────────────────────────────────────
  const handleOpenRestock = (item) => {
    setRestockItem(item); setRestockQty(''); setRestockBatchNo('');
    setRestockExpDate(''); setRestockNotes(''); setBatchNoError('');
    setShowRestockModal(true);
  };

    const handleRestock = async () => {
    if (restockLoading) return;
    if (!restockQty || parseInt(restockQty) <= 0) { setError('Enter a valid quantity > 0.'); return; }
    if (parseInt(restockQty) > getMaxBatchQty(restockItem)) {
      setError(`A single batch can only have up to ${getMaxBatchQty(restockItem).toLocaleString()} ${restockItem?.unit || ''}. Split larger deliveries into separate batches.`);
      return;
    }
    if (!restockBatchNo.trim()) { setBatchNoError('Batch number is required.'); return; }
    setBatchNoError('');
    setRestockLoading(true);
    setShowRestockModal(false);            // close immediately
    try {
      const res = await clinicInventoryAPI.restock(restockItem.id, {
        quantity:        parseInt(restockQty),
        batch_no:        restockBatchNo.trim(),
        expiration_date: restockExpDate || null,
        notes:           restockNotes || null,
      });
      if (res.success) {
        showSuccess(`Batch "${restockBatchNo}" added to ${restockItem.item_name}.`);
        loadInventory();
      } else {
        const msg = handleAPIError(res).message;
        if (msg?.toLowerCase().includes('batch')) setBatchNoError(msg);
        else setError(msg);
        setShowRestockModal(true);         // reopen with data intact
      }
    } catch {
      setError('Failed to restock.');
      setShowRestockModal(true);
    } finally { setRestockLoading(false); }
  };

  // ─── Batches ──────────────────────────────────────────────────────────────
  const handleOpenBatches = async (item) => {
    setBatchItem(item); setEditingBatch(null);
    setShowBatchModal(true); setBatchesLoading(true);
    try {
      const res = await clinicInventoryAPI.getBatches(item.id);
      setBatches(res.batches || []);
    } catch { setError('Failed to load batches.'); }
    finally { setBatchesLoading(false); }
  };

    const handleSaveBatch = async () => {
    if (!editingBatch || editBatchSaving) return;
    if (!editingBatch.batch_no?.trim()) { setError('Batch number cannot be empty.'); return; }
    if (parseInt(editingBatch.quantity) < 0) { setError('Quantity cannot be negative.'); return; }
    if (parseInt(editingBatch.quantity) > getMaxBatchQty(batchItem)) {
      setError(`A single batch can only have up to ${getMaxBatchQty(batchItem).toLocaleString()} ${batchItem?.unit || ''}.`);
      return;
    }
    const batchToSave = editingBatch;
    setEditBatchSaving(true);
    setEditingBatch(null);                 // exit edit mode immediately
    try {
      const res = await clinicInventoryAPI.updateBatch(batchToSave.id, {
        batch_no:        batchToSave.batch_no.trim(),
        quantity:        parseInt(batchToSave.quantity),
        expiration_date: batchToSave.expiration_date || null,
        notes:           batchToSave.notes || null,
      });
      if (res.success) {
        showSuccess('Batch updated.');
        const r2 = await clinicInventoryAPI.getBatches(batchItem.id);
        setBatches(r2.batches || []);
        loadInventory();
      } else {
        setError(handleAPIError(res).message);
        setEditingBatch(batchToSave);      // restore so changes aren't lost
      }
    } catch {
      setError('Failed to save batch.');
      setEditingBatch(batchToSave);
    } finally { setEditBatchSaving(false); }
  };

  // ── Delete batch modal state
  const [showDeleteBatchModal, setShowDeleteBatchModal] = useState(false);
  const [batchToDelete, setBatchToDelete]               = useState(null);
  const [deleteBatchLoading, setDeleteBatchLoading]     = useState(false);

  const handleDeleteBatch = (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    setBatchToDelete(batch);
    setShowDeleteBatchModal(true);
  };

    const handleDeleteBatchConfirm = async () => {
    if (!batchToDelete || deleteBatchLoading) return;
    const target = batchToDelete;
    setDeleteBatchLoading(true);
    setShowDeleteBatchModal(false);        // close immediately
    try {
      const res = await clinicInventoryAPI.deleteBatch(target.id);
      if (res.success) {
        showSuccess('Batch deleted.');
        const r2 = await clinicInventoryAPI.getBatches(batchItem.id);
        setBatches(r2.batches || []);
        loadInventory();
        setBatchToDelete(null);
      } else setError(handleAPIError(res).message);
    } catch { setError('Failed to delete batch.'); }
    finally { setDeleteBatchLoading(false); setDeletingBatchId(null); }
  };

  // ── Delete item modal state
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [itemToDelete, setItemToDelete]               = useState(null);
  const [deleteItemLoading, setDeleteItemLoading]     = useState(false);

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteItemModal(true);
    setShowDropdown(null);
  };

    const handleDeleteItemConfirm = async () => {
    if (!itemToDelete || deleteItemLoading) return;
    const target = itemToDelete;
    setDeleteItemLoading(true);
    setShowDeleteItemModal(false);         // close immediately
    try {
      const res = await clinicInventoryAPI.deleteItem(target.id);
      if (res.success) {
        showSuccess(`"${target.item_name}" deleted.`);
        setItemToDelete(null);
        loadInventory();
      } else setError(handleAPIError(res).message);
    } catch { setError('Failed to delete item.'); }
    finally { setDeleteItemLoading(false); setDeletingItemId(null); }
  };

  // ─── Add item ─────────────────────────────────────────────────────────────
    const handleAdd = async () => {
    if (addLoading) return;
    if (!addForm.item_name.trim()) { setError('Item name is required.'); return; }
    const submitted = addForm;
    setAddLoading(true);
    setShowAddModal(false);                // close immediately
    try {
      const res = await clinicInventoryAPI.create({
        item_type:     submitted.item_type,
        item_name:     submitted.item_name.trim(),
        species:       submitted.species || null,
        minimum_stock: parseInt(submitted.minimum_stock) || 10,
        unit:          submitted.unit || 'pcs',
        notes:         submitted.notes || null,
      });
      if (res.success) {
        showSuccess(`"${submitted.item_name}" added to inventory.`);
        setAddForm({ item_type: 'vaccination', item_name: '', species: 'all', minimum_stock: '10', unit: 'doses', notes: '' });
        loadInventory();
      } else {
        setError(handleAPIError(res).message);
        setShowAddModal(true);             // reopen with form data intact
      }
    } catch {
      setError('Failed to add item.');
      setShowAddModal(true);
    } finally { setAddLoading(false); }
  };

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const styles = `
    @keyframes dropDown { 0%{opacity:0;transform:translateY(-16px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes shimmer  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
    .cinv-row:hover { background: rgba(255,193,7,0.04) !important; }
    .cinv-page { zoom: 0.75; }
    @media (min-width: 1600px) { .cinv-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .cinv-page { zoom: 1; } }
    @media (max-width: 768px) {
      .cinv-page { zoom: 1; }
      .cinv-title { font-size: 1.3rem !important; }
      .cinv-subtitle { font-size: 0.78rem !important; }
      .cinv-stat-label { font-size: 0.55rem !important; }
      .cinv-stat-number { font-size: 1.1rem !important; }
      .cinv-stat-icon { width: 36px !important; height: 36px !important; border-radius: 8px !important; }
      .cinv-stat-icon i { font-size: 1rem !important; }
      .cinv-table th, .cinv-table td { font-size: 0.7rem !important; padding: 0.35rem 0.3rem !important; }
      .cinv-table .mobile-hide { display: none !important; }
      .cinv-add-btn { padding: 0.4rem 0.8rem !important; font-size: 0.8rem !important; }
      .cinv-filter-row .col-search { margin-bottom: 0.5rem; }
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
    .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 800px 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 8px; }
    @media (max-width: 768px) {
      .cinv-table .mobile-hide-status, .cinv-table .mobile-hide-restock { display: none !important; }
      .cinv-card-body { padding: 0 0.75rem 0.5rem !important; }
    }

    /* Modals: same zoom as the page; normal size and centered on phones */
    .iv-zoom-modal { zoom: 0.75; }
    @media (min-width: 1600px) { .iv-zoom-modal { zoom: 0.9; } }
    @media (min-width: 1920px) { .iv-zoom-modal { zoom: 1; } }
    @media (max-width: 768px) {
      .iv-zoom-modal { zoom: 1; }
      .iv-zoom-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
      .iv-zoom-modal .modal-dialog-scrollable { height: calc(100% - 1.5rem); }
    }

    /* Big modals (submit / view) */
    .rm-modal { max-width: 680px; }
    .rm-modal.lg { max-width: 940px; }
    .rm-modal .modal-content, .cm-modal .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    .rm-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: 1px solid #eef0f3 !important; background: linear-gradient(180deg, color-mix(in srgb, var(--c, #ffc107) 8%, #fff) 0%, #fff 100%); }
    .rm-head-main { display: flex; gap: 0.9rem; align-items: center; min-width: 0; flex: 1; }
    .rm-head-ic { width: 48px; height: 48px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #b88a00; background: rgba(255,193,7,0.18); }
    .rm-head-ic img { width: 30px; height: 30px; object-fit: contain; }
    .rm-kicker { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #b88a00; }
    .rm-title { font-size: 1.2rem; font-weight: 700; color: #1f2328; margin: 0; line-height: 1.3; word-break: break-word; }
    .rm-head-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .rm-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.3rem; }
    .rm-num { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; font-weight: 600; color: #6b7280; margin-top: 0.15rem; }
    .rm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .rm-req { color: #dc3545; }
    .rm-body { padding: 1.4rem 1.5rem !important; }
    .rm-section { margin-bottom: 1.4rem; }
    .rm-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.75rem; }
    .rm-section-title > i { color: #e0a800; font-size: 0.8rem; }
    .rm-count { margin-left: auto; font-size: 0.7rem; background: #f3f4f6; color: #4b5563; padding: 0.1rem 0.55rem; border-radius: 999px; letter-spacing: 0; }
    .rm-label { font-size: 0.84rem; font-weight: 600; color: #374151; margin-bottom: 0.35rem; }
    .rm-input { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .rm-input:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .rm-input.good { border-color: #10b981 !important; }
    .rm-input.bad { border-color: #ef4444 !important; }
    .rm-hint { font-size: 0.78rem; color: #6b7280; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem; }
    .rm-hint.bad { color: #dc3545; }
    .rm-readonly { display: flex; align-items: center; gap: 0.55rem; min-height: 44px; padding: 0.6rem 0.8rem; border-radius: 10px; border: 1.5px dashed #e5e7eb; background: #f8f9fa; font-size: 0.92rem; font-weight: 600; color: #1f2328; }
    .rm-readonly i { color: #9ca3af; }
    .rm-readonly.empty { font-weight: 500; font-style: italic; color: #9ca3af; }
    .rm-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
    .rm-type { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.9rem 0.5rem; border: 1.5px solid #e5e7eb; border-radius: 14px; background: #fff; transition: all 0.15s ease; }
    .rm-type:hover:not(:disabled) { border-color: color-mix(in srgb, var(--c) 50%, #fff); }
    .rm-type.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 6%, #fff); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 15%, transparent); }
    .rm-type-ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .rm-type-ic img { width: 30px; height: 30px; object-fit: contain; }
    .rm-type-label { font-weight: 700; font-size: 0.86rem; color: #374151; text-align: center; line-height: 1.2; }
    .rm-type.on .rm-type-label { color: var(--c); }
    .rm-type-check { position: absolute; top: 7px; right: 8px; color: var(--c); font-size: 0.85rem; }
    .rm-map { border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .rm-pin { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.55rem; padding: 0.55rem 0.75rem; border-radius: 10px; background: #f8f9fa; color: #6b7280; font-size: 0.8rem; }
    .rm-pin.ok { background: rgba(25,135,84,0.07); color: #146c43; border: 1px solid rgba(25,135,84,0.2); }
    .rm-pin .rm-mono { margin-left: 0.3rem; opacity: 0.85; }
    .rm-pin button { margin-left: auto; border: none; background: none; color: #dc3545; font-size: 0.78rem; font-weight: 600; padding: 0; display: inline-flex; align-items: center; gap: 0.3rem; }
    .rm-photos { display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .rm-thumb { position: relative; width: 96px; height: 96px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; background: #f8f9fa; padding: 0; flex-shrink: 0; }
    .rm-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .rm-thumb > button { position: absolute; top: 5px; right: 5px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(17,24,39,0.7); color: #fff; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; }
    .rm-thumb.view { cursor: zoom-in; transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .rm-thumb.view:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
    .rm-thumb-zoom { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0); color: transparent; transition: all 0.15s ease; }
    .rm-thumb.view:hover .rm-thumb-zoom { background: rgba(0,0,0,0.3); color: #fff; }
    .rm-thumb.broken::after { content: 'No preview'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #9ca3af; }
    .rm-thumb.sm { width: 64px; height: 64px; border-radius: 10px; }
    .rm-drop { width: 96px; height: 96px; border-radius: 12px; border: 1.5px dashed #d1d5db; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; color: #6b7280; font-size: 0.78rem; font-weight: 600; cursor: pointer; margin: 0; transition: all 0.15s ease; }
    .rm-drop i { font-size: 1rem; color: #e0a800; }
    .rm-drop:hover { border-color: #ffc107; background: #fffaeb; color: #1f2328; }
    .rm-drop.disabled { opacity: 0.5; pointer-events: none; }
    .rm-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .rm-info { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.7rem 0.8rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .rm-info.wide { grid-column: 1 / -1; }
    .rm-info-ic { width: 30px; height: 30px; border-radius: 9px; background: #fff; border: 1px solid #eef0f3; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .rm-info-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .rm-info-value { font-size: 0.9rem; font-weight: 600; color: #1f2328; word-break: break-word; }
    .rm-desc { font-size: 0.92rem; color: #374151; line-height: 1.6; margin: 0; white-space: pre-line; word-break: break-word; }
    .rm-desc.sm { font-size: 0.86rem; padding: 0.65rem 0.8rem; border: 1px solid #eef0f3; border-radius: 10px; background: #fafbfc; }
    .rm-desc.muted { color: #9ca3af; font-style: italic; }
    .rm-admin { margin-top: 1rem; padding: 0.85rem 1rem; border-radius: 12px; background: rgba(13,110,253,0.05); border: 1px solid rgba(13,110,253,0.18); }
    .rm-admin-head { font-size: 0.78rem; font-weight: 700; color: #0a58ca; display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.3rem; }
    .rm-admin p { margin: 0; font-size: 0.88rem; color: #374151; white-space: pre-line; }
    .rm-map.view { min-height: 260px; }
    .rm-empty { padding: 1.25rem; border: 1px dashed #e5e7eb; border-radius: 12px; color: #9ca3af; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
    .rm-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.86rem; margin-bottom: 1rem; }
    .rm-alert i { margin-top: 3px; }
    .rm-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #b02a37; }
    .rm-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; align-items: center; gap: 0.6rem; }
    .rm-lightbox { position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .rm-lightbox img { max-width: 92vw; max-height: 86vh; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); transition: transform 0.1s ease; }
    .rm-lb-btn { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: #fff; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .rm-lb-btn.close { top: 1.25rem; right: 1.25rem; }
    .rm-lb-btn.prev { left: 1rem; top: 50%; transform: translateY(-50%); }
    .rm-lb-btn.next { right: 1rem; top: 50%; transform: translateY(-50%); }
    .rm-lb-count { position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.75); font-size: 0.8rem; font-weight: 600; }

    /* Small confirmation modals (withdraw / verify / review) */
    .cm-modal { max-width: 430px; }
    .cm-modal.wide { max-width: 520px; }
    @keyframes cmPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    .cm-body { padding: 1.75rem 1.6rem 1.25rem !important; text-align: center; position: relative; }
    .cm-x { position: absolute; top: 1rem; right: 1rem; }
    .cm-icon { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); animation: cmPop 0.4s ease-out; }
    .cm-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; }
    .cm-text { font-size: 0.88rem; color: #6b7280; margin-bottom: 1.1rem; line-height: 1.55; }
    .cm-item { display: flex; align-items: center; gap: 0.7rem; text-align: left; padding: 0.7rem 0.85rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .cm-item-av { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-item-av img { width: 26px; height: 26px; object-fit: contain; }
    .cm-item-name { font-weight: 700; color: #1f2328; font-size: 0.94rem; }
    .cm-item-meta { font-size: 0.76rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cm-note { display: flex; gap: 0.5rem; align-items: flex-start; text-align: left; margin-top: 0.8rem; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.8rem; line-height: 1.5; color: color-mix(in srgb, var(--c) 80%, #000); background: color-mix(in srgb, var(--c) 7%, #fff); border: 1px solid color-mix(in srgb, var(--c) 22%, #fff); }
    .cm-note i { margin-top: 3px; }
    .cm-steps { text-align: left; display: flex; flex-direction: column; gap: 0.45rem; }
    .cm-step { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; border: 1px solid #eef0f3; border-radius: 10px; background: #fafbfc; font-size: 0.86rem; color: #374151; font-weight: 500; }
    .cm-step span { width: 22px; height: 22px; border-radius: 50%; background: #ffc107; color: #1f2328; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-step i { color: #b88a00; width: 16px; text-align: center; }
    .cm-foot { border-top: 1px solid #eef0f3 !important; padding: 0.9rem 1.4rem !important; gap: 0.6rem; flex-wrap: nowrap !important; }
    .cm-foot .iv-btn { flex: 1; margin: 0; padding: 0.62rem; }
    .cm-confirm { background: var(--c); color: #fff; }
    .cm-confirm:hover:not(:disabled) { background: color-mix(in srgb, var(--c) 85%, #000); color: #fff; }

    @media (max-width: 991.98px) {
      .rm-types { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .rm-head { padding: 1rem !important; }
      .rm-head-ic { width: 42px; height: 42px; }
      .rm-title { font-size: 1.08rem; }
      .rm-body { padding: 1rem !important; }
      .rm-type { flex-direction: row; justify-content: flex-start; padding: 0.65rem 0.7rem; gap: 0.55rem; }
      .rm-type-ic { width: 36px; height: 36px; border-radius: 10px; }
      .rm-type-ic img { width: 22px; height: 22px; }
      .rm-type-label { text-align: left; font-size: 0.82rem; }
      .rm-thumb, .rm-drop { width: 84px; height: 84px; }
      .rm-info { padding: 0.6rem 0.65rem; gap: 0.5rem; }
      .rm-info-ic { display: none; }
      .rm-info-value { font-size: 0.86rem; }
      .rm-foot { padding: 0.75rem 1rem !important; }
      .rm-foot .iv-btn { flex: 1; }
      .rm-foot .me-auto { margin-right: 0 !important; }
      .cm-body { padding: 1.5rem 1.1rem 1rem !important; }
      .cm-foot { padding: 0.8rem 1rem !important; }
    }
    @media (max-width: 380px) {
      .rm-info-grid { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) { .cm-icon { animation: none; } }

    /* Inventory modal extras */
    .iv-backdrop-top { z-index: 1060 !important; }
    .rm-modal.sm { max-width: 560px; }
    .rm-types { grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); }
    .rm-type-ic { font-size: 1.05rem; }
    .rm-opt { font-size: 0.7rem; font-weight: 600; text-transform: none; letter-spacing: 0; color: #9ca3af; }
    .rm-input.sm { padding: 0.35rem 0.55rem !important; font-size: 0.84rem; border-radius: 8px !important; }
    select.rm-input { padding-right: 2rem !important; }
    .rm-suffix { position: relative; }
    .rm-suffix .rm-input { padding-right: 4.2rem !important; }
    .rm-suffix > span { position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; font-weight: 600; color: #9ca3af; pointer-events: none; }
    .rm-alert.warn { background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.35); color: #8a6700; }
    .cm-item-av { font-size: 1rem; }

    .iv-btn.sm { padding: 0.35rem 0.7rem; font-size: 0.8rem; border-radius: 8px; }
    .iv-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
    .iv-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; }
    .iv-btn.ghost:hover:not(:disabled) { background: #fff8e1; border-color: #ffc107; }
    .iv-btn.success { background: #198754; color: #fff; }
    .iv-btn.success:hover:not(:disabled) { background: #157347; box-shadow: 0 6px 16px rgba(25,135,84,0.25); }
    .iv-btn.info { background: #0d6efd; color: #fff; }
    .iv-btn.info:hover:not(:disabled) { background: #0b5ed7; }
    .iv-btn.info-outline { background: #fff; color: #0d6efd; border-color: rgba(13,110,253,0.35); }
    .iv-btn.info-outline:hover:not(:disabled) { background: rgba(13,110,253,0.06); }
    .iv-icon-btn.danger { color: #dc3545; }
    .iv-icon-btn.danger:hover { background: #fff5f5; border-color: rgba(220,53,69,0.25); color: #dc3545; }
    .iv-icon-btn:disabled { opacity: 0.5; }

    .rs-flow { display: flex; align-items: stretch; gap: 0.6rem; margin-bottom: 1.25rem; }
    .rs-box { flex: 1; padding: 0.75rem 0.9rem; border-radius: 12px; background: #fafbfc; border: 1px solid #eef0f3; }
    .rs-box .k { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .rs-box .v { font-size: 1.35rem; font-weight: 800; color: #1f2328; font-variant-numeric: tabular-nums; }
    .rs-box .v span { font-size: 0.78rem; font-weight: 600; color: #9ca3af; }
    .rs-box .v.out { color: #dc3545; }
    .rs-box.after { background: rgba(25,135,84,0.06); border-color: rgba(25,135,84,0.2); }
    .rs-box.after .v { color: #198754; }
    .rs-arrow { display: flex; align-items: center; color: #c4c9d0; }

    .ib-sum { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; margin-bottom: 1rem; }
    .ib-sum > div { padding: 0.65rem 0.85rem; border-radius: 12px; background: #fafbfc; border: 1px solid #eef0f3; display: flex; flex-direction: column; }
    .ib-sum .k { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .ib-sum .v { font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .ib-sum .v small { font-size: 0.75rem; color: #9ca3af; font-weight: 600; }
    .ib-sum .bad { background: rgba(220,53,69,0.05); border-color: rgba(220,53,69,0.2); }
    .ib-sum .bad .v { color: #dc3545; }
    .ib-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 1px solid #eef0f3; border-radius: 12px; overflow: hidden; }
    .ib-table th { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.7rem 0.8rem; background: #fafbfc; border-bottom: 1px solid #eef0f3; text-align: left; white-space: nowrap; }
    .ib-table td { padding: 0.7rem 0.8rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .ib-table tbody tr:last-child td { border-bottom: none; }
    .ib-table tbody tr:hover { background: #fafbfc; }
    .ib-table tr.editing { background: rgba(13,110,253,0.04) !important; }
    .ib-table tr.expired td:first-child { box-shadow: inset 3px 0 0 #dc3545; }
    .ib-notes { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ib-actions { text-align: right; white-space: nowrap; }
    .ib-actions > * + * { margin-left: 0.25rem; }

    .iv-meter { padding: 1rem 1.1rem; border-radius: 14px; background: #fafbfc; border: 1px solid #eef0f3; }
    .iv-meter-v { font-size: 1.8rem; font-weight: 800; color: #198754; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .iv-meter-v.low { color: #b88a00; }
    .iv-meter-v.out { color: #dc3545; }
    .iv-meter-v span { font-size: 0.85rem; font-weight: 600; color: #9ca3af; }

    @media (max-width: 576px) {
      .ib-sum { gap: 0.4rem; }
      .ib-sum > div { padding: 0.55rem 0.6rem; }
      .ib-sum .v { font-size: 1.05rem; }
      .ib-table, .ib-table tbody, .ib-table tr, .ib-table td { display: block; width: 100%; }
      .ib-table { border: none; border-radius: 0; overflow: visible; }
      .ib-table thead { display: none; }
      .ib-table tbody tr { position: relative; border: 1px solid #eef0f3; border-radius: 12px; padding: 0.6rem 0.75rem; margin-bottom: 0.6rem; background: #fff; }
      .ib-table tr.expired { border-color: rgba(220,53,69,0.3); }
      .ib-table tr.expired td:first-child { box-shadow: none; }
      .ib-table td { border: none; padding: 0.25rem 0; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
      .ib-table td[data-label]::before { content: attr(data-label); font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; flex-shrink: 0; }
      .ib-table td[data-label] > * { min-width: 0; text-align: right; }
      .ib-table td[data-label] .rm-input { max-width: 60%; text-align: left; }
      .ib-table td:first-child { padding-right: 5.5rem; }
      .ib-actions { position: absolute; top: 0.5rem; right: 0.6rem; width: auto !important; padding: 0 !important; }
      .ib-table tr.editing .ib-actions { position: static; justify-content: flex-end; padding-top: 0.4rem !important; }
      .ib-table tr.editing td:first-child { padding-right: 0; }
      .rs-box { padding: 0.6rem 0.7rem; }
      .rs-box .v { font-size: 1.15rem; }
    }
    @media (max-width: 400px) {
      .rm-types { grid-template-columns: 1fr 1fr; }
    }
    /* Page: stock table fits phones (status / last restocked are hidden) */
    @media (max-width: 576px) {
      .iv-table { table-layout: fixed; }
      .iv-table th:nth-child(1) { width: 38% !important; }
      .iv-table th:nth-child(2) { width: 26% !important; }
      .iv-table th:nth-child(3) { width: auto !important; }
      .iv-table th:last-child { width: 40px !important; }
      .iv-table th, .iv-table td { padding-left: 0.3rem !important; padding-right: 0.3rem !important; }
      .iv-ellipsis { max-width: 100%; }
      .iv-type-ic { width: 28px; height: 28px; font-size: 0.72rem; }
      .iv-min-unit { display: none; }
      .iv-min-input { width: 40px !important; }
      .iv-min-input { -moz-appearance: textfield; padding: 0.2rem 0.1rem !important; }
      .iv-min-input::-webkit-inner-spin-button, .iv-min-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      .iv-table th { white-space: normal !important; line-height: 1.25; font-size: 0.62rem !important; vertical-align: bottom; }
      .iv-stock strong { font-size: 0.92rem; }
      .iv-bar { max-width: 100%; }
    }
    /* Page: keep the type tabs inside the screen on phones */
    .iv-toolbar > .iv-tabs { min-width: 0; }
    @media (max-width: 768px) {
      .iv-toolbar { padding: 0.85rem 0.85rem 0.85rem; }
      .iv-toolbar > .iv-tabs { flex: 1 1 100%; scrollbar-width: none; }
      .iv-toolbar > .iv-tabs::-webkit-scrollbar { display: none; }
      .iv-toolbar > .iv-btn { width: 100%; }
      .iv-toolbar .iv-btn span { display: inline; }
      .iv-filters { padding-left: 0.85rem; padding-right: 0.85rem; }
      .cinv-page { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
    }

  `;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      {success && (
        <div className="iv-toast" role="status" aria-live="polite">
          <div className="ic"><i className="fas fa-check" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t">Success</div>
            <div className="d">{success}</div>
          </div>
          <button type="button" className="iv-toast-close" onClick={() => setSuccess('')} aria-label="Dismiss">
            <i className="fas fa-times" />
          </button>
        </div>
      )}
      <Container fluid className="py-4 cinv-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* Header */}
        <div className="mb-4 iv-anim">
          <h2 className="iv-title cinv-title">Clinic Inventory</h2>
          <p className="iv-sub cinv-subtitle">Manage vaccines, dewormers, medicines and equipment, and their batches.</p>
        </div>

        {error && (
          <div className="rm-alert danger" role="alert">
            <i className="fas fa-exclamation-circle" /><span className="flex-grow-1">{error}</span>
            <button type="button" className="iv-toast-close" onClick={() => setError('')} aria-label="Dismiss"><i className="fas fa-times" /></button>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <Row className="mb-4 g-3" style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          {[
            { label: 'Total Items',  value: totalItems,    color: '#ffc107', bg: 'rgba(255,193,7,0.1)',   icon: 'fa-boxes'               },
            { label: 'Total Stock',  value: totalStock,    color: '#0d6efd', bg: 'rgba(13,110,253,0.1)',  icon: 'fa-cubes'               },
            { label: 'Low Stock',    value: lowStockItems, color: '#ffc107', bg: 'rgba(255,193,7,0.1)',   icon: 'fa-exclamation-triangle' },
            { label: 'Out of Stock', value: outOfStock,    color: '#dc3545', bg: 'rgba(220,53,69,0.1)',   icon: 'fa-times-circle'        },
          ].map(s => (
            <Col key={s.label} xs={6} lg={3}>
              <Card className="border-0 h-100"
                style={{ borderRadius: '16px', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${s.bg}`; e.currentTarget.style.borderColor = s.color; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <div style={{ height: '3px', background: s.color }} />
                <Card.Body style={{ padding: '1.25rem' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="cinv-stat-label" style={{ fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '0.4rem' }}>{s.label}</p>
                      <h2 className="cinv-stat-number" style={{ fontSize: '2.4rem', fontWeight: '700', color: '#111', lineHeight: 1, marginBottom: 0, fontVariantNumeric: 'tabular-nums' }}>
                        <AnimatedStatValue value={s.value} loading={loading} />
                      </h2>
                    </div>
                    <div className="cinv-stat-icon" style={{ width: '50px', height: '50px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fas ${s.icon}`} style={{ fontSize: '1.25rem', color: s.color }} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
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
          <div className="iv-filters cinv-filter-row">
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
          <div className="cinv-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
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
                <table className="iv-table cinv-table">
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
                    {pageItems.map((item, i) => {
                      const typeCfg = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.equipment;
                      const status = getStockStatus(item);
                      const stock = parseInt(item.current_stock) || 0;
                      const min = parseInt(item.minimum_stock) || 0;
                      const level = stock === 0 ? 'out' : stock <= min ? 'low' : 'ok';
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
                                    <span className="iv-species" style={{ background: speciesCfg.bg, color: speciesCfg.color }}>{item.species === 'both' ? 'Dogs & cats' : item.species === 'all' ? 'All species' : item.species}</span>
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
                              const res = await clinicInventoryAPI.update(itm.id, { minimum_stock: val });
                              if (res.success) { showSuccess(`Min. threshold updated for ${itm.item_name}.`); loadInventory(); }
                              else setError(handleAPIError(res).message);
                            }} />
                          </td>
                          <td className="mobile-hide-status">
                            <span className="iv-pill" style={{ color: level === 'low' ? '#b88a00' : status.color, background: status.bg }}>
                              <i className={`fas ${status.icon}`} />{status.label}
                            </span>
                          </td>
                          <td className="mobile-hide-restock">
                            {item.last_restocked_at
                              ? <span style={{ fontSize: '0.85rem' }}>{new Date(item.last_restocked_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                                        <div className="iv-menu-sep" />
                                        <button type="button" role="menuitem" className="iv-menu-item danger" onClick={() => { setShowDropdown(null); handleDeleteItem(item); }}>
                                          <i className="fas fa-trash-alt" />{deletingItemId === item.id ? 'Deleting…' : 'Delete item'}
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
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="iv-foot">
              <span className="iv-muted" style={{ fontSize: '0.84rem' }}>
                Showing <strong style={{ color: '#1f2328' }}>{pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)}</strong> of {filtered.length}
              </span>
              <div className="d-flex align-items-center gap-1">
                <button type="button" className="iv-page nav" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                  <i className="fas fa-chevron-left" />
                </button>
                {pagerNumbers.map(n => (
                  <button key={n} type="button" className={`iv-page${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
                ))}
                <button type="button" className="iv-page nav" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* ════════════════════════════════════════
          MODALS
      ════════════════════════════════════════ */}

      {/* ======================== ADD ITEM MODAL ======================== */}
      <Modal show={showAddModal} onHide={() => !addLoading && setShowAddModal(false)} centered dialogClassName="rm-modal sm" className="iv-zoom-modal" scrollable>
        <Modal.Header closeButton className="rm-head">
          <div className="rm-head-main">
            <div className="rm-head-ic"><i className="fas fa-box-open" /></div>
            <div style={{ minWidth: 0 }}>
              <div className="rm-kicker">Inventory</div>
              <Modal.Title as="h5" className="rm-title">Add new item</Modal.Title>
              <div className="rm-head-sub">Add stock to it later as batches.</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="rm-body">
          <div className="rm-section">
            <div className="rm-section-title"><i className="fas fa-tag" />Item type <span className="rm-req">*</span></div>
            <div className="rm-types">
              {Object.entries(TYPE_CONFIG)
                .filter(([k]) => k !== 'microchip' || !inventory.some(i => i.item_type === 'microchip'))
                .map(([k, cfg]) => {
                  const on = addForm.item_type === k;
                  return (
                    <button key={k} type="button" disabled={addLoading}
                      className={`rm-type${on ? ' on' : ''}`} style={{ '--c': cfg.color }}
                      onClick={() => {
                        const typeUnitMap = { vaccination: 'doses', deworming: 'tablets', medicine: 'mg', microchip: 'pcs', equipment: 'pcs' };
                        setAddForm(f => ({ ...f, item_type: k, unit: typeUnitMap[k] || 'pcs' }));
                      }}
                      aria-pressed={on}>
                      {on && <i className="fas fa-check-circle rm-type-check" />}
                      <span className="rm-type-ic" style={{ background: cfg.bg, color: cfg.color }}><i className={`fas ${cfg.icon}`} /></span>
                      <span className="rm-type-label">{cfg.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="rm-section mb-0">
            <div className="rm-section-title"><i className="fas fa-info-circle" />Item details</div>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label className="rm-label">Item name <span className="rm-req">*</span></Form.Label>
                <Form.Control className="rm-input" value={addForm.item_name} onChange={e => setAddForm(f => ({ ...f, item_name: e.target.value }))}
                  placeholder="e.g. Drontal Plus Dog" disabled={addLoading} />
              </Col>
              <Col xs={6}>
                <Form.Label className="rm-label">Species</Form.Label>
                <Form.Select className="rm-input" value={addForm.species} onChange={e => setAddForm(f => ({ ...f, species: e.target.value }))} disabled={addLoading}>
                  <option value="all">All</option>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </Form.Select>
              </Col>
              <Col xs={6}>
                <Form.Label className="rm-label">Unit</Form.Label>
                <Form.Select className="rm-input" value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} disabled={addLoading}>
                  {['doses', 'pcs', 'mg', 'ml', 'tablets', 'capsules', 'vials', 'sachets', 'bottles', 'boxes'].map(u => <option key={u} value={u}>{u}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12}>
                <Form.Label className="rm-label">Low-stock alert at</Form.Label>
                <div className="rm-suffix">
                  <Form.Control className="rm-input" type="number" min="0" value={addForm.minimum_stock}
                    onChange={e => setAddForm(f => ({ ...f, minimum_stock: e.target.value }))} disabled={addLoading} />
                  <span>{addForm.unit}</span>
                </div>
                <div className="rm-hint"><i className="fas fa-bell" />The item is marked Low Stock when it reaches this amount.</div>
              </Col>
              <Col xs={12}>
                <Form.Label className="rm-label">Notes <span className="rm-opt">optional</span></Form.Label>
                <Form.Control className="rm-input" as="textarea" rows={2} value={addForm.notes}
                  onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Brand, supplier, storage notes…" style={{ resize: 'none' }} disabled={addLoading} />
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer className="rm-foot">
          <button type="button" className="iv-btn ghost lg" onClick={() => setShowAddModal(false)} disabled={addLoading}>Cancel</button>
          <button type="button" className="iv-btn primary lg" onClick={handleAdd} disabled={addLoading || !addForm.item_name.trim()}>
            {addLoading ? <><i className="fas fa-circle-notch fa-spin" />Adding…</> : <><i className="fas fa-plus" />Add item</>}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ======================== ADD STOCK (RESTOCK) MODAL ======================== */}
      <Modal show={showRestockModal} onHide={() => !restockLoading && setShowRestockModal(false)} centered dialogClassName="rm-modal sm" className="iv-zoom-modal" scrollable>
        {restockItem && (() => {
          const cfg = TYPE_CONFIG[restockItem.item_type] || TYPE_CONFIG.equipment;
          const max = getMaxBatchQty(restockItem);
          const qty = parseInt(restockQty || 0);
          const over = qty > max;
          const current = parseInt(restockItem.current_stock || 0);
          return (
            <>
              <Modal.Header closeButton className="rm-head" style={{ '--c': '#198754' }}>
                <div className="rm-head-main">
                  <div className="rm-head-ic" style={{ background: cfg.bg, color: cfg.color }}><i className={`fas ${cfg.icon}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="rm-kicker" style={{ color: '#198754' }}>Add stock</div>
                    <Modal.Title as="h5" className="rm-title">{restockItem.item_name}</Modal.Title>
                    <div className="rm-head-sub">{cfg.label} · each delivery is saved as a batch</div>
                  </div>
                </div>
              </Modal.Header>
              <Modal.Body className="rm-body">
                <div className="rs-flow">
                  <div className="rs-box">
                    <div className="k">Current</div>
                    <div className={`v${current === 0 ? ' out' : ''}`}>{current} <span>{restockItem.unit}</span></div>
                  </div>
                  <div className="rs-arrow"><i className="fas fa-arrow-right" /></div>
                  <div className="rs-box after">
                    <div className="k">After adding</div>
                    <div className="v">{current + (over ? 0 : qty)} <span>{restockItem.unit}</span></div>
                  </div>
                </div>

                <Row className="g-3">
                  <Col xs={6}>
                    <Form.Label className="rm-label">Batch no. <span className="rm-req">*</span></Form.Label>
                    <Form.Control className={`rm-input rm-mono${batchNoError ? ' bad' : ''}`} value={restockBatchNo}
                      onChange={e => { setRestockBatchNo(e.target.value); setBatchNoError(''); }}
                      placeholder="BCH-2026-001" disabled={restockLoading} />
                    {batchNoError && <div className="rm-hint bad"><i className="fas fa-times-circle" />{batchNoError}</div>}
                  </Col>
                  <Col xs={6}>
                    <Form.Label className="rm-label">Quantity <span className="rm-req">*</span></Form.Label>
                    <div className="rm-suffix">
                      <Form.Control className={`rm-input${over ? ' bad' : ''}`} type="number" min="1" max={max} value={restockQty}
                        onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                        onChange={e => setRestockQty(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="0" disabled={restockLoading} />
                      <span>{restockItem.unit}</span>
                    </div>
                    <div className={`rm-hint${over ? ' bad' : ''}`}>{over ? 'Max' : 'Up to'} {max.toLocaleString()} per batch</div>
                  </Col>
                  {!['microchip', 'equipment'].includes(restockItem.item_type) && (
                    <Col xs={12}>
                      <Form.Label className="rm-label">Expiration date</Form.Label>
                      <Form.Control className="rm-input" type="date" value={restockExpDate} onChange={e => setRestockExpDate(e.target.value)} disabled={restockLoading} />
                    </Col>
                  )}
                  <Col xs={12}>
                    <Form.Label className="rm-label">Notes <span className="rm-opt">optional</span></Form.Label>
                    <Form.Control className="rm-input" as="textarea" rows={2} value={restockNotes}
                      onChange={e => setRestockNotes(e.target.value)}
                      placeholder="Supplier, delivery details…" style={{ resize: 'none' }} disabled={restockLoading} />
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer className="rm-foot">
                <button type="button" className="iv-btn ghost lg" onClick={() => setShowRestockModal(false)} disabled={restockLoading}>Cancel</button>
                <button type="button" className="iv-btn success lg" onClick={handleRestock}
                  disabled={restockLoading || !restockQty || qty <= 0 || over || !restockBatchNo.trim()}>
                  {restockLoading ? <><i className="fas fa-circle-notch fa-spin" />Adding…</> : <><i className="fas fa-plus" />Add stock</>}
                </button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* ======================== BATCHES MODAL ======================== */}
      <Modal show={showBatchModal} onHide={() => { if (!editBatchSaving) { setShowBatchModal(false); setEditingBatch(null); } }} dialogClassName="rm-modal lg" className="iv-zoom-modal" scrollable>
        {(() => {
          const cfg = TYPE_CONFIG[batchItem?.item_type] || TYPE_CONFIG.equipment;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const expiredCount = batches.filter(b => b.expiration_date && new Date(b.expiration_date) < today && parseInt(b.quantity) > 0).length;
          const total = batches.reduce((s, b) => s + parseInt(b.quantity || 0), 0);
          const fmt = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <>
              <Modal.Header closeButton className="rm-head" style={{ '--c': '#0d6efd' }}>
                <div className="rm-head-main">
                  <div className="rm-head-ic" style={{ background: 'rgba(13,110,253,0.1)', color: '#0d6efd' }}><i className="fas fa-layer-group" /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="rm-kicker" style={{ color: '#0d6efd' }}>Batches</div>
                    <Modal.Title as="h5" className="rm-title">{batchItem?.item_name}</Modal.Title>
                    <div className="rm-head-sub">{cfg.label} · each restock is tracked by batch number and expiry</div>
                  </div>
                </div>
              </Modal.Header>
              <Modal.Body className="rm-body">
                {error && <div className="rm-alert danger"><i className="fas fa-exclamation-circle" /><span>{error}</span></div>}
                {!batchesLoading && batches.length > 0 && (
                  <div className="ib-sum">
                    <div><span className="k">Batches</span><span className="v">{batches.length}</span></div>
                    <div><span className="k">Total stock</span><span className="v">{total} <small>{batchItem?.unit}</small></span></div>
                    <div className={expiredCount ? 'bad' : ''}><span className="k">Expired</span><span className="v">{expiredCount}</span></div>
                  </div>
                )}

                {expiredCount > 0 && !batchesLoading && (
                  <div className="rm-alert danger">
                    <i className="fas fa-exclamation-triangle" />
                    <span>{expiredCount} expired batch{expiredCount !== 1 ? 'es' : ''} still in stock. Review and remove expired stock.</span>
                  </div>
                )}

                {batchesLoading ? (
                  <div className="ib-list">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.9rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.2 }}>
                        <div className="iv-skel" style={{ width: '22%', height: 14 }} />
                        <div className="iv-skel" style={{ width: '14%', height: 14 }} />
                        <div className="iv-skel" style={{ width: '18%', height: 14 }} />
                        <div className="iv-skel flex-grow-1" style={{ height: 14 }} />
                      </div>
                    ))}
                  </div>
                ) : batches.length === 0 ? (
                  <div className="iv-empty" style={{ padding: '2rem 1rem' }}>
                    <div className="ic"><i className="fas fa-box-open" /></div>
                    <h6>No batches yet</h6>
                    <p className="mb-0">Use "Add stock" to record the first delivery.</p>
                  </div>
                ) : (
                  <table className="ib-table">
                    <thead>
                      <tr>
                        <th style={{ width: '24%' }}>Batch no.</th>
                        <th style={{ width: '16%' }}>Quantity</th>
                        <th style={{ width: '20%' }}>Expires</th>
                        <th>Notes</th>
                        <th style={{ width: 96 }} aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map(batch => {
                        const isEditing = editingBatch?.id === batch.id;
                        const isExpired = batch.expiration_date && new Date(batch.expiration_date) < today;
                        const overQty = isEditing && parseInt(editingBatch.quantity) > getMaxBatchQty(batchItem);
                        return (
                          <tr key={batch.id} className={`${isEditing ? 'editing' : ''}${isExpired ? ' expired' : ''}`}>
                            <td data-label="Batch no.">
                              {isEditing ? (
                                <Form.Control size="sm" className="rm-input sm rm-mono" value={editingBatch.batch_no}
                                  onChange={e => setEditingBatch(b => ({ ...b, batch_no: e.target.value }))} />
                              ) : <span className="iv-mono iv-strong">{batch.batch_no}</span>}
                            </td>
                            <td data-label="Quantity">
                              {isEditing ? (
                                <Form.Control size="sm" className={`rm-input sm${overQty ? ' bad' : ''}`} type="number" min="0" max={getMaxBatchQty(batchItem)} value={editingBatch.quantity}
                                  onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                                  onChange={e => setEditingBatch(b => ({ ...b, quantity: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                                  title={`Max ${getMaxBatchQty(batchItem)} per batch`} />
                              ) : <span className="iv-strong">{batch.quantity} <span className="iv-muted">{batch.unit || batchItem?.unit}</span></span>}
                            </td>
                            <td data-label="Expires">
                              {isEditing ? (
                                <Form.Control size="sm" className="rm-input sm" type="date" value={editingBatch.expiration_date || ''}
                                  onChange={e => setEditingBatch(b => ({ ...b, expiration_date: e.target.value }))} />
                              ) : batch.expiration_date ? (
                                isExpired
                                  ? <span className="iv-pill" style={{ color: '#dc3545', background: 'rgba(220,53,69,0.1)' }}><i className="fas fa-exclamation-triangle" />{fmt(batch.expiration_date)}</span>
                                  : <span>{fmt(batch.expiration_date)}</span>
                              ) : <span className="iv-muted">—</span>}
                            </td>
                            <td data-label="Notes">
                              {isEditing ? (
                                <Form.Control size="sm" className="rm-input sm" value={editingBatch.notes || ''} placeholder="Notes"
                                  onChange={e => setEditingBatch(b => ({ ...b, notes: e.target.value }))} />
                              ) : <span className="iv-muted ib-notes" title={batch.notes || ''}>{batch.notes || '—'}</span>}
                            </td>
                            <td className="ib-actions">
                              {isEditing ? (
                                <>
                                  <button type="button" className="iv-btn info sm" onClick={handleSaveBatch} disabled={editBatchSaving}>
                                    {editBatchSaving ? <i className="fas fa-circle-notch fa-spin" /> : <><i className="fas fa-check" />Save</>}
                                  </button>
                                  <button type="button" className="iv-icon-btn" onClick={() => setEditingBatch(null)} aria-label="Cancel edit"><i className="fas fa-times" /></button>
                                </>
                              ) : (
                                <>
                                  <button type="button" className="iv-icon-btn" onClick={() => setEditingBatch({ ...batch })} aria-label={`Edit batch ${batch.batch_no}`} title="Edit">
                                    <i className="fas fa-pen" />
                                  </button>
                                  <button type="button" className="iv-icon-btn danger" onClick={() => handleDeleteBatch(batch.id)} disabled={deletingBatchId === batch.id} aria-label={`Delete batch ${batch.batch_no}`} title="Delete">
                                    {deletingBatchId === batch.id ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-trash-alt" />}
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Modal.Body>
              <Modal.Footer className="rm-foot">
                <button type="button" className="iv-btn success lg me-auto" onClick={() => { setShowBatchModal(false); setEditingBatch(null); handleOpenRestock(batchItem); }} disabled={!batchItem}>
                  <i className="fas fa-plus" />Add stock
                </button>
                <button type="button" className="iv-btn ghost lg" onClick={() => { setShowBatchModal(false); setEditingBatch(null); }}>Close</button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* ======================== VIEW DETAILS MODAL ======================== */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} dialogClassName="rm-modal" className="iv-zoom-modal" scrollable>
        {viewItem && (() => {
          const cfg = TYPE_CONFIG[viewItem.item_type] || TYPE_CONFIG.equipment;

          const stock = parseInt(viewItem.current_stock) || 0;
          const min = parseInt(viewItem.minimum_stock) || 0;
          const level = stock === 0 ? 'out' : stock <= min ? 'low' : 'ok';
          const barPct = Math.min(100, (stock / Math.max(min * 2, 20)) * 100);
          const speciesCfg = viewItem.species ? (SPECIES_COLORS[viewItem.species] || null) : null;
          const expired = expiredBatchMap[viewItem.id] || 0;

          return (
            <>
              <Modal.Header closeButton className="rm-head" style={{ '--c': cfg.color }}>
                <div className="rm-head-main">
                  <div className="rm-head-ic" style={{ background: cfg.bg, color: cfg.color }}><i className={`fas ${cfg.icon}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    
                    <Modal.Title as="h5" className="rm-title">{viewItem.item_name}</Modal.Title>
                    <div className="rm-head-sub">
                      <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                      {speciesCfg && <> · {viewItem.species === 'both' ? 'Dogs & cats' : viewItem.species === 'all' ? 'All species' : viewItem.species}</>}
                    </div>
                  </div>
                </div>
              </Modal.Header>
              <Modal.Body className="rm-body">
                <div className="iv-meter">
                  <div className="d-flex align-items-end justify-content-between gap-2">
                    <div>
                      <div className="rm-info-label">Current stock</div>
                      <div className={`iv-meter-v ${level}`}>{stock} <span>{viewItem.unit}</span></div>
                    </div>
                    <div className="text-end">
                      <div className="rm-info-label">Low-stock alert at</div>
                      <div className="iv-strong">{min} {viewItem.unit}</div>
                    </div>
                  </div>
                  <div className="iv-bar" style={{ maxWidth: 'none', height: 8, marginTop: '0.7rem' }}><div className={level} style={{ width: `${barPct}%` }} /></div>
                </div>

                <div className="rm-info-grid mt-3">
                  <div className="rm-info">
                    <div className="rm-info-ic"><i className="fas fa-history" /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="rm-info-label">Last restocked</div>
                      <div className="rm-info-value">{viewItem.last_restocked_at ? new Date(viewItem.last_restocked_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Never'}</div>
                    </div>
                  </div>
                  <div className="rm-info">
                    <div className="rm-info-ic"><i className="fas fa-ruler" /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="rm-info-label">Unit</div>
                      <div className="rm-info-value">{viewItem.unit}</div>
                    </div>
                  </div>
                </div>

                {expired > 0 && (
                  <div className="rm-alert danger mt-3 mb-0">
                    <i className="fas fa-exclamation-triangle" />
                    <span>{expired} expired batch{expired !== 1 ? 'es' : ''} still in stock. Open Batches to review.</span>
                  </div>
                )}

                <div className="rm-section-title mt-4"><i className="fas fa-sticky-note" />Notes</div>
                <p className={`rm-desc${viewItem.notes ? '' : ' muted'}`}>{viewItem.notes || 'No notes added.'}</p>
              </Modal.Body>
              <Modal.Footer className="rm-foot">
                <button type="button" className="iv-btn info-outline lg me-auto" onClick={() => { setShowViewModal(false); handleOpenBatches(viewItem); }}>
                  <i className="fas fa-layer-group" />Batches
                </button>
                <button type="button" className="iv-btn success lg" onClick={() => { setShowViewModal(false); handleOpenRestock(viewItem); }}>
                  <i className="fas fa-plus" />Add stock
                </button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* ======================== DELETE BATCH MODAL ======================== */}
      <Modal show={showDeleteBatchModal} onHide={() => !deleteBatchLoading && setShowDeleteBatchModal(false)} centered dialogClassName="cm-modal" className="iv-zoom-modal" style={{ zIndex: 1065 }} backdropClassName="iv-backdrop-top">
        {batchToDelete && (
          <>
            <Modal.Body className="cm-body">
              <div className="cm-icon" style={{ '--c': '#dc3545' }}><i className="fas fa-trash-alt" /></div>
              <h5 className="cm-title">Delete this batch?</h5>
              <p className="cm-text">Its quantity is deducted from the item's stock automatically.</p>
              <div className="cm-item">
                <div className="cm-item-av" style={{ background: 'rgba(13,110,253,0.1)', color: '#0d6efd' }}><i className="fas fa-layer-group" /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="cm-item-name iv-mono">{batchToDelete.batch_no}</div>
                  <div className="cm-item-meta">
                    {batchToDelete.quantity} {batchItem?.unit}
                    {batchToDelete.expiration_date && <> · Expires {new Date(batchToDelete.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                  </div>
                </div>
              </div>
              <div className="cm-note" style={{ '--c': '#dc3545' }}>
                <i className="fas fa-info-circle" /><span>This cannot be undone.</span>
              </div>
            </Modal.Body>
            <Modal.Footer className="cm-foot">
              <button type="button" className="iv-btn ghost" onClick={() => setShowDeleteBatchModal(false)} disabled={deleteBatchLoading}>Cancel</button>
              <button type="button" className="iv-btn cm-confirm" style={{ '--c': '#dc3545' }} onClick={handleDeleteBatchConfirm} disabled={deleteBatchLoading}>
                {deleteBatchLoading ? <><i className="fas fa-circle-notch fa-spin" />Deleting…</> : <><i className="fas fa-trash-alt" />Delete batch</>}
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* ======================== DELETE ITEM MODAL ======================== */}
      <Modal show={showDeleteItemModal} onHide={() => !deleteItemLoading && setShowDeleteItemModal(false)} centered dialogClassName="cm-modal" className="iv-zoom-modal">
        {itemToDelete && (() => {
          const cfg = TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.equipment;
          return (
            <>
              <Modal.Body className="cm-body">
                <div className="cm-icon" style={{ '--c': '#dc3545' }}><i className="fas fa-trash-alt" /></div>
                <h5 className="cm-title">Delete this item?</h5>
                <p className="cm-text">The item and all of its batches will be removed from your inventory.</p>
                <div className="cm-item">
                  <div className="cm-item-av" style={{ background: cfg.bg, color: cfg.color }}><i className={`fas ${cfg.icon}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="cm-item-name">{itemToDelete.item_name}</div>
                    <div className="cm-item-meta">{cfg.label} · {itemToDelete.current_stock} {itemToDelete.unit} in stock</div>
                  </div>
                </div>
                <div className="cm-note" style={{ '--c': '#dc3545' }}>
                  <i className="fas fa-info-circle" /><span>This cannot be undone.</span>
                </div>
              </Modal.Body>
              <Modal.Footer className="cm-foot">
                <button type="button" className="iv-btn ghost" onClick={() => setShowDeleteItemModal(false)} disabled={deleteItemLoading}>Keep item</button>
                <button type="button" className="iv-btn cm-confirm" style={{ '--c': '#dc3545' }} onClick={handleDeleteItemConfirm} disabled={deleteItemLoading}>
                  {deleteItemLoading ? <><i className="fas fa-circle-notch fa-spin" />Deleting…</> : <><i className="fas fa-trash-alt" />Delete item</>}
                </button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>
    </>
  );
}

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

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    await onSave(item, value === '' ? 0 : value);
    setSaving(false); setDirty(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
      <input className="iv-min-input" type="number" min="0" value={value}
        onChange={e => change(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
        onKeyDown={e => e.key === 'Enter' && save()}
        onFocus={() => { if (value === 0) { setValue(''); setDirty(true); } }}
        onBlur={() => { if (value === '') { setValue(0); setDirty(0 !== parseInt(item.minimum_stock)); } }}
        style={{ width: '52px', textAlign: 'center', padding: '0.2rem 0.25rem', borderRadius: '6px', border: `2px solid ${dirty ? '#ffc107' : '#dee2e6'}`
, fontSize: '0.82rem', fontWeight: '600', color: '#555', outline: 'none', flexShrink: 0 }}
      />
      <span className="iv-min-unit" style={{ fontSize: '0.7rem', color: '#aaa', flexShrink: 0 }}>{item.unit}</span>
      {dirty && (
        <button onClick={save} disabled={saving}
          style={{ width: '20px', height: '20px', borderRadius: '5px', border: 'none', background: '#ffc107', color: '#000', cursor: 'pointer'
, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', padding: 0, flexShrink: 0 }}>
          {saving ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-check" />}
        </button>
      )}
    </div>
  );
}