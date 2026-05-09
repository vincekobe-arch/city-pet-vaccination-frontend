import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Container, Row, Col, Card, Table, Button,
  Modal, Form, Alert, Spinner, InputGroup,
} from 'react-bootstrap';

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
  getAll:      ()         => api.get('/clinic/inventory').then(r => r.data),
  getByType:   (type)     => api.get(`/clinic/inventory/type/${type}`).then(r => r.data),
  getLowStock: ()         => api.get('/clinic/inventory/low-stock').then(r => r.data),
  show:        (id)       => api.get(`/clinic/inventory/show/${id}`).then(r => r.data),
  getBatches:  (id)       => api.get(`/clinic/inventory/batches/${id}`).then(r => r.data),
  create:      (data)     => api.post('/clinic/inventory/create', data).then(r => r.data),
  update:      (id, data) => api.put(`/clinic/inventory/update/${id}`, data).then(r => r.data),
  restock:     (id, data) => api.put(`/clinic/inventory/restock/${id}`, data).then(r => r.data),
  updateBatch: (id, data) => api.put(`/clinic/inventory/batch/update/${id}`, data).then(r => r.data),
  deleteBatch: (id)       => api.delete(`/clinic/inventory/batch/delete/${id}`).then(r => r.data),
  deleteItem:  (id)       => api.delete(`/clinic/inventory/delete/${id}`).then(r => r.data),
};

const handleAPIError = (res) => ({ message: res?.error || res?.message || 'An error occurred.' });

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  vaccination: { label: 'Vaccination', color: '#ffc107', bg: 'rgba(255,193,7,0.12)',   icon: 'fa-syringe' },
  deworming:   { label: 'Deworming',   color: '#20c997', bg: 'rgba(32,201,151,0.12)',  icon: 'fa-pills'   },
  medicine:    { label: 'Medicine',    color: '#e83e8c', bg: 'rgba(232,62,140,0.12)',  icon: 'fa-pills'   },
  equipment:   { label: 'Equipment',   color: '#6c757d', bg: 'rgba(108,117,125,0.12)', icon: 'fa-toolbox' },
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

const TYPE_ORDER = { vaccination: 0, deworming: 1, medicine: 2, equipment: 3 };

