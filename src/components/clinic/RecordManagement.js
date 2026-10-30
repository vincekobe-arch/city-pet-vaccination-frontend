import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Modal, Form, InputGroup } from 'react-bootstrap';
import { clinicAPI, vaccinationAPI, dewormingAPI, sterilizationAPI, microchipAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useRef } from 'react';

const ClinicRecordManagement = () => {
  const [vaccinations, setVaccinations] = useState([]);
  const [dewormings, setDewormings] = useState([]);
  const [sterilizations, setSterilizations] = useState([]);
  const [microchips, setMicrochips] = useState([]);
  const [pets, setPets] = useState([]);
  const [vaccinationTypes, setVaccinationTypes] = useState([]);
  const [dewormingTypes, setDewormingTypes] = useState([]);
 const [inventoryVaccineItems, setInventoryVaccineItems] = useState([]);
  const [inventoryDewormerItems, setInventoryDewormerItems] = useState([]);
  const [selectedInventoryVaccineId, setSelectedInventoryVaccineId] = useState(null);
  const [selectedInventoryDewormerId, setSelectedInventoryDewormerId] = useState(null);
  const [selectedInventoryVaccineLabel, setSelectedInventoryVaccineLabel] = useState('');
  const [selectedInventoryDewormerLabel, setSelectedInventoryDewormerLabel] = useState('');
  const [resolvedVaccinationTypeId, setResolvedVaccinationTypeId] = useState('');
  const [resolvedDewormingTypeId, setResolvedDewormingTypeId] = useState('');
const [vaccineBatches, setVaccineBatches] = useState({});
const [selectedVaccineBatch, setSelectedVaccineBatch] = useState(null);
const [dewormingBatches, setDewormingBatches] = useState({});
const [selectedDewormingBatch, setSelectedDewormingBatch] = useState(null);
const [microchipBatches, setMicrochipBatches] = useState([]);
const [selectedMicrochipBatch, setSelectedMicrochipBatch] = useState(null);
const [loadingBatches, setLoadingBatches] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showClinicPetSearchModal, setShowClinicPetSearchModal] = useState(false);
const [clinicPetSearchTerm, setClinicPetSearchTerm] = useState('');

 const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
const [showDropdown, setShowDropdown] = useState(null);
  const dropdownButtonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ZOOM = 0.75;
    // Floating notification helper (a newer message resets the timer)
  const successTimerRef = useRef(null);
  const showSuccess = (msg, duration = 4000) => {
    clearTimeout(successTimerRef.current);
    setSuccess(msg);
    successTimerRef.current = setTimeout(() => setSuccess(''), duration);
  };

  // Blocks double submits (a ref updates instantly, unlike state)
  const submittingRef = useRef(false);

  const validateDueDate = (date, nextDue, label) => {
    if (!nextDue) return true;
    const d = new Date(date), nd = new Date(nextDue), today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d.getTime() === nd.getTime()) { setError(`${label} date and next due date cannot be the same`); return false; }
    if (nd < today) { setError('Next due date cannot be in the past'); return false; }
    return true;
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [recordToRestore, setRecordToRestore] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // 'active' | 'trash'
  const [currentPage, setCurrentPage] = useState(1);

  const [showConfirmRecordModal, setShowConfirmRecordModal] = useState(false);
const [pendingSubmitEvent, setPendingSubmitEvent] = useState(null);

  const itemsPerPage = 5;

  const styles = `
    @keyframes dropDown {
      0% { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    .clinic-records-page { zoom: 0.75; }
    @media (min-width: 1600px) { .clinic-records-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .clinic-records-page { zoom: 1; } }
    @media (max-width: 768px) {
      .clinic-records-page { zoom: 1; }
      .rec-title { font-size: 1.4rem !important; }
      .rec-stat-number { font-size: 1.4rem !important; }
      .rec-stat-label { font-size: 0.6rem !important; }
      .rec-stat-desc { display: none !important; }
      .rec-stat-icon { width: 36px !important; height: 36px !important; border-radius: 10px !important; }
      .rec-stat-icon img { width: 22px !important; height: 22px !important; }
      .rec-table th { font-size: 0.7rem !important; padding: 0.5rem 0.4rem !important; }
      .rec-table td { font-size: 0.72rem !important; padding: 0.5rem 0.4rem !important; }
      .rec-table .col-hide { display: none !important; }
      .rec-filter-search { font-size: 0.8rem !important; }
      .rec-add-btn { padding: 0.4rem 0.8rem !important; font-size: 0.8rem !important; }
      .rec-card-header h5 { font-size: 0.9rem !important; }
      .rec-card-body { padding: 1rem !important; }
      .rec-type-card { min-width: 140px !important; padding: 1rem !important; }
      .rec-type-card img { width: 36px !important; height: 36px !important; }
      .rec-type-card div { font-size: 0.9rem !important; }
    }
  `;

  const [formData, setFormData] = useState({
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
    microchip_number: '',
    implant_date: new Date().toISOString().split('T')[0],
    implant_site: '',
    microchip_brand: '',
    veterinarian_name: '',
    weight: '',
    notes: ''
  });

  const user = getUser();

  useEffect(() => { loadData(); }, [filterStatus]);
useEffect(() => { setCurrentPage(1); }, [activeTab, filterSpecies, searchTerm, filterStatus]);

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
  // Add this new function before the loadData function:
const loadClinicInventory = async () => {
  try {
    const res = await api.get('/clinic/inventory').then(r => r.data);
    const items = res.inventory || [];

    setInventoryVaccineItems(
  items.filter(i => i.item_type === 'vaccination')
);
setInventoryDewormerItems(
  items.filter(i => i.item_type === 'deworming')
);
  } catch (err) {
    console.error('Error loading clinic inventory:', err);
  }
};

  const loadClinicVaccineBatches = async (inventoryItemId) => {
    const { inventoryAPI } = await import('../../services/api');
    setLoadingBatches(true);
    try {
      const res = await inventoryAPI.getClinicRecordBatchAvailability(inventoryItemId);
      setVaccineBatches(prev => ({ ...prev, [inventoryItemId]: res.data.batches || [] }));
    } catch (err) {
      console.error('Failed to load clinic vaccine batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadClinicMicrochipBatches = async () => {
    const { inventoryAPI } = await import('../../services/api');
    setLoadingBatches(true);
    try {
      // Find microchip item in clinic inventory — fetch via clinic inventory API
      const res = await api.get('/clinic/inventory/type/vaccination'); // reuse pattern
      // Actually load microchip type
      const mcRes = await api.get('/clinic/inventory');
      const allItems = mcRes.data.inventory || [];
      const mcItem = allItems.find(i => i.item_type === 'microchip');
      if (!mcItem) { setMicrochipBatches([]); return; }
      const batchRes = await inventoryAPI.getClinicRecordBatchAvailability(mcItem.id);
      setMicrochipBatches(batchRes.data.batches || []);
    } catch (err) {
      console.error('Failed to load clinic microchip batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadData = async () => {
  try {
    setLoading(true);
    const trashParam = filterStatus === 'trash' ? '?trash=1' : '';
    const [recordsRes, microchipsRes] = await Promise.all([
      clinicAPI.getRecords(trashParam),
      microchipAPI.getAll(trashParam)
    ]);
    loadClinicInventory(); // load clinic inventory in background
      const data = recordsRes.data;
      setVaccinations(data.vaccination_records || []);
      setDewormings(data.deworming_records || []);
      setSterilizations(data.sterilization_records || []);
      setMicrochips(microchipsRes.data.microchip_records || []);
      setPets(data.pets || []);
      setVaccinationTypes(data.vaccination_types || []);
      setDewormingTypes(data.deworming_types || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const emptyForm = {
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
    microchip_number: '',
    implant_date: new Date().toISOString().split('T')[0],
    implant_site: '',
    microchip_brand: '',
    veterinarian_name: '',
    weight: '',
    notes: ''
  };

  const handleOpenModal = () => {
    setModalMode('create');
    setEditingRecord(null);
    setFormData(emptyForm);
    setShowModal(true);
    setError('');
  };

  const handleOpenEditModal = async (record, type) => {
    setModalMode('edit');
    setEditingRecord({ ...record, recordType: type });
    setShowDropdown(null);
    setSelectedVaccineBatch(null);
    setSelectedDewormingBatch(null);

    if (type === 'vaccination') {
      const clinicItemId = record.clinic_item_id || null;
      setFormData({
        ...emptyForm,
        record_type: 'vaccination',
        pet_id: String(record.pet_id),
        pet_registration_input: (record.registration_number || '').replace('PET-', ''),
        vaccination_type_id: String(clinicItemId || record.vaccination_type_id || ''),
        _inventory_vaccine_id: clinicItemId ? String(clinicItemId) : '',
        vaccination_date: record.vaccination_date?.split('T')[0] || '',
        vaccination_next_due_date: record.next_due_date?.split('T')[0] || '',
        veterinarian_name: record.veterinarian_name || '',
        weight: record.weight || '',
        notes: record.notes || ''
      });
      if (clinicItemId) {
        setSelectedInventoryVaccineId(clinicItemId);
        setResolvedVaccinationTypeId(String(clinicItemId));
        setLoadingBatches(true);
        try {
          const { inventoryAPI } = await import('../../services/api');
          const res = await inventoryAPI.getClinicRecordBatchAvailability(clinicItemId);
          const batches = res.data.batches || [];
          setVaccineBatches(prev => ({ ...prev, [clinicItemId]: batches }));
          const defaultBatch = record.clinic_batch_id
            ? batches.find(b => b.id === record.clinic_batch_id)
            : batches.find(b => b.available_qty > 0);
          if (defaultBatch) setSelectedVaccineBatch(defaultBatch.id);
        } catch (err) { console.error('Failed to load vaccine batches for edit:', err); }
        finally { setLoadingBatches(false); }
      }
    } else if (type === 'deworming') {
      const clinicItemId = record.clinic_item_id || null;
      setFormData({
        ...emptyForm,
        record_type: 'deworming',
        pet_id: String(record.pet_id),
        pet_registration_input: (record.registration_number || '').replace('PET-', ''),
        deworming_type_id: String(clinicItemId || record.deworming_type_id || ''),
        _inventory_dewormer_id: clinicItemId ? String(clinicItemId) : '',
        deworming_date: record.deworming_date?.split('T')[0] || '',
        deworming_next_due_date: record.next_due_date?.split('T')[0] || '',
        dosage: record.dosage || '',
        veterinarian_name: record.veterinarian_name || '',
        weight: record.weight || '',
        notes: record.notes || ''
      });
      if (clinicItemId) {
        setSelectedInventoryDewormerId(clinicItemId);
        setResolvedDewormingTypeId(String(clinicItemId));
        setLoadingBatches(true);
        try {
          const { inventoryAPI } = await import('../../services/api');
          const res = await inventoryAPI.getClinicRecordBatchAvailability(clinicItemId);
          const batches = res.data.batches || [];
          setDewormingBatches(prev => ({ ...prev, [clinicItemId]: batches }));
          const defaultBatch = record.clinic_batch_id
            ? batches.find(b => b.id === record.clinic_batch_id)
            : batches.find(b => b.available_qty > 0);
          if (defaultBatch) setSelectedDewormingBatch(defaultBatch.id);
        } catch (err) { console.error('Failed to load dewormer batches for edit:', err); }
        finally { setLoadingBatches(false); }
      }
    } else if (type === 'sterilization') {
      setFormData({
        ...emptyForm,
        record_type: 'sterilization',
        pet_id: String(record.pet_id),
        pet_registration_input: (record.registration_number || '').replace('PET-', ''),
        sterilization_date: record.sterilization_date?.split('T')[0] || '',
        veterinarian_name: record.veterinarian_name || '',
        weight: record.weight || ''
      });
    } else if (type === 'microchip') {
      setFormData({
        ...emptyForm,
        record_type: 'microchip',
        pet_id: String(record.pet_id),
        pet_registration_input: (record.registration_number || '').replace('PET-', ''),
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
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError('');
    setEditingRecord(null);
    setSelectedVaccineBatch(null);
    setSelectedDewormingBatch(null);
    setSelectedMicrochipBatch(null);
    setVaccineBatches({});
    setDewormingBatches({});
    setMicrochipBatches([]);
    setSelectedInventoryVaccineId(null);
    setSelectedInventoryDewormerId(null);
    setSelectedInventoryVaccineLabel('');
    setSelectedInventoryDewormerLabel('');
    setResolvedVaccinationTypeId('');
    setResolvedDewormingTypeId('');
  };

  const handleViewRecord = (record, type) => {
    setSelectedRecord({ ...record, recordType: type });
    setShowViewModal(true);
    setShowDropdown(null);
  };

  const handleCloseViewModal = () => { setShowViewModal(false); setSelectedRecord(null); };

  const handleDeleteClick = (record, type) => {
    setRecordToDelete({ ...record, recordType: type });
    setShowDeleteModal(true);
    setShowDropdown(null);
  };

    const handleDeleteConfirm = async () => {
    if (!recordToDelete || deleteLoading) return;
    const target = recordToDelete;
    const permanent = filterStatus === 'trash';
    setDeleteLoading(true);
    setShowDeleteModal(false);             // close immediately
    try {
      if (permanent) {
        await api.delete(`/clinics/records/delete/${target.id}/${target.recordType}`);
        showSuccess('Record permanently deleted.');
      } else {
        await api.put(`/clinics/records/trash/${target.id}/${target.recordType}`);
        showSuccess('Record moved to trash. It will be automatically removed after 30 days.', 6000);
      }
      setRecordToDelete(null);
      loadData();
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };
  const handleRegistrationNumberChange = (e) => {
    let value = e.target.value.replace(/[^0-9-]/g, '');
    const digitsOnly = value.replace(/-/g, '').substring(0, 10);
    let formatted = digitsOnly.length <= 6 ? digitsOnly : digitsOnly.substring(0, 6) + '-' + digitsOnly.substring(6);

    setFormData(prev => ({ ...prev, pet_registration_input: formatted }));

    const fullRegistrationNumber = 'PET-' + formatted;

    if (formatted.length >= 7) {
      const matchingPet = pets.find(p =>
        (p.registration_number || '').trim().toUpperCase() === fullRegistrationNumber.trim().toUpperCase()
      );

      if (matchingPet) {
        if (formData.record_type === 'sterilization' && matchingPet.sterilized == 1) {
          setError(
            <div>
              <strong>Pet already sterilized</strong><br />
              <small>This pet was sterilized on {new Date(matchingPet.sterilization_date).toLocaleDateString()}
                {matchingPet.sterilized_by && <> by {matchingPet.sterilized_by}</>}
              </small>
            </div>
          );
          setFormData(prev => ({ ...prev, pet_id: '', weight: '', procedure_type: '' }));
          return;
        }
        const currentPet = pets.find(p => p.id === parseInt(formData.pet_id));
const speciesChanged = currentPet && currentPet.species !== matchingPet.species;

setFormData(prev => ({
  ...prev,
  pet_id: matchingPet.id.toString(),
  weight: matchingPet.weight || '',
  procedure_type: formData.record_type === 'sterilization'
    ? (matchingPet.gender === 'female' ? 'spay' : 'neuter')
    : prev.procedure_type,
  ...(speciesChanged && {
    vaccination_type_id: '',
    _inventory_vaccine_id: '',
    deworming_type_id: '',
    _inventory_dewormer_id: '',
  })
}));

if (speciesChanged) {
  setSelectedVaccineBatch(null);
  setSelectedDewormingBatch(null);
  setVaccineBatches({});
  setDewormingBatches({});
  setResolvedVaccinationTypeId('');
  setResolvedDewormingTypeId('');
  setSelectedInventoryVaccineId(null);
  setSelectedInventoryDewormerId(null);
}

setError('');
      } else {
        setFormData(prev => ({ ...prev, pet_id: '', weight: '', procedure_type: formData.record_type === 'sterilization' ? '' : prev.procedure_type }));
      }
    } else {
      setFormData(prev => ({ ...prev, pet_id: '', weight: '' }));
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError('');
    if (success) setSuccess('');

    if (name === 'vaccination_type_id' && value) {
      setSelectedVaccineBatch(null);
      const matchingItem = inventoryVaccineItems.find(i => String(i.id) === String(value));
      if (matchingItem) {
        setSelectedInventoryVaccineId(matchingItem.id);
        setResolvedVaccinationTypeId(String(matchingItem.id));
        setFormData(prev => ({
          ...prev,
          vaccination_type_id: String(value),
          _inventory_vaccine_id: String(matchingItem.id),
        }));
        const { inventoryAPI } = await import('../../services/api');
        setLoadingBatches(true);
        try {
          const res = await inventoryAPI.getClinicRecordBatchAvailability(matchingItem.id);
          setVaccineBatches(prev => ({ ...prev, [matchingItem.id]: res.data.batches || [] }));
        } catch (err) {
          console.error('Failed to load batches:', err);
        } finally {
          setLoadingBatches(false);
        }
        return;
      }
    }

    if (name === 'deworming_type_id' && value) {
      const matchingItem = inventoryDewormerItems.find(i => String(i.id) === String(value));
      if (matchingItem) {
        setSelectedInventoryDewormerId(matchingItem.id);
        setSelectedDewormingBatch(null);
        setResolvedDewormingTypeId(String(matchingItem.id));
        setFormData(prev => ({
          ...prev,
          deworming_type_id: String(value),
          _inventory_dewormer_id: String(matchingItem.id),
        }));
        const { inventoryAPI } = await import('../../services/api');
        setLoadingBatches(true);
        try {
          const res = await inventoryAPI.getClinicRecordBatchAvailability(matchingItem.id);
          setDewormingBatches(prev => ({ ...prev, [matchingItem.id]: res.data.batches || [] }));
        } catch (err) {
          console.error('Failed to load dewormer batches:', err);
        } finally {
          setLoadingBatches(false);
        }
        return;
      }
    }
  };

  const handleRecordTypeSelect = async (type) => {
    setFormData(prev => ({ ...prev, record_type: type }));
    setSelectedVaccineBatch(null);
    setSelectedMicrochipBatch(null);
    if (type === 'microchip') {
      setLoadingBatches(true);
      try {
        const mcRes = await api.get('/clinic/inventory');
        const allItems = mcRes.data.inventory || [];
        const mcItem = allItems.find(i => i.item_type === 'microchip');
        if (mcItem) {
          const { inventoryAPI } = await import('../../services/api');
          const batchRes = await inventoryAPI.getClinicRecordBatchAvailability(mcItem.id);
          setMicrochipBatches(batchRes.data.batches || []);
        }
      } catch (err) {
        console.error('Failed to load microchip batches:', err);
      } finally {
        setLoadingBatches(false);
      }
    }
  };

  const getSelectedPet = () => pets.find(p => p.id === parseInt(formData.pet_id));

  const getFilteredTypes = () => {
    const selectedPet = getSelectedPet();
    if (!selectedPet) return [];
    if (formData.record_type === 'vaccination') {
      return inventoryVaccineItems.filter(item =>
        !item.species || item.species === 'all' || item.species === 'both' ||
        item.species === selectedPet.species
      );
    } else if (formData.record_type === 'deworming') {
      return inventoryDewormerItems.filter(item =>
        !item.species || item.species === 'all' || item.species === 'both' ||
        item.species === selectedPet.species
      );
    }
    return [];
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;     // block double submit
    setError('');

    const isEdit = modalMode === 'edit' && editingRecord;
    const type = isEdit ? editingRecord.recordType : formData.record_type;

    // ── Validation (modal stays open) ──
    if (!isEdit && !formData.pet_id) {
      setError('Pet registration number not found. Please enter a valid registration number.');
      return;
    }
    if (type === 'vaccination' && !validateDueDate(formData.vaccination_date, formData.vaccination_next_due_date, 'Vaccination')) return;
    if (type === 'deworming' && !validateDueDate(formData.deworming_date, formData.deworming_next_due_date, 'Deworming')) return;

    let procedureType = '';
    if (!isEdit && type === 'sterilization') {
      const selectedPet = getSelectedPet();
      procedureType = selectedPet ? (selectedPet.gender === 'female' ? 'spay' : 'neuter') : '';
      if (!procedureType) { setError('Please select a valid pet first.'); return; }
    }

    // ── Lock + close modal immediately ──
    submittingRef.current = true;
    setFormLoading(true);
    setShowModal(false);

    try {
      const { inventoryAPI } = await import('../../services/api');
      let message = '';

      if (isEdit) {
        let payload = {};
        if (type === 'vaccination') {
          payload = { clinic_item_id: resolvedVaccinationTypeId || null, clinic_batch_id: selectedVaccineBatch || null, vaccination_date: formData.vaccination_date, next_due_date: formData.vaccination_next_due_date || null, veterinarian_name: formData.veterinarian_name || null, weight: formData.weight ? parseFloat(formData.weight) : null, notes: formData.notes || null };
          if (selectedVaccineBatch) {
            try { await inventoryAPI.deductClinicBatchStock(selectedVaccineBatch, { quantity: 1 }); }
            catch (err) { console.error('Failed to deduct clinic vaccine batch on edit:', err); }
          }
        } else if (type === 'deworming') {
          payload = { clinic_item_id: resolvedDewormingTypeId || null, batch_id: selectedDewormingBatch || null, deworming_date: formData.deworming_date, next_due_date: formData.deworming_next_due_date || null, dosage: formData.dosage || null, veterinarian_name: formData.veterinarian_name || null, weight: formData.weight ? parseFloat(formData.weight) : null, notes: formData.notes || null };
          if (selectedDewormingBatch) {
            try { await inventoryAPI.deductClinicBatchStock(selectedDewormingBatch, { quantity: 1 }); }
            catch (err) { console.error('Failed to deduct clinic dewormer batch on edit:', err); }
          }
        } else if (type === 'sterilization') {
          payload = { sterilization_date: formData.sterilization_date, veterinarian_name: formData.veterinarian_name || null, weight: formData.weight ? parseFloat(formData.weight) : null };
        } else if (type === 'microchip') {
          payload = { implant_date: formData.implant_date, implant_site: formData.implant_site || null, microchip_brand: formData.microchip_brand || null, veterinarian_name: formData.veterinarian_name || null, weight: formData.weight ? parseFloat(formData.weight) : null, notes: formData.notes || null };
        }
        await (type === 'microchip' ? microchipAPI.update(editingRecord.id, payload) : clinicAPI.updateRecord(editingRecord.id, type, payload));
        message = 'Record updated successfully!';
      } else if (type === 'vaccination') {
        const response = await vaccinationAPI.create({
          pet_id: parseInt(formData.pet_id),
          vaccination_type_id: null,
          clinic_item_id: resolvedVaccinationTypeId || null,
          clinic_batch_id: selectedVaccineBatch || null,
          vaccination_date: formData.vaccination_date,
          next_due_date: formData.vaccination_next_due_date || null,
          veterinarian_name: formData.veterinarian_name || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          notes: formData.notes || null,
          administered_by: user.id
        });
        if (selectedVaccineBatch) {
          try { await inventoryAPI.deductClinicBatchStock(selectedVaccineBatch, { quantity: 1 }); }
          catch (err) { console.error('Failed to deduct clinic vaccine batch:', err); }
        }
        message = response.data.message || 'Vaccination record added successfully!';
      } else if (type === 'deworming') {
        const response = await dewormingAPI.create({
          pet_id: parseInt(formData.pet_id),
          deworming_type_id: null,
          clinic_item_id: resolvedDewormingTypeId || null,
          batch_id: selectedDewormingBatch || null,
          deworming_date: formData.deworming_date,
          next_due_date: formData.deworming_next_due_date || null,
          veterinarian_name: formData.veterinarian_name || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          dosage: formData.dosage || null,
          notes: formData.notes || null,
          administered_by: user.id
        });
        message = response.data.message || 'Deworming record added successfully!';
      } else if (type === 'sterilization') {
        const response = await sterilizationAPI.create({
          pet_id: parseInt(formData.pet_id),
          procedure_type: procedureType,
          sterilization_date: formData.sterilization_date,
          veterinarian_name: formData.veterinarian_name || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          administered_by: user.id
        });
        message = response.data.message || 'Sterilization record added successfully!';
      } else if (type === 'microchip') {
        const response = await microchipAPI.create({
          pet_id: parseInt(formData.pet_id),
          microchip_number: formData.microchip_number,
          implant_date: formData.implant_date,
          implant_site: formData.implant_site || null,
          microchip_brand: formData.microchip_brand || null,
          veterinarian_name: formData.veterinarian_name || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          notes: formData.notes || null,
          administered_by: user.id,
          clinic_batch_id: selectedMicrochipBatch || null
        });
        if (selectedMicrochipBatch) {
          try { await inventoryAPI.deductClinicBatchStock(selectedMicrochipBatch, { quantity: 1 }); }
          catch (err) { console.error('Failed to deduct clinic microchip batch:', err); }
        }
        message = response.data.message || 'Microchip record added successfully!';
      }

      showSuccess(message);
      handleCloseModal();                  // reset form state only after success
      loadData();
    } catch (err) {
      const { message, data } = handleAPIError(err);
      if (data && data.details) {
        setError(
          <div>
            <strong>{message}</strong><br />
            <small>
              Last record: {new Date(data.details.last_vaccination_date || data.details.last_deworming_date || data.details.sterilization_date).toLocaleDateString()}
              {data.details.next_due_date && (<><br />Next due: {new Date(data.details.next_due_date).toLocaleDateString()} ({data.details.days_until_due} days remaining)</>)}
            </small>
          </div>
        );
      } else {
        setError(message);
      }
      setShowModal(true);                  // reopen with the form data intact
    } finally {
      submittingRef.current = false;
      setFormLoading(false);
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

  const getFilteredRecords = (records) => records.filter(record => {
    const petSpecies = record.species || record.pet_species;
    const matchesSpecies = filterSpecies === 'all' || petSpecies === filterSpecies;
    const normalizedSearch = searchTerm.trim().toUpperCase();
    const normalizedRegNum = (record.registration_number || '').trim().toUpperCase();
    const petName = (record.pet_name || '').toLowerCase();
    const vetName = (record.veterinarian_name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const isFullRegNumber = normalizedSearch.startsWith('PET-') && normalizedSearch.length >= 8;
    const matchesSearch = searchTerm === ''
      ? true
      : isFullRegNumber
        ? normalizedRegNum === normalizedSearch
        : petName.includes(searchLower) || normalizedRegNum.includes(normalizedSearch) || vetName.includes(searchLower);

    const matchesOwnership = isFullRegNumber && normalizedRegNum === normalizedSearch
      ? true
      : record.is_mine == 1;

    const matchesStatus = filterStatus === 'trash' ? !!record.deleted_at : !record.deleted_at;

    return matchesSpecies && matchesSearch && matchesOwnership && matchesStatus;
  });

  const filteredVaccinations = getFilteredRecords(vaccinations);
  const filteredDewormings = getFilteredRecords(dewormings);
  const filteredSterilizations = getFilteredRecords(sterilizations);
  const filteredMicrochips = microchips.filter(record => {
    const petSpecies = record.species || record.pet_species;
    const matchesSpecies = filterSpecies === 'all' || petSpecies === filterSpecies;
    const normalizedSearch = searchTerm.trim().toUpperCase();
    const normalizedRegNum = (record.registration_number || '').trim().toUpperCase();
    const petName = (record.pet_name || '').toLowerCase();
    const vetName = (record.veterinarian_name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const isFullRegNumber = normalizedSearch.startsWith('PET-') && normalizedSearch.length >= 8;
    const matchesSearch = searchTerm === ''
      ? true
      : isFullRegNumber
        ? normalizedRegNum === normalizedSearch
        : petName.includes(searchLower) || normalizedRegNum.includes(normalizedSearch) || vetName.includes(searchLower);
    const matchesOwnership = searchTerm === '' ? true : (isFullRegNumber && normalizedRegNum === normalizedSearch ? true : record.is_mine == 1);
    const matchesStatus = filterStatus === 'trash' ? !!record.deleted_at : !record.deleted_at;
    return matchesSpecies && matchesSearch && matchesOwnership && matchesStatus;
  });

  const allRecords = [
    ...filteredVaccinations.map(v => ({ ...v, recordType: 'vaccination', sortDate: new Date(v.vaccination_date) })),
    ...filteredDewormings.map(d => ({ ...d, recordType: 'deworming', sortDate: new Date(d.deworming_date) })),
    ...filteredSterilizations.map(s => ({ ...s, recordType: 'sterilization', sortDate: new Date(s.sterilization_date) })),
    ...filteredMicrochips.map(m => ({ ...m, recordType: 'microchip', sortDate: new Date(m.implant_date) }))
  ].sort((a, b) => b.sortDate - a.sortDate);

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
  const paginatedRecords = currentRecords.slice(startIdx, startIdx + itemsPerPage);
  const emptyRows = itemsPerPage - paginatedRecords.length;

const getRecordTypeLabel = (type) => ({ vaccination: 'Vaccination', deworming: 'Deworming', sterilization: 'Sterilization', microchip: 'Microchip' }[type] || type);

  const handleRestoreClick = (record, type) => {
    setRecordToRestore({ ...record, recordType: type });
    setShowRestoreModal(true);
    setShowDropdown(null);
  };

    const handleRestoreConfirm = async () => {
    if (!recordToRestore || restoreLoading) return;
    const target = recordToRestore;
    setRestoreLoading(true);
    setShowRestoreModal(false);            // close immediately
    try {
      await api.put(`/clinics/records/restore/${target.id}/${target.recordType}`);
      showSuccess('Record restored successfully!');
      setRecordToRestore(null);
      loadData();
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setRestoreLoading(false);
    }
  };

  const renderEllipsisButton = (dropdownKey, record, type) => {
    const isMine = record.is_mine == 1;
    return (
      <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
        <button
          ref={showDropdown === dropdownKey ? dropdownButtonRef : null}
          onClick={(e) => {
            if (showDropdown === dropdownKey) { setShowDropdown(null); return; }
            const rect = e.currentTarget.getBoundingClientRect();
            dropdownButtonRef.current = e.currentTarget;
            setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
            setShowDropdown(dropdownKey);
          }}
          style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
        </button>
      </td>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 clinic-records-page" style={{ backgroundColor: '#ffffffff', minHeight: '100vh' }}>

        {/* Header */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
              <i className="fas fa-clipboard-list" style={{ fontSize: '1.5rem', color: '#000000', animation: 'float 3s ease-in-out infinite' }}></i>
              <h2 style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>My Clinic Records</h2>
            </div>
          </Col>
        </Row>

        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px', border: '2px solid #dc3545', background: 'rgba(220, 53, 69, 0.1)', color: '#dc3545' }}>
                <i className="fas fa-exclamation-triangle me-2"></i>{error}
              </Alert>
            </Col>
          </Row>
        )}

        {success && (
          <div style={{
            position: 'fixed',
            top: '24px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 99999,
            pointerEvents: 'none'
          }}>
            <div style={{
              minWidth: '320px',
              maxWidth: '480px',
              animation: 'dropDown 0.4s ease-out',
              pointerEvents: 'auto'
            }}>
              <Alert
                variant="success"
                dismissible
                onClose={() => setSuccess('')}
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
                  <div style={{ fontWeight: '700', fontSize: '1rem' }}>Success!</div>
                  <div style={{ fontSize: '0.88rem', opacity: 0.9 }}>{success}</div>
                </div>
              </Alert>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <Row className="mb-4">
          {[
            { label: 'Vaccination', count: vaccinations.filter(r => r.is_mine == 1).length, icon: '/vaccine.png', faIcon: 'fas fa-syringe', accent: '#ffc107', accentAlpha: 'rgba(255,193,7,0.12)', description: 'Vaccination Records', delay: '0.1s' },
            { label: 'Deworming', count: dewormings.filter(r => r.is_mine == 1).length, icon: '/deworm.png', faIcon: 'fas fa-pills', accent: '#17a2b8', accentAlpha: 'rgba(23,162,184,0.12)', description: 'Deworming Records', delay: '0.2s' },
            { label: 'Sterilization', count: sterilizations.filter(r => r.is_mine == 1).length, icon: '/sterilization.png', faIcon: 'fas fa-cut', accent: '#28a745', accentAlpha: 'rgba(40,167,69,0.12)', description: 'Sterilization Records', delay: '0.3s' },
            { label: 'Microchip', count: microchips.filter(r => r.is_mine == 1).length, icon: '/microchip.png', faIcon: 'fas fa-microchip', accent: '#4361ee', accentAlpha: 'rgba(67,97,238,0.12)', description: 'Microchip Records', delay: '0.4s' },
          ].map(({ label, count, icon, faIcon, accent, accentAlpha, description, delay }, i) => (
            <Col xs={12} sm={6} lg={3} className="mb-3" key={i} style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
              <Card
                className="border-0 h-100"
                style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${accentAlpha}`; e.currentTarget.style.borderColor = accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
              >
                <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
                <Card.Body style={{ padding: '1.5rem', background: 'transparent' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="rec-stat-label" style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>{label}</p>
                      <h2 className="rec-stat-number" style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{count}</h2>
                      <div className="rec-stat-desc" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                        <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>{description}</span>
                      </div>
                    </div>
                    <div className="rec-stat-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: accentAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={icon} alt={label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                      <i className={faIcon} style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Filters */}
        <Row className="mb-4 g-2" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
          <Col xs={12} md={5}>
            <InputGroup style={{ borderRadius: '12px', overflow: 'hidden', height: '46px' }}>
              <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
                <i className="fas fa-search"></i>
              </InputGroup.Text>
              <Form.Control type="text" placeholder="Search by pet name, registration number, or veterinarian..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: '2px solid #e9ecef', borderLeft: 'none', borderRight: searchTerm ? 'none' : '2px solid #e9ecef', height: '46px' }} />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')} style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}>
                  <i className="fas fa-times"></i>
                </Button>
              )}
            </InputGroup>
          </Col>
          <Col xs={6} sm={4} md={2}>
            <Form.Select value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)} style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500', height: '46px' }}>
              <option value="all">All</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
            </Form.Select>
          </Col>
          <Col xs={6} sm={4} md={2}>
            <Form.Select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500', height: '46px' }}>
              <option value="all">All ({vaccinations.filter(r => r.is_mine == 1).length + dewormings.filter(r => r.is_mine == 1).length + sterilizations.filter(r => r.is_mine == 1).length + microchips.filter(r => r.is_mine == 1).length})</option>
              <option value="vaccination">Vaccination ({filteredVaccinations.filter(r => r.is_mine == 1).length})</option>
              <option value="deworming">Deworming ({filteredDewormings.filter(r => r.is_mine == 1).length})</option>
              <option value="sterilization">Sterilization ({filteredSterilizations.filter(r => r.is_mine == 1).length})</option>
              <option value="microchip">Microchip ({filteredMicrochips.filter(r => r.is_mine == 1).length})</option>
            </Form.Select>
          </Col>
          <Col xs={12} sm={4} md={2}>
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
              <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.75rem', color: filterStatus === 'trash' ? '#dc3545' : '#6c757d' }} />
            </div>
          </Col>
        </Row>

        {/* Table */}
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
          <Col>
            <Card className="border-0" style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <Card.Header className="rec-card-header" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderBottom: '2px solid #ffc107', padding: '1.5rem', borderRadius: '20px 20px 0 0' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                    <i className="fas fa-clipboard-list me-2" style={{ color: '#ffc107' }}></i>
                    {activeTab === 'all' && `All Records (${filteredVaccinations.length + filteredDewormings.length + filteredSterilizations.length + filteredMicrochips.length})`}
                    {activeTab === 'vaccination' && `Vaccination Records (${filteredVaccinations.length})`}
                    {activeTab === 'deworming' && `Deworming Records (${filteredDewormings.length})`}
                    {activeTab === 'sterilization' && `Sterilization Records (${filteredSterilizations.length})`}
                    {activeTab === 'microchip' && `Microchip Records (${filteredMicrochips.length})`}
                  </h5>
                  <Button onClick={handleOpenModal} className="border-0 rec-add-btn"
                    style={{ background: '#ffc107', color: '#000000', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: '700', boxShadow: '0 4px 15px rgba(255,193,7,0.4)', transition: 'all 0.3s' }}
                    onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.background = '#ffb300'; }}
                    onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.background = '#ffc107'; }}
                  >
                    <i className="fas fa-plus me-2"></i>Add Record
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="rec-card-body" style={{ padding: '2rem' }}>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="warning" />
                    <p className="mt-3 text-muted">Loading records...</p>
                  </div>
                ) : currentRecords.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-clipboard-list" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                    <h5 className="mt-3" style={{ color: '#666666', fontWeight: '600' }}>No Records Found</h5>
                    <p className="text-muted">{searchTerm || filterSpecies !== 'all' ? 'Try adjusting your filters' : 'Start by adding records for pets'}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="rec-table" style={{ marginBottom: 0 }}>
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                          {activeTab === 'all' && <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Type</th>}
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Pet</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Details</th>
                          <th className="col-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Weight</th>
                          <th className="col-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Veterinarian</th>
                          <th className="col-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Recorded By</th>
                          {filterStatus === 'trash' && <th className="col-hide" style={{ fontWeight: '600', color: '#dc3545', padding: '1rem', textAlign: 'center' }}>Expires In</th>}
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRecords.map((record, index) => {
                          const type = record.recordType || activeTab;
                          const dropdownKey = `${type}-${record.id}`;
                          const date = type === 'vaccination' ? record.vaccination_date
                            : type === 'deworming' ? record.deworming_date
                            : type === 'microchip' ? record.implant_date
                            : record.sterilization_date;
                          return (
                            <tr key={dropdownKey} style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = type === 'microchip' ? 'rgba(67,97,238,0.05)' : 'rgba(255,193,7,0.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {activeTab === 'all' && (
                                <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                  {type === 'vaccination' && <span style={{ fontWeight: '500', color: '#555' }}><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</span>}
                                  {type === 'deworming' && <span style={{ fontWeight: '500', color: '#555' }}><i className="fas fa-pills me-1" style={{ color: '#17a2b8' }}></i>Deworming</span>}
                                  {type === 'sterilization' && <span style={{ fontWeight: '500', color: '#555' }}><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</span>}
                                  {type === 'microchip' && <span style={{ fontWeight: '500', color: '#555' }}><i className="fas fa-microchip me-1" style={{ color: '#4361ee' }}></i>Microchip</span>}
                                </td>
                              )}
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <strong style={{ color: '#333' }}>{new Date(date).toLocaleDateString()}</strong>
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <strong style={{ fontSize: '1rem', color: '#333' }}>{record.pet_name}</strong><br />
                                <small className="text-muted" style={{ fontWeight: '500' }}>
                                  <i className="fas fa-barcode me-1"></i>{record.registration_number}
                                </small>
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                {type === 'vaccination' && (
                                  <>
                                    <strong style={{ color: '#333' }}>{record.vaccine_name}</strong>
                                    {record.next_due_date && <><br /><small>Next: <span style={{ color: new Date(record.next_due_date) < new Date() ? '#dc3545' : '#28a745', fontWeight: '500' }}>{new Date(record.next_due_date).toLocaleDateString()}</span></small></>}
                                  </>
                                )}
                                {type === 'deworming' && (
                                  <>
                                    <strong style={{ color: '#333' }}>{record.deworming_name}</strong>
                                    {record.dosage && <><br /><small className="text-muted">Dosage: {record.dosage}</small></>}
                                    {record.next_due_date && <><br /><small>Next: <span style={{ color: new Date(record.next_due_date) < new Date() ? '#dc3545' : '#28a745', fontWeight: '500' }}>{new Date(record.next_due_date).toLocaleDateString()}</span></small></>}
                                  </>
                                )}
                                {type === 'sterilization' && (
                                  <Badge bg="success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>{record.procedure_type}</Badge>
                                )}
                                {type === 'microchip' && (
                                  <>
                                    <strong style={{ color: '#333', fontFamily: 'monospace' }}>{record.microchip_number}</strong>
                                    {record.microchip_brand && <><br /><small className="text-muted">Brand: {record.microchip_brand}</small></>}
                                    {record.implant_site && <><br /><small className="text-muted">Site: {record.implant_site}</small></>}
                                  </>
                                )}
                              </td>
                              <td className="col-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                {record.weight ? <span style={{ fontWeight: '500', color: '#555' }}>{record.weight} kg</span> : <span className="text-muted">-</span>}
                              </td>
                              <td className="col-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <small style={{ fontWeight: '500', color: '#555' }}>{record.veterinarian_name || 'Not specified'}</small>
                              </td>
                              <td className="col-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: record.is_mine == 1 ? '#28a745' : '#6c757d', background: record.is_mine == 1 ? 'rgba(40,167,69,0.1)' : 'rgba(108,117,125,0.1)' }}>
                                  {record.recorded_by || 'City Vet Muntinlupa'}
                                </span>
                              </td>
                              {filterStatus === 'trash' && (
                                <td className="col-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                  {(() => { const d = getDaysRemaining(record.deleted_at); return d !== null && (
                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.3rem 0.6rem', borderRadius: '6px', color: d <= 7 ? '#dc3545' : '#fd7e14', background: d <= 7 ? 'rgba(220,53,69,0.1)' : 'rgba(253,126,20,0.1)' }}>
                                      <i className="fas fa-clock me-1"></i>{d}d left
                                    </span>
                                  ); })()}
                                </td>
                              )}
                              {renderEllipsisButton(dropdownKey, record, type)}
                            </tr>
                          );
                        })}
                        {Array.from({ length: emptyRows }).map((_, i) => (
                          <tr key={`empty-${i}`} style={{ height: '73px' }}>
                            <td colSpan={activeTab === 'all' ? 8 : 7} style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                              <div style={{ visibility: 'hidden' }}>Empty</div>
                            </td>
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

        {/* Microchip Tab */}
        {activeTab === 'microchip' && (
          <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
            <Col>
              <Card className="border-0" style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <Card.Body className="rec-card-body" style={{ padding: '2rem' }}>
                  {filteredMicrochips.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-microchip" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                      <h5 className="mt-3" style={{ color: '#666666', fontWeight: '600' }}>No Microchip Records</h5>
                      <p className="text-muted">{searchTerm || filterSpecies !== 'all' ? 'Try adjusting your filters' : 'Microchip records will appear here'}</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table hover style={{ marginBottom: 0 }}>
                        <thead style={{ background: '#f8f9fa' }}>
                          <tr>
                            <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
                            <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Pet Information</th>
                            <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Microchip Number</th>
                            <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Brand</th>
                            <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Implant Site</th>
                            <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Weight</th>
                            <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Veterinarian</th>
                            <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRecords.map(microchip => (
                            <tr key={microchip.id} style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(67,97,238,0.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <strong style={{ color: '#333' }}>{new Date(microchip.implant_date).toLocaleDateString()}</strong>
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <strong style={{ fontSize: '1rem', color: '#333' }}>{microchip.pet_name}</strong><br />
                                <small className="text-muted" style={{ fontWeight: '500' }}><i className="fas fa-barcode me-1"></i>{microchip.registration_number}</small>
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <strong style={{ color: '#333', fontFamily: 'monospace' }}>{microchip.microchip_number}</strong>
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <small style={{ fontWeight: '500', color: '#555' }}>{microchip.microchip_brand || '-'}</small>
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <small style={{ fontWeight: '500', color: '#555' }}>{microchip.implant_site || '-'}</small>
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                {microchip.weight ? <span style={{ fontWeight: '500', color: '#555' }}>{microchip.weight} kg</span> : <span className="text-muted">-</span>}
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <small style={{ fontWeight: '500', color: '#555' }}>{microchip.veterinarian_name || 'Not specified'}</small>
                              </td>
                              {renderEllipsisButton(`mic-tab-${microchip.id}`, microchip, 'microchip')}
                            </tr>
                          ))}
                          {Array.from({ length: emptyRows }).map((_, i) => (
                            <tr key={`empty-${i}`} style={{ height: '73px' }}>
                              <td colSpan="8" style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                                <div style={{ visibility: 'hidden' }}>Empty</div>
                              </td>
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
        )}

        {/* Pagination */}
        {currentRecords.length > itemsPerPage && (
          <Row className="mt-4">
            <Col className="d-flex justify-content-center">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  style={{ background: currentPage === 1 ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === 1 ? '#adb5bd' : '#333333' }}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    style={{ background: currentPage === page ? '#ffc107' : '#ffffff', border: '2px solid', borderColor: currentPage === page ? '#ffc107' : '#dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '40px', cursor: 'pointer', fontWeight: '700', color: currentPage === page ? '#000000' : '#333333' }}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  style={{ background: currentPage === totalPages ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === totalPages ? '#adb5bd' : '#333333' }}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </Col>
          </Row>
        )}

        {/* Add Record Modal */}
        <Modal show={showModal} onHide={handleCloseModal} size="lg" style={{zoom: '0.75'}}>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <Modal.Title style={{ fontWeight: '700' }}>
              <i className={`fas ${modalMode === 'edit' ? 'fa-edit' : 'fa-plus'} me-2`}></i>
              {modalMode === 'edit' ? `Edit ${getRecordTypeLabel(formData.record_type)} Record` : (formData.record_type ? `Add ${getRecordTypeLabel(formData.record_type)} Record` : 'Add Record')}
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
              {error && <Alert variant="danger" className="mb-3"><i className="fas fa-exclamation-triangle me-2"></i>{error}</Alert>}

              {/* Record Type Selection — hidden in edit mode */}
              
              <Row className="mb-4" style={{ display: modalMode === 'edit' ? 'none' : '' }}>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                      Record Type <span style={{ color: '#dc3545' }}>*</span>
                    </Form.Label>
                    <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'thin', scrollbarColor: '#dee2e6 #f8f9fa', WebkitOverflowScrolling: 'touch' }} className="record-type-scroll">
                      <div
                        onClick={() => handleRecordTypeSelect('vaccination')}
                        className="rec-type-card"
                        style={{ minWidth: '200px', flex: '0 0 auto', padding: '1.5rem', border: formData.record_type === 'vaccination' ? '3px solid #ffc107' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.record_type === 'vaccination' ? '#fff9e6' : '#ffffff', transition: 'all 0.3s' }}
                      >
                        <img src="/vaccine.png" alt="Vaccination" style={{ width: '50px', height: '50px', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-syringe" style={{ fontSize: '2.5rem', color: '#ffc107', marginBottom: '0.5rem', display: 'none' }}></i>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Vaccination</div>
                      </div>
                      <div
                        onClick={() => handleRecordTypeSelect('deworming')}
                        className="rec-type-card"
                        style={{ minWidth: '200px', flex: '0 0 auto', padding: '1.5rem', border: formData.record_type === 'deworming' ? '3px solid #17a2b8' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.record_type === 'deworming' ? '#e6f7f9' : '#ffffff', transition: 'all 0.3s' }}
                      >
                        <img src="/deworm.png" alt="Deworming" style={{ width: '50px', height: '50px', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-pills" style={{ fontSize: '2.5rem', color: '#17a2b8', marginBottom: '0.5rem', display: 'none' }}></i>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Deworming</div>
                      </div>
                      <div
                        onClick={() => handleRecordTypeSelect('sterilization')}
                        className="rec-type-card"
                        style={{ minWidth: '200px', flex: '0 0 auto', padding: '1.5rem', border: formData.record_type === 'sterilization' ? '3px solid #28a745' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.record_type === 'sterilization' ? '#e6f9e9' : '#ffffff', transition: 'all 0.3s' }}
                      >
                        <img src="/sterilization.png" alt="Sterilization" style={{ width: '50px', height: '50px', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-cut" style={{ fontSize: '2.5rem', color: '#28a745', marginBottom: '0.5rem', display: 'none' }}></i>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Sterilization</div>
                      </div>
                      <div
                        onClick={() => handleRecordTypeSelect('microchip')}
                        className="rec-type-card"
                        style={{ minWidth: '200px', flex: '0 0 auto', padding: '1.5rem', border: formData.record_type === 'microchip' ? '3px solid #4361ee' : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.record_type === 'microchip' ? '#eef0ff' : '#ffffff', transition: 'all 0.3s' }}
                      >
                        <img src="/microchip.png" alt="Microchip" style={{ width: '50px', height: '50px', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className="fas fa-microchip" style={{ fontSize: '2.5rem', color: '#4361ee', marginBottom: '0.5rem', display: 'none' }}></i>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Microchip</div>
                      </div>
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              {formData.record_type && (
                <>
                  {/* Pet Registration */}
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Pet Registration Number <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                        <InputGroup>
                          <InputGroup.Text style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#e9ecef', border: '2px solid #ced4da' }}>PET-</InputGroup.Text>
                          <Form.Control type="text" value={formData.pet_registration_input} onChange={handleRegistrationNumberChange} placeholder="202510-0001" required maxLength={11} readOnly={false} style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.5px', border: '2px solid #ced4da', borderLeft: 'none', borderRight: 'none', flex: 1, backgroundColor: '#ffffff' }} />
        {(
  <Button
    type="button"
    onClick={() => setShowClinicPetSearchModal(true)}
            style={{ background: '#4361ee', border: '2px solid #4361ee', color: '#fff', fontWeight: '600', borderRadius: '0 8px 8px 0', padding: '0 1.1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
            onMouseOver={e => e.currentTarget.style.background = '#3451d1'}
            onMouseOut={e => e.currentTarget.style.background = '#4361ee'}
          >
            <i className="fas fa-search"></i> Search Pet
          </Button>
        )}
        </InputGroup>
                        <Form.Text className="text-muted">Format: YYYYMM-XXXX (Example: 202510-0001) — or use Search Pet</Form.Text>

        {/* Clinic Pet Search Modal */}
        <Modal show={showClinicPetSearchModal} onHide={() => { setShowClinicPetSearchModal(false); setClinicPetSearchTerm(''); }} centered size="md" style={{ zoom: '0.75' }}>
          <Modal.Header closeButton style={{ background: '#f0f4ff', borderBottom: '2px solid #4361ee' }}>
            <Modal.Title style={{ fontWeight: '700', fontSize: '1rem' }}>
              <i className="fas fa-search me-2" style={{ color: '#4361ee' }}></i>Search Pet
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
                value={clinicPetSearchTerm}
                onChange={e => setClinicPetSearchTerm(e.target.value)}
                style={{ border: '2px solid #4361ee', borderLeft: 'none', fontSize: '0.95rem' }}
              />
              {clinicPetSearchTerm && (
                <Button variant="outline-secondary" onClick={() => setClinicPetSearchTerm('')} style={{ border: '2px solid #4361ee', borderLeft: 'none' }}>
                  <i className="fas fa-times"></i>
                </Button>
              )}
            </InputGroup>
            <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
              {clinicPetSearchTerm.trim() === '' ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#bbb' }}>
                  <i className="fas fa-paw" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}></i>
                  <div style={{ fontSize: '0.9rem' }}>Start typing to search for a pet</div>
                </div>
              ) : (() => {
                const term = clinicPetSearchTerm.trim().toLowerCase();
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
                  <div key={p.id}
                    onClick={() => {
                      const raw = (p.registration_number || '').replace('PET-', '');
                      handleRegistrationNumberChange({ target: { value: raw } });
                      setShowClinicPetSearchModal(false);
                      setClinicPetSearchTerm('');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderRadius: '10px', border: '1.5px solid #e9ecef', marginBottom: '0.6rem', cursor: 'pointer', background: '#ffffff', transition: 'all 0.18s' }}
                    onMouseOver={e => { e.currentTarget.style.background = '#f0f4ff'; e.currentTarget.style.borderColor = '#4361ee'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e9ecef'; }}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: p.species === 'cat' ? 'rgba(255,193,7,0.15)' : 'rgba(67,97,238,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      <img
                        src={p.photo_url || (p.species === 'cat' ? '/cat.png' : '/dog.png')}
                        alt={p.species}
                        style={{ width: '36px', height: '36px', objectFit: p.photo_url ? 'cover' : 'contain', borderRadius: p.photo_url ? '8px' : '0' }}
                        onError={e => { e.target.src = p.species === 'cat' ? '/cat.png' : '/dog.png'; }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.97rem', color: '#222', marginBottom: '0.1rem' }}>
                        {p.name}
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', fontWeight: '600', padding: '0.1rem 0.5rem', borderRadius: '20px', background: p.species === 'cat' ? 'rgba(255,193,7,0.15)' : 'rgba(67,97,238,0.1)', color: p.species === 'cat' ? '#b8860b' : '#4361ee', textTransform: 'capitalize' }}>{p.species}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.1rem' }}>
                        <i className="fas fa-user me-1"></i>{p.owner_name || 'Unknown owner'}
                        {p.breed && <> &nbsp;·&nbsp; <i className="fas fa-paw me-1"></i>{p.breed}</>}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#4361ee', fontWeight: '600' }}>{p.registration_number}</div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#ccc', fontSize: '0.8rem' }} />
                  </div>
                ));
              })()}
            </div>
          </Modal.Body>
        </Modal>
                        {formData.pet_registration_input && formData.pet_registration_input.length > 0 && (
  getSelectedPet() ? (
    <Alert variant="success" className="mt-2 mb-0 py-2">
      <i className="fas fa-check-circle me-2"></i>
      <strong>Pet Found:</strong> {getSelectedPet().name}<br />
      <small>Species: <span className="text-capitalize">{getSelectedPet().species}</span> | Breed: {getSelectedPet().breed || 'Mixed'} | Owner: {getSelectedPet().owner_name}</small>
    </Alert>
  ) : formData.pet_registration_input.length >= 7 && (
    <Alert variant="danger" className="mt-2 mb-0 py-2">
      <i className="fas fa-times-circle me-2"></i>Pet registration number not found.
    </Alert>
  )
)}
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Vaccination Fields */}
                  {formData.record_type === 'vaccination' && (
                    <>
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
  <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Vaccination Type <span style={{ color: '#dc3545' }}>*</span></Form.Label>
  <Form.Select name="vaccination_type_id" value={formData.vaccination_type_id} onChange={handleChange} required disabled={!formData.pet_id} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
  <option value="">Choose vaccine type...</option>
  {getFilteredTypes().map(item => (
    <option key={item.id} value={item.id}>
      {item.item_name} ({!item.species || item.species === 'all' || item.species === 'both' ? 'All pets' : item.species})
    </option>
  ))}
</Form.Select>
  
</Form.Group>
                        </Col>
                      </Row>
                      {/* Batch selection for vaccination */}
                      {formData.vaccination_type_id && (
                        <Row>
                          <Col md={12}>
                            <Form.Group className="mb-3">
                              <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                                Select Batch <span style={{ color: '#dc3545' }}>*</span>
                              </Form.Label>
                              {(() => {
                                const invId = formData._inventory_vaccine_id;
                                const batches = invId ? (vaccineBatches[invId] || []) : [];
                                if (loadingBatches) return <div style={{ fontSize: '0.82rem', color: '#aaa', padding: '0.5rem' }}><i className="fas fa-spinner fa-spin me-1" /> Loading batches...</div>;
                                if (batches.length === 0) return <div style={{ fontSize: '0.82rem', color: '#dc3545', padding: '0.6rem 0.75rem', background: '#fff5f5', borderRadius: '8px', border: '1px solid #f5c6cb' }}><i className="fas fa-exclamation-triangle me-1" /> No available batches.</div>;
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {batches.map(batch => {
                                      const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
                                      const isSelected = selectedVaccineBatch === batch.id;
                                      const noStock = batch.available_qty <= 0;
                                      return (
                                        <div key={batch.id} style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', border: isSelected ? '2px solid #ffc107' : '1px solid #dee2e6', background: isSelected ? 'rgba(255,193,7,0.06)' : '#fafafa', opacity: noStock && !isSelected ? 0.5 : 1 }}>
                                          <div className="d-flex align-items-center gap-2">
                                            <Form.Check type="radio" id={`clinic-vac-batch-${batch.id}`} name="clinic_vaccine_batch" checked={isSelected} disabled={noStock || isExpired} onChange={() => setSelectedVaccineBatch(batch.id)} />
                                            <label htmlFor={`clinic-vac-batch-${batch.id}`} style={{ cursor: noStock ? 'not-allowed' : 'pointer', flex: 1, marginBottom: 0 }}>
                                              <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                              {isExpired && <span className="ms-1" style={{ fontSize: '0.68rem', background: '#dc3545', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>EXPIRED</span>}
                                              <span className="ms-2" style={{ fontSize: '0.75rem', color: noStock ? '#dc3545' : batch.available_qty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>{batch.available_qty} available</span>
                                              {batch.expiration_date && !isExpired && <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>· exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                                            </label>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              <Form.Text className="text-muted mt-1 d-block"><i className="fas fa-info-circle me-1" />1 dose will be deducted from selected batch.</Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      )}

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Vaccination Date <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                            <Form.Control type="date" name="vaccination_date" value={formData.vaccination_date} onChange={handleChange} max={new Date().toISOString().split('T')[0]} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Next Due Date (Optional)</Form.Label>
                            <Form.Control type="date" name="vaccination_next_due_date" value={formData.vaccination_next_due_date} onChange={handleChange} min={(() => { const d = new Date(formData.vaccination_date); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
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
  <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Deworming Type <span style={{ color: '#dc3545' }}>*</span></Form.Label>
  <Form.Select name="deworming_type_id" value={formData.deworming_type_id} onChange={handleChange} required disabled={!formData.pet_id} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
  <option value="">Choose deworming type...</option>
  {getFilteredTypes().map(item => (
    <option key={item.id} value={item.id}>
      {item.item_name} ({!item.species || item.species === 'all' || item.species === 'both' ? 'All pets' : item.species})
    </option>
  ))}
</Form.Select>
{modalMode === 'create' && formData.vaccination_type_id && !vaccinationTypes.find(vt => String(vt.id) === String(formData.vaccination_type_id)) && (
  <div style={{ fontSize: '0.78rem', color: '#dc3545', marginTop: '0.3rem' }}>
    ⚠ No matching vaccine type found in system for this inventory item.
  </div>
)}
  
</Form.Group>
                        </Col>
                      </Row>
                      {/* Batch selection for deworming */}
                      {formData.deworming_type_id && (
                        <Row>
                          <Col md={12}>
                            <Form.Group className="mb-3">
                              <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                                Select Batch <span style={{ color: '#dc3545' }}>*</span>
                              </Form.Label>
                              {(() => {
                                const invId = formData._inventory_dewormer_id;
                                const batches = invId ? (dewormingBatches[invId] || []) : [];
                                if (loadingBatches) return <div style={{ fontSize: '0.82rem', color: '#aaa', padding: '0.5rem' }}><i className="fas fa-spinner fa-spin me-1" /> Loading batches...</div>;
                                if (batches.length === 0) return <div style={{ fontSize: '0.82rem', color: '#dc3545', padding: '0.6rem 0.75rem', background: '#fff5f5', borderRadius: '8px', border: '1px solid #f5c6cb' }}><i className="fas fa-exclamation-triangle me-1" /> No available batches.</div>;
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {batches.map(batch => {
                                      const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
                                      const isSelected = selectedDewormingBatch === batch.id;
                                      const noStock = batch.available_qty <= 0;
                                      return (
                                        <div key={batch.id} style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', border: isSelected ? '2px solid #17a2b8' : '1px solid #dee2e6', background: isSelected ? 'rgba(23,162,184,0.06)' : '#fafafa', opacity: (noStock || isExpired) && !isSelected ? 0.5 : 1 }}>
                                          <div className="d-flex align-items-center gap-2">
                                            <Form.Check type="radio" id={`clinic-dew-batch-${batch.id}`} name="clinic_dewormer_batch" checked={isSelected} disabled={noStock || isExpired} onChange={() => setSelectedDewormingBatch(batch.id)} />
                                            <label htmlFor={`clinic-dew-batch-${batch.id}`} style={{ cursor: noStock ? 'not-allowed' : 'pointer', flex: 1, marginBottom: 0 }}>
                                              <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                              {isExpired && <span className="ms-1" style={{ fontSize: '0.68rem', background: '#dc3545', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>EXPIRED</span>}
                                              <span className="ms-2" style={{ fontSize: '0.75rem', color: noStock ? '#dc3545' : batch.available_qty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>{batch.available_qty} available</span>
                                              {batch.expiration_date && !isExpired && <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>· exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                                            </label>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              <Form.Text className="text-muted mt-1 d-block"><i className="fas fa-info-circle me-1" />1 dose will be deducted from selected batch.</Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Deworming Date <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                            <Form.Control type="date" name="deworming_date" value={formData.deworming_date} onChange={handleChange} max={new Date().toISOString().split('T')[0]} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Next Due Date (Optional)</Form.Label>
                            <Form.Control type="date" name="deworming_next_due_date" value={formData.deworming_next_due_date} onChange={handleChange} min={(() => { const d = new Date(formData.deworming_date); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Dosage</Form.Label>
                            <Form.Control type="text" name="dosage" value={formData.dosage} onChange={handleChange} placeholder="e.g., 10mg" style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
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
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Procedure Type <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                            <Form.Control type="text" value={formData.pet_id && getSelectedPet() ? (getSelectedPet().gender === 'female' ? 'Spay (Female)' : 'Neuter (Male)') : 'Select a pet first'} disabled style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6', backgroundColor: '#f8f9fa', fontWeight: '500' }} />
                            <Form.Text className="text-muted"><i className="fas fa-info-circle me-1"></i>Auto-determined from pet's gender</Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Sterilization Date <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                            <Form.Control type="date" name="sterilization_date" value={formData.sterilization_date} onChange={handleChange} max={new Date().toISOString().split('T')[0]} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  {/* Microchip Fields */}
                  {formData.record_type === 'microchip' && (
                    <>
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Microchip Number <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                            <Form.Control type="text" name="microchip_number" value={formData.microchip_number} onChange={handleChange} placeholder="e.g., 985112345678901" required maxLength={20} readOnly={false}
style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6', fontFamily: 'monospace', letterSpacing: '0.5px', backgroundColor: '#ffffff' }} />
                            <Form.Text className="text-muted">15-digit ISO standard microchip number</Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                      {/* Batch selection for microchip — create mode only */}
                      {modalMode === 'create' && (
                        <Row>
                          <Col md={12}>
                            <Form.Group className="mb-3">
                              <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                                Select Batch <span style={{ color: '#dc3545' }}>*</span>
                              </Form.Label>
                              {loadingBatches ? (
                                <div style={{ fontSize: '0.82rem', color: '#aaa', padding: '0.5rem' }}><i className="fas fa-spinner fa-spin me-1" /> Loading batches...</div>
                              ) : microchipBatches.length === 0 ? (
                                <div style={{ fontSize: '0.82rem', color: '#dc3545', padding: '0.6rem 0.75rem', background: '#fff5f5', borderRadius: '8px', border: '1px solid #f5c6cb' }}><i className="fas fa-exclamation-triangle me-1" /> No available microchip batches.</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {microchipBatches.map(batch => {
                                    const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
                                    const isSelected = selectedMicrochipBatch === batch.id;
                                    const noStock = batch.available_qty <= 0;
                                    return (
                                      <div key={batch.id} style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', border: isSelected ? '2px solid #6c757d' : '1px solid #dee2e6', background: isSelected ? 'rgba(108,117,125,0.06)' : '#fafafa', opacity: noStock && !isSelected ? 0.5 : 1 }}>
                                        <div className="d-flex align-items-center gap-2">
                                          <Form.Check type="radio" id={`clinic-mic-batch-${batch.id}`} name="clinic_microchip_batch" checked={isSelected} disabled={noStock} onChange={() => setSelectedMicrochipBatch(batch.id)} />
                                          <label htmlFor={`clinic-mic-batch-${batch.id}`} style={{ cursor: noStock ? 'not-allowed' : 'pointer', flex: 1, marginBottom: 0 }}>
                                            <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                            {isExpired && <span className="ms-1" style={{ fontSize: '0.68rem', background: '#dc3545', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>EXPIRED</span>}
                                            <span className="ms-2" style={{ fontSize: '0.75rem', color: noStock ? '#dc3545' : batch.available_qty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>{batch.available_qty} available</span>
                                            {batch.expiration_date && !isExpired && <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>· exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                                          </label>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <Form.Text className="text-muted mt-1 d-block"><i className="fas fa-info-circle me-1" />1 microchip will be deducted from selected batch.</Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      )}

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Implant Date <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                            <Form.Control type="date" name="implant_date" value={formData.implant_date} onChange={handleChange} max={new Date().toISOString().split('T')[0]} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Implant Site <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                            <Form.Select name="implant_site" value={formData.implant_site} onChange={handleChange} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
                              <option value="">Select site...</option>
                              <option value="Left neck">Left neck</option>
                              <option value="Right neck">Right neck</option>
                              <option value="Left shoulder">Left shoulder</option>
                              <option value="Right shoulder">Right shoulder</option>
                              <option value="Between shoulder blades">Between shoulder blades</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Microchip Brand <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                            <Form.Control type="text" name="microchip_brand" value={formData.microchip_brand} onChange={handleChange} placeholder="e.g., Datamars, Trovan, HomeAgain" required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  {/* Common Fields */}
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Veterinarian Name <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                        <Form.Control type="text" name="veterinarian_name" value={formData.veterinarian_name} onChange={handleChange} placeholder="Dr. Juan Dela Cruz" style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Pet Weight (kg)</Form.Label>
                        <Form.Control type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="0.00" step="0.01" min="0" max="200" disabled={!formData.pet_id} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                      </Form.Group>
                    </Col>
                  </Row>

                  {(formData.record_type === 'vaccination' || formData.record_type === 'deworming' || formData.record_type === 'microchip') && (
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Additional Notes</Form.Label>
                          <Form.Control as="textarea" rows={3} name="notes" value={formData.notes} onChange={handleChange} placeholder="Any additional information..." maxLength={50} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6', resize: 'none' }} />
                          <Form.Text className="text-muted">{formData.notes.length}/50 characters</Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                </>
              )}
            </Modal.Body>
            <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
              <Button variant="secondary" onClick={handleCloseModal} disabled={formLoading} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Cancel</Button>
              <Button type="button" onClick={(e) => {
  e.preventDefault();
  // Run same validation as handleSubmit but stop before saving
  if (!formData.record_type) return;
  if (modalMode === 'create' && !getSelectedPet()) return;
  if (formData.record_type === 'microchip' && !formData.microchip_number) return;
  if (formData.record_type === 'microchip' && !formData.implant_site) return;
  if (formData.record_type === 'microchip' && !formData.microchip_brand) return;
  if (!formData.veterinarian_name.trim()) return;
  setPendingSubmitEvent(e);
  setShowConfirmRecordModal(true);
}} disabled={
                formLoading ||
                !formData.record_type ||
                (modalMode === 'create' && !getSelectedPet()) ||
                (formData.record_type === 'microchip' && !formData.microchip_number) ||
                (formData.record_type === 'microchip' && !formData.implant_site) ||
                (formData.record_type === 'microchip' && !formData.microchip_brand) ||
                (formData.record_type === 'microchip' && modalMode === 'create' && !selectedMicrochipBatch) ||
                (formData.record_type === 'vaccination' && modalMode === 'create' && formData._inventory_vaccine_id && !selectedVaccineBatch) ||
                (formData.record_type === 'deworming' && modalMode === 'create' && formData._inventory_dewormer_id && !selectedDewormingBatch)
              || !formData.veterinarian_name.trim()
              } className="border-0"
                style={{ background: formLoading || !formData.record_type || (modalMode === 'create' && !getSelectedPet()) || !formData.veterinarian_name.trim() ? '#6c757d' : '#ffc107', color: '#000000', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700', transition: 'all 0.3s' }}>
                {formLoading ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</> : modalMode === 'edit' ? <><i className="fas fa-save me-2"></i>Save Changes</> : <><i className="fas fa-save me-2"></i>Add {formData.record_type ? getRecordTypeLabel(formData.record_type) : ''} Record</>}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* View Record Modal */}
        <Modal show={showViewModal} onHide={handleCloseViewModal} size="lg" style={{ zoom: '0.75' }}>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <Modal.Title style={{ fontWeight: '700', fontSize: '1rem' }}><i className="fas fa-eye me-2"></i>Record Details</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '0' }}>
            {selectedRecord && (
              <>
                {/* Colored Banner */}
                <div style={{
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
                  <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: '0.25rem' }}>Record Type</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {selectedRecord.recordType === 'vaccination' && <><i className="fas fa-syringe"></i> Vaccination</>}
                        {selectedRecord.recordType === 'deworming' && <><i className="fas fa-pills"></i> Deworming</>}
                        {selectedRecord.recordType === 'sterilization' && <><i className="fas fa-cut"></i> Sterilization</>}
                        {selectedRecord.recordType === 'microchip' && <><i className="fas fa-microchip"></i> Microchip</>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: '0.25rem' }}>Date</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                        {selectedRecord.recordType === 'vaccination' && new Date(selectedRecord.vaccination_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {selectedRecord.recordType === 'deworming' && new Date(selectedRecord.deworming_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {selectedRecord.recordType === 'sterilization' && new Date(selectedRecord.sterilization_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {selectedRecord.recordType === 'microchip' && new Date(selectedRecord.implant_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.75rem 2rem' }}>
                  {/* Pet Info Card */}
                  <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', border: '1px solid #e9ecef' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '0.75rem' }}>Pet Information</div>
                    <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111' }}>{selectedRecord.pet_name}</div>
                        <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.2rem' }}><i className="fas fa-barcode me-1"></i>{selectedRecord.registration_number}</div>
                      </div>
                      <span style={{ background: '#e9ecef', borderRadius: '20px', padding: '0.25rem 0.85rem', fontSize: '0.78rem', fontWeight: '600', color: '#555', textTransform: 'capitalize' }}>
                        {selectedRecord.species || selectedRecord.pet_species}
                      </span>
                    </div>
                  </div>

                  {/* Detail Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    {selectedRecord.recordType === 'vaccination' && (
                      <>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Vaccine Type</div>
                          <div style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.vaccine_name}</div>
                        </div>
                        {selectedRecord.next_due_date && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Next Due Date</div>
                            <div style={{ fontWeight: '700', color: new Date(selectedRecord.next_due_date) < new Date() ? '#dc3545' : '#28a745', fontSize: '0.95rem' }}>
                              <i className={`fas ${new Date(selectedRecord.next_due_date) < new Date() ? 'fa-exclamation-circle' : 'fa-calendar-check'} me-1`}></i>
                              {new Date(selectedRecord.next_due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {selectedRecord.recordType === 'deworming' && (
                      <>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Deworming Type</div>
                          <div style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.deworming_name}</div>
                        </div>
                        {selectedRecord.dosage && (
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Dosage</div>
                            <div style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.dosage}</div>
                          </div>
                        )}
                        {selectedRecord.next_due_date && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Next Due Date</div>
                            <div style={{ fontWeight: '700', color: new Date(selectedRecord.next_due_date) < new Date() ? '#dc3545' : '#28a745', fontSize: '0.95rem' }}>
                              <i className={`fas ${new Date(selectedRecord.next_due_date) < new Date() ? 'fa-exclamation-circle' : 'fa-calendar-check'} me-1`}></i>
                              {new Date(selectedRecord.next_due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {selectedRecord.recordType === 'sterilization' && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Procedure Type</div>
                        <Badge bg="success" style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', borderRadius: '20px', textTransform: 'capitalize' }}>{selectedRecord.procedure_type}</Badge>
                      </div>
                    )}
                    {selectedRecord.recordType === 'microchip' && (
                      <>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Microchip Number</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: '700', color: '#4361ee', background: '#eef0ff', borderRadius: '8px', padding: '0.5rem 0.85rem', display: 'inline-block', letterSpacing: '1px' }}>{selectedRecord.microchip_number}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Microchip Brand</div>
                          <div style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.microchip_brand || <span style={{ color: '#bbb', fontWeight: '400' }}>Not specified</span>}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Implant Site</div>
                          <div style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.implant_site || <span style={{ color: '#bbb', fontWeight: '400' }}>Not specified</span>}</div>
                        </div>
                      </>
                    )}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Veterinarian</div>
                      <div style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.veterinarian_name || <span style={{ color: '#bbb', fontWeight: '400' }}>Not specified</span>}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Weight</div>
                      <div style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.weight ? `${selectedRecord.weight} kg` : <span style={{ color: '#bbb', fontWeight: '400' }}>Not specified</span>}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Recorded By</div>
                      <div style={{ fontWeight: '600', color: '#222', fontSize: '0.95rem' }}>{selectedRecord.recorded_by || 'City Vet Muntinlupa'}</div>
                    </div>
                    {(selectedRecord.recordType === 'vaccination' || selectedRecord.recordType === 'deworming' || selectedRecord.recordType === 'microchip') && selectedRecord.notes && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Notes</div>
                        <div style={{ fontWeight: '500', color: '#444', fontSize: '0.95rem', background: '#f8f9fa', borderRadius: '8px', padding: '0.6rem 0.85rem', border: '1px solid #e9ecef' }}>{selectedRecord.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{ padding: '0.75rem 1.25rem' }}>
            {selectedRecord?.is_mine == 1 && (
              <Button onClick={() => { handleCloseViewModal(); handleOpenEditModal(selectedRecord, selectedRecord.recordType); }} className="border-0"
                style={{ background: '#ffc107', color: '#000', borderRadius: '8px', padding: '0.5rem 1.25rem', fontWeight: '700', fontSize: '0.9rem' }}>
                <i className="fas fa-edit me-2"></i>Edit Record
              </Button>
            )}
            <Button variant="secondary" onClick={handleCloseViewModal} style={{ borderRadius: '8px', padding: '0.5rem 1.25rem', fontWeight: '600', fontSize: '0.9rem' }}>Close</Button>
          </Modal.Footer>
        </Modal>

      </Container>

      {/* Ellipsis Dropdown Portal */}
      {showDropdown !== null && (
        <>
          <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
          <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, transform: 'translateY(-50%)', background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '170px', zIndex: 1050, overflow: 'hidden', zoom: '0.75' }}>
            {(() => {
              const id = showDropdown;
              const type = id.startsWith('mic-tab-') ? 'microchip'
                : id.startsWith('microchip-') ? 'microchip'
                : id.startsWith('vac-tab-') ? 'vaccination'
                : id.startsWith('vaccination-') ? 'vaccination'
                : id.startsWith('dew-tab-') ? 'deworming'
                : id.startsWith('deworming-') ? 'deworming'
                : id.startsWith('ster-tab-') ? 'sterilization'
                : id.startsWith('sterilization-') ? 'sterilization'
                : null;
              const sourceArr = type === 'vaccination' ? vaccinations
                : type === 'deworming' ? dewormings
                : type === 'sterilization' ? sterilizations
                : type === 'microchip' ? microchips
                : [];
              const recordId = parseInt(id.replace(/^[a-z]+-(?:tab-)?/, ''));
              const record = sourceArr.find(r => r.id === recordId);
              if (!record || !type) return null;
              const isMine = record.is_mine == 1;
              const inTrash = filterStatus === 'trash';
              return (<>
                <button onClick={() => handleViewRecord(record, type)} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}>
                  <img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>View Details</span>
                </button>
                {isMine && !inTrash && (
                  <button onClick={() => handleOpenEditModal(record, type)} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}>
                    <img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Edit Record</span>
                  </button>
                )}
                {isMine && (
                  <button onClick={() => handleDeleteClick(record, type)} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}>
                    <img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>{inTrash ? 'Delete Permanently' : 'Delete Record'}</span>
                  </button>
                )}
                {isMine && inTrash && (
                  <button onClick={() => handleRestoreClick(record, type)} style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#28a745', fontWeight: '500', borderTop: '1px solid #f0f0f0' }} onMouseOver={(e) => e.currentTarget.style.background = '#f0fff4'} onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}>
                    <img src="/restore.png" alt="Restore" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /><span>Restore Record</span>
                  </button>
                )}
              </>);
            })()}
          </div>
        </>
      )}

      {/* Restore Confirmation Modal */}
      <Modal show={showRestoreModal} onHide={() => setShowRestoreModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f0fff4', borderBottom: '2px solid #28a745' }}>
          <Modal.Title style={{ fontWeight: '700' }}><i className="fas fa-undo text-success me-2"></i>Restore Record</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {recordToRestore && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#444' }}>Are you sure you want to restore this record? It will be moved back to active records.</p>
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
                {(() => { const d = getDaysRemaining(recordToRestore.deleted_at); return d !== null && (<div className="mt-2"><span style={{ fontSize: '0.82rem', fontWeight: '600', color: d <= 7 ? '#dc3545' : '#fd7e14' }}><i className="fas fa-clock me-1"></i>{d} day{d !== 1 ? 's' : ''} remaining before permanent deletion</span></div>); })()}
              </div>
              <Alert variant="success" className="mt-3 mb-0"><i className="fas fa-check-circle me-2"></i><strong>Notice:</strong> This record will be fully restored and visible in active records.</Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)} disabled={restoreLoading} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Cancel</Button>
          <Button variant="success" onClick={handleRestoreConfirm} disabled={restoreLoading} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
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
                {filterStatus === 'trash' ? 'Are you sure you want to permanently delete this record? This cannot be undone.' : 'This record will be moved to trash and can be recovered within 30 days.'}
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
                <strong style={{ fontSize: '1.1rem' }}>{recordToDelete.pet_name}</strong><br />
                <small className="text-muted"><i className="fas fa-barcode me-1"></i>{recordToDelete.registration_number}{recordToDelete.veterinarian_name && <> • Dr. {recordToDelete.veterinarian_name}</>}</small>
              </div>
              {filterStatus === 'trash' ? (
                <Alert variant="danger" className="mt-3 mb-0"><i className="fas fa-exclamation-triangle me-2"></i><strong>Warning:</strong> This action is permanent and cannot be undone.</Alert>
              ) : (
                <div className="mt-3 mb-0 d-flex align-items-start gap-2 p-3" style={{ background: 'rgba(255,193,7,0.08)', borderRadius: '10px', border: '1px solid rgba(255,193,7,0.3)' }}>
                  <i className="fas fa-clock mt-1" style={{ color: '#ffc107', flexShrink: 0 }}></i>
                  <div style={{ fontSize: '0.88rem', color: '#666' }}><strong style={{ color: '#333' }}>Moved to Trash</strong> — This record will be recoverable for <strong>30 days</strong>, after which it will be automatically and permanently deleted.</div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleteLoading} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            {deleteLoading ? <><Spinner size="sm" animation="border" className="me-2" />Processing...</> : filterStatus === 'trash' ? <><i className="fas fa-trash-alt me-2"></i>Permanently Delete</> : <><i className="fas fa-trash me-2"></i>Move to Trash</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Review & Confirm Record Modal ── */}
<Modal show={showConfirmRecordModal} onHide={() => setShowConfirmRecordModal(false)} centered style={{ zoom: '0.75' }}>
  <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', borderBottom: '2px solid #ffc107' }}>
    <Modal.Title style={{ fontWeight: '700', color: '#333' }}>
      <i className="fas fa-clipboard-check me-2" style={{ color: '#ffc107' }} />
      {modalMode === 'edit' ? 'Review Changes' : 'Review Record Before Saving'}
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '2rem' }}>
    <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
      {modalMode === 'edit'
        ? 'Please review the changes before saving.'
        : 'Please review the record details before adding.'}
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
        src={
          formData.record_type === 'vaccination' ? '/vaccine.png'
          : formData.record_type === 'deworming' ? '/deworm.png'
          : formData.record_type === 'sterilization' ? '/sterilization.png'
          : '/microchip.png'
        }
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
        // Pet
        { icon: 'fa-paw', label: 'Pet',
          value: modalMode === 'edit'
            ? editingRecord?.pet_name
            : getSelectedPet() ? `${getSelectedPet().name} (${getSelectedPet().registration_number})` : '—' },

        // Record-specific fields
        ...(formData.record_type === 'vaccination' ? [
          { icon: 'fa-syringe', label: 'Vaccine',
            value: (() => {
              // Admin: inventoryItems; Clinic: inventoryVaccineItems
              const items = typeof inventoryItems !== 'undefined' ? inventoryItems : (typeof inventoryVaccineItems !== 'undefined' ? inventoryVaccineItems : []);
              const found = items.find(i => String(i.id) === String(formData.vaccination_type_id || formData._inventory_vaccine_id));
              return found ? found.item_name : formData.vaccination_type_id || '—';
            })() },
          { icon: 'fa-calendar', label: 'Vaccination Date', value: formData.vaccination_date || '—' },
          { icon: 'fa-calendar-check', label: 'Next Due Date', value: formData.vaccination_next_due_date || 'Not set' },
        ] : []),

        ...(formData.record_type === 'deworming' ? [
          { icon: 'fa-pills', label: 'Deworming Type',
            value: (() => {
              const items = typeof inventoryDewormerItems !== 'undefined' ? inventoryDewormerItems : (typeof dewormingTypes !== 'undefined' ? dewormingTypes : []);
              const found = items.find(i => String(i.id) === String(formData.deworming_type_id));
              return found ? (found.item_name || found.name) : formData.deworming_type_id || '—';
            })() },
          { icon: 'fa-calendar', label: 'Deworming Date', value: formData.deworming_date || '—' },
          { icon: 'fa-calendar-check', label: 'Next Due Date', value: formData.deworming_next_due_date || 'Not set' },
          { icon: 'fa-prescription-bottle', label: 'Dosage', value: formData.dosage || 'Not specified' },
        ] : []),

        ...(formData.record_type === 'sterilization' ? [
          { icon: 'fa-cut', label: 'Procedure',
            value: (() => {
              const pet = modalMode === 'edit' ? null : getSelectedPet();
              if (pet) return pet.gender === 'female' ? 'Spay (Female)' : 'Neuter (Male)';
              return formData.procedure_type || '—';
            })() },
          { icon: 'fa-calendar', label: 'Sterilization Date', value: formData.sterilization_date || '—' },
        ] : []),

        ...(formData.record_type === 'microchip' ? [
          { icon: 'fa-microchip', label: 'Microchip No.', value: formData.microchip_number || '—' },
          { icon: 'fa-calendar', label: 'Implant Date', value: formData.implant_date || '—' },
          { icon: 'fa-map-marker-alt', label: 'Implant Site', value: formData.implant_site || 'Not specified' },
          { icon: 'fa-tag', label: 'Brand', value: formData.microchip_brand || 'Not specified' },
        ] : []),

        // Common
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
        // Create a synthetic submit event and call handleSubmit
        const syntheticEvent = { preventDefault: () => {} };
        await handleSubmit(syntheticEvent);
      }}
      style={{ background: formLoading ? '#6c757d' : '#000000', color: '#ffffff', borderRadius: '10px', padding: '0.75rem 1.75rem', fontWeight: '700', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}
      onMouseOver={e => { if (!formLoading) e.currentTarget.style.background = '#333'; }}
      onMouseOut={e => { if (!formLoading) e.currentTarget.style.background = '#000'; }}
    >
      {formLoading
        ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</>
        : <><i className="fas fa-save me-2" />{modalMode === 'edit' ? 'Save Changes' : `Confirm`}</>}
    </Button>
  </Modal.Footer>
</Modal>
    </>
  );
};

export default ClinicRecordManagement;