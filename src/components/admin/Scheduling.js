import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table, InputGroup } from 'react-bootstrap';
import { scheduleAPI, barangayAPI, vaccinationAPI, dewormingAPI, inventoryAPI, handleAPIError } from '../../services/api';
import { getUser } from '../../utils/auth';

const Schedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [vaccinationTypes, setVaccinationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [vaccineRegistrationCounts, setVaccineRegistrationCounts] = useState({});
  const [loadingVaccineCounts, setLoadingVaccineCounts] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [batchAllocations, setBatchAllocations] = useState({});
  const [scheduleAllocations, setScheduleAllocations] = useState({});
  const [loadingBatchAvailability, setLoadingBatchAvailability] = useState(false);

  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [filterType, setFilterType] = useState('all');
  const [filterBarangay, setFilterBarangay] = useState('all');
const [filterStatus, setFilterStatus] = useState('upcoming');
  const [filterVaccineSpecies, setFilterVaccineSpecies] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showDropdown, setShowDropdown] = useState(null);
  const dropdownButtonRef = useRef(null);
const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
const ZOOM = 0.75;

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 5;
  
  const [formData, setFormData] = useState({
    schedule_type: '',
    barangay_id: '',
    title: '',
    description: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    venue: '',
    max_capacity: '',
    speaker: '',
    vaccination_types: {},
    deworming_types: {},
    pet_types_allowed: [],
    sterilization_species: [],
    other_pet_types: [],
    other_event_type: '',
    status: 'scheduled'
  });

  const user = getUser();
  
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
    @media (max-width: 768px) {
      .sched-title { font-size: 1.5rem !important; }
      .sched-stat-row { flex-wrap: nowrap !important; }
      .sched-stat-col { flex: 1 1 0 !important; min-width: 0 !important; }
      .sched-stat-number { font-size: 1.1rem !important; margin-bottom: 0.25rem !important; }
      .sched-stat-label { font-size: 0.55rem !important; margin-bottom: 0.15rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      .sched-stat-card-body { padding: 0.6rem 0.5rem !important; }
      .sched-stat-icon { width: 32px !important; height: 32px !important; border-radius: 8px !important; flex-shrink: 0 !important; }
      .sched-stat-icon img { width: 18px !important; height: 18px !important; }
      .sched-filters-row > div { margin-bottom: 0.5rem; }
      .sched-card-header { padding: 0.75rem 1rem !important; }
      .sched-card-header h5 { font-size: 0.85rem !important; }
      .sched-add-btn { padding: 0.4rem 0.75rem !important; font-size: 0.8rem !important; }
      .sched-card-body { padding: 1rem !important; }
      .sched-table th, .sched-table td { font-size: 0.7rem !important; padding: 0.5rem 0.3rem !important; }
      .sched-table .mobile-hide { display: none !important; }
.sched-table .mobile-hide-datetime { display: none !important; }
      .sched-pagination { font-size: 0.75rem !important; }
      .sched-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .sched-pagination .page-info { font-size: 0.75rem !important; }
      .sched-view-modal .modal-body { padding: 1rem !important; }
      .sched-view-modal .modal-body strong { font-size: 0.78rem !important; }
      .sched-view-modal .modal-body p { font-size: 0.85rem !important; margin-bottom: 0.4rem !important; }
    }
  `;
  
  useEffect(() => {
    console.log('Current user:', user);
    console.log('Assigned barangay ID:', user?.assigned_barangay_id);
  }, []);

  useEffect(() => {
    loadData();
    loadBarangays();
    loadVaccinationTypes();
    loadInventory();
  }, []);
  useEffect(() => {
  setCurrentPage(1);
}, [filterType, filterBarangay, filterStatus, searchTerm]);

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

  const loadData = async () => {
  try {
    setLoading(true);
    const [vaccinationRes, seminarRes, sterilizationRes, otherRes, microchipRes] = await Promise.all([
      scheduleAPI.getVaccinationSchedules().catch(() => ({ data: { schedules: [] } })),
      scheduleAPI.getSeminarSchedules().catch(() => ({ data: { schedules: [] } })),
      scheduleAPI.getSterilizationSchedules().catch(() => ({ data: { schedules: [] } })),
      
      scheduleAPI.getOtherSchedules().catch(() => ({ data: { schedules: [] } })),
      scheduleAPI.getMicrochipSchedules().catch(() => ({ data: { schedules: [] } }))
    ]);
    
    const vaccinationSchedules = (vaccinationRes.data.schedules || []).map(s => ({ ...s, type: 'vaccination' }));
    const seminarSchedules = (seminarRes.data.schedules || []).map(s => ({ ...s, type: 'seminar' }));
    const sterilizationSchedules = (sterilizationRes.data.schedules || []).map(s => ({ ...s, type: 'sterilization' }));
    const otherSchedules = (otherRes.data.schedules || []).map(s => ({ ...s, type: 'other' }));
    const microchipSchedules = (microchipRes.data.schedules || []).map(s => ({ ...s, type: 'microchip' }));
    
    const allSchedules = [...vaccinationSchedules, ...seminarSchedules, ...sterilizationSchedules, ...otherSchedules, ...microchipSchedules].sort((a, b) =>
      new Date(b.scheduled_date) - new Date(a.scheduled_date)
    );
    
    setSchedules(allSchedules);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadBarangays = async () => {
    try {
      const response = await barangayAPI.getAll();
      setBarangays(response.data.barangays || []);
    } catch (err) {
      console.error('Error loading barangays:', err);
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

  const loadInventory = async () => {
    try {
      setLoadingInventory(true);
      const response = await inventoryAPI.getAll();
      setInventory(response.data.inventory || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Helper: get stock for a vaccination type from inventory
  const getVaccineStock = (typeId) => {
  const vaccine = vaccinationTypes.find(v => v.id === parseInt(typeId));
  if (!vaccine) return null;
  const item = inventory.find(
    i => i.item_type === 'vaccination' && parseInt(i.item_type_id) === parseInt(typeId)
  );
  return item ? parseInt(item.current_stock) : null;
};

const getInventoryItemForVaccine = (typeId) => {
  return inventory.find(
    i => i.item_type === 'vaccination' && parseInt(i.item_type_id) === parseInt(typeId)
  ) || null;
};

const loadBatchAvailability = async (inventoryId, scheduleId = null) => {
  setLoadingBatchAvailability(true);
  try {
    const param = scheduleId ? `${inventoryId}?exclude_schedule=${scheduleId}` : `${inventoryId}`;
    const res = await inventoryAPI.getBatchAvailability(param);
    const batches = res.data.batches || [];
    setBatchAllocations(prev => ({ ...prev, [inventoryId]: batches }));
  } catch (err) {
    console.error('Failed to load batch availability', err);
  } finally {
    setLoadingBatchAvailability(false);
  }
};

  

  // Helper: get microchip stock
  const getMicrochipStock = () => {
    const item = inventory.find(i => i.item_type === 'microchip');
    return item ? parseInt(item.current_stock) : null;
  };

  const getMicrochipInventoryItem = () => {
    return inventory.find(i => i.item_type === 'microchip') || null;
  };

  const handleOpenModal = (mode = 'create', schedule = null) => {
    setModalMode(mode);
    setSelectedSchedule(schedule);
    setError('');
    
    const defaultBarangayId = user?.assigned_barangay_id ? String(user.assigned_barangay_id) : '';
    console.log('User assigned barangay ID:', defaultBarangayId);
    
    if (mode === 'edit' && schedule) {
  let vacTypes = {};
  let dewormTypes = {};
  let petTypes = [];
  let sterilSpecies = [];
  let otherPetTypes = [];

  if (schedule.type === 'vaccination' && schedule.vaccine_shot_limits) {
    try {
      vacTypes = typeof schedule.vaccine_shot_limits === 'string' 
        ? JSON.parse(schedule.vaccine_shot_limits) 
        : schedule.vaccine_shot_limits;
    } catch (e) {
      vacTypes = {};
    }
  }

  if (schedule.type === 'deworming' && schedule.deworming_limits) {
    try {
      dewormTypes = typeof schedule.deworming_limits === 'string' 
        ? JSON.parse(schedule.deworming_limits) 
        : schedule.deworming_limits;
    } catch (e) {
      dewormTypes = {};
    }
  }

  if (schedule.pet_types_allowed) {
    try {
      const parsed = Array.isArray(schedule.pet_types_allowed)
        ? schedule.pet_types_allowed
        : JSON.parse(schedule.pet_types_allowed);
      
      // For deworming, use pet_types_allowed
      if (schedule.type === 'deworming') {
        petTypes = parsed;
      } 
      // For other, use other_pet_types
      else if (schedule.type === 'other') {
        otherPetTypes = parsed;
      }
    } catch (e) {
      petTypes = [];
      otherPetTypes = [];
    }
  }

  if (schedule.type === 'sterilization' && schedule.sterilization_species) {
    try {
      sterilSpecies = Array.isArray(schedule.sterilization_species)
        ? schedule.sterilization_species
        : JSON.parse(schedule.sterilization_species);
    } catch (e) {
      sterilSpecies = [];
    }
  }
  
  setFormData({
    schedule_type: schedule.type,
    barangay_id: String(schedule.barangay_id || ''),
    title: schedule.title || '',
    description: schedule.description || '',
    scheduled_date: schedule.scheduled_date || '',
    start_time: schedule.start_time || '',
    end_time: schedule.end_time || '',
    venue: schedule.venue || '',
    max_capacity: schedule.max_capacity || '',
    speaker: schedule.speaker || '',
    vaccination_types: vacTypes,
    deworming_types: dewormTypes,
    pet_types_allowed: petTypes,
    sterilization_species: sterilSpecies,
    other_pet_types: otherPetTypes,
    other_event_type: schedule.other_event_type || '',
    status: schedule.status || 'scheduled'
  });
    } else {
      setFormData({
        schedule_type: '',
        barangay_id: defaultBarangayId,
        title: '',
        description: '',
        scheduled_date: '',
        start_time: '',
        end_time: '',
        venue: '',
        max_capacity: '',
        speaker: '',
        vaccination_types: {},
        deworming_types: {},
        pet_types_allowed: [],
        sterilization_species: [],
        other_pet_types: [],
        other_event_type: '',
        status: 'scheduled'
      });
    }
    
    if (mode === 'edit' && schedule?.type === 'microchip') {
      const microchipInvItem = inventory.find(i => i.item_type === 'microchip');
      if (microchipInvItem) loadBatchAvailability(microchipInvItem.id, schedule.id);
    }

    setShowModal(true);
  };

  const handleOpenViewModal = async (schedule) => {
  console.log('📖 Opening view modal for schedule:', schedule);
  
  // If it's a vaccination schedule, fetch the per-vaccine counts FIRST
  if (schedule.type === 'vaccination') {
    try {
      console.log('🔍 Fetching vaccine counts for schedule ID:', schedule.id);
      const response = await scheduleAPI.getVaccineRegistrationCounts(schedule.id);
      console.log('✅ Vaccine counts received:', response.data.vaccine_counts);
      setVaccineRegistrationCounts(response.data.vaccine_counts || {});
      
      // Wait a tiny bit for state to update
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      console.error('❌ Error fetching vaccine counts:', err);
      setVaccineRegistrationCounts({});
    }
  }
  
  // Set the selected schedule and show modal AFTER fetching data
  setSelectedSchedule(schedule);
  setShowViewModal(true);
};

  const handleCloseModal = () => {
    setShowModal(false);
    setError('');
    setSelectedSchedule(null);
    setModalMode('create');
    setScheduleAllocations({});
    setBatchAllocations({});
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedSchedule(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleVaccinationTypeToggle = (typeId, shotLimit = '') => {
    setFormData(prev => {
      const newVaccinationTypes = { ...prev.vaccination_types };
      if (newVaccinationTypes[typeId] !== undefined && shotLimit === '') {
        delete newVaccinationTypes[typeId];
        // Clear batch selections for this vaccine
        const invItem = getInventoryItemForVaccine(typeId);
        if (invItem) {
          setScheduleAllocations(sa => {
            const next = { ...sa };
            const batches = batchAllocations[invItem.id] || [];
            batches.forEach(b => delete next[b.id]);
            return next;
          });
        }
      } else {
        newVaccinationTypes[typeId] = shotLimit || '';
        // Load batch availability for this vaccine
        const invItem = getInventoryItemForVaccine(typeId);
        if (invItem) {
          loadBatchAvailability(invItem.id, selectedSchedule?.id || null);
        }
      }
      return { ...prev, vaccination_types: newVaccinationTypes };
    });
  };

  const handleBatchAllocationChange = (batchId, value, typeId) => {
    const invItem = getInventoryItemForVaccine(typeId);
    if (!invItem) return;
    const batches = batchAllocations[invItem.id] || [];
    const batch = batches.find(b => b.id === parseInt(batchId));
    if (!batch) return;

    let parsed = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    if (parsed > batch.available_qty) parsed = batch.available_qty;

    setScheduleAllocations(prev => ({ ...prev, [batchId]: parsed }));

    // Auto-update the shot limit for this vaccine = sum of all batch allocations for it
    const updatedAllocations = { ...scheduleAllocations, [batchId]: parsed };
    const totalForVaccine = batches
      .filter(b => updatedAllocations[b.id] > 0)
      .reduce((sum, b) => sum + (updatedAllocations[b.id] || 0), 0);

    setFormData(prev => ({
      ...prev,
      vaccination_types: { ...prev.vaccination_types, [typeId]: totalForVaccine || '' }
    }));
  };

  const handleBatchToggle = (batchId, typeId) => {
    setScheduleAllocations(prev => {
      const next = { ...prev };
      if (next[batchId] !== undefined) {
        delete next[batchId];
        // Recompute shot limit
        const invItem = getInventoryItemForVaccine(typeId);
        const batches = batchAllocations[invItem?.id] || [];
        const total = batches.reduce((sum, b) => sum + (b.id === parseInt(batchId) ? 0 : (next[b.id] || 0)), 0);
        setFormData(f => ({ ...f, vaccination_types: { ...f.vaccination_types, [typeId]: total || '' } }));
      } else {
        next[batchId] = 0;
      }
      return next;
    });
  };

  const handleDewormingTypeToggle = (typeId, limit = '') => {
    setFormData(prev => {
      const newDewormingTypes = { ...prev.deworming_types };
      
      if (newDewormingTypes[typeId] !== undefined && limit === '') {
        delete newDewormingTypes[typeId];
      } else {
        newDewormingTypes[typeId] = limit || '';
      }
      
      return {
        ...prev,
        deworming_types: newDewormingTypes
      };
    });
  };

  const handleDewormingLimitChange = (typeId, value) => {
    setFormData(prev => ({
      ...prev,
      deworming_types: {
        ...prev.deworming_types,
        [typeId]: value === '' ? '' : parseInt(value) || ''
      }
    }));
  };

  const handlePetTypesToggle = (species) => {
    setFormData(prev => ({
      ...prev,
      pet_types_allowed: prev.pet_types_allowed.includes(species)
        ? prev.pet_types_allowed.filter(s => s !== species)
        : [...prev.pet_types_allowed, species]
    }));
  };

  const handleSterilizationSpeciesToggle = (species) => {
    setFormData(prev => ({
      ...prev,
      sterilization_species: prev.sterilization_species.includes(species)
        ? prev.sterilization_species.filter(s => s !== species)
        : [...prev.sterilization_species, species]
    }));
  };
  const handleOtherPetTypesToggle = (species) => {
  setFormData(prev => ({
    ...prev,
    other_pet_types: prev.other_pet_types.includes(species)
      ? prev.other_pet_types.filter(s => s !== species)
      : [...prev.other_pet_types, species]
  }));
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      if (modalMode === 'create') {
  const selectedDate = new Date(formData.scheduled_date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);
  
  if (selectedDate < tomorrow) {
    setError('Cannot schedule events for today or in the past. Please select tomorrow or a future date.');
    setFormLoading(false);
    return;
  }
}

      // Time validations
      if (formData.start_time && formData.end_time) {
        const [startH, startM] = formData.start_time.split(':').map(Number);
        const [endH, endM] = formData.end_time.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        if (startTotal < 8 * 60 || startTotal > 17 * 60) {
          setError('Start time must be between 8:00 AM and 5:00 PM.');
          setFormLoading(false);
          return;
        }
        if (endTotal < 8 * 60 || endTotal > 17 * 60) {
          setError('End time must be between 8:00 AM and 5:00 PM.');
          setFormLoading(false);
          return;
        }
        if (startTotal >= endTotal) {
          setError('End time must be later than start time.');
          setFormLoading(false);
          return;
        }
        if (endTotal - startTotal < 30) {
          setError('There must be at least a 30-minute gap between start and end time.');
          setFormLoading(false);
          return;
        }
      }
      if (formData.schedule_type === 'vaccination') {
        const hasInvalidLimits = Object.values(formData.vaccination_types).some(
          limit => !limit || parseInt(limit) <= 0
        );
        if (hasInvalidLimits || Object.keys(formData.vaccination_types).length === 0) {
          setError('Please select at least one vaccine and enter valid shot limits (greater than 0).');
          setFormLoading(false);
          return;
        }
        // Stock check
        for (const [typeId, limit] of Object.entries(formData.vaccination_types)) {
          const stock = getVaccineStock(typeId);
          if (stock !== null && parseInt(limit) > stock) {
            const vaccine = vaccinationTypes.find(v => v.id === parseInt(typeId));
            setError(`Shot limit for "${vaccine?.name || 'vaccine'}" exceeds available stock (${stock} available).`);
            setFormLoading(false);
            return;
          }
          if (stock !== null && stock === 0) {
            const vaccine = vaccinationTypes.find(v => v.id === parseInt(typeId));
            setError(`"${vaccine?.name || 'vaccine'}" is out of stock.`);
            setFormLoading(false);
            return;
          }
        }
      }

      if (formData.schedule_type === 'microchip' && modalMode === 'create') {
        const chipStock = getMicrochipStock();
        if (chipStock !== null && chipStock === 0) {
          setError('Microchips are out of stock.');
          setFormLoading(false);
          return;
        }
        if (chipStock !== null && formData.max_capacity && parseInt(formData.max_capacity) > chipStock) {
          setError(`Max capacity (${formData.max_capacity}) exceeds available microchip stock (${chipStock}).`);
          setFormLoading(false);
          return;
        }
      }

      const dataToSubmit = {
        barangay_id: parseInt(formData.barangay_id),
        title: formData.title,
        description: formData.description,
        scheduled_date: formData.scheduled_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        venue: formData.venue,
        schedule_type: formData.schedule_type,
        status: formData.status
      };

      if (formData.schedule_type === 'vaccination') {
        dataToSubmit.vaccine_shot_limits = formData.vaccination_types;
        
        const selectedVaccineIds = Object.keys(formData.vaccination_types).map(id => parseInt(id));
        const selectedVaccines = vaccinationTypes.filter(vt => selectedVaccineIds.includes(vt.id));
        
        const petTypesSet = new Set();
        selectedVaccines.forEach(vaccine => {
          if (vaccine.species === 'dog') {
            petTypesSet.add('dog');
          } else if (vaccine.species === 'cat') {
            petTypesSet.add('cat');

            petTypesSet.add('dog');
            petTypesSet.add('cat');
          } else if (vaccine.species === 'all') {
            petTypesSet.add('dog');
            petTypesSet.add('cat');
          }
        });
        
        dataToSubmit.pet_types_allowed = Array.from(petTypesSet);
      } else if (formData.schedule_type === 'seminar') {
        dataToSubmit.speaker = formData.speaker || null;
        dataToSubmit.max_capacity = formData.max_capacity ? parseInt(formData.max_capacity) : null;
      } else if (formData.schedule_type === 'sterilization') {
        dataToSubmit.max_capacity = formData.max_capacity ? parseInt(formData.max_capacity) : null;
        dataToSubmit.sterilization_species = formData.sterilization_species;
        } else if (formData.schedule_type === 'other') {
        dataToSubmit.max_capacity = formData.max_capacity ? parseInt(formData.max_capacity) : null;
        dataToSubmit.other_event_type = formData.other_event_type;
        dataToSubmit.pet_types_allowed = formData.other_pet_types;
      } else if (formData.schedule_type === 'microchip') {
        dataToSubmit.max_capacity = formData.max_capacity ? parseInt(formData.max_capacity) : null;
        dataToSubmit.pet_types_allowed = formData.pet_types_allowed;
      }

      console.log('Submitting data:', dataToSubmit);

      let savedScheduleId;
      if (modalMode === 'edit' && selectedSchedule) {
        await scheduleAPI.update(selectedSchedule.id, dataToSubmit);
        savedScheduleId = selectedSchedule.id;
        setSuccess(`${getScheduleTypeLabel(formData.schedule_type)} schedule updated successfully!`);
      } else {
        dataToSubmit.created_by = user.id;
        const res = await scheduleAPI.create(dataToSubmit);
        // Try both res.data.id and res.data.schedule_id as fallback
                savedScheduleId = res.data.id || res.data.schedule_id || null;

        console.log('📅 Created schedule ID:', savedScheduleId, '| Full response:', res.data);
        setSuccess(`${getScheduleTypeLabel(formData.schedule_type)} schedule created successfully!`);
      }

      // Save batch allocations for vaccination schedules
      if ((formData.schedule_type === 'vaccination' || formData.schedule_type === 'microchip') && savedScheduleId) {
        const allocations = Object.entries(scheduleAllocations)
          .filter(([, qty]) => qty > 0)
          .map(([batchId, qty]) => {
            let inventoryId = null;
            for (const [invId, batches] of Object.entries(batchAllocations)) {
              if (batches.find(b => b.id === parseInt(batchId))) {
                inventoryId = parseInt(invId);
                break;
              }
            }
            return { inventory_id: inventoryId, batch_id: parseInt(batchId), allocated_qty: qty };
          })
          .filter(a => a.inventory_id !== null);

        console.log('💉 Saving allocations:', allocations, 'for schedule:', savedScheduleId);
        if (allocations.length > 0) {
          try {
            await inventoryAPI.saveScheduleAllocations(savedScheduleId, { allocations });
            console.log('✅ Allocations saved successfully');
          } catch (allocErr) {
            console.error('❌ Failed to save allocations:', allocErr.response?.data || allocErr);
          }
        } else {
          console.warn('⚠️ No allocations to save — scheduleAllocations:', scheduleAllocations, 'batchAllocations:', batchAllocations);
        }
      }

      handleCloseModal();
      loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (schedule) => {
    setScheduleToDelete(schedule);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;
    
    setDeleteLoading(true);
    try {
      await scheduleAPI.delete(scheduleToDelete.id);
      setShowDeleteModal(false);
      setScheduleToDelete(null);
      // Remove from local state immediately
      setSchedules(prev => prev.filter(s => !(s.id === scheduleToDelete.id && s.type === scheduleToDelete.type)));
      setSuccess(`${getScheduleTypeLabel(scheduleToDelete.type)} schedule deleted successfully!`);
      setTimeout(() => setSuccess(''), 5000);
      // Also refresh from server in background
      loadData();
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };  

  const getScheduleTypeLabel = (type) => {
    const labels = {
      vaccination: 'Vaccination',
      seminar: 'Seminar',
      sterilization: 'Sterilization',
      other: 'Other',
      microchip: 'Microchip'
    };
    return labels[type] || type;
  };

  const getBarangayName = (barangayId) => {
    const barangay = barangays.find(b => b.id === barangayId);
    return barangay ? barangay.name : 'Unknown';
  };

  const getStatusBadge = (schedule) => {
  // Always trust the status from the database first
  if (schedule.status === 'cancelled') {
    return <Badge bg="danger">Cancelled</Badge>;
  } else if (schedule.status === 'completed') {
    return <Badge bg="secondary">Completed</Badge>;
  } else if (schedule.status === 'ongoing') {
    return <Badge bg="success">Ongoing</Badge>;
  } else if (schedule.status === 'scheduled') {
    // Only check if it's past due if status is still "scheduled"
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(schedule.scheduled_date);
    scheduleDate.setHours(0, 0, 0, 0);
    
    if (scheduleDate < today) {
      return <Badge bg="warning">Past Due</Badge>;
    }
    return <Badge bg="primary">Scheduled</Badge>;
  } else {
    return <Badge bg="primary">Scheduled</Badge>;
  }
};

  const getTypeBadge = (type) => {
  const badges = {
    vaccination: <Badge bg="warning" style={{ fontSize: '0.85rem' }}><i className="fas fa-syringe me-1"></i>Vaccination</Badge>,
    seminar: <Badge bg="info" style={{ fontSize: '0.85rem' }}><i className="fas fa-chalkboard-teacher me-1"></i>Seminar</Badge>,
    sterilization: <Badge bg="success" style={{ fontSize: '0.85rem' }}><i className="fas fa-cut me-1"></i>Sterilization</Badge>,
    other: <Badge bg="dark" style={{ fontSize: '0.85rem' }}><i className="fas fa-calendar me-1"></i>Other</Badge> // Add this line
  };
  return badges[type] || <Badge bg="secondary">{type}</Badge>;
};

 const filteredSchedules = schedules.filter(schedule => {
  const matchesType = filterType === 'all' || schedule.type === filterType;
  const matchesBarangay = filterBarangay === 'all' || schedule.barangay_id === parseInt(filterBarangay);
  const matchesSearch = 
    schedule.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.barangay_name?.toLowerCase().includes(searchTerm.toLowerCase());
  
  // Status filtering
  let matchesStatus = true;
  
  if (filterStatus === 'upcoming') {
    // Upcoming: only scheduled status (not started yet)
    matchesStatus = schedule.status === 'scheduled';
  } else if (filterStatus === 'ongoing') {
    matchesStatus = schedule.status === 'ongoing';
  } else if (filterStatus === 'completed') {
    matchesStatus = schedule.status === 'completed';
  }
  // 'all' shows everything (matchesStatus stays true)
  
  return matchesType && matchesBarangay && matchesSearch && matchesStatus;
});

  // Use filteredSchedules directly - it already handles all filtering including status
const displaySchedules = filteredSchedules;

// Pagination calculations
const totalPages = Math.ceil(displaySchedules.length / itemsPerPage);
const startIdx = (currentPage - 1) * itemsPerPage;
const endIdx = startIdx + itemsPerPage;
const paginatedSchedules = displaySchedules.slice(startIdx, endIdx);
const emptyRows = itemsPerPage - paginatedSchedules.length;

  const filteredVaccinationTypes = vaccinationTypes.filter(vt => {
  const matchesSpecies = filterVaccineSpecies === 'all' || vt.species === filterVaccineSpecies || vt.species === 'all';
  if (!matchesSpecies) return false;
  // Only show vaccine types that have been added to inventory
  const item = inventory.find(
    i => i.item_type === 'vaccination' && parseInt(i.item_type_id) === parseInt(vt.id)
  );
  if (!item) return false;
  return true;
});


  const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  console.log('🔍 Getting vaccine details for schedule:', schedule);
  console.log('📊 Current vaccine registration counts:', vaccineRegistrationCounts);
  
  if (!schedule.vaccine_shot_limits) return [];
  
  try {
    const limits = typeof schedule.vaccine_shot_limits === 'string' 
      ? JSON.parse(schedule.vaccine_shot_limits) 
      : schedule.vaccine_shot_limits;
    
    console.log('💉 Vaccine shot limits:', limits);
    
    const details = Object.entries(limits).map(([vaccineId, limit]) => {
      const vaccine = vaccinationTypes.find(vt => vt.id === parseInt(vaccineId));
      const registered = vaccineRegistrationCounts[vaccineId] || 0;
      
      console.log(`  - Vaccine ID ${vaccineId}: ${registered} / ${limit} (${vaccine?.name})`);
      
      return {
        id: vaccineId,
        name: vaccine?.name || 'Unknown',
        species: vaccine?.species || 'unknown',
        limit: parseInt(limit || 0),
        registered: registered
      };
    });
    
    console.log('✅ Final vaccine details:', details);
    return details;
  } catch (e) {
    console.error('❌ Error in getVaccineDetails:', e);
    return [];
  }
};
 

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75' }}>
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div>
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i 
                  className="fas fa-calendar-alt" 
                  style={{ 
                    fontSize: '1.5rem', 
                    color: '#000000',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                ></i><h2 className="sched-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Event Management</h2>
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
      <Row className="mb-4 sched-stat-row" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px' }}>
        {[
          {
            label: 'Vaccination',
            count: schedules.filter(s => s.type === 'vaccination').length,
            img: '/vaccine.png',
            accent: '#ffc107',
            accentAlpha: 'rgba(255,193,7,0.12)',
            fallbackIcon: 'fa-syringe',
            delay: '0.1s'
          },
          
          {
            label: 'Seminar',
            count: schedules.filter(s => s.type === 'seminar').length,
            img: '/seminar.png',
            accent: '#6f42c1',
            accentAlpha: 'rgba(111,66,193,0.12)',
            fallbackIcon: 'fa-chalkboard-teacher',
            delay: '0.3s'
          },
          {
            label: 'Sterilization',
            count: schedules.filter(s => s.type === 'sterilization').length,
            img: '/sterilization.png',
            accent: '#28a745',
            accentAlpha: 'rgba(40,167,69,0.12)',
            fallbackIcon: 'fa-cut',
            delay: '0.4s'
          },
          {
            label: 'Microchip',
            count: schedules.filter(s => s.type === 'microchip').length,
            img: '/microchip.png',
            accent: '#6c757d',
            accentAlpha: 'rgba(108,117,125,0.12)',
            fallbackIcon: 'fa-microchip',
            delay: '0.5s'
          }
        ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, delay }) => (
          <div key={label} className="sched-stat-col" style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0, animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
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
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 6px 20px ${accentAlpha}`;
                e.currentTarget.style.borderColor = accent;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#f0f0f0';
              }}
            >
              <div style={{ height: '3px', background: accent, borderRadius: '14px 14px 0 0' }} />
              <Card.Body className="sched-stat-card-body" style={{ padding: '1.5rem', background: 'transparent' }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <p style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#999999',
                      marginBottom: '0.5rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {label}
                    </p>
                    <h2 className="sched-stat-number" style={{
                      fontSize: '2.75rem',
                      fontWeight: '700',
                      color: '#111111',
                      lineHeight: 1,
                      marginBottom: '0.75rem'
                    }}>
                      {count}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                      <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>
                        events
                      </span>
                    </div>
                  </div>
                  <div className="sched-stat-icon" style={{
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
      <Row className="mb-4 sched-filters-row" style={{ animation: 'dropDown 0.4s ease-out 0.5s backwards' }}>
        <Col md={3}>
          <InputGroup style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <InputGroup.Text style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRight: 'none' }}>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: '2px solid #e9ecef',
                borderLeft: 'none',
                borderRight: searchTerm ? 'none' : '2px solid #e9ecef'
              }}
            />
            {searchTerm && (
              <Button 
                variant="outline-secondary" 
                onClick={() => setSearchTerm('')}
                style={{ border: '2px solid #e9ecef', borderLeft: 'none' }}
              >
                <i className="fas fa-times"></i>
              </Button>
            )}
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select
  value={filterType}
  onChange={(e) => setFilterType(e.target.value)}
  style={{
    borderRadius: '12px',
    border: '2px solid #e9ecef',
    fontWeight: '500'
  }}
