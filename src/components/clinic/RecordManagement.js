import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Modal, Form, InputGroup } from 'react-bootstrap';
import { clinicAPI, vaccinationAPI, dewormingAPI, sterilizationAPI, microchipAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

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

 const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);

  const [filterSpecies, setFilterSpecies] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
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

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeTab, filterSpecies, searchTerm]);

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
    const [recordsRes, microchipsRes] = await Promise.all([
      clinicAPI.getRecords(),
      microchipAPI.getAll()
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

  const handleOpenEditModal = (record, type) => {
    setModalMode('edit');
    setEditingRecord({ ...record, recordType: type });
    setShowDropdown(null);

    if (type === 'vaccination') {
      setFormData({
        ...emptyForm,
        record_type: 'vaccination',
        pet_id: String(record.pet_id),
        pet_registration_input: (record.registration_number || '').replace('PET-', ''),
        vaccination_type_id: String(record.vaccination_type_id || ''),
        vaccination_date: record.vaccination_date?.split('T')[0] || '',
        vaccination_next_due_date: record.next_due_date?.split('T')[0] || '',
        veterinarian_name: record.veterinarian_name || '',
        weight: record.weight || '',
        notes: record.notes || ''
      });
    } else if (type === 'deworming') {
      setFormData({
        ...emptyForm,
        record_type: 'deworming',
        pet_id: String(record.pet_id),
        pet_registration_input: (record.registration_number || '').replace('PET-', ''),
        deworming_type_id: String(record.deworming_type_id || ''),
        deworming_date: record.deworming_date?.split('T')[0] || '',
        deworming_next_due_date: record.next_due_date?.split('T')[0] || '',
        dosage: record.dosage || '',
        veterinarian_name: record.veterinarian_name || '',
        weight: record.weight || '',
        notes: record.notes || ''
      });
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

  const handleDeleteRecord = async (record, type) => {
    if (!window.confirm(`Delete this ${type} record? This cannot be undone.`)) return;
    try {
      await api.delete(`/clinics/records/delete/${record.id}/${type}`);
      setSuccess('Record deleted successfully!');
      setShowDropdown(null);
      loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
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
        setFormData(prev => ({
          ...prev,
          pet_id: matchingPet.id.toString(),
          weight: matchingPet.weight || '',
          procedure_type: formData.record_type === 'sterilization'
            ? (matchingPet.gender === 'female' ? 'spay' : 'neuter')
            : prev.procedure_type
        }));
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

    if (name === 'vaccination_type_id' && value && modalMode === 'create') {
      setSelectedVaccineBatch(null);
      const matchingItem = inventoryVaccineItems.find(i => String(i.id) === String(value));
      if (matchingItem) {
        setSelectedInventoryVaccineId(matchingItem.id);
        // clinic_item_id IS the inventory id — no resolving needed
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

    if (name === 'deworming_type_id' && value && modalMode === 'create') {
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
        // Load batches for selected dewormer
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
    if (modalMode === 'edit') {
      return vaccinationTypes.filter(vt =>
        vt.species === 'both' || vt.species === 'all' || vt.species === selectedPet.species
      );
    }
    // Create mode: show clinic inventory vaccine items filtered by species
    return inventoryVaccineItems.filter(item =>
      !item.species || item.species === 'all' || item.species === 'both' ||
      item.species === selectedPet.species
    );
  } else if (formData.record_type === 'deworming') {
    if (modalMode === 'edit') {
      return dewormingTypes.filter(dt =>
        dt.species === 'both' || dt.species === 'all' || dt.species === selectedPet.species
      );
    }
    // Create mode: show clinic inventory dewormer items filtered by species
    return inventoryDewormerItems.filter(item =>
      !item.species || item.species === 'all' || item.species === 'both' ||
      item.species === selectedPet.species
    );
  }
  return [];
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      if (modalMode === 'edit' && editingRecord) {
        const type = editingRecord.recordType;
        let payload = {};

        if (type === 'vaccination') {
          if (formData.vaccination_next_due_date) {
            const vd = new Date(formData.vaccination_date), nd = new Date(formData.vaccination_next_due_date), today = new Date(); today.setHours(0,0,0,0);
            if (vd.getTime() === nd.getTime()) { setError('Vaccination date and next due date cannot be the same'); setFormLoading(false); return; }
            if (nd < today) { setError('Next due date cannot be in the past'); setFormLoading(false); return; }
          }
          payload = { vaccination_type_id: formData.vaccination_type_id, vaccination_date: formData.vaccination_date, next_due_date: formData.vaccination_next_due_date || null, veterinarian_name: formData.veterinarian_name || null, weight: formData.weight ? parseFloat(formData.weight) : null, notes: formData.notes || null };
        } else if (type === 'deworming') {
          if (formData.deworming_next_due_date) {
            const dd = new Date(formData.deworming_date), nd = new Date(formData.deworming_next_due_date), today = new Date(); today.setHours(0,0,0,0);
            if (dd.getTime() === nd.getTime()) { setError('Deworming date and next due date cannot be the same'); setFormLoading(false); return; }
            if (nd < today) { setError('Next due date cannot be in the past'); setFormLoading(false); return; }
          }
          payload = { deworming_type_id: formData.deworming_type_id, deworming_date: formData.deworming_date, next_due_date: formData.deworming_next_due_date || null, dosage: formData.dosage || null, veterinarian_name: formData.veterinarian_name || null, weight: formData.weight ? parseFloat(formData.weight) : null, notes: formData.notes || null };
        } else if (type === 'sterilization') {
          payload = { sterilization_date: formData.sterilization_date, veterinarian_name: formData.veterinarian_name || null, weight: formData.weight ? parseFloat(formData.weight) : null };
        } else if (type === 'microchip') {
          payload = { implant_date: formData.implant_date, implant_site: formData.implant_site || null, microchip_brand: formData.microchip_brand || null, veterinarian_name: formData.veterinarian_name || null, weight: formData.weight ? parseFloat(formData.weight) : null, notes: formData.notes || null };
        }

        await (type === 'microchip' ? microchipAPI.update(editingRecord.id, payload) : clinicAPI.updateRecord(editingRecord.id, type, payload));
        setSuccess('Record updated successfully!');
        handleCloseModal();
        loadData();
        setTimeout(() => setSuccess(''), 5000);
        return;
      }

      // CREATE mode
      if (!formData.pet_id) {
        setError('Pet registration number not found. Please enter a valid registration number.');
        setFormLoading(false);
        return;
      }

      if (formData.record_type === 'vaccination') {
        if (formData.vaccination_next_due_date) {
          const vacDate = new Date(formData.vaccination_date);
          const nextDueDate = new Date(formData.vaccination_next_due_date);
          const today = new Date(); today.setHours(0, 0, 0, 0);
          if (vacDate.getTime() === nextDueDate.getTime()) { setError('Vaccination date and next due date cannot be the same'); setFormLoading(false); return; }
          if (nextDueDate < today) { setError('Next due date cannot be in the past'); setFormLoading(false); return; }
        }
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
          try {
            const { inventoryAPI } = await import('../../services/api');
            await inventoryAPI.deductClinicBatchStock(selectedVaccineBatch, { quantity: 1 });
          } catch (err) { console.error('Failed to deduct clinic vaccine batch:', err); }
        }
        setSuccess(response.data.message || 'Vaccination record added successfully!');
      } else if (formData.record_type === 'deworming') {
        if (formData.deworming_next_due_date) {
          const dewDate = new Date(formData.deworming_date);
          const nextDueDate = new Date(formData.deworming_next_due_date);
          const today = new Date(); today.setHours(0, 0, 0, 0);
          if (dewDate.getTime() === nextDueDate.getTime()) { setError('Deworming date and next due date cannot be the same'); setFormLoading(false); return; }
          if (nextDueDate < today) { setError('Next due date cannot be in the past'); setFormLoading(false); return; }
        }
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
        setSuccess(response.data.message || 'Deworming record added successfully!');
      } else if (formData.record_type === 'sterilization') {
        const selectedPet = getSelectedPet();
        const procedureType = selectedPet ? (selectedPet.gender === 'female' ? 'spay' : 'neuter') : '';
        if (!procedureType) { setError('Please select a valid pet first.'); setFormLoading(false); return; }
        const response = await sterilizationAPI.create({
          pet_id: parseInt(formData.pet_id),
          procedure_type: procedureType,
          sterilization_date: formData.sterilization_date,
          veterinarian_name: formData.veterinarian_name || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          administered_by: user.id
        });
        setSuccess(response.data.message || 'Sterilization record added successfully!');
      } else if (formData.record_type === 'microchip') {
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
          try {
            const { inventoryAPI } = await import('../../services/api');
            await inventoryAPI.deductClinicBatchStock(selectedMicrochipBatch, { quantity: 1 });
          } catch (err) { console.error('Failed to deduct clinic microchip batch:', err); }
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
    } finally {
      setFormLoading(false);
    }
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

    return matchesSpecies && matchesSearch && matchesOwnership;
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
    const matchesOwnership = isFullRegNumber && normalizedRegNum === normalizedSearch ? true : record.is_mine == 1;
    return matchesSpecies && matchesSearch && matchesOwnership;
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

  const ActionDropdown = ({ dropdownKey, record, type }) => {
    const isMine = record.is_mine == 1;
    return (
      <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center', position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(showDropdown === dropdownKey ? null : dropdownKey)}
          style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer' }}
        >
          <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
        </button>
        {showDropdown === dropdownKey && (
          <>
            <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
            <div style={{ position: 'absolute', top: '100%', right: '10px', marginTop: '0.5rem', background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '160px', zIndex: 1000, overflow: 'hidden' }}>
              <button
                onClick={() => handleViewRecord(record, type)}
                style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
              >
                <img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                <span>View Details</span>
              </button>
              {isMine && (
                <button
                  onClick={() => handleDeleteRecord(record, type)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  <i className="fas fa-trash" style={{ fontSize: '1rem', color: '#dc3545', width: '18px', textAlign: 'center' }}></i>
                  <span>Delete Record</span>
                </button>
              )}
              {isMine && (
                <button
                  onClick={() => handleOpenEditModal(record, type)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  <i className="fas fa-edit" style={{ fontSize: '1rem', color: '#ffc107', width: '18px', textAlign: 'center' }}></i>
                  <span>Edit Record</span>
                </button>
              )}
            </div>
          </>
        )}
      </td>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75' }}>

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
          <Row className="mb-4">
            <Col>
              <Alert variant="success" dismissible onClose={() => setSuccess('')} style={{ borderRadius: '12px', border: '2px solid #28a745', background: 'rgba(40, 167, 69, 0.1)', color: '#28a745' }}>
                <i className="fas fa-check-circle me-2"></i>{success}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Stats Cards */}
        <Row className="mb-4">
          {[
            { label: 'Vaccination', count: vaccinations.filter(r => r.is_mine == 1).length, icon: '/vaccine.png', faIcon: 'fas fa-syringe', accent: '#ffc107', accentAlpha: 'rgba(255,193,7,0.12)', description: 'Vaccination Records', delay: '0.1s' },
            { label: 'Deworming', count: dewormings.filter(r => r.is_mine == 1).length, icon: '/deworm.png', faIcon: 'fas fa-pills', accent: '#17a2b8', accentAlpha: 'rgba(23,162,184,0.12)', description: 'Deworming Records', delay: '0.2s' },
            { label: 'Sterilization', count: sterilizations.filter(r => r.is_mine == 1).length, icon: '/sterilization.png', faIcon: 'fas fa-cut', accent: '#28a745', accentAlpha: 'rgba(40,167,69,0.12)', description: 'Sterilization Records', delay: '0.3s' },
            { label: 'Microchip', count: microchips.filter(r => r.is_mine == 1).length, icon: '/microchip.png', faIcon: 'fas fa-microchip', accent: '#4361ee', accentAlpha: 'rgba(67,97,238,0.12)', description: 'Microchip Records', delay: '0.4s' },
          ].map(({ label, count, icon, faIcon, accent, accentAlpha, description, delay }, i) => (
            <Col md={6} lg={3} className="mb-3" key={i} style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
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
                      <p style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>{label}</p>
                      <h2 style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{count}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                        <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>{description}</span>
                      </div>
                    </div>
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: accentAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
          <Col md={6}>
            <InputGroup style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
                <i className="fas fa-search"></i>
              </InputGroup.Text>
              <Form.Control type="text" placeholder="Search by pet name, registration number, or veterinarian..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: '2px solid #e9ecef', borderLeft: 'none', borderRight: searchTerm ? 'none' : '2px solid #e9ecef' }} />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')} style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}>
                  <i className="fas fa-times"></i>
                </Button>
              )}
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Select value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)} style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500' }}>
              <option value="all">All Species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="rabbit">Rabbits</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} style={{ borderRadius: '12px', border: '2px solid #e9ecef', fontWeight: '500' }}>
              <option value="all">All Records ({vaccinations.filter(r => r.is_mine == 1).length + dewormings.filter(r => r.is_mine == 1).length + sterilizations.filter(r => r.is_mine == 1).length + microchips.filter(r => r.is_mine == 1).length})</option>
              <option value="vaccination">Vaccination ({filteredVaccinations.filter(r => r.is_mine == 1).length})</option>
              <option value="deworming">Deworming ({filteredDewormings.filter(r => r.is_mine == 1).length})</option>
              <option value="sterilization">Sterilization ({filteredSterilizations.filter(r => r.is_mine == 1).length})</option>
              <option value="microchip">Microchip ({filteredMicrochips.filter(r => r.is_mine == 1).length})</option>
            </Form.Select>
          </Col>
        </Row>

        {/* Table */}
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
          <Col>
            <Card className="border-0" style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <Card.Header style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderBottom: '2px solid #ffc107', padding: '1.5rem', borderRadius: '20px 20px 0 0' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                    <i className="fas fa-clipboard-list me-2" style={{ color: '#ffc107' }}></i>
                    {activeTab === 'all' && `All Records (${filteredVaccinations.length + filteredDewormings.length + filteredSterilizations.length + filteredMicrochips.length})`}
                    {activeTab === 'vaccination' && `Vaccination Records (${filteredVaccinations.length})`}
                    {activeTab === 'deworming' && `Deworming Records (${filteredDewormings.length})`}
                    {activeTab === 'sterilization' && `Sterilization Records (${filteredSterilizations.length})`}
                    {activeTab === 'microchip' && `Microchip Records (${filteredMicrochips.length})`}
                  </h5>
                  <Button onClick={handleOpenModal} className="border-0"
                    style={{ background: '#ffc107', color: '#000000', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: '700', boxShadow: '0 4px 15px rgba(255,193,7,0.4)', transition: 'all 0.3s' }}
                    onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.background = '#ffb300'; }}
                    onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.background = '#ffc107'; }}
                  >
                    <i className="fas fa-plus me-2"></i>Add Record
                  </Button>
                </div>
              </Card.Header>
              <Card.Body style={{ padding: '2rem' }}>
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
                    <Table hover style={{ marginBottom: 0 }}>
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                          {activeTab === 'all' && <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Type</th>}
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Date</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Pet Information</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Record Details</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Weight</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Veterinarian</th>
                          <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center' }}>Recorded By</th>
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
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                {record.weight ? <span style={{ fontWeight: '500', color: '#555' }}>{record.weight} kg</span> : <span className="text-muted">-</span>}
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <small style={{ fontWeight: '500', color: '#555' }}>{record.veterinarian_name || 'Not specified'}</small>
                              </td>
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0.3rem 0.6rem', borderRadius: '6px', color: record.is_mine == 1 ? '#28a745' : '#6c757d', background: record.is_mine == 1 ? 'rgba(40,167,69,0.1)' : 'rgba(108,117,125,0.1)' }}>
                                  {record.recorded_by || 'City Vet Muntinlupa'}
                                </span>
                              </td>
                              <ActionDropdown dropdownKey={dropdownKey} record={record} type={type} />
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
                <Card.Body style={{ padding: '2rem' }}>
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
                              <ActionDropdown dropdownKey={`mic-tab-${microchip.id}`} record={microchip} type="microchip" />
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
              {modalMode === 'edit' && (
                <Row className="mb-3">
                  <Col>
                    <strong style={{ fontSize: '0.9rem', color: '#666' }}>Record Type</strong>
                    <div className="mt-1">
                      <Badge style={{ fontSize: '0.95rem', padding: '0.5rem 1rem', borderRadius: '8px', background: formData.record_type === 'vaccination' ? '#ffc107' : formData.record_type === 'deworming' ? '#17a2b8' : '#28a745', color: formData.record_type === 'vaccination' ? '#000' : '#fff' }}>
                        {getRecordTypeLabel(formData.record_type)}
                      </Badge>
                    </div>
                  </Col>
                </Row>
              )}
              <Row className="mb-4" style={{ display: modalMode === 'edit' ? 'none' : '' }}>
                <Col>
                  <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Record Type <span style={{ color: '#dc3545' }}>*</span></Form.Label>
                  <div className="d-flex gap-3" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {[
                      { type: 'vaccination', label: 'Vaccination', icon: '/vaccine.png', faIcon: 'fas fa-syringe', color: '#ffc107', activeBg: '#fff9e6' },
                      { type: 'deworming', label: 'Deworming', icon: '/deworm.png', faIcon: 'fas fa-pills', color: '#17a2b8', activeBg: '#e6f7f9' },
                      { type: 'sterilization', label: 'Sterilization', icon: '/sterilization.png', faIcon: 'fas fa-cut', color: '#28a745', activeBg: '#e6f9e9' },
                      { type: 'microchip', label: 'Microchip', icon: '/microchip.png', faIcon: 'fas fa-microchip', color: '#4361ee', activeBg: '#eef0ff' },
                    ].map(({ type, label, icon, faIcon, color, activeBg }) => (
                      <div key={type} onClick={() => handleRecordTypeSelect(type)} style={{ flex: 1, padding: '1.5rem', border: formData.record_type === type ? `3px solid ${color}` : '2px solid #dee2e6', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.record_type === type ? activeBg : '#ffffff', transition: 'all 0.3s' }}>
                        <img src={icon} alt={label} style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <i className={faIcon} style={{ fontSize: '2.5rem', color, marginBottom: '0.5rem', display: 'none' }}></i>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{label}</div>
                      </div>
                    ))}
                  </div>
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
                          <Form.Control type="text" value={formData.pet_registration_input} onChange={handleRegistrationNumberChange} placeholder="202510-0001" required maxLength={11} readOnly={modalMode === 'edit'} style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.5px', border: '2px solid #ced4da', borderLeft: 'none', backgroundColor: modalMode === 'edit' ? '#f8f9fa' : '#ffffff' }} />
                        </InputGroup>
                        <Form.Text className="text-muted">Format: YYYYMM-XXXX (Example: 202510-0001)</Form.Text>
                        {modalMode === 'edit' ? (
                          <Alert variant="info" className="mt-2 mb-0 py-2">
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>{editingRecord?.pet_name}</strong>
                          </Alert>
                        ) : formData.pet_registration_input && formData.pet_registration_input.length > 0 && (
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
  {modalMode === 'edit'
    ? getFilteredTypes().map(vt => (
        <option key={vt.id} value={vt.id}>
          {vt.name} ({vt.species === 'both' || vt.species === 'all' ? 'All pets' : vt.species})
        </option>
      ))
    : getFilteredTypes().map(item => (
        <option key={item.id} value={item.id}>
          {item.item_name} ({!item.species || item.species === 'all' || item.species === 'both' ? 'All pets' : item.species})
        </option>
      ))
  }
</Form.Select>
  
</Form.Group>
                        </Col>
                      </Row>
                      {/* Batch selection for vaccination — create mode only */}
                      {modalMode === 'create' && formData.vaccination_type_id && (
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
                                            <Form.Check type="radio" id={`clinic-vac-batch-${batch.id}`} name="clinic_vaccine_batch" checked={isSelected} disabled={noStock} onChange={() => setSelectedVaccineBatch(batch.id)} />
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
                            <Form.Control type="date" name="vaccination_next_due_date" value={formData.vaccination_next_due_date} onChange={handleChange} min={formData.vaccination_date} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
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
  {modalMode === 'edit'
    ? getFilteredTypes().map(dt => (
        <option key={dt.id} value={dt.id}>
          {dt.name} ({dt.species === 'both' || dt.species === 'all' ? 'All pets' : dt.species})
        </option>
      ))
    : getFilteredTypes().map(item => (
        <option key={item.id} value={item.id}>
          {item.item_name} ({!item.species || item.species === 'all' || item.species === 'both' ? 'All pets' : item.species})
        </option>
      ))
  }
</Form.Select>
{modalMode === 'create' && formData.vaccination_type_id && !vaccinationTypes.find(vt => String(vt.id) === String(formData.vaccination_type_id)) && (
  <div style={{ fontSize: '0.78rem', color: '#dc3545', marginTop: '0.3rem' }}>
    ⚠ No matching vaccine type found in system for this inventory item.
  </div>
)}
  
</Form.Group>
                        </Col>
                      </Row>
                      {/* Batch selection for deworming — create mode only */}
                      {modalMode === 'create' && formData.deworming_type_id && (
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
                                        <div key={batch.id} style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', border: isSelected ? '2px solid #17a2b8' : '1px solid #dee2e6', background: isSelected ? 'rgba(23,162,184,0.06)' : '#fafafa', opacity: noStock && !isSelected ? 0.5 : 1 }}>
                                          <div className="d-flex align-items-center gap-2">
                                            <Form.Check type="radio" id={`clinic-dew-batch-${batch.id}`} name="clinic_dewormer_batch" checked={isSelected} disabled={noStock} onChange={() => setSelectedDewormingBatch(batch.id)} />
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
                            <Form.Control type="date" name="deworming_next_due_date" value={formData.deworming_next_due_date} onChange={handleChange} min={formData.deworming_date} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
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
                            <Form.Control type="text" name="microchip_number" value={formData.microchip_number} onChange={handleChange} placeholder="e.g., 985112345678901" required maxLength={20} readOnly={modalMode === 'edit'} style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6', fontFamily: 'monospace', letterSpacing: '0.5px', backgroundColor: modalMode === 'edit' ? '#f8f9fa' : '#ffffff' }} />
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
                      </Row>
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Microchip Brand</Form.Label>
                            <Form.Control type="text" name="microchip_brand" value={formData.microchip_brand} onChange={handleChange} placeholder="e.g., Datamars, Trovan, HomeAgain" style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  {/* Common Fields */}
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Veterinarian Name</Form.Label>
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
              <Button type="submit" disabled={
                formLoading ||
                !formData.record_type ||
                (modalMode === 'create' && !getSelectedPet()) ||
                (formData.record_type === 'microchip' && !formData.microchip_number) ||
                (formData.record_type === 'microchip' && modalMode === 'create' && !selectedMicrochipBatch) ||
                (formData.record_type === 'vaccination' && modalMode === 'create' && formData._inventory_vaccine_id && !selectedVaccineBatch) ||
                (formData.record_type === 'deworming' && modalMode === 'create' && formData._inventory_dewormer_id && !selectedDewormingBatch)
              } className="border-0"
                style={{ background: formLoading || !formData.record_type || (modalMode === 'create' && !getSelectedPet()) ? '#6c757d' : '#ffc107', color: '#000000', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700', transition: 'all 0.3s' }}>
                {formLoading ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</> : modalMode === 'edit' ? <><i className="fas fa-save me-2"></i>Save Changes</> : <><i className="fas fa-save me-2"></i>Add {formData.record_type ? getRecordTypeLabel(formData.record_type) : ''} Record</>}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* View Record Modal */}
        <Modal show={showViewModal} onHide={handleCloseViewModal} size="lg" style={{zoom:'0.75'}}>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <Modal.Title style={{ fontWeight: '700' }}><i className="fas fa-eye me-2"></i>Record Details</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem' }}>
            {selectedRecord && (
              <>
                <Row className="mb-4">
                  <Col md={6}>
                    <strong className="d-block mb-1" style={{ fontSize: '0.9rem', color: '#666' }}>Type</strong>
                    <span style={{ fontWeight: '500', color: '#555' }}>
                      {selectedRecord.recordType === 'vaccination' && <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</>}
                      {selectedRecord.recordType === 'deworming' && <><i className="fas fa-pills me-1" style={{ color: '#17a2b8' }}></i>Deworming</>}
                      {selectedRecord.recordType === 'sterilization' && <><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</>}
                      {selectedRecord.recordType === 'microchip' && <><i className="fas fa-microchip me-1" style={{ color: '#4361ee' }}></i>Microchip</>}
                    </span>
                  </Col>
                  <Col md={6}>
                    <strong className="d-block mb-1" style={{ fontSize: '0.9rem', color: '#666' }}>Date</strong>
                    <p className="mb-0">
                      {selectedRecord.recordType === 'vaccination' && new Date(selectedRecord.vaccination_date).toLocaleDateString()}
                      {selectedRecord.recordType === 'deworming' && new Date(selectedRecord.deworming_date).toLocaleDateString()}
                      {selectedRecord.recordType === 'sterilization' && new Date(selectedRecord.sterilization_date).toLocaleDateString()}
                      {selectedRecord.recordType === 'microchip' && new Date(selectedRecord.implant_date).toLocaleDateString()}
                    </p>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={12}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Pet Name</strong><p className="mb-0">{selectedRecord.pet_name}</p></Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Registration Number</strong><p className="mb-0">{selectedRecord.registration_number}</p></Col>
                  <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Species</strong><p className="mb-0 text-capitalize">{selectedRecord.species || selectedRecord.pet_species}</p></Col>
                </Row>
                {selectedRecord.recordType === 'vaccination' && (
                  <>
                    <Row className="mb-3"><Col><strong style={{ fontSize: '0.9rem', color: '#666' }}>Vaccine Type</strong><p className="mb-0">{selectedRecord.vaccine_name}</p></Col></Row>
                    {selectedRecord.next_due_date && <Row className="mb-3"><Col><strong style={{ fontSize: '0.9rem', color: '#666' }}>Next Due Date</strong><p className="mb-0" style={{ fontWeight: '600', color: new Date(selectedRecord.next_due_date) < new Date() ? '#dc3545' : '#28a745' }}>{new Date(selectedRecord.next_due_date).toLocaleDateString()}</p></Col></Row>}
                  </>
                )}
                {selectedRecord.recordType === 'deworming' && (
                  <>
                    <Row className="mb-3">
                      <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Deworming Type</strong><p className="mb-0">{selectedRecord.deworming_name}</p></Col>
                      {selectedRecord.dosage && <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Dosage</strong><p className="mb-0">{selectedRecord.dosage}</p></Col>}
                    </Row>
                    {selectedRecord.next_due_date && <Row className="mb-3"><Col><strong style={{ fontSize: '0.9rem', color: '#666' }}>Next Due Date</strong><p className="mb-0" style={{ fontWeight: '600', color: new Date(selectedRecord.next_due_date) < new Date() ? '#dc3545' : '#28a745' }}>{new Date(selectedRecord.next_due_date).toLocaleDateString()}</p></Col></Row>}
                  </>
                )}
                {selectedRecord.recordType === 'sterilization' && (
                  <Row className="mb-3"><Col><strong style={{ fontSize: '0.9rem', color: '#666' }}>Procedure Type</strong><p className="mb-0"><Badge bg="success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>{selectedRecord.procedure_type}</Badge></p></Col></Row>
                )}
                <Row className="mb-3">
                  <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Weight</strong><p className="mb-0">{selectedRecord.weight ? `${selectedRecord.weight} kg` : 'Not specified'}</p></Col>
                  <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Veterinarian</strong><p className="mb-0">{selectedRecord.veterinarian_name || 'Not specified'}</p></Col>
                </Row>
                <Row className="mb-3">
                  <Col md={12}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Recorded By</strong><p className="mb-0">{selectedRecord.recorded_by || 'City Vet Muntinlupa'}</p></Col>
                </Row>
                {selectedRecord.recordType === 'microchip' && (
                  <>
                    <Row className="mb-3">
                      <Col md={12}>
                        <strong style={{ fontSize: '0.9rem', color: '#666' }}>Microchip Number</strong>
                        <p className="mb-0" style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: '600', color: '#4361ee' }}>{selectedRecord.microchip_number}</p>
                      </Col>
                    </Row>
                    <Row className="mb-3">
                      <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Microchip Brand</strong><p className="mb-0">{selectedRecord.microchip_brand || 'Not specified'}</p></Col>
                      <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Implant Site</strong><p className="mb-0">{selectedRecord.implant_site || 'Not specified'}</p></Col>
                    </Row>
                  </>
                )}
                {selectedRecord.recordType === 'microchip' && (
                  <>
                    <Row className="mb-3">
                      <Col md={12}>
                        <strong style={{ fontSize: '0.9rem', color: '#666' }}>Microchip Number</strong>
                        <p className="mb-0" style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: '600', color: '#4361ee' }}>{selectedRecord.microchip_number}</p>
                      </Col>
                    </Row>
                    <Row className="mb-3">
                      <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Microchip Brand</strong><p className="mb-0">{selectedRecord.microchip_brand || 'Not specified'}</p></Col>
                      <Col md={6}><strong style={{ fontSize: '0.9rem', color: '#666' }}>Implant Site</strong><p className="mb-0">{selectedRecord.implant_site || 'Not specified'}</p></Col>
                    </Row>
                  </>
                )}
                {(selectedRecord.recordType === 'vaccination' || selectedRecord.recordType === 'deworming' || selectedRecord.recordType === 'microchip') && selectedRecord.notes && (
                  <Row className="mb-3"><Col><strong style={{ fontSize: '0.9rem', color: '#666' }}>Notes</strong><p className="mb-0">{selectedRecord.notes}</p></Col></Row>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
            {selectedRecord?.is_mine == 1 && (
              <Button onClick={() => { handleCloseViewModal(); handleOpenEditModal(selectedRecord, selectedRecord.recordType); }} className="border-0"
                style={{ background: '#ffc107', color: '#000', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700' }}>
                <i className="fas fa-edit me-2"></i>Edit Record
              </Button>
            )}
            <Button variant="secondary" onClick={handleCloseViewModal} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>Close</Button>
          </Modal.Footer>
        </Modal>

      </Container>
    </>
  );
};

export default ClinicRecordManagement;