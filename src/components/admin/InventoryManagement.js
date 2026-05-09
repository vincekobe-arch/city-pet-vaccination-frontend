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
const [success, setSuccess]           = useState('');
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
const [addForm, setAddForm] = useState({ item_type: 'vaccination', item_name: '', species: 'dog', minimum_stock: '10', unit: 'doses', notes: '', vaccination_type_id: '' });
const [addLoading, setAddLoading]       = useState(false);

// Edit threshold modal
const [showEditModal, setShowEditModal] = useState(false);
const [editItem, setEditItem]           = useState(null);
const [editMinStock, setEditMinStock]   = useState('');
const [editLoading, setEditLoading]     = useState(false);

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 8;

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
  const updatePos = () => {
    if (!dropdownButtonRef.current) return;
    const rect = dropdownButtonRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
  };
  window.addEventListener('scroll', updatePos, true);
  return () => window.removeEventListener('scroll', updatePos, true);
}, [showDropdown]);
  const [expiredBatchMap, setExpiredBatchMap] = useState({}); // { inventoryId: expiredCount }

  const styles = `
  @keyframes dropDown { 0%{opacity:0;transform:translateY(-20px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  .inv-row:hover { background: rgba(255,193,7,0.04) !important; }
  tr[key^="empty-"]:hover td { background: transparent !important; }
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
`;

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

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalItems    = inventory.length;
  const lowStockItems = inventory.filter(i => parseInt(i.current_stock) > 0 && parseInt(i.current_stock) < 10).length;
  const outOfStock    = inventory.filter(i => parseInt(i.current_stock) === 0).length;
  const totalStock    = inventory.reduce((sum, i) => sum + parseInt(i.current_stock || 0), 0);

  // ── Filter ────────────────────────────────────────────────────────────────