>
  <option value="all">All Events</option>
  <option value="vaccination">Vaccination Only</option>
  <option value="seminar">Seminar Only</option>
  <option value="sterilization">Sterilization Only</option>
  <option value="other">Other Only</option>
  <option value="microchip">Microchip Only</option>
</Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={filterBarangay}
            onChange={(e) => setFilterBarangay(e.target.value)}
            style={{
              borderRadius: '12px',
              border: '2px solid #e9ecef',
              fontWeight: '500'
            }}
          >
            <option value="all">All Barangays</option>
            {barangays.map(barangay => (
              <option key={barangay.id} value={barangay.id}>
                {barangay.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              borderRadius: '12px',
              border: '2px solid #e9ecef',
              fontWeight: '500'
            }}
          >
            <option value="upcoming">Upcoming</option>
            <option value="all">All Status</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Schedules Table */}
      <Row style={{ animation: 'dropDown 0.4s ease-out 0.6s backwards' }}>
        <Col>
          <Card 
  className="border-0"
  style={{
    borderRadius: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'visible'
  }}
>
            <Card.Header
              className="sched-card-header"
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #ffc107',
                padding: '1.5rem',
                borderRadius: '20px 20px 0 0'
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                  <i className="fas fa-calendar-check me-2" style={{ color: '#ffc107' }}></i>
                  {filterStatus === 'all' ? 'All Schedules' : 
                   filterStatus === 'upcoming' ? 'Upcoming Events' : 
                   filterStatus === 'ongoing' ? 'Ongoing Schedules' : 
                   'Completed Schedules'} ({displaySchedules.length})
                </h5>
                <Button 
  onClick={() => handleOpenModal('create')}
  className="border-0"
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
  <i className="fas fa-plus me-2"></i>
  Add Event
</Button>
              </div>
            </Card.Header>
<Card.Body className="sched-card-body" style={{ padding: '2rem' }}>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading schedules...</p>
                </div>
              ) : displaySchedules.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                  <h5 style={{ color: '#666666', fontWeight: '600' }}>No Schedules Found</h5>
                  <p className="text-muted">
                    {searchTerm || filterType !== 'all' || filterBarangay !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Start by adding events for barangays'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive" style={{ overflow: 'visible' }}>
<Table hover className="sched-table" style={{ marginBottom: 0 }}>
                    <thead style={{ background: '#f8f9fa' }}>
                      <tr>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '10%' }}>Type</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '20%' }}>Event Details</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '12%' }}>Barangay</th>
                        <th className="mobile-hide-datetime" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Date & Time</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '15%' }}>Venue</th>
                        <th className="mobile-hide" style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '10%' }}>Capacity</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '10%' }}>Status</th>
                        <th style={{ fontWeight: '600', color: '#333', padding: '1rem', textAlign: 'center', width: '8%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
  {paginatedSchedules.map(schedule => (
                        <tr 
                          key={`${schedule.type}-${schedule.id}`}
                          style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <span style={{ fontWeight: '500', color: '#555' }}>
    {schedule.type === 'vaccination' && <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</>}
    {schedule.type === 'seminar' && <><i className="fas fa-chalkboard-teacher me-1" style={{ color: '#6f42c1' }}></i>Seminar</>}
    {schedule.type === 'sterilization' && <><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</>}
    {schedule.type === 'other' && (
      <>
        <i className="fas fa-calendar me-1" style={{ color: '#343a40' }}></i>
        {schedule.other_event_type || 'Other'}
      </>
    )}
    {schedule.type === 'microchip' && (
      <><i className="fas fa-microchip me-1" style={{ color: '#6c757d' }}></i>Microchip</>
    )}
  </span>
</td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '0.95rem', color: '#333' }}>{schedule.title}</strong>
                              {schedule.description && (
                                <>
                                  <br />
                                  <small className="text-muted">{schedule.description.substring(0, 60)}...</small>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ fontWeight: '500', color: '#555' }}>{getBarangayName(schedule.barangay_id)}</span>
                          </td>
                          <td className="mobile-hide-datetime" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <div>
    <strong style={{ color: '#333' }}>{new Date(schedule.scheduled_date).toLocaleDateString()}</strong>
    <br />
    <small className="text-muted">{schedule.start_time} - {schedule.end_time}</small>
  </div>
</td>
                          <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <small style={{ fontWeight: '500', color: '#555' }}>{schedule.venue}</small>
                          </td>
                          <td className="mobile-hide" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  {schedule.type === 'vaccination' ? (
    <div>
      <strong style={{ color: '#333' }}>{schedule.current_registrations || 0}</strong>
      <small className="text-muted">/{getTotalVaccineShots(schedule)}</small>
      <br />
      <small className="text-muted" style={{ fontSize: '0.7rem' }}>slots</small>
    </div>
  ) : schedule.max_capacity ? (
                              <div>
                                <strong style={{ color: '#333' }}>{schedule.current_registrations || 0}</strong>
                                <small className="text-muted">/{schedule.max_capacity}</small>
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            {schedule.status === 'cancelled' && (
                              <span style={{ fontWeight: '600', color: '#dc3545' }}>Cancelled</span>
                            )}
                            {schedule.status === 'completed' && (
                              <span style={{ fontWeight: '600', color: '#6c757d' }}>Completed</span>
                            )}
                            {schedule.status === 'ongoing' && (
                              <span style={{ fontWeight: '600', color: '#28a745' }}>Ongoing</span>
                            )}
                            {schedule.status === 'scheduled' && (() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const scheduleDate = new Date(schedule.scheduled_date);
                              scheduleDate.setHours(0, 0, 0, 0);
                              
                              if (scheduleDate < today) {
                                return <span style={{ fontWeight: '600', color: '#ffc107' }}>Past Due</span>;
                              }
                              return <span style={{ fontWeight: '600', color: '#007bff' }}>Upcoming</span>;
                            })()}
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
  <button
    ref={showDropdown === schedule.id ? dropdownButtonRef : null}
    onClick={(e) => {
      if (showDropdown === schedule.id) { setShowDropdown(null); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      dropdownButtonRef.current = e.currentTarget;
      setDropdownPos({ top: rect.top / ZOOM + (rect.height / ZOOM) / 2, left: (rect.left / ZOOM) - 185 });
      setShowDropdown(schedule.id);
    }}
    style={{ background: 'transparent', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
    onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
  >
    <img src="/ellipsis.png" alt="Menu" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </button>
</td>
                        </tr>
                      ))}
                      {/* Empty rows to maintain fixed height */}
                      {Array.from({ length: emptyRows }).map((_, index) => (
  <tr key={`empty-${index}`} style={{ height: '73px', pointerEvents: 'none', background: 'transparent' }}>
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

      {/* Pagination */}
      {displaySchedules.length > itemsPerPage && (
        <Row className="mt-4 sched-pagination" style={{ animation: 'dropDown 0.4s ease-out 0.7s backwards' }}>
          <Col className="d-flex justify-content-between align-items-center">
            <span className="page-info" style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
              Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{totalPages}</strong>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                onMouseOver={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#ffc107';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#dee2e6';
                  }
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>

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
                      <span
                        key={`ellipsis-${idx}`}
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: '#6c757d',
                          fontWeight: '600'
                        }}
                      >
                        ...
                      </span>
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
                      onMouseOver={(e) => {
                        if (currentPage !== page) {
                          e.target.style.background = '#f8f9fa';
                          e.target.style.borderColor = '#ffc107';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== page) {
                          e.target.style.background = '#ffffff';
                          e.target.style.borderColor = '#dee2e6';
                        }
                      }}
                    >
                      {page}
                    </button>
                  );
                });
              })()}

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
                onMouseOver={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#ffc107';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#dee2e6';
                  }
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </Col>
        </Row>
      )}

      {/* View Schedule Modal */}
      <Modal show={showViewModal} onHide={handleCloseViewModal} size="lg" className="sched-view-modal" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-eye me-2"></i>
            Schedule Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedSchedule && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <div className="mb-3">
                    <strong className="d-block mb-1" style={{ fontSize: '0.9rem', color: '#666' }}>Type</strong>
                    <span style={{ fontWeight: '500', color: '#555' }}>
  {selectedSchedule.type === 'vaccination' && <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</>}
  {selectedSchedule.type === 'seminar' && <><i className="fas fa-chalkboard-teacher me-1" style={{ color: '#6f42c1' }}></i>Seminar</>}
  {selectedSchedule.type === 'sterilization' && <><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</>}
  {selectedSchedule.type === 'microchip' && (
    <><i className="fas fa-microchip me-1" style={{ color: '#6c757d' }}></i>Microchip</>
  )}
  {selectedSchedule.type === 'other' && (
    <>
      <i className="fas fa-calendar me-1" style={{ color: '#343a40' }}></i>
      {selectedSchedule.other_event_type || 'Other'}
    </>
  )}
