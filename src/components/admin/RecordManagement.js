  import React, { useState, useEffect, useRef } from 'react';
  import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Modal, Form, InputGroup, Tabs, Tab } from 'react-bootstrap';
  import { vaccinationAPI, dewormingAPI, sterilizationAPI, microchipAPI, petAPI, handleAPIError } from '../../services/api';
  import { getUser } from '../../utils/auth';
  import QRCode from 'qrcode';

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

    const [showPetSearchModal, setShowPetSearchModal] = useState(false);
const [petSearchTerm, setPetSearchTerm] = useState('');

const [showConfirmRecordModal, setShowConfirmRecordModal] = useState(false);
const [pendingSubmitEvent, setPendingSubmitEvent] = useState(null);
    
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [modalMode, setModalMode] = useState('create');
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showDropdown, setShowDropdown] = useState(null);
const dropdownButtonRef = useRef(null);
const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
const ZOOM = 0.75;
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
const [showRestoreModal, setShowRestoreModal] = useState(false);
const [recordToRestore, setRecordToRestore] = useState(null);
const [restoreLoading, setRestoreLoading] = useState(false);
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
    `;
    
    const [formData, setFormData] = useState({
      record_type: '',
      pet_id: '',
      pet_registration_input: '',
      vaccination_type_id: '',
      _inventory_vaccine_id: '',
      vaccination_date: new Date().toISOString().split('T')[0],
      vaccination_next_due_date: '',
      deworming_type_id: '',
      deworming_date: new Date().toISOString().split('T')[0],
      deworming_next_due_date: '',
      dosage: '',
      procedure_type: '',
      sterilization_date: new Date().toISOString().split('T')[0],
      microchip_subtype: '',
      microchip_number: '',
      implant_date: new Date().toISOString().split('T')[0],
      implant_site: '',
      microchip_brand: '',
      veterinarian_name: '',
      weight: '',
      notes: ''
    });

    const user = getUser();

    useEffect(() => {
      loadData();
      loadVaccinationTypes();
      loadDewormingTypes();
      loadInventoryVaccines();
    }, [filterStatus]);
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
  if (showDropdown === null) return;
  const updatePos = () => {
    if (!dropdownButtonRef.current) return;
    const rect = dropdownButtonRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
  };
  window.addEventListener('scroll', updatePos, true);
  return () => window.removeEventListener('scroll', updatePos, true);
}, [showDropdown]);

    useEffect(() => {
      if (loading || hasAnimated) return;
      const targets = {
        vaccinations: vaccinations.length,
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

    const loadData = async () => {
      try {
        setLoading(true);
        const trashParam = filterStatus === 'trash' ? '?trash=1' : '';
        const [vaccinationsRes, dewormingsRes, sterilizationsRes, microchipsRes, petsRes] = await Promise.all([
          vaccinationAPI.getAll(trashParam),
          dewormingAPI.getAll(trashParam),
          sterilizationAPI.getAll(trashParam),
          microchipAPI.getAll(trashParam),
          petAPI.getAll()
        ]);
        console.log('Vaccinations Response:', vaccinationsRes.data);
        console.log('Dewormings Response:', dewormingsRes.data);
        console.log('Sterilizations Response:', sterilizationsRes.data);
        console.log('Microchips Response:', microchipsRes.data);
        console.log('Pets Response:', petsRes.data);
        
        setVaccinations(vaccinationsRes.data.vaccination_records || []);
        setDewormings(dewormingsRes.data.deworming_records || []);
        setSterilizations(sterilizationsRes.data.sterilization_records || []);
        setMicrochips(microchipsRes.data.microchip_records || []);
        setPets(petsRes.data.pets || []);
        
        
      } catch (err) {
        const { message } = handleAPIError(err);
        setError(message);
      } finally {
        setLoading(false);
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

    const loadDewormingTypes = async () => {
      try {
        const response = await dewormingAPI.getTypes();
        setDewormingTypes(response.data.deworming_types || []);
      } catch (err) {
        console.error('Error loading deworming types:', err);
      }
    };

    const loadInventoryVaccines = async () => {
      try {
        const { inventoryAPI } = await import('../../services/api');
        const response = await inventoryAPI.getAll();
        const allInventory = response.data.inventory || [];
        setInventoryItems(allInventory);
        inventoryItemsRef.current = allInventory;
        // Store inventory ids for vaccination items with stock > 0
        const vaccineInventory = allInventory
          .filter(i => i.item_type === 'vaccination' && parseInt(i.current_stock) > 0)
          .map(i => parseInt(i.id));
        setInventoryVaccines(vaccineInventory);
      } catch (err) {
        console.error('Error loading inventory vaccines:', err);
      }
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

    const handleOpenModal = () => {
      setModalMode('create');
      setEditingRecord(null);
      setFormData({
        record_type: '',
        pet_id: '',
        pet_registration_input: '',
        vaccination_type_id: '',
        vaccination_date: new Date().toISOString().split('T')[0],
        vaccination_next_due_date: '',
        deworming_type_id: '',
        deworming_date: new Date().toISOString().split('T')[0],
        deworming_next_due_date: '',
        dosage: '',
        procedure_type: '',
        sterilization_date: new Date().toISOString().split('T')[0],
        microchip_subtype: '',
        microchip_number: '',
        implant_date: new Date().toISOString().split('T')[0],
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
        vaccination_date: new Date().toISOString().split('T')[0],
        vaccination_next_due_date: '',
        deworming_type_id: '',
        deworming_date: new Date().toISOString().split('T')[0],
        deworming_next_due_date: '',
        dosage: '',
        procedure_type: '',
        sterilization_date: new Date().toISOString().split('T')[0],
        microchip_subtype: '',
        microchip_number: '',
        implant_date: new Date().toISOString().split('T')[0],
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
          microchip_subtype: record.microchip_number ? 'microchip' : 'qr',
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
    if (!recordToDelete) return;
    setDeleteLoading(true);
    try {
      if (filterStatus === 'trash') {
        // Permanent delete
        if (recordToDelete.recordType === 'vaccination') {
          await vaccinationAPI.forceDelete(recordToDelete.id);
        } else if (recordToDelete.recordType === 'deworming') {
          await dewormingAPI.forceDelete(recordToDelete.id);
        } else if (recordToDelete.recordType === 'sterilization') {
          await sterilizationAPI.forceDelete(recordToDelete.id);
        } else if (recordToDelete.recordType === 'microchip') {
          await microchipAPI.forceDelete(recordToDelete.id);
        }
        setSuccess('Record permanently deleted.');
      } else {
        // Soft delete (move to trash)
        if (recordToDelete.recordType === 'vaccination') {
          await vaccinationAPI.delete(recordToDelete.id);
        } else if (recordToDelete.recordType === 'deworming') {
          await dewormingAPI.delete(recordToDelete.id);
        } else if (recordToDelete.recordType === 'sterilization') {
          await sterilizationAPI.delete(recordToDelete.id);
        } else if (recordToDelete.recordType === 'microchip') {
          await microchipAPI.delete(recordToDelete.id);
        }
        setSuccess('Record moved to trash. It will be automatically removed after 30 days.');
      }
      setShowDeleteModal(false);
      setRecordToDelete(null);
      loadData();
      setTimeout(() => setSuccess(''), 6000);
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
        record_type: type
      }));
      setSelectedVaccineBatch(null);
      setSelectedMicrochipBatch(null);
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

          setSuccess('Record updated successfully!');
          handleCloseModal();
          loadData();
          setTimeout(() => setSuccess(''), 5000);
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
        loadData();
        setTimeout(() => setSuccess(''), 5000);
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
  setRecordToRestore({ ...record, recordType: type });
  setShowRestoreModal(true);
  setShowDropdown(null);
};

const handleRestoreConfirm = async () => {
  if (!recordToRestore) return;
  setRestoreLoading(true);
  try {
    if (recordToRestore.recordType === 'vaccination') {
      await vaccinationAPI.restore(recordToRestore.id);
    } else if (recordToRestore.recordType === 'deworming') {
      await dewormingAPI.restore(recordToRestore.id);
    } else if (recordToRestore.recordType === 'sterilization') {
      await sterilizationAPI.restore(recordToRestore.id);
    } else if (recordToRestore.recordType === 'microchip') {
      await microchipAPI.restore(recordToRestore.id);
    }
    setSuccess('Record restored successfully!');
    setShowRestoreModal(false);
    setRecordToRestore(null);
    loadData();
    setTimeout(() => setSuccess(''), 5000);
  } catch (err) {
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setRestoreLoading(false);
  }
};

const getDaysRemaining = (deletedAt) => {
  if (!deletedAt) return null;
  const deleted = new Date(deletedAt);
  const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
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
    const matchesStatus = filterStatus === 'trash' ? !!record.deleted_at : !record.deleted_at;
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
    const emptyRows = itemsPerPage - paginatedRecords.length;

    return (
      <>
        <style>{styles}</style>
        <Container fluid className="py-4 record-management-page" style={{ backgroundColor: '#ffffffff', transition: 'all 0.3s ease' }}>
          <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
            <Col>
              <div>
                <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                  <i 
                    className="fas fa-clipboard-list" 
                    style={{ 
                      fontSize: '1.5rem', 
                      color: '#000000',
                      animation: 'float 3s ease-in-out infinite'
                    }}
                  ></i>
                  <h2 className="mobile-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Record Management</h2>
                </div>
                
              </div>
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

        {success && (
          <Row className="mb-4">
            <Col>
              <Alert 
                variant="success" 
                dismissible 
                onClose={() => setSuccess('')}
                style={{
                  borderRadius: '12px',
                  border: '2px solid #28a745',
                  background: 'rgba(40, 167, 69, 0.1)',
                  color: '#28a745'
                }}
              >
                <i className="fas fa-check-circle me-2"></i>
                {success}
              </Alert>
            </Col>
          </Row>
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

        {/* Filters */}
        <Row className="mb-4 g-2" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
          <Col xs={12} md={4}>
            <InputGroup style={{ borderRadius: '12px', overflow: 'hidden', height: '46px' }}>
              <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
                <i className="fas fa-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by pet name, reg. number, or veterinarian..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: '2px solid #e9ecef', borderLeft: 'none', borderRight: searchTerm ? 'none' : '2px solid #e9ecef', height: '46px' }}
              />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')} style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}>
                  <i className="fas fa-times"></i>
                </Button>
              )}
            </InputGroup>
          </Col>
          <Col xs={6} md={2}>
            <Form.Select value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)}
              style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500', height: '46px' }}>
              <option value="all">All</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={2}>
            <Form.Select value={activeTab} onChange={(e) => setActiveTab(e.target.value)}
              style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500', height: '46px' }}>
              <option value="all">All ({vaccinations.length + sterilizations.length + microchips.length})</option>
              <option value="vaccination">Vaccination ({filteredVaccinations.length})</option>
              <option value="sterilization">Sterilization ({filteredSterilizations.length})</option>
              <option value="microchip">Microchip ({filteredMicrochips.length})</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={2}>
            <Form.Select value={filterClinic} onChange={(e) => { setFilterClinic(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px', border: `2px solid ${filterClinic !== 'all' ? '#4361ee' : '#e9ecef'}`, fontWeight: '500', height: '46px', color: filterClinic !== 'all' ? '#4361ee' : 'inherit', background: filterClinic !== 'all' ? 'rgba(67,97,238,0.04)' : '#ffffff' }}>
              <option value="all">All</option>
              <option value="city_vet">City Vet Muntinlupa</option>
              <option value="private">Private Clinics</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={2}>
            <div style={{ position: 'relative' }}>
              <Form.Select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                style={{
                  borderRadius: '12px',
                  border: `2px solid ${filterStatus === 'trash' ? '#dc3545' : '#e9ecef'}`,
                  fontWeight: '500',
                  height: '46px',
                  color: filterStatus === 'trash' ? '#dc3545' : 'inherit',
                  background: filterStatus === 'trash' ? 'rgba(220,53,69,0.04)' : '#ffffff',
                  appearance: 'none',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="active">Active</option>
                <option value="trash">Trash</option>
              </Form.Select>
              <i className="fas fa-chevron-down" style={{
                position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', fontSize: '0.75rem',
                color: filterStatus === 'trash' ? '#dc3545' : '#6c757d'
              }} />
            </div>
          </Col>
        </Row>
        {/* Records Table */}
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
          <Col>
            <Card 
              className="border-0"
              style={{
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                overflow: 'hidden'
              }}
            >
              <Card.Header
                className="mobile-card-header"
                style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderBottom: '2px solid #ffc107',
                  padding: '1.5rem',
                  borderRadius: '20px 20px 0 0'
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                    {activeTab === 'all' && (
                      <>
                        <i className="fas fa-clipboard-list me-2" style={{ color: '#ffc107' }}></i>
                        All Records ({filteredVaccinations.length + filteredSterilizations.length + filteredMicrochips.length})
                      </>
                    )}
                    {activeTab === 'vaccination' && (
                      <>
                        <i className="fas fa-syringe me-2" style={{ color: '#ffc107' }}></i>
                        Vaccination Records ({filteredVaccinations.length})
                      </>
                    )}
                    
                    {activeTab === 'sterilization' && (
                      <>
                        <i className="fas fa-cut me-2" style={{ color: '#ffc107' }}></i>
                        Sterilization Records ({filteredSterilizations.length})
                      </>
                    )}
                    {activeTab === 'microchip' && (
                      <>
                        <i className="fas fa-microchip me-2" style={{ color: '#4361ee' }}></i>
                        Microchip Records ({filteredMicrochips.length})
                      </>
                    )}
                  </h5>
                  <Button 
                    onClick={handleOpenModal}
                    className="border-0 mobile-add-btn"
                    style={{
                      background: '#ffc107',
                      color: '#000000',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: '700',
                      boxShadow: '0 4px 15px rgba(255, 193, 7, 0.4)',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)';
                      e.currentTarget.style.background = '#ffb300';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
                      e.currentTarget.style.background = '#ffc107';
                    }}
                  >
                    <i className="fas fa-plus me-2"></i>
                    <span>Add Record</span>
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="mobile-card-body" style={{ padding: '2rem' }}>
                {loading ? (
                  <div className="table-responsive">
                    <Table className="mobile-table-wrap" style={{ marginBottom: 0, width: '100%' }}>
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Type</th>
                          <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Pet Information</th>
                          <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Record Details</th>
                          <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Recorded By</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: itemsPerPage }).map((_, i) => (
                          <tr key={`skel-${i}`}>
                            <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div className="skeleton" style={{ width: '90px', height: '13px' }} />
                              </div>
                            </td>
                            <td className="mobile-hide" style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div className="skeleton" style={{ width: '80px', height: '13px' }} />
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                                <div className="skeleton" style={{ width: '90px', height: '13px' }} />
                                <div className="skeleton" style={{ width: '110px', height: '10px' }} />
                              </div>
                            </td>
                            <td className="mobile-hide" style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                                <div className="skeleton" style={{ width: '100px', height: '13px' }} />
                                <div className="skeleton" style={{ width: '70px', height: '10px' }} />
                              </div>
                            </td>
                            <td className="mobile-hide" style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div className="skeleton" style={{ width: '110px', height: '26px', borderRadius: '6px' }} />
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <>
                    {/* All Records Tab */}
                    {activeTab === 'all' && (
                      <>
                        {(filteredVaccinations.length + filteredDewormings.length + filteredSterilizations.length + filteredMicrochips.length) === 0 ? (
                          <div className="text-center py-5">
                            <i className="fas fa-clipboard-list text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                            <h5 style={{ color: '#666666', fontWeight: '600' }}>No Records Found</h5>
                            <p className="text-muted">
                              {searchTerm || filterSpecies !== 'all' 
                                ? 'Try adjusting your filters' 
                                : 'Start by adding records for pets'}
                            </p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <Table hover className="mobile-table-wrap" style={{ marginBottom: 0 }}>
                              <thead style={{ background: '#f8f9fa' }}>
                                <tr>
                                  <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Type</th>
<th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Pet Information</th>
<th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Record Details</th>
<th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Recorded By</th>
{filterStatus === 'trash' && <th className="mobile-hide" style={{ fontWeight: '600', color: '#dc3545', padding: '1rem', textAlign: 'center' }}>Expiry</th>}
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedRecords.map((record, index) => {
                                  if (record.recordType === 'vaccination') {
                                    return (
                                      <tr 
                                        key={`vac-${record.id}`}
                                        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                          <span style={{ fontWeight: '500', color: '#555' }}>
                                            <i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>
                                            Vaccination
                                          </span>
                                        </td>
                                        <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{new Date(record.vaccination_date).toLocaleDateString()}</strong>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <div>
    <strong style={{ fontSize: '1rem', color: '#333' }}>{record.pet_name}</strong>
    <br />
    <small className="text-muted" style={{ fontWeight: '500' }}>
      <i className="fas fa-barcode me-1"></i>
      {record.registration_number}
    </small>
  </div>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{record.vaccine_name}</strong>
  {record.next_due_date && (
    <>
      <br />
      <small>
        Next: <span style={{ 
          color: new Date(record.next_due_date) < new Date() ? '#dc3545' : '#28a745',
          fontWeight: '500'
        }}>
          {new Date(record.next_due_date).toLocaleDateString()}
        </span>
      </small>
    </>
  )}
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#28a745', background: 'rgba(40,167,69,0.1)' }}>
    {record.recorded_by || 'City Vet Muntinlupa'}
  </span>
</td>
{filterStatus === 'trash' && (
  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
    {(() => { const d = getDaysRemaining(record.deleted_at); return (
      <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.6rem', borderRadius: '6px', color: d <= 7 ? '#dc3545' : '#fd7e14', background: d <= 7 ? 'rgba(220,53,69,0.1)' : 'rgba(253,126,20,0.1)' }}>
        <i className="fas fa-clock me-1"></i>{d}d left
      </span>
    ); })()}
  </td>
)}
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === `vac-${record.id}` ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === `vac-${record.id}`) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
      setShowDropdown(`vac-${record.id}`);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
                                      </tr>
                                    );
                                  } else if (record.recordType === 'deworming') {
                                    return (
                                      <tr 
                                        key={`dew-${record.id}`}
                                        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                          <span style={{ fontWeight: '500', color: '#555' }}>
                                            <i className="fas fa-pills me-1" style={{ color: '#17a2b8' }}></i>
                                            Deworming
                                          </span>
                                        </td>
                                        <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{new Date(record.deworming_date).toLocaleDateString()}</strong>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <div>
    <strong style={{ fontSize: '1rem', color: '#333' }}>{record.pet_name}</strong>
    <br />
    <small className="text-muted" style={{ fontWeight: '500' }}>
      <i className="fas fa-barcode me-1"></i>
      {record.registration_number}
    </small>
  </div>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{record.deworming_name}</strong>
  {record.dosage && (
    <>
      <br />
      <small className="text-muted">Dosage: {record.dosage}</small>
    </>
  )}
  {record.next_due_date && (
    <>
      <br />
      <small>
        Next: <span style={{ 
          color: new Date(record.next_due_date) < new Date() ? '#dc3545' : '#28a745',
          fontWeight: '500'
        }}>
          {new Date(record.next_due_date).toLocaleDateString()}
        </span>
      </small>
    </>
  )}
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#28a745', background: 'rgba(40,167,69,0.1)' }}>
    {record.recorded_by || 'City Vet Muntinlupa'}
  </span>
</td>
{filterStatus === 'trash' && (
  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
    {(() => { const d = getDaysRemaining(record.deleted_at); return (
      <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.6rem', borderRadius: '6px', color: d <= 7 ? '#dc3545' : '#fd7e14', background: d <= 7 ? 'rgba(220,53,69,0.1)' : 'rgba(253,126,20,0.1)' }}>
        <i className="fas fa-clock me-1"></i>{d}d left
      </span>
    ); })()}
  </td>
)}
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === `dew-${record.id}` ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === `dew-${record.id}`) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
      setShowDropdown(`dew-${record.id}`);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
                                      </tr>
                                    );
                                  } else if (record.recordType === 'sterilization') {
                                    return (
                                      <tr 
                                        key={`ster-${record.id}`}
                                        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                          <span style={{ fontWeight: '500', color: '#555' }}>
                                            <i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>
                                            Sterilization
                                          </span>
                                        </td>
                                        <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{new Date(record.sterilization_date).toLocaleDateString()}</strong>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <div>
    <strong style={{ fontSize: '1rem', color: '#333' }}>{record.pet_name}</strong>
    <br />
    <small className="text-muted" style={{ fontWeight: '500' }}>
      <i className="fas fa-barcode me-1"></i>
      {record.registration_number}
    </small>
  </div>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <Badge bg="success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>{record.procedure_type}</Badge>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#28a745', background: 'rgba(40,167,69,0.1)' }}>
    {record.recorded_by || 'City Vet Muntinlupa'}
  </span>
</td>
{filterStatus === 'trash' && (
  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
    {(() => { const d = getDaysRemaining(record.deleted_at); return (
      <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.6rem', borderRadius: '6px', color: d <= 7 ? '#dc3545' : '#fd7e14', background: d <= 7 ? 'rgba(220,53,69,0.1)' : 'rgba(253,126,20,0.1)' }}>
        <i className="fas fa-clock me-1"></i>{d}d left
      </span>
    ); })()}
  </td>
)}
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === `ster-${record.id}` ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === `ster-${record.id}`) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
      setShowDropdown(`ster-${record.id}`);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
                                      </tr>
                                    );
                                  }
                                  else if (record.recordType === 'microchip') {
                                    return (
                                      <tr key={`mic-${record.id}`}
                                        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(67, 97, 238, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                          <span style={{ fontWeight: '500', color: '#555' }}>
                                            <i className="fas fa-microchip me-1" style={{ color: '#4361ee' }}></i>Microchip
                                          </span>
                                        </td>
                                        <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{new Date(record.implant_date).toLocaleDateString()}</strong>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <div>
    <strong style={{ fontSize: '1rem', color: '#333' }}>{record.pet_name}</strong><br />
    <small className="text-muted" style={{ fontWeight: '500' }}><i className="fas fa-barcode me-1"></i>{record.registration_number}</small>
  </div>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333', fontFamily: 'monospace' }}>{record.microchip_number}</strong>
  {record.microchip_brand && <><br /><small className="text-muted">Brand: {record.microchip_brand}</small></>}
  {record.implant_site && <><br /><small className="text-muted">Site: {record.implant_site}</small></>}
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#28a745', background: 'rgba(40,167,69,0.1)' }}>
    {record.recorded_by || 'City Vet Muntinlupa'}
  </span>
</td>
{filterStatus === 'trash' && (
  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
    {(() => { const d = getDaysRemaining(record.deleted_at); return (
      <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.6rem', borderRadius: '6px', color: d <= 7 ? '#dc3545' : '#fd7e14', background: d <= 7 ? 'rgba(220,53,69,0.1)' : 'rgba(253,126,20,0.1)' }}>
        <i className="fas fa-clock me-1"></i>{d}d left
      </span>
    ); })()}
  </td>
)}
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === `mic-${record.id}` ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === `mic-${record.id}`) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
      setShowDropdown(`mic-${record.id}`);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
                                      </tr>
                                    );
                                  }
                                  return null;
                                })}
                                {/* Empty rows to maintain fixed height */}
                                {Array.from({ length: emptyRows }).map((_, index) => (
                                  <tr key={`empty-${index}`} style={{ height: '73px', pointerEvents: 'none' }}>
                                    <td colSpan="7" 
                                    style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                                      <div style={{ visibility: 'hidden' }}>Empty</div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </>
                    )}

                    {/* Vaccination Tab */}
                    {activeTab === 'vaccination' && (
                      <>
                        {filteredVaccinations.length === 0 ? (
                          <div className="text-center py-5">
                            <i className="fas fa-syringe text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                            <h5 style={{ color: '#666666', fontWeight: '600' }}>No Vaccination Records</h5>
                            <p className="text-muted">
                              {searchTerm || filterSpecies !== 'all' 
                                ? 'Try adjusting your filters' 
                                : 'Start by adding vaccination records for pets'}
                            </p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <Table hover className="mobile-table-wrap" style={{ marginBottom: 0 }}>
                              <thead style={{ background: '#f8f9fa' }}>
                                <tr>
                                  <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
                                  <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Pet Information</th>
                                  <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Vaccine Type</th>
                                  <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Next Due</th>
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Recorded By</th>
{filterStatus === 'trash' && <th className="mobile-hide" style={{ fontWeight: '600', color: '#dc3545', padding: '1rem', textAlign: 'center' }}>Expiry</th>}
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
    {paginatedRecords.map(vaccination => (
      <tr 
        key={vaccination.id}
        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{new Date(vaccination.vaccination_date).toLocaleDateString()}</strong>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <div>
    <strong style={{ fontSize: '1rem', color: '#333' }}>{vaccination.pet_name}</strong>
    <br />
    <small className="text-muted" style={{ fontWeight: '500' }}>
      <i className="fas fa-barcode me-1"></i>
      {vaccination.registration_number}
    </small>
  </div>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{vaccination.vaccine_name}</strong>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  {vaccination.next_due_date ? (
            <span style={{ 
              color: new Date(vaccination.next_due_date) < new Date() ? '#dc3545' : '#28a745',
              fontWeight: '500'
            }}>
              {new Date(vaccination.next_due_date).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-muted">N/A</span>
          )}
        </td>
        <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#28a745', background: 'rgba(40,167,69,0.1)' }}>
    {vaccination.recorded_by || vaccination.clinic_name || 'City Vet Muntinlupa'}
  </span>
</td>
{filterStatus === 'trash' && (
  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
    {(() => { const d = getDaysRemaining(vaccination.deleted_at); return (
      <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.6rem', borderRadius: '6px', color: d <= 7 ? '#dc3545' : '#fd7e14', background: d <= 7 ? 'rgba(220,53,69,0.1)' : 'rgba(253,126,20,0.1)' }}>
        <i className="fas fa-clock me-1"></i>{d}d left
      </span>
    ); })()}
  </td>
)}
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === `vac-tab-${vaccination.id}` ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === `vac-tab-${vaccination.id}`) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
      setShowDropdown(`vac-tab-${vaccination.id}`);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
      </tr>
    ))}
    {/* Empty rows to maintain fixed height */}
    {Array.from({ length: emptyRows }).map((_, index) => (
                                  <tr key={`empty-${index}`} style={{ height: '73px' }}>
                                    <td colSpan="7" style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                                      <div style={{ visibility: 'hidden' }}>Empty</div>
                                    </td>
                                  </tr>
                                ))}
                              
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </>
                    )}

                    

                    {/* Sterilization Tab */}
                    {activeTab === 'sterilization' && (
                      <>
                        {filteredSterilizations.length === 0 ? (
                          <div className="text-center py-5">
                            <i className="fas fa-cut text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                            <h5 style={{ color: '#666666', fontWeight: '600' }}>No Sterilization Records</h5>
                            <p className="text-muted">
                              {searchTerm || filterSpecies !== 'all' 
                                ? 'Try adjusting your filters' 
                                : 'Sterilization records will appear here'}
                            </p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <Table hover className="mobile-table-wrap" style={{ marginBottom: 0 }}>
                              <thead style={{ background: '#f8f9fa' }}>
                                <tr>
                                  <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Pet Information</th>
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Procedure Type</th>
<th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Recorded By</th>
{filterStatus === 'trash' && <th className="mobile-hide" style={{ fontWeight: '600', color: '#dc3545', padding: '1rem', textAlign: 'center' }}>Expiry</th>}
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
  </tr>
  </thead>
                              <tbody>
    {paginatedRecords.map(sterilization => (
      <tr 
        key={sterilization.id}
        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{new Date(sterilization.sterilization_date).toLocaleDateString()}</strong>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <div>
    <strong style={{ fontSize: '1rem', color: '#333' }}>{sterilization.pet_name}</strong>
    <br />
    <small className="text-muted" style={{ fontWeight: '500' }}>
      <i className="fas fa-barcode me-1"></i>
      {sterilization.registration_number}
    </small>
  </div>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <Badge bg="success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>{sterilization.procedure_type}</Badge>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#28a745', background: 'rgba(40,167,69,0.1)' }}>
    {sterilization.clinic_name || 'City Vet Muntinlupa'}
  </span>
</td>
{filterStatus === 'trash' && (
  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
    {(() => { const d = getDaysRemaining(sterilization.deleted_at); return (
      <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.6rem', borderRadius: '6px', color: d <= 7 ? '#dc3545' : '#fd7e14', background: d <= 7 ? 'rgba(220,53,69,0.1)' : 'rgba(253,126,20,0.1)' }}>
        <i className="fas fa-clock me-1"></i>{d}d left
      </span>
    ); })()}
  </td>
)}
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === `ster-tab-${sterilization.id}` ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === `ster-tab-${sterilization.id}`) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
      setShowDropdown(`ster-tab-${sterilization.id}`);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
      </tr>
    ))}
    {/* Empty rows to maintain fixed height */}
                                {Array.from({ length: emptyRows }).map((_, index) => (
                                  <tr key={`empty-${index}`} style={{ height: '73px' }}>
                                    <td colSpan="7" style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                                      <div style={{ visibility: 'hidden' }}>Empty</div>
                                    </td>
                                  </tr>
                                ))}
                              
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </>
                    )}

                    {/* Microchip Tab */}
                    {activeTab === 'microchip' && (
                      <>
                        {filteredMicrochips.length === 0 ? (
                          <div className="text-center py-5">
                            <i className="fas fa-microchip text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                            <h5 style={{ color: '#666666', fontWeight: '600' }}>No Microchip Records</h5>
                            <p className="text-muted">{searchTerm || filterSpecies !== 'all' ? 'Try adjusting your filters' : 'Microchip records will appear here'}</p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <Table hover className="mobile-table-wrap" style={{ marginBottom: 0 }}>
                              <thead style={{ background: '#f8f9fa' }}>
                                <tr>
                                  <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
<th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Pet Information</th>
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Microchip Number</th>
<th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Brand</th>
<th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Implant Site</th>
<th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Recorded By</th>
{filterStatus === 'trash' && <th className="mobile-hide" style={{ fontWeight: '600', color: '#dc3545', padding: '1rem', textAlign: 'center' }}>Expiry</th>}
<th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedRecords.map(microchip => (
                                  <tr key={microchip.id} style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(67, 97, 238, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333' }}>{new Date(microchip.implant_date).toLocaleDateString()}</strong>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ fontSize: '1rem', color: '#333' }}>{microchip.pet_name}</strong><br />
  <small className="text-muted" style={{ fontWeight: '500' }}><i className="fas fa-barcode me-1"></i>{microchip.registration_number}</small>
</td>
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <strong style={{ color: '#333', fontFamily: 'monospace' }}>{microchip.microchip_number}</strong>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <small style={{ fontWeight: '500', color: '#555' }}>{microchip.microchip_brand || '-'}</small>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <small style={{ fontWeight: '500', color: '#555' }}>{microchip.implant_site || '-'}</small>
</td>
<td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#28a745', background: 'rgba(40,167,69,0.1)' }}>
    {microchip.clinic_name || 'City Vet Muntinlupa'}
  </span>
</td>
{filterStatus === 'trash' && (
  <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
    {(() => { const d = getDaysRemaining(microchip.deleted_at); return (
      <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.6rem', borderRadius: '6px', color: d <= 7 ? '#dc3545' : '#fd7e14', background: d <= 7 ? 'rgba(220,53,69,0.1)' : 'rgba(253,126,20,0.1)' }}>
        <i className="fas fa-clock me-1"></i>{d}d left
      </span>
    ); })()}
  </td>
)}
<td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === `mic-tab-${microchip.id}` ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === `mic-tab-${microchip.id}`) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
      setShowDropdown(`mic-tab-${microchip.id}`);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
                                  </tr>
                                ))}
                                {Array.from({ length: emptyRows }).map((_, index) => (
                                  <tr key={`empty-${index}`} style={{ height: '73px' }}>
                                    <td colSpan="8" style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                                      <div style={{ visibility: 'hidden' }}>Empty</div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        {/* Pagination */}
        {currentRecords.length > itemsPerPage && (
          <Row className="mt-4 mobile-pagination" style={{ animation: 'dropDown 0.4s ease-out 0.6s backwards' }}>
            <Col className="d-flex justify-content-between align-items-center">
              {/* Left: Page X of Y */}
              <span className="page-info" style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
                Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{totalPages}</strong>
              </span>

              {/* Right: Pagination buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Prev button */}
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: currentPage === 1 ? '#e9ecef' : '#ffffff',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    color: currentPage === 1 ? '#adb5bd' : '#333333',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if (currentPage !== 1) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                  onMouseOut={(e) => { if (currentPage !== 1) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>

                {/* Page number buttons */}
                {(() => {
                  const pages = [];
                  if (totalPages <= 3) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    let start = Math.max(1, currentPage - 1);
                    let end = Math.min(totalPages, start + 2);
                    if (end - start < 2) start = Math.max(1, end - 2);
                    
                    for (let i = start; i <= end; i++) pages.push(i);
                    
                  }

                  return pages.map((page, idx) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} style={{ padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: '600' }}>...</span>
                      );
                    }
                    return (
                      <button
                        className="page-btn"
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          background: currentPage === page ? '#ffc107' : '#ffffff',
                          border: '2px solid',
                          borderColor: currentPage === page ? '#ffc107' : '#dee2e6',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          minWidth: '40px',
                          cursor: 'pointer',
                          fontWeight: '700',
                          color: currentPage === page ? '#000000' : '#333333',
                          transition: 'all 0.2s',
                          boxShadow: currentPage === page ? '0 2px 8px rgba(255, 193, 7, 0.3)' : 'none'
                        }}
                        onMouseOver={(e) => { if (currentPage !== page) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                        onMouseOut={(e) => { if (currentPage !== page) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}

                {/* Next button */}
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    background: currentPage === totalPages ? '#e9ecef' : '#ffffff',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    color: currentPage === totalPages ? '#adb5bd' : '#333333',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#ffc107'; } }}
                  onMouseOut={(e) => { if (currentPage !== totalPages) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </Col>
          </Row>
        )}

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
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Microchip / QR</div>
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
          Select Batch <span style={{ color: '#dc3545' }}>*</span>
        </Form.Label>
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
                              max={new Date().toISOString().split('T')[0]}
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
                              max={new Date().toISOString().split('T')[0]}
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
              max={new Date().toISOString().split('T')[0]}
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
                      {/* Subtype selector */}
                      <Row className="mb-3">
                        <Col md={12}>
                          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                            Identification Type <span style={{ color: '#dc3545' }}>*</span>
                          </Form.Label>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <div
                              onClick={() => {
                                setFormData(prev => ({ ...prev, microchip_subtype: 'microchip' }));
                                setSelectedMicrochipBatch(null);
                                loadMicrochipBatches();
                              }}
                              style={{ flex: 1, padding: '1rem', border: formData.microchip_subtype === 'microchip' ? '3px solid #4361ee' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.microchip_subtype === 'microchip' ? '#eef0ff' : '#ffffff', transition: 'all 0.3s' }}
                            >
                              <i className="fas fa-microchip" style={{ fontSize: '1.8rem', color: '#4361ee', marginBottom: '0.4rem', display: 'block' }}></i>
                              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Microchip</div>
                              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>Enter chip number manually</div>
                            </div>
                            <div
                              onClick={() => setFormData(prev => ({ ...prev, microchip_subtype: 'qr' }))}
                              style={{ flex: 1, padding: '1rem', border: formData.microchip_subtype === 'qr' ? '3px solid #28a745' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.microchip_subtype === 'qr' ? '#e6f9e9' : '#ffffff', transition: 'all 0.3s' }}
                            >
                              <i className="fas fa-qrcode" style={{ fontSize: '1.8rem', color: '#28a745', marginBottom: '0.4rem', display: 'block' }}></i>
                              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>QR Code</div>
                              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>Auto-generated from pet data</div>
                            </div>
                          </div>
                        </Col>
                      </Row>

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

                      {/* QR subtype: auto-generated notice */}
                      {formData.microchip_subtype === 'qr' && (
                        <Row>
                          <Col md={12}>
                            <Alert variant="info" className="mb-3" style={{ borderRadius: '10px' }}>
                              <i className="fas fa-info-circle me-2"></i>
                              A QR code will be <strong>automatically generated</strong> from the pet's profile data upon saving. No number input needed.
                            </Alert>
                          </Col>
                        </Row>
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
                                <Form.Control type="date" name="implant_date" value={formData.implant_date} onChange={handleChange} max={new Date().toISOString().split('T')[0]} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
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
                    // Edit mode: go straight to save
                    handleSubmit({ preventDefault: () => {} });
                    return;
                  }
                  setShowConfirmRecordModal(true);
                }}
                disabled={
                  formLoading ||
                  !formData.record_type ||
                  (modalMode === 'create' && !getSelectedPet()) ||
                  (formData.record_type === 'microchip' && !formData.microchip_subtype) ||
                  (formData.record_type === 'microchip' && formData.microchip_subtype === 'microchip' && !formData.microchip_number) ||
                  (formData.record_type === 'microchip' && formData.microchip_subtype === 'microchip' && modalMode === 'create' && !selectedMicrochipBatch) ||
                  (formData.record_type === 'vaccination' && modalMode === 'create' && formData.vaccination_type_id && !selectedVaccineBatch) ||
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
<Modal show={showRestoreModal} onHide={() => setShowRestoreModal(false)} centered style={{ zoom: '0.75' }}>
  <Modal.Header closeButton style={{ background: '#f0fff4', borderBottom: '2px solid #28a745' }}>
    <Modal.Title style={{ fontWeight: '700' }}>
      <i className="fas fa-undo text-success me-2"></i>Restore Record
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '2rem' }}>
    {recordToRestore && (
      <>
        <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#444' }}>
          Are you sure you want to restore this record? It will be moved back to active records.
        </p>
        <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
          <div className="mb-2">
            <span style={{ fontWeight: '500', color: '#555' }}>
              {recordToRestore.recordType === 'vaccination' && <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</>}
              {recordToRestore.recordType === 'deworming' && <><i className="fas fa-pills me-1" style={{ color: '#17a2b8' }}></i>Deworming</>}
              {recordToRestore.recordType === 'sterilization' && <><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</>}
              {recordToRestore.recordType === 'microchip' && <><i className="fas fa-microchip me-1" style={{ color: '#4361ee' }}></i>Microchip</>}
            </span>
          </div>
          <strong style={{ fontSize: '1.1rem' }}>{recordToRestore.pet_name}</strong><br />
          <small className="text-muted"><i className="fas fa-barcode me-1"></i>{recordToRestore.registration_number}</small>
          {(() => { const d = getDaysRemaining(recordToRestore.deleted_at); return d !== null && (
            <div className="mt-2">
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: d <= 7 ? '#dc3545' : '#fd7e14' }}>
                <i className="fas fa-clock me-1"></i>{d} day{d !== 1 ? 's' : ''} remaining before permanent deletion
              </span>
            </div>
          ); })()}
        </div>
        <Alert variant="success" className="mt-3 mb-0">
          <i className="fas fa-check-circle me-2"></i>
          <strong>Notice:</strong> This record will be fully restored and visible in active records.
        </Alert>
      </>
    )}
  </Modal.Body>
  <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
    <Button variant="secondary" onClick={() => setShowRestoreModal(false)} disabled={restoreLoading}
      style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Cancel</Button>
    <Button variant="success" onClick={handleRestoreConfirm} disabled={restoreLoading}
      style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
      {restoreLoading ? <><Spinner size="sm" animation="border" className="me-2" />Restoring...</> : <><i className="fas fa-undo me-2"></i>Restore Record</>}
    </Button>
  </Modal.Footer>
</Modal>

{/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered style={{ zoom: '0.75' }}>
          <Modal.Header closeButton style={{ background: filterStatus === 'trash' ? '#fff5f5' : '#f8f9fa', borderBottom: `2px solid ${filterStatus === 'trash' ? '#dc3545' : '#dee2e6'}` }}>
            <Modal.Title style={{ fontWeight: '700' }}>
              <i className={`fas ${filterStatus === 'trash' ? 'fa-trash-alt' : 'fa-trash'} text-danger me-2`}></i>
              {filterStatus === 'trash' ? 'Permanently Delete Record' : 'Move to Trash'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem' }}>
          {recordToDelete && (
              <>
                <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#444' }}>
                  {filterStatus === 'trash'
                    ? 'Are you sure you want to permanently delete this record? This cannot be undone.'
                    : 'This record will be moved to trash and can be recovered within 30 days.'}
                </p>
                <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: `4px solid ${filterStatus === 'trash' ? '#dc3545' : '#ffc107'}` }}>
                  <div className="mb-2">
                    <span style={{ fontWeight: '500', color: '#555' }}>
                      {recordToDelete.recordType === 'vaccination' && <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</>}
                      {recordToDelete.recordType === 'deworming' && <><i className="fas fa-pills me-1" style={{ color: '#17a2b8' }}></i>Deworming</>}
                      {recordToDelete.recordType === 'sterilization' && <><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</>}
                      {recordToDelete.recordType === 'microchip' && <><i className="fas fa-microchip me-1" style={{ color: '#4361ee' }}></i>Microchip</>}
                    </span>
                  </div>
                  <strong style={{ fontSize: '1.1rem' }}>{recordToDelete.pet_name}</strong>
                  <br />
                  <small className="text-muted">
                    <i className="fas fa-barcode me-1"></i>
                    {recordToDelete.registration_number}
                    {recordToDelete.veterinarian_name && <> • Dr. {recordToDelete.veterinarian_name}</>}
                  </small>
                </div>
                {filterStatus === 'trash' ? (
                  <Alert variant="danger" className="mt-3 mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>Warning:</strong> This action is permanent and cannot be undone.
                  </Alert>
                ) : (
                  <div className="mt-3 mb-0 d-flex align-items-start gap-2 p-3" style={{ background: 'rgba(255,193,7,0.08)', borderRadius: '10px', border: '1px solid rgba(255,193,7,0.3)' }}>
                    <i className="fas fa-clock mt-1" style={{ color: '#ffc107', flexShrink: 0 }}></i>
                    <div style={{ fontSize: '0.88rem', color: '#666' }}>
                      <strong style={{ color: '#333' }}>Moved to Trash</strong> — This record will be recoverable for <strong>30 days</strong>, after which it will be automatically and permanently deleted.
                    </div>
                  </div>
                )}
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
              {deleteLoading ? (
                <><Spinner size="sm" animation="border" className="me-2" />Processing...</>
              ) : filterStatus === 'trash' ? (
                <><i className="fas fa-trash-alt me-2"></i>Permanently Delete</>
              ) : (
                <><i className="fas fa-trash me-2"></i>Move to Trash</>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

      </Container>

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
            onClick={async () => {
              setShowConfirmRecordModal(false);
              await handleSubmit({ preventDefault: () => {} });
            }}
            style={{ background: formLoading ? '#6c757d' : '#000000', color: '#ffffff', borderRadius: '10px', padding: '0.75rem 1.75rem', fontWeight: '700', transition: 'all 0.3s' }}
            onMouseOver={e => { if (!formLoading) e.currentTarget.style.background = '#333'; }}
            onMouseOut={e => { if (!formLoading) e.currentTarget.style.background = '#000'; }}
          >
            {formLoading
              ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</>
              : <><i className="fas fa-save me-2" />Confirm</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Ellipsis Dropdown Portal ── */}
      {showDropdown !== null && (
        <>
          <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
          <div style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            transform: 'translateY(-50%)',
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '170px',
            zIndex: 1050,
            overflow: 'hidden',
            zoom: '0.75',
          }}>
            {(() => {
              const id = showDropdown;
              if (id.startsWith('vac-') && !id.startsWith('vac-tab-')) {
                const record = vaccinations.find(r => `vac-${r.id}` === id);
                if (!record) return null;
                return (<>
                  <button onClick={() => handleViewRecord(record, 'vaccination')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span></button>
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleOpenEditModal(record, 'vaccination')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span></button>
)}
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleDeleteClick(record, 'vaccination')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>{filterStatus === 'trash' ? 'Delete Permanently' : 'Delete Record'}</span></button>
)}
{filterStatus === 'trash' && record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleRestoreClick(record, 'vaccination')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#28a745', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f0fff4'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/restore.png" alt="Restore" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Restore Record</span></button>
)}
              </>);
              }
              if (id.startsWith('vac-tab-')) {
                const record = vaccinations.find(r => `vac-tab-${r.id}` === id);
                if (!record) return null;
                return (<>
                  <button onClick={() => handleViewRecord(record, 'vaccination')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span></button>
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleOpenEditModal(record, 'vaccination')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span></button>
)}
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleDeleteClick(record, 'vaccination')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Delete Record</span></button>
)}
                </>);
              }
              if (id.startsWith('dew-') && !id.startsWith('dew-tab-')) {
                const record = dewormings.find(r => `dew-${r.id}` === id);
                if (!record) return null;
                return (<>
                  <button onClick={() => handleViewRecord(record, 'deworming')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span></button>
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleOpenEditModal(record, 'deworming')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span></button>
)}
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleDeleteClick(record, 'deworming')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>{filterStatus === 'trash' ? 'Delete Permanently' : 'Delete Record'}</span></button>
)}
{filterStatus === 'trash' && record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleRestoreClick(record, 'deworming')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#28a745', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f0fff4'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/restore.png" alt="Restore" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Restore Record</span></button>
)}
                </>);
              }
              if (id.startsWith('dew-tab-')) {
                const record = dewormings.find(r => `dew-tab-${r.id}` === id);
                if (!record) return null;
                return (<>
                  <button onClick={() => handleViewRecord(record, 'deworming')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span></button>
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleOpenEditModal(record, 'deworming')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span></button>
)}
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleDeleteClick(record, 'deworming')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Delete Record</span></button>
)}
                </>);
              }
              if (id.startsWith('ster-') && !id.startsWith('ster-tab-')) {
                const record = sterilizations.find(r => `ster-${r.id}` === id);
                if (!record) return null;
                return (<>
                  <button onClick={() => handleViewRecord(record, 'sterilization')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span></button>
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleOpenEditModal(record, 'sterilization')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span></button>
)}
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleDeleteClick(record, 'sterilization')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>{filterStatus === 'trash' ? 'Delete Permanently' : 'Delete Record'}</span></button>
)}
{filterStatus === 'trash' && record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleRestoreClick(record, 'sterilization')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#28a745', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f0fff4'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/restore.png" alt="Restore" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Restore Record</span></button>
)}
                </>);
              }
              if (id.startsWith('ster-tab-')) {
                const record = sterilizations.find(r => `ster-tab-${r.id}` === id);
                if (!record) return null;
                return (<>
                  <button onClick={() => handleViewRecord(record, 'sterilization')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span></button>
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleOpenEditModal(record, 'sterilization')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span></button>
)}
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleDeleteClick(record, 'sterilization')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Delete Record</span></button>
)}
                </>);
              }
              if (id.startsWith('mic-') && !id.startsWith('mic-tab-')) {
                const record = microchips.find(r => `mic-${r.id}` === id);
                if (!record) return null;
                return (<>
                  <button onClick={() => handleViewRecord(record, 'microchip')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span></button>
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleOpenEditModal(record, 'microchip')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span></button>
)}
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleDeleteClick(record, 'microchip')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>{filterStatus === 'trash' ? 'Delete Permanently' : 'Delete Record'}</span></button>
)}
{filterStatus === 'trash' && record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleRestoreClick(record, 'microchip')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#28a745', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f0fff4'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/restore.png" alt="Restore" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Restore Record</span></button>
)}
                </>);
              }
              if (id.startsWith('mic-tab-')) {
                const record = microchips.find(r => `mic-tab-${r.id}` === id);
                if (!record) return null;
                return (<>
                  <button onClick={() => handleViewRecord(record, 'microchip')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span></button>
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleOpenEditModal(record, 'microchip')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span></button>
)}
                  {record.recorded_by === 'City Vet Muntinlupa' && (
  <button onClick={() => handleDeleteClick(record, 'microchip')} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}><img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Delete Record</span></button>
)}
                </>);
              }
              return null;
            })()}
          </div>
        </>
      )}
      </>
    );
  };

  export default RecordManagement;