const TYPE_ORDER = { microchip: 0, vaccination: 1, medicine: 2, equipment: 3 };

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
  if (!restockBatchNo.trim()) {
    setBatchNoError('Batch number is required.');
    return;
  }
  setBatchNoError('');
  setRestockLoading(true);
  try {
    await inventoryAPI.restock(restockItem.id, {
      quantity:        parseInt(restockQty),
      batch_no:        restockBatchNo.trim(),
      expiration_date: restockExpDate || null,
      notes:           restockNotes,
    });
    showSuccess(`Batch "${restockBatchNo}" added to ${restockItem.item_name}.`);
    setShowRestockModal(false);
    loadInventory();
  } catch (err) {
    const { message } = handleAPIError(err);
    // surface duplicate batch error in the field, not the page alert
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
    try {
      await inventoryAPI.update(editItem.id, { minimum_stock: parseInt(editMinStock) });
      showSuccess(`Minimum stock threshold updated for ${editItem.item_name}.`);
      setShowEditModal(false);
      loadInventory();
    } catch (err) {
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
  try {
    await inventoryAPI.deleteBatch(batchToDelete.id);
    showSuccess('Batch deleted.');
    const res = await inventoryAPI.getBatches(batchItem.id);
    setBatches(res.data.batches || []);
    loadInventory();
    setShowDeleteBatchModal(false);
    setBatchToDelete(null);
  } catch (err) {
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
    try {
      await inventoryAPI.delete(itemToDelete.id);
      showSuccess(`"${itemToDelete.item_name}" removed from inventory.`);
      setShowDeleteModal(false);
      setItemToDelete(null);
      loadInventory();
    } catch (err) {
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

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', zoom: '0.75' }}>

        {/* Header */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex align-items-center" style={{ gap: '0.75rem' }}>
              <i className="fas fa-boxes" style={{ fontSize: '1.5rem', color: '#1a1a1a', animation: 'float 3s ease-in-out infinite' }} />
              <div>
                <h2 className="inv-title" style={{ fontWeight: '700', color: '#333', fontSize: '1.9rem', marginBottom: 0 }}>Inventory Management</h2>
                <small style={{ color: '#888', fontWeight: '500' }}>Track vaccination, sterilization & microchip supplies</small>
              </div>
            </div>
          </Col>
        </Row>

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

        {/* Stat Cards */}
        <Row className="mb-4 inv-stat-row" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px', animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          {[
            { label: 'Total Items',    value: totalItems,    color: '#0d6efd', bg: 'rgba(13,110,253,0.1)',  icon: 'fa-boxes' },
            { label: 'Total Stock',    value: totalStock,    color: '#28a745', bg: 'rgba(40,167,69,0.1)',   icon: 'fa-cubes' },
            { label: 'Low Stock',      value: lowStockItems, color: '#ffc107', bg: 'rgba(255,193,7,0.1)',   icon: 'fa-exclamation-triangle' },
            { label: 'Out of Stock',   value: outOfStock,    color: '#dc3545', bg: 'rgba(220,53,69,0.1)',   icon: 'fa-times-circle' },
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
                      <h2 className="inv-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111', lineHeight: 1, marginBottom: 0 }}>
                        {loading ? '—' : s.value}
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

        {/* Search & Filter Row */}
        <Row className="mb-4 inv-filters-row" style={{ animation: 'dropDown 0.4s ease-out 0.15s backwards' }}>
          <Col md={4}>
            <InputGroup style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
                <i className="fas fa-search" />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
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
              onChange={e => setFilterType(e.target.value)}
              style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500', height: '100%' }}
            >
              <option value="all">All Types</option>
<option value="vaccination">Vaccination</option>
<option value="medicine">Medicine</option>
<option value="microchip">Microchip</option>
<option value="equipment">Equipment</option>

            </Form.Select>
          </Col>
        </Row>

        {/* Table Card */}
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.2s backwards' }}>
          <Col>
            <Card className="border-0" style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

              {/* Card Header */}
              <Card.Header className="inv-card-header" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderBottom: '2px solid #ffc107', padding: '1.5rem', borderRadius: '20px 20px 0 0' }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                    <i className="fas fa-boxes me-2" style={{ color: '#ffc107' }} />
                    Stock Levels ({filtered.length} items)
                  </h5>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="border-0"
                    style={{ background: '#ffc107', color: '#000000', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: '700', boxShadow: '0 4px 15px rgba(255,193,7,0.4)', transition: 'all 0.3s' }}
                    onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(255,193,7,0.6)'; e.target.style.background = '#ffb300'; }}
                    onMouseOut={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(255,193,7,0.4)'; e.target.style.background = '#ffc107'; }}
                  >
                    <i className="fas fa-plus me-2" />Add Item
                  </Button>
                </div>
              </Card.Header>

              <Card.Body className="inv-card-body" style={{ padding: '1.5rem' }}>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" style={{ color: '#ffc107' }} />
                    <p className="mt-3 text-muted">Loading inventory...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-box-open" style={{ fontSize: '3rem', color: '#e0e0e0' }} />
                    <h5 className="mt-3" style={{ color: '#666' }}>No items found</h5>
                    <p className="text-muted">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="inv-table" style={{ marginBottom: 0, width: '100%', tableLayout: 'fixed' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          {[
                            { label: 'Type',           width: '16%', align: 'left',   className: 'mobile-hide-type' },
                            { label: 'Item Name',      width: '22%', align: 'left'   },
                            { label: 'Current Stock',  width: '13%', align: 'center' },
                            { label: 'Min. Threshold', width: '18%', align: 'left'   },
                            { label: 'Status',         width: '15%', align: 'center', className: 'mobile-hide-status' },
{ label: 'Last Restocked', width: '11%', align: 'center', className: 'mobile-hide-restock' },
                            { label: 'Actions',        width: '5%',  align: 'center' },
                          ].map(h => (
  <th key={h.label} className={h.className || ''} style={{ fontWeight: '600', color: '#555', padding: '0.9rem 1rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', width: h.width, textAlign: h.align }}>{h.label}</th>
))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const startIdx       = (currentPage - 1) * itemsPerPage;
                          const pageItems      = filtered.slice(startIdx, startIdx + itemsPerPage);
                          const emptyRows      = itemsPerPage - pageItems.length;
                          return (
                            <>
                              {pageItems.map(item => {
                                const typeCfg    = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.microchip;
                                const status     = getStockStatus(item);
                                const speciesCfg = item.species ? (SPECIES_COLORS[item.species] || {}) : null;
                                return (
                                  <tr key={item.id} className="inv-row" style={{ transition: 'all 0.2s', borderLeft: parseInt(item.current_stock) === 0 ? '3px solid #dc3545' : parseInt(item.current_stock) < 10 ? '3px solid #ffc107' : '3px solid transparent' }}>

                                    {/* Type */}
<td className="mobile-hide-type" style={{ padding: '1rem', verticalAlign: 'middle', width: '16%', overflow: 'hidden' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: '20px', background: typeCfg.bg, color: typeCfg.color, fontWeight: '700', fontSize: '0.75rem' }}>
                                        <i className={`fas ${typeCfg.icon}`} />
                                        {typeCfg.label}
                                      </span>
                                    </td>

                                    {/* Name */}
                                    <td style={{ padding: '1rem', verticalAlign: 'middle', fontWeight: '600', color: '#333', fontSize: '0.9rem', lineHeight: '1.4', width: '22%', overflow: 'hidden' }}>
                                      <div style={{ wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                                        {item.item_name}
                                      </div>
                                    </td>

                                   {/* Current Stock */}
                                    <td style={{ padding: '1rem', verticalAlign: 'middle', width: '13%' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: '700', color: parseInt(item.current_stock) === 0 ? '#dc3545' : parseInt(item.current_stock) < 10 ? '#ffc107' : '#333', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                                        {item.current_stock} <span style={{ fontWeight: '400', color: '#aaa', fontSize: '0.78rem' }}>{item.unit}</span>
                                      </div>
                                    </td>

                                    {/* Min Threshold */}
                                    <td style={{ padding: '1rem', verticalAlign: 'middle', width: '18%', overflow: 'hidden' }}>
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

                                    {/* Status */}
<td className="mobile-hide-status" style={{ padding: '1rem', verticalAlign: 'middle', width: '15%' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.7rem', borderRadius: '20px', background: status.bg, color: status.color, fontWeight: '700', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                          <i className={`fas ${status.icon}`} style={{ fontSize: '0.7rem' }} />
                                          {status.label}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Last Restocked */}
<td className="mobile-hide-restock" style={{ padding: '1rem', verticalAlign: 'middle', width: '11%' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '0.82rem' }}>
                                        {item.last_restocked_at
                                          ? new Date(item.last_restocked_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                                          : <span className="text-muted">Never</span>}
                                      </div>
                                    </td>

                                    {/* Actions — ellipsis dropdown */}
                                    <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', width: '5%', overflow: 'hidden' }}>
                                      <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <button
                                          ref={showDropdown === item.id ? dropdownButtonRef : null}
                                          onClick={(e) => {
                                            if (showDropdown === item.id) {
                                              setShowDropdown(null);
                                            } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              dropdownButtonRef.current = e.currentTarget;
                                              setDropdownPos({
                                                top: rect.top / ZOOM + (rect.height / ZOOM) / 2,
                                                left: (rect.left / ZOOM) - 185,
                                              });
                                              setShowDropdown(item.id);
                                            }
                                          }}
                                          style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
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
                              {/* Empty rows to keep fixed height */}
                              {Array.from({ length: emptyRows }).map((_, i) => (
                                <tr key={`empty-${i}`} style={{ height: '68px', pointerEvents: 'none' }}>
                                  <td colSpan="7" style={{ borderBottom: '1px solid #f0f0f0', background: 'transparent' }} />
                                </tr>
                              ))}
                            </>
                          );
                        })()}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Pagination */}
        {filtered.length > itemsPerPage && (
          <Row className="mt-4 inv-pagination">
            <Col className="d-flex justify-content-between align-items-center">
              <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
                Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{Math.ceil(filtered.length / itemsPerPage)}</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ background: currentPage === 1 ? '#e9ecef' : '#fff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === 1 ? '#adb5bd' : '#333', transition: 'all 0.2s' }}
                  onMouseOver={e => { if (currentPage !== 1) { e.target.style.borderColor = '#ffc107'; } }}
                  onMouseOut={e => { e.target.style.borderColor = '#dee2e6'; }}>
                  <i className="fas fa-chevron-left" />
                </button>

                {/* Page numbers with ellipsis */}
                {(() => {
                  const totalPages = Math.ceil(filtered.length / itemsPerPage);
                  const pages = [];
                  if (totalPages <= 5) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage > 3) pages.push('...');
                    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
                    if (currentPage < totalPages - 2) pages.push('...');
                    pages.push(totalPages);
                  }
                  return pages.map((page, idx) => page === '...' ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: '0.5rem 0.4rem', color: '#6c757d', fontWeight: '600' }}>...</span>
                  ) : (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      style={{ background: currentPage === page ? '#ffc107' : '#fff', border: '2px solid', borderColor: currentPage === page ? '#ffc107' : '#dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '40px', cursor: 'pointer', fontWeight: '700', color: currentPage === page ? '#000' : '#333', transition: 'all 0.2s', boxShadow: currentPage === page ? '0 2px 8px rgba(255,193,7,0.3)' : 'none' }}
                      onMouseOver={e => { if (currentPage !== page) { e.currentTarget.style.borderColor = '#ffc107'; } }}
                      onMouseOut={e => { if (currentPage !== page) { e.currentTarget.style.borderColor = '#dee2e6'; } }}>
                      {page}
                    </button>
                  ));
                })()}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filtered.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}
                  style={{ background: currentPage === Math.ceil(filtered.length / itemsPerPage) ? '#e9ecef' : '#fff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === Math.ceil(filtered.length / itemsPerPage) ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === Math.ceil(filtered.length / itemsPerPage) ? '#adb5bd' : '#333', transition: 'all 0.2s' }}
                  onMouseOver={e => { if (currentPage !== Math.ceil(filtered.length / itemsPerPage)) { e.target.style.borderColor = '#ffc107'; } }}
                  onMouseOut={e => { e.target.style.borderColor = '#dee2e6'; }}>
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </Col>
          </Row>
        )}

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
  const typeUnitMap = { vaccination: 'doses', medicine: 'mg', microchip: 'pcs', equipment: 'pcs' };
  setAddForm(f => ({ ...f, item_type: e.target.value, unit: typeUnitMap[e.target.value] || 'pcs', vaccination_type_id: '', item_name: '' }));
}}
              style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }}>
              <option value="vaccination">Vaccination</option>
<option value="medicine">Medicine</option>
<option value="microchip">Microchip</option>
<option value="equipment">Equipment</option>
            </Form.Select>
          </Form.Group>
          {addForm.item_type === 'vaccination' && (
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '600', fontSize: '0.88rem' }}>
                Vaccination Type <span style={{ color: '#dc3545' }}>*</span>
              </Form.Label>
              <Form.Select
                value={addForm.vaccination_type_id}
                onChange={e => {
                  const selected = vaccinationTypes.find(v => v.id === parseInt(e.target.value));
                  setAddForm(f => ({
                    ...f,
                    vaccination_type_id: e.target.value,
                    item_name: selected ? selected.name : f.item_name,
                    species: selected ? (selected.species === 'all' ? 'all' : selected.species) : f.species,
                  }));
                }}
                style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.65rem' }}
              >
                <option value="">Select vaccination type...</option>
                {vaccinationTypes.map(vt => (
                  <option key={vt.id} value={vt.id}>{vt.name} ({vt.species})</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">Item name and species will be auto-filled.</Form.Text>
            </Form.Group>
          )}
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
                ...(addForm.item_type === 'vaccination' && addForm.vaccination_type_id
                  ? { item_type_id: parseInt(addForm.vaccination_type_id) }
                  : {}),
              });
              showSuccess(`"${addForm.item_name}" added to inventory.`);
              setShowAddModal(false);
              setAddForm({ item_type: 'vaccination', item_name: '', species: 'dog', minimum_stock: '10', unit: 'doses', notes: '', vaccination_type_id: '' });
              loadInventory();
            } catch (err) {
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
              value={restockQty}
              onChange={e => setRestockQty(e.target.value)}
              placeholder={`Enter qty in ${restockItem.unit}`}
              style={{ borderRadius: '8px', border: '2px solid #dee2e6', padding: '0.7rem' }}
            />
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
      disabled={restockLoading || !restockQty || parseInt(restockQty) <= 0 || !restockBatchNo.trim()}
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
                      <Form.Control size="sm" type="number" min="0" value={editingBatch.quantity}
                        onChange={e => setEditingBatch(b => ({ ...b, quantity: e.target.value }))}
                        style={{ border: '2px solid #0d6efd', borderRadius: '6px', width: '80px', fontWeight: '700' }} />
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

      {/* ── Ellipsis Dropdown Portal ── */}
      {showDropdown !== null && (
        <>
          <div
            onClick={() => setShowDropdown(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1049 }}
          />
          <div style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            transform: 'translateY(-50%)',
            zoom: '0.75',
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '185px',
            zIndex: 1050,
            overflow: 'hidden',
          }}>
            {(() => {
              const item = inventory.find(i => i.id === showDropdown);
              if (!item) return null;
              return (
                <>
                  <button
                    onClick={() => { handleOpenRestock(item); setShowDropdown(null); }}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#28a745', fontWeight: '500', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f0fff4'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <i className="fas fa-plus" style={{ fontSize: '1rem', width: '18px', textAlign: 'center', color: '#28a745' }} />
                    <span>Add Stock</span>
                  </button>
                  <button
                    onClick={() => { handleOpenBatches(item); setShowDropdown(null); }}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#0d6efd', fontWeight: '500', borderTop: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f0f4ff'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <i className="fas fa-layer-group" style={{ fontSize: '1rem', width: '18px', textAlign: 'center', color: '#0d6efd' }} />
                    <span style={{ flex: 1 }}>View Batches</span>
                    {expiredBatchMap[item.id] > 0 && (
                      <span style={{ background: '#dc3545', color: '#fff', borderRadius: '999px', fontSize: '0.6rem', fontWeight: '700', padding: '0.1rem 0.42rem', minWidth: '17px', textAlign: 'center', lineHeight: '1.4' }}>
                        {expiredBatchMap[item.id]}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { setViewItem(item); setShowViewModal(true); setShowDropdown(null); }}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                    <span>View Details</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(item)}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                    <span>Delete Item</span>
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

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
