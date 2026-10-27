import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { scheduleAPI, petAPI, vaccinationAPI, inventoryAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import VerifyAccountModal from '../owner/VerifyAccountModal';

const ownerAPI = {
  getByUserId: (userId) => api.get(`/owners/user/${userId}`),
};




const VERIFICATION_CONFIG = {
  not_verified:  { label: 'Not Verified',   color: '#dc3545', icon: 'fa-times-circle' },
  pending:       { label: 'Pending Review', color: '#fd7e14', icon: 'fa-hourglass-half' },
  semi_verified: { label: 'Semi Verified',  color: '#0d6efd', icon: 'fa-shield-alt' },
  fully_verified:{ label: 'Fully Verified', color: '#198754', icon: 'fa-check-circle' },
};

const WaveDots = ({ color = '#000000' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '1rem' }}>
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
  </span>
);

const OwnerSchedule = () => {
  const [vaccinationSchedules, setVaccinationSchedules] = useState([]);
const [seminarSchedules, setSeminarSchedules] = useState([]);
const [sterilizationSchedules, setSterilizationSchedules] = useState([]);
const [otherSchedules, setOtherSchedules] = useState([]);
const [myPets, setMyPets] = useState([]);
const [vaccinationTypes, setVaccinationTypes] = useState([]);
const [dewormingSchedules, setDewormingSchedules] = useState([]);
const [microchipSchedules, setMicrochipSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBarangay, setSelectedBarangay] = useState('all');
  const [barangays, setBarangays] = useState([]);
  const [filterRegistration, setFilterRegistration] = useState('all');
  const [showConfirmRegistrationModal, setShowConfirmRegistrationModal] = useState(false);
  const [lastRegistrationData, setLastRegistrationData] = useState(null);
const [showDropdown, setShowDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [vaccineRegistrationCounts, setVaccineRegistrationCounts] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  
  
  
  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleType, setScheduleType] = useState('');
  const [registrationData, setRegistrationData] = useState({
    pets_registered: [],
    special_requests: '',
    notes: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [compatiblePets, setCompatiblePets] = useState([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [petToCancel, setPetToCancel] = useState(null);
  const [currentRegistrations, setCurrentRegistrations] = useState([]);
  const [vaccineToCancel, setVaccineToCancel] = useState(null);
  const [selectedVaccinesToCancel, setSelectedVaccinesToCancel] = useState({});

  // Verification states
  const [ownerProfile, setOwnerProfile]       = useState(null);
  const [verifLoading, setVerifLoading]       = useState(true);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  

  useEffect(() => {
    loadOwnerProfile();
    loadData();
  }, []);

  const loadOwnerProfile = async () => {
    try {
      setVerifLoading(true);
      const user = getUser();
      const res  = await ownerAPI.getByUserId(user.id);
      const owner = res.data.owner;
      setOwnerProfile(owner);
    } catch (err) {
      console.error('Failed to load owner profile:', err);
    } finally {
      setVerifLoading(false);
    }
  };

  const isVerified = () =>
    ownerProfile?.verification_status === 'fully_verified' ||
    ownerProfile?.verification_status === 'semi_verified';

  const handleOpenVerifyModal = () => {
    setShowVerifyModal(true);
  };

  const styles = `
    .dashboard-page {
      zoom: 0.75;
    }
    @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } }
    @media (min-width: 1920px) { .dashboard-page { zoom: 1; } }

    @keyframes dropDown {
      0% { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes waveDots {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    @media (max-width: 768px) {
      .sched-page-title { font-size: 1.5rem !important; }
      .sched-tab-btn {
        padding: 0.5rem 0.6rem !important;
        font-size: 0.72rem !important;
        min-width: unset !important;
        border-radius: 8px !important;
        gap: 0.25rem !important;
      }
      .sched-tab-btn span:first-of-type { display: none !important; }
      .sched-tab-count { font-size: 0.68rem !important; }
      .sched-card-header { padding: 0.75rem 3rem 0.75rem 0.75rem !important; }
      .sched-card-header h5 { font-size: 0.9rem !important; }
      .sched-card-body { padding: 0.85rem !important; }
      .sched-card-body > div { margin-bottom: 0.75rem !important; padding-bottom: 0.75rem !important; }
      .sched-card-label { font-size: 0.65rem !important; }
      .sched-card-value { font-size: 0.85rem !important; }
      .sched-pagination span,
      .sched-pagination button {
        font-size: 0.75rem !important;
        padding: 0.35rem 0.55rem !important;
        min-width: 32px !important;
      }
      /* Tab row wraps on mobile */
      .sched-tab-row {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 0.4rem !important;
      }
      /* Filter row stacks on mobile */
      .sched-filter-row .col-md-4,
      .sched-filter-row .col-md-8 {
        width: 100% !important;
        max-width: 100% !important;
        flex: 0 0 100% !important;
      }
      .sched-filter-row .col-md-8 {
        margin-top: 0.5rem !important;
        text-align: left !important;
      }
      /* Modal responsiveness */
      .modal-body { padding: 1rem !important; }
      .modal-footer { padding: 0.75rem 1rem !important; }
      /* Card grid full width on mobile */
      .sched-card-col {
        width: 100% !important;
        max-width: 100% !important;
        flex: 0 0 100% !important;
      }
    }
  `;

  // Check URL for view parameter and open modal AFTER data is loaded
  useEffect(() => {
    if (loading) return; // Don't run until loading is complete
    
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    
    if (!viewParam) return; // No view parameter, exit early
    
    const [type, id] = viewParam.split('-');
    let schedule;
    
    if (type === 'vaccination') {
  schedule = vaccinationSchedules.find(s => s.id === parseInt(id));
} else if (type === 'deworming') {
  schedule = dewormingSchedules.find(s => s.id === parseInt(id));
} else if (type === 'seminar') {
  schedule = seminarSchedules.find(s => s.id === parseInt(id));
} else if (type === 'sterilization') {
  schedule = sterilizationSchedules.find(s => s.id === parseInt(id));
} else if (type === 'other') {
  schedule = otherSchedules.find(s => s.id === parseInt(id));
} else if (type === 'microchip') {
  schedule = microchipSchedules.find(s => s.id === parseInt(id));
}
    
    if (schedule) {
      // Use setTimeout to ensure the component is fully rendered
      setTimeout(() => {
        handleViewClick({ ...schedule, type });
        // Clear the URL parameter
        window.history.replaceState({}, '', '/owner/schedule');
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loading, vaccinationSchedules, dewormingSchedules, seminarSchedules, sterilizationSchedules, otherSchedules, microchipSchedules]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [
  vacSchedulesRes, 
  dewormSchedulesRes,
  semSchedulesRes, 
  sterilSchedulesRes,
  otherSchedulesRes,
  microchipSchedulesRes,
  petsRes, 
  vacTypesRes,
  inventoryRes
] = await Promise.all([
  scheduleAPI.getVaccinationSchedules(),
  scheduleAPI.getDewormingSchedules(),
  scheduleAPI.getSeminarSchedules(),
  scheduleAPI.getSterilizationSchedules(),
  scheduleAPI.getOtherSchedules(),
  scheduleAPI.getMicrochipSchedules().catch(() => ({ data: { schedules: [] } })),
  petAPI.getAll(),
  vaccinationAPI.getTypes(),
  inventoryAPI.getAll().catch((err) => { console.error('Inventory load failed:', err); return { data: { inventory: [] } }; })
]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingVaccinations = (vacSchedulesRes.data.schedules || [])
        .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
        .map(s => ({ ...s, type: 'vaccination' }));

      const upcomingDewormings = (dewormSchedulesRes.data.schedules || [])
        .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
        .map(s => ({ ...s, type: 'deworming' }));

      const upcomingSeminars = (semSchedulesRes.data.schedules || [])
        .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
        .map(s => ({ ...s, type: 'seminar' }));

      const upcomingSterilizations = (sterilSchedulesRes.data.schedules || [])
  .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
  .map(s => ({ ...s, type: 'sterilization' }));

const upcomingOthers = (otherSchedulesRes.data.schedules || [])
  .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
  .map(s => ({ ...s, type: 'other' }));

const upcomingMicrochips = (microchipSchedulesRes.data.schedules || [])
  .filter(s => new Date(s.scheduled_date) >= today && (s.status === 'scheduled' || s.status === 'ongoing'))
  .map(s => ({ ...s, type: 'microchip' }));

setVaccinationSchedules(upcomingVaccinations);
setDewormingSchedules(upcomingDewormings);
setSeminarSchedules(upcomingSeminars);
setSterilizationSchedules(upcomingSterilizations);
setOtherSchedules(upcomingOthers);
setMicrochipSchedules(upcomingMicrochips);
      setMyPets(petsRes.data.pets || []);
      setVaccinationTypes(vacTypesRes.data.vaccination_types || []);
      setInventoryItems(inventoryRes.data.inventory || []);

      const allSchedules = [
  ...upcomingVaccinations, 
  ...upcomingDewormings,
  ...upcomingSeminars, 
  ...upcomingSterilizations,
  ...upcomingOthers,
  ...upcomingMicrochips
];
      // Load user's current registrations for all schedules
      const allScheduleIds = [
  ...upcomingVaccinations.map(s => ({ id: s.id, type: 'vaccination' })),
  ...upcomingDewormings.map(s => ({ id: s.id, type: 'deworming' })),
  ...upcomingSeminars.map(s => ({ id: s.id, type: 'seminar' })),
  ...upcomingSterilizations.map(s => ({ id: s.id, type: 'sterilization' })),
  ...upcomingOthers.map(s => ({ id: s.id, type: 'other' })),
  ...upcomingMicrochips.map(s => ({ id: s.id, type: 'microchip' }))
];
      
      const allRegistrations = [];
      
      for (const schedule of allScheduleIds) {
        try {
          const response = await scheduleAPI.getRegisteredPets(schedule.id, schedule.type);
          const registrations = response.data.registrations || [];
          
          // Add schedule_id and schedule_type to each registration
          registrations.forEach(reg => {
            allRegistrations.push({
              ...reg,
              schedule_id: schedule.id,
              schedule_type: schedule.type
            });
          });
        } catch (err) {
          console.error(`Error loading registrations for ${schedule.type} ${schedule.id}:`, err);
        }
      }
      
      setCurrentRegistrations(allRegistrations);
      console.log('All registrations loaded:', allRegistrations);
      
      const uniqueBarangays = [...new Set(allSchedules.map(s => s.custom_place || s.barangay_name))].filter(Boolean);
      setBarangays(uniqueBarangays.sort());
      
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePetAge = (birthDate) => {
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInDays = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
    const ageInWeeks = Math.floor(ageInDays / 7);
    const ageInMonths = Math.floor(ageInDays / 30);
    
    return {
      days: ageInDays,
      weeks: ageInWeeks,
      months: ageInMonths
    };
  };

  const meetsAgeRequirement = (pet, scheduleType) => {
    const age = calculatePetAge(pet.birth_date);
    if (!age) {
      return { 
        meets: false, 
        reason: 'Birth date is required to verify age eligibility' 
      };
    }
    
    if (scheduleType === 'vaccination') {
      if (age.weeks < 6) {
        return { 
          meets: false, 
          reason: `Must be at least 6 weeks old (currently ${age.weeks} weeks old)` 
        };
      }
    } else if (scheduleType === 'deworming') {
      if (age.weeks < 2) {
        return { 
          meets: false, 
          reason: `Must be at least 2 weeks old (currently ${age.weeks} weeks old)` 
        };
      }
    } else if (scheduleType === 'sterilization') {
      if (age.months < 6) {
        return { 
          meets: false, 
          reason: `Must be at least 6 months old (currently ${age.months} months old)` 
        };
      }
    }
    
    return { meets: true, reason: null };
  }; 

  const getAllSchedules = () => {
  return [
    ...vaccinationSchedules, 
    ...dewormingSchedules,
    ...seminarSchedules, 
    ...sterilizationSchedules,
    ...otherSchedules,
    ...microchipSchedules
  ].sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
};
  const isScheduleRegistered = (schedule) => {
  return currentRegistrations.some(r => 
    r.schedule_id === schedule.id && 
    r.schedule_type === schedule.type &&
    r.status !== 'cancelled'
  );
};

const getFilteredSchedules = () => {
  let schedules;
  
  switch (activeTab) {
    case 'vaccination':
      schedules = vaccinationSchedules;
      break;
    case 'deworming':
      schedules = dewormingSchedules;
      break;
    case 'seminar':
      schedules = seminarSchedules;
      break;
    case 'sterilization':
      schedules = sterilizationSchedules;
      break;
    case 'other':
      schedules = otherSchedules;
      break;
    case 'microchip':
      schedules = microchipSchedules;
      break;
    default:  
      schedules = getAllSchedules();
  }

  if (selectedBarangay !== 'all') {
    schedules = schedules.filter(s => (s.custom_place || s.barangay_name) === selectedBarangay);
  }

  if (filterRegistration === 'registered') {
    schedules = schedules.filter(s => isScheduleRegistered(s));
  } else if (filterRegistration === 'unregistered') {
    schedules = schedules.filter(s => !isScheduleRegistered(s));
  }

  return schedules;
};

  const getScheduleStatusBadge = (schedule) => {
    const now = new Date();
    const scheduleDate = new Date(schedule.scheduled_date);
    const [startHour, startMinute] = schedule.start_time.split(':');
    const [endHour, endMinute] = schedule.end_time.split(':');
    
    const startDateTime = new Date(scheduleDate);
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const endDateTime = new Date(scheduleDate);
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
    
    // Check time-based status first
    if (now > endDateTime) {
      return <span style={{ color: '#6c757d', fontWeight: '600' }}>Past</span>;
    }
    
    if (now >= startDateTime && now <= endDateTime) {
      return <span style={{ color: '#198754', fontWeight: '600' }}>Ongoing</span>;
    }
    
    // Then check database status for cancelled/completed
    if (schedule.status === 'completed') {
      return <span style={{ color: '#6c757d', fontWeight: '600' }}>Completed</span>;
    }
    if (schedule.status === 'cancelled') {
      return <span style={{ color: '#dc3545', fontWeight: '600' }}>Cancelled</span>;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const schedDateOnly = new Date(scheduleDate);
    schedDateOnly.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((schedDateOnly - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return <span style={{ color: '#198754', fontWeight: '600' }}>Today</span>;
    if (diffDays <= 3) return <span style={{ color: '#ffc107', fontWeight: '600' }}>Soon</span>;
    if (diffDays <= 7) return <span style={{ color: '#0dcaf0', fontWeight: '600' }}>This Week</span>;
    return <span style={{ color: '#0d6efd', fontWeight: '600' }}>Upcoming</span>;
  };

  const getScheduleTypeBadge = (type) => {
  const badges = {
    vaccination: <span style={{ color: '#ffc107', fontWeight: '600', fontSize: '0.85rem' }}>Vaccination</span>,
    deworming: <span style={{ color: '#0d6efd', fontWeight: '600', fontSize: '0.85rem' }}>Deworming</span>,  
    seminar: <span style={{ color: '#0dcaf0', fontWeight: '600', fontSize: '0.85rem' }}>Seminar</span>,
    sterilization: <span style={{ color: '#198754', fontWeight: '600', fontSize: '0.85rem' }}>Sterilization</span>,
    other: <span style={{ color: '#6f42c1', fontWeight: '600', fontSize: '0.85rem' }}>Other Event</span>
  };
  return badges[type] || <span style={{ color: '#6c757d', fontWeight: '600', fontSize: '0.85rem' }}>{type}</span>;
};

  const getAvailableSpots = (schedule) => {
    if (!schedule.max_capacity) return null;
    return Math.max(0, schedule.max_capacity - (schedule.current_registrations || 0));
  };

  const getCompatiblePetsForVaccination = (schedule) => {
    try {
      const limits = typeof schedule.vaccine_shot_limits === 'string'
        ? JSON.parse(schedule.vaccine_shot_limits)
        : schedule.vaccine_shot_limits || {};

      const allowedSpecies = new Set();
      Object.keys(limits).forEach(inventoryId => {
        const invItem = inventoryItems.find(i => i.id === parseInt(inventoryId));
        if (!invItem) return;
        const sp = invItem.species || 'all';
        if (sp === 'all' || sp === 'both') {
          allowedSpecies.add('dog');
          allowedSpecies.add('cat');
        } else {
          allowedSpecies.add(sp);
        }
      });

      if (allowedSpecies.size === 0) return myPets;
      return myPets.filter(pet => allowedSpecies.has(pet.species));
    } catch (e) {
      return myPets;
    }
  };

  const getCompatiblePetsForDeworming = (schedule) => {
    if (!schedule.pet_types_allowed) return myPets;
    
    try {
      const allowedTypes = Array.isArray(schedule.pet_types_allowed)
        ? schedule.pet_types_allowed
        : JSON.parse(schedule.pet_types_allowed || '[]');
      
      if (allowedTypes.length === 0) return myPets;
      
      return myPets.filter(pet => allowedTypes.includes(pet.species));
    } catch (e) {
      return myPets;
    }
  };

  const getCompatiblePetsForSterilization = (schedule) => {
    if (!schedule.sterilization_species) return myPets;
    
    try {
      const allowedSpecies = Array.isArray(schedule.sterilization_species)
        ? schedule.sterilization_species
        : JSON.parse(schedule.sterilization_species || '[]');
      
      if (allowedSpecies.length === 0) return myPets;
      
      return myPets.filter(pet => allowedSpecies.includes(pet.species));
    } catch (e) {
      return myPets;
    }
  };

  const getCompatiblePetsForOther = (schedule) => {
  if (!schedule.pet_types_allowed) return myPets;
  
  try {
    const allowedTypes = Array.isArray(schedule.pet_types_allowed)
      ? schedule.pet_types_allowed
      : JSON.parse(schedule.pet_types_allowed || '[]');
    
    if (allowedTypes.length === 0) return myPets;
    
    return myPets.filter(pet => allowedTypes.includes(pet.species));
  } catch (e) {
    return myPets;
  }
};

  const getAvailableVaccinesForPet = (petSpecies, vaccineShotLimits) => {
    try {
      const limits = typeof vaccineShotLimits === 'string'
        ? JSON.parse(vaccineShotLimits)
        : vaccineShotLimits || {};

      return Object.entries(limits)
        .filter(([, shotsRemaining]) => shotsRemaining > 0)
        .map(([inventoryId, shotsRemaining]) => {
          // vaccine_shot_limits keys are inventory IDs
          const invItem = inventoryItems.find(i => i.id === parseInt(inventoryId));
          if (!invItem) return null;

          const itemSpecies = invItem.species || 'all';
          if (itemSpecies !== 'both' && itemSpecies !== 'all' && itemSpecies !== petSpecies) {
            return null;
          }

          return {
            id: parseInt(inventoryId),
            name: invItem.item_name || invItem.name || `Vaccine #${inventoryId}`,
            description: invItem.description || '',
            shotsRemaining: shotsRemaining,
            species: itemSpecies
          };
        })
        .filter(Boolean);
    } catch (e) {
      console.error('Error getting available vaccines:', e);
      return [];
    }
  };

  const handleVaccineSelection = (petId, vaccineId, isChecked) => {
    setCompatiblePets(prevPets => 
      prevPets.map(pet => {
        if (pet.id === petId) {
          const currentVaccines = pet.selectedVaccines || [];
          
          let updatedVaccines;
          if (isChecked) {
            updatedVaccines = currentVaccines.includes(vaccineId)
              ? currentVaccines
              : [...currentVaccines, vaccineId];
          } else {
            updatedVaccines = currentVaccines.filter(id => id !== vaccineId);
          }
          
          return {
            ...pet,
            selectedVaccines: updatedVaccines
          };
        }
        return pet;
      })
    );
  };

  const handlePetSelectionToggle = (petId) => {
    setCompatiblePets(prevPets =>
      prevPets.map(pet => {
        if (pet.id === petId) {
          if (pet.selectedVaccines !== undefined) {
            const { selectedVaccines, ...petWithoutVaccines } = pet;
            return petWithoutVaccines;
          } else {
            return {
              ...pet,
              selectedVaccines: []
            };
          }
        }
        return pet;
      })
    );
  };

  const handleViewClick = async (schedule) => {
    if (schedule.type === 'vaccination') {
      try {
        const response = await scheduleAPI.getVaccineRegistrationCounts(schedule.id);
        setVaccineRegistrationCounts(response.data.vaccine_counts || {});
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error('Error fetching vaccine counts:', err);
        setVaccineRegistrationCounts({});
      }
    }
    
    setSelectedSchedule(schedule);
    setScheduleType(schedule.type);
    setShowDetailsModal(true);
    setShowDropdown(null);
  };


  const handleRegisterClick = async (schedule) => {
    setSelectedSchedule(schedule);
    setScheduleType(schedule.type);
    setShowDropdown(null);
    
    try {
  let registeredRes;
  
  // Use getRegisteredPets for all schedule types including vaccination
  registeredRes = await scheduleAPI.getRegisteredPets(schedule.id, schedule.type);

      const registrations = registeredRes.data.registrations || [];
      const registeredPetIds = registrations.map(r => r.pet_id);
      
      // Check if user is already registered for seminar
      if (schedule.type === 'seminar' && registrations.length > 0) {
        // User is already registered, show the registration modal with cancel option
        const registration = registrations[0];
        setPetToCancel({ petId: null, registrationId: registration.id });
      }
      
      let compatible = [];
if (schedule.type === 'vaccination') {
  compatible = getCompatiblePetsForVaccination(schedule);
} else if (schedule.type === 'deworming') {
  compatible = getCompatiblePetsForDeworming(schedule);
} else if (schedule.type === 'sterilization') {
  compatible = getCompatiblePetsForSterilization(schedule);
} else if (schedule.type === 'seminar') {
  compatible = myPets;
} else if (schedule.type === 'microchip') {
  compatible = getCompatiblePetsForDeworming(schedule); // reuses pet_types_allowed logic
} else if (schedule.type === 'other') {
  // Check if pet selection is required for "other" events
  const petTypesAllowed = schedule.pet_types_allowed;
  const hasPetTypes = petTypesAllowed && (
    (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
    (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
  );
  
  if (hasPetTypes) {
    compatible = getCompatiblePetsForOther(schedule);
  } else {
    compatible = myPets; // For seminar-like registration
  }
}
      
      const petsWithStatus = compatible.map(pet => {
  const registration = registrations.find(r => r.pet_id === pet.id);
  return {
    ...pet,
    isRegistered: registeredPetIds.includes(pet.id),
    registration_id: registration ? registration.id : null
  };
});

setCompatiblePets(petsWithStatus);
// Don't overwrite global currentRegistrations — update only for this schedule
setRegistrationData({
  pets_registered: [],
  special_requests: '',
  notes: ''
});
      setRegisterError('');
      setRegisterSuccess('');
      setShowRegisterModal(true);
      
    } catch (err) {
      const { message } = handleAPIError(err);
      setRegisterError(message || 'Failed to load available pets');
      
      setCompatiblePets([]);
      setRegistrationData({
        pets_registered: [],
        special_requests: '',
        notes: ''
      });
      setRegisterSuccess('');
      setShowRegisterModal(true);
    }
  };

  const handleCancelRegistration = (petId, registrationId) => {
    setPetToCancel({ petId, registrationId });
    setShowCancelConfirm(true);
  };
  const handleCancelVaccine = (petId, registrationId, vaccineId) => {
  setVaccineToCancel({ petId, registrationId, vaccineId });
  setShowCancelConfirm(true);
};

const handleVaccineCancelSelection = (petId, vaccineId, isChecked) => {
  setSelectedVaccinesToCancel(prev => {
    const petSelections = prev[petId] || [];
    const updated = isChecked 
      ? [...petSelections, vaccineId]
      : petSelections.filter(id => id !== vaccineId);
    
    return {
      ...prev,
      [petId]: updated
    };
  });
};

const handleCancelSelectedOrAll = (petId, registrationId) => {
  const petSelectedVaccines = selectedVaccinesToCancel[petId] || [];
  
  if (petSelectedVaccines.length > 0) {
    // Cancel only selected vaccines
    setVaccineToCancel({ petId, registrationId, vaccineIds: petSelectedVaccines });
  } else {
    // Cancel all vaccines (entire registration)
    setPetToCancel({ petId, registrationId });
  }
  setShowCancelConfirm(true);
};

  const confirmCancelRegistration = async () => {
  // Check if canceling individual vaccine or entire registration
  if (vaccineToCancel) {
    await confirmCancelVaccine();
    return;
  }
  
  if (!petToCancel) return;

  setRegisterLoading(true);
  setRegisterError('');

  try {
    await scheduleAPI.cancelRegistration(petToCancel.registrationId);
    
    setCompatiblePets(prevPets => 
      prevPets.map(pet => 
        pet.id === petToCancel.petId 
          ? { ...pet, isRegistered: false, registration_id: null }
          : pet
      )
    );
    
    setRegisterSuccess('Registration cancelled successfully!');
    await loadData();
    
    setTimeout(() => {
      setRegisterSuccess('');
    }, 3000);
    
  } catch (err) {
    const { message } = handleAPIError(err);
    setRegisterError(message);
    console.error('Cancel registration error:', err);
  } finally {
    setRegisterLoading(false);
    setPetToCancel(null);
    setShowCancelConfirm(false);
  }
};

const confirmCancelVaccine = async () => {
  if (!vaccineToCancel) return;

  setRegisterLoading(true);
  setRegisterError('');

  try {
    const registration = currentRegistrations.find(r => r.id === vaccineToCancel.registrationId);
    const currentVaccines = registration?.selected_vaccines || [];
    
    // Handle multiple vaccine cancellations
    const vaccinesToRemove = vaccineToCancel.vaccineIds || [vaccineToCancel.vaccineId];
    const updatedVaccines = currentVaccines.filter(id => !vaccinesToRemove.includes(id));
    
    if (updatedVaccines.length === 0) {
      // If no vaccines left, cancel entire registration
      await scheduleAPI.cancelRegistration(vaccineToCancel.registrationId);
      
      setCompatiblePets(prevPets => 
        prevPets.map(pet => 
          pet.id === vaccineToCancel.petId 
            ? { ...pet, isRegistered: false, registration_id: null }
            : pet
        )
      );
      
      setRegisterSuccess('All vaccines cancelled. Registration removed.');
    } else {
      // Update registration with remaining vaccines
      await scheduleAPI.updateRegistration(vaccineToCancel.registrationId, {
        selected_vaccines: updatedVaccines
      });
      
      // Update local state
      setCurrentRegistrations(prev => 
        prev.map(reg => 
          reg.id === vaccineToCancel.registrationId 
            ? { ...reg, selected_vaccines: updatedVaccines }
            : reg
        )
      );
      
      setRegisterSuccess(vaccinesToRemove.length > 1 ? 'Selected vaccines cancelled successfully!' : 'Vaccine cancelled successfully!');
    }
    
    // Reload all data to refresh counts and registrations
    await loadData();
    
    // If the registration modal is still open, refresh the pet list
    if (selectedSchedule && showRegisterModal) {
      try {
        const registeredRes = await scheduleAPI.getRegisteredPets(selectedSchedule.id, selectedSchedule.type);
        const registrations = registeredRes.data.registrations || [];
        
        // Update compatible pets with fresh registration data
        setCompatiblePets(prevPets => 
          prevPets.map(pet => {
            const registration = registrations.find(r => r.pet_id === pet.id);
            return {
              ...pet,
              isRegistered: registrations.some(r => r.pet_id === pet.id),
              registration_id: registration ? registration.id : null
            };
          })
        );
        
        setCurrentRegistrations(registrations);
      } catch (err) {
        console.error('Error refreshing registrations:', err);
      }
    }
    
    setTimeout(() => {
      setRegisterSuccess('');
    }, 3000);
    
  } catch (err) {
    const { message } = handleAPIError(err);
    setRegisterError(message);
    console.error('Cancel vaccine error:', err);
  } finally {
    setRegisterLoading(false);
    setVaccineToCancel(null);
    // Clear selections for this specific pet
    if (vaccineToCancel?.petId) {
      setSelectedVaccinesToCancel(prev => {
        const updated = { ...prev };
        delete updated[vaccineToCancel.petId];
        return updated;
      });
    }
    setShowCancelConfirm(false);
  }
};

  const handlePetSelection = (petId, isChecked) => {
    setRegistrationData(prev => ({
      ...prev,
      pets_registered: isChecked 
        ? [...prev.pets_registered, parseInt(petId)]
        : prev.pets_registered.filter(id => id !== parseInt(petId))
    }));
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    
    if (scheduleType === 'vaccination') {
      const petsWithVaccines = compatiblePets.filter(p => 
        p.selectedVaccines && p.selectedVaccines.length > 0
      );
      
      if (petsWithVaccines.length === 0) {
        setRegisterError('Please select at least one pet and their vaccines');
        return;
      }
      
      for (const pet of petsWithVaccines) {
        if (!pet.selectedVaccines || pet.selectedVaccines.length === 0) {
          setRegisterError(`Please select at least one vaccine for ${pet.name}`);
          return;
        }
      }
    } else if (scheduleType === 'deworming' || scheduleType === 'sterilization') {
      if (registrationData.pets_registered.length === 0) {
        setRegisterError('Please select at least one pet to register');
        return;
      }
    } else if (scheduleType === 'other') {
      // Check if pet selection is required
      const petTypesAllowed = selectedSchedule?.pet_types_allowed;
      const hasPetTypes = petTypesAllowed && (
        (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
        (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
      );
      
      if (hasPetTypes && registrationData.pets_registered.length === 0) {
        setRegisterError('Please select at least one pet to register');
        return;
      }
    }

    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');

    try {
      const submitData = {
        schedule_id: selectedSchedule.id,
        schedule_type: scheduleType,
        special_requests: registrationData.special_requests,
        notes: registrationData.notes
      };

      if (scheduleType === 'vaccination') {
        submitData.pets_with_vaccines = compatiblePets
          .filter(p => p.selectedVaccines && p.selectedVaccines.length > 0)
          .map(pet => ({
            pet_id: pet.id,
            selected_vaccines: pet.selectedVaccines
          }));
      } else if (scheduleType === 'deworming' || scheduleType === 'sterilization' || scheduleType === 'microchip' || scheduleType === 'other') {
        // Check if pet selection is required for 'other' type
        if (scheduleType === 'other') {
          const petTypesAllowed = selectedSchedule?.pet_types_allowed;
          const hasPetTypes = petTypesAllowed && (
            (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
            (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
          );
          
          if (hasPetTypes) {
            submitData.pets_registered = registrationData.pets_registered;
          }
        } else {
          submitData.pets_registered = registrationData.pets_registered;
        }
      }

      await scheduleAPI.register(submitData);

      // Build registered pets summary for confirm modal
      let registeredPetsSummary = [];
      if (scheduleType === 'vaccination') {
        registeredPetsSummary = compatiblePets
          .filter(p => p.selectedVaccines && p.selectedVaccines.length > 0)
          .map(pet => ({
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            vaccines: pet.selectedVaccines.map(vid => {
              const inv = inventoryItems.find(i => i.id === parseInt(vid));
              return inv?.item_name || inv?.name || `Vaccine #${vid}`;
            })
          }));
      } else if (['deworming', 'sterilization', 'microchip', 'other'].includes(scheduleType)) {
        registeredPetsSummary = myPets
          .filter(p => registrationData.pets_registered.includes(p.id))
          .map(pet => ({ name: pet.name, species: pet.species, breed: pet.breed, vaccines: [] }));
      } else if (scheduleType === 'seminar') {
        registeredPetsSummary = [];
      }

      setLastRegistrationData({
        schedule: selectedSchedule,
        scheduleType,
        pets: registeredPetsSummary
      });

      setRegisterSuccess(`Successfully registered for ${scheduleType}!`);
      await loadData();
      
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegisterSuccess('');
        setShowConfirmRegistrationModal(true);
      }, 1000);
      
    } catch (err) {
      const { message } = handleAPIError(err);
      setRegisterError(message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const getBarangayCount = (placeName) => {
    const allSchedules = getAllSchedules();
    return allSchedules.filter(s => (s.custom_place || s.barangay_name) === placeName).length;
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
  if (!schedule.vaccine_shot_limits) return [];
  
  try {
    const limits = typeof schedule.vaccine_shot_limits === 'string' 
      ? JSON.parse(schedule.vaccine_shot_limits) 
      : schedule.vaccine_shot_limits;
    
    return Object.entries(limits).map(([inventoryId, limit]) => {
      const invItem = inventoryItems.find(i => i.id === parseInt(inventoryId));
      const registered = vaccineRegistrationCounts[inventoryId] || 0;
      
      return {
        id: inventoryId,
        name: invItem?.item_name || invItem?.name || 'Unknown',
        species: invItem?.species || 'unknown',
        limit: parseInt(limit || 0),
        registered: registered,
        description: invItem?.description || ''
      };
    });
  } catch (e) {
    console.error('Error in getVaccineDetails:', e);
    return [];
  }
};

  const filteredSchedules = getFilteredSchedules();

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center">
            <Spinner animation="border" style={{ width: '3rem', height: '3rem', color: '#ffc107', borderWidth: '4px' }} />
            <p style={{ marginTop: '1rem', fontWeight: '600', color: '#666666', fontSize: '1rem' }}>Loading schedules...</p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffffff', minHeight: '100vh' }}>
      <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
        <Col>
          <div>
            <div className="d-flex align-items-center" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <i
                className="fas fa-calendar-alt"
                style={{ fontSize: '1.5rem', color: '#000000', animation: 'float 3s ease-in-out infinite' }}
              />
              <h2 className="sched-page-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Event Calendar</h2>
              {!verifLoading && ownerProfile && (() => {
                const cfg = VERIFICATION_CONFIG[ownerProfile.verification_status] || VERIFICATION_CONFIG.not_verified;
                return (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.3rem 0.85rem', borderRadius:'999px', background: cfg.color + '18', border:`1.5px solid ${cfg.color}40`, fontSize:'0.78rem', fontWeight:'700', color: cfg.color }}>
                    <i className={`fas ${cfg.icon}`} style={{ fontSize:'0.75rem' }} />
                    {cfg.label}
                  </span>
                );
              })()}
            </div>
            {!verifLoading && ownerProfile?.verification_status === 'pending' && (
              <div style={{ marginTop:'0.5rem', fontSize:'0.8rem', color:'#856404', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <i className="fas fa-hourglass-half" />
                Your ID is under review. We'll notify you once verified.
              </div>
            )}
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

      {verifLoading ? (
        <Row>
          <Col>
            <div className="text-center py-5">
              <Spinner animation="border" style={{ width: '3rem', height: '3rem', color: '#ffc107', borderWidth: '4px' }} />
              <p style={{ marginTop: '1rem', fontWeight: '600', color: '#666666', fontSize: '1rem' }}>Checking verification...</p>
            </div>
          </Col>
        </Row>
      ) : !isVerified() && ownerProfile ? (
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          <Col>
            <Card className="text-center py-5 border-0"
              style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: '#ffffff' }}>
              <Card.Body className="py-5">
                <div style={{ width:'90px', height:'90px', borderRadius:'50%', background:'rgba(255,193,7,0.1)', border:'2px solid #ffc107', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
                  <i className="fas fa-lock" style={{ fontSize:'2.5rem', color:'#ffc107' }} />
                </div>
                <h4 style={{ fontWeight:'800', color:'#1a1a1a', marginBottom:'0.5rem' }}>Account Verification Required</h4>
                <p className="text-muted mb-4" style={{ maxWidth:'420px', margin:'0 auto 1.5rem', lineHeight:'1.65' }}>
                  You need to verify your identity before you can view and register for events. This ensures the safety and credibility of the system.
                </p>
                {ownerProfile.verification_status === 'pending' ? (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.75rem 1.5rem', borderRadius:'12px', background:'rgba(253,126,20,0.08)', border:'1.5px solid rgba(253,126,20,0.3)', color:'#fd7e14', fontWeight:'600', fontSize:'0.9rem' }}>
                    <i className="fas fa-hourglass-half" />
                    Your ID is currently under review. Please wait for admin approval.
                  </div>
                ) : (
                  <Button
                    onClick={handleOpenVerifyModal}
                    className="border-0"
                    size="lg"
                    style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', color:'#000', borderRadius:'14px', fontWeight:'700', padding:'0.875rem 2.5rem', boxShadow:'0 6px 20px rgba(255,193,7,0.4)', transition:'all 0.3s' }}
                    onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(255,193,7,0.6)'; }}
                    onMouseOut={e  => { e.currentTarget.style.transform='translateY(0)';   e.currentTarget.style.boxShadow='0 6px 20px rgba(255,193,7,0.4)'; }}>
                    <i className="fas fa-id-card me-2" />Verify My Account Now
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : isVerified() && (
        <>
          <Card 
            className="border-0"
            style={{ 
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              animation: 'dropDown 0.4s ease-out 0.1s backwards'
            }}
          >
            <Card.Header 
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                borderBottom: 'none',
                padding: '2rem 1.5rem',
                borderRadius: '20px 20px 0 0'
              }}
            >
              {/* Tab Pills */}
              <div className="sched-tab-row" style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1.5rem'
              }}>
                <button
                  className="sched-tab-btn"
                  onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                  style={{
                    background: activeTab === 'all' 
                      ? 'rgba(255, 193, 7, 0.12)' 
                      : '#ffffff',
                    color: activeTab === 'all' ? '#000000' : '#6c757d',
                    border: activeTab === 'all' ? 'none' : '2px solid #e0e0e0',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 'all' 
                      ? '0 4px 15px rgba(255, 193, 7, 0.3)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '140px',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== 'all') {
                      e.target.style.borderColor = '#ffc107';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== 'all') {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  <i className="fas fa-calendar"></i>
                  <span>All Events</span>
                  <span className="sched-tab-count" style={{
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    opacity: activeTab === 'all' ? 1 : 0.6
                  }}>
                    {getAllSchedules().length}
                  </span>
                </button>

                <button
                  className="sched-tab-btn"
                  onClick={() => { setActiveTab('vaccination'); setCurrentPage(1); }}
                  style={{
                    background: activeTab === 'vaccination' 
                      ? 'rgba(255, 193, 7, 0.12)' 
                      : '#ffffff',
                    color: activeTab === 'vaccination' ? '#000000' : '#6c757d',
                    border: activeTab === 'vaccination' ? 'none' : '2px solid #e0e0e0',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 'vaccination' 
                      ? '0 4px 15px rgba(255, 193, 7, 0.3)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '140px',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== 'vaccination') {
                      e.target.style.borderColor = '#ffc107';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== 'vaccination') {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  <i className="fas fa-syringe"></i>
                  <span>Vaccination</span>
                  <span className="sched-tab-count" style={{
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    opacity: activeTab === 'vaccination' ? 1 : 0.6
                  }}>
                    {vaccinationSchedules.length}
                  </span>
                </button>

                <button
                  className="sched-tab-btn"
                  onClick={() => { setActiveTab('seminar'); setCurrentPage(1); }}
                  style={{
                    background: activeTab === 'seminar' 
                      ? 'rgba(255, 193, 7, 0.12)' 
                      : '#ffffff',
                    color: activeTab === 'seminar' ? '#000000' : '#6c757d',
                    border: activeTab === 'seminar' ? 'none' : '2px solid #e0e0e0',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 'seminar' 
                      ? '0 4px 15px rgba(255, 193, 7, 0.3)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '140px',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== 'seminar') {
                      e.target.style.borderColor = '#ffc107';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== 'seminar') {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  <i className="fas fa-graduation-cap"></i>
                  <span>Seminars</span>
                  <span className="sched-tab-count" style={{
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    opacity: activeTab === 'seminar' ? 1 : 0.6
                  }}>
                    {seminarSchedules.length}
                  </span>
                </button>

                <button
                  className="sched-tab-btn"
                  onClick={() => { setActiveTab('sterilization'); setCurrentPage(1); }}
                  style={{
                    background: activeTab === 'sterilization' 
                      ? 'rgba(255, 193, 7, 0.12)' 
                      : '#ffffff',
                    color: activeTab === 'sterilization' ? '#000000' : '#6c757d',
                    border: activeTab === 'sterilization' ? 'none' : '2px solid #e0e0e0',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 'sterilization' 
                      ? '0 4px 15px rgba(255, 193, 7, 0.3)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '140px',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== 'sterilization') {
                      e.target.style.borderColor = '#ffc107';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== 'sterilization') {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  <i className="fas fa-cut"></i>
                  <span>Sterilization</span>
                  <span className="sched-tab-count" style={{
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    opacity: activeTab === 'sterilization' ? 1 : 0.6
                  }}>
                    {sterilizationSchedules.length}
                  </span>
                </button>
                <button
  className="sched-tab-btn"
  onClick={() => { setActiveTab('microchip'); setCurrentPage(1); }}
  style={{
    background: activeTab === 'microchip'
      ? 'rgba(255, 193, 7, 0.12)'
      : '#ffffff',
    color: activeTab === 'microchip' ? '#000000' : '#6c757d',
    border: activeTab === 'microchip' ? 'none' : '2px solid #e0e0e0',
    padding: '0.875rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: activeTab === 'microchip'
      ? '0 4px 15px rgba(255, 193, 7, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: '140px',
    justifyContent: 'center'
  }}
  onMouseOver={(e) => {
    if (activeTab !== 'microchip') {
      e.target.style.borderColor = '#ffc107';
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    }
  }}
  onMouseOut={(e) => {
    if (activeTab !== 'microchip') {
      e.target.style.borderColor = '#e0e0e0';
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
    }
  }}
>
  <i className="fas fa-microchip"></i>
  <span>Microchip</span>
  <span className="sched-tab-count" style={{
    fontSize: '0.8rem',
    fontWeight: '700',
    opacity: activeTab === 'microchip' ? 1 : 0.6
  }}>
    {microchipSchedules.length}
  </span>
</button>
<button
  className="sched-tab-btn"
  onClick={() => { setActiveTab('other'); setCurrentPage(1); }}
  style={{
    background: activeTab === 'other'
      ? 'rgba(255, 193, 7, 0.12)' 
      : '#ffffff',
    color: activeTab === 'other' ? '#000000' : '#6c757d',
    border: activeTab === 'other' ? 'none' : '2px solid #e0e0e0',
    padding: '0.875rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: activeTab === 'other' 
      ? '0 4px 15px rgba(255, 193, 7, 0.3)' 
      : '0 2px 8px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: '140px',
    justifyContent: 'center'
  }}
  onMouseOver={(e) => {
    if (activeTab !== 'other') {
      e.target.style.borderColor = '#ffc107';
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    }
  }}
  onMouseOut={(e) => {
    if (activeTab !== 'other') {
      e.target.style.borderColor = '#e0e0e0';
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
    }
  }}
>
  <i className="fas fa-calendar-check"></i>
  <span>Other Events</span>
  <span className="sched-tab-count" style={{
    fontSize: '0.8rem',
    fontWeight: '700',
    opacity: activeTab === 'other' ? 1 : 0.6
  }}>
    {otherSchedules.length}
  </span>
</button>
              </div>

              <div className="mt-3">
                <Row className="align-items-center sched-filter-row">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label style={{ fontWeight: '600', color: '#333333', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <i className="fas fa-map-marker-alt me-2"></i>
                        Filter by Place:
                      </Form.Label>
                      <Form.Select
                        value={selectedBarangay}
                        onChange={(e) => { setSelectedBarangay(e.target.value); setCurrentPage(1); }}
                        style={{
                          borderRadius: '10px',
                          padding: '0.75rem',
                          border: '2px solid #e0e0e0',
                          fontWeight: '500',
                          fontSize: '0.95rem'
                        }}
                      >
                        <option value="all">All Places ({getAllSchedules().length})</option>
                        {barangays.map(barangay => (
                          <option key={barangay} value={barangay}>
                            {barangay} ({getBarangayCount(barangay)})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label style={{ fontWeight: '600', color: '#333333', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <i className="fas fa-filter me-2"></i>
                        Filter by Status:
                      </Form.Label>
                      <Form.Select
                        value={filterRegistration}
                        onChange={(e) => { setFilterRegistration(e.target.value); setCurrentPage(1); }}
                        style={{
                          borderRadius: '10px',
                          padding: '0.75rem',
                          border: '2px solid #e0e0e0',
                          fontWeight: '500',
                          fontSize: '0.95rem'
                        }}
                      >
                        <option value="all">All Events</option>
                        <option value="registered">Registered</option>
                        <option value="unregistered">Unregistered</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="text-end">
                    <div style={{ 
                      padding: '0.75rem 1.25rem',
                      background: 'rgba(255, 193, 7, 0.1)',
                      borderRadius: '10px',
                      display: 'inline-block',
                      border: '2px solid rgba(255, 193, 7, 0.3)'
                    }}>
                      <small style={{ color: '#333333', fontWeight: '600', fontSize: '0.95rem' }}>
                        Showing <strong style={{ color: '#000000' }}>{filteredSchedules.length}</strong> event{filteredSchedules.length !== 1 ? 's' : ''}
                      </small>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card.Header>

            <Card.Body style={{ padding: '1.5rem' }}>
              {filteredSchedules.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times text-muted mb-3" style={{ fontSize: '4rem' }}></i>
                  <h5 className="text-muted" style={{ fontWeight: '600' }}>No Events Found</h5>
                  <p className="text-muted" style={{ fontSize: '1rem' }}>
                    {selectedBarangay !== 'all' 
                      ? `No upcoming events in ${selectedBarangay}. Try selecting a different place.`
                      : 'Check back later for scheduled events in your area.'
                    }
                  </p>
                </div>
              ) : (
                <>
                <Row>
                  {filteredSchedules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((schedule, index) => (
                    <Col key={`${schedule.type}-${schedule.id}`} xs={12} lg={6} xl={4} className="mb-4 sched-card-col" style={{ animation: `dropDown 0.4s ease-out ${0.2 + (index * 0.1)}s backwards` }}>
                      <Card 
  key={`${schedule.type}-${schedule.id}`} 
  className="h-100 border-0"
  style={{
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    position: 'relative',
    background: '#ffffff'
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-8px)';
    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
  }}
>
  {/* Registered Badge */}
  {isScheduleRegistered(schedule) && (
    <div style={{
      position: 'absolute', bottom: '12px', left: '12px',
      background: 'linear-gradient(135deg, #198754, #157347)',
      color: '#ffffff', fontSize: '0.65rem', fontWeight: '800',
      padding: '0.25rem 0.75rem', zIndex: 20,
      borderRadius: '20px',
      boxShadow: '0 2px 8px rgba(25,135,84,0.4)',
      letterSpacing: '0.05em', textTransform: 'uppercase',
      pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: '0.3rem'
    }}>
      <i className="fas fa-check-circle" style={{ fontSize: '0.6rem' }}></i>
      Registered
    </div>
  )}
  {/* Menu Button */}
  <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
    <button
      onClick={() => setShowDropdown(showDropdown === `${schedule.type}-${schedule.id}` ? null : `${schedule.type}-${schedule.id}`)}
      style={{
        background: 'transparent',
        border: 'none',
        borderRadius: '50%',
        padding: '0.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseOver={(e) => e.target.style.background = 'rgba(0,0,0,0.05)'}
      onMouseOut={(e) => e.target.style.background = 'transparent'}
    >
      <img 
        src="/ellipsis.png" 
        alt="Menu"
        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
      />
    </button>
    
    {showDropdown === `${schedule.type}-${schedule.id}` && (
      <>
        <div
          onClick={() => setShowDropdown(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
        
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            minWidth: '180px',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          <button
            onClick={() => handleViewClick(schedule)}
            style={{
              width: '100%',
              padding: '0.875rem 1.25rem',
              border: 'none',
              background: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              fontSize: '0.9rem',
              color: '#333333',
              fontWeight: '600',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
            onMouseOut={(e) => e.target.style.background = '#ffffff'}
          >
            <img 
              src="/view.png" 
              alt="View"
              style={{ width: '18px', height: '18px', objectFit: 'contain' }}
            />
            <span>View Details</span>
          </button>
          
          {schedule.status !== 'ongoing' && schedule.status !== 'completed' && schedule.status !== 'cancelled' && (() => {
            const now = new Date();
            const scheduleDate = new Date(schedule.scheduled_date);
            const [startHour, startMinute] = schedule.start_time.split(':');
            scheduleDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
            return now < scheduleDate;
          })() && (() => {
            // Check if user is registered for seminar
            if (schedule.type === 'seminar') {
              const registrations = currentRegistrations.filter(r => 
                r.schedule_id === schedule.id && 
                r.schedule_type === 'seminar' &&
                r.status !== 'cancelled'
              );
              
              if (registrations.length > 0) {
                // Show cancel option
                return (
                  <button
                    onClick={() => {
                      setPetToCancel({ petId: null, registrationId: registrations[0].id });
                      setShowCancelConfirm(true);
                      setShowDropdown(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1.25rem',
                      border: 'none',
                      background: '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      fontSize: '0.9rem',
                      color: '#dc3545',
                      fontWeight: '600',
                      borderTop: '1px solid rgba(0,0,0,0.06)',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                    onMouseOut={(e) => e.target.style.background = '#ffffff'}
                  >
                    <img 
                      src="/cancel.png" 
                      alt="Cancel"
                      style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                    />
                    <span>Cancel Registration</span>
                  </button>
                );
              }
            }
            
            // Check if registered for vaccination/deworming/sterilization/microchip/other
            const isReg = isScheduleRegistered(schedule);
            
            if (isReg) {
              return (
                <button
                  onClick={() => handleRegisterClick(schedule)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1.25rem',
                    border: 'none',
                    background: '#ffffff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    fontSize: '0.9rem',
                    color: '#333333',
                    fontWeight: '600',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  <img 
                    src="/register.png" 
                    alt="Register"
                    style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                  />
                  <span>Register / Cancel</span>
                </button>
              );
            }

            // Show register option
            return (
              <button
                onClick={() => handleRegisterClick(schedule)}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  border: 'none',
                  background: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  fontSize: '0.9rem',
                  color: '#333333',
                  fontWeight: '600',
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                onMouseOut={(e) => e.target.style.background = '#ffffff'}
              >
                <img 
                  src="/register.png" 
                  alt="Register"
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
                <span>{isScheduleRegistered(schedule) ? 'Register / Cancel' : 'Register'}</span>
              </button>
            );
          })()}
        </div>
      </>
    )}
  </div>

  {/* Card Header */}
  <Card.Header 
  className="d-flex align-items-center justify-content-between"
  style={{
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    borderBottom: '2px solid #ffc107',
    paddingRight: '3.5rem',
    borderRadius: '16px 16px 0 0'
  }}
>
  <div className="flex-grow-1">
    <div className="mb-2">
      {getScheduleTypeBadge(schedule.type)}
    </div>
    <h5 className="mb-1" style={{ fontWeight: '700', color: '#333333' }}>{schedule.title}</h5>
    <small className="text-muted" style={{ fontSize: '0.85rem' }}>
      <i className="fas fa-map-marker-alt me-1"></i>
      {schedule.custom_place || schedule.barangay_name}
    </small>
  </div>
  <div>
    {getScheduleStatusBadge(schedule)}
  </div>
</Card.Header>

  {/* Card Body */}
  <Card.Body style={{ padding: '1.5rem' }}>
    {/* Date */}
    <div style={{ 
      marginBottom: '1.25rem',
      paddingBottom: '1.25rem',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <div style={{ 
        color: '#999999', 
        fontWeight: '600', 
        fontSize: '0.7rem', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em',
        marginBottom: '0.5rem' 
      }}>
        Date
      </div>
      <div style={{ 
        fontWeight: '600', 
        color: '#1a1a1a', 
        fontSize: '0.95rem', 
        display: 'flex', 
        alignItems: 'center' 
      }}>
        <img 
          src="/date.png" 
          alt="Date"
          style={{ 
            width: '20px', 
            height: '20px', 
            marginRight: '0.75rem', 
            objectFit: 'contain',
            opacity: 0.8
          }}
        />
        <span>{new Date(schedule.scheduled_date).toLocaleDateString()}</span>
      </div>
    </div>

    {/* Time */}
    <div style={{ 
      marginBottom: '1.25rem',
      paddingBottom: '1.25rem',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <div style={{ 
        color: '#999999', 
        fontWeight: '600', 
        fontSize: '0.7rem', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em',
        marginBottom: '0.5rem' 
      }}>
        Time
      </div>
      <div style={{ 
        fontWeight: '600', 
        color: '#1a1a1a', 
        fontSize: '0.95rem', 
        display: 'flex', 
        alignItems: 'center' 
      }}>
        <img 
          src="/time.png" 
          alt="Time"
          style={{ 
            width: '20px', 
            height: '20px', 
            marginRight: '0.75rem', 
            objectFit: 'contain',
            opacity: 0.8
          }}
        />
        <span>{schedule.start_time} - {schedule.end_time}</span>
      </div>
    </div>

    {/* Venue */}
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ 
        color: '#999999', 
        fontWeight: '600', 
        fontSize: '0.7rem', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em',
        marginBottom: '0.5rem' 
      }}>
        Venue
      </div>
      <div style={{ 
        fontWeight: '600', 
        color: '#1a1a1a', 
        fontSize: '0.95rem', 
        display: 'flex', 
        alignItems: 'center' 
      }}>
        <img 
          src="/venue.png" 
          alt="Venue"
          style={{ 
            width: '20px', 
            height: '20px', 
            marginRight: '0.75rem', 
            objectFit: 'contain',
            opacity: 0.8
          }}
        />
        <span>{schedule.venue}</span>
      </div>
    </div>

  

    {/* Capacity (if exists) */}
    {schedule.type === 'vaccination' ? (
      <div style={{ marginTop: '1.5rem' }}>
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 193, 7, 0.12) 100%)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 193, 7, 0.2)'
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <span style={{ 
              fontWeight: '600', 
              color: '#1a1a1a',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-syringe" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
              Total Vaccine Slots
            </span>
            <Badge 
              bg={getTotalVaccineShots(schedule) - (schedule.current_registrations || 0) > 10 ? 'success' : getTotalVaccineShots(schedule) - (schedule.current_registrations || 0) > 0 ? 'warning' : 'danger'}
              style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                padding: '0.5rem 0.875rem',
                borderRadius: '8px'
              }}
            >
              {schedule.current_registrations || 0} / {getTotalVaccineShots(schedule)}
            </Badge>
          </div>
        </div>
      </div>
    ) : schedule.max_capacity ? (
      <div style={{ marginTop: '1.5rem' }}>
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 193, 7, 0.12) 100%)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 193, 7, 0.2)'
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <span style={{ 
              fontWeight: '600', 
              color: '#1a1a1a',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-users" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
              Available Slots
            </span>
            <Badge 
              bg={getAvailableSpots(schedule) > 10 ? 'success' : getAvailableSpots(schedule) > 0 ? 'warning' : 'danger'}
              style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                padding: '0.5rem 0.875rem',
                borderRadius: '8px'
              }}
            >
              {schedule.current_registrations || 0} / {schedule.max_capacity}
            </Badge>
          </div>
        </div>
      </div>
    ) : null}
  </Card.Body>
</Card>
                    </Col>
                  ))}
                </Row>

                {/* Pagination */}
                {filteredSchedules.length > itemsPerPage && (
                  <Row className="mt-4 sched-pagination">
                    <Col className="d-flex justify-content-between align-items-center">
                      <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
                        Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{Math.ceil(filteredSchedules.length / itemsPerPage)}</strong>
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          style={{ background: currentPage === 1 ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === 1 ? '#adb5bd' : '#333333', transition: 'all 0.2s' }}
                          onMouseOver={e => { if (currentPage !== 1) { e.target.style.borderColor = '#ffc107'; } }}
                          onMouseOut={e => { e.target.style.borderColor = '#dee2e6'; }}
                        >
                          <i className="fas fa-chevron-left" />
                        </button>
                        {(() => {
                          const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
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
                            <span key={`e-${idx}`} style={{ padding: '0.5rem 0.4rem', color: '#6c757d', fontWeight: '600' }}>...</span>
                          ) : (
                            <button key={page} onClick={() => setCurrentPage(page)}
                              style={{ background: currentPage === page ? '#ffc107' : '#ffffff', border: '2px solid', borderColor: currentPage === page ? '#ffc107' : '#dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '40px', cursor: 'pointer', fontWeight: '700', color: currentPage === page ? '#000' : '#333', transition: 'all 0.2s', boxShadow: currentPage === page ? '0 2px 8px rgba(255,193,7,0.3)' : 'none' }}
                              onMouseOver={e => { if (currentPage !== page) e.currentTarget.style.borderColor = '#ffc107'; }}
                              onMouseOut={e => { if (currentPage !== page) e.currentTarget.style.borderColor = '#dee2e6'; }}>
                              {page}
                            </button>
                          ));
                        })()}
                        <button
                          onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredSchedules.length / itemsPerPage)))}
                          disabled={currentPage === Math.ceil(filteredSchedules.length / itemsPerPage)}
                          style={{ background: currentPage === Math.ceil(filteredSchedules.length / itemsPerPage) ? '#e9ecef' : '#ffffff', border: '2px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: currentPage === Math.ceil(filteredSchedules.length / itemsPerPage) ? 'not-allowed' : 'pointer', fontWeight: '600', color: currentPage === Math.ceil(filteredSchedules.length / itemsPerPage) ? '#adb5bd' : '#333333', transition: 'all 0.2s' }}
                          onMouseOver={e => { if (currentPage !== Math.ceil(filteredSchedules.length / itemsPerPage)) e.target.style.borderColor = '#ffc107'; }}
                          onMouseOut={e => { e.target.style.borderColor = '#dee2e6'; }}
                        >
                          <i className="fas fa-chevron-right" />
                        </button>
                      </div>
                    </Col>
                  </Row>
                )}
                </>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {/* Registration Confirmation Modal */}
      <Modal show={showConfirmRegistrationModal} onHide={() => setShowConfirmRegistrationModal(false)} size="md" centered style={{zoom: '0.75'}}>
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #f0fff4, #e6f9ee)', borderBottom: '2px solid #198754', borderRadius: '20px 20px 0 0' }}>
          <Modal.Title style={{ fontWeight: '700', color: '#198754' }}>
            <i className="fas fa-check-circle me-2"></i>
            Registration Confirmed!
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {lastRegistrationData && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(25,135,84,0.1)', border: '2px solid #198754', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <i className="fas fa-calendar-check" style={{ fontSize: '2rem', color: '#198754' }} />
                </div>
                <h5 style={{ fontWeight: '800', color: '#1a1a1a', marginBottom: '0.25rem' }}>
                  {lastRegistrationData.schedule?.title}
                </h5>
                <span style={{ fontSize: '0.82rem', color: '#888' }}>
                  {lastRegistrationData.scheduleType?.charAt(0).toUpperCase() + lastRegistrationData.scheduleType?.slice(1)} Event
                </span>
              </div>

              <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid #e9ecef' }}>
                {[
                  { icon: 'fa-calendar', label: 'Date', value: lastRegistrationData.schedule?.scheduled_date ? new Date(lastRegistrationData.schedule.scheduled_date).toLocaleDateString() : 'N/A' },
                  { icon: 'fa-clock', label: 'Time', value: `${lastRegistrationData.schedule?.start_time} - ${lastRegistrationData.schedule?.end_time}` },
                  { icon: 'fa-map-marker-alt', label: 'Place', value: lastRegistrationData.schedule?.custom_place || lastRegistrationData.schedule?.barangay_name },
                  { icon: 'fa-building', label: 'Venue', value: lastRegistrationData.schedule?.venue },
                ].map((item, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: i < arr.length - 1 ? '0.75rem' : 0, marginBottom: i < arr.length - 1 ? '0.75rem' : 0, borderBottom: i < arr.length - 1 ? '1px solid #e9ecef' : 'none' }}>
                    <i className={`fas ${item.icon}`} style={{ color: '#ffc107', fontSize: '0.85rem', marginTop: '3px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                      <div style={{ fontWeight: '600', color: '#333', fontSize: '0.88rem' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {lastRegistrationData.scheduleType === 'seminar' ? (
                <div style={{ background: 'rgba(25,135,84,0.06)', borderRadius: '10px', padding: '0.85rem 1rem', border: '1px solid rgba(25,135,84,0.2)', fontSize: '0.85rem', color: '#198754', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-user-check"></i>
                  <span>You are registered as an attendee for this seminar.</span>
                </div>
              ) : lastRegistrationData.pets?.length > 0 ? (
                <>
                  <div style={{ fontWeight: '700', color: '#333', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    <i className="fas fa-paw me-2" style={{ color: '#ffc107' }}></i>
                    Registered Pets ({lastRegistrationData.pets.length})
                  </div>
                  {lastRegistrationData.pets.map((pet, i) => (
                    <div key={i} style={{ background: 'rgba(25,135,84,0.05)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '0.5rem', border: '1px solid rgba(25,135,84,0.15)' }}>
                      <div style={{ fontWeight: '700', color: '#1a1a1a', fontSize: '0.95rem' }}>{pet.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#777', marginBottom: pet.vaccines?.length > 0 ? '0.5rem' : 0 }}>
                        <span className="text-capitalize">{pet.species}</span> • {pet.breed || 'Mixed'}
                      </div>
                      {pet.vaccines?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {pet.vaccines.map((v, vi) => (
                            <span key={vi} style={{ background: '#fff', border: '1px solid #198754', borderRadius: '20px', padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: '600', color: '#198754' }}>
                              <i className="fas fa-syringe me-1" style={{ fontSize: '0.65rem' }}></i>{v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : null}
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #e0e0e0', padding: '1rem 2rem' }}>
          <Button className="border-0 w-100" onClick={() => setShowConfirmRegistrationModal(false)}
            style={{ background: '#198754', color: '#fff', borderRadius: '10px', padding: '0.75rem', fontWeight: '700' }}>
            <i className="fas fa-check me-2"></i>Done
          </Button>
        </Modal.Footer>
      </Modal>

    {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" style={{zoom: '0.75'}} centered={window.innerWidth <= 768}>
        <Modal.Header 
          closeButton
          style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderBottom: '2px solid #ffc107',
            borderRadius: '20px 20px 0 0'
          }}
        >
          <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }}></i>
            Event Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedSchedule && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Type</strong>
                  </div>
                  {getScheduleTypeBadge(selectedSchedule.type)}
                </Col>
                <Col md={6}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Status</strong>
                  </div>
                  {getScheduleStatusBadge(selectedSchedule)}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Title</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.title}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Description</strong>
                  <p className="mb-0" style={{ color: '#333333' }}>{selectedSchedule.description || 'No description provided'}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Date</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{new Date(selectedSchedule.scheduled_date).toLocaleDateString()}</p>
                </Col>
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Time</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.start_time} - {selectedSchedule.end_time}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Place</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.custom_place || selectedSchedule.barangay_name}</p>
                </Col>
                <Col md={6}>
                  <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Venue</strong>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.venue}</p>
                </Col>
              </Row>

              {selectedSchedule.speaker && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Speaker</strong>
                    <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>{selectedSchedule.speaker}</p>
                  </Col>
                </Row>
              )}
              {selectedSchedule && selectedSchedule.type === 'other' && selectedSchedule.other_event_type && (
  <Row className="mb-3">
    <Col md={12}>
      <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Event Type</strong>
      <p className="mb-0" style={{ fontWeight: '600', color: '#333333' }}>
        {selectedSchedule.other_event_type}
      </p>
    </Col>
  </Row>
)}

              {/* Capacity based on type */}
              {selectedSchedule.type === 'vaccination' ? (
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
                        {getVaccineDetails(selectedSchedule).length === 0 ? (
                          <p className="text-muted mb-0">No vaccines available for this schedule</p>
                        ) : (
                          getVaccineDetails(selectedSchedule).map((vaccine, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                padding: '1rem', 
                                background: '#ffffff', 
                                borderRadius: '8px', 
                                marginBottom: idx !== getVaccineDetails(selectedSchedule).length - 1 ? '0.75rem' : '0', 
                                border: '1px solid #e0e0e0',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <div style={{ flex: 1 }}>
                                  <div className="d-flex align-items-center gap-2 mb-1">
                                    <strong style={{ fontSize: '1rem', color: '#333' }}>{vaccine.name}</strong>
                                    <span style={{ 
                                      fontSize: '0.7rem', 
                                      padding: '0.25rem 0.6rem', 
                                      background: '#6c757d', 
                                      color: '#fff', 
                                      borderRadius: '4px',
                                      fontWeight: '600',
                                      textTransform: 'uppercase'
                                    }}>
                                      {vaccine.species}
                                    </span>
                                  </div>
                                  {vaccine.description && (
                                    <small className="text-muted d-block mt-1">
                                      {vaccine.description}
                                    </small>
                                  )}
                                </div>
                                <div className="text-end">
  <div style={{ fontSize: '1.1rem' }}>
    <strong style={{ color: vaccine.registered >= vaccine.limit ? '#dc3545' : '#28a745' }}>
      {vaccine.registered}
    </strong>
    <span className="text-muted"> / {vaccine.limit}</span>
  </div>
  <small className="text-muted" style={{ fontSize: '0.75rem' }}>shots</small>
</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Col>
                  </Row>
                </>
              ) : selectedSchedule.max_capacity ? (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong style={{ fontSize: '0.9rem', color: '#666' }}>Capacity</strong>
                    <p className="mb-0">
                      <strong>{selectedSchedule.current_registrations || 0}</strong> / {selectedSchedule.max_capacity} registered
                    </p>
                  </Col>
                </Row>
              ) : null}

              {selectedSchedule.pet_types_allowed && selectedSchedule.type === 'deworming' && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Available for Pet Types</strong>
                    <div className="mt-2">
                      {(Array.isArray(selectedSchedule.pet_types_allowed)
                        ? selectedSchedule.pet_types_allowed
                        : JSON.parse(selectedSchedule.pet_types_allowed || '[]')
                      ).map((type, idx) => (
                        <Badge key={idx} bg="primary" className="me-2 mb-2">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}

              {selectedSchedule.sterilization_species && selectedSchedule.type === 'sterilization' && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Available for Pet Types</strong>
                    <div className="mt-2">
                      {(Array.isArray(selectedSchedule.sterilization_species)
                        ? selectedSchedule.sterilization_species
                        : JSON.parse(selectedSchedule.sterilization_species || '[]')
                      ).map((type, idx) => (
                        <Badge key={idx} bg="success" className="me-2 mb-2">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}
              {selectedSchedule && selectedSchedule.pet_types_allowed && selectedSchedule.type === 'other' && (() => {
  const allowedTypes = Array.isArray(selectedSchedule.pet_types_allowed)
    ? selectedSchedule.pet_types_allowed
    : JSON.parse(selectedSchedule.pet_types_allowed || '[]');
  
  if (allowedTypes.length === 0) return null;
  
  return (
    <Row className="mb-3">
      <Col md={12}>
        <strong style={{ fontSize: '0.9rem', color: '#666666' }}>Available for Pet Types</strong>
        <div className="mt-2">
          {allowedTypes.map((type, idx) => (
            <Badge key={idx} bg="secondary" className="me-2 mb-2">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
          ))}
        </div>
      </Col>
    </Row>
  );
})()}
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
  <Button 
    variant="secondary" 
    onClick={() => setShowDetailsModal(false)}
    style={{
      borderRadius: '10px',
      padding: '0.75rem 1.5rem',
      fontWeight: '600'
    }}
  >
    Close
  </Button>
  
  {selectedSchedule && selectedSchedule.status !== 'completed' && selectedSchedule.status !== 'cancelled' && (() => {
    const now = new Date();
    const scheduleDate = new Date(selectedSchedule.scheduled_date);
    const [startHour, startMinute] = selectedSchedule.start_time.split(':');
    scheduleDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    return now < scheduleDate;
  })() && (
    <Button 
      onClick={() => {
        setShowDetailsModal(false);
        handleRegisterClick(selectedSchedule);
      }}
      className="border-0"
      style={{
        background: '#ffc107',
        color: '#000000',
        padding: '0.75rem 1.5rem',
        borderRadius: '12px',
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
      <i className="fas fa-user-plus me-2"></i>
      Register for Event
    </Button>
  )}
</Modal.Footer>
      </Modal>

      {/* Registration Modal */}
      <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} size="lg" backdrop="static" style={{zoom: '0.75'}} centered={window.innerWidth <= 768}>
        <Modal.Header 
  closeButton
  style={{
    background: '#f8f9fa',
    borderBottom: '2px solid #ffc107',
    borderRadius: '20px 20px 0 0'
  }}
        >
          <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
  <i className="fas fa-user-plus me-2"></i>
  Register for {
    scheduleType === 'vaccination' ? 'Vaccination' : 
    scheduleType === 'deworming' ? 'Deworming' :
    scheduleType === 'sterilization' ? 'Sterilization' :
    scheduleType === 'microchip' ? 'Microchip' :
    scheduleType === 'other' ? 'Other Event' :
    'Seminar'
  }
</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRegistrationSubmit}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
            {registerError && (
              <Alert 
                variant="danger"
                style={{
                  borderRadius: '12px',
                  border: '2px solid #dc3545',
                  background: 'rgba(220, 53, 69, 0.1)',
                  color: '#dc3545'
                }}
              >
                <i className="fas fa-exclamation-triangle me-2"></i>
                {registerError}
              </Alert>
            )}

            {registerSuccess && (
              <Alert 
                variant="success"
                style={{
                  borderRadius: '12px',
                  border: '2px solid #198754',
                  background: 'rgba(25, 135, 84, 0.1)',
                  color: '#198754'
                }}
              >
                <i className="fas fa-check-circle me-2"></i>
                {registerSuccess}
              </Alert>
            )}

            {selectedSchedule && (
              <div 
                className="mb-4"
                style={{
                  background: 'rgba(255, 193, 7, 0.05)',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  borderLeft: '4px solid #ffc107'
                }}
              >
                <h6 style={{ fontWeight: '700', color: '#333333' }}>{selectedSchedule.title}</h6>
                <p className="text-muted mb-0">
                  <i className="fas fa-calendar me-2"></i>
                  {new Date(selectedSchedule.scheduled_date).toLocaleDateString()} at {selectedSchedule.start_time}
                  <br />
                  <i className="fas fa-map-marker-alt me-2"></i>
                  {selectedSchedule.custom_place || selectedSchedule.barangay_name} — {selectedSchedule.venue}
                </p>
              </div>
            )}

            {scheduleType === 'vaccination' && (
              <>
                <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>Select pets and their vaccines:</h6>
                {compatiblePets.length === 0 ? (
                  <Alert 
                    variant="warning"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      background: 'rgba(255, 193, 7, 0.1)'
                    }}
                  >
                    {myPets.length === 0 
                      ? 'You don\'t have any registered pets yet. Please register your pets first.'
                      : 'No eligible pets for this vaccination event.'
                    }
                  </Alert>
                ) : (
                  <div className="mb-4">
                    {compatiblePets
                      .sort((a, b) => {
                        if (a.isRegistered && !b.isRegistered) return -1;
                        if (!a.isRegistered && b.isRegistered) return 1;
                        return 0;
                      })
                      .map(pet => {
                        const availableVaccines = getAvailableVaccinesForPet(
                          pet.species, 
                          selectedSchedule?.vaccine_shot_limits
                        );
                        
                        return (
                          <div 
                            key={pet.id} 
                            className="mb-4" 
                            style={{ 
                              background: pet.isRegistered ? '#e8f5e9' : '#ffffff',
                              padding: '1.25rem',
                              borderRadius: '12px',
                              border: pet.isRegistered ? '2px solid #4caf50' : '2px solid #e0e0e0',
                              position: 'relative'
                            }}
                          >
                            {pet.isRegistered ? (
  <div>
    <div className="d-flex justify-content-between align-items-start mb-3">
      <div className="flex-grow-1">
        <div className="d-flex align-items-center mb-2">
          <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem' }}></i>
          <div>
            <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
            <Badge bg="success" className="ms-2">Registered</Badge>
          </div>
        </div>
        <small className="text-muted d-block">
          <i className="fas fa-paw me-1"></i>
          {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
        </small>
      </div>
      <button
  type="button"
  onClick={() => handleCancelSelectedOrAll(pet.id, pet.registration_id)}
  disabled={registerLoading}
  style={{
    background: '#dc3545',
    color: '#ffffff',
    border: 'none',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: registerLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    opacity: registerLoading ? 0.6 : 1
  }}
  onMouseOver={(e) => !registerLoading && (e.target.style.background = '#c82333')}
  onMouseOut={(e) => !registerLoading && (e.target.style.background = '#dc3545')}
>
  <i className="fas fa-times"></i>
{(selectedVaccinesToCancel[pet.id] || []).length > 0 ? 'Cancel Selected' : 'Cancel All'}
</button>
    </div>
    
    {/* Show registered vaccines */}
    <div 
      style={{
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #dee2e6'
      }}
    >
      <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.75rem' }}>
        Registered vaccines for {pet.name}:
      </strong>
      
      {(() => {
const registration = currentRegistrations.find(r => r.pet_id === pet.id);
        const registeredVaccineIds = registration?.selected_vaccines || [];
        
        if (registeredVaccineIds.length === 0) {
          return (
            <Alert 
              variant="info" 
              className="mb-0 py-2"
              style={{
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            >
              <small>No vaccines registered yet</small>
            </Alert>
          );
        }
        
        return registeredVaccineIds.map(vaccineId => {
  const vaccineType = inventoryItems.find(i => i.id === parseInt(vaccineId));
const isSelected = (selectedVaccinesToCancel[pet.id] || []).includes(vaccineId);  
  return (
    <div 
      key={vaccineId}
      style={{
        background: isSelected ? '#fff3cd' : '#e8f5e9',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        marginBottom: '0.5rem',
        border: isSelected ? '2px solid #ffc107' : '2px solid #4caf50',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Form.Check
  type="checkbox"
  checked={isSelected}
  onChange={(e) => handleVaccineCancelSelection(pet.id, vaccineId, e.target.checked)}
  disabled={registerLoading}
  style={{ marginTop: '0' }}
/>
        <div style={{ flex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-1">
            <strong style={{ fontSize: '0.95rem' }}>{vaccineType?.item_name || vaccineType?.name || 'Unknown Vaccine'}</strong>
            <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
              {vaccineType?.species?.toUpperCase() || 'N/A'}
            </Badge>
          </div>
          {vaccineType?.description && (
            <small className="text-muted d-block">
              {vaccineType.description}
            </small>
          )}
        </div>
      </div>
    </div>
  );
});
      })()}
    </div>
  </div>
) : (
                              <div>
                                <div className="d-flex align-items-start mb-3">
                                  <Form.Check
                                    type="checkbox"
                                    id={`pet_${pet.id}`}
                                    onChange={() => handlePetSelectionToggle(pet.id)}
                                    disabled={registerLoading}
                                    checked={pet.selectedVaccines !== undefined}
                                    style={{ marginTop: '0.4rem' }}
                                  />
                                  <label 
                                    className="w-100 ms-2" 
                                    htmlFor={`pet_${pet.id}`}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: '1.1rem' }}>{pet.name}</strong>
                                      <br />
                                      <small className="text-muted">
                                        <i className="fas fa-paw me-1"></i>
                                        {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                      </small>
                                    </div>
                                  </label>
                                </div>
                                
                                {pet.selectedVaccines !== undefined && (
                                  <div 
                                    style={{
                                      marginTop: '1rem',
                                      paddingTop: '1rem',
                                      borderTop: '1px solid #dee2e6'
                                    }}
                                  >
                                    <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.75rem' }}>
                                      Select vaccines for {pet.name}:
                                    </strong>
                                    
                                    {availableVaccines.length === 0 ? (
                                      <Alert 
                                        variant="info" 
                                        className="mb-0 py-2"
                                        style={{
                                          borderRadius: '8px',
                                          fontSize: '0.875rem'
                                        }}
                                      >
                                        <small>No vaccines available for this pet type</small>
                                      </Alert>
                                    ) : (
                                      <div>
                                        {availableVaccines.map(vaccine => (
                                          <div 
                                            key={vaccine.id}
                                            style={{
                                              background: pet.selectedVaccines?.includes(vaccine.id) ? '#fff9e6' : '#f8f9fa',
                                              padding: '0.75rem',
                                              borderRadius: '8px',
                                              marginBottom: '0.5rem',
                                              border: pet.selectedVaccines?.includes(vaccine.id) ? '2px solid #ffc107' : '1px solid #e0e0e0'
                                            }}
                                          >
                                            <Form.Check
                                              type="checkbox"
                                              id={`vaccine_${pet.id}_${vaccine.id}`}
                                              checked={pet.selectedVaccines?.includes(vaccine.id) || false}
                                              onChange={(e) => handleVaccineSelection(pet.id, vaccine.id, e.target.checked)}
                                              disabled={registerLoading}
                                              label={
                                                <div>
                                                  <strong>{vaccine.name}</strong>
                                                  <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>
                                                    {vaccine.species.toUpperCase()}
                                                  </Badge>
                                                  <Badge bg="info" className="ms-1" style={{ fontSize: '0.7rem' }}>
                                                    {vaccine.shotsRemaining} shots left
                                                  </Badge>
                                                  {vaccine.description && (
                                                    <small className="text-muted d-block mt-1">
                                                      {vaccine.description}
                                                    </small>
                                                  )}
                                                </div>
                                              }
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}

            {scheduleType === 'deworming' && (
              <>
                <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>Select pets for deworming:</h6>
                {compatiblePets.length === 0 ? (
                  <Alert 
                    variant="warning"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      background: 'rgba(255, 193, 7, 0.1)'
                    }}
                  >
                    {myPets.length === 0 
                      ? 'You don\'t have any registered pets yet. Please register your pets first.'
                      : 'No compatible pets for this deworming event.'
                    }
                  </Alert>
                ) : (
                  <div className="mb-4">
                    {compatiblePets
                      .sort((a, b) => {
                        const ageCheckA = meetsAgeRequirement(a, 'deworming');
                        const ageCheckB = meetsAgeRequirement(b, 'deworming');
                        if (a.isRegistered && !b.isRegistered) return -1;
                        if (!a.isRegistered && b.isRegistered) return 1;
                        if (ageCheckA.meets && !ageCheckB.meets) return -1;
                        if (!ageCheckA.meets && ageCheckB.meets) return 1;
                        return 0;
                      })
                      .map(pet => {
                        const ageCheck = meetsAgeRequirement(pet, 'deworming');
                        
                        return (
                          <div 
                            key={pet.id} 
                            className="mb-3" 
                            style={{ 
                              background: pet.isRegistered ? '#e8f5e9' : (ageCheck.meets ? '#ffffff' : '#f5f5f5'),
                              padding: '1rem',
                              borderRadius: '12px',
                              border: pet.isRegistered ? '2px solid #4caf50' : (ageCheck.meets ? '2px solid #e0e0e0' : '2px solid #ffc107'),
                              position: 'relative',
                              opacity: ageCheck.meets ? 1 : 0.7
                            }}
                          >
                            {pet.isRegistered ? (
                              <div className="d-flex justify-content-between align-items-center" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem', flexShrink: 0 }}></i>
                                    <div style={{ minWidth: 0 }}>
                                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                      <Badge bg="success" className="ms-2">Registered</Badge>
                                    </div>
                                  </div>
                                  <small className="text-muted d-block">
                                    <i className="fas fa-paw me-1"></i>
                                    {pet.species} • {pet.breed ||'Mixed'} • {pet.gender}
                                  </small>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCancelRegistration(pet.id, pet.registration_id)}
                                  disabled={registerLoading}
                                  style={{
                                    background: '#dc3545',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    cursor: registerLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    opacity: registerLoading ? 0.6 : 1,
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseOver={(e) => !registerLoading && (e.currentTarget.style.background = '#c82333')}
                                  onMouseOut={(e) => !registerLoading && (e.currentTarget.style.background = '#dc3545')}
                                >
                                  <i className="fas fa-times"></i>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`pet_deworm_${pet.id}`}
                                    onChange={(e) => handlePetSelection(pet.id, e.target.checked)}
                                    disabled={registerLoading || !ageCheck.meets}
                                    checked={registrationData.pets_registered.includes(pet.id)}
                                    style={{ marginTop: '0.4rem' }}
                                  />
                                  <label 
                                    className="form-check-label w-100" 
                                    htmlFor={`pet_deworm_${pet.id}`}
                                    style={{ cursor: ageCheck.meets ? 'pointer' : 'not-allowed' }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                      {!ageCheck.meets && (
                                        <Badge bg="warning" className="ms-2">Age Restriction</Badge>
                                      )}
                                      <br />
                                      <small className="text-muted">
                                        <i className="fas fa-paw me-1"></i>
                                        {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                      </small>
                                    </div>
                                  </label>
                                </div>
                                {!ageCheck.meets && (
                                  <Alert variant="warning" className="mt-2 mb-0 py-2" style={{ borderRadius: '8px', fontSize: '0.875rem' }}>
                                    <small>
                                      <i className="fas fa-exclamation-triangle me-2"></i>
                                      {ageCheck.reason}
                                    </small>
                                  </Alert>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}

            {scheduleType === 'sterilization' && (
              <>
                <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>Select pets for sterilization:</h6>
                {compatiblePets.length === 0 ? (
                  <Alert 
                    variant="warning"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      background: 'rgba(255, 193, 7, 0.1)'
                    }}
                  >
                    {myPets.length === 0 
                      ? 'You don\'t have any registered pets yet. Please register your pets first.'
                      : 'No compatible pets for this sterilization event.'
                    }
                  </Alert>
                ) : (
                  <div className="mb-4">
                    {compatiblePets
                      .sort((a, b) => {
                        const ageCheckA = meetsAgeRequirement(a, 'sterilization');
                        const ageCheckB = meetsAgeRequirement(b, 'sterilization');
                        if (a.isRegistered && !b.isRegistered) return -1;
                        if (!a.isRegistered && b.isRegistered) return 1;
                        if (ageCheckA.meets && !ageCheckB.meets) return -1;
                        if (!ageCheckA.meets && ageCheckB.meets) return 1;
                        return 0;
                      })
                      .map(pet => {
                        const ageCheck = meetsAgeRequirement(pet, 'sterilization');
                        
                        return (
                          <div 
                            key={pet.id} 
                            className="mb-3" 
                            style={{ 
                              background: pet.isRegistered ? '#e8f5e9' : (ageCheck.meets ? '#ffffff' : '#f5f5f5'),
                              padding: '1rem',
                              borderRadius: '12px',
                              border: pet.isRegistered ? '2px solid #4caf50' : (ageCheck.meets ? '2px solid #e0e0e0' : '2px solid #ffc107'),
                              position: 'relative',
                              opacity: ageCheck.meets ? 1 : 0.7
                            }}
                          >
                            {pet.isRegistered ? (
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem' }}></i>
                                    <div>
                                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                      <Badge bg="success" className="ms-2">Registered</Badge>
                                    </div>
                                  </div>
                                  <small className="text-muted d-block">
                                    <i className="fas fa-paw me-1"></i>
                                    {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                  </small>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCancelRegistration(pet.id, pet.registration_id)}
                                  disabled={registerLoading}
                                  style={{
                                    background: '#dc3545',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    cursor: registerLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    opacity: registerLoading ? 0.6 : 1
                                  }}
                                  onMouseOver={(e) => !registerLoading && (e.target.style.background = '#c82333')}
                                  onMouseOut={(e) => !registerLoading && (e.target.style.background = '#dc3545')}
                                >
                                  <i className="fas fa-times"></i>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`pet_steril_${pet.id}`}
                                    onChange={(e) => handlePetSelection(pet.id, e.target.checked)}
                                    disabled={registerLoading || !ageCheck.meets}
                                    checked={registrationData.pets_registered.includes(pet.id)}
                                    style={{ marginTop: '0.4rem' }}
                                  />
                                  <label 
                                    className="form-check-label w-100" 
                                    htmlFor={`pet_steril_${pet.id}`}
                                    style={{ cursor: ageCheck.meets ? 'pointer' : 'not-allowed' }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                      {!ageCheck.meets && (
                                        <Badge bg="warning" className="ms-2">Age Restriction</Badge>
                                      )}
                                      <br />
                                      <small className="text-muted">
                                        <i className="fas fa-paw me-1"></i>
                                        {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                      </small>
                                    </div>
                                  </label>
                                </div>
                                {!ageCheck.meets && (
                                  <Alert variant="warning" className="mt-2 mb-0 py-2" style={{ borderRadius: '8px', fontSize: '0.875rem' }}>
                                    <small>
                                      <i className="fas fa-exclamation-triangle me-2"></i>
                                      {ageCheck.reason}
                                    </small>
                                  </Alert>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
            {scheduleType === 'microchip' && (
              <>
                <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>Select pets for microchipping:</h6>
                {compatiblePets.length === 0 ? (
                  <Alert 
                    variant="warning"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      background: 'rgba(255, 193, 7, 0.1)'
                    }}
                  >
                    {myPets.length === 0 
                      ? 'You don\'t have any registered pets yet. Please register your pets first.'
                      : 'No compatible pets for this microchipping event.'
                    }
                  </Alert>
                ) : (
                  <div className="mb-4">
                    {compatiblePets
                      .sort((a, b) => {
                        if (a.isRegistered && !b.isRegistered) return -1;
                        if (!a.isRegistered && b.isRegistered) return 1;
                        return 0;
                      })
                      .map(pet => (
                        <div 
                          key={pet.id} 
                          className="mb-3" 
                          style={{ 
                            background: pet.isRegistered ? '#e8f5e9' : '#ffffff',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: pet.isRegistered ? '2px solid #4caf50' : '2px solid #e0e0e0'
                          }}
                        >
                          {pet.isRegistered ? (
                            <div className="d-flex justify-content-between align-items-center" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
                              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem', flexShrink: 0 }}></i>
                                  <div style={{ minWidth: 0 }}>
                                    <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                    <Badge bg="success" className="ms-2">Registered</Badge>
                                  </div>
                                </div>
                                <small className="text-muted d-block">
                                  <i className="fas fa-paw me-1"></i>
                                  {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                </small>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelRegistration(pet.id, pet.registration_id)}
                                disabled={registerLoading}
                                style={{
                                  background: '#dc3545',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  cursor: registerLoading ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  opacity: registerLoading ? 0.6 : 1,
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseOver={(e) => !registerLoading && (e.currentTarget.style.background = '#c82333')}
                                onMouseOut={(e) => !registerLoading && (e.currentTarget.style.background = '#dc3545')}
                              >
                                <i className="fas fa-times"></i>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`pet_microchip_${pet.id}`}
                                onChange={(e) => handlePetSelection(pet.id, e.target.checked)}
                                disabled={registerLoading}
                                checked={registrationData.pets_registered.includes(pet.id)}
                                style={{ marginTop: '0.4rem' }}
                              />
                              <label 
                                className="form-check-label w-100" 
                                htmlFor={`pet_microchip_${pet.id}`}
                                style={{ cursor: 'pointer' }}
                              >
                                <div>
                                  <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                                  <br />
                                  <small className="text-muted">
                                    <i className="fas fa-paw me-1"></i>
                                    {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                                  </small>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

            {scheduleType === 'other' && (() => {
  // Check if pet selection is required
  const petTypesAllowed = selectedSchedule?.pet_types_allowed;
  const hasPetTypes = petTypesAllowed && (
    (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
    (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
  );

  if (!hasPetTypes) {
    // Seminar-like registration (no pet selection required)
    const isAlreadyRegistered = currentRegistrations.some(r => 
      r.schedule_id === selectedSchedule?.id && 
      r.schedule_type === 'other' &&
      r.status !== 'cancelled'
    );

    if (isAlreadyRegistered) {
      const registration = currentRegistrations.find(r => 
        r.schedule_id === selectedSchedule?.id && 
        r.schedule_type === 'other' &&
        r.status !== 'cancelled'
      );

      return (
        <Alert variant="success" style={{ borderRadius: '12px' }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <i className="fas fa-check-circle me-2"></i>
              <strong>You are already registered for this event</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setPetToCancel({ petId: null, registrationId: registration.id });
                setShowCancelConfirm(true);
              }}
              disabled={registerLoading}
              style={{
                background: '#dc3545',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: registerLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-times me-2"></i>
              Cancel Registration
            </button>
          </div>
        </Alert>
      );
    }

    return (
      <Alert variant="info" style={{ borderRadius: '12px' }}>
        <i className="fas fa-info-circle me-2"></i>
        Click "Confirm Registration" below to register for this event.
      </Alert>
    );
  }

  // Pet selection required
  return (
    <>
      <h6 style={{ fontWeight: '700', marginBottom: '1rem', color: '#333333' }}>
        Select pets for {selectedSchedule?.other_event_type || 'this event'}:
      </h6>
      {compatiblePets.length === 0 ? (
        <Alert 
          variant="warning"
          style={{
            borderRadius: '12px',
            border: '2px solid #ffc107',
            background: 'rgba(255, 193, 7, 0.1)'
          }}
        >
          {myPets.length === 0 
            ? 'You don\'t have any registered pets yet. Please register your pets first.'
            : 'No compatible pets for this event.'
          }
        </Alert>
      ) : (
        <div className="mb-4">
          {compatiblePets.map(pet => (
            <div 
              key={pet.id} 
              className="mb-3" 
              style={{ 
                background: pet.isRegistered ? '#e8f5e9' : '#ffffff',
                padding: '1rem',
                borderRadius: '12px',
                border: pet.isRegistered ? '2px solid #4caf50' : '2px solid #e0e0e0'
              }}
            >
              {pet.isRegistered ? (
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '1.2rem' }}></i>
                      <div>
                        <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                        <Badge bg="success" className="ms-2">Registered</Badge>
                      </div>
                    </div>
                    <small className="text-muted d-block">
                      <i className="fas fa-paw me-1"></i>
                      {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelRegistration(pet.id, pet.registration_id)}
                    disabled={registerLoading}
                    style={{
                      background: '#dc3545',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: registerLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      opacity: registerLoading ? 0.6 : 1
                    }}
                    onMouseOver={(e) => !registerLoading && (e.target.style.background = '#c82333')}
                    onMouseOut={(e) => !registerLoading && (e.target.style.background = '#dc3545')}
                  >
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`pet_other_${pet.id}`}
                    onChange={(e) => handlePetSelection(pet.id, e.target.checked)}
                    disabled={registerLoading}
                    checked={registrationData.pets_registered.includes(pet.id)}
                    style={{ marginTop: '0.4rem' }}
                  />
                  <label 
                    className="form-check-label w-100" 
                    htmlFor={`pet_other_${pet.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                      <br />
                      <small className="text-muted">
                        <i className="fas fa-paw me-1"></i>
                        {pet.species} • {pet.breed || 'Mixed'} • {pet.gender}
                      </small>
                    </div>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
})()}
            
          </Modal.Body>
          <Modal.Footer style={{ padding: '1.5rem', borderTop: '1px solid #e0e0e0' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowRegisterModal(false)}
              disabled={registerLoading}
              style={{
                borderRadius: '10px',
                padding: '0.75rem 1.5rem',
                fontWeight: '600'
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={registerLoading || (
  scheduleType === 'vaccination' 
    ? compatiblePets.filter(p => p.selectedVaccines && p.selectedVaccines.length > 0).length === 0
    : (scheduleType === 'deworming' || scheduleType === 'sterilization' || scheduleType === 'microchip')
      ? registrationData.pets_registered.length === 0 && compatiblePets.filter(p => !p.isRegistered).length > 0
      : scheduleType === 'other'
        ? (() => {
            const petTypesAllowed = selectedSchedule?.pet_types_allowed;
            const hasPetTypes = petTypesAllowed && (
              (Array.isArray(petTypesAllowed) && petTypesAllowed.length > 0) ||
              (typeof petTypesAllowed === 'string' && JSON.parse(petTypesAllowed || '[]').length > 0)
            );
            return hasPetTypes ? registrationData.pets_registered.length === 0 : false;
          })()
        : false
)}
              className="border-0"
              style={{
                background: registerLoading ? '#6c757d' : '#ffc107',
                color: '#000000',
                borderRadius: '10px',
                padding: '0.75rem 1.5rem',
                fontWeight: '700',
                boxShadow: registerLoading ? 'none' : '0 4px 15px rgba(255, 193, 7, 0.4)',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                if (!registerLoading) {
                  e.target.style.background = '#ffb300';
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)';
                }
              }}
              onMouseOut={(e) => {
                if (!registerLoading) {
                  e.target.style.background = '#ffc107';
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
                }
              }}
            >
              {registerLoading ? (
                <WaveDots />
              ) : (
                <>
                  <i className="fas fa-check me-2"></i>
                  Confirm Registration
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal 
  show={showCancelConfirm} 
  onHide={() => setShowCancelConfirm(false)}
  centered
  style={{ zoom: '0.75', ...(window.innerWidth <= 768 ? {} : { top: '0', alignItems: 'flex-start' }) }}
>
  <Modal.Header 
    closeButton
    style={{
      background: '#f8f9fa',
      borderBottom: '2px solid #dee2e6'
    }}
  >
    <Modal.Title style={{ fontWeight: '700' }}>
      <i className="fas fa-exclamation-triangle text-danger me-2"></i>
      Confirm Cancel Registration
    </Modal.Title>
  </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
    <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
      {vaccineToCancel?.vaccineIds?.length > 0
        ? `Are you sure you want to cancel ${vaccineToCancel.vaccineIds.length} selected vaccine${vaccineToCancel.vaccineIds.length > 1 ? 's' : ''}?`
        : vaccineToCancel 
          ? 'Are you sure you want to cancel this vaccine? The pet will remain registered for other vaccines.'
          : 'Are you sure you want to cancel the entire registration for this pet?'
      }
    </p>
    <Alert variant="warning" className="mt-3 mb-0">
      <i className="fas fa-info-circle me-2"></i>
      <strong>Warning:</strong> This action cannot be undone. You will need to register again if you change your mind.
    </Alert>
  </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
    <Button 
      variant="secondary" 
      onClick={() => {
        setShowCancelConfirm(false);
        setPetToCancel(null);
        setVaccineToCancel(null);
        // Clear selections for the specific pet
        if (vaccineToCancel?.petId) {
          setSelectedVaccinesToCancel(prev => {
            const updated = { ...prev };
            delete updated[vaccineToCancel.petId];
            return updated;
          });
        }
      }}
      disabled={registerLoading}
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
      onClick={confirmCancelRegistration}
      disabled={registerLoading}
      style={{
        borderRadius: '8px',
        padding: '0.75rem 1.5rem',
        fontWeight: '600'
      }}
    >
      {registerLoading ? (
        <WaveDots color="#ffffff" />
      ) : (
        <>
          <i className="fas fa-times me-2"></i>
          Cancel Registration
        </>
      )}
    </Button>
  </Modal.Footer>
      </Modal>
    <VerifyAccountModal
        show={showVerifyModal}
        onHide={() => setShowVerifyModal(false)}
        ownerProfile={ownerProfile}
        profileForm={{
          first_name:  ownerProfile?.first_name  || '',
          middle_name: ownerProfile?.middle_name || '',
          last_name:   ownerProfile?.last_name   || '',
          birthdate:   ownerProfile?.birthdate   || '',
          gender:      ownerProfile?.gender      || '',
          phone:       ownerProfile?.phone       || '',
        }}
        onVerified={(updatedOwner) => setOwnerProfile(updatedOwner)}
      />

    </Container>
    </>
  );
};
export default OwnerSchedule;