</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong className="d-block mb-1" style={{ fontSize: '0.9rem', color: '#666' }}>Status</strong>
                    {selectedSchedule.status === 'cancelled' && (
                      <span style={{ fontWeight: '600', color: '#dc3545' }}>Cancelled</span>
                    )}
                    {selectedSchedule.status === 'completed' && (
                      <span style={{ fontWeight: '600', color: '#6c757d' }}>Completed</span>
                    )}
                    {selectedSchedule.status === 'ongoing' && (
                      <span style={{ fontWeight: '600', color: '#28a745' }}>Ongoing</span>
                    )}
                    {selectedSchedule.status === 'scheduled' && (() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const scheduleDate = new Date(selectedSchedule.scheduled_date);
                      scheduleDate.setHours(0, 0, 0, 0);
                      
                      if (scheduleDate < today) {
                        return <span style={{ fontWeight: '600', color: '#ffc107' }}>Past Due</span>;
                      }
                      return <span style={{ fontWeight: '600', color: '#007bff' }}>Upcoming</span>;
                    })()}
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Title</strong>
                  <p className="mb-0">{selectedSchedule.title}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Description</strong>
                  <p className="mb-0">{selectedSchedule.description || 'No description provided'}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Date</strong>
                  <p className="mb-0">{new Date(selectedSchedule.scheduled_date).toLocaleDateString()}</p>
                </Col>
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Time</strong>
                  <p className="mb-0">{selectedSchedule.start_time} - {selectedSchedule.end_time}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Barangay</strong>
                  <p className="mb-0">{getBarangayName(selectedSchedule.barangay_id)}</p>
                </Col>
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>Venue</strong>
                  <p className="mb-0">{selectedSchedule.venue}</p>
                </Col>
              </Row>
              
              {/* Vaccination specific details */}
              {selectedSchedule.type === 'vaccination' && (
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
      {loadingVaccineCounts ? (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" variant="primary" />
          <p className="text-muted mt-2 mb-0">Loading vaccine registration counts...</p>
        </div>
      ) : (
        getVaccineDetails(selectedSchedule).map((vaccine, idx) => (
          <div key={idx} style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '6px', marginBottom: idx !== getVaccineDetails(selectedSchedule).length - 1 ? '0.75rem' : '0', border: '1px solid #e0e0e0' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>{vaccine.name}</strong>
                <span className="ms-2" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#6c757d', color: '#fff', borderRadius: '4px' }}>
                  {vaccine.species.toUpperCase()}
                </span>
              </div>
              <div className="text-end">
                <strong>{vaccine.registered}</strong>
                <small className="text-muted"> / {vaccine.limit} shots</small>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </Col>
</Row>
                </>
              )}

              {/* Microchip specific details */}
              {selectedSchedule.type === 'microchip' && (
                <>
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong style={{ fontSize: '0.9rem', color: '#666' }}>Capacity</strong>
                      <p className="mb-0">
                        <strong>{selectedSchedule.current_registrations || 0}</strong> / {selectedSchedule.max_capacity} pets
                      </p>
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong style={{ fontSize: '0.9rem', color: '#666' }}>Allowed Pet Types</strong>
                      <div className="d-flex gap-2 mt-2">
                        {selectedSchedule.pet_types_allowed && selectedSchedule.pet_types_allowed.length > 0 ? (
                          selectedSchedule.pet_types_allowed.map(type => (
                            <span key={type} style={{ fontSize: '0.85rem', textTransform: 'capitalize', padding: '0.4rem 0.8rem', background: '#6c757d', color: '#fff', borderRadius: '4px' }}>
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">All pet types</span>
                        )}
                      </div>
                    </Col>
                  </Row>
                </>
              )}
              
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={handleCloseViewModal} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Schedule Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            {modalMode === 'edit' ? (
              <>
                <i className="fas fa-edit me-2"></i>
                Edit {getScheduleTypeLabel(formData.schedule_type)} Schedule
              </>
            ) : (
              <>
                <i className="fas fa-plus me-2"></i>
                Add New Event
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <Alert variant="danger" className="mb-3">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </Alert>
            )}

            {/* Event Type Selection - Only show in create mode */}
{modalMode === 'create' && (
  <Row className="mb-4">
    <Col md={12}>
      <Form.Group>
        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
          Event Type <span style={{ color: '#dc3545' }}>*</span>
        </Form.Label>
        
        <div 
          style={{ 
            display: 'flex',
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
            scrollbarWidth: 'thin',
            scrollbarColor: '#dee2e6 #f8f9fa'
          }}
          className="event-type-scroll"
        >
          <div 
            onClick={() => setFormData({...formData, schedule_type: 'vaccination', barangay_id: ''})}
            style={{ 
              minWidth: '200px',
              flex: '0 0 auto',
              padding: '1.5rem', 
              border: formData.schedule_type === 'vaccination' ? '3px solid #ffc107' : '2px solid #dee2e6', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              background: formData.schedule_type === 'vaccination' ? '#fff9e6' : '#ffffff', 
              transition: 'all 0.3s' 
            }}
          >
            <img 
              src="/vaccine.png" 
              alt="Vaccination"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <i className="fas fa-syringe" style={{ fontSize: '2.5rem', color: '#ffc107', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Vaccination</div>
          </div>
          
          <div 
            onClick={() => setFormData({...formData, schedule_type: 'seminar', barangay_id: ''})}
            style={{ 
              minWidth: '200px',
              flex: '0 0 auto',
              padding: '1.5rem', 
              border: formData.schedule_type === 'seminar' ? '3px solid #6f42c1' : '2px solid #dee2e6', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              background: formData.schedule_type === 'seminar' ? '#f5f0ff' : '#ffffff', 
              transition: 'all 0.3s' 
            }}
          >
            <img 
              src="/seminar.png" 
              alt="Seminar"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <i className="fas fa-chalkboard-teacher" style={{ fontSize: '2.5rem', color: '#6f42c1', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Seminar</div>
          </div>
          
          <div 
            onClick={() => setFormData({...formData, schedule_type: 'sterilization', barangay_id: ''})}
            style={{ 
              minWidth: '200px',
              flex: '0 0 auto',
              padding: '1.5rem', 
              border: formData.schedule_type === 'sterilization' ? '3px solid #28a745' : '2px solid #dee2e6', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              background: formData.schedule_type === 'sterilization' ? '#e6f9e9' : '#ffffff', 
              transition: 'all 0.3s' 
            }}
          >
            <img 
              src="/sterilization.png" 
              alt="Sterilization"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <i className="fas fa-cut" style={{ fontSize: '2.5rem', color: '#28a745', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Sterilization</div>
          </div>
          <div
            onClick={() => {
              setFormData({...formData, schedule_type: 'microchip', barangay_id: ''});
              // Load microchip batch availability
              const microchipInvItem = inventory.find(i => i.item_type === 'microchip');
              if (microchipInvItem) loadBatchAvailability(microchipInvItem.id, selectedSchedule?.id || null);
            }}
            style={{
              minWidth: '200px', flex: '0 0 auto', padding: '1.5rem',
              border: formData.schedule_type === 'microchip' ? '3px solid #6c757d' : '2px solid #dee2e6',
              borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
              background: formData.schedule_type === 'microchip' ? '#f0f0f0' : '#ffffff',
              transition: 'all 0.3s'
            }}
          >
            <img src="/microchip.png" alt="Microchip"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <i className="fas fa-microchip" style={{ fontSize: '2.5rem', color: '#6c757d', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Microchip</div>
          </div>
          <div 
            onClick={() => setFormData({...formData, schedule_type: 'other', barangay_id: ''})}
            style={{ 
              minWidth: '200px',
              flex: '0 0 auto',
              padding: '1.5rem', 
              border: formData.schedule_type === 'other' ? '3px solid #343a40' : '2px solid #dee2e6', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              background: formData.schedule_type === 'other' ? '#e9ecef' : '#ffffff', 
              transition: 'all 0.3s' 
            }}
          >
            <img 
              src="/other.png" 
              alt="Other"
              style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <i className="fas fa-calendar" style={{ fontSize: '2.5rem', color: '#343a40', marginBottom: '0.5rem', display: 'none' }}></i>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Other</div>
          </div>
        </div>
        
        <style>{`
          .event-type-scroll::-webkit-scrollbar {
            height: 8px;
          }
          .event-type-scroll::-webkit-scrollbar-track {
            background: #f8f9fa;
            border-radius: 10px;
          }
          .event-type-scroll::-webkit-scrollbar-thumb {
            background: #dee2e6;
            border-radius: 10px;
          }
          .event-type-scroll::-webkit-scrollbar-thumb:hover {
            background: #adb5bd;
          }
          @media (max-width: 768px) {
            .event-type-scroll > div {
              min-width: 110px !important;
              padding: 0.75rem 0.5rem !important;
            }
            .event-type-scroll > div img {
              width: 32px !important;
              height: 32px !important;
            }
            .event-type-scroll > div .fas {
              font-size: 1.8rem !important;
            }
            .event-type-scroll > div div {
              font-size: 0.8rem !important;
            }
          }
        `}</style>
      </Form.Group>
    </Col>
  </Row>
)}

            {/* Show form fields only if event type is selected (or in edit mode) */}
{(formData.schedule_type || modalMode === 'edit') && (
  <>
    <Row>
      <Col md={12}>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
            Barangay <span style={{ color: '#dc3545' }}>*</span>
          </Form.Label>
<Form.Select name="barangay_id" value={formData.barangay_id} onChange={handleChange} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>            
  <option value="" disabled>Select barangay</option>
            {barangays.map(barangay => (
              <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>
    </Row>

    {/* Type of Event field for "other" schedule type */}
    {formData.schedule_type === 'other' && (
      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Type of Event <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="other_event_type"
              value={formData.other_event_type}
              onChange={handleChange}
              placeholder="e.g., Pet Adoption Drive, Pet Grooming Workshop, etc."
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
    )}

    <Row>
      <Col md={12}>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
            Event Title <span style={{ color: '#dc3545' }}>*</span>
          </Form.Label>
          <Form.Control type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Enter event title..." required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
        </Form.Group>
      </Col>
    </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Description</Form.Label>
                      <Form.Control 
  as="textarea" 
  rows={3} 
  name="description" 
  value={formData.description} 
  onChange={handleChange} 
  placeholder="Brief description of the event..." 
  maxLength={50}
  style={{ 
    borderRadius: '8px', 
    padding: '0.75rem', 
    border: '2px solid #dee2e6',
    resize: 'none'
  }} 
/>
<Form.Text className="text-muted">
  {formData.description.length}/50 characters
</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                        Date <span style={{ color: '#dc3545' }}>*</span>
                      </Form.Label>
                      <Form.Control type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleChange} min={getTomorrowDate()} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                        Start Time <span style={{ color: '#dc3545' }}>*</span>
                      </Form.Label>
                      <Form.Select name="start_time" value={formData.start_time} onChange={handleChange} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
                        <option value="">Select start time</option>
                        {Array.from({ length: 18 }, (_, i) => {
                          const totalMins = 8 * 60 + i * 30;
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          const label = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                          return <option key={value} value={value}>{label}</option>;
                        })}
                      </Form.Select>
                      <Form.Text className="text-muted">8:00 AM – 5:00 PM only</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                        End Time <span style={{ color: '#dc3545' }}>*</span>
                      </Form.Label>
                      <Form.Select name="end_time" value={formData.end_time} onChange={handleChange} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
                        <option value="">Select end time</option>
                        {Array.from({ length: 19 }, (_, i) => {
                          const totalMins = 8 * 60 + (i + 1) * 30;
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          const label = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                          const [startH, startM] = (formData.start_time || '00:00').split(':').map(Number);
                          const startTotal = startH * 60 + startM;
                          if (totalMins <= startTotal + 30) return null;
                          return <option key={value} value={value}>{label}</option>;
                        }).filter(Boolean)}
                      </Form.Select>
                      <Form.Text className="text-muted">Min. 30 mins after start</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                                    <Col md={(formData.schedule_type === 'vaccination' || formData.schedule_type === 'microchip') ? 12 : 8}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                        Venue <span style={{ color: '#dc3545' }}>*</span>
                      </Form.Label>
                      <Form.Control type="text" name="venue" value={formData.venue} onChange={handleChange} placeholder="e.g., Barangay Hall" required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }} />
                    </Form.Group>
                  </Col>
                  {formData.schedule_type !== 'vaccination' && formData.schedule_type !== 'microchip' && (
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Max Capacity <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="max_capacity"
                          value={formData.max_capacity}
                          onChange={handleChange}
                          placeholder="Required"
                          min="1"
                          required
                          style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}
                        />
                      </Form.Group>
                    </Col>
                  )}
                </Row>

                {modalMode === 'edit' && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Status <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <Form.Select name="status" value={formData.status} onChange={handleChange} required style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #dee2e6' }}>
                          <option value="scheduled">Scheduled</option>
                          <option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Vaccination Pet Types Filter */}
                {formData.schedule_type === 'vaccination' && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>Filter Vaccines by Pet Type</Form.Label>
                        <Form.Select value={filterVaccineSpecies} onChange={(e) => setFilterVaccineSpecies(e.target.value)} style={{borderRadius: '8px',
                            padding: '0.75rem',
                            border: '2px solid #dee2e6',
                            fontWeight: '500'
                          }}
                        >
                          <option value="all">All (Dog, Cat, Rabbit)</option>
                          <option value="dog">Dog</option>
                          <option value="cat">Cat</option>
                          </Form.Select>
        <Form.Text className="text-muted d-block mt-2">
          <i className="fas fa-info-circle me-1"></i>
          This filters which vaccines are shown below
        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Vaccination Vaccines */}
                {formData.schedule_type === 'vaccination' && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Available Vaccines & Shot Limits <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <div 
                          style={{
                            border: '2px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '1rem',
                            background: '#f8f9fa',
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}
                        >
                          {filteredVaccinationTypes.length === 0 ? (
                            <p className="text-muted mb-0">No vaccination types available</p>
                          ) : (
                            filteredVaccinationTypes.map(type => {
                            const invItem = getInventoryItemForVaccine(type.id);
                            const stock = invItem ? parseInt(invItem.current_stock) : null;
                            const isChecked = formData.vaccination_types[type.id] !== undefined;
                            const batches = invItem ? (batchAllocations[invItem.id] || []) : [];
                            const totalAllocated = batches.reduce((sum, b) => sum + (scheduleAllocations[b.id] || 0), 0);

                            return (
                              <div
                                key={type.id}
                                style={{
                                  marginBottom: '1rem',
                                  padding: '1rem',
                                  background: '#ffffff',
                                  borderRadius: '8px',
                                  border: isChecked ? '2px solid #ffc107' : '1px solid #dee2e6'
                                }}
                              >
                                <div className="d-flex align-items-start gap-3">
                                  <Form.Check
                                    type="checkbox"
                                    id={`vac-type-${type.id}`}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handleVaccinationTypeToggle(type.id, '');
                                      } else {
                                        handleVaccinationTypeToggle(type.id);
                                      }
                                    }}
                                    style={{ marginTop: '0.25rem' }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <label htmlFor={`vac-type-${type.id}`} style={{ cursor: 'pointer', marginBottom: '0.5rem', display: 'block' }}>
                                      <strong>{type.name}</strong>
                                      <span className="ms-2" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#6c757d', color: '#fff', borderRadius: '4px' }}>
                                        {type.species.toUpperCase()}
                                      </span>
                                      {stock !== null && (
                                        <span className="ms-2" style={{
                                          fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px',
                                          background: stock === 0 ? '#dc3545' : stock <= 10 ? '#ffc107' : '#28a745',
                                          color: stock <= 10 && stock > 0 ? '#000' : '#fff'
                                        }}>
                                          {stock === 0 ? '⚠️ Out of Stock' : `📦 ${stock} total in stock`}
                                        </span>
                                      )}
                                      {type.description && (
                                        <small className="text-muted d-block mt-1">{type.description}</small>
                                      )}
                                    </label>

                                    {/* Batch selection — shown when vaccine is checked */}
                                    {isChecked && (
                                      <div style={{ marginTop: '0.75rem' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#555', marginBottom: '0.5rem' }}>
                                          <i className="fas fa-layer-group me-1" style={{ color: '#0d6efd' }} />
                                          Select Batches &amp; Quantities
                                          {totalAllocated > 0 && (
                                            <span className="ms-2" style={{ color: '#28a745', fontWeight: '700' }}>
                                              — {totalAllocated} shots allocated
                                            </span>
                                          )}
                                        </div>

                                        {loadingBatchAvailability && batches.length === 0 ? (
                                          <div style={{ fontSize: '0.8rem', color: '#aaa', padding: '0.5rem' }}>
                                            <i className="fas fa-spinner fa-spin me-1" /> Loading batches...
                                          </div>
                                        ) : batches.length === 0 ? (
                                          <div style={{ fontSize: '0.8rem', color: '#dc3545', padding: '0.5rem', background: '#fff5f5', borderRadius: '6px' }}>
                                            <i className="fas fa-exclamation-triangle me-1" /> No batches available for this vaccine.
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {batches.map(batch => {
                                              const isBatchSelected = scheduleAllocations[batch.id] !== undefined;
                                              const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
if (isExpired) return null;
const availableQty = batch.available_qty;

return (
  <div
    key={batch.id}
    style={{
      padding: '0.6rem 0.75rem',
      borderRadius: '6px',
      border: isBatchSelected ? '2px solid #0d6efd' : '1px solid #dee2e6',
      background: isBatchSelected ? 'rgba(13,110,253,0.04)' : '#fafafa',
      opacity: availableQty === 0 && !isBatchSelected ? 0.5 : 1,
    }}
  >
                                                  <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                                                    <Form.Check
                                                      type="checkbox"
                                                      id={`batch-${batch.id}-vac-${type.id}`}
                                                      checked={isBatchSelected}
                                                      disabled={availableQty === 0 && !isBatchSelected}
                                                      onChange={() => handleBatchToggle(batch.id, type.id)}
                                                    />
                                                    <label htmlFor={`batch-${batch.id}-vac-${type.id}`} style={{ cursor: 'pointer', flex: 1, marginBottom: 0 }}>
                                                      <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                                      {/* expired batches are filtered server-side */}
                                                      <span className="ms-2" style={{ fontSize: '0.75rem', color: availableQty === 0 ? '#dc3545' : availableQty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>
                                                        {availableQty} available
                                                      </span>
                                                      {batch.expiration_date && !isExpired && (
                                                        <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>
                                                          · exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                      )}
                                                    </label>

                                                    {isBatchSelected && (
                                                      <div className="d-flex align-items-center gap-1">
                                                        <Form.Control
                                                          type="number"
                                                          min="1"
                                                          max={availableQty}
                                                          value={scheduleAllocations[batch.id] || ''}
                                                          onChange={(e) => handleBatchAllocationChange(batch.id, e.target.value, type.id)}
                                                          placeholder={`Max ${availableQty}`}
                                                          style={{ width: '90px', padding: '0.25rem 0.4rem', fontSize: '0.82rem', borderRadius: '5px', border: '2px solid #0d6efd' }}
                                                        />
                                                        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>shots</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                          )}
                        </div>
                        <Form.Text className="text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Check vaccines and enter available shot quantities
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Seminar Fields */}
                {formData.schedule_type === 'seminar' && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Speaker/Resource Person
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="speaker"
                          value={formData.speaker}
                          onChange={handleChange}
                          placeholder="e.g., Dr. Juan Dela Cruz, DVM"
                          style={{
                            borderRadius: '8px',
                            padding: '0.75rem',
                            border: '2px solid #dee2e6'
                          }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Sterilization Fields */}
                {formData.schedule_type === 'sterilization' && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Available for Pet Types <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <div 
                          style={{
                            border: '2px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '1rem',
                            background: '#f8f9fa'
                          }}
                        >
                          <Form.Check
                            type="checkbox"
                            id="sterilization-dog"
                            label={
                              <span>
                                <strong>Dog</strong>
                                <small className="text-muted d-block">
                                  Spay/Neuter services for dogs
                                </small>
                              </span>
                            }
                            checked={formData.sterilization_species.includes('dog')}
                            onChange={() =>handleSterilizationSpeciesToggle('dog')}
                            className="mb-2"
                          />
                          <Form.Check
                            type="checkbox"
                            id="sterilization-cat"
                            label={
                              <span>
                                <strong>Cat</strong>
                                <small className="text-muted d-block">
                                  Spay/Neuter services for cats
                                </small>
                              </span>
                            }
                            checked={formData.sterilization_species.includes('cat')}
                            onChange={() => handleSterilizationSpeciesToggle('cat')}
                            className="mb-2"
                          />
                          
                        </div>
                        <Form.Text className="text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Select all pet types that can avail sterilization
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
                {/* Microchip Fields */}
                {formData.schedule_type === 'microchip' && (
                  <Row>
                    <Col md={12}>
                      {/* Pet Types */}
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Available for Pet Types <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        <div style={{ border: '2px solid #dee2e6', borderRadius: '8px', padding: '1rem', background: '#f8f9fa' }}>
                          {['dog', 'cat'].map(species => (
                            <Form.Check
                              key={species}
                              type="checkbox"
                              id={`microchip-${species}`}
                              className="mb-2"
                              label={
                                <span>
                                  <strong style={{ textTransform: 'capitalize' }}>{species}</strong>
                                  <small className="text-muted d-block">Microchipping for {species}s</small>
                                </span>
                              }
                              checked={formData.pet_types_allowed.includes(species)}
                              onChange={() => handlePetTypesToggle(species)}
                            />
                          ))}
                        </div>
                      </Form.Group>

                      {/* Batch Selection */}
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                          Select Batch & Quantity <span style={{ color: '#dc3545' }}>*</span>
                        </Form.Label>
                        {(() => {
                          const microchipItem = getMicrochipInventoryItem();
                          if (!microchipItem) return (
                            <div style={{ fontSize: '0.85rem', color: '#dc3545', padding: '0.75rem', background: '#fff5f5', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
                              <i className="fas fa-exclamation-triangle me-1" /> No microchip inventory found.
                            </div>
                          );
                          const batches = batchAllocations[microchipItem.id] || [];
                          const totalMicrochipAllocated = batches.reduce((sum, b) => sum + (scheduleAllocations[b.id] || 0), 0);
                          return (
                            <div style={{ border: '2px solid #dee2e6', borderRadius: '8px', padding: '1rem', background: '#f8f9fa' }}>
                              <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.6rem', fontWeight: '600' }}>
                                <i className="fas fa-layer-group me-1" style={{ color: '#6c757d' }} />
                                Available Batches
                                {totalMicrochipAllocated > 0 && (
                                  <span className="ms-2" style={{ color: '#28a745' }}>— {totalMicrochipAllocated} units allocated</span>
                                )}
                              </div>
                              {loadingBatchAvailability && batches.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                  <i className="fas fa-spinner fa-spin me-1" /> Loading batches...
                                </div>
                              ) : batches.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: '#dc3545', padding: '0.5rem', background: '#fff5f5', borderRadius: '6px' }}>
                                  <i className="fas fa-exclamation-triangle me-1" /> No batches available for microchips.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {batches.map(batch => {
                                    const isBatchSelected = scheduleAllocations[batch.id] !== undefined;
                                    const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
if (isExpired) return null;
const availableQty = batch.available_qty;
return (
  <div
    key={batch.id}
    style={{
      padding: '0.6rem 0.75rem',
      borderRadius: '6px',
      border: isBatchSelected ? '2px solid #6c757d' : '1px solid #dee2e6',
      background: isBatchSelected ? 'rgba(108,117,125,0.06)' : '#fafafa',
      opacity: availableQty === 0 && !isBatchSelected ? 0.5 : 1,
    }}
  >
                                        <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                                          <Form.Check
                                            type="checkbox"
                                            id={`microchip-batch-${batch.id}`}
                                            checked={isBatchSelected}
                                            disabled={availableQty === 0 && !isBatchSelected}
                                            onChange={() => {
                                              setScheduleAllocations(prev => {
                                                const next = { ...prev };
                                                if (next[batch.id] !== undefined) {
                                                  delete next[batch.id];
                                                } else {
                                                  next[batch.id] = 0;
                                                }
                                                // Update max_capacity to total allocated
                                                const total = Object.entries(next)
                                                  .filter(([bid]) => batches.find(b => b.id === parseInt(bid)))
                                                  .reduce((sum, [, qty]) => sum + (qty || 0), 0);
                                                setFormData(f => ({ ...f, max_capacity: total > 0 ? String(total) : '' }));
                                                return next;
                                              });
                                            }}
                                          />
                                          <label htmlFor={`microchip-batch-${batch.id}`} style={{ cursor: 'pointer', flex: 1, marginBottom: 0 }}>
                                            <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{batch.batch_no}</span>
                                            {/* expired batches are filtered server-side */}
                                            <span className="ms-2" style={{ fontSize: '0.75rem', color: availableQty === 0 ? '#dc3545' : availableQty <= 10 ? '#ffc107' : '#28a745', fontWeight: '600' }}>
                                              {availableQty} available
                                            </span>
                                            {batch.expiration_date && !isExpired && (
                                              <span className="ms-1" style={{ fontSize: '0.68rem', color: '#888' }}>
                                                · exp {new Date(batch.expiration_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                              </span>
                                            )}
                                          </label>
                                          {isBatchSelected && (
                                            <div className="d-flex align-items-center gap-1">
                                              <Form.Control
                                                type="number"
                                                min="1"
                                                max={availableQty}
                                                value={scheduleAllocations[batch.id] || ''}
                                                onChange={(e) => {
                                                  let val = e.target.value === '' ? 0 : Math.max(0, Math.min(parseInt(e.target.value) || 0, availableQty));
                                                  setScheduleAllocations(prev => {
                                                    const next = { ...prev, [batch.id]: val };
                                                    // Auto-update max_capacity = sum of all microchip batch allocations
                                                    const total = Object.entries(next)
                                                      .filter(([bid]) => batches.find(b => b.id === parseInt(bid)))
                                                      .reduce((sum, [, qty]) => sum + (qty || 0), 0);
                                                    setFormData(f => ({ ...f, max_capacity: total > 0 ? String(total) : '' }));
                                                    return next;
                                                  });
                                                }}
                                                placeholder={`Max ${availableQty}`}
                                                style={{ width: '90px', padding: '0.25rem 0.4rem', fontSize: '0.82rem', borderRadius: '5px', border: '2px solid #6c757d' }}
                                              />
                                              <span style={{ fontSize: '0.72rem', color: '#aaa' }}>pcs</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {totalMicrochipAllocated > 0 && (
                                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(108,117,125,0.08)', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', color: '#495057' }}>
                                  <i className="fas fa-microchip me-1" /> Total capacity set to: <strong>{totalMicrochipAllocated} pcs</strong>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <Form.Text className="text-muted mt-1 d-block">
                          <i className="fas fa-info-circle me-1" />
                          Max capacity is auto-set from your batch selections
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
                {/* Other Event Fields */}
{formData.schedule_type === 'other' && (
  <>
    
    <Row>
      <Col md={12}>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
            Available for Pet Types (Optional)
          </Form.Label>
          <div 
            style={{
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              padding: '1rem',
              background: '#f8f9fa'
            }}
          >
            <Form.Check
              type="checkbox"
              id="other-dog"
              label={
                <span>
                  <strong>Dog</strong>
                  <small className="text-muted d-block">
                    This event accepts dogs
                  </small>
                </span>
              }
              checked={formData.other_pet_types.includes('dog')}
              onChange={() => handleOtherPetTypesToggle('dog')}
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              id="other-cat"
              label={
                <span>
                  <strong>Cat</strong>
                  <small className="text-muted d-block">
                    This event accepts cats
                  </small>
                </span>
              }
              checked={formData.other_pet_types.includes('cat')}
              onChange={() => handleOtherPetTypesToggle('cat')}
              className="mb-2"
            />
            
          </div>
          <Form.Text className="text-muted">
            <i className="fas fa-info-circle me-1"></i>
            Leave unchecked if this event is not pet-specific
          </Form.Text>
        </Form.Group>
      </Col>
    </Row>
  </>
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
  type="submit" 
  className="border-0"
  disabled={
    formLoading || 
    (modalMode === 'create' && !formData.schedule_type) ||
    (formData.schedule_type === 'vaccination' && (
      Object.keys(formData.vaccination_types).length === 0 ||
      Object.values(formData.vaccination_types).some(limit => !limit || parseInt(limit) <= 0)
    )) ||
    (formData.schedule_type === 'sterilization' && formData.sterilization_species.length === 0)
  }
  style={{
    background: formLoading ? '#6c757d' : '#000000',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontWeight: '600'
  }}
  onMouseOver={(e) => {
    if (!formLoading) e.target.style.background = '#333333';
  }}
  onMouseOut={(e) => {
    if (!formLoading) e.target.style.background = '#000000';
  }}
>
              {formLoading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  {modalMode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className={`fas fa-${modalMode === 'edit' ? 'save' : 'plus'} me-2`}></i>
                  {modalMode === 'edit' ? 'Update Schedule' : 'Create Schedule'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header 
          closeButton
          style={{
            background: '#f8f9fa',
            borderBottom: '2px solid #dee2e6'
          }}
        >
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-exclamation-triangle text-danger me-2"></i>
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {scheduleToDelete && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to delete this schedule?
              </p>
              <div 
                style={{
                  background: '#f8f9fa',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  borderLeft: '4px solid #dc3545'
                }}
              >
                <div className="mb-2">
                  <span style={{ fontWeight: '500', color: '#555' }}>
                    {scheduleToDelete.type === 'vaccination' && <><i className="fas fa-syringe me-1" style={{ color: '#ffc107' }}></i>Vaccination</>}
                    {scheduleToDelete.type === 'seminar' && <><i className="fas fa-chalkboard-teacher me-1" style={{ color: '#6f42c1' }}></i>Seminar</>}
                    {scheduleToDelete.type === 'sterilization' && <><i className="fas fa-cut me-1" style={{ color: '#28a745' }}></i>Sterilization</>}
                    {scheduleToDelete.type === 'microchip' && <><i className="fas fa-microchip me-1" style={{ color: '#6c757d' }}></i>Microchip</>}
                  </span>
                </div>
                <strong style={{ fontSize: '1.1rem' }}>{scheduleToDelete.title}</strong>
                <br />
                <small className="text-muted">
                  <i className="fas fa-map-marker-alt me-1"></i>
                  {getBarangayName(scheduleToDelete.barangay_id)} • {new Date(scheduleToDelete.scheduled_date).toLocaleDateString()}
                </small>
              </div>
              <Alert variant="warning" className="mt-3 mb-0">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Warning:</strong> This action cannot be undone.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteLoading}
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
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
            style={{
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontWeight: '600'
            }}
          >
            {deleteLoading ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <i className="fas fa-trash me-2"></i>
                Delete Schedule
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>

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
          minWidth: '185px',
          zIndex: 1050,
          overflow: 'hidden',
          zoom: '0.75',
        }}>
          {(() => {
            const schedule = schedules.find(s => s.id === showDropdown);
            if (!schedule) return null;
            return (
              <>
                <button
                  onClick={() => { setShowDropdown(null); handleOpenViewModal(schedule); }}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseOut={e  => e.currentTarget.style.background = '#ffffff'}
                >
                  <img src="/view.png" alt="View" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  <span>View Details</span>
                </button>

                {schedule.status !== 'ongoing' &&
                 schedule.status !== 'completed' &&
                 (user?.role === 'super_admin' || user?.role === 'barangay_official') && (
                  <>
                    <button
                      onClick={() => { setShowDropdown(null); handleOpenModal('edit', schedule); }}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#333333', fontWeight: '500', borderTop: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseOut={e  => e.currentTarget.style.background = '#ffffff'}
                    >
                      <img src="/edit(1).png" alt="Edit" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                      <span>Edit Schedule</span>
                    </button>

                    <button
                      onClick={() => { setShowDropdown(null); handleDeleteClick(schedule); }}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: '500', borderTop: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#fff5f5'}
                      onMouseOut={e  => e.currentTarget.style.background = '#ffffff'}
                    >
                      <img src="/remove.png" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                      <span>Delete Schedule</span>
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      </>
    )}
    </>
  );
};

export default Schedule;