const ITEMS_PER_PAGE = 8;
const ZOOM = 0.75;

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
  const [vaccinationTypesList] = useState([]);
  const [dewormingTypesList] = useState([]);

  // ellipsis dropdown
  const [showDropdown, setShowDropdown]   = useState(null);
  const [dropdownPos, setDropdownPos]     = useState({ top: 0, left: 0 });
  const dropdownButtonRef                 = useRef(null);

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

  // ─── Dropdown position tracking ───────────────────────────────────────────
  useEffect(() => {
    if (showDropdown === null) return;
    const updatePos = () => {
      if (!dropdownButtonRef.current) return;
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPos({
        top:  rect.top  / ZOOM + (rect.height / ZOOM) / 2,
        left: (rect.left / ZOOM) - 190,
      });
    };
    window.addEventListener('scroll', updatePos, true);
    return () => window.removeEventListener('scroll', updatePos, true);
  }, [showDropdown]);

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


  const loadInventory = async () => {
  try {
    setLoading(true);
    const res = await clinicInventoryAPI.getAll();
    if (res.success) setInventory(res.inventory || []);
    else setError(res.message || 'Failed to load inventory.');
  } catch (e) {
    setError('Failed to load inventory.');
  } finally {
    setLoading(false);
  }
};

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

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

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const emptyRows  = ITEMS_PER_PAGE - pageItems.length;

  // ─── Restock ──────────────────────────────────────────────────────────────
  const handleOpenRestock = (item) => {
    setRestockItem(item); setRestockQty(''); setRestockBatchNo('');
    setRestockExpDate(''); setRestockNotes(''); setBatchNoError('');
    setShowRestockModal(true);
  };

  const handleRestock = async () => {
    if (!restockQty || parseInt(restockQty) <= 0) { setError('Enter a valid quantity > 0.'); return; }
    if (!restockBatchNo.trim()) { setBatchNoError('Batch number is required.'); return; }
    setBatchNoError('');
    setRestockLoading(true);
    try {
      const res = await clinicInventoryAPI.restock(restockItem.id, {
        quantity:        parseInt(restockQty),
        batch_no:        restockBatchNo.trim(),
        expiration_date: restockExpDate || null,
        notes:           restockNotes || null,
      });
      if (res.success) {
        showSuccess(`Batch "${restockBatchNo}" added to ${restockItem.item_name}.`);
        setShowRestockModal(false); loadInventory();
      } else {
        const msg = handleAPIError(res).message;
        if (msg?.toLowerCase().includes('batch')) setBatchNoError(msg);
        else setError(msg);
      }
    } catch { setError('Failed to restock.'); }
    finally { setRestockLoading(false); }
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
    if (!editingBatch) return;
    if (!editingBatch.batch_no?.trim()) { setError('Batch number cannot be empty.'); return; }
    if (parseInt(editingBatch.quantity) < 0) { setError('Quantity cannot be negative.'); return; }
    setEditBatchSaving(true);
    try {
      const res = await clinicInventoryAPI.updateBatch(editingBatch.id, {
        batch_no:        editingBatch.batch_no.trim(),
        quantity:        parseInt(editingBatch.quantity),
        expiration_date: editingBatch.expiration_date || null,
        notes:           editingBatch.notes || null,
      });
      if (res.success) {
        showSuccess('Batch updated.');
        setEditingBatch(null);
        const r2 = await clinicInventoryAPI.getBatches(batchItem.id);
        setBatches(r2.batches || []);
        loadInventory();
      } else setError(handleAPIError(res).message);
    } catch { setError('Failed to save batch.'); }
    finally { setEditBatchSaving(false); }
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
    if (!batchToDelete) return;
    setDeleteBatchLoading(true);
    try {
      const res = await clinicInventoryAPI.deleteBatch(batchToDelete.id);
      if (res.success) {
        showSuccess('Batch deleted.');
        const r2 = await clinicInventoryAPI.getBatches(batchItem.id);
        setBatches(r2.batches || []);
        loadInventory();
        setShowDeleteBatchModal(false);
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
    if (!itemToDelete) return;
    setDeleteItemLoading(true);
    try {
      const res = await clinicInventoryAPI.deleteItem(itemToDelete.id);
      if (res.success) {
        showSuccess(`"${itemToDelete.item_name}" deleted.`);
        setShowDeleteItemModal(false);
        setItemToDelete(null);
        loadInventory();
      } else setError(handleAPIError(res).message);
    } catch { setError('Failed to delete item.'); }
    finally { setDeleteItemLoading(false); setDeletingItemId(null); }
  };

  // ─── Add item ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.item_name.trim()) { setError('Item name is required.'); return; }
    setAddLoading(true);
    try {
      const res = await clinicInventoryAPI.create({
        item_type:     addForm.item_type,
        item_name:     addForm.item_name.trim(),
        species:       addForm.species || null,
        minimum_stock: parseInt(addForm.minimum_stock) || 10,
        unit:          addForm.unit || 'pcs',
        notes:         addForm.notes || null,
      });
      if (res.success) {
        showSuccess(`"${addForm.item_name}" added to inventory.`);
        setShowAddModal(false);
        setAddForm({ item_type: 'vaccination', item_name: '', species: 'all', minimum_stock: '10', unit: 'doses', notes: '' });
        loadInventory();
      } else setError(handleAPIError(res).message);
    } catch { setError('Failed to add item.'); }
    finally { setAddLoading(false); }
  };

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const styles = `
    @keyframes dropDown { 0%{opacity:0;transform:translateY(-16px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    .cinv-row:hover { background: rgba(255,193,7,0.04) !important; }

    @media (max-width: 768px) {
      .cinv-title { font-size: 1.4rem !important; }
      .cinv-table th, .cinv-table td { font-size: 0.7rem !important; padding: 0.35rem 0.2rem !important; }
      .cinv-table .mobile-hide { display: none !important; }
      .cinv-stat-label { font-size: 0.55rem !important; }
      .cinv-stat-number { font-size: 1rem !important; }
    }
  `;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', zoom: '0.75' }}>

        {/* ── Header ── */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex align-items-center" style={{ gap: '0.75rem' }}>
              <i className="fas fa-clinic-medical" style={{ fontSize: '1.5rem', color: '#ffc107', animation: 'float 3s ease-in-out infinite' }} />
              <div>
                <h2 className="cinv-title" style={{ fontWeight: '700', color: '#333', fontSize: '1.9rem', marginBottom: 0 }}>
                  Clinic Inventory
                </h2>
                <small style={{ color: '#888', fontWeight: '500' }}>
                  Manage vaccines, dewormers, medicines & equipment
                </small>
              </div>
            </div>
          </Col>
        </Row>

        {/* ── Alerts ── */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}
            style={{ borderRadius: '12px', border: '2px solid #dc3545', marginBottom: '1.5rem' }}>
            <i className="fas fa-exclamation-triangle me-2" />{error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}
            style={{ borderRadius: '12px', border: '2px solid #28a745', marginBottom: '1.5rem' }}>
            <i className="fas fa-check-circle me-2" />{success}
          </Alert>
        )}

        {/* ── Stat Cards ── */}
        <Row className="mb-4" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px', animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          {[
            { label: 'Total Items',  value: totalItems,    color: '#ffc107', bg: 'rgba(255,193,7,0.1)',   icon: 'fa-boxes'               },

            { label: 'Total Stock',  value: totalStock,    color: '#0d6efd', bg: 'rgba(13,110,253,0.1)',  icon: 'fa-cubes'               },
            { label: 'Low Stock',    value: lowStockItems, color: '#ffc107', bg: 'rgba(255,193,7,0.1)',   icon: 'fa-exclamation-triangle' },
            { label: 'Out of Stock', value: outOfStock,    color: '#dc3545', bg: 'rgba(220,53,69,0.1)',   icon: 'fa-times-circle'        },
          ].map(s => (
            <div key={s.label} style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0 }}>
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
                      <h2 className="cinv-stat-number" style={{ fontSize: '2.4rem', fontWeight: '700', color: '#111', lineHeight: 1, marginBottom: 0 }}>
                        {loading ? '—' : s.value}
                      </h2>
                    </div>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fas ${s.icon}`} style={{ fontSize: '1.25rem', color: s.color }} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </Row>

        {/* ── Search & Filter ── */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out 0.15s backwards' }}>
          <Col md={4}>
            <InputGroup style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
                <i className="fas fa-search" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search items..."
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
          <Col md={3}>
            <Form.Select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500', height: '100%' }}
            >
              <option value="all">All Types</option>
<option value="vaccination">Vaccination</option>
<option value="deworming">Deworming</option>
<option value="medicine">Medicine</option>
<option value="equipment">Equipment</option>
            </Form.Select>
          </Col>
        </Row>

        {/* ── Table Card ── */}
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.2s backwards' }}>
          <Col>
            <Card className="border-0" style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <Card.Header style={{ background: 'linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%)', borderBottom: '2px solid #ffc107',
 padding: '1.5rem', borderRadius: '20px 20px 0 0' }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <h5 className="mb-0" style={{ fontWeight: '700', color: '#333' }}>
                    <i className="fas fa-boxes me-2" style={{ color: '#ffc107' }} />

                    Stock Levels ({filtered.length} items)
                  </h5>
                  <Button onClick={() => setShowAddModal(true)} className="border-0"
                    style={{ background: '#ffc107', color: '#000', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: '700', boxShadow: '0 4px 15px rgba(255,193,7,0.35)', transition: 'all 0.3s' }}
onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#ffb300'; }}
onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#ffc107'; }}>
                    <i className="fas fa-plus me-2" />Add Item
                  </Button>
                </div>
              </Card.Header>

              <Card.Body style={{ padding: '1.5rem' }}>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" style={{ color: '#20c997' }} />
                    <p className="mt-3 text-muted">Loading inventory...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-box-open" style={{ fontSize: '3rem', color: '#e0e0e0' }} />
                    <h5 className="mt-3" style={{ color: '#666' }}>No items found</h5>
                    <p className="text-muted">Try adjusting your filters or add a new item</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="cinv-table" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          {[
                            { label: 'Type',           width: '14%', align: 'left'   },
                            { label: 'Item Name',      width: '23%', align: 'left'   },
                            { label: 'Current Stock',  width: '13%', align: 'center' },
                            { label: 'Min. Threshold', width: '17%', align: 'left'   },
                            { label: 'Status',         width: '14%', align: 'center' },
                            { label: 'Last Restocked', width: '12%', align: 'center', cls: 'mobile-hide' },
                            { label: 'Actions',        width: '7%',  align: 'center' },
                          ].map(h => (
                            <th key={h.label} className={h.cls}
                              style={{ fontWeight: '600', color: '#555', padding: '0.9rem 0.8rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', width: h.width, textAlign: h.align }}>
                              {h.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map(item => {
                          const typeCfg    = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.equipment;
                          const status     = getStockStatus(item);
                          const speciesCfg = item.species ? (SPECIES_COLORS[item.species] || {}) : null;
                          return (
                            <tr key={item.id} className="cinv-row"
                              style={{ transition: 'all 0.2s', borderLeft: parseInt(item.current_stock) === 0 ? '3px solid #dc3545' : parseInt(item.current_stock) <= parseInt(item.minimum_stock) ? '3px solid #ffc107' : '3px solid transparent' }}>

                              {/* Type */}
                              <td style={{ padding: '1rem 0.8rem', verticalAlign: 'middle' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.22rem 0.6rem', borderRadius: '20px', background: typeCfg.bg, color: typeCfg.color, fontWeight: '700', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                  <i className={`fas ${typeCfg.icon}`} style={{ fontSize: '0.65rem' }} />
                                  {typeCfg.label}
                                </span>
                              </td>

                              {/* Name */}
                              <td style={{ padding: '1rem 0.8rem', verticalAlign: 'middle' }}>
                                <div style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                  {item.item_name}
                                </div>
                                {speciesCfg && item.species && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', padding: '0.1rem 0.45rem', borderRadius: '4px', background: speciesCfg.bg, color: speciesCfg.color, display: 'inline-block', marginTop: '0.2rem' }}>
                                    {item.species}
                                  </span>
                                )}
                              </td>

                              {/* Current Stock */}
                              <td style={{ padding: '1rem 0.8rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span style={{ fontWeight: '700', color: parseInt(item.current_stock) === 0 ? '#dc3545' : parseInt(item.current_stock) <= parseInt(item.minimum_stock) ? '#e65c00' : '#333', fontSize: '0.92rem' }}>
                                  {item.current_stock}
                                </span>
                                <span style={{ color: '#aaa', fontSize: '0.72rem', marginLeft: '3px' }}>{item.unit}</span>
                              </td>

                              {/* Min Threshold — inline editor */}
                              <td style={{ padding: '1rem 0.8rem', verticalAlign: 'middle' }}>
                                <InlineMinStockInput item={item} onSave={async (itm, val) => {
                                  const res = await clinicInventoryAPI.update(itm.id, { minimum_stock: val });
                                  if (res.success) { showSuccess(`Min. threshold updated for ${itm.item_name}.`); loadInventory(); }
                                  else setError(handleAPIError(res).message);
                                }} />
                              </td>

                              {/* Status */}
                              <td style={{ padding: '1rem 0.8rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.65rem', borderRadius: '20px', background: status.bg, color: status.color, fontWeight: '700', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                  <i className={`fas ${status.icon}`} style={{ fontSize: '0.65rem' }} />
                                  {status.label}
                                </span>
                              </td>

                              {/* Last Restocked */}
                              <td className="mobile-hide" style={{ padding: '1rem 0.8rem', verticalAlign: 'middle', textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>
                                {item.last_restocked_at
                                  ? new Date(item.last_restocked_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : <span className="text-muted">Never</span>}
                              </td>

                              {/* Actions — ellipsis */}
                              <td style={{ padding: '1rem 0.8rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <button
                                    ref={showDropdown === item.id ? dropdownButtonRef : null}
                                    onClick={(e) => {
                                      if (showDropdown === item.id) { setShowDropdown(null); return; }
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      dropdownButtonRef.current = e.currentTarget;
                                      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 190 });
                                      setShowDropdown(item.id);
                                    }}
                                    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                  </button>
                                  {expiredBatchMap[item.id] > 0 && (
                                    <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#dc3545', color: '#fff', borderRadius: '999px', fontSize: '0.5rem', fontWeight: '700', padding: '0.08rem 0.32rem', minWidth: '14px', textAlign: 'center', lineHeight: '1.5', pointerEvents: 'none', border: '1.5px solid #fff' }}>
                                      {expiredBatchMap[item.id]}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {Array.from({ length: emptyRows }).map((_, i) => (
                          <tr key={`empty-${i}`} style={{ height: '68px', pointerEvents: 'none' }}>
                            <td colSpan="7" style={{ borderBottom: '1px solid #f0f0f0', background: 'transparent' }} />
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
        {filtered.length > ITEMS_PER_PAGE && (
          <Row className="mt-4">
            <Col className="d-flex justify-content-between align-items-center">
              <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
                Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{totalPages}</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <PaginationBtn disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <i className="fas fa-chevron-left" />
                </PaginationBtn>
                {buildPageNums(currentPage, totalPages).map((pg, idx) =>
                  pg === '...' ? (
                    <span key={`e${idx}`} style={{ padding: '0.5rem 0.4rem', color: '#6c757d', fontWeight: '600' }}>…</span>
                  ) : (
                    <PaginationBtn key={pg} active={pg === currentPage} onClick={() => setCurrentPage(pg)}>{pg}</PaginationBtn>
                  )
                )}
                <PaginationBtn disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <i className="fas fa-chevron-right" />
                </PaginationBtn>
              </div>
            </Col>
          </Row>
        )}
      </Container>

      {/* ════════════════════════════════════════
          MODALS
      ════════════════════════════════════════ */}

      {/* ── Add Item Modal ── */}
      <Modal show={showAddModal} onHide={() => !addLoading && setShowAddModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107', borderRadius: '12px 12px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-plus-circle me-2" style={{ color: '#ffc107' }} />Add Inventory Item

          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.75rem' }}>
          <Form.Group className="mb-3">
            <Form.Label style={labelStyle}>Type <Req /></Form.Label>
            <Form.Select value={addForm.item_type} onChange={e => {
  const typeUnitMap = { vaccination: 'doses', deworming: 'tablets', medicine: 'mg', equipment: 'pcs' };
  setAddForm(f => ({ ...f, item_type: e.target.value, unit: typeUnitMap[e.target.value] || 'pcs' }));
}} style={selectStyle}>
  <option value="vaccination">Vaccination</option>
  <option value="deworming">Deworming</option>
  <option value="medicine">Medicine</option>
  <option value="equipment">Equipment</option>
</Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={labelStyle}>Item Name <Req /></Form.Label>
            <Form.Control value={addForm.item_name} onChange={e => setAddForm(f => ({ ...f, item_name: e.target.value }))}
              placeholder="e.g. Drontal Plus Dog" style={inputStyle} />
          </Form.Group>
          <Row className="mb-3 g-2">
            <Col xs={6}>
              <Form.Label style={labelStyle}>Species</Form.Label>
              <Form.Select value={addForm.species} onChange={e => setAddForm(f => ({ ...f, species: e.target.value }))} style={selectStyle}>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="rabbit">Rabbit</option>
                <option value="both">Both (Dog & Cat)</option>
                <option value="all">All</option>
              </Form.Select>
            </Col>
            <Col xs={6}>
  <Form.Label style={labelStyle}>Unit</Form.Label>
  <Form.Select value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} style={selectStyle}>
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
            <Form.Label style={labelStyle}>Min. Stock Threshold</Form.Label>
            <Form.Control type="number" min="0" value={addForm.minimum_stock}
              onChange={e => setAddForm(f => ({ ...f, minimum_stock: e.target.value }))} style={inputStyle} />
          </Form.Group>
          <Form.Group>
            <Form.Label style={labelStyle}>Notes (Optional)</Form.Label>
            <Form.Control as="textarea" rows={2} value={addForm.notes}
              onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Brand, supplier, storage notes..." style={{ ...inputStyle, resize: 'none' }} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ padding: '1rem 1.75rem' }}>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={addLoading} style={cancelBtnStyle}>Cancel</Button>
          <Button onClick={handleAdd} disabled={addLoading || !addForm.item_name.trim()}
            style={{ background: '#ffc107', border: 'none', color: '#000', borderRadius: '8px', fontWeight: '700', padding: '0.6rem 1.5rem' }}>

            {addLoading ? <><Spinner size="sm" animation="border" className="me-2" />Adding…</> : <><i className="fas fa-plus me-2" />Add Item</>}
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
              <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: '700', textTransform: 'uppercase' }}>Current</div>
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
                  <Form.Label style={labelStyle}>Batch No. <Req /></Form.Label>
                  <Form.Control value={restockBatchNo} onChange={e => { setRestockBatchNo(e.target.value); setBatchNoError(''); }}
                    placeholder="e.g. BCH-2025-001" isInvalid={!!batchNoError}
                    style={{ ...inputStyle, borderColor: batchNoError ? '#dc3545' : '#dee2e6' }} />
                  {batchNoError && <div style={{ color: '#dc3545', fontSize: '0.78rem', marginTop: '0.3rem' }}>{batchNoError}</div>}
                </Col>
                <Col xs={6}>
                  <Form.Label style={labelStyle}>Quantity <Req /></Form.Label>
                  <Form.Control type="number" min="1" value={restockQty}
                    onChange={e => setRestockQty(e.target.value)} placeholder={`qty in ${restockItem.unit}`} style={inputStyle} />
                </Col>
              </Row>
              {!['equipment'].includes(restockItem?.item_type) && (
  <Form.Group className="mb-3">
    <Form.Label style={labelStyle}>Expiration Date</Form.Label>
    <Form.Control type="date" value={restockExpDate} onChange={e => setRestockExpDate(e.target.value)} style={inputStyle} />
  </Form.Group>
)}
              <Form.Group>
                <Form.Label style={labelStyle}>Notes (Optional)</Form.Label>
                <Form.Control as="textarea" rows={2} value={restockNotes}
                  onChange={e => setRestockNotes(e.target.value)}
                  placeholder="e.g. Supplier, delivery details…" style={{ ...inputStyle, resize: 'none' }} />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1rem 1.75rem' }}>
          <Button variant="secondary" onClick={() => setShowRestockModal(false)} disabled={restockLoading} style={cancelBtnStyle}>Cancel</Button>
          <Button onClick={handleRestock}
            disabled={restockLoading || !restockQty || parseInt(restockQty) <= 0 || !restockBatchNo.trim()}
            style={{ background: '#28a745', border: 'none', borderRadius: '8px', fontWeight: '700', padding: '0.6rem 1.5rem' }}>
            {restockLoading ? <><Spinner size="sm" animation="border" className="me-2" />Adding…</> : <><i className="fas fa-plus me-2" />Add Stock</>}
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
          {/* expired warning */}
          {(() => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const exp = batches.filter(b => b.expiration_date && new Date(b.expiration_date) < today && parseInt(b.quantity) > 0);
            return exp.length > 0 && !batchesLoading ? (
              <div style={{ background: 'rgba(220,53,69,0.07)', border: '1.5px solid rgba(220,53,69,0.3)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.83rem', color: '#dc3545', fontWeight: '600' }}>
                <i className="fas fa-exclamation-triangle" />
                {exp.length} expired batch{exp.length !== 1 ? 'es' : ''} — review and remove expired stock.
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
                        <td style={{ padding: '0.7rem 0.9rem', verticalAlign: 'middle' }}>
                          {isEditing ? (
                            <Form.Control size="sm" value={editingBatch.batch_no}
                              onChange={e => setEditingBatch(b => ({ ...b, batch_no: e.target.value }))}
                              style={{ border: '2px solid #0d6efd', borderRadius: '6px', fontWeight: '700', minWidth: '120px' }} />
                          ) : <span style={{ fontWeight: '700', color: '#333' }}>{batch.batch_no}</span>}
                        </td>
                        <td style={{ padding: '0.7rem 0.9rem', verticalAlign: 'middle' }}>
                          {isEditing ? (
                            <Form.Control size="sm" type="number" min="0" value={editingBatch.quantity}
                              onChange={e => setEditingBatch(b => ({ ...b, quantity: e.target.value }))}
                              style={{ border: '2px solid #0d6efd', borderRadius: '6px', width: '80px', fontWeight: '700' }} />
                          ) : <span style={{ fontWeight: '700' }}>{batch.quantity} <span style={{ color: '#aaa', fontWeight: '400' }}>{batch.unit}</span></span>}
                        </td>
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
                        <td style={{ padding: '0.7rem 0.9rem', verticalAlign: 'middle', maxWidth: '160px' }}>
                          {isEditing ? (
                            <Form.Control size="sm" value={editingBatch.notes || ''}
                              onChange={e => setEditingBatch(b => ({ ...b, notes: e.target.value }))}
                              style={{ border: '2px solid #0d6efd', borderRadius: '6px' }} />
                          ) : <span style={{ color: '#666', fontSize: '0.82rem' }}>{batch.notes || <span style={{ color: '#ccc' }}>—</span>}</span>}
                        </td>
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
          <Button variant="secondary" onClick={() => { setShowBatchModal(false); setEditingBatch(null); }} style={cancelBtnStyle}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* ── View Details Modal ── */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="md" style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107', borderRadius: '12px 12px 0 0'
}}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }} />Item Details

          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.75rem' }}>
          {viewItem && (() => {
            const typeCfg    = TYPE_CONFIG[viewItem.item_type] || TYPE_CONFIG.equipment;
            const status     = getStockStatus(viewItem);
            const speciesCfg = viewItem.species ? (SPECIES_COLORS[viewItem.species] || {}) : null;
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.9rem 1rem', background: typeCfg.bg, borderRadius: '10px' }}>
                  <i className={`fas ${typeCfg.icon}`} style={{ fontSize: '1.4rem', color: typeCfg.color }} />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: typeCfg.color }}>{viewItem.item_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>{typeCfg.label}</div>
                  </div>
                  {speciesCfg && viewItem.species && (
                    <span style={{ marginLeft: 'auto', padding: '0.2rem 0.7rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', background: speciesCfg.bg, color: speciesCfg.color }}>
                      {viewItem.species}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Current Stock',  value: `${viewItem.current_stock} ${viewItem.unit}`, color: parseInt(viewItem.current_stock) === 0 ? '#dc3545' : '#333' },
                    { label: 'Min. Threshold', value: `${viewItem.minimum_stock} ${viewItem.unit}`, color: '#333' },
                    { label: 'Status',         value: status.label,                                  color: status.color },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, background: '#f8f9fa', borderRadius: '8px', padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: '#aaa', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{s.label}</div>
                      <div style={{ fontWeight: '800', fontSize: '0.92rem', color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {viewItem.notes && (
                  <div style={{ background: 'rgba(255,193,7,0.07)', borderRadius: '8px', padding: '0.75rem 1rem', borderLeft: '3px solid #ffc107'
, marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#ffc107', textTransform: 'uppercase', marginBottom: '0.25rem'
 }}>Notes</div>
                    <div style={{ fontSize: '0.85rem', color: '#555' }}>{viewItem.notes}</div>
                  </div>
                )}
                {expiredBatchMap[viewItem?.id] > 0 && (
                  <div style={{ background: 'rgba(220,53,69,0.07)', border: '1.5px solid rgba(220,53,69,0.3)', borderRadius: '8px', padding: '0.6rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#dc3545', fontWeight: '600' }}>
                    <i className="fas fa-exclamation-triangle" />
                    {expiredBatchMap[viewItem.id]} expired batch{expiredBatchMap[viewItem.id] !== 1 ? 'es' : ''} — open Batches to review.
                  </div>
                )}
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
          <Button onClick={() => { setShowViewModal(false); handleOpenRestock(viewItem); }}
            style={{ background: '#28a745', border: 'none', borderRadius: '8px', fontWeight: '700', padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
            <i className="fas fa-plus me-2" />Add Stock
          </Button>
          <Button onClick={() => { setShowViewModal(false); handleOpenBatches(viewItem); }}
            style={{ background: '#0d6efd', border: 'none', borderRadius: '8px', fontWeight: '700', padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
            <i className="fas fa-layer-group me-2" />Batches
          </Button>
          <Button variant="secondary" onClick={() => setShowViewModal(false)} style={cancelBtnStyle}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* ── Ellipsis Dropdown Portal ── */}
      {showDropdown !== null && (
        <>
          <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
          <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, transform: 'translateY(-50%)', zoom: '0.75', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '190px', zIndex: 1050, overflow: 'hidden' }}>
            {(() => {
              const item = inventory.find(i => i.id === showDropdown);
              if (!item) return null;
              return (
                <>
                  <DropdownBtn color="#28a745" hoverBg="#f0fff4" onClick={() => { handleOpenRestock(item); setShowDropdown(null); }}>
                    <i className="fas fa-plus" style={{ width: '18px', color: '#28a745' }} />Add Stock
                  </DropdownBtn>
                  <DropdownBtn color="#0d6efd" hoverBg="#f0f4ff" onClick={() => { handleOpenBatches(item); setShowDropdown(null); }} borderTop>
                    <i className="fas fa-layer-group" style={{ width: '18px', color: '#0d6efd' }} />
                    <span style={{ flex: 1 }}>View Batches</span>
                    {expiredBatchMap[item.id] > 0 && (
                      <span style={{ background: '#dc3545', color: '#fff', borderRadius: '999px', fontSize: '0.6rem', fontWeight: '700', padding: '0.1rem 0.42rem', minWidth: '17px', textAlign: 'center', lineHeight: '1.4' }}>
                        {expiredBatchMap[item.id]}
                      </span>
                    )}
                  </DropdownBtn>
                  <DropdownBtn color="#333" hoverBg="#f8f9fa" onClick={() => { setViewItem(item); setShowViewModal(true); setShowDropdown(null); }} borderTop>
                    <img src="/view.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />View Details
                  </DropdownBtn>
                  <DropdownBtn color="#dc3545" hoverBg="#fff5f5" onClick={() => handleDeleteItem(item)} borderTop>
                    <i className="fas fa-trash" style={{ width: '18px', color: '#dc3545' }} />
                    {deletingItemId === item.id ? 'Deleting…' : 'Delete Item'}
                  </DropdownBtn>
                </>
              );
            })()}
          </div>
        </>
      )}
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
          <Button variant="secondary" onClick={() => setShowDeleteBatchModal(false)} disabled={deleteBatchLoading} style={cancelBtnStyle}>
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

      {/* ── Delete Item Confirm Modal ── */}
      <Modal show={showDeleteItemModal} onHide={() => !deleteItemLoading && setShowDeleteItemModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6', borderRadius: '12px 12px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1.1rem' }}>
            <i className="fas fa-exclamation-triangle text-danger me-2" />
            Confirm Delete Item
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: '20px', background: (TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.equipment).bg, color: (TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.equipment).color, fontWeight: '700', fontSize: '0.75rem' }}>
                    <i className={`fas ${(TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.equipment).icon}`} />
                    {(TYPE_CONFIG[itemToDelete.item_type] || TYPE_CONFIG.equipment).label}
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
          <Button variant="secondary" onClick={() => setShowDeleteItemModal(false)} disabled={deleteItemLoading} style={cancelBtnStyle}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteItemConfirm} disabled={deleteItemLoading}
            style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            {deleteItemLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Deleting...</>
              : <><i className="fas fa-trash me-2" />Delete Item</>}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// ─── Small shared helpers ─────────────────────────────────────────────────────
const labelStyle  = { fontWeight: '600', fontSize: '0.88rem' };
const inputStyle  = { borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' };
const selectStyle = { borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' };
const cancelBtnStyle = { borderRadius: '8px', fontWeight: '600' };
const Req = () => <span style={{ color: '#dc3545' }}>*</span>;

function PaginationBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: active ? '#ffc107' :
 disabled ? '#e9ecef' : '#fff', border: '2px solid', borderColor: active ? '#ffc107' :
 '#dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '38px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: '700', color: active ? '#000' : disabled ? '#adb5bd' : '#333', transition: 'all 0.2s', boxShadow: active ? '0 2px 8px rgba(255,193,7,0.3)'
 : 'none' }}>
      {children}
    </button>
  );
}

function DropdownBtn({ children, onClick, color, hoverBg, borderTop }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: hovered ? hoverBg : '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color, fontWeight: '500', borderTop: borderTop ? '1px solid #f0f0f0' : 'none', transition: 'background 0.2s' }}>
      {children}
    </button>
  );
}

function buildPageNums(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
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
      <input type="number" min="0" value={value}
        onChange={e => change(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
        onKeyDown={e => e.key === 'Enter' && save()}
        onFocus={() => { if (value === 0) { setValue(''); setDirty(true); } }}
        onBlur={() => { if (value === '') { setValue(0); setDirty(0 !== parseInt(item.minimum_stock)); } }}
        style={{ width: '52px', textAlign: 'center', padding: '0.2rem 0.25rem', borderRadius: '6px', border: `2px solid ${dirty ? '#ffc107' : '#dee2e6'}`
, fontSize: '0.82rem', fontWeight: '600', color: '#555', outline: 'none', flexShrink: 0 }}
      />
      <span style={{ fontSize: '0.7rem', color: '#aaa', flexShrink: 0 }}>{item.unit}</span>
      {dirty && (
        <button onClick={save} disabled={saving}
          style={{ width: '20px', height: '20px', borderRadius: '5px', border: 'none', background: '#ffc107', color: '#000', cursor: 'pointer'
, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', padding: 0, flexShrink: 0 }}>
          {saving ? <Spinner size="sm" animation="border" style={{ width: '10px', height: '10px' }} /> : <i className="fas fa-check" />}
        </button>
      )}
    </div>
  );
}