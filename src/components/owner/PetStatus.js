import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table } from 'react-bootstrap';
import { petAPI, ownerAPI, microchipAPI, vetCardAPI, handleAPIError } from '../../services/api';

const PetStatus = () => {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [petDetails, setPetDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Registration form states
  const [ownerId, setOwnerId] = useState(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [registerFormData, setRegisterFormData] = useState({
    name: '',
    species: '',
    breed: '',
    gender: '',
    birth_date: '',
    weight: '',
    special_notes: '',
    sterilized: false,
    sterilized_by: '',
    sterilization_date: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [showDropdown, setShowDropdown] = useState(null);
  const [petWithRecords, setPetWithRecords] = useState(new Set());
const [petVetCards, setPetVetCards] = useState([]);
const [qrDataURL, setQrDataURL] = useState('');
const [qrLoading, setQrLoading] = useState(false);
const [photoUploading, setPhotoUploading] = useState(false);
const photoInputRef = useRef(null);
const [photoPreview, setPhotoPreview] = useState(null); // { url, species, petId, hasPhoto }
const [cropModal, setCropModal] = useState(null); // { file, petId }
const [cropZoom, setCropZoom] = useState(1);
const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
const [cropDragging, setCropDragging] = useState(false);
const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });
const cropCanvasRef = useRef(null);
const cropImageRef = useRef(null);
const cropAnimRef = useRef(null);

  const commonDogBreeds = [
    'Aspin (Asong Pinoy)', 'German Shepherd', 'Golden Retriever', 'Labrador Retriever', 
    'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Siberian Husky', 'Chihuahua',
    'Dachshund', 'Boxer', 'Shih Tzu', 'Boston Terrier', 'Pomeranian'
  ];

  const commonCatBreeds = [
    'Puspin (Pusang Pinoy)', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair',
    'Ragdoll', 'Bengal', 'Russian Blue', 'Scottish Fold', 'Abyssinian',
    'Sphynx', 'American Shorthair', 'Birman', 'Oriental Shorthair'
  ];

  

  const getGenderOptions = (species) => {
    switch (species) {
      case 'dog':
        return [
          { value: 'male', label: 'Stud (Male)' },
          { value: 'female', label: 'Bitch (Female)' }
        ];
      case 'cat':
        return [
          { value: 'male', label: 'Tom (Male)' },
          { value: 'female', label: 'Queen (Female)' }
        ];
      
      default:
        return [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' }
        ];
    }
  };

  const getSterilizationLabel = (gender) => {
    if (gender === 'female') {
      return 'Spayed';
    } else if (gender === 'male') {
      return 'Neutered';
    }
    return 'Spayed/Neutered';
  };

  const getSterilizedByLabel = (gender) => {
    if (gender === 'female') {
      return 'Spayed by:';
    } else if (gender === 'male') {
      return 'Neutered by:';
    }
    return 'Sterilized by:';
  };

  const checkPetHasRecords = (pet) => {
  const hasVaccinations = pet.vaccination_count && pet.vaccination_count > 0;
  const hasSterilization = pet.sterilized === 1 || pet.sterilized === true;
  const hasMicrochip = pet.microchip_number && pet.microchip_number !== null && pet.microchip_number !== '';
  return hasVaccinations || hasSterilization || hasMicrochip;
};

  useEffect(() => {
    loadPets();
    fetchOwnerId();
  }, []);
 
useEffect(() => {
  if (!cropModal || !cropCanvasRef.current || !cropImageRef.current) return;

  const canvas = cropCanvasRef.current;
  const SIZE = canvas.offsetWidth || 360;
  canvas.width = SIZE;
  canvas.height = SIZE;

  const img = cropImageRef.current;
  const baseScale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
  const minZoom = baseScale;

  setCropZoom(prev => Math.max(prev, minZoom));
  setCropModal(prev => ({ ...prev, minZoom }));

  const draw = () => {
    const ctx = canvas.getContext('2d');
    const currentZoom = Math.max(cropZoom, minZoom);
    const scaledW = img.naturalWidth * baseScale * currentZoom;
    const scaledH = img.naturalHeight * baseScale * currentZoom;

    const maxOffsetX = Math.max(0, (scaledW - SIZE) / 2);
    const maxOffsetY = Math.max(0, (scaledH - SIZE) / 2);
    const clampedX = Math.min(maxOffsetX, Math.max(-maxOffsetX, cropOffset.x));
    const clampedY = Math.min(maxOffsetY, Math.max(-maxOffsetY, cropOffset.y));

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(
      img,
      SIZE / 2 - scaledW / 2 + clampedX,
      SIZE / 2 - scaledH / 2 + clampedY,
      scaledW,
      scaledH
    );



    cropAnimRef.current = requestAnimationFrame(draw);
  };

  cropAnimRef.current = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(cropAnimRef.current);
}, [cropModal?.dataUrl, cropZoom, cropOffset]);

  const styles = `
    .cropper-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 100003;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    .cropper-modal-box {
      background: #fff;
      border-radius: 20px;
      padding: 1.5rem;
      width: 420px;
      max-width: 95vw;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
      animation: popIn 0.22s ease;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .cropper-modal-title {
      font-weight: 700;
      font-size: 1rem;
      color: #333;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .cropper-canvas-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      background: #111;
      border-radius: 12px;
      overflow: hidden;
    }
    .cropper-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }
    .cropper-btn {
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.4rem;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .cropper-btn-cancel {
      background: #e9ecef;
      color: #333;
    }
    .cropper-btn-cancel:hover { background: #dee2e6; }
    .cropper-btn-crop {
      background: #ffc107;
      color: #000;
      box-shadow: 0 4px 12px rgba(255,193,7,0.4);
    }
    .cropper-btn-crop:hover {
      background: #ffb300;
      box-shadow: 0 6px 16px rgba(255,193,7,0.6);
    }
    .cropper-zoom-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .cropper-zoom-row input[type=range] {
      flex: 1;
      accent-color: #ffc107;
    }
    @keyframes dropDown {
      0% { opacity: 0; transform: translateY(-30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    @media (max-width: 768px) {
      .mobile-page-title {
        font-size: 1.5rem !important;
      }
      .mobile-register-btn {
        padding: 0.4rem 0.8rem !important;
        font-size: 0.75rem !important;
        border-radius: 8px !important;
      }
      .mobile-register-btn .btn-label {
        display: none;
      }
      .mobile-pet-card-header {
        padding: 0.75rem 3rem 0.75rem 0.75rem !important;
      }
      .mobile-pet-avatar {
        width: 48px !important;
        height: 48px !important;
        border-radius: 10px !important;
        margin-right: 0.6rem !important;
      }
      .mobile-pet-avatar img {
        width: 34px !important;
        height: 34px !important;
      }
      .mobile-pet-name {
        font-size: 0.9rem !important;
      }
      .mobile-pet-reg {
        font-size: 0.7rem !important;
      }
      .mobile-pet-badge {
        font-size: 0.65rem !important;
      }
      .mobile-pet-body {
        padding: 0.85rem !important;
      }
      .mobile-pet-label {
        font-size: 0.65rem !important;
      }
      .mobile-pet-value {
        font-size: 0.78rem !important;
      }
      .mobile-pet-footer {
        font-size: 0.68rem !important;
      }
      .mobile-dropdown-btn {
        padding: 0.3rem !important;
      }
      .mobile-modal-body {
        padding: 1rem !important;
      }
      .mobile-modal-footer {
        padding: 0.75rem 1rem !important;
      }
      .mobile-modal-title {
        font-size: 1rem !important;
      }
      .mobile-form-label {
        font-size: 0.82rem !important;
      }
      .mobile-form-control {
        padding: 0.5rem 0.75rem !important;
        font-size: 0.85rem !important;
      }
      .mobile-empty-icon {
        font-size: 2.5rem !important;
      }
      .mobile-empty-title {
        font-size: 1rem !important;
      }
      .mobile-empty-text {
        font-size: 0.82rem !important;
      }
      .mobile-pagination-text {
        font-size: 0.75rem !important;
      }
      .mobile-pagination-btn {
        padding: 0.35rem 0.55rem !important;
        font-size: 0.78rem !important;
        min-width: 32px !important;
      }
      .pet-pagination span,
      .pet-pagination button {
        font-size: 0.75rem !important;
        padding: 0.35rem 0.55rem !important;
        min-width: 32px !important;
      }
    }
  `;

  const fetchOwnerId = async () => {
    try {
      setLoadingOwner(true);
      const userData = JSON.parse(localStorage.getItem('pet_vaccination_user'));
      setOwnerId(userData.id);
    } catch (err) {
      console.error('Error setting owner:', err);
      setRegisterError('Unable to get user information. Please login again.');
    } finally {
      setLoadingOwner(false);
    }
  };

  const loadPets = async () => {
    try {
      setLoading(true);
      const [petsResponse, vetCardsResponse] = await Promise.all([
        petAPI.getAll(),
        vetCardAPI.getAll()
      ]);
      setPets(petsResponse.data.pets || []);
      setPetVetCards(vetCardsResponse.data.vet_cards || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const hasVetCard = (petId) => {
    return petVetCards.some(card =>
      card.pet_id === petId &&
      (card.is_active === 1 || card.is_active === '1' || card.is_active === true)
    );
  };

  const handleViewVetCard = (petId) => {
    window.open(`/vet-card-view/${petId}`, '_blank');
  };

  const loadPetDetails = async (petId) => {
    try {
      setDetailsLoading(true);
      setQrDataURL('');
      const response = await petAPI.getById(petId);
      const pet = response.data.pet;
      setPetDetails(pet);
      setShowDetailsModal(true);

      // If pet has a microchip number, fetch the microchip record separately to get qr_code
      if (pet.microchip_number) {
        setQrLoading(true);
        try {
          const microchipRes = await microchipAPI.getByPetId(petId);
          const microchipRecord = microchipRes.data.microchip_record;

          if (microchipRecord && microchipRecord.qr_code) {
            const jsonStr = atob(microchipRecord.qr_code);
            const parsed = JSON.parse(jsonStr);
            const QRCode = (await import('qrcode')).default;
            const dataURL = await QRCode.toDataURL(JSON.stringify(parsed), {
              width: 200,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' },
            });
            setQrDataURL(dataURL);
          }
        } catch {
          setQrDataURL('');
        } finally {
          setQrLoading(false);
        }
      }
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getPetImage = (species, photoUrl = null) => {
    if (photoUrl) {
      if (photoUrl.startsWith('http')) return photoUrl;
      return photoUrl; // served directly by Vite from /public folder
    }
    const timestamp = new Date().getTime();
    if (species === 'dog') return `/dog.png?v=${timestamp}`;
    else if (species === 'cat') return `/cat.png?v=${timestamp}`;
    return `/pet-default.png?v=${timestamp}`;
  };

  const handlePetPhotoUpload = async (petId, file) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Only JPG, PNG, or WEBP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }
    // Open crop modal instead of uploading directly
    const reader = new FileReader();
    reader.onload = (e) => {
  const img = new Image();
  img.onload = () => {
    cropImageRef.current = img;
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropModal({ dataUrl: e.target.result, petId, file });
  };
  img.src = e.target.result;
};
    reader.readAsDataURL(file);
    return Promise.resolve();
  };

  const handleCropAndUpload = async () => {
  if (!cropModal || !cropCanvasRef.current) return;
  try {
    setPhotoUploading(true);
    const srcCanvas = cropCanvasRef.current;
    const SIZE = 600;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = SIZE;
    outCanvas.height = SIZE;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0, SIZE, SIZE);

    outCanvas.toBlob(async (blob) => {
      try {
        const croppedFile = new File([blob], cropModal.file.name, { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('photo', croppedFile);
        formData.append('pet_id', cropModal.petId);
        await petAPI.uploadPhoto(cropModal.petId, formData);
        await loadPets();
        setCropModal(null);
        setPhotoPreview(null);
      } catch (err) {
        const { message } = handleAPIError(err);
        setError(message);
      } finally {
        setPhotoUploading(false);
      }
    }, 'image/jpeg', 0.92);
  } catch (err) {
    setError('Failed to process image.');
    setPhotoUploading(false);
  }
};

  const calculateAge = (birthDate) => {
    if (!birthDate || birthDate === '0000-00-00') return 'Unknown';
    const today = new Date();
    const birth = new Date(birthDate);
    const diffTime = Math.abs(today - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  };

  const getVetCardBadge = (pet) => {
    if (hasVetCard(pet.id)) {
      return <Badge bg="success">Has Vet Card</Badge>;
    }
    return <Badge bg="secondary">No Vet Card</Badge>;
  };

  const handleEditPet = (pet) => {
  setSelectedPet(pet);
  setEditFormData({
    name: pet.name,
    breed: pet.breed || '',
    birth_date: pet.birth_date && pet.birth_date !== '0000-00-00' ? pet.birth_date : '',
    weight: pet.weight || '',
    special_notes: pet.special_notes || '',
    sterilized: pet.sterilized || false,
    sterilized_by: pet.sterilized_by || '',
    sterilization_date: pet.sterilization_date || ''
  });
  setUpdateError('');
  setUpdateSuccess('');
  setShowEditModal(true);
};

  const handleDeletePet = (pet) => {
    setSelectedPet(pet);
    setShowDeleteModal(true);
  };

  const confirmDeletePet = async () => {
    setDeleteLoading(true);
    setError('');

    try {
      await petAPI.delete(selectedPet.id);
      await loadPets();
      setShowDeleteModal(false);
      setUpdateSuccess(`${selectedPet.name} has been removed successfully.`);
      setTimeout(() => setUpdateSuccess(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUpdatePet = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      await petAPI.update(selectedPet.id, editFormData);
      setUpdateSuccess('Pet information updated successfully!');
      await loadPets();
      setTimeout(() => {
        setShowEditModal(false);
        setUpdateSuccess('');
      }, 2000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setUpdateError(message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getHealthStatusBadge = (pet) => {
    const badges = [];
    if (pet.sterilized) {
      badges.push(<Badge key="sterilized" bg="info" className="me-1">Sterilized</Badge>);
    }
    if (pet.microchip_number) {
      badges.push(<Badge key="microchip" bg="secondary" className="me-1">Microchipped</Badge>);
    }
    return badges;
  };

  const handleOpenRegisterModal = () => {
    setRegisterFormData({
      name: '',
      species: '',
      breed: '',
      gender: '',
      birth_date: '',
      weight: '',
      special_notes: '',
      sterilized: false,
      sterilized_by: '',
      sterilization_date: ''
    });
    setRegisterError('');
    setRegisterSuccess('');
    setShowRegisterModal(true);
  };

  const handleRegisterFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'species') {
      setRegisterFormData(prev => ({
        ...prev,
        species: value,
        breed: '',
        gender: ''
      }));
    } else {
      setRegisterFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    if (registerError) setRegisterError('');
    if (registerSuccess) setRegisterSuccess('');
  };

  const getBreedOptions = () => {
    switch (registerFormData.species) {
      case 'dog':
        return commonDogBreeds;
      case 'cat':
        return commonCatBreeds;
      
      default:
        return [];
    }
  };

  const calculateAgeForRegistration = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    const diffTime = Math.abs(today - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days old`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} old`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''} old`;
    }
  };

  const handleRegisterPet = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerFormData.name.trim()) {
      setRegisterError('Pet name is required');
      setRegisterLoading(false);
      return;
    }

    if (!registerFormData.species) {
      setRegisterError('Please select pet type');
      setRegisterLoading(false);
      return;
    }

    if (!registerFormData.gender) {
      setRegisterError('Please select pet gender');
      setRegisterLoading(false);
      return;
    }

    if (!ownerId) {
      setRegisterError('Owner profile not found. Unable to register pet.');
      setRegisterLoading(false);
      return;
    }

    try {
      const submitData = {
        ...registerFormData,
        owner_id: ownerId
      };
      
      const response = await petAPI.create(submitData);
      setRegisterSuccess(`${registerFormData.name} has been successfully registered! Registration number: ${response.data.pet.registration_number}`);
      
      await loadPets();
      
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegisterSuccess('');
      }, 2500);
    } catch (err) {
      const { message } = handleAPIError(err);
      setRegisterError(message);
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75' }}>

      <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i 
                  className="fas fa-paw" 
                  style={{ 
                    fontSize: '1.5rem', 
                    color: '#000000',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                ></i>
                <h2 className="mobile-page-title" style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>My Pets</h2>
                
              </div>
              
            </div>
            {pets.length > 0 && (
              <Button 
                onClick={handleOpenRegisterModal} 
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
                <i className="fas fa-plus me-2"></i>
                Register New Pet
              </Button>
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

      {updateSuccess && (
        <Row className="mb-4">
          <Col>
            <Alert 
              variant="success" 
              dismissible 
              onClose={() => setUpdateSuccess('')}
              style={{
                borderRadius: '12px',
                border: '2px solid #198754',
                background: 'rgba(25, 135, 84, 0.1)',
                color: '#198754'
              }}
            >
              <i className="fas fa-check-circle me-2"></i>
              {updateSuccess}
            </Alert>
          </Col>
        </Row>
      )}

            {loading ? (
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          <Col className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <Spinner animation="border" style={{ color: '#ffc107', width: '3rem', height: '3rem' }} />
          </Col>
        </Row>
      ) : pets.length === 0 ? (
        <Row style={{ animation: 'dropDown 0.4s ease-out 0.1s backwards' }}>
          <Col>
            <Card 
              className="text-center py-5 border-0"
              style={{
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                background: '#ffffff'
              }}
            >
              <Card.Body>
                <i className="fas fa-paw text-muted mb-4" style={{ fontSize: '4rem' }}></i>
                <h4 className="text-muted mb-3">No Pets Registered Yet</h4>
                <p className="text-muted mb-4">
                  Start by registering your first pet to track their health and vaccination records.
                </p>
                <Button 
                  onClick={handleOpenRegisterModal} 
                  size="lg"
                  className="border-0"
                  style={{
                    background: '#ffc107',
                    color: '#000000',
                    padding: '0.875rem 2rem',
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
                  <i className="fas fa-plus me-2"></i>
                  Register Your First Pet
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <>
        <Row>
          {pets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((pet, index) => (
<Col key={pet.id} lg={6} xl={4} className="mb-4" style={{ animation: `dropDown 0.4s ease-out ${0.1 + (index * 0.1)}s backwards` }}>              
<Card 
                className="h-100 border-0" 
                style={{ 
                  position: 'relative',
                  borderRadius: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                }}
              >
                <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
                  <button
                    onClick={() => setShowDropdown(showDropdown === pet.id ? null : pet.id)}
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
                  
                  {showDropdown === pet.id && (
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
                          border: '1px solid #e0e0e0',
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          minWidth: '160px',
                          zIndex: 1000,
                          overflow: 'hidden'
                        }}
                      >
                        <button
                          onClick={() => {
                            setShowDropdown(null);
                            loadPetDetails(pet.id);
                          }}
                          disabled={detailsLoading}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.9rem',
                            color: '#333333',
                            fontWeight: '500',
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

                        {hasVetCard(pet.id) && (
                          <button
                            onClick={() => {
                              setShowDropdown(null);
                              handleViewVetCard(pet.id);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: 'none',
                              background: '#ffffff',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              fontSize: '0.9rem',
                              color: '#333333',
                              fontWeight: '500',
                              borderTop: '1px solid #f0f0f0',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                            onMouseOut={(e) => e.target.style.background = '#ffffff'}
                          >
                            <i className="fas fa-id-card" style={{ width: '18px', textAlign: 'center', color: '#4361ee' }}></i>
                            <span>View Vet Card</span>
                          </button>
                        )}
                        
                        {/* Only show Edit button if pet has NO records */}
                        {!checkPetHasRecords(pet) && (
                          <button
                            onClick={() => {
                              setShowDropdown(null);
                              handleEditPet(pet);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: 'none',
                              background: '#ffffff',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              fontSize: '0.9rem',
                              color: '#333333',
                              fontWeight: '500',
                              borderTop: '1px solid #f0f0f0',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                            onMouseOut={(e) => e.target.style.background = '#ffffff'}
                          >
                            <img 
                              src="/edit(1).png" 
                              alt="Edit"
                              style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                            />
                            <span>Edit Info</span>
                          </button>
                        )}
                        
                        {/* Show info message if pet has records */}
                        {checkPetHasRecords(pet) && (
                          <div
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              borderTop: '1px solid #f0f0f0',
                              background: '#fff9e6',
                              fontSize: '0.8rem',
                              color: '#856404',
                              lineHeight: '1.4'
                            }}
                          >
                            <i className="fas fa-info-circle me-1"></i>
                            <span>Cannot edit: Pet has existing records</span>
                          </div>
                        )}
                        
                        {!checkPetHasRecords(pet) ? (
                          <button
                            onClick={() => {
                              setShowDropdown(null);
                              handleDeletePet(pet);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: 'none',
                              background: '#ffffff',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              fontSize: '0.9rem',
                              color: '#dc3545',
                              fontWeight: '500',
                              borderTop: '1px solid #f0f0f0',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#fff5f5'}
                            onMouseOut={(e) => e.target.style.background = '#ffffff'}
                          >
                            <img 
                              src="/remove.png" 
                              alt="Delete"
                              style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                            />
                            <span>Remove Pet</span>
                          </button>
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              borderTop: '1px solid #f0f0f0',
                              background: '#fff5f5',
                              fontSize: '0.8rem',
                              color: '#dc3545',
                              lineHeight: '1.4'
                            }}
                          >
                            <i className="fas fa-lock me-1"></i>
                            <span>Cannot remove: Pet has existing records</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <Card.Header 
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    borderBottom: '2px solid #ffc107',
                    paddingRight: '3.5rem',
                    borderRadius: '20px 20px 0 0'
                  }}
                >
                  <div className="d-flex align-items-center flex-grow-1">
                    <div
                      style={{
                        position: 'relative',
                        width: '70px',
                        height: '70px',
                        borderRadius: '15px',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1rem',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                      onClick={() => setPhotoPreview({
                        url: getPetImage(pet.species, pet.photo_url),
                        species: pet.species,
                        petId: pet.id,
                        hasPhoto: !!pet.photo_url
                      })}
                      onMouseEnter={(e) => {
                        e.currentTarget.querySelector('.photo-overlay').style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.querySelector('.photo-overlay').style.opacity = '0';
                      }}
                    >
                      <img
                        src={getPetImage(pet.species, pet.photo_url)}
                        alt={pet.species}
                        style={{
                          width: '70px',
                          height: '70px',
                          objectFit: 'cover',
                          borderRadius: '15px'
                        }}
                        onError={(e) => e.target.src = '/pet-default.png'}
                      />
                      {/* Hover maximize overlay */}
                      <div
                        className="photo-overlay"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.45)',
                          borderRadius: '15px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          gap: '2px'
                        }}
                      >
                        <i className="fas fa-expand-alt" style={{ color: '#fff', fontSize: '1rem' }}></i>
                        <span style={{ color: '#fff', fontSize: '0.45rem', fontWeight: '600', letterSpacing: '0.3px' }}>VIEW</span>
                      </div>
                      {/* Bottom-right edit icon */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#ffc107',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                          zIndex: 2
                        }}
                      >
                        <i className="fas fa-camera" style={{ color: '#000', fontSize: '0.55rem' }}></i>
                      </div>
                      {photoUploading && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(255,255,255,0.7)',
                          borderRadius: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Spinner animation="border" size="sm" style={{ color: '#ffc107' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="mb-1" style={{ fontWeight: '700', color: '#333333' }}>{pet.name}</h5>
                      <small className="text-muted" style={{ fontSize: '0.85rem' }}>
                        <i className="fas fa-id-card me-1"></i>
                        {pet.registration_number}
                      </small>
                    </div>
                  </div>
                  <div>
                    {getVetCardBadge(pet)}
                  </div>
                </Card.Header>
                
                <Card.Body style={{ padding: '1.5rem' }}>
                  <Row className="mb-3">
                    <Col xs={6}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Species</small>
                      </div>
                      <span className="text-capitalize" style={{ fontWeight: '600', color: '#333333' }}>{pet.species}</span>
                    </Col>
                    <Col xs={6}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Breed</small>
                      </div>
                      <span style={{ fontWeight: '600', color: '#333333' }}>{pet.breed || 'Mixed'}</span>
                    </Col>
                  </Row>
                  
                  <Row className="mb-3">
                    <Col xs={6}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Gender</small>
                      </div>
                      <span className="text-capitalize" style={{ fontWeight: '600', color: '#333333' }}>{pet.gender}</span>
                    </Col>
                    <Col xs={6}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Age</small>
                      </div>
                      <span style={{ fontWeight: '600', color: '#333333' }}>{calculateAge(pet.birth_date)}</span>
                    </Col>
                  </Row>

                  {pet.color && (
                    <Row className="mb-3">
                      <Col>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Color</small>
                        </div>
                        <span style={{ fontWeight: '600', color: '#333333' }}>{pet.color}</span>
                      </Col>
                    </Row>
                  )}

                  <Row className="mb-3">
                    <Col>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <small style={{ color: '#999999', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Vaccinations</small>
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: '#333333' }}>{pet.vaccination_count || 0} record(s)</span>
                        {pet.last_vaccination_date && pet.last_vaccination_date !== null && (
                          <div className="mt-1">
                            <small className="text-muted">
                              <i className="fas fa-calendar-check me-1"></i>
                              Last: {(() => {
                                try {
                                  const date = new Date(pet.last_vaccination_date);
                                  return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
                                } catch (error) {
                                  return 'Invalid date';
                                }
                              })()}
                            </small>
                          </div>
                        )}
                      </div>
                    </Col>
                  </Row>

                  

                  <Row>
                    <Col>
                      <small className="text-muted">
                        <i className="fas fa-calendar me-1"></i>
                        Registered: {new Date(pet.created_at).toLocaleDateString()}
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Pagination */}
        {pets.length > itemsPerPage && (
          <Row className="mt-4 pet-pagination">
            <Col className="d-flex justify-content-between align-items-center">
              <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>
                Page <strong style={{ color: '#333' }}>{currentPage}</strong> of <strong style={{ color: '#333' }}>{Math.ceil(pets.length / itemsPerPage)}</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
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
                  const totalPages = Math.ceil(pets.length / itemsPerPage);
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(pets.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(pets.length / itemsPerPage)}
                  style={{
                    background: currentPage === Math.ceil(pets.length / itemsPerPage) ? '#e9ecef' : '#ffffff',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    cursor: currentPage === Math.ceil(pets.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    color: currentPage === Math.ceil(pets.length / itemsPerPage) ? '#adb5bd' : '#333333',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (currentPage !== Math.ceil(pets.length / itemsPerPage)) {
                      e.target.style.background = '#f8f9fa';
                      e.target.style.borderColor = '#ffc107';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentPage !== Math.ceil(pets.length / itemsPerPage)) {
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
        </>
      )}

      {/* Register Pet Modal */}
<Modal 
  show={showRegisterModal} 
  onHide={() => setShowRegisterModal(false)} 
  size="lg"
  backdrop="static"
  style={{zoom: '0.75'}}
>
  <Modal.Header 
  closeButton
  style={{
    background: '#f8f9fa',
    borderBottom: '2px solid #ffc107',
    borderRadius: '20px 20px 0 0'
  }}
>
  <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
    <i className="fas fa-eye me-2"></i>
    Pet Details: {petDetails?.name}
  </Modal.Title>
</Modal.Header>
  <Form onSubmit={handleRegisterPet}>
    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem'}}>
      {registerError && (
        <Alert variant="danger" className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {registerError}
        </Alert>
      )}

      {registerSuccess && (
        <Alert variant="success" className="mb-3">
          <i className="fas fa-check-circle me-2"></i>
          {registerSuccess}
        </Alert>
      )}

      {/* Basic Information */}
      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Pet Name <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={registerFormData.name}
              onChange={handleRegisterFormChange}
              placeholder="Enter your pet's name"
              required
              disabled={registerLoading}
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
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Type of Pet <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Select
              name="species"
              value={registerFormData.species}
              onChange={handleRegisterFormChange}
              required
              disabled={registerLoading}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            >
              <option value="">Select species</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Breed
            </Form.Label>
            <Form.Select
              name="breed"
              value={registerFormData.breed}
              onChange={handleRegisterFormChange}
              disabled={registerLoading || !registerFormData.species}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6',
                backgroundColor: !registerFormData.species ? '#f8f9fa' : '#ffffff'
              }}
            >
              <option value="">
                {registerFormData.species ? 'Select breed' : 'Select pet type first'}
              </option>
              {getBreedOptions().map(breed => (
                <option key={breed} value={breed}>{breed}</option>
              ))}
              <option value="mixed">Mixed Breed</option>
              <option value="unknown">Unknown</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Gender <span style={{ color: '#dc3545' }}>*</span>
            </Form.Label>
            <Form.Select
              name="gender"
              value={registerFormData.gender}
              onChange={handleRegisterFormChange}
              required
              disabled={registerLoading || !registerFormData.species}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6',
                backgroundColor: !registerFormData.species ? '#f8f9fa' : '#ffffff'
              }}
            >
              <option value="">
                {registerFormData.species ? 'Select gender' : 'Select pet type first'}
              </option>
              {getGenderOptions(registerFormData.species).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Birth Date
            </Form.Label>
            <Form.Control
              type="date"
              name="birth_date"
              value={registerFormData.birth_date}
              onChange={handleRegisterFormChange}
              max={new Date().toISOString().split('T')[0]}
              disabled={registerLoading}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            />
            {registerFormData.birth_date && (
              <Form.Text style={{ color: '#198754', fontWeight: '500' }}>
                <i className="fas fa-check-circle me-1"></i>
                Age: {calculateAgeForRegistration(registerFormData.birth_date)}
              </Form.Text>
            )}
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Weight (kg)
            </Form.Label>
            <Form.Control
              type="number"
              name="weight"
              value={registerFormData.weight}
              onChange={handleRegisterFormChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={registerLoading}
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
              Sterilization Status
            </Form.Label>
            <Form.Check
              type="checkbox"
              id="sterilized-check"
              name="sterilized"
              checked={registerFormData.sterilized}
              onChange={handleRegisterFormChange}
              disabled={registerLoading}
              label={getSterilizationLabel(registerFormData.gender)}
            />
          </Form.Group>
        </Col>
      </Row>

      {registerFormData.sterilized && (
        <>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                  {getSterilizedByLabel(registerFormData.gender)}
                </Form.Label>
                <Form.Control
                  type="text"
                  name="sterilized_by"
                  value={registerFormData.sterilized_by}
                  onChange={handleRegisterFormChange}
                  placeholder="Dr. Juan Dela Cruz"
                  disabled={registerLoading}
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
                  Sterilization Date
                </Form.Label>
                <Form.Control
                  type="date"
                  name="sterilization_date"
                  value={registerFormData.sterilization_date}
                  onChange={handleRegisterFormChange}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={registerLoading}
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

      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Special Notes
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="special_notes"
              value={registerFormData.special_notes}
              onChange={handleRegisterFormChange}
              placeholder="Any special medical conditions, behaviors, allergies, or notes about your pet..."
              disabled={registerLoading}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            />
          </Form.Group>
        </Col>
      </Row>
    </Modal.Body>
    <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
      <Button 
        variant="secondary" 
        onClick={() => setShowRegisterModal(false)}
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
        type="submit"
        disabled={registerLoading}
        className="border-0"
        style={{
          background: registerLoading ? '#6c757d' : '#ffc107',
          color: '#000000',
          borderRadius: '8px',
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
          <>
            <Spinner size="sm" animation="border" className="me-2" />
            Registering...
          </>
        ) : (
          <>
            <i className="fas fa-plus-circle me-2"></i>
            Register Pet
          </>
        )}
      </Button>
    </Modal.Footer>
  </Form>
</Modal>

      {/* Pet Details Modal */}
      <Modal show={showDetailsModal} onHide={() => { setShowDetailsModal(false); setQrDataURL(''); }} size="lg" style={{zoom: '0.75'}}>
        <Modal.Header 
          closeButton
          style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderBottom: '2px solid #ffc107',
            borderRadius: '20px 20px 0 0'
          }}
        >
          <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
            <img 
              src={getPetImage(petDetails?.species, petDetails?.photo_url)}
              alt={petDetails?.species}
              style={{
                width: '40px',
                height: '40px',
                objectFit: 'cover',
                borderRadius: '8px',
                marginRight: '0.75rem'
              }}
            />
            Pet Details: {petDetails?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem'}}>
          {petDetails && (
            <Row>
              <Col md={6}>
                <Card 
                  className="mb-3 border-0" 
                  style={{ 
                    borderRadius: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
                  }}
                >
                  <Card.Header style={{ 
                    background: 'rgba(255, 193, 7, 0.1)', 
                    borderBottom: '2px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '15px 15px 0 0'
                  }}>
                    <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                      <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }}></i>
                      Basic Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Table borderless size="sm">
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Name:</td>
                          <td style={{ fontWeight: '600', color: '#333333' }}>{petDetails.name}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Registration:</td>
                          <td style={{ fontWeight: '600', color: '#333333' }}>{petDetails.registration_number}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Species:</td>
                          <td className="text-capitalize" style={{ fontWeight: '600', color: '#333333' }}>{petDetails.species}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Breed:</td>
                          <td style={{ fontWeight: '600', color: '#333333' }}>{petDetails.breed || 'Mixed'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Gender:</td>
                          <td className="text-capitalize" style={{ fontWeight: '600', color: '#333333' }}>{petDetails.gender}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Birth Date:</td>
                          <td style={{ fontWeight: '600', color: '#333333' }}>
                            {petDetails.birth_date && petDetails.birth_date !== '0000-00-00'
                              ? new Date(petDetails.birth_date).toLocaleDateString() 
                              : 'Unknown'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Age:</td>
                          <td style={{ fontWeight: '600', color: '#333333' }}>{calculateAge(petDetails.birth_date)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Weight:</td>
                          <td style={{ fontWeight: '600', color: '#333333' }}>{petDetails.weight ? `${petDetails.weight} kg` : 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>Microchip No.:</td>
                          <td style={{ fontWeight: '600', color: '#333333', fontFamily: 'monospace' }}>
                            {petDetails.microchip_number || 'Not microchipped'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#666666' }}>{getSterilizationLabel(petDetails.gender)}:</td>
                          <td>
                            {petDetails.sterilized ? (
                              <span className="text-success" style={{ fontWeight: '600' }}>
                                <i className="fas fa-check-circle me-1"></i>
                                Yes
                                {petDetails.sterilization_date && (
                                  <span className="text-muted d-block" style={{ fontSize: '0.85rem', fontWeight: '400' }}>
                                    Date: {new Date(petDetails.sterilization_date).toLocaleDateString()}
                                  </span>
                                )}
                                {petDetails.sterilized_by && (
                                  <span className="text-muted d-block" style={{ fontSize: '0.85rem', fontWeight: '400' }}>
                                    By: {petDetails.sterilized_by}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted" style={{ fontWeight: '600' }}>
                                <i className="fas fa-times-circle me-1"></i>
                                No
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card 
                  className="mb-3 border-0" 
                  style={{ 
                    borderRadius: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
                  }}
                >
                  <Card.Header style={{ 
                    background: 'rgba(255, 193, 7, 0.1)', 
                    borderBottom: '2px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '15px 15px 0 0'
                  }}>
                    <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                      <i className="fas fa-syringe me-2" style={{ color: '#ffc107' }}></i>
                      Vaccination History
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    {petDetails.vaccination_history && petDetails.vaccination_history.length > 0 ? (
  <div>
    {petDetails.vaccination_history.slice(0, 5).map(vaccination => (
      <div key={vaccination.id} className="border-bottom pb-2 mb-2">
        <div className="d-flex justify-content-between align-items-center">
          <strong style={{ color: '#333333' }}>{vaccination.vaccination_name}</strong>
          <Badge bg={vaccination.next_due_date && new Date(vaccination.next_due_date) < new Date() ? 'warning' : 'success'}>
            {vaccination.next_due_date && new Date(vaccination.next_due_date) < new Date() ? 'Due' : 'Current'}
          </Badge>
        </div>
        <small className="text-muted">
          Date: {new Date(vaccination.vaccination_date).toLocaleDateString()}
          {vaccination.next_due_date && (
            <>
              <br />
              Next Due: {new Date(vaccination.next_due_date).toLocaleDateString()}
            </>
          )}
          <br />
          Veterinarian: {vaccination.veterinarian_name || `${vaccination.first_name} ${vaccination.last_name}`}
        </small>
      </div>
    ))}
    {petDetails.vaccination_history.length > 5 && (
      <small className="text-muted">
        ... and {petDetails.vaccination_history.length - 5} more
      </small>
    )}
  </div>
                    ) : (
                      <div className="text-center text-muted py-3">
                        <i className="fas fa-syringe mb-2" style={{ fontSize: '2rem', color: '#e0e0e0' }}></i>
                        <p>No vaccination records yet</p>
                        <small>Visit a barangay health center to get your pet vaccinated</small>
                      </div>
                    )}
                  </Card.Body>
                </Card>

                {petDetails.microchip_number && (
                  <Card className="border-0 mb-3" style={{ borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                    <Card.Header style={{ background: 'rgba(67,97,238,0.08)', borderBottom: '2px solid rgba(67,97,238,0.2)', borderRadius: '15px 15px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-qrcode me-2" style={{ color: '#4361ee' }}></i>
                        Microchip QR Code
                      </h6>
                    </Card.Header>
                    <Card.Body className="text-center">
                      {qrLoading ? (
                        <div className="py-3">
                          <Spinner animation="border" size="sm" style={{ color: '#4361ee' }} />
                          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.5rem' }}>Generating QR code...</div>
                        </div>
                      ) : qrDataURL ? (
                        <>
                          <img
                            src={qrDataURL}
                            alt="Pet QR Code"
                            style={{ width: '160px', height: '160px', borderRadius: '10px', border: '3px solid #4361ee', padding: '4px', background: '#fff', boxShadow: '0 4px 16px rgba(67,97,238,0.15)' }}
                          />
                          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', fontFamily: 'monospace' }}>{petDetails.microchip_number}</div>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = qrDataURL;
                              link.download = `QR_${petDetails.name}_${petDetails.microchip_number}.png`;
                              link.click();
                            }}
                            style={{ marginTop: '0.75rem', background: '#4361ee', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                            onMouseOver={e => e.currentTarget.style.background = '#3451d1'}
                            onMouseOut={e => e.currentTarget.style.background = '#4361ee'}
                          >
                            <i className="fas fa-download me-1"></i> Download
                          </button>
                        </>
                      ) : (
                        <div style={{ color: '#bbb', fontSize: '0.82rem', padding: '1rem' }}>
                          <i className="fas fa-qrcode" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', color: '#ddd' }} />
                          QR code not available
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                )}

                {petDetails.special_notes && (
                  <Card 
                    className="border-0" 
                    style={{ 
                      borderRadius: '15px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
                    }}
                  >
                    <Card.Header style={{ 
                      background: 'rgba(255, 193, 7, 0.1)', 
                      borderBottom: '2px solid rgba(255, 193, 7, 0.3)',
                      borderRadius: '15px 15px 0 0'
                    }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-notes-medical me-2" style={{ color: '#ffc107' }}></i>
                        Special Notes
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <p className="mb-0" style={{ color: '#666666' }}>{petDetails.special_notes}</p>
                    </Card.Body>
                  </Card>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #e0e0e0' }}>
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
        </Modal.Footer>
      </Modal>

      {/* Edit Pet Modal */}
<Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
  <Modal.Header 
  closeButton
  style={{
    background: '#f8f9fa',
    borderBottom: '2px solid #ffc107',
    borderRadius: '20px 20px 0 0'
  }}
>
  <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
    <i className="fas fa-eye me-2"></i>
    Edit Pet Information: {selectedPet?.name}
  </Modal.Title>
</Modal.Header>
  <Form onSubmit={handleUpdatePet}>
    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem'}}>
      {updateError && (
        <Alert variant="danger" className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {updateError}
        </Alert>
      )}

      {updateSuccess && (
        <Alert variant="success" className="mb-3">
          <i className="fas fa-check-circle me-2"></i>
          {updateSuccess}
        </Alert>
      )}

      {/* Basic Information */}
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Pet Name
            </Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={editFormData.name}
              onChange={handleEditFormChange}
              required
              disabled={updateLoading}
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
              Breed
            </Form.Label>
            <Form.Control
              type="text"
              name="breed"
              value={editFormData.breed}
              onChange={handleEditFormChange}
              disabled={updateLoading}
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
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Birth Date
            </Form.Label>
            <Form.Control
              type="date"
              name="birth_date"
              value={editFormData.birth_date}
              onChange={handleEditFormChange}
              max={new Date().toISOString().split('T')[0]}
              disabled={updateLoading}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            />
            {editFormData.birth_date && (
              <Form.Text style={{ color: '#198754', fontWeight: '500' }}>
                <i className="fas fa-check-circle me-1"></i>
                Age: {calculateAgeForRegistration(editFormData.birth_date)}
              </Form.Text>
            )}
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Weight (kg)
            </Form.Label>
            <Form.Control
              type="number"
              name="weight"
              value={editFormData.weight}
              onChange={handleEditFormChange}
              step="0.01"
              min="0"
              disabled={updateLoading}
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
              Sterilization Status
            </Form.Label>
            <Form.Check
              type="checkbox"
              id="sterilized-check-edit"
              name="sterilized"
              checked={editFormData.sterilized || false}
              onChange={handleEditFormChange}
              disabled={updateLoading}
              label={getSterilizationLabel(selectedPet?.gender)}
            />
          </Form.Group>
        </Col>
      </Row>

      {editFormData.sterilized && (
        <>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
                  {getSterilizedByLabel(selectedPet?.gender)}
                </Form.Label>
                <Form.Control
                  type="text"
                  name="sterilized_by"
                  value={editFormData.sterilized_by}
                  onChange={handleEditFormChange}
                  placeholder="Dr. Juan Dela Cruz"
                  disabled={updateLoading}
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
                  Sterilization Date
                </Form.Label>
                <Form.Control
                  type="date"
                  name="sterilization_date"
                  value={editFormData.sterilization_date}
                  onChange={handleEditFormChange}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={updateLoading}
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

      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: '600', color: '#333333' }}>
              Special Notes
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="special_notes"
              value={editFormData.special_notes}
              onChange={handleEditFormChange}
              placeholder="Any special medical conditions, behaviors, allergies, or notes about your pet..."
              disabled={updateLoading}
              style={{
                borderRadius: '8px',
                padding: '0.75rem',
                border: '2px solid #dee2e6'
              }}
            />
          </Form.Group>
        </Col>
      </Row>
    </Modal.Body>
    <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
      <Button 
        variant="secondary" 
        onClick={() => setShowEditModal(false)}
        disabled={updateLoading}
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
        disabled={updateLoading}
        className="border-0"
        style={{
          background: updateLoading ? '#6c757d' : '#ffc107',
          color: '#000000',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontWeight: '700',
          boxShadow: updateLoading ? 'none' : '0 4px 15px rgba(255, 193, 7, 0.4)',
          transition: 'all 0.3s'
        }}
        onMouseOver={(e) => {
          if (!updateLoading) {
            e.target.style.background = '#ffb300';
            e.target.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.6)';
          }
        }}
        onMouseOut={(e) => {
          if (!updateLoading) {
            e.target.style.background = '#ffc107';
            e.target.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
          }
        }}
      >
        {updateLoading ? (
          <>
            <Spinner size="sm" animation="border" className="me-2" />
            Updating...
          </>
        ) : (
          <>
            <i className="fas fa-save me-2"></i>
            Update Pet
          </>
        )}
      </Button>
    </Modal.Footer>
  </Form>
</Modal>
      {/* Delete Confirmation Modal */}
<Modal 
  show={showDeleteModal} 
  onHide={() => setShowDeleteModal(false)}
  centered
  style={{zoom: '0.75'}}
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
      Confirm Remove Pet
    </Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ padding: '2rem'}}>
    {selectedPet && (
      <>
        <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
          Are you sure you want to remove <strong style={{ color: '#dc3545' }}>{selectedPet.name}</strong> from your registered pets?
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
              <i className="fas fa-paw me-1" style={{ color: '#ffc107' }}></i>
              Pet Information
            </span>
          </div>
          <strong style={{ fontSize: '1.1rem' }}>{selectedPet.name}</strong>
          <br />
          <small className="text-muted">
            <i className="fas fa-id-card me-1"></i>
            {selectedPet.registration_number} • <span className="text-capitalize">{selectedPet.species}</span> • {selectedPet.breed || 'Mixed'}
          </small>
        </div>
        <Alert variant="warning" className="mt-3 mb-0">
          <i className="fas fa-info-circle me-2"></i>
          <strong>Warning:</strong> This action will deactivate the pet but records will remain in the system for historical purposes.
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
      onClick={confirmDeletePet}
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
          Removing...
        </>
      ) : (
        <>
          <i className="fas fa-trash me-2"></i>
          Remove Pet
        </>
      )}
    </Button>
  </Modal.Footer>
</Modal>
    </Container>

      {/* Crop Modal */}
      {cropModal && (
        <div className="cropper-modal-backdrop" onMouseUp={() => setCropDragging(false)} style={{ zIndex: 100003 }}>
          <div className="cropper-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cropper-modal-title">
              <i className="fas fa-crop-alt" style={{ color: '#ffc107' }}></i>
              Crop Photo — Square (1:1)
            </div>

            {/* Canvas preview */}
            <canvas
  ref={cropCanvasRef}
  style={{
    width: '100%',
    aspectRatio: '1',
    borderRadius: '12px',
    background: '#111',
    cursor: cropDragging ? 'grabbing' : 'grab',
    display: 'block'
  }}
  onMouseDown={(e) => {
    setCropDragging(true);
    setCropDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  }}
  onMouseMove={(e) => {
    if (!cropDragging) return;
    setCropOffset({ x: e.clientX - cropDragStart.x, y: e.clientY - cropDragStart.y });
  }}
  onMouseUp={() => setCropDragging(false)}
  onMouseLeave={() => setCropDragging(false)}
  onTouchStart={(e) => {
    const t = e.touches[0];
    setCropDragging(true);
    setCropDragStart({ x: t.clientX - cropOffset.x, y: t.clientY - cropOffset.y });
  }}
  onTouchMove={(e) => {
    if (!cropDragging) return;
    const t = e.touches[0];
    setCropOffset({ x: t.clientX - cropDragStart.x, y: t.clientY - cropDragStart.y });
  }}
  onTouchEnd={() => setCropDragging(false)}
/>

            {/* Zoom slider */}
            <div className="cropper-zoom-row">
              <i className="fas fa-search-minus" style={{ color: '#aaa' }}></i>
              <input type="range" min={cropModal?.minZoom || 0.5} max="3"
                step="0.01"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
              />
              <i className="fas fa-search-plus" style={{ color: '#aaa' }}></i>
              <span style={{ fontSize: '0.78rem', color: '#888', minWidth: '36px' }}>{Math.round(cropZoom * 100)}%</span>
            </div>

            <div className="cropper-actions">
              <button
                className="cropper-btn cropper-btn-cancel"
                onClick={() => setCropModal(null)}
                disabled={photoUploading}
              >
                Cancel
              </button>
              <button
                className="cropper-btn cropper-btn-crop"
                onClick={handleCropAndUpload}
                disabled={photoUploading}
              >
                {photoUploading ? (
                  <><Spinner animation="border" size="sm" className="me-2" />Uploading...</>
                ) : (
                  <><i className="fas fa-check me-2"></i>Crop & Save</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pet Photo Preview/Maximize Modal */}
      {photoPreview && (
        <div
          onClick={() => setPhotoPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes popIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
          `}</style>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '380px',
              height: '380px',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              animation: 'popIn 0.22s ease',
              zIndex: 100002,
              background: '#f0f0f0'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setPhotoPreview(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10,
                background: 'rgba(0,0,0,0.55)',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '0.9rem',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(220,53,69,0.85)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
            >
              <i className="fas fa-times"></i>
            </button>

            {/* Pet image */}
            <img
              src={photoPreview.url}
              alt="Pet"
              style={{
                width: '100%',
                height: '100%',
                objectFit: photoPreview.hasPhoto ? 'cover' : 'contain',
                display: 'block',
                padding: photoPreview.hasPhoto ? '0' : '2rem'
              }}
              onError={(e) => e.target.src = '/pet-default.png'}
            />

            {/* Bottom edit/add button overlay */}
            <div
              className="preview-edit-btn"
              onClick={() => {
                photoInputRef.current.dataset.petId = photoPreview.petId;
                photoInputRef.current.click();
              }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '2.5rem 1.25rem 1.1rem',
                background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.paddingBottom = '1.4rem'}
              onMouseOut={(e) => e.currentTarget.style.paddingBottom = '1.1rem'}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: photoPreview.hasPhoto ? 'rgba(255,193,7,0.92)' : 'rgba(255,255,255,0.92)',
                color: '#000',
                borderRadius: '30px',
                padding: '0.45rem 1.1rem',
                fontWeight: '700',
                fontSize: '0.82rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
              }}>
                <i className={`fas ${photoPreview.hasPhoto ? 'fa-pencil-alt' : 'fa-plus-circle'}`}></i>
                {photoPreview.hasPhoto ? 'Edit Photo' : 'Add Photo'}
              </div>
            </div>

            {photoUploading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Spinner animation="border" style={{ color: '#ffc107', width: '2.5rem', height: '2.5rem' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for pet photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0];
          const petId = e.target.dataset.petId;
          if (file && petId) {
            handlePetPhotoUpload(petId, file).then(() => {
              setPhotoPreview(null);
            });
          }
          e.target.value = '';
        }}
      />
    </>
  );
};

export default PetStatus;